# GitHub 設定與維運指南

## 儲存庫與分支

目前正式儲存庫：

```text
Owner: changhsiuwei
Repository: changhsiuwei.github.io
URL: https://github.com/changhsiuwei/changhsiuwei.github.io
Visibility: Public
Default/source branch: main
Published output branch: gh-pages
```

`main` 是唯一可人工維護的正式原始碼。`gh-pages` 每次發布都會被 workflow 以乾淨輸出 force push，因此不可把人工修改或唯一資料放在 `gh-pages`。

## Clone 與本機 Git 身分

```powershell
git clone https://github.com/changhsiuwei/changhsiuwei.github.io.git
Set-Location .\changhsiuwei.github.io
git status --short --branch
git remote -v
git config user.name
git config user.email
```

新同事應使用獲得授權的 GitHub 帳號，不要共用原持有人的瀏覽器 session 或 Windows Credential Manager。若只是維護程式，建議把同事加入 repo collaborator；若需管理 Pages、Actions、Secrets 或自訂網域，需另給相應 repo administration 權限。

本機若同時登入多個 GitHub 帳號，先確認：

```powershell
gh auth status
gh repo view changhsiuwei/changhsiuwei.github.io
```

原開發電腦曾發生 `gh` 目前帳號是 `GM-andychang` 且只有讀取權限，而 Windows Credential Manager 另有 `changhsiuwei` 憑證。必要時原機器可用：

```powershell
$env:GCM_INTERACTIVE = 'Never'
git -c credential.username=changhsiuwei push origin main
```

新電腦不應照抄這個 workaround；應正確登入有權限的接手帳號。

## GitHub Actions 必要設定

`.github/workflows/publish.yml` 已定義：

- `main` push 或 manual dispatch 時執行。
- job 權限為 `contents: write`。
- `actions/checkout@v5`。
- `quarto-dev/quarto-actions/setup@v2`。
- `quarto render`。
- 複製 `_site` 至乾淨暫存目錄，加入 `.nojekyll`。
- 建立全新 `gh-pages` commit 並 force push。

`.github/workflows/render-check.yml` 已定義：

- Pull Request 到 `main` 或 manual dispatch 時執行。
- 只給 `contents: read`。
- 只跑 `quarto render`，不部署。

在 GitHub repo 確認：

1. Settings → Actions → General。
2. Workflow permissions 至少允許 workflow 取得 YAML 內宣告的 `contents: write`；若組織政策阻擋，需由管理者調整。
3. Actions 分頁可看到 `Quarto Publish` 與 `Quarto Render Check`。
4. 不要新增名為 `GITHUB_TOKEN` 的自訂 Secret 來取代 GitHub Actions 的內建 token；workflow 內 `${{ secrets.GITHUB_TOKEN }}` 由 GitHub 自動提供。

## GitHub Pages 設定

在 Settings → Pages：

```text
Build and deployment source: Deploy from a branch
Branch: gh-pages
Folder: / (root)
Custom domain: changhsiuwei.com
Enforce HTTPS: On
```

目前 API 複查值：

```text
status: built
build_type: legacy
source: gh-pages /
custom domain: changhsiuwei.com
protected domain: verified
HTTPS certificate: approved
HTTPS enforced: true
```

專案根目錄 `CNAME` 必須只有：

```text
changhsiuwei.com
```

`_quarto.yml` 的 `project.resources` 必須包含 `CNAME`，否則渲染輸出可能缺少自訂網域檔案。

## 建立 Worker 使用的 fine-grained Token

Token 應由 repo 擁有者或獲授權管理者本人建立。依 GitHub 官方建議使用 fine-grained PAT 並採最小權限：

1. GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens。
2. Generate new token。
3. Resource owner 選擇擁有 `changhsiuwei.github.io` 的帳號。
4. Expiration 選擇組織允許的短期限；本專案原先為 90 天。
5. Repository access 選 Only select repositories。
6. 只選 `changhsiuwei.github.io`。
7. Repository permissions → Contents → Read and write。
8. Metadata 會自動有 Read-only，其餘權限全部維持 No access。
9. Generate token 由使用者本人按下，立即複製到密碼管理器或直接輸入 Wrangler Secret 提示。

不要把 Token 貼進聊天。設定 Worker Secret：

```powershell
Set-Location .\cloud_admin\worker
npm ci
node .\node_modules\wrangler\bin\wrangler.js secret put GITHUB_TOKEN
```

Wrangler 顯示 `Enter a secret value` 時貼上 Token 並按 Enter；不顯示字元是正常的。確認只列出名稱：

```powershell
node .\node_modules\wrangler\bin\wrangler.js secret list
```

輸出應包含 `GITHUB_TOKEN`，但不會也不應顯示值。

## Token 輪替

1. 在 GitHub 先建立新 token，不要先撤銷舊 token。
2. 在 Worker 目錄再次執行 `secret put GITHUB_TOKEN`，以同名 Secret 覆蓋。
3. 完成 Access 登入後，從擴充套件讀取 `/api/session`、`/api/tree`。
4. 執行一個可回復的測試提交，確認 Actions 與正式網站。
5. 確認新 token 正常後，在 GitHub 撤銷舊 token。
6. 更新團隊密碼管理器中的到期日與負責人，不把日期寫成祕密值。

Token 到期的典型症狀是 Worker 可以通過 Access，但呼叫 GitHub 時回傳 `GitHub request failed with status 401` 或 `403`。

## 日常發布與驗證

從 UI 發布後：

```powershell
gh run list --repo changhsiuwei/changhsiuwei.github.io --limit 5
gh api repos/changhsiuwei/changhsiuwei.github.io/pages
```

若要手動觸發既有 workflow：

```powershell
gh workflow run "Quarto Publish" --repo changhsiuwei/changhsiuwei.github.io
```

只有在 `main` 已有正確 commit、只是 workflow 未執行時才手動重跑。若 `quarto render` 失敗，先修 `main`，不要反覆重跑或直接修改 `gh-pages`。

## 建議的團隊開發流程

擴充套件、Worker、workflow 或網站結構變更應：

1. 從最新 `main` 建短期 feature branch。
2. 執行所有本機檢查。
3. push branch 並建立 Pull Request。
4. 確認 `Quarto Render Check` 成功。
5. 人工 review Worker 可編輯路徑、安全驗證與 UI 映射。
6. 合併到 `main`，再監看正式發布。

單純透過管理後台修改公開內容，目前會直接建立 `main` commit，這是現有產品設計，不等同於開發者改程式的流程。

## 官方文件

- [GitHub：fine-grained personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)
- [GitHub：Pages 自訂網域](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)
- [Quarto：GitHub Pages](https://quarto.org/docs/publishing/github-pages.html)
