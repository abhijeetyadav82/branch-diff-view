# VS Code Extension: Branch Diff Review Panel

## Context

VS Code currently has no view that mirrors GitHub's **Files Changed** tab — a single scrollable panel that lists *every* changed file with its side-by-side diff, a file tree on the left, and a per-file "Viewed" checkbox. The official "GitHub Pull Requests and Issues" extension opens each file in a separate diff editor tab, which forces a reviewer to context-switch through dozens of tabs. This extension recreates GitHub's all-in-one review surface inside VS Code for reviewing local work before pushing a PR.

Scope for v1: **local branch comparison only**, using local `git`. GitHub fetching, comments, and review submission are deferred to a later iteration. Authentication is therefore not required in v1.

## Goals (v1)

1. Command **"Branch Diff: Compare with Base…"** prompts for a base ref (default `develop` or `main`, remembered per workspace) and opens a single Webview panel.
2. Panel layout:
   - Left rail: collapsible file tree of changed paths, with `+N -M` stats and a per-file **Viewed** checkbox.
   - Main pane: vertically stacked file diff blocks. Each block has a header (path, stats, copy-path button, Viewed checkbox) and a diff body.
   - Toolbar: base-ref label, **Refresh**, layout toggle (**Split** / **Unified**), expand/collapse all.
3. Viewed state persists in `workspaceState`, keyed by `repoRoot::baseRef::filePath`. Marking viewed dims the file in the tree (like GitHub).
4. Theming uses VS Code CSS variables so the panel matches the active editor theme.

## Out of scope (v1, noted for v2)

- Fetching PRs from github.com / GitHub Enterprise (reserve `vscode.authentication.getSession('github')` for this).
- Inline review comments (read or write).
- Approve / Request changes.
- Multi-repo workspaces (v1 picks the first git repo it finds; multi-repo handled later).

## Architecture

A standard TypeScript VS Code extension. The diff UI is a single Webview because we need a custom layout that VS Code's native diff editor doesn't offer.

```
branch-diff-view/
├── package.json              # Extension manifest, command + activation contributions
├── tsconfig.json
├── esbuild.config.mjs        # One bundle for extension, one for webview
├── .vscodeignore
├── README.md
├── src/
│   ├── extension.ts          # activate(): register commands, wire panel
│   ├── panel/
│   │   ├── DiffPanel.ts      # Webview panel lifecycle, message routing
│   │   └── html.ts           # HTML shell with CSP + nonce
│   ├── git/
│   │   ├── gitService.ts     # Wraps simple-git: listChangedFiles, getFileDiff, listBranches
│   │   └── repoLocator.ts    # Uses vscode.extensions.getExtension('vscode.git') to find repoRoot
│   ├── diff/
│   │   └── parseDiff.ts      # Parse `git diff --unified=3` output into hunks
│   ├── state/
│   │   └── viewedStore.ts    # Memento-backed { key -> boolean }
│   └── types.ts              # Shared message types between ext <-> webview
└── webview/
    ├── main.ts               # Renders tree + diff blocks; handles toggles
    ├── render/
    │   ├── tree.ts           # File tree rendering
    │   ├── split.ts          # Side-by-side hunk renderer
    │   └── unified.ts        # Unified hunk renderer
    ├── styles.css            # Uses --vscode-* CSS vars
    └── index.html            # Loaded by DiffPanel.ts
```

### Data flow

1. User runs **Branch Diff: Compare with Base…** → quick pick of local branches (from `simple-git.branchLocal()`), default = last used.
2. `gitService.listChangedFiles(base, 'HEAD')` runs `git diff --name-status --numstat base...HEAD` → `[{ path, status, additions, deletions }]`.
3. For each file: `gitService.getFileDiff(base, 'HEAD', path)` → raw unified diff text → `parseDiff()` → `{ hunks: [{ oldStart, oldLines, newStart, newLines, lines: [{type, oldNo, newNo, text}] }] }`.
4. Extension posts `{ type: 'init', files, baseRef, viewed }` to the webview.
5. Webview renders tree + all file blocks. Toggling Viewed posts `{ type: 'setViewed', path, value }` back; extension updates `viewedStore` and replies with the new state.
6. Layout toggle is webview-local (no round trip) — same parsed hunks re-rendered by `split.ts` vs `unified.ts`.

### Key dependencies

- `simple-git` — git wrapper. Battle-tested; avoids hand-rolling child_process plumbing.
- `parse-diff` (or hand-rolled in `parseDiff.ts` — ~60 lines, no runtime dep, preferred).
- `esbuild` — single fast bundler for both targets.
- No frontend framework. The webview is small enough for vanilla TS + template strings; React would 5x the bundle for no real gain in v1.

### Performance notes

- Large diffs: render file blocks lazily on scroll using `IntersectionObserver` (only parse-then-paint when the block is within 2 viewport heights). The tree always renders fully.
- Cap any single file at e.g. 5000 diff lines; over the cap, render a "Large diff — click to load" placeholder.
- Skip binary files (status `B`) with a "Binary file changed" stub.

## Critical files to create

- `package.json` — contributes:
  - `commands`: `branchDiff.compare`, `branchDiff.refresh`, `branchDiff.toggleLayout`
  - `activationEvents`: `onCommand:branchDiff.compare`
  - `configuration`: `branchDiff.defaultBase` (string, default `develop`)
- `src/extension.ts` — `activate(ctx)` registers commands, instantiates `DiffPanel` singleton.
- `src/panel/DiffPanel.ts` — `createOrShow(ctx, payload)`, message handler, disposal.
- `src/git/gitService.ts` — only place that touches `simple-git`.
- `src/diff/parseDiff.ts` — pure function, unit-testable.
- `src/state/viewedStore.ts` — thin Memento wrapper; key = `${repoRoot}::${baseRef}::${path}`.
- `webview/main.ts` + `webview/styles.css` — the visible UI.

## Verification

1. **Build**: `npm run build` produces `dist/extension.js` and `dist/webview.js` with no TS errors.
2. **Launch**: `F5` in VS Code opens an Extension Development Host. Open any local git repo, checkout a feature branch with real changes.
3. **Golden path**: Run **Branch Diff: Compare with Base…**, pick `main`. Verify:
   - File tree on the left shows all changed files grouped by folder, with `+N -M` and a checkbox.
   - Each file appears as a stacked diff block in the main pane in tree order.
   - Side-by-side layout is the default (red removed left, green added right, line numbers in both gutters).
   - Toggle to Unified — same hunks re-render in a single column.
   - Tick **Viewed** on a file — the file dims in the tree and the block collapses. Refresh the panel — Viewed state survives.
   - Close and reopen VS Code — Viewed state still survives (Memento persistence).
4. **Edge cases to spot-check**:
   - File renamed (`status = R`): header shows `old → new`.
   - Binary file: stub renders, no crash.
   - Empty diff (branch equals base): panel shows "No changes vs `<base>`".
   - Large file (>5000 diff lines): placeholder appears with "Load anyway" button.
5. **Theme**: switch between Dark+ and Light+ — colors track the theme via `--vscode-*` vars.

## Implementation order

1. **Initial commit** — `plan.md` + `.gitignore` (`node_modules/`, `dist/`, `*.vsix`). Commit: `chore: initial plan`.
2. Scaffold extension (`package.json`, `tsconfig.json`, `esbuild.config.mjs`, empty `src/extension.ts` exporting `activate`/`deactivate`). Verify `npm run build` produces a bundle. Commit: `chore: scaffold extension`.
3. `gitService` + `parseDiff` with a tiny CLI harness (`node dist/cli.js <base>`) that prints parsed diff for the current repo — verify before building UI. Commit: `feat: git + diff layer`.
4. `DiffPanel` shell + `init` message round-trip; render a static "hello" in the webview. Commit: `feat: webview panel skeleton`.
5. Tree rendering (left rail) with file stats. Commit: `feat: file tree`.
6. Split-diff renderer for one file, then loop over all files. Commit: `feat: side-by-side diff`.
7. Unified renderer + layout toggle. Commit: `feat: unified layout + toggle`.
8. Viewed store + checkbox wiring (both tree and block header). Commit: `feat: viewed state`.
9. Lazy rendering via `IntersectionObserver`; large-file cap. Commit: `perf: lazy file blocks`.
10. Polish: rename headers, binary stub, empty state, theming pass. Commit: `polish: edge cases + theming`.
11. README with screenshot + install-from-vsix instructions. Commit: `docs: readme`.
