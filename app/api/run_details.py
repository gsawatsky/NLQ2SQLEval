from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.database import SessionLocal
from app.models import core
from app.schemas import ValidationRunWithResults, GeneratedResultReadFull
from typing import List

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/runs/{run_id}", response_model=ValidationRunWithResults)
def get_run_details(run_id: int, db: Session = Depends(get_db)):
    run = db.query(core.ValidationRun).filter(core.ValidationRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="ValidationRun not found")
    results = db.query(core.GeneratedResult).filter(core.GeneratedResult.validation_run_id == run_id).all()
    # Convert to Pydantic models
    results_data = [GeneratedResultReadFull.from_orm(r) for r in results]
    return ValidationRunWithResults(
        id=run.id,
        timestamp=run.timestamp.isoformat() if run.timestamp else None,
        selected_llm_config_ids=run.parameters.get("llm_config_ids", []),
        selected_prompt_set_ids=run.parameters.get("prompt_set_ids", []),
        selected_nlq_ids=run.parameters.get("nlq_ids", []),
        generated_results=results_data
    )
