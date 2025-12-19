import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { callAIAgent, processStepWithAI, formatEmotionResult, formatCategoryResult, getBookChatbotPrompt } from './aiService.js';
import { getBookContent, isBookChatbotRequest, normalizeLanguage } from './bookService.js';

const app = express();
app.use(cors());
app.use(express.json());

// Chat endpoint - Handles both book chatbot and workflow steps
app.post('/chat', async (req, res) => {
  try {
    const { text, language = 'en', history = [], stepType } = req.body;

    if (!text) {
      return res.status(400).json({ 
        error: 'Text is required',
        success: false 
      });
    }

    // Normalize language (handles both "tamil" and "ta")
    const normalizedLang = normalizeLanguage(language);

    let response;
    let isBookChat = false;

    // Check if it's a book chatbot request (no stepType or stepType is 'book_chat')
    if (isBookChatbotRequest(stepType)) {
      // Book Chatbot Mode
      isBookChat = true;
      const bookContent = getBookContent(normalizedLang);
      const prompt = await getBookChatbotPrompt(bookContent, text, normalizedLang, history);
      response = await callAIAgent(prompt, normalizedLang, []);
      
      res.json({
        success: true,
        question: text,
        language: normalizedLang,
        answer: response,
        model: 'qwen/qwen3-coder:free',
        type: 'book_chatbot'
      });
    } else {
      // Workflow Step Mode
      response = await processStepWithAI(stepType, text, normalizedLang, history);
      
      // Format results for specific step types
      if (stepType === 'detect_emotion') {
        response = formatEmotionResult(response);
      } else if (stepType === 'categorize_text') {
        response = formatCategoryResult(response);
      }

      res.json({
        success: true,
        response: response,
        model: 'qwen/qwen3-coder:free',
        stepType: stepType,
        language: normalizedLang,
        type: 'workflow'
      });
    }
  } catch (error) {
    console.error('=== Server Error ===');
    console.error('Error:', error);
    console.error('Error stack:', error.stack);
    
    // Get appropriate status code
    const statusCode = error.statusCode || error.status || 500;
    
    // Better error messages
    let errorMessage = error.message || 'Internal server error';
    
    // Handle rate limit errors
    if (error.isRateLimit || statusCode === 429) {
      errorMessage = 'Rate limit exceeded. Please wait 10-15 seconds and try again. The free model has usage limits.';
    }
    
    // Response with error details
    const errorResponse = {
      error: errorMessage,
      statusCode: statusCode
    };
    
    // Add details in development mode
    if (process.env.NODE_ENV !== 'production') {
      if (error.originalError) {
        errorResponse.originalError = error.originalError.message;
      }
      if (error.stack) {
        errorResponse.stack = error.stack.split('\n').slice(0, 3).join('\n');
      }
    }
    
    res.status(statusCode).json(errorResponse);
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'AI Flow Runner Backend is running' });
});

const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${PORT} is already in use!`);
    console.error(`\nTry one of these solutions:`);
    console.error(`1. Kill the process using port ${PORT}:`);
    console.error(`   Get-NetTCPConnection -LocalPort ${PORT} | Select-Object -ExpandProperty OwningProcess | Stop-Process -Force`);
    console.error(`2. Use a different port:`);
    console.error(`   $env:PORT=3002; npm run dev`);
    console.error(`3. Wait a few seconds for the port to be released\n`);
    process.exit(1);
  } else {
    throw error;
  }
});

