# 安全邊界與機密交接

## 本交接包不含任何 Secret 值

交接包只記錄 Secret 的名稱、用途、建立方式與輪替流程。下列值必須經另一個安全管道由帳號持有人提供或重新建立：

- GitHub fine-grained PAT 值。
- Cloudflare Wrangler OAuth token。
- Cloudflare API token 或 Global API Key。
- Cloudflare Access cookie、service token 或 IdP session。
- GitHub／Cloudflare 密碼與 2FA recovery codes。
- 網域付款方式、帳單地址與註冊人個資。
- 學生專區明文密碼。

最佳做法是新同事使用自己的 GitHub／Cloudflare成員帳號，並重新建立屬於新維運者的 GitHub PAT；不要把原作者的 OAuth 設定檔或瀏覽器 Profile 複製給同事。

## Secret 清單與存放位置

| Secret | 正確位置 | 輪替方式 |
|---|---|---|
| `GITHUB_TOKEN` | Cloudflare Worker encrypted Secret | GitHub 建新 PAT → Wrangler `secret put` → 驗證 → revoke 舊 PAT |
| Wrangler OAuth | 使用者個人電腦的 Wrangler config | `wrangler logout` / `login`，不複製檔案 |
| 本機測試 PAT | 被忽略的 `.dev.vars`，僅短期 | 測試後 GitHub revoke 並刪除檔案 |
| 學生明文密碼 | 不進 Git；另行受控保管 | 依學生系統規則重設 |

`students/password_hash.txt` 是追蹤中的驗證雜湊，不等同明文，但仍不應在聊天或一般文件中散播。現有學生專區不是高強度伺服器端機密系統；敏感資料應移出公開 static site 架構。

## 安全交接流程

1. Repo owner 將新同事加入 GitHub collaborator，給工作需要的最低權限。
2. Cloudflare account owner 以成員邀請提供最低必要角色，不共用主帳密。
3. 新同事在自己的電腦登入 `gh` 與 Wrangler。
4. 新同事建立只限單一 repo、Contents read/write、短期到期的 PAT。
5. PAT 直接輸入 `wrangler secret put GITHUB_TOKEN`，不先存文字檔。
6. 完成 Worker／Access／UI 全鏈驗證。
7. 若舊維運者離任，撤銷舊 PAT、Cloudflare member、GitHub collaborator 與不再使用的 session。
8. 在團隊密碼管理器留下「Secret 名稱、owner、建立日、到期日、輪替 runbook」，不在專案內留下值。

## 最小權限設計

GitHub PAT：

```text
Repository access: Only select repositories
Repository: changhsiuwei.github.io
Contents: Read and write
Other repository permissions: No access（Metadata 自動 Read-only 除外）
Expiration: 短期並可追蹤
```

Cloudflare Access：

```text
Default: deny
Allow policy: 明確的管理者 email
Audience: 與 Worker CF_ACCESS_AUD 相同
CORS: 精確 extension origin
```

Worker：

- 再驗證 JWT issuer、Audience、email。
- 精確 Origin allowlist，不用萬用字元。
- 只允許公開內容路徑。
- 固定頁面不可刪除。
- 防止 path traversal 與雙重編碼。
- 限制檔案數、單檔與批次大小。
- 圖片檢查 magic bytes。
- base commit 不一致時拒絕覆蓋。
- 更新 Git ref 時 `force: false`。

## 交付前機密掃描

在 repo 根目錄執行：

```powershell
git status --short
git check-ignore -v `
  cloud_admin/worker/wrangler.jsonc `
  cloud_admin/worker/.dev.vars `
  students/.password_secret.txt `
  _site

rg -n --hidden `
  --glob '!cloud_admin/worker/node_modules/**' `
  --glob '!cloud_admin/extension/vendor/**' `
  --glob '!admin_app/www/toastui/**' `
  '(github_pat_|ghp_[A-Za-z0-9]{20,}|CF_API_TOKEN\s*=|GITHUB_TOKEN\s*=\s*[^<$])' .
```

掃描結果可能命中教學 placeholder，例如 `<LOCAL_SHORT_LIVED_TOKEN>` 或 Secret 名稱，需人工判讀；任何看似真實 token 的字串都應視為事件，先停止打包。

檢查 Git 歷史是否曾加入被忽略檔：

```powershell
git log --all --name-only --pretty=format: -- `
  cloud_admin/worker/wrangler.jsonc `
  cloud_admin/worker/.dev.vars `
  students/.password_secret.txt
```

若輸出顯示曾提交，單純刪除現在的檔案不足以處理；立即輪替 Secret，並另行規劃 Git history 清理。

## 發現洩漏時

1. 停止發布與傳送 ZIP。
2. 在來源平台撤銷 token／session，不等待程式修復。
3. 建立新 token 並以 Wrangler Secret 存入。
4. 查 Git history、聊天、終端紀錄、雲端硬碟、截圖與 CI logs 的曝露範圍。
5. 移除檔案中的值；如進過 Git history，使用經核准的 history rewrite 流程並通知所有 clone 使用者。
6. 驗證 Worker、Actions 與網站。
7. 留下不含 Secret 值的事件紀錄與輪替時間。

## 離職或權限移除

- 撤銷 GitHub collaborator／organization membership。
- 撤銷該人建立的 PAT 與 SSH key。
- 移除 Cloudflare member 與 Access allow email。
- 清除不再使用的 extension origin。
- 重新建立 `GITHUB_TOKEN` 並覆蓋 Worker Secret。
- 檢查 Registrar 自動續約與通知信箱仍由現任負責人掌控。
- 執行完整驗收，確認沒有因權限移除中斷發布。
