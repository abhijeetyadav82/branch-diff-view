# Branch Diff View

A VS Code extension that brings GitHub's **Files Changed** panel into your editor — a single scrollable surface showing every changed file with side-by-side diffs, a file tree, and per-file "Viewed" checkboxes. No more flipping through dozens of diff tabs.

## Features

- **Single-panel review** — all changed files stacked vertically, no tab switching.
- **Split (side-by-side) and Unified** diff layouts with one-click toggle.
- **File tree rail** — grouped by directory, with `+N -M` stats and Viewed checkboxes.
- **Viewed state persists** across panel reopens and VS Code restarts (Workspace storage).
- **Lazy rendering** — file diff bodies are rendered only when scrolled into view.
- **Large-diff guard** — files with >5 000 diff lines show a placeholder with a "Load anyway" button.
- **Theme-aware** — uses `--vscode-*` CSS variables; works with any light or dark theme.
- **Filter files** — type in the toolbar search to narrow both the tree and the diff pane.
- **Summary chip** — total file count and aggregate `+adds / -dels` always visible.
- **Active-file tracking** — the tree highlights the file you're currently scrolled to.

## Usage

1. Check out a feature branch.
2. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`).
3. Run **Branch Diff: Compare with Base…**
4. Pick a base branch from the quick-pick list (default: `develop`).

The panel opens with the file tree on the left and all diff blocks stacked on the right.

### Keyboard-friendly tips

| Action | How |
|---|---|
| Collapse / expand a file | Click the file header |
| Collapse / Expand all | Toolbar **Collapse** / **Expand** buttons |
| Focus the filter input | Press `/` |
| Clear the filter | Press `Esc` while focused |
| Mark file viewed | Tick the checkbox in the tree or file header |
| Refresh after new commits | Toolbar **↻** button |

## Configuration

| Setting | Default | Description |
|---|---|---|
| `branchDiff.defaultBase` | `develop` | Default base branch shown in the quick-pick |

## Install from VSIX

```bash
npx @vscode/vsce package
code --install-extension branch-diff-view-0.1.0.vsix
```

## Development

```bash
npm install
npm run build        # one-shot build → dist/
npm run watch        # rebuild on change
```

Press `F5` in VS Code to launch an **Extension Development Host** with the extension loaded.

## Limitations (v1)

- Local git only — no GitHub API, no inline comments, no review submission.
- Single-repo workspaces only (picks the first repo found).
- Binary files show a stub; no content preview.

## License

[MIT](./LICENSE) © Abhijeet Yadav

## Contributing

Bug reports and PRs welcome at [github.com/abhijeetyadav82/branch-diff-view](https://github.com/abhijeetyadav82/branch-diff-view).
