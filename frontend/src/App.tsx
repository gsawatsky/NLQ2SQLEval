import React, { useState } from 'react';
import { AppBar, Toolbar, Typography, Container, Box, Button } from '@mui/material';
import EvaluateScreen from './components/EvaluateScreen';
import NLQAnalyticsModal from './components/NLQAnalyticsModal';

function App() {
  const [analyticsOpen, setAnalyticsOpen] = useState(false);

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            System1 NLQ2SQL Evaluator
          </Typography>
          <Button color="inherit" onClick={() => setAnalyticsOpen(true)}>
            NLQ Eval Analysis
          </Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <EvaluateScreen />
      </Container>
      <NLQAnalyticsModal
        open={analyticsOpen}
        onClose={() => setAnalyticsOpen(false)}
      />
    </Box>
  );
}

export default App;
