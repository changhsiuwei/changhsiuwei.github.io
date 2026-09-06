# 🤝 AI 任務交接與工程維護全量指引 (AI Handover & Maintenance Manual)

**交付日期**：2026-09-06  
**專案負責人**：國立臺北大學會計學系 張修瑋 助理教授 (Andy Chang)  
**文件目的**：供接續任務的 AI 代理人（Antigravity / Codex / Claude / GPT 等）全面掌握專案脈絡、歷史變更、檔案架構、日誌讀取協定與後續開發指引。

---

## 📌 一、使用者身分與核心記憶 (User Persona & Memories)

- **使用者姓名**：張修瑋 (Hsiu-Wei Chang / Andy Chang)
- **職稱**：助理教授 (Assistant Professor)
- **所屬單位**：國立臺北大學會計學系 (Department of Accounting, National Taipei University)
- **品牌視覺標準 (Visual Identity)**：
  - **主色票**：Harvard Midnight Navy (`#001F3F` / `#2A2A6B`)
  - **輔助色票**：Academic Gold (`#C9A227` / `#D4AF37`)
  - **字體規範**：內文 16:9 簡報字級下限 $\ge 20\text{px}$，表格與卡片結構化排版，零 Raw LaTeX 殘留。

---

## 🏗️ 二、本次已完成之三大核心工作 (Completed Work Summary)

### 1. LaTeX Beamer 視覺化簡報編輯器 (`beamer-visual-editor`)
- **首頁 1:1 像素級精準對齊**：依據真實 Beamer PDF（`slides.tex` 編譯結果）重構封面頁，建立左側直立金條（`left: 84px` / `0.7cm`）、左上方主副標題區塊（`top: 138px`）、左下方講師名牌（`bottom: 102px`）、右下方圓形立體頭貼（`right: 84px, bottom: 70px, 280×280px`）。
- **動態 TEX 匯入與 AST 解析引擎**：實作 `parseLatexDocument(texSource)`，支援直接貼上含有 `\begin{frame}` 的完整代碼或本機上傳 `.tex`，即時解析成視覺化投影片。
- **16:9 高解析度 PDF 匯出**：整合 `html2pdf.js` 1-Click 下載、`@media print` 向量列印樣式，以及後端 `server.py` 的 `/api/compile-xelatex` API。
- **次像素幾何拖曳與 3 段式連動**：8 點縮放把手，支援 `單一` / `當頁` / `全簡報` 字級與間距即時調整。

### 2. 個人學術網站導覽列清理 (`Quarto_Website_Editing_Kit`)
- **移除右上角 CV 連結**：自 `_quarto.yml`（同步更新於 `Quarto_Website_Editing_Kit` 與 `HW-Chang-Website-Handoff`）中徹底刪除 `navbar.right` 的「履歷 (CV)」項目。
- **全站靜態頁面重新編譯**：執行 `quarto render`，更新 `_site/` 全站 HTML 檔案。

### 3. 知識站長文數學公式修復與正式排版發布
- **文章名稱**：《幾何的破曉與確定性的重構：從黑箱表徵的幾何拓撲到形式化驗證編程》
- **修復問題**：解決獨立區塊公式單行未換行、行內公式 `$ ... $` 內部空白、表格內公式 `|` 符號衝突。
- **發布位置**：`knowledge/posts/2026-09-06-geometry-and-formal-verification/index.qmd`，並已透過 `quarto render` 成功編譯出 MathJax 支援之靜態網頁。

---

## 📂 三、詳細檔案與資料夾路徑清單 (File Location Manifest)

### 📁 模組 1：LaTeX Beamer 視覺化編輯器
| 檔案/資料夾路徑 | 說明與角色 |
| :--- | :--- |
| `C:\Users\f1240\Desktop\AIS\beamer-visual-editor\` | 編輯器專案根目錄 |
| `├── index.html` | 編輯器主頁面（16:9 舞台、HUD 控制列、TEX 匯入 Modal、PDF 匯出 Modal） |
| `├── app.js` | 核心邏輯（座標轉換、8 點把手、AST 解析器、PDF 生成器） |
| `├── styles.css` | Navy & Gold 樣式、首頁 1:1 金條/頭像樣式、`@media print` 16:9 向量列印規則 |
| `├── server.py` | 本機預覽伺服器（Port 8088）與 XeLaTeX 背景編譯端點 `/api/compile-xelatex` |
| `├── WORKLOG.md` | 本專案專屬工程日誌與 Codex 查核清單 |
| `└── images\` | 簡報圖檔資產庫（`lecturer.png`, `sales_trend.png` 等） |

### 📁 模組 2：個人 Quarto 學術網站
| 檔案/資料夾路徑 | 說明與角色 |
| :--- | :--- |
| `C:\Users\f1240\Desktop\AI 服務&開發\個人網站\Quarto_Website_Editing_Kit\` | 網站主力編輯工作包 |
| `├── _quarto.yml` | 全站全域設定檔（導覽列、主題、MathJax 設定） |
| `├── index.md`、`about/`、`activities/`、`publications/`、`lab/` | 網站主要頁面原始碼 |
| `├── knowledge/posts/` | 知識站文章目錄 |
| `│   └── 2026-09-06-geometry-and-formal-verification/index.qmd` | 最新發布之《幾何的破曉與確定性的重構》文章 |
| `├── admin_app/app.R` | Shiny + ToastUI CMS 後台應用程式 |
| `└── _site\` | 編譯後之純靜態 HTML 網站（發布至 GitHub Pages） |
| `C:\Users\f1240\Desktop\AI 服務&開發\個人網站\HW-Chang-Website-Handoff-2026-08-28-5af6a9c\` | 網站交付同步鏡像包 |

---

## 📜 四、日誌讀取協定 (Log Reading Protocol for Next AI)

下一個 AI 可透過以下路徑與方式讀取歷史日誌以獲取完整上下文：

1. **閱讀專案工程日誌**：
   ```powershell
   # 檢視 Beamer 編輯器日誌
   Get-Content -Path "C:\Users\f1240\Desktop\AIS\beamer-visual-editor\WORKLOG.md" -Encoding UTF8
   # 檢視個人網站維護手冊與日誌
   Get-Content -Path "C:\Users\f1240\Desktop\AI 服務&開發\個人網站\Quarto_Website_Editing_Kit\LOG.md" -Encoding UTF8
   ```
2. **閱讀交接記錄檔案**：
   - 本文檔保存於：`C:\Users\f1240\Desktop\AIS\HANDOVER.md`
   - 同步保存於：`C:\Users\f1240\Desktop\AI 服務&開發\個人網站\Quarto_Website_Editing_Kit\HANDOVER.md`
3. **閱讀歷史對話與軌跡紀錄**：
   - Agent 軌跡日誌位於：`C:\Users\f1240\.gemini\antigravity\brain\16957f0c-5b6e-4c7c-acf5-997ff91c19b6\.system_generated\logs\transcript.jsonl`

---

## 🧭 五、後續接手 AI 標準作業程序 (SOP for Next AI)

### 1. 簡報編輯器維護 SOP
- **啟動本地預覽伺服器**：
  ```powershell
  python "C:\Users\f1240\Desktop\AIS\beamer-visual-editor\server.py"
  ```
- **座標轉換鐵律**：舞台縮放模式下，所有 DOM 座標必須除以 `currentStageScale`：
  $$X_{\text{stage}} = \frac{X_{\text{client}} - \text{rect.left}}{\text{currentStageScale}}$$
- **LaTeX 轉譯鐵律**：嚴禁將 `\begin{tabularx}`, `\begin{columns}` 等 Raw LaTeX 直接印在 DOM 上，必須轉譯為語意化 HTML/CSS。

### 2. 網站文章發布與數學公式 SOP
- **數學公式規範**：
  - **行內公式**：`$` 緊貼內容，不可有空白，如 `$\mathbb{Z}/59\mathbb{Z}$`、`$N$`。
  - **獨立區塊公式**：`$$` 必須獨立成行：
    ```markdown
    $$
    E = mc^2
    $$
    ```
- **編譯與更新指令**：
  ```powershell
  cd "C:\Users\f1240\Desktop\AI 服務&開發\個人網站\Quarto_Website_Editing_Kit"
  quarto render
  ```

---

## 🤖 六、系統提示詞與核心規則 (Complete System Prompt for Next AI)

下一位 AI 請將以下內容載入為最高優先級 System Prompt / Custom Instructions：

```markdown
<user_rules>
## 👤 使用者身分與專案規範
- 使用者姓名：張修瑋 (Andy Chang / Hsiu-Wei Chang)
- 職稱：助理教授 (Assistant Professor)
- 所屬單位：國立臺北大學會計學系 (Department of Accounting, National Taipei University)
- 專案視覺標準：Harvard Midnight Navy (#001F3F / #2A2A6B) & Academic Gold (#C9A227 / #D4AF37)

## 🚨 工程與排版永久防呆鐵律 (Permanent Engineering Guidelines)
1. 【Zero Raw LaTeX in DOM】：
   - 嚴禁將 \begin{tabularx}, \begin{columns}, \toprule, \textbf{} 等語法直接輸出到 HTML 或 JSON。
   - 表格一律轉譯為語義化 <table class="w-full text-left border-collapse">，欄位轉為 <div class="grid grid-cols-...">。
   - KaTeX / MathJax 貨幣符號隔離：避免貨幣金額 ($500B) 遭誤判為公式。公式僅允許 $$...$$, \(...\), \[...\] 或緊湊 $formula$。
2. 【靜態 DOM 與專案同步完整性】：
   - 修改簡報專案內容時，必須同步更新靜態舞台，確保 F5 重新整理可直接正確渲染。
3. 【舞台座標與把手縮放】：
   - 在 transform: scale(currentStageScale) 下，所有滑鼠拖曳與幾何定位必須除以 currentStageScale。
4. 【Quarto 網站與數學公式規範】：
   - 行內公式使用緊湊 $...$，獨立公式使用換行 $$...$$。
   - 更新網站設定或貼文後，一律使用 quarto render 驗證編譯結果。
</user_rules>
```
