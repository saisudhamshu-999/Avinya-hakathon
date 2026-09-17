from typing import List, Optional, Any, Dict
from pydantic import BaseModel
from datetime import datetime

class UserBase(BaseModel):
    email: str
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class LabResultBase(BaseModel):
    original_test_name: str
    normalized_test_name: str
    abbreviation: Optional[str] = None
    group_name: str
    value: Optional[float] = None
    unit: Optional[str] = None
    reference_low: Optional[float] = None
    reference_high: Optional[float] = None
    reference_text: Optional[str] = None
    status: str = "unknown"
    direction: Optional[str] = None
    what_it_measures: Optional[str] = None
    reading_explanation: Optional[str] = None
    influences: Optional[str] = None
    clinical_prompt: Optional[str] = None
    medical_terms: Optional[str] = None
    confidence: Optional[float] = None
    is_verified: bool = False

class LabResultVerify(BaseModel):
    normalized_test_name: Optional[str] = None
    value: Optional[float] = None
    unit: Optional[str] = None
    reference_low: Optional[float] = None
    reference_high: Optional[float] = None
    reference_text: Optional[str] = None

class ReportResponse(BaseModel):
    id: str
    title: str
    laboratory: Optional[str] = None
    collection_date: Optional[str] = None
    reported_date: Optional[str] = None
    is_fasting: bool
    page_count: int
    status: str
    confidence_score: Optional[float] = None
    created_at: datetime
    results: List[LabResultBase] = []

    class Config:
        from_attributes = True

class ApiResponse(BaseModel):
    status: str = "success"
    data: Any
    warnings: List[str] = []
    needs_verification: bool = False
