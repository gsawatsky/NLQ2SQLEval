import React, { useState, useEffect, useMemo } from 'react';
import {
  Grid, Paper, Typography, TextField, Button, Divider, MenuItem, Select, InputLabel, FormControl, CircularProgress, Box, OutlinedInput, Chip, Alert, Dialog, DialogTitle, DialogContent, IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { fetchPromptSets, fetchLLMConfigs, runEvaluation, fetchRunDetails, createNlq, updateGeneratedResult, explainQuery } from '../api';

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
  const [nlq, setNlq] = useState('');
  const [baselineSql, setBaselineSql] = useState('');
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

  // Sync feedback state with results when runDetails changes
  useEffect(() => {
    if (!runDetails || !runDetails.generated_results) return;
    const newState: any = {};
    runDetails.generated_results.forEach((r: any) => {
      newState[r.id] = {
        tag: r.human_evaluation_tag || '',
        comment: r.comments || '',
        saving: false,
        saveSuccess: false,
        saveError: null,
      };
    });
    setFeedbackState(newState);
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
    setFeedbackState(prev => ({
      ...prev,
      [resultId]: { ...prev[resultId], saving: true, saveSuccess: false, saveError: null },
    }));
    try {
      const { tag, comment } = feedbackState[resultId];
      await updateGeneratedResult(resultId, {
        human_evaluation_tag: tag,
        comments: comment,
      });
      setFeedbackState(prev => ({
        ...prev,
        [resultId]: { ...prev[resultId], saving: false, saveSuccess: true },
      }));
      setTimeout(() => {
        setFeedbackState(prev => ({
          ...prev,
          [resultId]: { ...prev[resultId], saveSuccess: false },
        }));
      }, 2000);
    } catch (e: any) {
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
    try {
      setRunning(true);
      setRunResult(null);
      setRunDetails(null);
      setError(null);

      // 1. Create NLQ in backend from user input
      const nlqResponse = await createNlq(nlq, baselineSql);
      const nlqId = nlqResponse.id;

      // 2. Run evaluation with the new NLQ ID
      const { run_id } = await runEvaluation([nlqId], selectedPromptSets, selectedLlmConfigs);
      setRunResult(run_id);

      // 3. Fetch run details/results
      const details = await fetchRunDetails(run_id);
      setRunDetails(details);
    } catch (e: any) {
      setError(e.message);
    } finally {
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
      // Use the baselineSql from state and generated_sql from the result
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
            <TextField
              label="NLQ"
              multiline
              minRows={3}
              fullWidth
              value={nlq}
              onChange={e => setNlq(e.target.value)}
              sx={{ mb: 2 }}
            />
          </Box>
          <Box sx={{ flex: 1, minWidth: 300 }}>
            <Typography variant="subtitle1" gutterBottom>Baseline SQL</Typography>
            <TextField
              label="Baseline SQL"
              multiline
              minRows={3}
              fullWidth
              value={baselineSql}
              onChange={e => setBaselineSql(e.target.value)}
              sx={{ mb: 2 }}
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
        <Box sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'row', gap: 2 }}>
          {/* Baseline SQL Panel */}
          <Paper elevation={2} sx={{ minWidth: 320, maxWidth: 400, flex: '0 0 320px', p: 2, mr: 2, bgcolor: '#f5f5f5' }}>
            <Typography variant="subtitle2" color="text.secondary">Baseline SQL</Typography>
            <TextField
              value={baselineSql}
              multiline
              minRows={6}
              maxRows={12}
              fullWidth
              InputProps={{ readOnly: true }}
              sx={{ mt: 1 }}
            />
          </Paper>
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
  </Box>
  );
};

export default EvaluateScreen;
