from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.database import SessionLocal
from app.models import core
from app.schemas import PromptSetCreate, PromptSetRead
from typing import List

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/prompt_sets", response_model=PromptSetRead)
def create_prompt_set(prompt_set_in: PromptSetCreate, db: Session = Depends(get_db)):
    prompt_set = core.PromptSet(**prompt_set_in.dict())
    db.add(prompt_set)
    db.commit()
    db.refresh(prompt_set)
    return prompt_set

@router.get("/prompt_sets", response_model=List[PromptSetRead])
def list_prompt_sets(db: Session = Depends(get_db)):
    return db.query(core.PromptSet).all()
