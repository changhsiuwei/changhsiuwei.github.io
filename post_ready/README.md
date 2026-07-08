# post_ready 待發文匣

把準備發布的文章素材放在這裡，一篇文章一個日期資料夾。

範例：

```text
post_ready/
  2026-07-08/
    metadata.yml
    content.md
    image-1.png
```

然後告訴 Codex：「幫我發文」。

注意：

- 這裡的草稿素材預設不會同步到 GitHub。
- 已發布資料夾會移到 `post_ready/_published/`。
- 如果只有 PDF 或複雜 TeX，Codex 會先擷取文字與圖片，必要時重繪說明圖，再正式發布。
