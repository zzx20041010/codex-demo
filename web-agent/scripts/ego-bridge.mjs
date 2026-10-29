const params = new URL(import.meta.url).searchParams;
const action = params.get("action");
const spaceName = params.get("space") || "douyin-1688-web-agent";
const compassUrl = "https://compass.jinritemai.com/shop/chance/merchandise-product-rank?rank_type=3";

const task = await taskSpace(spaceName);
const pages = await task.pages();

function findPage(label) {
  const found = pages.find(page => page.label === label);
  return found ? task.page(label) : null;
}

function emit(value) {
  console.log(JSON.stringify(value));
}

if (action === "openCompass") {
  let page = findPage("p1");
  if (!page) page = await task.newPage();
  await page.goto(compassUrl);
  emit({
    action,
    url: await page.url(),
    title: await page.title(),
    message: "已在 Ego 浏览器打开电商罗盘商品卡榜单。请在页面确认日期、品牌和价格筛选。"
  });
} else if (action === "readCurrent") {
  const page = findPage("p1");
  if (!page) throw new Error("还没有罗盘页面，请先点击“打开电商罗盘”");
  const details = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a[href*="haohuo.jinritemai.com/ecommerce/trade/detail/index.html"]'));
    const seen = new Set();
    const items = [];
    for (const anchor of anchors) {
      const url = anchor.href;
      if (!url || seen.has(url)) continue;
      seen.add(url);
      const card = anchor.closest("tr") || anchor.closest("article") || anchor.parentElement?.parentElement;
      const title = (anchor.innerText || card?.innerText || "").trim().replace(/\s+/g, " ").slice(0, 300);
      const image = card?.querySelector("img")?.src || "";
      items.push({ title, url, image });
    }
    return items;
  });
  emit({
    action,
    url: await page.url(),
    title: await page.title(),
    items: details,
    message: details.length
      ? "从当前页面读取了商品卡片链接；请检查商品与类目后再进行 1688 核价。"
      : "当前页面没有识别到商品链接。请确认你在商品卡榜列表页且筛选已生效。"
  });
} else if (action === "open1688") {
  let page = findPage("p2");
  if (!page) page = await task.newPage();
  await page.goto("https://air.1688.com/kapp/1688-search/pc-image-search/");
  emit({
    action,
    url: await page.url(),
    title: await page.title(),
    message: "已在同一 Ego 任务中新开 1688 页面。商品图搜款和规格核对仍需在页面内确认。"
  });
} else {
  throw new Error("未知的 Ego 浏览器操作");
}