import unittest
from contextlib import redirect_stdout
from io import StringIO
from unittest.mock import patch

from app import calculate_profit, main


class CalculateProfitTests(unittest.TestCase):
    def test_typical_order(self):
        self.assertEqual(calculate_profit(59.9, 22.4, 3.5), 34.0)

    def test_zero_and_negative_profit(self):
        self.assertEqual(calculate_profit(0, 0, 0), 0)
        self.assertEqual(calculate_profit(10, 12, 1), -3)

    def test_negative_amount_is_rejected(self):
        with self.assertRaises(ValueError):
            calculate_profit(10, -1, 2)

    def test_rates_reduce_profit(self):
        self.assertEqual(calculate_profit(59.9, 22.4, 3.5, 0.05, 0.03), 29.21)
        self.assertEqual(calculate_profit(100, 20, 5, 0.05), 70)
        self.assertEqual(calculate_profit(100, 20, 5, after_sales_loss_rate=0.03), 72)

    def test_explicit_zero_rates_keep_old_result(self):
        self.assertEqual(calculate_profit(59.9, 22.4, 3.5, 0, 0), 34)

    def test_rate_boundaries_and_combined_loss(self):
        self.assertEqual(calculate_profit(100, 20, 5, 1, 0), -25)
        self.assertEqual(calculate_profit(100, 20, 5, 0, 1), -25)
        self.assertEqual(calculate_profit(100, 20, 5, 0.8, 0.8), -85)
        self.assertEqual(calculate_profit(0, 2, 1, 1, 1), -3)

    def test_invalid_rates_are_rejected(self):
        for rate in (-0.01, 1.01):
            for position in (3, 4):
                values = [100, 20, 5, 0, 0]
                values[position] = rate
                with self.subTest(rate=rate, position=position):
                    with self.assertRaises(ValueError):
                        calculate_profit(*values)

    def test_non_finite_inputs_are_rejected(self):
        for value in (float('nan'), float('inf'), float('-inf')):
            for position in range(5):
                values = [100, 20, 5, 0, 0]
                values[position] = value
                with self.subTest(value=value, position=position):
                    with self.assertRaises(ValueError):
                        calculate_profit(*values)

    def test_each_negative_amount_is_rejected(self):
        for position in range(3):
            values = [10, 2, 1]
            values[position] = -1
            with self.subTest(position=position):
                with self.assertRaises(ValueError):
                    calculate_profit(*values)

    def test_round_only_final_result(self):
        self.assertEqual(calculate_profit(1, 0, 0, 0.004, 0.004), 0.99)

    def test_cli_percentages_and_blank_defaults(self):
        for inputs, expected in (
            (['59.9', '22.4', '3.5', '5', '3'], '29.21'),
            (['59.9', '22.4', '3.5', '', ''], '34.00'),
        ):
            with self.subTest(inputs=inputs):
                output = StringIO()
                with patch('builtins.input', side_effect=inputs), redirect_stdout(output):
                    main()
                self.assertIn(f'简化利润：{expected} 元', output.getvalue())

    def test_cli_invalid_input(self):
        for inputs in (['abc'], ['10', '2', '1', '101', '0'], ['nan', '2', '1', '0', '0']):
            with self.subTest(inputs=inputs):
                output = StringIO()
                with patch('builtins.input', side_effect=inputs), redirect_stdout(output):
                    main()
                self.assertIn('输入有误：', output.getvalue())
                self.assertNotIn('简化利润：', output.getvalue())


if __name__ == "__main__":
    unittest.main()
