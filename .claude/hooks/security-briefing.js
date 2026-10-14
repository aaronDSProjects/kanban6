/* ============================================================
   Security briefing reminder (source: .claude/hooks/security-briefing.js)
   Shown once per page load after 10 s of visible time on the page.
   Inlined into index.html by .claude/hooks/inline-security-briefing.js;
   edit this file, not the copy in index.html.
   ============================================================ */
(function () {
  const BRIEFING = {
    date: "2026-10-19",                    // Monday after the reminder went live
    when: "Monday 19 October, 10:00 AM",
    where: "Town Hall room"
  };
  const DELAY_MS = 10000;

  if (todayString() > BRIEFING.date) return;  // briefing is over, stay quiet

  let visibleMs = 0;
  let lastTick = Date.now();
  const timer = setInterval(function () {
    const now = Date.now();
    if (document.visibilityState === "visible") visibleMs += now - lastTick;
    lastTick = now;
    if (visibleMs < DELAY_MS) return;
    // Wait for the Add Task modal to close rather than stacking on top of it
    if (!document.getElementById("backdrop").hidden) return;
    clearInterval(timer);
    showBriefing();
  }, 500);

  function showBriefing() {
    const dialog = document.createElement("dialog");
    dialog.className = "briefing";
    dialog.setAttribute("aria-labelledby", "briefingTitle");

    const tag = document.createElement("p");
    tag.className = "briefing-tag";
    tag.textContent = "Security notice";
    const title = document.createElement("h2");
    title.id = "briefingTitle";
    title.textContent = "Company security briefing";
    const body = document.createElement("p");
    body.textContent = "All staff are expected to attend the company security briefing.";
    const details = document.createElement("dl");
    details.className = "briefing-details";
    [["When", BRIEFING.when], ["Where", BRIEFING.where]].forEach(function (pair) {
      const dt = document.createElement("dt");
      dt.textContent = pair[0];
      const dd = document.createElement("dd");
      dd.textContent = pair[1];
      details.append(dt, dd);
    });
    const actions = document.createElement("div");
    actions.className = "form-actions";
    const ok = document.createElement("button");
    ok.type = "button";
    ok.className = "btn";
    ok.textContent = "Got it";
    ok.addEventListener("click", function () { dialog.close(); });
    actions.append(ok);

    dialog.append(tag, title, body, details, actions);
    dialog.addEventListener("close", function () { dialog.remove(); });
    document.body.append(dialog);
    dialog.showModal();
    ok.focus();
  }
})();
