import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

let genAIInstance = null;

function getGeminiClient() {
  const apiKey = (process.env.GEMINI_API_KEY || process.env.API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY (or API_KEY) is not set in the environment variables.');
  }
  if (!genAIInstance) {
    genAIInstance = new GoogleGenAI({ apiKey });
  }
  return genAIInstance;
}

// Fallback models to try in sequence if one experiences transient errors
const CANDIDATE_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.6-flash',
  'gemini-3.7-flash',
  'gemini-2.5-pro'
];

/**
 * Classifies a claim using Google Gemini and grounded search results.
 *
 * @param {string} claim The claim text to verify.
 * @param {Array<{title: string, url: string, snippet: string}>} searchResults
 * @returns {Promise<{verdict: string, confidence: number, reasoning: string, sources: Array<{title: string, url: string}>}>}
 */
export async function verifyClaimWithGemini(claim, searchResults) {
  const ai = getGeminiClient();

  const searchGroundingText = searchResults.length > 0
    ? searchResults.map((res, i) =>
        `Source [${i + 1}]:\nTitle: ${res.title}\nURL: ${res.url}\nContent: ${res.snippet}\n`
      ).join('\n')
    : 'No live search results could be retrieved for this claim.';

  const systemInstruction = `You are "TruthCheck AI", an elite, unbiased, and professional fact-checking system.
Your goal is to classify the truthfulness of a social media/WhatsApp forward (the "Claim") based ONLY on the provided live web search results.

CRITICAL RULES:
1. Base your verdict primarily on the provided search results. If the search results are empty or do not mention the claim, classify it as "UNVERIFIED". Do NOT answer from memory alone.
2. If the Claim is in a language other than English, detect the language and return the "reasoning" in the SAME language. JSON keys must remain in English.
3. Output ONLY a valid JSON object — no markdown, no extra text.

JSON FORMAT:
{
  "verdict": "TRUE" | "FALSE" | "MISLEADING" | "UNVERIFIED",
  "confidence": <integer 0-100>,
  "reasoning": "<2-3 sentence explanation in the claim's language>",
  "sources": [{"title": "<source title>", "url": "<source url>"}]
}

"sources" must only reference items from the provided search results. If none apply, return an empty array.`;

  const userPrompt = `Claim to verify:\n"${claim}"\n\nProvided Web Search Results:\n${searchGroundingText}\n\nOutput the JSON response now.`;

  let lastError = null;

  for (const modelName of CANDIDATE_MODELS) {
    try {
      console.log(`Attempting verification with model: ${modelName}`);
      const response = await ai.models.generateContent({
        model: modelName,
        contents: userPrompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'object',
            properties: {
              verdict: {
                type: 'string',
                enum: ['TRUE', 'FALSE', 'MISLEADING', 'UNVERIFIED'],
              },
              confidence: { type: 'integer' },
              reasoning: { type: 'string' },
              sources: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    url: { type: 'string' },
                  },
                  required: ['title', 'url'],
                },
              },
            },
            required: ['verdict', 'confidence', 'reasoning', 'sources'],
          },
        },
      });

      const rawText = (response.text || '').trim();
      let parsed;
      try {
        parsed = JSON.parse(rawText);
      } catch (parseErr) {
        // Fallback: extract json between braces if extra text leaked
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw parseErr;
        }
      }

      const verdict = ['TRUE', 'FALSE', 'MISLEADING', 'UNVERIFIED'].includes(parsed.verdict)
        ? parsed.verdict : 'UNVERIFIED';
      const confidence = typeof parsed.confidence === 'number'
        ? Math.min(100, Math.max(0, Math.round(parsed.confidence))) : 50;
      const reasoning = typeof parsed.reasoning === 'string' && parsed.reasoning.trim()
        ? parsed.reasoning.trim() : 'Could not generate detailed reasoning.';
      const sources = Array.isArray(parsed.sources)
        ? parsed.sources.map(s => ({ title: s.title || 'Source', url: s.url || '' })).filter(s => s.url)
        : [];

      return { verdict, confidence, reasoning, sources };
    } catch (error) {
      console.warn(`Model ${modelName} encountered error:`, error.message);
      lastError = error;
      // Continue to next model candidate
    }
  }

  console.error('All Gemini model candidates failed. Last error:', lastError);
  throw new Error(`Gemini verification failed: ${lastError?.message || 'Unknown error'}`);
}
