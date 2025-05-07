from typing import Dict
import re

def apply_prompt_template(template: str, macros: Dict[str, str]) -> str:
    """Replace all {{macro}} in template with their corresponding values from macros dict. Supports dot notation for nested dicts."""
    def get_macro_value(key: str):
        parts = key.split('.')
        val = macros
        for part in parts:
            if isinstance(val, dict) and part in val:
                val = val[part]
            else:
                return f"{{{{{key}}}}}"  # Leave macro as-is if not found
        return str(val)
    def replacer(match):
        macro = match.group(1)
        return get_macro_value(macro)
    pattern = re.compile(r'\{\{\s*([\w\.]+)\s*\}\}')
    return pattern.sub(replacer, template)
