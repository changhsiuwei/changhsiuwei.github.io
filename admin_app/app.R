library(shiny)
library(bslib)
library(processx)
library(digest)

# 放寬上傳檔案大小限制至 50MB
options(shiny.maxRequestSize = 50*1024^2)

# 動態掃描文章與核心頁面列表
get_all_pages <- function(site_dir) {
  core_pages <- list(
    "首頁 (index.md)" = "index.md",
    "關於我 (about/index.md)" = "about/index.md",
    "近期活動 (activities/index.md)" = "activities/index.md",
    "學術出版 (publications/index.md)" = "publications/index.md",
    "AI 教學與研究 (lab/index.md)" = "lab/index.md",
    "知識站介紹 (knowledge/index.md)" = "knowledge/index.md",
    "學生專區內容 (students/index.qmd)" = "students/index.qmd",
    "全站設定檔 (_quarto.yml)" = "_quarto.yml"
  )
  
  posts_dir <- file.path(site_dir, "knowledge", "posts")
  if (!dir.exists(posts_dir)) return(core_pages)
  
  post_files <- list.files(posts_dir, pattern = "\\.(md|qmd)$", recursive = TRUE, full.names = TRUE)
  if (length(post_files) == 0) return(core_pages)
  
  post_list <- list()
  for (pf in post_files) {
    # 取得相對路徑
    rel_path <- sub(paste0("^", normalizePath(site_dir, winslash="/"), "/?"), "", normalizePath(pf, winslash="/"))
    rel_path <- gsub("\\\\", "/", rel_path) # 確保是正斜線
    
    # 嘗試讀取 title
    lines <- tryCatch(readLines(pf, n = 20, warn = FALSE, encoding = "UTF-8"), error = function(e) character(0))
    title_line <- grep("^title:\\s*", lines, value = TRUE)
    if (length(title_line) > 0) {
      title_str <- sub("^title:\\s*\"?(.*?)\"?\\s*$", "\\1", title_line[1])
      display_name <- sprintf("📝 文章: %s", title_str)
    } else {
      display_name <- sprintf("📝 文章: %s", basename(dirname(rel_path)))
    }
    post_list[[display_name]] <- rel_path
  }
  
  # 按照路徑 (包含時間戳) 反向排序，最新的在最上面
  post_list <- post_list[order(unlist(post_list), decreasing = TRUE)]
  
  return(c(core_pages, post_list))
}

site_dir_global <- normalizePath(dirname(getwd()), winslash = "/")
pages <- get_all_pages(site_dir_global)

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
    ")
  ),
  
  # 模組 2: 靜態頁面編輯器 (設為首頁方便直接使用)
  nav_panel("📄 頁面內容管理",
    split_layout(
      left_ui = tagList(
        selectInput("edit_page_select", "選擇要編輯的頁面", choices = pages),
        actionButton("load_page_btn", "🔄 載入此頁面", class = "btn-secondary", style = "width: 100%; margin-bottom: 15px;"),
        div(
          style = "flex-grow: 1; display: flex; flex-direction: column; min-height: 200px;",
          textAreaInput("edit_page_content", "頁面原始碼", width = "100%", height = "100%", value = "")
        ),
        tags$style("
          #edit_page_content { flex-grow: 1; resize: none; font-family: monospace !important; height: 100% !important; }
          .shiny-input-container:has(#edit_page_content) { flex-grow: 1; display: flex; flex-direction: column; height: 100% !important; width: 100% !important; margin-bottom: 10px; }
        "),
        helpText("💡 系統已開啟自動儲存：打字停頓 1.5 秒即自動同步到右側預覽！"),
        actionButton("save_page_btn", "💾 手動儲存", class = "btn-primary", style = "width: 100%; margin-bottom: 20px;"),
        hr(),
        h5("🖼️ 插入圖片"),
        fileInput("upload_image", "上傳圖片至本文章 (支援多選)", multiple = TRUE, accept = c("image/png", "image/jpeg", "image/gif", "image/webp"), buttonLabel = "瀏覽...", placeholder = "尚未選擇圖片"),
        uiOutput("upload_image_msg")
      ),
      right_ui = tagList(
        h5("👁️ 即時網站預覽 (自動更新)"),
        uiOutput("preview_frame_ui")
      )
    )
  ),
  
  # 模組 1: 知識文章管理
  nav_panel("✍️ 知識庫發布",
    split_layout(
      left_ui = tagList(
        textInput("post_title", "文章標題", placeholder = "請輸入吸引人的標題..."),
        dateInput("post_date", "發布日期", value = Sys.Date()),
        textInput("post_categories", "文章分類 (用半形逗號分隔)", placeholder = "例如: AI, Teaching, 心得"),
        hr(),
        div(
          style = "flex-grow: 1; display: flex; flex-direction: column; min-height: 200px;",
          textAreaInput("post_content", "文章內文 (支援 Markdown 語法)", width = "100%", height = "100%", placeholder = "在這裡寫下您的精采內容...")
        ),
        tags$style("
          #post_content { flex-grow: 1; resize: none; font-family: monospace !important; height: 100% !important; }
          .shiny-input-container:has(#post_content) { flex-grow: 1; display: flex; flex-direction: column; height: 100% !important; width: 100% !important; margin-bottom: 10px; }
        "),
        helpText("這只會將文章儲存在電腦硬碟中。"),
        actionButton("save_post_btn", "💾 儲存並建立文章", class = "btn-lg btn-primary", style = "width: 100%; margin-bottom: 20px;")
      ),
      right_ui = tagList(
        div(
          style = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;",
          h5("👁️ 知識站即時預覽", style = "margin: 0;"),
          actionButton("refresh_knowledge_btn", "🔄 點我重回知識站", class = "btn-sm btn-outline-secondary")
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
  
  # 1. 背景啟動 Quarto Preview Server
  q_proc <- NULL
  tryCatch({
    quarto_bin <- "C:/Program Files/RStudio/resources/app/bin/quarto/bin/quarto.exe"
    if (!file.exists(quarto_bin)) quarto_bin <- "quarto" # Fallback
    
    q_proc <- processx::process$new(
      command = quarto_bin,
      args = c("preview", "--port", "4200", "--no-browser"),
      wd = site_dir,
      cleanup = TRUE,
      cleanup_tree = TRUE
    )
  }, error = function(e) {
    showNotification("警告：無法啟動 Quarto 即時預覽伺服器，預覽功能可能失效。", type = "warning", duration = 10)
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
      preview_url <- "http://localhost:4200/"
    } else {
      # 支援 .md 或是 .qmd 結尾的檔案轉成預覽網址
      url_path <- sub("index\\.(md|qmd)$", "", input$edit_page_select)
      preview_url <- paste0("http://localhost:4200/", url_path)
    }
    
    tags$iframe(src = preview_url, style = "width: 100%; height: 100%; flex-grow: 1; border: 1px solid #ddd; border-radius: 8px; background-color: white;")
  })
  
  observeEvent(input$load_page_btn, {
    file_path <- file.path(site_dir, input$edit_page_select)
    if (file.exists(file_path)) {
      content <- readLines(file_path, warn = FALSE, encoding = "UTF-8")
      ignore_next_update(TRUE)
      updateTextAreaInput(session, "edit_page_content", value = paste(content, collapse = "\n"))
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
    
    tryCatch({
      md_codes <- c()
      for (i in seq_len(nrow(img_info))) {
        # 確保檔名安全 (去除空格等)
        safe_filename <- gsub("\\s+", "_", img_info$name[i])
        target_path <- file.path(target_dir, safe_filename)
        
        file.copy(img_info$datapath[i], target_path, overwrite = TRUE)
        md_codes <- c(md_codes, sprintf("![](%s)", safe_filename))
      }
      
      output$upload_image_msg <- renderUI({
        div(
          style = "background-color: #d4edda; color: #155724; padding: 10px; border-radius: 5px; border: 1px solid #c3e6cb; margin-top: 10px;",
          tags$strong(sprintf("✅ %d 張圖片上傳成功！", nrow(img_info))),
          tags$p("請將下方語法複製並貼上到上方的編輯框中：", style = "margin-top: 5px; margin-bottom: 5px;"),
          tags$code(paste(md_codes, collapse = "\n"), style = "font-size: 14px; background-color: white; padding: 5px; border: 1px solid #ccc; display: block; white-space: pre-wrap;")
        )
      })
    }, error = function(e) {
      output$upload_image_msg <- renderUI({
        div(style = "color: red; font-weight: bold;", paste("❌ 上傳失敗：", e$message))
      })
    })
  })
  
  # 3. 模組 1: 儲存知識文章
  knowledge_url_trigger <- reactiveVal(0)
  
  observeEvent(input$refresh_knowledge_btn, {
    knowledge_url_trigger(knowledge_url_trigger() + 1)
  })
  
  output$knowledge_frame_ui <- renderUI({
    knowledge_url_trigger()
    url <- paste0("http://localhost:4200/knowledge/?t=", as.numeric(Sys.time()))
    tags$iframe(src = url, style = "width: 100%; height: 100%; flex-grow: 1; border: 1px solid #ddd; border-radius: 8px; background-color: white;")
  })

  observeEvent(input$save_post_btn, {
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
        paste0("[", paste(sprintf('"%s"', cats), collapse = ", "), "]")
      } else {
        "[]"
      }
      
      yaml_content <- sprintf(
"---
title: \"%s\"
date: \"%s\"
categories: %s
---

", 
        input$post_title, 
        format(input$post_date, "%Y-%m-%d"), 
        cat_string
      )
      
      file_content <- paste0(yaml_content, input$post_content)
      relative_file_path <- paste0("knowledge/posts/", timestamp_slug, "/index.qmd")
      file_path <- file.path(site_dir, relative_file_path)
      writeLines(file_content, file_path, useBytes = TRUE)
      
      showNotification(sprintf("✅ 文章已成功儲存至 %s！右側預覽將自動刷新。", timestamp_slug), type = "message", duration = 5)
      
      # 清空表單
      updateTextInput(session, "post_title", value = "")
      updateTextAreaInput(session, "post_content", value = "")
      
      # 動態更新「編輯網站頁面」的下拉選單
      updated_pages <- get_all_pages(site_dir)
      updateSelectInput(session, "edit_page_select", choices = updated_pages, selected = relative_file_path)
      
      # 觸發右側預覽畫面重整
      knowledge_url_trigger(knowledge_url_trigger() + 1)
      
    }, error = function(e) {
      showNotification(paste("❌ 發生錯誤：", e$message), type = "error", duration = 10)
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
  
  observeEvent(input$publish_btn, {
    showNotification("⏳ 正在與 GitHub 同步中，請稍候...", type = "message", duration = NULL, id = "git_sync")
    log_text("正在啟動同步流程...\n")
    
    tryCatch({
      setwd(site_dir)
      
      log_text(paste0(log_text(), "執行 git add .\n"))
      system("git add .")
      
      commit_msg <- sprintf("Auto-publish CMS update: %s", format(Sys.time(), "%Y-%m-%d %H:%M:%S"))
      log_text(paste0(log_text(), "執行 git commit...\n"))
      system(sprintf('git commit -m "%s"', commit_msg))
      
      log_text(paste0(log_text(), "執行 git push...\n"))
      out <- system2("git", args = c("push", "origin", "main"), stdout = TRUE, stderr = TRUE)
      log_text(paste0(log_text(), paste(out, collapse = "\n"), "\n"))
      
      setwd(app_dir)
      
      removeNotification("git_sync")
      showNotification("🎉 發布大成功！GitHub Actions 正在打包網站，大約 1~2 分鐘後即可上線！", type = "default", duration = 10)
      log_text(paste0(log_text(), "\n✅ 所有變更已成功推播至 GitHub！"))
      
    }, error = function(e) {
      setwd(app_dir)
      removeNotification("git_sync")
      showNotification("❌ 發布失敗，請查看日誌", type = "error", duration = 10)
      log_text(paste0(log_text(), "\n❌ 錯誤：", e$message))
    })
  })
}

shinyApp(ui, server, options = list(launch.browser = TRUE))
