# IT PMO Kanban Board

A single-file Kanban board demo for an IT Project Management Office, built with plain HTML, CSS and JavaScript — no frameworks, no build step, no dependencies.

**Live demo:** https://aarondsprojects.github.io/kanban6/

![IT PMO Kanban board with Backlog, In Progress, Blocked and Done columns](docs/screenshot.png)

> Demo only: the bank is fictitious and the board lives in memory. It resets to the seeded data whenever you refresh the page.

## Features

- **Four columns:** Backlog, In Progress, Blocked, Done, each with a live task count.
- **Drag and drop** cards between columns, with a keyboard-accessible **Move ▸** dropdown on every card as a fallback.
- **Add Task modal** with inline validation (title, assignee and due date required; Esc closes it).
- **Filters** by project, assignee and priority, plus a one-click *Clear filters*.
- **Summary bar** with totals per status and an overdue count.
- **Overdue badge** on any task past its due date that isn't Done (seed dates are computed relative to today, so the demo always has overdue examples).
- **Inline delete confirmation:** no browser pop-ups.
- **Optional email notification** for new tasks via [FormSubmit](https://formsubmit.co/).

## Run locally

No install needed. Clone the repo and open `index.html` in any modern browser:

```bash
git clone https://github.com/aaronDSProjects/kanban6.git
```

## Configuration

New-task notifications are sent through FormSubmit's AJAX endpoint. To enable them, edit the constant near the top of the `<script>` in `index.html`:

```js
const FORMSUBMIT_ENDPOINT = "https://formsubmit.co/ajax/YOUR_EMAIL@example.com";
```

FormSubmit sends a one-time activation email the first time it is used. If the call fails, the board shows a warning toast and keeps working.

> ⚠️ Anything you put in this constant is public once pushed to GitHub or served on GitHub Pages.

## Tech and design constraints

- Vanilla HTML/CSS/JS in one file: no CDNs, web fonts or image files (icons are Unicode/inline SVG).
- No persistence: no localStorage, sessionStorage, IndexedDB or cookies.
- The only network call is the FormSubmit endpoint.
- All user input is HTML-escaped before rendering; notifications use `textContent`.

## Deployment

The site is deployed to GitHub Pages by [`.github/workflows/pages.yml`](.github/workflows/pages.yml) on every push to `main`. Only `index.html` is published.
