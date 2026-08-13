import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import checkRoutes from './routes/check.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;
const isDev = process.env.NODE_ENV !== 'production';

// ── Security Headers (helmet) ──────────────────────────────────────────────
app.use(helmet());

// ── CORS — Allow all origins for public API access ─────────────────────────
app.use(cors());

// ── Body Parser — limit request size to prevent payload attacks ───────────
app.use(express.json({ limit: '50kb' }));

// ── Rate Limiting ──────────────────────────────────────────────────────────
// /api/check: max 20 requests per IP per 15 minutes (AI calls are expensive)
const checkLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many verification requests. Please wait a few minutes before trying again.' },
});

// /api/history: max 60 reads per IP per 15 minutes
const historyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});

// ── Routes ─────────────────────────────────────────────────────────────────
app.use('/api/check', checkLimiter);
app.use('/api/history', historyLimiter);
app.use('/api', checkRoutes);

// ── Health Check (no sensitive info) ──────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// ── 404 Handler ────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// ── Global Error Handler (never leak stack traces) ─────────────────────────
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'An internal server error occurred.' });
});

// ── Database Connection ────────────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/truthcheck';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB.'))
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    console.warn('History will be saved in-memory for this session.');
  });

// ── Start Server ───────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`=============================================`);
  console.log(`TruthCheck Server started on port ${PORT}`);
  console.log(`Mode: ${isDev ? 'development' : 'production'}`);
  console.log(`=============================================`);
});
