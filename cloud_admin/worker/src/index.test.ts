import assert from "node:assert/strict";
import test from "node:test";
import { isSupportedImage, normalizeEditablePath } from "./index.ts";

test("allows only the intended editable paths", () => {
  assert.equal(normalizeEditablePath("index.md"), "index.md");
  assert.equal(normalizeEditablePath("students/index.qmd"), "students/index.qmd");
  assert.equal(normalizeEditablePath("students/password_hash.txt"), "students/password_hash.txt");
  assert.equal(normalizeEditablePath("knowledge/posts/safe-post/index.md"), "knowledge/posts/safe-post/index.md");
  assert.equal(normalizeEditablePath("assets/uploads/photo.webp"), "assets/uploads/photo.webp");
});

test("rejects traversal, configuration, executable, and malformed paths", () => {
  for (const value of [
    "../_quarto.yml",
    "%2e%2e/_quarto.yml",
    ".github/workflows/publish.yml",
    "knowledge/posts/post/script.js",
    "assets/uploads/../secret.png",
    "assets/uploads/file.svg",
    "/index.md",
    "knowledge//posts/test/index.md"
  ]) {
    assert.throws(() => normalizeEditablePath(value), value);
  }
});

test("checks image signatures before upload", () => {
  assert.equal(isSupportedImage("assets/uploads/a.png", Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])), true);
  assert.equal(isSupportedImage("assets/uploads/a.png", Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7])), false);
  assert.equal(isSupportedImage("assets/uploads/a.jpg", Uint8Array.from([0xff, 0xd8, 0xff])), true);
  assert.equal(isSupportedImage("assets/uploads/a.webp", new TextEncoder().encode("RIFF0000WEBP")), true);
});
