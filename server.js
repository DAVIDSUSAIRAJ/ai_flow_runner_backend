import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { callAIAgent, processStepWithAI, formatEmotionResult, formatCategoryResult } from './aiService.js';

const app = express();
app.use(cors());
app.use(express.json());

// Chat endpoint
app.post('/chat', async (req, res) => {
  try {
    const { text, language = 'en', history = [], stepType } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    let response;

    // Process based on step type or use direct chat
    if (stepType) {
      response = await processStepWithAI(stepType, text, language, history);
      
      // Format results for specific step types
      if (stepType === 'detect_emotion') {
        response = formatEmotionResult(response);
      } else if (stepType === 'categorize_text') {
        response = formatCategoryResult(response);
      }
    } else {
      // Direct chat without step processing
      response = await callAIAgent(text, language, history);
    }

    res.json({
      response: response,
      model: 'qwen/qwen3-coder:free',
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      error: error.message || 'Internal server error',
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'AI Flow Runner Backend is running' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

