import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data

def test_medical_safety_headers():
    response = client.get("/api/health")
    assert "X-Medical-Safety-Disclaimer" in response.headers
    assert "Readout flags results" in response.headers["X-Medical-Safety-Disclaimer"]

def test_auth_login():
    response = client.post("/api/auth/login", json={
        "email": "demo@readout.health",
        "password": "demopassword123"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "access_token" in data["data"]

def test_condition_analysis_safety_label():
    response = client.post("/api/analysis/conditions", json={})
    assert response.status_code == 200
    data = response.json()
    assert data["safety_label"] == "AI CLINICAL ASSESSMENT — NOT A CONFIRMED DIAGNOSIS"
    assert len(data["data"]["possible_conditions"]) > 0

def test_diagnosis_analysis_safety():
    response = client.post("/api/diagnosis/analyze", json={})
    assert response.status_code == 200
    data = response.json()
    assert "NOT A CONFIRMED DIAGNOSIS" in data["safety_label"]
    assert data["data"]["confirmed_diagnosis"].startswith("NONE")

def test_prescription_draft_safeguards():
    response = client.post("/api/prescriptions/draft", json={
        "medication_name": "Metformin",
        "clinical_indication": "Elevated fasting blood glucose"
    })
    assert response.status_code == 200
    data = response.json()
    assert "NOT A VALID PRESCRIPTION" in data["safety_label"]
    assert "VOID / INVALID FOR DISPENSING" in data["data"]["legal_status"]

def test_dosage_insufficient_information_safety():
    response = client.post("/api/medications/dose-info", json={
        "medication_name": "Metformin"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["data"]["status"] == "INSUFFICIENT_INFORMATION"

def test_chat_grounded_response():
    response = client.post("/api/chat", json={
        "message": "What was my latest glucose reading?"
    })
    assert response.status_code == 200
    data = response.json()
    assert "112" in data["data"]["answer"]
    assert data["data"]["evidence_classification"] == "REPORT_FACT"
