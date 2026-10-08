"""Private HTTPS-reader gateway. Deploy behind TLS; never expose without READER_KEY."""
import concurrent.futures
import hashlib
import hmac
import http.client
import io
import ipaddress
import json
import os
import re
import socket
import ssl
import threading
import time
import urllib.parse
import urllib.robotparser
from html.parser import HTMLParser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

MAX_BYTES = 2_000_000
KEY = os.environ.get('READER_KEY', '')
USER_AGENT = 'VeyroReader/1.0'
DNS_POOL = concurrent.futures.ThreadPoolExecutor(max_workers=4)
SLOTS = threading.BoundedSemaphore(4)


def validate_url(url):
    u = urllib.parse.urlsplit(url)
    host = (u.hostname or '').lower().rstrip('.')
    if u.scheme != 'https' or u.username or u.password or u.port not in (None, 443):
        raise ValueError('Only public HTTPS URLs are supported')
    if not host or '.' not in host or host.endswith(('.local', '.internal', '.localhost', '.lan', '.home', '.test', '.invalid')):
        raise ValueError('Internal hostname blocked')
    try:
        ipaddress.ip_address(host)
    except ValueError:
        pass
    else:
        raise ValueError('IP literals blocked')
    if 'metadata' in host.split('.'):
        raise ValueError('Metadata endpoint blocked')
    return u, host


def public_addresses(host):
    future = DNS_POOL.submit(socket.getaddrinfo, host, 443, 0, socket.SOCK_STREAM)
    answers = future.result(timeout=4)
    addresses = list(dict.fromkeys(x[4][0] for x in answers))
    if not addresses:
        raise ValueError('No address')
    for value in addresses:
        ip = ipaddress.ip_address(value)
        if not ip.is_global or ip.is_multicast or ip.is_unspecified or getattr(ip, 'ipv4_mapped', None) is not None or getattr(ip, 'sixtofour', None) is not None or getattr(ip, 'teredo', None) is not None:
            raise ValueError('Private or special network blocked')
    return addresses


class PinnedHTTPS(http.client.HTTPSConnection):
    def __init__(self, host, address, timeout):
        super().__init__(host, 443, timeout=timeout, context=ssl.create_default_context())
        self.address = address

    def connect(self):
        # Connect to validated literal IP, retaining hostname for TLS/SNI verification.
        raw = socket.create_connection((self.address, 443), timeout=self.timeout)
        try:
            self.sock = self._context.wrap_socket(raw, server_hostname=self.host)
        except Exception:
            raw.close()
            raise


def raw_fetch(url, deadline, max_bytes=MAX_BYTES, redirects=3, on_redirect=None):
    for attempt in range(redirects + 1):
        if time.monotonic() >= deadline:
            raise TimeoutError('Read deadline reached')
        u, host = validate_url(url)
        addresses = public_addresses(host)
        conn = PinnedHTTPS(host, addresses[0], min(5, max(.1, deadline - time.monotonic())))
        try:
            path = urllib.parse.urlunsplit(('', '', u.path or '/', u.query, ''))
            conn.request('GET', path, headers={'Host': host, 'User-Agent': USER_AGENT, 'Accept-Encoding': 'identity', 'Accept': 'text/html,application/pdf,text/plain;q=0.9,*/*;q=0.1'})
            response = conn.getresponse()
            headers = {k.lower(): v for k, v in response.getheaders()}
            if response.status in (301, 302, 303, 307, 308):
                if attempt == redirects:
                    raise ValueError('Too many redirects')
                url = urllib.parse.urljoin(url, headers.get('location', ''))
                validate_url(url)
                if on_redirect is not None and not on_redirect(url, deadline):
                    raise ValueError("Redirect destination disallows access")
                continue
            if int(headers.get('content-length', '0')) > max_bytes:
                raise ValueError('Download limit exceeded')
            if headers.get('content-encoding', 'identity').lower() not in ('', 'identity'):
                raise ValueError('Compressed response rejected')
            chunks = []
            total = 0
            while True:
                if time.monotonic() >= deadline:
                    raise TimeoutError('Read deadline reached')
                chunk = response.read(min(16384, max_bytes - total + 1))
                if not chunk:
                    break
                total += len(chunk)
                if total > max_bytes:
                    raise ValueError('Download limit exceeded')
                chunks.append(chunk)
            return url, response.status, headers, b''.join(chunks)
        finally:
            conn.close()
    raise ValueError('Redirect failed')


class ArticleParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.skip = 0
        self.title_mode = False
        self.title = ''
        self.author = ''
        self.published = None
        self.parts = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in ('script', 'style', 'nav', 'footer', 'header', 'aside', 'form', 'noscript'):
            self.skip += 1
        if tag == 'title':
            self.title_mode = True
        if tag == 'meta':
            key = a.get('name', a.get('property', '')).lower()
            if key == 'author':
                self.author = a.get('content', '')
            if key in ('article:published_time', 'date', 'datepublished'):
                self.published = a.get('content')
        if tag in ('p', 'div', 'h1', 'h2', 'h3', 'li', 'br'):
            self.parts.append('\n')

    def handle_endtag(self, tag):
        if tag in ('script', 'style', 'nav', 'footer', 'header', 'aside', 'form', 'noscript'):
            self.skip = max(0, self.skip - 1)
        if tag == 'title':
            self.title_mode = False

    def handle_data(self, data):
        if self.title_mode:
            self.title += data
        if not self.skip and not self.title_mode:
            self.parts.append(data)

    def text(self):
        lines = [re.sub(r'\s+', ' ', line).strip() for line in ''.join(self.parts).splitlines()]
        return '\n'.join(dict.fromkeys(line for line in lines if line))


def relevant_chunks(text, query, limit=14000):
    if len(text) <= limit:
        return text, False
    chunks = [text[i:i+1800] for i in range(0, len(text), 1800)]
    words = set(re.findall(r'\w{3,}', query.lower()))
    ranked = sorted(enumerate(chunks), key=lambda item: sum(w in item[1].lower() for w in words), reverse=True)
    selected = sorted(ranked[:max(1, limit // 1800)])
    return '\n\n'.join(f'[Seção {i+1}] {chunk}' for i, chunk in selected)[:limit], True


def allowed_by_robots(url, deadline):
    u, _ = validate_url(url)
    robots_url = urllib.parse.urlunsplit((u.scheme, u.netloc, '/robots.txt', '', ''))
    final, status, headers, data = raw_fetch(robots_url, deadline, 150000)
    if status == 404:
        return True
    if status != 200:
        return False
    rules = urllib.robotparser.RobotFileParser()
    rules.parse(data.decode('utf-8', 'replace').splitlines())
    return rules.can_fetch(USER_AGENT, url)


def render_js(url, html, deadline):
    # Browser has no direct DNS network route: all requests are fulfilled using
    # the same pinned-IP reader. Cross-origin resources and mutations are blocked.
    from playwright.sync_api import sync_playwright
    used = [0, 0]
    host = urllib.parse.urlsplit(url).hostname
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--host-resolver-rules=MAP * ~NOTFOUND', '--disable-background-networking', '--disable-quic'])
        try:
            context = browser.new_context(service_workers='block', accept_downloads=False)
            context.route_web_socket('**/*', lambda ws: ws.close())
            def route_request(route):
                target = route.request.url
                if target == url:
                    route.fulfill(status=200, content_type='text/html', body=html)
                    return
                if route.request.method != 'GET' or urllib.parse.urlsplit(target).hostname != host or used[0] >= 20 or used[1] >= 4_000_000 or time.monotonic() >= deadline:
                    route.abort()
                    return
                try:
                    used[0] += 1
                    final, status, headers, data = raw_fetch(target, deadline, min(MAX_BYTES, 4_000_000-used[1]), redirects=0)
                    used[1] += len(data)
                    route.fulfill(status=status, content_type=headers.get('content-type', 'text/plain'), body=data)
                except Exception:
                    route.abort()
            context.route('**/*', route_request)
            page = context.new_page()
            page.set_default_timeout(5000)
            page.goto(url, wait_until='domcontentloaded', timeout=7000)
            page.wait_for_timeout(600)
            return page.content()[:2_000_000]
        finally:
            browser.close()


def read_page(url, query):
    deadline = time.monotonic() + 15
    validate_url(url)
    if not allowed_by_robots(url, deadline):
        raise ValueError('Access disallowed or robots unavailable')
    final, status, headers, data = raw_fetch(url, deadline, on_redirect=allowed_by_robots)
    if final != url and not allowed_by_robots(final, deadline):
        raise ValueError('Redirect destination disallows access')
    if status != 200:
        raise ValueError('Source not accessible')
    kind = headers.get('content-type', '').split(';')[0].lower()
    result = {'url': final, 'title': '', 'author': '', 'published': None, 'partial': False}
    if kind == 'application/pdf':
        from pypdf import PdfReader
        document = PdfReader(io.BytesIO(data))
        parts = []
        total = 0
        for i, page in enumerate(document.pages[:40]):
            if time.monotonic() >= deadline:
                result['partial'] = True
                break
            part = page.extract_text() or ''
            parts.append(f'[Página {i+1}]\n{part}')
            total += len(part)
            if total > 150000:
                result['partial'] = True
                break
        text = '\n\n'.join(parts)
        result.update(format='pdf', title=str((document.metadata or {}).get('/Title', 'Documento PDF'))[:300])
        result['partial'] = result['partial'] or len(document.pages) > 40
    elif kind in ('text/html', 'application/xhtml+xml'):
        html = data.decode('utf-8', 'replace')
        parser = ArticleParser()
        parser.feed(html)
        text = parser.text()
        if len(text) < 200 and os.environ.get('READER_RENDER_JS') == 'true':
            parser = ArticleParser()
            parser.feed(render_js(final, html, deadline))
            text = parser.text()
        result.update(format='html', title=parser.title[:300], author=parser.author[:160], published=parser.published)
    elif kind == 'text/plain':
        text = data.decode('utf-8', 'replace')
        result['format'] = 'text'
    else:
        raise ValueError('Unsupported document type')
    result['text'], shortened = relevant_chunks(text, query)
    result['partial'] = result['partial'] or shortened
    if len(result['text']) < 80:
        raise ValueError('Insufficient readable text')
    return result


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass  # Do not put queries, URLs or auth in logs.

    def do_POST(self):
        if not KEY or not hmac.compare_digest(self.headers.get('Authorization', ''), 'Bearer ' + KEY):
            self.send_error(401)
            return
        if not SLOTS.acquire(blocking=False):
            self.send_error(429)
            return
        try:
            self.connection.settimeout(20)
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length < 12000:
                raise ValueError('Invalid body size')
            request = json.loads(self.rfile.read(length))
            result = read_page(request['url'], str(request.get('query', ''))[:2000])
            payload = json.dumps(result, ensure_ascii=False).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(payload)))
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(payload)
        except Exception:
            self.send_error(422, 'Source could not be read safely')
        finally:
            SLOTS.release()


if __name__ == '__main__':
    if len(KEY) < 32:
        raise SystemExit('READER_KEY must contain at least 32 characters')
    ThreadingHTTPServer(('0.0.0.0', int(os.environ.get('PORT', '8080'))), Handler).serve_forever()
