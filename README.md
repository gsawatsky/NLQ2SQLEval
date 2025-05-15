# NLQ2SQLEval - Natural Language to SQL Query Evaluation System

## Overview
NLQ2SQLEval is a web-based system that converts natural language queries into SQL queries and evaluates their performance and accuracy. It provides a user-friendly interface for testing and validating SQL generation from natural language input, specifically optimized for Snowflake SQL with a focus on digital advertising metrics and performance analysis.

## Features
- Natural Language to SQL Conversion
  - Converts business queries into optimized Snowflake SQL
  - Supports complex business metrics and KPIs
  - Handles temporal dimensions and timezones
- Query Performance Evaluation
  - Measures query efficiency and accuracy
  - Compares against baseline SQL performance
- Query Explanation and Comparison
  - Provides detailed explanations of generated SQL
  - Compares semantics with baseline queries
  - Highlights differences and potential business impacts
- Interactive Feedback System
  - Allows users to rate query accuracy
  - Provides comments for improvement
- Prompt Set Management
  - Customizable templates for different query types
  - Supports domain-specific terminology
- LLM Configuration Management
  - Integrates with Gemini API
  - Configurable LLM parameters

## Tech Stack
- Backend: Python (FastAPI)
- Frontend: TypeScript (React)
- Database: SQLite (via SQLAlchemy)
- LLM Integration: Gemini API
- Database Target: Snowflake SQL

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- npm or yarn
- Snowflake account (for testing generated queries)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/gsawatsky/NLQ2SQLEval.git
cd NLQ2SQLEval
```

2. Set up the Python environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

3. Install frontend dependencies:
```bash
cd frontend
npm install
```

4. Start the development servers:
```bash
# In one terminal (backend):
cd ..
uvicorn app.main:app --reload

# In another terminal (frontend):
cd frontend
npm start
```

### Environment Setup

1. **Create Environment File**
   Copy `.env.example` to create your `.env` file:
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` with your actual values:
   ```bash
   SNOWFLAKE_ENCRYPTION_KEY=your_secure_encryption_key_here
   SNOWFLAKE_ENCRYPTION_SALT=your_secure_salt_here
   ```
   Generate secure values using:
   ```bash
   python3 -c "import os; import base64; print(base64.urlsafe_b64encode(os.urandom(32)).decode())"
   ```

2. **Set Up Credentials**
   - Copy `credentials/gemini_credentials.json.template` to create your credentials file:
     ```bash
     cp credentials/gemini_credentials.json.template credentials/gemini_credentials.json
     ```
   - Edit `gemini_credentials.json` with your actual Gemini API credentials

**Important Security Note:**
- Never commit `.env` or any credentials files to version control
- Always use secure methods to share credentials with team members
- Regularly rotate sensitive credentials
- Use environment-specific credentials (development vs production)

## Project Structure
```
NLQ2SQLEval/
├── app/                  # Backend FastAPI application
│   ├── api/             # API endpoints
│   │   ├── .py
│   │   ├── evaluate.py
│   │   ├── llm_config.py
│   │   └── prompt_set.py
│   ├── database/        # Database models and migrations
│   └── utils/           # Utility functions
├── frontend/            # React frontend application
│   ├── src/            # Source code
│   │   ├── components/ # React components
│   │   └── api.ts      # API client
│   └── public/         # Static assets
├── prompt_sets/         # Natural language prompt templates
│   └── s1_pub_prompt_set1/
│       ├── s1_pub_prompt_set1.txt
│       └── glossary_terms.txt
└── specifications/      # Project specifications
```

## Usage

1. Access the application at `http://localhost:3000`
2. Enter your natural language query
3. Select a prompt set and LLM configuration
4. View generated SQL and performance metrics
5. Compare with baseline SQL
6. Get query explanations and comparisons
7. Provide feedback on generated queries

---

## Adding a New Prompt Set

You can add custom prompt sets to tailor the NL-to-SQL generation process for different use cases or domains.

### 1. Register the Prompt Set via the API

Use the `/prompt_sets` endpoint to register a new prompt set with a name and description:

**Example (using curl):**
```bash
curl -X POST "http://localhost:8000/prompt_sets" \
  -H "Content-Type: application/json" \
  -d '{
        "name": "my_custom_prompt_set",
        "description": "Prompt set for custom business logic queries."
      }'
```
- `name`: Must match the folder name you will create in the next step.
- `description`: Human-readable description for UI selection.

### 2. Add a Prompt Set Folder and Files

Create a new folder under `prompt_sets/` using the same name as above (e.g., `prompt_sets/my_custom_prompt_set/`).

**Naming conventions:**
- Folder name: `snake_case`, unique, matches the `name` in the API.
- Main template file: `<prompt_set_name>.txt` (e.g., `my_custom_prompt_set.txt`).
- Supporting files: e.g., `schema.txt`, `glossary_terms.txt`, and any semantic mapping YAMLs.

**Example structure:**
```
prompt_sets/
  my_custom_prompt_set/
    my_custom_prompt_set.txt
    schema.txt
    glossary_terms.txt
    my_semantic_mappings.yaml
```

### 3. Use Dynamic Substitution in Templates

Prompt set templates support dynamic variables and file includes:
- `{{NLQ}}`: Will be replaced with the user's natural language query.
- `{{include:schema.txt}}`: Will insert the contents of `schema.txt` from the same folder.
- `{{include:glossary_terms.txt}}`: Will insert the glossary terms.
- You can include multiple files and use any variable supported by the backend.

**Example prompt template:**
```
As a Snowflake SQL expert, please generate a SQL command for the following natural language query:

{{NLQ}}

Here are the schemas:
{{include:schema.txt}}

Glossary:
{{include:glossary_terms.txt}}
```

**Tips:**
- Keep your prompt modular by using includes for schemas, mappings, and glossary.
- Use clear instructions and delimiters in your main prompt file for best LLM results.
- All files referenced with `{{include:...}}` must be in the same prompt set folder.

Once the folder and files are in place and registered, your new prompt set will be available for selection in the UI.

## Supported Metrics and Dimensions
- **Metrics:**
  - Buyside Metrics: Impressions, Clicks, Cost, CPC, CTR
  - Sellside Metrics: Impressions, Clicks, Revenue, RPC, CTR
  - Full Funnel Metrics: Conversions, CPA, Conversion Rate
  - Performance Metrics: Profitability Rate, Gross Profit

- **Dimensions:**
  - Temporal: Day of week, Date ranges, Timezones
  - Campaign: Campaign ID, Name, Ad Group
  - Geographic: Country, Region
  - Device: Mobile vs Desktop
  - Account: Account ID, Name

## Contributing
1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

---

## Backend API Endpoints

Below is a list of the main backend API endpoints provided by the NLQ2SQLEval system:

### NLQ (Natural Language Query)
- `GET /nlqs` — List all NLQs
- `POST /nlqs` — Create a new NLQ 

### Prompt Sets
- `GET /prompt_sets` — List all prompt sets
- `POST /prompt_sets` — Create/register a new prompt set

### Prompt Components
- `GET /prompt_components` — No longer used
- `POST /prompt_components` — No longer used

### LLM Configurations
- `GET /llm_configs` — List all LLM (Large Language Model) configurations.  Note: This will return the api_key in the current configuration.
- `POST /llm_configs` — Create a new LLM configuration

### Validation Runs
- `GET /validation_runs` — Non-functional at this time.
- `POST /validation_runs` — Create a new validation run.  Untested.

### Generated Results
- `GET /generated_results` — List all generated results
- `POST /generated_results` — Create a new generated result
- `PUT /generated_results/{result_id}` — Update a generated result (e.g., add human evaluation or comments)

### Evaluation
- `POST /evaluate/run` — Start a new evaluation run (main orchestration endpoint)
- `POST /explain_query` — Explain and compare SQL queries using the LLM

### Run Details
- `GET /runs/{run_id}` — Get details and results for a specific evaluation run

### Prompt Templating
- `POST /prompt_template` — Render a prompt template with dynamic substitution/macros

---
### Reset test data

- `python scripts/reset_evaluation_results.py`

---

## License
This project is for internal use at System1 LLC. While the code is publicly available on GitHub, it is provided "as is" without warranty of any kind, express or implied. System1 LLC does not provide support for this project to external users.

## Contact
Glenn Sawatsky, System1 LLC
