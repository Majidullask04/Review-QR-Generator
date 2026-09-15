import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import placesHandler from './api/places.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '32kb' }));

// Google Places API Proxy
app.all('/api/places', async (req, res) => {
  await placesHandler(req, res);
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    placesKey: !!(process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_PLACE_API_KEY)
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Places API server running on http://localhost:${PORT}`);
  console.log(`Health: http://localhost:${PORT}/api/health`);
  console.log(`Places: http://localhost:${PORT}/api/places`);
});
