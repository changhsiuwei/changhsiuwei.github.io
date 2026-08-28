import { createRemoteJWKSet, jwtVerify } from "jose";

interface Env {
  GITHUB_OWNER: string;
  GITHUB_REPO: string;
  GITHUB_BRANCH: string;
  GITHUB_TOKEN: string;
  CF_ACCESS_TEAM_DOMAIN: string;
  CF_ACCESS_AUD: string;
  ALLOWED_EMAIL: string;
  ALLOWED_ORIGINS: string;
  DEV_ADMIN_EMAIL?: string;
}

type FileChange = {
  path: string;
  operation: "upsert" | "delete";
  content?: string;
  encoding?: "utf-8" | "base64";
};

type PublishRequest = {
  baseCommitSha: string;
  message: string;
  files: FileChange[];
};

const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_BATCH_BYTES = 8 * 1024 * 1024;
const CONTENT_EXTENSIONS = new Set(["md", "qmd", "txt", "png", "jpg", "jpeg", "webp"]);
const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp"]);
const EXACT_EDITABLE = new Set([
  "index.md",
  "about/index.md",
  "activities/index.md",
  "publications/index.md",
  "knowledge/index.md",
  "lab/index.md",
  "students/index.qmd",
  "students/password_hash.txt"
]);

function json(data: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers }
  });
}

function allowedOrigin(request: Request, env: Env): string | null {
  const origin = request.headers.get("Origin");
  if (!origin) return null;
  const allowed = env.ALLOWED_ORIGINS.split(",").map((item) => item.trim()).filter(Boolean);
  return allowed.includes(origin) ? origin : null;
}

function corsHeaders(request: Request, env: Env): HeadersInit {
  const origin = allowedOrigin(request, env);
  return origin
    ? {
        "access-control-allow-origin": origin,
        "access-control-allow-credentials": "true",
        "access-control-allow-headers": "content-type,cf-access-jwt-assertion,x-request-id",
        "access-control-allow-methods": "GET,POST,OPTIONS",
        vary: "Origin"
      }
    : {};
}

export function normalizeEditablePath(input: string): string {
  if (!input || input.includes("\0") || input.includes("\\")) throw new Error("Invalid path");
  let decoded = input;
  try { decoded = decodeURIComponent(input); } catch { throw new Error("Invalid path encoding"); }
  if (decoded.startsWith("/") || decoded.split("/").some((part) => part === ".." || part === "")) {
    throw new Error("Invalid path");
  }
  if (decoded !== input && /%[0-9a-f]{2}/i.test(decoded)) throw new Error("Double encoding is not allowed");
  if (/[\x00-\x1f\x7f]/.test(decoded)) throw new Error("Invalid path");
  const lower = decoded.toLowerCase();
  const extension = lower.includes(".") ? lower.split(".").pop()! : "";
  const inPost = /^(knowledge|lab)\/posts\/[a-z0-9][a-z0-9-]{2,80}\/[a-z0-9][a-z0-9._-]{0,120}$/i.test(decoded);
  const inSharedUploads = /^assets\/uploads\/[a-z0-9][a-z0-9._-]{0,120}$/i.test(decoded);
  if (
    !EXACT_EDITABLE.has(decoded) &&
    !(inPost && CONTENT_EXTENSIONS.has(extension)) &&
    !(inSharedUploads && IMAGE_EXTENSIONS.has(extension))
  ) {
    throw new Error("Path is not editable");
  }
  return decoded;
}

function decodeChangeContent(change: FileChange): Uint8Array {
  const content = change.content ?? "";
  if (change.encoding === "base64") {
    const raw = atob(content);
    return Uint8Array.from(raw, (char) => char.charCodeAt(0));
  }
  return new TextEncoder().encode(content);
}

export function isSupportedImage(path: string, bytes: Uint8Array): boolean {
  const lower = path.toLowerCase();
  if (lower.endsWith(".png")) return bytes.length >= 8 && [137,80,78,71,13,10,26,10].every((b, i) => bytes[i] === b);
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (lower.endsWith(".webp")) return bytes.length >= 12 && new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  return true;
}

async function authenticate(request: Request, env: Env): Promise<string> {
  const requestUrl = new URL(request.url);
  if (
    env.DEV_ADMIN_EMAIL &&
    (requestUrl.hostname === "localhost" || requestUrl.hostname === "127.0.0.1")
  ) {
    return env.DEV_ADMIN_EMAIL.toLowerCase();
  }
  const assertion = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!assertion) throw new Error("Missing Cloudflare Access session");
  const teamDomain = env.CF_ACCESS_TEAM_DOMAIN.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const issuer = `https://${teamDomain}`;
  const jwks = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));
  const { payload } = await jwtVerify(assertion, jwks, { issuer, audience: env.CF_ACCESS_AUD });
  const email = String(payload.email ?? "").toLowerCase();
  if (!email || email !== env.ALLOWED_EMAIL.toLowerCase()) throw new Error("Administrator is not allowed");
  return email;
}

async function github(env: Env, path: string, init: RequestInit = {}): Promise<any> {
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${env.GITHUB_TOKEN}`,
      "x-github-api-version": "2022-11-28",
      "user-agent": "hw-chang-site-admin",
      ...(init.headers || {})
    }
  });
  const body = await response.text();
  const parsed = body ? JSON.parse(body) : null;
  if (!response.ok) throw new Error(`GitHub request failed with status ${response.status}`);
  return parsed;
}

function repoPath(env: Env): string {
  return `/repos/${encodeURIComponent(env.GITHUB_OWNER)}/${encodeURIComponent(env.GITHUB_REPO)}`;
}

async function getHead(env: Env): Promise<{ commitSha: string; treeSha: string }> {
  const ref = await github(env, `${repoPath(env)}/git/ref/heads/${encodeURIComponent(env.GITHUB_BRANCH)}`);
  const commitSha = ref.object.sha as string;
  const commit = await github(env, `${repoPath(env)}/git/commits/${commitSha}`);
  return { commitSha, treeSha: commit.tree.sha as string };
}

async function handleTree(env: Env): Promise<Response> {
  const head = await getHead(env);
  const tree = await github(env, `${repoPath(env)}/git/trees/${head.treeSha}?recursive=1`);
  const files = (tree.tree as any[])
    .filter((item) => item.type === "blob")
    .map((item) => item.path as string)
    .filter((path) => {
      try { normalizeEditablePath(path); return true; } catch { return false; }
    });
  return json({ head: head.commitSha, files });
}

async function handleFile(url: URL, env: Env): Promise<Response> {
  const path = normalizeEditablePath(url.searchParams.get("path") ?? "");
  const ref = url.searchParams.get("ref") || env.GITHUB_BRANCH;
  if (ref !== env.GITHUB_BRANCH && !/^[0-9a-f]{40}$/i.test(ref)) return json({ error: "Invalid Git reference" }, 400);
  const file = await github(env, `${repoPath(env)}/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(ref)}`);
  return json({ path, sha: file.sha, encoding: file.encoding, content: String(file.content).replace(/\n/g, "") });
}

async function handlePublish(request: Request, env: Env, actor: string): Promise<Response> {
  const payload = await request.json<PublishRequest>();
  if (!/^[0-9a-f]{40}$/i.test(payload.baseCommitSha || "")) return json({ error: "Invalid base commit" }, 400);
  if (!payload.message || payload.message.trim().length < 3 || payload.message.length > 160 || /[\r\n\0]/.test(payload.message)) return json({ error: "Invalid commit message" }, 400);
  if (!Array.isArray(payload.files) || payload.files.length < 1 || payload.files.length > 30) return json({ error: "Invalid file batch" }, 400);

  const head = await getHead(env);
  if (head.commitSha !== payload.baseCommitSha) return json({ error: "Content changed on GitHub", currentHead: head.commitSha }, 409);

  const hasDeletes = payload.files.some((f) => f.operation === "delete");
  let remotePaths = new Set<string>();
  if (hasDeletes) {
    try {
      const treeData = await github(env, `${repoPath(env)}/git/trees/${head.treeSha}?recursive=1`);
      if (treeData && Array.isArray(treeData.tree)) {
        remotePaths = new Set(treeData.tree.map((item: any) => item.path));
      }
    } catch {}
  }

  let batchBytes = 0;
  const seenPaths = new Set<string>();
  const tree: Array<{ path: string; mode: "100644"; type: "blob"; sha: string | null }> = [];
  for (const change of payload.files) {
    const path = normalizeEditablePath(change.path);
    if (seenPaths.has(path)) return json({ error: "A file appears more than once" }, 400);
    seenPaths.add(path);
    if (change.operation !== "upsert" && change.operation !== "delete") return json({ error: "Invalid file operation" }, 400);
    if (change.operation === "delete") {
      if (EXACT_EDITABLE.has(path)) return json({ error: "Fixed pages cannot be deleted" }, 400);
      if (remotePaths.size === 0 || remotePaths.has(path)) {
        tree.push({ path, mode: "100644", type: "blob", sha: null });
      }
      continue;
    }
    const extension = path.toLowerCase().split(".").pop() || "";
    if (IMAGE_EXTENSIONS.has(extension) && change.encoding !== "base64") return json({ error: "Images must use base64 encoding" }, 400);
    if (!IMAGE_EXTENSIONS.has(extension) && change.encoding === "base64") return json({ error: "Text content must use UTF-8 encoding" }, 400);
    const bytes = decodeChangeContent(change);
    batchBytes += bytes.byteLength;
    if (bytes.byteLength > MAX_FILE_BYTES || batchBytes > MAX_BATCH_BYTES) return json({ error: "Upload is too large" }, 413);
    if (!isSupportedImage(path, bytes)) return json({ error: "Image signature does not match its extension" }, 400);
    const blob = await github(env, `${repoPath(env)}/git/blobs`, {
      method: "POST",
      body: JSON.stringify({ content: change.encoding === "base64" ? change.content : change.content ?? "", encoding: change.encoding === "base64" ? "base64" : "utf-8" })
    });
    tree.push({ path, mode: "100644", type: "blob", sha: blob.sha });
  }

  if (tree.length === 0) {
    return json({ ok: true, commitSha: head.commitSha, actor });
  }

  const newTree = await github(env, `${repoPath(env)}/git/trees`, {
    method: "POST",
    body: JSON.stringify({ base_tree: head.treeSha, tree })
  });
  const commit = await github(env, `${repoPath(env)}/git/commits`, {
    method: "POST",
    body: JSON.stringify({ message: payload.message.trim(), tree: newTree.sha, parents: [head.commitSha] })
  });
  await github(env, `${repoPath(env)}/git/refs/heads/${encodeURIComponent(env.GITHUB_BRANCH)}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: commit.sha, force: false })
  });
  return json({ ok: true, commitSha: commit.sha, actor });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cors = corsHeaders(request, env);
    if (request.method === "OPTIONS") {
      if (!allowedOrigin(request, env)) return new Response(null, { status: 403 });
      return new Response(null, { status: 204, headers: cors });
    }
    if (request.headers.has("Origin") && !allowedOrigin(request, env)) return json({ error: "Origin is not allowed" }, 403);
    try {
      const actor = await authenticate(request, env);
      const url = new URL(request.url);
      let response: Response;
      if (request.method === "GET" && url.pathname === "/api/session") response = json({ authenticated: true, email: actor });
      else if (request.method === "GET" && url.pathname === "/api/tree") response = await handleTree(env);
      else if (request.method === "GET" && url.pathname === "/api/file") response = await handleFile(url, env);
      else if (request.method === "POST" && url.pathname === "/api/publish") response = await handlePublish(request, env, actor);
      else response = json({ error: "Not found" }, 404);
      const headers = new Headers(response.headers);
      Object.entries(cors).forEach(([key, value]) => headers.set(key, String(value)));
      return new Response(response.body, { status: response.status, headers });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Request failed";
      const status = message.includes("Access") || message.includes("allowed") ? 401 : 400;
      return json({ error: message }, status, cors);
    }
  }
} satisfies ExportedHandler<Env>;
