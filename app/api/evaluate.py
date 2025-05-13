from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.database import SessionLocal, SQLALCHEMY_DATABASE_URL
from app.models import core
from app.schemas import EvaluateRunRequest, EvaluateRunResponse, ValidationRunRead
from typing import List
from datetime import datetime
from app.utils import file_readers
import logging
import json
import requests
import time

logger = logging.getLogger("evaluate")

GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta"

def call_gemini_llm(prompt: str, llm_config):
    url = f"{GEMINI_API_BASE_URL}/models/{llm_config.model}:generateContent?key={llm_config.api_key}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}]
    }
    # Add default parameters if present
    if llm_config.default_parameters:
        payload.update(llm_config.default_parameters)
    headers = {"Content-Type": "application/json"}
    # Log the full request details
    logger.info(f"LLM API call URL: {url}")
    logger.info(f"LLM API call payload: {json.dumps(payload, indent=2)}")
    logger.info(f"LLM API call full prompt:\n{prompt}")
    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=60)
        resp.raise_for_status()
        data = resp.json()
        # Gemini returns generated text in a nested structure
        return data['candidates'][0]['content']['parts'][0]['text']
    except Exception as e:
        logger.error(f"Gemini API error: {e}")
        return f"-- GEMINI ERROR: {str(e)}"

router = APIRouter()

from fastapi import Body

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/explain_query")
def explain_query(
    baseline_sql: str = Body(..., embed=True),
    generated_sql: str = Body(..., embed=True),
    llm_config_id: int = Body(..., embed=True),
    db: Session = Depends(get_db)
):
    """
    Explains a generated SQL query and compares it with the baseline SQL using Gemini LLM.
    """
    llm = db.query(core.LLMConfig).filter(core.LLMConfig.id == llm_config_id).first()
    if not llm:
        raise HTTPException(status_code=404, detail="LLM config not found")
    prompt = (
        "Can you provide a concise yet precise explanation of the following query for business stakeholders? "
        "Explain any filters and calculations.\n\n"
        "SQL Query (Generated):\n" + generated_sql +
        "\n\n" + "-"*60 + "\n\n" +
        "Now, compare the semantics of the following two queries. Are they equivalent? If not, what are the key differences and what would be the business impact?\n\n"
        "Baseline SQL:\n" + baseline_sql +
        "\n\nGenerated SQL:\n" + generated_sql
    )
    explanation = call_gemini_llm(prompt, llm)
    return {"explanation": explanation}

@router.post("/evaluate/run", response_model=EvaluateRunResponse)
def evaluate_run(req: EvaluateRunRequest, db: Session = Depends(get_db)):
    try:
        logger.info(f"Starting evaluation run. NLQ IDs: {req.nlq_ids}, Prompt Set IDs: {req.prompt_set_ids}, LLM Config IDs: {req.llm_config_ids}")
        logger.info(f"Database path: {SQLALCHEMY_DATABASE_URL}")
        logger.info(f"Using database file: {SQLALCHEMY_DATABASE_URL.split(':///')[-1]}")
        run = core.ValidationRun(
            timestamp=datetime.utcnow(),
            parameters={
                "llm_config_ids": req.llm_config_ids,
                "prompt_set_ids": req.prompt_set_ids,
                "nlq_ids": req.nlq_ids
            }
        )
        db.add(run)
        db.commit()
        db.refresh(run)

        for nlq_id in req.nlq_ids:
            nlq = db.query(core.NLQ).filter(core.NLQ.id == nlq_id).first()
            if not nlq:
                logger.warning(f"NLQ id {nlq_id} not found.")
                continue
            logger.info(f"Evaluating NLQ id {nlq_id}: {getattr(nlq, 'nlq_text', None)}")
            for prompt_set_id in req.prompt_set_ids:
                logger.info(f"  Using prompt set {prompt_set_id}")
                # --- Refactor: Use load_prompt_set_by_name to load prompt with macros and includes ---
                prompt_set = db.query(core.PromptSet).filter(core.PromptSet.id == prompt_set_id).first()
                if not prompt_set:
                    logger.warning(f"PromptSet id {prompt_set_id} not found.")
                    continue
                prompt_sets_base_dir = "prompt_sets"  # Adjust this path as needed for your deployment
                prompt_set_name = prompt_set.name
                macros = {
                    "NLQ": nlq.nlq_text,
                    "BASELINE_SQL": "",
                    # Add more as needed
                }
                try:
                    full_prompt = file_readers.load_prompt_set_by_name(prompt_set_name, prompt_sets_base_dir, macros)
                except Exception as e:
                    logger.error(f"Error constructing prompt for PromptSet {prompt_set_name}: {e}")
                    full_prompt = f"[Prompt construction error: {e}]"
                for llm_config_id in req.llm_config_ids:
                    llm = db.query(core.LLMConfig).filter(core.LLMConfig.id == llm_config_id).first()
                    logger.info(f"    Calling LLM {llm.name} (model: {llm.model}) for NLQ {nlq_id} and Prompt Set {prompt_set_id}")
                    try:
                        llm_response_time_ms = None
                        if llm.model.startswith("gemini"):
                            start = time.perf_counter()
                            generated_sql = call_gemini_llm(full_prompt, llm)
                            end = time.perf_counter()
                            llm_response_time_ms = int((end - start) * 1000)
                        else:
                            generated_sql = f"SELECT 1; -- MOCK SQL for NLQ: {nlq.nlq_text} / LLM: {llm.name} / PromptSet: {prompt_set_id}"
                            llm_response_time_ms = 0
                        # Do not prepend any comment block here. Comment block will be added after result.id is known.
                        logger.info(f"    Generated SQL: {generated_sql[:80]}{'...' if len(generated_sql) > 80 else ''}")
                    except Exception as llm_exc:
                        logger.error(f"    Error calling LLM: {llm_exc}")
                        generated_sql = f"-- ERROR: {llm_exc}"
                        llm_response_time_ms = 0
                    result = core.GeneratedResult(
                        validation_run_id=run.id,
                        nlq_id=nlq.id,
                        prompt_set_id=prompt_set_id,
                        prompt_component_id=None,
                        llm_config_id=llm.id,
                        generated_sql=generated_sql,
                        full_prompt=full_prompt,
                        human_evaluation_tag="",  # Use empty string for safety
                        comments="",  # Use empty string for safety
                        llm_response_time_ms=llm_response_time_ms
                    )
                    db.add(result)
        db.commit()
        # After commit, update each result to prepend the single, final comment block with NLQ, Prompt/Model, Unique ID, and Result ID
        results = db.query(core.GeneratedResult).filter(core.GeneratedResult.validation_run_id == run.id).all()
        import random, string
        for result in results:
            nlq = db.query(core.NLQ).filter(core.NLQ.id == result.nlq_id).first()
            prompt_set = db.query(core.PromptSet).filter(core.PromptSet.id == result.prompt_set_id).first()
            llm = db.query(core.LLMConfig).filter(core.LLMConfig.id == result.llm_config_id).first()
            unique_id = ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))
            sql_comment = f"-- NLQ: {nlq.nlq_text}\n-- Prompt/Model: {prompt_set.name} / {llm.name}\n-- Unique ID: {unique_id}\n-- Result ID: {result.id}\n\n"
            # Remove any previous similar comment block if present
            sql_lines = result.generated_sql.splitlines()
            # Remove lines that look like our comment block (start with -- NLQ:, -- Prompt/Model:, -- Unique ID:, -- Result ID:)
            filtered_sql_lines = []
            skipping = True
            for line in sql_lines:
                if skipping and (line.startswith('-- NLQ:') or line.startswith('-- Prompt/Model:') or line.startswith('-- Unique ID:') or line.startswith('-- Result ID:')):
                    continue
                else:
                    skipping = False
                    filtered_sql_lines.append(line)
            new_generated_sql = sql_comment + '\n'.join(filtered_sql_lines).lstrip('\n')
            result.generated_sql = new_generated_sql
        db.commit()
        logger.info(f"Evaluation run {run.id} completed.")
        return EvaluateRunResponse(run_id=run.id)
    except Exception as e:
        logger.exception("Error in evaluate_run orchestration")
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {str(e)}")
