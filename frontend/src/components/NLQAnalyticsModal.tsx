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

interface NLQAnalyticsModalProps {
  open: boolean;
  onClose: () => void;
}
// Removed duplicate interface and all dummy data.

export default function NLQAnalyticsModal({ open, onClose }: NLQAnalyticsModalProps) {
  // ...existing state...
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
  const [tableColumns, setTableColumns] = useState<any[]>([]);
  const [xCol, setXCol] = React.useState<string | null>(null);
  const [yCol, setYCol] = React.useState<string[]>([]);

  // Helper to parse chart_type from SQL comments
  function parseChartTypeFromSQL(sql: string): string | undefined {
    const match = sql.match(/--\s*chart_type:\s*([a-zA-Z0-9_]+)/i);
    return match ? match[1] : undefined;
  }

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

  // All duplicate state variable declarations and dummy data have been removed from the rest of the file.

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
  }, [tableColumns, tableResult]);

  // Removed duplicate state declarations and dummy data section. Only the state at the top of the component remains.

  const dummyRows: GridRowsProp = [
    { id: 1, col1: 'Hello', col2: 'World' },
    { id: 2, col1: 'Foo', col2: 'Bar' },
  ];
  const dummyColumns: GridColDef[] = [
    { field: 'col1', headerName: 'Col1', width: 150 },
    { field: 'col2', headerName: 'Col2', width: 150 },
  ];
  const dummyChartData = [
    { name: 'A', value: 400 },
    { name: 'B', value: 300 },
    { name: 'C', value: 200 },
  ];

    // Use real backend API calls
  const handleRunQuery = async () => {
    setQuerying(true);
    setError(null);
    setSqlResult('');
    setTableResult([]);
    setTableColumns([]);
    try {
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
      // 2. Execute SQL
      const execResp = await executeSqlQuery(sqlResp.sql);
      console.log('[NLQ Eval Analysis] SQL execution response:', execResp);
      if (execResp.error) {
        setError(execResp.error);
        setTableResult([]);
        setTableColumns([]);
        console.error('[NLQ Eval Analysis] SQL execution error:', execResp.error);
        return;
      }
      // Format columns for DataGrid
      const columns = execResp.columns.map((col: string) => ({
        field: col,
        headerName: col,
        width: 160,
      }));
      // Add id field for DataGrid
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



  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
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
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xl">
      <DialogTitle>NLQ Eval Analysis</DialogTitle>
      <DialogContent>
        <Box display="flex" flexDirection="column" gap={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <Box display="flex" gap={2} alignItems="center">
            <TextField
              label="Natural Language Query"
              value={nlq}
              onChange={e => setNlq(e.target.value)}
              fullWidth
            />
            <FormControl sx={{ minWidth: 160 }} disabled={loading || promptSets.length === 0}>
              <InputLabel>Prompt Set</InputLabel>
              <Select
                value={promptSet}
                label="Prompt Set"
                onChange={e => setPromptSet(e.target.value as number)}
              >
                {promptSets.filter(ps => ps.name.toLowerCase().includes('nlq')).map(ps => (
                  <MenuItem key={ps.id} value={ps.id}>{ps.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 120 }} disabled={loading || llms.length === 0}>
              <InputLabel>LLM</InputLabel>
              <Select
                value={llm}
                label="LLM"
                onChange={e => setLlm(e.target.value as number)}
              >
                {llms.map(l => (
                  <MenuItem key={l.id} value={l.id}>{l.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button 
              variant="contained" 
              color="primary" 
              disabled={loading || querying || !nlq || !promptSet || !llm}
              onClick={handleRunQuery}
            >
              {querying ? <CircularProgress size={24} /> : 'RUN QUERY'}
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              disabled={loading || querying || !sqlResult}
              onClick={async () => {
                setQuerying(true);
                setError(null);
                try {
                  const execResp = await executeSqlQuery(sqlResult);
                  console.log('[NLQ Eval Analysis] Rerun SQL execution response:', execResp);
                  if (execResp.error) {
                    setError(execResp.error);
                    setTableResult([]);
                    setTableColumns([]);
                    console.error('[NLQ Eval Analysis] SQL execution error:', execResp.error);
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
              }}
            >
              Re-run Query
            </Button>
          </Box>
          <Tabs value={tab} onChange={(_, v) => setTab(v)}>
            <Tab label="SQL" />
            <Tab label="Graph" />
            <Tab label="Table" />
          </Tabs>
          <Box minHeight={400}>
            {tab === 0 && (
              <Box p={2}>
                <Typography variant="subtitle1">Generated SQL</Typography>
                <Box component="pre" bgcolor="#f5f5f5" p={2} borderRadius={2}>
                  {sqlResult}
                </Box>
              </Box>
            )}
            {tab === 1 && (
              <Box p={2} height={400}>
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
                              <BarChart data={tableResult.map(row => {
                                const obj: any = { x: row[xCol] };
                                yCol.forEach((col: string) => { obj[col] = row[col]; });
                                return obj;
                              })}>
                                <XAxis dataKey="x" name={xCol} />
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
                      {chartType === 'grouped_bar' && Array.isArray(yCol) && yCol.length > 0 && (() => {
                        const numericCols = tableColumns.filter(col => yCol.includes(col.field));
                        if (numericCols.length === 0) {
                          return <Typography>No suitable numeric columns for grouped bar chart.</Typography>;
                        }
                        return (
                          <Box sx={{ overflowX: 'auto' }}>
                            <div style={{ width: Math.max(600, 80 * tableResult.length) }}>
                              <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={tableResult.map(row => {
                                  const group: any = { x: row[xCol] };
                                  numericCols.forEach(col => { group[col.field] = row[col.field]; });
                                  return group;
                                })}>
                                  <XAxis dataKey="x" name={xCol} />
                                  <YAxis />
                                  <Tooltip />
                                  <Legend />
                                  {numericCols.map((col, idx) => (
                                    <Bar key={col.field} dataKey={col.field} name={col.headerName} fill={["#1976d2", "#26a69a", "#ef5350", "#ffa726", "#ab47bc"][idx % 5]} />
                                  ))}
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </Box>
                        );
                      })()}
                      {chartType === 'stacked_bar' && Array.isArray(yCol) && yCol.length > 0 && (() => {
                        const numericCols = tableColumns.filter(col => yCol.includes(col.field));
                        if (numericCols.length === 0) {
                          return <Typography>No suitable numeric columns for stacked bar chart.</Typography>;
                        }
                        return (
                          <Box sx={{ overflowX: 'auto' }}>
                            <div style={{ width: Math.max(600, 80 * tableResult.length) }}>
                              <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={tableResult.map(row => {
                                  const group: any = { x: row[xCol] };
                                  numericCols.forEach(col => { group[col.field] = row[col.field]; });
                                  return group;
                                })}>
                                  <XAxis dataKey="x" name={xCol} />
                                  <YAxis />
                                  <Tooltip />
                                  <Legend />
                                  {numericCols.map((col, idx) => (
                                    <Bar key={col.field} dataKey={col.field} name={col.headerName} stackId="a" fill={["#1976d2", "#26a69a", "#ef5350", "#ffa726", "#ab47bc"][idx % 5]} />
                                  ))}
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </Box>
                        );
                      })()}
                      {chartType === 'scatter' && Array.isArray(yCol) && yCol.length > 0 && (
                        <ResponsiveContainer width="100%" height={300}>
                          <ScatterChart>
                            <XAxis type="number" dataKey={xCol || ''} name={xCol} />
                            {yCol.map((col: string, idx: number) => (
                              <YAxis key={col} type="number" dataKey={col} name={col} yAxisId={col} />
                            ))}
                            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                            <Legend />
                            {yCol.map((col: string, idx: number) => (
                              <Scatter key={col} name={col} data={tableResult} fill={["#1976d2", "#26a69a", "#ef5350", "#ffa726", "#ab47bc"][idx % 5]} dataKey={col} yAxisId={col} />
                            ))}
                          </ScatterChart>
                        </ResponsiveContainer>
                      )}
                      {chartType === 'line' && Array.isArray(yCol) && yCol.length > 0 && (
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={tableResult}>
                            <XAxis dataKey={xCol || ''} name={xCol} />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            {yCol.map((col: string, idx: number) => (
                              <Line key={col} type="monotone" dataKey={col} name={col} stroke={["#1976d2", "#26a69a", "#ef5350", "#ffa726", "#ab47bc"][idx % 5]} />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                      {chartType === 'heatmap' && yCol.length > 0 && (() => {
                        // Minimal HTML heatmap: xCol as columns, yCol as rows, value is cell count or mean of a numeric col
                        if (!xCol || !yCol) return <Typography>No columns selected for heatmap.</Typography>;
                        // Get unique x and y values
                        const xVals = Array.from(new Set(tableResult.map(row => row[xCol])));
                        const yVals = Array.from(new Set(tableResult.map(row => row[yCol[0]])));
                        // Build value matrix (count occurrences)
                        const matrix = yVals.map(yv => xVals.map(xv => tableResult.filter(row => row[xCol] === xv && row[yCol[0]] === yv).length));
                        return (
                          <Box>
                            <Typography>Heatmap: {xCol} vs {yCol[0]}</Typography>
                            <Box sx={{ overflowX: 'auto' }}>
                              <div style={{ minWidth: Math.max(600, 60 * xVals.length + 100) }}>
                                <table style={{ borderCollapse: 'collapse', width: '100%', marginTop: 8 }}>
                                  <thead>
                                    <tr>
                                      <th style={{ border: '1px solid #ccc', padding: 2, minWidth: '80px' }}></th>
                                      {xVals.map(xv => <th key={xv} style={{ border: '1px solid #ccc', padding: 2, minWidth: '60px' }}>{xv}</th>)}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {yVals.map((yv, yi) => (
                                      <tr key={yv}>
                                        <th style={{ border: '1px solid #ccc', padding: 2, minWidth: '80px' }}>{yv}</th>
                                        {matrix[yi].map((val, xi) => (
                                          <td key={xi} style={{ background: `rgba(25, 118, 210, ${val > 0 ? 0.2 + 0.8 * val / Math.max(...matrix.flat()) : 0})`, border: '1px solid #ccc', textAlign: 'center', padding: 2, minWidth: '60px' }}>{val}</td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </Box>
                          </Box>
                        );
                      })()}
                      {chartType === 'pie' && yCol.length > 0 && (
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Tooltip />
                            <Legend />
                            <Pie
                              data={tableResult}
                              dataKey={yCol[0]}
                              nameKey={xCol || ''}
                              cx="50%"
                              cy="50%"
                              outerRadius={100}
                              fill="#1976d2"
                              label
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                      {chartType === 'box' && yCol.length > 0 && (() => {
                        // Minimal SVG box plot for yCol grouped by xCol
                        if (!xCol || !yCol) return <Typography>No columns selected for box plot.</Typography>;
                        const groups = Array.from(new Set(tableResult.map(row => row[xCol])));
                        const stats = groups.map(g => {
                          const vals = tableResult.filter(row => row[xCol] === g).map(row => row[yCol[0]]).filter(v => typeof v === 'number').sort((a, b) => a - b);
                          if (!vals.length) return undefined;
                          const q1 = vals[Math.floor(vals.length * 0.25)];
                          const median = vals[Math.floor(vals.length * 0.5)];
                          const q3 = vals[Math.floor(vals.length * 0.75)];
                          const min = vals[0];
                          const max = vals[vals.length - 1];
                          return { group: g, min, q1, median, q3, max };
                        }).filter((s): s is { group: string; min: number; q1: number; median: number; q3: number; max: number } => s !== undefined);
                        if (!stats.length) return <Typography>No numeric data for box plot.</Typography>;
                        // SVG rendering
                        const minVal = Math.min(...stats.map(s2 => s2.min));
                        const maxVal = Math.max(...stats.map(s2 => s2.max));
                        const width = 40 * stats.length + 40, height = 160;
                        const scale = (v: number) => height - 20 - ((v - minVal) / (maxVal - minVal + 1e-6)) * 120;
                        return (
                          <Box>
                            <Typography>Box Plot: {yCol[0]} grouped by {xCol}</Typography>
                            <svg width={width} height={height} style={{ background: '#f5f5f5', marginTop: 8 }}>
                              {stats.map((s, i) => {
                                const x = 40 + i * 40;
                                return (
                                  <g key={s.group}>
                                    {/* Whiskers */}
                                    <line x1={x} x2={x} y1={scale(s.min)} y2={scale(s.max)} stroke="#1976d2" />
                                    {/* Box */}
                                    <rect x={x - 10} y={scale(s.q3)} width={20} height={scale(s.q1) - scale(s.q3)} fill="#1976d2" opacity={0.4} />
                                    {/* Median */}
                                    <line x1={x - 10} x2={x + 10} y1={scale(s.median)} y2={scale(s.median)} stroke="#1976d2" strokeWidth={2} />
                                    {/* Min/Max ticks */}
                                    <line x1={x - 7} x2={x + 7} y1={scale(s.min)} y2={scale(s.min)} stroke="#1976d2" />
                                    <line x1={x - 7} x2={x + 7} y1={scale(s.max)} y2={scale(s.max)} stroke="#1976d2" />
                                    {/* Group label */}
                                    <text x={x} y={height - 5} fontSize={12} textAnchor="middle">{s.group}</text>
                                  </g>
                                );
                              })}
                            </svg>
                          </Box>
                        );
                      })()}
                      {chartType === 'pareto' && yCol.length > 0 && (() => {
                        // Pareto: sorted bar chart, xCol as category, yCol as value, descending
                        if (!xCol || !yCol) return <Typography>No columns selected for Pareto chart.</Typography>;
                        const sorted = [...tableResult].sort((a, b) => (b[yCol[0]] ?? 0) - (a[yCol[0]] ?? 0));
                        return (
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={sorted}>
                              <XAxis dataKey={xCol} name={xCol} />
                              <YAxis name={yCol[0]} />
                              <Tooltip />
                              <Legend />
                              <Bar dataKey={yCol[0]} name={yCol[0]} fill="#1976d2" />
                            </BarChart>
                          </ResponsiveContainer>
                        );
                      })()}

                    </>
                  ) : <Typography>No suitable columns for bar chart.</Typography>
                ) : <Typography>No data to display.</Typography>}
              </Box>
            )}
            {tab === 2 && (
              <Box p={2}>
                <Typography variant="subtitle1">Result Table</Typography>
                <Box height={300}>
                  <DataGrid rows={tableResult} columns={tableColumns} />
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
