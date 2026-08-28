# 交接前驗證報告

驗證日期：2026-08-28（Asia/Taipei）

## 原始碼基準

文件撰寫前的產品基準：

```text
branch: main
product HEAD: ee1c0f1b4a903a25f776c584657152ae3707304e
remote: https://github.com/changhsiuwei/changhsiuwei.github.io.git
extension: 1.0.2
worker package: 1.0.0
```

本交接文件會形成產品基準之後的新 commit，但不改動網站內容、擴充套件或 Worker 執行碼。

## 本機驗證

| 檢查 | 結果 | 證據摘要 |
|---|---|---|
| `npm ci` | 通過 | 安裝 41 packages、audit 42、0 vulnerabilities |
| `npm run check` | 通過 | TypeScript `tsc --noEmit` exit 0 |
| Worker `npm test` | 通過 | 3 tests、0 failures |
| Extension tests | 通過 | 4 tests、0 failures |
| `quarto render` | 通過 | 26/26 頁完成，輸出 `_site/index.html` |
| `git diff --check` | 通過 | 無 whitespace error |
| Git ignore | 通過 | 實際 Wrangler、dev vars、學生明文密碼、`_site`、R history 均被忽略 |
| 機密 pattern scan | 通過 | 只命中安全指南中的掃描規則本身，無真實 Token |
| 機密檔 Git history | 通過 | 指定的三個機密路徑沒有歷史提交紀錄 |

Worker 測試名稱：

- `allows only the intended editable paths`
- `rejects traversal, configuration, executable, and malformed paths`
- `checks image signatures before upload`

Extension 測試名稱：

- `activities render as structured cards without exposing Quarto layout`
- `activity field changes rebuild a valid Quarto grid`
- `incomplete new activity remains recoverable as a local draft`
- `marker-free visual text edits preserve the original Quarto layout`

## GitHub 與 Pages 驗證

交接文件提交前的最新產品發布：

```text
Quarto Publish run: 33129070910
result: success
main commit: ee1c0f1b4a903a25f776c584657152ae3707304e

Pages deployment run: 33129099044
result: success
gh-pages commit: 1cc881062c9f7094850d8beac0dfc69a107c7b81
```

Pages API：

```text
status: built
html_url: https://changhsiuwei.com/
source: gh-pages /
custom domain: changhsiuwei.com
protected domain state: verified
HTTPS certificate: approved
HTTPS enforced: true
```

交接文件 push 也會觸發一次 Quarto Publish。該次 run 應在 ZIP 建立前確認成功；最終 run URL 與交接 commit 由交付訊息提供。

## Cloudflare 驗證

```text
Wrangler: 4.127.0
logged-in account email: d08722002@ntu.edu.tw
Worker: hw-chang-site-admin-api
Secret list: GITHUB_TOKEN / secret_text（只有名稱）
latest checked deployment version: 070bb289-e667-46b4-9bf7-ad7d003bfb87
latest checked deployment time: 2026-08-27T18:44:56.630Z
```

交接文件沒有重新部署 Worker，因為沒有修改 Worker 程式或設定。

## DNS 驗證

`Resolve-DnsName changhsiuwei.com -Type A` 回傳：

- `185.199.108.153`
- `185.199.109.153`
- `185.199.110.153`
- `185.199.111.153`

這與 GitHub Pages apex domain 官方記錄一致。DNS 與 Registrar 是可變外部狀態，新同事接手當日仍需重新查詢。

## 尚需人類完成或定期複查

- GitHub PAT 實際到期日與輪替 owner。
- Cloudflare Registrar 自動續約、付款方式與註冊人 email 驗證。
- Access application 的顯示名稱、Session Duration 與 IdP 選項。
- 新接手電腦的 extension ID，以及同步後的 Worker／Access CORS。
- 使用新同事身分進行一次 owner 同意的端到端測試發布。
