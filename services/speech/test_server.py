import os
import unittest
from unittest.mock import patch
import server

class SpeechConfigurationTests(unittest.TestCase):
    def test_limits_and_multilingual_allowlist(self):
        self.assertEqual(server.MAX_BYTES, 15 * 1024 * 1024)
        self.assertEqual(server.MAX_SECONDS, 120)
        self.assertIn('pt', server.LANGUAGES)
        self.assertIn('auto', server.LANGUAGES)
        self.assertIn('en', server.LANGUAGES)

    def test_server_binds_loopback_even_if_port_is_configured(self):
        calls = []
        class FakeServer:
            def __init__(self, address, handler):
                calls.append((address, handler))
                self.server_port = address[1]
            def serve_forever(self):
                pass
        with patch.object(server, 'TOKEN', 'x' * 64), patch.object(server, 'ThreadingHTTPServer', FakeServer), patch.dict(os.environ, {'SPEECH_PORT': '9876'}):
            server.main()
        self.assertEqual(calls[0][0], ('127.0.0.1', 9876))
        self.assertIs(calls[0][1], server.Handler)

    def test_multipart_form_works_without_cgi(self):
        boundary = "veyro-test"
        raw = (
            b'--veyro-test\r\nContent-Disposition: form-data; name="language"\r\n\r\npt\r\n'
            b'--veyro-test\r\nContent-Disposition: form-data; name="file"; filename="record.webm"\r\n'
            b'Content-Type: audio/webm\r\n\r\nvideo-placeholder\r\n--veyro-test--\r\n'
        )
        audio, language = server.parse_audio_form(raw, f"multipart/form-data; boundary={boundary}")
        self.assertEqual(audio, b"video-placeholder")
        self.assertEqual(language, "pt")
        with self.assertRaises(ValueError):
            server.parse_audio_form(raw, "text/plain")

    def test_missing_token_prevents_service_start(self):
        with patch.object(server, 'TOKEN', ''):
            with self.assertRaises(SystemExit):
                server.main()

if __name__ == '__main__':
    unittest.main()
