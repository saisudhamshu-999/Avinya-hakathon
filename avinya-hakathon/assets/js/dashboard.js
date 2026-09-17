/* ==========================================================================
   Readout — results dashboard
   ========================================================================== */

mountShell("results");

const flagged = PARAMETERS.filter((p) => statusOf(p) === "out");
const byId = (id) => PARAMETERS.find((p) => p.id === id);

/* ---------- header ---------- */
$("[data-report-title]").textContent = REPORT.title;
$("[data-report-meta]").innerHTML =
  `${esc(REPORT.lab)} &nbsp;·&nbsp; collected ${esc(REPORT.collected)} &nbsp;·&nbsp; ` +
  `<span class="num">${REPORT.extracted}</span> tests read from <span class="num">${REPORT.pages}</span> pages` +
  (REPORT.fasting ? " &nbsp;·&nbsp; recorded as a fasting sample" : "");

$("[data-icon-info]").innerHTML = ICON.info;
$("[data-icon-search]").innerHTML = ICON.search;

/* ---------- verdict ---------- */
$("[data-verdict]").innerHTML = flagged.length
  ? `<div class="verdict verdict--flagged">
       <span class="count num">${flagged.length}</span>
       <div>
         <h2>${pluralise(flagged.length, "result sits", "results sit")} outside the range printed on your report</h2>
         <p>The other ${PARAMETERS.length - flagged.length} are inside theirs. Outside the range is a prompt for a conversation, not a finding — reference ranges describe what most people in a comparison group measured, and healthy people fall outside them often.</p>
       </div>
     </div>`
  : `<div class="verdict verdict--clear">
       <span class="count num">0</span>
       <div>
         <h2>Every value sits inside the range printed beside it</h2>
         <p>That covers only what this report measured, and only against this laboratory's ranges. It is not a clean bill of health, and it is not a reason to skip an appointment you had planned.</p>
       </div>
     </div>`;

$("[data-flag-count]").textContent = `${flagged.length} of ${PARAMETERS.length} tests`;

/* ---------- flag rows (jump to the full entry below) ---------- */
$("[data-flags]").innerHTML = flagged.map((p) => flagRow(p)).join("")
  || `<div class="empty"><h3>Nothing flagged</h3><p>Every value on this report sits inside the range printed beside it.</p></div>`;

function flagRow(p) {
  const v = view(p);
  const direction = (p.high != null && v.value > v.high) ? "above" : "below";
  const limit = direction === "above" ? v.high : v.low;
  return `
  <div class="param" data-status="out">
    <button class="param-summary" data-jump="${p.id}">
      <span class="dot dot--out"></span>
      <span class="param-name">${esc(p.name)}
        <small>${esc(p.group)} · ${direction} the printed ${direction === "above" ? "upper" : "lower"} limit of <span class="num">${fmt(limit, v.dp)}</span></small>
      </span>
      <span class="param-value num">${fmt(v.value, v.dp)}<span class="unit">${esc(v.unit)}</span></span>
      <span class="param-gauge">
        ${gauge(p)}
        <span class="param-range">Report range ${esc(rangeText(p))}</span>
      </span>
      <span class="param-caret">${ICON.arrow}</span>
    </button>
  </div>`;
}

$$("[data-jump]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const id = btn.dataset.jump;
    const row = document.getElementById(`p-${id}`);
    if (!row) return;
    // clear filters so the row is definitely on screen
    setFilter("all"); setGroup("all"); $("#q").value = ""; render();
    const target = document.getElementById(`p-${id}`);
    openRow(target, true);
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  });
});

/* ---------- parameter list ---------- */
const groups = Array.from(new Set(PARAMETERS.map((p) => p.group)));
const filterBar = $(".filters");
groups.forEach((g) => {
  filterBar.appendChild(el(`<button class="filter" data-group="${esc(g)}" aria-pressed="false">${esc(g)}</button>`));
});

let state = { status: "all", group: "all", q: "" };

function paramRow(p) {
  const v = view(p);
  const st = statusOf(p);
  return `
  <div class="param" id="p-${p.id}" data-id="${p.id}" data-status="${st}" data-group="${esc(p.group)}" data-open="false">
    <button class="param-summary" aria-expanded="false" aria-controls="d-${p.id}">
      <span class="dot dot--${st}" title="${STATUS_WORD[st]}"></span>
      <span class="param-name">${esc(p.name)}<small>${esc(p.group)} · ${esc(p.abbr)}</small></span>
      <span class="param-value num">${fmt(v.value, v.dp)}<span class="unit">${esc(v.unit)}</span></span>
      <span class="param-gauge">
        ${gauge(p)}
        <span class="param-range">Report range ${esc(rangeText(p))}</span>
      </span>
      <span class="param-caret">${ICON.chevron}</span>
    </button>
    <div class="param-detail" id="d-${p.id}">
      <div class="param-detail-grid">
        <div>
          <div class="explain"><h4>What this test measures</h4><p>${esc(p.what)}</p></div>
          <div class="explain"><h4>What your report shows</h4><p>${esc(p.reading)} ${st === "out" ? "A value outside a printed range is a reason to ask, not a finding in itself." : ""}</p></div>
          <div class="explain"><h4>What commonly moves this number</h4><p>${esc(p.influences)}</p></div>
          <button class="term-toggle" type="button" data-terms="${p.id}">${ICON.info}<span>Show the medical terms</span></button>
          <div class="term-body" id="t-${p.id}" data-open="false">${p.terms}</div>
        </div>
        <div>
          <div class="aside-box">
            <h4>As printed on your report</h4>
            <dl>
              <dt>Value</dt><dd class="num">${fmt(v.value, v.dp)} ${esc(v.unit)}</dd>
              <dt>Range</dt><dd class="num">${esc(rangeText(p))}</dd>
              <dt>Status</dt><dd>${STATUS_WORD[st]}</dd>
              <dt>Panel</dt><dd>${esc(p.group)}</dd>
            </dl>
          </div>
          ${p.ask ? `<div class="aside-box" style="margin-top:12px">
            <h4>Worth asking</h4>
            <p style="font-size:var(--t-sm);color:var(--ink)">${esc(p.ask)}</p>
            <button class="btn btn-secondary btn-sm" style="margin-top:12px" type="button" data-addq="${p.id}">Add to my summary</button>
            <button class="btn btn-quiet btn-sm" style="margin-top:6px;font-size:11.5px;padding-left:0;color:var(--pine)" type="button" data-verify="${p.id}">Verify / correct this value</button>
          </div>` : `<div style="margin-top:8px">
            <button class="btn btn-quiet btn-sm" style="font-size:11.5px;padding-left:0;color:var(--pine)" type="button" data-verify="${p.id}">Verify / correct this value</button>
          </div>`}
          ${TRENDS[p.id] ? `<div class="aside-box" style="margin-top:12px">
            <h4>Across your last ${TRENDS[p.id].length} reports</h4>
            ${sparkline(TRENDS[p.id], p, { width: 240, height: 44 })}
            <div class="spark-dates"><span>${TREND_DATES[0]}</span><span>${TREND_DATES[TREND_DATES.length - 1]}</span></div>
          </div>` : ""}
        </div>
      </div>
    </div>
  </div>`;
}

function matches(p) {
  if (state.status !== "all" && statusOf(p) !== state.status) return false;
  if (state.group !== "all" && p.group !== state.group) return false;
  if (state.q) {
    const hay = `${p.name} ${p.abbr} ${p.group} ${p.terms}`.toLowerCase();
    if (!hay.includes(state.q.toLowerCase())) return false;
  }
  return true;
}

function render() {
  const list = PARAMETERS.filter(matches);
  $("[data-params]").innerHTML = list.map(paramRow).join("");
  $("[data-shown-count]").textContent =
    list.length === PARAMETERS.length
      ? `${PARAMETERS.length} tests`
      : `${list.length} of ${PARAMETERS.length} tests`;

  const none = $("[data-no-results]");
  none.hidden = list.length > 0;
  none.innerHTML = list.length ? "" : `<div class="empty">
      <h3>No test matches that</h3>
      <p>Try the abbreviation printed on your report — SGPT, PCV, TSH — or clear the filters.</p>
      <button class="btn btn-secondary btn-sm" type="button" id="clear-filters">Clear filters</button>
    </div>`;
  const clear = $("#clear-filters");
  if (clear) clear.addEventListener("click", () => {
    state = { status: "all", group: "all", q: "" };
    $("#q").value = "";
    setFilter("all"); setGroup("all"); render();
  });

  wireRows();
}

function openRow(row, open) {
  row.dataset.open = String(open);
  $(".param-summary", row).setAttribute("aria-expanded", String(open));
}

function wireRows() {
  $$("[data-params] .param-summary").forEach((btn) => {
    btn.addEventListener("click", () => {
      const row = btn.closest(".param");
      openRow(row, row.dataset.open !== "true");
    });
  });
  $$("[data-terms]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const body = document.getElementById(`t-${btn.dataset.terms}`);
      const open = body.dataset.open !== "true";
      body.dataset.open = String(open);
      $("span", btn).textContent = open ? "Hide the medical terms" : "Show the medical terms";
    });
  });
  $$("[data-addq]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const p = byId(btn.dataset.addq);
      const qs = Store.get("questions", []);
      if (!qs.includes(p.ask)) {
        qs.push(p.ask);
        Store.set("questions", qs);
        toast("Added to your doctor summary");
      } else {
        toast("Already on your summary");
      }
    });
  });
  $$("[data-verify]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const p = byId(btn.dataset.verify);
      openVerifyModal(p);
    });
  });
}

function openVerifyModal(p) {
  const modal = el(`<div>
    <h2>Verify or correct lab value</h2>
    <p class="card-sub" style="margin-bottom:16px">If OCR misread this number or range from your printed paper, update it here. An audit record is saved without overwriting original scans.</p>
    <form id="verify-form" class="stack" style="gap:12px">
      <div>
        <label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px">Test name</label>
        <input type="text" id="v-name" value="${esc(p.name)}" style="width:100%;padding:8px 12px;border-radius:6px;border:1px solid var(--line);font-size:13px">
      </div>
      <div class="row" style="gap:10px">
        <div style="flex:1">
          <label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px">Extracted value</label>
          <input type="number" step="any" id="v-val" value="${p.value}" required style="width:100%;padding:8px 12px;border-radius:6px;border:1px solid var(--line);font-size:13px">
        </div>
        <div style="flex:1">
          <label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px">Unit</label>
          <input type="text" id="v-unit" value="${esc(p.unit)}" style="width:100%;padding:8px 12px;border-radius:6px;border:1px solid var(--line);font-size:13px">
        </div>
      </div>
      <div class="row" style="gap:10px">
        <div style="flex:1">
          <label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px">Printed range low</label>
          <input type="number" step="any" id="v-low" value="${p.low != null ? p.low : ''}" placeholder="e.g. 70" style="width:100%;padding:8px 12px;border-radius:6px;border:1px solid var(--line);font-size:13px">
        </div>
        <div style="flex:1">
          <label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px">Printed range high</label>
          <input type="number" step="any" id="v-high" value="${p.high != null ? p.high : ''}" placeholder="e.g. 99" style="width:100%;padding:8px 12px;border-radius:6px;border:1px solid var(--line);font-size:13px">
        </div>
      </div>
      <div class="row" style="margin-top:14px;justify-content:flex-end;gap:8px">
        <button class="btn btn-secondary btn-sm" type="button" data-close>Cancel</button>
        <button class="btn btn-primary btn-sm" type="submit">Save and recalculate</button>
      </div>
    </form>
  </div>`);

  modal.querySelector("#verify-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const newName = modal.querySelector("#v-name").value.trim();
    const newVal = parseFloat(modal.querySelector("#v-val").value);
    const newUnit = modal.querySelector("#v-unit").value.trim();
    const rawLow = modal.querySelector("#v-low").value.trim();
    const rawHigh = modal.querySelector("#v-high").value.trim();
    const newLow = rawLow === "" ? null : parseFloat(rawLow);
    const newHigh = rawHigh === "" ? null : parseFloat(rawHigh);

    p.name = newName || p.name;
    p.value = isNaN(newVal) ? p.value : newVal;
    p.unit = newUnit || p.unit;
    p.low = newLow;
    p.high = newHigh;

    try {
      await API.verifyResult(p.id, { name: p.name, value: p.value, unit: p.unit, low: p.low, high: p.high });
    } catch (err) {
      console.warn("API verify:", err);
    }

    toast(`Updated ${p.name}`);
    render();
    renderVerdict();
    renderChecklist();
    document.querySelector(".modal-backdrop")?.remove();
  });

  openModal(modal);
}

function setFilter(value) {
  state.status = value;
  $$("[data-filter]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.filter === value)));
}
function setGroup(value) {
  state.group = value;
  $$(".filters [data-group]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.group === value)));
}

$$("[data-filter]").forEach((b) => b.addEventListener("click", () => { setFilter(b.dataset.filter); render(); }));
$$(".filters [data-group]").forEach((b) => b.addEventListener("click", () => { setGroup(b.dataset.group); render(); }));
$("#q").addEventListener("input", (e) => { state.q = e.target.value.trim(); render(); });

render();

/* ---------- patterns ---------- */
$("[data-patterns]").innerHTML = PATTERNS.map((pat) => `
  <article class="pattern">
    <h3>${esc(pat.title)}</h3>
    <p>${esc(pat.body)}</p>
    <div class="involves">
      ${pat.involves.map((id) => {
        const p = byId(id);
        const st = statusOf(p);
        return `<button class="chip chip--${st}" data-jump-chip="${id}" style="border:0;cursor:pointer;font-family:inherit">
          ${esc(p.name)} <span class="num">${fmt(view(p).value, view(p).dp)}</span></button>`;
      }).join("")}
    </div>
    <p style="margin-top:10px;font-size:var(--t-sm)">
      <span style="color:var(--ink-3)">Worth asking:</span> ${esc(pat.prompt)}
    </p>
  </article>`).join("");

$$("[data-jump-chip]").forEach((chip) => {
  chip.addEventListener("click", () => {
    setFilter("all"); setGroup("all"); $("#q").value = ""; state.q = ""; render();
    const row = document.getElementById(`p-${chip.dataset.jumpChip}`);
    if (!row) return;
    openRow(row, true);
    row.scrollIntoView({ behavior: "smooth", block: "center" });
  });
});

/* ---------- side: extraction stats ---------- */
$("[data-stat-pages]").textContent = REPORT.pages;
$("[data-stat-tests]").textContent = REPORT.extracted;
$("[data-stat-ranges]").textContent =
  `${PARAMETERS.filter((p) => statusOf(p) !== "unknown").length} of ${PARAMETERS.length}`;

function extractionModal() {
  const rows = PARAMETERS.map((p) => {
    const st = statusOf(p);
    const mark = st === "out" ? (p.high != null && p.value > p.high ? "H" : "L") : "";
    return `${p.abbr.padEnd(12)} ${String(p.value).padStart(7)}  ${p.unit.padEnd(12)} ${rangeText(p).padEnd(22)} ${mark}`;
  }).join("\n");

  return el(`<div>
    <h2>What Readout read from the page</h2>
    <p class="card-sub" style="margin-bottom:16px">Compare a few of these against the paper. If a number here is wrong, everything built on top of it is wrong too.</p>
    <pre class="num" style="background:var(--surface-sunk);padding:16px;border-radius:var(--r-md);overflow:auto;font-size:11.5px;line-height:1.9;margin:0">${esc(rows)}</pre>
    <div class="row" style="margin-top:18px">
      <span class="card-sub">Extraction confidence ${Math.round(REPORT.confidence * 100)}%</span>
      <button class="btn btn-secondary btn-sm row-end" type="button" data-close>Close</button>
      <a class="btn btn-primary btn-sm" href="upload.html">Re-upload a clearer scan</a>
    </div>
  </div>`);
}
["#check-extraction", "#check-extraction-2"].forEach((sel) => {
  const b = $(sel);
  if (b) b.addEventListener("click", () => openModal(extractionModal()));
});

/* ---------- side: checklist ---------- */
function renderChecklist() {
  const box = $("[data-checklist]");
  if (!flagged.length) {
    box.innerHTML = `<p class="card-sub">Nothing flagged on this report, so there is nothing to tick.</p>`;
    return;
  }
  box.innerHTML = flagged.map((p) => `
    <label class="row" style="gap:10px;padding:8px 0;cursor:pointer;align-items:flex-start">
      <input type="checkbox" data-review="${p.id}" ${Review.has(p.id) ? "checked" : ""} style="margin-top:3px;width:auto;accent-color:var(--pine)">
      <span style="font-size:var(--t-sm);${Review.has(p.id) ? "color:var(--ink-3);text-decoration:line-through" : ""}">${esc(p.name)}</span>
    </label>`).join("") +
    `<p class="card-sub" style="margin-top:10px" data-review-count></p>`;

  $$("[data-review]").forEach((cb) => cb.addEventListener("change", () => {
    Review.toggle(cb.dataset.review);
    renderChecklist();
  }));

  const left = Review.outstanding().length;
  $("[data-review-count]").textContent = left
    ? `${pluralise(left, "result", "results")} left to read`
    : "All read. Your summary is ready to build.";
}
renderChecklist();

/* ---------- side: trends ---------- */
$("[data-trends]").innerHTML = ["glucose", "hba1c", "vitd"].map((id) => {
  const p = byId(id);
  const series = TRENDS[id];
  const v = view(p);
  return `<div class="spark">
    <div class="spark-head">
      <span class="n">${esc(p.name)}</span>
      <span class="v num">${fmt(v.value, v.dp)} ${esc(v.unit)}</span>
    </div>
    ${sparkline(series, p, { width: 270, height: 46 })}
    <div class="spark-dates"><span>${TREND_DATES[0]}</span><span>${TREND_DATES[TREND_DATES.length - 1]}</span></div>
  </div>`;
}).join("");

/* ---------- Clinical Decision Support & AI Medical Intelligence ---------- */
const cdsContent = $("#cds-content");
let activeCdsTab = "assessment";

async function renderCds(tab) {
  if (!cdsContent) return;
  activeCdsTab = tab;
  $$("[data-cdstab]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.cdstab === tab)));

  cdsContent.innerHTML = `<div style="text-align:center;padding:24px;color:var(--ink-3)">Loading clinical analysis...</div>`;

  try {
    if (tab === "assessment") {
      const res = await API.getConditions();
      const diagRes = await API.getDiagnosis();
      const conditions = res.data.possible_conditions;
      const diag = diagRes.data;

      cdsContent.innerHTML = `
        <div style="background:#eef6f5;border-left:4px solid var(--pine);padding:10px 14px;border-radius:4px;margin-bottom:16px;font-size:12px;font-weight:700;color:var(--pine);letter-spacing:0.04em">
          SAFETY LABEL: ${esc(res.safety_label)}
        </div>
        
        <div style="margin-bottom:16px;background:var(--surface);padding:14px;border-radius:var(--r-md);border:1px solid var(--line)">
          <h4 style="margin-top:0">Assessment vs. Confirmed Diagnosis</h4>
          <p style="font-size:var(--t-sm);line-height:1.5">${esc(diag.ai_clinical_assessment)}</p>
          <div class="row" style="gap:10px;margin-top:10px;flex-wrap:wrap">
            <span class="chip chip--out" style="font-size:11px">Confirmed Diagnosis: NONE</span>
            <span class="chip chip--in" style="font-size:11px">Clinician Status: ${esc(diag.clinician_assessment)}</span>
          </div>
        </div>

        <h4 style="margin-bottom:10px">Recognized Clinical Patterns</h4>
        <div class="stack" style="gap:14px">
          ${conditions.map((c) => `
            <div style="background:var(--surface);padding:14px;border-radius:var(--r-md);border:1px solid var(--line)">
              <div class="row" style="align-items:center;margin-bottom:6px">
                <strong style="font-size:14px">${esc(c.name)}</strong>
                <span class="chip chip--out row-end" style="font-size:11px">Clinician Review Gated</span>
              </div>
              <div style="font-size:var(--t-sm);margin-top:8px">
                <div style="color:var(--ink-2);margin-bottom:4px"><strong>Supporting laboratory findings:</strong></div>
                <ul style="margin:4px 0 8px 18px;padding:0;color:var(--ink)">
                  ${c.supporting_findings.map((f) => `<li>${esc(f)}</li>`).join("")}
                </ul>
                <div style="color:var(--ink-2);margin-bottom:4px"><strong>Findings against:</strong></div>
                <ul style="margin:4px 0 8px 18px;padding:0;color:var(--ink)">
                  ${c.findings_against.map((f) => `<li>${esc(f)}</li>`).join("")}
                </ul>
                <div style="color:var(--ink-3);font-size:12px;margin-top:8px">
                  <em>Missing information:</em> ${esc(c.missing_information.join(", "))} | <em>Uncertainty:</em> ${esc(c.uncertainty)}
                </div>
              </div>
            </div>
          `).join("")}
        </div>`;
    } else if (tab === "prediction") {
      const res = await API.getPrediction();
      const pred = res.data;

      cdsContent.innerHTML = `
        <div style="background:#fff7ed;border-left:4px solid var(--clay);padding:10px 14px;border-radius:4px;margin-bottom:16px;font-size:12px;font-weight:700;color:var(--clay);letter-spacing:0.04em">
          SAFETY LABEL: ${esc(res.safety_label)}
        </div>
        <div style="background:var(--surface);padding:16px;border-radius:var(--r-md);border:1px solid var(--line)">
          <div class="row" style="justify-content:space-between;align-items:center;margin-bottom:8px">
            <h3 style="margin:0">${esc(pred.target_condition)}</h3>
            <span class="chip chip--out" style="font-size:12px">${esc(pred.risk_estimate)}</span>
          </div>
          <p style="font-size:var(--t-sm);color:var(--ink-2);margin-bottom:12px">
            Model version: <code>${esc(pred.model_version)}</code> | Observed period: <strong>${esc(pred.data_period)}</strong>
          </p>
          <div style="background:var(--surface-sunk);padding:12px;border-radius:6px;font-size:13px;margin-bottom:12px">
            <div><strong>Estimated Confidence Interval:</strong> ${esc(pred.confidence_interval)}</div>
            <div style="margin-top:6px"><strong>Key features driving projection:</strong></div>
            <ul style="margin:4px 0 0 18px;padding:0">
              ${pred.features_used.map((f) => `<li>${esc(f)}</li>`).join("")}
            </ul>
          </div>
          <div style="font-size:12px;color:var(--ink-3);line-height:1.5">
            <strong>Clinical Limitation:</strong> ${esc(pred.uncertainty)} ${esc(pred.limitations)}
          </div>
        </div>`;
    } else if (tab === "medications") {
      const res = await API.getMedOptions();
      const options = res.data.candidate_options_for_clinician;

      cdsContent.innerHTML = `
        <div style="background:#eff6ff;border-left:4px solid #1e40af;padding:10px 14px;border-radius:4px;margin-bottom:16px;font-size:12px;font-weight:700;color:#1e40af;letter-spacing:0.04em">
          SAFETY LABEL: ${esc(res.safety_label)}
        </div>
        <div style="background:var(--surface);padding:14px;border-radius:var(--r-md);margin-bottom:14px;border:1px solid var(--line);font-size:13px;color:var(--clay)">
          <strong>Patient Warning:</strong> ${esc(res.data.patient_advisory)}
        </div>
        <div class="stack" style="gap:12px">
          ${options.map((opt) => `
            <div style="background:var(--surface);padding:14px;border-radius:var(--r-md);border:1px solid var(--line)">
              <div class="row" style="justify-content:space-between;align-items:center;margin-bottom:6px">
                <strong style="font-size:14px">${esc(opt.class)}</strong>
                <span class="chip chip--in" style="font-size:11px">Requires Doctor Sign-off</span>
              </div>
              <p style="font-size:var(--t-sm);margin:6px 0">${esc(opt.clinical_rationale)}</p>
              <div style="font-size:12px;color:var(--ink-3);margin-top:6px">
                <strong>Prerequisite checks before therapy:</strong> ${esc(opt.required_checks.join(", "))}
              </div>
            </div>
          `).join("")}
        </div>`;
    } else if (tab === "prescription") {
      const res = await API.draftPrescription({
        medication_name: "Metformin hydrochloride",
        clinical_indication: "Elevated fasting blood glucose and HbA1c"
      });
      const d = res.data;

      cdsContent.innerHTML = `
        <div style="background:#fee2e2;border-left:4px solid #b91c1c;padding:10px 14px;border-radius:4px;margin-bottom:16px;font-size:12px;font-weight:700;color:#b91c1c;letter-spacing:0.04em">
          SAFETY LABEL: ${esc(res.safety_label)}
        </div>
        <div style="background:var(--surface);padding:16px;border-radius:var(--r-md);border:2px dashed #b91c1c;position:relative">
          <div style="position:absolute;top:14px;right:14px;background:#fee2e2;color:#b91c1c;padding:4px 8px;border-radius:4px;font-weight:700;font-size:11px">
            ${esc(d.legal_status)}
          </div>
          <h3 style="margin-top:0">${esc(d.candidate_medication)}</h3>
          <p style="font-size:var(--t-sm);margin-bottom:10px"><strong>Clinical Indication:</strong> ${esc(d.clinical_indication)}</p>
          <div style="background:var(--surface-sunk);padding:10px 12px;border-radius:6px;font-size:12.5px;margin-bottom:12px">
            <em>${esc(d.preliminary_sig)}</em>
          </div>
          <h4 style="margin:10px 0 6px 0;font-size:13px">Mandatory Contraindication & Safety Checklist:</h4>
          <ul style="margin:0 0 10px 18px;padding:0;font-size:12px;line-height:1.6">
            ${d.contraindication_checklist.map((item) => `<li>${esc(item)}</li>`).join("")}
          </ul>
          <p style="margin:0;font-size:11.5px;color:var(--ink-3)">
            Prescriptions can only be legally generated and authorized by a licensed healthcare professional with active credentials.
          </p>
        </div>`;
    }
  } catch (err) {
    cdsContent.innerHTML = `<div style="color:var(--clay);padding:14px">Clinical intelligence could not be loaded. Please ensure server is running.</div>`;
  }
}

$$("[data-cdstab]").forEach((btn) => {
  btn.addEventListener("click", () => renderCds(btn.dataset.cdstab));
});

renderCds("assessment");

