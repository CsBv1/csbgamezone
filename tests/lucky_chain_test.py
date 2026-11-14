"""Live boundary checks; prepared run fixture is set by the test operator."""
import unittest
import requests
import currency_swaps_test as setup


class LuckyChain(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        setup.CurrencySwaps.setUpClass()
        cls.url = setup.CurrencySwaps.url
        cls.headers = setup.CurrencySwaps.headers
        cls.uid = setup.CurrencySwaps.user_id

    def rpc(self, payload, headers=None):
        return requests.post(self.url + '/rpc/lucky_chain_action', headers=headers or self.headers,
                             json=payload, timeout=30)

    def test_no_client_progress_writes(self):
        response = requests.post(self.url + '/lucky_chain_runs', headers=self.headers,
                                 json={'user_id': self.uid, 'chain': 20, 'diamonds': 9999999}, timeout=30)
        self.assertEqual(response.status_code, 403)

    def test_no_caller_reward(self):
        response = self.rpc({'_action': 'cash_out', '_amount': 9999999})
        self.assertEqual(response.status_code, 404)

    def test_signed_out_denied(self):
        response = self.rpc({'_action': 'start'}, {'apikey': self.headers['apikey']})
        self.assertIn(response.status_code, (401, 403))

    def test_invalid_run_denied(self):
        response = self.rpc({'_action': 'cash_out', '_run_id': '00000000-0000-0000-0000-000000000000', '_expected_chain': 20})
        self.assertEqual(response.status_code, 400)

    def test_paid_run_cannot_pay_twice(self):
        response = requests.get(self.url + '/lucky_chain_runs', headers=self.headers,
                                params={'user_id': 'eq.' + self.uid}, timeout=30)
        response.raise_for_status()
        runs = response.json()
        if not runs or runs[0]['status'] != 'paid':
            self.skipTest('Finish a Lucky Chain run before testing replay')
        run = runs[0]
        response = self.rpc({'_action': 'cash_out', '_run_id': run['id'], '_expected_chain': run['chain']})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['awarded'], 0)


if __name__ == '__main__':
    unittest.main()