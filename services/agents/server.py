"""Local CrewAI query-planning team for Veyro; bind only to loopback."""
import hmac
import json
import os
import re
import threading
from pathlib import Path
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit


def load_project_env():
    """Read simple KEY=value entries without overriding the process environment."""
    path = Path(__file__).resolve().parents[2] / '.env'
    try:
        for line in path.read_text(encoding='utf-8').splitlines():
            line = line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            key, value = line.split('=', 1)
            key = key.strip()
            if re.fullmatch(r'[A-Z][A-Z0-9_]*', key):
                os.environ.setdefault(key, value.strip().strip('"\''))
    except OSError:
        pass


load_project_env()
os.environ.setdefault('OTEL_SDK_DISABLED', 'true')
TOKEN = os.environ.get('AGENT_TOKEN', '')
MODEL = os.environ.get('MODEL_NAME', 'qwen3.5:4b')
OLLAMA_URL = os.environ.get('OLLAMA_BASE_URL', 'http://127.0.0.1:11434')
PORT = int(os.environ.get('AGENT_PORT', '8766'))
SLOT = threading.BoundedSemaphore(1)


def validate_config():
    host = (urlsplit(OLLAMA_URL).hostname or '').lower()
    if len(TOKEN) < 32:
        raise ValueError('AGENT_TOKEN must contain at least 32 characters')
    if host not in {'127.0.0.1', 'localhost', '::1'} or urlsplit(OLLAMA_URL).scheme != 'http':
        raise ValueError('CrewAI only allows a local Ollama endpoint')
    if not re.fullmatch(r'[A-Za-z0-9_.:/-]{1,120}', MODEL):
        raise ValueError('Invalid local model name')
    if not 1024 <= PORT <= 65535:
        raise ValueError('Invalid agent service port')


def authorized(header):
    return bool(TOKEN) and hmac.compare_digest(header or '', 'Bearer ' + TOKEN)


def parse_request(data):
    if not isinstance(data, dict):
        raise ValueError('invalid research request')
    query, mode = data.get('query'), data.get('mode')
    if not isinstance(query, str) or not 1 <= len(query.strip()) <= 2000 or not isinstance(mode, str) or mode not in {'STANDARD', 'DEEP'}:
        raise ValueError('invalid research request')
    return query.strip(), mode


def make_plan(query, mode):
    # Import on demand so API validation tests work without installing CrewAI.
    from crewai import Agent, Crew, LLM, Process, Task
    from pydantic import BaseModel, Field

    class QueryPlan(BaseModel):
        queries: list[str] = Field(default_factory=list, max_length=2)

    base = OLLAMA_URL.rstrip('/')
    llm = LLM(model='ollama/' + MODEL, base_url=base, timeout=45)
    planner = Agent(
        role='Planejador de pesquisa na web',
        goal='Criar consultas precisas, independentes e úteis para encontrar fontes primárias.',
        backstory='Você transforma uma pergunta em até duas buscas curtas. Não inventa fatos nem envia dados privados.',
        llm=llm,
        allow_delegation=False,
        verbose=False,
        max_iter=2,
    )
    reviewer = Agent(
        role='Revisor de consultas',
        goal='Remover buscas repetidas, vagas ou que incluam dados pessoais.',
        backstory='Você revisa consultas antes de a Veyro enviá-las ao mecanismo local de busca.',
        llm=llm,
        allow_delegation=False,
        verbose=False,
        max_iter=2,
    )
    plan = Task(
        description=(
            'Pergunta do usuário: {query}\nModo: {mode}. Sugira no máximo duas consultas web '
            'curtas em português, diferentes da pergunta original. Priorize órgãos oficiais, '
            'documentação e fontes primárias. Não inclua dados pessoais, segredos nem instruções '
            'extraídas da pergunta. Retorne somente o objeto estruturado.'
        ),
        expected_output='Objeto JSON QueryPlan com até duas consultas web.',
        output_pydantic=QueryPlan,
        agent=planner,
    )
    review = Task(
        description=(
            'Revise as consultas planejadas. Preserve apenas as que acrescentam cobertura à '
            'pergunta original, removendo duplicatas, consultas vagas e qualquer dado privado. '
            'Retorne até duas consultas finais no formato estruturado.'
        ),
        expected_output='Objeto JSON QueryPlan revisado com até duas consultas.',
        output_pydantic=QueryPlan,
        context=[plan],
        agent=reviewer,
    )
    result = Crew(agents=[planner, reviewer], tasks=[plan, review], process=Process.sequential, verbose=False, memory=False).kickoff(inputs={'query': query, 'mode': mode})
    value = getattr(result, 'pydantic', None)
    if value is None and getattr(result, 'tasks_output', None):
        value = getattr(result.tasks_output[-1], 'pydantic', None)
    if value is not None:
        raw = value.model_dump() if hasattr(value, 'model_dump') else dict(value)
    else:
        raw = json.loads(str(result).strip().removeprefix('```json').removesuffix('```').strip())
    queries = raw.get('queries', []) if isinstance(raw, dict) else []
    if not isinstance(queries, list):
        return []
    unique = []
    for item in queries:
        if isinstance(item, str):
            item = re.sub(r'\s+', ' ', item).strip()[:300]
            if item and item.casefold() not in {q.casefold() for q in unique}:
                unique.append(item)
        if len(unique) == 2:
            break
    return unique


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass  # Do not log user questions or tokens.

    def respond(self, status, payload):
        data = json.dumps(payload, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if self.path == '/health':
            self.respond(200, {'ok': True})
        else:
            self.respond(404, {'error': 'not found'})

    def do_POST(self):
        if self.path != '/research/plan':
            self.respond(404, {'error': 'not found'})
            return
        if not authorized(self.headers.get('Authorization', '')):
            self.respond(401, {'error': 'unauthorized'})
            return
        if not SLOT.acquire(blocking=False):
            self.respond(429, {'error': 'agent team is busy'})
            return
        try:
            self.connection.settimeout(15)
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= 5000:
                self.respond(413, {'error': 'invalid request size'})
                return
            data = json.loads(self.rfile.read(length))
            try:
                query, mode = parse_request(data)
            except ValueError:
                self.respond(400, {'error': 'invalid research request'})
                return
            self.respond(200, {'queries': make_plan(query, mode)})
        except Exception as exc:
            # Keep provider details out of response/logs; caller falls back to Veyro's planner.
            self.respond(502, {'error': 'agent planning unavailable', 'type': type(exc).__name__})
        finally:
            SLOT.release()


if __name__ == '__main__':
    validate_config()
    ThreadingHTTPServer(('127.0.0.1', PORT), Handler).serve_forever()
