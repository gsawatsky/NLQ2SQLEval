import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Box,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';

interface LLMConfigFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (config: {
    name: string;
    provider: string;
    model: string;
    api_key: string;
    base_url?: string;
    description?: string;
  }) => Promise<void>;
  initialData?: {
    id?: number;
    name: string;
    provider: string;
    model: string;
    api_key?: string;
    base_url?: string;
    description?: string;
  } | null;
}

const PROVIDERS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'azure', label: 'Azure OpenAI' },
  { value: 'ollama', label: 'Ollama' },
  { value: 'vllm', label: 'vLLM' },
  { value: 'custom', label: 'Custom' },
];

const LLMConfigForm: React.FC<LLMConfigFormProps> = ({
  open,
  onClose,
  onSubmit,
  initialData,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    provider: 'openai',
    model: '',
    api_key: '',
    base_url: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        provider: initialData.provider || 'openai',
        model: initialData.model,
        api_key: initialData.api_key || '',
        base_url: initialData.base_url || '',
        description: initialData.description || '',
      });
    } else {
      setFormData({
        name: '',
        provider: 'openai',
        model: '',
        api_key: '',
        base_url: '',
        description: '',
      });
    }
    setError(null);
  }, [initialData, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectChange = (e: any) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await onSubmit({
        name: formData.name.trim(),
        provider: formData.provider,
        model: formData.model.trim(),
        api_key: formData.api_key.trim(),
        base_url: formData.base_url.trim() || undefined,
        description: formData.description.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {initialData ? 'Edit LLM Configuration' : 'Add New LLM Configuration'}
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <TextField
            margin="normal"
            required
            fullWidth
            id="name"
            label="Configuration Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            disabled={loading}
          />

          
          <FormControl fullWidth margin="normal" required>
            <InputLabel id="provider-label">Provider</InputLabel>
            <Select
              labelId="provider-label"
              id="provider"
              name="provider"
              value={formData.provider}
              label="Provider"
              onChange={handleSelectChange}
              disabled={loading}
            >
              {PROVIDERS.map(provider => (
                <MenuItem key={provider.value} value={provider.value}>
                  {provider.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <TextField
            margin="normal"
            required
            fullWidth
            id="model"
            label="Model Name"
            name="model"
            value={formData.model}
            onChange={handleChange}
            disabled={loading}
            helperText="e.g., gpt-4, claude-3-opus-20240229, gemini-pro, etc."
          />
          
          <TextField
            margin="normal"
            required
            fullWidth
            id="api_key"
            label="API Key"
            name="api_key"
            type="password"
            value={formData.api_key}
            onChange={handleChange}
            disabled={loading}
            helperText="Your API key for the selected provider"
          />
          
          <TextField
            margin="normal"
            fullWidth
            id="base_url"
            label="Base URL (Optional)"
            name="base_url"
            value={formData.base_url}
            onChange={handleChange}
            disabled={loading}
            helperText="Custom API endpoint URL (for self-hosted or custom deployments)"
          />
          
          <TextField
            margin="normal"
            fullWidth
            multiline
            rows={3}
            id="description"
            label="Description (Optional)"
            name="description"
            value={formData.description}
            onChange={handleChange}
            disabled={loading}
          />
          
          <Box mt={2}>
            <Typography variant="body2" color="textSecondary">
              <strong>Note:</strong> API keys are stored securely in the database.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading || !formData.name || !formData.provider || !formData.model || !formData.api_key}
          >
            {loading ? <CircularProgress size={24} /> : 'Save'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default LLMConfigForm;
