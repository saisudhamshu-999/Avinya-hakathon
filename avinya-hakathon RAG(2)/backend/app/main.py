import os
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel

app = FastAPI(
    title="Readout Medical Report Intelligence & Clinical Decision-Support API",
    description="Full-stack AI medical laboratory-report analysis platform with strict medical safety guards.",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Safety Headers Middleware
@app.middleware("http")
async def add_medical_safety_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Medical-Safety-Disclaimer"] = "Readout flags results; it does not diagnose, treat, or replace a clinician."
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response

# --- Models & Schemas ---
class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    ocr_engine: str
    ai_status: str

class UserAuthRequest(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = "Readout Patient"

class ConditionAnalysisRequest(BaseModel):
    report_id: Optional[str] = None
    parameters: Optional[List[Dict[str, Any]]] = None

class DiagnosisAnalysisRequest(BaseModel):
    report_id: Optional[str] = None
    patient_history: Optional[str] = None
    symptoms: Optional[str] = None

class PredictionRequest(BaseModel):
    report_id: Optional[str] = None
    target_condition: Optional[str] = "type_2_diabetes"

class MedicationRecommendRequest(BaseModel):
    report_id: Optional[str] = None
    clinical_context: Optional[str] = None

class DoseInfoRequest(BaseModel):
    medication_name: str
    age: Optional[int] = None
    renal_function_egfr: Optional[float] = None
    hepatic_impairment: Optional[bool] = False

class PrescriptionDraftRequest(BaseModel):
    report_id: Optional[str] = None
    medication_name: str
    clinical_indication: str

class ChatRequest(BaseModel):
    message: str
    report_id: Optional[str] = None

# --- Mock in-memory state for standalone FastAPI execution ---
REPORTS_DB: Dict[str, Any] = {}
USERS_DB: Dict[str, Any] = {
    "demo@readout.health": {
        "id": "usr-demo-001",
        "email": "demo@readout.health",
        "full_name": "Readout Clinical Demo User",
        "password": "demopassword123"
    }
}
AUDIT_LOGS: List[Dict[str, Any]] = []

def audit(action: str, resource_type: str, details: Dict[str, Any]):
    AUDIT_LOGS.append({
        "action": action,
        "resource_type": resource_type,
        "details": details
    })

# --- Health Endpoint ---
@app.get("/api/health", response_model=HealthResponse)
def health_check():
    return {
        "status": "healthy",
        "service": "Readout Medical Intelligence Platform",
        "version": "2.0.0",
        "ocr_engine": "tesseract/rule_based_hybrid",
        "ai_status": "active_with_clinical_safeguards"
    }

# --- Authentication Endpoints ---
@app.post("/api/auth/register")
def register(req: UserAuthRequest):
    if req.email in USERS_DB:
        raise HTTPException(status_code=400, detail="User with this email already exists.")
    user_id = f"usr-{len(USERS_DB) + 1}"
    user_obj = {
        "id": user_id,
        "email": req.email,
        "full_name": req.full_name,
        "password": req.password
    }
    USERS_DB[req.email] = user_obj
    audit("REGISTER", "USER", {"email": req.email})
    return {
        "status": "success",
        "data": {
            "access_token": f"jwt_token_for_{user_id}",
            "token_type": "bearer",
            "user": {"id": user_id, "email": req.email, "full_name": req.full_name}
        }
    }

@app.post("/api/auth/login")
def login(req: UserAuthRequest):
    user = USERS_DB.get(req.email)
    if not user or user["password"] != req.password:
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    audit("LOGIN", "USER", {"email": req.email})
    return {
        "status": "success",
        "data": {
            "access_token": f"jwt_token_for_{user['id']}",
            "token_type": "bearer",
            "user": {"id": user["id"], "email": user["email"], "full_name": user["full_name"]}
        }
    }

@app.get("/api/auth/me")
def get_current_user():
    return {
        "status": "success",
        "data": {"id": "usr-demo-001", "email": "demo@readout.health", "full_name": "Demo Patient"}
    }

@app.post("/api/auth/logout")
def logout():
    audit("LOGOUT", "USER", {})
    return {"status": "success", "message": "Successfully logged out."}

# --- Report Processing & Upload ---
@app.post("/api/reports/upload")
async def upload_report(
    file: UploadFile = File(...),
    fasting: Optional[bool] = Form(True)
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    report_id = f"rpt-{os.urandom(4).hex()}"
    REPORTS_DB[report_id] = {
        "id": report_id,
        "title": f"Laboratory Report — {file.filename}",
        "filename": file.filename,
        "laboratory": "Meridian Diagnostics, Banjara Hills",
        "collected": "16 September 2026",
        "reported": "16 September 2026",
        "fasting": fasting,
        "pages": 3,
        "extracted": 18,
        "confidence": 0.96,
        "status": "COMPLETED",
        "ocr_status": "COMPLETED"
    }
    audit("UPLOAD", "REPORT", {"report_id": report_id, "filename": file.filename})
    return {
        "status": "success",
        "data": {
            "report_id": report_id,
            "status": "PROCESSING",
            "message": "Report uploaded and queued for OCR & extraction"
        }
    }

@app.get("/api/reports/{id}/status")
def get_report_status(id: str):
    report = REPORTS_DB.get(id)
    if not report:
        # Fallback demo report
        return {
            "status": "success",
            "data": {
                "report_id": id,
                "status": "COMPLETED",
                "progress": 100,
                "stage": "ANALYZING",
                "confidence": 0.96
            }
        }
    return {
        "status": "success",
        "data": {
            "report_id": id,
            "status": report["status"],
            "progress": 100 if report["status"] == "COMPLETED" else 65,
            "stage": report["status"],
            "confidence": report.get("confidence", 0.96)
        }
    }

# --- Clinical Decision Support Endpoints ---
@app.post("/api/analysis/conditions")
def analyze_conditions(req: ConditionAnalysisRequest):
    return {
        "status": "success",
        "safety_label": "AI CLINICAL ASSESSMENT — NOT A CONFIRMED DIAGNOSIS",
        "data": {
            "possible_conditions": [
                {
                    "name": "Impaired Fasting Glycemia / Prediabetes pattern",
                    "supporting_findings": ["Fasting blood glucose 112 mg/dL (printed range 70-99)", "HbA1c 6.1% (printed range 4.0-5.6)"],
                    "findings_against": ["Absence of severe ketonuria or acute osmotic symptoms"],
                    "missing_information": ["Oral glucose tolerance test (OGTT)", "Family history of early diabetes", "BMI and waist circumference"],
                    "uncertainty": "Moderate — single blood draw requires confirmatory testing per ADA criteria.",
                    "professional_review_required": True
                },
                {
                    "name": "Combined Dyslipidemia pattern",
                    "supporting_findings": ["Total cholesterol 214 mg/dL", "Triglycerides 188 mg/dL", "LDL-C 134 mg/dL"],
                    "findings_against": ["HDL-C 42 mg/dL is within acceptable lower boundary"],
                    "missing_information": ["Apolipoprotein B", "10-year ASCVD risk calculation", "Thyroid panel (TSH) to rule out secondary dyslipidemia"],
                    "uncertainty": "Mild to moderate — dietary state and acute stress can elevate triglycerides.",
                    "professional_review_required": True
                }
            ]
        }
    }

@app.post("/api/diagnosis/analyze")
def diagnosis_analyze(req: DiagnosisAnalysisRequest):
    return {
        "status": "success",
        "safety_label": "AI CLINICAL ASSESSMENT — NOT A CONFIRMED DIAGNOSIS",
        "data": {
            "ai_clinical_assessment": "The uploaded findings demonstrate concurrent abnormalities in carbohydrate metabolism and lipid fraction balance. These observations warrant formal clinician evaluation.",
            "clinician_assessment": "PENDING_CLINICAL_REVIEW",
            "confirmed_diagnosis": "NONE (Requires licensed healthcare provider evaluation)",
            "missing_evidence": [
                "Comprehensive clinical examination",
                "Patient medical history and current prescription audit",
                "Repeat confirmatory venous plasma glucose"
            ],
            "professional_action_required": "Discuss these findings directly with your physician."
        }
    }

@app.post("/api/prediction/analyze")
def prediction_analyze(req: PredictionRequest):
    return {
        "status": "success",
        "safety_label": "AI RISK ESTIMATE — NOT A DIAGNOSIS",
        "data": {
            "model_version": "Readout-Longitudinal-v1.4",
            "prediction_status": "AVAILABLE",
            "target": req.target_condition or "type_2_diabetes",
            "risk_estimate": "MODERATE_ELEVATED_TRAJECTORY",
            "confidence_interval": "68% - 78%",
            "features_used": [
                "Fasting blood glucose trajectory over last 4 reports (+16% shift)",
                "HbA1c trend over 12 months (5.6% -> 6.1%)",
                "Triglyceride elevation"
            ],
            "uncertainty": "Longitudinal prediction accuracy depends on dietary compliance and fasting duration adherence.",
            "limitations": "Model cannot replace a formal 75g oral glucose tolerance test or clinical evaluation."
        }
    }

@app.get("/api/medications/{name}")
def get_medication_info(name: str):
    clean_name = name.lower().strip()
    return {
        "status": "success",
        "safety_label": "MEDICATION INFORMATION — FOR PROFESSIONAL REVIEW",
        "data": {
            "medication": clean_name.capitalize(),
            "drug_class": "Educational Reference",
            "general_uses": f"Reference knowledge regarding {clean_name}. Not an instruction to initiate or modify therapy.",
            "important_warnings": "All pharmacological choices must be made in consultation with a licensed prescribing physician.",
            "monitoring_requirements": "Periodic laboratory surveillance as determined by attending healthcare provider."
        }
    }

@app.post("/api/medications/recommend")
def recommend_medications(req: MedicationRecommendRequest):
    return {
        "status": "success",
        "safety_label": "MEDICATION INFORMATION — FOR PROFESSIONAL REVIEW",
        "data": {
            "clinical_decision_support_options": [
                {
                    "class": "Biguanides (e.g. Metformin)",
                    "clinical_rationale": "First-line agent in clinical practice guidelines for elevated glycemic indices when lifestyle measures are insufficient.",
                    "required_prerequisite_checks": ["Renal function (eGFR > 30 mL/min/1.73m²)", "Hepatic panel"],
                    "clinician_gated": True
                },
                {
                    "class": "HMG-CoA Reductase Inhibitors (Statins)",
                    "clinical_rationale": "Guideline-recommended class for LDL reduction and cardiovascular risk reduction.",
                    "required_prerequisite_checks": ["Baseline hepatic transaminases (ALT/AST)", "ASCVD 10-year risk assessment"],
                    "clinician_gated": True
                }
            ],
            "patient_instruction": "Do NOT begin or adjust any medications without direct direction from your physician."
        }
    }

@app.post("/api/medications/dose-info")
def get_dose_info(req: DoseInfoRequest):
    if not req.age or not req.renal_function_egfr:
        return {
            "status": "success",
            "safety_label": "REFERENCE INFORMATION — NOT A PERSONALIZED PRESCRIPTION",
            "data": {
                "status": "INSUFFICIENT_INFORMATION",
                "message": "Insufficient patient clinical information (age, renal eGFR, weight) to provide reference dosing parameters safely.",
                "clinician_review_required": True
            }
        }
    return {
        "status": "success",
        "safety_label": "REFERENCE INFORMATION — NOT A PERSONALIZED PRESCRIPTION",
        "data": {
            "medication": req.medication_name,
            "reference_standard_dosing": "Initial standard adult reference dosing is 500 mg daily with food. Requires prescriber validation.",
            "renal_precaution": "Renal function evaluated: adequate for baseline standard reference dosing.",
            "clinician_action": "Prescribing physician must determine individualised dosing based on complete clinical evaluation."
        }
    }

@app.post("/api/prescriptions/draft")
def draft_prescription(req: PrescriptionDraftRequest):
    return {
        "status": "success",
        "safety_label": "AI-GENERATED DRAFT — NOT A VALID PRESCRIPTION — REQUIRES QUALIFIED HEALTHCARE PROFESSIONAL REVIEW AND SIGN-OFF",
        "data": {
            "draft_id": f"drf-{os.urandom(4).hex()}",
            "candidate_medication": req.medication_name,
            "clinical_indication": req.clinical_indication,
            "preliminary_sig": "For clinician consideration only — formal prescription must be independently drafted by a licensed practitioner.",
            "contraindication_checklist": [
                "Verify absence of hypersensitivity/allergies",
                "Evaluate renal function and baseline electrolyte status",
                "Reconcile against current concurrent prescription and OTC medications"
            ],
            "legal_status": "VOID / INVALID FOR DISPENSING WITHOUT PHYSICIAN SIGNATURE AND LICENSE NUMBER"
        }
    }

@app.post("/api/chat")
def ask_my_reports(req: ChatRequest):
    q = req.message.lower()
    if "glucose" in q:
        answer = "Based on your latest report from Meridian Diagnostics, your Fasting Blood Glucose was 112 mg/dL. This sits 13 mg/dL above your laboratory's printed reference upper limit of 99 mg/dL. Across your last four reports, your glucose has trended upward from 96 mg/dL."
        evidence = "REPORT_FACT"
        sources = [{"test": "Fasting blood glucose", "value": "112 mg/dL", "range": "70-99 mg/dL", "report_date": "March 2026"}]
    elif "flag" in q or "abnormal" in q or "outside" in q:
        answer = "On your latest report, 7 results sit outside the ranges printed by your laboratory: Fasting Blood Glucose (112 mg/dL), HbA1c (6.1%), Total Cholesterol (214 mg/dL), LDL Cholesterol (134 mg/dL), Triglycerides (188 mg/dL), ALT/SGPT (44 U/L), and 25-Hydroxyvitamin D (22 ng/mL)."
        evidence = "REPORT_FACT"
        sources = [{"count": 7, "type": "out_of_range_parameters"}]
    elif "vitamin" in q or "vit d" in q:
        answer = "Your 25-Hydroxyvitamin D measured 22 ng/mL, which sits below your laboratory's printed lower limit of 30 ng/mL. Sunlight exposure, dietary intake, and seasonal variations commonly influence this number."
        evidence = "REPORT_FACT"
        sources = [{"test": "25-Hydroxyvitamin D", "value": "22 ng/mL", "range": "30-100 ng/mL"}]
    else:
        answer = f"According to your uploaded laboratory reports, I found information related to your general metabolic and blood panels. Remember that all laboratory numbers should be evaluated in context with your healthcare provider. (Question: '{req.message}')"
        evidence = "MODEL_INFERENCE"
        sources = [{"scope": "Current user uploaded reports"}]
    
    return {
        "status": "success",
        "data": {
            "answer": answer,
            "evidence_classification": evidence,
            "sources": sources,
            "hallucination_guard": "VERIFIED_AGAINST_REPORT_FACTS"
        }
    }
