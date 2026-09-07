function Pandoc(doc)
  local meta = doc.meta
  if not meta then return doc end

  local slides = nil
  local handout = nil
  local youtube = nil

  if meta.slides then slides = pandoc.utils.stringify(meta.slides) end
  if not slides and meta["slides_url"] then slides = pandoc.utils.stringify(meta["slides_url"]) end
  if not slides and meta["slides-url"] then slides = pandoc.utils.stringify(meta["slides-url"]) end

  if meta.handout then handout = pandoc.utils.stringify(meta.handout) end
  if not handout and meta["handout_url"] then handout = pandoc.utils.stringify(meta["handout_url"]) end
  if not handout and meta["handout-url"] then handout = pandoc.utils.stringify(meta["handout-url"]) end

  if meta.youtube then youtube = pandoc.utils.stringify(meta.youtube) end
  if not youtube and meta["youtube_url"] then youtube = pandoc.utils.stringify(meta["youtube_url"]) end
  if not youtube and meta["youtube-url"] then youtube = pandoc.utils.stringify(meta["youtube-url"]) end

  if (slides and slides ~= "") or (handout and handout ~= "") or (youtube and youtube ~= "") then
    local links = {}
    if slides and slides ~= "" then
      table.insert(links, string.format('<a href="%s" target="_blank" rel="noopener noreferrer" class="activity-materials-link activity-slides-link">📊 簡報下載 ↗</a>', slides))
    end
    if handout and handout ~= "" then
      table.insert(links, string.format('<a href="%s" target="_blank" rel="noopener noreferrer" class="activity-materials-link activity-handout-link">📄 講義／演講原文 ↗</a>', handout))
    end
    if youtube and youtube ~= "" then
      table.insert(links, string.format('<a href="%s" target="_blank" rel="noopener noreferrer" class="activity-materials-link activity-youtube-link">▶ YouTube 影音 ↗</a>', youtube))
    end

    local html = string.format('<div class="post-materials-bar" style="margin: 1.25rem 0 2rem 0; display: flex; flex-wrap: wrap; gap: 10px;">%s</div>', table.concat(links, "\n"))
    local rawBlock = pandoc.RawBlock('html', html)
    table.insert(doc.blocks, 1, rawBlock)
  end

  return doc
end
