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

const sandbox = { crypto: { randomUUID: () => "test-layout" } };
vm.runInNewContext([
  productionFunction("isProtectedLayoutLine"),
  productionFunction("splitTableRow"),
  productionFunction("parseTable"),
  productionFunction("findFencedDivEnd"),
  productionFunction("parseActivityGrid"),
  productionFunction("cleanActivityField"),
  productionFunction("serializeActivityGrid"),
  productionFunction("protectLayoutSyntax"),
  "this.findFencedDivEnd = findFencedDivEnd;",
  "this.parseActivityGrid = parseActivityGrid;",
  "this.serializeActivityGrid = serializeActivityGrid;",
  "this.protectLayoutSyntax = protectLayoutSyntax;"
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
    { date: "July 18", venue: "長庚大學 AI EMBA", topic: "AI策略會計：用AI做銷售預算" },
    { date: "June 13", venue: "長庚大學 AI EMBA", topic: "AI策略會計：基礎AI工具工作坊" }
  ]);
  assert.equal(sandbox.serializeActivityGrid(grids[0]), grids[0].originalSource);

  const body = markdown.replace(/^---\s*\r?\n[\s\S]*?\r?\n---\s*\r?\n/, "");
  const protectedContent = sandbox.protectLayoutSyntax(body);
  assert.equal(protectedContent.activityModels.size, 2);
  assert.equal(protectedContent.editorBody.includes("::: {.grid}"), false);
  assert.equal(protectedContent.editorBody.includes("July 18"), false);
  assert.match(protectedContent.editorBody, /<!--HWCMS-LAYOUT-test-layout-/);
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

test("incomplete new activity remains recoverable as a local draft", () => {
  const markdown = readFileSync(new URL("../../activities/index.md", import.meta.url), "utf8");
  const model = activityGrids(markdown)[0];
  model.events.unshift({ date: "", venue: "", topic: "" });
  model.dirty = true;
  const reparsed = sandbox.parseActivityGrid(sandbox.serializeActivityGrid(model), model.year);
  assert.ok(reparsed);
  assert.deepEqual(JSON.parse(JSON.stringify(reparsed.events[0])), { date: "", venue: "", topic: "" });
});
