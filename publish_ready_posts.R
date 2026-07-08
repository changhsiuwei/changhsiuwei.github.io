# Publish prepared folders from post_ready/ into knowledge/posts/.
#
# Usage:
#   Rscript publish_ready_posts.R
#   Rscript publish_ready_posts.R --publish
#   Rscript publish_ready_posts.R --folder 2026-07-08 --publish
#
# Draft folders are local-only by default. After import they are moved into
# post_ready/_published/ so the same source is not posted twice.

find_site_root <- function(path = getwd()) {
  path <- normalizePath(path, winslash = "/", mustWork = FALSE)
  candidates <- unique(c(path, dirname(path), dirname(dirname(path))))
  for (candidate in candidates) {
    if (
      file.exists(file.path(candidate, "_quarto.yml")) &&
        dir.exists(file.path(candidate, "knowledge", "posts"))
    ) {
      return(normalizePath(candidate, winslash = "/", mustWork = TRUE))
    }
  }
  stop("Cannot find the Quarto website root. Run this script from the website folder.")
}

args <- commandArgs(trailingOnly = TRUE)
has_flag <- function(flag) flag %in% args
arg_value <- function(flag, default = NULL) {
  idx <- match(flag, args)
  if (is.na(idx) || idx >= length(args)) return(default)
  args[[idx + 1]]
}

if (has_flag("--help") || has_flag("-h")) {
  cat(
    "post_ready publisher\n",
    "\n",
    "Options:\n",
    "  --folder NAME      Publish one post_ready subfolder.\n",
    "  --publish          Render, commit, push, and wait for GitHub Actions.\n",
    "  --no-archive       Keep the source folder in post_ready after import.\n",
    "  --overwrite        Replace existing knowledge/posts/<slug> folder.\n",
    "  --dry-run          Report what would happen without writing files.\n",
    sep = ""
  )
  quit(status = 0)
}

site_dir <- find_site_root()
setwd(site_dir)

if (.Platform$OS.type == "windows") {
  try(Sys.setlocale("LC_CTYPE", "Chinese_Taiwan.utf8"), silent = TRUE)
}

ready_root <- file.path(site_dir, "post_ready")
posts_root <- file.path(site_dir, "knowledge", "posts")
published_root <- file.path(ready_root, "_published")

publish <- has_flag("--publish")
archive_source <- !has_flag("--no-archive")
overwrite <- has_flag("--overwrite")
dry_run <- has_flag("--dry-run")
folder_arg <- arg_value("--folder")

dir.create(ready_root, recursive = TRUE, showWarnings = FALSE)
dir.create(posts_root, recursive = TRUE, showWarnings = FALSE)

message_line <- function(...) message(paste0(...))

read_text <- function(path) {
  encodings <- c("UTF-8", "UTF-8-BOM", "CP950", "BIG5", "latin1")
  for (enc in encodings) {
    value <- tryCatch(
      paste(readLines(path, warn = FALSE, encoding = enc), collapse = "\n"),
      error = function(e) NULL
    )
    if (!is.null(value)) {
      value <- sub("^\ufeff", "", value)
      return(value)
    }
  }
  stop("Cannot read text file: ", path)
}

write_text <- function(text, path) {
  dir.create(dirname(path), recursive = TRUE, showWarnings = FALSE)
  writeLines(text, path, useBytes = TRUE)
}

yaml_quote <- function(value) {
  value <- gsub("\\", "\\\\", value, fixed = TRUE)
  value <- gsub('"', '\\"', value, fixed = TRUE)
  paste0('"', value, '"')
}

split_front_matter <- function(text) {
  text <- gsub("\r\n", "\n", text, fixed = TRUE)
  text <- gsub("\r", "\n", text, fixed = TRUE)
  if (!startsWith(text, "---\n")) {
    return(list(yaml = "", body = text, has_yaml = FALSE))
  }
  lines <- strsplit(text, "\n", fixed = TRUE)[[1]]
  end_idx <- which(trimws(lines[-1]) == "---")
  if (length(end_idx) == 0) {
    return(list(yaml = "", body = text, has_yaml = FALSE))
  }
  end_idx <- end_idx[[1]] + 1
  yaml <- if (end_idx > 2) paste(lines[2:(end_idx - 1)], collapse = "\n") else ""
  body <- if (length(lines) > end_idx) paste(lines[(end_idx + 1):length(lines)], collapse = "\n") else ""
  list(yaml = yaml, body = sub("^\n+", "", body), has_yaml = TRUE)
}

yaml_scalar <- function(yaml_text, key, default = "") {
  if (!nzchar(yaml_text)) return(default)
  lines <- strsplit(yaml_text, "\n", fixed = TRUE)[[1]]
  line <- grep(paste0("^", key, "\\s*:"), lines, value = TRUE)
  if (length(line) == 0) return(default)
  value <- trimws(sub(paste0("^", key, "\\s*:\\s*"), "", line[[1]]))
  value <- sub("^['\"]", "", value)
  value <- sub("['\"]$", "", value)
  if (nzchar(value)) value else default
}

parse_metadata_file <- function(folder) {
  candidates <- file.path(folder, c("metadata.yml", "metadata.yaml", "post.yml", "post.yaml", "meta.txt"))
  candidates <- candidates[file.exists(candidates)]
  if (length(candidates) == 0) return(list())
  lines <- strsplit(read_text(candidates[[1]]), "\n", fixed = TRUE)[[1]]
  lines <- lines[!grepl("^\\s*(#|$)", lines)]
  result <- list()
  for (line in lines) {
    if (!grepl(":", line, fixed = TRUE)) next
    key <- trimws(sub(":.*$", "", line))
    value <- trimws(sub("^[^:]+:\\s*", "", line))
    value <- sub("^['\"]", "", value)
    value <- sub("['\"]$", "", value)
    result[[key]] <- value
  }
  result
}

parse_categories <- function(value) {
  if (is.null(value) || !nzchar(value)) return(character(0))
  value <- gsub("^\\[|\\]$", "", value)
  parts <- unlist(strsplit(value, "[,;，、]", perl = TRUE))
  parts <- trimws(gsub("^['\"]|['\"]$", "", parts))
  parts[nzchar(parts)]
}

slugify <- function(value, fallback = "post") {
  ascii <- iconv(value, from = "", to = "ASCII//TRANSLIT", sub = "")
  if (is.na(ascii)) ascii <- value
  ascii <- tolower(ascii)
  ascii <- gsub("[^a-z0-9]+", "-", ascii)
  ascii <- gsub("(^-|-$)", "", ascii)
  if (!nzchar(ascii)) ascii <- fallback
  ascii
}

date_from_folder <- function(folder_name) {
  value <- regmatches(folder_name, regexpr("20[0-9]{2}[-_.]?[0-9]{2}[-_.]?[0-9]{2}", folder_name))
  if (!length(value) || !nzchar(value)) return(as.character(Sys.Date()))
  digits <- gsub("[^0-9]", "", value)
  paste(substr(digits, 1, 4), substr(digits, 5, 6), substr(digits, 7, 8), sep = "-")
}

first_heading <- function(body) {
  lines <- strsplit(body, "\n", fixed = TRUE)[[1]]
  heading <- grep("^#\\s+", lines, value = TRUE)
  if (length(heading) == 0) return("")
  trimws(sub("^#\\s+", "", heading[[1]]))
}

tex_to_markdown <- function(text) {
  text <- gsub("\r\n", "\n", text, fixed = TRUE)
  text <- gsub("(?m)%.*$", "", text, perl = TRUE)
  body_match <- regexpr("\\\\begin\\{document\\}([\\s\\S]*)\\\\end\\{document\\}", text, perl = TRUE)
  if (body_match[[1]] > 0) {
    text <- regmatches(text, body_match)
    text <- sub("^\\\\begin\\{document\\}", "", text)
    text <- sub("\\\\end\\{document\\}$", "", text)
  }
  replacements <- list(
    "\\\\section\\*?\\{([^{}]+)\\}" = "## \\1",
    "\\\\subsection\\*?\\{([^{}]+)\\}" = "### \\1",
    "\\\\subsubsection\\*?\\{([^{}]+)\\}" = "#### \\1",
    "\\\\textbf\\{([^{}]+)\\}" = "**\\1**",
    "\\\\emph\\{([^{}]+)\\}" = "*\\1*",
    "\\\\begin\\{itemize\\}|\\\\end\\{itemize\\}" = "",
    "\\\\begin\\{enumerate\\}|\\\\end\\{enumerate\\}" = "",
    "\\\\item\\s+" = "- "
  )
  for (pattern in names(replacements)) {
    text <- gsub(pattern, replacements[[pattern]], text, perl = TRUE)
  }
  text <- gsub("\\\\includegraphics(?:\\[[^\\]]*\\])?\\{([^{}]+)\\}", "![](\\1)", text, perl = TRUE)
  text <- gsub("\\\\[a-zA-Z]+\\*?(?:\\[[^\\]]*\\])?(?:\\{([^{}]*)\\})?", "\\1", text, perl = TRUE)
  trimws(text)
}

pptx_xml_text <- function(xml_text) {
  matches <- regmatches(xml_text, gregexpr("<a:t[^>]*>.*?</a:t>", xml_text, perl = TRUE))[[1]]
  if (length(matches) == 1 && identical(matches, "-1")) return(character(0))
  text <- gsub("^<a:t[^>]*>|</a:t>$", "", matches, perl = TRUE)
  text <- gsub("&lt;", "<", text, fixed = TRUE)
  text <- gsub("&gt;", ">", text, fixed = TRUE)
  text <- gsub("&amp;", "&", text, fixed = TRUE)
  text <- gsub("&quot;", '"', text, fixed = TRUE)
  text <- gsub("&apos;", "'", text, fixed = TRUE)
  trimws(text[nzchar(text)])
}

pptx_to_markdown <- function(path) {
  temp_dir <- tempfile("pptx-extract-")
  dir.create(temp_dir, recursive = TRUE, showWarnings = FALSE)
  on.exit(unlink(temp_dir, recursive = TRUE, force = TRUE), add = TRUE)

  listing <- utils::unzip(path, list = TRUE)
  slide_files <- listing$Name[grepl("^ppt/slides/slide[0-9]+\\.xml$", listing$Name)]
  note_files <- listing$Name[grepl("^ppt/notesSlides/notesSlide[0-9]+\\.xml$", listing$Name)]
  slide_order <- as.integer(sub("^ppt/slides/slide([0-9]+)\\.xml$", "\\1", slide_files))
  note_order <- as.integer(sub("^ppt/notesSlides/notesSlide([0-9]+)\\.xml$", "\\1", note_files))
  slide_files <- slide_files[order(slide_order)]
  note_files <- note_files[order(note_order)]

  utils::unzip(path, files = c(slide_files, note_files), exdir = temp_dir)

  blocks <- character(0)
  for (i in seq_along(slide_files)) {
    slide_path <- file.path(temp_dir, slide_files[[i]])
    slide_xml <- paste(readLines(slide_path, warn = FALSE, encoding = "UTF-8"), collapse = "")
    slide_text <- paste(pptx_xml_text(slide_xml), collapse = " ")
    slide_text <- gsub("\\s+", " ", slide_text)

    note_text <- ""
    if (i <= length(note_files)) {
      note_path <- file.path(temp_dir, note_files[[i]])
      if (file.exists(note_path)) {
        note_xml <- paste(readLines(note_path, warn = FALSE, encoding = "UTF-8"), collapse = "")
        note_text <- paste(pptx_xml_text(note_xml), collapse = " ")
        note_text <- gsub("\\s+", " ", note_text)
      }
    }

    if (!nzchar(slide_text) && !nzchar(note_text)) next
    block <- paste0("## Slide ", i, "\n\n", slide_text)
    if (nzchar(note_text) && !identical(note_text, as.character(i))) {
      block <- paste0(block, "\n\n", note_text)
    }
    blocks <- c(blocks, block)
  }

  first <- if (length(blocks) > 0) sub("^## Slide [0-9]+\\n\\n", "", blocks[[1]]) else tools::file_path_sans_ext(basename(path))
  first <- trimws(gsub("\\s+", " ", first))
  title <- trimws(sub("\\s+[0-9]+\\s+20[0-9]{2}.*$", "", first))
  if (!nzchar(title)) title <- tools::file_path_sans_ext(basename(path))

  paste0(
    "# ", title, "\n\n",
    "> 來源簡報：", basename(path), "\n\n",
    paste(blocks, collapse = "\n\n"),
    "\n"
  )
}

find_content_file <- function(folder) {
  files <- list.files(folder, recursive = TRUE, full.names = TRUE, all.files = FALSE, no.. = TRUE)
  files <- files[file.info(files)$isdir == FALSE]
  ext <- tolower(tools::file_ext(files))
  candidates <- files[ext %in% c("md", "qmd", "txt", "tex", "pptx")]
  candidates <- candidates[!grepl("(^|/)(README|metadata|post|meta)\\.(ya?ml|txt)$", gsub("\\\\", "/", basename(candidates)), ignore.case = TRUE)]
  if (length(candidates) == 0) return(character(0))
  priority_names <- c("content.md", "content.qmd", "post.md", "post.qmd", "index.md", "index.qmd", "article.md", "article.qmd")
  score <- match(tolower(basename(candidates)), priority_names)
  score[is.na(score)] <- ifelse(tolower(tools::file_ext(candidates[is.na(score)])) == "pptx", 90, 100) +
    seq_len(sum(is.na(score)))
  candidates[order(score)][[1]]
}

safe_asset_name <- function(path, index, used) {
  ext <- tolower(tools::file_ext(path))
  stem <- slugify(tools::file_path_sans_ext(basename(path)), fallback = sprintf("image-%02d", index))
  candidate <- paste0(stem, ".", ext)
  suffix <- 2
  while (candidate %in% used) {
    candidate <- paste0(stem, "-", suffix, ".", ext)
    suffix <- suffix + 1
  }
  candidate
}

copy_images <- function(folder, target_dir, body) {
  image_ext <- c("png", "jpg", "jpeg", "gif", "webp", "svg")
  all_files <- list.files(folder, recursive = TRUE, full.names = TRUE, all.files = FALSE, no.. = TRUE)
  all_files <- all_files[file.info(all_files)$isdir == FALSE]
  image_files <- all_files[tolower(tools::file_ext(all_files)) %in% image_ext]
  if (length(image_files) == 0) {
    return(list(body = body, images = character(0)))
  }

  used <- character(0)
  copied <- character(0)
  for (i in seq_along(image_files)) {
    safe <- safe_asset_name(image_files[[i]], i, used)
    used <- c(used, safe)
    copied <- c(copied, safe)
    if (!dry_run) {
      file.copy(image_files[[i]], file.path(target_dir, safe), overwrite = TRUE)
    }
    body <- gsub(basename(image_files[[i]]), safe, body, fixed = TRUE)
    body <- gsub(tools::file_path_sans_ext(basename(image_files[[i]])), tools::file_path_sans_ext(safe), body, fixed = TRUE)
  }

  unreferenced <- copied[!vapply(copied, function(img) grepl(img, body, fixed = TRUE), logical(1))]
  if (length(unreferenced) > 0) {
    gallery <- paste0(
      "\n\n",
      paste(vapply(
        unreferenced,
        function(img) paste0("![](", img, ")\n\n*圖：", tools::file_path_sans_ext(img), "*"),
        character(1)
      ), collapse = "\n\n")
    )
    body <- paste0(body, gallery)
  }

  list(body = body, images = copied)
}

make_post_dir <- function(slug) {
  target <- file.path(posts_root, slug)
  if (dir.exists(target) && overwrite) {
    unlink(target, recursive = TRUE, force = TRUE)
  }
  if (!dir.exists(target)) return(target)
  base <- target
  i <- 2
  repeat {
    candidate <- paste0(base, "-", i)
    if (!dir.exists(candidate)) return(candidate)
    i <- i + 1
  }
}

archive_folder <- function(folder) {
  if (!archive_source || dry_run) return(invisible(NULL))
  dir.create(published_root, recursive = TRUE, showWarnings = FALSE)
  destination <- file.path(
    published_root,
    paste0(format(Sys.time(), "%Y%m%d-%H%M%S"), "_", basename(folder))
  )
  if (!file.rename(folder, destination)) {
    marker <- file.path(folder, ".posted")
    write_text(paste("Posted at", format(Sys.time(), "%Y-%m-%d %H:%M:%S")), marker)
    warning("Could not archive source folder. Wrote marker instead: ", marker)
  } else {
    message_line("Archived source folder to: ", destination)
  }
}

import_ready_folder <- function(folder) {
  folder <- normalizePath(folder, winslash = "/", mustWork = TRUE)
  folder_name <- basename(folder)
  meta <- parse_metadata_file(folder)
  content_file <- find_content_file(folder)

  pdf_files <- list.files(folder, pattern = "\\.pdf$", recursive = TRUE, full.names = TRUE, ignore.case = TRUE)
  if (length(content_file) == 0 && length(pdf_files) > 0) {
    note <- file.path(folder, "NEEDS_CODEX_EXTRACTION.txt")
    write_text(
      paste(
        "This folder contains PDF source only.",
        "Ask Codex to extract text/images or create a content.md file before running publish_ready_posts.R.",
        sep = "\n"
      ),
      note
    )
    stop("PDF-only folder needs manual Codex extraction first: ", folder_name)
  }
  if (length(content_file) == 0) {
    stop("No content file found in: ", folder_name)
  }

  ext <- tolower(tools::file_ext(content_file))
  if (ext == "pptx") {
    raw <- pptx_to_markdown(content_file)
  } else {
    raw <- read_text(content_file)
  }
  if (ext == "tex") {
    raw <- tex_to_markdown(raw)
  }
  split <- split_front_matter(raw)
  body <- split$body

  post_date <- if (!is.null(meta$date) && nzchar(meta$date)) meta$date else yaml_scalar(split$yaml, "date", date_from_folder(folder_name))
  title <- if (!is.null(meta$title) && nzchar(meta$title)) meta$title else yaml_scalar(split$yaml, "title", first_heading(body))
  if (!nzchar(title)) title <- folder_name
  author <- if (!is.null(meta$author) && nzchar(meta$author)) meta$author else yaml_scalar(split$yaml, "author", "張修瑋")
  categories <- parse_categories(if (!is.null(meta$categories)) meta$categories else yaml_scalar(split$yaml, "categories", ""))

  date_digits <- gsub("[^0-9]", "", post_date)
  if (nchar(date_digits) < 8) date_digits <- format(Sys.Date(), "%Y%m%d")
  slug_base <- slugify(folder_name, fallback = paste0("post-", substr(date_digits, 1, 8)))
  if (!grepl("^20[0-9]{2}", slug_base)) {
    slug_base <- paste0("post-", substr(date_digits, 1, 8), "-", slug_base)
  }

  post_dir <- make_post_dir(slug_base)
  message_line("Importing: ", folder_name, " -> ", normalizePath(post_dir, winslash = "/", mustWork = FALSE))

  if (!dry_run) {
    dir.create(post_dir, recursive = TRUE, showWarnings = FALSE)
  }

  copied <- copy_images(folder, post_dir, body)
  body <- copied$body

  yaml_categories <- if (length(categories) > 0) {
    paste0("[", paste(vapply(categories, yaml_quote, character(1)), collapse = ", "), "]")
  } else {
    "[]"
  }

  output <- paste0(
    "---\n",
    "title: ", yaml_quote(title), "\n",
    "author: ", yaml_quote(author), "\n",
    "date: ", yaml_quote(post_date), "\n",
    "categories: ", yaml_categories, "\n",
    "draft: false\n",
    "---\n\n",
    trimws(body),
    "\n"
  )

  if (!dry_run) {
    write_text(output, file.path(post_dir, "index.md"))
  }

  archive_folder(folder)
  list(title = title, path = sub(paste0("^", site_dir, "/?"), "", normalizePath(post_dir, winslash = "/", mustWork = FALSE)))
}

run_process <- function(command, args, label, allow_status = integer()) {
  message_line("\n> ", label)
  message_line("$ ", command, " ", paste(args, collapse = " "))
  out <- tryCatch(
    suppressWarnings(system2(command, args = args, stdout = TRUE, stderr = TRUE)),
    error = function(e) structure(e$message, status = 127L)
  )
  status <- attr(out, "status")
  if (is.null(status)) status <- 0L
  if (length(out) > 0) message(paste(out, collapse = "\n"))
  if (!(status %in% c(0L, allow_status))) {
    stop(label, " failed with exit code ", status)
  }
  list(output = out, status = status)
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
  "POST_READY_WORKFLOW.md",
  "post_ready",
  "profile.png",
  "publications",
  "publish_ready_posts.R",
  "Quarto_Website.Rproj",
  "run_cms.R",
  "START_HERE.md",
  "students",
  "styles.css",
  "WEBSITE_UPDATE_MAINTENANCE_MANUAL.md"
)

repo_slug <- function() {
  remote <- tryCatch(system2("git", c("remote", "get-url", "origin"), stdout = TRUE, stderr = TRUE), error = function(e) "")
  remote <- remote[[1]]
  remote <- sub("\\.git$", "", remote)
  remote <- sub("^https://github.com/", "", remote)
  remote <- sub("^git@github.com:", "", remote)
  if (!grepl("^[^/]+/[^/]+$", remote)) return("")
  remote
}

wait_for_actions <- function(sha) {
  if (!requireNamespace("jsonlite", quietly = TRUE)) {
    message_line("jsonlite is not available; skip GitHub Actions polling.")
    return(invisible(FALSE))
  }
  repo <- repo_slug()
  if (!nzchar(repo)) {
    message_line("Cannot detect GitHub repo slug; skip GitHub Actions polling.")
    return(invisible(FALSE))
  }
  curl <- Sys.which("curl")
  url <- paste0("https://api.github.com/repos/", repo, "/actions/runs?branch=main&per_page=10")
  for (i in seq_len(36)) {
    Sys.sleep(5)
    json <- tryCatch(
      {
        if (nzchar(curl)) {
          paste(system2(curl, c("-sL", "-H", "User-Agent: post-ready-publisher", url), stdout = TRUE), collapse = "\n")
        } else {
          paste(readLines(url, warn = FALSE), collapse = "\n")
        }
      },
      error = function(e) ""
    )
    if (!nzchar(json)) next
    runs <- tryCatch(jsonlite::fromJSON(json), error = function(e) NULL)
    if (is.null(runs) || is.null(runs$workflow_runs) || nrow(runs$workflow_runs) == 0) next
    matched <- runs$workflow_runs[runs$workflow_runs$head_sha == sha, , drop = FALSE]
    if (nrow(matched) == 0) next
    message_line("GitHub Actions: ", matched$status[[1]], " / ", matched$conclusion[[1]])
    if (identical(matched$status[[1]], "completed")) {
      if (!identical(matched$conclusion[[1]], "success")) {
        stop("GitHub Actions completed with conclusion: ", matched$conclusion[[1]])
      }
      return(invisible(TRUE))
    }
  }
  warning("Timed out while waiting for GitHub Actions.")
  invisible(FALSE)
}

ready_folders <- if (is.null(folder_arg)) {
  folders <- list.dirs(ready_root, recursive = FALSE, full.names = TRUE)
  folders[!basename(folders) %in% c("_published", "_template")]
} else {
  file.path(ready_root, folder_arg)
}
ready_folders <- ready_folders[dir.exists(ready_folders)]
ready_folders <- ready_folders[!file.exists(file.path(ready_folders, ".posted"))]

if (length(ready_folders) == 0) {
  message_line("No ready folders found under post_ready/.")
  quit(status = 0)
}

imported <- lapply(ready_folders, import_ready_folder)
message_line("\nImported posts:")
for (item in imported) {
  message_line("- ", item$title, " (", item$path, ")")
}

if (dry_run) {
  message_line("\nDry run completed. No files were written.")
  quit(status = 0)
}

if (publish) {
  run_process(find_quarto_bin(), c("render"), "Render Quarto site")
  run_process("git", c("status", "--short", "--", publish_pathspecs), "Check publishable changes")
  run_process("git", c("-c", "advice.addIgnoredFile=false", "add", "-A", "--", publish_pathspecs), "Stage publishable changes")
  staged <- run_process("git", c("diff", "--cached", "--quiet"), "Check staged changes", allow_status = 1L)
  if (identical(staged$status, 0L)) {
    message_line("No staged changes to commit.")
  } else {
    title_preview <- paste(vapply(imported, `[[`, character(1), "title"), collapse = "; ")
    run_process("git", c("commit", "-m", paste("Publish ready post:", title_preview)), "Create commit")
    run_process("git", c("push", "origin", "main"), "Push to GitHub")
    sha <- system2("git", c("rev-parse", "HEAD"), stdout = TRUE)
    wait_for_actions(sha[[1]])
  }
}

message_line("\nDone.")
