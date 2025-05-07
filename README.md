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

### Environment Variables
Create a `.env` file in the root directory with the following variables:
```bash
GEMINI_API_KEY=your_gemini_api_key
SNOWFLAKE_ACCOUNT=your_account
SNOWFLAKE_USER=your_username
SNOWFLAKE_PASSWORD=your_password
SNOWFLAKE_DATABASE=your_database
SNOWFLAKE_SCHEMA=your_schema
```

## Project Structure
```
NLQ2SQLEval/
├── app/                  # Backend FastAPI application
│   ├── api/             # API endpoints
│   │   ├── baseline_sql.py
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

## License
This project is for internal use at System1 LLC. While the code is publicly available on GitHub, it is provided "as is" without warranty of any kind, express or implied. System1 LLC does not provide support for this project to external users.

## Contact
Glenn Sawatsky, System1 LLC
