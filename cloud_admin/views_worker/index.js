// 公開的觀看計數 Worker（不放在 Cloudflare Access 之後，供網站訪客回報瀏覽）
const ALLOWED_ORIGINS = ["https://changhsiuwei.com", "https://changhsiuwei.github.io"];

function corsHeaders(request) {
  const origin = request.headers.get("Origin");
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return {
      "access-control-allow-origin": origin,
      "access-control-allow-headers": "content-type",
      "access-control-allow-methods": "POST,OPTIONS",
      vary: "Origin"
    };
  }
  return {};
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers }
  });
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request);
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }
    if (url.pathname !== "/api/track" || request.method !== "POST") {
      return json({ error: "Not found" }, 404, cors);
    }

    const origin = request.headers.get("Origin");
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      return json({ error: "Origin is not allowed" }, 403);
    }

    try {
      const payload = await request.json();
      const path = (payload.path || "").trim();
      if (!path || path.length > 200 || path.includes("\0") || path.includes("\\")) {
        return json({ error: "Invalid path" }, 400, cors);
      }
      const normalized = path.startsWith("/") ? path.slice(1) : path;
      if (normalized.split("/").some((part) => part === ".." || part === "")) {
        return json({ error: "Invalid path" }, 400, cors);
      }

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
      return json({ ok: true, views, total }, 200, cors);
    } catch (error) {
      return json({ error: error.message || "Track failed" }, 400, cors);
    }
  }
};
