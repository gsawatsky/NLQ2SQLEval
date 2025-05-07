import json
import yaml
from typing import Any
import logging

# Ensure prompt_loader logs always display to the terminal
prompt_loader_logger = logging.getLogger("prompt_loader")
if not prompt_loader_logger.hasHandlers():
    handler = logging.StreamHandler()
    formatter = logging.Formatter('%(asctime)s [%(levelname)s] %(name)s: %(message)s')
    handler.setFormatter(formatter)
    prompt_loader_logger.addHandler(handler)
    prompt_loader_logger.setLevel(logging.INFO)

def read_yaml_file(path: str) -> Any:
    with open(path, 'r') as f:
        return yaml.safe_load(f)

def read_json_file(path: str) -> Any:
    with open(path, 'r') as f:
        return json.load(f)

def read_text_file(path: str) -> str:
    with open(path, 'r') as f:
        return f.read()

def prompt_set_name_to_filename(name: str) -> str:
    """
    Converts a prompt set name to a safe filename by replacing spaces and unsafe characters with underscores.
    Example: 'Default Prompt Set' -> 'Default_Prompt_Set.txt'
    """
    import re
    safe_name = re.sub(r'[^A-Za-z0-9_-]', '_', name)
    return f"{safe_name}.txt"


def load_prompt_set_by_name(prompt_set_name: str, prompt_sets_base_dir: str, dynamic_values: dict) -> str:
    """
    Loads the main prompt file for a prompt set by name, with macro substitution.
    Raises FileNotFoundError with a clear message if the file is missing.
    """
    import os
    filename = prompt_set_name_to_filename(prompt_set_name)
    main_path = os.path.join(prompt_sets_base_dir, safe_name_to_dirname(prompt_set_name), filename)
    if not os.path.isfile(main_path):
        raise FileNotFoundError(f"Prompt set main file not found: {main_path}.\nExpected main file for prompt set '{prompt_set_name}'.\nCheck that the file exists and the name is valid (spaces and special characters are replaced with underscores).")
    return load_prompt_with_macros(main_path, dynamic_values)


def safe_name_to_dirname(name: str) -> str:
    """
    Converts a prompt set name to a safe directory name (same as filename, but without extension).
    """
    import re
    return re.sub(r'[^A-Za-z0-9_-]', '_', name)


def load_prompt_with_macros(main_path: str, dynamic_values: dict) -> str:
    """
    Loads a prompt file, performs macro substitution for dynamic values and file includes.
    - dynamic_values: dict of macro_name -> value (e.g., {'NLQ': 'find all users'})
    - File includes use syntax: {{include:filename}}
    Enhanced with logging and error handling for traceability.
    """
    import os
    import re

    logger = logging.getLogger("prompt_loader")

    def include_file(base_dir, filename):
        file_path = os.path.join(base_dir, filename)
        try:
            with open(file_path, 'r') as f:
                logger.info(f"Including file: {file_path}")
                return f.read()
        except Exception as e:
            logger.error(f"Error including file '{file_path}': {e}")
            raise FileNotFoundError(f"Include file not found or could not be read: {file_path}")

    logger.info(f"Loading main prompt file: {main_path}")
    logger.info(f"Dynamic values for macro substitution: {json.dumps(dynamic_values, indent=2)}")

    # Read main prompt
    try:
        with open(main_path, 'r') as f:
            prompt = f.read()
    except Exception as e:
        logger.error(f"Error reading main prompt file '{main_path}': {e}")
        raise FileNotFoundError(f"Main prompt file not found or could not be read: {main_path}")

    base_dir = os.path.dirname(main_path)

    # Substitute file includes first
    include_pattern = re.compile(r"{{include:([^}]+)}}")
    while True:
        match = include_pattern.search(prompt)
        if not match:
            break
        filename = match.group(1).strip()
        try:
            included_content = include_file(base_dir, filename)
        except Exception as e:
            logger.error(f"Failed to include file '{filename}' in prompt: {e}")
            raise
        prompt = prompt[:match.start()] + included_content + prompt[match.end():]

    # Substitute dynamic values
    missing_macros = []
    macro_pattern = re.compile(r"{{\s*([A-Za-z0-9_]+)\s*}}")
    found_macros = set(macro_pattern.findall(prompt))
    for key in found_macros:
        if key not in dynamic_values:
            missing_macros.append(key)
            logger.error(f"Macro '{{{{{key}}}}}' not found in dynamic values!")
    for key, value in dynamic_values.items():
        prompt = prompt.replace(f"{{{{{key}}}}}", str(value))

    if missing_macros:
        logger.error(f"Prompt construction error: missing macros not substituted: {missing_macros}")
        raise ValueError(f"Prompt construction error: missing macros not substituted: {missing_macros}")

    logger.info(f"Final constructed prompt:\n{prompt}")
    return prompt

if __name__ == "__main__":
    # Test block to verify prompt_loader logging works
    print("Running prompt_loader logger test...")
    test_prompt_content = "SELECT * FROM users WHERE name = '{{NLQ}}';\n{{include:missing.txt}}"
    test_main_path = "test_prompt.txt"
    import os
    # Write a temp test file
    with open(test_main_path, "w") as f:
        f.write(test_prompt_content)
    try:
        # Should raise error for missing include
        load_prompt_with_macros(test_main_path, {"NLQ": "Alice"})
    except Exception as e:
        print("[Test] Caught error as expected:", e)
    os.remove(test_main_path)
    print("If you see [prompt_loader] logs above, logging is working!")
