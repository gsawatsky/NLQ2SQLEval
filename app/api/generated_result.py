from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from app.database.database import SessionLocal
from app.models import core
from app.schemas import GeneratedResultCreate, GeneratedResultRead
from typing import List
from pydantic import BaseModel

router = APIRouter()

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
    if update.comments is not None:
        result.comments = update.comments
    db.commit()
    db.refresh(result)
    return result
