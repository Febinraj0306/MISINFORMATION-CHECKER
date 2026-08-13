import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
dotenv.config();

let anthropicInstance = null;

function getAnthropicClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set in the environment variables.');
  }
  if (!anthropicInstance) {
    anthropicInstance = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropicInstance;
}

/**
 * Classifies a claim using Claude Sonnet and grounded search results.
 * 
 * @param {string} claim The claim text to verify.
 * @param {Array<{title: string, url: string, snippet: string}>} searchResults List of search snippets.
 * @returns {Promise<{verdict: string, confidence: number, reasoning: string, sources: Array<{title: string, url: string}>}>}
 */
export async function verifyClaimWithClaude(claim, searchResults) {
  const anthropic = getAnthropicClient();

  // Convert search results into a clean text block
  const searchGroundingText = searchResults.length > 0
    ? searchResults.map((res, index) => `Source [${index + 1}]:\nTitle: ${res.title}\nURL: ${res.url}\nContent: ${res.snippet}\n`).join('\n')
    : 'No live search results could be retrieved for this claim.';

  const systemPrompt = `You are "TruthCheck AI", an elite, unbiased, and professional fact-checking system.
Your goal is to classify the truthfulness of a social media/WhatsApp forward (the "Claim") based ONLY on the provided live web search results.

CRITICAL RULES:
1. Base your verdict primarily on the provided search results. If the search results are empty, or they do not mention the claim, you must classify it as "UNVERIFIED" with appropriate confidence. Do NOT make up information or answer purely from memory.
2. You MUST respond with a single, valid JSON object. Do NOT include any introductory or concluding text, no markdown formatting outside the JSON, and no code blocks. Start your response with "{" and end with "}".
3. If the input Claim is in a language other than English (e.g. Spanish, Hindi, Arabic), you must detect the language, perform the analysis, and return the "reasoning" in the SAME language as the Claim. The JSON keys ("verdict", "confidence", "reasoning", "sources") must remain in English.

JSON RESPONSE FORMAT:
{
  "verdict": "TRUE" | "FALSE" | "MISLEADING" | "UNVERIFIED",
  "confidence": <integer between 0 and 100>,
  "reasoning": "<2-3 sentence plain-language explanation in the language of the claim, stating exactly why it was given this verdict>",
  "sources": [
    {
      "title": "<title of the relevant source>",
      "url": "<exact url of the relevant source>"
    }
  ]
}

Ensure "sources" only includes items from the provided search results that directly support your verdict. If no sources support it or search results were empty, return an empty array for "sources".`;

  const userContent = `Claim to verify:
"${claim}"

Provided Web Search Results:
${searchGroundingText}

Perform the verification and output the JSON response.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 1000,
      temperature: 0,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userContent }
      ]
    });

    const rawText = response.content[0].text.trim();
    
    // Clean up potential markdown formatting in case Claude returns it wrapped in ```json ... ```
    let cleanJsonText = rawText;
    if (cleanJsonText.startsWith('```')) {
      cleanJsonText = cleanJsonText.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    }

    try {
      const parsedResponse = JSON.parse(cleanJsonText);
      
      // Basic validation of fields to ensure frontend doesn't break
      const verdict = ['TRUE', 'FALSE', 'MISLEADING', 'UNVERIFIED'].includes(parsedResponse.verdict)
        ? parsedResponse.verdict
        : 'UNVERIFIED';
      
      const confidence = typeof parsedResponse.confidence === 'number' 
        ? Math.min(100, Math.max(0, parsedResponse.confidence)) 
        : 50;

      const reasoning = typeof parsedResponse.reasoning === 'string' 
        ? parsedResponse.reasoning 
        : 'Could not generate detailed reasoning.';

      const sources = Array.isArray(parsedResponse.sources) 
        ? parsedResponse.sources.map(s => ({
            title: typeof s.title === 'string' ? s.title : 'Source',
            url: typeof s.url === 'string' ? s.url : ''
          })).filter(s => s.url)
        : [];

      return { verdict, confidence, reasoning, sources };
    } catch (parseError) {
      console.error('Failed to parse Claude JSON response. Raw text:', rawText);
      throw new Error('Claude AI response was not in the expected JSON format. Please try again.');
    }

  } catch (apiError) {
    console.error('Anthropic API Error:', apiError);
    throw new Error(`Anthropic Claude API error: ${apiError.message}`);
  }
}
