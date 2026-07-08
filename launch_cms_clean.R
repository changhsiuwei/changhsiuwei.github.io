find_kit_root <- function(path = getwd()) {
  path <- normalizePath(path, winslash = "/", mustWork = FALSE)
  candidates <- unique(c(path, dirname(path)))
  for (candidate in candidates) {
    if (
      file.exists(file.path(candidate, "_quarto.yml")) &&
        dir.exists(file.path(candidate, "admin_app"))
    ) {
      return(candidate)
    }
  }
  stop("Cannot find the editing kit root. Run this from the editing kit root or admin_app.")
}

args <- commandArgs(trailingOnly = TRUE)
kit_root <- if (length(args) >= 1 && dir.exists(args[[1]])) {
  normalizePath(args[[1]], winslash = "/", mustWork = TRUE)
} else {
  find_kit_root()
}

if (.Platform$OS.type == "windows") {
  try(Sys.setlocale("LC_CTYPE", "Chinese_Taiwan.utf8"), silent = TRUE)
}

r_minor <- paste0("R-", R.version$major, ".", strsplit(R.version$minor, ".", fixed = TRUE)[[1]][1])
local_lib <- file.path(kit_root, "r-library", paste0(r_minor, "-cms"))

if (!dir.exists(local_lib)) {
  stop(
    "Cannot find the local R library for this R version: ",
    local_lib,
    "\nRun source(\"install_r_packages.R\") from the editing kit root first."
  )
}

.libPaths(unique(c(normalizePath(local_lib, winslash = "/"), .Library)))

required_packages <- c("shiny", "bslib", "processx", "digest")

if (interactive() && any(required_packages %in% loadedNamespaces())) {
  rscript <- file.path(R.home("bin"), "Rscript.exe")
  if (!file.exists(rscript)) {
    rscript <- file.path(R.home("bin"), "Rscript")
  }
  message("Launching CMS in a clean background R session.")
  system2(
    rscript,
    args = c("--vanilla", shQuote(file.path(kit_root, "launch_cms_clean.R")), shQuote(kit_root)),
    wait = FALSE
  )
  return(invisible(TRUE))
}

missing_packages <- required_packages[
  !vapply(required_packages, requireNamespace, logical(1), quietly = TRUE)
]

if (length(missing_packages) > 0) {
  stop(
    "Missing CMS packages for this R version: ",
    paste(missing_packages, collapse = ", "),
    "\nRun source(\"install_r_packages.R\") from the editing kit root first."
  )
}

start_quarto_preview <- function() {
  preview_host <- "127.0.0.1"
  preview_port <- "4200"
  preview_ready <- function() {
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
  if (preview_ready()) return(invisible(TRUE))

  quarto_candidates <- c(
    Sys.which("quarto"),
    "C:/Users/f1240/AppData/Local/Programs/Quarto/bin/quarto.exe",
    "C:/Program Files/RStudio/resources/app/bin/quarto/bin/quarto.exe",
    "quarto"
  )
  quarto_candidates <- quarto_candidates[nzchar(quarto_candidates)]
  existing <- quarto_candidates[file.exists(quarto_candidates)]
  quarto_bin <- if (length(existing) > 0) normalizePath(existing[[1]], winslash = "/") else "quarto"

  preview_args <- c("preview", "--host", preview_host, "--port", preview_port, "--no-browser")
  if (.Platform$OS.type == "windows") {
    ps_quote <- function(x) paste0("'", gsub("'", "''", x, fixed = TRUE), "'")
    arg_list <- paste(ps_quote(preview_args), collapse = ", ")
    ps_command <- paste0(
      "Start-Process -FilePath ", ps_quote(quarto_bin),
      " -ArgumentList @(", arg_list, ")",
      " -WorkingDirectory ", ps_quote(kit_root),
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
    setwd(kit_root)
    system2(quarto_bin, args = preview_args, wait = FALSE)
  }

  for (i in seq_len(30)) {
    Sys.sleep(1)
    if (preview_ready()) break
  }
  if (!preview_ready()) {
    stop("Quarto preview failed to respond on http://127.0.0.1:4200/")
  }
  invisible(TRUE)
}

start_quarto_preview()
setwd(file.path(kit_root, "admin_app"))
shiny::runApp("app.R", launch.browser = TRUE)
