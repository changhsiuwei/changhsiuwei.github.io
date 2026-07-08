library(shiny)
library(bslib)
library(processx)
library(digest)

if (.Platform$OS.type == "windows") {
  try(Sys.setlocale("LC_CTYPE", "Chinese_Taiwan.utf8"), silent = TRUE)
}

# 放寬上傳檔案大小限制至 50MB
options(shiny.maxRequestSize = 50*1024^2)

# 動態掃描固定頁面與知識貼文列表
get_core_pages <- function(site_dir) {
  list(
    "首頁 (index.md)" = "index.md",
    "關於我 (about/index.md)" = "about/index.md",
    "近期活動 (activities/index.md)" = "activities/index.md",
    "學術出版 (publications/index.md)" = "publications/index.md",
    "AI 教學與研究 (lab/index.md)" = "lab/index.md",
    "知識站介紹 (knowledge/index.md)" = "knowledge/index.md",
    "學生專區內容 (students/index.qmd)" = "students/index.qmd",
    "全站設定檔 (_quarto.yml)" = "_quarto.yml"
  )
}

read_text_file <- function(path) {
  paste(readLines(path, warn = FALSE, encoding = "UTF-8"), collapse = "\n")
}

split_front_matter_r <- function(text) {
  normalized <- gsub("\r\n", "\n", text, fixed = TRUE)
  normalized <- gsub("\r", "\n", normalized, fixed = TRUE)
  if (!startsWith(normalized, "---\n")) {
    return(list(has_yaml = FALSE, yaml = "", body = normalized))
  }
  lines <- strsplit(normalized, "\n", fixed = TRUE)[[1]]
  if (length(lines) < 2) {
    return(list(has_yaml = FALSE, yaml = "", body = normalized))
  }
  close_idx <- which(trimws(lines[-1]) == "---")
  if (length(close_idx) == 0) {
    return(list(has_yaml = FALSE, yaml = "", body = normalized))
  }
  close_idx <- close_idx[1] + 1
  yaml_lines <- if (close_idx > 2) lines[2:(close_idx - 1)] else character(0)
  body_lines <- if (length(lines) > close_idx) lines[(close_idx + 1):length(lines)] else character(0)
  list(has_yaml = TRUE, yaml = paste(yaml_lines, collapse = "\n"), body = paste(body_lines, collapse = "\n"))
}

yaml_scalar <- function(yaml_text, key, default = "") {
  lines <- strsplit(yaml_text, "\n", fixed = TRUE)[[1]]
  line <- grep(paste0("^", key, "\\s*:"), lines, value = TRUE)
  if (length(line) == 0) return(default)
  value <- trimws(sub(paste0("^", key, "\\s*:\\s*"), "", line[1]))
  value <- sub("^['\"]", "", value)
  value <- sub("['\"]$", "", value)
  if (identical(value, "")) default else value
}

yaml_bool <- function(yaml_text, key, default = FALSE) {
  value <- tolower(yaml_scalar(yaml_text, key, if (default) "true" else "false"))
  value %in% c("true", "yes", "1")
}

yaml_string <- function(value) {
  paste0('"', gsub('"', '\\"', value, fixed = TRUE), '"')
}

set_yaml_field <- function(content, key, value) {
  split <- split_front_matter_r(content)
  new_line <- paste0(key, ": ", value)
  if (!isTRUE(split$has_yaml)) {
    return(paste0("---\n", new_line, "\n---\n\n", content))
  }
  lines <- strsplit(split$yaml, "\n", fixed = TRUE)[[1]]
  if (length(lines) == 1 && identical(lines, "")) lines <- character(0)
  idx <- grep(paste0("^", key, "\\s*:"), lines)
  if (length(idx) > 0) {
    lines[idx[1]] <- new_line
    if (length(idx) > 1) lines <- lines[-idx[-1]]
  } else {
    lines <- c(lines, new_line)
  }
  paste0("---\n", paste(lines, collapse = "\n"), "\n---\n\n", split$body)
}

set_post_visibility <- function(content, visible = TRUE) {
  set_yaml_field(content, "draft", if (isTRUE(visible)) "false" else "true")
}

clean_image_caption <- function(caption, fallback = "請在此輸入圖片標題") {
  caption <- trimws(if (is.null(caption)) "" else caption)
  if (!nzchar(caption)) caption <- fallback
  caption <- gsub("[\r\n]+", " ", caption)
  caption
}

image_markdown_block <- function(filename, caption) {
  caption <- clean_image_caption(caption)
  paste0("![](", filename, ")\n\n*", caption, "*")
}

get_knowledge_posts <- function(site_dir) {
  posts_dir <- file.path(site_dir, "knowledge", "posts")
  if (!dir.exists(posts_dir)) return(list())

  post_files <- list.files(posts_dir, pattern = "\\.(md|qmd)$", recursive = TRUE, full.names = TRUE)
  post_files <- post_files[basename(post_files) %in% c("index.md", "index.qmd")]
  if (length(post_files) == 0) return(list())

  post_list <- list()
  for (pf in post_files) {
    rel_path <- sub(paste0("^", normalizePath(site_dir, winslash="/"), "/?"), "", normalizePath(pf, winslash="/"))
    rel_path <- gsub("\\\\", "/", rel_path)
    content <- tryCatch(read_text_file(pf), error = function(e) "")
    split <- split_front_matter_r(content)
    title <- yaml_scalar(split$yaml, "title", basename(dirname(rel_path)))
    date <- yaml_scalar(split$yaml, "date", "")
    hidden <- yaml_bool(split$yaml, "draft", FALSE)
    status <- if (hidden) "隱藏" else "公開"
    marker <- if (hidden) "🙈" else "🟢"
    display_name <- sprintf("%s %s：%s", marker, status, title)
    if (nzchar(date)) display_name <- paste0(display_name, "｜", date)
    post_list[[display_name]] <- rel_path
  }

  post_list <- post_list[order(unlist(post_list), decreasing = TRUE)]
  post_list
}

site_dir_global <- normalizePath(dirname(getwd()), winslash = "/")
pages <- get_core_pages(site_dir_global)
knowledge_posts <- get_knowledge_posts(site_dir_global)

# 建立自訂的自由拖拉左右分屏 UI (Flexbox)
split_layout <- function(left_ui, right_ui) {
  div(
    style = "display: flex; height: calc(100vh - 120px); width: 100%;",
    div(
      style = "resize: horizontal; overflow: auto; width: 40%; min-width: 300px; max-width: 80%; padding-right: 15px; border-right: 2px dashed #ccc; display: flex; flex-direction: column;",
      left_ui
    ),
    div(
      style = "flex-grow: 1; padding-left: 15px; min-width: 300px; height: 100%; display: flex; flex-direction: column;",
      right_ui
    )
  )
}

editor_workspace_layout <- function(sidebar_ui, editor_ui, preview_ui) {
  div(
    class = "editor-workspace",
    div(class = "editor-sidebar", sidebar_ui),
    div(class = "editor-main-pane", editor_ui),
    div(class = "editor-preview-pane", preview_ui)
  )
}

# 定義高質感自訂主題
custom_theme <- bs_theme(
  version = 5,
  bg = "#F8FAFC",
  fg = "#1E293B",
  primary = "#3B82F6",
  secondary = "#64748B",
  success = "#10B981",
  base_font = font_google("Inter"),
  heading_font = font_google("Outfit")
)

# 定義 UI 介面
ui <- page_navbar(
  title = tags$span(
    tags$i(class = "bi bi-journal-richtext", style = "margin-right: 8px; color: #3B82F6;"),
    "H.W. Chang | Academic Workspace"
  ),
  theme = custom_theme,
  header = tags$head(
    tags$style("
      /* Premium UI CSS */
      body { background-color: #F8FAFC; }
      .navbar {
        background: rgba(255, 255, 255, 0.8) !important;
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        border-bottom: 1px solid #E2E8F0;
        padding-top: 10px;
        padding-bottom: 10px;
      }
      .navbar-brand {
        font-weight: 800;
        font-size: 1.35rem;
        letter-spacing: -0.025em;
        color: #0F172A !important;
      }
      .nav-link {
        font-weight: 600;
        color: #64748B !important;
        transition: all 0.3s ease;
        padding: 8px 16px !important;
        margin: 0 4px;
        border-radius: 6px;
      }
      .nav-link:hover {
        color: #3B82F6 !important;
        background-color: #EFF6FF;
      }
      .nav-link.active {
        color: #1D4ED8 !important;
        background-color: #DBEAFE;
      }
      .btn {
        border-radius: 8px;
        font-weight: 600;
        letter-spacing: 0.025em;
        transition: all 0.3s ease;
        box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        border: none;
      }
      .btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      }
      .btn-primary { background: linear-gradient(135deg, #3B82F6, #2563EB); }
      .btn-success { background: linear-gradient(135deg, #10B981, #059669); }
      .btn-warning { background: linear-gradient(135deg, #F59E0B, #D97706); color: white; }
      .btn-danger { background: linear-gradient(135deg, #EF4444, #DC2626); color: white; }
      .btn-info { background: linear-gradient(135deg, #0EA5E9, #0284C7); color: white; }
      .form-control, .form-select {
        border-radius: 8px;
        border: 1px solid #CBD5E1;
        box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.025);
        transition: all 0.2s ease;
        padding: 10px 15px;
      }
      .form-control:focus, .form-select:focus {
        border-color: #3B82F6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
      }
      iframe {
        border-radius: 12px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
        border: 1px solid #E2E8F0 !important;
      }
      h3, h5 { color: #0F172A; font-weight: 700; letter-spacing: -0.02em; }
      .control-label { font-weight: 600; color: #475569; margin-bottom: 6px; }

      /* 自訂拖拉分屏美化 */
      .split-left {
        background: white;
        border-radius: 16px;
        padding: 20px;
        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
        border: 1px solid #E2E8F0;
        margin-right: 10px;
      }
      .split-right {
        background: transparent;
      }

      /* 美化密碼區塊 */
      .pw-display-box {
        background: linear-gradient(to right bottom, #ffffff, #f8fafc);
        color: #0f172a;
        padding: 25px;
        border-radius: 16px;
        border: 1px solid #e2e8f0;
        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
        max-width: 400px;
        margin: 0 auto;
        font-size: 18px;
      }
      .editor-workspace {
        display: grid;
        grid-template-columns: minmax(220px, 260px) minmax(600px, 1fr) minmax(360px, clamp(360px, 30vw, 560px));
        gap: 14px;
        height: calc(100vh - 104px);
        min-height: 720px;
        width: 100%;
        overflow: hidden;
      }
      .editor-sidebar,
      .editor-main-pane,
      .editor-preview-pane {
        min-height: 0;
      }
      .editor-sidebar {
        background: #FFFFFF;
        border: 1px solid #E2E8F0;
        border-radius: 10px;
        padding: 14px;
        box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
        overflow: auto;
      }
      .editor-main-pane {
        display: flex;
        flex-direction: column;
        min-width: 0;
        overflow: hidden;
      }
      .editor-preview-pane {
        display: flex;
        flex-direction: column;
        min-width: 0;
        overflow: hidden;
      }
      .sidebar-section {
        padding-bottom: 14px;
        margin-bottom: 14px;
        border-bottom: 1px solid #E2E8F0;
      }
      .sidebar-section:last-child {
        border-bottom: none;
        margin-bottom: 0;
      }
      .sidebar-section-title {
        color: #334155;
        font-size: 13px;
        font-weight: 800;
        margin-bottom: 8px;
      }
      .editor-sidebar .shiny-input-container {
        width: 100%;
      }
      .editor-sidebar .btn {
        width: 100%;
      }
      .autosave-pill {
        background: #ECFDF5;
        border: 1px solid #A7F3D0;
        border-radius: 8px;
        color: #047857;
        font-size: 12px;
        font-weight: 700;
        line-height: 1.45;
        padding: 8px 10px;
      }
      .editor-card {
        background: #ffffff;
        border: 1px solid #E2E8F0;
        border-radius: 10px;
        box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06);
        overflow: hidden;
        margin-bottom: 12px;
        flex: 1 1 auto;
        min-height: 0;
        display: flex;
        flex-direction: column;
      }
      .editor-card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 10px 12px;
        background: #F8FAFC;
        border-bottom: 1px solid #E2E8F0;
        color: #334155;
        font-weight: 700;
      }
      .editor-status {
        color: #64748B;
        font-size: 12px;
        font-weight: 600;
        white-space: nowrap;
      }
      #rich_editor,
      #knowledge_rich_editor {
        flex: 1 1 auto;
        min-height: 620px;
        height: 100%;
      }
      .toastui-editor-defaultUI {
        border: none !important;
        font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        height: 100% !important;
        min-height: 620px !important;
        display: flex !important;
        flex-direction: column !important;
      }
      .toastui-editor-main {
        flex: 1 1 auto !important;
        min-height: 0 !important;
      }
      .toastui-editor-contents {
        font-size: 17px;
        line-height: 1.75;
        color: #0F172A;
      }
      .toastui-editor-contents h1,
      .toastui-editor-contents h2,
      .toastui-editor-contents h3 {
        letter-spacing: 0;
      }
      .metadata-panel,
      .raw-source-panel {
        background: #FFFFFF;
        border: 1px solid #E2E8F0;
        border-radius: 10px;
        padding: 10px 12px;
        margin-bottom: 12px;
      }
      .metadata-panel summary,
      .raw-source-panel summary {
        cursor: pointer;
        color: #334155;
        font-weight: 700;
      }
      #edit_page_yaml,
      #edit_page_content,
      #knowledge_post_yaml,
      #knowledge_post_content {
        font-family: Consolas, 'Liberation Mono', monospace !important;
        font-size: 14px;
        line-height: 1.55;
      }
      .source-only-mode #rich_editor_shell,
      .source-only-mode #edit_yaml_panel,
      .source-only-mode #knowledge_rich_editor_shell,
      .source-only-mode #knowledge_yaml_panel {
        display: none;
      }
      #page_editor_wrapper,
      #knowledge_post_editor_wrapper {
        display: flex;
        flex-direction: column;
        min-height: 0;
        height: 100%;
      }
      #preview_frame_ui,
      #preview_frame_ui iframe {
        flex: 1 1 auto;
        min-height: 0;
      }
      .editor-preview-pane iframe {
        height: 100% !important;
        min-height: 640px;
      }
      .preview-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        margin-bottom: 8px;
      }
      .preview-header h5 {
        margin: 0;
      }
      @media (max-width: 1480px) {
        .editor-workspace {
          grid-template-columns: minmax(220px, 260px) minmax(560px, 1fr);
          grid-template-areas:
            'side main'
            'side preview';
          overflow: auto;
        }
        .editor-sidebar { grid-area: side; }
        .editor-main-pane { grid-area: main; min-height: 720px; }
        .editor-preview-pane { grid-area: preview; min-height: 520px; }
        .editor-preview-pane iframe { min-height: 520px; }
      }
      @media (max-width: 900px) {
        .editor-workspace {
          display: flex;
          flex-direction: column;
          height: auto;
          overflow: visible;
        }
        .editor-sidebar,
        .editor-main-pane,
        .editor-preview-pane {
          min-height: auto;
        }
      }
    "),
    tags$link(rel = "stylesheet", href = "toastui/toastui-editor.min.css"),
    tags$script(src = "toastui/toastui-editor-all.min.js"),
    tags$script(HTML("
      (function() {
        var states = {};
        var editorConfigs = {
          page: {
            wrapper: 'page_editor_wrapper',
            rawPanel: 'raw_source_panel',
            yamlPanel: 'edit_yaml_panel',
            raw: 'edit_page_content',
            yaml: 'edit_page_yaml',
            shell: 'rich_editor_shell',
            editor: 'rich_editor',
            status: 'editor_status',
            inputName: 'edit_page_content'
          },
          knowledge: {
            wrapper: 'knowledge_post_editor_wrapper',
            rawPanel: 'knowledge_raw_source_panel',
            yamlPanel: 'knowledge_yaml_panel',
            raw: 'knowledge_post_content',
            yaml: 'knowledge_post_yaml',
            shell: 'knowledge_rich_editor_shell',
            editor: 'knowledge_rich_editor',
            status: 'knowledge_editor_status',
            inputName: 'knowledge_post_content'
          }
        };
        var toolbarItems = [
          ['heading', 'bold', 'italic', 'strike'],
          ['hr', 'quote'],
          ['ul', 'ol', 'task', 'indent', 'outdent'],
          ['table', 'link'],
          ['code', 'codeblock']
        ];

        function byId(id) {
          return document.getElementById(id);
        }

        function getState(key) {
          if (!states[key]) {
            states[key] = {
              editor: null,
              suppressUpdate: false,
              sourceOnlyMode: false,
              pendingContent: null
            };
          }
          return states[key];
        }

        function splitFrontMatter(text) {
          text = text || '';
          var normalized = text.replace(/\\r\\n/g, '\\n');
          if (!normalized.startsWith('---\\n')) {
            return { yaml: '', body: normalized };
          }
          var lines = normalized.split('\\n');
          for (var i = 1; i < lines.length; i++) {
            if (lines[i].trim() === '---') {
              return {
                yaml: lines.slice(1, i).join('\\n'),
                body: lines.slice(i + 1).join('\\n').replace(/^\\n/, '')
              };
            }
          }
          return { yaml: '', body: normalized };
        }

        function composeContent(key) {
          var cfg = editorConfigs[key];
          var state = getState(key);
          var raw = byId(cfg.raw);
          if (state.sourceOnlyMode || !state.editor) {
            return raw ? raw.value : '';
          }
          var yamlEl = byId(cfg.yaml);
          var yaml = yamlEl ? yamlEl.value.replace(/\\s+$/g, '') : '';
          var body = state.editor.getMarkdown();
          if (yaml.length > 0) {
            return '---\\n' + yaml + '\\n---\\n\\n' + body.replace(/^\\n+/, '');
          }
          return body;
        }

        function updateStats(key, markdown) {
          var cfg = editorConfigs[key];
          var status = byId(cfg.status);
          if (!status) return;
          var text = (markdown || '')
            .replace(/```[\\s\\S]*?```/g, ' ')
            .replace(/[#>*_`\\[\\]()!-]/g, ' ')
            .trim();
          if (text.length === 0) {
            status.textContent = '0 字';
            return;
          }
          var latinWords = text.match(/[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)?/g) || [];
          var cjkChars = text.match(/[\\u3400-\\u9FFF\\uF900-\\uFAFF]/g) || [];
          status.textContent = (latinWords.length + cjkChars.length) + ' 字';
        }

        function pushContent(key) {
          var cfg = editorConfigs[key];
          var state = getState(key);
          if (state.suppressUpdate) return;
          var raw = byId(cfg.raw);
          var content = composeContent(key);
          if (raw && raw.value !== content) {
            raw.value = content;
            raw.dispatchEvent(new Event('input', { bubbles: true }));
          }
          updateStats(key, state.sourceOnlyMode ? content : (state.editor ? state.editor.getMarkdown() : content));
          if (window.Shiny) {
            Shiny.setInputValue(cfg.inputName, content, { priority: 'event' });
          }
        }

        function debounce(fn, delay) {
          var timer = null;
          return function() {
            clearTimeout(timer);
            timer = setTimeout(fn, delay);
          };
        }

        function setEditorContent(key, message) {
          var cfg = editorConfigs[key];
          var state = getState(key);
          var fullContent = (message && message.content) || '';
          state.sourceOnlyMode = !!(message && message.sourceOnly);
          initEditor(key);
          var wrapper = byId(cfg.wrapper);
          var rawPanel = byId(cfg.rawPanel);
          var yamlPanel = byId(cfg.yamlPanel);
          var raw = byId(cfg.raw);
          var yamlEl = byId(cfg.yaml);
          var split = splitFrontMatter(fullContent);

          state.suppressUpdate = true;
          if (wrapper) {
            wrapper.classList.toggle('source-only-mode', state.sourceOnlyMode);
          }
          if (rawPanel) {
            rawPanel.open = state.sourceOnlyMode;
          }
          if (yamlPanel) {
            yamlPanel.open = false;
          }
          if (raw) raw.value = fullContent;
          if (yamlEl) yamlEl.value = split.yaml;
          if (state.editor) {
            state.editor.setMarkdown(state.sourceOnlyMode ? fullContent : split.body, false);
          } else {
            state.pendingContent = fullContent;
          }
          updateStats(key, state.sourceOnlyMode ? fullContent : split.body);
          state.suppressUpdate = false;
          if (window.Shiny) {
            Shiny.setInputValue(cfg.inputName, fullContent, { priority: 'event' });
          }
        }

        function insertMarkdown(key, markdown) {
          var cfg = editorConfigs[key];
          var state = getState(key);
          markdown = markdown || '';
          if (!markdown) return;
          initEditor(key);
          if (state.sourceOnlyMode || !state.editor) {
            var raw = byId(cfg.raw);
            if (raw) {
              var start = raw.selectionStart || raw.value.length;
              var end = raw.selectionEnd || raw.value.length;
              raw.value = raw.value.slice(0, start) + markdown + raw.value.slice(end);
              raw.focus();
              raw.selectionStart = raw.selectionEnd = start + markdown.length;
            }
          } else {
            state.editor.insertText(markdown);
          }
          pushContent(key);
        }

        function initEditor(key) {
          var cfg = editorConfigs[key];
          var state = getState(key);
          var el = byId(cfg.editor);
          if (!el || state.editor) return;
          if (!window.toastui || !window.toastui.Editor) {
            var shell = byId(cfg.shell);
            if (shell) shell.style.display = 'none';
            return;
          }
          state.editor = new toastui.Editor({
            el: el,
            height: '100%',
            initialEditType: 'wysiwyg',
            previewStyle: 'vertical',
            usageStatistics: false,
            toolbarItems: toolbarItems
          });
          var debouncedPush = debounce(function() { pushContent(key); }, 300);
          state.editor.on('change', debouncedPush);
          var yamlEl = byId(cfg.yaml);
          var raw = byId(cfg.raw);
          if (yamlEl) yamlEl.addEventListener('input', debouncedPush);
          if (raw) raw.addEventListener('input', function() {
            if (state.sourceOnlyMode) debouncedPush();
          });
          if (state.pendingContent !== null) {
            setEditorContent(key, { content: state.pendingContent, sourceOnly: state.sourceOnlyMode });
            state.pendingContent = null;
          }
        }

        function registerShinyHandlers() {
          if (!window.Shiny || !Shiny.addCustomMessageHandler) {
            setTimeout(registerShinyHandlers, 100);
            return;
          }
          Shiny.addCustomMessageHandler('set-page-editor-content', function(message) {
            setEditorContent('page', message);
          });
          Shiny.addCustomMessageHandler('insert-page-markdown', function(message) {
            insertMarkdown('page', (message && message.markdown) || '');
          });
          Shiny.addCustomMessageHandler('set-knowledge-editor-content', function(message) {
            setEditorContent('knowledge', message);
          });
          Shiny.addCustomMessageHandler('insert-knowledge-markdown', function(message) {
            insertMarkdown('knowledge', (message && message.markdown) || '');
          });
        }

        document.addEventListener('DOMContentLoaded', function() {
          initEditor('page');
          initEditor('knowledge');
          registerShinyHandlers();
        });
      })();
    "))
  ),

  # 模組 2: 靜態頁面編輯器 (設為首頁方便直接使用)
  nav_panel("📄 頁面內容管理",
    editor_workspace_layout(
      sidebar_ui = tagList(
        div(
          class = "sidebar-section",
          div(class = "sidebar-section-title", "頁面"),
          selectInput("edit_page_select", "選擇要編輯的頁面", choices = pages),
          actionButton("load_page_btn", "🔄 載入此頁面", class = "btn-secondary"),
          actionButton("save_page_btn", "💾 手動儲存", class = "btn-primary", style = "margin-top: 10px;")
        ),
        div(
          class = "sidebar-section",
          div(class = "sidebar-section-title", "同步狀態"),
          div(class = "autosave-pill", "自動儲存已啟用：打字停頓 1.5 秒後會同步到右側預覽。")
        ),
        div(
          class = "sidebar-section",
          div(class = "sidebar-section-title", "插入圖片"),
          fileInput(
            "upload_image",
            "上傳圖片至本文章",
            multiple = TRUE,
            accept = c("image/png", "image/jpeg", "image/gif", "image/webp"),
            buttonLabel = "瀏覽...",
            placeholder = "尚未選擇圖片"
          ),
          textInput("upload_image_caption", "圖片標題", placeholder = "例如：課堂活動照片"),
          uiOutput("upload_image_msg")
        )
      ),
      editor_ui = tagList(
        div(
          id = "page_editor_wrapper",
          tags$details(
            id = "edit_yaml_panel",
            class = "metadata-panel",
            tags$summary("頁面設定"),
            textAreaInput("edit_page_yaml", NULL, width = "100%", height = "140px", value = "")
          ),
          div(
            id = "rich_editor_shell",
            class = "editor-card",
            div(
              class = "editor-card-header",
              tags$span("文章編輯器"),
              tags$span(id = "editor_status", class = "editor-status", "0 words")
            ),
            div(id = "rich_editor")
          ),
          tags$details(
            id = "raw_source_panel",
            class = "raw-source-panel",
            tags$summary("完整原始碼"),
            textAreaInput("edit_page_content", NULL, width = "100%", height = "260px", value = "")
          )
        )
      ),
      preview_ui = tagList(
        div(
          class = "preview-header",
          h5("👁️ 即時網站預覽"),
          tags$span(class = "editor-status", "自動更新")
        ),
        uiOutput("preview_frame_ui")
      )
    )
  ),

  # 模組 1: 知識站管理
  nav_panel("✍️ 知識站管理",
    editor_workspace_layout(
      sidebar_ui = tagList(
        div(
          class = "sidebar-section",
          div(class = "sidebar-section-title", "新增貼文"),
          textInput("post_title", "文章標題", placeholder = "請輸入文章標題"),
          dateInput("post_date", "發布日期", value = Sys.Date()),
          textInput("post_categories", "文章分類", placeholder = "例如: AI, Teaching, 心得"),
          checkboxInput("post_public", "建立後立即公開", value = TRUE),
          actionButton("create_post_btn", "＋ 建立並載入貼文", class = "btn-primary")
        ),
        div(
          class = "sidebar-section",
          div(class = "sidebar-section-title", "管理既有貼文"),
          selectInput("knowledge_post_select", "選擇知識貼文", choices = knowledge_posts),
          actionButton("load_knowledge_post_btn", "🔄 載入貼文", class = "btn-secondary"),
          radioButtons(
            "knowledge_post_visibility",
            "公開狀態",
            choices = c("公開" = "open", "隱藏" = "hidden"),
            selected = "open",
            inline = TRUE
          ),
          actionButton("save_knowledge_post_btn", "💾 儲存內容與狀態", class = "btn-primary", style = "margin-top: 10px;"),
          actionButton("delete_knowledge_post_btn", "🗑️ 移至垃圾桶", class = "btn-danger", style = "margin-top: 10px;")
        ),
        div(
          class = "sidebar-section",
          div(class = "sidebar-section-title", "貼文狀態"),
          uiOutput("knowledge_post_status")
        ),
        div(
          class = "sidebar-section",
          div(class = "sidebar-section-title", "插入圖片"),
          fileInput(
            "knowledge_upload_image",
            "上傳圖片至此貼文",
            multiple = TRUE,
            accept = c("image/png", "image/jpeg", "image/gif", "image/webp"),
            buttonLabel = "瀏覽...",
            placeholder = "尚未選擇圖片"
          ),
          textInput("knowledge_image_caption", "圖片標題", placeholder = "例如：成本會計中的預測式 AI"),
          uiOutput("knowledge_upload_image_msg")
        )
      ),
      editor_ui = tagList(
        div(
          id = "knowledge_post_editor_wrapper",
          tags$details(
            id = "knowledge_yaml_panel",
            class = "metadata-panel",
            tags$summary("貼文設定"),
            textAreaInput("knowledge_post_yaml", NULL, width = "100%", height = "140px", value = "")
          ),
          div(
            id = "knowledge_rich_editor_shell",
            class = "editor-card",
            div(
              class = "editor-card-header",
              tags$span("知識貼文編輯器"),
              tags$span(id = "knowledge_editor_status", class = "editor-status", "0 字")
            ),
            div(id = "knowledge_rich_editor")
          ),
          tags$details(
            id = "knowledge_raw_source_panel",
            class = "raw-source-panel",
            tags$summary("完整原始碼"),
            textAreaInput("knowledge_post_content", NULL, width = "100%", height = "260px", value = "")
          )
        )
      ),
      preview_ui = tagList(
        div(
          class = "preview-header",
          h5("👁️ 知識站預覽"),
          actionButton("refresh_knowledge_btn", "🔄 重新整理", class = "btn-sm btn-outline-secondary")
        ),
        uiOutput("knowledge_frame_ui")
      )
    )
  ),

  # 模組 4: 學生專區密碼設定
  nav_panel("🔐 存取權限設定",
    fluidRow(
      column(12, align = "center", style = "margin-top: 50px;",
        h3("變更學生專區通行密碼"),
        p("在此設定的密碼將會保護「學生專區」頁面。"),
        uiOutput("current_password_display"),
        div(style = "max-width: 400px; margin: 0 auto; margin-top: 20px;",
          textInput("new_student_pw", "請輸入新密碼", placeholder = "請輸入高強度密碼..."),
          actionButton("save_pw_btn", "💾 儲存並更新密碼", class = "btn-lg btn-warning", style = "width: 100%; font-weight: bold;")
        )
      )
    )
  ),

  # 模組 3: 雲端發布
  nav_panel("☁️ 雲端同步與部署",
    fluidRow(
      column(12, align = "center",
        h3("將所有變更上傳至 GitHub"),
        p("當您完成所有的文章新增與頁面修改後，點擊下方按鈕，系統將為您自動上傳並更新網站。"),
        actionButton("publish_btn", "🚀 一鍵發布至 GitHub", class = "btn-lg btn-success", style = "width: 50%; padding: 20px; font-size: 20px;"),
        br(), br(),
        verbatimTextOutput("git_log", placeholder = TRUE)
      )
    )
  ),

  nav_spacer(),
  nav_item(
    tags$a(
      href = "https://changhsiuwei.github.io/",
      target = "_blank",
      class = "btn btn-info",
      style = "color: white; font-weight: bold; margin-top: 5px;",
      "🌐 瀏覽正式上線網站"
    )
  )
)

# 定義 Server 邏輯
server <- function(input, output, session) {

  app_dir <- getwd()
  site_dir <- normalizePath(dirname(app_dir), winslash = "/")
  preview_host <- "127.0.0.1"
  preview_port <- "4200"
  preview_base_url <- paste0("http://", preview_host, ":", preview_port)
  preview_is_ready <- function() {
    conn <- tryCatch(
      socketConnection(
        host = preview_host,
        port = as.integer(preview_port),
        open = "r+",
        blocking = TRUE,
        timeout = 1
      ),
      error = function(e) NULL
    )
    if (is.null(conn)) return(FALSE)
    close(conn)
    TRUE
  }

  find_quarto_bin <- function() {
    candidates <- c(
      Sys.which("quarto"),
      "C:/Users/f1240/AppData/Local/Programs/Quarto/bin/quarto.exe",
      "C:/Program Files/RStudio/resources/app/bin/quarto/bin/quarto.exe",
      "quarto"
    )
    candidates <- candidates[nzchar(candidates)]
    existing <- candidates[file.exists(candidates)]
    if (length(existing) > 0) return(normalizePath(existing[[1]], winslash = "/"))
    "quarto"
  }
  start_quarto_hidden <- function(quarto_bin, site_dir) {
    preview_args <- c("preview", "--host", preview_host, "--port", preview_port, "--no-browser")
    if (.Platform$OS.type == "windows") {
      ps_quote <- function(x) paste0("'", gsub("'", "''", x, fixed = TRUE), "'")
      arg_list <- paste(ps_quote(preview_args), collapse = ", ")
      ps_command <- paste0(
        "Start-Process -FilePath ", ps_quote(quarto_bin),
        " -ArgumentList @(", arg_list, ")",
        " -WorkingDirectory ", ps_quote(site_dir),
        " -WindowStyle Hidden"
      )
      system2(
        "powershell.exe",
        args = c("-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps_command),
        wait = TRUE
      )
    } else {
      old_wd <- getwd()
      on.exit(setwd(old_wd), add = TRUE)
      setwd(site_dir)
      system2(quarto_bin, args = preview_args, wait = FALSE)
    }
  }

  # 1. 背景啟動 Quarto Preview Server
  q_proc <- NULL
  tryCatch({
    if (!preview_is_ready()) {
      quarto_bin <- find_quarto_bin()
      start_quarto_hidden(quarto_bin, site_dir)
      for (i in seq_len(30)) {
        Sys.sleep(1)
        if (preview_is_ready()) break
      }
      if (!preview_is_ready()) {
        showNotification(
          "警告：Quarto 即時預覽伺服器尚未在 4200 port 回應，右側預覽可能暫時失效。",
          type = "warning",
          duration = 15
        )
      }
    }
  }, error = function(e) {
    showNotification(
      paste("警告：無法啟動 Quarto 即時預覽伺服器，預覽功能可能失效：", e$message),
      type = "warning",
      duration = 15
    )
  })

  session$onSessionEnded(function() {
    if (!is.null(q_proc) && q_proc$is_alive()) {
      q_proc$kill_tree()
    }
  })

  # 2. 模組 2: 載入與動態 Iframe
  current_loaded_file <- reactiveVal(NULL)
  ignore_next_update <- reactiveVal(FALSE)

  output$preview_frame_ui <- renderUI({
    req(input$edit_page_select)

    if (input$edit_page_select == "_quarto.yml") {
      preview_url <- paste0(preview_base_url, "/")
    } else {
      # 支援 .md 或是 .qmd 結尾的檔案轉成預覽網址
      url_path <- sub("index\\.(md|qmd)$", "", input$edit_page_select)
      preview_url <- paste0(preview_base_url, "/", url_path)
    }

    tags$iframe(src = preview_url, style = "width: 100%; height: 100%; flex-grow: 1; border: 1px solid #ddd; border-radius: 8px; background-color: white;")
  })

  observeEvent(input$load_page_btn, {
    file_path <- file.path(site_dir, input$edit_page_select)
    if (file.exists(file_path)) {
      content <- readLines(file_path, warn = FALSE, encoding = "UTF-8")
      content_text <- paste(content, collapse = "\n")
      ignore_next_update(TRUE)
      updateTextAreaInput(session, "edit_page_content", value = content_text)
      session$sendCustomMessage(
        "set-page-editor-content",
        list(
          content = content_text,
          sourceOnly = identical(input$edit_page_select, "_quarto.yml")
        )
      )
      current_loaded_file(file_path)
      showNotification("✅ 頁面載入成功！右側預覽已同步切換。", type = "message")
    } else {
      showNotification("❌ 找不到該檔案！", type = "error")
    }
  })

  content_rx <- reactive({ input$edit_page_content })
  content_debounced <- debounce(content_rx, millis = 1500)

  observeEvent(content_debounced(), {
    req(current_loaded_file())
    if (ignore_next_update()) {
      ignore_next_update(FALSE)
      return()
    }
    file_path <- current_loaded_file()
    if (file.exists(file_path)) {
      writeLines(content_debounced(), file_path, useBytes = TRUE)
    }
  }, ignoreInit = TRUE)

  observeEvent(input$save_page_btn, {
    req(current_loaded_file())
    req(input$edit_page_content)
    file_path <- current_loaded_file()
    tryCatch({
      writeLines(input$edit_page_content, file_path, useBytes = TRUE)
      showNotification("✅ 手動儲存成功！", type = "message")
    }, error = function(e) {
      showNotification(paste("❌ 儲存失敗：", e$message), type = "error")
    })
  })

  # 處理圖片上傳
  observeEvent(input$upload_image, {
    req(input$upload_image)
    req(current_loaded_file())

    img_info <- input$upload_image
    target_dir <- dirname(current_loaded_file())
    caption <- clean_image_caption(input$upload_image_caption)

    tryCatch({
      md_codes <- c()
      for (i in seq_len(nrow(img_info))) {
        # 確保檔名安全 (去除空格等)
        safe_filename <- gsub("\\s+", "_", img_info$name[i])
        target_path <- file.path(target_dir, safe_filename)

        file.copy(img_info$datapath[i], target_path, overwrite = TRUE)
        md_codes <- c(md_codes, image_markdown_block(safe_filename, caption))
      }

      output$upload_image_msg <- renderUI({
        div(
          style = "background-color: #d4edda; color: #155724; padding: 10px; border-radius: 5px; border: 1px solid #c3e6cb; margin-top: 10px;",
          tags$strong(sprintf("✅ %d 張圖片上傳成功！", nrow(img_info))),
          tags$p("圖片與圖標題已插入目前編輯位置；也可複製下方語法手動貼上：", style = "margin-top: 5px; margin-bottom: 5px;"),
          tags$code(paste(md_codes, collapse = "\n"), style = "font-size: 14px; background-color: white; padding: 5px; border: 1px solid #ccc; display: block; white-space: pre-wrap;")
        )
      })
      session$sendCustomMessage(
        "insert-page-markdown",
        list(markdown = paste(md_codes, collapse = "\n\n"))
      )
    }, error = function(e) {
      output$upload_image_msg <- renderUI({
        div(style = "color: red; font-weight: bold;", paste("❌ 上傳失敗：", e$message))
      })
    })
  })

  # 3. 模組 1: 知識站管理
  knowledge_url_trigger <- reactiveVal(0)
  current_knowledge_post_file <- reactiveVal(NULL)
  current_knowledge_post_rel <- reactiveVal(NULL)
  current_knowledge_post_hidden <- reactiveVal(FALSE)
  pending_delete_knowledge_post_rel <- reactiveVal(NULL)

  move_knowledge_post_to_trash <- function(relative_file_path) {
    if (is.null(relative_file_path) || !nzchar(relative_file_path)) {
      stop("尚未選擇知識貼文。")
    }
    file_path <- normalizePath(file.path(site_dir, relative_file_path), winslash = "/", mustWork = TRUE)
    posts_root <- normalizePath(file.path(site_dir, "knowledge", "posts"), winslash = "/", mustWork = TRUE)
    if (!startsWith(tolower(file_path), paste0(tolower(posts_root), "/"))) {
      stop("安全檢查失敗：只能刪除 knowledge/posts/ 內的貼文。")
    }
    if (!basename(file_path) %in% c("index.md", "index.qmd")) {
      stop("安全檢查失敗：只能刪除貼文的 index.md 或 index.qmd。")
    }

    post_dir <- dirname(file_path)
    trash_root <- file.path(site_dir, "knowledge", "_trash")
    dir.create(trash_root, recursive = TRUE, showWarnings = FALSE)
    trash_root <- normalizePath(trash_root, winslash = "/", mustWork = TRUE)

    stamp <- format(Sys.time(), "%Y%m%d-%H%M%S")
    base_target <- file.path(trash_root, paste0(stamp, "-", basename(post_dir)))
    target_dir <- base_target
    i <- 1
    while (file.exists(target_dir)) {
      target_dir <- paste0(base_target, "-", i)
      i <- i + 1
    }

    moved <- file.rename(post_dir, target_dir)
    if (!isTRUE(moved)) {
      stop("無法移動貼文資料夾到垃圾桶。")
    }

    rel_trash <- sub(paste0("^", normalizePath(site_dir, winslash = "/"), "/?"), "", normalizePath(target_dir, winslash = "/"))
    list(trash_dir = target_dir, rel_trash = rel_trash)
  }

  refresh_knowledge_post_choices <- function(selected = NULL) {
    choices <- get_knowledge_posts(site_dir)
    updateSelectInput(session, "knowledge_post_select", choices = choices, selected = selected)
  }

  load_knowledge_post <- function(relative_file_path) {
    if (is.null(relative_file_path) || !nzchar(relative_file_path)) {
      showNotification("目前沒有可載入的知識貼文。", type = "warning")
      return(invisible(FALSE))
    }
    file_path <- file.path(site_dir, relative_file_path)
    if (!file.exists(file_path)) {
      showNotification("❌ 找不到該知識貼文檔案！", type = "error")
      return(invisible(FALSE))
    }
    content_text <- read_text_file(file_path)
    split <- split_front_matter_r(content_text)
    hidden <- yaml_bool(split$yaml, "draft", FALSE)

    updateRadioButtons(session, "knowledge_post_visibility", selected = if (hidden) "hidden" else "open")
    updateTextAreaInput(session, "knowledge_post_content", value = content_text)
    session$sendCustomMessage(
      "set-knowledge-editor-content",
      list(content = content_text, sourceOnly = FALSE)
    )
    current_knowledge_post_file(file_path)
    current_knowledge_post_rel(relative_file_path)
    current_knowledge_post_hidden(hidden)
    knowledge_url_trigger(knowledge_url_trigger() + 1)
    showNotification("✅ 知識貼文已載入。", type = "message")
    invisible(TRUE)
  }

  observeEvent(input$refresh_knowledge_btn, {
    knowledge_url_trigger(knowledge_url_trigger() + 1)
  })

  output$knowledge_frame_ui <- renderUI({
    knowledge_url_trigger()
    url <- paste0(preview_base_url, "/knowledge/?t=", as.numeric(Sys.time()))
    tags$iframe(src = url, style = "width: 100%; height: 100%; flex-grow: 1; border: 1px solid #ddd; border-radius: 8px; background-color: white;")
  })

  output$knowledge_post_status <- renderUI({
    rel_path <- current_knowledge_post_rel()
    if (is.null(rel_path)) {
      return(div(class = "autosave-pill", "尚未載入貼文。"))
    }
    hidden <- current_knowledge_post_hidden()
    color_style <- if (hidden) {
      "background:#FFF7ED;border-color:#FDBA74;color:#C2410C;"
    } else {
      "background:#ECFDF5;border-color:#A7F3D0;color:#047857;"
    }
    div(
      class = "autosave-pill",
      style = color_style,
      tags$strong(if (hidden) "目前狀態：隱藏" else "目前狀態：公開"),
      tags$br(),
      tags$small(rel_path)
    )
  })

  observeEvent(input$load_knowledge_post_btn, {
    load_knowledge_post(input$knowledge_post_select)
  })

  observeEvent(input$delete_knowledge_post_btn, {
    rel_path <- input$knowledge_post_select
    if (is.null(rel_path) || !nzchar(rel_path)) {
      showNotification("目前沒有可刪除的知識貼文。", type = "warning")
      return()
    }

    file_path <- file.path(site_dir, rel_path)
    if (!file.exists(file_path)) {
      showNotification("❌ 找不到該知識貼文檔案。", type = "error")
      return()
    }

    content_text <- read_text_file(file_path)
    split <- split_front_matter_r(content_text)
    post_title <- yaml_scalar(split$yaml, "title", basename(dirname(rel_path)))
    pending_delete_knowledge_post_rel(rel_path)

    showModal(modalDialog(
      title = "確認刪除知識貼文",
      tags$p("這篇貼文會從知識站管理清單移除，並移到本機垃圾桶資料夾："),
      tags$code("knowledge/_trash/"),
      tags$hr(),
      tags$p(tags$strong("貼文："), post_title),
      tags$p(tags$strong("路徑："), tags$code(rel_path)),
      tags$p("這個操作不會立刻永久刪除檔案，但發布前仍請確認網站列表。"),
      easyClose = TRUE,
      footer = tagList(
        modalButton("取消"),
        actionButton("confirm_delete_knowledge_post_btn", "確認移至垃圾桶", class = "btn-danger")
      )
    ))
  })

  observeEvent(input$confirm_delete_knowledge_post_btn, {
    rel_path <- pending_delete_knowledge_post_rel()
    req(rel_path)

    tryCatch({
      result <- move_knowledge_post_to_trash(rel_path)
      removeModal()
      pending_delete_knowledge_post_rel(NULL)

      current_knowledge_post_file(NULL)
      current_knowledge_post_rel(NULL)
      current_knowledge_post_hidden(FALSE)
      updateRadioButtons(session, "knowledge_post_visibility", selected = "open")
      updateTextAreaInput(session, "knowledge_post_content", value = "")
      session$sendCustomMessage(
        "set-knowledge-editor-content",
        list(content = "", sourceOnly = FALSE)
      )
      output$knowledge_upload_image_msg <- renderUI(NULL)

      refresh_knowledge_post_choices()
      knowledge_url_trigger(knowledge_url_trigger() + 1)
      showNotification(
        paste0("✅ 貼文已移至垃圾桶：", result$rel_trash),
        type = "message",
        duration = 8
      )
    }, error = function(e) {
      removeModal()
      showNotification(paste("❌ 刪除貼文失敗：", e$message), type = "error", duration = 10)
    })
  })

  observeEvent(input$create_post_btn, {
    if (trimws(input$post_title) == "") {
      showNotification("❌ 儲存失敗：文章標題不能為空！", type = "error", duration = 5)
      return()
    }

    tryCatch({
      timestamp_slug <- format(Sys.time(), "post-%Y%m%d-%H%M%S")
      post_dir <- file.path(site_dir, "knowledge", "posts", timestamp_slug)
      dir.create(post_dir, recursive = TRUE, showWarnings = FALSE)

      cats <- unlist(strsplit(input$post_categories, ","))
      cats <- trimws(cats)
      cats <- cats[cats != ""]
      cat_string <- if (length(cats) > 0) {
        paste0("[", paste(vapply(cats, yaml_string, character(1)), collapse = ", "), "]")
      } else {
        "[]"
      }
      draft_value <- if (isTRUE(input$post_public)) "false" else "true"

      yaml_content <- sprintf(
"---
title: \"%s\"
date: \"%s\"
categories: %s
draft: %s
---

",
        input$post_title,
        format(input$post_date, "%Y-%m-%d"),
        cat_string,
        draft_value
      )

      file_content <- yaml_content
      relative_file_path <- paste0("knowledge/posts/", timestamp_slug, "/index.qmd")
      file_path <- file.path(site_dir, relative_file_path)
      writeLines(file_content, file_path, useBytes = TRUE)

      showNotification(sprintf("✅ 新貼文已建立並載入：%s", timestamp_slug), type = "message", duration = 5)

      updateTextInput(session, "post_title", value = "")
      updateTextInput(session, "post_categories", value = "")
      refresh_knowledge_post_choices(selected = relative_file_path)
      load_knowledge_post(relative_file_path)
      knowledge_url_trigger(knowledge_url_trigger() + 1)

    }, error = function(e) {
      showNotification(paste("❌ 發生錯誤：", e$message), type = "error", duration = 10)
    })
  })

  observeEvent(input$save_knowledge_post_btn, {
    req(current_knowledge_post_file())
    req(input$knowledge_post_content)
    visible <- identical(input$knowledge_post_visibility, "open")
    file_path <- current_knowledge_post_file()
    rel_path <- current_knowledge_post_rel()

    tryCatch({
      content_text <- set_post_visibility(input$knowledge_post_content, visible = visible)
      writeLines(content_text, file_path, useBytes = TRUE)
      updateTextAreaInput(session, "knowledge_post_content", value = content_text)
      session$sendCustomMessage(
        "set-knowledge-editor-content",
        list(content = content_text, sourceOnly = FALSE)
      )
      current_knowledge_post_hidden(!visible)
      refresh_knowledge_post_choices(selected = rel_path)
      knowledge_url_trigger(knowledge_url_trigger() + 1)
      showNotification(if (visible) "✅ 貼文已儲存並設為公開。" else "✅ 貼文已儲存並設為隱藏。", type = "message")
    }, error = function(e) {
      showNotification(paste("❌ 儲存知識貼文失敗：", e$message), type = "error")
    })
  })

  observeEvent(input$knowledge_upload_image, {
    req(input$knowledge_upload_image)
    req(current_knowledge_post_file())

    img_info <- input$knowledge_upload_image
    target_dir <- dirname(current_knowledge_post_file())
    caption <- clean_image_caption(input$knowledge_image_caption)

    tryCatch({
      md_codes <- c()
      for (i in seq_len(nrow(img_info))) {
        safe_filename <- gsub("\\s+", "_", img_info$name[i])
        target_path <- file.path(target_dir, safe_filename)
        file.copy(img_info$datapath[i], target_path, overwrite = TRUE)
        md_codes <- c(md_codes, image_markdown_block(safe_filename, caption))
      }

      output$knowledge_upload_image_msg <- renderUI({
        div(
          style = "background-color: #d4edda; color: #155724; padding: 10px; border-radius: 5px; border: 1px solid #c3e6cb; margin-top: 10px;",
          tags$strong(sprintf("✅ %d 張圖片上傳成功！", nrow(img_info))),
          tags$p("圖片與圖標題已插入目前編輯位置；也可複製下方語法手動貼上：", style = "margin-top: 5px; margin-bottom: 5px;"),
          tags$code(paste(md_codes, collapse = "\n"), style = "font-size: 14px; background-color: white; padding: 5px; border: 1px solid #ccc; display: block; white-space: pre-wrap;")
        )
      })
      session$sendCustomMessage(
        "insert-knowledge-markdown",
        list(markdown = paste(md_codes, collapse = "\n\n"))
      )
    }, error = function(e) {
      output$knowledge_upload_image_msg <- renderUI({
        div(style = "color: red; font-weight: bold;", paste("❌ 上傳失敗：", e$message))
      })
    })
  })

  # 5. 模組 4: 學生密碼設定邏輯
  output$current_password_display <- renderUI({
    # 讀取本地隱藏檔
    input$save_pw_btn # 綁定按鈕事件以觸發更新
    secret_path <- file.path(site_dir, "students", ".password_secret.txt")
    if (file.exists(secret_path)) {
      current_pw <- readLines(secret_path, warn = FALSE)[1]
    } else {
      current_pw <- "1234 (預設值)"
    }
    div(
      class = "pw-display-box",
      tags$strong("👀 目前設定的存取密碼：", style = "color: #475569; font-size: 16px;"), tags$br(), tags$br(),
      tags$span(current_pw, style = "font-size: 28px; font-weight: 800; letter-spacing: 4px; color: #0F172A; background: #E2E8F0; padding: 5px 15px; border-radius: 8px;")
    )
  })

  observeEvent(input$save_pw_btn, {
    if (trimws(input$new_student_pw) == "") {
      showNotification("❌ 密碼不能為空！", type = "error")
      return()
    }
    tryCatch({
      # 使用 SHA-256 進行 Hash，發布到網路上
      safe_pw <- trimws(input$new_student_pw)
      hash_val <- digest::digest(safe_pw, algo = "sha256", serialize = FALSE)
      hash_path <- file.path(site_dir, "students", "password_hash.txt")
      writeLines(hash_val, hash_path)

      # 另外將明文儲存到本地隱藏檔 (已被 .gitignore 阻擋，不會上傳)
      secret_path <- file.path(site_dir, "students", ".password_secret.txt")
      writeLines(safe_pw, secret_path)

      showNotification("✅ 學生專區密碼已成功更新！", type = "message", duration = 5)
      updateTextInput(session, "new_student_pw", value = "")
    }, error = function(e) {
      showNotification(paste("❌ 設定密碼失敗：", e$message), type = "error")
    })
  })

  # 4. 模組 3: 執行 Git 發布
  log_text <- reactiveVal("系統準備就緒。等待操作...\n")
  output$git_log <- renderText({ log_text() })

  append_git_log <- function(text) {
    log_text(paste0(log_text(), text))
  }

  run_process_logged <- function(command, args, label, allow_status = integer()) {
    append_git_log(paste0("\n▶ ", label, "\n$ ", command, " ", paste(args, collapse = " "), "\n"))
    out <- tryCatch(
      suppressWarnings(system2(command, args = args, stdout = TRUE, stderr = TRUE)),
      error = function(e) structure(e$message, status = 127L)
    )
    status <- attr(out, "status")
    if (is.null(status)) status <- 0L

    if (length(out) > 0 && nzchar(paste(out, collapse = ""))) {
      append_git_log(paste0(paste(out, collapse = "\n"), "\n"))
    } else {
      append_git_log("(沒有輸出)\n")
    }

    if (!(status %in% c(0L, allow_status))) {
      stop(sprintf("%s 失敗，exit code: %s", label, status), call. = FALSE)
    }

    list(output = out, status = status)
  }

  publish_pathspecs <- c(
    ".agents",
    ".github",
    ".gitignore",
    ".quartoignore",
    ".Rprofile",
    ".space",
    ".trash",
    "_quarto.yml",
    "about",
    "activities",
    "admin_app",
    "custom.scss",
    "DEPENDENCIES.md",
    "index.md",
    "install_r_packages.R",
    "knowledge",
    "lab",
    "launch_cms_clean.R",
    "maintain_quarto_shiny_cms",
    "profile.png",
    "publications",
    "Quarto_Website.Rproj",
    "run_cms.R",
    "START_HERE.md",
    "students",
    "styles.css",
    "WEBSITE_UPDATE_MAINTENANCE_MANUAL.md"
  )

  observeEvent(input$publish_btn, {
    showNotification("⏳ 正在與 GitHub 同步中，請稍候...", type = "message", duration = NULL, id = "git_sync")
    log_text("正在啟動同步流程...\n")

    tryCatch({
      old_wd <- getwd()
      on.exit(setwd(old_wd), add = TRUE)
      setwd(site_dir)

      if (!file.exists(file.path(site_dir, ".git"))) {
        stop(
          paste0(
            "目前資料夾不是 Git 工作副本，無法同步到 GitHub。\n",
            "目前資料夾：", site_dir, "\n\n",
            "請先把整理包接回遠端 repo，例如：\n",
            "git init\n",
            "git branch -M main\n",
            "git remote add origin https://github.com/changhsiuwei/changhsiuwei.github.io.git\n",
            "git fetch origin main\n"
          ),
          call. = FALSE
        )
      }

      inside_repo <- run_process_logged("git", c("rev-parse", "--is-inside-work-tree"), "檢查 Git 工作副本")
      if (!any(trimws(inside_repo$output) == "true")) {
        stop("目前資料夾不是有效的 Git 工作副本。", call. = FALSE)
      }

      run_process_logged("git", c("remote", "get-url", "origin"), "檢查 GitHub origin")

      quarto_bin <- find_quarto_bin()
      run_process_logged(quarto_bin, c("render"), "執行 Quarto render")

      run_process_logged("git", c("status", "--short", "--", publish_pathspecs), "檢查可發布變更")
      run_process_logged(
        "git",
        c("-c", "advice.addIgnoredFile=false", "add", "-A", "--", publish_pathspecs),
        "加入可發布變更"
      )

      staged <- run_process_logged("git", c("diff", "--cached", "--quiet"), "檢查是否有可提交變更", allow_status = 1L)
      if (identical(staged$status, 0L)) {
        removeNotification("git_sync")
        showNotification("目前沒有新的變更需要同步。", type = "message", duration = 8)
        append_git_log("\n✅ 沒有新的檔案變更，未建立 commit。\n")
        return(invisible(NULL))
      }

      commit_msg <- sprintf("Auto-publish CMS update: %s", format(Sys.time(), "%Y-%m-%d %H:%M:%S"))
      run_process_logged("git", c("commit", "-m", commit_msg), "建立 commit")
      run_process_logged("git", c("push", "origin", "main"), "推送到 GitHub")

      removeNotification("git_sync")
      showNotification("🎉 發布大成功！GitHub Actions 正在打包網站，大約 1~2 分鐘後即可上線！", type = "default", duration = 10)
      log_text(paste0(log_text(), "\n✅ 所有變更已成功推播至 GitHub！"))

    }, error = function(e) {
      removeNotification("git_sync")
      showNotification("❌ 發布失敗，請查看日誌", type = "error", duration = 10)
      log_text(paste0(log_text(), "\n❌ 錯誤：", e$message))
    })
  })
}

shinyApp(ui, server)
