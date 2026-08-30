// api-dev-server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '32kb' }));

// Import your actual handler
import geminiHandler from './api/gemini.js';

app.post('/api/gemini', async (req, res) => {
  // Express adapter for Vercel-style handler
  await geminiHandler(req, res);
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', keyConfigured: !!process.env.GEMINI_API_KEY });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
  console.log(`Test health: http://localhost:${PORT}/api/health`);
  console.log(`Test gemini: http://localhost:${PORT}/api/gemini`);
});
