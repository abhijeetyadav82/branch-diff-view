# Changelog

All notable changes to **Branch Diff View** are documented here.

## [0.1.0] — 2026-05-13

Initial public release.

### Features
- **Compare current branch against any local base branch** with a single command (`Branch Diff: Compare with Base…`).
- **GitHub-style "Files Changed" panel** — every changed file in one scrollable view.
- **Split** and **Unified** diff layouts, toggleable from the toolbar.
- **Lazy-loaded diff bodies** via `IntersectionObserver` — large branches stay snappy.
- **Large-diff guard** — files over 5,000 lines render a stub with an opt-in "Load anyway" button.
- **Viewed-file tracking** with per-repo, per-base-branch persistence (workspace state).
- **Collapsible file tree** grouped by directory, with status dots and per-file `+/-` stats.
- **Toolbar filter** — type to narrow files in both the tree and the diff pane (`/` to focus, `Esc` to clear).
- **Summary chip** showing total files changed and aggregate `+adds / -dels`.
- **Active-file tracking** — the file tree highlights the section you're currently scrolled to.
- **Copy file path** button on each file header.
- **VS Code theme-aware** styling throughout (light, dark, and high-contrast themes).
