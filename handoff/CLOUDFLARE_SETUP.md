# Cloudflare 設定、Access 與 Worker 部署指南

## 目前資源清單

| 資源 | 目前值 |
|---|---|
| Registrar／Zone | `changhsiuwei.com` |
| Zero Trust team domain | `jolly-mode-64a2.cloudflareaccess.com` |
| Worker name | `hw-chang-site-admin-api` |
| Worker URL | `https://hw-chang-site-admin-api.hw-chang-site-admin-worker.workers.dev` |
| Access Audience | `d9f59d1ea11deb1c6d52825f1e8e9208cb37b0bb951e90fbf1fe83e60a4bfa3b` |
| 允許管理者 | `d08722002@ntu.edu.tw` |
| 舊安裝的 extension origin | `chrome-extension://mbanghhaabkgdkjjnbkgbfkhdihdnddo` |
| Worker Secret | `GITHUB_TOKEN`，只有名稱可交接 |

接手既有帳號時先查看資源，不要建立第二個 Worker、第二個 Access app 或第二個同名 DNS zone。

## 登入 Wrangler

在 Worker 目錄：

```powershell
Set-Location .\cloud_admin\worker
npm ci
node .\node_modules\wrangler\bin\wrangler.js login
```

瀏覽器顯示 `Authorization granted to Wrangler` 代表本機 Wrangler OAuth 完成。接著確認：

```powershell
node .\node_modules\wrangler\bin\wrangler.js whoami
```

目前帳號顯示信箱為 `d08722002@ntu.edu.tw`，帳號 ID 為 `0b7e63092786be1f8b178c4fbaa5e4f8`。新同事若使用自己的 Cloudflare 成員帳號，輸出可以不同，但必須在同一 Cloudflare account 中具備 Workers、Zero Trust 與 DNS 所需權限。

Windows 專案路徑含 `&`，過去用某些 `npx wrangler ...` 呼叫曾被外層命令解析錯誤。請優先使用 package scripts 或上方 `node .\node_modules\wrangler\bin\wrangler.js` 形式。

## 非機密 Worker 設定

實際 `cloud_admin/worker/wrangler.jsonc` 被 Git 忽略。首次接手：

```powershell
Copy-Item .\cloud_admin\worker\wrangler.example.jsonc .\cloud_admin\worker\wrangler.jsonc
```

再以 `handoff/current-config/wrangler.handoff.example.jsonc` 的非機密值建立本機設定。不得在 `vars` 中新增 `GITHUB_TOKEN`。

重要比對：

- `CF_ACCESS_TEAM_DOMAIN` 必須符合 Zero Trust Settings 顯示的 team domain。
- `CF_ACCESS_AUD` 必須與保護此 Worker 的 Access application Audience 相同。
- `ALLOWED_EMAIL` 必須與 Access policy 允許的管理者信箱相同。
- `ALLOWED_ORIGINS` 必須是新環境實際擴充套件 ID，格式為 `chrome-extension://<ID>`，不加尾端斜線。

## Secret 設定

先依 `handoff/GITHUB_SETUP.md` 產生最小權限 GitHub Token。再執行：

```powershell
Set-Location .\cloud_admin\worker
node .\node_modules\wrangler\bin\wrangler.js secret put GITHUB_TOKEN
node .\node_modules\wrangler\bin\wrangler.js secret list
```

第二個命令只應顯示名稱與 `secret_text`。若 Token 曾出現在檔案、聊天、終端歷史或畫面錄影，視為已洩漏，立即在 GitHub 撤銷並重建。

## Worker 部署

```powershell
Set-Location .\cloud_admin\worker
npm ci
npm run check
npm test
npm run deploy
```

部署後的 URL 應維持：

```text
https://hw-chang-site-admin-api.hw-chang-site-admin-worker.workers.dev
```

唯讀檢查：

```powershell
node .\node_modules\wrangler\bin\wrangler.js deployments list
node .\node_modules\wrangler\bin\wrangler.js secret list
```

部署不會自動替新 extension ID 更新 Access CORS；兩邊都要核對。

## Cloudflare Access 應用程式

現有帳號應已有保護 Worker URL 的 self-hosted application。進入 Zero Trust → Access controls → Applications，先找出 Audience 為下列值的 app：

```text
d9f59d1ea11deb1c6d52825f1e8e9208cb37b0bb951e90fbf1fe83e60a4bfa3b
```

必要設定：

```text
Application type: Self-hosted / public hostname
Protected hostname: hw-chang-site-admin-api.hw-chang-site-admin-worker.workers.dev
Policy action: Allow
Include: Emails → d08722002@ntu.edu.tw
Default behavior: deny users not matching an Allow policy
```

若 Cloudflare UI 對 `workers.dev` 使用不同的 Worker/Access 入口，以既有 app 與同一 Audience 為準，不要另建重疊 app。Session Duration 與 Identity Provider 未寫入程式；交接時在 Dashboard 記錄現值，沒有負責人指示不要改動。

Worker 會再次做下列驗證：

- JWT issuer：`https://jolly-mode-64a2.cloudflareaccess.com`
- 遠端 JWKS：`/cdn-cgi/access/certs`
- Audience：上方 AUD
- email：`d08722002@ntu.edu.tw`

因此只改 Access policy 而不改 Worker vars，或只改 Worker vars 而不改 Access，都會登入失敗。

## Access CORS 設定

擴充套件呼叫 Worker 是跨 origin request。瀏覽器的 OPTIONS 預檢不帶 Access cookie，所以既有 Access 應用程式需讓 OPTIONS 到達 Worker，由 Worker 依 origin 白名單回應。

在 Access application → Configure → Advanced settings → Cross-Origin Resource Sharing：

```text
Bypass OPTIONS requests to origin: On
```

Worker 回應的 CORS 範圍：

```text
Allowed origin: chrome-extension://<實際 extension ID>
Credentials: true
Methods: GET, POST, OPTIONS
Headers: content-type, cf-access-jwt-assertion, x-request-id
```

不要設 `*`。OPTIONS 只做無資料的預檢；GET／POST 仍必須通過 Access JWT、Audience、email 與 Worker 路徑檢查。

Cloudflare 官方提醒不要用 Incognito 排查此類 CORS，因第三方 cookie 可能被阻擋。

## Brave／Chrome 安裝與 Origin 更新

1. 開啟 `brave://extensions` 或 `chrome://extensions`。
2. 開啟 Developer mode。
3. 點 Load unpacked／載入未封裝項目。
4. 選擇 `cloud_admin/extension`，不是專案根目錄。
5. 記錄頁面顯示的 extension ID。
6. 在 `wrangler.jsonc` 把 `ALLOWED_ORIGINS` 改成 `chrome-extension://<新 ID>`。
7. `npm run deploy`。
8. 同步 Access CORS 的 Allowed origin 或 bypass OPTIONS 設定。
9. 在擴充套件卡片按 Reload／重新載入。
10. 點工具列圖示，應開啟獨立管理分頁。

擴充套件會向使用者要求 Worker origin 的 optional host permission。若改用新的 Worker URL，必須在後台設定中更新 API 位址並接受權限提示。

## 網域與 DNS

Cloudflare Registrar 中確認：

- `changhsiuwei.com` 狀態 Active。
- 註冊人 email 已驗證。
- 到期日、付款方式與 Auto-renew 符合負責人決定。
- 不能把網域視為買斷；它按年續約。

Cloudflare DNS 的 apex A records：

| Type | Name | Content |
|---|---|---|
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |
| CNAME | `www` | `changhsiuwei.github.io` |

建議維持 DNS only，使 GitHub Pages 能直接完成網域與憑證驗證；修改前以 Cloudflare Dashboard 的現值與 GitHub 最新官方文件為準。不要建立 wildcard DNS record，避免他人利用未受保護的子網域。

PowerShell 驗證：

```powershell
Resolve-DnsName changhsiuwei.com -Type A
Resolve-DnsName www.changhsiuwei.com
```

DNS 變更可能需要時間傳播；GitHub 文件指出最長可能約 24 小時。不要因為短暫未更新就重複新增記錄。

## 故障時的安全回復

- Worker 新部署壞掉：Cloudflare Workers → Deployments 選前一個已知正常版本回復，再修程式。
- Access 拒絕所有人：比對 team domain、AUD、policy email、登入 email；不要臨時改成 Everyone。
- CORS 403：先比對新 extension ID 與 `ALLOWED_ORIGINS`，再看 Access OPTIONS 設定。
- GitHub 401／403：檢查 Token 是否到期、repo 是否選對、Contents 是否 Read and write；以同名 Secret 輪替。
- 網域失效：先確認 GitHub Pages 與 `changhsiuwei.github.io` 是否仍正常，再查 DNS／Registrar；不要同時改 GitHub、DNS 與 Worker。

## 官方文件

- [Cloudflare Workers Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Cloudflare Wrangler Configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [Cloudflare Wrangler Workers commands](https://developers.cloudflare.com/workers/wrangler/commands/workers/)
- [Cloudflare Access self-hosted application](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/)
- [Cloudflare Access CORS](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/cors/)
- [GitHub Pages custom domain](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)
- [Chrome：Load an unpacked extension](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked)
