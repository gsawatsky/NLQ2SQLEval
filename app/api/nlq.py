from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.database import SessionLocal
from app.models import core
from app.schemas import NLQCreate, NLQRead
from typing import List

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/nlqs", response_model=NLQRead)
def create_nlq(nlq_in: NLQCreate, db: Session = Depends(get_db)):
    # Create BaselineSQL if needed
    baseline_sql = core.BaselineSQL(sql_text=nlq_in.baseline_sql_text)
    db.add(baseline_sql)
    db.flush()  # Get ID
    nlq = core.NLQ(nlq_text=nlq_in.nlq_text, baseline_sql_id=baseline_sql.id)
    db.add(nlq)
    db.commit()
    db.refresh(nlq)
    return nlq

@router.get("/nlqs", response_model=List[NLQRead])
def list_nlqs(db: Session = Depends(get_db)):
    nlqs = db.query(core.NLQ).all()
    return nlqs
