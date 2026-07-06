---
name: "Maintain Quarto Shiny CMS"
description: "Guidelines and workflows for maintaining, updating, and extending the custom Quarto website with a Shiny CMS backend. Use this whenever asked to fix website issues, add pages, update the CMS, or handle the password system."
---

# 網站維護與更新指南 (Maintain Quarto Shiny CMS)

這份文件記錄了本專案 (Quarto + Shiny CMS) 的系統架構、歷史除錯經驗與未來維護準則。當需要為此網站進行更新、功能擴充或介面改良時，請務必遵循以下規範。

## 1. 系統架構總覽 (Architecture Overview)
- **前端展示**：使用 Quarto 建立的靜態網站 (HTML/CSS/JS)，透過 GitHub Actions 自動編譯並部署到 `gh-pages` 分支。
- **後端管理 (Shiny CMS)**：透過 R Shiny (`admin_app/app.R`) 建立的本地端編輯器。讓使用者能透過 GUI 介面編寫 Markdown、上傳圖片、修改密碼，並透過 `git` 系統一鍵推播上網。

## 2. 密碼保護機制 (Password Logic)
- **前端驗證**：位於 `students/_password.html`，透過 JS 讀取 `students/password_hash.txt` 進行 SHA-256 驗證。
- **快取問題迴避**：`fetch` 時必須加上時間戳記（`?t=...`）作為 Cache-buster，避免瀏覽器使用舊的快取密碼檔。
- **防止輸入空白**：在 `app.R` 寫入 Hash 與 `_password.html` 讀取密碼時，**皆須使用 `trim()`** 以防止使用者誤觸空白鍵導致 Hash 不符。
- **本地明文備份**：密碼設定成功後，會在本地產生 `.password_secret.txt`，此檔案已加入 `.gitignore` 絕對不可上傳。Shiny UI 會讀取此檔以提示使用者目前密碼。

## 3. UI 介面與排版改良 (UI & Layout Styling)
- **CSS 網格系統保護**：Quarto 的核心排版依賴 `#quarto-content` 的 CSS Grid。在解開密碼牆時，**絕對禁止**使用 `style.display = 'block'`，這會徹底摧毀排版！應使用 CSS 類別開關（例如 `:not(.unlocked) { display: none !important; }`）。
- **響應式排版 (Responsive Design)**：絕對不要對 `.container` 寫死 `max-width`，這會與 Bootstrap 的 RWD 媒體查詢衝突，導致手機版介面重疊。
- **局部 About 版型**：在 Quarto 的 YAML 中使用 `about: id: xxx`，並在內文使用 `:::{#xxx}` 來限定頭像版面的範圍，這樣下方的「表格」或大面積元素才能順利展開為滿版寬度，避免過度擁擠。

## 4. Shiny CMS 維護 (Shiny Maintenance)
- **RStudio 白畫面 Bug**：RStudio 內建的 Viewer 容易在多次啟動 Shiny 後當機（白畫面）。請在 `app.R` 結尾強制使用 `shinyApp(ui, server, options = list(launch.browser = TRUE))`，以確保 App 使用使用者的預設瀏覽器 (如 Chrome) 穩定開啟。
- **檔案路徑與鎖定**：如果遇到 Quarto 預覽卡住或無法寫入檔案，這通常是 `quarto preview` 程序鎖死檔案。在必要時，可以透過終端機執行 `Stop-Process -Name quarto -Force` 強制關閉。

## 5. 發布與更新流程 (Deployment Pipeline)
- **本地編輯不等於上線**：使用者在 Shiny 中點擊的「儲存」皆只會在本地端生效。
- **一鍵發布邏輯**：Shiny 內的「🚀 一鍵發布至 GitHub」按鈕實際上是執行 `git add .`, `git commit`, `git push`。
- **時間差問題**：推播至 GitHub 後，GitHub Actions 需要約 **2-3 分鐘** 來執行 `quarto publish`。開發者必須提醒使用者：發布後請等待 3 分鐘，並在瀏覽器使用 `Ctrl + F5` 清除快取，才能看到最新結果。
