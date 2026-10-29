import http from "node:http";
import { readFile, writeFile, rename, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawn } from "node:child_process";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ROOT, "public");
const DATA = path.join(ROOT, "data");
const STATE_FILE = path.join(DATA, "state.json");
const PORT = Number(process.env.PORT || 8787);
const MAX_BODY = 1024 * 1024;

await mkdir(DATA, { recursive: true });
let state = {
  spaceName: "douyin-1688-web-agent-" + Date.now(),
  job: { status: "idle", message: "准备就绪", requestedCount: 10, category: "随机类目" },
  records: []
};

try {
  state = { ...state, ...JSON.parse(await readFile(STATE_FILE, "utf8")) };
} catch {}

function json(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "content-length": Buffer.byteLength(body)
  });
  res.end(body);
}

async function persist() {
  const tmp = STATE_FILE + ".tmp";
  await writeFile(tmp, JSON.stringify(state, null, 2), "utf8");
  await rename(tmp, STATE_FILE);
}

function text(value, limit = 500) {
  return String(value ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, limit);
}

async function bodyJson(req) {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (Buffer.byteLength(raw) > MAX_BODY) throw new Error("请求内容太大");
  }
  return raw ? JSON.parse(raw) : {};
}

function runBridge(action, data = {}) {
  return new Promise((resolve, reject) => {
    const script = path.join(ROOT, "scripts", "ego-bridge.mjs");
    const query = new URLSearchParams({
      action,
      space: state.spaceName,
      category: text(data.category || state.job.category, 100)
    });
    const importCode = "await import('" + pathToFileURL(script).href + "?" + query.toString() + "')";
    const child = spawn("ego-browser.exe", ["nodejs", "-e", importCode], {
      cwd: ROOT,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => child.kill(), 60000);
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", chunk => { stdout += chunk; });
    child.stderr.on("data", chunk => { stderr += chunk; });
    child.on("error", error => {
      clearTimeout(timer);
      reject(new Error("启动 Ego 浏览器失败：" + error.message));
    });
    child.on("close", code => {
      clearTimeout(timer);
      const lines = (stdout + "\n" + stderr).split(/\r?\n/).map(line => line.trim()).filter(Boolean);
      const jsonLine = [...lines].reverse().find(line => line.startsWith("{"));
      if (!jsonLine) {
        reject(new Error((stderr || stdout || "Ego 浏览器没有返回结果").trim().slice(-1200)));
        return;
      }
      try {
        resolve(JSON.parse(jsonLine));
      } catch (error) {
        reject(new Error("读取浏览器结果失败：" + error.message));
      }
    });
  });
}

function csvCell(value) {
  const raw = String(value ?? "");
  return '"' + raw.replace(/"/g, '""') + '"';
}

const csvHeaders = [
  "序号", "采集时间", "类目", "商品名称", "抖音链接", "1688链接",
  "供应商", "对应规格", "采购单价元", "计价单位", "起批量",
  "运费元", "运费目的地", "匹配状态", "备注"
];

async function serveStatic(res, file, type) {
  try {
    const content = await readFile(file);
    res.writeHead(200, {
      "content-type": type,
      "cache-control": "no-cache",
      "content-length": content.length
    });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

const server = http.createServer(async (req, res) => {
  const host = String(req.headers.host || "").split(":")[0].toLowerCase();
  if (!["127.0.0.1", "localhost", "[::1]"].includes(host)) {
    json(res, 403, { error: "仅允许从本机访问" });
    return;
  }

  const url = new URL(req.url || "/", "http://127.0.0.1");
  try {
    if (req.method === "GET" && url.pathname === "/") {
      await serveStatic(res, path.join(PUBLIC, "index.html"), "text/html; charset=utf-8");
      return;
    }
    if (req.method === "GET" && url.pathname === "/style.css") {
      await serveStatic(res, path.join(PUBLIC, "style.css"), "text/css; charset=utf-8");
      return;
    }
    if (req.method === "GET" && url.pathname === "/app.js") {
      await serveStatic(res, path.join(PUBLIC, "app.js"), "text/javascript; charset=utf-8");
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/status") {
      json(res, 200, state);
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/records") {
      json(res, 200, state.records);
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/export.csv") {
      const rows = state.records.map((item, index) => [
        index + 1, item.capturedAt, item.category, item.productName,
        item.douyinLink, item.alibabaLink, item.supplier, item.spec,
        item.unitPrice, item.unit, item.minimumOrder, item.shippingFee,
        item.shippingDestination, item.matchStatus, item.notes
      ]);
      const content = "\uFEFF" + [csvHeaders, ...rows].map(row => row.map(csvCell).join(",")).join("\r\n");
      res.writeHead(200, {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": "attachment; filename=douyin-1688-sourcing.csv",
        "content-length": Buffer.byteLength(content)
      });
      res.end(content);
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/action") {
      const input = await bodyJson(req);
      const action = text(input.action, 40);
      if (!["openCompass", "readCurrent", "open1688"].includes(action)) {
        json(res, 400, { error: "未知操作" });
        return;
      }
      if (action === "openCompass") {
        state.job = {
          status: "working",
          message: "正在连接本机 Ego 浏览器…",
          requestedCount: Math.max(1, Math.min(30, Number(input.count) || 10)),
          category: text(input.category || "随机类目", 100),
          startedAt: new Date().toISOString()
        };
        await persist();
      }

      try {
        const result = await runBridge(action, { category: input.category });
        state.job.status = action === "openCompass" ? "ready" : state.job.status;
        state.job.message = result.message || (action === "readCurrent" ? "已读取当前页面" : "操作完成");
        state.job.currentUrl = result.url || state.job.currentUrl || null;
        state.job.pageTitle = result.title || state.job.pageTitle || null;
        state.job.lastActionAt = new Date().toISOString();

        if (action === "readCurrent") {
          const existing = new Set(state.records.map(item => item.douyinLink).filter(Boolean));
          const available = Math.max(0, state.job.requestedCount - state.records.length);
          const fresh = (result.items || [])
            .filter(item => item.url && !existing.has(item.url))
            .slice(0, available)
            .map(item => ({
              id: crypto.randomUUID(),
              capturedAt: new Date().toISOString(),
              category: text(input.category || state.job.category, 100),
              productName: text(item.title || "待补充商品名", 300),
              douyinLink: text(item.url, 1000),
              imageUrl: text(item.image || "", 1000),
              alibabaLink: "",
              supplier: "",
              spec: "",
              unitPrice: "",
              unit: "",
              minimumOrder: "",
              shippingFee: "",
              shippingDestination: "",
              matchStatus: "待核实",
              notes: ""
            }));
          state.records.push(...fresh);
          state.job.message = fresh.length
            ? "识别到 " + fresh.length + " 个新商品链接"
            : "当前页没有发现新的抖音商品链接";
        }
        await persist();
        json(res, 200, { result, state });
      } catch (error) {
        state.job.status = "error";
        state.job.message = error.message;
        state.job.errorAt = new Date().toISOString();
        await persist();
        json(res, 502, { error: error.message, state });
      }
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/records") {
      const input = await bodyJson(req);
      const record = {
        id: crypto.randomUUID(),
        capturedAt: new Date().toISOString(),
        category: text(input.category || state.job.category, 100),
        productName: text(input.productName, 300),
        douyinLink: text(input.douyinLink, 1000),
        imageUrl: "",
        alibabaLink: text(input.alibabaLink, 1000),
        supplier: text(input.supplier, 200),
        spec: text(input.spec, 200),
        unitPrice: text(input.unitPrice, 40),
        unit: text(input.unit, 50),
        minimumOrder: text(input.minimumOrder, 50),
        shippingFee: text(input.shippingFee, 40),
        shippingDestination: text(input.shippingDestination, 100),
        matchStatus: text(input.matchStatus || "待核实", 60),
        notes: text(input.notes, 500)
      };
      if (!record.productName && !record.douyinLink) {
        json(res, 400, { error: "请填写商品名称或抖音链接" });
        return;
      }
      if (record.douyinLink && state.records.some(item => item.douyinLink === record.douyinLink)) {
        json(res, 409, { error: "这条抖音链接已记录" });
        return;
      }
      state.records.push(record);
      await persist();
      json(res, 201, record);
      return;
    }
    if (req.method === "DELETE" && url.pathname.startsWith("/api/records/")) {
      const id = decodeURIComponent(url.pathname.slice("/api/records/".length));
      const before = state.records.length;
      state.records = state.records.filter(item => item.id !== id);
      await persist();
      json(res, before === state.records.length ? 404 : 200, { records: state.records });
      return;
    }
    json(res, 404, { error: "Not found" });
  } catch (error) {
    json(res, 500, { error: error.message || "服务器错误" });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("罗盘选品工作台：http://127.0.0.1:" + PORT);
});
