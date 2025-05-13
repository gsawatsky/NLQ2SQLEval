from fastapi import APIRouter, Depends, HTTPException
from app.api.nlq import get_db
from fastapi import Body
from sqlalchemy.orm import Session
from app.database.database import SessionLocal
from app.models import core
from app.schemas import GeneratedResultCreate, GeneratedResultRead
from typing import List
from pydantic import BaseModel

router = APIRouter()

@router.get("/nlqs/{nlq_id}/baseline_sql", response_model=GeneratedResultRead)
def get_baseline_sql_for_nlq(nlq_id: int, db: Session = Depends(get_db)):
    # Try to fetch the baseline
    baseline = db.query(core.GeneratedResult).filter(
        core.GeneratedResult.nlq_id == nlq_id,
        core.GeneratedResult.is_baseline == True
    ).order_by(core.GeneratedResult.id.desc()).first()
    if baseline:
        return baseline
    # Fallback: latest 'Correct'
    correct = db.query(core.GeneratedResult).filter(
        core.GeneratedResult.nlq_id == nlq_id,
        core.GeneratedResult.human_evaluation_tag == "Correct"
    ).order_by(core.GeneratedResult.id.desc()).first()
    if correct:
        return correct
    raise HTTPException(status_code=404, detail="No baseline or correct SQL found for this NLQ.")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class GeneratedResultUpdate(BaseModel):
    human_evaluation_tag: str = None
    comments: str = None

@router.post("/generated_results", response_model=GeneratedResultRead)
def create_generated_result(result_in: GeneratedResultCreate, db: Session = Depends(get_db)):
    result = core.GeneratedResult(**result_in.dict())
    db.add(result)
    db.commit()
    db.refresh(result)
    return result

@router.get("/generated_results", response_model=List[GeneratedResultRead])
def list_generated_results(db: Session = Depends(get_db)):
    return db.query(core.GeneratedResult).all()

@router.put("/generated_results/{result_id}", response_model=GeneratedResultRead)
def update_generated_result(result_id: int, update: GeneratedResultUpdate = Body(...), db: Session = Depends(get_db)):
    result = db.query(core.GeneratedResult).filter(core.GeneratedResult.id == result_id).first()
    if not result:
        raise HTTPException(status_code=404, detail="GeneratedResult not found")
    if update.human_evaluation_tag is not None:
        result.human_evaluation_tag = update.human_evaluation_tag
        # Baseline logic
        if update.human_evaluation_tag == "Correct and use as new baseline":
            # Set this result as baseline, unset for others for same NLQ
            db.query(core.GeneratedResult).filter(
                core.GeneratedResult.nlq_id == result.nlq_id
            ).update({core.GeneratedResult.is_baseline: False})
            result.is_baseline = True
        elif update.human_evaluation_tag == "Correct":
            result.is_baseline = False
    if update.comments is not None:
        result.comments = update.comments
    db.commit()
    db.refresh(result)
    return result
