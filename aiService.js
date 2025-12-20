// AI Agent Service using Groq SDK with Qwen2.5 Coder
import Groq from 'groq-sdk';

// Initialize Groq client
// IMPORTANT: Add GROQ_API_KEY to your .env file for security
// After testing, delete the old key from Groq Console and create a new one
const apiKey = process.env.GROQ_API_KEY;

if (!apiKey) {
  console.error('ERROR: GROQ_API_KEY is required in .env file!');
  console.error('Please add GROQ_API_KEY=your_key_here to your .env file');
}

const groq = new Groq({
  apiKey: apiKey,
});

// Log API key status (first few chars only for security)
if (apiKey) {
  console.log('✅ Groq API Key loaded:', apiKey.substring(0, 15) + '...');
} else {
  console.warn('⚠️  No API key found - requests will fail');
}

// Language names mapping
const LANGUAGE_NAMES = {
  en: 'English',
  ta: 'Tamil',
  hi: 'Hindi',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  ja: 'Japanese',
  zh: 'Chinese',
  ko: 'Korean',
  ar: 'Arabic',
  pt: 'Portuguese',
  te: 'Telugu',
  ml: 'Malayalam',
};


/**
 * Sleep/delay function for retries
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Call Groq API with Qwen2.5 Coder 32B with automatic retry on rate limit
 */
export const callAIAgent = async (text, language, history = [], retryCount = 0) => {
  const MAX_RETRIES = 3;
  const INITIAL_DELAY = 2000; // 2 seconds
  const MAX_DELAY = 30000; // 30 seconds
  
  try {
    // Convert chat history to Groq format
    const messages = [
      ...history.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      {
        role: 'user',
        content: text,
      },
    ];

    const completion = await groq.chat.completions.create({
      model: 'qwen-2.5-coder-32b',
      messages: messages,
      stream: false,
    });

    const response = completion.choices[0]?.message?.content;
    
    if (!response) {
      throw new Error('No response from AI agent');
    }

    // Groq returns string content directly
    return String(response).trim();
  } catch (error) {
    console.error('=== Groq API Error ===');
    console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    
    // Extract error details from Groq error structure
    let errorMessage = 'Unknown error';
    let errorCode = 500;
    let errorBody = null;
    
    // Groq errors typically have error.message or error.error
    if (error.message) {
      errorMessage = error.message;
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    
    // Extract status code from Groq error
    if (error.status) errorCode = error.status;
    else if (error.statusCode) errorCode = error.statusCode;
    else if (error.code && typeof error.code === 'number') errorCode = error.code;
    else if (error.response?.status) errorCode = error.response.status;
    else if (error.error?.code) errorCode = error.error.code;
    
    // Extract body/response data
    if (error.body) errorBody = error.body;
    else if (error.response?.data) errorBody = error.response.data;
    else if (error.error) errorBody = error.error;
    
    // Check for rate limit in message or body
    const isRateLimit = 
      errorCode === 429 || 
      errorMessage?.toLowerCase().includes('rate') ||
      errorMessage?.toLowerCase().includes('limit') ||
      errorMessage?.toLowerCase().includes('quota') ||
      (errorBody && typeof errorBody === 'string' && (errorBody.toLowerCase().includes('rate') || errorBody.toLowerCase().includes('quota')));
    
    console.error('Extracted error details:', {
      message: errorMessage,
      code: errorCode,
      isRateLimit: isRateLimit,
      hasApiKey: !!apiKey,
      body: errorBody,
      retryCount: retryCount
    });
    
    // Auto-retry on rate limit with exponential backoff
    if (isRateLimit && retryCount < MAX_RETRIES) {
      const delay = Math.min(INITIAL_DELAY * Math.pow(2, retryCount), MAX_DELAY);
      console.log(`⏳ Rate limit hit. Retrying in ${delay/1000} seconds... (Attempt ${retryCount + 1}/${MAX_RETRIES})`);
      
      await sleep(delay);
      
      // Retry the request
      return await callAIAgent(text, language, history, retryCount + 1);
    }
    
    // Create enhanced error
    const enhancedError = new Error();
    enhancedError.message = errorMessage;
    enhancedError.statusCode = errorCode;
    enhancedError.isRateLimit = isRateLimit;
    enhancedError.originalError = error;
    enhancedError.retryCount = retryCount;
    
    // Set specific messages
    if (isRateLimit) {
      if (retryCount >= MAX_RETRIES) {
        enhancedError.message = `Rate limit exceeded. Retried ${MAX_RETRIES} times. Please wait 30-60 seconds and try again.`;
      } else {
        enhancedError.message = 'Rate limit exceeded. Please wait 10-15 seconds and try again.';
      }
    } else if (errorMessage?.includes('api key') || errorMessage?.includes('auth') || errorMessage?.includes('unauthorized')) {
      enhancedError.message = 'Authentication error. Please check your GROQ_API_KEY in .env file.';
      enhancedError.statusCode = 401;
    } else if (errorMessage?.includes('model') || errorMessage?.includes('not found')) {
      enhancedError.message = 'Model error. The requested model may be unavailable. Please try again in a few moments.';
    }
    
    throw enhancedError;
  }
};


/**
 * Process text through AI agent for specific step type with optimized prompts
 */
export const processStepWithAI = async (stepType, text, language, history) => {
  let prompt = '';
  
  switch (stepType) {
    case 'clean_text':
      prompt = `You are a text cleaning expert. Clean and normalize the following text by:
1. Removing extra whitespace and line breaks
2. Fixing common typos
3. Normalizing punctuation
4. Removing special characters that don't belong

Return ONLY the cleaned text without any explanations, prefixes, or additional text.

Text to clean:
${text}`;
      break;
    
    case 'detect_emotion':
      prompt = `Analyze the emotional tone and sentiment of the following text. 

You must respond with ONLY one word from this exact list (case-sensitive):
- stressed
- happy
- sad
- angry
- neutral

Do not include any explanations, prefixes, or additional text. Just the emotion word.

Text to analyze:
${text}`;
      break;
    
    case 'categorize_text':
      prompt = `Categorize the following text into one of these exact categories:

1. Work & Career
2. Family & Relationships
3. Health & Wellness
4. Finance & Money
5. Personal & General

Respond with ONLY the exact category name from the list above. Do not include any explanations or additional text.

Text to categorize:
${text}`;
      break;
    
    case 'summarize':
      prompt = `Provide a concise and informative summary of the following text in 2-3 sentences. 
Capture the main points and key information. Write in ${LANGUAGE_NAMES[language] || 'English'}.

Text to summarize:
${text}`;
      break;
    
    case 'translate':
      const targetLang = LANGUAGE_NAMES[language] || 'English';
      prompt = `Translate the following text to ${targetLang}. 

Requirements:
- Maintain the original meaning and tone
- Keep proper grammar and natural phrasing
- Return ONLY the translated text without any explanations or prefixes

Text to translate:
${text}`;
      break;
    
    default:
      prompt = text;
  }

  return await callAIAgent(prompt, language, history);
};

/**
 * Format emotion detection result
 */
export const formatEmotionResult = (result) => {
  const emotions = ['stressed', 'happy', 'sad', 'angry', 'neutral'];
  const lowerResult = result.toLowerCase().trim();
  
  for (const emotion of emotions) {
    if (lowerResult.includes(emotion)) {
      return emotion.charAt(0).toUpperCase() + emotion.slice(1);
    }
  }
  
  return 'Neutral';
};

/**
 * Format category result
 */
export const formatCategoryResult = (result) => {
  const categories = [
    'Work & Career',
    'Family & Relationships',
    'Health & Wellness',
    'Finance & Money',
    'Personal & General',
  ];
  
  const lowerResult = result.toLowerCase().trim();
  
  for (const category of categories) {
    if (lowerResult.includes(category.toLowerCase().replace(/\s+/g, ' '))) {
      return category;
    }
  }
  
  return 'Personal & General';
};

