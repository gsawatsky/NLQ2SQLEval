export async function fetchPromptSets() {
  const res = await fetch("http://localhost:8000/prompt_sets");
  if (!res.ok) throw new Error("Failed to fetch prompt sets");
  return res.json();
}

export async function fetchLLMConfigs() {
  const res = await fetch("http://localhost:8000/llm_configs");
  if (!res.ok) throw new Error("Failed to fetch LLM configs");
  return res.json();
}

export async function runEvaluation(nlqIds: number[], promptSetIds: number[], llmConfigIds: number[]) {
  const res = await fetch("http://localhost:8000/evaluate/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nlq_ids: nlqIds, prompt_set_ids: promptSetIds, llm_config_ids: llmConfigIds })
  });
  if (!res.ok) throw new Error("Failed to run evaluation");
  return res.json();
}

export async function fetchRunDetails(runId: number) {
  const res = await fetch(`http://localhost:8000/runs/${runId}`);
  if (!res.ok) throw new Error("Failed to fetch run details");
  return res.json();
}

export async function createNlq(nlqText: string) {
  const res = await fetch("http://localhost:8000/nlqs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nlq_text: nlqText }),
  });
  if (!res.ok) throw new Error("Failed to create NLQ");
  return res.json();
}

export async function searchNlqByText(nlqText: string) {
  const res = await fetch(`http://localhost:8000/nlqs/search?nlq_text=${encodeURIComponent(nlqText)}`);
  if (!res.ok) throw new Error("NLQ not found");
  return res.json();
}

export async function fetchBaselineSqlForNlq(nlqId: number) {
  const res = await fetch(`http://localhost:8000/nlqs/${nlqId}/baseline_sql`);
  if (!res.ok) throw new Error("No baseline SQL found for this NLQ");
  return res.json();
}

export async function updateGeneratedResult(resultId: number, data: { human_evaluation_tag?: string; comments?: string }) {
  const res = await fetch(`http://localhost:8000/generated_results/${resultId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update feedback");
  return res.json();
}

export async function explainQuery(baselineSql: string, generatedSql: string, llmConfigId: number): Promise<string> {
  const res = await fetch("http://localhost:8000/explain_query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ baseline_sql: baselineSql, generated_sql: generatedSql, llm_config_id: llmConfigId }),
  });
  if (!res.ok) throw new Error("Failed to get explanation");
  const data = await res.json();
  return data.explanation;
}
