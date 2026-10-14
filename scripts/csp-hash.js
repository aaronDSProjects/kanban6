// Re-pins the CSP hashes in index.html after editing its inline <style> or <script>.
// Usage: node scripts/csp-hash.js index.html
const fs = require("fs"), crypto = require("crypto");
const file = process.argv[2];
let html = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
const h = s => "'sha256-" + crypto.createHash("sha256").update(s, "utf8").digest("base64") + "'";
const style = html.match(/<style>([\s\S]*?)<\/style>/)[1];
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
html = html.replace(/style-src '[^']*'/, "style-src " + h(style))
           .replace(/script-src '[^']*'/, "script-src " + h(script));
fs.writeFileSync(file, html);
console.log("style", h(style), "\nscript", h(script));
