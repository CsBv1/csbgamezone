"""Authenticated live badge checks; run with a dedicated funded test account.

Uses the same minted-session setup as the currency swap checks.
"""
import unittest
import requests
import currency_swaps_test as currency_setup


class BadgePurchases(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        currency_setup.CurrencySwaps.setUpClass()
        cls.url = currency_setup.CurrencySwaps.url
        cls.headers = currency_setup.CurrencySwaps.headers
        cls.user_id = currency_setup.CurrencySwaps.user_id

    def rows(self):
        response = requests.get(self.url + '/user_badges', headers=self.headers,
            params={'user_id': 'eq.' + self.user_id, 'select': '*'}, timeout=30)
        response.raise_for_status()
        return response.json()

    def diamonds(self):
        response = requests.get(self.url + '/user_diamonds', headers=self.headers,
            params={'user_id': 'eq.' + self.user_id, 'select': 'balance'}, timeout=30)
        response.raise_for_status()
        return response.json()[0]['balance']

    def buy(self, badge, headers=None):
        return requests.post(self.url + '/rpc/purchase_csb_badge', headers=headers or self.headers,
            json={'_badge_id': badge}, timeout=30)

    def test_invalid_and_signed_out_rejected(self):
        before = self.diamonds()
        self.assertEqual(self.buy('forged_badge').status_code, 400)
        self.assertIn(self.buy('csb_common_copper', {'apikey': self.headers['apikey']}).status_code, (401,403))
        self.assertEqual(self.diamonds(), before)

    def test_direct_insert_and_identity_update_denied(self):
        response = requests.post(self.url + '/user_badges', headers=self.headers, json={
            'user_id': self.user_id, 'badge_id': 'forged_badge', 'badge_name': 'Free',
            'badge_color': '#FFD700', 'diamond_cost': 0}, timeout=30)
        self.assertEqual(response.status_code, 403)
        response = requests.patch(self.url + '/user_badges', headers=self.headers,
            params={'user_id': 'eq.' + self.user_id}, json={'badge_id':'csb_legendary_gold'}, timeout=30)
        self.assertEqual(response.status_code, 403)

    def test_insufficient_funds_changes_nothing(self):
        before = self.diamonds()
        rows = self.rows()
        if before >= 50000 or any(row['badge_id']=='csb_legendary_gold' for row in rows):
            self.skipTest('Requires less than 50K Diamonds and no Gold badge')
        self.assertEqual(self.buy('csb_legendary_gold').status_code,400)
        self.assertEqual(self.diamonds(),before)
        self.assertEqual(self.rows(),rows)

    def test_purchase_and_repeat_charge_once(self):
        before = self.diamonds()
        if any(row['badge_id']=='csb_common_copper' for row in self.rows()):
            self.skipTest('Requires a not-yet-owned Copper badge')
        if before < 500:
            self.skipTest('Requires 500 Diamonds')
        response = self.buy('csb_common_copper')
        self.assertEqual(response.status_code,200)
        self.assertEqual(self.diamonds(), before-500)
        self.assertEqual(response.json()['diamond_cost'],500)
        self.assertEqual(response.json()['badge_name'],'Common Copper')
        self.assertEqual(self.buy('csb_common_copper').status_code,200)
        self.assertEqual(self.diamonds(), before-500)
        row = next(row for row in self.rows() if row['badge_id']=='csb_common_copper')
        response = requests.patch(self.url+'/user_badges',headers=self.headers,
            params={'id':'eq.'+row['id']},json={'active':True},timeout=30)
        self.assertIn(response.status_code,(200,204))
        self.assertTrue(next(saved for saved in self.rows() if saved['id']==row['id'])['active'])