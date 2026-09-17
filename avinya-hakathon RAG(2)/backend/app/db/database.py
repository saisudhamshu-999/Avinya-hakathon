from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.app.core.config import settings

# Fallback to in-memory SQLite if PostgreSQL is not available locally
database_url = settings.DATABASE_URL
if "postgresql" in database_url:
    try:
        engine = create_engine(database_url, pool_pre_ping=True)
    except Exception:
        database_url = "sqlite:///./readout.db"
        engine = create_engine(database_url, connect_args={"check_same_thread": False})
else:
    engine = create_engine(database_url, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
