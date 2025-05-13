import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Grid, Paper, Typography, TextField, Button, Divider, MenuItem, Select, InputLabel, FormControl, CircularProgress, Box, OutlinedInput, Chip, Alert, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Autocomplete
} from '@mui/material';
// Removed all duplicate imports for Dialog, DialogTitle, DialogContent, DialogActions, Button

import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { fetchPromptSets, fetchLLMConfigs, runEvaluation, fetchRunDetails, createNlq, updateGeneratedResult, explainQuery, fetchBaselineSqlForNlq, searchNlqByText } from '../api';

interface PromptSet {
  id: number;
  name: string;
  description: string;
}
interface LLMConfig {
  id: number;
  name: string;
  model: string;
  api_key?: string;
  default_parameters?: Record<string, any>;
  description?: string;
}

const MAX_EVALS = 4;

const EvaluateScreen: React.FC = () => {
  // --- NLQ Autocomplete State ---
  const [nlqSuggestions, setNlqSuggestions] = useState<string[]>([]);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  // Debounced fetch for NLQ suggestions
  const debouncedFetchSuggestions = (input: string) => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    if (!input || input.trim().length === 0) {
      setNlqSuggestions([]);
      return;
    }
    debounceTimeout.current = setTimeout(async () => {
      try {
        // searchNlqByText returns an object or array; adapt as needed
        const result = await searchNlqByText(input);
        // If backend returns array of NLQs, adapt here:
        if (Array.isArray(result)) {
          setNlqSuggestions(result.map((x: any) => x.nlq_text || x.text || x));
        } else if (result && result.nlq_text) {
          setNlqSuggestions([result.nlq_text]);
        } else {
          setNlqSuggestions([]);
        }
      } catch {
        setNlqSuggestions([]);
      }
    }, 300); // 300ms debounce
  };

  // Baseline selection UI state
  const [selectedBaselineId, setSelectedBaselineId] = useState<number | null>(null);
  const [settingBaseline, setSettingBaseline] = useState(false);
  const [baselineModalOpen, setBaselineModalOpen] = useState(false);
  const [baselineSqlText, setBaselineSqlText] = useState<string | null>(null);
  const [baselineSqlLoading, setBaselineSqlLoading] = useState(false);
  const [baselineSqlError, setBaselineSqlError] = useState<string | null>(null);
  const [nlq, setNlq] = useState('');
  const [promptSets, setPromptSets] = useState<PromptSet[]>([]);
  const [llmConfigs, setLlmConfigs] = useState<LLMConfig[]>([]);
  const [selectedPromptSets, setSelectedPromptSets] = useState<number[]>([]);
  const [selectedLlmConfigs, setSelectedLlmConfigs] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showApiError, setShowApiError] = useState(false);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<any>(null);
  const [runDetails, setRunDetails] = useState<any>(null);

  // --- EXPLAIN QUERY STATE ---
  const [explainOpen, setExplainOpen] = useState<null | number>(null); // resultId or null
  const [explainLoading, setExplainLoading] = useState(false);
  const [explainText, setExplainText] = useState('');
  const [explainError, setExplainError] = useState<string | null>(null);

  // --- COPY SQL STATE ---
  const [copiedSqlId, setCopiedSqlId] = useState<null | number>(null);

  // --- FEEDBACK STATE ---
  const [feedbackState, setFeedbackState] = useState<{
    [resultId: number]: {
      tag: string;
      comment: string;
      saving: boolean;
      saveSuccess: boolean;
      saveError: string | null;
    };
  }>({});

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [ps, llms] = await Promise.all([
          fetchPromptSets(),
          fetchLLMConfigs()
        ]);
        setPromptSets(ps);
        setLlmConfigs(llms);
      } catch (e: any) {
        setError(e.message);
        setShowApiError(true);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Sync selectedBaselineId to the current baseline when runDetails change
  useEffect(() => {
    if (runDetails && runDetails.generated_results && runDetails.generated_results.length > 0) {
      const baseline = runDetails.generated_results.find((r: any) => r.is_baseline);
      setSelectedBaselineId(baseline ? baseline.id : runDetails.generated_results[0].id);
    } else {
      setSelectedBaselineId(null);
    }
  }, [runDetails]);

  // Sync feedback state with results when runDetails changes
  useEffect(() => {
    if (!runDetails || !runDetails.generated_results) return;
    setFeedbackState(prev => {
      const newState: any = {};
      runDetails.generated_results.forEach((r: any) => {
        newState[r.id] = {
          tag: prev[r.id]?.tag ?? r.human_evaluation_tag ?? '',
          comment: prev[r.id]?.comment ?? r.comments ?? '',
          saving: false,
          saveSuccess: false,
          saveError: null,
        };
      });
      return newState;
    });
  }, [runDetails]);

  const handleFeedbackChange = (resultId: number, field: 'tag' | 'comment', value: string) => {
    setFeedbackState(prev => ({
      ...prev,
      [resultId]: {
        ...prev[resultId],
        [field]: value,
        saveSuccess: false,
        saveError: null,
      },
    }));
  };

  const handleSaveFeedback = async (resultId: number) => {
    const feedback = feedbackState[resultId];
    if (!feedback) return;
    
    // Add debugging
    console.log('Saving feedback for result ID:', resultId);
    console.log('Feedback data:', feedback);
    
    setFeedbackState(prev => ({
      ...prev,
      [resultId]: { ...prev[resultId], saving: true, saveSuccess: false, saveError: null },
    }));
    try {
      // Check if this is setting a baseline
      const isSettingBaseline = feedback.tag === 'Correct and use as new baseline';
      console.log('Is setting baseline:', isSettingBaseline);
      
      const result = await updateGeneratedResult(resultId, {
        human_evaluation_tag: feedback.tag,
        comments: feedback.comment,
      });
      console.log('Update result response:', result);
      
      // Refresh run details after feedback update
      if (runResult) {
        console.log('Refreshing run details after feedback update');
        const details = await fetchRunDetails(runResult);
        console.log('Updated run details:', details);
        setRunDetails(details);
      }
      
      setFeedbackState(prev => ({
        ...prev,
        [resultId]: {
          ...prev[resultId],
          tag: feedback.tag, // Ensure tag is preserved
          comment: feedback.comment, // Also ensure comment is preserved
          saving: false,
          saveSuccess: true
        },
      }));
      setTimeout(() => {
        setFeedbackState(prev => ({
          ...prev,
          [resultId]: { ...prev[resultId], saveSuccess: false },
        }));
      }, 2000);
    } catch (e: any) {
      console.error('Error saving feedback:', e);
      setFeedbackState(prev => ({
        ...prev,
        [resultId]: { ...prev[resultId], saving: false, saveError: e.message || 'Error saving feedback' },
      }));
    }
  };

  // Calculate dynamic panels
  const evalCombos = useMemo(() => {
    const combos: { promptSet: PromptSet; llm: LLMConfig }[] = [];
    for (const psId of selectedPromptSets) {
      const ps = promptSets.find(p => p.id === psId);
      if (!ps) continue;
      for (const llmId of selectedLlmConfigs) {
        const llm = llmConfigs.find(l => l.id === llmId);
        if (!llm) continue;
        combos.push({ promptSet: ps, llm });
      }
    }
    return combos.slice(0, MAX_EVALS);
  }, [selectedPromptSets, selectedLlmConfigs, promptSets, llmConfigs]);

  const disableSelections = evalCombos.length >= MAX_EVALS;

  const canRunEvaluation =
    nlq.trim().length > 0 &&
    selectedPromptSets.length > 0 &&
    selectedLlmConfigs.length > 0 &&
    !running;

const handleRunEvaluation = async () => {
  setRunning(true);
  setError(null);
  setShowApiError(false);
  setRunResult(null);
  setRunDetails(null);
  let nlqId: number | null = null;
  try {
    const existingNlqs = await searchNlqByText(nlq);
    if (Array.isArray(existingNlqs) && existingNlqs.length > 0) {
      nlqId = existingNlqs[0].id;
      console.log('Reusing existing NLQ ID:', nlqId);
    } else {
      // Not found, create new
      const nlqObj = await createNlq(nlq);
      nlqId = nlqObj.id;
      console.log('Created new NLQ ID:', nlqId);
    }
    // Ensure nlqId is a number
    if (nlqId === null) {
      throw new Error('NLQ ID could not be determined.');
    }
    // Run evaluation
    try {
      const result = await runEvaluation([nlqId], selectedPromptSets, selectedLlmConfigs);
      setRunResult(result.run_id);
      // Fetch run details
      const details = await fetchRunDetails(result.run_id);
      setRunDetails(details);
    } catch (e: any) {
      setError(e.message);
      setShowApiError(true);
    } finally {
      setRunning(false);
    }
  } catch (e: any) {
    setError(e.message || 'Unknown error');
    setShowApiError(true);
    setRunning(false);
  }
};

// Helper to get generated SQL for a combo
function getGeneratedSql(promptSetId: number, llmConfigId: number): string {
    if (!runDetails || !runDetails.generated_results) return '';
    const result = runDetails.generated_results.find((r: any) =>
      r.prompt_set_id === promptSetId && r.llm_config_id === llmConfigId
    );
    return result ? result.generated_sql : '';
  }

  // Handler for Explain Query
  const handleExplainQuery = async (result: any) => {
    setExplainOpen(result.id);
    setExplainLoading(true);
    setExplainText('');
    setExplainError(null);
    try {
      // Dynamically fetch the baseline SQL for this NLQ
      let baselineSql = '';
      try {
        const baselineResult = await fetchBaselineSqlForNlq(result.nlq_id);
        baselineSql = baselineResult.generated_sql;
      } catch (e) {
        baselineSql = '';
      }
      const explanation = await explainQuery(baselineSql, result.generated_sql, result.llm_config_id);
      setExplainText(explanation);
    } catch (e: any) {
      setExplainError(e.message || 'Failed to get explanation');
    } finally {
      setExplainLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }}>
      {/* Top Panel: Inputs and Controls */}
      <Paper elevation={3} sx={{ p: 3, mb: 2 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ flex: 1, minWidth: 300 }}>
            <Typography variant="subtitle1" gutterBottom>Natural Language Query</Typography>
            <Autocomplete
              freeSolo
              filterOptions={x => x} // disable built-in filtering
              options={nlqSuggestions}
              inputValue={nlq}
              onInputChange={(_event, newInputValue, reason) => {
                setNlq(newInputValue);
                if (reason === 'input') {
                  debouncedFetchSuggestions(newInputValue);
                }
              }}
              onChange={(_event, value) => {
                if (typeof value === 'string') setNlq(value);
              }}
              renderInput={params => (
                <TextField {...params} label="NLQ" multiline minRows={3} fullWidth sx={{ mb: 2 }} />
              )}
            />
          </Box>
          <Box sx={{ flex: 1, minWidth: 250 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="prompt-set-label">Prompt Sets</InputLabel>
              <Select
                labelId="prompt-set-label"
                multiple
                value={selectedPromptSets}
                onChange={e => {
                  const value = e.target.value as number[];
                  setSelectedPromptSets(value.slice(0, Math.floor(MAX_EVALS / Math.max(selectedLlmConfigs.length || 1, 1))));
                }}
                input={<OutlinedInput label="Prompt Sets" />}
                renderValue={selected => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(selected as number[]).map(id => {
                      const ps = promptSets.find(p => p.id === id);
                      return ps ? <Chip key={id} label={ps.name} /> : null;
                    })}
                  </Box>
                )}
                disabled={disableSelections}
              >
                {promptSets.map(ps => (
                  <MenuItem key={ps.id} value={ps.id}>{ps.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ flex: 1, minWidth: 250 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="llm-config-label">LLMs</InputLabel>
              <Select
                labelId="llm-config-label"
                multiple
                value={selectedLlmConfigs}
                onChange={e => {
                  const value = e.target.value as number[];
                  setSelectedLlmConfigs(value.slice(0, Math.floor(MAX_EVALS / Math.max(selectedPromptSets.length || 1, 1))));
                }}
                input={<OutlinedInput label="LLMs" />}
                renderValue={selected => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(selected as number[]).map(id => {
                      const llm = llmConfigs.find(l => l.id === id);
                      return llm ? <Chip key={id} label={llm.name || `LLM ${llm.id}`} /> : null;
                    })}
                  </Box>
                )}
                disabled={disableSelections}
              >
                {llmConfigs.map(llm => (
                  <MenuItem key={llm.id} value={llm.id}>{llm.name || `LLM ${llm.id}`} ({llm.model})</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>
        <Divider sx={{ my: 2 }} />
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Button
            variant="contained"
            color="primary"
            disabled={!canRunEvaluation}
            fullWidth
            onClick={handleRunEvaluation}
          >
            {running ? 'Running...' : 'Run Evaluation'}
          </Button>
          {loading && <CircularProgress size={24} />}
          {showApiError && (
            <Alert severity="error" onClose={() => setShowApiError(false)}>
              Failed to load prompt sets or LLM configs. Is your backend running?
            </Alert>
          )}
        </Box>
      </Paper>

      {/* Bottom Panel: Results, horizontally scrollable */}
      <Paper elevation={3} sx={{ flex: 1, p: 2, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h6" gutterBottom>Evaluation Results</Typography>
        {runResult && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Evaluation run started! Run ID: {runResult}
          </Alert>
        )}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 2 }}>
  <Button variant="outlined" size="small" onClick={async () => {
    setBaselineSqlError(null);
    setBaselineSqlLoading(true);
    setBaselineModalOpen(true);
    try {
      // Get the NLQ ID from the current run details
      const nlqId = runDetails?.nlq_id || (runDetails?.generated_results?.[0]?.nlq_id);
      console.log('Fetching baseline SQL for NLQ ID:', nlqId);
      console.log('Current runDetails:', runDetails);
      
      if (!nlqId) throw new Error('No NLQ ID found');
      
      // Fetch the baseline SQL directly from the API
      // This will find the baseline SQL for this NLQ, even if it's from a previous run
      console.log(`Calling API: /nlqs/${nlqId}/baseline_sql`);
      const baselineResult = await fetchBaselineSqlForNlq(nlqId);
      console.log('Baseline result:', baselineResult);
      
      if (!baselineResult || !baselineResult.generated_sql) {
        throw new Error('No baseline SQL found for this NLQ');
      }
      setBaselineSqlText(baselineResult.generated_sql);
    } catch (e: any) {
      console.error('Error fetching baseline SQL:', e);
      setBaselineSqlText(null);
      setBaselineSqlError(e.message || 'No baseline SQL found for this NLQ');
    } finally {
      setBaselineSqlLoading(false);
    }
  }}>
    Show Baseline SQL
  </Button>

</Box>

<Box sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'row', gap: 2 }}>
          {/* Dynamic Evaluation Panels */}
          {evalCombos.map(({ promptSet, llm }, idx) => {
            const result = runDetails && runDetails.generated_results
              ? runDetails.generated_results.find((r: any) =>
                  r.prompt_set_id === promptSet.id && r.llm_config_id === llm.id)
              : null;
            const feedback = result ? feedbackState[result.id] || { tag: '', comment: '', saving: false, saveSuccess: false, saveError: null } : { tag: '', comment: '', saving: false, saveSuccess: false, saveError: null };
            return (
              <Paper key={idx} elevation={2} sx={{ minWidth: 320, maxWidth: 400, flex: '0 0 320px', p: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  {promptSet.name} / {llm.name}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                  <TextField
                    value={getGeneratedSql(promptSet.id, llm.id)}
                    placeholder="Generated SQL will appear here."
                    multiline
                    minRows={6}
                    maxRows={12}
                    fullWidth
                    InputProps={{ readOnly: true }}
                  />
                  <IconButton
                    aria-label="Copy Generated SQL"
                    size="small"
                    onClick={async () => {
                      await navigator.clipboard.writeText(getGeneratedSql(promptSet.id, llm.id));
                      setCopiedSqlId(result?.id);
                      setTimeout(() => setCopiedSqlId(null), 1500);
                    }}
                    sx={{ alignSelf: 'flex-start', mt: 0.5 }}
                    disabled={!getGeneratedSql(promptSet.id, llm.id)}
                  >
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                  {copiedSqlId === result?.id && (
                    <Typography variant="caption" color="success.main" sx={{ ml: 1 }}>
                      Copied!
                    </Typography>
                  )}
                </Box>
                {result && typeof result.llm_response_time_ms === 'number' && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    LLM response time: {result.llm_response_time_ms} ms
                  </Typography>
                )}
                {/* EXPLAIN QUERY BUTTON */}
                {result && (
                  <Box sx={{ mt: 2 }}>
                    <Button
                      variant="outlined"
                      color="secondary"
                      fullWidth
                      onClick={() => handleExplainQuery(result)}
                      sx={{ mb: 2, justifyContent: 'flex-end', display: 'flex' }}
                    >
                      Explain and Compare Query
                    </Button>
                  </Box>
                )}

                {/* FEEDBACK UI */}
                {result && (
                  <Box sx={{ mt: 2 }}>
                    {/* Baseline Badge */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      {result.is_baseline && (
                        <Chip label="Baseline" color="success" size="small" />
                      )}
                    </Box>
                    <Typography variant="body2" sx={{ mb: 1 }}>Your Feedback</Typography>
                    <TextField
                      select
                      label="Evaluation"
                      value={feedback.tag}
                      onChange={e => handleFeedbackChange(result.id, 'tag', e.target.value)}
                      fullWidth
                      size="small"
                      sx={{ mb: 1 }}
                    >
                      <MenuItem value="">Select...</MenuItem>
                      <MenuItem value="correct">Correct</MenuItem>
                      <MenuItem value="Correct and use as new baseline">Correct and use as new baseline</MenuItem>
                      <MenuItem value="partially_correct">Partially Correct</MenuItem>
                      <MenuItem value="incorrect">Incorrect</MenuItem>
                    </TextField>
                    <TextField
                      label="Comments"
                      value={feedback.comment}
                      onChange={e => handleFeedbackChange(result.id, 'comment', e.target.value)}
                      multiline
                      minRows={2}
                      fullWidth
                      size="small"
                      sx={{ mb: 1 }}
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={() => handleSaveFeedback(result.id)}
                        disabled={feedback.saving || (!feedback.tag && !feedback.comment)}
                        size="small"
                      >
                        {feedback.saving ? 'Saving...' : 'Save'}
                      </Button>
                      {feedback.saveSuccess && <Typography color="success.main" variant="caption">Saved!</Typography>}
                      {feedback.saveError && <Typography color="error" variant="caption">{feedback.saveError}</Typography>}
                    </Box>
                  </Box>
                )}
              </Paper>
            );
          })}
        </Box>
      </Paper>
    {/* EXPLAIN QUERY DIALOG */}
    <Dialog
      open={explainOpen !== null}
      onClose={() => setExplainOpen(null)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Query Explanation
        <IconButton aria-label="close" onClick={() => setExplainOpen(null)} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ minHeight: 180 }}>
        {explainLoading && <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 100 }}><CircularProgress /></Box>}
        {explainError && <Alert severity="error">{explainError}</Alert>}
        {!explainLoading && !explainError && (
          <Typography variant="body1" sx={{ whiteSpace: 'pre-line', fontSize: 18 }}>
            {explainText}
          </Typography>
        )}
      </DialogContent>
    </Dialog>
  {/* Baseline SQL Modal */}
  <Dialog open={baselineModalOpen} onClose={() => setBaselineModalOpen(false)} maxWidth="md" fullWidth>
    <DialogTitle>Baseline SQL</DialogTitle>
    <DialogContent dividers sx={{ minHeight: 200, maxHeight: 500, minWidth: 400, maxWidth: 900, overflow: 'auto' }}>
      {baselineSqlLoading ? (
        <Typography variant="body2">Loading...</Typography>
      ) : baselineSqlError ? (
        <Typography color="error" variant="body2">{baselineSqlError}</Typography>
      ) : baselineSqlText ? (
        <Box sx={{ width: '100%', height: '100%', overflow: 'auto' }}>
          <pre style={{ whiteSpace: 'pre', overflow: 'auto', margin: 0 }}>{baselineSqlText}</pre>
        </Box>
      ) : (
        <Typography variant="body2">No baseline SQL available for this NLQ.</Typography>
      )}
    </DialogContent>
    <DialogActions>
      <Button onClick={() => setBaselineModalOpen(false)}>Close</Button>
    </DialogActions>
  </Dialog>
  </Box>
  );
};

export default EvaluateScreen;
