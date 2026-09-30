"""一个用于练习 Codex 的单笔订单成本计算示例。"""

from math import isfinite


def calculate_profit(
    price: float,
    product_cost: float,
    shipping_cost: float,
    platform_fee_rate: float = 0.0,
    after_sales_loss_rate: float = 0.0,
) -> float:
    """返回简化利润；金额单位为元，费率用小数（0.05 表示 5%）。

    平台费和预估售后损耗均按售价计算；只在最终结果保留两位小数。
    """
    amounts = (price, product_cost, shipping_cost)
    rates = (platform_fee_rate, after_sales_loss_rate)
    if any(not isfinite(value) for value in amounts + rates):
        raise ValueError("金额和费率必须是有限数字")
    if any(value < 0 for value in amounts):
        raise ValueError("金额不能为负数")
    if any(not 0 <= rate <= 1 for rate in rates):
        raise ValueError("费率必须在 0 到 1 之间（含边界）")
    platform_fee = price * platform_fee_rate
    after_sales_loss = price * after_sales_loss_rate
    return round(price - product_cost - shipping_cost - platform_fee - after_sales_loss, 2)


def main() -> None:
    print("JCAT 单笔订单利润计算（学习示例，不含广告费和税费；售后损耗为简化估算）")
    try:
        price = float(input("售价（元）："))
        product_cost = float(input("产品成本（元）："))
        shipping_cost = float(input("运费（元）："))
        platform_fee_rate = float(input("平台费率（%，如 5 表示 5%，回车为 0）：") or "0") / 100
        after_sales_loss_rate = float(input("售后损耗率（%，按售价估算，回车为 0）：") or "0") / 100
        profit = calculate_profit(
            price, product_cost, shipping_cost, platform_fee_rate, after_sales_loss_rate
        )
    except ValueError as error:
        print(f"输入有误：{error}")
        return
    print(f"简化利润：{profit:.2f} 元")


if __name__ == "__main__":
    main()
