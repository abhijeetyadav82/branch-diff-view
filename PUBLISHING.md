# Publishing Checklist — Branch Diff View

Status as of 2026-05-13. Everything **code-side** is publish-ready. The remaining work is account setup, assets, and the actual `vsce publish` run.

---

## ✅ Already done

- `package.json` populated with `publisher`, `author`, `license`, `repository`, `bugs`, `homepage`, `keywords`, `categories`, `icon` field
- `LICENSE` (MIT) created
- `CHANGELOG.md` created with 0.1.0 notes
- `README.md` updated (features, shortcuts, license, contributing)
- Extension builds cleanly via `npm run build`
- Sideload VSIX works (`branch-diff-view-0.1.0.vsix`)
- `icon.png` created (128×128, generated placeholder — diff-bars motif). Replace with real art before publishing if you want something more distinctive.

---

## ❌ Remaining

### 1. Push the repo to GitHub (blocking)

The marketplace validates `repository.url` reachability on publish.

```bash
# Create the empty repo at: https://github.com/new
#   name: branch-diff-view
#   public, no README/license/gitignore (we have them)

git remote add origin git@github.com:abhijeetyadav82/branch-diff-view.git
git push -u origin main
```

### 2. Create a Marketplace publisher (blocking, one-time)

- Sign in: https://marketplace.visualstudio.com/manage
  - Use a Microsoft account (personal or work)
- Click **Create publisher**
- **Publisher ID:** `abhijeet` — **must match exactly** the `"publisher"` field in `package.json`
  - If `abhijeet` is already taken globally, pick a different one and update `package.json`
- Display name + email: your choice

### 3. Generate an Azure DevOps PAT (blocking, one-time)

- Open https://dev.azure.com → top-right user icon → **Personal access tokens**
- **New Token:**
  - Name: `vsce-publish` (any)
  - Organization: **All accessible organizations** ← important, not the default
  - Expiration: 90 days or longer
  - Scopes: **Custom defined** → expand **Marketplace** → tick **Manage**
- Copy the token immediately (shown once)
- Store it somewhere safe; `vsce login` will prompt for it

### 4. Switch to Node 20+ (blocking for `vsce`)

Current local Node is 18; `@vscode/vsce` needs ≥20.

```bash
nvm install 20
nvm use 20
node -v  # confirm v20+
```

### 5. Publish (the actual command)

```bash
cd /home/abhijeet/projects/branch-diff-view
npx @vscode/vsce login abhijeet           # paste PAT when prompted
npx @vscode/vsce publish                  # uploads & publishes
```

- First-publish processing: ~5 minutes before the listing is live
- Listing URL: https://marketplace.visualstudio.com/items?itemName=abhijeet.branch-diff-view
- Install URL: `code --install-extension abhijeet.branch-diff-view`

For subsequent releases:
```bash
npx @vscode/vsce publish patch    # bumps 0.1.0 → 0.1.1, tags, publishes
npx @vscode/vsce publish minor    # 0.1.0 → 0.2.0
```

---

## 🎯 Strongly recommended before going live

Not blocking, but the listing will look sparse without them.

### Screenshots / GIFs in README

- Marketplace renders the README as the listing page
- **Relative image paths break** — always use full `https://` URLs (e.g. `https://raw.githubusercontent.com/abhijeetyadav82/branch-diff-view/main/docs/screenshot.png`)
- Suggested shots:
  1. Toolbar + summary chip + filter
  2. Split-view diff with file tree
  3. Unified-view diff
  4. Viewed-file state (strikethrough)
- A short GIF of the compare flow (record with `peek` or `asciinema`) significantly boosts installs

### Smoke test before publish

In a clean VS Code profile:
```bash
code --profile clean-test
# install your VSIX, run through:
#   - Compare with Base (pick a branch)
#   - Toggle Split/Unified
#   - Mark files viewed
#   - Filter (/)
#   - Refresh after a new commit
```

### OpenVSX registry (optional)

VSCodium, Gitpod, Theia users install from OpenVSX, not the MS Marketplace. Free, no PAT, public-friendly:
```bash
npx ovsx publish -p <openvsx-token>
```
Get a token at https://open-vsx.org/user-settings/tokens.

---

## 📌 Things to know after publish

- **Extension ID is permanent**: `abhijeet.branch-diff-view` — cannot be renamed once published
- **Unpublishing** is possible but discouraged; prefer publishing a fix
- **Marketplace shows install counts publicly** after ~24h
- Bug reports will land in your GitHub issues (configured via `bugs.url`)
- Monitor `Q & A` tab on the marketplace listing — it's separate from GitHub issues and easy to miss

---

## 🐛 Common publish failures

| Error | Fix |
|---|---|
| `icon.png does not exist` | Create the icon, or remove `"icon"` from `package.json` |
| `Repository URL not reachable` | Push the repo public, or fix the URL |
| `Publisher 'abhijeet' not found` | Create the publisher at marketplace.visualstudio.com/manage |
| `Personal Access Token verification failed` | PAT scope wrong — must be **All organizations** + **Marketplace: Manage** |
| `Make sure to edit the README.md before publishing` | Marketplace rejects the default `vsce` README placeholder |
| `Node version unsupported` | Switch to Node 20+ |
