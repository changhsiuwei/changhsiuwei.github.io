const DEFAULT_API_BASE = "https://hw-chang-site-admin-api.hw-chang-site-admin-worker.workers.dev";
const DEFAULT_SITE_URL = "https://changhsiuwei.com/";
const LEGACY_SITE_URL = "https://changhsiuwei.github.io/";
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

const STATIC_PAGES = [
  { path: "index.md", label: "首頁", icon: "⌂" },
  { path: "about/index.md", label: "個人資訊", icon: "人" },
  { path: "activities/index.md", label: "近期活動", icon: "曆" },
  { path: "publications/index.md", label: "學術出版", icon: "文" },
  { path: "lab/index.md", label: "教學與研究", icon: "研" },
  { path: "knowledge/index.md", label: "AI 知識站", icon: "知" },
  { path: "students/index.qmd", label: "學生專區", icon: "學" }
];

const KNOWN_POST_METADATA = {};

function getPostMetadata(path) {
  if (state.postMetadataCache && state.postMetadataCache[path]) {
    return state.postMetadataCache[path];
  }
  if (KNOWN_POST_METADATA[path]) {
    return KNOWN_POST_METADATA[path];
  }
  const slug = path.split("/").at(-2) || path;
  const label = slug.split("-").filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
  return { title: label, date: "", categories: [], desc: "", draft: false, image: "", slides: "", handout: "" };
}

const state = {
  apiBase: DEFAULT_API_BASE,
  siteUrl: DEFAULT_SITE_URL,
  head: "",
  files: [],
  currentPath: "",
  originalContent: "",
  originalBody: "",
  frontMatter: "",
  frontMatterPrefix: "",
  lineEnding: "\n",
  layoutLocks: new Map(),
  tableModels: new Map(),
  activityModels: new Map(),
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
  draftSaved: false,
  homeModel: null,
  homeDirty: false,
  aboutModel: null,
  aboutDirty: false,
  pubModel: null,
  pubDirty: false,
  sectionHubModel: null,
  sectionHubDirty: false,
  studentsModel: null,
  studentsDirty: false,
  postMetadataCache: {},
  geminiApiKey: "",
  geminiModel: "gemini-3.7-flash",
  geminiThinkingLevel: "2048",
  geminiTemperature: "0.7",
  pendingAiGeneratedPost: null,
  activeAiPolishResult: null,
  expandedFolders: new Set(["lab", "knowledge"])
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
  editorToolbar: $("editorToolbar"),
  structuredData: $("structuredData"),
  structuredDataTitle: $("structuredDataTitle"),
  structuredDataHint: $("structuredDataHint"),
  activityIntroSection: $("activityIntroSection"),
  activityIntroInput: $("activityIntroInput"),
  activityEditors: $("activityEditors"),
  tableEditors: $("tableEditors"),
  homeEditors: $("homeEditors"),
  homeBioInput: $("homeBioInput"),
  homeMottoInput: $("homeMottoInput"),
  addResearchAreaButton: $("addResearchAreaButton"),
  researchAreaList: $("researchAreaList"),
  addTeachingCourseButton: $("addTeachingCourseButton"),
  teachingCourseList: $("teachingCourseList"),
  addTeachingEvaluationButton: $("addTeachingEvaluationButton"),
  teachingEvaluationList: $("teachingEvaluationList"),
  addHighlightButton: $("addHighlightButton"),
  highlightList: $("highlightList"),
  aboutEditors: $("aboutEditors"),
  aboutNameInput: $("aboutNameInput"),
  aboutTitleInput: $("aboutTitleInput"),
  addEducationButton: $("addEducationButton"),
  educationList: $("educationList"),
  addExperienceButton: $("addExperienceButton"),
  experienceList: $("experienceList"),
  addHonorButton: $("addHonorButton"),
  honorsList: $("honorsList"),
  addServiceButton: $("addServiceButton"),
  servicesList: $("servicesList"),
  publicationEditors: $("publicationEditors"),
  addJournalPaperButton: $("addJournalPaperButton"),
  journalPaperList: $("journalPaperList"),
  addWorkingPaperButton: $("addWorkingPaperButton"),
  workingPaperList: $("workingPaperList"),
  addConferenceButton: $("addConferenceButton"),
  conferenceList: $("conferenceList"),
  sectionHubEditors: $("sectionHubEditors"),
  sectionHubBadge: $("sectionHubBadge"),
  sectionHubIntroInput: $("sectionHubIntroInput"),
  sectionHubArticlesBadge: $("sectionHubArticlesBadge"),
  sectionHubAddPostButton: $("sectionHubAddPostButton"),
  sectionHubArticleList: $("sectionHubArticleList"),
  studentPasswordCard: $("studentPasswordCard"),
  studentsEditors: $("studentsEditors"),
  studentPasswordInput: $("studentPasswordInput"),
  btnUpdateStudentPassword: $("btnUpdateStudentPassword"),
  studentPasswordStatus: $("studentPasswordStatus"),
  studentsWelcomeTitleInput: $("studentsWelcomeTitleInput"),
  studentsWelcomeTextInput: $("studentsWelcomeTextInput"),
  addStudentScheduleButton: $("addStudentScheduleButton"),
  studentScheduleList: $("studentScheduleList"),
  addStudentGuidelineButton: $("addStudentGuidelineButton"),
  studentGuidelineList: $("studentGuidelineList"),
  documentHeading: $("documentHeading"),
  documentLocation: $("documentLocation"),
  deleteDocumentButton: $("deleteDocumentButton"),
  titleInput: $("titleInput"),
  subtitleInput: $("subtitleInput"),
  descriptionInput: $("descriptionInput"),
  dateInput: $("dateInput"),
  draftInput: $("draftInput"),
  categoriesInput: $("categoriesInput"),
  featuredImageInput: $("featuredImageInput"),
  uploadCoverButton: $("uploadCoverButton"),
  slidesUrlInput: $("slidesUrlInput"),
  handoutUrlInput: $("handoutUrlInput"),
  youtubeUrlInput: $("youtubeUrlInput"),
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
  newPostSlug: $("newPostSlug"),
  postOnlyFields: $("postOnlyFields"),
  geminiApiKey: $("geminiApiKey"),
  geminiModel: $("geminiModel"),
  geminiThinkingLevel: $("geminiThinkingLevel"),
  geminiTemperature: $("geminiTemperature"),
  geminiTemperatureValue: $("geminiTemperatureValue"),
  newPostAiNotes: $("newPostAiNotes"),
  newPostTargetWords: $("newPostTargetWords"),
  btnRunAiGenerateNewPost: $("btnRunAiGenerateNewPost"),
  aiNewPostFeedback: $("aiNewPostFeedback"),
  aiStatWordCount: $("aiStatWordCount"),
  aiStatSubtitle: $("aiStatSubtitle"),
  aiRecommendedTitles: $("aiRecommendedTitles"),
  aiPolishEditorButton: $("aiPolishEditorButton"),
  aiPolishDialog: $("aiPolishDialog"),
  cancelAiPolishButton: $("cancelAiPolishButton"),
  aiPolishOralNotes: $("aiPolishOralNotes"),
  aiPolishTargetWords: $("aiPolishTargetWords"),
  btnRunAiPolishActive: $("btnRunAiPolishActive"),
  aiPolishResults: $("aiPolishResults"),
  aiActiveWordCount: $("aiActiveWordCount"),
  aiActiveSubtitle: $("aiActiveSubtitle"),
  aiActiveRecommendedTitles: $("aiActiveRecommendedTitles"),
  aiPolishedTextPreview: $("aiPolishedTextPreview"),
  applyAiPolishButton: $("applyAiPolishButton")
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
  return state.newDocument || state.bodyDirty || state.metadataDirty
    || state.homeDirty || state.aboutDirty || state.pubDirty || state.sectionHubDirty || state.studentsDirty
    || Array.from(state.tableModels.values()).some((model) => model.dirty)
    || Array.from(state.activityModels.values()).some((model) => model.dirty)
    || state.pendingUploads.size > 0;
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

function textToBase64(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
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

function findFencedDivEnd(lines, startIndex) {
  let depth = 0;
  for (let index = startIndex; index < lines.length; index += 1) {
    if (/^\s*:{3,}\s*\{/.test(lines[index])) depth += 1;
    else if (/^\s*:{3,}\s*$/.test(lines[index])) {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function parseActivityGrid(source, year = "") {
  const lines = source.split(/\r?\n/);
  if (!/^\s*:{3,}\s*\{[^}]*\.grid\b[^}]*\}\s*$/.test(lines[0] || "")) return null;
  const events = [];
  let index = 1;
  const skipBlanks = () => { while (index < lines.length - 1 && !lines[index].trim()) index += 1; };
  skipBlanks();
  while (index < lines.length - 1) {
    if (!/^\s*:{3,}\s*\{[^}]*\.g-col-md-2\b[^}]*\}\s*$/.test(lines[index])) return null;
    index += 1;
    const dateMatch = (lines[index] || "").match(/^\s*\*\*(.*?)\*\*\s*$/);
    if (!dateMatch) return null;
    const date = dateMatch[1].trim();
    index += 1;
    if (!/^\s*:{3,}\s*$/.test(lines[index] || "")) return null;
    index += 1;
    if (!/^\s*:{3,}\s*\{[^}]*\.g-col-md-10\b[^}]*\}\s*$/.test(lines[index] || "")) return null;
    index += 1;
    const venueMatch = (lines[index] || "").match(/^\s*#{4}\s*(.*?)\s*$/);
    if (!venueMatch) return null;
    const venue = venueMatch[1].trim();
    index += 1;
    const topicMatch = (lines[index] || "").match(/^\s*\*(.*?)\*\s*$/);
    if (!topicMatch) return null;
    const topic = topicMatch[1].trim();
    index += 1;

    let slidesUrl = "";
    let handoutUrl = "";
    let youtubeUrl = "";
    while (index < lines.length - 1 && !/^\s*:{3,}\s*$/.test(lines[index])) {
      const line = lines[index].trim();
      if (line) {
        const allLinks = Array.from(line.matchAll(/\[(.*?)\]\((https?:\/\/[^\s)]+)\)/g));
        for (const match of allLinks) {
          const label = match[1];
          const url = match[2];
          if (/youtube|youtu\.be|影片|video/i.test(label) || /youtube\.com|youtu\.be/.test(url)) {
            youtubeUrl = url;
          } else if (/簡報|投影片|slide/i.test(label)) {
            slidesUrl = url;
          } else if (/講義|handout/i.test(label)) {
            handoutUrl = url;
          } else if (/教材|參考/i.test(label)) {
            if (!slidesUrl) slidesUrl = url;
            else if (!handoutUrl) handoutUrl = url;
          } else {
            if (!slidesUrl) slidesUrl = url;
            else if (!handoutUrl) handoutUrl = url;
          }
        }
        if (!allLinks.length) {
          const directMatch = line.match(/https?:\/\/[^\s)]+/);
          if (directMatch && !slidesUrl) slidesUrl = directMatch[0].trim();
        }
      }
      index += 1;
    }

    if (!/^\s*:{3,}\s*$/.test(lines[index] || "")) return null;
    index += 1;
    const eventObj = { date, venue, topic };
    if (slidesUrl) eventObj.slidesUrl = slidesUrl;
    if (handoutUrl) eventObj.handoutUrl = handoutUrl;
    if (youtubeUrl) eventObj.youtubeUrl = youtubeUrl;
    events.push(eventObj);
    skipBlanks();
  }
  if (!/^\s*:{3,}\s*$/.test(lines.at(-1) || "") || (!events.length && !year)) return null;
  return {
    year,
    events,
    originalSource: source,
    lineEnding: source.includes("\r\n") ? "\r\n" : "\n",
    dirty: false
  };
}

function cleanActivityField(value) {
  return String(value || "").replace(/[\r\n]+/g, " ").trim();
}

function serializeActivityGrid(model) {
  if (!model.dirty) return model.originalSource;
  const lines = ["::: {.grid}", ""];
  for (const event of model.events) {
    lines.push(
      "::: {.g-col-12 .g-col-md-2}",
      `**${cleanActivityField(event.date)}**`,
      ":::",
      "::: {.g-col-12 .g-col-md-10}",
      `#### ${cleanActivityField(event.venue)}`,
      `*${cleanActivityField(event.topic)}*`
    );
    const slides = cleanActivityField(event.slidesUrl);
    const handout = cleanActivityField(event.handoutUrl);
    const youtube = cleanActivityField(event.youtubeUrl);
    const linkParts = [];
    if (slides) {
      linkParts.push(`[📊 簡報下載 ↗](${slides}){target="_blank" .activity-materials-link .activity-slides-link}`);
    }
    if (handout) {
      linkParts.push(`[📄 講義下載 ↗](${handout}){target="_blank" .activity-materials-link .activity-handout-link}`);
    }
    if (youtube) {
      linkParts.push(`[▶ YouTube 影片 ↗](${youtube}){target="_blank" .activity-materials-link .activity-youtube-link}`);
    }
    if (linkParts.length) {
      lines.push("", linkParts.join(" "));
    }
    lines.push(":::", "");
  }
  lines.push(":::");
  return lines.join(model.lineEnding);
}

function parseActivityIntro(body) {
  const match = body.match(/:::\s*\{[^}]*\.callout-tip[^}]*\}\s*\r?\n##\s*🌟\s*最新動態\s*\r?\n([\s\S]*?)\r?\n:::/);
  return match ? match[1].trim() : "以下為近期的學術與產業演講、工作坊活動紀錄。";
}

function serializeActivitiesBody(introText, activityModels, lineEnding = "\n") {
  const intro = String(introText || "").trim() || "以下為近期的學術與產業演講、工作坊活動紀錄。";
  const yearSections = [];
  for (const model of activityModels.values()) {
    yearSections.push(`## ${model.year}${lineEnding}${lineEnding}${serializeActivityGrid(model)}`);
  }
  return `::: {.callout-tip appearance="minimal"}${lineEnding}## 🌟 最新動態${lineEnding}${intro}${lineEnding}:::${lineEnding}${lineEnding}${yearSections.join(`${lineEnding}${lineEnding}---${lineEnding}${lineEnding}`)}`;
}

function parseHomePage(body) {
  const lines = body.split(/\r?\n/);
  let bio = "";
  let motto = "";
  const researchAreas = [];
  const courses = [];
  const evaluations = [];
  const highlights = [];
  let section = "";
  let curArea = null;
  let curCourse = null;
  let curEval = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === "## 關於我") {
      section = "about";
      continue;
    } else if (trimmed === "## 研究領域") {
      section = "research";
      continue;
    } else if (trimmed === "## 本學期授課" || trimmed.includes("本學期授課")) {
      section = "courses";
      continue;
    } else if (trimmed === "## 授課評價與學生回饋" || trimmed.includes("授課評價") || trimmed.includes("學生回饋")) {
      section = "evaluations";
      continue;
    } else if (trimmed === "## 最新動態") {
      section = "highlights";
      continue;
    }

    if (section === "about") {
      if (trimmed === ":::") {
        section = "";
        continue;
      }
      if (trimmed.startsWith(":::")) continue;
      const mottoMatch = trimmed.match(/\*"(.*?)"\*/);
      if (mottoMatch) {
        motto = mottoMatch[1].trim();
      } else if (trimmed) {
        bio = bio ? `${bio}\n\n${trimmed}` : trimmed;
      }
    } else if (section === "research") {
      if (trimmed.startsWith("::: {.g-col-12")) {
        curArea = { icon: "bi bi-cpu", title: "", desc: "" };
        researchAreas.push(curArea);
        continue;
      }
      if (curArea) {
        if (trimmed === ":::") {
          curArea = null;
          continue;
        }
        const iconMatch = trimmed.match(/<i class="([^"]*)"><\/i>/);
        if (iconMatch) {
          curArea.icon = iconMatch[1].trim();
        } else if (trimmed.startsWith("### ")) {
          curArea.title = trimmed.replace(/^###\s+/, "").trim();
        } else if (trimmed && !trimmed.startsWith("<div") && !trimmed.startsWith("</div")) {
          curArea.desc = curArea.desc ? `${curArea.desc} ${trimmed}` : trimmed;
        }
      }
    } else if (section === "courses") {
      if (trimmed.startsWith("::: {.g-col-12")) {
        curCourse = { time: "", name: "", desc: "", syllabusUrl: "" };
        courses.push(curCourse);
        continue;
      }
      if (curCourse) {
        if (trimmed === ":::") {
          curCourse = null;
          continue;
        }
        const badgeMatch = trimmed.match(/<span class="badge[^>]*>([\s\S]*?)<\/span>/);
        if (badgeMatch) {
          curCourse.time = badgeMatch[1].trim();
        }
        const titleMatch = trimmed.match(/<h3[^>]*>([\s\S]*?)<\/h3>/);
        if (titleMatch) {
          curCourse.name = titleMatch[1].trim();
        }
        const pMatch = trimmed.match(/<p[^>]*>([\s\S]*?)<\/p>/);
        if (pMatch) {
          curCourse.desc = pMatch[1].trim();
        }
        const hrefMatch = trimmed.match(/href="([^"]*)"/);
        if (hrefMatch) {
          curCourse.syllabusUrl = hrefMatch[1].trim();
        }
      }
    } else if (section === "evaluations") {
      if (trimmed.startsWith("::: {.g-col-12")) {
        curEval = { course: "", score: "", feedback: "", source: "" };
        evaluations.push(curEval);
        continue;
      }
      if (curEval) {
        if (trimmed === ":::") {
          curEval = null;
          continue;
        }
        const badgeMatch = trimmed.match(/<span class="badge[^>]*>([\s\S]*?)<\/span>/);
        if (badgeMatch) {
          curEval.score = badgeMatch[1].trim();
        }
        const spanMatch = trimmed.match(/<span style="[^"]*font-weight:\s*700[^"]*">([\s\S]*?)<\/span>/);
        if (spanMatch && !trimmed.includes("class=\"badge")) {
          curEval.course = spanMatch[1].trim();
        }
        const quoteMatch = trimmed.match(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/);
        if (quoteMatch) {
          curEval.feedback = quoteMatch[1].replace(/^[「“"']|[」”"']$/g, "").trim();
        } else if (trimmed.startsWith("「") || trimmed.startsWith("\"")) {
          curEval.feedback = trimmed.replace(/^[「“"']|[」”"']$/g, "").trim();
        }
        const sourceMatch = trimmed.match(/<div[^>]*>(?:—|--|-)\s*([\s\S]*?)<\/div>/) || trimmed.match(/^(?:—|--|-)\s*(.*)$/);
        if (sourceMatch) {
          curEval.source = sourceMatch[1].trim();
        }
      }
    } else if (section === "highlights") {
      if (trimmed.startsWith("|") && !trimmed.includes("---") && !trimmed.includes("日期")) {
        const parts = line.split("|").map((p) => p.trim()).filter(Boolean);
        if (parts.length >= 2) {
          highlights.push({ date: parts[0], event: parts.slice(1).join("|") });
        }
      }
    }
  }

  return { bio, motto, researchAreas, courses, evaluations, highlights };
}

function serializeHomePage(model, lineEnding = "\n") {
  const bio = (model.bio || "").trim();
  const motto = (model.motto || "").trim();
  const mottoLine = motto ? `${lineEnding}${lineEnding}*"${motto}"*` : "";

  const areaBlocks = (model.researchAreas || []).map((area) => {
    return [
      "::: {.g-col-12 .g-col-md-4}",
      `<div class="premium-icon-box"><i class="${area.icon || "bi bi-cpu"}"></i></div>`,
      `### ${area.title || ""}`,
      area.desc || "",
      ":::"
    ].join(lineEnding);
  });

  const courseBlocks = (model.courses || []).map((c) => {
    const timeBadge = c.time ? `<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">${lineEnding}  <span class="badge bg-primary" style="font-size:12px;padding:5px 10px;">${c.time}</span>${lineEnding}</div>` : "";
    const syllabusLink = c.syllabusUrl ? `${lineEnding}<a href="${c.syllabusUrl}" class="btn btn-sm btn-outline-primary" target="_blank" rel="noopener noreferrer" style="font-size:12px;font-weight:600;width:fit-content;display:inline-flex;align-items:center;gap:4px;">${lineEnding}  <i class="bi bi-file-earmark-text"></i> 下載 / 查看授課大綱 ↗${lineEnding}</a>` : "";
    return [
      "::: {.g-col-12 .g-col-md-6}",
      `<div class="card p-3 shadow-sm h-100 border-start border-primary border-4" style="background:#f8faff;border-radius:12px;">`,
      timeBadge,
      `<h3 style="margin:4px 0 8px;font-size:18px;color:#001F3F;font-weight:700;">${c.name || "課程名稱"}</h3>`,
      `<p style="margin:0 0 12px;color:#475569;font-size:13px;line-height:1.5;">${c.desc || ""}</p>${syllabusLink}`,
      `</div>`,
      ":::"
    ].filter(Boolean).join(lineEnding);
  });

  const evalBlocks = (model.evaluations || []).map((e) => {
    const scoreBadge = e.score ? `<span class="badge bg-warning text-dark" style="font-weight:700;font-size:12px;">${e.score}</span>` : "";
    const sourceHtml = e.source ? `${lineEnding}<div style="font-size:11px;color:#64748b;text-align:right;">— ${e.source}</div>` : "";
    return [
      "::: {.g-col-12 .g-col-md-6}",
      `<div class="card p-3 shadow-sm h-100 border-start border-warning border-4" style="background:#fffdfa;border-radius:12px;">`,
      `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">${lineEnding}  <span style="font-weight:700;color:#001F3F;font-size:14px;">${e.course || "課程名稱"}</span>${lineEnding}  ${scoreBadge}${lineEnding}</div>`,
      `<blockquote style="margin:0 0 8px;padding-left:12px;border-left:3px solid #C9A227;color:#334155;font-size:13px;font-style:italic;line-height:1.6;">${lineEnding}  「${e.feedback || ""}」${lineEnding}</blockquote>${sourceHtml}`,
      `</div>`,
      ":::"
    ].join(lineEnding);
  });

  const highlightRows = [
    "| 日期 | 事件 |",
    "|------|------|",
    ...(model.highlights || []).map((h) => `| ${h.date || ""} | ${h.event || ""} |`)
  ].join(lineEnding);

  const sections = [
    `:::{#hero-heading}`,
    `## 關於我`,
    ``,
    `${bio}${mottoLine}`,
    `:::`,
    ``,
    `## 研究領域`,
    ``,
    `::: {.grid}`,
    ``,
    areaBlocks.join(`${lineEnding}${lineEnding}`),
    ``,
    `:::`
  ];

  if (courseBlocks.length) {
    sections.push(
      ``,
      `## 本學期授課`,
      ``,
      `::: {.grid}`,
      ``,
      courseBlocks.join(`${lineEnding}${lineEnding}`),
      ``,
      `:::`
    );
  }

  if (evalBlocks.length) {
    sections.push(
      ``,
      `## 授課評價與學生回饋`,
      ``,
      `::: {.grid}`,
      ``,
      evalBlocks.join(`${lineEnding}${lineEnding}`),
      ``,
      `:::`
    );
  }

  sections.push(
    ``,
    `## 最新動態`,
    ``,
    highlightRows,
    ``,
    `: {tbl-colwidths="[15, 85]"}`
  );

  return sections.join(lineEnding);
}

function parseAboutPage(body) {
  const calloutMatch = body.match(/:::\s*\{\.callout-note\s+appearance="minimal"\}\s*\r?\n##\s*(.*?)\r?\n([\s\S]*?)\r?\n:::/);
  const calloutTitle = calloutMatch ? calloutMatch[1].trim() : "張修瑋 (H.W. Chang)";
  const calloutSubtitle = calloutMatch ? calloutMatch[2].trim() : "**國立臺北大學會計學系 助理教授** | Assistant Professor, Dept. of Accountancy, NTPU";

  const education = [];
  const eduMatch = body.match(/##\s*<i class="[^"]*"><\/i>\s*學歷\s*\(Education\)\s*\r?\n([\s\S]*?)(?:\r?\n---|$)/);
  if (eduMatch) {
    const colRegex = /::: \{\.g-col-12[^\}]*\}\s*\r?\n####\s*(.*?)\r?\n([\s\S]*?)\r?\n:::/g;
    let match;
    while ((match = colRegex.exec(eduMatch[1])) !== null) {
      const degree = match[1].trim();
      const content = match[2].trim();
      const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      let school = "";
      let detail = "";
      let period = "";
      let linkText = "";
      let linkUrl = "";

      for (let idx = 0; idx < lines.length; idx++) {
        const line = lines[idx];
        if (line.startsWith("[📄") || (line.startsWith("[") && line.includes("]("))) {
          const lMatch = line.match(/\[(.*?)\]\((.*?)\)/);
          if (lMatch) {
            linkText = lMatch[1];
            linkUrl = lMatch[2].replace(/\{target="_blank"\}/, "");
          }
        } else if (/^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{4})/.test(line)) {
          period = line;
        } else if (!school) {
          school = line.trim();
        } else if (line.startsWith("(") && line.endsWith(")")) {
          school += " " + line;
        } else {
          detail = detail ? `${detail}, ${line}` : line;
        }
      }
      education.push({ degree, school, detail, period, linkText, linkUrl });
    }
  }

  const experience = [];
  const expMatch = body.match(/##\s*<i class="[^"]*"><\/i>\s*經歷\s*\(Professional Experience\)\s*\r?\n([\s\S]*?)(?:\r?\n---|$)/);
  if (expMatch) {
    const lines = expMatch[1].split(/\r?\n/).filter((l) => l.trim().startsWith("|") && !l.includes("---") && !l.includes("期間"));
    for (const line of lines) {
      const parts = line.split("|").map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 3) {
        experience.push({
          period: parts[0],
          title: parts[1],
          institution: parts[2]
        });
      }
    }
  }

  const honors = [];
  const honorsMatch = body.match(/##\s*<i class="[^"]*"><\/i>\s*榮譽與獎項\s*\(Honors & Awards\)\s*\r?\n([\s\S]*?)(?:\r?\n---|$)/);
  if (honorsMatch) {
    const lines = honorsMatch[1].split(/\r?\n/).filter((l) => l.trim().startsWith("-"));
    for (const line of lines) {
      honors.push(line.replace(/^-\s*/, "").trim());
    }
  }

  const services = [];
  const servicesMatch = body.match(/##\s*<i class="[^"]*"><\/i>\s*服務\s*\(Service\)\s*\r?\n([\s\S]*?)(?:\r?\n---|$)/);
  if (servicesMatch) {
    const lines = servicesMatch[1].split(/\r?\n/).filter((l) => l.trim().startsWith("-"));
    for (const line of lines) {
      services.push(line.replace(/^-\s*/, "").trim());
    }
  }

  return { calloutTitle, calloutSubtitle, education, experience, honors, services };
}

function serializeAboutPage(model, lineEnding = "\n") {
  const eduBlocks = (model.education || []).map((e) => {
    const lines = ["::: {.g-col-12 .g-col-md-6}", `#### ${e.degree || ""}`];
    if (e.school) lines.push(`${e.school}  `);
    if (e.detail) lines.push(`${e.detail}  `);
    if (e.period) lines.push(e.linkUrl ? `${e.period}  ` : e.period);
    if (e.linkUrl) lines.push(`[${e.linkText || "📄 Dissertation"}](${e.linkUrl}){target="_blank"}`);
    lines.push(":::");
    return lines.join(lineEnding);
  });

  const expRows = [
    "| 期間 | 職位 | 單位 |",
    "|------|------|------|",
    ...(model.experience || []).map((exp) => `| ${exp.period || ""} | ${exp.title || ""} | ${exp.institution || ""} |`)
  ].join(lineEnding);

  const honorLines = (model.honors || []).map((h) => `- ${h}`).join(lineEnding);
  const serviceLines = (model.services || []).map((s) => `- ${s}`).join(lineEnding);

  return [
    `::: {.callout-note appearance="minimal"}`,
    `## ${model.calloutTitle || "張修瑋 (H.W. Chang)"}`,
    `${model.calloutSubtitle || "**國立臺北大學會計學系 助理教授** | Assistant Professor, Dept. of Accountancy, NTPU"}`,
    `:::`,
    ``,
    `## <i class="bi bi-mortarboard"></i> 學歷 (Education)`,
    ``,
    `::: {.grid}`,
    ``,
    eduBlocks.join(`${lineEnding}${lineEnding}`),
    ``,
    `:::`,
    ``,
    `---`,
    ``,
    `## <i class="bi bi-briefcase"></i> 經歷 (Professional Experience)`,
    ``,
    expRows,
    ``,
    `---`,
    ``,
    `## <i class="bi bi-trophy"></i> 榮譽與獎項 (Honors & Awards)`,
    ``,
    honorLines,
    ``,
    `---`,
    ``,
    `## <i class="bi bi-people"></i> 服務 (Service)`,
    ``,
    serviceLines
  ].join(lineEnding);
}

function parsePublicationsPage(body) {
  const journalPapers = [];
  const workingPapers = [];
  const conferences = [];

  const journalSection = body.match(/##\s*📄\s*期刊論文\s*\(Journal Publications\)\s*\r?\n([\s\S]*?)(?:\r?\n---|$)/);
  if (journalSection) {
    const calloutRegex = /:::\s*\{\.callout-note\s+icon=false\}\s*\r?\n####\s*(.*?)\r?\n([\s\S]*?)\r?\n:::/g;
    let match;
    while ((match = calloutRegex.exec(journalSection[1])) !== null) {
      const title = match[1].trim();
      const content = match[2].trim();
      const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      let authors = "";
      let journal = "";
      let badge = "";
      let doi = "";
      for (const line of lines) {
        if (line.startsWith("`") && line.endsWith("`")) {
          badge = line.replace(/^`|`$/g, "");
        } else if (line.includes("DOI:")) {
          const doiIndex = line.indexOf("| DOI:");
          if (doiIndex >= 0) {
            journal = line.slice(0, doiIndex).trim();
            const doiSection = line.slice(doiIndex + 6).trim();
            const doiMatch = doiSection.match(/\]\((.*?)\)(?:\{target="_blank"\})?$/) || doiSection.match(/\]\((.*?)\)/);
            if (doiMatch) doi = doiMatch[1];
          } else {
            journal = line;
          }
        } else if (!authors) {
          authors = line.replace(/\s{2,}$/, "");
        } else {
          journal = line.replace(/\s{2,}$/, "");
        }
      }
      journalPapers.push({ title, authors, journal, badge, doi });
    }
  }

  const workingSection = body.match(/##\s*📝\s*工作論文\s*\(Working Papers\)\s*\r?\n([\s\S]*?)(?:\r?\n---|$)/);
  if (workingSection) {
    const calloutRegex = /:::\s*\{\.callout-warning\s+icon=false\}\s*\r?\n####\s*(.*?)\r?\n([\s\S]*?)\r?\n:::/g;
    let match;
    while ((match = calloutRegex.exec(workingSection[1])) !== null) {
      const title = match[1].trim();
      const content = match[2].trim();
      const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      let authors = "";
      let status = "";
      let badge = "";
      for (const line of lines) {
        if (line.startsWith("`") && line.endsWith("`")) {
          badge = line.replace(/^`|`$/g, "");
        } else if (!authors) {
          authors = line.replace(/\s{2,}$/, "");
        } else {
          status = line.replace(/\s{2,}$/, "");
        }
      }
      workingPapers.push({ title, authors, status, badge });
    }
  }

  const confSection = body.match(/##\s*🎤\s*研討會發表\s*\(Conference Presentations\)\s*\r?\n([\s\S]*?)$/);
  if (confSection) {
    const lines = confSection[1].split(/\r?\n/).filter((l) => l.trim().startsWith("|") && !l.includes("---") && !l.includes("年份"));
    for (const line of lines) {
      const parts = line.split("|").map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 3) {
        conferences.push({ year: parts[0], conference: parts[1], paper: parts[2] });
      }
    }
  }

  return { journalPapers, workingPapers, conferences };
}

function serializePublicationsPage(model, lineEnding = "\n") {
  const journalBlocks = (model.journalPapers || []).map((p) => {
    const lines = [
      "::: {.callout-note icon=false}",
      `#### ${p.title || ""}`,
      `${p.authors || ""}  `
    ];
    let journalLine = p.journal || "";
    if (p.doi) {
      const doiText = p.doi.replace(/^https?:\/\/(?:dx\.)?doi\.org\//, "");
      journalLine = `${journalLine} | DOI: [${doiText}](${p.doi}){target="_blank"}`;
    }
    if (journalLine) {
      lines.push(`${journalLine}  `);
    }
    if (p.badge) {
      lines.push(`\`${p.badge}\``);
    }
    lines.push(":::");
    return lines.join(lineEnding);
  });

  const workingBlocks = (model.workingPapers || []).map((p) => {
    const lines = [
      "::: {.callout-warning icon=false}",
      `#### ${p.title || ""}`,
      `${p.authors || ""}  `
    ];
    if (p.status) {
      lines.push(p.badge ? `${p.status}  ` : p.status);
    }
    if (p.badge) {
      lines.push(`\`${p.badge}\``);
    }
    lines.push(":::");
    return lines.join(lineEnding);
  });

  const confRows = [
    "| 年份 | 研討會 | 論文 |",
    "|------|--------|------|",
    ...(model.conferences || []).map((c) => `| ${c.year || ""} | ${c.conference || ""} | ${c.paper || ""} |`)
  ].join(lineEnding);

  return [
    `## 📄 期刊論文 (Journal Publications)`,
    ``,
    journalBlocks.join(`${lineEnding}${lineEnding}`),
    ``,
    `---`,
    ``,
    `## 📝 工作論文 (Working Papers)`,
    ``,
    workingBlocks.join(`${lineEnding}${lineEnding}`),
    ``,
    `---`,
    ``,
    `## 🎤 研討會發表 (Conference Presentations)`,
    ``,
    confRows
  ].join(lineEnding);
}

function parseStudentsPage(body) {
  const lines = body.split(/\r?\n/);
  let welcomeTitle = "歡迎來到指導學生專區";
  let welcomeText = "";
  const guidelines = [];
  const schedules = [];

  let section = "";
  let curGuideline = null;
  let inCallout = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith("::: {.callout-note") || trimmed.startsWith("::: callout-note")) {
      inCallout = true;
      continue;
    }
    if (inCallout) {
      if (trimmed === ":::") {
        inCallout = false;
        continue;
      }
      if (trimmed.startsWith("## ")) {
        welcomeTitle = trimmed.replace(/^##\s+/, "").trim();
      } else if (trimmed) {
        welcomeText = welcomeText ? `${welcomeText}\n${trimmed}` : trimmed;
      }
      continue;
    }

    if (trimmed.startsWith("### 📅") || trimmed.includes("進度報告排程")) {
      section = "schedules";
      curGuideline = null;
      continue;
    }

    if (section === "schedules") {
      if (trimmed.startsWith("|") && !trimmed.includes("---") && !trimmed.includes("日期")) {
        const parts = line.split("|").map((p) => p.trim()).filter(Boolean);
        if (parts.length >= 2) {
          schedules.push({
            date: parts[0] || "",
            presenter: parts[1] || "",
            topic: parts[2] || ""
          });
        }
      }
      continue;
    }

    if (trimmed.startsWith("### ")) {
      curGuideline = {
        title: trimmed.replace(/^###\s+/, "").trim(),
        content: "",
        slidesUrl: "",
        handoutUrl: "",
        youtubeUrl: ""
      };
      guidelines.push(curGuideline);
      continue;
    }

    if (curGuideline) {
      if (trimmed === "---") continue;
      
      const linkRegex = /\[(.*?)\]\((.*?)\)(?:\{[^}]*\})?/g;
      let linkMatch;
      let isOnlyLinkLine = false;
      
      if (trimmed.includes(".activity-materials-link") || (trimmed.includes("簡報下載") && trimmed.includes("講義下載"))) {
        while ((linkMatch = linkRegex.exec(trimmed)) !== null) {
          const label = linkMatch[1];
          const url = linkMatch[2];
          if (/youtube|youtu\.be|影片|video/i.test(url) || /YouTube|影片/i.test(label)) {
            curGuideline.youtubeUrl = url;
          } else if (/簡報|slide/i.test(label)) {
            curGuideline.slidesUrl = url;
          } else if (/講義|handout|範本/i.test(label)) {
            curGuideline.handoutUrl = url;
          }
        }
        isOnlyLinkLine = true;
      }

      if (!isOnlyLinkLine && (curGuideline.content || trimmed)) {
        curGuideline.content = curGuideline.content ? `${curGuideline.content}\n${line}` : line;
      }
    }
  }

  guidelines.forEach((g) => { g.content = g.content.trim(); });

  return { welcomeTitle, welcomeText, guidelines, schedules };
}

function serializeStudentsPage(model, lineEnding = "\n") {
  const parts = [];
  parts.push("::: {.callout-note}");
  parts.push(`## ${model.welcomeTitle || "歡迎來到指導學生專區"}`);
  parts.push(model.welcomeText || "");
  parts.push(":::");

  for (const g of model.guidelines || []) {
    parts.push("");
    parts.push(`### ${g.title}`);
    if (g.content) {
      parts.push(g.content);
    }
    const linkParts = [];
    if (g.slidesUrl) {
      linkParts.push(`[📊 簡報下載 ↗](${g.slidesUrl}){target="_blank" .activity-materials-link .activity-slides-link}`);
    }
    if (g.handoutUrl) {
      linkParts.push(`[📄 講義下載 ↗](${g.handoutUrl}){target="_blank" .activity-materials-link .activity-handout-link}`);
    }
    if (g.youtubeUrl) {
      linkParts.push(`[▶ YouTube 影片 ↗](${g.youtubeUrl}){target="_blank" .activity-materials-link .activity-youtube-link}`);
    }
    if (linkParts.length) {
      parts.push("");
      parts.push(linkParts.join(" "));
    }
  }

  parts.push("");
  parts.push("---");
  parts.push("");
  parts.push("### 📅 近期進度報告排程");
  parts.push("| 日期 | 報告人 | 論文研讀主題 |");
  parts.push("| :--- | :--- | :--- |");
  for (const s of model.schedules || []) {
    parts.push(`| ${s.date || ""} | ${s.presenter || ""} | ${s.topic || ""} |`);
  }

  return parts.join(lineEnding) + lineEnding;
}

function validateActivitiesForPublish() {
  for (const model of state.activityModels.values()) {
    for (const [index, event] of model.events.entries()) {
      if (!cleanActivityField(event.date) || !cleanActivityField(event.venue) || !cleanActivityField(event.topic)) {
        throw new Error(`${model.year || "活動"}的第 ${index + 1} 筆資料尚未填完整`);
      }
    }
  }
}

function protectLayoutSyntax(body) {
  const nonce = `HWCMS-LAYOUT-${crypto.randomUUID()}`;
  const locks = new Map();
  const tableModels = new Map();
  const activityModels = new Map();
  const lines = body.split(/\r?\n/);
  const sourceLineEnding = body.includes("\r\n") ? "\r\n" : "\n";
  const output = [];
  let currentYear = "";
  const pushLock = () => {
    if (output.length && output.at(-1) !== "") output.push("");
    if (!output.length || output.at(-1) !== "") output.push("");
  };
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const next = lines[index + 1] || "";
    const yearHeading = line.match(/^\s*##\s+(\d{4})\s*$/);
    if (yearHeading) {
      currentYear = yearHeading[1];
      let look = index + 1;
      while (look < lines.length && !lines[look].trim()) look += 1;
      if (look < lines.length && /^\s*:{3,}\s*\{[^}]*\.grid\b/.test(lines[look])) {
        const token = `${nonce}-${locks.size}`;
        locks.set(token, line);
        pushLock();
        continue;
      }
    }
    if (currentYear && /^\s*---\s*$/.test(line)) {
      const token = `${nonce}-${locks.size}`;
      locks.set(token, line);
      pushLock();
      continue;
    }
    if (/^\s*:{3,}\s*\{[^}]*\.grid\b[^}]*\}\s*$/.test(line)) {
      const endIndex = findFencedDivEnd(lines, index);
      if (endIndex > index) {
        const source = lines.slice(index, endIndex + 1).join(sourceLineEnding);
        const activityModel = parseActivityGrid(source, currentYear);
        if (activityModel) {
          const token = `${nonce}-${locks.size}`;
          locks.set(token, source);
          activityModels.set(token, activityModel);
          pushLock();
          index = endIndex;
          continue;
        }
      }
    }
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
      const tableModel = parseTable(source);
      tableModel.anchor = [...output].reverse().find((item) => item.trim()) || "";
      tableModels.set(token, tableModel);
      pushLock();
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
    pushLock();
  }
  return { editorBody: output.join("\n"), locks, tableModels, activityModels };
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
  if (elements.subtitleInput && elements.subtitleInput.value.trim()) {
    frontMatter = setYamlScalar(frontMatter, "subtitle", elements.subtitleInput.value.trim());
  } else {
    frontMatter = removeYamlField(frontMatter, "subtitle");
  }
  frontMatter = setYamlScalar(frontMatter, "description", elements.descriptionInput.value);
  frontMatter = setYamlScalar(frontMatter, "date", elements.dateInput.value);
  frontMatter = setYamlCategories(frontMatter, elements.categoriesInput.value);
  if (elements.draftInput) {
    const isDraft = elements.draftInput.value === "true";
    frontMatter = isDraft ? setYamlScalar(frontMatter, "draft", "true") : removeYamlField(frontMatter, "draft");
  }
  if (elements.featuredImageInput) {
    const img = elements.featuredImageInput.value.trim();
    frontMatter = img ? setYamlScalar(frontMatter, "image", img) : removeYamlField(frontMatter, "image");
  }
  if (elements.slidesUrlInput) {
    const slides = elements.slidesUrlInput.value.trim();
    frontMatter = slides ? setYamlScalar(frontMatter, "slides", slides) : removeYamlField(frontMatter, "slides");
  }
  if (elements.handoutUrlInput) {
    const handout = elements.handoutUrlInput.value.trim();
    frontMatter = handout ? setYamlScalar(frontMatter, "handout", handout) : removeYamlField(frontMatter, "handout");
  }
  if (elements.youtubeUrlInput) {
    const yt = elements.youtubeUrlInput.value.trim();
    frontMatter = yt ? setYamlScalar(frontMatter, "youtube", yt) : removeYamlField(frontMatter, "youtube");
  }
  return frontMatter;
}

function currentContent() {
  if (!state.editor) return state.originalContent;
  let body;
  if (state.currentPath === "index.md" && state.homeModel) {
    body = serializeHomePage(state.homeModel, state.lineEnding);
  } else if (state.currentPath === "about/index.md" && state.aboutModel) {
    body = serializeAboutPage(state.aboutModel, state.lineEnding);
  } else if (state.currentPath === "publications/index.md" && state.pubModel) {
    body = serializePublicationsPage(state.pubModel, state.lineEnding);
  } else if (state.currentPath === "activities/index.md") {
    body = serializeActivitiesBody(elements.activityIntroInput?.value, state.activityModels, state.lineEnding);
  } else {
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
    for (const [token, model] of state.activityModels) {
      if (model.dirty) body = body.replace(state.layoutLocks.get(token), serializeActivityGrid(model));
    }
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
  const collection = path.startsWith("knowledge/") ? "AI 知識站" : path.startsWith("lab/") ? "教學與研究" : "網站內容";
  const meta = getPostMetadata(path);
  const label = meta.title || path.split("/").at(-2) || path;
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
    },
    customHTMLRenderer: {
      image(node) {
        const rawSrc = node.destination;
        const resolved = previewAssetUrl(rawSrc);
        return {
          type: "openTag",
          tagName: "img",
          attributes: {
            src: resolved,
            alt: node.description || ""
          }
        };
      }
    }
  });
  elements.visualEditor.addEventListener("error", (event) => {
    if (event.target && event.target.tagName === "IMG") {
      const originalSrc = event.target.getAttribute("src");
      const resolved = previewAssetUrl(originalSrc);
      if (resolved && event.target.src !== resolved) {
        event.target.src = resolved;
      }
    }
  }, true);
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
  if (elements.subtitleInput) elements.subtitleInput.value = readYamlScalar(frontMatter, "subtitle") || "";
  elements.descriptionInput.value = readYamlScalar(frontMatter, "description");
  const date = readYamlScalar(frontMatter, "date");
  elements.dateInput.value = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "";
  elements.categoriesInput.value = readYamlCategories(frontMatter);
  const draftVal = readYamlScalar(frontMatter, "draft");
  const isDraft = draftVal === "true" || draftVal === true;
  if (elements.draftInput) elements.draftInput.value = isDraft ? "true" : "false";
  const imageVal = readYamlScalar(frontMatter, "image") || "";
  if (elements.featuredImageInput) elements.featuredImageInput.value = imageVal;
  const slidesVal = readYamlScalar(frontMatter, "slides") || readYamlScalar(frontMatter, "slides_url") || "";
  if (elements.slidesUrlInput) elements.slidesUrlInput.value = slidesVal;
  const handoutVal = readYamlScalar(frontMatter, "handout") || readYamlScalar(frontMatter, "handout_url") || "";
  if (elements.handoutUrlInput) elements.handoutUrlInput.value = handoutVal;
  const youtubeVal = readYamlScalar(frontMatter, "youtube") || readYamlScalar(frontMatter, "youtube_url") || "";
  if (elements.youtubeUrlInput) elements.youtubeUrlInput.value = youtubeVal;

  if (state.currentPath) {
    state.postMetadataCache[state.currentPath] = {
      title: elements.titleInput.value,
      date: elements.dateInput.value,
      categories: elements.categoriesInput.value.split(",").map((c) => c.trim()).filter(Boolean),
      desc: elements.descriptionInput.value,
      draft: isDraft,
      image: imageVal,
      slides: slidesVal,
      handout: handoutVal,
      youtube: youtubeVal
    };
  }
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
}

function createTreeItem(path) {
  const info = pageInfo(path);
  const meta = getPostMetadata(path);
  const isDraft = meta.draft === true || meta.draft === "true";
  const button = document.createElement("button");
  button.type = "button";
  button.className = `tree-item${isDraft ? " is-draft-item" : ""}`;
  button.dataset.path = path;
  button.dataset.search = `${info.label} ${path}`.toLowerCase();
  button.innerHTML = `<span class="tree-icon"></span><span class="tree-label"><strong></strong><small></small></span>`;
  button.querySelector(".tree-icon").textContent = info.icon;
  button.querySelector("strong").textContent = info.label;
  const small = button.querySelector("small");
  small.textContent = isDraft ? `${info.location} · 🟡 草稿` : info.location;
  button.addEventListener("click", () => loadFile(path));
  return button;
}

function renderTree() {
  elements.pageTree.replaceChildren();
  const contentFiles = state.files.filter((path) => /\.(md|qmd)$/i.test(path));

  // 1. 主要核心頁面（首頁、個人資訊、近期活動、學術出版、學生專區）
  const coreStaticPages = STATIC_PAGES.filter((p) => !p.path.startsWith("knowledge/") && !p.path.startsWith("lab/"));
  const coreFiles = coreStaticPages.map((p) => p.path);

  const mainSection = document.createElement("section");
  mainSection.className = "tree-group";
  const mainTitle = document.createElement("p");
  mainTitle.className = "tree-group-title";
  mainTitle.textContent = "主要頁面";
  mainSection.append(mainTitle, ...coreFiles.map(createTreeItem));
  elements.pageTree.append(mainSection);

  // 2. 專區層次管理（教學與研究 & AI 知識站）
  const sectionGroups = [
    {
      id: "lab",
      indexPath: "lab/index.md",
      label: "教學與研究",
      icon: "研",
      subtitle: "專區文章管理",
      posts: contentFiles.filter((p) => /^lab\/posts\//.test(p)).sort().reverse()
    },
    {
      id: "knowledge",
      indexPath: "knowledge/index.md",
      label: "AI 知識站",
      icon: "知",
      subtitle: "專區文章管理",
      posts: contentFiles.filter((p) => /^knowledge\/posts\//.test(p)).sort().reverse()
    }
  ];

  for (const group of sectionGroups) {
    const folder = document.createElement("div");
    const isOpen = state.expandedFolders.has(group.id) || (state.currentPath && state.currentPath.startsWith(group.id + "/"));
    folder.className = `tree-folder${isOpen ? " open" : ""}`;
    folder.dataset.folder = group.id;

    const header = document.createElement("div");
    header.className = `tree-folder-header${state.currentPath === group.indexPath ? " active" : ""}`;
    header.dataset.path = group.indexPath;
    header.dataset.search = `${group.label} ${group.indexPath}`.toLowerCase();

    const icon = document.createElement("span");
    icon.className = "tree-icon";
    icon.textContent = group.icon;

    const titleBox = document.createElement("div");
    titleBox.className = "tree-folder-title";
    titleBox.innerHTML = `<strong>${escapeHtml(group.label)}</strong><small>${escapeHtml(group.subtitle)}</small>`;
    titleBox.onclick = (e) => {
      e.stopPropagation();
      loadFile(group.indexPath);
    };
    icon.onclick = (e) => {
      e.stopPropagation();
      loadFile(group.indexPath);
    };

    const badge = document.createElement("span");
    badge.className = "tree-folder-badge";
    badge.textContent = `${group.posts.length} 篇`;

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "tree-folder-toggle";
    toggle.title = "展開/收合文章列表";
    toggle.textContent = "▶";
    toggle.onclick = (e) => {
      e.stopPropagation();
      if (state.expandedFolders.has(group.id)) {
        state.expandedFolders.delete(group.id);
        folder.classList.remove("open");
      } else {
        state.expandedFolders.add(group.id);
        folder.classList.add("open");
      }
    };

    header.append(icon, titleBox, badge, toggle);

    const children = document.createElement("div");
    children.className = "tree-folder-children";
    children.append(...group.posts.map(createTreeItem));

    folder.append(header, children);
    elements.pageTree.append(folder);
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

function markStructuredModelDirty(model) {
  model.dirty = true;
  state.draftSaved = false;
  scheduleDocumentUpdate();
}

function createActivityField(labelText, value, onChange, placeholder = "", inputType = "text") {
  const label = document.createElement("label");
  const caption = document.createElement("span");
  caption.textContent = labelText;
  const input = document.createElement("input");
  input.type = inputType;
  input.value = value || "";
  if (placeholder) input.placeholder = placeholder;
  input.addEventListener("input", () => onChange(input.value));
  label.append(caption, input);
  return label;
}

function renderHomeEditors() {
  if (!state.homeModel) return;
  elements.homeBioInput.value = state.homeModel.bio || "";
  elements.homeMottoInput.value = state.homeModel.motto || "";

  elements.homeBioInput.oninput = () => {
    state.homeModel.bio = elements.homeBioInput.value;
    state.homeDirty = true;
    state.draftSaved = false;
    scheduleDocumentUpdate();
  };

  elements.homeMottoInput.oninput = () => {
    state.homeModel.motto = elements.homeMottoInput.value;
    state.homeDirty = true;
    state.draftSaved = false;
    scheduleDocumentUpdate();
  };

  elements.researchAreaList.replaceChildren();
  (state.homeModel.researchAreas || []).forEach((area, index) => {
    const card = document.createElement("div");
    card.className = "structured-row-card";

    const top = document.createElement("div");
    top.className = "structured-card-top";
    const title = document.createElement("strong");
    title.textContent = `領域 ${index + 1}：${area.title || "未命名"}`;
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "remove-btn";
    removeBtn.textContent = "刪除";
    removeBtn.onclick = () => {
      state.homeModel.researchAreas.splice(index, 1);
      state.homeDirty = true;
      state.draftSaved = false;
      renderHomeEditors();
      scheduleDocumentUpdate();
    };
    top.append(title, removeBtn);

    const grid = document.createElement("div");
    grid.className = "structured-card-grid cols-3";

    const iconField = document.createElement("div");
    iconField.className = "structured-field";
    iconField.innerHTML = `<label>圖示 (Bootstrap Icon)</label>`;
    const iconInput = document.createElement("input");
    iconInput.type = "text";
    iconInput.value = area.icon || "bi bi-cpu";
    iconInput.oninput = () => {
      area.icon = iconInput.value;
      state.homeDirty = true;
      state.draftSaved = false;
      scheduleDocumentUpdate();
    };
    iconField.append(iconInput);

    const titleField = document.createElement("div");
    titleField.className = "structured-field";
    titleField.innerHTML = `<label>領域名稱 (Title)</label>`;
    const titleInput = document.createElement("input");
    titleInput.type = "text";
    titleInput.value = area.title || "";
    titleInput.oninput = () => {
      area.title = titleInput.value;
      title.textContent = `領域 ${index + 1}：${area.title || "未命名"}`;
      state.homeDirty = true;
      state.draftSaved = false;
      scheduleDocumentUpdate();
    };
    titleField.append(titleInput);

    const descField = document.createElement("div");
    descField.className = "structured-field";
    descField.innerHTML = `<label>英文說明 (Description)</label>`;
    const descInput = document.createElement("input");
    descInput.type = "text";
    descInput.value = area.desc || "";
    descInput.oninput = () => {
      area.desc = descInput.value;
      state.homeDirty = true;
      state.draftSaved = false;
      scheduleDocumentUpdate();
    };
    descField.append(descInput);

    grid.append(iconField, titleField, descField);
    card.append(top, grid);
    elements.researchAreaList.append(card);
  });

  elements.addResearchAreaButton.onclick = () => {
    state.homeModel.researchAreas.push({ icon: "bi bi-cpu", title: "新領域", desc: "Description" });
    state.homeDirty = true;
    state.draftSaved = false;
    renderHomeEditors();
    scheduleDocumentUpdate();
  };

  if (elements.teachingCourseList) {
    elements.teachingCourseList.replaceChildren();
    (state.homeModel.courses || []).forEach((c, index) => {
      const card = document.createElement("div");
      card.className = "structured-row-card";

      const top = document.createElement("div");
      top.className = "structured-card-top";
      const title = document.createElement("strong");
      title.textContent = `課程 ${index + 1}：${c.name || "未命名課程"}`;
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "remove-btn";
      removeBtn.textContent = "刪除";
      removeBtn.onclick = () => {
        state.homeModel.courses.splice(index, 1);
        state.homeDirty = true;
        state.draftSaved = false;
        renderHomeEditors();
        scheduleDocumentUpdate();
      };
      top.append(title, removeBtn);

      const grid = document.createElement("div");
      grid.className = "structured-card-grid";
      grid.style.gridTemplateColumns = "1fr 1fr";

      const nameField = document.createElement("div");
      nameField.className = "structured-field";
      nameField.innerHTML = `<label>課程名稱 (Course Name)</label>`;
      const nameInput = document.createElement("input");
      nameInput.type = "text";
      nameInput.value = c.name || "";
      nameInput.placeholder = "例如：會計人工智慧與大數據分析";
      nameInput.oninput = () => {
        c.name = nameInput.value;
        title.textContent = `課程 ${index + 1}：${c.name || "未命名課程"}`;
        state.homeDirty = true;
        state.draftSaved = false;
        scheduleDocumentUpdate();
      };
      nameField.append(nameInput);

      const timeField = document.createElement("div");
      timeField.className = "structured-field";
      timeField.innerHTML = `<label>學期與時間 (Semester & Time)</label>`;
      const timeInput = document.createElement("input");
      timeInput.type = "text";
      timeInput.value = c.time || "";
      timeInput.placeholder = "例如：114-1 學期 · 週四 09:10-12:00";
      timeInput.oninput = () => {
        c.time = timeInput.value;
        state.homeDirty = true;
        state.draftSaved = false;
        scheduleDocumentUpdate();
      };
      timeField.append(timeInput);

      const syllabusField = document.createElement("div");
      syllabusField.className = "structured-field";
      syllabusField.style.gridColumn = "1 / -1";
      syllabusField.innerHTML = `<label>📄 授課大綱連結 (Syllabus URL)</label>`;
      const syllabusInput = document.createElement("input");
      syllabusInput.type = "url";
      syllabusInput.value = c.syllabusUrl || "";
      syllabusInput.placeholder = "例如：https://drive.google.com/... 或校務系統大綱網址";
      syllabusInput.oninput = () => {
        c.syllabusUrl = syllabusInput.value;
        state.homeDirty = true;
        state.draftSaved = false;
        scheduleDocumentUpdate();
      };
      syllabusField.append(syllabusInput);

      const descField = document.createElement("div");
      descField.className = "structured-field";
      descField.style.gridColumn = "1 / -1";
      descField.innerHTML = `<label>課程簡述 / 教室說明 (Description / Classroom)</label>`;
      const descInput = document.createElement("input");
      descInput.type = "text";
      descInput.value = c.desc || "";
      descInput.placeholder = "例如：介紹機器學習在財務分析中的實務應用，上課地點：商學院 3F02 教室";
      descInput.oninput = () => {
        c.desc = descInput.value;
        state.homeDirty = true;
        state.draftSaved = false;
        scheduleDocumentUpdate();
      };
      descField.append(descInput);

      grid.append(nameField, timeField, syllabusField, descField);
      card.append(top, grid);
      elements.teachingCourseList.append(card);
    });

    if (elements.addTeachingCourseButton) {
      elements.addTeachingCourseButton.onclick = () => {
        state.homeModel.courses = state.homeModel.courses || [];
        state.homeModel.courses.push({
          name: "新開授課程",
          time: "114-1 學期 · 週四 09:10-12:00",
          syllabusUrl: "",
          desc: "課程簡介與教學實務說明"
        });
        state.homeDirty = true;
        state.draftSaved = false;
        renderHomeEditors();
        scheduleDocumentUpdate();
      };
    }
  }

  if (elements.teachingEvaluationList) {
    elements.teachingEvaluationList.replaceChildren();
    (state.homeModel.evaluations || []).forEach((e, index) => {
      const card = document.createElement("div");
      card.className = "structured-row-card";

      const top = document.createElement("div");
      top.className = "structured-card-top";
      const title = document.createElement("strong");
      title.textContent = `評價 ${index + 1}：${e.course || "課程評價"}`;
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "remove-btn";
      removeBtn.textContent = "刪除";
      removeBtn.onclick = () => {
        state.homeModel.evaluations.splice(index, 1);
        state.homeDirty = true;
        state.draftSaved = false;
        renderHomeEditors();
        scheduleDocumentUpdate();
      };
      top.append(title, removeBtn);

      const grid = document.createElement("div");
      grid.className = "structured-card-grid";
      grid.style.gridTemplateColumns = "1fr 1fr";

      const courseField = document.createElement("div");
      courseField.className = "structured-field";
      courseField.innerHTML = `<label>課程名稱與學期 (Course & Semester)</label>`;
      const courseInput = document.createElement("input");
      courseInput.type = "text";
      courseInput.value = e.course || "";
      courseInput.placeholder = "例如：會計資訊系統 (113-2)";
      courseInput.oninput = () => {
        e.course = courseInput.value;
        title.textContent = `評價 ${index + 1}：${e.course || "課程評價"}`;
        state.homeDirty = true;
        state.draftSaved = false;
        scheduleDocumentUpdate();
      };
      courseField.append(courseInput);

      const scoreField = document.createElement("div");
      scoreField.className = "structured-field";
      scoreField.innerHTML = `<label>評鑑得分 / 亮點徽章 (Rating / Badge)</label>`;
      const scoreInput = document.createElement("input");
      scoreInput.type = "text";
      scoreInput.value = e.score || "";
      scoreInput.placeholder = "例如：⭐ 教學評鑑 4.9 / 5.0 或 特優教學";
      scoreInput.oninput = () => {
        e.score = scoreInput.value;
        state.homeDirty = true;
        state.draftSaved = false;
        scheduleDocumentUpdate();
      };
      scoreField.append(scoreInput);

      const feedbackField = document.createElement("div");
      feedbackField.className = "structured-field";
      feedbackField.style.gridColumn = "1 / -1";
      feedbackField.innerHTML = `<label>學生評價回饋內文 (Student Feedback Quote)</label>`;
      const feedbackInput = document.createElement("textarea");
      feedbackInput.rows = 2;
      feedbackInput.value = e.feedback || "";
      feedbackInput.placeholder = "例如：老師用生動實務案例帶我們手把手寫 AI 工具，收穫非常多！";
      feedbackInput.oninput = () => {
        e.feedback = feedbackInput.value;
        state.homeDirty = true;
        state.draftSaved = false;
        scheduleDocumentUpdate();
      };
      feedbackField.append(feedbackInput);

      const sourceField = document.createElement("div");
      sourceField.className = "structured-field";
      sourceField.style.gridColumn = "1 / -1";
      sourceField.innerHTML = `<label>來源備註 (Source Note)</label>`;
      const sourceInput = document.createElement("input");
      sourceInput.type = "text";
      sourceInput.value = e.source || "";
      sourceInput.placeholder = "例如：— 國立臺北大學會計系 學生修課回饋";
      sourceInput.oninput = () => {
        e.source = sourceInput.value;
        state.homeDirty = true;
        state.draftSaved = false;
        scheduleDocumentUpdate();
      };
      sourceField.append(sourceInput);

      grid.append(courseField, scoreField, feedbackField, sourceField);
      card.append(top, grid);
      elements.teachingEvaluationList.append(card);
    });

    if (elements.addTeachingEvaluationButton) {
      elements.addTeachingEvaluationButton.onclick = () => {
        state.homeModel.evaluations = state.homeModel.evaluations || [];
        state.homeModel.evaluations.push({
          course: "會計資訊系統",
          score: "⭐ 教學評鑑 4.9 / 5.0",
          feedback: "課程內容充實且緊跟科技趨勢，收穫良多！",
          source: "— 國立臺北大學會計系 學生修課回饋"
        });
        state.homeDirty = true;
        state.draftSaved = false;
        renderHomeEditors();
        scheduleDocumentUpdate();
      };
    }
  }

  elements.highlightList.replaceChildren();
  (state.homeModel.highlights || []).forEach((h, index) => {
    const card = document.createElement("div");
    card.className = "structured-row-card";

    const top = document.createElement("div");
    top.className = "structured-card-top";
    const title = document.createElement("strong");
    title.textContent = `動態 ${index + 1}：${h.date || ""}`;
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "remove-btn";
    removeBtn.textContent = "刪除";
    removeBtn.onclick = () => {
      state.homeModel.highlights.splice(index, 1);
      state.homeDirty = true;
      state.draftSaved = false;
      renderHomeEditors();
      scheduleDocumentUpdate();
    };
    top.append(title, removeBtn);

    const grid = document.createElement("div");
    grid.className = "structured-card-grid";
    grid.style.gridTemplateColumns = "160px 1fr";

    const dateField = document.createElement("div");
    dateField.className = "structured-field";
    dateField.innerHTML = `<label>日期 (例如 2026/07)</label>`;
    const dateInput = document.createElement("input");
    dateInput.type = "text";
    dateInput.value = h.date || "";
    dateInput.oninput = () => {
      h.date = dateInput.value;
      title.textContent = `動態 ${index + 1}：${h.date || ""}`;
      state.homeDirty = true;
      state.draftSaved = false;
      scheduleDocumentUpdate();
    };
    dateField.append(dateInput);

    const eventField = document.createElement("div");
    eventField.className = "structured-field";
    eventField.innerHTML = `<label>事件說明 (支援 HTML 與圖示)</label>`;
    const eventInput = document.createElement("input");
    eventInput.type = "text";
    eventInput.value = h.event || "";
    eventInput.oninput = () => {
      h.event = eventInput.value;
      state.homeDirty = true;
      state.draftSaved = false;
      scheduleDocumentUpdate();
    };
    eventField.append(eventInput);

    grid.append(dateField, eventField);
    card.append(top, grid);
    elements.highlightList.append(card);
  });

  elements.addHighlightButton.onclick = () => {
    state.homeModel.highlights.unshift({ date: new Date().toISOString().slice(0, 7).replace("-", "/"), event: "最新動態內容" });
    state.homeDirty = true;
    state.draftSaved = false;
    renderHomeEditors();
    scheduleDocumentUpdate();
  };
}

function renderAboutEditors() {
  if (!state.aboutModel) return;
  elements.aboutNameInput.value = state.aboutModel.calloutTitle || "";
  elements.aboutTitleInput.value = state.aboutModel.calloutSubtitle || "";

  elements.aboutNameInput.oninput = () => {
    state.aboutModel.calloutTitle = elements.aboutNameInput.value;
    state.aboutDirty = true;
    state.draftSaved = false;
    scheduleDocumentUpdate();
  };

  elements.aboutTitleInput.oninput = () => {
    state.aboutModel.calloutSubtitle = elements.aboutTitleInput.value;
    state.aboutDirty = true;
    state.draftSaved = false;
    scheduleDocumentUpdate();
  };

  // Education list
  elements.educationList.replaceChildren();
  (state.aboutModel.education || []).forEach((edu, index) => {
    const card = document.createElement("div");
    card.className = "structured-row-card";

    const top = document.createElement("div");
    top.className = "structured-card-top";
    const title = document.createElement("strong");
    title.textContent = `學歷 ${index + 1}：${edu.degree || "未命名"}`;
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "remove-btn";
    removeBtn.textContent = "刪除";
    removeBtn.onclick = () => {
      state.aboutModel.education.splice(index, 1);
      state.aboutDirty = true;
      state.draftSaved = false;
      renderAboutEditors();
      scheduleDocumentUpdate();
    };
    top.append(title, removeBtn);

    const grid = document.createElement("div");
    grid.className = "structured-card-grid";

    const degreeField = document.createElement("div");
    degreeField.className = "structured-field";
    degreeField.innerHTML = `<label>學位 (例如 Ph.D. in Accounting)</label>`;
    const degreeInput = document.createElement("input");
    degreeInput.type = "text";
    degreeInput.value = edu.degree || "";
    degreeInput.oninput = () => {
      edu.degree = degreeInput.value;
      title.textContent = `學歷 ${index + 1}：${edu.degree || "未命名"}`;
      state.aboutDirty = true;
      state.draftSaved = false;
      scheduleDocumentUpdate();
    };
    degreeField.append(degreeInput);

    const schoolField = document.createElement("div");
    schoolField.className = "structured-field";
    schoolField.innerHTML = `<label>學校單位 (例如 國立臺灣大學)</label>`;
    const schoolInput = document.createElement("input");
    schoolInput.type = "text";
    schoolInput.value = edu.school || "";
    schoolInput.oninput = () => {
      edu.school = schoolInput.value;
      state.aboutDirty = true;
      state.draftSaved = false;
      scheduleDocumentUpdate();
    };
    schoolField.append(schoolInput);

    const detailField = document.createElement("div");
    detailField.className = "structured-field";
    detailField.innerHTML = `<label>學院／備註 (選填)</label>`;
    const detailInput = document.createElement("input");
    detailInput.type = "text";
    detailInput.value = edu.detail || "";
    detailInput.oninput = () => {
      edu.detail = detailInput.value;
      state.aboutDirty = true;
      state.draftSaved = false;
      scheduleDocumentUpdate();
    };
    detailField.append(detailInput);

    const periodField = document.createElement("div");
    periodField.className = "structured-field";
    periodField.innerHTML = `<label>期間 (例如 Sep 2019 – June 2024)</label>`;
    const periodInput = document.createElement("input");
    periodInput.type = "text";
    periodInput.value = edu.period || "";
    periodInput.oninput = () => {
      edu.period = periodInput.value;
      state.aboutDirty = true;
      state.draftSaved = false;
      scheduleDocumentUpdate();
    };
    periodField.append(periodInput);

    const urlField = document.createElement("div");
    urlField.className = "structured-field";
    urlField.style.gridColumn = "1 / -1";
    urlField.innerHTML = `<label>論文連結網址 (選填，例如 Dissertation URL)</label>`;
    const urlInput = document.createElement("input");
    urlInput.type = "text";
    urlInput.value = edu.linkUrl || "";
    urlInput.placeholder = "https://...";
    urlInput.oninput = () => {
      edu.linkUrl = urlInput.value;
      edu.linkText = edu.linkUrl ? (edu.linkText || "📄 Dissertation") : "";
      state.aboutDirty = true;
      state.draftSaved = false;
      scheduleDocumentUpdate();
    };
    urlField.append(urlInput);

    grid.append(degreeField, schoolField, detailField, periodField, urlField);
    card.append(top, grid);
    elements.educationList.append(card);
  });

  elements.addEducationButton.onclick = () => {
    state.aboutModel.education.push({ degree: "新學位", school: "學校名稱", detail: "", period: "年份", linkText: "📄 Dissertation", linkUrl: "" });
    state.aboutDirty = true;
    state.draftSaved = false;
    renderAboutEditors();
    scheduleDocumentUpdate();
  };

  // Experience list
  elements.experienceList.replaceChildren();
  (state.aboutModel.experience || []).forEach((exp, index) => {
    const card = document.createElement("div");
    card.className = "structured-row-card";

    const top = document.createElement("div");
    top.className = "structured-card-top";
    const title = document.createElement("strong");
    title.textContent = `經歷 ${index + 1}：${exp.title || ""}`;
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "remove-btn";
    removeBtn.textContent = "刪除";
    removeBtn.onclick = () => {
      state.aboutModel.experience.splice(index, 1);
      state.aboutDirty = true;
      state.draftSaved = false;
      renderAboutEditors();
      scheduleDocumentUpdate();
    };
    top.append(title, removeBtn);

    const grid = document.createElement("div");
    grid.className = "structured-card-grid cols-3";

    const periodField = document.createElement("div");
    periodField.className = "structured-field";
    periodField.innerHTML = `<label>期間</label>`;
    const periodInput = document.createElement("input");
    periodInput.type = "text";
    periodInput.value = exp.period || "";
    periodInput.oninput = () => {
      exp.period = periodInput.value;
      state.aboutDirty = true;
      state.draftSaved = false;
      scheduleDocumentUpdate();
    };
    periodField.append(periodInput);

    const titleField = document.createElement("div");
    titleField.className = "structured-field";
    titleField.innerHTML = `<label>職稱</label>`;
    const titleInput = document.createElement("input");
    titleInput.type = "text";
    titleInput.value = exp.title || "";
    titleInput.oninput = () => {
      exp.title = titleInput.value;
      title.textContent = `經歷 ${index + 1}：${exp.title || ""}`;
      state.aboutDirty = true;
      state.draftSaved = false;
      scheduleDocumentUpdate();
    };
    titleField.append(titleInput);

    const instField = document.createElement("div");
    instField.className = "structured-field";
    instField.innerHTML = `<label>服務機構／單位</label>`;
    const instInput = document.createElement("input");
    instInput.type = "text";
    instInput.value = exp.institution || "";
    instInput.oninput = () => {
      exp.institution = instInput.value;
      state.aboutDirty = true;
      state.draftSaved = false;
      scheduleDocumentUpdate();
    };
    instField.append(instInput);

    grid.append(periodField, titleField, instField);
    card.append(top, grid);
    elements.experienceList.append(card);
  });

  elements.addExperienceButton.onclick = () => {
    state.aboutModel.experience.unshift({ period: "2026 – 迄今", title: "新職稱", institution: "新單位" });
    state.aboutDirty = true;
    state.draftSaved = false;
    renderAboutEditors();
    scheduleDocumentUpdate();
  };

  // Honors list
  elements.honorsList.replaceChildren();
  (state.aboutModel.honors || []).forEach((h, index) => {
    const card = document.createElement("div");
    card.className = "structured-row-card";
    card.style.gridTemplateColumns = "1fr auto";
    card.style.alignItems = "center";

    const input = document.createElement("input");
    input.type = "text";
    input.value = h;
    input.className = "custom-textarea";
    input.style.minHeight = "36px";
    input.oninput = () => {
      state.aboutModel.honors[index] = input.value;
      state.aboutDirty = true;
      state.draftSaved = false;
      scheduleDocumentUpdate();
    };

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "remove-btn";
    removeBtn.textContent = "刪除";
    removeBtn.onclick = () => {
      state.aboutModel.honors.splice(index, 1);
      state.aboutDirty = true;
      state.draftSaved = false;
      renderAboutEditors();
      scheduleDocumentUpdate();
    };

    card.append(input, removeBtn);
    elements.honorsList.append(card);
  });

  elements.addHonorButton.onclick = () => {
    state.aboutModel.honors.unshift("**新榮譽獎項** — 說明");
    state.aboutDirty = true;
    state.draftSaved = false;
    renderAboutEditors();
    scheduleDocumentUpdate();
  };

  // Services list
  elements.servicesList.replaceChildren();
  (state.aboutModel.services || []).forEach((s, index) => {
    const card = document.createElement("div");
    card.className = "structured-row-card";
    card.style.gridTemplateColumns = "1fr auto";
    card.style.alignItems = "center";

    const input = document.createElement("input");
    input.type = "text";
    input.value = s;
    input.className = "custom-textarea";
    input.style.minHeight = "36px";
    input.oninput = () => {
      state.aboutModel.services[index] = input.value;
      state.aboutDirty = true;
      state.draftSaved = false;
      scheduleDocumentUpdate();
    };

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "remove-btn";
    removeBtn.textContent = "刪除";
    removeBtn.onclick = () => {
      state.aboutModel.services.splice(index, 1);
      state.aboutDirty = true;
      state.draftSaved = false;
      renderAboutEditors();
      scheduleDocumentUpdate();
    };

    card.append(input, removeBtn);
    elements.servicesList.append(card);
  });

  elements.addServiceButton.onclick = () => {
    state.aboutModel.services.unshift("**新服務項目** — 說明");
    state.aboutDirty = true;
    state.draftSaved = false;
    renderAboutEditors();
    scheduleDocumentUpdate();
  };
}

function renderPublicationsEditors() {
  if (!state.pubModel) return;

  // Journal papers
  elements.journalPaperList.replaceChildren();
  (state.pubModel.journalPapers || []).forEach((p, index) => {
    const card = document.createElement("div");
    card.className = "structured-row-card";

    const top = document.createElement("div");
    top.className = "structured-card-top";
    const title = document.createElement("strong");
    title.textContent = `期刊論文 ${index + 1}：${p.title || "未命名"}`;
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "remove-btn";
    removeBtn.textContent = "刪除";
    removeBtn.onclick = () => {
      state.pubModel.journalPapers.splice(index, 1);
      state.pubDirty = true;
      state.draftSaved = false;
      renderPublicationsEditors();
      scheduleDocumentUpdate();
    };
    top.append(title, removeBtn);

    const grid = document.createElement("div");
    grid.className = "structured-card-grid";

    const titleField = document.createElement("div");
    titleField.className = "structured-field";
    titleField.style.gridColumn = "1 / -1";
    titleField.innerHTML = `<label>論文篇名 (Title)</label>`;
    const titleInput = document.createElement("input");
    titleInput.type = "text";
    titleInput.value = p.title || "";
    titleInput.oninput = () => {
      p.title = titleInput.value;
      title.textContent = `期刊論文 ${index + 1}：${p.title || "未命名"}`;
      state.pubDirty = true;
      state.draftSaved = false;
      scheduleDocumentUpdate();
    };
    titleField.append(titleInput);

    const authField = document.createElement("div");
    authField.className = "structured-field";
    authField.innerHTML = `<label>作者群與年份 (Authors & Year)</label>`;
    const authInput = document.createElement("input");
    authInput.type = "text";
    authInput.value = p.authors || "";
    authInput.oninput = () => {
      p.authors = authInput.value;
      state.pubDirty = true;
      state.draftSaved = false;
      scheduleDocumentUpdate();
    };
    authField.append(authInput);

    const journalField = document.createElement("div");
    journalField.className = "structured-field";
    journalField.innerHTML = `<label>期刊名稱、卷期與頁碼 (Journal & Volume)</label>`;
    const journalInput = document.createElement("input");
    journalInput.type = "text";
    journalInput.value = p.journal || "";
    journalInput.oninput = () => {
      p.journal = journalInput.value;
      state.pubDirty = true;
      state.draftSaved = false;
      scheduleDocumentUpdate();
    };
    journalField.append(journalInput);

    const badgeField = document.createElement("div");
    badgeField.className = "structured-field";
    badgeField.innerHTML = `<label>評級／指標 (例如 SSCI IF 1.1 · 國科會 B級)</label>`;
    const badgeInput = document.createElement("input");
    badgeInput.type = "text";
    badgeInput.value = p.badge || "";
    badgeInput.oninput = () => {
      p.badge = badgeInput.value;
      state.pubDirty = true;
      state.draftSaved = false;
      scheduleDocumentUpdate();
    };
    badgeField.append(badgeInput);

    const doiField = document.createElement("div");
    doiField.className = "structured-field";
    doiField.innerHTML = `<label>DOI 網址 (選填，例如 http://dx.doi.org/...)</label>`;
    const doiInput = document.createElement("input");
    doiInput.type = "text";
    doiInput.value = p.doi || "";
    doiInput.oninput = () => {
      p.doi = doiInput.value;
      state.pubDirty = true;
      state.draftSaved = false;
      scheduleDocumentUpdate();
    };
    doiField.append(doiInput);

    grid.append(titleField, authField, journalField, badgeField, doiField);
    card.append(top, grid);
    elements.journalPaperList.append(card);
  });

  elements.addJournalPaperButton.onclick = () => {
    state.pubModel.journalPapers.unshift({ title: "新論文篇名", authors: "張修瑋 * (2026)", journal: "期刊名稱", badge: "Accepted | Forthcoming", doi: "" });
    state.pubDirty = true;
    state.draftSaved = false;
    renderPublicationsEditors();
    scheduleDocumentUpdate();
  };

  // Working papers
  elements.workingPaperList.replaceChildren();
  (state.pubModel.workingPapers || []).forEach((wp, index) => {
    const card = document.createElement("div");
    card.className = "structured-row-card";

    const top = document.createElement("div");
    top.className = "structured-card-top";
    const title = document.createElement("strong");
    title.textContent = `工作論文 ${index + 1}：${wp.title || "未命名"}`;
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "remove-btn";
    removeBtn.textContent = "刪除";
    removeBtn.onclick = () => {
      state.pubModel.workingPapers.splice(index, 1);
      state.pubDirty = true;
      state.draftSaved = false;
      renderPublicationsEditors();
      scheduleDocumentUpdate();
    };
    top.append(title, removeBtn);

    const grid = document.createElement("div");
    grid.className = "structured-card-grid";

    const titleField = document.createElement("div");
    titleField.className = "structured-field";
    titleField.style.gridColumn = "1 / -1";
    titleField.innerHTML = `<label>論文篇名 (Title)</label>`;
    const titleInput = document.createElement("input");
    titleInput.type = "text";
    titleInput.value = wp.title || "";
    titleInput.oninput = () => {
      wp.title = titleInput.value;
      title.textContent = `工作論文 ${index + 1}：${wp.title || "未命名"}`;
      state.pubDirty = true;
      state.draftSaved = false;
      scheduleDocumentUpdate();
    };
    titleField.append(titleInput);

    const authField = document.createElement("div");
    authField.className = "structured-field";
    authField.innerHTML = `<label>作者群與年份 (Authors)</label>`;
    const authInput = document.createElement("input");
    authInput.type = "text";
    authInput.value = wp.authors || "";
    authInput.oninput = () => {
      wp.authors = authInput.value;
      state.pubDirty = true;
      state.draftSaved = false;
      scheduleDocumentUpdate();
    };
    authField.append(authInput);

    const statusField = document.createElement("div");
    statusField.className = "structured-field";
    statusField.innerHTML = `<label>審查狀態／出處 (Status)</label>`;
    const statusInput = document.createElement("input");
    statusInput.type = "text";
    statusInput.value = wp.status || "";
    statusInput.oninput = () => {
      wp.status = statusInput.value;
      state.pubDirty = true;
      state.draftSaved = false;
      scheduleDocumentUpdate();
    };
    statusField.append(statusInput);

    const badgeField = document.createElement("div");
    badgeField.className = "structured-field";
    badgeField.style.gridColumn = "1 / -1";
    badgeField.innerHTML = `<label>獲獎紀錄 (選填，例如 🏆 2025 年會最佳論文獎)</label>`;
    const badgeInput = document.createElement("input");
    badgeInput.type = "text";
    badgeInput.value = wp.badge || "";
    badgeInput.oninput = () => {
      wp.badge = badgeInput.value;
      state.pubDirty = true;
      state.draftSaved = false;
      scheduleDocumentUpdate();
    };
    badgeField.append(badgeInput);

    grid.append(titleField, authField, statusField, badgeField);
    card.append(top, grid);
    elements.workingPaperList.append(card);
  });

  elements.addWorkingPaperButton.onclick = () => {
    state.pubModel.workingPapers.unshift({ title: "新工作論文篇名", authors: "張修瑋 *", status: "Under Review", badge: "" });
    state.pubDirty = true;
    state.draftSaved = false;
    renderPublicationsEditors();
    scheduleDocumentUpdate();
  };

  // Conferences
  elements.conferenceList.replaceChildren();
  (state.pubModel.conferences || []).forEach((c, index) => {
    const card = document.createElement("div");
    card.className = "structured-row-card";

    const top = document.createElement("div");
    top.className = "structured-card-top";
    const title = document.createElement("strong");
    title.textContent = `研討會 ${index + 1}：${c.year || ""}`;
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "remove-btn";
    removeBtn.textContent = "刪除";
    removeBtn.onclick = () => {
      state.pubModel.conferences.splice(index, 1);
      state.pubDirty = true;
      state.draftSaved = false;
      renderPublicationsEditors();
      scheduleDocumentUpdate();
    };
    top.append(title, removeBtn);

    const grid = document.createElement("div");
    grid.className = "structured-card-grid cols-3";

    const yearField = document.createElement("div");
    yearField.className = "structured-field";
    yearField.innerHTML = `<label>年份</label>`;
    const yearInput = document.createElement("input");
    yearInput.type = "text";
    yearInput.value = c.year || "";
    yearInput.oninput = () => {
      c.year = yearInput.value;
      title.textContent = `研討會 ${index + 1}：${c.year || ""}`;
      state.pubDirty = true;
      state.draftSaved = false;
      scheduleDocumentUpdate();
    };
    yearField.append(yearInput);

    const confField = document.createElement("div");
    confField.className = "structured-field";
    confField.innerHTML = `<label>研討會名稱</label>`;
    const confInput = document.createElement("input");
    confInput.type = "text";
    confInput.value = c.conference || "";
    confInput.oninput = () => {
      c.conference = confInput.value;
      state.pubDirty = true;
      state.draftSaved = false;
      scheduleDocumentUpdate();
    };
    confField.append(confInput);

    const paperField = document.createElement("div");
    paperField.className = "structured-field";
    paperField.innerHTML = `<label>發表論文篇名</label>`;
    const paperInput = document.createElement("input");
    paperInput.type = "text";
    paperInput.value = c.paper || "";
    paperInput.oninput = () => {
      c.paper = paperInput.value;
      state.pubDirty = true;
      state.draftSaved = false;
      scheduleDocumentUpdate();
    };
    paperField.append(paperInput);

    grid.append(yearField, confField, paperField);
    card.append(top, grid);
    elements.conferenceList.append(card);
  });

  elements.addConferenceButton.onclick = () => {
    state.pubModel.conferences.unshift({ year: String(new Date().getFullYear()), conference: "研討會名稱", paper: "論文篇名" });
    state.pubDirty = true;
    state.draftSaved = false;
    renderPublicationsEditors();
    scheduleDocumentUpdate();
  };
}

function serializeSectionHub(frontMatter, intro, lineEnding = "\n") {
  const normalizedFm = frontMatter ? frontMatter.replace(/\r\n/g, "\n").trim() : "";
  const normalizedIntro = intro ? intro.replace(/\r\n/g, "\n").trim() : "";
  if (normalizedFm) {
    return `---${lineEnding}${normalizedFm}${lineEnding}---${lineEnding}${lineEnding}${normalizedIntro}${lineEnding}`;
  }
  return `${normalizedIntro}${lineEnding}`;
}

async function deletePost(postPath) {
  if (!postPath || (!postPath.startsWith("knowledge/posts/") && !postPath.startsWith("lab/posts/"))) {
    log("此頁面為固定結構頁面，無法刪除", "error");
    return;
  }
  const meta = getPostMetadata(postPath);
  const title = meta.title || postPath;
  if (!window.confirm(`確定要永久刪除文章「${title}」嗎？\n路徑：${postPath}\n\n此動作將會從網站發布中刪除此文章檔案及其所有附屬圖片。`)) {
    return;
  }

  const postDir = postPath.replace(/\/index\.(?:md|qmd)$/i, "");
  const isLab = postPath.startsWith("lab/");
  const fallbackPath = isLab ? "lab/index.md" : "knowledge/index.md";

  const isLocalDraft = state.newDocument && (state.currentPath === postPath);

  try {
    if (state.connected && !isLocalDraft) {
      const filesToDelete = state.files
        .filter((f) => f.startsWith(postDir + "/") || f === postPath)
        .map((f) => ({ path: f, operation: "delete" }));

      if (!filesToDelete.length) {
        filesToDelete.push({ path: postPath, operation: "delete" });
      }

      const response = await fetch(`${state.apiBase}/api/publish`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          baseCommitSha: state.head,
          message: `chore: 刪除文章 ${title}`,
          files: filesToDelete
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        if (response.status !== 422) {
          throw new Error(errData.error || `刪除失敗 (${response.status})`);
        }
      } else {
        const data = await response.json();
        state.head = data.commitSha;
      }
    }

    try {
      await chrome.storage.local.remove(`draft:${postPath}`);
      await clearDraftUploads(postPath);
      if (typeof removeNewDraftPath === "function") await removeNewDraftPath(postPath);
    } catch {}

    state.files = state.files.filter((f) => !f.startsWith(postDir + "/") && f !== postPath);
    if (state.postMetadataCache) delete state.postMetadataCache[postPath];

    log(`文章「${title}」已成功刪除`, "success");

    if (state.currentPath === postPath || state.currentPath.startsWith(postDir + "/")) {
      await loadFile(fallbackPath);
    } else {
      renderTree();
      if (state.currentPath === fallbackPath) {
        const split = splitFrontMatter(state.originalContent);
        renderSectionHub(state.currentPath, split.body);
      }
    }
  } catch (error) {
    log(error.message || "刪除文章時發生錯誤", "error");
  }
}

function renderSectionHub(path, body) {
  const isKnowledge = path.startsWith("knowledge");
  const sectionName = isKnowledge ? "AI 知識站" : "教學與研究";
  const icon = isKnowledge ? "知" : "研";
  const prefix = isKnowledge ? "knowledge/posts/" : "lab/posts/";

  if (elements.sectionHubBadge) {
    elements.sectionHubBadge.textContent = `${icon} · ${sectionName} 專區導言設定`;
  }
  if (elements.sectionHubArticlesBadge) {
    elements.sectionHubArticlesBadge.textContent = `📑 ${sectionName} 文章管理（一篇文章一個區塊）`;
  }

  if (elements.sectionHubIntroInput) {
    elements.sectionHubIntroInput.value = body.trim();
    elements.sectionHubIntroInput.oninput = () => {
      state.sectionHubModel = { intro: elements.sectionHubIntroInput.value, path };
      state.sectionHubDirty = true;
      state.draftSaved = false;
      scheduleDocumentUpdate();
    };
  }

  if (elements.sectionHubAddPostButton) {
    elements.sectionHubAddPostButton.onclick = () => {
      startNewPost(isKnowledge ? "knowledge" : "lab");
    };
  }

  if (elements.sectionHubArticleList) {
    elements.sectionHubArticleList.replaceChildren();
    const contentFiles = state.files.filter((p) => p.startsWith(prefix) && /\.(md|qmd)$/i.test(p)).sort().reverse();

    if (elements.sectionHubArticlesBadge) {
      elements.sectionHubArticlesBadge.textContent = `📑 最新文章 (共 ${contentFiles.length} 篇)`;
    }

    if (contentFiles.length === 0) {
      const emptyCard = document.createElement("div");
      emptyCard.className = "empty-hub-card";
      emptyCard.style.cssText = "padding:24px 16px;text-align:center;background:#ffffff;border:1.5px dashed #cbd5e1;border-radius:10px;margin:8px 0;";
      emptyCard.innerHTML = `
        <div style="font-size:24px;margin-bottom:6px;">📑</div>
        <div style="font-weight:700;color:#1e293b;font-size:14px;margin-bottom:4px;">目前尚無個別文章</div>
        <div style="font-size:12px;color:#64748b;margin-bottom:14px;">點擊下方按鈕即可一鍵建立新文章，直接開啟 Notion / Obsidian 自由撰寫大畫布！</div>
        <button class="primary-button mini-button" type="button" style="padding:8px 20px;font-size:13px;background:#001F3F;border-color:#001F3F;cursor:pointer;">＋ 立即開啟大畫布撰寫新文章</button>
      `;
      emptyCard.querySelector("button").onclick = () => {
        startNewPost(isKnowledge ? "knowledge" : "lab");
      };
      elements.sectionHubArticleList.append(emptyCard);
      return;
    }

    contentFiles.forEach((postPath) => {
      const meta = getPostMetadata(postPath);
      const isDraft = meta.draft === true || meta.draft === "true";
      const card = document.createElement("div");
      card.className = `article-hub-card${isDraft ? " is-draft" : ""}`;

      const header = document.createElement("div");
      header.className = "article-hub-header";

      const title = document.createElement("h3");
      title.className = "article-hub-title";
      title.textContent = meta.title || postPath;

      header.append(title);

      const metaRow = document.createElement("div");
      metaRow.className = "article-hub-meta";

      const statusPill = document.createElement("span");
      statusPill.className = `status-pill ${isDraft ? "status-draft" : "status-published"}`;
      statusPill.textContent = isDraft ? "🟡 隱藏草稿" : "🟢 已發布";
      metaRow.append(statusPill);

      if (meta.date) {
        const dateBadge = document.createElement("span");
        dateBadge.className = "date-badge";
        dateBadge.textContent = `🗓️ ${meta.date}`;
        metaRow.append(dateBadge);
      }
      if (Array.isArray(meta.categories) && meta.categories.length) {
        meta.categories.forEach((cat) => {
          const catTag = document.createElement("span");
          catTag.className = "category-tag";
          catTag.textContent = cat;
          metaRow.append(catTag);
        });
      }
      if (meta.slides) {
        const slidesBadge = document.createElement("a");
        slidesBadge.href = meta.slides;
        slidesBadge.target = "_blank";
        slidesBadge.rel = "noopener noreferrer";
        slidesBadge.className = "resource-pill slides-pill";
        slidesBadge.textContent = "📊 簡報";
        slidesBadge.title = "點擊開啟 Google Drive 簡報";
        slidesBadge.onclick = (e) => e.stopPropagation();
        metaRow.append(slidesBadge);
      }
      if (meta.handout) {
        const handoutBadge = document.createElement("a");
        handoutBadge.href = meta.handout;
        handoutBadge.target = "_blank";
        handoutBadge.rel = "noopener noreferrer";
        handoutBadge.className = "resource-pill handout-pill";
        handoutBadge.textContent = "📄 講義";
        handoutBadge.title = "點擊開啟 Google Drive 講義";
        handoutBadge.onclick = (e) => e.stopPropagation();
        metaRow.append(handoutBadge);
      }
      if (meta.youtube) {
        const ytBadge = document.createElement("a");
        ytBadge.href = meta.youtube;
        ytBadge.target = "_blank";
        ytBadge.rel = "noopener noreferrer";
        ytBadge.className = "resource-pill youtube-pill";
        ytBadge.style.cssText = "background:#dc2626;color:#ffffff;text-decoration:none;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;";
        ytBadge.textContent = "▶ 影片";
        ytBadge.title = "點擊開啟 YouTube 影片";
        ytBadge.onclick = (e) => e.stopPropagation();
        metaRow.append(ytBadge);
      }

      const desc = document.createElement("p");
      desc.className = "article-hub-desc";
      desc.textContent = meta.desc || "點選右下方「編輯文章」開始編輯內文或前設資料。";

      const pathRow = document.createElement("div");
      pathRow.className = "article-hub-path";
      pathRow.textContent = postPath;

      const actions = document.createElement("div");
      actions.className = "article-hub-actions";

      const toggleDraftBtn = document.createElement("button");
      toggleDraftBtn.type = "button";
      toggleDraftBtn.className = "btn-toggle-draft";
      toggleDraftBtn.textContent = isDraft ? "🚀 設為發布" : "🔒 設為隱藏";
      toggleDraftBtn.title = isDraft ? "將此文章狀態切換為公開發布" : "將此文章設為隱藏草稿";
      toggleDraftBtn.onclick = async (e) => {
        e.stopPropagation();
        meta.draft = !isDraft;
        state.postMetadataCache[postPath] = { ...meta, draft: !isDraft };
        renderSectionHub(path, body);
        renderTree();
        log(`${meta.title || postPath} 已切換為：${meta.draft ? "隱藏草稿" : "公開發布"}`, "info");
        await loadFile(postPath);
        if (elements.draftInput) {
          elements.draftInput.value = meta.draft ? "true" : "false";
          state.metadataDirty = true;
          state.draftSaved = false;
          scheduleDocumentUpdate();
        }
      };

      const previewBtn = document.createElement("button");
      previewBtn.type = "button";
      previewBtn.className = "btn-preview";
      previewBtn.textContent = "🌐 預覽此篇";
      previewBtn.onclick = () => {
        loadFile(postPath);
      };

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "btn-edit";
      editBtn.textContent = "✏️ 編輯文章";
      editBtn.onclick = () => {
        loadFile(postPath);
      };

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "btn-delete";
      deleteBtn.textContent = "🗑️ 刪除";
      deleteBtn.title = "永久刪除此文章與其圖檔";
      deleteBtn.onclick = (e) => {
        e.stopPropagation();
        deletePost(postPath);
      };

      actions.append(toggleDraftBtn, previewBtn, editBtn, deleteBtn);
      card.append(header, metaRow);
      if (meta.image) {
        const thumb = document.createElement("img");
        thumb.className = "article-hub-thumb";
        thumb.loading = "lazy";
        thumb.src = previewAssetUrl(meta.image, postPath);
        thumb.alt = meta.title || "封面縮圖";
        thumb.onerror = () => { thumb.style.display = "none"; };
        card.append(thumb);
      }
      card.append(desc, pathRow, actions);
      elements.sectionHubArticleList.append(card);
    });
  }
}

function renderStudentsEditors() {
  if (!state.studentsModel) return;
  const model = state.studentsModel;

  if (elements.studentsWelcomeTitleInput) {
    elements.studentsWelcomeTitleInput.value = model.welcomeTitle || "";
    elements.studentsWelcomeTitleInput.oninput = () => {
      model.welcomeTitle = elements.studentsWelcomeTitleInput.value;
      state.studentsDirty = true;
      state.draftSaved = false;
      scheduleDocumentUpdate();
    };
  }

  if (elements.studentsWelcomeTextInput) {
    elements.studentsWelcomeTextInput.value = model.welcomeText || "";
    elements.studentsWelcomeTextInput.oninput = () => {
      model.welcomeText = elements.studentsWelcomeTextInput.value;
      state.studentsDirty = true;
      state.draftSaved = false;
      scheduleDocumentUpdate();
    };
  }

  if (elements.studentScheduleList) {
    elements.studentScheduleList.replaceChildren();
    (model.schedules || []).forEach((sch, index) => {
      const card = document.createElement("div");
      card.className = "card-item";
      card.style.display = "grid";
      card.style.gridTemplateColumns = "120px 140px 1fr 40px";
      card.style.gap = "8px";
      card.style.alignItems = "center";

      const dateIn = document.createElement("input");
      dateIn.type = "text";
      dateIn.placeholder = "日期 (如 2026/09)";
      dateIn.value = sch.date || "";
      dateIn.style.minHeight = "36px";
      dateIn.oninput = () => {
        sch.date = dateIn.value;
        state.studentsDirty = true;
        state.draftSaved = false;
        scheduleDocumentUpdate();
      };

      const presenterIn = document.createElement("input");
      presenterIn.type = "text";
      presenterIn.placeholder = "報告人 (如 王小明)";
      presenterIn.value = sch.presenter || "";
      presenterIn.style.minHeight = "36px";
      presenterIn.oninput = () => {
        sch.presenter = presenterIn.value;
        state.studentsDirty = true;
        state.draftSaved = false;
        scheduleDocumentUpdate();
      };

      const topicIn = document.createElement("input");
      topicIn.type = "text";
      topicIn.placeholder = "論文研讀主題或進度說明";
      topicIn.value = sch.topic || "";
      topicIn.style.minHeight = "36px";
      topicIn.oninput = () => {
        sch.topic = topicIn.value;
        state.studentsDirty = true;
        state.draftSaved = false;
        scheduleDocumentUpdate();
      };

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "btn-delete mini-delete-btn";
      delBtn.textContent = "×";
      delBtn.title = "刪除此排程";
      delBtn.onclick = () => {
        model.schedules.splice(index, 1);
        state.studentsDirty = true;
        state.draftSaved = false;
        renderStudentsEditors();
        scheduleDocumentUpdate();
      };

      card.append(dateIn, presenterIn, topicIn, delBtn);
      elements.studentScheduleList.append(card);
    });
  }

function createNotionToolbar(textarea, onUpdate) {
  const bar = document.createElement("div");
  bar.className = "notion-tools-bar";
  bar.style.display = "flex";
  bar.style.gap = "4px";
  bar.style.padding = "6px 10px";
  bar.style.background = "#f1f5f9";
  bar.style.border = "1px solid #cbd5e1";
  bar.style.borderBottom = "none";
  bar.style.borderRadius = "8px 8px 0 0";
  bar.style.alignItems = "center";
  bar.style.flexWrap = "wrap";

  const btnDefs = [
    { label: "B", title: "粗體 (Bold)", wrap: ["**", "**"], style: "font-weight:800;" },
    { label: "I", title: "斜體 (Italic)", wrap: ["*", "*"], style: "font-style:italic;" },
    { label: "H3", title: "三級標題 (Heading 3)", prefix: "### ", style: "font-weight:700;" },
    { label: "• 清單", title: "項目符號清單 (Bullet list)", prefix: "- " },
    { label: "1. 編號", title: "數字編號清單 (Ordered list)", isOrdered: true },
    { label: "“ 引言", title: "引言區塊 (Quote)", prefix: "> " },
    { label: "<code>", title: "行內程式碼 (Code)", wrap: ["`", "`"], style: "font-family:monospace;" },
    {
      label: "🔗 連結",
      title: "插入超連結 (Link)",
      action: () => {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const sel = textarea.value.substring(start, end) || "連結文字";
        const url = prompt("請輸入超連結網址 (URL)：", "https://");
        if (url) {
          const insert = `[${sel}](${url})`;
          textarea.setRangeText(insert, start, end, "select");
          onUpdate();
        }
      }
    },
    {
      label: "💡 提示框",
      title: "插入重點提示方塊 (Callout)",
      action: () => {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const sel = textarea.value.substring(start, end) || "重要指引或規範內容...";
        const insert = `\n::: {.callout-note}\n${sel}\n:::\n`;
        textarea.setRangeText(insert, start, end, "select");
        onUpdate();
      }
    },
    {
      label: "📊 表格",
      title: "插入表格 (Table)",
      action: () => {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const insert = `\n| 項目 | 說明 | 備註 |\n| :--- | :--- | :--- |\n| 資料一 | 說明一 | 備註一 |\n`;
        textarea.setRangeText(insert, start, end, "select");
        onUpdate();
      }
    }
  ];

  btnDefs.forEach((def) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = def.label;
    btn.title = def.title;
    btn.style.cssText = `padding:3px 8px;font-size:11px;font-weight:600;color:#1e293b;background:#ffffff;border:1px solid #cbd5e1;border-radius:4px;cursor:pointer;line-height:1.2;${def.style || ""}`;

    btn.onmouseover = () => { btn.style.background = "#e2e8f0"; btn.style.color = "#001F3F"; };
    btn.onmouseout = () => { btn.style.background = "#ffffff"; btn.style.color = "#1e293b"; };

    btn.onclick = (e) => {
      e.preventDefault();
      textarea.focus();
      if (def.action) {
        def.action();
        return;
      }
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const sel = textarea.value.substring(start, end);

      if (def.wrap) {
        const insert = `${def.wrap[0]}${sel || "重點文字"}${def.wrap[1]}`;
        textarea.setRangeText(insert, start, end, "select");
      } else if (def.isOrdered) {
        if (!sel) {
          textarea.setRangeText("1. ", start, start, "end");
        } else {
          const lines = sel.split("\n").map((l, i) => `${i + 1}. ${l.replace(/^\d+\.\s*/, "")}`).join("\n");
          textarea.setRangeText(lines, start, end, "select");
        }
      } else if (def.prefix) {
        if (!sel) {
          textarea.setRangeText(def.prefix, start, start, "end");
        } else {
          const lines = sel.split("\n").map((l) => `${def.prefix}${l}`).join("\n");
          textarea.setRangeText(lines, start, end, "select");
        }
      }
      onUpdate();
    };

    bar.append(btn);
  });

  return bar;
}

  if (elements.studentGuidelineList) {
    elements.studentGuidelineList.replaceChildren();
    (model.guidelines || []).forEach((g, index) => {
      const card = document.createElement("div");
      card.className = "card-item";
      card.style.display = "flex";
      card.style.flexDirection = "column";
      card.style.gap = "12px";
      card.style.marginBottom = "18px";
      card.style.background = "#ffffff";
      card.style.border = "1.5px solid #dbe4f0";
      card.style.borderRadius = "12px";
      card.style.padding = "16px";
      card.style.boxShadow = "0 2px 6px rgba(0,0,0,0.03)";

      const headerRow = document.createElement("div");
      headerRow.style.display = "flex";
      headerRow.style.gap = "8px";
      headerRow.style.alignItems = "center";

      const badge = document.createElement("span");
      badge.textContent = `📌 專案區塊 ${index + 1}`;
      badge.style.fontSize = "11px";
      badge.style.fontWeight = "700";
      badge.style.color = "#001F3F";
      badge.style.background = "#eef4fb";
      badge.style.padding = "4px 8px";
      badge.style.borderRadius = "6px";
      badge.style.whiteSpace = "nowrap";

      const titleIn = document.createElement("input");
      titleIn.type = "text";
      titleIn.placeholder = "專案主題 / 規範標題 (例如：1. 碩士論文撰寫基本功)";
      titleIn.value = g.title || "";
      titleIn.style.flex = "1";
      titleIn.style.fontWeight = "700";
      titleIn.style.color = "#001F3F";
      titleIn.style.minHeight = "36px";
      titleIn.oninput = () => {
        g.title = titleIn.value;
        state.studentsDirty = true;
        state.draftSaved = false;
        scheduleDocumentUpdate();
      };

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "btn-delete mini-delete-btn";
      delBtn.textContent = "×";
      delBtn.title = "刪除此專案區塊";
      delBtn.onclick = () => {
        model.guidelines.splice(index, 1);
        state.studentsDirty = true;
        state.draftSaved = false;
        renderStudentsEditors();
        scheduleDocumentUpdate();
      };

      headerRow.append(badge, titleIn, delBtn);

      // Notion Block Free Writing Container with Tools Bar
      const blockContainer = document.createElement("div");
      blockContainer.style.display = "flex";
      blockContainer.style.flexDirection = "column";

      const blockLabel = document.createElement("label");
      blockLabel.style.fontSize = "12px";
      blockLabel.style.fontWeight = "700";
      blockLabel.style.color = "#334155";
      blockLabel.style.marginBottom = "6px";
      blockLabel.textContent = "📝 Notion 自由撰寫區塊 (可搭配上方 Tools Bar 快速排版)";

      const contentIn = document.createElement("textarea");
      contentIn.className = "custom-textarea";
      contentIn.rows = 6;
      contentIn.style.fontFamily = "inherit";
      contentIn.style.lineHeight = "1.7";
      contentIn.style.fontSize = "13.5px";
      contentIn.style.borderTop = "none";
      contentIn.style.borderRadius = "0 0 8px 8px";
      contentIn.placeholder = "在此自由撰寫專案說明、研究指引或規範內容（選取文字點擊上方工具列即可加粗、變斜體、插入清單、連結或表格）...";
      contentIn.value = g.content || "";
      contentIn.oninput = () => {
        g.content = contentIn.value;
        state.studentsDirty = true;
        state.draftSaved = false;
        scheduleDocumentUpdate();
      };

      const toolsBar = createNotionToolbar(contentIn, () => {
        g.content = contentIn.value;
        state.studentsDirty = true;
        state.draftSaved = false;
        scheduleDocumentUpdate();
      });

      blockContainer.append(blockLabel, toolsBar, contentIn);

      // Resources box: 講義、簡報、YouTube
      const resourcesBox = document.createElement("div");
      resourcesBox.style.background = "#f8fafc";
      resourcesBox.style.border = "1px dashed #cbd5e1";
      resourcesBox.style.borderRadius = "8px";
      resourcesBox.style.padding = "10px 12px";
      resourcesBox.style.display = "flex";
      resourcesBox.style.flexDirection = "column";
      resourcesBox.style.gap = "8px";

      const resLabel = document.createElement("div");
      resLabel.style.fontSize = "11px";
      resLabel.style.fontWeight = "700";
      resLabel.style.color = "#334155";
      resLabel.textContent = "🔗 專案資源與影音教材連結（選填，自動於前台產生精美按鈕）";

      const resGrid = document.createElement("div");
      resGrid.style.display = "grid";
      resGrid.style.gridTemplateColumns = "repeat(auto-fit, minmax(180px, 1fr))";
      resGrid.style.gap = "8px";

      // 1. 講義連結
      const handoutWrap = document.createElement("div");
      const handoutTag = document.createElement("span");
      handoutTag.style.fontSize = "11px";
      handoutTag.style.fontWeight = "600";
      handoutTag.style.color = "#C9A227";
      handoutTag.textContent = "📄 講義 / 範本連結";
      const handoutIn = document.createElement("input");
      handoutIn.type = "url";
      handoutIn.placeholder = "Google Drive 講義或範本 URL";
      handoutIn.value = g.handoutUrl || "";
      handoutIn.style.minHeight = "32px";
      handoutIn.style.fontSize = "12px";
      handoutIn.oninput = () => {
        g.handoutUrl = handoutIn.value.trim();
        state.studentsDirty = true;
        state.draftSaved = false;
        scheduleDocumentUpdate();
      };
      handoutWrap.append(handoutTag, handoutIn);

      // 2. 簡報連結
      const slidesWrap = document.createElement("div");
      const slidesTag = document.createElement("span");
      slidesTag.style.fontSize = "11px";
      slidesTag.style.fontWeight = "600";
      slidesTag.style.color = "#001F3F";
      slidesTag.textContent = "📊 簡報下載連結";
      const slidesIn = document.createElement("input");
      slidesIn.type = "url";
      slidesIn.placeholder = "Google Drive 簡報 URL";
      slidesIn.value = g.slidesUrl || "";
      slidesIn.style.minHeight = "32px";
      slidesIn.style.fontSize = "12px";
      slidesIn.oninput = () => {
        g.slidesUrl = slidesIn.value.trim();
        state.studentsDirty = true;
        state.draftSaved = false;
        scheduleDocumentUpdate();
      };
      slidesWrap.append(slidesTag, slidesIn);

      // 3. YouTube 連結
      const ytWrap = document.createElement("div");
      const ytTag = document.createElement("span");
      ytTag.style.fontSize = "11px";
      ytTag.style.fontWeight = "600";
      ytTag.style.color = "#dc2626";
      ytTag.textContent = "▶ YouTube 影片連結";
      const ytIn = document.createElement("input");
      ytIn.type = "url";
      ytIn.placeholder = "https://youtu.be/...";
      ytIn.value = g.youtubeUrl || "";
      ytIn.style.minHeight = "32px";
      ytIn.style.fontSize = "12px";
      ytIn.oninput = () => {
        g.youtubeUrl = ytIn.value.trim();
        state.studentsDirty = true;
        state.draftSaved = false;
        scheduleDocumentUpdate();
      };
      ytWrap.append(ytTag, ytIn);

      resGrid.append(handoutWrap, slidesWrap, ytWrap);
      resourcesBox.append(resLabel, resGrid);

      card.append(headerRow, blockContainer, resourcesBox);
      elements.studentGuidelineList.append(card);
    });
  }
}

function renderActivityEditors() {
  elements.activityEditors.replaceChildren();
  for (const model of state.activityModels.values()) {
    const section = document.createElement("section");
    section.className = "activity-editor-card";
    const heading = document.createElement("div");
    heading.className = "activity-editor-heading";
    const title = document.createElement("h3");
    title.textContent = model.year ? `${model.year} 年活動` : "活動紀錄";
    const add = document.createElement("button");
    add.type = "button";
    add.textContent = "＋ 新增活動";
    add.addEventListener("click", () => {
      model.events.unshift({ date: "", venue: "", topic: "", slidesUrl: "", handoutUrl: "", youtubeUrl: "" });
      markStructuredModelDirty(model);
      renderActivityEditors();
      queueMicrotask(() => elements.activityEditors.querySelector("input")?.focus());
    });
    heading.append(title, add);
    section.append(heading);

    const list = document.createElement("div");
    list.className = "activity-card-list";
    model.events.forEach((event, eventIndex) => {
      const card = document.createElement("article");
      card.className = "activity-row";

      const mainRow = document.createElement("div");
      mainRow.className = "activity-main-row";
      mainRow.append(
        createActivityField("日期", event.date, (value) => { event.date = value; markStructuredModelDirty(model); }),
        createActivityField("單位／場合", event.venue, (value) => { event.venue = value; markStructuredModelDirty(model); }),
        createActivityField("主題", event.topic, (value) => { event.topic = value; markStructuredModelDirty(model); })
      );
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "remove-activity";
      remove.textContent = "刪除";
      remove.setAttribute("aria-label", `刪除 ${event.date || `第 ${eventIndex + 1} 筆`}活動`);
      remove.addEventListener("click", () => {
        model.events.splice(eventIndex, 1);
        markStructuredModelDirty(model);
        renderActivityEditors();
      });
      mainRow.append(remove);

      const resourcesRow = document.createElement("div");
      resourcesRow.className = "activity-resources-row";
      resourcesRow.append(
        createActivityField(
          "📊 簡報連結 (Google Drive / 簡報網址)",
          event.slidesUrl || "",
          (value) => { event.slidesUrl = value; markStructuredModelDirty(model); },
          "https://drive.google.com/... 或簡報下載網址",
          "url"
        ),
        createActivityField(
          "📄 講義連結 (Google Drive / 講義網址)",
          event.handoutUrl || "",
          (value) => { event.handoutUrl = value; markStructuredModelDirty(model); },
          "https://drive.google.com/... 或講義下載網址",
          "url"
        ),
        createActivityField(
          "▶ YouTube 影片連結",
          event.youtubeUrl || "",
          (value) => { event.youtubeUrl = value; markStructuredModelDirty(model); },
          "https://www.youtube.com/watch?v=... 或 https://youtu.be/...",
          "url"
        )
      );

      card.append(mainRow, resourcesRow);
      list.append(card);
    });
    section.append(list);
    elements.activityEditors.append(section);
  }
}

function renderStructuredTables() {
  elements.tableEditors.replaceChildren();
  renderActivityEditors();
  const hasActivities = state.activityModels.size > 0;
  const hasTables = state.tableModels.size > 0;
  const isStructured = ["index.md", "about/index.md", "publications/index.md", "activities/index.md"].includes(state.currentPath);
  elements.structuredData.hidden = !hasActivities && !hasTables && !isStructured;
  if (!isStructured) {
    elements.structuredDataTitle.textContent = hasActivities && hasTables ? "活動與表格" : hasActivities ? "活動管理" : "頁面表格";
    elements.structuredDataHint.textContent = hasActivities
      ? "直接新增、修改或刪除活動；日期、單位、主題與原網站雙欄版面會自動保留"
      : "直接修改儲存格；欄位與原網站版面會自動保留";
  }
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
  
  let session;
  try {
    session = await api("/api/session");
  } catch (error) {
    if (error.message && (error.message.includes("Cloudflare") || error.message.includes("登入"))) {
      try {
        window.open(`${state.apiBase}/api/session`, "_blank", "noopener");
      } catch {}
      throw new Error("🔐 安全登入憑證已過期，已為您開啟登入視窗。登入成功後請回到此處點擊「連線」！");
    }
    throw error;
  }

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
  try {
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
  } catch (error) {
    log(`開啟頁面失敗（${path}）：${error.message}`, "error");
    alert(`開啟頁面失敗：${error.message}`);
  }
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
  state.activityModels = protectedLayout.activityModels;
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
  const isHome = path === "index.md";
  const isAbout = path === "about/index.md";
  const isPub = path === "publications/index.md";
  const isActivities = path === "activities/index.md";
  const isKnowledge = path === "knowledge/index.md";
  const isLab = path === "lab/index.md";
  const isStudents = path === "students/index.qmd";
  const isSectionHub = isKnowledge || isLab;
  const isStructuredPage = isHome || isAbout || isPub || isActivities;
  const isDeletable = path.startsWith("knowledge/posts/") || path.startsWith("lab/posts/");
  const isPost = isDeletable;
  if (elements.deleteDocumentButton) {
    elements.deleteDocumentButton.style.display = isDeletable ? "inline-flex" : "none";
  }
  if (elements.postOnlyFields) {
    elements.postOnlyFields.hidden = !isPost;
  }

  if (elements.homeEditors) elements.homeEditors.hidden = !isHome;
  if (elements.aboutEditors) elements.aboutEditors.hidden = !isAbout;
  if (elements.publicationEditors) elements.publicationEditors.hidden = !isPub;
  if (elements.sectionHubEditors) elements.sectionHubEditors.hidden = !isSectionHub;
  if (elements.studentPasswordCard) elements.studentPasswordCard.hidden = !isStudents;
  if (elements.studentsEditors) elements.studentsEditors.hidden = true;
  if (elements.activityIntroSection) elements.activityIntroSection.hidden = !isActivities;
  if (elements.activityEditors) elements.activityEditors.hidden = !isActivities;
  if (elements.tableEditors) elements.tableEditors.hidden = isStructuredPage;
  if (elements.structuredData) elements.structuredData.hidden = !isStructuredPage && state.activityModels.size === 0 && state.tableModels.size === 0;

  if (elements.editorToolbar) elements.editorToolbar.hidden = isStructuredPage;
  if (elements.visualEditor) elements.visualEditor.hidden = isStructuredPage;

  if (isHome) {
    state.homeModel = parseHomePage(split.body);
    state.homeDirty = false;
    renderHomeEditors();
  } else if (isAbout) {
    state.aboutModel = parseAboutPage(split.body);
    state.aboutDirty = false;
    renderAboutEditors();
  } else if (isPub) {
    state.pubModel = parsePublicationsPage(split.body);
    state.pubDirty = false;
    renderPublicationsEditors();
  } else if (isActivities) {
    if (elements.activityIntroInput) elements.activityIntroInput.value = parseActivityIntro(split.body);
    renderActivityEditors();
  } else if (isSectionHub) {
    state.sectionHubModel = { intro: split.body.trim(), path };
    state.sectionHubDirty = false;
    renderSectionHub(path, split.body);
  }
  ensureEditor();
  state.loadingEditor = true;
  state.editor.setMarkdown(protectedLayout.editorBody || "");
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
  if (!state.currentPath) return;
  if (state.currentPath === "index.md" && state.homeModel) {
    elements.wordCount.textContent = `${(state.homeModel.researchAreas || []).length} 個領域 · ${(state.homeModel.courses || []).length} 門授課 · ${(state.homeModel.evaluations || []).length} 筆評價 · ${(state.homeModel.highlights || []).length} 筆動態`;
  } else if (state.currentPath === "about/index.md" && state.aboutModel) {
    elements.wordCount.textContent = `${(state.aboutModel.education || []).length} 項學歷 · ${(state.aboutModel.experience || []).length} 項經歷 · ${(state.aboutModel.honors || []).length} 項榮譽`;
  } else if (state.currentPath === "publications/index.md" && state.pubModel) {
    elements.wordCount.textContent = `${(state.pubModel.journalPapers || []).length} 篇期刊 · ${(state.pubModel.workingPapers || []).length} 篇工作論文 · ${(state.pubModel.conferences || []).length} 場研討會`;
  } else if (state.currentPath === "knowledge/index.md" || state.currentPath === "lab/index.md") {
    const isKnowledge = state.currentPath.startsWith("knowledge");
    const prefix = isKnowledge ? "knowledge/posts/" : "lab/posts/";
    const count = state.files.filter((p) => p.startsWith(prefix) && /\.(md|qmd)$/i.test(p)).length;
    elements.wordCount.textContent = `共 ${count} 篇文章`;
  } else if (state.currentPath === "activities/index.md") {
    let totalEvents = 0;
    for (const model of state.activityModels.values()) totalEvents += model.events.length;
    elements.wordCount.textContent = `${totalEvents} 場活動`;
  } else if (state.currentPath === "students/index.qmd" && state.studentsModel) {
    elements.wordCount.textContent = `${(state.studentsModel.guidelines || []).length} 條規範 · ${(state.studentsModel.schedules || []).length} 筆排程`;
  } else if (state.editor) {
    const markdown = state.editor.getMarkdown();
    const latin = markdown.match(/[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)?/g) || [];
    const cjk = markdown.match(/[\u3400-\u9fff\uf900-\ufaff]/g) || [];
    elements.wordCount.textContent = `${latin.length + cjk.length} 字`;
  }
  const changed = hasUnsavedChanges();
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

function activityPreviewHtml(model) {
  const events = model.events.map((event) => `
    <div class="preview-column" style="--preview-span:2"><strong>${escapeHtml(event.date)}</strong></div>
    <div class="preview-column" style="--preview-span:10"><h4>${escapeHtml(event.venue)}</h4><p><em>${escapeHtml(event.topic)}</em></p></div>`).join("");
  return `<div class="preview-grid">${events}</div>`;
}

function previewAnchorText(value) {
  return tableCellDisplay(String(value || "")
    .replace(/^\s*#{1,6}\s+/, "")
    .replace(/<[^>]+>/g, ""))
    .trim();
}

function restorePreviewLayout(html) {
  const previewDocument = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  const anchorElements = Array.from(previewDocument.body.querySelectorAll("h1,h2,h3,h4,h5,h6,p"));
  const findAnchor = (value, selector = "h1,h2,h3,h4,h5,h6,p") => {
    const target = previewAnchorText(value);
    return anchorElements.find((element) => element.matches(selector) && element.textContent.trim() === target);
  };

  let activityIndex = 0;
  for (const model of state.activityModels.values()) {
    const yearHeading = findAnchor(model.year, "h2");
    if (yearHeading) {
      yearHeading.insertAdjacentHTML("afterend", activityPreviewHtml(model));
    } else {
      const divider = activityIndex > 0 ? "<hr>" : "";
      const sectionHtml = `${divider}<h2>${escapeHtml(model.year)}</h2>${activityPreviewHtml(model)}`;
      previewDocument.body.insertAdjacentHTML("beforeend", sectionHtml);
    }
    activityIndex += 1;
  }
  for (const model of state.tableModels.values()) {
    const anchor = findAnchor(model.anchor);
    anchor?.insertAdjacentHTML("afterend", tablePreviewHtml(model));
  }

  if (state.currentPath === "activities/index.md") {
    const latestHeading = findAnchor("🌟 最新動態", "h2");
    const description = latestHeading?.nextElementSibling;
    if (latestHeading && description?.tagName === "P") {
      const callout = previewDocument.createElement("div");
      callout.className = "preview-callout preview-callout-tip";
      latestHeading.before(callout);
      callout.append(latestHeading, description);
    }
  }
  return previewDocument.body.innerHTML;
}

function previewPageBase() {
  const sourcePath = state.currentPath || "index.md";
  const directory = sourcePath.endsWith("/index.md") || sourcePath.endsWith("/index.qmd")
    ? sourcePath.replace(/index\.(?:md|qmd)$/i, "")
    : sourcePath.replace(/[^/]+$/, "");
  return new URL(directory, state.siteUrl);
}

function previewAssetUrl(source, customDocPath = state.currentPath) {
  const value = String(source || "").trim();
  if (!value || /^(?:data:|blob:)/i.test(value)) return value;

  // 1. Check local pending uploads first
  for (const upload of state.pendingUploads.values()) {
    if (value === upload.path || value === `/${upload.path}` || value.endsWith(upload.path)) {
      return upload.dataUrl;
    }
  }
  if (/^https?:/i.test(value)) return value;

  // 2. Resolve relative repo path
  const sourcePath = customDocPath || "index.md";
  const directory = sourcePath.endsWith("/index.md") || sourcePath.endsWith("/index.qmd")
    ? sourcePath.replace(/index\.(?:md|qmd)$/i, "")
    : sourcePath.replace(/[^/]+$/, "");

  let repoFilePath;
  if (value.startsWith("/")) {
    repoFilePath = value.slice(1);
  } else {
    repoFilePath = `${directory}${value}`.replace(/\/+/g, "/");
  }

  // GitHub Raw returns HTTP 200 for all committed images regardless of draft status
  return `https://raw.githubusercontent.com/changhsiuwei/changhsiuwei.github.io/main/${repoFilePath}`;
}

function rewritePreviewImages(html) {
  const documentFragment = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  for (const image of documentFragment.body.querySelectorAll("img[src]")) {
    image.setAttribute("src", previewAssetUrl(image.getAttribute("src")));
    image.setAttribute("loading", "lazy");
  }
  return documentFragment.body.innerHTML;
}

function renderPreview() {
  let body;
  if (state.currentPath === "index.md" && state.homeModel) {
    const bio = escapeHtml(state.homeModel.bio || "");
    const motto = escapeHtml(state.homeModel.motto || "");
    const areasHtml = (state.homeModel.researchAreas || []).map((a) => `
      <div class="preview-column" style="--preview-span:4">
        <div class="premium-icon-box"><i class="${escapeHtml(a.icon)}"></i></div>
        <h3 style="margin:0 0 6px">${escapeHtml(a.title)}</h3>
        <p style="margin:0;color:#667085;font-size:13px">${escapeHtml(a.desc)}</p>
      </div>
    `).join("");

    const coursesHtml = (state.homeModel.courses || []).map((c) => `
      <div class="preview-column" style="--preview-span:6;padding:16px;border-left:4px solid #001F3F;border-radius:12px;background:#f8faff;border:1px solid #dbeafe;">
        ${c.time ? `<div style="margin-bottom:8px"><span style="background:#001F3F;color:#fff;font-size:11px;font-weight:700;padding:4px 8px;border-radius:6px">${escapeHtml(c.time)}</span></div>` : ""}
        <h4 style="margin:0 0 6px;color:#001F3F;font-size:16px;font-weight:700">${escapeHtml(c.name || "")}</h4>
        <p style="margin:0 0 10px;color:#475569;font-size:12px;line-height:1.5">${escapeHtml(c.desc || "")}</p>
        ${c.syllabusUrl ? `<a href="${escapeHtml(c.syllabusUrl)}" target="_blank" style="display:inline-flex;align-items:center;gap:4px;font-size:11px;color:#001F3F;font-weight:700;text-decoration:none;padding:4px 10px;background:#fff;border:1px solid #cbd5e1;border-radius:6px">📄 授課大綱 ↗</a>` : ""}
      </div>
    `).join("");

    const evalsHtml = (state.homeModel.evaluations || []).map((e) => `
      <div class="preview-column" style="--preview-span:6;padding:16px;border-left:4px solid #C9A227;border-radius:12px;background:#fffdfa;border:1px solid #fef3c7;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <strong style="color:#001F3F;font-size:14px">${escapeHtml(e.course || "")}</strong>
          ${e.score ? `<span style="background:#fef3c7;color:#92400e;font-size:11px;font-weight:700;padding:3px 8px;border-radius:6px">${escapeHtml(e.score)}</span>` : ""}
        </div>
        <blockquote style="margin:0 0 8px;padding-left:10px;border-left:3px solid #C9A227;font-size:12px;font-style:italic;color:#334155;line-height:1.6">「${escapeHtml(e.feedback || "")}」</blockquote>
        ${e.source ? `<div style="font-size:11px;color:#64748b;text-align:right">— ${escapeHtml(e.source)}</div>` : ""}
      </div>
    `).join("");

    const highlightsHtml = (state.homeModel.highlights || []).map((h) => `
      <tr>
        <td style="font-weight:700;white-space:nowrap;padding:8px 12px;border:1px solid #dfe4ef">${escapeHtml(h.date)}</td>
        <td style="padding:8px 12px;border:1px solid #dfe4ef">${inlineMarkdownPreview(h.event)}</td>
      </tr>
    `).join("");
    body = `
      <h2>關於我</h2>
      <p>${bio.replace(/\n\n+/g, "</p><p>")}</p>
      ${motto ? `<blockquote><em>"${motto}"</em></blockquote>` : ""}
      <h2>研究領域</h2>
      <div class="preview-grid">${areasHtml}</div>
      ${coursesHtml ? `<h2>本學期授課</h2><div class="preview-grid">${coursesHtml}</div>` : ""}
      ${evalsHtml ? `<h2>授課評價與學生回饋</h2><div class="preview-grid">${evalsHtml}</div>` : ""}
      <h2>最新動態</h2>
      <div class="preview-table-wrap">
        <table style="width:100%;border-collapse:collapse">
          <thead><tr style="background:#f4f6fb"><th style="padding:8px 12px;text-align:left;border:1px solid #dfe4ef">日期</th><th style="padding:8px 12px;text-align:left;border:1px solid #dfe4ef">事件</th></tr></thead>
          <tbody>${highlightsHtml}</tbody>
        </table>
      </div>
    `;
  } else if (state.currentPath === "about/index.md" && state.aboutModel) {
    const eduHtml = (state.aboutModel.education || []).map((e) => `
      <div class="preview-column" style="--preview-span:6;padding:12px;border:1px solid #e2e7f2;border-radius:10px;background:#fbfcfe">
        <h4 style="margin:0 0 4px;color:#403f6f">${escapeHtml(e.degree)}</h4>
        <strong style="display:block;color:#2c344e">${escapeHtml(e.school)}</strong>
        ${e.detail ? `<span style="display:block;color:#667085;font-size:12px">${escapeHtml(e.detail)}</span>` : ""}
        <span style="display:block;color:#667085;font-size:12px;margin-top:4px">${escapeHtml(e.period)}</span>
        ${e.linkUrl ? `<a href="${escapeHtml(e.linkUrl)}" target="_blank" style="display:inline-block;margin-top:6px;font-size:12px">${escapeHtml(e.linkText || "📄 Dissertation")}</a>` : ""}
      </div>
    `).join("");
    const expHtml = (state.aboutModel.experience || []).map((exp) => `
      <tr>
        <td style="font-weight:700;padding:8px 12px;border:1px solid #dfe4ef">${escapeHtml(exp.period)}</td>
        <td style="font-weight:700;color:#403f6f;padding:8px 12px;border:1px solid #dfe4ef">${escapeHtml(exp.title)}</td>
        <td style="padding:8px 12px;border:1px solid #dfe4ef">${escapeHtml(exp.institution)}</td>
      </tr>
    `).join("");
    const honorsHtml = (state.aboutModel.honors || []).map((h) => `<li>${inlineMarkdownPreview(h)}</li>`).join("");
    const servicesHtml = (state.aboutModel.services || []).map((s) => `<li>${inlineMarkdownPreview(s)}</li>`).join("");
    body = `
      <div class="preview-callout preview-callout-note">
        <h2 style="margin:0 0 6px">${escapeHtml(state.aboutModel.calloutTitle)}</h2>
        <p style="margin:0;font-weight:700">${escapeHtml(state.aboutModel.calloutSubtitle)}</p>
      </div>
      <h2>學歷 (Education)</h2>
      <div class="preview-grid">${eduHtml}</div>
      <hr>
      <h2>經歷 (Professional Experience)</h2>
      <div class="preview-table-wrap">
        <table style="width:100%;border-collapse:collapse">
          <thead><tr style="background:#f4f6fb"><th style="padding:8px 12px;text-align:left;border:1px solid #dfe4ef">期間</th><th style="padding:8px 12px;text-align:left;border:1px solid #dfe4ef">職位</th><th style="padding:8px 12px;text-align:left;border:1px solid #dfe4ef">單位</th></tr></thead>
          <tbody>${expHtml}</tbody>
        </table>
      </div>
      <hr>
      <h2>榮譽與獎項 (Honors & Awards)</h2>
      <ul>${honorsHtml}</ul>
      <hr>
      <h2>服務 (Service)</h2>
      <ul>${servicesHtml}</ul>
    `;
  } else if (state.currentPath === "publications/index.md" && state.pubModel) {
    const journalHtml = (state.pubModel.journalPapers || []).map((p) => `
      <div class="preview-callout preview-callout-note" style="margin:14px 0">
        <h4 style="margin:0 0 6px;color:#403f6f">${escapeHtml(p.title)}</h4>
        <p style="margin:0 0 4px;font-weight:700">${escapeHtml(p.authors)}</p>
        <p style="margin:0;font-style:italic;color:#3f4b6f">${escapeHtml(p.journal)}${p.doi ? ` | <a href="${escapeHtml(p.doi)}" target="_blank">DOI</a>` : ""}</p>
        ${p.badge ? `<code style="display:inline-block;margin-top:6px;padding:2px 6px;background:#eef2ff;border-radius:4px;font-size:11px">${escapeHtml(p.badge)}</code>` : ""}
      </div>
    `).join("");
    const workingHtml = (state.pubModel.workingPapers || []).map((p) => `
      <div class="preview-callout preview-callout-warning" style="margin:14px 0">
        <h4 style="margin:0 0 6px;color:#854d0e">${escapeHtml(p.title)}</h4>
        <p style="margin:0 0 4px;font-weight:700">${escapeHtml(p.authors)}</p>
        ${p.status ? `<p style="margin:0;font-style:italic">${escapeHtml(p.status)}</p>` : ""}
        ${p.badge ? `<code style="display:inline-block;margin-top:6px;padding:2px 6px;background:#fef3c7;border-radius:4px;font-size:11px">${escapeHtml(p.badge)}</code>` : ""}
      </div>
    `).join("");
    const confHtml = (state.pubModel.conferences || []).map((c) => `
      <tr>
        <td style="font-weight:700;padding:8px 12px;border:1px solid #dfe4ef">${escapeHtml(c.year)}</td>
        <td style="padding:8px 12px;border:1px solid #dfe4ef">${escapeHtml(c.conference)}</td>
        <td style="padding:8px 12px;border:1px solid #dfe4ef">${inlineMarkdownPreview(c.paper)}</td>
      </tr>
    `).join("");
    body = `
      <h2>📄 期刊論文 (Journal Publications)</h2>
      ${journalHtml}
      <hr>
      <h2>📝 工作論文 (Working Papers)</h2>
      ${workingHtml}
      <hr>
      <h2>🎤 研討會發表 (Conference Presentations)</h2>
      <div class="preview-table-wrap">
        <table style="width:100%;border-collapse:collapse">
          <thead><tr style="background:#f4f6fb"><th style="padding:8px 12px;text-align:left;border:1px solid #dfe4ef">年份</th><th style="padding:8px 12px;text-align:left;border:1px solid #dfe4ef">研討會</th><th style="padding:8px 12px;text-align:left;border:1px solid #dfe4ef">論文</th></tr></thead>
          <tbody>${confHtml}</tbody>
        </table>
      </div>
    `;
  } else if (state.currentPath === "knowledge/index.md" || state.currentPath === "lab/index.md") {
    const isKnowledge = state.currentPath.startsWith("knowledge");
    const prefix = isKnowledge ? "knowledge/posts/" : "lab/posts/";
    const introHtml = state.editor ? sanitizePreviewHtml(restorePreviewLayout(state.editor.getHTML())) : "";
    const posts = state.files.filter((p) => p.startsWith(prefix) && /\.(md|qmd)$/i.test(p)).sort().reverse();
    const cardsHtml = posts.map((p) => {
      const meta = getPostMetadata(p);
      const tags = (meta.categories || []).map((c) => `<span style="display:inline-block;padding:1px 6px;margin-right:4px;border-radius:4px;background:#eef2ff;color:#4338ca;font-size:11px">${escapeHtml(c)}</span>`).join("");
      return `
        <div style="margin:14px 0;padding:16px;border:1px solid #e2e8f0;border-radius:10px;background:#ffffff;box-shadow:0 2px 4px rgba(0,0,0,0.02)">
          <div style="font-size:11px;color:#64748b;margin-bottom:6px">${escapeHtml(meta.date || "")} ${tags}</div>
          <h3 style="margin:0 0 6px;color:#1e293b;font-size:16px">${escapeHtml(meta.title || p)}</h3>
          <p style="margin:0;color:#475569;font-size:13px;line-height:1.5">${escapeHtml(meta.desc || "")}</p>
        </div>
      `;
    }).join("");
    body = `
      <div style="padding-bottom:16px;margin-bottom:24px;border-bottom:1px solid #e2e8f0">
        ${introHtml}
      </div>
      <h3 style="margin:0 0 14px;color:#403f6f">📑 最新文章 (共 ${posts.length} 篇)</h3>
      <div>${cardsHtml}</div>
    `;
  } else if (state.currentPath === "activities/index.md") {
    const intro = escapeHtml(elements.activityIntroInput?.value?.trim() || "以下為近期的學術與產業演講、工作坊活動紀錄。");
    let previewBody = `<div class="preview-callout preview-callout-tip"><h2>🌟 最新動態</h2><p>${intro}</p></div>`;
    let first = true;
    for (const model of state.activityModels.values()) {
      if (!first) previewBody += "<hr>";
      previewBody += `<h2>${escapeHtml(model.year)}</h2>${activityPreviewHtml(model)}`;
      first = false;
    }
    body = previewBody;
  } else {
    if (!state.editor) return;
    body = sanitizePreviewHtml(restorePreviewLayout(state.editor.getHTML()));
    for (const upload of state.pendingUploads.values()) {
      body = body.replaceAll(`src="/${upload.path}"`, `src="${upload.dataUrl}"`);
    }
    body = rewritePreviewImages(body);
  }
  const title = escapeHtml(elements.titleInput.value || pageInfo(state.currentPath).label);
  const subtitle = escapeHtml(elements.subtitleInput ? elements.subtitleInput.value.trim() : "");
  const description = escapeHtml(elements.descriptionInput.value);
  const featuredImage = (elements.featuredImageInput && !elements.featuredImageInput.closest("section").hidden)
    ? elements.featuredImageInput.value.trim()
    : readYamlScalar(currentFrontMatter(), "image");
  const featuredImageHtml = featuredImage
    ? `<img class="featured-image" src="${escapeHtml(previewAssetUrl(featuredImage))}" alt="${title}" onerror="this.style.display='none'">`
    : "";

  const slides = (elements.slidesUrlInput && !elements.slidesUrlInput.closest("section").hidden)
    ? elements.slidesUrlInput.value.trim()
    : readYamlScalar(currentFrontMatter(), "slides") || readYamlScalar(currentFrontMatter(), "slides_url");
  const handout = (elements.handoutUrlInput && !elements.handoutUrlInput.closest("section").hidden)
    ? elements.handoutUrlInput.value.trim()
    : readYamlScalar(currentFrontMatter(), "handout") || readYamlScalar(currentFrontMatter(), "handout_url");
  const youtube = (elements.youtubeUrlInput && !elements.youtubeUrlInput.closest("section").hidden)
    ? elements.youtubeUrlInput.value.trim()
    : readYamlScalar(currentFrontMatter(), "youtube") || readYamlScalar(currentFrontMatter(), "youtube_url");

  let resourceLinksHtml = "";
  if (slides || handout || youtube) {
    const links = [];
    if (slides) {
      links.push(`<a href="${escapeHtml(slides)}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:8px;padding:9px 18px;border-radius:10px;background:#001F3F;color:#ffffff;text-decoration:none;font-weight:600;font-size:13px;box-shadow:0 2px 6px rgba(0,31,63,0.15)">📊 簡報下載 (Google Drive) ↗</a>`);
    }
    if (handout) {
      links.push(`<a href="${escapeHtml(handout)}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:8px;padding:9px 18px;border-radius:10px;background:#C9A227;color:#ffffff;text-decoration:none;font-weight:600;font-size:13px;box-shadow:0 2px 6px rgba(201,162,39,0.2)">📄 講義下載 (Google Drive) ↗</a>`);
    }
    if (youtube) {
      links.push(`<a href="${escapeHtml(youtube)}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:8px;padding:9px 18px;border-radius:10px;background:#dc2626;color:#ffffff;text-decoration:none;font-weight:600;font-size:13px;box-shadow:0 2px 6px rgba(220,38,38,0.2)">▶ YouTube 影片 (線上收看) ↗</a>`);
    }
    resourceLinksHtml = `<div class="resource-links-bar" style="display:flex;gap:12px;margin:18px 0 24px;flex-wrap:wrap;">${links.join("")}</div>`;
  }

  const navigation = STATIC_PAGES.map((page) => `<span>${escapeHtml(page.label)}</span>`).join("");
  elements.livePreview.srcdoc = `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><style>
    *{box-sizing:border-box}body{margin:0;color:#2c344e;background:#fff;font:15px/1.8 Georgia,'Noto Serif TC',serif}
    header{padding:16px 22px;border-bottom:1px solid #e4e7ef;background:#fff;font-family:Inter,'Noto Sans TC',sans-serif}
    .top{display:flex;align-items:center;justify-content:space-between;gap:20px}.brand{font-weight:800}.nav{display:flex;gap:12px;color:#5968a6;font-size:10px;font-weight:700}
    main{max-width:820px;margin:auto;padding:48px 42px 80px}h1{margin:0 0 12px;color:#2c344e;font-size:38px;line-height:1.2}h2,h3{color:#403f6f;line-height:1.35}
    .description{margin:0 0 30px;color:#667085;font:16px/1.7 Inter,'Noto Sans TC',sans-serif}.featured-image{display:block;max-width:min(100%,680px);max-height:420px;margin:0 auto 30px;object-fit:contain;border-radius:16px}.content img{max-width:100%;height:auto;border-radius:12px}.content a{color:#403f6f}.content blockquote{margin-left:0;padding:8px 18px;border-left:4px solid #c8d5ff;background:#f6f7ff}.preview-table-wrap{overflow:auto;margin:18px 0}.content table{width:100%;border-collapse:collapse}.content th,.content td{border:1px solid #dfe4ef;padding:7px}
    .preview-grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:18px;margin:18px 0}.preview-column{grid-column:span var(--preview-span,12);min-width:0}.preview-callout{margin:18px 0;padding:14px 18px;border:1px solid #dfe4ef;border-left:5px solid #6b6aa8;border-radius:10px;background:#f8f9ff}.preview-callout-tip{border-left-color:#3b8d76;background:#f4fbf8}.preview-callout-warning,.preview-callout-caution{border-left-color:#d49a36;background:#fffaf0}.preview-callout-important{border-left-color:#b84b61;background:#fff6f7}.preview-layout-section{margin:12px 0}.premium-icon-box{display:grid;place-items:center;width:44px;height:44px;margin-bottom:10px;border-radius:12px;background:#eef1ff;color:#403f6f}
    @media(max-width:700px){.nav{display:none}main{padding:34px 22px}h1{font-size:30px}.preview-column{grid-column:1/-1}}
  </style></head><body><header><div class="top"><div class="brand">張修瑋 · H.W. Chang</div><div class="nav">${navigation}</div></div></header><main><h1>${title}</h1>${subtitle ? `<p style="font-size:18px;color:#5968a6;margin:-4px 0 16px;font-style:italic;">${subtitle}</p>` : ""}${description ? `<p class="description">${description}</p>` : ""}${featuredImageHtml}${resourceLinksHtml}<article class="content">${body}</article></main></body></html>`;
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
  validateActivitiesForPublish();
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
  for (const [token, model] of state.tableModels) {
    model.originalSource = serializeTable(model);
    state.layoutLocks.set(token, model.originalSource);
    model.originalWidth = model.headers.length;
    model.originalSeparator = model.originalSource.split(/\r?\n/)[1] || "";
    model.dirty = false;
  }
  for (const [token, model] of state.activityModels) {
    model.originalSource = serializeActivityGrid(model);
    state.layoutLocks.set(token, model.originalSource);
    model.dirty = false;
  }
  state.newDocument = false;
  state.bodyDirty = false;
  state.homeDirty = false;
  state.aboutDirty = false;
  state.pubDirty = false;
  state.sectionHubDirty = false;
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

function startNewPost(collection = "lab") {
  const date = new Date().toISOString().slice(0, 10);
  const timeStr = Date.now().toString().slice(-4);
  const slug = `${date}-post-${timeStr}`;
  const path = `${collection}/posts/${slug}/index.md`;
  const defaultTitle = collection === "knowledge" ? "新 AI 知識站專欄" : "新教學與研究文章";
  const content = `---\ntitle: ${JSON.stringify(defaultTitle)}\ndescription: ""\ndate: ${JSON.stringify(date)}\ncategories: ["AI"]\nslides: ""\nhandout: ""\nyoutube: ""\ndraft: false\n---\n\n從這裡開始撰寫您的文章內容...\n`;
  if (!state.files.includes(path)) {
    state.files.push(path);
    renderTree();
  }
  openDocument(path, content, true);
  log("新文章已建立，立即進入 Notion 大畫布撰寫！", "success");
  setTimeout(() => {
    if (elements.titleInput) {
      elements.titleInput.focus();
      elements.titleInput.select();
    }
  }, 120);
}

function createNewPost(event) {
  event.preventDefault();
  const collection = elements.newPostCollection.value;
  const title = elements.newPostTitle.value.trim();
  let slug = elements.newPostSlug.value.trim().toLowerCase();
  if (!title) throw new Error("請填寫文章標題");
  if (!slug) {
    const timeStr = Date.now().toString().slice(-4);
    slug = `${new Date().toISOString().slice(0, 10)}-post-${timeStr}`;
  }
  if (!/^[a-z0-9][a-z0-9-]{2,80}$/.test(slug)) {
    const timeStr = Date.now().toString().slice(-4);
    slug = `${new Date().toISOString().slice(0, 10)}-post-${timeStr}`;
  }
  const path = `${collection}/posts/${slug}/index.md`;
  if (state.files.includes(path)) throw new Error("這個網址名稱已經存在");
  const date = new Date().toISOString().slice(0, 10);

  const pendingAi = state.pendingAiGeneratedPost;
  const descField = pendingAi?.recommended_subtitle ? `description: ${JSON.stringify(pendingAi.recommended_subtitle)}\n` : "";
  const bodyText = pendingAi?.polished_content ? pendingAi.polished_content : "從這裡開始撰寫文章。\n";
  const content = `---\ntitle: ${JSON.stringify(title)}\n${descField}date: ${JSON.stringify(date)}\ncategories: []\ndraft: false\n---\n\n${bodyText}\n`;
  state.pendingAiGeneratedPost = null;

  elements.newPostDialog.close();
  elements.newPostForm.reset();
  if (elements.aiNewPostFeedback) elements.aiNewPostFeedback.style.display = "none";

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
    const publishedUrl = previewPageBase();
    publishedUrl.searchParams.set("cms-refresh", String(Date.now()));
    window.open(publishedUrl.toString(), "_blank", "noopener");
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

const SUPPORTED_AI_MODELS = [
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-pro-preview",
  "gemma-4-26b-a4b-it",
  "gemma-4-31b-it"
];

const HUMAN_EDITOR_SYSTEM_PROMPT = `# Role: 資深人類編輯 (Human Writer & Editor)

# Goal:
生成或改寫內容，使其完全消除「AI 味（AI-ese）」，呈現具有「人味」、具體、有稜角且言之有物的文字。

# Core Philosophy (核心哲學):
1. **拒絕平庸與空洞：** AI 傾向於寫出統計上最安全的句子，導致內容「平滑化」。你要反其道而行，保留事實的「稜角」與「具體細節」。
2. **拒絕宏大敘事：** 不要把小事寫成大事。如果只是一個小鎮商場，不要說它是「文化遺產的中心」；如果只是一次軟體更新，不要說它是「數位轉型的里程碑」。
3. **拒絕說教：** 讀者不需要你在每段開頭或結尾告訴他們「這很重要」。

# The "Kill List" (絕對禁止使用的詞彙與句型):
根據維基百科《人工智慧寫作跡象》，你必須嚴格避開以下特徵：

## 1. 禁止詞彙 (Forbidden Vocabulary):
請勿使用以下詞彙（及其對應的英文概念），改用更樸實、口語或具體的描述：
- **禁止：** 深入研究 (Delve)、見證/是...的證明 (Testament/is a testament to)、格局 (Landscape)、強調/凸顯 (Underscore/Highlight)、關鍵的 (Pivotal)、錯綜複雜的 (Intricate)、細緻入微的 (Nuanced)、充滿活力的 (Vibrant/Bustling)、展示 (Showcase)、促進 (Foster)、與...一致 (Align with)、不可磨滅的印記 (Indelible mark)。
- **替代策略：** 直接描述該事物「做」了什麼，而不是用形容詞堆砌。

## 2. 禁止句型 (Forbidden Structures):
- **否定平行結構：** 禁止使用「不僅是 X，更是 Y (Not only... but also...)」來試圖昇華平凡事物。
- **虛假範圍：** 禁止使用「從 X 到 Y (From X to Y)」這種跨度極大且邏輯斷裂的修辭（例如：「從宇宙大爆炸到今天的早餐」）。
- **說教式免責/引導：** 禁止使用「值得注意的是 (It is important to note)」、「重要的是要記住」作為開頭。
- **模糊歸因：** 禁止使用「批評者認為」、「觀察家指出」這種不具名的權威訴諸（Weasel words）。
- **三段式排比：** 不要為了押韻或節奏刻意列舉三個形容詞（例如：「歷史的深度、文化的豐富性與現代的活力」）。

## 3. 結構與格式禁令 (Structure & Formatting):
- **禁止僵化結尾：** 絕對不要用「總結來說 (In conclusion)」、「總而言之 (Overall)」、「儘管面臨挑戰，但展望未來...」這種圓滿的廢話結尾。文章該結束就結束，或用一個有力的金句/提問收尾。
- **格式整潔：** 
    - 除非必要，不要使用 markdown 的 ## 標題格式。
    - 嚴禁在正文中過度使用 **粗體** 來強調單詞。
    - 嚴禁使用 Emoji (🚀🧠📘)。
    - 標題不要全部首字母大寫。

# Writing Guidelines (寫作指南):
1. **Show, Don't Tell:** 用數據、案例、對話或具體動作來呈現，而不是用形容詞概括。
2. **語氣自然：** 想像你是在跟朋友在咖啡廳聊天，或者是一位嚴謹的專欄作家在寫稿。可以使用短句、反問，甚至帶點主觀的觀點（如果適合話題）。
3. **資訊密度：** 寧可短而精確，不要長而空洞。如果不知道某個具體來源，承認不知道，不要編造或使用模糊歸因。

# Output Format:
必須輸出嚴格合法的 JSON 物件（請勿輸出額外雜訊或未閉合格式）：
{
  "recommended_titles": ["首選標題（最具稜角、吸睛且言之有物）", "備選標題 1（直球對決風格）", "備選標題 2（反思設問風格）"],
  "recommended_subtitle": "簡明有力的副標題或摘要（50-80字，去除空話，直切重點）",
  "suggested_slug": "english-url-slug-with-hyphens",
  "word_count": 實際文章正文字數數字,
  "polished_content": "完整改寫/潤飾後的文章 Markdown 內容"
}`;

async function callGoogleAiStudio({ oralNotes = "", currentArticleText = "", targetWords = "1000-1200 字深度專欄" }) {
  const apiKey = (state.geminiApiKey || "").trim();
  if (!apiKey) {
    elements.settingsDialog.showModal();
    throw new Error("請先在設定中輸入 Google AI Studio API Key");
  }

  const model = state.geminiModel || "gemini-3.7-flash";
  const temperature = parseFloat(state.geminiTemperature ?? 0.7);
  const thinkingLevel = parseInt(state.geminiThinkingLevel ?? 2048, 10);

  const promptParts = [];
  if (oralNotes) {
    promptParts.push(`【口述草稿 / 作者筆記】：\n${oralNotes}`);
  }
  if (currentArticleText) {
    promptParts.push(`【目前文章內文】：\n${currentArticleText}`);
  }
  promptParts.push(`【篇幅長度目標】：${targetWords}`);
  promptParts.push("請根據以上輸入內容與角色要求，徹底去除所有 AI 味，改寫出具有人味、具體細節的文章，並回傳嚴格符合 JSON 格式的推薦標題、副標題、slug、字數與改寫內文。");

  const generationConfig = {
    temperature: isNaN(temperature) ? 0.7 : temperature
  };

  if (thinkingLevel > 0) {
    generationConfig.thinkingConfig = {
      thinkingBudget: thinkingLevel
    };
  }

  if (model.startsWith("gemini")) {
    generationConfig.responseMimeType = "application/json";
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: promptParts.join("\n\n") }] }],
      systemInstruction: { parts: [{ text: HUMAN_EDITOR_SYSTEM_PROMPT }] },
      generationConfig
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const errMsg = errData.error?.message || `Google AI Studio API 呼叫失敗 (${response.status})`;
    throw new Error(errMsg);
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error("Google AI Studio 未回傳有效內容");

  try {
    return JSON.parse(rawText);
  } catch {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    throw new Error("無法解析 AI 回傳的 JSON 格式");
  }
}

function renderTitleChips(container, titles, onSelect) {
  if (!container) return;
  container.replaceChildren();
  titles.forEach((t, i) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = `ai-title-chip${i === 0 ? " active" : ""}`;
    chip.textContent = t;
    chip.onclick = (e) => {
      e.preventDefault();
      container.querySelectorAll(".ai-title-chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      onSelect(t);
    };
    container.append(chip);
  });
}

elements.geminiTemperature?.addEventListener("input", () => {
  if (elements.geminiTemperatureValue) {
    elements.geminiTemperatureValue.textContent = parseFloat(elements.geminiTemperature.value).toFixed(2);
  }
});

elements.btnRunAiGenerateNewPost?.addEventListener("click", async () => {
  const notes = elements.newPostAiNotes?.value.trim();
  if (!notes) {
    log("請先在口述草稿欄位填寫想法或筆記", "error");
    elements.newPostAiNotes?.focus();
    return;
  }
  const btn = elements.btnRunAiGenerateNewPost;
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = "<span>⏳ 資深編輯提煉人味中...</span>";

  try {
    const targetWords = elements.newPostTargetWords?.value || "1000-1200 字深度專欄";
    const result = await callGoogleAiStudio({ oralNotes: notes, targetWords });
    state.pendingAiGeneratedPost = result;

    if (result.recommended_titles && result.recommended_titles.length) {
      elements.newPostTitle.value = result.recommended_titles[0];
      renderTitleChips(elements.aiRecommendedTitles, result.recommended_titles, (selectedTitle) => {
        elements.newPostTitle.value = selectedTitle;
      });
    }
    if (result.suggested_slug) {
      elements.newPostSlug.value = result.suggested_slug.toLowerCase().replace(/[^a-z0-9-]+/g, "-");
    }

    if (elements.aiStatWordCount) {
      elements.aiStatWordCount.textContent = `📊 預估字數：約 ${result.word_count || result.polished_content?.length || 0} 字`;
    }
    if (elements.aiStatSubtitle) {
      elements.aiStatSubtitle.textContent = `📄 推薦副標題：${result.recommended_subtitle || "無"}`;
    }
    if (elements.aiNewPostFeedback) {
      elements.aiNewPostFeedback.style.display = "block";
    }

    log("AI 人味改寫完成！已推薦標題與副標題，點擊「建立草稿」即可帶入內文。", "success");
  } catch (error) {
    log(error.message || "AI 改寫失敗", "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
});

elements.aiPolishEditorButton?.addEventListener("click", () => {
  if (elements.aiPolishDialog) {
    elements.aiPolishDialog.showModal();
  }
});

elements.cancelAiPolishButton?.addEventListener("click", () => {
  elements.aiPolishDialog?.close();
});

elements.btnRunAiPolishActive?.addEventListener("click", async () => {
  const currentText = state.editor ? state.editor.getMarkdown() : state.originalBody;
  const oralNotes = elements.aiPolishOralNotes?.value.trim() || "";
  if (!currentText && !oralNotes) {
    log("請先在編輯器輸入文章或在上方填寫口述補充想法", "error");
    return;
  }
  const btn = elements.btnRunAiPolishActive;
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = "<span>⏳ 人味潤飾改寫中...</span>";

  try {
    const targetWords = elements.aiPolishTargetWords?.value || "1000-1200 字深度專欄";
    const result = await callGoogleAiStudio({ oralNotes, currentArticleText: currentText, targetWords });
    state.activeAiPolishResult = result;

    if (elements.aiActiveWordCount) {
      elements.aiActiveWordCount.textContent = `📊 潤飾後字數：約 ${result.word_count || result.polished_content?.length || 0} 字`;
    }
    if (elements.aiActiveSubtitle) {
      elements.aiActiveSubtitle.textContent = `📄 推薦副標題：${result.recommended_subtitle || "無"}`;
    }
    if (elements.aiPolishedTextPreview) {
      elements.aiPolishedTextPreview.value = result.polished_content || "";
    }
    if (result.recommended_titles && result.recommended_titles.length) {
      renderTitleChips(elements.aiActiveRecommendedTitles, result.recommended_titles, (selectedTitle) => {
        state.activeAiPolishResult.selectedTitle = selectedTitle;
      });
      state.activeAiPolishResult.selectedTitle = result.recommended_titles[0];
    }
    if (elements.aiPolishResults) {
      elements.aiPolishResults.style.display = "block";
    }

    log("文章潤飾完成！請檢視成果，確認無誤後點擊「套用到文章與標題」。", "success");
  } catch (error) {
    log(error.message || "文章潤飾失敗", "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
});

elements.applyAiPolishButton?.addEventListener("click", () => {
  if (!state.activeAiPolishResult) return;
  const res = state.activeAiPolishResult;
  if (res.polished_content) {
    if (state.editor) {
      state.editor.setMarkdown(res.polished_content);
    }
    state.workingBody = res.polished_content;
    state.bodyDirty = true;
  }
  if (res.selectedTitle) {
    elements.titleInput.value = res.selectedTitle;
    state.metadataDirty = true;
  }
  if (res.recommended_subtitle) {
    elements.descriptionInput.value = res.recommended_subtitle;
    state.metadataDirty = true;
  }
  state.draftSaved = false;
  scheduleDocumentUpdate();
  elements.aiPolishDialog?.close();
  log("已成功套用資深人類編輯潤飾成果至目前文章！", "success");
});

$("saveSettingsButton").addEventListener("click", async (event) => {
  event.preventDefault();
  try {
    state.apiBase = normalizeApiBase(elements.apiBase.value);
    state.siteUrl = normalizeSiteUrl(elements.siteUrl.value);
    state.geminiApiKey = (elements.geminiApiKey?.value || "").trim();
    state.geminiModel = elements.geminiModel?.value || "gemini-3.7-flash";
    state.geminiThinkingLevel = elements.geminiThinkingLevel?.value || "2048";
    state.geminiTemperature = elements.geminiTemperature?.value || "0.7";
    await chrome.storage.local.set({
      apiBase: state.apiBase,
      siteUrl: state.siteUrl,
      geminiApiKey: state.geminiApiKey,
      geminiModel: state.geminiModel,
      geminiThinkingLevel: state.geminiThinkingLevel,
      geminiTemperature: state.geminiTemperature
    });
    elements.settingsDialog.close();
    log("設定已儲存（含 Google AI Studio 模型與參數）", "success");
  } catch (error) { log(error.message, "error"); }
});

let isCoverUpload = false;
elements.uploadCoverButton?.addEventListener("click", () => {
  isCoverUpload = true;
  elements.imageInput.click();
});
$("addImageButton").addEventListener("click", () => {
  isCoverUpload = false;
  elements.imageInput.click();
});
elements.imageInput.addEventListener("change", async () => {
  const [file] = elements.imageInput.files;
  elements.imageInput.value = "";
  if (!file) return;
  try {
    if (isCoverUpload) {
      isCoverUpload = false;
      const queued = await queueImage(file);
      if (elements.featuredImageInput) elements.featuredImageInput.value = queued.path;
      state.metadataDirty = true;
      state.draftSaved = false;
      scheduleDocumentUpdate();
      log(`封面圖片已更新：${queued.path}`, "success");
    } else {
      await addSelectedImage(file);
    }
  } catch (error) {
    log(error.message || "圖片加入失敗", "error");
  }
});

for (const input of [elements.titleInput, elements.subtitleInput, elements.descriptionInput, elements.dateInput, elements.draftInput, elements.categoriesInput, elements.featuredImageInput, elements.slidesUrlInput, elements.handoutUrlInput, elements.youtubeUrlInput].filter(Boolean)) {
  input.addEventListener("input", () => {
    state.metadataDirty = true;
    state.draftSaved = false;
    scheduleDocumentUpdate();
  });
  input.addEventListener("change", () => {
    state.metadataDirty = true;
    state.draftSaved = false;
    scheduleDocumentUpdate();
  });
}

elements.deleteDocumentButton?.addEventListener("click", () => {
  if (state.currentPath) deletePost(state.currentPath);
});

elements.activityIntroInput?.addEventListener("input", () => {
  state.bodyDirty = true;
  state.draftSaved = false;
  scheduleDocumentUpdate();
});

elements.btnUpdateStudentPassword?.addEventListener("click", async () => {
  const newPw = (elements.studentPasswordInput?.value || "").trim();
  if (!newPw) {
    alert("請輸入要設定的新通行密碼！");
    elements.studentPasswordInput?.focus();
    return;
  }
  try {
    elements.btnUpdateStudentPassword.disabled = true;
    elements.btnUpdateStudentPassword.textContent = "⏳ 更新中...";

    const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(newPw));
    const hashHex = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");

    const result = await api("/api/publish", {
      method: "POST",
      body: JSON.stringify({
        baseCommitSha: state.head,
        message: "security(students): update student area password hash",
        files: [{
          path: "students/password_hash.txt",
          operation: "upsert",
          encoding: "utf-8",
          content: `${hashHex}\n`
        }]
      })
    });

    state.head = result.commitSha;
    log(`已成功更新學生專區通行密碼為「${newPw}」！`, "success");
    if (elements.studentPasswordStatus) {
      elements.studentPasswordStatus.style.display = "block";
      elements.studentPasswordStatus.textContent = `✅ 密碼已成功更新為「${newPw}」並已發布至 GitHub！`;
      setTimeout(() => { if (elements.studentPasswordStatus) elements.studentPasswordStatus.style.display = "none"; }, 8000);
    }
    elements.studentPasswordInput.value = "";
  } catch (error) {
    log(`更新密碼失敗：${error.message}`, "error");
    alert(`更新密碼失敗：${error.message}`);
  } finally {
    elements.btnUpdateStudentPassword.disabled = false;
    elements.btnUpdateStudentPassword.textContent = "💾 更新通行密碼";
  }
});

elements.addStudentScheduleButton?.addEventListener("click", () => {
  if (!state.studentsModel) return;
  state.studentsModel.schedules = state.studentsModel.schedules || [];
  state.studentsModel.schedules.push({ date: "", presenter: "", topic: "" });
  state.studentsDirty = true;
  state.draftSaved = false;
  renderStudentsEditors();
  scheduleDocumentUpdate();
});

elements.addStudentGuidelineButton?.addEventListener("click", () => {
  if (!state.studentsModel) return;
  state.studentsModel.guidelines = state.studentsModel.guidelines || [];
  state.studentsModel.guidelines.push({
    title: `${state.studentsModel.guidelines.length + 1}. 新指導主題與專案`,
    content: "",
    slidesUrl: "",
    handoutUrl: "",
    youtubeUrl: ""
  });
  state.studentsDirty = true;
  state.draftSaved = false;
  renderStudentsEditors();
  scheduleDocumentUpdate();
});

elements.pageSearch.addEventListener("input", () => {
  const query = elements.pageSearch.value.trim().toLowerCase();
  document.querySelectorAll(".tree-item").forEach((item) => { item.hidden = query && !item.dataset.search.includes(query); });
  document.querySelectorAll(".tree-group").forEach((group) => {
    group.hidden = !Array.from(group.querySelectorAll(".tree-item")).some((item) => !item.hidden);
  });
});

chrome.storage.local.get(["apiBase", "siteUrl", "geminiApiKey"]).then(async ({ apiBase, siteUrl, geminiApiKey }) => {
  state.apiBase = apiBase || DEFAULT_API_BASE;
  state.siteUrl = !siteUrl || siteUrl === LEGACY_SITE_URL ? DEFAULT_SITE_URL : siteUrl;
  state.geminiApiKey = geminiApiKey || "";
  elements.apiBase.value = state.apiBase;
  elements.siteUrl.value = state.siteUrl;
  if (elements.geminiApiKey) elements.geminiApiKey.value = state.geminiApiKey;
  await chrome.storage.local.set({ apiBase: state.apiBase, siteUrl: state.siteUrl, geminiApiKey: state.geminiApiKey });
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
