# Readout — Medical Report Explanation and Risk Flagging System

A complete, working front-end for the project: a patient uploads a lab report, sees every
test explained in plain language, sees which values fall outside the ranges **their own
laboratory printed**, and builds a one-page summary to take to an appointment.

No build step, no dependencies, no server. Open `index.html` in a browser.

---

## Run it

```
unzip readout.zip
cd readout
open index.html          # macOS
start index.html         # Windows
xdg-open index.html      # Linux
```

Or serve it, which is closer to production and avoids any `file://` quirks:

```
python3 -m http.server 8000
# then visit http://localhost:8000
```

Fonts load from Google Fonts. Offline, the page falls back to a matched system stack and
still looks correct.

---

## Pages

| File | What it is |
|---|---|
| `index.html` | Landing page. Hero demo showing a raw report line resolving into plain language, how it works, an explicit does / never-does ledger, FAQ. |
| `upload.html` | Drag-and-drop or file picker, format validation, capture tips, and a staged processing trace (OCR → extraction → range matching → explanation). |
| `dashboard.html` | The main results view. Flag summary, every test with an expandable explanation, search and filters, grouped-results section, extraction check, review checklist, trend sparklines. |
| `summary.html` | Doctor-ready summary builder. Patient-supplied context, editable questions, live preview, print / copy / download / email. |
| `history.html` | Timeline of past reports plus a trend explorer for any tracked test. |
| `settings.html` | Units (conventional ↔ SI), text size, appearance, explanation language, storage controls, data export and erase. |
| `help.html` | What to do if a result is worrying, why a reference range is not a pass mark, FAQ, glossary, medical disclaimer. |

## Source layout

```
assets/css/app.css      design tokens, shell, buttons, cards, gauge, forms, modal
assets/css/pages.css    per-page layout: landing, upload, dashboard, summary, history
assets/js/data.js       the demo dataset — swap this for your pipeline's output
assets/js/app.js        shell, preferences, unit conversion, gauge + sparkline renderers
assets/js/dashboard.js  results page
assets/js/summary.js    summary builder
```

---

## Wiring it to a real pipeline

Everything the UI renders comes from `assets/js/data.js`. Replace those four exports with
your backend's output and nothing else has to change.

```js
REPORT     // { title, lab, collected, pages, extracted, confidence, fasting }
PARAMETERS // [{ id, name, abbr, group, value, unit, low, high, what, reading, influences, ask, terms }]
PATTERNS   // [{ id, title, body, involves: [paramId], prompt }]
TRENDS     // { paramId: [oldest … newest] }  + TREND_DATES
```

Two rules the UI depends on:

- `low` / `high` are the bounds **printed on the report**, not from a generic table. Use
  `null` for a one-sided limit (`high: 200` for "< 200", `low: 40` for "> 40") and `null`
  for both when the report printed no range — that renders as a grey "no range printed"
  marker and no comparison is made.
- `value`, `low` and `high` are all in the unit named in `unit`. Conversion to SI happens
  in the UI (`SI` map in `app.js`).

Status is derived, never stored: `statusOf()` in `app.js` is the only place a value is
compared to a range.

Suggested stack for the missing half: Tesseract.js or a document-AI endpoint for OCR, a
layout-aware extraction step to split each row into name / value / unit / range, and a
constrained generation step for `what`, `influences` and `terms`. Keep `reading` templated
rather than generated — it is the one sentence that must never drift into interpretation.

---

## Design decisions worth keeping

**Red is never used for a measurement.** Out-of-range values are ochre. Red reads as
emergency, and the system is not in a position to declare one.

**Numbers are always monospaced and tabular.** Lab values line up vertically wherever they
appear, which is both how a real report reads and how you spot a misread digit.

**The range gauge is the signature component.** It shows *where* a value sits relative to
its printed range and *how far* outside — information a coloured dot cannot carry. It
never fills a bar, because a full bar implies a scale of severity that does not exist.

**The extraction is auditable.** "Check what was read" shows the raw extracted rows so a
patient can compare against the paper. Anything built on a misread number is wrong, and
hiding the extraction hides the failure mode.

**Export is gated on reading.** The summary builder stays locked until each flagged result
has been ticked off, with an obvious escape. A summary you have not read is not much use
in the room.

**Every explanation is general, never personal.** Each parameter carries `what` (what the
test measures), `reading` (which side of the printed range this value fell on) and
`influences` (what commonly moves the number). None of them says what your result means —
that distinction is the whole product.

---

## Accessibility and quality floor

- WCAG AA contrast in both light and dark themes; user-selectable text size on top of browser zoom.
- Full keyboard operation, visible focus rings, skip link, `aria-expanded` on every disclosure.
- Every gauge and chart carries an `aria-label` with the value, range and status in words.
- `prefers-reduced-motion` respected — the hero typing and the processing spinner both stand down.
- Responsive to 360px: the left rail becomes a bottom tab bar, parameter rows collapse to three columns.
- Print stylesheet on the summary page produces a clean single page with no app chrome.

## Storage

Preferences, the summary draft, your questions and review ticks are kept in `localStorage`
under `readout.*`. Settings → *Erase everything* removes all of it. There is no network
call anywhere in this codebase.

---

## Not a medical device

Readout flags values against ranges printed on the report and explains terminology. It
performs no diagnosis, no triage and no urgency assessment, and it is not a substitute for
a qualified healthcare professional. The disclaimer on `help.html#disclaimer` is part of
the deliverable, not boilerplate to remove.
