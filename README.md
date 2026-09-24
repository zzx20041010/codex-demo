# Codex 入门练习：JCAT 单笔订单计算器

这是一个零基础可运行的 Python 小项目。你可以先运行它，再让 Codex 帮你改动一处功能、运行测试并解释改动。**金额只是输入示例，不代表 JCAT 的真实成本或利润。**

## 项目结构

```text
codex-demo/
├── app.py              # 命令行程序与计算函数
├── tests/
│   └── test_app.py     # 基础测试
├── .gitignore          # 忽略本地 Python 缓存
└── README.md           # 使用说明
```

## 启动

需要 Python 3.9 或更新版本；只使用 Python 标准库，无需安装依赖。

1. 在 GitHub 页面点击 **Code → Download ZIP**，解压并在终端进入 `codex-demo` 文件夹；也可以运行 `git clone https://github.com/zzx20041010/codex-demo.git`，再运行 `cd codex-demo`。
2. 检查 Python：`python --version`（有些电脑需使用 `python3`，Windows 也可试 `py`）。
3. 启动：`python app.py`。按提示输入售价、产品成本和运费，每项输入数字后按回车。若上一步使用的是 `python3` 或 `py`，这里及以下命令也换成相同名称。

例如依次输入 `59.9`、`22.4`、`3.5`，会显示 `简化利润：34.00 元`。目前只计算 **售价 − 产品成本 − 运费**；没有计入平台费用、广告、退货、税费等，不能用于实际经营决策。

## 运行测试

在项目根目录执行：

```bash
python -m unittest discover -s tests -v
```

看到 `OK` 表示测试通过。

## 第一次用 Codex 改代码

在 Codex 中打开这个项目文件夹，尝试输入：

> 请先阅读 README.md 和 app.py。给计算器增加“包装费”输入，并让计算函数扣除包装费；更新测试和 README。改完运行测试，向我解释修改了什么。

完成后自己重新运行 `python app.py`，输入一组数字核对结果。接着查看改动：`git diff`。如果没有安装 Git，可以先直接比较文件内容。学习顺序是：运行原版 → 提出一项明确改动 → 阅读 Codex 的改动 → 运行测试 → 自己验证结果。
