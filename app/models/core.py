from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, JSON, Boolean
from sqlalchemy.orm import relationship
from app.database.database import Base
import datetime

class NLQ(Base):
    __tablename__ = "nlqs"
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True, index=True)
    nlq_text = Column(Text, nullable=False)
    generated_results = relationship("GeneratedResult", back_populates="nlq")

class LLMConfig(Base):
    __tablename__ = "llm_configs"
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    api_key = Column(String, nullable=False)  # Store securely in production!
    model = Column(String, nullable=False)
    default_parameters = Column(JSON, nullable=True)
    generated_results = relationship("GeneratedResult", back_populates="llm_config")
    validation_runs = relationship("ValidationRun", back_populates="llm_config")

class PromptComponent(Base):
    __tablename__ = "prompt_components"
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=True)  # e.g., 'system', 'semantic_layer', etc.
    content = Column(Text, nullable=True) # Could be text or a file reference
    prompt_sets = relationship("PromptSetComponent", back_populates="prompt_component")

class PromptSet(Base):
    __tablename__ = "prompt_sets"
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    components = relationship("PromptSetComponent", back_populates="prompt_set")
    validation_runs = relationship("ValidationRun", back_populates="prompt_set")

class PromptSetComponent(Base):
    __tablename__ = "prompt_set_components"
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True, index=True)
    prompt_set_id = Column(Integer, ForeignKey("prompt_sets.id"))
    prompt_component_id = Column(Integer, ForeignKey("prompt_components.id"))
    prompt_set = relationship("PromptSet", back_populates="components")
    prompt_component = relationship("PromptComponent", back_populates="prompt_sets")

class ValidationRun(Base):
    __tablename__ = "validation_runs"
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    llm_config_id = Column(Integer, ForeignKey("llm_configs.id"))
    prompt_set_id = Column(Integer, ForeignKey("prompt_sets.id"))
    nlq_id = Column(Integer, ForeignKey("nlqs.id"))
    parameters = Column(JSON, nullable=True)
    llm_config = relationship("LLMConfig", back_populates="validation_runs")
    prompt_set = relationship("PromptSet", back_populates="validation_runs")
    nlq = relationship("NLQ")
    generated_results = relationship("GeneratedResult", back_populates="validation_run")

class GeneratedResult(Base):
    __tablename__ = "generated_results"
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True, index=True)
    validation_run_id = Column(Integer, ForeignKey("validation_runs.id"))
    nlq_id = Column(Integer, ForeignKey("nlqs.id"))
    prompt_component_id = Column(Integer, ForeignKey("prompt_components.id"), nullable=True)
    llm_config_id = Column(Integer, ForeignKey("llm_configs.id"), nullable=True)
    prompt_set_id = Column(Integer, ForeignKey("prompt_sets.id"), nullable=False)
    prompt_set = relationship("PromptSet")
    generated_sql = Column(Text, nullable=False)
    full_prompt = Column(Text, nullable=False)
    human_evaluation_tag = Column(String, nullable=True)
    comments = Column(Text, nullable=True)
    llm_response_time_ms = Column(Integer, nullable=True)  # Time in milliseconds for LLM response
    is_baseline = Column(Boolean, nullable=False, default=False)
    validation_run = relationship("ValidationRun", back_populates="generated_results")
    nlq = relationship("NLQ", back_populates="generated_results")
    llm_config = relationship("LLMConfig", back_populates="generated_results")
    prompt_component = relationship("PromptComponent")
