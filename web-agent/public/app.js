const byId = id => document.getElementById(id);
let toastTimer;
let state = { records: [], job: { status: "idle", message: "" } };

function notify(message) {
  const toast = byId("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { "content-type": "application/json", ...(options.headers || {}) }
  });
  const data = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(data?.error || "操作失败");
  return data;
}

function linkNode(url, label) {
  if (!url) return document.createTextNode("未填写");
  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.textContent = label;
  return link;
}

function cell(content) {
  const td = document.createElement("td");
  if (content instanceof Node) td.append(content);
  else td.textContent = content || "—";
  return td;
}

function renderRecords(records) {
  const body = byId("records-body");
  body.replaceChildren();
  byId("result-count").textContent = records.length + " 条";
  if (!records.length) {
    const row = document.createElement("tr");
    row.className = "empty-row";
    const td = document.createElement("td");
    td.colSpan = 6;
    td.textContent = "读取商品后会显示在这里";
    row.append(td);
    body.append(row);
    return;
  }

  for (const item of records) {
    const row = document.createElement("tr");
    const title = document.createElement("span");
    title.className = "product-title";
    title.textContent = item.productName || "待补充商品名";
    const category = document.createElement("span");
    category.className = "quiet";
    category.textContent = item.category || "";
    const productCell = document.createElement("td");
    productCell.append(title, category);
    row.append(productCell);

    const douyinLink = linkNode(item.douyinLink, "打开商品 ↗");
    const douyinCell = document.createElement("td");
    douyinCell.append(douyinLink);
    row.append(douyinCell);

    const sourceCell = document.createElement("td");
    sourceCell.append(linkNode(item.alibabaLink, item.alibabaLink ? "1688 详情 ↗" : "未匹配"));
    if (item.supplier) {
      const supplier = document.createElement("div");
      supplier.textContent = item.supplier;
      supplier.className = "quiet";
      sourceCell.append(supplier);
    }
    row.append(sourceCell);

    const costCell = document.createElement("td");
    const spec = document.createElement("div");
    spec.textContent = item.spec || "规格待核";
    const cost = document.createElement("div");
    cost.className = "cost";
    cost.textContent = item.unitPrice ? "¥" + item.unitPrice + (item.unit ? " / " + item.unit : "") : "成本待核";
    costCell.append(spec, cost);
    row.append(costCell);

    const statusTag = document.createElement("span");
    statusTag.className = "status-tag" + (item.matchStatus === "外观与规格匹配" ? " matched" : "");
    statusTag.textContent = item.matchStatus || "待核实";
    row.append(cell(statusTag));

    const del = document.createElement("button");
    del.type = "button";
    del.className = "row-delete";
    del.textContent = "删除";
    del.setAttribute("aria-label", "删除 " + (item.productName || "此记录"));
    del.addEventListener("click", async () => {
      if (!confirm("从本机结果表中删除这条记录？")) return;
      try {
        await request("/api/records/" + encodeURIComponent(item.id), { method: "DELETE" });
        await refresh();
      } catch (error) { notify(error.message); }
    });
    row.append(cell(del));
    body.append(row);
  }
}

function updateJob(job) {
  byId("job-message").textContent = job.message || "准备就绪";
  const status = byId("job-badge");
  status.className = "job-badge";
  if (job.status === "ready") {
    status.textContent = "浏览器已连接";
    status.classList.add("ready");
    byId("job-title").textContent = "罗盘页面已打开";
    byId("session-status").textContent = "Ego 浏览器已连接";
    document.querySelector(".session-chip .pulse").style.background = "#67d79d";
  } else if (job.status === "working") {
    status.textContent = "连接中";
    byId("job-title").textContent = "正在启动任务";
  } else if (job.status === "error") {
    status.textContent = "需要处理";
    status.classList.add("error");
    byId("job-title").textContent = "浏览器连接失败";
    byId("session-status").textContent = "Ego 浏览器未连接";
    document.querySelector(".session-chip .pulse").style.background = "#d9756f";
  } else {
    status.textContent = "待开始";
    byId("job-title").textContent = "尚未启动";
  }
  const current = job.pageTitle && job.currentUrl
    ? job.pageTitle + " · " + job.currentUrl
    : "尚未连接商品页面";
  byId("current-page").textContent = current;
}

async function refresh() {
  const data = await request("/api/status");
  state = data;
  renderRecords(data.records || []);
  updateJob(data.job || {});
}

async function perform(action, sourceButton) {
  sourceButton.disabled = true;
  const previous = sourceButton.innerHTML;
  sourceButton.textContent = action === "readCurrent" ? "读取中…" : "连接中…";
  try {
    const data = await request("/api/action", {
      method: "POST",
      body: JSON.stringify({
        action,
        count: byId("count").value,
        category: byId("category").value
      })
    });
    state = data.state || state;
    renderRecords(state.records || []);
    updateJob(state.job || {});
    notify(data.result?.message || state.job?.message || "完成");
  } catch (error) {
    notify(error.message);
    await refresh().catch(() => {});
  } finally {
    sourceButton.disabled = false;
    sourceButton.innerHTML = previous;
  }
}

byId("open-compass").addEventListener("click", event => perform("openCompass", event.currentTarget));
byId("read-current").addEventListener("click", event => perform("readCurrent", event.currentTarget));
byId("open-1688").addEventListener("click", event => perform("open1688", event.currentTarget));

byId("record-form").addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const message = byId("form-message");
  const payload = Object.fromEntries(new FormData(form).entries());
  message.textContent = "保存中…";
  try {
    await request("/api/records", { method: "POST", body: JSON.stringify(payload) });
    form.reset();
    message.textContent = "已保存到本机";
    await refresh();
    notify("记录已保存");
  } catch (error) {
    message.textContent = error.message;
  }
});

refresh().catch(error => notify("工作台读取失败：" + error.message));