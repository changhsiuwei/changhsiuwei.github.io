# Visual Website Admin 1.0

這個目錄是 `https://changhsiuwei.com` 的視覺化管理後台。公開網站仍由 GitHub Pages 發布；Cloudflare Worker 只負責身分驗證、保管 GitHub 憑證，以及代替管理介面安全地讀取和提交網站內容。

## 使用方式

1. 在 Brave 的擴充功能頁面載入 `cloud_admin/extension`。程式更新後，請在同一頁按一次「重新載入」。
2. 點擴充套件圖示，管理介面會在獨立分頁開啟。
3. 登入 Cloudflare Access，從左側網站結構選擇頁面。
4. 在中央的所見即所得編輯器直接修改文字、標題與圖片；右側會同步顯示網站預覽。表格會以可直接輸入的儲存格呈現。
5. 填寫更新說明並按「發布更新」。Worker 會建立一個完整的 Git 提交，GitHub Actions 渲染成功後才更新正式網站。

主要功能包括：

- 依照網站導覽排列的頁面清單與搜尋
- 不需接觸 Markdown 或 HTML 的繁體中文視覺化編輯
- 鎖定 Quarto 卡片、欄位與版面標記，修改文字時不會破壞原始結構
- 逐段對應原始來源；未修改的內容、連結屬性與換行會原樣保留
- 即時網站風格預覽
- 正確載入既有圖片，並在發布前預覽新上傳圖片
- 新增知識文章或研究室文章
- 上傳圖片到 `assets/uploads`
- 自動保存文字、表格、新文章與待上傳圖片的本機草稿
- 切換頁面與關閉分頁前的未保存變更保護
- 一鍵提交並發布
- 在設定視窗中調整正式網站網址與後台 API 位址

GitHub 是唯一的正式內容來源；瀏覽器儲存空間只保留本機草稿與介面偏好，不保存 GitHub 或 Cloudflare Token。

## 元件

- `extension/`：Chrome Manifest V3 擴充套件，以獨立分頁提供完整管理介面。
- `worker/`：Cloudflare Worker API，驗證 Cloudflare Access 身分並使用加密的 GitHub Secret。

原有的本機 Shiny CMS 仍可作為備用工具。

## 安全邊界

Worker 只允許固定的公開頁面、`knowledge/posts`、`lab/posts` 與 `assets/uploads`。它會拒絕工作流程、網站設定、R 資料庫、本機建置輸出、私人草稿與學生專區等路徑。

每次發布都會帶上編輯器最初讀取的 Git 提交版本；如果網站已被其他更新改動，Worker 會拒絕覆蓋並要求重新讀取。圖片也會接受副檔名、大小與檔案簽章檢查。

## Worker 部署

1. 將 `worker/wrangler.example.jsonc` 複製為被 Git 忽略的 `worker/wrangler.jsonc`，填入非機密設定。
2. 將僅限此網站儲存庫、具有 Contents 讀寫權限的 GitHub fine-grained token 存為 Worker Secret：

   ```powershell
   npx wrangler secret put GITHUB_TOKEN
   ```

3. 安裝相依套件並部署：

   ```powershell
   cd cloud_admin/worker
   npm install
   npm run check
   npm test
   npm run deploy
   ```

Cloudflare Access 應只允許網站管理者，Worker 也會再次核對 Access 簽章、應用程式與帳號。實際的 `wrangler.jsonc`、本機開發 Secret 和套件依賴都不會提交到 Git。

## 發布流程

管理介面會把一次修改整理成一個不可分割的 Git 提交送到 `main`。只有 `main` 的推送可以執行正式發布；Pull Request 只執行 Quarto 渲染檢查，不能部署 `gh-pages`。

正式發布工作流程會從 `_site` 建立乾淨的 `gh-pages`，並保留自訂網域的 `CNAME`。若未來需要多人審核，可再將後台改為先建立 `cms/*` 分支，通過檢查後才合併。

## 本機開發

若要在不使用 Cloudflare Access 的本機環境測試，可建立被 Git 忽略的 `worker/.dev.vars`：

```text
GITHUB_TOKEN=<REPLACE_LOCALLY>
DEV_ADMIN_EMAIL=local-admin
```

這個檔案已被 Git 忽略；請只使用短期本機測試權杖，正式 Token 必須透過 Wrangler 的 Secret 提示輸入，不能寫入專案檔案。

接著執行：

```powershell
cd cloud_admin/worker
npm run dev -- --config wrangler.example.jsonc
```

管理介面的設定視窗可將 API 位址改為 `http://localhost:8787`。開發身分略過只會在請求本身由 localhost 提供時生效，部署到 Cloudflare 的 Worker 不會接受這項略過。
