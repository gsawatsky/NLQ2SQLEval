import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import LLMConfigForm from './LLMConfigForm';
import { fetchLLMConfigs, createLLMConfig, updateLLMConfig, deleteLLMConfig } from '../api';

interface LLMConfig {
  id: number;
  name: string;
  provider: string;
  model: string;
  base_url?: string;
  description?: string;
}

const LLMConfigManager: React.FC = () => {
  const [configs, setConfigs] = useState<LLMConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<LLMConfig | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const data = await fetchLLMConfigs();
      setConfigs(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load LLM configurations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  const handleCreate = () => {
    setSelectedConfig(null);
    setFormOpen(true);
  };

  const handleEdit = (config: LLMConfig) => {
    setSelectedConfig(config);
    setFormOpen(true);
  };

  const handleDeleteClick = (id: number) => {
    setPendingDeleteId(id);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (pendingDeleteId === null) return;
    
    try {
      await deleteLLMConfig(pendingDeleteId);
      await loadConfigs();
      setDeleteConfirmOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete configuration');
    } finally {
      setPendingDeleteId(null);
    }
  };

  const handleSubmit = async (data: {
    name: string;
    provider: string;
    model: string;
    api_key: string;
    base_url?: string;
    description?: string;
  }) => {
    try {
      if (selectedConfig) {
        // Update existing
        await updateLLMConfig(selectedConfig.id, data);
      } else {
        // Create new
        await createLLMConfig(data);
      }
      await loadConfigs();
      setFormOpen(false);
    } catch (err) {
      throw err;
    }
  };

  const getProviderLabel = (provider: string) => {
    const providerMap: Record<string, string> = {
      'openai': 'OpenAI',
      'anthropic': 'Anthropic',
      'gemini': 'Google Gemini',
      'azure': 'Azure OpenAI',
      'ollama': 'Ollama',
      'vllm': 'vLLM',
      'custom': 'Custom',
    };
    return providerMap[provider] || provider;
  };

  if (loading && configs.length === 0) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">LLM Configurations</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<Add />}
          onClick={handleCreate}
        >
          Add Configuration
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {configs.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="textSecondary" gutterBottom>
            No LLM configurations found.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Add />}
            onClick={handleCreate}
            sx={{ mt: 2 }}
          >
            Add Your First Configuration
          </Button>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Provider</TableCell>
                <TableCell>Model</TableCell>
                <TableCell>Base URL</TableCell>
                <TableCell>Description</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {configs.map((config) => (
                <TableRow key={config.id}>
                  <TableCell>{config.name}</TableCell>
                  <TableCell>{getProviderLabel(config.provider)}</TableCell>
                  <TableCell>{config.model}</TableCell>
                  <TableCell>
                    {config.base_url ? (
                      <Typography variant="body2" noWrap style={{ maxWidth: 200 }}>
                        {config.base_url}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="textSecondary">
                        Default
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {config.description || (
                      <Typography variant="body2" color="textSecondary">
                        No description
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={() => handleEdit(config)}
                        color="primary"
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteClick(config.id)}
                        color="error"
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <LLMConfigForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        initialData={selectedConfig}
      />

      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Delete Configuration</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this LLM configuration? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LLMConfigManager;
