# 故障排除與已知事件

先判斷故障位於哪一層，不要同時修改所有系統：

```text
編輯器顯示問題
→ Worker / Access / CORS
→ GitHub main commit
→ Quarto Actions
→ gh-pages / Pages
→ DNS / HTTPS / 瀏覽器快取
```

## 快速診斷表

| 症狀 | 最可能原因 | 第一個檢查 |
|---|---|---|
| 編輯器出現 `HWCMS-LAYOUT` 或 Quarto 語法 | Brave 仍載入舊版或殘留舊草稿 | 擴充版本 1.0.2、Reload、清該頁草稿 |
| 「無法安全對應原版面」 | 大段自由文字修改破壞早期 mapping | 改用活動／表格專用欄位，重新讀取 |
| 預覽沒有圖片 | 相對路徑解析、正式 URL、draft blob 問題 | Network、site URL、上傳格式與大小 |
| API 顯示 CORS error／403 | extension ID 與 origin allowlist 不同 | Brave 顯示 ID vs `ALLOWED_ORIGINS` |
| API 顯示未登入／401 | Access cookie、AUD、email 不一致 | 先直接開 Worker URL 登入 |
| Worker 顯示 GitHub 401／403 | PAT 到期、repo 或 Contents 權限錯 | GitHub token 設定與 Worker Secret |
| 發布回 409 | 編輯期間 `main` 已有別的 commit | 重新讀取後重做／合併修改 |
| Git commit 有了但網站沒變 | Actions render 或 Pages deploy 失敗／快取 | GitHub Actions，再看正式站 |
| GitHub Pages 404 | Pages source、CNAME 或 workflow output 錯 | Settings → Pages 與 `gh-pages` |
| 自訂網域失效 | DNS、Pages custom domain、憑證或續約 | `changhsiuwei.github.io` 是否正常 |

## 編輯頁面出現奇怪符號或版面崩壞

這是本專案已經處理過的核心事件。舊編輯器會把 Quarto layout marker 與 grid／callout 語法混進 WYSIWYG，使用者大段修改後，程式無法安全映射回原始版面。

正確處理：

1. 不要按發布。
2. 開 `brave://extensions` 或 `chrome://extensions`。
3. 確認 `H.W. Chang Website Admin` 版本是 `1.0.2`。
4. 按 Reload／重新載入。
5. 關閉舊的後台分頁，重新點擴充套件圖示。
6. 若同一頁仍載入舊內容，在設定／草稿功能清除該頁的本機草稿，再由 GitHub 重新讀取。
7. 活動頁應顯示年份與「日期／單位／主題」卡片；表格應顯示儲存格；畫面不應出現 layout marker。

不要用搜尋取代直接刪除 marker 後發布。Marker 只是一個症狀，若結構模型已錯，刪文字可能讓 Quarto grid 更壞。

若最新版仍能重現：

```powershell
node --test .\cloud_admin\extension\sidepanel.test.mjs
```

保留：目標檔案的 Git SHA、頁面 path、重現前的原始 Markdown、編輯動作、瀏覽器 console error。不得保留 Access cookie 或 Token。

## 網頁打開後未正確渲染

先在本機直接渲染：

```powershell
quarto render
```

若失敗，錯誤在 `main` 原始內容或 Quarto 環境，還沒到 GitHub Pages。若成功：

```powershell
gh run list --repo changhsiuwei/changhsiuwei.github.io --limit 5
gh api repos/changhsiuwei/changhsiuwei.github.io/pages
```

檢查順序：

1. `Quarto Publish` 是否 success。
2. `pages build and deployment` 是否 success。
3. Pages status 是否 `built`，source 是否 `gh-pages /`。
4. `gh-pages` 根目錄是否含目標 HTML、資產、`.nojekyll`、`CNAME`。
5. `https://changhsiuwei.github.io` 是否正常。
6. `https://changhsiuwei.com` 是否只是舊快取。

目前活動頁畫面採桌面三欄式「日期／單位與活動主題」排版。若內容存在但位置不如預期，可能是 CSS／viewport 問題，不一定是 render 失敗。用 Quarto 本機預覽與正式站相同 viewport 比較，再定位 `custom.scss`。

## 圖片預覽不出現

既有圖片：

- 確認後台設定中的正式網站 URL 為 `https://changhsiuwei.com/`。
- 檢查 Markdown 圖片 path 是否能相對於目前頁面解析。
- 直接在正式網站開圖片 URL。
- 查看瀏覽器 DevTools Network 是 404、CORS 還是 CSP。

新上傳圖片：

- 只接受 `.png`、`.jpg`、`.jpeg`、`.webp`。
- 單檔最大 4 MiB，整批最大 8 MiB。
- 圖片內容必須和副檔名 magic bytes 相符，單純改副檔名會被拒絕。
- 發布前應由 IndexedDB blob 顯示本機預覽；若分頁重開後消失，檢查 IndexedDB `hw-chang-site-admin-drafts`。
- 發布目的地通常是文章目錄或 `assets/uploads`，需符合 Worker path allowlist。

若預覽有圖但正式站沒有，查看 commit 是否包含圖片檔與 Markdown path，再查 Quarto output。

## Cloudflare Access／CORS 失敗

先直接開 Worker URL：

```text
https://hw-chang-site-admin-api.hw-chang-site-admin-worker.workers.dev
```

完成 Access 登入後回到後台重試。不要用 Incognito 排查。

仍失敗時比對：

```text
實際 extension origin
↔ wrangler.jsonc ALLOWED_ORIGINS
↔ 已部署 Worker vars
↔ Access CORS settings
```

再比對：

```text
Access application Audience
↔ CF_ACCESS_AUD

Access allow email / 本次登入 email
↔ ALLOWED_EMAIL

Zero Trust team domain
↔ CF_ACCESS_TEAM_DOMAIN
```

OPTIONS 403 通常是 Access 沒有 Bypass OPTIONS to origin。正式 GET／POST 401 通常是 Access cookie 或 Worker JWT 驗證。

## Worker 發布回 409

409 是安全機制，不是資料損壞。它表示 UI 開始編輯後，GitHub `main` 已被另一個人、另一個分頁或 Actions 以外的流程更新。

處理：

1. 複製自己的修改到暫存文字，或保留 UI 草稿。
2. 重新讀取 GitHub 版本。
3. 比較新內容與草稿。
4. 人工合併，再發布。

不要把 Worker 改成 force update，也不要移除 `baseCommitSha` 檢查。

## GitHub push 選錯帳號

原開發機有多個 GitHub 帳號，曾選到只有讀取權限的帳號。檢查：

```powershell
gh auth status
git remote -v
git config user.name
git config user.email
```

原機器必要時使用：

```powershell
$env:GCM_INTERACTIVE = 'Never'
git -c credential.username=changhsiuwei push origin main
```

新接手環境應改用正確的 collaborator 身分，不應複製原機器 Credential Manager。

## Wrangler 在含 `&` 的 Windows 路徑失敗

專案父目錄為 `AI 服務&開發`。某些 shell 包裝的 `npx` 命令可能誤解析 `&`。在 Worker 目錄改用：

```powershell
npm run check
npm test
npm run deploy

node .\node_modules\wrangler\bin\wrangler.js whoami
node .\node_modules\wrangler\bin\wrangler.js secret list
```

不要把整條命令再包進 `cmd /c`。

## Pages 與 DNS

```powershell
Resolve-DnsName changhsiuwei.com -Type A
Resolve-DnsName www.changhsiuwei.com
```

apex 預期為 GitHub Pages 四筆 IP。若 `changhsiuwei.github.io` 正常而自訂網域錯誤，檢查：

- Cloudflare Registrar 是否 Active／已續約。
- DNS 是否被誤刪或出現衝突 A／AAAA／CNAME。
- GitHub Pages custom domain 是否仍為 `changhsiuwei.com`。
- `CNAME` 是否仍在 `main`、Quarto output 與 `gh-pages`。
- HTTPS certificate 狀態。

DNS 調整後可能需要傳播時間，避免重複新增相同記錄。

## 最小化回復策略

一次只回復一層：

- UI 程式錯誤：revert 該 UI commit，重新載入擴充套件。
- Worker 錯誤：Cloudflare 回復上一 deployment。
- 內容錯誤：Git revert 該內容 commit，讓 Actions 重建。
- workflow 錯誤：revert workflow commit，不直接改 `gh-pages`。
- DNS 錯誤：依 GitHub 官方值修正，等待傳播；不要動 Worker。

每次回復後重新跑完整成功鏈，留下 commit、run URL 與時間。
