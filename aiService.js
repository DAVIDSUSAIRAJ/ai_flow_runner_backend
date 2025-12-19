// AI Agent Service using OpenRouter with Qwen3 Coder
import { OpenRouter } from '@openrouter/sdk';

// Initialize OpenRouter client
const apiKey = process.env.OPENROUTER_API_KEY;

if (!apiKey) {
  console.error('ERROR: OPENROUTER_API_KEY is required!');
}

const openRouter = new OpenRouter({
  apiKey: apiKey, // Always pass API key if available (required for higher rate limits)
  httpReferer: process.env.SITE_URL || 'http://localhost:3000',
  xTitle: 'AIFlow Runner Backend',
});

// Log API key status (first few chars only for security)
if (apiKey) {
  console.log('✅ OpenRouter API Key loaded:', apiKey.substring(0, 15) + '...');
} else {
  console.warn('⚠️  No API key found - using free tier with lower rate limits');
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

// Language mapping for book chatbot display
const BOOK_LANGUAGE_DISPLAY = {
  en: 'English',
  ta: 'Tamil (தமிழ்)',
  hi: 'Hindi (हिंदी)',
  es: 'Spanish',
  fr: 'French',
  de: 'German (Deutsch)',
  ja: 'Japanese',
  zh: 'Chinese',
  ko: 'Korean',
  ar: 'Arabic',
  pt: 'Portuguese',
  te: 'Telugu (తెలుగు)',
  ml: 'Malayalam (മലയാളം)',
};

/**
 * Sleep/delay function for retries
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Call OpenRouter API with Qwen3 Coder 480B A35B with automatic retry on rate limit
 */
export const callAIAgent = async (text, language, history = [], retryCount = 0) => {
  const MAX_RETRIES = 3;
  const INITIAL_DELAY = 2000; // 2 seconds
  const MAX_DELAY = 30000; // 30 seconds
  
  try {
    // Convert chat history to OpenRouter format
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

    const completion = await openRouter.chat.send({
      model: 'qwen/qwen3-coder:free', // Free Qwen3 Coder model
      messages: messages,
      stream: false,
    });

    const response = completion.choices[0]?.message?.content;
    
    if (!response) {
      throw new Error('No response from AI agent');
    }

    // Handle both string and array content types
    if (typeof response === 'string') {
      return response.trim();
    } else if (Array.isArray(response)) {
      // Extract text from content items
      const textParts = response
        .filter((item) => item.type === 'text')
        .map((item) => item.text || '')
        .join('');
      return textParts.trim();
    }
    
    return String(response).trim();
  } catch (error) {
    console.error('=== OpenRouter API Error ===');
    console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    
    // Extract error details from various possible formats
    let errorMessage = 'Unknown error';
    let errorCode = 500;
    let errorBody = null;
    
    // Try different ways to extract error info
    if (error.message) {
      errorMessage = error.message;
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    
    // Extract status code
    if (error.status) errorCode = error.status;
    else if (error.statusCode) errorCode = error.statusCode;
    else if (error.code && typeof error.code === 'number') errorCode = error.code;
    else if (error.response?.status) errorCode = error.response.status;
    
    // Extract body/response data
    if (error.body) errorBody = error.body;
    else if (error.response?.data) errorBody = error.response.data;
    else if (error.error) errorBody = error.error;
    
    // Check for rate limit in message or body
    const isRateLimit = 
      errorCode === 429 || 
      errorMessage?.toLowerCase().includes('rate') ||
      errorMessage?.toLowerCase().includes('limit') ||
      (errorBody && typeof errorBody === 'string' && errorBody.toLowerCase().includes('rate'));
    
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
        enhancedError.message = 'Rate limit exceeded. The free model is temporarily rate-limited. Please wait 10-15 seconds and try again.';
      }
    } else if (errorMessage?.includes('cookie') || errorMessage?.includes('auth')) {
      enhancedError.message = 'Authentication error. Please check your API key in .env file.';
      enhancedError.statusCode = 401;
    } else if (errorMessage?.includes('provider')) {
      enhancedError.message = 'Model provider error. The free model may be temporarily unavailable. Please try again in a few moments.';
    }
    
    throw enhancedError;
  }
};

/**
 * Generate prompt for book chatbot
 */
export const getBookChatbotPrompt = async (bookContent, question, language, history) => {
  const { formatChatHistory } = await import('./bookService.js');
  const targetLang = BOOK_LANGUAGE_DISPLAY[language] || language;
  const chatHistory = formatChatHistory(history);

  return `You are a helpful assistant that answers questions based on a book.

BOOK CONTENT:
${bookContent || 'No book content available for this language.'}
${chatHistory}
CURRENT USER'S QUESTION: ${question}

UNDERSTANDING USER INPUT:
Users may type in various ways - you MUST understand their intent:

1. TAMIL users may type:
   - Pure Tamil: "காதல் பற்றி சொல்லு"
   - Tanglish (Tamil + English): "kadhal patri sollu", "appa amma about sollu"
   - Mixed: "love பற்றி சொல்லு"

2. ENGLISH users may type:
   - Normal English: "Tell me about love"
   - With typos: "tel me abot love"

3. HINDI users may type:
   - Pure Hindi: "प्यार के बारे में बताओ"
   - Hinglish (Hindi + English): "pyaar ke baare mein batao", "love ke baare mein bolo"

4. TELUGU users may type:
   - Pure Telugu: "ప్రేమ గురించి చెప్పు"
   - Tenglish (Telugu + English): "prema gurinchi cheppu", "love gurinchi cheppu"

5. MALAYALAM users may type:
   - Pure Malayalam: "സ്നേഹത്തെ കുറിച്ച് പറയൂ"
   - Manglish (Malayalam + English): "sneham kurichu parayoo", "love ne patti para"

6. GERMAN users may type:
   - Pure German: "Erzähl mir von der Liebe"
   - With English mix: "Tell me about Liebe"

STRICT RESPONSE RULES:
1. Answer ONLY based on the book content above.
2. Understand user intent regardless of spelling mistakes or language mixing.
3. Use PREVIOUS CONVERSATION context if available (user may ask follow-up questions like "அது பற்றி மேலும் சொல்லு", "tell me more", etc.)
4. DEFAULT language is ${targetLang}. Use ${targetLang} script for answers.
5. EXCEPTION: If user explicitly asks for translation (e.g., "English la sollu", "translate to Hindi", "German-ல சொல்லு"), respond in that requested language.
6. If answer not in book, say "I don't have information about this in the book" (in appropriate language).
7. FORMAT URLs as markdown links: [link text](URL). Example: [Portfolio](https://example.com)

YOUR ANSWER:`;
};

/**
 * Process text through AI agent for specific step type with optimized prompts
 */
export const processStepWithAI = async (stepType, text, language, history, bookContent = null) => {
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

