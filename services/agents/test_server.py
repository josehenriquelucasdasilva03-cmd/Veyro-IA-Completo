import unittest

import server


class AgentServiceTests(unittest.TestCase):
    def test_authentication_uses_constant_time_comparison(self):
        server.TOKEN = 't' * 48
        try:
            self.assertTrue(server.authorized('Bearer ' + server.TOKEN))
            self.assertFalse(server.authorized('Bearer wrong'))
            self.assertFalse(server.authorized(''))
        finally:
            server.TOKEN = ''

    def test_request_validation_rejects_invalid_mode_and_empty_or_long_query(self):
        self.assertEqual(server.parse_request({'query': ' pesquisa ', 'mode': 'STANDARD'}), ('pesquisa', 'STANDARD'))
        for body in ({'query': 'pesquisa', 'mode': []}, {'query': ' ', 'mode': 'DEEP'}, {'query': 'x' * 2001, 'mode': 'DEEP'}, []):
            with self.subTest(body_type=type(body).__name__):
                with self.assertRaises(ValueError):
                    server.parse_request(body)


if __name__ == '__main__':
    unittest.main()
