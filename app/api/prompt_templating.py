from fastapi import APIRouter
from pydantic import BaseModel
from app.utils.prompt_templating import apply_prompt_template
from typing import Dict

router = APIRouter()

class PromptTemplateRequest(BaseModel):
    template: str
    macros: Dict[str, str]

class PromptTemplateResponse(BaseModel):
    result: str

@router.post("/prompt_template", response_model=PromptTemplateResponse)
def prompt_template_endpoint(req: PromptTemplateRequest):
    result = apply_prompt_template(req.template, req.macros)
    return PromptTemplateResponse(result=result)
