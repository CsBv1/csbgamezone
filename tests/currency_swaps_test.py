"""Live swap checks using a minted account; successful checks spend its currency.

Run: python3 -m unittest discover -s tests -p '*_test.py'
"""
import json
import os
import unittest
from pathlib import Path
import requests


class CurrencySwaps(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        root = Path(__file__).resolve().parents[1]
        config = {}
        for line in (root / '.env').read_text().splitlines():
            if '=' in line:
                key, value = line.split('=', 1)
                config[key] = value.strip('"')
        session = json.loads(Path(os.path.expanduser('~/.cache/lovable-auth/session.json')).read_text())['session']
        cls.url = config['VITE_SUPABASE_URL'] + '/rest/v1'
        cls.headers = {'apikey': config['VITE_SUPABASE_PUBLISHABLE_KEY'], 'Authorization': 'Bearer ' + session['access_token']}
        cls.user_id = session['user']['id']

    def balances(self):
        result = {}
        for table in ('user_credits', 'user_diamonds', 'user_bukals', 'user_keys'):
            response = requests.get(self.url + '/' + table, headers=self.headers,
                params={'user_id': 'eq.' + self.user_id, 'select': 'balance'}, timeout=30)
            response.raise_for_status()
            result[table] = sum(row['balance'] or 0 for row in response.json())
        return result

    def swap(self, name, headers=None):
        return requests.post(self.url + '/rpc/swap_game_currency', headers=headers or self.headers,
            json={'_swap': name}, timeout=30)

    def test_diamonds_cost_100_credits_and_award_5(self):
        before = self.balances()
        if before['user_credits'] < 100:
            self.skipTest('Account needs 100 Credits for a real swap')
        self.assertEqual(self.swap('credits_to_diamonds').status_code, 200)
        after = self.balances()
        self.assertEqual(after['user_credits'], before['user_credits'] - 100)
        self.assertEqual(after['user_diamonds'], before['user_diamonds'] + 5)

    def test_bukal_requires_1000000_credits(self):
        before = self.balances()
        response = self.swap('credits_to_bukals')
        after = self.balances()
        if before['user_credits'] < 1000000:
            self.assertEqual(response.status_code, 400)
            self.assertEqual(after, before)
        else:
            self.assertEqual(response.status_code, 200)
            self.assertEqual(after['user_credits'], before['user_credits'] - 1000000)
            self.assertEqual(after['user_bukals'], before['user_bukals'] + 1)

    def test_key_requires_1000000_diamonds(self):
        before = self.balances()
        response = self.swap('diamonds_to_keys')
        after = self.balances()
        if before['user_diamonds'] < 1000000:
            self.assertEqual(response.status_code, 400)
            self.assertEqual(after, before)
        else:
            self.assertEqual(response.status_code, 200)
            self.assertEqual(after['user_diamonds'], before['user_diamonds'] - 1000000)
            self.assertEqual(after['user_keys'], before['user_keys'] + 1)

    def test_invalid_swap_does_not_change_balances(self):
        before = self.balances()
        self.assertEqual(self.swap('free_diamonds').status_code, 400)
        self.assertEqual(self.balances(), before)

    def test_signed_out_swap_is_denied(self):
        before = self.balances()
        self.assertIn(self.swap('credits_to_diamonds', {'apikey': self.headers['apikey']}).status_code, (401, 403))
        self.assertEqual(self.balances(), before)