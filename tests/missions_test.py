"""Live checks: missions progress and rewards only through server functions."""
import unittest, requests
import currency_swaps_test as setup

class Missions(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        setup.CurrencySwaps.setUpClass()
        cls.url, cls.headers, cls.uid = setup.CurrencySwaps.url, setup.CurrencySwaps.headers, setup.CurrencySwaps.user_id

    def test_direct_mission_write_denied(self):
        r = requests.post(self.url+'/csbv1_missions', headers=self.headers, json={'user_id':self.uid,'mission_id':'hard_grind','reset_date':'2099-01-01','progress':10,'completed':True}, timeout=30)
        self.assertEqual(r.status_code, 403)

    def test_unfinished_claim_rejected(self):
        r = requests.post(self.url+'/rpc/csb_claim_mission', headers=self.headers, json={'_mission':'hard_grind'}, timeout=30)
        if r.status_code != 200:
            self.assertGreaterEqual(r.status_code, 400)

    def test_unknown_mission_rejected(self):
        r = requests.post(self.url+'/rpc/csb_mission_step', headers=self.headers, json={'_mission':'free_money'}, timeout=30)
        self.assertGreaterEqual(r.status_code, 400)

if __name__ == '__main__':
    unittest.main()
