// api/health.js
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    status: 'ok',
    nodeVersion: process.version,
    hasKey: !!process.env.GEMINI_API_KEY,
    keyPreview: process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.slice(0, 4) + '****' : null,
    time: new Date().toISOString()
  });
}
