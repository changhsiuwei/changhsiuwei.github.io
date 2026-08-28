# 新 AI 建置與交接執行清單

這份清單供 Gemini、Codex 或其他 AI 逐步執行。每一階段完成後記錄實際結果，不可只把命令列為「已完成」。

## 階段 0：保護現況

- [ ] 已完整讀取 `LOG.md` 與 `handoff/*.md`。
- [ ] 已辨識 repo 根目錄，沒有在 `_site` 或 `gh-pages` 工作。
- [ ] 已執行 `git status --short --branch`。
- [ ] 已記錄 HEAD SHA、branch、remote。
- [ ] 工作樹若有既有變更，已停止寫入並回報 owner。
- [ ] 沒有讀取、輸出或要求使用者把 Token 貼到聊天。

階段產物：一份唯讀盤點報告。

## 階段 1：重現建置

- [ ] `quarto check` 成功。
- [ ] `quarto render` 成功。
- [ ] 抽查首頁、活動、出版、Lab、Knowledge、Students。
- [ ] `npm ci` 成功且使用 lockfile。
- [ ] `npm run check` 成功。
- [ ] Worker `npm test` 全部成功。
- [ ] Extension tests 全部成功。
- [ ] 未把 `_site`、`node_modules` 或快取加入 Git。

階段產物：命令、exit code、測試數與失敗訊息；不要只寫「測試正常」。

## 階段 2：帳號與外部資源盤點

- [ ] GitHub 登入帳號有 repo 寫入權限。
- [ ] Cloudflare 登入帳號位於正確 account。
- [ ] 找到既有 Worker `hw-chang-site-admin-api`，未重建重複資源。
- [ ] 找到對應 Access application，Audience 與文件一致。
- [ ] Secret list 有 `GITHUB_TOKEN`，未嘗試讀取值。
- [ ] GitHub Pages source 是 `gh-pages /`。
- [ ] Custom domain 是 `changhsiuwei.com`，HTTPS enforced。
- [ ] Registrar、DNS、auto-renew 與通知 owner 已由人類負責人確認。

階段產物：資源名稱、ID／URL、狀態與差異；不含 Secret。

## 階段 3：擴充套件安裝

- [ ] 在 Brave／Chrome 載入 `cloud_admin/extension`。
- [ ] 顯示版本 1.0.2。
- [ ] 記錄本次實際 extension ID。
- [ ] `ALLOWED_ORIGINS` 已換成新 ID。
- [ ] Worker 測試成功後重新部署。
- [ ] Access CORS／OPTIONS 與新 origin 一致。
- [ ] 已在 Worker URL 完成 Access 登入。
- [ ] `/api/session`、`/api/tree` 與單一 `/api/file` 成功。

階段產物：新 extension ID、部署時間、非機密設定 diff 與 API 狀態。

## 階段 4：UI 產品驗收

- [ ] 點擴充圖示開啟獨立分頁，不是側邊欄。
- [ ] 網站結構與搜尋正常。
- [ ] 正式網站網址可設定並保存。
- [ ] WYSIWYG 不顯示 Markdown／HTML／Quarto 版面語法。
- [ ] 活動頁以年份、日期、單位、主題卡片呈現。
- [ ] 表格以儲存格呈現。
- [ ] 畫面不出現 `HWCMS-LAYOUT`。
- [ ] 既有圖片在預覽出現。
- [ ] 新圖片發布前預覽出現。
- [ ] 本機草稿可恢復。
- [ ] 未保存變更有提示。
- [ ] 409 conflict 會停止覆蓋並提示重新讀取。

階段產物：非機密截圖、測試頁 path、瀏覽器版本；截圖不得含 cookie、Token 或個資頁。

## 階段 5：端到端測試發布

由 owner 同意一項容易回復的測試內容後：

- [ ] 發布前重新讀取最新 HEAD。
- [ ] 更新說明清楚且不含機密。
- [ ] Worker 回傳單一 commit SHA。
- [ ] `main` diff 只有預期內容。
- [ ] Quarto Publish success。
- [ ] Pages deployment success。
- [ ] Pages API status built。
- [ ] 正式網站目標頁顯示正確。
- [ ] 圖片、手機／桌面版面均抽查。
- [ ] 測試內容若不應保留，已用新 commit 回復。

階段產物：commit URL、Actions run URL、正式頁面 URL 與時間。

## 階段 6：機密與交付稽核

- [ ] `wrangler.jsonc`、`.dev.vars`、明文密碼仍被 Git 忽略。
- [ ] 已執行 repo 與 history 機密掃描。
- [ ] ZIP 由交接 commit 的 `git archive` 產生。
- [ ] ZIP 不含 `.git`、`_site`、`node_modules`、OAuth 或瀏覽器資料。
- [ ] 已產生 SHA-256 sidecar 並重新計算比對。
- [ ] Token 到期日、輪替 owner 只記錄在受控的密碼管理器／團隊系統。
- [ ] 舊維運者需移除的權限已有明確清單，不由 AI 自行撤銷。

階段產物：ZIP 路徑、SHA-256、交接 commit、掃描摘要。

## 變更完成後的標準回報

```text
交接建置結果：成功／未完成

版本：
- Repo HEAD:
- Extension:
- Worker package:
- Worker deployment:

驗證：
- Quarto render:
- Worker check/tests:
- Extension tests:
- GitHub Actions:
- GitHub Pages / HTTPS:
- 正式頁面抽查:

外部設定：
- GitHub account / permission:
- Cloudflare account / Worker / Access:
- Extension ID / Allowed origin:
- Secret 名稱存在（不得含值）:

差異與待辦：
- （填寫）

回復方式：
- （填寫）
```

只有證據可重現、外部狀態已核對、機密未曝露，才能宣告交接完成。
