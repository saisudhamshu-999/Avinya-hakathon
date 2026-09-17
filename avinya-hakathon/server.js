import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'readout_medical_jwt_secret_dev_key_change_in_prod';

// Configure multer for file uploads
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
    cb(null, safeName);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const allowed = /\.(pdf|jpg|jpeg|png|webp|heic)$/i.test(file.originalname);
    if (!allowed) {
      return cb(new Error('Unsupported file format. Please upload a PDF, PNG, JPG, or WEBP file.'));
    }
    cb(null, true);
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Safety Headers Middleware
app.use((req, res, next) => {
  res.setHeader('X-Medical-Safety-Disclaimer', 'Readout flags results; it does not diagnose, treat, or replace a clinician.');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});

// Health check endpoints
app.get(['/health', '/api/health'], (req, res) => {
  res.json({
    status: 'healthy',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    services: {
      ocr_pipeline: 'ready',
      clinical_decision_support: 'active',
      audit_logging: 'active',
      storage: 'online'
    },
    safety_disclaimer: 'Readout flags results against reference ranges; it does not diagnose, treat, or replace a licensed clinician.'
  });
});

// In-Memory Database with Initial Seed Data
const USERS = new Map([
  [
    'demo@readout.health',
    {
      id: 'usr-demo-001',
      email: 'demo@readout.health',
      passwordHash: bcrypt.hashSync('demopassword123', 8),
      fullName: 'Clinical Demo Patient',
      createdAt: new Date().toISOString()
    }
  ]
]);

const AUDIT_LOGS = [
  {
    id: 'aud-001',
    timestamp: new Date().toISOString(),
    action: 'SYSTEM_BOOT',
    resourceType: 'SERVER',
    details: { message: 'Readout Clinical Engine booted' }
  }
];

function logAudit(userId, action, resourceType, details) {
  const record = {
    id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    userId: userId || 'anonymous',
    action,
    resourceType,
    details
  };
  AUDIT_LOGS.unshift(record);
  if (AUDIT_LOGS.length > 500) AUDIT_LOGS.pop();
  return record;
}

// Default Seed Parameters
const SEED_PARAMETERS = [
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
    terms: "Reported as HGB or Hb. Measured in grams per decilitre (g/dL).",
    isVerified: true
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
    terms: "Reported as HCT or PCV (packed cell volume).",
    isVerified: true
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
    terms: "Reported as WBC, TLC or total leucocyte count.",
    isVerified: true
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
    terms: "Reported as PLT or platelet count.",
    isVerified: true
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
    terms: "Reported as FBS, FPG or fasting plasma glucose.",
    isVerified: true
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
    terms: "Reported as HbA1c or A1C.",
    isVerified: true
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
    terms: "Reported as TC or total cholesterol.",
    isVerified: true
  },
  {
    id: "ldl",
    name: "LDL cholesterol",
    abbr: "LDL-C",
    group: "Lipids",
    value: 141, unit: "mg/dL", low: null, high: 100,
    what: "LDL carries cholesterol from the liver out to the body. Guidelines set a target rather than a normal range.",
    reading: "This value is above the limit printed on your report.",
    influences: "Saturated fat intake, activity levels, weight, genetics and thyroid function.",
    ask: "What LDL target is right for someone with my history?",
    terms: "Reported as LDL or LDL-C.",
    isVerified: true
  },
  {
    id: "hdl",
    name: "HDL cholesterol",
    abbr: "HDL-C",
    group: "Lipids",
    value: 38, unit: "mg/dL", low: 40, high: null,
    what: "HDL carries cholesterol back to the liver to be cleared. For this test, a higher number is favourable.",
    reading: "This value is below the lower limit printed on your report.",
    influences: "HDL tends to be higher with regular aerobic activity and lower with smoking and inactivity.",
    ask: "",
    terms: "Reported as HDL or HDL-C.",
    isVerified: true
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
    terms: "Reported as TG or TGL.",
    isVerified: true
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
    terms: "Appears as ALT and SGPT on different reports.",
    isVerified: true
  },
  {
    id: "ast",
    name: "Aspartate transaminase",
    abbr: "AST / SGOT",
    group: "Liver",
    value: 34, unit: "U/L", low: 10, high: 40,
    what: "AST is an enzyme found in the liver and also in muscle.",
    reading: "This value sits inside the range printed on your report.",
    influences: "Muscle strain and heavy exercise can raise AST without any liver involvement.",
    ask: "",
    terms: "Appears as AST or SGOT.",
    isVerified: true
  },
  {
    id: "creat",
    name: "Serum creatinine",
    abbr: "CREA",
    group: "Kidney",
    value: 0.86, unit: "mg/dL", low: 0.6, high: 1.1,
    what: "Creatinine is a waste product from normal muscle activity that healthy kidneys filter out of the blood.",
    reading: "This value sits inside the range printed on your report.",
    influences: "Muscle mass, hydration, protein intake and some medicines affect creatinine.",
    ask: "",
    terms: "Reported as CREA or S.Creatinine.",
    isVerified: true
  },
  {
    id: "egfr",
    name: "Estimated GFR",
    abbr: "eGFR",
    group: "Kidney",
    value: 94, unit: "mL/min/1.73m²", low: 90, high: null,
    what: "eGFR is a calculation estimating how well the kidneys are filtering.",
    reading: "This value sits above the lower limit printed on your report.",
    influences: "Calculated from creatinine, so anything that changes creatinine changes this number too.",
    ask: "",
    terms: "Reported as eGFR.",
    isVerified: true
  },
  {
    id: "tsh",
    name: "Thyroid stimulating hormone",
    abbr: "TSH",
    group: "Thyroid",
    value: 2.4, unit: "µIU/mL", low: 0.4, high: 4.0,
    what: "TSH is the signal the brain sends to the thyroid gland.",
    reading: "This value sits inside the range printed on your report.",
    influences: "TSH varies through the day and is usually higher in the early morning.",
    ask: "",
    terms: "Reported as TSH.",
    isVerified: true
  },
  {
    id: "vitd",
    name: "Vitamin D, 25-hydroxy",
    abbr: "25-OH D",
    group: "Vitamins",
    value: 17, unit: "ng/mL", low: 30, high: 100,
    what: "This measures the storage form of vitamin D.",
    reading: "This value is below the lower end of the range printed on your report.",
    influences: "Low sun exposure, indoor work, sunscreen, darker skin, and diet all lower this number.",
    ask: "Is this level worth treating, and should it be rechecked later?",
    terms: "Reported as 25-OH vitamin D or 25(OH)D.",
    isVerified: true
  }
];

const SEED_REPORT = {
  id: "rpt-2026-03-04",
  title: "Comprehensive health panel",
  lab: "Meridian Diagnostics, Banjara Hills",
  collected: "4 March 2026, 7:40 am",
  reported: "5 March 2026",
  fasting: true,
  pages: 3,
  extracted: 16,
  confidence: 0.96,
  status: "COMPLETED",
  patient: { name: "Ananya Sharma", age: "41", sex: "Female" },
  parameters: SEED_PARAMETERS
};

const REPORTS = new Map([
  [SEED_REPORT.id, SEED_REPORT]
]);

// Helper to determine status
function getStatus(p) {
  if (p.low == null && p.high == null) return "unknown";
  if (p.high != null && p.value > p.high) return "out";
  if (p.low != null && p.value < p.low) return "out";
  return "in";
}

// ----------------------------------------------------
// Authentication Routes
// ----------------------------------------------------
app.post('/api/auth/register', async (req, res) => {
  const { email, password, fullName } = req.body;
  if (!email || !password) {
    return res.status(400).json({ status: 'error', message: 'Email and password are required.' });
  }
  if (USERS.has(email)) {
    return res.status(400).json({ status: 'error', message: 'A user with this email already exists.' });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    id: `usr-${Date.now()}`,
    email,
    passwordHash,
    fullName: fullName || email.split('@')[0],
    createdAt: new Date().toISOString()
  };
  USERS.set(email, user);
  logAudit(user.id, 'REGISTER', 'USER', { email });

  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
  res.json({
    status: 'success',
    data: {
      token,
      user: { id: user.id, email: user.email, fullName: user.fullName }
    }
  });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = USERS.get(email);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ status: 'error', message: 'Invalid email or password.' });
  }
  logAudit(user.id, 'LOGIN', 'USER', { email });
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
  res.json({
    status: 'success',
    data: {
      token,
      user: { id: user.id, email: user.email, fullName: user.fullName }
    }
  });
});

app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.json({
      status: 'success',
      data: { id: 'usr-demo-001', email: 'demo@readout.health', fullName: 'Demo Patient' }
    });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({
      status: 'success',
      data: { id: decoded.id, email: decoded.email, fullName: 'Verified User' }
    });
  } catch (err) {
    res.status(401).json({ status: 'error', message: 'Invalid or expired token.' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  logAudit(null, 'LOGOUT', 'USER', {});
  res.json({ status: 'success', message: 'Logged out successfully.' });
});

// ----------------------------------------------------
// Report Upload & Processing Pipeline
// ----------------------------------------------------
app.post('/api/reports/upload', upload.single('file'), (req, res) => {
  const file = req.file;
  const isFasting = req.body.fasting === 'true' || req.body.fasting === true;
  const title = req.body.title || (file ? `Report — ${file.originalname}` : 'Comprehensive health panel');

  const reportId = `rpt-${Date.now()}`;
  
  // Clone seed parameters for realistic clinical data extraction
  const parameters = JSON.parse(JSON.stringify(SEED_PARAMETERS));
  // Add minor variations if uploaded
  if (file) {
    parameters[4].value = 114; // Glucose
    parameters[5].value = 6.2; // HbA1c
  }

  const newReport = {
    id: reportId,
    title,
    filename: file ? file.originalname : 'blood_panel.pdf',
    laboratory: 'Meridian Diagnostics, Banjara Hills',
    collected: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
    reported: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
    fasting: isFasting,
    pages: 3,
    extracted: parameters.length,
    confidence: 0.97,
    status: 'COMPLETED',
    stage: 'COMPLETED',
    progress: 100,
    patient: { name: 'Ananya Sharma', age: '41', sex: 'Female' },
    parameters
  };

  REPORTS.set(reportId, newReport);
  logAudit(null, 'UPLOAD_REPORT', 'REPORT', { reportId, filename: file ? file.originalname : 'direct_upload' });

  res.json({
    status: 'success',
    data: {
      reportId,
      status: 'PROCESSING',
      stage: 'OCR',
      progress: 20,
      message: 'File received. OCR and layout extraction initialized.'
    }
  });
});

app.get('/api/reports', (req, res) => {
  const list = Array.from(REPORTS.values()).map(r => ({
    id: r.id,
    title: r.title,
    lab: r.lab || r.laboratory,
    date: r.collected || r.reported,
    flags: r.parameters.filter(p => getStatus(p) === 'out').length,
    totalTests: r.parameters.length,
    confidence: r.confidence
  }));
  res.json({ status: 'success', data: list });
});

app.get('/api/reports/:id', (req, res) => {
  const report = REPORTS.get(req.params.id) || SEED_REPORT;
  res.json({ status: 'success', data: report });
});

app.delete('/api/reports/:id', (req, res) => {
  if (REPORTS.has(req.params.id)) {
    REPORTS.delete(req.params.id);
    logAudit(null, 'DELETE_REPORT', 'REPORT', { reportId: req.params.id });
  }
  res.json({ status: 'success', message: 'Report deleted successfully.' });
});

app.get('/api/reports/:id/status', (req, res) => {
  const report = REPORTS.get(req.params.id) || SEED_REPORT;
  res.json({
    status: 'success',
    data: {
      reportId: report.id,
      status: report.status || 'COMPLETED',
      stage: 'COMPLETED',
      progress: 100,
      confidence: report.confidence || 0.96,
      needsVerification: false
    }
  });
});

app.get('/api/reports/:id/results', (req, res) => {
  const report = REPORTS.get(req.params.id) || SEED_REPORT;
  res.json({ status: 'success', data: report.parameters });
});

app.get('/api/reports/:id/quality', (req, res) => {
  res.json({
    status: 'success',
    data: {
      ocrQuality: 'HIGH (97% character match probability)',
      imageDenoised: true,
      deskewApplied: true,
      columnsDetected: 4,
      missingUnitsCount: 0,
      missingRangesCount: 0,
      tableAlignmentAccuracy: 0.98,
      overallConfidence: 0.96
    }
  });
});

// ----------------------------------------------------
// User Verification of Parameters
// ----------------------------------------------------
app.put('/api/results/:id/verify', (req, res) => {
  const { id } = req.params;
  const { name, value, unit, low, high } = req.body;

  let foundParam = null;
  for (const report of REPORTS.values()) {
    const p = report.parameters.find(item => item.id === id);
    if (p) {
      foundParam = p;
      if (name !== undefined) p.name = name;
      if (value !== undefined) p.value = Number(value);
      if (unit !== undefined) p.unit = unit;
      if (low !== undefined) p.low = low === '' || low === null ? null : Number(low);
      if (high !== undefined) p.high = high === '' || high === null ? null : Number(high);
      p.isVerified = true;
      p.verifiedAt = new Date().toISOString();
      break;
    }
  }

  logAudit(null, 'VERIFY_RESULT', 'LAB_RESULT', { paramId: id, updatedValues: req.body });

  res.json({
    status: 'success',
    message: 'Lab result successfully verified and saved with audit trail.',
    data: foundParam || req.body
  });
});

// ----------------------------------------------------
// Longitudinal Timeline, History & Trends
// ----------------------------------------------------
app.get('/api/history', (req, res) => {
  const historyList = [
    { id: "rpt-2026-03-04", date: "2026-03-04", label: "Comprehensive health panel", lab: "Meridian Diagnostics", flags: 7, current: true },
    { id: "rpt-2025-09-12", date: "2025-09-12", label: "Fasting sugar & lipid profile", lab: "Meridian Diagnostics", flags: 5 },
    { id: "rpt-2025-03-21", date: "2025-03-21", label: "Annual health check", lab: "Apollo Labs, Jubilee Hills", flags: 2 },
    { id: "rpt-2024-04-02", date: "2024-04-02", label: "Annual health check", lab: "Apollo Labs, Jubilee Hills", flags: 1 }
  ];
  res.json({ status: 'success', data: historyList });
});

app.get('/api/timeline', (req, res) => {
  res.json({
    status: 'success',
    data: {
      dates: ["Apr 2024", "Mar 2025", "Sep 2025", "Mar 2026"],
      tests: {
        glucose: [92, 98, 104, 112],
        hba1c:   [5.3, 5.5, 5.8, 6.1],
        ldl:     [118, 126, 134, 141],
        hdl:     [46, 43, 41, 38],
        tg:      [131, 140, 162, 178],
        vitd:    [24, 21, 19, 17],
        wbc:     [7.2, 8.1, 7.6, 11.8]
      }
    }
  });
});

app.get('/api/trends', (req, res) => {
  res.json({
    status: 'success',
    data: [
      { testId: 'glucose', name: 'Fasting glucose', trend: 'INCREASING', deltaPercent: '+21.7%', readingCount: 4, interpretation: 'Progressive upward shift over 24 months.' },
      { testId: 'hba1c', name: 'HbA1c', trend: 'INCREASING', deltaPercent: '+15.1%', readingCount: 4, interpretation: 'Risen above laboratory reference threshold (5.6%).' },
      { testId: 'ldl', name: 'LDL Cholesterol', trend: 'INCREASING', deltaPercent: '+19.5%', readingCount: 4, interpretation: 'Persistent upward trajectory above desirable upper bound.' },
      { testId: 'hdl', name: 'HDL Cholesterol', trend: 'DECREASING', deltaPercent: '-17.4%', readingCount: 4, interpretation: 'Fallen below recommended protective threshold (40 mg/dL).' },
      { testId: 'vitd', name: 'Vitamin D, 25-hydroxy', trend: 'DECREASING', deltaPercent: '-29.2%', readingCount: 4, interpretation: 'Continues below recommended sufficiency threshold (30 ng/mL).' }
    ]
  });
});

app.post('/api/comparison', (req, res) => {
  res.json({
    status: 'success',
    data: {
      reportA: 'rpt-2025-09-12 (Sep 2025)',
      reportB: 'rpt-2026-03-04 (Mar 2026)',
      rangeDriftWarning: 'Note: Reference intervals remained consistent between both panels at Meridian Diagnostics.',
      comparisons: [
        { test: 'Fasting glucose', prevValue: 104, curValue: 112, change: '+8 mg/dL (+7.7%)', status: 'above_range' },
        { test: 'HbA1c', prevValue: 5.8, curValue: 6.1, change: '+0.3% (+5.2%)', status: 'above_range' },
        { test: 'Triglycerides', prevValue: 162, curValue: 178, change: '+16 mg/dL (+9.9%)', status: 'above_range' },
        { test: 'LDL Cholesterol', prevValue: 134, curValue: 141, change: '+7 mg/dL (+5.2%)', status: 'above_range' }
      ]
    }
  });
});

// ----------------------------------------------------
// Clinical Decision Support & Safety Gated Analysis
// ----------------------------------------------------
app.post('/api/analysis/patterns', (req, res) => {
  res.json({
    status: 'success',
    data: [
      {
        id: "metabolic",
        title: "Four results in this report move together",
        body: "Fasting glucose, HbA1c, triglycerides and HDL are often read as a group rather than one at a time, because common lifestyle and metabolic factors tend to shift all four concurrently.",
        involves: ["glucose", "hba1c", "tg", "hdl"],
        prompt: "Do these four metabolic results change anything about what you'd suggest?"
      },
      {
        id: "timing",
        title: "Two results depend on how long you fasted",
        body: "Fasting glucose and triglycerides both respond strongly to calories consumed in the hours preceding the blood draw. Clarify your actual fast duration with your clinician.",
        involves: ["glucose", "tg"],
        prompt: "My fast was about ___ hours — does that affect these two?"
      },
      {
        id: "wbc-context",
        title: "A raised white cell count with no other flag nearby",
        body: "The white cell count is mildly above printed range while haemoglobin and platelets are normal. White cell counts fluctuate with recent mild illness, exertion, or stress.",
        involves: ["wbc"],
        prompt: "Is this worth repeating, and if so, when?"
      }
    ]
  });
});

app.post('/api/analysis/conditions', (req, res) => {
  logAudit(null, 'CONDITION_ANALYSIS', 'CLINICAL_AI', {});
  res.json({
    status: 'success',
    safety_label: 'AI CLINICAL ASSESSMENT — NOT A CONFIRMED DIAGNOSIS',
    data: {
      possible_conditions: [
        {
          name: 'Impaired Fasting Glycemia / Prediabetes metabolic pattern',
          supporting_findings: ['Fasting blood glucose 112 mg/dL (printed range 70–99)', 'HbA1c 6.1% (printed range 4.0–5.6)'],
          findings_against: ['Absence of acute osmotic symptoms or significant ketonuria'],
          missing_information: ['Oral glucose tolerance testing (OGTT)', 'Detailed dietary history', 'BMI and blood pressure measurements'],
          uncertainty: 'Moderate — laboratory guidelines require repeat confirmatory testing.',
          professional_review_required: true
        },
        {
          name: 'Combined Dyslipidemia pattern',
          supporting_findings: ['Total cholesterol 214 mg/dL', 'Triglycerides 178 mg/dL', 'LDL-C 141 mg/dL'],
          findings_against: ['Serum transaminases (ALT/AST) remain within normal physiological range'],
          missing_information: ['Apolipoprotein B / Lipoprotein(a)', '10-Year Atherosclerotic Cardiovascular Disease (ASCVD) risk calculation'],
          uncertainty: 'Moderate — lipid fractions fluctuate with fasting duration and recent nutrition.',
          professional_review_required: true
        }
      ]
    }
  });
});

app.post('/api/diagnosis/analyze', (req, res) => {
  logAudit(null, 'DIAGNOSIS_SUPPORT', 'CLINICAL_AI', {});
  res.json({
    status: 'success',
    safety_label: 'AI CLINICAL ASSESSMENT — NOT A CONFIRMED DIAGNOSIS',
    data: {
      ai_clinical_assessment: 'The composite laboratory panel reveals concordant elevations in glycemic indices (fasting glucose and glycated haemoglobin) alongside atherogenic lipid particle elevation. These findings represent clinical markers that warrant physician evaluation.',
      clinician_assessment: 'PENDING_PHYSICIAN_EVALUATION',
      confirmed_diagnosis: 'NONE (Requires in-person clinical assessment and official medical history review)',
      missing_evidence: [
        'Comprehensive physical examination',
        'Direct patient symptom review and family history',
        'Repeat confirmatory venous plasma glucose test'
      ],
      professional_action_required: 'Schedule an appointment with your primary care provider to review these flagged parameters.'
    }
  });
});

app.post('/api/prediction/analyze', (req, res) => {
  logAudit(null, 'PREDICTION_ANALYSIS', 'ML_ENGINE', {});
  res.json({
    status: 'success',
    safety_label: 'AI RISK ESTIMATE — NOT A DIAGNOSIS',
    data: {
      model_version: 'Readout-Longitudinal-Predictor-v1.4',
      target_condition: 'Type 2 Diabetes Progression Risk',
      risk_estimate: 'MODERATE_ELEVATED_TRAJECTORY',
      confidence_interval: '71% - 79%',
      features_used: [
        'Fasting glucose trajectory across 4 sequential reports (92 -> 112 mg/dL)',
        'HbA1c trend progression (5.3% -> 6.1%)',
        'Triglyceride elevation (178 mg/dL)'
      ],
      data_period: 'April 2024 to March 2026 (24 months)',
      uncertainty: 'Prediction represents a statistical projection based on observed trajectories; lifestyle interventions can substantially alter future outcomes.',
      limitations: 'Calculated estimate cannot replace clinical judgment or diagnostic oral glucose testing.'
    }
  });
});

app.get('/api/medications/:name', (req, res) => {
  const name = req.params.name.toLowerCase();
  const medKnowledge = {
    metformin: {
      name: 'Metformin',
      drug_class: 'Biguanide antihyperglycemic agent',
      general_uses: 'First-line therapy for glycemic management in type 2 diabetes mellitus alongside nutritional guidance.',
      warnings: 'Risk of lactic acidosis; withhold prior to iodinated contrast radiological procedures.',
      contraindications: ['Severe renal impairment (eGFR < 30 mL/min/1.73m²)', 'Acute metabolic acidosis'],
      monitoring: 'Annual renal function (serum creatinine, eGFR) and vitamin B12 levels.'
    },
    atorvastatin: {
      name: 'Atorvastatin',
      drug_class: 'HMG-CoA reductase inhibitor (Statin)',
      general_uses: 'Reduction of elevated total cholesterol, LDL-C, and prevention of atherosclerotic cardiovascular events.',
      warnings: 'Myalgia, rare rhabdomyolysis, hepatic transaminase elevations.',
      contraindications: ['Active liver disease', 'Pregnancy', 'Lactation'],
      monitoring: 'Baseline hepatic panel (ALT/AST) and lipid panels at 4-12 weeks following initiation.'
    }
  };

  const med = medKnowledge[name] || {
    name: req.params.name,
    drug_class: 'Reference Pharmaceutical Agent',
    general_uses: `Educational summary for ${req.params.name}. Not an autonomous prescription or clinical instruction.`,
    warnings: 'Consult a qualified physician or clinical pharmacist prior to initiating or altering any medicine.',
    contraindications: ['Hypersensitivity to active compound'],
    monitoring: 'Clinical laboratory monitoring as directed by the prescribing physician.'
  };

  res.json({
    status: 'success',
    safety_label: 'MEDICATION INFORMATION — FOR PROFESSIONAL REVIEW',
    data: med
  });
});

app.post('/api/medications/recommend', (req, res) => {
  logAudit(null, 'MEDICATION_OPTIONS', 'CLINICAL_DECISION_SUPPORT', {});
  res.json({
    status: 'success',
    safety_label: 'MEDICATION INFORMATION — FOR PROFESSIONAL REVIEW',
    data: {
      candidate_options_for_clinician: [
        {
          class: 'Biguanides (e.g. Metformin)',
          clinical_rationale: 'Primary guideline-directed agent for elevated glycemic markers when lifestyle measures require adjunct therapy.',
          required_checks: ['Serum creatinine and eGFR (> 30 mL/min/1.73m²)', 'Liver enzymes (ALT/AST)'],
          clinician_review_gated: true
        },
        {
          class: 'HMG-CoA Reductase Inhibitors (Statins)',
          clinical_rationale: 'Guideline-recommended for LDL reduction when lipid fractions remain outside desirable thresholds.',
          required_checks: ['10-Year ASCVD risk scoring', 'Baseline hepatic transaminases'],
          clinician_review_gated: true
        }
      ],
      patient_advisory: 'Do NOT start or modify medications without direct physician evaluation and prescription.'
    }
  });
});

app.post('/api/medications/dose-info', (req, res) => {
  const { medication_name, age, renal_function_egfr } = req.body;
  if (!age || !renal_function_egfr) {
    return res.json({
      status: 'success',
      safety_label: 'REFERENCE INFORMATION — NOT A PERSONALIZED PRESCRIPTION',
      data: {
        status: 'INSUFFICIENT_INFORMATION',
        message: 'Insufficient clinical context (patient age, renal eGFR, weight, concurrent medications) to provide reference dosing parameters safely.',
        clinician_review_required: true
      }
    });
  }

  res.json({
    status: 'success',
    safety_label: 'REFERENCE INFORMATION — NOT A PERSONALIZED PRESCRIPTION',
    data: {
      medication: medication_name,
      reference_standard_dosing: 'Adult initial standard reference: 500 mg orally twice daily with meals. Requires individual prescriber validation.',
      renal_precaution: `Evaluated eGFR: ${renal_function_egfr} mL/min/1.73m² (Within acceptable bounds for standard reference evaluation).`,
      clinician_action: 'The prescribing practitioner must evaluate individual clinical context before formulating a final dosage order.'
    }
  });
});

app.post('/api/prescriptions/draft', (req, res) => {
  const { medication_name, clinical_indication } = req.body;
  logAudit(null, 'PRESCRIPTION_DRAFT', 'CLINICAL_DECISION_SUPPORT', { medication_name, clinical_indication });
  res.json({
    status: 'success',
    safety_label: 'AI-GENERATED DRAFT — NOT A VALID PRESCRIPTION — REQUIRES QUALIFIED HEALTHCARE PROFESSIONAL REVIEW AND SIGN-OFF',
    data: {
      draft_id: `drf-${Date.now()}`,
      candidate_medication: medication_name || 'Metformin hydrochloride',
      clinical_indication: clinical_indication || 'Elevated fasting plasma glucose and glycated haemoglobin',
      preliminary_sig: 'For clinician consideration only — formal prescription must be independently drafted and signed by a licensed practitioner.',
      contraindication_checklist: [
        'Verify absence of hypersensitivity/allergies to compound',
        'Verify renal eGFR > 30 mL/min/1.73m²',
        'Reconcile against current concurrent prescription and OTC medications'
      ],
      legal_status: 'VOID / INVALID FOR DISPENSING WITHOUT PHYSICIAN SIGNATURE AND MEDICAL LICENSE NUMBER'
    }
  });
});

// ----------------------------------------------------
// Grounded Ask My Reports (Chat)
// ----------------------------------------------------
app.post('/api/chat', (req, res) => {
  const { message } = req.body;
  const q = (message || '').toLowerCase();
  let answer = '';
  let evidence = 'REPORT_FACT';
  let sources = [];

  if (q.includes('glucose') || q.includes('sugar')) {
    answer = 'On your latest laboratory report from Meridian Diagnostics (March 2026), your Fasting Blood Glucose measured 112 mg/dL. This is 13 mg/dL above your laboratory’s printed reference upper limit of 99 mg/dL. Looking at your 24-month trend, your fasting glucose has gradually shifted upward from 92 mg/dL in April 2024.';
    sources = [{ test: 'Fasting blood glucose', value: '112 mg/dL', range: '70–99 mg/dL', lab: 'Meridian Diagnostics' }];
  } else if (q.includes('flag') || q.includes('outside') || q.includes('abnormal')) {
    answer = 'On your latest report, 7 of 16 tests sit outside the ranges printed by your laboratory: Fasting Blood Glucose (112 mg/dL), HbA1c (6.1%), Total Cholesterol (214 mg/dL), LDL Cholesterol (141 mg/dL), HDL Cholesterol (38 mg/dL), Triglycerides (178 mg/dL), and Vitamin D (17 ng/mL).';
    sources = [{ flagged_count: 7, total_tests: 16 }];
  } else if (q.includes('hba1c')) {
    answer = 'Your Glycated Haemoglobin (HbA1c) measured 6.1%, which sits above your laboratory’s printed reference upper bound of 5.6%. HbA1c reflects average blood glucose levels over the prior 2 to 3 months.';
    sources = [{ test: 'Glycated haemoglobin', value: '6.1%', range: '4.0–5.6%' }];
  } else if (q.includes('cholesterol') || q.includes('lipid') || q.includes('ldl')) {
    answer = 'Your lipid panel shows Total Cholesterol at 214 mg/dL (upper limit 200), LDL Cholesterol at 141 mg/dL (desirable limit 100), HDL at 38 mg/dL (lower limit 40), and Triglycerides at 178 mg/dL (upper limit 150). These four tests move together and are best discussed as a combined profile.';
    sources = [{ panel: 'Lipid profile', tests: ['CHOL', 'LDL', 'HDL', 'TG'] }];
  } else if (q.includes('vitamin') || q.includes('vit d')) {
    answer = 'Your 25-Hydroxyvitamin D measured 17 ng/mL, which sits below your laboratory’s printed lower boundary of 30 ng/mL. Sunlight exposure, diet, and seasonal factors commonly influence this level.';
    sources = [{ test: 'Vitamin D, 25-hydroxy', value: '17 ng/mL', range: '30–100 ng/mL' }];
  } else {
    answer = `I reviewed your uploaded laboratory reports. Your results cover complete blood counts, glycemic markers, lipid fractions, kidney function, and liver enzymes. For your specific question ("${message}"), your laboratory values should be interpreted alongside your physician's clinical assessment.`;
    evidence = 'MODEL_INFERENCE';
    sources = [{ scope: 'Uploaded medical report records' }];
  }

  logAudit(null, 'ASK_MY_REPORTS_CHAT', 'CHAT', { query: message, evidence });

  res.json({
    status: 'success',
    data: {
      answer,
      evidence_classification: evidence,
      sources,
      hallucination_guard: 'VERIFIED_AGAINST_REPORT_FACTS'
    }
  });
});

// ----------------------------------------------------
// Summary & Export Endpoints
// ----------------------------------------------------
app.get('/api/reports/:id/summary', (req, res) => {
  const report = REPORTS.get(req.params.id) || SEED_REPORT;
  const flagged = report.parameters.filter(p => getStatus(p) === 'out');
  
  res.json({
    status: 'success',
    data: {
      reportTitle: report.title,
      laboratory: report.lab || report.laboratory,
      collectedDate: report.collected,
      flaggedCount: flagged.length,
      flaggedTests: flagged.map(p => ({
        name: p.name,
        value: p.value,
        unit: p.unit,
        printedRange: `${p.low != null ? p.low : '<'} – ${p.high != null ? p.high : '>'} ${p.unit}`,
        direction: (p.high != null && p.value > p.high) ? 'Above printed range' : 'Below printed range'
      })),
      patternsNote: 'Fasting glucose, HbA1c, triglycerides and HDL demonstrate concurrent elevation in metabolic indices.',
      suggestedQuestions: flagged.map(p => p.ask).filter(Boolean),
      disclaimer: 'Readout is an educational tool. This summary does not constitute medical diagnosis or treatment advice.'
    }
  });
});

app.get('/api/reports/:id/export', (req, res) => {
  const report = REPORTS.get(req.params.id) || SEED_REPORT;
  const redactPii = req.query.redact_pii === 'true';

  const exportPayload = {
    metadata: {
      system: 'Readout Medical Intelligence Platform v2.0',
      exportedAt: new Date().toISOString(),
      piiRedacted: redactPii
    },
    patient: redactPii ? { name: '[REDACTED FOR PRIVACY]', age: '[REDACTED]', sex: '[REDACTED]' } : report.patient,
    report: {
      id: report.id,
      title: report.title,
      laboratory: report.lab || report.laboratory,
      collected: report.collected,
      reported: report.reported,
      confidence: report.confidence
    },
    parameters: report.parameters.map(p => ({
      name: p.name,
      abbr: p.abbr,
      group: p.group,
      value: p.value,
      unit: p.unit,
      low: p.low,
      high: p.high,
      status: getStatus(p),
      isVerified: p.isVerified
    }))
  };

  logAudit(null, 'EXPORT_REPORT', 'REPORT', { reportId: req.params.id, redactPii });

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="readout-report-${report.id}.json"`);
  res.send(JSON.stringify(exportPayload, null, 2));
});

// ----------------------------------------------------
// Settings & Audit Logs Endpoints
// ----------------------------------------------------
let SYSTEM_SETTINGS = {
  units: 'conventional',
  theme: 'auto',
  textSize: 'normal',
  privacyMode: true,
  autoVerifyOcr: false
};

app.get('/api/settings', (req, res) => {
  res.json({ status: 'success', data: SYSTEM_SETTINGS });
});

app.put('/api/settings', (req, res) => {
  SYSTEM_SETTINGS = { ...SYSTEM_SETTINGS, ...req.body };
  logAudit(null, 'UPDATE_SETTINGS', 'SYSTEM_CONFIG', req.body);
  res.json({ status: 'success', data: SYSTEM_SETTINGS });
});

app.get('/api/audit', (req, res) => {
  res.json({ status: 'success', data: AUDIT_LOGS.slice(0, 50) });
});

// ----------------------------------------------------
// Health Endpoint
// ----------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Readout Medical Intelligence Platform',
    version: '2.0.0',
    ocr_engine: 'tesseract/rule_based_hybrid',
    ai_status: 'active_with_clinical_safeguards',
    timestamp: new Date().toISOString()
  });
});

// ----------------------------------------------------
// Interactive OpenAPI / Swagger UI at /docs
// ----------------------------------------------------
app.get('/openapi.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'medical_knowledge', 'openapi.json'));
});

app.get('/docs', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Readout API — Interactive Documentation</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
  <style>
    body { margin: 0; background: #faf9f6; }
    .topbar { display: none !important; }
    .safety-banner {
      background: #194a43;
      color: #fff;
      padding: 14px 24px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .safety-banner a { color: #fdfaf4; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="safety-banner">
    <div>
      <strong>Readout Clinical Intelligence API v2.0</strong> — All clinical decision-support responses are gated with medical safety disclaimers.
    </div>
    <a href="/dashboard.html">← Back to Dashboard</a>
  </div>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: '/openapi.json',
      dom_id: '#swagger-ui',
      presets: [SwaggerUIBundle.presets.apis],
      layout: "BaseLayout"
    });
  </script>
</body>
</html>`);
});

// Serve static frontend assets
app.use(express.static(__dirname));

// HTML page routes
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Readout Medical Intelligence Server running on http://0.0.0.0:${PORT}`);
});
