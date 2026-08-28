# 專案檔案索引與交接包範圍

ZIP 交接包使用 `git archive` 從交接 commit 產生，因此包含所有 Git 追蹤檔案，不含 `.git` 歷史資料夾與任何被忽略的本機／機密檔案。完整逐檔清單見同目錄的 `TRACKED_FILES_AT_HANDOFF.txt`。

## 核心目錄樹

```text
Quarto_Website_Editing_Kit/
├─ LOG.md                              # 本次主交接紀錄
├─ handoff/                            # 新同事與新 AI 的交接 runbooks
├─ _quarto.yml                         # 網站、導覽、渲染範圍
├─ CNAME                               # changhsiuwei.com
├─ custom.scss / styles.css            # 網站視覺
├─ index.md                            # 首頁
├─ about/index.md                      # 個人資訊
├─ activities/index.md                 # 近期活動
├─ publications/index.md               # 學術出版
├─ lab/                                # AI 教學與研究列表、文章、圖片、TeX
├─ knowledge/                          # AI 知識站列表、文章、圖片、TeX
├─ students/                           # 學生專區頁面與雜湊
├─ .github/workflows/
│  ├─ publish.yml                      # main → Quarto → gh-pages
│  └─ render-check.yml                 # PR render gate
├─ cloud_admin/
│  ├─ README.md
│  ├─ extension/                       # Brave／Chrome Manifest V3 後台
│  └─ worker/                          # Cloudflare Worker API
├─ admin_app/                          # 本機 Shiny CMS 備援
├─ run_cms.R / launch_cms_clean.R      # Shiny CMS 啟動器
├─ post_ready/                         # 文章準備區與模板
├─ publish_ready_posts.R               # 文章發布整理工具
├─ maintain_quarto_shiny_cms/          # 既有維護 skill
├─ START_HERE.md                       # 既有本機專案入口
├─ WEBSITE_UPDATE_MAINTENANCE_MANUAL.md
├─ POST_READY_WORKFLOW.md
└─ DEPENDENCIES.md
```

## Cloud admin 必要檔案

擴充套件：

- `cloud_admin/extension/manifest.json`：Manifest V3、版本、權限與 CSP。
- `service-worker.js`：點擊擴充圖示後開啟獨立分頁。
- `sidepanel.html`：UI 結構。
- `sidepanel.css`：完整後台樣式與響應式版面。
- `sidepanel.js`：API、內容模型、草稿、圖片、預覽與發布。
- `sidepanel.test.mjs`：活動、版面重建與安全映射測試。
- `vendor/toastui-editor-all.min.js` 與 CSS：本機 vendored WYSIWYG，避免 CDN／CSP 依賴。

Worker：

- `cloud_admin/worker/src/index.ts`：Access 驗證、CORS、GitHub API、路徑與上傳安全。
- `src/index.test.ts`：路徑與圖片簽章測試。
- `package.json`、`package-lock.json`：可重現 Node 相依套件。
- `tsconfig.json`：TypeScript 設定。
- `wrangler.example.jsonc`：可提交的泛用範例，不含實際 Access 識別與 Secret。

## 網站內容檔案

`_quarto.yml` 明列正式 render 範圍：

- `index.md`
- `about/index.md`
- `activities/index.md`
- `publications/index.md`
- `lab/index.md`
- `lab/posts/**/*.md` 與 `**/*.qmd`
- `knowledge/index.md`
- `knowledge/posts/**/*.md` 與 `**/*.qmd`
- `students/index.qmd`

文章資料夾中的 `.png`、`.jpg` 與 `.tex` 是內容資產。不要因為 `.tex` 未直接顯示在頁面就刪除，它們可能是圖表可重製來源。

## 不包含且不得交接的本機檔案

下列項目刻意不在 ZIP／Git：

- `.git/`：clone 後由 GitHub 重建。
- `_site/`、`.quarto/`：本機渲染輸出與快取。
- `cloud_admin/worker/node_modules/`、`.wrangler/`：可由 `npm ci` 重建。
- `cloud_admin/worker/wrangler.jsonc`：實際本機設定；交接包提供非機密參考。
- `cloud_admin/worker/.dev.vars`：可能含短期 Token。
- `students/.password_secret.txt`：明文密碼。
- `.RData`、`.Rhistory`、本機 R library／快取。
- Wrangler OAuth 設定、Windows Credential Manager、瀏覽器 Profile／Cookies。
- GitHub Token、Cloudflare API Token、Access cookie、付款與註冊人個資。

## 可以重建的內容

| 內容 | 重建方式 |
|---|---|
| `_site` | `quarto render` |
| `gh-pages` | push `main` 後由 `Quarto Publish` workflow 建立 |
| Worker `node_modules` | Worker 目錄執行 `npm ci` |
| 未封裝擴充套件 | 在 Brave／Chrome 選擇 `cloud_admin/extension` |
| Worker 部署 | `npm run deploy` |
| 本機 `wrangler.jsonc` | 由 example + handoff current-config 建立，換入新 extension ID |

## 完整性檢查

解壓後在根目錄：

```powershell
Get-Content .\handoff\TRACKED_FILES_AT_HANDOFF.txt
git ls-files
```

若 ZIP 是由 `git archive` 直接解壓，裡面沒有 `.git`，第二個命令需在 clone 後使用。以 ZIP sidecar 的 SHA-256 驗證壓縮檔傳輸完整性；它驗證檔案未損毀，不代表來源身分，交接時仍應透過受信任管道傳送雜湊。
