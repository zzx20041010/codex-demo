import unittest

from app import calculate_profit


class CalculateProfitTests(unittest.TestCase):
    def test_typical_order(self):
        self.assertEqual(calculate_profit(59.9, 22.4, 3.5), 34.0)

    def test_zero_and_negative_profit(self):
        self.assertEqual(calculate_profit(0, 0, 0), 0)
        self.assertEqual(calculate_profit(10, 12, 1), -3)

    def test_negative_amount_is_rejected(self):
        with self.assertRaises(ValueError):
            calculate_profit(10, -1, 2)


if __name__ == "__main__":
    unittest.main()
