"""Live checks: Keys can only be earned via server functions; holder rewards need bulls; daily claim once."""
import unittest
import requests
import currency_swaps_test as setup


class KeyRewards(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        setup.CurrencySwaps.setUpClass()
        cls.url = setup.CurrencySwaps.url
        cls.headers = setup.CurrencySwaps.headers
        cls.uid = setup.CurrencySwaps.user_id

    def keys(self):
        r = requests.get(self.url+'/user_keys', headers=self.headers,
            params={'user_id':'eq.'+self.uid,'select':'balance'}, timeout=30)
        r.raise_for_status()
        return sum(x['balance'] for x in r.json())

    def test_browser_cannot_raise_keys(self):
        before = self.keys()
        r = requests.patch(self.url+'/user_keys', headers=self.headers,
            params={'user_id':'eq.'+self.uid}, json={'balance': before+1}, timeout=30)
        self.assertGreaterEqual(r.status_code, 400)
        self.assertEqual(self.keys(), before)

    def test_award_requires_bulls_or_is_capped(self):
        before = self.keys()
        r = requests.post(self.url+'/rpc/award_holder_keys', headers=self.headers,
            json={'_game':'Test','_amount':999}, timeout=30)
        if r.status_code == 200:
            self.assertLessEqual(r.json()['awarded'], 5)
        else:
            self.assertEqual(self.keys(), before)

    def test_daily_claim_not_writable_directly(self):
        r = requests.post(self.url+'/daily_claims', headers=self.headers,
            json={'user_id':self.uid,'claim_date':'2099-01-01','reward_type':'keys','reward_amount':99}, timeout=30)
        self.assertEqual(r.status_code, 403)

    def test_signed_out_award_rejected(self):
        r = requests.post(self.url+'/rpc/award_holder_keys', headers={'apikey':self.headers['apikey']},
            json={'_game':'Test','_amount':1}, timeout=30)
        self.assertIn(r.status_code, (401,403))


if __name__ == '__main__':
    unittest.main()
