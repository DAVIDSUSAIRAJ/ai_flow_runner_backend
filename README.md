# AI Flow Runner Backend

Backend server for AI Flow Runner using OpenRouter SDK with Gemini.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file from `.env.example`:
```bash
cp .env.example .env
```

3. Add your OpenRouter API key to `.env`:
```
OPENROUTER_API_KEY=your_api_key_here
SITE_URL=http://localhost:3000
PORT=3001
```

## Development

Run in development mode with hot reload:
```bash
npm run dev
```

## Start

Start production server:
```bash
npm start
```

## API Endpoints

### POST /chat
Send a chat message to the AI agent.

**Request Body:**
```json
{
  "text": "Your message here",
  "language": "en",
  "history": [],
  "stepType": "clean_text" // optional: clean_text, detect_emotion, categorize_text, summarize, translate
}
```

**Response:**
```json
{
  "response": "AI response text",
  "model": "google/gemini-pro-1.5"
}
```

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "message": "AI Flow Runner Backend is running"
}
```

## Step Types

- `clean_text`: Clean and normalize text
- `detect_emotion`: Detect emotion (stressed, happy, sad, angry, neutral)
- `categorize_text`: Categorize into predefined categories
- `summarize`: Generate summary
- `translate`: Translate to target language

