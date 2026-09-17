/* ==========================================================================
   Readout — shared shell, preferences and small UI utilities
   ========================================================================== */

/* ---------- tiny DOM helpers ---------- */
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const el = (html) => {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
};
const esc = (s) => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* ---------- Full-Stack API Client ---------- */
const API = {
  baseUrl: "/api",
  getToken() {
    return Store.get("auth_token", null);
  },
  setToken(t) {
    if (t) Store.set("auth_token", t);
    else Store.remove("auth_token");
  },
  getUser() {
    return Store.get("auth_user", { id: "usr-demo-001", email: "demo@readout.health", fullName: "Demo Patient" });
  },
  setUser(u) {
    Store.set("auth_user", u);
  },
  async request(endpoint, options = {}) {
    const url = `${API.baseUrl}${endpoint}`;
    const headers = {
      ...(options.headers || {})
    };
    const token = API.getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    try {
      const res = await fetch(url, { ...options, headers });
      const data = await res.json().catch(() => ({ status: 'error', message: 'Failed to parse JSON response' }));
      if (!res.ok) {
        throw new Error(data.message || data.detail || `Server responded with ${res.status}`);
      }
      return data;
    } catch (err) {
      console.warn(`API error at ${endpoint}:`, err);
      throw err;
    }
  },
  // Auth
  login: (email, password) => API.request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (email, password, fullName) => API.request('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, fullName }) }),
  getMe: () => API.request('/auth/me'),
  logout: () => API.request('/auth/logout', { method: 'POST' }),
  
  // Reports
  uploadReport: (formData) => API.request('/reports/upload', { method: 'POST', body: formData }),
  getReports: () => API.request('/reports'),
  getReport: (id) => API.request(`/reports/${id}`),
  getReportStatus: (id) => API.request(`/reports/${id}/status`),
  getReportResults: (id) => API.request(`/reports/${id}/results`),
  getReportQuality: (id) => API.request(`/reports/${id}/quality`),
  verifyResult: (id, payload) => API.request(`/results/${id}/verify`, { method: 'PUT', body: JSON.stringify(payload) }),
  
  // Longitudinal
  getHistory: () => API.request('/history'),
  getTimeline: () => API.request('/timeline'),
  getTrends: () => API.request('/trends'),
  compareReports: (reportIdA, reportIdB) => API.request('/comparison', { method: 'POST', body: JSON.stringify({ reportIdA, reportIdB }) }),
  
  // Clinical Decision Support
  getPatterns: () => API.request('/analysis/patterns', { method: 'POST', body: JSON.stringify({}) }),
  getConditions: () => API.request('/analysis/conditions', { method: 'POST', body: JSON.stringify({}) }),
  getDiagnosis: () => API.request('/diagnosis/analyze', { method: 'POST', body: JSON.stringify({}) }),
  getPrediction: () => API.request('/prediction/analyze', { method: 'POST', body: JSON.stringify({}) }),
  getMedication: (name) => API.request(`/medications/${encodeURIComponent(name)}`),
  getMedOptions: () => API.request('/medications/recommend', { method: 'POST', body: JSON.stringify({}) }),
  getDoseInfo: (payload) => API.request('/medications/dose-info', { method: 'POST', body: JSON.stringify(payload) }),
  draftPrescription: (payload) => API.request('/prescriptions/draft', { method: 'POST', body: JSON.stringify(payload) }),
  
  // Grounded Chat
  askChat: (message) => API.request('/chat', { method: 'POST', body: JSON.stringify({ message }) }),
  
  // Summary & Export
  getSummary: (id) => API.request(`/reports/${id}/summary`),
  getSettings: () => API.request('/settings'),
  updateSettings: (payload) => API.request('/settings', { method: 'PUT', body: JSON.stringify(payload) }),
  getAuditLogs: () => API.request('/audit')
};

/* ---------- preferences (kept on this device only) ---------- */
const Store = {
  key: (k) => `readout.${k}`,
  get(k, fallback) {
    try {
      const raw = localStorage.getItem(Store.key(k));
      return raw === null ? fallback : JSON.parse(raw);
    } catch { return fallback; }
  },
  set(k, v) {
    try { localStorage.setItem(Store.key(k), JSON.stringify(v)); } catch { /* storage blocked */ }
  },
  remove(k) {
    try { localStorage.removeItem(Store.key(k)); } catch { /* storage blocked */ }
  },
  clearAll() {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("readout."))
        .forEach((k) => localStorage.removeItem(k));
    } catch { /* storage blocked */ }
  }
};

const Prefs = {
  theme:  () => Store.get("theme", "auto"),
  units:  () => Store.get("units", "conventional"),
  text:   () => Store.get("text", "normal"),
  keepHistory: () => Store.get("keepHistory", true)
};

function applyTheme(mode) {
  const resolved = mode === "auto"
    ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : mode;
  document.documentElement.setAttribute("data-theme", resolved);
  document.documentElement.setAttribute("data-theme-pref", mode);
}

function applyTextSize(size) {
  document.documentElement.setAttribute("data-text", size);
}

applyTheme(Prefs.theme());
applyTextSize(Prefs.text());
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  if (Prefs.theme() === "auto") applyTheme("auto");
});

/* ---------- icons ---------- */
const ICON = {
  upload: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 9l5-5 5 5"/><path d="M12 4v12"/></svg>',
  results: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h4l2-6 3 12 2.5-8 1.8 4H21"/></svg>',
  summary: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/></svg>',
  history: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 4v4h4"/><path d="M12 7v5l3 2"/></svg>',
  settings: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3 15a1.6 1.6 0 0 0-1.5-1H1a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 2.6 8a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 7 3.7 1.6 1.6 0 0 0 8 2.2V2a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8v.1a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" transform="translate(1.5 1.5) scale(0.87)"/></svg>',
  help: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.2 9.3a3 3 0 0 1 5.8 1c0 2-3 2.6-3 2.6"/><path d="M12 17h.01"/></svg>',
  sun: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></svg>',
  moon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/></svg>',
  search: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  chevron: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
  arrow: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h13M13 6l6 6-6 6"/></svg>',
  info: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
  check: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5l5 5L20 6.5"/></svg>',
  dash: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 12h12"/></svg>',
  lock: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10.5" width="16" height="10" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/></svg>',
  file: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>',
  cloud: '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 18.5H7a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 9.5a4.5 4.5 0 0 1-.5 9z"/><path d="M12 15.5v-5M9.8 12.4L12 10.2l2.2 2.2"/></svg>',
  print: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="7" rx="2"/><path d="M6 14h12v7H6z"/></svg>',
  download: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>',
  copy: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/></svg>',
  mail: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
  mark: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h3.2l2.4-7 3.6 14 3-9.5 2 2.5H22" stroke="currentColor"/></svg>',
  chat: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  docs: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
  user: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
};

/* ---------- status + ranges ---------- */
function statusOf(p) {
  if (p.low == null && p.high == null) return "unknown";
  if (p.high != null && p.value > p.high) return "out";
  if (p.low != null && p.value < p.low) return "out";
  return "in";
}

const STATUS_WORD = { in: "In range", out: "Outside range", unknown: "No range printed" };

/* Unit conversion. Conventional units are what the report printed;
   SI is offered because many reports and clinicians outside the US use it. */
const SI = {
  glucose: { f: 0.05551, unit: "mmol/L", dp: 1 },
  chol:    { f: 0.02586, unit: "mmol/L", dp: 2 },
  ldl:     { f: 0.02586, unit: "mmol/L", dp: 2 },
  hdl:     { f: 0.02586, unit: "mmol/L", dp: 2 },
  tg:      { f: 0.01129, unit: "mmol/L", dp: 2 },
  creat:   { f: 88.4,    unit: "µmol/L", dp: 0 },
  urea:    { f: 0.1665,  unit: "mmol/L", dp: 1 },
  bili:    { f: 17.1,    unit: "µmol/L", dp: 0 },
  vitd:    { f: 2.496,   unit: "nmol/L", dp: 0 }
};

function view(p) {
  const conv = Prefs.units() === "si" ? SI[p.id] : null;
  if (!conv) return { value: p.value, low: p.low, high: p.high, unit: p.unit, dp: decimals(p.value) };
  const c = (n) => (n == null ? null : +(n * conv.f).toFixed(conv.dp));
  return { value: c(p.value), low: c(p.low), high: c(p.high), unit: conv.unit, dp: conv.dp };
}

function decimals(n) {
  const s = String(n);
  return s.includes(".") ? s.split(".")[1].length : 0;
}

function fmt(n, dp) {
  if (n == null) return "—";
  return dp === undefined ? String(n) : n.toFixed(dp);
}

function rangeText(p) {
  const v = view(p);
  if (v.low != null && v.high != null) return `${fmt(v.low, v.dp)} – ${fmt(v.high, v.dp)} ${v.unit}`;
  if (v.high != null) return `up to ${fmt(v.high, v.dp)} ${v.unit}`;
  if (v.low != null) return `${fmt(v.low, v.dp)} ${v.unit} or above`;
  return "not printed on report";
}

function valueText(p) {
  const v = view(p);
  return `${fmt(v.value, v.dp)} ${v.unit}`;
}

/* ---------- the range gauge ---------- */
function gauge(p, { width = 200, height = 26 } = {}) {
  const v = view(p);
  const st = statusOf(p);
  let dmin, dmax, bandFrom, bandTo;

  if (v.low != null && v.high != null) {
    const span = v.high - v.low || Math.abs(v.high) || 1;
    dmin = v.low - span * 0.7; dmax = v.high + span * 0.7;
    bandFrom = v.low; bandTo = v.high;
  } else if (v.high != null) {
    dmin = 0; dmax = v.high * 1.9;
    bandFrom = 0; bandTo = v.high;
  } else if (v.low != null) {
    dmin = 0; dmax = v.low * 2.3;
    bandFrom = v.low; bandTo = dmax;
  } else {
    dmin = 0; dmax = Math.max(v.value * 2, 1);
    bandFrom = null; bandTo = null;
  }

  // keep the pin visible even for far-out values
  if (v.value < dmin) dmin = v.value - (dmax - v.value) * 0.08;
  if (v.value > dmax) dmax = v.value + (v.value - dmin) * 0.08;

  const x = (n) => ((n - dmin) / (dmax - dmin)) * width;
  const px = Math.max(3, Math.min(width - 3, x(v.value)));
  const trackY = 10, trackH = 6;

  const band = bandFrom == null ? "" :
    `<rect class="gauge-band${st === "unknown" ? " gauge-band--unknown" : ""}" x="${x(bandFrom).toFixed(1)}" y="${trackY}" width="${Math.max(2, x(bandTo) - x(bandFrom)).toFixed(1)}" height="${trackH}" rx="3"/>`;

  const edges = [bandFrom, bandTo]
    .filter((n) => n != null && n > dmin && n < dmax)
    .map((n) => `<line class="gauge-tick" x1="${x(n).toFixed(1)}" y1="${trackY - 3}" x2="${x(n).toFixed(1)}" y2="${trackY + trackH + 3}"/>`)
    .join("");

  return `<svg class="gauge" viewBox="0 0 ${width} ${height}" role="img"
    aria-label="${esc(valueText(p))}, reference ${esc(rangeText(p))}, ${STATUS_WORD[st].toLowerCase()}">
    <rect class="gauge-track" x="0" y="${trackY}" width="${width}" height="${trackH}" rx="3"/>
    ${band}${edges}
    <line class="gauge-pin gauge-pin--${st}" x1="${px.toFixed(1)}" y1="${trackY - 5}" x2="${px.toFixed(1)}" y2="${trackY + trackH + 5}"/>
  </svg>`;
}

/* ---------- shell ---------- */
const NAV = [
  { id: "upload",   href: "upload.html",    label: "Upload",  icon: "upload" },
  { id: "results",  href: "dashboard.html", label: "Results", icon: "results" },
  { id: "summary",  href: "summary.html",   label: "Summary", icon: "summary" },
  { id: "history",  href: "history.html",   label: "History", icon: "history" },
  { id: "docs",     href: "/docs",          label: "API Docs",icon: "docs" },
  { id: "settings", href: "settings.html",  label: "Settings",icon: "settings" },
  { id: "help",     href: "help.html",      label: "Help",    icon: "help" }
];

function wordmark(sub = "lab reports, in plain language") {
  return `<a class="wordmark" href="index.html">
    <span class="mark" style="color:var(--pine)">${ICON.mark}</span>
    <span><b>Readout</b><span>${esc(sub)}</span></span>
  </a>`;
}

function buildRail(current) {
  const flags = typeof PARAMETERS !== "undefined"
    ? PARAMETERS.filter((p) => statusOf(p) === "out").length : 0;

  const links = NAV.map((n) => `
    <a href="${n.href}" ${n.id === current ? 'aria-current="page"' : ""} ${n.id === "docs" ? 'target="_blank" rel="noopener"' : ""}>
      ${ICON[n.icon]}<span>${n.label}</span>
      ${n.id === "results" && flags ? `<span class="tally">${flags}</span>` : ""}
    </a>`).join("");

  const user = API.getUser();

  return `<aside class="rail">
    ${wordmark()}
    <nav class="rail-nav" aria-label="Sections">
      ${links}
      <button class="rail-chat-btn" type="button" data-open-chat style="display:flex;align-items:center;gap:10px;padding:10px 14px;margin-top:14px;background:var(--surface-sunken, #eef4f2);color:var(--pine);border:1px solid rgba(25,74,67,0.15);border-radius:var(--r-md, 8px);font-size:var(--t-sm, 13px);font-weight:600;cursor:pointer;width:100%;text-align:left">
        ${ICON.chat}<span>Ask My Reports</span>
      </button>
    </nav>
    <div class="rail-foot">
      <div class="user-badge" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;padding:8px 10px;background:rgba(0,0,0,0.03);border-radius:6px;font-size:12px">
        <span style="display:flex;align-items:center;gap:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
          ${ICON.user}<strong style="overflow:hidden;text-overflow:ellipsis">${esc(user.fullName || user.email)}</strong>
        </span>
        <button type="button" data-user-menu style="border:0;background:none;color:var(--pine);font-size:11px;cursor:pointer;text-decoration:underline">Account</button>
      </div>
      <p class="rail-note"><strong>Readout explains, it does not diagnose.</strong> Take anything flagged here to a doctor or pharmacist.</p>
      <button class="theme-toggle" type="button" data-theme-toggle>
        <span data-theme-icon>${ICON.moon}</span><span>Switch theme</span>
      </button>
    </div>
  </aside>`;
}

/* ---------- grounded ask-my-reports modal ---------- */
function openChatModal() {
  const modalNode = el(`<div>
    <div class="row" style="align-items:center;margin-bottom:8px">
      <h2 style="margin:0">Ask My Reports</h2>
      <span class="chip chip--in row-end" style="font-size:11px">Grounded in lab data</span>
    </div>
    <p class="card-sub" style="margin-bottom:16px">Ask any question about your numbers, trends, or printed ranges. Answers are strictly grounded in your reports with zero medical diagnosis claims.</p>
    
    <div id="chat-messages" style="height:260px;overflow-y:auto;background:var(--surface-sunk, #f4f3ef);padding:14px;border-radius:var(--r-md, 8px);display:flex;flex-direction:column;gap:12px;margin-bottom:14px;border:1px solid var(--line, #e2ded4)">
      <div style="background:var(--surface, #fff);padding:10px 14px;border-radius:8px;font-size:13px;align-self:flex-start;max-width:85%;line-height:1.5">
        Hello! I can answer questions about your laboratory values, how they compare to printed ranges, and how tests move together across your reports. What would you like to check?
      </div>
    </div>

    <div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap">
      <button class="btn btn-secondary btn-sm" type="button" data-prompt="What was my fasting glucose reading?">Glucose reading?</button>
      <button class="btn btn-secondary btn-sm" type="button" data-prompt="Which results sit outside printed ranges?">Flagged results?</button>
      <button class="btn btn-secondary btn-sm" type="button" data-prompt="What is my vitamin D status?">Vitamin D?</button>
    </div>

    <form id="chat-form" style="display:flex;gap:8px">
      <input type="text" id="chat-input" placeholder="Type a question about your report..." required style="flex:1;padding:10px 14px;border-radius:var(--r-md, 6px);border:1px solid var(--line, #ccc);font-size:14px">
      <button class="btn btn-primary" type="submit" id="chat-submit" style="padding:10px 18px">Ask</button>
    </form>
    <div class="row" style="margin-top:14px">
      <button class="btn btn-secondary btn-sm row-end" type="button" data-close>Close</button>
    </div>
  </div>`);

  const messages = modalNode.querySelector("#chat-messages");
  const input = modalNode.querySelector("#chat-input");
  const form = modalNode.querySelector("#chat-form");
  const submitBtn = modalNode.querySelector("#chat-submit");

  async function sendMsg(text) {
    if (!text.trim()) return;
    const userBubble = el(`<div style="background:var(--pine, #194a43);color:#fff;padding:10px 14px;border-radius:8px;font-size:13px;align-self:flex-end;max-width:85%;line-height:1.5">${esc(text)}</div>`);
    messages.appendChild(userBubble);
    messages.scrollTop = messages.scrollHeight;
    input.value = "";
    submitBtn.disabled = true;

    const thinkingBubble = el(`<div style="background:var(--surface, #fff);padding:8px 12px;border-radius:8px;font-size:12px;color:var(--ink-3, #777);align-self:flex-start">Checking laboratory facts...</div>`);
    messages.appendChild(thinkingBubble);
    messages.scrollTop = messages.scrollHeight;

    try {
      const res = await API.askChat(text);
      thinkingBubble.remove();
      const ans = res.data.answer;
      const evidence = res.data.evidence_classification;
      const respBubble = el(`<div style="background:var(--surface, #fff);padding:10px 14px;border-radius:8px;font-size:13px;align-self:flex-start;max-width:85%;line-height:1.5">
        <div>${esc(ans)}</div>
        <div style="margin-top:6px;font-size:11px;color:var(--ink-3);display:flex;align-items:center;gap:6px">
          <span class="chip" style="font-size:10px;padding:2px 6px">${evidence === 'REPORT_FACT' ? 'Report Verified Fact' : 'Medical Reference Inference'}</span>
          <span>Hallucination Guard: Active</span>
        </div>
      </div>`);
      messages.appendChild(respBubble);
    } catch (e) {
      thinkingBubble.remove();
      messages.appendChild(el(`<div style="color:var(--clay);font-size:12px">Could not retrieve answer. Please verify server connection.</div>`));
    } finally {
      submitBtn.disabled = false;
      messages.scrollTop = messages.scrollHeight;
      input.focus();
    }
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    sendMsg(input.value);
  });

  modalNode.querySelectorAll("[data-prompt]").forEach((btn) => {
    btn.addEventListener("click", () => sendMsg(btn.dataset.prompt));
  });

  openModal(modalNode);
}

/* ---------- user auth modal ---------- */
function openAuthModal() {
  const user = API.getUser();
  const modal = el(`<div>
    <h2>Readout Account & Session</h2>
    <p class="card-sub" style="margin-bottom:16px">Manage patient profile and authenticated access.</p>
    <div style="background:var(--surface-sunk);padding:14px;border-radius:8px;margin-bottom:16px;font-size:13px">
      <div><strong>Current User:</strong> ${esc(user.fullName || "Demo Patient")}</div>
      <div style="color:var(--ink-3);margin-top:4px"><strong>Email:</strong> ${esc(user.email || "demo@readout.health")}</div>
      <div style="color:var(--ink-3);margin-top:4px"><strong>Status:</strong> Active (Local / Bearer Authenticated)</div>
    </div>
    <div class="row" style="gap:10px;justify-content:flex-end">
      <button class="btn btn-secondary btn-sm" type="button" data-close>Close</button>
      <button class="btn btn-primary btn-sm" type="button" id="switch-user-btn">Log In / Switch Account</button>
    </div>
  </div>`);

  modal.querySelector("#switch-user-btn").addEventListener("click", () => {
    const email = prompt("Enter patient email address:", "demo@readout.health");
    if (email) {
      API.setUser({ id: `usr-${Date.now()}`, email, fullName: email.split("@")[0] });
      toast("Account updated");
      location.reload();
    }
  });

  openModal(modal);
}

function mountShell(current) {
  const slot = $("[data-rail]");
  if (slot) slot.replaceWith(el(buildRail(current)));
  syncThemeIcon();
  
  document.addEventListener("click", (e) => {
    const chatBtn = e.target.closest("[data-open-chat]");
    if (chatBtn) {
      openChatModal();
      return;
    }
    const userBtn = e.target.closest("[data-user-menu]");
    if (userBtn) {
      openAuthModal();
      return;
    }
    const t = e.target.closest("[data-theme-toggle]");
    if (!t) return;
    const order = ["light", "dark", "auto"];
    const next = order[(order.indexOf(Prefs.theme()) + 1) % order.length];
    Store.set("theme", next);
    applyTheme(next);
    syncThemeIcon();
    toast(`Theme: ${next}`);
  });
}

function syncThemeIcon() {
  const dark = document.documentElement.getAttribute("data-theme") === "dark";
  $$("[data-theme-icon]").forEach((n) => { n.innerHTML = dark ? ICON.sun : ICON.moon; });
}

/* ---------- toast ---------- */
function toast(message) {
  let stack = $("#toast-stack");
  if (!stack) {
    stack = el('<div id="toast-stack" role="status" aria-live="polite"></div>');
    document.body.appendChild(stack);
  }
  const t = el(`<div class="toast">${esc(message)}</div>`);
  stack.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

/* ---------- modal ---------- */
function openModal(node) {
  const backdrop = el('<div class="modal-backdrop"></div>');
  const box = el('<div class="modal" role="dialog" aria-modal="true"></div>');
  box.appendChild(node);
  backdrop.appendChild(box);
  document.body.appendChild(backdrop);
  const close = () => { backdrop.remove(); document.removeEventListener("keydown", onKey); };
  const onKey = (e) => { if (e.key === "Escape") close(); };
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(); });
  document.addEventListener("keydown", onKey);
  $$("[data-close]", backdrop).forEach((b) => b.addEventListener("click", close));
  const focusable = $("button, a, input, textarea", box);
  if (focusable) focusable.focus();
  return close;
}

/* ---------- clipboard + download ---------- */
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast("Copied to clipboard");
  } catch {
    const ta = el(`<textarea style="position:fixed;opacity:0"></textarea>`);
    ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); toast("Copied to clipboard"); }
    catch { toast("Couldn't copy — select the text and copy manually"); }
    ta.remove();
  }
}

function downloadText(filename, text, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
  const a = el(`<a href="${url}" download="${esc(filename)}"></a>`);
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  toast(`Saved ${filename}`);
}

/* ---------- review tracking (drives the summary hand-off) ---------- */
const Review = {
  all: () => Store.get("reviewed", []),
  has: (id) => Review.all().includes(id),
  toggle(id) {
    const set = new Set(Review.all());
    set.has(id) ? set.delete(id) : set.add(id);
    Store.set("reviewed", Array.from(set));
    return set.has(id);
  },
  outstanding() {
    const flagged = PARAMETERS.filter((p) => statusOf(p) === "out").map((p) => p.id);
    return flagged.filter((id) => !Review.has(id));
  }
};

/* ---------- plot domain ----------
   Values dominate the scale. A printed bound is folded in only when it sits
   near the data; a far-away bound (vitamin D's upper limit of 100 against
   readings in the teens) would otherwise flatten the line into the floor. */
function plotDomain(values, low, high) {
  let lo = Math.min(...values), hi = Math.max(...values);
  const span = (hi - lo) || Math.abs(hi) || 1;
  [low, high].forEach((n) => {
    if (n == null) return;
    if (n > lo - span * 1.2 && n < hi + span * 1.2) { lo = Math.min(lo, n); hi = Math.max(hi, n); }
  });
  const pad = (hi - lo) * 0.22 || 1;
  return { min: lo - pad, max: hi + pad };
}

/* ---------- sparkline ---------- */
function sparkline(series, p, { width = 260, height = 46 } = {}) {
  const d0 = plotDomain(series, p.low, p.high);
  const lo = d0.min, hi = d0.max;
  const x = (i) => (i / (series.length - 1)) * (width - 8) + 4;
  const y = (v) => height - 6 - ((v - lo) / (hi - lo)) * (height - 14);
  const clamp = (n) => Math.max(0, Math.min(height, n));

  let band = "";
  if (p.low != null && p.high != null) {
    const top = clamp(y(p.high)), bot = clamp(y(p.low));
    band = `<rect class="trend-band" x="0" y="${top.toFixed(1)}" width="${width}" height="${Math.max(2, bot - top).toFixed(1)}"/>`;
  } else if (p.high != null) {
    const top = clamp(y(p.high));
    band = `<rect class="trend-band" x="0" y="${top.toFixed(1)}" width="${width}" height="${Math.max(2, height - top).toFixed(1)}"/>`;
  } else if (p.low != null) {
    const bot = clamp(y(p.low));
    band = `<rect class="trend-band" x="0" y="0" width="${width}" height="${Math.max(2, bot).toFixed(1)}"/>`;
  }

  const d = series.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const dots = series.map((v, i) => {
    const out = (p.high != null && v > p.high) || (p.low != null && v < p.low);
    return `<circle class="trend-point${out ? " trend-point--out" : ""}" cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="3"/>`;
  }).join("");

  return `<svg class="trend-chart" viewBox="0 0 ${width} ${height}" role="img"
    aria-label="${esc(p.name)} over ${series.length} reports, from ${series[0]} to ${series[series.length - 1]} ${esc(p.unit)}">
    ${band}<path class="trend-line" d="${d}"/>${dots}</svg>`;
}

/* ---------- misc ---------- */
function prettyDate(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

function pluralise(n, one, many) { return `${n} ${n === 1 ? one : many}`; }
