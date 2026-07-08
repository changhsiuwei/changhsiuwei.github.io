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
child_mode <- "--child" %in% args

r_minor <- paste0("R-", R.version$major, ".", strsplit(R.version$minor, ".", fixed = TRUE)[[1]][1])
local_lib <- file.path(kit_root, "r-library", paste0(r_minor, "-cms"))
dir.create(local_lib, recursive = TRUE, showWarnings = FALSE)

local_lib <- normalizePath(local_lib, winslash = "/")

# Install into the editing kit library for the active R minor version.
# Keep only the base/system library as fallback so packages are not silently
# satisfied by another user library built for a different R version.
.libPaths(unique(c(local_lib, .Library)))

packages <- c(
  "shiny",
  "bslib",
  "processx",
  "digest",
  "knitr",
  "rmarkdown"
)

required_versions <- c(
  shiny = "1.13.0",
  bslib = "0.10.0",
  processx = "3.9.0",
  digest = "0.6.39",
  knitr = "1.51",
  rmarkdown = "2.31"
)

local_package_version <- function(pkg) {
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
}

local_versions <- vapply(packages, local_package_version, character(1))
needs_install <- is.na(local_versions) |
  vapply(
    packages,
    function(pkg) {
      !is.na(local_versions[[pkg]]) &&
        utils::compareVersion(local_versions[[pkg]], required_versions[[pkg]]) < 0
    },
    logical(1)
  )

packages_to_install <- packages[needs_install]

if (
  length(packages_to_install) > 0 &&
    !child_mode &&
    any(packages_to_install %in% loadedNamespaces())
) {
  rscript <- file.path(R.home("bin"), "Rscript.exe")
  if (!file.exists(rscript)) {
    rscript <- file.path(R.home("bin"), "Rscript")
  }
  message(
    "Some packages that need repair are already loaded: ",
    paste(intersect(packages_to_install, loadedNamespaces()), collapse = ", "),
    "\nInstalling in a clean R session."
  )
  status <- system2(
    rscript,
    args = c("--vanilla", shQuote(file.path(kit_root, "install_r_packages.R")), shQuote(kit_root), "--child"),
    wait = TRUE
  )
  if (!identical(status, 0L)) {
    stop("Clean package installation failed with exit code ", status)
  }
  local_versions <- vapply(packages, local_package_version, character(1))
  needs_install <- is.na(local_versions) |
    vapply(
      packages,
      function(pkg) {
        !is.na(local_versions[[pkg]]) &&
          utils::compareVersion(local_versions[[pkg]], required_versions[[pkg]]) < 0
      },
      logical(1)
    )
  packages_to_install <- packages[needs_install]
}

if (length(packages_to_install) > 0) {
  install_type <- if (.Platform$OS.type == "windows") "binary" else "source"
  options(install.packages.check.source = "no")
  install.packages(
    packages_to_install,
    lib = local_lib,
    repos = "https://cloud.r-project.org",
    type = install_type
  )
}

installed_local <- rownames(utils::installed.packages(lib.loc = local_lib))

installed <- data.frame(
  package = packages,
  installed = packages %in% installed_local,
  version = vapply(packages, local_package_version, character(1))
)

message("Using local R library: ", local_lib)
print(installed, row.names = FALSE)
