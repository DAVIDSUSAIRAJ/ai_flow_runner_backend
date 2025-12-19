// AI Agent Service using OpenRouter with Qwen3 Coder
import { OpenRouter } from '@openrouter/sdk';

// Initialize OpenRouter client
const openRouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY || '<YOUR_OPENROUTER_API_KEY>',
  httpReferer: process.env.SITE_URL || 'http://localhost:3000',
  xTitle: 'AIFlow Runner Backend',
});

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
};

/**
 * Call OpenRouter API with Qwen3 Coder 480B A35B
 */
export const callAIAgent = async (text, language, history = []) => {
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
    console.error('OpenRouter API Error:', error);
    throw error;
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

