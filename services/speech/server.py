"""Local-only Whisper transcription service for Veyro IA."""
from __future__ import annotations
import cgi
import io
import json
import os
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

MAX_BYTES = 15 * 1024 * 1024
MAX_SECONDS = 120
ALLOWED_TYPES = {"audio/webm", "audio/mp4", "audio/ogg", "audio/wav", "audio/x-wav", "audio/mpeg", "audio/flac", "audio/x-m4a", "audio/3gpp"}
LANGUAGES = {"auto", "pt", "en", "es", "fr", "de", "it", "ja", "zh", "ru", "ar", "ko", "nl"}
MODEL_NAME = os.environ.get("WHISPER_MODEL", "small")
TOKEN = os.environ.get("SPEECH_TOKEN", "")
MODEL = None
MODEL_LOCK = threading.Lock()
WORKER = threading.BoundedSemaphore(1)


def duration_of(data: bytes) -> float:
    import av
    with av.open(io.BytesIO(data)) as container:
        if container.duration is not None:
            return container.duration / av.time_base
        stream = next((s for s in container.streams if s.type == "audio"), None)
        if stream and stream.duration is not None and stream.time_base:
            return float(stream.duration * stream.time_base)
    raise ValueError("duração indisponível")


def transcribe(data: bytes, language: str):
    global MODEL
    with MODEL_LOCK:
        if MODEL is None:
            from faster_whisper import WhisperModel
            MODEL = WhisperModel(MODEL_NAME, device="cpu", compute_type="int8", cpu_threads=max(2, min(8, os.cpu_count() or 4)))
    import av
    import numpy as np
    samples = []
    with av.open(io.BytesIO(data)) as container:
        stream = next(s for s in container.streams if s.type == "audio")
        resampler = av.AudioResampler(format="s16", layout="mono", rate=16000)
        for frame in container.decode(audio=0):
            for converted in resampler.resample(frame):
                samples.append(converted.to_ndarray().reshape(-1))
        for converted in resampler.resample(None):
            samples.append(converted.to_ndarray().reshape(-1))
    if not samples:
        raise ValueError("sem amostras de áudio")
    audio = np.concatenate(samples).astype(np.float32) / 32768.0
    segments, info = MODEL.transcribe(audio, language=None if language == "auto" else language, beam_size=3, vad_filter=True, condition_on_previous_text=False)
    text = " ".join(segment.text.strip() for segment in segments).strip()
    return {"text": text, "language": info.language, "durationSeconds": round(info.duration, 2)}


class Handler(BaseHTTPRequestHandler):
    server_version = "VeyroSpeech/1.0"

    def reply(self, status, obj):
        payload = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(payload)

    def do_POST(self):
        if self.path != "/transcribe":
            return self.reply(404, {"error": "Não encontrado."})
        if not TOKEN or self.headers.get("Authorization") != "Bearer " + TOKEN:
            return self.reply(401, {"error": "Não autorizado."})
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            return self.reply(400, {"error": "Tamanho inválido."})
        if length <= 0 or length > MAX_BYTES + 65536:
            return self.reply(413, {"error": "Áudio acima do limite de 15 MB."})
        if not WORKER.acquire(blocking=False):
            return self.reply(429, {"error": "Outro áudio está sendo processado."})
        try:
            form = cgi.FieldStorage(fp=self.rfile, headers=self.headers, environ={"REQUEST_METHOD": "POST", "CONTENT_TYPE": self.headers.get("Content-Type", ""), "CONTENT_LENGTH": str(length)})
            if "file" not in form or not getattr(form["file"], "file", None):
                return self.reply(400, {"error": "Áudio ausente."})
            part = form["file"]
            if part.type not in ALLOWED_TYPES:
                return self.reply(415, {"error": "Formato de áudio não aceito."})
            data = part.file.read(MAX_BYTES + 1)
            if not data or len(data) > MAX_BYTES:
                return self.reply(413, {"error": "Áudio acima do limite de 15 MB."})
            language = form.getfirst("language", "auto")
            if language not in LANGUAGES:
                return self.reply(400, {"error": "Idioma inválido."})
            try:
                seconds = duration_of(data)
            except Exception:
                return self.reply(400, {"error": "Áudio inválido ou ilegível."})
            if seconds <= 0 or seconds > MAX_SECONDS:
                return self.reply(413, {"error": "O áudio pode ter até 120 segundos."})
            try:
                result = transcribe(data, language)
            except Exception:
                return self.reply(502, {"error": "Falha no reconhecimento local. Confira se o modelo Whisper foi baixado."})
            return self.reply(200, result)
        finally:
            WORKER.release()

    def log_message(self, *_args):
        pass


def main():
    if not TOKEN or len(TOKEN) < 32:
        raise SystemExit("SPEECH_TOKEN ausente ou inválido. Rode npm run setup e carregue o valor do .env.")
    server = ThreadingHTTPServer(("127.0.0.1", int(os.environ.get("SPEECH_PORT", "8765"))), Handler)
    print(f"Whisper local em http://127.0.0.1:{server.server_port} · modelo {MODEL_NAME} · CPU int8")
    server.serve_forever()


if __name__ == "__main__":
    main()
