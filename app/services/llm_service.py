import os
import time
from typing import Dict, Any, Optional, Tuple
import litellm
from litellm import completion, acompletion
from app.models.core import LLMConfig
import logging
import google.generativeai as genai

logger = logging.getLogger(__name__)

class LLMService:
    """
    A service class to handle LLM calls.
    Supports both synchronous and asynchronous operations.
    """
    
    def __init__(self):
        # Configure LiteLLM with default settings
        litellm.set_verbose = True
        
    def _get_litellm_model_name(self, config: LLMConfig) -> str:
        """
        Convert our config to LiteLLM model name format.
        Format: {provider}/{model_name}
        """
        if config.provider == LLMConfig.PROVIDER_GEMINI:
            return f"{config.model}"  # For Gemini, just use the model name directly
        elif config.provider == LLMConfig.PROVIDER_OPENAI:
            return f"{config.provider}/{config.model}"
        elif config.provider == LLMConfig.PROVIDER_ANTHROPIC:
            return f"{config.provider}/{config.model}"
        elif config.provider == LLMConfig.PROVIDER_AZURE:
            return f"azure/{config.model}"
        else:
            # For custom providers or direct model names
            return config.model

    def _get_litellm_params(self, config: LLMConfig, **kwargs) -> Dict[str, Any]:
        """
        Prepare parameters for LiteLLM completion call.
        """
        params = {
            'model': self._get_litellm_model_name(config),
            'api_key': config.api_key,
        }
        
        # Add base URL if provided
        if config.base_url:
            params['api_base'] = config.base_url
            
        # Add default parameters from config
        if config.default_parameters:
            params.update(config.default_parameters)
            
        # For Gemini, we need to set the correct authentication parameters
        if config.provider == LLMConfig.PROVIDER_GEMINI:
            # Set the API base URL
            params['api_base'] = 'https://generativelanguage.googleapis.com'
            # Set the API version
            params['api_version'] = 'v1'
            # Set the authentication parameters
            params['google_api_key'] = config.api_key
            params['google_api_key_type'] = 'api_key'
            
        # Override with any explicitly provided parameters
        params.update(kwargs)
        
        return params

    def generate(self, config: LLMConfig, prompt: str, **kwargs) -> Tuple[str, int]:
        """
        Generate text using the specified LLM configuration.
        """
        try:
            if config.provider == LLMConfig.PROVIDER_GEMINI:
                # For Gemini, use the direct Google API client
                genai.configure(api_key=config.api_key)
                model = genai.GenerativeModel(model_name=config.model)
                start_time = time.time()
                response = model.generate_content(prompt)
                response_time_ms = int((time.time() - start_time) * 1000)
                text = response.text
                logger.info(f"Generated text length: {len(text)} characters")
                return text, response_time_ms
            else:
                # For other providers, use LiteLLM
                params = self._get_litellm_params(config, **kwargs)
                
                # Log the request
                logger.info(f"Calling {config.provider} model {config.model} with params: {params}")
                
                # Make the API call
                start_time = time.time()
                response = completion(
                    messages=[{"role": "user", "content": prompt}],
                    **params
                )
                response_time_ms = int((time.time() - start_time) * 1000)
                
                # Extract the generated text
                if hasattr(response, 'choices') and len(response.choices) > 0:
                    generated_text = response.choices[0].message.content
                    logger.info(f"Generated text length: {len(generated_text)} characters")
                    return generated_text, response_time_ms
                else:
                    error_msg = f"Unexpected response format from {config.provider}"
                    logger.error(f"{error_msg}: {response}")
                    return f"-- ERROR: {error_msg}", response_time_ms
                
        except Exception as e:
            error_msg = f"Error calling {config.provider} API: {str(e)}"
            logger.error(error_msg, exc_info=True)
            return f"-- ERROR: {error_msg}", 0
    
    async def agenerate(self, config: LLMConfig, prompt: str, **kwargs) -> Tuple[str, int]:
        """
        Generate text asynchronously using the specified LLM configuration.
        
        Args:
            config: LLM configuration
            prompt: The prompt to send to the model
            **kwargs: Additional parameters to pass to the model
            
        Returns:
            Tuple of (generated_text, response_time_ms)
        """
        try:
            if config.provider == LLMConfig.PROVIDER_GEMINI:
                # For Gemini, use the direct Google API client
                genai.configure(api_key=config.api_key)
                model = genai.GenerativeModel(model_name=config.model)
                start_time = time.time()
                response = model.generate_content(prompt)
                response_time_ms = int((time.time() - start_time) * 1000)
                text = response.text
                logger.info(f"Generated text length: {len(text)} characters")
                return text, response_time_ms
            else:
                # For other providers, use LiteLLM
                params = self._get_litellm_params(config, **kwargs)
                
                # Log the request
                logger.info(f"Async calling {config.provider} model {config.model} with params: {params}")
                
                # Make the async API call
                start_time = time.time()
                response = await acompletion(
                    messages=[{"role": "user", "content": prompt}],
                    **params
                )
                response_time_ms = int((time.time() - start_time) * 1000)
                
                # Extract the generated text
                if hasattr(response, 'choices') and len(response.choices) > 0:
                    generated_text = response.choices[0].message.content
                    logger.info(f"Generated text length: {len(generated_text)} characters")
                    return generated_text, response_time_ms
                else:
                    error_msg = f"Unexpected async response format from {config.provider}"
                    logger.error(f"{error_msg}: {response}")
                    return f"-- ERROR: {error_msg}", response_time_ms
                
        except Exception as e:
            error_msg = f"Async error calling {config.provider} API: {str(e)}"
            logger.error(error_msg, exc_info=True)
            return f"-- ERROR: {error_msg}", 0

# Create a singleton instance
llm_service = LLMService()
