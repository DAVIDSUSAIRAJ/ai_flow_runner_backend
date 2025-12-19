import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load chunks on server start
let allChunks = [];
try {
  const chunksPath = path.join(__dirname, 'data', 'chunks.json');
  if (fs.existsSync(chunksPath)) {
    const data = fs.readFileSync(chunksPath, 'utf-8');
    allChunks = JSON.parse(data);
    console.log(`✅ Loaded ${allChunks.length} chunks for book chatbot`);
  } else {
    console.warn('⚠️  No chunks.json found. Book chatbot will work without book content.');
  }
} catch (error) {
  console.error('❌ Failed to load chunks:', error.message);
}

// Language mapping for book chatbot (code to full name)
const BOOK_LANGUAGE_MAP = {
  en: 'english',
  ta: 'tamil',
  hi: 'hindi',
  es: 'spanish',
  fr: 'french',
  de: 'german',
  ja: 'japanese',
  zh: 'chinese',
  ko: 'korean',
  ar: 'arabic',
  pt: 'portuguese',
  te: 'telugu',
  ml: 'malayalam',
};

// Reverse mapping (full name to code) for normalization
const LANGUAGE_NAME_TO_CODE = {
  'english': 'en',
  'tamil': 'ta',
  'hindi': 'hi',
  'spanish': 'es',
  'french': 'fr',
  'german': 'de',
  'japanese': 'ja',
  'chinese': 'zh',
  'korean': 'ko',
  'arabic': 'ar',
  'portuguese': 'pt',
  'telugu': 'te',
  'malayalam': 'ml',
};

// Normalize language input (handles both codes and full names)
function normalizeLanguage(language) {
  if (!language) return 'en';
  
  const langLower = language.toLowerCase().trim();
  
  // If it's already a code (2 letters), return it
  if (langLower.length === 2 && BOOK_LANGUAGE_MAP[langLower]) {
    return langLower;
  }
  
  // If it's a full name, convert to code
  if (LANGUAGE_NAME_TO_CODE[langLower]) {
    return LANGUAGE_NAME_TO_CODE[langLower];
  }
  
  // Default to 'en' if unknown
  return 'en';
}

// Get all chunks for a specific language
export function getBookContent(language) {
  if (allChunks.length === 0) {
    return ''; // No book content available
  }
  
  // Normalize language input
  const langCode = normalizeLanguage(language);
  const langKey = BOOK_LANGUAGE_MAP[langCode] || language.toLowerCase();
  
  const languageChunks = allChunks.filter((chunk) => 
    chunk.language && chunk.language.toLowerCase() === langKey.toLowerCase()
  );
  
  if (languageChunks.length === 0) {
    return ''; // No content for this language
  }
  
  return languageChunks.map((chunk) => chunk.text).join('\n\n---\n\n');
}

// Export normalize function for use in server
export { normalizeLanguage };

// Format chat history for prompt
export function formatChatHistory(history) {
  if (!history || history.length === 0) return '';

  const formatted = history
    .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
    .join('\n');

  return `\nPREVIOUS CONVERSATION:\n${formatted}\n`;
}

// Check if request is for book chatbot (no stepType)
export function isBookChatbotRequest(stepType) {
  return !stepType || stepType === 'book_chat';
}

