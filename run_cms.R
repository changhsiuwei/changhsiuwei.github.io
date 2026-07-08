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

kit_root <- find_kit_root()
if (.Platform$OS.type == "windows") {
  try(Sys.setlocale("LC_CTYPE", "Chinese_Taiwan.utf8"), silent = TRUE)
}
r_minor <- paste0("R-", R.version$major, ".", strsplit(R.version$minor, ".", fixed = TRUE)[[1]][1])
local_lib <- file.path(kit_root, "r-library", paste0(r_minor, "-cms"))
local_lib <- normalizePath(local_lib, winslash = "/", mustWork = FALSE)

if (dir.exists(local_lib)) {
  .libPaths(unique(c(local_lib, .Library)))
}

required_packages <- c("shiny", "bslib", "processx", "digest")
required_versions <- c(
  shiny = "1.13.0",
  bslib = "0.10.0",
  processx = "3.9.0",
  digest = "0.6.39"
)
local_versions <- vapply(
  required_packages,
  function(pkg) {
    desc <- tryCatch(
      utils::packageDescription(pkg, lib.loc = local_lib),
      error = function(e) NULL
    )
    if (
      is.null(desc) ||
        !is.list(desc) ||
        is.null(desc$Version) ||
        is.na(desc$Version)
    ) {
      NA_character_
    } else {
      desc$Version
    }
  },
  character(1)
)

needs_repair <- is.na(local_versions) |
  vapply(
    required_packages,
    function(pkg) {
      !is.na(local_versions[[pkg]]) &&
        utils::compareVersion(local_versions[[pkg]], required_versions[[pkg]]) < 0
    },
    logical(1)
  )

if (any(needs_repair)) {
  rscript <- file.path(R.home("bin"), "Rscript.exe")
  if (!file.exists(rscript)) {
    rscript <- file.path(R.home("bin"), "Rscript")
  }
  message(
    "Installing or repairing CMS packages for this R version: ",
    paste(required_packages[needs_repair], collapse = ", ")
  )
  status <- system2(
    rscript,
    args = c("--vanilla", shQuote(file.path(kit_root, "install_r_packages.R")), shQuote(kit_root), "--child"),
    wait = TRUE
  )
  if (!identical(status, 0L)) {
    stop("Package repair failed with exit code ", status)
  }
  local_versions <- vapply(
    required_packages,
    function(pkg) {
      desc <- tryCatch(
        utils::packageDescription(pkg, lib.loc = local_lib),
        error = function(e) NULL
      )
      if (
        is.null(desc) ||
          !is.list(desc) ||
          is.null(desc$Version) ||
          is.na(desc$Version)
      ) {
        NA_character_
      } else {
        desc$Version
      }
    },
    character(1)
  )
}

loaded_conflicts <- vapply(
  required_packages,
  function(pkg) {
    if (!pkg %in% loadedNamespaces()) return(FALSE)
    loaded_path <- tryCatch(
      normalizePath(getNamespaceInfo(pkg, "path"), winslash = "/"),
      error = function(e) ""
    )
    loaded_version <- tryCatch(as.character(utils::packageVersion(pkg)), error = function(e) "")
    !startsWith(tolower(loaded_path), tolower(local_lib)) ||
      !identical(loaded_version, local_versions[[pkg]])
  },
  logical(1)
)

if (any(required_packages %in% loadedNamespaces()) || any(loaded_conflicts)) {
  launch_script <- file.path(kit_root, "launch_cms_clean.R")
  rscript <- file.path(R.home("bin"), "Rscript.exe")
  if (!file.exists(rscript)) {
    rscript <- file.path(R.home("bin"), "Rscript")
  }
  message(
    "Launching CMS in a clean background R session because CMS packages are already loaded in this session."
  )
  system2(
    rscript,
    args = c("--vanilla", shQuote(launch_script), shQuote(kit_root)),
    wait = FALSE
  )
  return(invisible(TRUE))
}

app_dir <- file.path(kit_root, "admin_app")
if (!dir.exists(app_dir)) {
  stop("Cannot find admin_app. Run this script from the editing kit root folder.")
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
setwd(app_dir)
shiny::runApp("app.R", launch.browser = TRUE)
