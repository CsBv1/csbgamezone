"""Live wheel security checks against a minted session; a funded spin costs one Key."""
import unittest
import requests
import currency_swaps_test as setup


class WheelColors(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        setup.CurrencySwaps.setUpClass()
        cls.url = setup.CurrencySwaps.url
        cls.headers = setup.CurrencySwaps.headers
        cls.uid = setup.CurrencySwaps.user_id

    def rows(self, table):
        response = requests.get(self.url+'/'+table, headers=self.headers,
            params={'user_id':'eq.'+self.uid,'select':'*'},timeout=30)
        response.raise_for_status()
        return response.json()

    def test_direct_unlock_and_identity_changes_denied(self):
        before = self.rows('user_colors')
        response = requests.post(self.url+'/user_colors',headers=self.headers,
            json={'user_id':self.uid,'color_name':'Forged','color_value':'#FFFFFF'},timeout=30)
        self.assertEqual(response.status_code,403)
        response = requests.patch(self.url+'/user_colors',headers=self.headers,
            params={'user_id':'eq.'+self.uid},json={'color_name':'Forged'},timeout=30)
        self.assertEqual(response.status_code,403)
        self.assertEqual(self.rows('user_colors'),before)

    def test_signed_out_and_chosen_prize_rejected(self):
        response = requests.post(self.url+'/rpc/spin_color_wheel',
            headers={'apikey':self.headers['apikey']},json={},timeout=30)
        self.assertIn(response.status_code,(401,403))
        response = requests.post(self.url+'/rpc/spin_color_wheel',headers=self.headers,
            json={'index':0},timeout=30)
        self.assertEqual(response.status_code,404)

    def test_spin_requires_key_and_uses_server_prize(self):
        before_keys = self.rows('user_keys')
        before_colors = self.rows('user_colors')
        balance = sum(row['balance'] for row in before_keys)
        response = requests.post(self.url+'/rpc/spin_color_wheel',headers=self.headers,json={},timeout=30)
        if balance < 1:
            self.assertEqual(response.status_code,400)
            self.assertEqual(self.rows('user_keys'),before_keys)
            self.assertEqual(self.rows('user_colors'),before_colors)
            return
        self.assertEqual(response.status_code,200)
        result = response.json()
        self.assertIn(result['index'],range(12))
        self.assertEqual(sum(row['balance'] for row in self.rows('user_keys')),balance-1)
        self.assertTrue(any(row['color_name']==result['name'] and row['color_value']==result['value']
            for row in self.rows('user_colors')))