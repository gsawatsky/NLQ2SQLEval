from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.database import SessionLocal
from app.models import core
from app.schemas import LLMConfigCreate, LLMConfigRead
from typing import List

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/llm_configs", response_model=LLMConfigRead)
def create_llm_config(llm_config_in: LLMConfigCreate, db: Session = Depends(get_db)):
    llm_config = core.LLMConfig(**llm_config_in.dict())
    db.add(llm_config)
    db.commit()
    db.refresh(llm_config)
    return llm_config

@router.get("/llm_configs", response_model=List[LLMConfigRead])
def list_llm_configs(db: Session = Depends(get_db)):
    return db.query(core.LLMConfig).all()
