from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.database import SessionLocal
from app.models import core
from app.schemas import BaselineSQLCreate, BaselineSQLRead
from typing import List

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/baseline_sqls", response_model=BaselineSQLRead)
def create_baseline_sql(baseline_sql_in: BaselineSQLCreate, db: Session = Depends(get_db)):
    baseline_sql = core.BaselineSQL(sql_text=baseline_sql_in.sql_text)
    db.add(baseline_sql)
    db.commit()
    db.refresh(baseline_sql)
    return baseline_sql

@router.get("/baseline_sqls", response_model=List[BaselineSQLRead])
def list_baseline_sqls(db: Session = Depends(get_db)):
    return db.query(core.BaselineSQL).all()
