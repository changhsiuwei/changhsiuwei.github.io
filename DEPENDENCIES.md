# Dependencies

## External tools

- Quarto CLI: required for `quarto preview` and `quarto render`. Detected: Quarto 1.9.38.
- R: required for the Shiny CMS. Detected installations include R 4.4.3 and R 4.6.1.
- Git: required for sync and GitHub Pages deployment. Detected: Git 2.54.0.
- RStudio: optional, but convenient for running `Quarto_Website.Rproj` and `admin_app/app.R`.

## R packages

The CMS uses these R packages:

- `shiny` 1.14.0
- `bslib` 0.11.0
- `processx` 3.9.0
- `digest` 0.6.39

The editing kit also installs these Quarto/R helper packages:

- `knitr` 1.51
- `rmarkdown` 2.31

Run `source("install_r_packages.R")` from the editing kit root to install them into a CMS-specific local library, such as `r-library/R-4.4-cms` or `r-library/R-4.6-cms`.

Do not reuse one R package library across different R minor versions. On Windows, packages such as `digest` include `.dll` files that can fail to load when they were built under a different R version.
