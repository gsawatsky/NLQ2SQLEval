**\[Company Name\] NLQ2SQL Evaluator \- Project Requirements**

**1\. Goal/Purpose:**

* To provide a systematic and flexible platform for evaluating the effectiveness and accuracy of different Large Language Models (LLMs) and prompting strategies in generating **Snowflake SQL** queries from natural language questions against a defined **Snowflake** data model.

**2\. Key Concepts/Terms:**

* **NLQ (Natural Language Query):** The input question posed by the user in human language (e.g., "Show me total sales last month").  
* **Target SQL Dialect: Snowflake SQL.** The specific flavor of SQL being generated and evaluated. Initial scope is limited to Snowflake.  
* **Target Database Platform: Snowflake.** The data model the Semantic Layer describes resides in a Snowflake database.  
* **Semantic Layer:** A representation of the underlying **Snowflake** data model (tables, columns, relationships) mapped to business-friendly terms. Provides context to the LLM. Definitions may come from sources like dbt Cloud, Snowflake Cortex Analyst output, or custom definitions.  
* **Prompt:** The set of instructions, context (including the Semantic Layer), and examples provided to the LLM to guide its SQL generation.  
* **Baseline SQL:** A manually written, verified-accurate **Snowflake SQL** query that correctly answers a specific NLQ for the target Snowflake data model/semantic layer. Serves as the ground truth.  
* **Generated SQL:** The **Snowflake SQL** query produced by an LLM in response to an NLQ and a specific Prompt.  
* **Accuracy:** The degree to which the Generated SQL is syntactically valid **Snowflake SQL** and semantically correct (i.e., produces the same desired result as the Baseline SQL).  
* **Validation Run:** A process where one or more NLQs are processed by one or more LLMs using one or more Prompts, generating SQL for comparison and evaluation.  
* **LLM Integration:** The mechanism for connecting to and sending requests to different LLM APIs (e.g., Gemini, GPT, Claude).  
* **Dynamic Substitution (Prompt Templating):** A feature allowing placeholders (macros like `{{semantic_layer}}`) in a Prompt template to be replaced with content from other sources at runtime.  
* **Prompt Set:** A collection of related prompt components (System Instructions, Semantic Layer definition, Few-Shot Examples, etc.) used together for a Validation Run.

**3\. Core Functional Requirements:**

* **NLQ Management:**  
  * Ability to input a single NLQ or load a batch.  
  * Ability to associate a **Snowflake** Baseline SQL query with each NLQ.  
  * Ability to store and retrieve NLQ-Baseline **Snowflake SQL** pairs.  
* **Prompt Management:**  
  * Ability to define, store, and manage different Prompt components (System Instructions, Semantic Layer, Few-Shot Examples, Constraints).  
  * **Initial storage and maintenance of prompts and Semantic Layer definitions via text files (YAML, JSON, plain text) within the project.**  
  * Ability to create and save "Prompt Sets" combining components (linking to file-based definitions).  
  * Ability to edit Prompt component content (either within the tool or by linking to external files).  
  * Support for Dynamic Substitution within a main Prompt template.  
  * Ability to handle Semantic Layer definitions provided in YAML, JSON, and Structured Natural Language formats (consuming output from tools like dbt Cloud/Snowflake Cortex).  
* **LLM Integration:**  
  * Ability to configure and connect to different LLM APIs.  
  * Ability to select one or multiple LLMs per run.  
  * Ability to specify LLM model and parameters (e.g., temperature).  
  * Tool must explicitly instruct the LLM to generate **Snowflake SQL**.  
* **Validation Run Execution:**  
  * Select NLQs, Prompt Sets, and LLMs for a run.  
  * Construct the final prompt (reading files, performing substitution).  
  * Send prompt to selected LLM APIs.  
  * Receive and store Generated **Snowflake SQL**.  
* **Comparison and Evaluation:**  
  * Display Generated **Snowflake SQL** side-by-side with Baseline **Snowflake SQL**.  
  * Provide human visual comparison with **Snowflake SQL** syntax highlighting.  
  * Allow human reviewers to apply tags/labels to Generated SQL results (e.g., "Accurate", "Minor Error", "Major Error", "Syntactically Invalid \- Snowflake").  
  * Allow human reviewers to add comparison notes/comments.  
  * *(Optional/Future):* Incorporate an LLM to provide automated comparison summaries.  
* **Run and Results Persistence:**  
  * **Store Run Parameters:** Automatically store parameters for each run (Unique ID, Timestamp, NLQs used, Prompt Sets used, LLMs used, LLM parameters, optional name). Consider a default naming convention (e.g., based on timestamp and selected items).  
  * **Store Detailed Results:** For each Generated SQL output within a run, store: Link to Run, NLQ, Prompt Set (or snapshot), LLM, **exact full prompt sent**, Generated SQL, Baseline SQL, **human tag/label**, human notes, timestamp. Ensure reference/snapshot of file-based components is stored.

**4\. Data Management Requirements:**

* Persistent storage for:  
  * NLQ-Baseline **Snowflake SQL** pairs.  
  * Prompt components (including metadata for file-based components).  
  * Prompt Sets (configurations linking components and file references).  
  * LLM configurations (handle API keys securely\!).  
  * Validation Run records (parameters).  
  * Detailed Generated SQL Result records (Generated SQL, full prompt, tags, notes, links to run/NLQ/Prompt/LLM).  
* Mechanism to read prompt and semantic layer definition files from the file system at runtime.  
* Mechanism to parse YAML, JSON, and plain text file formats.  
* Mechanism to import/export NLQ-Baseline pairs and Prompt configurations (e.g., via files).  
* Mechanism to query and retrieve stored run and result data.

**5\. User Interface (UI) Requirements:**

* Input area for NLQ & Baseline SQL.  
* Views/selectors for managing and choosing Prompt components, Prompt Sets, and LLMs.  
* Results view with side-by-side comparison of Generated SQL vs. Baseline SQL (with syntax highlighting).  
* UI elements for applying tags/labels and adding notes to generated results.  
* View to browse past Validation Runs (Run History).  
* View to see details of a specific Run and its results (Run Details), maintaining the comparison layout.  
* View for configuring LLM API connections.  
* Ability to view the full prompt text sent for any generated result.

**6\. Architecture/Integration Considerations:**

* Modular design for LLM integration.  
* Prompt templating engine.  
* **Backend is responsible for:**  
  * Receiving UI requests.  
  * Managing data persistence via SQLAlchemy.  
  * **Reading, parsing (YAML, JSON, text), and processing file-based prompt/semantic layer definitions.**  
  * Constructing full prompts.  
  * Calling LLM APIs (securely handling keys).  
  * Returning results to the frontend.  
* Secure handling of API keys.  
* Database: SQLite for MVP with a schema designed for potential migration.  
* Frontend: React or Vue for building the interactive UI.  
* Backend: Python with FastAPI or Flask.

**7\. Out of Scope for MVP:**

* Actually executing the generated **Snowflake SQL** against a database.  
* Automated accuracy validation based on execution results.  
* Support for SQL dialects other than **Snowflake SQL**.  
* Direct API integration with third-party Semantic Layer products (tool will consume their output formats).

**8\. Tech Stack Recommendation Rationale (based on priorities):**

* **User Priority:** Lowest friction tech stack with best known "Agentic" development quality (i.e., maximizing AI code assistance). Willingness to choose stack based on AI tool compatibility. SQLite for MVP, migration possible.  
* **Assessment:** While 99% automation is ambitious, maximizing AI assistance means choosing languages/frameworks well-represented in AI training data and well-supported by leading AI coding tools (Cursor, Copilot, etc.). Python and JavaScript (used in React/Vue) are top-tier in this regard.  
* **Recommended Stack Pattern:**  
  * **Backend:** Python (FastAPI or Flask) \+ SQLAlchemy (ORM for DB abstraction).  
  * **Database:** SQLite (MVP).  
  * **Frontend:** React or Vue.  
* **Rationale:** This stack is highly compatible with leading AI coding tools for generating backend logic, ORM models, and frontend UI components. Python's ecosystem is also strong for integrating with LLMs. SQLAlchemy provides the necessary database abstraction for future migration from SQLite. This combination offers a high potential for AI assistance while being a robust foundation for the application's requirements, including handling file-based prompt definitions via the backend.  
* **Next Step for User:** Experiment with potential AI coding tools (WindSurf, Cursor, VS Code w/ extensions, Replit) using this specific stack pattern to see which feels most effective for their personal workflow.

**System1 NLQ2SQL Evaluator \- UI Wireframe (Draft)**

**Overall Structure:**

The application will likely have a primary navigation mechanism (e.g., a top bar or left sidebar) to switch between the main sections:

* **Evaluate:** The core screen for running new evaluations and viewing recent results.  
* **History:** View past evaluation runs.  
* **Manage:** Sections for managing NLQ/Baselines, Prompts/Sets, and LLM configurations.

---

**Screen: Evaluate (Main Evaluation)**

This is the primary workspace where a user configures and triggers a new evaluation run.

* **Layout:** The screen is divided into two main vertical panels: a **Configuration/Input Panel** on the left and a **Results Panel** on the right.

* **Left Panel: Configuration & Input**

  * **Section: Natural Language Query & Baseline**  
    * Label: "Natural Language Query"  
    * Text Area: Large input box for typing or pasting the NLQ.  
    * Label: "Baseline Snowflake SQL"  
    * Text Area: Large input box/viewer for typing or pasting the correct Baseline Snowflake SQL for the NLQ. Should support syntax highlighting. Maybe a toggle to switch between input/view mode or load from saved Baselines.  
    * (Future/Option): Button/Link to "Load Saved NLQ/Baseline".  
  * **Section: Evaluation Run Configuration**  
    * Label: "Select Prompt Sets to Compare"  
    * Multi-select List or Dropdown: Displays available Prompt Sets (loaded from files/DB). User selects one or more.  
    * Label: "Select LLMs to Evaluate"  
    * Multi-select List or Dropdown: Displays configured LLMs. User selects one or more.  
    * (Optional): Section for LLM-specific parameters (e.g., Temperature slider, Max Tokens input), potentially appearing based on selected LLMs.  
  * **Action Button:**  
    * Large Button: "Run Evaluation" (Triggers the backend process).  
* **Right Panel: Evaluation Results (for the most recent run)**

  * **Title:** "Latest Evaluation Results"  
  * **Layout:** This panel displays the results of the most recent "Run Evaluation" click. It uses a side-by-side layout. The Baseline SQL is shown once on the far left, and then each generated SQL result appears in its own vertical sub-panel to the right. The panel should be horizontally scrollable if multiple LLM/Prompt combinations are selected.  
  * **Baseline SQL Sub-Panel (Leftmost):**  
    * Label: "Baseline Snowflake SQL" (Repeated for clarity in comparison).  
    * Code Viewer Area: Displays the Baseline SQL with syntax highlighting. Read-only.  
  * **Generated SQL Sub-Panels (Multiple, to the right):**  
    * Each sub-panel represents one combination of LLM \+ Prompt Set from the run.  
    * Header: Clearly labels the result (e.g., "Result: Gemini 2.5 Flash \+ Prompt Set A").  
    * Code Viewer Area: Displays the Generated Snowflake SQL with syntax highlighting. Read-only.  
    * Button/Link: "View Full Prompt" (Opens a modal or new area showing the complete prompt text sent to the LLM for this specific result).  
    * **Evaluation Section:**  
      * Label: "Human Evaluation"  
      * Dropdown or Radio Buttons: For selecting a tag/label (e.g., "Accurate", "Minor Error", "Major Error", "Syntactically Invalid").  
      * Text Area: For adding notes/comments about this specific result.  
      * Button: "Save Evaluation" (Saves the tags and notes for this result).

---

**Screen: History**

* **Layout:** Simple list or table.  
* **Content:**  
  * Table/List: Displays past Validation Runs.  
  * Columns: Run ID (or Name), Timestamp, NLQ count, LLM count, Prompt Set count, (Optional: Overall Accuracy Summary if available).  
  * Action: Click on a run row to navigate to the "Run Details" screen.

---

**Screen: Run Details**

* **Layout:** Similar to the "Evaluate" screen's Results Panel, but displays results from a selected past run.  
* **Content:**  
  * Section: Run Summary: Displays the parameters of the run (Timestamp, NLQs included, Prompt Sets used, LLMs used, LLM parameters).  
  * Section: Evaluation Results: Displays the Baseline SQL and all Generated SQL results for that specific run using the same side-by-side layout as the main Evaluate screen.  
  * Displays the saved Human Evaluation tags and notes for each result. Allows editing/updating the evaluation.  
  * Button/Link on each result to "View Full Prompt".

---

**Screen: Manage (Sub-sections)**

* **Layout:** Likely a list/table view for each sub-section with Add/Edit/Delete/Import/Export actions.  
* **Sub-sections:**  
  * **Manage NLQ & Baselines:** Table listing saved NLQ-Baseline pairs. Form to add/edit a pair. Import/Export buttons.  
  * **Manage Prompts & Sets:**  
    * List/Tree view of Prompt Components (System Prompts, Semantic Layer definitions \- listing file names/sources, Few-Shot Examples, Constraints). Ability to view/edit component content (linking to files or editing in a text area). Add/Delete/Import actions.  
    * List/Table of Prompt Sets. Form to create/edit a Prompt Set (selecting which components/files are included).  
  * **Manage LLM Configurations:** Table listing configured LLMs. Form to add/edit LLM API details (Name, API Key \- handle securely\!, Model ID, default parameters).



**Overall Strategy: Iterative, Component-Based Development with Clear Context**

**Therefore, the most effective ways to make the spec available to your AI code assistant are:**

1. **Copy and Paste Relevant Sections into Prompts:** When you start working on a specific part of the application that relates directly to a section of the spec, copy and paste the relevant text from the spec into your prompt.

   * Example: If you're asking it to define the database models, copy the "Data Management Requirements" and the specific notes about which models are needed (NLQ, BaselineSQL, Run, Result, etc.) and paste them into the prompt before asking for the SQLAlchemy code.  
   * This ensures the AI has the necessary context *for that specific task*.  
2. **Save the Spec as a File in Your Project and Reference It:** Save the requirements document (perhaps in markdown or a plain text file like `requirements.md` or `docs/project_spec.txt`) within your application's project directory. If your AI tool has good "codebase awareness" and supports referencing files in prompts, you can then instruct it like:

   * "Based on the requirements in `docs/project_spec.txt`, write the SQLAlchemy models for the database using Python."  
   * "According to section 'Core Functional Requirements \- Prompt Management' in `requirements.md`, how should I structure the file loading logic in FastAPI?"

**Which method should you use?**

* Copy and pasting is the most **reliable** way to ensure the AI has the exact context you intend for a specific prompt, especially for crucial details or constraints.  
* Saving to a file and referencing is more **convenient** for large specs and leverages the code awareness features of tools like Cursor. Try this approach if your chosen tool supports it well. You might still need to copy/paste key snippets for complex tasks to be absolutely sure the AI doesn't miss something critical in a large referenced file.

In practice, you'll likely use a combination: save the full spec file for general reference, and copy/paste specific bullet points or paragraphs into prompts when asking for code related to those points.

Instead of asking the AI to build the whole app at once, you'll work component by component, layer by layer (Backend, Database, Frontend), providing specific instructions and integrating the pieces.

**Phase 1: Project Setup and Core Data Model**

* **Goal:** Get the basic project structure set up and define the core database models using SQLAlchemy for SQLite.  
* **Context to Provide:**  
  * "I'm building a web application called 'System1 NLQ2SQL Evaluator'."  
  * "The tech stack is Python (FastAPI or Flask) for the backend, SQLAlchemy for the database ORM, and SQLite for the database file. The frontend will be React or Vue."  
  * "The application needs to store NLQ-Baseline SQL pairs, Prompt components, Prompt Sets, Validation Run parameters, and Generated SQL Results with human evaluations."  
  * "The database should be SQLite for the MVP, but designed for potential migration later using SQLAlchemy's capabilities."  
* **Example Initial Prompts:**  
  * `Set up a basic Python FastAPI project structure with a virtual environment and the 'fastapi', 'uvicorn', and 'sqlalchemy' libraries installed.` (Adjust for Flask if preferred).  
  * `Using SQLAlchemy, define the database models for the following entities for use with SQLite: NLQ (stores the NLQ text and links to Baseline SQL), BaselineSQL (stores the Snowflake SQL text), LLMConfig (stores LLM name, API key, model), PromptComponent (stores different parts of prompts like System instructions, file references for Semantic Layers), PromptSet (links multiple PromptComponents together), ValidationRun (stores run parameters like timestamp, selected LLMs, Prompt Sets, NLQs), and GeneratedResult (stores the generated SQL, full prompt sent, links to run/NLQ/Prompt/LLM, human evaluation tag, comments). Include appropriate relationships between models.` (This is a big ask, you might break it down further, e.g., "First, define the NLQ and BaselineSQL models...", "Next, add the ValidationRun and GeneratedResult models and their relationships...")  
  * `Write the code to initialize the SQLAlchemy database engine for SQLite and create all defined tables if they don't exist.`

**Phase 2: Backend API Endpoints and Logic**

* **Goal:** Build the backend API endpoints to manage data and execute the core logic.  
* **Context to Provide:**  
  * Reference the SQLAlchemy models you just created (provide the code or point the AI to the file).  
  * Explain the purpose of the endpoint you need.  
  * Specify the required inputs and expected outputs (e.g., JSON structure).  
* **Example Prompts:**  
  * `Create a FastAPI endpoint POST /nlqs that accepts an NLQ text and Baseline SQL text and saves them to the database. Return the saved NLQ object including its new ID.`  
  * `Create a FastAPI endpoint GET /nlqs that returns a list of all saved NLQ-Baseline pairs.`  
  * `Implement the logic in Python to read a YAML file from a specified path, parse its content, and return the data as a Python dictionary.` (Repeat for JSON and plain text).  
  * `Write a Python function that takes a main prompt template string and a dictionary of macro-to-value mappings (e.g., {'semantic_layer': '...', 'few_shot_examples': '...'}) and returns the final prompt string with substitutions performed.`  
  * `Create a FastAPI endpoint POST /evaluate/run that accepts lists of NLQ IDs, PromptSet IDs, and LLMConfig IDs. This endpoint should orchestrate a validation run: for each combination, load prompt components (reading from files if needed), construct the full prompt using the templating function, call the respective LLM API, store the Generated SQL and all run parameters/details (including the full prompt sent) in the database. Return the Run ID.` (This is a complex prompt; you will likely need to break it into many smaller steps, e.g., "First, write the endpoint structure", "Next, add the logic to load prompts and semantic layers based on PromptSet ID", "Then, add the loop to process NLQs, PromptSets, and LLMs", "Now, add the API call logic...")  
  * `Create a FastAPI endpoint GET /runs/{run_id} that retrieves all details for a specific Validation Run, including all associated GeneratedResult objects.`

**Phase 3: Frontend UI Components and API Integration**

* **Goal:** Build the user interface based on the wireframe and connect it to the backend API.  
* **Context to Provide:**  
  * Specify the chosen frontend framework (React or Vue).  
  * Reference the wireframe (describe the specific section/component you're working on).  
  * Reference the backend API endpoints you've created.  
  * Provide relevant HTML/CSS structure if you have a starting point.  
* **Example Prompts (React):**  
  * `Set up a basic React project structure.`  
  * `Create a React component for the main 'Evaluate' screen based on the wireframe. It should have two main panels. The left panel needs text areas for NLQ and Baseline SQL input and sections for selecting Prompt Sets and LLMs.`  
  * `Add state management to the Evaluate component to store the NLQ text, Baseline SQL text, selected Prompt Sets (as IDs), and selected LLMs (as IDs).`  
  * `Implement the 'Run Evaluation' button's click handler. It should collect the current NLQ, Baseline SQL, selected Prompt Set IDs, and LLM IDs, send them as a POST request to the backend endpoint /evaluate/run, and handle the response (e.g., get the new Run ID).`  
  * `Create a React component called 'ComparisonView' that takes a 'runId' as a prop. It should fetch the run details from the backend endpoint GET /runs/{run_id} and display the Baseline SQL on the left and iterate through the generated results, showing each in a separate scrollable panel on the right, as shown in the wireframe.`  
  * `Within the 'ComparisonView' component, create a sub-component called 'GeneratedResultPanel' that displays the generated SQL, a button to view the full prompt, a dropdown for human evaluation, a comments box, and a save button. This component should handle saving the evaluation back to the backend.` (You'll need a backend endpoint for saving evaluation tags/notes too).  
  * `Implement syntax highlighting for the SQL code display areas in the Baseline and GeneratedResultPanel components using a library like 'react-syntax-highlighter'.`

**Phase 4: Refinement and Additional Features**

* **Goal:** Add the History and Manage screens, improve UI/UX, refine logic, and debug.  
* **Example Prompts:**  
  * `Create a React component for the 'History' screen that fetches a list of all runs from the backend and displays them in a table. Make each row clickable to navigate to the 'Run Details' screen.`  
  * `Create backend endpoints and frontend components for managing NLQ-Baseline pairs (listing, adding, editing, deleting).`  
  * `How should I securely handle the LLM API keys in the Python backend? Provide best practices and example code.`  
  * `I'm getting an error when parsing the YAML semantic layer file. Here is the error [paste error] and the YAML [paste YAML]. What is wrong?`  
  * `Refactor the LLM API call logic in the backend to handle potential errors and timeouts gracefully.`

**General Tips for Prompting AI Code Assistants:**

* **Be Specific:** Instead of "Build the backend," ask for a specific endpoint or function.  
* **Provide Context:** Always mention the project, the tech stack, and the purpose of the code. When asking for modifications or debugging, provide the relevant existing code.  
* **Break Down Tasks:** Large features need to be broken into small, implementable steps.  
* **Specify Output:** Ask for code in a specific language and framework, or a specific file type.  
* **Use Examples (if helpful):** For complex logic or desired output formats, sometimes showing an example of the input and desired output can help the AI.  
* **Iterate:** The first generated code might not be perfect. Review it, test it, and provide feedback to the AI for refinement.  
* **Understand the Code:** Don't just copy and paste. Read the generated code to understand how it works, why the AI made certain choices, and ensure it fits into your overall architecture.

By breaking down the project and using clear, contextual prompts, you can effectively leverage an AI code assistant to accelerate the development of your application, even aiming for a high degree of automation on specific tasks. Remember that you will still be the architect and the final reviewer/integrator of the code. Good luck\!
