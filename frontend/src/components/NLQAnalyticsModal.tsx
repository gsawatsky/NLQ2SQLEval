import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Tabs,
  Tab,
  TextField,
  Button,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Typography,
  CircularProgress,
  Alert
} from '@mui/material';
import { DataGrid, GridRowsProp, GridColDef } from '@mui/x-data-grid';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  ScatterChart, 
  Scatter, 
  LineChart, 
  Line, 
  PieChart, 
  Pie 
} from 'recharts';
import { fetchPromptSets, fetchLLMConfigs, generateSqlFromNlq, executeSqlQuery } from '../api';
import { useSnowflakeContext } from '../contexts/SnowflakeContext';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';

interface PromptSet {
  id: number;
  name: string;
  description: string;
}

interface LLMConfig {
  id: number;
  name: string;
  model: string;
  description?: string;
}

interface SnowflakeConnection {
  id: string;
  name: string;
}

interface NLQAnalyticsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function NLQAnalyticsModal({ open, onClose }: NLQAnalyticsModalProps) {
  // Context
  const {
    connections,
    loading: connectionsLoading,
    error: connectionsError
  } = useSnowflakeContext();

  // State
  const [selectedConnection, selectConnection] = useState<string | SnowflakeConnection>('local_db');
  const [chartType, setChartType] = React.useState<string>('bar');
  const [tab, setTab] = useState(0);
  const [nlq, setNlq] = useState('');
  const [promptSets, setPromptSets] = useState<PromptSet[]>([]);
  const [llms, setLlms] = useState<LLMConfig[]>([]);
  const [promptSet, setPromptSet] = useState<number | ''>('');
  const [llm, setLlm] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [querying, setQuerying] = useState(false);
  const [sqlResult, setSqlResult] = useState<string>('');
  const [tableResult, setTableResult] = useState<any[]>([]);
  const [tableColumns, setTableColumns] = useState<GridColDef[]>([]);
  const [xCol, setXCol] = React.useState<string | null>(null);
  const [yCol, setYCol] = React.useState<string[]>([]);

  // Chart types
  const chartTypes = [
    { value: 'bar', label: 'Bar Chart' },
    { value: 'stacked_bar', label: 'Stacked Bar Chart' },
    { value: 'grouped_bar', label: 'Grouped Bar Chart' },
    { value: 'scatter', label: 'Scatter Plot' },
    { value: 'line', label: 'Line Chart' },
    { value: 'heatmap', label: 'Heatmap' },
    { value: 'pie', label: 'Pie Chart' },
    { value: 'box', label: 'Box Plot' },
    { value: 'pareto', label: 'Pareto Chart' },
  ];

  // Helper to parse chart_type from SQL comments
  function parseChartTypeFromSQL(sql: string): string | undefined {
    const match = sql.match(/--\s*chart_type:\s*([a-zA-Z0-9_]+)/i);
    return match ? match[1] : undefined;
  }

  // Handler for Re-run Query button
  const handleRerunQuery = async () => {
    setQuerying(true);
    setError(null);
    try {
      console.log('[NLQ Eval Analysis] Re-executing SQL with connection:', selectedConnection);
      const execResp = await executeSqlQuery(sqlResult, selectedConnection);
      if (execResp.error) {
        setError(execResp.error);
        setTableResult([]);
        setTableColumns([]);
        return;
      }
      const columns = execResp.columns.map((col: string) => ({
        field: col,
        headerName: col,
        width: 160,
      }));
      const rows = execResp.rows.map((row: any[], idx: number) => {
        const obj: any = { id: idx };
        execResp.columns.forEach((col: string, i: number) => {
          obj[col] = row[i];
        });
        return obj;
      });
      setTableColumns(columns);
      setTableResult(rows);
    } catch (e: any) {
      setError(e.message || 'Failed to re-execute SQL');
    } finally {
      setQuerying(false);
    }
  };

  // Main query handler
  const handleRunQuery = async () => {
    setQuerying(true);
    setError(null);
    setSqlResult('');
    setTableResult([]);
    setTableColumns([]);
    try {
      if (!selectedConnection) {
        throw new Error('Please select a database connection first');
      }
      // 1. Generate SQL
      const sqlResp = await generateSqlFromNlq(nlq, Number(promptSet), Number(llm));
      console.log('[NLQ Eval Analysis] Generated SQL:', sqlResp.sql);
      if (sqlResp.error) {
        setError(sqlResp.error);
        setSqlResult(sqlResp.sql || '');
        setTab(0);
        console.error('[NLQ Eval Analysis] SQL generation error:', sqlResp.error);
        return;
      }
      setSqlResult(sqlResp.sql);
      setTab(0); // Switch to SQL tab
      // 2. Execute the SQL
      console.log('[NLQ Eval Analysis] Executing SQL with connection:', selectedConnection);
      const execResp = await executeSqlQuery(sqlResp.sql, selectedConnection);
      console.log('[NLQ Eval Analysis] SQL execution response:', execResp);
      if (execResp.error) {
        setError(execResp.error);
        setTableResult([]);
        setTableColumns([]);
        console.error('[NLQ Eval Analysis] SQL execution error:', execResp.error);
        return;
      }

      // 3. Process results for DataGrid
      const columns = execResp.columns.map((col: string) => ({
        field: col,
        headerName: col,
        width: 160,
      }));

      const rows = execResp.rows.map((row: any[], idx: number) => {
        const obj: any = { id: idx };
        execResp.columns.forEach((col: string, i: number) => {
          obj[col] = row[i];
        });
        return obj;
      });

      console.log('[NLQ Eval Analysis] DataGrid columns:', columns);
      console.log('[NLQ Eval Analysis] DataGrid rows:', rows);
      setTableColumns(columns);
      setTableResult(rows);
    } catch (e: any) {
      setError(e.message || 'Failed to run query');
      console.error('[NLQ Eval Analysis] Exception in handleRunQuery:', e);
    } finally {
      setQuerying(false);
    }
  };

  // When SQL changes, auto-set chart type if a recommendation is found
  React.useEffect(() => {
    if (typeof sqlResult === 'string') {
      const recommended = parseChartTypeFromSQL(sqlResult);
      if (recommended && recommended !== chartType) {
        setChartType(recommended);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeof sqlResult === 'string' ? sqlResult : '']);

  // Set default X & Y columns when table data changes
  React.useEffect(() => {
    const colOptions = tableColumns.filter((col: any) => col.field !== 'id');
    if (colOptions.length > 0) {
      setXCol(xCol => (xCol && colOptions.some((col: any) => col.field === xCol)) ? xCol : colOptions[0].field);
      // Prefer first numeric col that's not xCol
      const numeric = colOptions.find((col: any) => col.field !== (xCol || colOptions[0].field) && tableResult.some((row: any) => typeof row[col.field] === 'number'));
      setYCol(yCol => {
        // If current yCol is valid and not same as xCol, keep it (as array)
        if (Array.isArray(yCol) && yCol.length > 0 && yCol.every(y => colOptions.some((col: any) => col.field === y)) && !yCol.includes(xCol ?? '')) {
          return yCol;
        }
        // Otherwise, pick a default numeric col (not xCol)
        if (numeric) return [numeric.field];
        if (colOptions[1] && colOptions[1].field !== xCol) return [colOptions[1].field];
        if (colOptions[0] && colOptions[0].field !== xCol) return [colOptions[0].field];
        return [];
      });
    } else {
      setXCol(null);
      setYCol([]);
    }
  }, [tableColumns, tableResult, xCol]);
  
  // Load prompt sets and LLM configs when modal opens
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    
    // Set local database as default if no connection is selected
    if (!selectedConnection) {
      selectConnection('local_db');
    }
    
    Promise.all([fetchPromptSets(), fetchLLMConfigs()])
      .then(([ps, llms]) => {
        setPromptSets(ps);
        setLlms(llms);
        setPromptSet(ps.length > 0 ? ps[0].id : '');
        setLlm(llms.length > 0 ? llms[0].id : '');
      })
      .catch((e) => {
        setError(e.message || 'Failed to load prompt sets or LLMs');
      })
      .finally(() => setLoading(false));
  }, [open, selectedConnection, selectConnection]);

  // For demo/development
  const dummyRows: GridRowsProp = [
    { id: 1, col1: 'Hello', col2: 'World' },
    { id: 2, col1: 'Foo', col2: 'Bar' },
  ];
  
  const dummyColumns: GridColDef[] = [
    { field: 'col1', headerName: 'Col1', width: 150 },
    { field: 'col2', headerName: 'Col2', width: 150 },
  ];

  // Render the component
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{ sx: { height: '80vh' } }}
    >
      <DialogTitle>
        NLQ Eval Analysis
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box display="flex" flexDirection="column" height="100%">
          <Box mb={2}>
            <Typography variant="subtitle1">Query Configuration</Typography>
            <Box display="flex" flexDirection="row" gap={2} mb={2}>
              <FormControl sx={{ minWidth: 200, flex: 1 }}>
                <InputLabel>Database Connection</InputLabel>
                <Select
                  value={selectedConnection || 'local_db'}
                  label="Database Connection"
                  onChange={(e) => selectConnection(e.target.value as string)}
                  disabled={connectionsLoading}
                >
                  <MenuItem key="local_db" value="local_db">
                    Local NLQ2SQL_EVAL
                  </MenuItem>
                  {connections.map((conn) => (
                    <MenuItem key={conn.id} value={conn.id}>
                      {conn.name}
                    </MenuItem>
                  ))}
                </Select>
                {connectionsLoading && <CircularProgress size={24} sx={{ ml: 1 }} />}
              </FormControl>
              <FormControl sx={{ minWidth: 200, flex: 1 }}>
                <InputLabel>Prompt Set</InputLabel>
                <Select
                  value={promptSet}
                  label="Prompt Set"
                  onChange={(e) => setPromptSet(e.target.value as number | '')}
                  disabled={loading || promptSets.length === 0}
                >
                  {promptSets.map((set) => (
                    <MenuItem key={set.id} value={set.id}>
                      {set.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl sx={{ minWidth: 200, flex: 1 }}>
                <InputLabel>LLM</InputLabel>
                <Select
                  value={llm}
                  label="LLM"
                  onChange={(e) => setLlm(e.target.value as number | '')}
                  disabled={loading || llms.length === 0}
                >
                  {llms.map((model) => (
                    <MenuItem key={model.id} value={model.id}>
                      {model.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            {connectionsError && (
              <Alert severity="error" sx={{ mt: 1, mb: 2 }}>
                {connectionsError}
              </Alert>
            )}

            <Box display="flex" gap={2}>
              <TextField
                label="Natural Language Query"
                value={nlq}
                onChange={(e) => setNlq(e.target.value)}
                disabled={loading || querying}
                multiline
                rows={3}
                fullWidth
              />
              <Button
                variant="contained"
                onClick={handleRunQuery}
                disabled={loading || querying || !nlq || (!selectedConnection && !promptSet) || promptSet === '' || llm === ''}
                sx={{ alignSelf: 'flex-end', minWidth: 100 }}
              >
                {querying ? <CircularProgress size={24} /> : 'Run Query'}
              </Button>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </Box>
          
          <Box display="flex" flexDirection="column" flexGrow={1} overflow="hidden">
            <Box mb={2} display="flex" gap={2} alignItems="center">
              <Button
                variant="outlined"
                disabled={!sqlResult || querying}
                onClick={handleRerunQuery}
              >
                Re-run Query
              </Button>
            </Box>
            <Tabs value={tab} onChange={(_, v) => setTab(v)}>
              <Tab label="SQL" />
              <Tab label="Graph" />
              <Tab label="Table" />
            </Tabs>
            <Box flexGrow={1} overflow="auto">
              {tab === 0 && (
                <Box p={2}>
                  <Typography variant="subtitle1">Generated SQL</Typography>
                  <Box component="pre" bgcolor="#f5f5f5" p={2} borderRadius={2} overflow="auto">
                    {sqlResult}
                  </Box>
                </Box>
              )}
              {tab === 1 && (
                <Box p={2}>
                  <Typography variant="subtitle1">Graph Visualization</Typography>
                  {tableResult.length > 0 && tableColumns.length > 1 ? (
                    xCol && yCol.length > 0 ? (
                      <>
                        <Box display="flex" gap={2} mb={2}>
                          <FormControl size="small" sx={{ minWidth: 180 }}>
                            <InputLabel>X Axis</InputLabel>
                            <Select
                              value={xCol}
                              label="X Axis"
                              onChange={e => setXCol(e.target.value)}
                            >
                              {tableColumns.filter(col => col.field !== 'id').map(col => (
                                <MenuItem key={col.field} value={col.field}>{col.headerName}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          <FormControl size="small" sx={{ minWidth: 180 }}>
                            <InputLabel>Y Axis</InputLabel>
                            <Select
                              multiple={['bar','grouped_bar','stacked_bar','line','scatter'].includes(chartType)}
                              value={yCol}
                              label="Y Axis"
                              onChange={e => {
                                const value = e.target.value;
                                setYCol(Array.isArray(value) ? value : [value]);
                              }}
                              renderValue={(selected) => Array.isArray(selected) ? selected.join(', ') : selected}
                            >
                              {tableColumns.filter(col => col.field !== 'id' && col.field !== xCol).map(col => (
                                <MenuItem key={col.field} value={col.field}>{col.headerName}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          <FormControl size="small" sx={{ minWidth: 200 }}>
                            <InputLabel>Chart Type</InputLabel>
                            <Select
                              value={chartType}
                              label="Chart Type"
                              onChange={e => setChartType(e.target.value)}
                            >
                              {chartTypes.map(type => (
                                <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Box>
                        {/* Chart Rendering */}
                        {chartType === 'bar' && Array.isArray(yCol) && yCol.length > 0 && (
                          <Box sx={{ overflowX: 'auto' }}>
                            <div style={{ width: Math.max(600, 80 * tableResult.length) }}>
                              <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={tableResult}>
                                  <XAxis dataKey={xCol} name={xCol} />
                                  <YAxis />
                                  <Tooltip />
                                  <Legend />
                                  {yCol.map((col: string, idx: number) => (
                                    <Bar key={col} dataKey={col} name={col} fill={["#1976d2", "#26a69a", "#ef5350", "#ffa726", "#ab47bc"][idx % 5]} />
                                  ))}
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </Box>
                        )}
                        {chartType === 'line' && Array.isArray(yCol) && yCol.length > 0 && (
                          <Box sx={{ overflowX: 'auto' }}>
                            <div style={{ width: Math.max(600, 80 * tableResult.length) }}>
                              <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={tableResult}>
                                  <XAxis dataKey={xCol} name={xCol} />
                                  <YAxis />
                                  <Tooltip />
                                  <Legend />
                                  {yCol.map((col: string, idx: number) => (
                                    <Line key={col} type="monotone" dataKey={col} name={col} stroke={["#1976d2", "#26a69a", "#ef5350", "#ffa726", "#ab47bc"][idx % 5]} />
                                  ))}
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          </Box>
                        )}
                      </>
                    ) : <Typography>Please select X and Y columns.</Typography>
                  ) : <Typography>No data to display.</Typography>}
                </Box>
              )}
              {tab === 2 && (
                <Box p={2} height="100%">
                  <Typography variant="subtitle1">Result Table</Typography>
                  <Box height="calc(100% - 40px)">
                    <DataGrid
                      rows={tableResult}
                      columns={tableColumns}
                      disableRowSelectionOnClick
                      autoPageSize
                    />
                  </Box>
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
