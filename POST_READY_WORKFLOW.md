# post_ready 發文流程

`post_ready/` 是本機待發文匣。你可以把每篇文章放進一個日期命名的資料夾，例如：

```text
post_ready/
  2026-07-08/
    metadata.yml
    content.md
    figure-1.png
```

當你對 Codex 說「幫我發文」時，Codex 會：

1. 檢查 `post_ready/` 內尚未發布的日期資料夾。
2. 讀取 `content.md`、`post.md`、`index.md`、`.txt` 或 `.tex`。
3. 複製圖片到 `knowledge/posts/<slug>/`，並修正 Markdown 圖片路徑。
4. 若資料夾只有 PDF，或 TeX 需要圖像重製，Codex 會先擷取圖片、整理文字，必要時用 TikZ 或產生圖檔補上說明圖。
5. 產生正式貼文 `knowledge/posts/<slug>/index.md`。
6. 執行 `quarto render`、Git commit、push，並等待 GitHub Actions 完成。

## 最簡操作

把素材放入：

```text
post_ready/2026-07-08/
```

然後告訴 Codex：

```text
幫我發文
```

Codex 會執行：

```powershell
Rscript publish_ready_posts.R --publish
```

## 建議 metadata.yml

```yaml
title: 文章標題
date: 2026-07-08
author: 張修瑋
categories: AI教育, 教學實踐
```

`date` 可省略，系統會從資料夾名稱抓日期。

## 支援檔案

- `.md`、`.qmd`：直接作為文章內容。
- `.txt`：作為純文字內容匯入。
- `.tex`：做基本 LaTeX 到 Markdown 轉換；複雜表格、TikZ、公式圖需由 Codex 進一步整理。
- `.pdf`：Codex 會先擷取內容與圖片，再整理成 `content.md`。
- `.png`、`.jpg`、`.jpeg`、`.webp`、`.gif`、`.svg`：自動複製到正式文章資料夾。

## 發布後

成功匯入後，原始資料夾會移到：

```text
post_ready/_published/
```

這些原始素材只留在本機，不會被 GitHub 同步。
