import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)

from fastapi import FastAPI
from app.api import nlq, prompt_set, prompt_component, llm_config, validation_run, generated_result, run_details, prompt_templating, evaluate
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(nlq.router)

app.include_router(prompt_set.router)
app.include_router(prompt_component.router)
app.include_router(llm_config.router)
app.include_router(validation_run.router)
app.include_router(generated_result.router)
app.include_router(run_details.router)
app.include_router(prompt_templating.router)
app.include_router(evaluate.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to System1 NLQ2SQL Evaluator!"}
