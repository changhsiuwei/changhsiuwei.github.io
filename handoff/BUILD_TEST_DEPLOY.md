# 建置、測試、發布與驗收 Runbook

## 環境需求

| 工具 | 用途 | 檢查命令 |
|---|---|---|
| Git | 原始碼與版本 | `git --version` |
| GitHub CLI | Actions／Pages 狀態查詢，可選但建議 | `gh --version` |
| Quarto CLI | 網站渲染 | `quarto check` |
| Node.js + npm | Worker 與測試 | `node --version`; `npm --version` |
| Brave 或 Chrome | 載入 Manifest V3 擴充套件 | 瀏覽器 About 頁 |
| R + 必要套件 | 本機 Shiny CMS 備援；純 Quarto 靜態渲染未必需要 | `Rscript --version` |

Node 套件版本由 `cloud_admin/worker/package-lock.json` 鎖定，接手與 CI 驗證應使用 `npm ci`，不要先隨意升級。

## 一鍵式本機驗證順序

在 repo 根目錄執行：

```powershell
git status --short --branch
quarto check
quarto render
node --test .\cloud_admin\extension\sidepanel.test.mjs

Push-Location .\cloud_admin\worker
npm ci
npm run check
npm test
Pop-Location
```

目前預期結果：

- Quarto 完整渲染成功。
- Extension 4 個測試成功。
- Worker TypeScript 無型別錯誤。
- Worker 3 個測試成功。

測試涵蓋重點：

- 活動頁解析成結構化模型。
- 結構化活動可重建有效 grid。
- 不完整本機草稿可回復。
- 不含 layout marker 的文字修改仍保留 Quarto 結構。
- Worker 只允許預期編輯路徑。
- Worker 拒絕 traversal、設定檔、執行檔與異常路徑。
- 圖片副檔名與檔案簽章一致。

## Quarto 本機預覽

完整渲染：

```powershell
quarto render
```

互動預覽：

```powershell
quarto preview
```

輸出在 `_site`，該目錄已被 Git 忽略。不要把 `_site` 提交到 `main`；正式 output 由 Actions 建到 `gh-pages`。

需要核對的頁面：

- `/` 首頁
- `/about/`
- `/activities/`
- `/publications/`
- `/lab/`
- `/knowledge/`
- `/students/`
- 至少各開一篇 `lab/posts` 與 `knowledge/posts`

驗收視覺：導覽可用、中文字正常、圖片載入、callout 與 grid 未崩壞、活動年份及卡片對齊、出版品卡片與表格正常。

## Worker 本機開發

正式 Token 不應用於一般本機測試。若確實需要連 GitHub，建立短期、最小權限 token，並在被 Git 忽略的 `cloud_admin/worker/.dev.vars` 中只放本機測試值：

```text
GITHUB_TOKEN=<LOCAL_SHORT_LIVED_TOKEN>
DEV_ADMIN_EMAIL=local-admin
```

啟動：

```powershell
Set-Location .\cloud_admin\worker
npm ci
npm run dev -- --config wrangler.example.jsonc
```

Worker 只在 request hostname 本身為 `localhost` 或 `127.0.0.1` 且有 `DEV_ADMIN_EMAIL` 時略過 Access。部署到 Cloudflare 的 URL 不會接受這個開發略過。

擴充套件設定：

```text
API URL: http://localhost:8787
正式網站 URL: https://changhsiuwei.com/
```

測試結束後撤銷短期 token，刪除 `.dev.vars`。不要把其內容複製到正式 `wrangler.jsonc`。

## 擴充套件安裝與更新

1. 在 `brave://extensions` 或 `chrome://extensions` 開啟 Developer mode。
2. Load unpacked，選擇 `cloud_admin/extension`。
3. 確認名稱 `H.W. Chang Website Admin`、版本 `1.0.2`。
4. 記錄 ID，更新 Worker `ALLOWED_ORIGINS` 與 Access CORS。
5. 每次 `cloud_admin/extension` 程式變更後，在擴充功能頁按 Reload。
6. 點工具列圖示，確認開啟獨立分頁，不是側邊欄。

功能驗收：

- 首次連線能顯示 Cloudflare Access 登入。
- 登入後顯示管理者信箱與網站檔案樹。
- 正式網站網址可在設定中保存。
- 選擇頁面後顯示所見即所得內容與右側預覽。
- 既有圖片在預覽中顯示。
- 上傳 PNG／JPEG／WebP 後，發布前可預覽。
- 活動頁只顯示年份、日期、單位、主題欄位，不顯示 Quarto grid 或 `HWCMS-LAYOUT`。
- 出版品或一般頁面不顯示 callout 原始語法。
- 表格用儲存格 UI，不顯示 Markdown 分隔線。
- 重新開啟分頁能恢復未發布草稿。
- 有未保存變更時切頁或關閉有警告。

若上述任何結構化頁面顯示原始語法，不要發布，先看 `handoff/TROUBLESHOOTING.md`。

## 正式 Worker 部署

前置條件：

- `wrangler.jsonc` 的非機密設定正確。
- Secret `GITHUB_TOKEN` 已存在。
- 新 extension ID 已更新。
- Worker checks 與 tests 全部成功。

部署：

```powershell
Set-Location .\cloud_admin\worker
npm ci
npm run check
npm test
npm run deploy
```

部署後先不要立即修改正式內容；依序做：

1. 開 Worker URL 完成 Access 登入。
2. 從擴充套件呼叫 Session。
3. 讀取 Tree。
4. 讀取一個固定頁面。
5. 用一項容易核對與回復的文字進行完整測試發布。
6. 確認 Git commit author／message、Actions 與正式站。

## GitHub 發布監看

```powershell
gh run list --repo changhsiuwei/changhsiuwei.github.io --limit 10
gh api repos/changhsiuwei/changhsiuwei.github.io/pages
```

完整成功鏈：

```text
main 新 commit
→ Quarto Publish: success
→ gh-pages 新 commit
→ pages build and deployment: success
→ Pages status: built
→ https://changhsiuwei.com 正確顯示
```

正式網站可能有瀏覽器快取。後台「開啟網站」會加入更新參數；也可用無痕以外的新分頁或硬重新整理。Cloudflare Access 的 CORS 測試不要使用 Incognito。

## 發布前後驗收清單

發布前：

- [ ] `git status` 沒有不明變更。
- [ ] Quarto render 成功。
- [ ] Worker check／tests 成功。
- [ ] Extension tests 成功。
- [ ] 內容預覽中沒有版面註解或原始語法。
- [ ] 圖片在預覽中顯示。
- [ ] 更新說明可辨識且不含換行或機密。

發布後：

- [ ] Worker 回傳 `ok: true` 與 commit SHA。
- [ ] GitHub `main` 只有預期檔案被修改。
- [ ] Quarto Publish 成功。
- [ ] Pages deployment 成功。
- [ ] 正式網站的目標頁面正確。
- [ ] 手機與桌面至少各抽查一次重要版面。
- [ ] 未把 `cloud_admin` 或原始設定發布到 `gh-pages`。

## 回復方式

內容錯誤但網站可建置：以新的 revert commit 回復，不重寫 `main` 歷史。

```powershell
git revert <BAD_COMMIT_SHA>
git push origin main
```

若使用多 GitHub 帳號，先確認憑證。不要用 `git reset --hard` 或 force push `main`。

Worker 部署錯誤：先在 Cloudflare Deployments 回復前一版，再修程式、測試、重新部署。

Token 洩漏：立即 GitHub revoke，建立新 token，覆蓋 Worker Secret，驗證後追查洩漏位置。
