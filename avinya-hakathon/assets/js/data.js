/* ==========================================================================
   Readout — demo dataset
   --------------------------------------------------------------------------
   Stands in for the output of the OCR + extraction pipeline. Every value,
   unit and reference range here is presented exactly as it would have been
   printed on the source report. Explanations are general and educational;
   nothing in this file interprets a result for an individual.
   ========================================================================== */

const REPORT = {
  id: "rpt-2026-03-04",
  title: "Comprehensive health panel",
  lab: "Meridian Diagnostics, Banjara Hills",
  collected: "4 March 2026, 7:40 am",
  reported: "5 March 2026",
  fasting: true,
  pages: 3,
  extracted: 18,
  confidence: 0.96,
  patient: { name: "", age: "41", sex: "Female" }
};

/* status is derived from the ranges printed on the report itself:
   "in"      value sits inside the printed range
   "out"     value sits outside the printed range
   "unknown" the report printed no range for this test            */
const PARAMETERS = [
  {
    id: "hb",
    name: "Haemoglobin",
    abbr: "Hb",
    group: "Blood count",
    value: 13.4, unit: "g/dL", low: 12.0, high: 15.5,
    what: "Haemoglobin is the protein inside red blood cells that carries oxygen from your lungs to the rest of your body.",
    reading: "This value sits inside the range printed on your report.",
    influences: "Haemoglobin moves with iron levels, recent blood loss, pregnancy, hydration and altitude.",
    ask: "",
    terms: "Reported as <code>HGB</code> or <code>Hb</code>. Measured in grams per decilitre (g/dL)."
  },
  {
    id: "hct",
    name: "Haematocrit",
    abbr: "HCT",
    group: "Blood count",
    value: 40.2, unit: "%", low: 36, high: 46,
    what: "Haematocrit is the share of your blood made up of red blood cells, given as a percentage.",
    reading: "This value sits inside the range printed on your report.",
    influences: "It tracks closely with haemoglobin and rises temporarily when you are dehydrated.",
    ask: "",
    terms: "Reported as <code>HCT</code> or <code>PCV</code> (packed cell volume). The two names mean the same measurement."
  },
  {
    id: "wbc",
    name: "White blood cell count",
    abbr: "WBC",
    group: "Blood count",
    value: 11.8, unit: "×10³/µL", low: 4.0, high: 11.0,
    what: "White blood cells are the cells your immune system uses to respond to infection and injury.",
    reading: "This value is above the upper end of the range printed on your report.",
    influences: "White cell counts commonly rise during and shortly after an infection, with physical stress, after strenuous exercise, in smokers, and with some medicines such as steroids.",
    ask: "Were you unwell, or recovering from anything, around the day of this test?",
    terms: "Reported as <code>WBC</code>, <code>TLC</code> or total leucocyte count. <code>×10³/µL</code> means thousands of cells per microlitre."
  },
  {
    id: "plt",
    name: "Platelet count",
    abbr: "PLT",
    group: "Blood count",
    value: 268, unit: "×10³/µL", low: 150, high: 410,
    what: "Platelets are small cell fragments that help your blood clot when you are cut or bruised.",
    reading: "This value sits inside the range printed on your report.",
    influences: "Counts shift with infection, inflammation, iron levels and some medicines.",
    ask: "",
    terms: "Reported as <code>PLT</code> or platelet count."
  },
  {
    id: "glucose",
    name: "Fasting blood glucose",
    abbr: "FBS",
    group: "Blood sugar",
    value: 112, unit: "mg/dL", low: 70, high: 99,
    what: "This measures the amount of sugar in your blood after a period without food, usually eight to twelve hours.",
    reading: "This value is above the upper end of the range printed on your report.",
    influences: "Fasting glucose is affected by how long you actually fasted, illness, poor sleep, stress, physical activity and several medicines including steroids.",
    ask: "How many hours had I fasted, and does that change how you read this number?",
    terms: "Reported as <code>FBS</code>, <code>FPG</code> or fasting plasma glucose. <code>mg/dL</code> is milligrams per decilitre; some labs use <code>mmol/L</code> instead."
  },
  {
    id: "hba1c",
    name: "Glycated haemoglobin",
    abbr: "HbA1c",
    group: "Blood sugar",
    value: 6.1, unit: "%", low: 4.0, high: 5.6,
    what: "HbA1c reflects your average blood sugar over roughly the previous two to three months, rather than on the morning of the test.",
    reading: "This value is above the upper end of the range printed on your report.",
    influences: "Because it depends on red blood cells, HbA1c can read differently in people with anaemia, recent blood loss, or certain haemoglobin variants.",
    ask: "Does my haemoglobin level affect how I should read this HbA1c?",
    terms: "Reported as <code>HbA1c</code> or <code>A1C</code>. Some reports also give an eAG (estimated average glucose) in mg/dL."
  },
  {
    id: "chol",
    name: "Total cholesterol",
    abbr: "CHOL",
    group: "Lipids",
    value: 214, unit: "mg/dL", low: null, high: 200,
    what: "Total cholesterol adds together the different cholesterol-carrying particles in your blood.",
    reading: "This value is above the upper limit printed on your report.",
    influences: "Diet, physical activity, weight, thyroid function, family history and some medicines all move cholesterol numbers.",
    ask: "Which of these lipid numbers matters most in my case?",
    terms: "Reported as <code>TC</code> or total cholesterol. The report prints a desirable limit rather than a two-sided range."
  },
  {
    id: "ldl",
    name: "LDL cholesterol",
    abbr: "LDL-C",
    group: "Lipids",
    value: 141, unit: "mg/dL", low: null, high: 100,
    what: "LDL carries cholesterol from the liver out to the body. Guidelines set a target rather than a normal range, and the target depends on your other risk factors.",
    reading: "This value is above the limit printed on your report.",
    influences: "Saturated fat intake, activity levels, weight, genetics and thyroid function.",
    ask: "What LDL target is right for someone with my history?",
    terms: "Reported as <code>LDL</code> or <code>LDL-C</code>. Often calculated from the other lipid values rather than measured directly."
  },
  {
    id: "hdl",
    name: "HDL cholesterol",
    abbr: "HDL-C",
    group: "Lipids",
    value: 38, unit: "mg/dL", low: 40, high: null,
    what: "HDL carries cholesterol back to the liver to be cleared. For this test, a higher number is the favourable direction.",
    reading: "This value is below the lower limit printed on your report.",
    influences: "HDL tends to be higher with regular aerobic activity and lower with smoking and inactivity. It is also strongly influenced by genetics.",
    ask: "",
    terms: "Reported as <code>HDL</code> or <code>HDL-C</code>. This is the one lipid measure where the report's limit is a floor, not a ceiling."
  },
  {
    id: "tg",
    name: "Triglycerides",
    abbr: "TG",
    group: "Lipids",
    value: 178, unit: "mg/dL", low: null, high: 150,
    what: "Triglycerides are the main form in which the body stores and moves fat for energy.",
    reading: "This value is above the limit printed on your report.",
    influences: "Triglycerides are very sensitive to recent food and alcohol, which is why this test is usually done fasting.",
    ask: "Should this be repeated after a proper fast?",
    terms: "Reported as <code>TG</code> or <code>TGL</code>."
  },
  {
    id: "alt",
    name: "Alanine transaminase",
    abbr: "ALT / SGPT",
    group: "Liver",
    value: 46, unit: "U/L", low: 7, high: 56,
    what: "ALT is an enzyme found mostly in liver cells. Blood levels give a general indication of liver activity.",
    reading: "This value sits inside the range printed on your report, near its upper end.",
    influences: "Recent intense exercise, alcohol, some medicines and supplements can raise it temporarily.",
    ask: "",
    terms: "The same enzyme appears as <code>ALT</code> and <code>SGPT</code> on different reports. <code>U/L</code> means units per litre."
  },
  {
    id: "ast",
    name: "Aspartate transaminase",
    abbr: "AST / SGOT",
    group: "Liver",
    value: 34, unit: "U/L", low: 10, high: 40,
    what: "AST is an enzyme found in the liver and also in muscle, so it is usually read alongside ALT rather than on its own.",
    reading: "This value sits inside the range printed on your report.",
    influences: "Muscle strain and heavy exercise can raise AST without any liver involvement.",
    ask: "",
    terms: "Appears as <code>AST</code> or <code>SGOT</code>."
  },
  {
    id: "bili",
    name: "Total bilirubin",
    abbr: "T.BIL",
    group: "Liver",
    value: 0.8, unit: "mg/dL", low: 0.2, high: 1.2,
    what: "Bilirubin is a yellow pigment produced when old red blood cells are broken down and processed by the liver.",
    reading: "This value sits inside the range printed on your report.",
    influences: "Fasting and dehydration can nudge bilirubin up slightly.",
    ask: "",
    terms: "Reported as <code>T.BIL</code>, often split into direct and indirect fractions."
  },
  {
    id: "creat",
    name: "Serum creatinine",
    abbr: "CREA",
    group: "Kidney",
    value: 0.86, unit: "mg/dL", low: 0.6, high: 1.1,
    what: "Creatinine is a waste product from normal muscle activity that healthy kidneys filter out of the blood.",
    reading: "This value sits inside the range printed on your report.",
    influences: "Muscle mass, hydration, protein intake and some medicines affect creatinine, so ranges differ between people.",
    ask: "",
    terms: "Reported as <code>CREA</code> or <code>S.Creatinine</code>."
  },
  {
    id: "egfr",
    name: "Estimated GFR",
    abbr: "eGFR",
    group: "Kidney",
    value: 94, unit: "mL/min/1.73m²", low: 90, high: null,
    what: "eGFR is a calculation, not a direct measurement. It estimates how well the kidneys are filtering, using creatinine along with age and sex.",
    reading: "This value sits above the lower limit printed on your report.",
    influences: "Because it is calculated from creatinine, anything that changes creatinine changes this number too.",
    ask: "",
    terms: "Reported as <code>eGFR</code>. The <code>1.73m²</code> refers to a standard body surface area used in the formula."
  },
  {
    id: "urea",
    name: "Blood urea",
    abbr: "UREA",
    group: "Kidney",
    value: 26, unit: "mg/dL", low: 15, high: 40,
    what: "Urea is another waste product cleared by the kidneys, produced when the body breaks down protein.",
    reading: "This value sits inside the range printed on your report.",
    influences: "Urea rises with dehydration and a high-protein diet.",
    ask: "",
    terms: "Reported as <code>UREA</code> or <code>BUN</code>. BUN measures only the nitrogen portion, so its numbers look smaller."
  },
  {
    id: "tsh",
    name: "Thyroid stimulating hormone",
    abbr: "TSH",
    group: "Thyroid",
    value: 2.4, unit: "µIU/mL", low: 0.4, high: 4.0,
    what: "TSH is the signal the brain sends to the thyroid gland. It is usually the first thyroid test run because it responds early to change.",
    reading: "This value sits inside the range printed on your report.",
    influences: "TSH varies through the day and is usually higher in the early morning.",
    ask: "",
    terms: "Reported as <code>TSH</code>. <code>µIU/mL</code> means micro-international units per millilitre."
  },
  {
    id: "vitd",
    name: "Vitamin D, 25-hydroxy",
    abbr: "25-OH D",
    group: "Vitamins",
    value: 17, unit: "ng/mL", low: 30, high: 100,
    what: "This measures the storage form of vitamin D, which the body makes from sunlight and absorbs from food and supplements.",
    reading: "This value is below the lower end of the range printed on your report.",
    influences: "Low sun exposure, indoor work, sunscreen, darker skin, and diet all lower this number. Labs also disagree about where the lower limit should sit.",
    ask: "Is this level worth treating, and should it be rechecked later?",
    terms: "Reported as <code>25-OH vitamin D</code> or <code>25(OH)D</code>. Some labs report in <code>nmol/L</code>, which gives numbers about 2.5× larger."
  }
];

/* Combinations worth showing a clinician together. These describe how tests
   relate to each other in general — they are not conclusions about anyone. */
const PATTERNS = [
  {
    id: "metabolic",
    title: "Four results in this report move together",
    body: "Fasting glucose, HbA1c, triglycerides and HDL are often read as a group rather than one at a time, because the same everyday factors tend to shift all four in the same direction. Three of the four sit outside the ranges printed on your report, so it is worth showing them together rather than separately.",
    involves: ["glucose", "hba1c", "tg", "hdl"],
    prompt: "Do these four results change anything about what you'd suggest?"
  },
  {
    id: "timing",
    title: "Two results depend on how long you fasted",
    body: "Fasting glucose and triglycerides both respond strongly to food eaten in the hours before the sample was taken. If the fast was shorter than the lab assumed, both numbers can read higher than they otherwise would. Your report records this sample as fasting, but only you know how long it actually was.",
    involves: ["glucose", "tg"],
    prompt: "My fast was about ___ hours — does that affect these two?"
  },
  {
    id: "wbc-context",
    title: "A raised white cell count with no other flag nearby",
    body: "The white cell count is above the printed range while the rest of the blood count is inside it. White cell counts move around a lot from week to week, and a single reading is usually read together with how you were feeling that day.",
    involves: ["wbc"],
    prompt: "Is this worth repeating, and if so, when?"
  }
];

/* Prior reports, used for the trend sparklines and the history page. */
const HISTORY = [
  {
    id: "rpt-2026-03-04", date: "2026-03-04", label: "Comprehensive health panel",
    lab: "Meridian Diagnostics", flags: 8, current: true
  },
  {
    id: "rpt-2025-09-12", date: "2025-09-12", label: "Fasting sugar & lipid profile",
    lab: "Meridian Diagnostics", flags: 5
  },
  {
    id: "rpt-2025-03-21", date: "2025-03-21", label: "Annual health check",
    lab: "Apollo Labs, Jubilee Hills", flags: 2
  },
  {
    id: "rpt-2024-04-02", date: "2024-04-02", label: "Annual health check",
    lab: "Apollo Labs, Jubilee Hills", flags: 1
  }
];

/* Values over time, oldest first, aligned to HISTORY dates. */
const TRENDS = {
  glucose: [92, 98, 104, 112],
  hba1c:   [5.3, 5.5, 5.8, 6.1],
  ldl:     [118, 126, 134, 141],
  hdl:     [46, 43, 41, 38],
  tg:      [131, 140, 162, 178],
  vitd:    [24, 21, 19, 17],
  wbc:     [7.2, 8.1, 7.6, 11.8]
};

const TREND_DATES = ["Apr 24", "Mar 25", "Sep 25", "Mar 26"];

/* A short glossary used on the Help page. */
const GLOSSARY = [
  ["Reference range", "The band of values a lab prints next to your result. It describes what most healthy people in a comparison group measured — not a pass mark. Ranges differ between labs, so compare a result only to the range printed beside it."],
  ["Flagged", "In Readout, a result is flagged when it falls outside the range printed on your own report. Nothing more is implied by the word."],
  ["Fasting", "No food or drink except water for a set period before the sample, usually eight to twelve hours. Several tests read differently if the fast was shorter."],
  ["Units", "The scale a result is measured on, such as mg/dL or mmol/L. The same result looks like a completely different number in different units, so units always travel with the value."],
  ["Panel", "A group of tests run together from one sample, such as a lipid profile or liver function test."],
  ["Serum / plasma", "Two ways of preparing the liquid part of a blood sample. Reports mention which one was used because a few tests read slightly differently."],
  ["OCR", "Optical character recognition — reading printed text out of a photo or scan so software can work with it. It is the first step Readout runs on an uploaded report."]
];
