# Make the services directory a Python package
from .llm_service import LLMService, llm_service

__all__ = ['LLMService', 'llm_service']
