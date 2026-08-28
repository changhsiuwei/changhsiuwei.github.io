# 張修瑋個人網站與視覺化管理後台：任務交接紀錄

更新日期：2026-08-28（Asia/Taipei）<br>
交接狀態：可建置、可測試、可部署；正式網站與 Worker 均已上線<br>
主要儲存庫：`changhsiuwei/changhsiuwei.github.io`<br>
正式網站：<https://changhsiuwei.com>

本檔是本次專案的主交接紀錄。新同事或新的 AI 應先閱讀 [handoff/START_HERE_FOR_GEMINI.md](handoff/START_HERE_FOR_GEMINI.md)，再依其中順序讀取其餘文件。ZIP 交接包包含目前 Git 追蹤的完整原始碼、網站內容、測試與交接文件；不包含 Token、密碼、瀏覽器資料、建置輸出或本機快取。

## 一、最重要的目前狀態

| 項目 | 目前狀態 | 主要位置 |
|---|---|---|
| Quarto 網站原始碼 | `main` 為唯一正式來源 | `_quarto.yml` 與各內容目錄 |
| 公開網站輸出 | GitHub Actions 渲染後乾淨推送至 `gh-pages` | `.github/workflows/publish.yml` |
| 正式網址 | 已啟用 HTTPS，憑證已核准 | `https://changhsiuwei.com` |
| GitHub Pages | `built`，來源為 `gh-pages` 根目錄 | GitHub Settings → Pages |
| Brave／Chrome 後台 | Manifest V3、獨立分頁、版本 `1.0.2` | `cloud_admin/extension` |
| Cloudflare Worker | 已部署、版本 `1.0.0` | `cloud_admin/worker` |
| Worker API | 受 Cloudflare Access 保護 | `https://hw-chang-site-admin-api.hw-chang-site-admin-worker.workers.dev` |
| GitHub 憑證 | 僅以 Worker Secret `GITHUB_TOKEN` 儲存 | Cloudflare Workers → Settings → Variables and Secrets |
| 本機 Shiny CMS | 保留為備援編輯工具 | `admin_app/app.R` |

2026-08-28 交接前複查結果：

- Git 工作樹乾淨，`main` 與 `origin/main` 同步。
- GitHub Pages 狀態為 `built`，自訂網域驗證完成，HTTPS 強制啟用。
- 最近一次 `Quarto Publish` 與 `pages build and deployment` 均成功。
- Wrangler 已登入 Cloudflare，Worker Secret 清單只有 `GITHUB_TOKEN`。
- 正式網域解析至 GitHub Pages 的四筆 IPv4 位址。
- Worker TypeScript 檢查、Worker 測試、擴充套件測試及 Quarto 渲染均有對應驗證流程；交付前會再次執行。

## 二、專案目標與採用方案

使用者希望在 Brave／Chrome 中開啟直覺的完整後台，不接觸 Markdown、HTML 或 Quarto 版面語法，即可：

- 依照網站結構選擇頁面。
- 直接修改文字、標題、活動卡片與表格。
- 顯示既有圖片與新上傳圖片的預覽。
- 新增知識站或 AI 教學與研究文章。
- 自動保留本機草稿。
- 一鍵把一批修改寫成單一 Git commit，觸發網站重新渲染與部署。

最後採用的責任分工是：

- GitHub 保存所有正式原始內容與版本歷史。
- GitHub Actions 執行 Quarto 渲染並建立 `gh-pages`。
- GitHub Pages 提供公開網站。
- Cloudflare Registrar／DNS 管理 `changhsiuwei.com`。
- Cloudflare Access 驗證管理者身分。
- Cloudflare Worker 保存 GitHub Token，限制可編輯路徑，並代表後台呼叫 GitHub API。
- Brave／Chrome 擴充套件只提供 UI、本機草稿與預覽；不保存 GitHub 或 Cloudflare Token。

Cloudflare 不取代 GitHub Pages。它在本專案的主要用途是網域 DNS、後台身分驗證、Worker API 與 Secret 保管。

## 三、完整歷程摘要

### 既有網站與需求形成

專案原先已有 Quarto 個人網站、GitHub Pages 發布流程，以及本機 Shiny CMS。使用者提出建立 Brave／Chrome 擴充套件的需求，希望在獨立分頁管理網站、修改後一鍵同步，不使用側邊欄，也不直接暴露 Markdown／HTML 語法。

### Cloudflare 與 GitHub 身分設定

1. 使用者建立或登入 Cloudflare 帳號，並在本機授權 Wrangler。畫面中的「Authorization granted to Wrangler」表示本機 Wrangler 已取得該 Cloudflare 帳號授權，不等同於公開網站或授權 GitHub。
2. 使用者在 GitHub 建立 fine-grained personal access token。當時設定為只選擇 `changhsiuwei.github.io` 儲存庫、Repository permissions 的 Contents 設為 Read and write，其餘權限不開啟；原先到期日設定為 90 天。
3. Token 由使用者在不回顯內容的終端提示中輸入，存成 Cloudflare Worker Secret `GITHUB_TOKEN`。Token 值未寫入聊天、程式碼或 Git。
4. Cloudflare Zero Trust 已啟用。使用者自行完成需要個資或付款方式的步驟。
5. 建立保護 Worker 的 Access 應用程式，只允許指定管理者信箱；Worker 本身也會重新驗證 Access JWT、應用程式 Audience 與信箱。
6. Access 的 CORS 設定允許預檢請求到達 Worker；Worker 再用精確的擴充套件 Origin 白名單判斷 OPTIONS 與正式 API 請求。

### 視覺化後台與安全發布

1. 建立 Manifest V3 擴充套件，點擊工具列圖示時開啟獨立的 `sidepanel.html` 分頁。
2. UI 提供網站結構、頁面搜尋、所見即所得編輯、即時預覽、設定、圖片上傳、新文章、本機草稿與一鍵發布。
3. Worker 只允許固定公開頁面、`knowledge/posts`、`lab/posts` 與 `assets/uploads`，拒絕 workflow、網站設定、執行檔、私人資料與學生專區等路徑。
4. 每次發布必須帶入編輯開始時的 Git commit SHA。若 GitHub 已有別的更新，Worker 回傳 HTTP 409，避免覆蓋新內容。
5. 一次修改最多 30 個檔案、單檔最多 4 MiB、總批次最多 8 MiB。圖片僅接受 PNG、JPEG、WebP，並檢查實際檔案簽章。
6. 所有檔案先建立 blob 與 tree，再建立單一 commit，最後以非強制方式更新 `main`，確保批次修改不可分割。

### 自訂網域與 GitHub Pages

1. 使用者透過 Cloudflare Registrar 購買 `changhsiuwei.com`。網域是按年註冊，不是買斷；當時顯示約 USD 10.46／年，未來價格應以續約頁為準。
2. Cloudflare DNS 的 apex 設為 GitHub Pages 官方四筆 A 記錄：

   - `185.199.108.153`
   - `185.199.109.153`
   - `185.199.110.153`
   - `185.199.111.153`

3. `www` 應以 CNAME 指向 `changhsiuwei.github.io`；變更前仍應在 Cloudflare DNS 介面複查目前值。
4. 專案根目錄加入 `CNAME`，內容為 `changhsiuwei.com`，並在 `_quarto.yml` 的 resources 保留該檔案。
5. GitHub Settings → Pages 已設定從 `gh-pages` 根目錄發布，自訂網域為 `changhsiuwei.com`，HTTPS 已強制啟用。

### 編輯器崩壞事件與修復

使用者曾在活動頁面看到 `HWCMS-LAYOUT` 類型的註解與 Quarto 版面標記，並收到「這次修改無法安全對應原版面」訊息。根本原因是早期版本把 Quarto 版面保護標記混入視覺編輯器可見內容，而且大段修改後無法可靠地映射回原始結構。

修復分兩次完成：

- `19b00d6`（版本 1.0.1）：近期活動改為日期、單位、主題的結構化卡片編輯器，新增、刪除與重建都有自動測試。
- `ee1c0f1`（版本 1.0.2）：所有版面保護資訊只存在 JavaScript 狀態，不再送入文字編輯器；預覽時由外部結構模型重建活動與表格；開啟正式網站時加入快取更新參數。

目前新版本仍需在 Brave 的擴充功能頁按「重新載入」後才會取代瀏覽器中已載入的舊程式。若畫面仍顯示版面符號，先確認版本為 1.0.2 並重新載入，不要直接發布。

### 最近內容更新

活動頁新增 2026 年項目，包括：

- July 18，長庚大學 AI EMBA，AI策略會計：用AI做銷售預算。
- June 13，長庚大學 AI EMBA，AI策略會計：基礎AI工具工作坊。

公開網站後續已成功由 GitHub Actions 建置。若新同事再次調整此區，應使用活動卡片欄位，不要直接編輯 Quarto grid 語法。

## 四、目前的非機密設定

以下值可寫入交接文件；它們是部署識別資訊，不是 Token。實際 Token、密碼與 OAuth 憑證不得加入 Git。

| 變數 | 目前值 |
|---|---|
| `GITHUB_OWNER` | `changhsiuwei` |
| `GITHUB_REPO` | `changhsiuwei.github.io` |
| `GITHUB_BRANCH` | `main` |
| `CF_ACCESS_TEAM_DOMAIN` | `jolly-mode-64a2.cloudflareaccess.com` |
| `CF_ACCESS_AUD` | `d9f59d1ea11deb1c6d52825f1e8e9208cb37b0bb951e90fbf1fe83e60a4bfa3b` |
| `ALLOWED_EMAIL` | `d08722002@ntu.edu.tw` |
| `ALLOWED_ORIGINS` | `chrome-extension://mbanghhaabkgdkjjnbkgbfkhdihdnddo` |
| Worker 名稱 | `hw-chang-site-admin-api` |
| Worker URL | `https://hw-chang-site-admin-api.hw-chang-site-admin-worker.workers.dev` |
| 正式網站 URL | `https://changhsiuwei.com/` |
| Worker Secret 名稱 | `GITHUB_TOKEN` |

Cloudflare 帳號的 Wrangler 顯示名稱為 `D08722002@ntu.edu.tw's Account`，帳號 ID 為 `0b7e63092786be1f8b178c4fbaa5e4f8`。帳號 ID 不是密碼，但一般操作不需手動寫入設定。

重要：未封裝擴充套件在不同電腦或不同安裝方式下，ID 可能改變。新同事安裝後必須到 `brave://extensions` 或 `chrome://extensions` 讀取新 ID，更新 `ALLOWED_ORIGINS`，重新部署 Worker，並同步 Access CORS Origin 設定；不能沿用上表而不驗證。

## 五、版本與提交紀錄

| Commit | 時間 | 說明 |
|---|---|---|
| `ee1c0f1` | 2026-08-28 08:14 +08:00 | 從視覺編輯器移除版面標記，擴充套件升至 1.0.2 |
| `19b00d6` | 2026-08-28 08:04 +08:00 | 修正近期活動的結構化編輯與版面重建 |
| `c07f7b5` | 2026-08-28 02:49 +08:00 | 更新 GitHub Actions 執行環境 |
| `9ed48a6` | 2026-08-28 02:44 +08:00 | 加入安全的視覺化網站後台與 Worker |
| `9b21109` | 2026-08-28 01:52 +08:00 | 設定 GitHub Pages 自訂網域 |
| `2374903` | 2026-07-18 22:31 +08:00 | 暫時取消發布所有文章 |

交接文件完成後會再新增一筆文件提交；以 ZIP 內 `git` 歷史或 GitHub `main` 的最新 commit 為準。

## 六、已知限制與下一階段建議

- 目前 Worker 直接提交 `main`，發布速度快，但沒有多人審核。若改為團隊維運，建議第二階段讓 Worker 建立 `cms/*` 分支與 Pull Request，合併後才部署。
- GitHub fine-grained Token 原先設 90 天。接手後第一件事是查看到期日並建立輪替提醒；到期或更換時只更新 Cloudflare Secret。
- 擴充套件尚未發布到 Chrome Web Store，因此每台電腦需「載入未封裝項目」，ID 與更新都需人工管理。
- 預覽是前端模擬網站風格，不等同於完整 Quarto 引擎。發布前的權威驗證仍是 `quarto render` 與 GitHub Actions。
- 學生專區目前包含追蹤中的雜湊與頁面，但 plaintext 密碼檔被忽略。若資料敏感度提高，應把學生內容移出公開 GitHub Pages 原始庫，改用真正的伺服器端授權。
- Cloudflare Access 的應用名稱、Session Duration 與 Identity Provider 顯示設定需由接手者在 Dashboard 逐項複查；Audience、允許信箱與 Worker 驗證值必須完全一致。
- 網域會按年續費。接手者應確認 Cloudflare Registrar 的自動續約、付款方式、註冊人信箱驗證與到期通知。

## 七、交接驗收證據

| 證據 | 判定 | 操作路徑／命令 |
|---|---|---|
| `main...origin/main` 且無變更 | 原始碼同步 | `git status --short --branch` |
| Pages API 回傳 `built`、`https_enforced: true` | 公開站已部署且強制 HTTPS | `gh api repos/changhsiuwei/changhsiuwei.github.io/pages` |
| Actions 結論為 `success` | Quarto 與 Pages 發布成功 | GitHub → Actions |
| Secret 清單只有名稱 `GITHUB_TOKEN` | Token 存在 Cloudflare Secret，未列出內容 | Worker 目錄執行 Wrangler `secret list` |
| Worker 與擴充套件測試全部通過 | 主要安全邊界與內容模型可重現 | 參考 `handoff/BUILD_TEST_DEPLOY.md` |
| DNS apex 回傳四筆 GitHub Pages IP | 自訂網域解析正確 | `Resolve-DnsName changhsiuwei.com -Type A` |
| ZIP SHA-256 與 sidecar 相同 | 交接檔案未損毀 | `Get-FileHash -Algorithm SHA256 <zip>` |

## 八、官方參考資料

- [Quarto：GitHub Pages 發布](https://quarto.org/docs/publishing/github-pages.html)
- [GitHub：管理 Pages 自訂網域](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)
- [GitHub：管理 personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)
- [Cloudflare：Workers Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Cloudflare：Wrangler 設定](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [Cloudflare Access：Self-hosted application](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/)
- [Cloudflare Access：CORS](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/cors/)
- [Chrome Extensions：載入未封裝擴充套件](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked)

## 九、交接閱讀順序

1. `handoff/START_HERE_FOR_GEMINI.md`
2. `handoff/ARCHITECTURE_AND_DATA_FLOW.md`
3. `handoff/FILE_MANIFEST.md`
4. `handoff/SECURITY_AND_SECRET_TRANSFER.md`
5. `handoff/GITHUB_SETUP.md`
6. `handoff/CLOUDFLARE_SETUP.md`
7. `handoff/BUILD_TEST_DEPLOY.md`
8. `handoff/TROUBLESHOOTING.md`
9. `handoff/AI_EXECUTION_CHECKLIST.md`

所有建置與部署步驟都應以 ZIP 內檔案和 GitHub 最新 `main` 為準；若兩者 commit 不同，停止部署，先確認哪個版本是權威來源。
