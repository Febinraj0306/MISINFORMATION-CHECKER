import express from 'express';
import Check from '../models/Check.js';
import { searchClaim } from '../services/searchService.js';
import { verifyClaimWithGemini } from '../services/geminiService.js';
import mongoose from 'mongoose';

const router = express.Router();

// In-memory fallback database for demo resilience
const inMemoryHistory = [];

/**
 * Helper to check if MongoDB is connected.
 */
function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

/**
 * @route   POST /api/check
 * @desc    Verify a claim text
 */
router.post('/check', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Please enter some text to check.' });
    }

    const trimmedText = text.trim();
    if (trimmedText.length === 0) {
      return res.status(400).json({ error: 'Please enter some text to check.' });
    }

    const wordCount = trimmedText.split(/\s+/).filter(word => word.length > 0).length;
    if (wordCount < 5) {
      return res.status(400).json({ error: 'Claim is too short. Please paste at least 5 words to allow proper fact-checking.' });
    }
    if (trimmedText.length > 2000) {
      return res.status(400).json({ error: 'Claim is too long. Please limit your text to 2000 characters.' });
    }

    console.log(`\n--- New Verification Request ---`);
    console.log(`Claim: "${trimmedText}" (${wordCount} words)`);

    // 1. Search Grounding
    let searchResults = [];
    try {
      searchResults = await searchClaim(trimmedText);
      console.log(`Retrieved ${searchResults.length} search results.`);
    } catch (searchError) {
      console.error('Search grounding failed, continuing without search:', searchError);
    }

    // 2. Gemini Analysis
    console.log('Sending to Gemini for verification...');
    const result = await verifyClaimWithGemini(trimmedText, searchResults);
    console.log('Verification finished. Verdict:', result.verdict, 'Confidence:', result.confidence);

    const checkRecord = {
      text: trimmedText,
      verdict: result.verdict,
      confidence: result.confidence,
      reasoning: result.reasoning,
      sources: result.sources,
      createdAt: new Date(),
    };

    // 3. Save to MongoDB or InMemory
    if (isDbConnected()) {
      try {
        const savedRecord = new Check(checkRecord);
        await savedRecord.save();
        console.log('Saved to MongoDB successfully.');
      } catch (dbError) {
        console.error('Failed to save to MongoDB, falling back to in-memory store:', dbError);
        inMemoryHistory.unshift(checkRecord);
        if (inMemoryHistory.length > 10) inMemoryHistory.pop();
      }
    } else {
      console.log('MongoDB not connected, saving to in-memory store.');
      inMemoryHistory.unshift(checkRecord);
      if (inMemoryHistory.length > 10) inMemoryHistory.pop();
    }

    return res.status(200).json(checkRecord);

  } catch (error) {
    console.error('Error during verification route:', error);
    return res.status(500).json({ 
      error: error.message || 'An unexpected error occurred during verification.' 
    });
  }
});

/**
 * @route   GET /api/history
 * @desc    Get recent 10 checks
 */
router.get('/history', async (req, res) => {
  try {
    if (isDbConnected()) {
      const records = await Check.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();
      
      return res.status(200).json(records);
    } else {
      // Fallback to in-memory array
      return res.status(200).json(inMemoryHistory);
    }
  } catch (error) {
    console.error('Error fetching history:', error);
    // Return in-memory items anyway to ensure frontend doesn't break
    return res.status(200).json(inMemoryHistory);
  }
});

export default router;
