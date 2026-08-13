import dotenv from 'dotenv';
dotenv.config();

/**
 * Searches the web using either Tavily or Serper API depending on available keys.
 * Falls back to returning an empty list of sources if no keys are found.
 * 
 * @param {string} query The claim or text to search for.
 * @returns {Promise<Array<{title: string, url: string, snippet: string}>>}
 */
export async function searchClaim(query) {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  const TAVILY_KEY = process.env.TAVILY_API_KEY || process.env.SEARCH_API_KEY;
  const SERPER_KEY = process.env.SERPER_API_KEY;

  if (TAVILY_KEY) {
    console.log('Using Tavily Search API for grounding...');
    try {
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: TAVILY_KEY,
          query: cleanQuery,
          search_depth: 'advanced',
          include_answer: false,
          max_results: 5,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Tavily API responded with status ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      if (data && Array.isArray(data.results)) {
        return data.results.map((res) => ({
          title: res.title || 'Untitled Source',
          url: res.url || '',
          snippet: res.content || '',
        }));
      }
    } catch (error) {
      console.error('Error with Tavily Search API:', error);
      // fallback to serper if possible or propagate/empty
    }
  }

  if (SERPER_KEY) {
    console.log('Using Serper Google Search API for grounding...');
    try {
      const response = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': SERPER_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: cleanQuery,
          num: 5,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Serper API responded with status ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      if (data && Array.isArray(data.organic)) {
        return data.organic.map((res) => ({
          title: res.title || 'Untitled Source',
          url: res.link || '',
          snippet: res.snippet || '',
        }));
      }
    } catch (error) {
      console.error('Error with Serper Search API:', error);
    }
  }

  // If no API keys are configured, log a warning and return empty sources.
  // The system prompt should gracefully instruct Claude to state it cannot search.
  console.warn('WARNING: No Search API Key (TAVILY_API_KEY or SERPER_API_KEY) was found. Grounding will be skipped.');
  return [];
}
