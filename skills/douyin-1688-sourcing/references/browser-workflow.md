# 已实操页面经验

以下来自2026-10-26的现场操作，类名可能变化；每次必须以当前页面观察为准，不复用旧截图ref。

## 电商罗盘

- 商品卡榜单路径示例：`https://compass.jinritemai.com/shop/chance/merchandise-product-rank?rank_type=3`。
- 价格“自定义”弹窗使用最小值、最大值输入框，填0和15后点击确定。用选中状态确认条件，不能仅根据结果数量猜测是否生效。
- 商品标题点击可直接打开 `https://haohuo.jinritemai.com/ecommerce/trade/detail/index.html?id=...`。点击“查看详情”打开的是罗盘竞品分析，不能代替用户要的商品链接。
- 某次SKT商品真实链接ID是3785145433173656430，而第三方扩展checkbox中的itemid是3797209025603568175；只能采用真实导航URL。
- 商品页可能要求抖音登录；可保留真实点击取得的预览链接并标明登录要求，无需为了抖音售价阻塞采集。

## 1688以图搜款

- 首页实际观察到 `input[aria-label="以图搜款"]`，通过setInputFiles上传已有商品截图。
- 上传弹层的搜索按钮与关键词搜索按钮不同。曾观察到上传按钮 `button.actionPrimary--sz2L3jNq`；操作前重新检查。
- 点击后可能先显示“正在上传中”，然后异步打开 `air.1688.com/kapp/1688-search/pc-image-search/`。先检查tabs和页面状态，不因即时snapshot未变化而重复上传。
- 搜索结果卡片曾为 `.searchOfferWrapper--St2OXxYo`，标题 `.titleText--lFyZZzfJ`。结果可能带第三方扩展，使点击标题不产生导航。可从可见卡片的商品链接或DOM商品offerId定位对应详情并打开，再核实标题、供应商和规格。不可把搜索卡片报价当最终规格价。
- 详情URL格式 `https://detail.1688.com/offer/<offerId>.html`。
- goto等待load超时但已提交导航时，在原页面检查DOM与目标内容，通常无需重新打开标签。

## 页面与证据管理

为罗盘榜单、1688搜索、商品详情保留少量标签并复用。图片/视频演示标签是中间过程，处理完可关闭；保留用户原有标签。最终依ego指南finish，仅留下用户继续查看所需的结果页。

只保存与所选商品相关的截图和页面字段；不读取或导出cookies、登录存储、账号凭据。不要把截图上传到用户未指定的第三方服务。
