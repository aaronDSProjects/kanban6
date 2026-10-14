# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Single-file IT PMO Kanban demo app: everything lives in `index.html` (markup, `<style>`, `<script>`). There is no build, bundler, package manager, test suite or linter. Run it by opening the file directly in a browser (`file://`).

## Hard constraints (from the original spec)

- Vanilla HTML/CSS/JS only: no frameworks, CDNs, web fonts or image files. Icons are Unicode/inline SVG.
- No persistence: no localStorage, sessionStorage, IndexedDB or cookies. Board state is in-memory and resets to seed data on refresh (the UI says so).
- The only network call is the FormSubmit AJAX endpoint (`FORMSUBMIT_ENDPOINT` at the top of the script). Never send the user's email anywhere else.
- No `!important`; no native `alert()`/`confirm()`; fictitious bank, so no real UOB logos or branding (neutral "IT PMO" wordmark, blue palette).

## Architecture

- `state = { tasks, filters, confirmingId, draggingId }` is the single source of truth. All card and column DOM is produced by `renderBoard()` / `renderCard()` via HTML strings; mutate `state` then re-render rather than touching card DOM directly.
- Every user-supplied string must go through `escapeHtml()` before landing in an HTML string. Toasts use `textContent`.
- Board interactions use event delegation on `#board` (click, change, and native drag/drop events). The Move ▸ `<select>` per card is the keyboard fallback for drag and drop; `moveTask()` is the single path for both.
- Add Task flow (`handleSubmit`): validate inline → `addTask()` optimistically → close modal → `notifyNewTask()` in try/catch. A FormSubmit failure only produces a warning toast and must never break the board.
- Task IDs are `UOB-ITPM-####` from the in-memory `nextTaskNumber` counter, which seed data also consumes (first new task is 1009).
- Seed due dates are computed relative to today (`dateOffset`) so the Overdue badge demo stays valid; overdue means `dueDate < today` and status ≠ Done.

## Content Security Policy

`index.html` carries a CSP `<meta>` that allows only its own inline `<style>` and `<script>` by SHA-256 hash, plus `connect-src https://formsubmit.co`. After **any** edit to the inline style or script, run `node scripts/csp-hash.js index.html`, or the browser blocks them and the page renders blank/unstyled. Don't add inline `style="..."` attributes or event-handler attributes (blocked by the CSP); set dynamic styles via CSSOM (`el.style.x = ...`) as `applySegmentWidths()` does.

## Security briefing pop-up (project hook)

The "company security briefing" dialog (shown once per page load after 10 s of visible time) is authored in `.claude/hooks/security-briefing.js` and `.claude/hooks/security-briefing.css`, not in `index.html`. A `PostToolUse` hook in `.claude/settings.json` runs `.claude/hooks/inline-security-briefing.js`, which copies both files into `index.html` between the `/* @hook security-briefing:... */` markers and re-runs `csp-hash.js`. Edit the sources, never the inlined copy (it is overwritten). Outside Claude Code, run `node .claude/hooks/inline-security-briefing.js` by hand. The dialog stops appearing after the briefing date (`BRIEFING.date`).
