# 從這裡開始：新同事與 Gemini 接手指南

這是一個已上線的正式網站與管理後台，不是空白範例。接手目標是先完整重現現況，再進行任何改版。公開網站、GitHub 儲存庫、Cloudflare Worker、Access 與網域都已存在，除非負責人明確要求，不得重建第二套同名資源。

## 交接成功的定義

新環境完成下列條件才算接手成功：

- 能從 GitHub clone `changhsiuwei/changhsiuwei.github.io` 並確認 `main` 乾淨。
- 本機 `quarto render` 成功，產生 `_site`，且不把 `_site` 加入 Git。
- Worker `npm run check` 與 `npm test` 成功。
- 擴充套件 `node --test cloud_admin/extension/sidepanel.test.mjs` 成功。
- 新接手者能在 Brave／Chrome 載入擴充套件、登入 Cloudflare Access、讀取網站樹。
- 測試修改能建立單一 Git commit，GitHub Actions 成功，正式網站正確更新。
- GitHub Token、Cloudflare OAuth、學生區明文密碼與付款資料均未出現在 Git、終端輸出、聊天或 ZIP 中。

## 新 AI 的強制工作規則

Gemini 或其他 AI 讀取此專案後，先執行唯讀盤點，不要直接部署：

1. 完整閱讀 `LOG.md` 與 `handoff` 目錄。
2. 執行 `git status --short --branch`、`git remote -v`、`git log -5 --oneline`。
3. 確認目前分支是 `main`，遠端是 `changhsiuwei/changhsiuwei.github.io`。
4. 確認沒有使用者尚未提交的修改；若有，先回報，不得覆寫。
5. 先跑本機測試與 Quarto 渲染，再碰 Cloudflare 或 GitHub 設定。
6. 比對新擴充套件 ID、Access Audience、允許信箱與 Worker 設定。
7. 任何變更先說明影響範圍與回復方式；涉及付款、網域購買、Token 建立、刪除資源或放寬權限，必須由使用者本人確認。

禁止事項：

- 不得執行 `git reset --hard`、刪除儲存庫、刪除 Worker、刪除網域或強制推送 `main`。
- 不得手動編輯 `gh-pages`；它是 GitHub Actions 的可重建輸出。
- 不得把 `GITHUB_TOKEN` 放進 `wrangler.jsonc`、`.env`、README、聊天或截圖。
- 不得把 `cloud_admin/worker/wrangler.jsonc`、`.dev.vars`、`students/.password_secret.txt`、Wrangler OAuth 設定或瀏覽器個人資料加入 Git。
- 不得把 Access 政策改成 Everyone，或把 `ALLOWED_ORIGINS` 改成萬用字元。
- 不得只看預覽就宣布成功；最終證據必須包含 Quarto render、Actions 與正式網址。

## 第一次接手的執行順序

在 PowerShell 中：

```powershell
git clone https://github.com/changhsiuwei/changhsiuwei.github.io.git
Set-Location .\changhsiuwei.github.io
git status --short --branch
git remote -v
git log -5 --oneline
```

若目前工作資料夾已經是 clone，跳過第一行，只做檢查。接著依序執行：

```powershell
quarto check
quarto render

Set-Location .\cloud_admin\worker
npm ci
npm run check
npm test
Set-Location ..\..

node --test .\cloud_admin\extension\sidepanel.test.mjs
```

只有全部通過，才進入 GitHub 與 Cloudflare 帳號配置。詳細步驟見：

- `handoff/GITHUB_SETUP.md`
- `handoff/CLOUDFLARE_SETUP.md`
- `handoff/BUILD_TEST_DEPLOY.md`

## 本專案的權威來源順序

發生內容不一致時，依以下順序判斷：

1. GitHub 儲存庫 `main` 的最新提交：網站與後台原始碼。
2. Cloudflare Dashboard：Access、Worker 部署與 Secret 是否存在。
3. GitHub Actions：渲染與發布結果。
4. GitHub Pages `gh-pages`：自動產生的公開檔案。
5. 正式網站：可能受 DNS 或瀏覽器快取影響。
6. 瀏覽器 local storage／IndexedDB：只是一台電腦的未發布草稿，不是正式內容。

`gh-pages`、`_site` 與瀏覽器草稿都不能反過來取代 `main`。

## 登入與授權的責任分工

由新同事本人完成：

- GitHub 登入、2FA、建立 fine-grained Token、最後按 Generate token。
- Cloudflare 登入、Wrangler OAuth 授權、付款或註冊人資料。
- 在安全提示中貼入 Secret。
- Access 的信箱驗證。

AI 可以協助：

- 核對選項與最小權限。
- 產生設定檔中的非機密值。
- 執行測試、部署命令與狀態查詢。
- 讀取不包含 Secret 值的設定與部署結果。

## 最小接手資訊

| 資源 | 值 |
|---|---|
| GitHub repo | `https://github.com/changhsiuwei/changhsiuwei.github.io` |
| 正式分支 | `main` |
| 發布分支 | `gh-pages`，不可手動維護 |
| 正式網址 | `https://changhsiuwei.com/` |
| Worker | `hw-chang-site-admin-api` |
| Worker URL | `https://hw-chang-site-admin-api.hw-chang-site-admin-worker.workers.dev` |
| Access team domain | `jolly-mode-64a2.cloudflareaccess.com` |
| 管理者信箱 | `d08722002@ntu.edu.tw` |
| Secret 名稱 | `GITHUB_TOKEN`，值不在交接包內 |
| 擴充套件版本 | `1.0.2` |
| Worker package 版本 | `1.0.0` |

新電腦的擴充套件 ID 通常不是舊值。請以實際安裝後顯示的 ID 為準，按照 `handoff/CLOUDFLARE_SETUP.md` 更新 Worker 與 Access CORS。

## 建議 Gemini 的第一個回報格式

在採取任何寫入動作前，先回報：

```text
盤點完成：
- Repo / branch / HEAD：
- 工作樹是否乾淨：
- Quarto render：
- Worker check / tests：
- Extension tests：
- 擴充套件實際 ID：
- Worker / Access / Secret 名稱是否存在：
- GitHub Pages / HTTPS：
- 發現的差異與建議：
- 尚未執行的外部變更：
```

若任何一項不確定，先停止部署，保留證據並查明原因。
