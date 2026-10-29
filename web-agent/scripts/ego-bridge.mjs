const params = new URL(import.meta.url).searchParams;
const action = params.get("action");
const spaceName = params.get("space") || "douyin-1688-web-agent";
const count = Math.max(1, Math.min(30, Number(params.get("count")) || 10));
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
  const currentBefore = await page.url();
  if (!currentBefore.startsWith("https://compass.jinritemai.com/shop/chance/merchandise-product-rank")) {
    try {
      await page.goto(compassUrl);
    } catch (error) {
      if (!String(error?.message || error).includes("navigation committed")) throw error;
    }
  }
  emit({
    action,
    url: await page.url(),
    title: await page.title(),
    message: "罗盘页面已打开。请先在 Ego 浏览器完成日期、非知名品牌和 ¥0–¥15 筛选，再回到本工作台点击“读取当前页商品链接”。"
  });
} else if (action === "readCurrent") {
  const page = findPage("p1");
  if (!page) throw new Error("还没有罗盘页面，请先点击“打开电商罗盘”");
  const listed = await page.evaluate(() => {
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
    if (items.length) return { items, rows: [] };
    const rows = Array.from(document.querySelectorAll("tr.aurora-table-row")).map(row => {
      const cells = Array.from(row.querySelectorAll("td"));
      const button = Array.from(row.querySelectorAll("button")).find(item => item.innerText.trim() === "查看详情");
      return {
        rowKey: row.getAttribute("data-row-key"),
        detailAction: button?.parentElement?.getAttribute("data-btm") || "",
        title: (cells[1]?.innerText || "").trim().split(/\r?\n/)[0].slice(0, 300),
        image: row.querySelector("img")?.src || ""
      };
    }).filter(row => row.rowKey && row.detailAction && row.title);
    return { items, rows };
  });
  const details = [...listed.items];
  for (const row of listed.rows.slice(0, count - details.length)) {
    const selector = `tr[data-row-key="${row.rowKey}"] div[data-btm="${row.detailAction}"] button`;
    const tabsBefore = await task.tabs();
    const previousTargets = new Set(tabsBefore.map(tab => tab.targetId));
    const receipt = await page.click(selector, { label: "Open product detail", force: true });
    let popupInfo = receipt.popups?.[0];
    if (!popupInfo) {
      await new Promise(resolve => setTimeout(resolve, 250));
      const opened = (await task.tabs()).find(tab => tab.label && !previousTargets.has(tab.targetId));
      if (opened) popupInfo = { label: opened.label };
    }
    if (!popupInfo) continue;
    const detailPage = task.page(popupInfo.label);
    const detailUrl = new URL(await detailPage.url());
    const productId = detailUrl.searchParams.get("product_id");
    if (productId) {
      const productUrl = new URL("https://haohuo.jinritemai.com/ecommerce/trade/detail/index.html");
      productUrl.searchParams.set("id", productId);
      productUrl.searchParams.set("origin_type", "pc_compass_manage");
      productUrl.searchParams.set("from_page", "/shop/chance/merchandise-product-rank");
      details.push({ title: row.title, url: productUrl.toString(), image: row.image });
    }
    await detailPage.close();
  }
  emit({
    action,
    url: await page.url(),
    title: await page.title(),
    items: details,
    message: details.length
      ? `已读取 ${details.length} 个商品链接，请检查商品与类目后再进行 1688 核价。`
      : "当前页没有识别到商品。请确认商品卡榜列表已加载，且筛选已生效。"
  });
} else if (action === "open1688") {
  let page = findPage("p2");
  if (!page) page = await task.newPage();
  const imageSearchUrl = "https://air.1688.com/kapp/1688-search/pc-image-search/";
  if (!(await page.url()).startsWith(imageSearchUrl)) {
    try {
      await page.goto(imageSearchUrl);
    } catch (error) {
      if (!String(error?.message || error).includes("navigation committed")) throw error;
    }
  }
  emit({
    action,
    url: await page.url(),
    title: await page.title(),
    message: "已在同一 Ego 任务中新开 1688 页面。商品图搜款和规格核对仍需在页面内确认。"
  });
} else {
  throw new Error("未知的 Ego 浏览器操作");
}

