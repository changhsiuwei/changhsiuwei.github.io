// 公開的觀看計數 Worker（不放在 Cloudflare Access 之後，供網站訪客回報瀏覽與統計讀取）
const ALLOWED_HOSTS = new Set([
  "changhsiuwei.com",
  "www.changhsiuwei.com",
  "changhsiuwei.github.io",
  "localhost",
  "127.0.0.1"
]);

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (origin.startsWith("chrome-extension://")) return true;
  try {
    const u = new URL(origin);
    return ALLOWED_HOSTS.has(u.hostname);
  } catch {
    return false;
  }
}

function corsHeaders(request) {
  const origin = request.headers.get("Origin");
  const allowOrigin = (origin && isAllowedOrigin(origin)) ? origin : "*";
  return {
    "access-control-allow-origin": allowOrigin,
    "access-control-allow-headers": "content-type,authorization",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    vary: "Origin"
  };
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers }
  });
}

function normalizeTrackingPath(rawPath) {
  if (!rawPath || typeof rawPath !== "string") return "index.md";
  let p = rawPath.trim().replace(/^\/+|\/+$/g, "");
  if (!p || p === "index" || p === "index.html") return "index.md";
  p = p.replace(/\/(?:index)?\.html?$/i, "");
  p = p.replace(/\/index$/i, "");
  p = p.replace(/\.html?$/i, "");
  if (!p) return "index.md";
  if (p === "students") return "students/index.qmd";
  if (!/\.(md|qmd)$/i.test(p)) {
    p = p + "/index.md";
  }
  return p;
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request);
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    const origin = request.headers.get("Origin");
    if (origin && !isAllowedOrigin(origin)) {
      return json({ error: "Origin is not allowed" }, 403, cors);
    }

    // 1. 公開統計端點：供 Chrome Extension 或網站讀取各頁面與到站總觀看數
    if (url.pathname === "/api/stats" && request.method === "GET") {
      try {
        const total = parseInt((await env.VIEWS_KV.get("total")) || "0", 10);
        const pages = [];
        const list = await env.VIEWS_KV.list({ prefix: "views:" });
        for (const key of list.keys) {
          const path = key.name.slice("views:".length);
          const views = parseInt((await env.VIEWS_KV.get(key.name)) || "0", 10);
          pages.push({ path, views });
        }
        pages.sort((a, b) => b.views - a.views);
        return json({ total, pages }, 200, cors);
      } catch (error) {
        return json({ error: error.message || "Stats failed" }, 500, cors);
      }
    }

    // 2. 公開追蹤端點：紀錄頁面瀏覽次數
    if (url.pathname === "/api/track" && request.method === "POST") {
      try {
        let payload = {};
        try {
          payload = await request.json();
        } catch {
          const text = await request.text();
          if (text) {
            try { payload = JSON.parse(text); } catch {}
          }
        }

        const rawPath = (payload.path || "").trim();
        if (!rawPath || rawPath.length > 200 || rawPath.includes("\0") || rawPath.includes("\\")) {
          return json({ error: "Invalid path" }, 400, cors);
        }
        const normalized = normalizeTrackingPath(rawPath);

        const totalKey = "total";
        const pageKey = `views:${normalized}`;
        const [totalStr, pageStr] = await Promise.all([
          env.VIEWS_KV.get(totalKey),
          env.VIEWS_KV.get(pageKey)
        ]);
        const total = parseInt(totalStr || "0", 10) + 1;
        const views = parseInt(pageStr || "0", 10) + 1;
        await Promise.all([
          env.VIEWS_KV.put(totalKey, String(total)),
          env.VIEWS_KV.put(pageKey, String(views))
        ]);
        return json({ ok: true, views, total, path: normalized }, 200, cors);
      } catch (error) {
        return json({ error: error.message || "Track failed" }, 400, cors);
      }
    }

    return json({ error: "Not found" }, 404, cors);
  }
};
