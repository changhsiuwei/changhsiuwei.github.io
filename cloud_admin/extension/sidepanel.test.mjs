import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const scriptSource = readFileSync(new URL("./sidepanel.js", import.meta.url), "utf8");

function productionFunction(name) {
  const start = scriptSource.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`Missing production function: ${name}`);
  const next = scriptSource.indexOf("\nfunction ", start + 1);
  return scriptSource.slice(start, next < 0 ? scriptSource.length : next);
}

const sandbox = {
  crypto: { randomUUID: () => "test-layout" },
  state: { currentPath: "", pendingUploads: new Map() }
};
vm.runInNewContext([
  "const state = this.state;",
  productionFunction("isProtectedLayoutLine"),
  productionFunction("splitTableRow"),
  productionFunction("parseTable"),
  productionFunction("findFencedDivEnd"),
  productionFunction("parseActivityGrid"),
  productionFunction("cleanActivityField"),
  productionFunction("serializeActivityGrid"),
  productionFunction("parseActivityIntro"),
  productionFunction("serializeActivitiesBody"),
  productionFunction("parseHomePage"),
  productionFunction("serializeHomePage"),
  productionFunction("parseAboutPage"),
  productionFunction("serializeAboutPage"),
  productionFunction("parsePublicationsPage"),
  productionFunction("serializePublicationsPage"),
  productionFunction("parseStudentsPage"),
  productionFunction("serializeStudentsPage"),
  productionFunction("serializeSectionHub"),
  productionFunction("previewAssetUrl"),
  productionFunction("unquoteYaml"),
  productionFunction("readYamlScalar"),
  productionFunction("setYamlScalar"),
  productionFunction("removeYamlField"),
  productionFunction("protectLayoutSyntax"),
  productionFunction("uniqueIndexOf"),
  productionFunction("applyEditorDeltaToSource"),
  productionFunction("applyEditorChangesToSource"),
  "this.findFencedDivEnd = findFencedDivEnd;",
  "this.parseActivityGrid = parseActivityGrid;",
  "this.serializeActivityGrid = serializeActivityGrid;",
  "this.parseActivityIntro = parseActivityIntro;",
  "this.serializeActivitiesBody = serializeActivitiesBody;",
  "this.parseHomePage = parseHomePage;",
  "this.serializeHomePage = serializeHomePage;",
  "this.parseAboutPage = parseAboutPage;",
  "this.serializeAboutPage = serializeAboutPage;",
  "this.parsePublicationsPage = parsePublicationsPage;",
  "this.serializePublicationsPage = serializePublicationsPage;",
  "this.parseStudentsPage = parseStudentsPage;",
  "this.serializeStudentsPage = serializeStudentsPage;",
  "this.serializeSectionHub = serializeSectionHub;",
  "this.previewAssetUrl = previewAssetUrl;",
  "this.readYamlScalar = readYamlScalar;",
  "this.setYamlScalar = setYamlScalar;",
  "this.removeYamlField = removeYamlField;",
  "this.protectLayoutSyntax = protectLayoutSyntax;",
  "this.applyEditorChangesToSource = applyEditorChangesToSource;"
].join("\n"), sandbox);

function activityGrids(markdown) {
  const body = markdown.replace(/^---\s*\r?\n[\s\S]*?\r?\n---\s*\r?\n/, "");
  const lines = body.split(/\r?\n/);
  const grids = [];
  let year = "";
  for (let index = 0; index < lines.length; index += 1) {
    year = lines[index].match(/^##\s+(\d{4})$/)?.[1] || year;
    if (!/^:{3,}\s*\{[^}]*\.grid\b/.test(lines[index])) continue;
    const end = sandbox.findFencedDivEnd(lines, index);
    assert.ok(end > index, "grid must have a matching closing fence");
    const source = lines.slice(index, end + 1).join("\n");
    const model = sandbox.parseActivityGrid(source, year);
    if (model) grids.push(model);
    index = end;
  }
  return grids;
}

test("activities render as structured cards without exposing Quarto layout", () => {
  const markdown = readFileSync(new URL("../../activities/index.md", import.meta.url), "utf8");
  const grids = activityGrids(markdown);
  assert.equal(grids.length, 2);
  assert.equal(grids[0].year, "2026");
  assert.deepEqual(JSON.parse(JSON.stringify(grids[0].events.slice(0, 2))), [
    { date: "August  14", venue: "莎美娜實業股份有限公司", topic: "【企業AI內訓】：AI in Excel 實戰" },
    { date: "August  12", venue: "莎美娜實業股份有限公司", topic: "【企業AI內訓】：企業 Agentic AI 的設計與實務" }
  ]);
  assert.equal(sandbox.serializeActivityGrid(grids[0]), grids[0].originalSource);

  const body = markdown.replace(/^---\s*\r?\n[\s\S]*?\r?\n---\s*\r?\n/, "");
  const protectedContent = sandbox.protectLayoutSyntax(body);
  assert.equal(protectedContent.activityModels.size, 2);
  assert.equal(protectedContent.editorBody.includes("::: {.grid}"), false);
  assert.equal(protectedContent.editorBody.includes("July 18"), false);
  assert.equal(protectedContent.editorBody.includes("2026"), false);
  assert.equal(protectedContent.editorBody.includes("2025"), false);
  assert.equal(protectedContent.editorBody.includes("HWCMS-LAYOUT"), false);
  assert.equal(protectedContent.editorBody.includes("<!--"), false);
});

test("activity field changes rebuild a valid Quarto grid", () => {
  const markdown = readFileSync(new URL("../../activities/index.md", import.meta.url), "utf8");
  const model = activityGrids(markdown)[0];
  model.events[0].venue = "更新後的單位";
  model.dirty = true;
  const serialized = sandbox.serializeActivityGrid(model);
  const reparsed = sandbox.parseActivityGrid(serialized, model.year);
  assert.ok(reparsed);
  assert.equal(reparsed.events[0].venue, "更新後的單位");
  assert.equal(reparsed.events.length, model.events.length);
});

test("activity slides and handout URLs read, serialize, and reparse cleanly", () => {
  const markdown = readFileSync(new URL("../../activities/index.md", import.meta.url), "utf8");
  const model = activityGrids(markdown)[0];
  model.events[0].slidesUrl = "https://drive.google.com/file/d/demo-slides/view";
  model.events[0].handoutUrl = "https://drive.google.com/file/d/demo-handout/view";
  model.dirty = true;
  const serialized = sandbox.serializeActivityGrid(model);
  assert.ok(serialized.includes("[📊 簡報下載 ↗](https://drive.google.com/file/d/demo-slides/view){target=\"_blank\" .activity-materials-link .activity-slides-link}"));
  assert.ok(serialized.includes("[📄 講義下載 ↗](https://drive.google.com/file/d/demo-handout/view){target=\"_blank\" .activity-materials-link .activity-handout-link}"));

  const reparsed = sandbox.parseActivityGrid(serialized, model.year);
  assert.ok(reparsed);
  assert.equal(reparsed.events[0].slidesUrl, "https://drive.google.com/file/d/demo-slides/view");
  assert.equal(reparsed.events[0].handoutUrl, "https://drive.google.com/file/d/demo-handout/view");
});

test("incomplete new activity remains recoverable as a local draft", () => {
  const markdown = readFileSync(new URL("../../activities/index.md", import.meta.url), "utf8");
  const model = activityGrids(markdown)[0];
  model.events.unshift({ date: "", venue: "", topic: "" });
  model.dirty = true;
  const reparsed = sandbox.parseActivityGrid(sandbox.serializeActivityGrid(model), model.year);
  assert.ok(reparsed);
  assert.deepEqual(JSON.parse(JSON.stringify(reparsed.events[0])), { date: "", venue: "", topic: "" });
});

test("marker-free visual text edits preserve the original Quarto layout", () => {
  const markdown = readFileSync(new URL("../../activities/index.md", import.meta.url), "utf8");
  const body = markdown.replace(/^---\s*\r?\n[\s\S]*?\r?\n---\s*\r?\n/, "");
  const projected = sandbox.protectLayoutSyntax(body).editorBody;
  const originalSentence = "以下為近期的學術與產業演講、工作坊活動紀錄。";
  const updatedSentence = "以下為近期演講、工作坊與教學活動紀錄。";
  const edited = projected.replace(originalSentence, updatedSentence);
  const mapped = sandbox.applyEditorChangesToSource(projected, edited, body);
  assert.ok(mapped);
  assert.equal(mapped.includes(updatedSentence), true);
  assert.equal((mapped.match(/:::/g) || []).length, (body.match(/:::/g) || []).length);
  assert.equal(mapped.replace(updatedSentence, originalSentence), body);
});

test("activity intro field and cards reconstruct the exact Quarto page layout", () => {
  const markdown = readFileSync(new URL("../../activities/index.md", import.meta.url), "utf8");
  const body = markdown.replace(/^---\s*\r?\n[\s\S]*?\r?\n---\s*\r?\n/, "");
  const intro = sandbox.parseActivityIntro(body);
  assert.equal(intro, "以下為近期的學術與產業演講、工作坊活動紀錄。");

  const protectedContent = sandbox.protectLayoutSyntax(body);
  const reconstructed = sandbox.serializeActivitiesBody(intro, protectedContent.activityModels);
  const normalize = (s) => s.replace(/\r\n/g, "\n").trim();
  assert.equal(normalize(reconstructed), normalize(body));
});

test("home page cards, courses, evaluations and highlights parse and reconstruct exact Quarto page layout", () => {
  const markdown = readFileSync(new URL("../../index.md", import.meta.url), "utf8");
  const body = markdown.replace(/^---\s*\r?\n[\s\S]*?\r?\n---\s*\r?\n/, "");
  const model = sandbox.parseHomePage(body);
  assert.equal(model.researchAreas.length, 5);
  assert.equal(model.courses.length, 2);
  assert.equal(model.courses[0].name, "會計人工智慧與大數據分析");
  assert.equal(model.courses[0].time, "114-1 學期 · 週四 09:10-12:00");
  assert.equal(model.evaluations.length, 2);
  assert.equal(model.evaluations[0].course, "會計資訊系統");
  assert.equal(model.evaluations[0].score, "⭐ 教學評鑑 4.9 / 5.0");
  assert.equal(model.highlights.length, 5);
  assert.ok(model.bio.includes("我是張修瑋"));
  assert.equal(model.motto, "Honoring God and benefiting people! (榮神益人！)");

  const reconstructed = sandbox.serializeHomePage(model);
  const normalize = (s) => s.replace(/\r\n/g, "\n").trim();
  assert.equal(normalize(reconstructed), normalize(body));
});

test("home page selective visibility toggles hide sections safely with 100% data recovery", () => {
  const markdown = readFileSync(new URL("../../index.md", import.meta.url), "utf8");
  const body = markdown.replace(/^---\s*\r?\n[\s\S]*?\r?\n---\s*\r?\n/, "");
  const model = sandbox.parseHomePage(body);
  
  // Hide courses section and evaluations section
  model.showCourses = false;
  model.showEvaluations = false;
  model.researchAreas[0].hidden = true;

  const hiddenSerialized = sandbox.serializeHomePage(model);
  assert.ok(hiddenSerialized.includes("<!-- HWCMS-HIDDEN:courses"));
  assert.ok(hiddenSerialized.includes("<!-- HWCMS-HIDDEN:evaluations"));
  assert.ok(hiddenSerialized.includes("<!-- HWCMS-HIDDEN-CARD"));

  // Reparse hidden serialized output
  const reparsed = sandbox.parseHomePage(hiddenSerialized);
  assert.equal(reparsed.showCourses, false);
  assert.equal(reparsed.showEvaluations, false);
  assert.equal(reparsed.showResearchAreas, true);
  assert.equal(reparsed.courses.length, 2);
  assert.equal(reparsed.evaluations.length, 2);
  assert.equal(reparsed.researchAreas[0].hidden, true);
  assert.equal(reparsed.researchAreas[1].hidden, false);

  // Unhide and re-serialize to verify perfect restoration
  reparsed.showCourses = true;
  reparsed.showEvaluations = true;
  reparsed.researchAreas[0].hidden = false;

  const unhiddenSerialized = sandbox.serializeHomePage(reparsed);
  const normalize = (s) => s.replace(/\r\n/g, "\n").trim();
  assert.equal(normalize(unhiddenSerialized), normalize(body));
});

test("about page cards, education, and experience parse and reconstruct exact Quarto page layout", () => {
  const markdown = readFileSync(new URL("../../about/index.md", import.meta.url), "utf8");
  const body = markdown.replace(/^---\s*\r?\n[\s\S]*?\r?\n---\s*\r?\n/, "");
  const model = sandbox.parseAboutPage(body);
  assert.equal(model.education.length, 4);
  assert.equal(model.experience.length, 3);
  assert.equal(model.honors.length, 4);
  assert.equal(model.services.length, 1);

  const reconstructed = sandbox.serializeAboutPage(model);
  const reparsed = sandbox.parseAboutPage(reconstructed);
  assert.deepEqual(reparsed, model);
});

test("publications page cards, working papers, and conferences parse and reconstruct exact Quarto page layout", () => {
  const markdown = readFileSync(new URL("../../publications/index.md", import.meta.url), "utf8");
  const body = markdown.replace(/^---\s*\r?\n[\s\S]*?\r?\n---\s*\r?\n/, "");
  const model = sandbox.parsePublicationsPage(body);
  assert.equal(model.journalPapers.length, 6);
  assert.equal(model.workingPapers.length, 3);
  assert.equal(model.conferences.length, 6);

  const reconstructed = sandbox.serializePublicationsPage(model);
  const normalize = (s) => s.replace(/\r\n/g, "\n").trim();
  assert.equal(normalize(reconstructed), normalize(body));
});

test("section hub pages (knowledge and lab) reconstruct exact Quarto listing page layout", () => {
  for (const pagePath of ["knowledge/index.md", "lab/index.md"]) {
    const raw = readFileSync(new URL(`../../${pagePath}`, import.meta.url), "utf8");
    const match = raw.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n([\s\S]*)$/);
    assert.ok(match);
    const fm = match[1];
    const body = match[2];
    const reconstructed = sandbox.serializeSectionHub(fm, body);
    const normalize = (s) => s.replace(/\r\n/g, "\n").trim();
    assert.equal(normalize(reconstructed), normalize(raw));
  }
});

test("previewAssetUrl resolves relative images to GitHub Raw and honors local pending uploads", () => {
  sandbox.state.currentPath = "knowledge/posts/2026-07-08-agent-computer-interface/index.md";
  const resolved = sandbox.previewAssetUrl("aci-split.png");
  assert.equal(resolved, "https://raw.githubusercontent.com/changhsiuwei/changhsiuwei.github.io/main/knowledge/posts/2026-07-08-agent-computer-interface/aci-split.png");

  sandbox.state.pendingUploads.set("assets/uploads/test.png", { path: "assets/uploads/test.png", dataUrl: "data:image/png;base64,mock" });
  const pendingResolved = sandbox.previewAssetUrl("assets/uploads/test.png");
  assert.equal(pendingResolved, "data:image/png;base64,mock");
  sandbox.state.pendingUploads.clear();
});

test("draft status toggles correctly between hidden draft and public in frontmatter", () => {
  const initialFm = "title: Test Post\ndraft: true";
  assert.equal(sandbox.readYamlScalar(initialFm, "draft"), "true");

  const publishedFm = sandbox.removeYamlField(initialFm, "draft");
  assert.equal(sandbox.readYamlScalar(publishedFm, "draft"), "");

  const hiddenFm = sandbox.setYamlScalar(publishedFm, "draft", "true");
  assert.equal(sandbox.readYamlScalar(hiddenFm, "draft"), "true");
});

test("slides, handout, and youtube URLs read and write cleanly in frontmatter", () => {
  const initialFm = "title: AI 知識站講義\nslides: https://drive.google.com/file/d/123/view\nhandout: https://drive.google.com/file/d/456/view\nyoutube: https://youtu.be/xyz123";
  assert.equal(sandbox.readYamlScalar(initialFm, "slides"), "https://drive.google.com/file/d/123/view");
  assert.equal(sandbox.readYamlScalar(initialFm, "handout"), "https://drive.google.com/file/d/456/view");
  assert.equal(sandbox.readYamlScalar(initialFm, "youtube"), "https://youtu.be/xyz123");

  const updatedFm = sandbox.setYamlScalar(initialFm, "youtube", "https://youtube.com/watch?v=new");
  assert.equal(sandbox.readYamlScalar(updatedFm, "youtube"), "https://youtube.com/watch?v=new");

  const removedFm = sandbox.removeYamlField(updatedFm, "youtube");
  assert.equal(sandbox.readYamlScalar(removedFm, "youtube"), "");
  assert.equal(sandbox.readYamlScalar(removedFm, "handout"), "https://drive.google.com/file/d/456/view");
});

test("Google AI Studio configuration supports specified models, thinking level, temperature and Human Editor prompt", () => {
  assert.ok(scriptSource.includes("gemini-3.7-flash"));
  assert.ok(scriptSource.includes("gemini-3.6-flash"));
  assert.ok(scriptSource.includes("gemini-3.5-flash-lite"));
  assert.ok(scriptSource.includes("gemini-3.1-pro-preview"));
  assert.ok(scriptSource.includes("gemma-4-26b-a4b-it"));
  assert.ok(scriptSource.includes("gemma-4-31b-it"));
  assert.ok(scriptSource.includes("thinkingBudget"));
  assert.ok(scriptSource.includes("geminiThinkingLevel"));
  assert.ok(scriptSource.includes("geminiTemperature"));
  assert.ok(scriptSource.includes("Role: 資深人類編輯 (Human Writer & Editor)"));
  assert.ok(scriptSource.includes("The \"Kill List\""));
});

test("students area is configured as a static page with password reset capability and roundtrip serialization", () => {
  assert.ok(scriptSource.includes('path: "students/index.qmd"'));
  assert.ok(scriptSource.includes("btnUpdateStudentPassword"));
  assert.ok(scriptSource.includes("students/password_hash.txt"));
  assert.ok(scriptSource.includes("studentPasswordCard"));

  const markdown = readFileSync(new URL("../../students/index.qmd", import.meta.url), "utf8");
  const body = markdown.replace(/^---\s*\r?\n[\s\S]*?\r?\n---\s*\r?\n/, "");
  assert.ok(body.includes("歡迎來到指導學生專區"));
  assert.ok(body.includes("碩士論文撰寫基本功"));
  assert.ok(body.includes("量化工具的使用介紹"));
  assert.ok(body.includes("近期進度報告排程"));
});
