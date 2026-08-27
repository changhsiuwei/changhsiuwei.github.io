const DEFAULT_API_BASE = "https://hw-chang-site-admin-api.hw-chang-site-admin-worker.workers.dev";
const DEFAULT_SITE_URL = "https://changhsiuwei.com/";
const LEGACY_SITE_URL = "https://changhsiuwei.github.io/";
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

const STATIC_PAGES = [
  { path: "index.md", label: "首頁", icon: "⌂" },
  { path: "about/index.md", label: "個人資訊", icon: "人" },
  { path: "activities/index.md", label: "近期活動", icon: "曆" },
  { path: "publications/index.md", label: "學術出版", icon: "文" },
  { path: "lab/index.md", label: "AI 教學與研究", icon: "研" },
  { path: "knowledge/index.md", label: "AI 知識站", icon: "知" }
];

const state = {
  apiBase: DEFAULT_API_BASE,
  siteUrl: DEFAULT_SITE_URL,
  head: "",
  files: [],
  currentPath: "",
  originalContent: "",
  originalBody: "",
  editorBaselineBody: "",
  frontMatter: "",
  frontMatterPrefix: "",
  lineEnding: "\n",
  layoutLocks: new Map(),
  tableModels: new Map(),
  editor: null,
  connected: false,
  newDocument: false,
  pendingUploads: new Map(),
  previewTimer: null,
  loadingEditor: false,
  bodyDirty: false,
  editorChanged: false,
  metadataDirty: false,
  workingBody: "",
  lastEditorMarkdown: "",
  editorMappingError: false,
  draftTimer: null,
  draftSaved: false
};

const $ = (id) => document.getElementById(id);
const elements = {
  apiBase: $("apiBase"),
  siteUrl: $("siteUrl"),
  connectionBadge: $("connectionBadge"),
  connectionNotice: $("connectionNotice"),
  siteNav: $("siteNav"),
  pageTree: $("pageTree"),
  pageSearch: $("pageSearch"),
  emptyState: $("emptyState"),
  editorWorkspace: $("editorWorkspace"),
  visualEditor: $("visualEditor"),
  structuredData: $("structuredData"),
  tableEditors: $("tableEditors"),
  documentHeading: $("documentHeading"),
  documentLocation: $("documentLocation"),
  titleInput: $("titleInput"),
  descriptionInput: $("descriptionInput"),
  dateInput: $("dateInput"),
  categoriesInput: $("categoriesInput"),
  commitMessage: $("commitMessage"),
  wordCount: $("wordCount"),
  draftStatus: $("draftStatus"),
  previewBadge: $("previewBadge"),
  livePreview: $("livePreview"),
  imageInput: $("imageInput"),
  uploadSummary: $("uploadSummary"),
  activityLog: $("activityLog"),
  settingsDialog: $("settingsDialog"),
  newPostDialog: $("newPostDialog"),
  newPostForm: $("newPostForm"),
  newPostCollection: $("newPostCollection"),
  newPostTitle: $("newPostTitle"),
  newPostSlug: $("newPostSlug")
};

function openDraftDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("hw-chang-site-admin-drafts", 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains("uploads")) request.result.createObjectStore("uploads", { keyPath: "documentPath" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("無法開啟圖片草稿資料庫"));
  });
}

async function readDraftUploads(documentPath) {
  const database = await openDraftDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const request = database.transaction("uploads", "readonly").objectStore("uploads").get(documentPath);
      request.onsuccess = () => resolve(request.result?.uploads || []);
      request.onerror = () => reject(request.error || new Error("無法讀取圖片草稿"));
    });
  } finally {
    database.close();
  }
}

async function writeDraftUploads(documentPath) {
  const database = await openDraftDatabase();
  try {
    await new Promise((resolve, reject) => {
      const transaction = database.transaction("uploads", "readwrite");
      transaction.objectStore("uploads").put({ documentPath, uploads: Array.from(state.pendingUploads.values()) });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error("無法儲存圖片草稿"));
    });
  } finally {
    database.close();
  }
}

async function clearDraftUploads(documentPath) {
  const database = await openDraftDatabase();
  try {
    await new Promise((resolve, reject) => {
      const transaction = database.transaction("uploads", "readwrite");
      transaction.objectStore("uploads").delete(documentPath);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error("無法清除圖片草稿"));
    });
  } finally {
    database.close();
  }
}

async function readNewDraftPaths() {
  const stored = await chrome.storage.local.get("newDraftPaths");
  return Array.isArray(stored.newDraftPaths) ? stored.newDraftPaths : [];
}

async function addNewDraftPath(path) {
  const paths = await readNewDraftPaths();
  if (!paths.includes(path)) await chrome.storage.local.set({ newDraftPaths: [...paths, path] });
}

async function removeNewDraftPath(path) {
  const paths = await readNewDraftPaths();
  await chrome.storage.local.set({ newDraftPaths: paths.filter((item) => item !== path) });
}

function hasUnsavedChanges() {
  return state.newDocument || state.bodyDirty || state.metadataDirty || Array.from(state.tableModels.values()).some((model) => model.dirty) || state.pendingUploads.size > 0;
}

function log(message, type = "") {
  const item = document.createElement("li");
  item.textContent = message;
  if (type) item.className = type;
  elements.activityLog.prepend(item);
  while (elements.activityLog.children.length > 8) elements.activityLog.lastElementChild.remove();
}

function setBadge(text, kind) {
  elements.connectionBadge.replaceChildren();
  const dot = document.createElement("span");
  dot.className = "status-dot";
  elements.connectionBadge.append(dot, document.createTextNode(text));
  elements.connectionBadge.className = `status-badge ${kind}`;
}

function normalizeApiBase(value) {
  const url = new URL(value.trim());
  const localDev = url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
  if (url.protocol !== "https:" && !localDev) throw new Error("正式 API 必須使用 HTTPS");
  return url.origin;
}

function normalizeSiteUrl(value) {
  const url = new URL(value.trim());
  if (url.protocol !== "https:") throw new Error("正式網站網址必須使用 HTTPS");
  return url.toString();
}

async function api(path, options = {}) {
  const response = await fetch(`${state.apiBase}${path}`, {
    credentials: "include",
    ...options,
    headers: { "content-type": "application/json", ...(options.headers || {}) }
  });
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) throw new Error("請先完成 Cloudflare 登入");
  const body = await response.json();
  if (!response.ok) {
    const error = new Error(body.error || `操作失敗（${response.status}）`);
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}

function base64ToText(value) {
  const binary = atob(value.replace(/\s/g, ""));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function splitFrontMatter(content) {
  const match = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n)?/);
  if (!match) return { frontMatter: "", body: content, prefix: "" };
  return { frontMatter: match[1].trimEnd(), body: content.slice(match[0].length), prefix: match[0] };
}

function isProtectedLayoutLine(line) {
  return (
    /^\s*:{3,}.*$/.test(line) ||
    /^\s*<.*>\s*$/.test(line) ||
    /^\s*:\s*\{[^}]+\}\s*$/.test(line)
  );
}

function splitTableRow(line) {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split(/(?<!\\)\|/).map((cell) => cell.trim().replace(/\\\|/g, "|"));
}

function parseTable(source) {
  const lines = source.split(/\r?\n/).filter(Boolean);
  const headers = splitTableRow(lines[0] || "");
  const alignments = splitTableRow(lines[1] || "").map((cell) => {
    const value = cell.replace(/\s/g, "");
    if (value.startsWith(":") && value.endsWith(":")) return "center";
    if (value.endsWith(":")) return "right";
    return "left";
  });
  return {
    originalSource: source,
    lineEnding: source.includes("\r\n") ? "\r\n" : "\n",
    originalWidth: headers.length,
    originalSeparator: lines[1] || "",
    headers,
    alignments,
    rows: lines.slice(2).map(splitTableRow),
    dirty: false
  };
}

function serializeTable(model) {
  if (!model.dirty) return model.originalSource;
  const width = Math.max(model.headers.length, ...model.rows.map((row) => row.length), 1);
  const normalize = (row) => Array.from({ length: width }, (_, index) => String(row[index] || "").replace(/\|/g, "\\|").trim());
  const headers = normalize(model.headers);
  const separator = Array.from({ length: width }, (_, index) => {
    if (model.alignments[index] === "center") return ":---:";
    if (model.alignments[index] === "right") return "---:";
    return "---";
  });
  const headerLine = `| ${headers.join(" | ")} |`;
  const separatorLine = width === model.originalWidth ? model.originalSeparator : `| ${separator.join(" | ")} |`;
  const rowLines = model.rows.map(normalize).map((row) => `| ${row.join(" | ")} |`);
  return [headerLine, separatorLine, ...rowLines].join(model.lineEnding);
}

function tableCellDisplay(source) {
  return String(source || "")
    .replace(/^\s*<i\s+class="[^"]+"><\/i>\s*/i, "")
    .replace(/\[([^\]]+)]\([^)]+\)(?:\{[^}]+\})?/g, "$1")
    .replace(/\\\*/g, "*")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1");
}

function updateTableCellSource(source, displayValue) {
  const original = String(source || "");
  const value = String(displayValue || "");
  if (value === tableCellDisplay(original)) return original;
  const icon = original.match(/^\s*<i\s+class="[^"]+"><\/i>\s*/i)?.[0] || "";
  const withoutIcon = icon ? original.slice(icon.length) : original;
  if (/^\*\*[^*]+\*\*$/.test(withoutIcon)) return `${icon}**${value}**`;
  if (/^\*[^*]+\*$/.test(withoutIcon)) return `${icon}*${value}*`;
  if (/^`[^`]+`$/.test(withoutIcon)) return `${icon}\`${value}\``;
  return `${icon}${value}`;
}

function protectLayoutSyntax(body) {
  const nonce = `HWCMS-LAYOUT-${crypto.randomUUID()}`;
  const locks = new Map();
  const tableModels = new Map();
  const lines = body.split(/\r?\n/);
  const sourceLineEnding = body.includes("\r\n") ? "\r\n" : "\n";
  const output = [];
  const pushLock = (token) => {
    if (output.length && output.at(-1) !== "") output.push("");
    output.push(`<!--${token}-->`, "");
  };
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const next = lines[index + 1] || "";
    const isTable = /^\s*\|.*\|\s*$/.test(line) && /^\s*\|(?:\s*:?-{3,}:?\s*\|)+\s*$/.test(next);
    if (isTable) {
      const tableLines = [line, next];
      index += 2;
      while (index < lines.length && /^\s*\|.*\|\s*$/.test(lines[index])) {
        tableLines.push(lines[index]);
        index += 1;
      }
      index -= 1;
      const token = `${nonce}-${locks.size}`;
      const source = tableLines.join(sourceLineEnding);
      locks.set(token, source);
      tableModels.set(token, parseTable(source));
      pushLock(token);
      continue;
    }
    if (!isProtectedLayoutLine(line)) {
      output.push(line.replace(/\{target="_blank"\}/g, ""));
      continue;
    }
    const layoutLines = [line];
    while (index + 1 < lines.length && isProtectedLayoutLine(lines[index + 1])) {
      layoutLines.push(lines[index + 1]);
      index += 1;
    }
    const token = `${nonce}-${locks.size}`;
    locks.set(token, layoutLines.join(sourceLineEnding));
    pushLock(token);
  }
  return { editorBody: output.join("\n"), locks, tableModels };
}

function restoreLayoutSyntax(body) {
  let restored = body;
  for (const [token, line] of state.layoutLocks) {
    const source = state.tableModels.has(token) ? serializeTable(state.tableModels.get(token)) : line;
    restored = restored.replaceAll(`<!--${token}-->`, source);
  }
  return restored;
}

function uniqueIndexOf(source, value) {
  if (!value) return -1;
  const index = source.indexOf(value);
  if (index < 0 || source.indexOf(value, index + 1) >= 0) return -1;
  return index;
}

function applyEditorDeltaToSource(previous, current, source) {
  if (previous === current) return source;
  let prefix = 0;
  while (prefix < previous.length && prefix < current.length && previous[prefix] === current[prefix]) prefix += 1;
  let suffix = 0;
  while (
    suffix < previous.length - prefix &&
    suffix < current.length - prefix &&
    previous[previous.length - suffix - 1] === current[current.length - suffix - 1]
  ) suffix += 1;
  const removed = previous.slice(prefix, previous.length - suffix);
  const added = current.slice(prefix, current.length - suffix);
  if (removed) {
    const directIndex = uniqueIndexOf(source, removed);
    if (directIndex >= 0) return `${source.slice(0, directIndex)}${added}${source.slice(directIndex + removed.length)}`;
  }
  for (let contextSize = 56; contextSize >= 8; contextSize -= 8) {
    const left = previous.slice(Math.max(0, prefix - contextSize), prefix);
    const rightStart = previous.length - suffix;
    const right = previous.slice(rightStart, Math.min(previous.length, rightStart + contextSize));
    const leftIndex = uniqueIndexOf(source, left);
    if (leftIndex < 0) continue;
    const start = leftIndex + left.length;
    if (!right) return `${source.slice(0, start)}${added}${source.slice(start + removed.length)}`;
    const end = source.indexOf(right, start);
    if (end < start || end - start > removed.length + 48) continue;
    return `${source.slice(0, start)}${added}${source.slice(end)}`;
  }
  return null;
}

function applyEditorChangesToSource(previous, current, source) {
  if (previous === current) return source;
  const previousLines = previous.split("\n");
  const currentLines = current.split("\n");
  if (previousLines.length === currentLines.length) {
    let updated = source;
    for (let index = 0; index < previousLines.length; index += 1) {
      if (previousLines[index] === currentLines[index]) continue;
      updated = applyEditorDeltaToSource(previousLines[index], currentLines[index], updated);
      if (updated === null) break;
    }
    if (updated !== null) return updated;
  }
  return applyEditorDeltaToSource(previous, current, source);
}

function unquoteYaml(value) {
  const trimmed = String(value || "").trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1).replace(/\\"/g, '"');
  }
  return trimmed;
}

function readYamlScalar(frontMatter, key) {
  const match = frontMatter.match(new RegExp(`^${key}\\s*:\\s*(.*)$`, "mi"));
  return match ? unquoteYaml(match[1]) : "";
}

function readYamlCategories(frontMatter) {
  const inline = frontMatter.match(/^categories\s*:\s*\[(.*)\]\s*$/mi);
  if (inline) return inline[1].split(",").map((item) => unquoteYaml(item)).filter(Boolean).join(", ");
  const lines = frontMatter.split(/\r?\n/);
  const start = lines.findIndex((line) => /^categories\s*:\s*$/i.test(line));
  if (start < 0) return "";
  const values = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const match = lines[index].match(/^\s*-\s*(.+)$/);
    if (!match) break;
    values.push(unquoteYaml(match[1]));
  }
  return values.join(", ");
}

function removeYamlField(frontMatter, key) {
  const lines = frontMatter ? frontMatter.split(/\r?\n/) : [];
  const output = [];
  let skipping = false;
  for (const line of lines) {
    if (new RegExp(`^${key}\\s*:`, "i").test(line)) {
      skipping = true;
      continue;
    }
    if (skipping && (/^\s+-\s+/.test(line) || /^\s{2,}\S/.test(line))) continue;
    skipping = false;
    output.push(line);
  }
  return output.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function setYamlScalar(frontMatter, key, value) {
  const desired = String(value || "").trim();
  if (readYamlScalar(frontMatter, key) === desired) return frontMatter;
  const cleaned = removeYamlField(frontMatter, key);
  if (!desired) return cleaned;
  const line = `${key}: ${JSON.stringify(desired)}`;
  return [cleaned, line].filter(Boolean).join("\n");
}

function setYamlCategories(frontMatter, value) {
  const desired = String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
  const current = readYamlCategories(frontMatter).split(",").map((item) => item.trim()).filter(Boolean);
  if (JSON.stringify(current) === JSON.stringify(desired)) return frontMatter;
  const cleaned = removeYamlField(frontMatter, "categories");
  if (!desired.length) return cleaned;
  const line = `categories: [${desired.map((item) => JSON.stringify(item)).join(", ")}]`;
  return [cleaned, line].filter(Boolean).join("\n");
}

function currentFrontMatter() {
  let frontMatter = state.frontMatter;
  frontMatter = setYamlScalar(frontMatter, "title", elements.titleInput.value);
  frontMatter = setYamlScalar(frontMatter, "description", elements.descriptionInput.value);
  frontMatter = setYamlScalar(frontMatter, "date", elements.dateInput.value);
  frontMatter = setYamlCategories(frontMatter, elements.categoriesInput.value);
  return frontMatter;
}

function currentContent() {
  if (!state.editor) return state.originalContent;
  let body;
  if (state.editorChanged) {
    const mappedBody = applyEditorChangesToSource(state.lastEditorMarkdown, state.editor.getMarkdown(), state.originalBody);
    if (mappedBody === null) throw new Error("這次修改無法安全對應原版面，請分段修改或重新讀取後再試一次");
    body = mappedBody.trimEnd();
  } else {
    body = state.originalBody.trimEnd();
  }
  for (const [token, model] of state.tableModels) {
    if (model.dirty) body = body.replace(state.layoutLocks.get(token), serializeTable(model));
  }
  const frontMatter = currentFrontMatter();
  if (!state.metadataDirty && state.frontMatterPrefix) return `${state.frontMatterPrefix}${body}${state.lineEnding}`;
  const normalizedFrontMatter = frontMatter.replace(/\r?\n/g, state.lineEnding);
  return frontMatter
    ? `---${state.lineEnding}${normalizedFrontMatter}${state.lineEnding}---${state.lineEnding}${state.lineEnding}${body}${state.lineEnding}`
    : `${body}${state.lineEnding}`;
}

function pageInfo(path) {
  const staticPage = STATIC_PAGES.find((item) => item.path === path);
  if (staticPage) return { label: staticPage.label, location: "固定頁面", icon: staticPage.icon };
  const collection = path.startsWith("knowledge/") ? "AI 知識站" : path.startsWith("lab/") ? "AI 教學與研究" : "網站內容";
  const slug = path.split("/").at(-2) || path;
  const label = slug.split("-").filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
  return { label, location: `${collection} / 文章`, icon: collection === "AI 知識站" ? "知" : "研" };
}

function ensureEditor() {
  if (state.editor) return;
  if (!window.toastui?.Editor) throw new Error("視覺化編輯器尚未載入");
  window.toastui.Editor.setLanguage(["zh-TW", "zh-Hant"], {
    Markdown: "原始格式",
    WYSIWYG: "視覺編輯",
    Write: "編輯",
    Preview: "預覽",
    Headings: "標題",
    Paragraph: "段落",
    Bold: "粗體",
    Italic: "斜體",
    Strike: "刪除線",
    Code: "行內程式碼",
    Line: "分隔線",
    Blockquote: "引言",
    "Unordered list": "項目清單",
    "Ordered list": "編號清單",
    Task: "待辦項目",
    Indent: "增加縮排",
    Outdent: "減少縮排",
    "Insert link": "加入連結",
    "Insert CodeBlock": "加入程式區塊",
    "Insert table": "加入表格",
    "Insert image": "加入圖片",
    Heading: "標題",
    "Image URL": "圖片網址",
    "Select image file": "選擇圖片",
    "Choose a file": "選擇檔案",
    "No file": "尚未選擇檔案",
    Description: "替代文字",
    OK: "確定",
    More: "更多",
    Cancel: "取消",
    File: "檔案",
    URL: "網址",
    "Link text": "連結文字"
  });
  state.editor = new window.toastui.Editor({
    el: elements.visualEditor,
    height: "100%",
    initialEditType: "wysiwyg",
    previewStyle: "vertical",
    usageStatistics: false,
    language: "zh-TW",
    hideModeSwitch: true,
    toolbarItems: [
      ["heading", "bold", "italic", "strike"],
      ["hr", "quote"],
      ["ul", "ol", "task", "indent", "outdent"],
      ["table", "image", "link"]
    ],
    hooks: {
      addImageBlobHook: async (blob, callback) => {
        try {
          const queued = await queueImage(blob);
          callback(`/${queued.path}`, queued.alt);
        } catch (error) {
          log(error.message || "圖片加入失敗", "error");
        }
      }
    }
  });
  state.editor.on("change", () => {
    if (!state.loadingEditor) {
      state.bodyDirty = true;
      state.editorChanged = true;
      state.draftSaved = false;
    }
    scheduleDocumentUpdate();
  });
}

function setMetadata(frontMatter, fallbackTitle = "") {
  elements.titleInput.value = readYamlScalar(frontMatter, "title") || fallbackTitle;
  elements.descriptionInput.value = readYamlScalar(frontMatter, "description");
  const date = readYamlScalar(frontMatter, "date");
  elements.dateInput.value = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "";
  elements.categoriesInput.value = readYamlCategories(frontMatter);
}

function setActivePath(path) {
  document.querySelectorAll("[data-path]").forEach((item) => item.classList.toggle("active", item.dataset.path === path));
}

function renderTopNav() {
  elements.siteNav.replaceChildren();
  for (const page of STATIC_PAGES) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "nav-item";
    button.dataset.path = page.path;
    button.textContent = page.label;
    button.addEventListener("click", () => state.connected ? loadFile(page.path) : log("請先登入並連線", "error"));
    elements.siteNav.append(button);
  }
  const studentsButton = document.createElement("button");
  studentsButton.type = "button";
  studentsButton.className = "nav-item";
  studentsButton.textContent = "學生專區";
  studentsButton.addEventListener("click", () => window.open(new URL("students/", state.siteUrl).toString(), "_blank", "noopener"));
  elements.siteNav.append(studentsButton);
}

function createTreeItem(path) {
  const info = pageInfo(path);
  const button = document.createElement("button");
  button.type = "button";
  button.className = "tree-item";
  button.dataset.path = path;
  button.dataset.search = `${info.label} ${path}`.toLowerCase();
  button.innerHTML = `<span class="tree-icon"></span><span class="tree-label"><strong></strong><small></small></span>`;
  button.querySelector(".tree-icon").textContent = info.icon;
  button.querySelector("strong").textContent = info.label;
  button.querySelector("small").textContent = info.location;
  button.addEventListener("click", () => loadFile(path));
  return button;
}

function renderTree() {
  elements.pageTree.replaceChildren();
  const contentFiles = state.files.filter((path) => /\.(md|qmd)$/i.test(path));
  const groups = [
    { label: "主要頁面", files: STATIC_PAGES.map((item) => item.path).filter((path) => contentFiles.includes(path)) },
    { label: "AI 知識站文章", files: contentFiles.filter((path) => /^knowledge\/posts\//.test(path)).sort().reverse() },
    { label: "AI 教學與研究文章", files: contentFiles.filter((path) => /^lab\/posts\//.test(path)).sort().reverse() }
  ];
  for (const group of groups) {
    if (!group.files.length) continue;
    const section = document.createElement("section");
    section.className = "tree-group";
    const title = document.createElement("p");
    title.className = "tree-group-title";
    title.textContent = group.label;
    section.append(title, ...group.files.map(createTreeItem));
    elements.pageTree.append(section);
  }
  if (!elements.pageTree.children.length) {
    const empty = document.createElement("p");
    empty.className = "empty-hint";
    empty.textContent = "目前沒有可管理的頁面。";
    elements.pageTree.append(empty);
  }
  setActivePath(state.currentPath);
}

function createTableInput(value, onChange) {
  const input = document.createElement("input");
  input.type = "text";
  input.value = value || "";
  input.addEventListener("input", () => onChange(input.value));
  return input;
}

function renderStructuredTables() {
  elements.tableEditors.replaceChildren();
  elements.structuredData.hidden = state.tableModels.size === 0;
  let tableNumber = 0;
  for (const model of state.tableModels.values()) {
    tableNumber += 1;
    const currentTableNumber = tableNumber;
    const card = document.createElement("section");
    card.className = "table-editor-card";
    const title = document.createElement("h3");
    title.textContent = `表格 ${currentTableNumber}`;
    const table = document.createElement("table");
    table.className = "table-editor-grid";
    const head = document.createElement("thead");
    const headRow = document.createElement("tr");
    model.headers.forEach((header, columnIndex) => {
      const cell = document.createElement("th");
      cell.append(createTableInput(tableCellDisplay(header), (value) => {
        model.headers[columnIndex] = updateTableCellSource(model.headers[columnIndex], value);
        model.dirty = true;
        state.draftSaved = false;
        scheduleDocumentUpdate();
      }));
      headRow.append(cell);
    });
    const actionHead = document.createElement("th");
    actionHead.setAttribute("aria-label", "列操作");
    headRow.append(actionHead);
    head.append(headRow);

    const body = document.createElement("tbody");
    model.rows.forEach((row, rowIndex) => {
      const tableRow = document.createElement("tr");
      model.headers.forEach((_, columnIndex) => {
        const cell = document.createElement("td");
        cell.append(createTableInput(tableCellDisplay(row[columnIndex] || ""), (value) => {
          while (row.length < model.headers.length) row.push("");
          row[columnIndex] = updateTableCellSource(row[columnIndex], value);
          model.dirty = true;
          state.draftSaved = false;
          scheduleDocumentUpdate();
        }));
        tableRow.append(cell);
      });
      const actionCell = document.createElement("td");
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "remove-table-row";
      remove.textContent = "×";
      remove.title = "刪除這一列";
      remove.setAttribute("aria-label", `刪除表格 ${currentTableNumber} 的第 ${rowIndex + 1} 列`);
      remove.addEventListener("click", () => {
        model.rows.splice(rowIndex, 1);
        model.dirty = true;
        state.draftSaved = false;
        renderStructuredTables();
        scheduleDocumentUpdate();
      });
      actionCell.append(remove);
      tableRow.append(actionCell);
      body.append(tableRow);
    });
    table.append(head, body);

    const actions = document.createElement("div");
    actions.className = "table-row-actions";
    const addRow = document.createElement("button");
    addRow.type = "button";
    addRow.textContent = "＋ 新增一列";
    addRow.addEventListener("click", () => {
      model.rows.push(model.headers.map(() => ""));
      model.dirty = true;
      state.draftSaved = false;
      renderStructuredTables();
      scheduleDocumentUpdate();
    });
    const addColumn = document.createElement("button");
    addColumn.type = "button";
    addColumn.textContent = "＋ 新增一欄";
    addColumn.addEventListener("click", () => {
      model.headers.push("新欄位");
      model.alignments.push("left");
      model.rows.forEach((row) => row.push(""));
      model.dirty = true;
      state.draftSaved = false;
      renderStructuredTables();
      scheduleDocumentUpdate();
    });
    const removeColumn = document.createElement("button");
    removeColumn.type = "button";
    removeColumn.textContent = "刪除最後一欄";
    removeColumn.disabled = model.headers.length <= 1;
    removeColumn.addEventListener("click", () => {
      if (model.headers.length <= 1) return;
      model.headers.pop();
      model.alignments.pop();
      model.rows.forEach((row) => row.pop());
      model.dirty = true;
      state.draftSaved = false;
      renderStructuredTables();
      scheduleDocumentUpdate();
    });
    actions.append(addRow, addColumn, removeColumn);
    card.append(title, table, actions);
    elements.tableEditors.append(card);
  }
}

async function connect() {
  state.apiBase = normalizeApiBase(elements.apiBase.value || DEFAULT_API_BASE);
  state.siteUrl = normalizeSiteUrl(elements.siteUrl.value || DEFAULT_SITE_URL);
  const originPermission = `${state.apiBase}/*`;
  const granted = await chrome.permissions.request({ origins: [originPermission] });
  if (!granted) throw new Error("尚未授予管理 API 的連線權限");
  await chrome.storage.local.set({ apiBase: state.apiBase, siteUrl: state.siteUrl });
  const session = await api("/api/session");
  state.connected = true;
  setBadge("已安全連線", "online");
  elements.connectionNotice.classList.add("connected");
  $("newPostButton").disabled = false;
  log(`管理者身分已驗證`, "success");
  await refreshTree();
  return session;
}

async function refreshTree() {
  if (!state.connected) throw new Error("請先登入並連線");
  const result = await api("/api/tree");
  const newDraftPaths = await readNewDraftPaths();
  state.head = result.head;
  state.files = Array.from(new Set([...result.files, ...newDraftPaths]));
  renderTree();
  log(`已同步 ${result.files.filter((path) => /\.(md|qmd)$/i.test(path)).length} 個頁面`);
}

async function loadFile(path) {
  if (!state.connected) throw new Error("請先登入並連線");
  if (!path) return;
  if (state.currentPath && state.currentPath !== path && hasUnsavedChanges() && !state.draftSaved) {
    const proceed = window.confirm("目前修改尚未保存。確定要離開這個頁面嗎？");
    if (!proceed) return;
  }
  const draft = await chrome.storage.local.get(`draft:${path}`);
  const newDraftPaths = await readNewDraftPaths();
  if (newDraftPaths.includes(path) && draft[`draft:${path}`]) {
    let draftUploads = [];
    try { draftUploads = await readDraftUploads(path); }
    catch { log("文字草稿已恢復，但圖片草稿讀取失敗", "error"); }
    openDocument(path, draft[`draft:${path}`], true, "", draftUploads);
    log(`已開啟「${pageInfo(path).label}」草稿`, "success");
    return;
  }
  const result = await api(`/api/file?path=${encodeURIComponent(path)}&ref=${encodeURIComponent(state.head)}`);
  const remoteContent = base64ToText(result.content);
  let content = remoteContent;
  let draftUploads = [];
  if (draft[`draft:${path}`] && draft[`draft:${path}`] !== content) {
    content = draft[`draft:${path}`];
    try { draftUploads = await readDraftUploads(path); }
    catch { log("文字草稿已恢復，但圖片草稿讀取失敗", "error"); }
    log("已恢復這個頁面的本機草稿");
  }
  openDocument(path, content, false, remoteContent, draftUploads);
  log(`已開啟「${pageInfo(path).label}」`, "success");
}

function openDocument(path, content, isNew, sourceContent = content, draftUploads = []) {
  const split = splitFrontMatter(content);
  const protectedLayout = protectLayoutSyntax(split.body);
  const info = pageInfo(path);
  state.currentPath = path;
  state.originalContent = isNew ? "" : sourceContent;
  state.originalBody = split.body;
  state.workingBody = split.body;
  state.frontMatter = split.frontMatter;
  state.frontMatterPrefix = split.prefix;
  state.lineEnding = content.includes("\r\n") ? "\r\n" : "\n";
  state.layoutLocks = protectedLayout.locks;
  state.tableModels = protectedLayout.tableModels;
  state.newDocument = isNew;
  state.bodyDirty = isNew || content !== sourceContent;
  state.editorChanged = false;
  state.editorMappingError = false;
  state.metadataDirty = false;
  state.pendingUploads.clear();
  for (const upload of draftUploads) state.pendingUploads.set(upload.path, upload);
  state.draftSaved = content !== sourceContent || draftUploads.length > 0;
  elements.emptyState.hidden = true;
  elements.editorWorkspace.hidden = false;
  ensureEditor();
  state.loadingEditor = true;
  state.editor.setMarkdown(protectedLayout.editorBody || "");
  state.editorBaselineBody = restoreLayoutSyntax(state.editor.getMarkdown()).trimEnd();
  state.lastEditorMarkdown = state.editor.getMarkdown();
  setTimeout(() => { state.loadingEditor = false; }, 0);
  renderStructuredTables();
  setMetadata(split.frontMatter, info.label);
  elements.documentHeading.textContent = elements.titleInput.value || info.label;
  elements.documentLocation.textContent = info.location;
  elements.commitMessage.value = isNew ? `新增：${elements.titleInput.value}` : `更新：${elements.titleInput.value || info.label}`;
  $("saveDraftButton").disabled = false;
  $("publishButton").disabled = false;
  setActivePath(path);
  updateUploadSummary();
  updateDocumentState();
}

function scheduleDocumentUpdate() {
  clearTimeout(state.previewTimer);
  state.previewTimer = setTimeout(updateDocumentState, 160);
  clearTimeout(state.draftTimer);
  state.draftTimer = setTimeout(async () => {
    if (!state.currentPath || !hasUnsavedChanges() || state.draftSaved) return;
    try { await saveDraft(true); }
    catch { elements.draftStatus.textContent = "草稿尚未保存"; }
  }, 1400);
}

function updateDocumentState() {
  if (!state.editor || !state.currentPath) return;
  const markdown = state.editor.getMarkdown();
  const latin = markdown.match(/[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)?/g) || [];
  const cjk = markdown.match(/[\u3400-\u9fff\uf900-\ufaff]/g) || [];
  elements.wordCount.textContent = `${latin.length + cjk.length} 字`;
  const changed = state.newDocument || state.bodyDirty || state.metadataDirty || Array.from(state.tableModels.values()).some((model) => model.dirty) || state.pendingUploads.size > 0;
  elements.draftStatus.textContent = changed ? "有尚未發布的變更" : "內容已同步";
  elements.documentHeading.textContent = elements.titleInput.value.trim() || pageInfo(state.currentPath).label;
  renderPreview();
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}

function sanitizePreviewHtml(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*(["']).*?\1/gi, "")
    .replace(/javascript:/gi, "");
}

function layoutLineToPreviewHtml(line) {
  const trimmed = line.trim();
  if (/^:{3,}\s*$/.test(trimmed)) return "</div>";
  if (/^:{3,}/.test(trimmed)) {
    if (/\.grid\b/.test(trimmed)) return '<div class="preview-grid">';
    const column = trimmed.match(/\.g-col-md-(\d+)/);
    if (column) return `<div class="preview-column" style="--preview-span:${column[1]}">`;
    const callout = trimmed.match(/\.callout-(note|tip|warning|important|caution)\b/);
    if (callout) return `<div class="preview-callout preview-callout-${callout[1]}">`;
    return '<div class="preview-layout-section">';
  }
  if (/^<\/?[a-z]/i.test(trimmed)) return sanitizePreviewHtml(trimmed);
  return "";
}

function layoutSourceToPreviewHtml(source) {
  return source.split(/\r?\n/).map(layoutLineToPreviewHtml).join("");
}

function inlineMarkdownPreview(value) {
  return escapeHtml(value)
    .replace(/\\\*/g, "*")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)]\((https?:\/\/[^)]+)\)(?:\{[^}]+\})?/g, '<a href="$2">$1</a>')
    .replace(/&lt;i\s+class=&quot;([^&]+)&quot;&gt;&lt;\/i&gt;/g, '<i class="$1"></i>');
}

function tablePreviewHtml(model) {
  const header = model.headers.map((cell) => `<th>${inlineMarkdownPreview(cell)}</th>`).join("");
  const rows = model.rows.map((row) => `<tr>${model.headers.map((_, index) => `<td>${inlineMarkdownPreview(row[index] || "")}</td>`).join("")}</tr>`).join("");
  return `<div class="preview-table-wrap"><table><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

function restorePreviewLayout(html) {
  let restored = html;
  for (const [token, line] of state.layoutLocks) {
    const marker = `<div data-html-comment="true">&lt;!--${token}--&gt;</div>`;
    const replacement = state.tableModels.has(token) ? tablePreviewHtml(state.tableModels.get(token)) : layoutSourceToPreviewHtml(line);
    restored = restored.replaceAll(marker, replacement);
  }
  return restored;
}

function previewPageBase() {
  const sourcePath = state.currentPath || "index.md";
  const directory = sourcePath.endsWith("/index.md") || sourcePath.endsWith("/index.qmd")
    ? sourcePath.replace(/index\.(?:md|qmd)$/i, "")
    : sourcePath.replace(/[^/]+$/, "");
  return new URL(directory, state.siteUrl);
}

function previewAssetUrl(source) {
  const value = String(source || "").trim();
  if (!value || /^(?:data:|blob:|https?:)/i.test(value)) return value;
  if (value.startsWith("/")) return new URL(value.slice(1), state.siteUrl).toString();
  return new URL(value, previewPageBase()).toString();
}

function rewritePreviewImages(html) {
  const documentFragment = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  for (const image of documentFragment.body.querySelectorAll("img[src]")) {
    image.setAttribute("src", previewAssetUrl(image.getAttribute("src")));
  }
  return documentFragment.body.innerHTML;
}

function renderPreview() {
  if (!state.editor) return;
  let body = sanitizePreviewHtml(restorePreviewLayout(state.editor.getHTML()));
  for (const upload of state.pendingUploads.values()) {
    body = body.replaceAll(`src="/${upload.path}"`, `src="${upload.dataUrl}"`);
  }
  body = rewritePreviewImages(body);
  const title = escapeHtml(elements.titleInput.value || pageInfo(state.currentPath).label);
  const description = escapeHtml(elements.descriptionInput.value);
  const featuredImage = readYamlScalar(currentFrontMatter(), "image");
  const featuredImageHtml = featuredImage
    ? `<img class="featured-image" src="${escapeHtml(previewAssetUrl(featuredImage))}" alt="${title}">`
    : "";
  const navigation = STATIC_PAGES.map((page) => `<span>${escapeHtml(page.label)}</span>`).join("");
  elements.livePreview.srcdoc = `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><style>
    *{box-sizing:border-box}body{margin:0;color:#2c344e;background:#fff;font:15px/1.8 Georgia,'Noto Serif TC',serif}
    header{padding:16px 22px;border-bottom:1px solid #e4e7ef;background:#fff;font-family:Inter,'Noto Sans TC',sans-serif}
    .top{display:flex;align-items:center;justify-content:space-between;gap:20px}.brand{font-weight:800}.nav{display:flex;gap:12px;color:#5968a6;font-size:10px;font-weight:700}
    main{max-width:820px;margin:auto;padding:48px 42px 80px}h1{margin:0 0 12px;color:#2c344e;font-size:38px;line-height:1.2}h2,h3{color:#403f6f;line-height:1.35}
    .description{margin:0 0 30px;color:#667085;font:16px/1.7 Inter,'Noto Sans TC',sans-serif}.featured-image{display:block;max-width:min(100%,680px);max-height:420px;margin:0 auto 30px;object-fit:contain;border-radius:16px}.content img{max-width:100%;height:auto;border-radius:12px}.content a{color:#403f6f}.content blockquote{margin-left:0;padding:8px 18px;border-left:4px solid #c8d5ff;background:#f6f7ff}.preview-table-wrap{overflow:auto;margin:18px 0}.content table{width:100%;border-collapse:collapse}.content th,.content td{border:1px solid #dfe4ef;padding:7px}
    .preview-grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:18px;margin:18px 0}.preview-column{grid-column:span var(--preview-span,12);min-width:0}.preview-callout{margin:18px 0;padding:14px 18px;border:1px solid #dfe4ef;border-left:5px solid #6b6aa8;border-radius:10px;background:#f8f9ff}.preview-callout-tip{border-left-color:#3b8d76;background:#f4fbf8}.preview-callout-warning,.preview-callout-caution{border-left-color:#d49a36;background:#fffaf0}.preview-callout-important{border-left-color:#b84b61;background:#fff6f7}.preview-layout-section{margin:12px 0}.premium-icon-box{display:grid;place-items:center;width:44px;height:44px;margin-bottom:10px;border-radius:12px;background:#eef1ff;color:#403f6f}
    @media(max-width:700px){.nav{display:none}main{padding:34px 22px}h1{font-size:30px}.preview-column{grid-column:1/-1}}
  </style></head><body><header><div class="top"><div class="brand">張修瑋 · H.W. Chang</div><div class="nav">${navigation}</div></div></header><main><h1>${title}</h1>${description ? `<p class="description">${description}</p>` : ""}${featuredImageHtml}<article class="content">${body}</article></main></body></html>`;
  elements.previewBadge.textContent = "即時更新";
  elements.previewBadge.className = "mini-badge ready";
}

function safeImageName(file) {
  const extensionByType = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
  const extension = extensionByType[file.type];
  if (!extension) throw new Error("只支援 PNG、JPG 與 WebP 圖片");
  const stem = file.name.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 54) || "image";
  return `${Date.now()}-${stem}.${extension}`;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("無法讀取圖片"));
    reader.readAsDataURL(file);
  });
}

async function queueImage(file) {
  if (!state.currentPath) throw new Error("請先開啟或建立一個頁面");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("每張圖片不可超過 4 MB");
  const filename = safeImageName(file);
  const path = `assets/uploads/${filename}`;
  const dataUrl = await fileToDataUrl(file);
  state.pendingUploads.set(path, {
    path,
    alt: file.name.replace(/\.[^.]+$/, ""),
    dataUrl,
    base64: dataUrl.split(",")[1]
  });
  state.draftSaved = false;
  updateUploadSummary();
  scheduleDocumentUpdate();
  return state.pendingUploads.get(path);
}

function updateUploadSummary() {
  const count = state.pendingUploads.size;
  elements.uploadSummary.textContent = count ? `有 ${count} 張圖片會和頁面一起上傳` : "沒有待上傳的圖片";
  elements.uploadSummary.classList.toggle("pending", count > 0);
}

async function addSelectedImage(file) {
  const upload = await queueImage(file);
  state.editor.exec("addImage", { imageUrl: `/${upload.path}`, altText: upload.alt });
  log("圖片已加入頁面，發布時會一起上傳", "success");
}

async function saveDraft(quiet = false) {
  if (!state.currentPath) throw new Error("尚未開啟頁面");
  await chrome.storage.local.set({ [`draft:${state.currentPath}`]: currentContent() });
  await writeDraftUploads(state.currentPath);
  if (state.newDocument) await addNewDraftPath(state.currentPath);
  state.draftSaved = true;
  elements.draftStatus.textContent = "草稿已儲存在這台電腦";
  if (!quiet) log("本機草稿已儲存，尚未發布", "success");
}

async function publish() {
  if (!state.currentPath) throw new Error("尚未開啟頁面");
  const content = currentContent();
  const wasNewDocument = state.newDocument;
  if (!state.newDocument && content === state.originalContent && !state.pendingUploads.size) throw new Error("目前沒有需要發布的變更");
  const message = elements.commitMessage.value.trim();
  if (message.length < 3) throw new Error("請填寫這次更新的說明");
  const files = [{ path: state.currentPath, operation: "upsert", encoding: "utf-8", content }];
  for (const upload of state.pendingUploads.values()) {
    files.push({ path: upload.path, operation: "upsert", encoding: "base64", content: upload.base64 });
  }
  log("正在同步到 GitHub…");
  const result = await api("/api/publish", {
    method: "POST",
    body: JSON.stringify({ baseCommitSha: state.head, message, files })
  });
  state.head = result.commitSha;
  state.originalContent = content;
  const publishedSplit = splitFrontMatter(content);
  state.originalBody = publishedSplit.body;
  state.workingBody = state.originalBody;
  state.frontMatterPrefix = publishedSplit.prefix;
  state.lineEnding = content.includes("\r\n") ? "\r\n" : "\n";
  for (const model of state.tableModels.values()) {
    model.originalSource = serializeTable(model);
    model.originalWidth = model.headers.length;
    model.originalSeparator = model.originalSource.split(/\r?\n/)[1] || "";
    model.dirty = false;
  }
  state.editorBaselineBody = restoreLayoutSyntax(state.editor.getMarkdown()).trimEnd();
  state.newDocument = false;
  state.bodyDirty = false;
  state.editorChanged = false;
  state.editorMappingError = false;
  state.metadataDirty = false;
  state.frontMatter = currentFrontMatter();
  state.pendingUploads.clear();
  try {
    await chrome.storage.local.remove(`draft:${state.currentPath}`);
    if (wasNewDocument) await removeNewDraftPath(state.currentPath);
    await clearDraftUploads(state.currentPath);
  } catch {
    log("更新已發布，但本機草稿需要手動清理", "error");
  }
  state.draftSaved = false;
  updateUploadSummary();
  updateDocumentState();
  log("更新已送出，GitHub 正在重新建置網站", "success");
  await refreshTree();
}

function createNewPost(event) {
  event.preventDefault();
  const collection = elements.newPostCollection.value;
  const title = elements.newPostTitle.value.trim();
  const slug = elements.newPostSlug.value.trim().toLowerCase();
  if (!title) throw new Error("請填寫文章標題");
  if (!/^[a-z0-9][a-z0-9-]{2,80}$/.test(slug)) throw new Error("網址名稱格式不正確");
  const path = `${collection}/posts/${slug}/index.md`;
  if (state.files.includes(path)) throw new Error("這個網址名稱已經存在");
  const date = new Date().toISOString().slice(0, 10);
  const content = `---\ntitle: ${JSON.stringify(title)}\ndate: ${JSON.stringify(date)}\ncategories: []\ndraft: false\n---\n\n從這裡開始撰寫文章。\n`;
  elements.newPostDialog.close();
  elements.newPostForm.reset();
  if (!state.files.includes(path)) {
    state.files.push(path);
    renderTree();
  }
  openDocument(path, content, true);
  log("新文章草稿已建立，尚未發布", "success");
}

function run(buttonId, task) {
  $(buttonId).addEventListener("click", async () => {
    const button = $(buttonId);
    button.disabled = true;
    try {
      await task();
    } catch (error) {
      setBadge(state.connected ? "操作需要處理" : "尚未連線", "error");
      if (error.status === 409) log("網站已有較新的內容，請重新整理後再編輯", "error");
      else log(error.message || "操作失敗", "error");
    } finally {
      button.disabled = false;
    }
  });
}

renderTopNav();

run("connectButton", connect);
run("refreshButton", refreshTree);
run("saveDraftButton", saveDraft);
run("publishButton", publish);

$("loginButton").addEventListener("click", () => {
  try { window.open(`${normalizeApiBase(elements.apiBase.value)}/api/session`, "_blank", "noopener"); }
  catch (error) { log(error.message, "error"); }
});

$("openPreviewButton").addEventListener("click", async () => {
  try {
    state.siteUrl = normalizeSiteUrl(elements.siteUrl.value);
    await chrome.storage.local.set({ siteUrl: state.siteUrl });
    window.open(state.siteUrl, "_blank", "noopener");
  } catch (error) { log(error.message, "error"); }
});

$("brandHomeButton").addEventListener("click", () => state.connected ? loadFile("index.md") : log("請先登入並連線", "error"));
$("settingsButton").addEventListener("click", () => elements.settingsDialog.showModal());
$("newPostButton").addEventListener("click", () => {
  if (hasUnsavedChanges() && !state.draftSaved && !window.confirm("目前修改尚未保存。確定要建立另一篇文章嗎？")) return;
  elements.newPostDialog.showModal();
});
$("cancelNewPostButton").addEventListener("click", () => elements.newPostDialog.close());
elements.newPostForm.addEventListener("submit", (event) => {
  try { createNewPost(event); }
  catch (error) { event.preventDefault(); log(error.message, "error"); }
});

$("saveSettingsButton").addEventListener("click", async (event) => {
  event.preventDefault();
  try {
    state.apiBase = normalizeApiBase(elements.apiBase.value);
    state.siteUrl = normalizeSiteUrl(elements.siteUrl.value);
    await chrome.storage.local.set({ apiBase: state.apiBase, siteUrl: state.siteUrl });
    elements.settingsDialog.close();
    log("設定已儲存", "success");
  } catch (error) { log(error.message, "error"); }
});

$("addImageButton").addEventListener("click", () => elements.imageInput.click());
elements.imageInput.addEventListener("change", async () => {
  const [file] = elements.imageInput.files;
  elements.imageInput.value = "";
  if (!file) return;
  try { await addSelectedImage(file); }
  catch (error) { log(error.message || "圖片加入失敗", "error"); }
});

for (const input of [elements.titleInput, elements.descriptionInput, elements.dateInput, elements.categoriesInput]) {
  input.addEventListener("input", () => {
    state.metadataDirty = true;
    state.draftSaved = false;
    scheduleDocumentUpdate();
  });
}

elements.pageSearch.addEventListener("input", () => {
  const query = elements.pageSearch.value.trim().toLowerCase();
  document.querySelectorAll(".tree-item").forEach((item) => { item.hidden = query && !item.dataset.search.includes(query); });
  document.querySelectorAll(".tree-group").forEach((group) => {
    group.hidden = !Array.from(group.querySelectorAll(".tree-item")).some((item) => !item.hidden);
  });
});

chrome.storage.local.get(["apiBase", "siteUrl"]).then(async ({ apiBase, siteUrl }) => {
  state.apiBase = apiBase || DEFAULT_API_BASE;
  state.siteUrl = !siteUrl || siteUrl === LEGACY_SITE_URL ? DEFAULT_SITE_URL : siteUrl;
  elements.apiBase.value = state.apiBase;
  elements.siteUrl.value = state.siteUrl;
  await chrome.storage.local.set({ apiBase: state.apiBase, siteUrl: state.siteUrl });
  try {
    const hasPermission = await chrome.permissions.contains({ origins: [`${normalizeApiBase(state.apiBase)}/*`] });
    if (hasPermission) await connect();
  } catch {
    setBadge("請登入", "neutral");
  }
});

window.addEventListener("beforeunload", (event) => {
  if (!hasUnsavedChanges() || state.draftSaved) return;
  event.preventDefault();
  event.returnValue = "";
});
