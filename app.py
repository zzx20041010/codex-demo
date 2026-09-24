"""一个用于练习 Codex 的单笔订单成本计算示例。"""


def calculate_profit(price: float, product_cost: float, shipping_cost: float) -> float:
    """返回单笔订单的简化利润；金额单位为元。"""
    if any(value < 0 for value in (price, product_cost, shipping_cost)):
        raise ValueError("金额不能为负数")
    return round(price - product_cost - shipping_cost, 2)


def main() -> None:
    print("JCAT 单笔订单利润计算（示例，不含平台费、广告费、退货和税费）")
    try:
        price = float(input("售价（元）："))
        product_cost = float(input("产品成本（元）："))
        shipping_cost = float(input("运费（元）："))
        profit = calculate_profit(price, product_cost, shipping_cost)
    except ValueError as error:
        print(f"输入有误：{error}")
        return
    print(f"简化利润：{profit:.2f} 元")


if __name__ == "__main__":
    main()
