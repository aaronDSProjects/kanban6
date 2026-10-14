---
description: Security-scan the project, then push to GitHub, update README + repo About, and deploy GitHub Pages via Actions
argument-hint: <owner/repo or GitHub URL> [branch=main] [visibility=public|private] [description="..."] [topics=a,b,c]
allowed-tools: Bash(git:*), Bash(gh:*), Bash(grep:*), Bash(ls:*), Bash(cat:*), Bash(gitleaks:*), Read, Write, Edit, Glob, Grep, mcp__playwright__browser_navigate, mcp__playwright__browser_resize, mcp__playwright__browser_wait_for, mcp__playwright__browser_snapshot, mcp__playwright__browser_take_screenshot, mcp__playwright__browser_close
---

# Publish to GitHub

Repo details supplied by the user: **$ARGUMENTS**

Work through the phases below **in order**. Phase 1 is a hard gate: nothing leaves this machine
(no `git push`, no `gh repo create/edit`, no `gh api` write) until the scan passes or the user
explicitly accepts every finding.

## Phase 0 – Resolve inputs

1. Parse `$ARGUMENTS` into: `OWNER/REPO` (accept `owner/repo`, `https://github.com/owner/repo(.git)`
   or `git@github.com:owner/repo.git`), `BRANCH` (default `main`), `VISIBILITY` (default `public`),
   optional `description` and `topics`.
2. If `$ARGUMENTS` is empty or no repo can be parsed, fall back to `git remote get-url origin`.
   If there is still no repo, **ask the user** for it (use AskUserQuestion) — do not guess.
3. Check prerequisites and stop with a clear message if any fail:
   - `gh auth status` is logged in, and the account can access `OWNER` (`gh api user --jq .login`).
   - `git status --porcelain` — list uncommitted changes so the user knows what will be included.
4. Check whether the repo exists: `gh repo view OWNER/REPO --json name,visibility,description,homepageUrl,repositoryTopics`.
   Remember the result; creation happens in Phase 2, after the scan.
5. Summarise the plan (repo, branch, visibility, create vs. update) in one short block before continuing.

## Phase 1 – Security scan (blocking gate)

Scan **every file that would be pushed**: tracked files plus untracked-but-not-ignored files
(`git ls-files --cached --others --exclude-standard`), and the commits that are not yet on the remote
(`git log origin/BRANCH..HEAD -p` if the remote branch exists, otherwise full history `git log -p`).
Secrets removed in a later commit are still exposed by history.

Run these checks and collect findings as `file:line — rule — snippet (secret values masked)`:

1. **Secret scanner** — if `gitleaks` is installed run `gitleaks detect --source . --redact -v`
   (it covers history). Otherwise do the manual pattern scan below regardless.
2. **Secret patterns** (Grep, case-insensitive where sensible):
   - Private keys: `-----BEGIN [A-Z ]*PRIVATE KEY-----`
   - GitHub tokens: `gh[pousr]_[A-Za-z0-9]{36,}`, `github_pat_[A-Za-z0-9_]{50,}`
   - AWS: `AKIA[0-9A-Z]{16}`, `aws_secret_access_key`
   - Google: `AIza[0-9A-Za-z_\-]{35}`; Slack: `xox[baprs]-[A-Za-z0-9-]+`; Stripe: `sk_live_[0-9a-zA-Z]{20,}`
   - Anthropic/OpenAI: `sk-ant-[A-Za-z0-9_\-]{20,}`, `sk-[A-Za-z0-9]{32,}`
   - JWTs: `eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}`
   - Generic assignments: `(api[_-]?key|secret|token|passw(or)?d|client[_-]?secret)\s*[:=]\s*["'][^"']{8,}["']`
   - Connection strings with credentials: `[a-z]+://[^/\s:]+:[^@\s]+@`
3. **Sensitive files that must not be pushed**: `.env*`, `*.pem`, `*.key`, `*.p12`, `*.pfx`, `id_rsa*`,
   `*.sqlite`/`*.db`, `.claude/settings.local.json`, `*.log`, credential/backup files. If found,
   propose adding them to `.gitignore` (and `git rm --cached` if already tracked).
4. **Personal data**: real email addresses, phone numbers, internal hostnames/IPs. In this project pay
   special attention to `FORMSUBMIT_ENDPOINT` in `index.html` — a real email there becomes public on
   GitHub and GitHub Pages. The placeholder `YOUR_EMAIL@example.com` is fine; anything else is a
   finding the user must confirm. Never print the user's own email in the report; mask it.
5. **Project rules from CLAUDE.md** (the app is published as a live site, so these are security-relevant):
   - No `localStorage`, `sessionStorage`, `indexedDB`, `document.cookie`.
   - The only network call is to `FORMSUBMIT_ENDPOINT` — flag any other `fetch(`, `XMLHttpRequest`,
     `navigator.sendBeacon`, `WebSocket`, or external `<script src>` / `<link href>` / `<img src>` (no CDNs).
   - No `eval(`, `new Function(`, `document.write(`.
   - Every `innerHTML` / `insertAdjacentHTML` / template-string HTML built from user input goes through
     `escapeHtml()`. Read the relevant functions (`renderCard`, `renderBoard`, toasts) rather than
     relying on grep alone.
   - No real bank logos/branding.
6. **GitHub Actions workflow** (if `.github/workflows/*.yml` exists): pinned action versions, minimal
   `permissions:`, no `pull_request_target` with checkout of PR code, no secrets echoed.

**Gate decision**
- No findings → print `Security scan: PASS` with a one-line summary of what was checked, and continue.
- Any finding → print the findings table, propose a concrete fix for each, and **stop and ask** the
  user whether to (a) apply the fixes, (b) proceed anyway for specific findings, or (c) abort.
  If a real secret is already in git history, tell the user to **rotate it** — rewriting history alone
  is not enough — and do not push until they confirm.

## Phase 2 – Push the code

1. If the repo does not exist: `gh repo create OWNER/REPO --VISIBILITY --source . --remote origin`
   (no `--push` yet). Confirm with the user first if it would be created as **public**.
2. Ensure `origin` points at `https://github.com/OWNER/REPO.git` (`git remote set-url origin ...`
   or `git remote add origin ...`). If `origin` already points somewhere else, ask before changing it.
3. Commit pending work (after Phases 3–4 have written their files, commit them too):
   stage files explicitly by name — never `git add -A` blindly — and use a descriptive message ending with
   the attribution line from the current session's attribution reminder.
4. `git fetch origin` and, if the remote branch has commits you don't have, integrate them
   (`git pull --rebase origin BRANCH`) and resolve conflicts. **Never force-push** unless the user
   explicitly asks.
5. `git push -u origin BRANCH`.

Recommended ordering in practice: do Phases 3, 3b and 4 locally first (README, screenshot, workflow
files), re-run the Phase 1 scan on the new/changed files, then do a single commit + push in Phase 2,
then Phase 5.

## Phase 3 – Create / edit README.md

1. Read the existing `README.md` (if any), `CLAUDE.md` and `index.html` to understand the app.
2. If README is missing or a stub, write a full one; if it exists with real content, **update it in
   place** and keep the user's sections. Suggested structure:
   - Title + one-line summary, and a **Live demo** link: `https://OWNER.github.io/REPO/`
     (use the custom domain from the Pages API instead if one is configured)
   - Features (columns, drag & drop + keyboard Move ▸ fallback, filters, overdue badge, Add Task modal)
   - Run locally (open `index.html` in a browser — no build step)
   - Configuration: set `FORMSUBMIT_ENDPOINT` for new-task email notifications (FormSubmit requires a
     one-time activation email)
   - Tech & constraints (vanilla HTML/CSS/JS, no persistence — data resets on refresh, fictitious bank)
   - Deployment (GitHub Pages via `.github/workflows/pages.yml`)
   - Security notes (user input escaped, no storage, single outbound endpoint)
3. Don't invent facts: every claim must be verifiable in the code.

## Phase 3b – Capture a README screenshot (Playwright MCP)

Uses the project-level `playwright` MCP server from `.mcp.json` (Edge, `file://` access allowed).
Capture the **local** `index.html` so the image matches exactly what is being pushed.

1. If the `mcp__playwright__*` tools are not available, tell the user to restart Claude Code and approve
   the `playwright` server, then skip this phase (keep any existing `docs/screenshot.png`). Don't block
   the publish on it.
2. `browser_resize` to 1440 × 900, then `browser_navigate` to
   `file:///<absolute path of the project, forward slashes, spaces as %20>/index.html`.
3. `browser_wait_for` ~1 second, then `browser_snapshot` and check the page is in its default state:
   the board shows all four columns, no modal/dialog is open, and no error toast is visible.
   If anything is off, it's a bug in the app: report it to the user instead of committing a bad image.
4. `browser_take_screenshot` with `type: "png"` and `filename: "docs/screenshot.png"` (viewport only,
   not full page), then `browser_close`.
5. Read the PNG to visually verify it, and check it shows only seed/demo data (no real names, emails or
   endpoints beyond what Phase 1 already cleared).
6. Make sure README.md embeds it directly under the **Live demo** line (add once, don't duplicate):
   `![IT PMO Kanban board with Backlog, In Progress, Blocked and Done columns](docs/screenshot.png)`
7. Stage `docs/screenshot.png` with the README. `.playwright-mcp/` (MCP session output) must stay
   git-ignored; add it to `.gitignore` if missing.

## Phase 4 – Create / update GitHub Pages workflow

Create or update `.github/workflows/pages.yml`. Publish **only the site files** (not `CLAUDE.md`,
`.claude/`, etc.) by staging them into `_site`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]   # replace with BRANCH
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - name: Stage site files
        run: |
          mkdir -p _site
          cp index.html _site/
          touch _site/.nojekyll
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: _site
      - id: deployment
        uses: actions/deploy-pages@v4
```

If the project later gains more static files (css/js/assets), add them to the "Stage site files" step.
If an existing workflow is present, edit it rather than adding a second Pages workflow.

## Phase 5 – Enable Pages + update the repo "About"

Run after the push succeeds.

1. **Enable Pages with the Actions source** (idempotent):
   - `gh api repos/OWNER/REPO/pages` → if 404:
     `gh api -X POST repos/OWNER/REPO/pages -f build_type=workflow`
   - else if `build_type` isn't `workflow`:
     `gh api -X PUT repos/OWNER/REPO/pages -f build_type=workflow`
   - Note: Pages on a **private** repo needs a paid plan; if the API refuses, tell the user.
2. Trigger / watch the deploy: if the push didn't start a run, `gh workflow run pages.yml --ref BRANCH`.
   Then `gh run list --workflow=pages.yml --limit 1` and `gh run watch <id> --exit-status`.
   On failure, show `gh run view <id> --log-failed`, fix, re-scan, and push again.
3. **Update About** (description, website, topics):
   - Description: from `$ARGUMENTS` if given, otherwise a ≤ 350-char summary derived from the README,
     e.g. "Single-file IT PMO Kanban board demo — vanilla HTML/CSS/JS, drag & drop, no build step."
   - `gh repo edit OWNER/REPO --description "<desc>" --homepage "https://OWNER.github.io/REPO/"`
   - Topics: from `$ARGUMENTS`, otherwise sensible defaults
     (`kanban, javascript, html, css, vanilla-js, github-pages, project-management`), applied with
     `--add-topic`. Remove stale topics only if the user asked.
   - Show the current About values before overwriting a non-empty description the user wrote.

## Phase 6 – Report

Finish with a short summary:
- Security scan result (PASS / findings accepted by user)
- Commit SHA(s) pushed and branch
- README: created or updated; screenshot refreshed or skipped (and why)
- About: description, website, topics
- Pages workflow run status and the live URL
- Anything skipped or needing the user's action (e.g. FormSubmit activation, secret rotation)

## Rules

- The security gate in Phase 1 always runs, even if the user says "just push". Re-run it on any file
  you change before pushing again.
- Never force-push, rewrite history, delete branches, or change repo visibility without explicit consent.
- Never commit or push files containing secrets, `.env` files or `.claude/settings.local.json`.
- Don't send the user's email or other personal data to any service other than GitHub as part of
  normal git/gh operations.
