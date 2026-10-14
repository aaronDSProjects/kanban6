// Claude Code PostToolUse hook: keeps the security briefing pop-up in index.html
// in sync with its sources in this folder, then re-pins the CSP hashes.
// index.html must stay a single file, so the sources are inlined between markers
// rather than loaded with <script src> / <link>.
// Manual run: node .claude/hooks/inline-security-briefing.js
const fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..", "..");
const index = path.join(root, "index.html");
const jsSrc = path.join(__dirname, "security-briefing.js");
const cssSrc = path.join(__dirname, "security-briefing.css");
const WATCHED = [index, jsSrc, cssSrc].map(function (p) { return path.normalize(p).toLowerCase(); });

function run(input) {
  // When invoked as a hook, only react to edits of index.html or the briefing sources
  if (input) {
    const file = ((input.tool_input || {}).file_path || "");
    if (!file || WATCHED.indexOf(path.normalize(path.resolve(root, file)).toLowerCase()) === -1) return;
  }

  const read = function (p) { return fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n"); };
  const before = read(index);
  let html = before;
  html = inline(html, "/* @hook security-briefing:css:start */", "/* @hook security-briefing:css:end */",
                read(cssSrc), "</style>");
  html = inline(html, "/* @hook security-briefing:js:start */", "/* @hook security-briefing:js:end */",
                read(jsSrc), "</script>");
  if (html === before) return;

  fs.writeFileSync(index, html);
  execFileSync(process.execPath, [path.join(root, "scripts", "csp-hash.js"), index], { stdio: "ignore" });
  console.log("Security briefing re-inlined into index.html and CSP hashes updated.");
}

// Replace the block between the markers, or insert it just before `anchor` the first time.
function inline(html, start, end, body, anchor) {
  const block = start + "\n" + body.replace(/\s+$/, "") + "\n" + end + "\n";
  const s = html.indexOf(start), e = html.indexOf(end);
  if (s !== -1 && e > s) return html.slice(0, s) + block + html.slice(e + end.length).replace(/^\n/, "");
  const a = html.indexOf(anchor);
  if (a === -1) throw new Error("No " + anchor + " in index.html");
  return html.slice(0, a) + block + html.slice(a);
}

let raw = "";
if (process.stdin.isTTY) {
  run(null);
} else {
  process.stdin.on("data", function (d) { raw += d; });
  process.stdin.on("end", function () {
    let input = null;
    try { input = raw.trim() ? JSON.parse(raw) : null; } catch (err) { input = null; }
    try { run(input); } catch (err) { console.error(err.message); process.exit(1); }
  });
}
