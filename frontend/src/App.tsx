import React from 'react';
import { AppBar, Toolbar, Typography, Container, Box } from '@mui/material';
import EvaluateScreen from './components/EvaluateScreen';

function App() {
  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            System1 NLQ2SQL Evaluator
          </Typography>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <EvaluateScreen />
      </Container>
    </Box>
  );
}

export default App;
