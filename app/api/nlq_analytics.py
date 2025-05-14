from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Any, List, Optional
import sqlite3
import re
import os
from sqlalchemy.orm import Session
from app.database.database import SessionLocal
from app.models import core
from app.api.evaluate import call_gemini_llm  # or your actual LLM call function
from app.api.prompt_templating import apply_prompt_template  # or actual template function

DB_PATH = os.path.join(os.path.dirname(__file__), '../nlq2sql_eval.db')

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Request/Response Models ---
class GenerateSqlRequest(BaseModel):
    nlq: str
    prompt_set_id: int
    llm_config_id: int

class GenerateSqlResponse(BaseModel):
    sql: Optional[str]
    llm_response: Optional[str]
    error: Optional[str]

class ExecuteSqlRequest(BaseModel):
    sql: str

class ExecuteSqlResponse(BaseModel):
    columns: List[str]
    rows: List[Any]
    error: Optional[str]

# --- Endpoint: Generate SQL ---
@router.post('/api/nlq-analytics/generate-sql', response_model=GenerateSqlResponse)
def generate_sql(req: GenerateSqlRequest, db: Session = Depends(get_db)):
    try:
        prompt_set = db.query(core.PromptSet).filter(core.PromptSet.id == req.prompt_set_id).first()
        llm_config = db.query(core.LLMConfig).filter(core.LLMConfig.id == req.llm_config_id).first()
        if not prompt_set or not llm_config:
            return GenerateSqlResponse(sql=None, llm_response=None, error="Invalid prompt set or LLM config")
        # Prepare macros for prompt template
        macros = {
            "NLQ": req.nlq,
            # Add more macros as needed, e.g. schema
        }
        prompt_sets_base_dir = "prompt_sets"  # Match the main UI logic
        prompt_set_name = prompt_set.name
        try:
            prompt = __import__('app.utils.file_readers', fromlist=['load_prompt_set_by_name']).load_prompt_set_by_name(
                prompt_set_name, prompt_sets_base_dir, macros
            )
        except Exception as e:
            return GenerateSqlResponse(sql=None, llm_response=None, error=f"Prompt construction error: {e}")
        # Call LLM (reuse your actual LLM call function)
        llm_response = call_gemini_llm(prompt, llm_config)
        sql = llm_response.strip()
        if sql.lower().startswith("cannot formulate"):
            return GenerateSqlResponse(sql=None, llm_response=llm_response, error=sql)
        return GenerateSqlResponse(sql=sql, llm_response=llm_response, error=None)
    except Exception as e:
        return GenerateSqlResponse(sql=None, llm_response=None, error=str(e))

# --- Endpoint: Execute SQL ---
@router.post('/api/nlq-analytics/execute-sql', response_model=ExecuteSqlResponse)
def execute_sql(req: ExecuteSqlRequest):
    import logging
    logger = logging.getLogger("nlq_analytics")
    sql = req.sql.strip()
    logger.info(f"[NLQ Analytics] Incoming SQL: {sql}")
    # Only allow SELECT queries, ignoring leading comments and blank lines
    def strip_leading_comments(sql: str) -> str:
        lines = sql.splitlines()
        for i, line in enumerate(lines):
            striped = line.strip()
            if striped and not striped.startswith('--'):
                return '\n'.join(lines[i:]).lstrip()
        return ''
    # Allow any SQL (except empty string); user is responsible for correctness
    if not sql.strip():
        logger.error("[NLQ Analytics] Empty SQL string.")
        return ExecuteSqlResponse(columns=[], rows=[], error="SQL query is empty.")
    try:
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        cur.execute(sql)
        columns = [desc[0] for desc in cur.description]
        rows = cur.fetchall()
        logger.info(f"[NLQ Analytics] Columns: {columns}")
        logger.info(f"[NLQ Analytics] Number of rows returned: {len(rows)}")
        conn.close()
        return ExecuteSqlResponse(columns=columns, rows=rows, error=None)
    except Exception as e:
        logger.error(f"[NLQ Analytics] SQL execution error: {e}")
        return ExecuteSqlResponse(columns=[], rows=[], error=str(e))
