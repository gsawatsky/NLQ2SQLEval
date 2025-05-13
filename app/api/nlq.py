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
    nlq = core.NLQ(nlq_text=nlq_in.nlq_text)
    db.add(nlq)
    db.commit()
    db.refresh(nlq)
    return nlq

@router.get("/nlqs", response_model=List[NLQRead])
def list_nlqs(db: Session = Depends(get_db)):
    nlqs = db.query(core.NLQ).all()
    return nlqs

@router.get("/nlqs/search", response_model=List[NLQRead])
def search_nlq_by_text(nlq_text: str, db: Session = Depends(get_db)):
    matches = db.query(core.NLQ).filter(core.NLQ.nlq_text.ilike(nlq_text + "%")).all()
    return matches
