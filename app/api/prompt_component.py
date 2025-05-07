from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.database import SessionLocal
from app.models import core
from app.schemas import PromptComponentCreate, PromptComponentRead
from typing import List

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/prompt_components", response_model=PromptComponentRead)
def create_prompt_component(prompt_component_in: PromptComponentCreate, db: Session = Depends(get_db)):
    prompt_component = core.PromptComponent(**prompt_component_in.dict())
    db.add(prompt_component)
    db.commit()
    db.refresh(prompt_component)
    return prompt_component

@router.get("/prompt_components", response_model=List[PromptComponentRead])
def list_prompt_components(db: Session = Depends(get_db)):
    return db.query(core.PromptComponent).all()
