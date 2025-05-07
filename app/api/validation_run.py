from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.database import SessionLocal
from app.models import core
from app.schemas import ValidationRunCreate, ValidationRunRead
from typing import List

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/validation_runs", response_model=ValidationRunRead)
def create_validation_run(run_in: ValidationRunCreate, db: Session = Depends(get_db)):
    run = core.ValidationRun(
        timestamp=run_in.timestamp,
        selected_llm_config_ids=run_in.selected_llm_config_ids,
        selected_prompt_set_ids=run_in.selected_prompt_set_ids,
        selected_nlq_ids=run_in.selected_nlq_ids
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return run

@router.get("/validation_runs", response_model=List[ValidationRunRead])
def list_validation_runs(db: Session = Depends(get_db)):
    return db.query(core.ValidationRun).all()
