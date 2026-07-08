# Quarto Website Editing Kit

這個資料夾是網站編輯用的整理包，已把網站內容、Quarto 設定、Shiny CMS、Obsidian 編輯設定與本機密碼檔集中在同一個地方。

完整維護流程請先閱讀 `WEBSITE_UPDATE_MAINTENANCE_MANUAL.md`。

若要批次準備知識站文章，請閱讀 `POST_READY_WORKFLOW.md`。

## 快速開始

1. 開啟 `Quarto_Website.Rproj`。
2. 第一次使用先在 R Console 執行：

```r
source("install_r_packages.R")
```

如果更換 R 版本，請重新執行一次上面的指令；整理包會自動使用 `r-library/R-4.4-cms`、`r-library/R-4.6-cms` 這類 CMS 專用套件資料夾。

3. 啟動後台 CMS：

```r
source("run_cms.R")
```

若目前 R session 已載入舊版套件，`run_cms.R` 會自動用乾淨的背景 R session 啟動 CMS。

4. 預覽網站：

```powershell
quarto preview
```

5. 產生靜態網站：

```powershell
quarto render
```

## 主要內容

- `_quarto.yml`：全站設定與導覽列。
- `index.md`、`about/`、`activities/`、`publications/`、`lab/`：主要頁面。
- `knowledge/`：知識站與貼文內容；請在 CMS 的「知識站管理」新增、編輯、公開或隱藏貼文。
- `post_ready/`：本機待發文匣；把日期資料夾、文字檔、圖片、PDF 或 TeX 放入後，可請 Codex「幫我發文」。
- `publish_ready_posts.R`：將 `post_ready/` 內容轉成正式知識站貼文，並可自動 render、commit、push。
- `students/`：學生專區、密碼頁與密碼 hash。
- `admin_app/`：Shiny CMS 後台。
- `.obsidian/`、`.makemd/`、`.space/`：Obsidian 編輯設定。
- `.github/workflows/publish.yml`：GitHub Pages 發布流程。
- `r-library/`：本整理包自己的 R 套件資料夾，執行安裝腳本後會出現。

## 沒有放進來的東西

- `_site/`：Quarto 產出的網站，可以用 `quarto render` 重建。
- `.quarto/`、`.Rproj.user/`：本機快取與 IDE 狀態，可自動重建。

## 注意

`students/.password_secret.txt` 已包含在這個本機整理包中，方便 CMS 顯示目前密碼。這個檔案不要上傳到 GitHub。
