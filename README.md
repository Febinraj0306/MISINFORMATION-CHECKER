# TruthCheck 🛡️

TruthCheck is a full-stack MERN application that helps users verify the truthfulness of forwarded messages, social media posts, or screenshots. It retrieves live web search results for grounding and uses Anthropic's Claude API to determine the veracity of claims.

## Key Features
- 🔍 **Live Search Grounding**: Integrates with Tavily or Serper APIs to retrieve live search matches before classifying.
- 🧠 **Anthropic Claude reasoning**: Classifies text as `TRUE`, `FALSE`, `MISLEADING`, or `UNVERIFIED` along with a confidence rating and explanation.
- 📸 **Client-side OCR**: Drag and drop or browse screenshots to extract claims using Tesseract.js directly in the browser.
- 💬 **Multi-language support**: Detects claims in non-English languages (Hindi, Spanish, etc.) and outputs reasoning in the input language.
- 💾 **Check History**: Stores verification logs in MongoDB (with graceful fallback to in-memory if MongoDB is not running).
- 📋 **Share Card**: One-click sharing to copy a beautifully formatted WhatsApp status/social text card.

---

## Folder Structure
```
/client             # Vite + React (Tailwind CSS v4, Lucide React, Tesseract.js)
/server             # Node.js + Express (Mongoose, Anthropic SDK)
README.md           # This instruction guide
```

---

## Getting Started

### 1. Prerequisites
- **Node.js** (v18.0.0 or higher recommended)
- **MongoDB** (optional, fallback in-memory database will run if not connected)

### 2. Environment Configuration
Create a `.env` file inside the `/server` directory:

```env
# Server Running Port
PORT=5001

# Gemini API Key (Required)
GEMINI_API_KEY=your_gemini_api_key_here

# Search API Key (Provide at least one of these)
TAVILY_API_KEY=your_tavily_api_key_here
# OR
SERPER_API_KEY=your_serper_api_key_here
# OR generic API key
SEARCH_API_KEY=your_search_api_key_here

# MongoDB URI (Optional, defaults to local mongodb if omitted)
MONGODB_URI=mongodb://localhost:27017/truthcheck
```

---

## Running the Application

To start the development servers, open two terminals:

### Terminal 1: Backend Server
```bash
cd server
npm install
npm run dev
```
*The backend server will run on `http://localhost:5001`.*

### Terminal 2: Frontend Client
```bash
cd client
npm install
npm run dev
```
*The frontend client will run on `http://localhost:5173`. Open this URL in your browser to verify.*

---

## Demo Checks to Try
1. **FALSE Claim**: *"Drinking silver nanoparticles completely cures all cancers in 24 hours"*
2. **TRUE Claim**: *"NASA launched the James Webb Space Telescope in December 2021"*
3. **MISLEADING Claim**: *"Drinking water prevents getting infected by COVID-19 because it washes the virus into your stomach"*
4. **Multi-language Claim (Spanish)**: *"La NASA confirmó que la Tierra estará en oscuridad absoluta por tres días en diciembre"*
