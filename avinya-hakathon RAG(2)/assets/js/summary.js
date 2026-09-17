/* ==========================================================================
   Readout — doctor summary builder
   ========================================================================== */

mountShell("summary");

const flaggedP = PARAMETERS.filter((p) => statusOf(p) === "out");
const inRangeP = PARAMETERS.filter((p) => statusOf(p) === "in");
const find = (id) => PARAMETERS.find((p) => p.id === id);

["copy", "download", "mail", "print"].forEach((k) => {
  const n = $(`[data-i="${k}"]`);
  if (n) n.innerHTML = ICON[k === "mail" ? "mail" : k];
});

/* ---------- saved form state ---------- */
const saved = Store.get("summaryForm", {});
const FIELDS = ["who", "dob", "reason", "fast", "context", "meds"];
FIELDS.forEach((f) => {
  const node = $(`#${f}`);
  if (saved[f]) node.value = saved[f];
  node.addEventListener("input", () => {
    const next = Store.get("summaryForm", {});
    next[f] = node.value;
    Store.set("summaryForm", next);
    draw();
  });
});
if (!saved.dob && REPORT.patient.age) $("#dob").value = REPORT.patient.age;

["opt-inrange", "opt-patterns", "opt-trends"].forEach((id) => {
  const node = $(`#${id}`);
  const v = Store.get(id, true);
  node.checked = v;
  node.addEventListener("change", () => { Store.set(id, node.checked); draw(); });
});

/* ---------- questions ---------- */
function defaultQuestions() {
  const fromFlags = flaggedP.map((p) => p.ask).filter(Boolean);
  const base = ["Does anything here need repeating, and how soon?"];
  return Array.from(new Set([...fromFlags, ...base]));
}

let questions = Store.get("questions", null);
if (!questions || !questions.length) {
  questions = defaultQuestions();
  Store.set("questions", questions);
}

function renderQuestions() {
  const box = $("[data-questions]");
  box.innerHTML = questions.map((q, i) => `
    <div class="row" style="gap:8px;align-items:flex-start">
      <input type="text" value="${esc(q)}" data-q="${i}" style="flex:1 1 auto">
      <button class="btn btn-quiet btn-sm" type="button" data-rm="${i}" aria-label="Remove question">Remove</button>
    </div>`).join("") ||
    `<p class="card-sub">No questions yet. Even one is better than none.</p>`;

  $$("[data-q]").forEach((input) => input.addEventListener("input", () => {
    questions[+input.dataset.q] = input.value;
    Store.set("questions", questions);
    draw();
  }));
  $$("[data-rm]").forEach((btn) => btn.addEventListener("click", () => {
    questions.splice(+btn.dataset.rm, 1);
    Store.set("questions", questions);
    renderQuestions(); draw();
  }));
}

$("#add-q").addEventListener("click", addQuestion);
$("#new-q").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); addQuestion(); } });
function addQuestion() {
  const v = $("#new-q").value.trim();
  if (!v) return;
  questions.push(v);
  Store.set("questions", questions);
  $("#new-q").value = "";
  renderQuestions(); draw();
}
renderQuestions();

/* ---------- gate: read the flags before exporting ---------- */
function drawGate() {
  const left = Review.outstanding();
  const gate = $("[data-gate]");
  const buttons = $$("[data-act]");

  if (!left.length) {
    gate.innerHTML = "";
    buttons.forEach((b) => (b.disabled = false));
    return;
  }

  gate.innerHTML = `<div class="guard guard--edge" style="margin-bottom:22px">
    <span>${ICON.info}</span>
    <span><strong>${pluralise(left.length, "flagged result hasn't", "flagged results haven't")} been read yet.</strong>
      Exporting is held back until then — a summary you haven't read is not much use in the room.
      <a href="dashboard.html" style="color:inherit">Read ${left.length === 1 ? "it" : "them"} on your results page</a>,
      or <button type="button" id="mark-all" style="background:none;border:0;padding:0;font:inherit;color:inherit;text-decoration:underline;cursor:pointer">mark all as read</button>.</span>
  </div>`;
  buttons.forEach((b) => (b.disabled = true));
  $("#mark-all").addEventListener("click", () => {
    Store.set("reviewed", PARAMETERS.map((p) => p.id));
    drawGate();
    toast("All results marked as read");
  });
}

/* ---------- the sheet ---------- */
function val(id) { return $(`#${id}`).value.trim(); }

function flagRowsHTML() {
  return flaggedP.map((p) => {
    const v = view(p);
    const dir = (p.high != null && v.value > v.high) ? "above range" : "below range";
    const conv = (n) => (Prefs.units() === "si" && SI[p.id]) ? +(n * SI[p.id].f).toFixed(SI[p.id].dp) : n;
    const trend = ($("#opt-trends").checked && TRENDS[p.id])
      ? TRENDS[p.id].slice(0, -1).map(conv).join(" → ") + " → " : "";
    return `<tr>
      <td>${esc(p.name)} <span style="color:var(--ink-3)">(${esc(p.abbr)})</span></td>
      <td class="v">${fmt(v.value, v.dp)} ${esc(v.unit)}</td>
      <td class="v">${esc(rangeText(p))}</td>
      <td>${dir}</td>
      ${$("#opt-trends").checked ? `<td class="v" style="color:var(--ink-3)">${trend ? esc(trend + fmt(v.value, v.dp)) : "—"}</td>` : ""}
    </tr>`;
  }).join("");
}

function draw() {
  const who = val("who") || "Not stated";
  const age = val("dob");
  const inRange = $("#opt-inrange").checked;
  const patterns = $("#opt-patterns").checked;
  const trends = $("#opt-trends").checked;

  $("#sheet").innerHTML = `
    <div class="sheet-head">
      <h2>Laboratory report — patient summary</h2>
      <p class="sub">Prepared by the patient using Readout, for discussion at an appointment. Not a clinical interpretation.</p>
    </div>

    <section>
      <h3>Report</h3>
      <table>
        <tr><td style="width:38%;color:var(--ink-3)">Belongs to</td><td>${esc(who)}${age ? `, age ${esc(age)}` : ""}</td></tr>
        <tr><td style="color:var(--ink-3)">Laboratory</td><td>${esc(REPORT.lab)}</td></tr>
        <tr><td style="color:var(--ink-3)">Sample collected</td><td>${esc(REPORT.collected)}</td></tr>
        <tr><td style="color:var(--ink-3)">Tests on report</td><td class="v">${PARAMETERS.length}</td></tr>
      </table>
    </section>

    <section>
      <h3>Context from the patient</h3>
      <table>
        <tr><td style="width:38%;color:var(--ink-3)">Reason for test</td><td>${esc(val("reason") || "Not stated")}</td></tr>
        <tr><td style="color:var(--ink-3)">Fasting duration</td><td>${esc(val("fast") || "Not stated")}</td></tr>
        <tr><td style="color:var(--ink-3)">Reported by patient</td><td>${esc(val("context") || "Nothing noted")}</td></tr>
        <tr><td style="color:var(--ink-3)">Medicines &amp; supplements</td><td>${esc(val("meds") || "None listed")}</td></tr>
      </table>
    </section>

    <section>
      <h3>Values outside the ranges printed on the report (${flaggedP.length})</h3>
      ${flaggedP.length ? `<table>
        <thead><tr><th>Test</th><th>Result</th><th>Report range</th><th>Direction</th>${trends ? "<th>Previous</th>" : ""}</tr></thead>
        <tbody>${flagRowsHTML()}</tbody>
      </table>` : `<p>None. Every value sat inside the range printed beside it.</p>`}
    </section>

    ${inRange ? `<section>
      <h3>Values inside their printed ranges (${inRangeP.length})</h3>
      <p style="color:var(--ink-2)">${inRangeP.map((p) => `${esc(p.abbr)} ${fmt(view(p).value, view(p).dp)}`).join(" · ")}</p>
    </section>` : ""}

    ${patterns ? `<section>
      <h3>Noted groupings</h3>
      <ul>${PATTERNS.map((pat) => `<li>${esc(pat.title)} — ${esc(pat.involves.map((id) => find(id).abbr).join(", "))}</li>`).join("")}</ul>
    </section>` : ""}

    <section>
      <h3>Questions from the patient</h3>
      ${questions.filter(Boolean).length
        ? `<ul>${questions.filter(Boolean).map((q) => `<li>${esc(q)}</li>`).join("")}</ul>`
        : "<p>None written down.</p>"}
    </section>

    <div class="sheet-foot">
      Values transcribed from the laboratory report named above; ranges are the laboratory's own, as printed.
      Flagging here means only that a value fell outside its printed range. Readout is an explanatory aid and
      performs no clinical interpretation, diagnosis or triage. Prepared ${new Date().toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}.
    </div>`;
}

/* ---------- plain-text version for copy, download and email ---------- */
function asText() {
  const line = (a, b) => `${a}: ${b}`;
  const out = [];
  out.push("LABORATORY REPORT — PATIENT SUMMARY");
  out.push("Prepared by the patient using Readout. Not a clinical interpretation.");
  out.push("");
  out.push(line("Belongs to", val("who") || "Not stated"));
  if (val("dob")) out.push(line("Age", val("dob")));
  out.push(line("Laboratory", REPORT.lab));
  out.push(line("Sample collected", REPORT.collected));
  out.push("");
  out.push("CONTEXT FROM THE PATIENT");
  out.push(line("Reason for test", val("reason") || "Not stated"));
  out.push(line("Fasting duration", val("fast") || "Not stated"));
  out.push(line("Reported by patient", val("context") || "Nothing noted"));
  out.push(line("Medicines & supplements", val("meds") || "None listed"));
  out.push("");
  out.push(`OUTSIDE PRINTED RANGES (${flaggedP.length})`);
  flaggedP.forEach((p) => {
    const v = view(p);
    const dir = (p.high != null && v.value > v.high) ? "above" : "below";
    out.push(`  ${p.name} (${p.abbr}): ${fmt(v.value, v.dp)} ${v.unit} — report range ${rangeText(p)} — ${dir}`);
  });
  if ($("#opt-inrange").checked) {
    out.push("");
    out.push(`INSIDE PRINTED RANGES (${inRangeP.length})`);
    out.push("  " + inRangeP.map((p) => `${p.abbr} ${fmt(view(p).value, view(p).dp)}`).join(", "));
  }
  if ($("#opt-patterns").checked) {
    out.push("");
    out.push("NOTED GROUPINGS");
    PATTERNS.forEach((pat) => out.push(`  - ${pat.title} (${pat.involves.map((id) => find(id).abbr).join(", ")})`));
  }
  out.push("");
  out.push("QUESTIONS FROM THE PATIENT");
  questions.filter(Boolean).forEach((q) => out.push(`  - ${q}`));
  out.push("");
  out.push("Values transcribed from the laboratory report named above; ranges are the laboratory's own.");
  out.push("Flagging means only that a value fell outside its printed range. Readout performs no clinical");
  out.push("interpretation, diagnosis or triage.");
  return out.join("\n");
}

/* ---------- actions ---------- */
$$("[data-act]").forEach((btn) => btn.addEventListener("click", () => {
  const act = btn.dataset.act;
  if (act === "print") window.print();
  if (act === "copy") copyText(asText());
  if (act === "download") downloadText("readout-summary.txt", asText());
  if (act === "email") {
    const subject = encodeURIComponent("Lab report summary ahead of my appointment");
    const body = encodeURIComponent(asText());
    location.href = `mailto:?subject=${subject}&body=${body}`;
  }
}));

drawGate();
draw();
