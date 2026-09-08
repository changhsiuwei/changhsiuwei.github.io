local function extract_youtube_id(url)
  if not url or url == "" then return nil end
  local id = string.match(url, "youtu%.be/([%w%-_]+)")
  if id then return id end
  id = string.match(url, "[?&]v=([%w%-_]+)")
  if id then return id end
  id = string.match(url, "youtube%.com/embed/([%w%-_]+)")
  if id then return id end
  id = string.match(url, "youtube%-nocookie%.com/embed/([%w%-_]+)")
  if id then return id end
  id = string.match(url, "youtube%.com/shorts/([%w%-_]+)")
  if id then return id end
  if string.match(url, "^[%w%-_]+$") and string.len(url) == 11 then
    return url
  end
  return nil
end

local function make_youtube_embed_block(vid)
  local embed_html = string.format(
    '<div class="post-youtube-embed" style="position:relative;padding-top:56.25%%;max-width:760px;margin:1.25rem 0 2rem 0;border-radius:14px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.1);background:#000;">' ..
    '<iframe src="https://www.youtube.com/embed/%s" style="position:absolute;inset:0;width:100%%;height:100%%;border:0;" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"></iframe>' ..
    '</div>',
    vid
  )
  return pandoc.RawBlock('html', embed_html)
end

local rendered_yt_ids = {}

local function Pandoc(doc)
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

  local blocks_to_insert = {}

  if (slides and slides ~= "") or (handout and handout ~= "") or (youtube and youtube ~= "") then
    local links = {}
    if slides and slides ~= "" then
      table.insert(links, string.format('<a href="%s" target="_blank" rel="noopener noreferrer" class="activity-materials-link activity-slides-link">📊 簡報下載 ↗</a>', slides))
    end
    if handout and handout ~= "" then
      table.insert(links, string.format('<a href="%s" target="_blank" rel="noopener noreferrer" class="activity-materials-link activity-handout-link">📄 講義／演講原文 ↗</a>', handout))
    end
    if youtube and youtube ~= "" then
      table.insert(links, string.format('<a href="%s" target="_blank" rel="noopener noreferrer" class="activity-materials-link activity-youtube-link">▶ YouTube 影片 (線上收看) ↗</a>', youtube))
    end

    local html = string.format('<div class="post-materials-bar" style="margin: 1.25rem 0 2rem 0; display: flex; flex-wrap: wrap; gap: 10px;">%s</div>', table.concat(links, "\n"))
    table.insert(blocks_to_insert, pandoc.RawBlock('html', html))
  end

  if youtube and youtube ~= "" then
    local vid = extract_youtube_id(youtube)
    if vid then
      rendered_yt_ids[vid] = true
      table.insert(blocks_to_insert, make_youtube_embed_block(vid))
    end
  end

  if #blocks_to_insert > 0 then
    for i = #blocks_to_insert, 1, -1 do
      table.insert(doc.blocks, 1, blocks_to_insert[i])
    end
  end

  return doc
end

local function Para(elem)
  if #elem.content == 1 then
    local item = elem.content[1]
    local url = nil
    if item.t == "Link" then
      url = item.target
    elseif item.t == "Str" then
      url = item.text
    end
    if url then
      local vid = extract_youtube_id(url)
      if vid and not rendered_yt_ids[vid] then
        rendered_yt_ids[vid] = true
        return make_youtube_embed_block(vid)
      elseif vid and rendered_yt_ids[vid] then
        return {}
      end
    end
  end
  return elem
end

local function SoftBreak()
  return pandoc.LineBreak()
end

return {
  { Pandoc = Pandoc },
  { Para = Para, SoftBreak = SoftBreak }
}
