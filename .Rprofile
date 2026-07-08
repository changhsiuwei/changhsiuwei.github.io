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
  path
}

kit_root <- find_kit_root()
if (.Platform$OS.type == "windows") {
  try(Sys.setlocale("LC_CTYPE", "Chinese_Taiwan.utf8"), silent = TRUE)
}
r_minor <- paste0("R-", R.version$major, ".", strsplit(R.version$minor, ".", fixed = TRUE)[[1]][1])
local_lib <- file.path(kit_root, "r-library", paste0(r_minor, "-cms"))
if (dir.exists(local_lib)) {
  .libPaths(c(normalizePath(local_lib, winslash = "/"), .libPaths()))
}
