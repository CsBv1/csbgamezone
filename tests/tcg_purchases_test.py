"""Non-destructive live checks for server-owned trading-card purchases."""
import unittest
import requests
import currency_swaps_test as setup


class TcgPurchases(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        setup.CurrencySwaps.setUpClass()
        cls.url = setup.CurrencySwaps.url
        cls.headers = setup.CurrencySwaps.headers
        cls.user_id = setup.CurrencySwaps.user_id

    def snapshot(self):
        result = {}
        for table in ('csb_tcg_cards', 'csbv1_players'):
            response = requests.get(self.url + '/' + table, headers=self.headers,
                params={'user_id': 'eq.' + self.user_id, 'select': '*', 'order': 'id'}, timeout=30)
            response.raise_for_status()
            result[table] = response.json()
        return result

    def buy(self, payload, headers=None):
        return requests.post(self.url + '/rpc/purchase_csb_tcg_card',
            headers=headers or self.headers, json=payload, timeout=30)

    def test_direct_collection_writes_denied(self):
        before = self.snapshot()
        response = requests.post(self.url + '/csb_tcg_cards', headers=self.headers,
            json={'user_id': self.user_id, 'card_id': 'chain_golem', 'quantity': 999}, timeout=30)
        self.assertEqual(response.status_code, 403)
        response = requests.patch(self.url + '/csb_tcg_cards', headers=self.headers,
            params={'user_id': 'eq.' + self.user_id}, json={'quantity': 999}, timeout=30)
        self.assertEqual(response.status_code, 403)
        self.assertEqual(self.snapshot(), before)

    def test_invalid_signed_out_and_caller_prices_rejected(self):
        before = self.snapshot()
        self.assertEqual(self.buy({'_card_id': 'forged_card'}).status_code, 400)
        self.assertIn(self.buy({'_card_id': 'chain_golem'},
            {'apikey': self.headers['apikey']}).status_code, (401, 403))
        self.assertIn(self.buy({'_card_id': 'chain_golem', 'price': 0}).status_code, (400, 404))
        self.assertEqual(self.snapshot(), before)

    def test_insufficient_funds_is_atomic(self):
        before = self.snapshot()
        rows = before['csbv1_players']
        if rows and rows[0]['balance'] >= 600:
            self.skipTest('Requires less than 600 Rune Power; no account funds are changed')
        self.assertEqual(self.buy({'_card_id': 'chain_golem'}).status_code, 400)
        self.assertEqual(self.snapshot(), before)