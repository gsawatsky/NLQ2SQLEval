from pydantic import BaseModel
from typing import Optional, List





class NLQCreate(BaseModel):
    nlq_text: str

class NLQRead(BaseModel):
    id: int
    nlq_text: str
    class Config:
        from_attributes = True

class LLMConfigCreate(BaseModel):
    name: str
    api_key: str
    model: str
    default_parameters: Optional[dict] = None

class LLMConfigRead(BaseModel):
    id: int
    name: str
    api_key: str
    model: str
    default_parameters: Optional[dict] = None
    class Config:
        from_attributes = True

class PromptComponentCreate(BaseModel):
    name: str
    type: str
    content: str
    file_reference: Optional[str]

class PromptComponentRead(BaseModel):
    id: int
    name: str
    type: str
    content: str
    file_reference: Optional[str]
    class Config:
        from_attributes = True

class PromptSetCreate(BaseModel):
    name: str
    description: str

class PromptSetRead(BaseModel):
    id: int
    name: str
    description: str
    class Config:
        from_attributes = True

class GeneratedResultCreate(BaseModel):
    generated_sql: str
    full_prompt: str
    validation_run_id: int
    nlq_id: int
    prompt_set_id: int
    llm_config_id: int
    human_eval_tag: str = ""
    comments: str = ""
    llm_response_time_ms: int = 0

class GeneratedResultRead(BaseModel):
    id: int
    generated_sql: str
    full_prompt: str
    validation_run_id: int
    nlq_id: int
    prompt_set_id: int
    llm_config_id: int
    human_eval_tag: Optional[str] = ""
    comments: Optional[str] = ""
    llm_response_time_ms: Optional[int] = 0
    class Config:
        from_attributes = True

class GeneratedResultReadFull(BaseModel):
    id: int
    generated_sql: str
    full_prompt: str
    validation_run_id: int
    nlq_id: int
    prompt_set_id: int
    llm_config_id: int
    human_eval_tag: Optional[str] = ""
    comments: Optional[str] = ""
    llm_response_time_ms: Optional[int] = 0
    class Config:
        from_attributes = True

class ValidationRunCreate(BaseModel):
    timestamp: str
    selected_llm_config_ids: List[int]
    selected_prompt_set_ids: List[int]
    selected_nlq_ids: List[int]

class ValidationRunRead(BaseModel):
    id: int
    timestamp: str
    selected_llm_config_ids: List[int]
    selected_prompt_set_ids: List[int]
    selected_nlq_ids: List[int]
    class Config:
        from_attributes = True

class ValidationRunWithResults(BaseModel):
    id: int
    timestamp: str
    selected_llm_config_ids: List[int]
    selected_prompt_set_ids: List[int]
    selected_nlq_ids: List[int]
    generated_results: List[GeneratedResultReadFull]
    class Config:
        from_attributes = True

class EvaluateRunRequest(BaseModel):
    nlq_ids: List[int]
    prompt_set_ids: List[int]
    llm_config_ids: List[int]

class EvaluateRunResponse(BaseModel):
    run_id: int
