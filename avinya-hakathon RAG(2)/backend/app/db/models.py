import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, Float, Integer, ForeignKey, Text, JSON, DateTime
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

def generate_uuid():
    return str(uuid.uuid4())

def utc_now():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    reports = relationship("Report", back_populates="owner", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")

class Report(Base):
    __tablename__ = "reports"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    laboratory = Column(String(255), nullable=True)
    collection_date = Column(String(100), nullable=True)
    reported_date = Column(String(100), nullable=True)
    is_fasting = Column(Boolean, default=False)
    page_count = Column(Integer, default=1)
    status = Column(String(50), default="UPLOADED") # UPLOADED, PROCESSING, OCR, EXTRACTING, VALIDATING, ANALYZING, COMPLETED, FAILED, NEEDS_VERIFICATION
    confidence_score = Column(Float, nullable=True)
    file_path = Column(String(500), nullable=False)
    raw_ocr_text = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    owner = relationship("User", back_populates="reports")
    results = relationship("LabResult", back_populates="report", cascade="all, delete-orphan")
    patterns = relationship("ReportPattern", back_populates="report", cascade="all, delete-orphan")

class LabResult(Base):
    __tablename__ = "lab_results"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    report_id = Column(String(36), ForeignKey("reports.id"), nullable=False)
    original_test_name = Column(String(255), nullable=False)
    normalized_test_name = Column(String(255), nullable=False)
    abbreviation = Column(String(50), nullable=True)
    group_name = Column(String(100), nullable=False)
    value = Column(Float, nullable=True)
    raw_value_text = Column(String(100), nullable=True)
    unit = Column(String(50), nullable=True)
    normalized_unit = Column(String(50), nullable=True)
    reference_low = Column(Float, nullable=True)
    reference_high = Column(Float, nullable=True)
    reference_text = Column(String(255), nullable=True)
    status = Column(String(20), default="unknown") # in, out, unknown
    direction = Column(String(20), nullable=True) # above, below, within
    what_it_measures = Column(Text, nullable=True)
    reading_explanation = Column(Text, nullable=True)
    influences = Column(Text, nullable=True)
    clinical_prompt = Column(Text, nullable=True)
    medical_terms = Column(Text, nullable=True)
    extraction_method = Column(String(50), default="ocr_regex")
    confidence = Column(Float, nullable=True)
    is_verified = Column(Boolean, default=False)
    verified_by = Column(String(36), nullable=True)
    verified_at = Column(DateTime, nullable=True)

    report = relationship("Report", back_populates="results")

class ReportPattern(Base):
    __tablename__ = "report_patterns"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    report_id = Column(String(36), ForeignKey("reports.id"), nullable=False)
    pattern_name = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    involves = Column(JSON, default=list) # List of test IDs or abbreviations
    clinical_prompt = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    report = relationship("Report", back_populates="patterns")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)
    resource_type = Column(String(50), nullable=False)
    resource_id = Column(String(36), nullable=True)
    details = Column(JSON, default=dict)
    ip_address = Column(String(50), nullable=True)
    timestamp = Column(DateTime, default=utc_now)

    user = relationship("User", back_populates="audit_logs")
