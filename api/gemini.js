// api/gemini.js

const stripControl = (v) =>
  [...(v || '')]
    .filter((c) => {
      const code = c.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join('');

export default async function handler(req, res) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    // Parse body safely
    let body = {};
    try {
      if (typeof req.body === 'string') body = JSON.parse(req.body);
      else if (Buffer.isBuffer(req.body)) body = JSON.parse(req.body.toString());
      else if (req.body && typeof req.body === 'object') body = req.body;
    } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON body.' });
    }

    const { rating, businessName, businessType, typeContext, customerContext, businessGuidance } = body;
    const numericRating = Number(rating);

    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ error: 'Rating must be 1-5.' });
    }
    if (!businessName?.trim() || businessName.length > 120) {
      return res.status(400).json({ error: 'Business name required (max 120 chars).' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'AI service not configured.' });
    }

    const cleanName = stripControl(businessName.trim());
    const cleanType = stripControl((typeContext || businessType || 'local business').trim());
    const cleanCustomer = stripControl((customerContext || '').trim());
    const cleanGuidance = stripControl((businessGuidance || '').trim());

    const prompt = `You are helping a customer draft a review for the business named below.

Write ${numericRating >= 4 ? '5' : '4'} authentic Google review drafts.

INSTRUCTIONS:
- The customer gave ${numericRating} out of 5 stars.
- Write in a casual, conversational tone.
- Use specific details ONLY from the notes below. Never invent facts.
- Use imperfect grammar and casual language.
- NEVER use generic phrases like "great experience" without SPECIFIC reasons.
- Match the ${numericRating}-star sentiment exactly.
- Each review must be 1-3 sentences, max 40 words.
- Do not mention that AI helped write it.

Business name: ${cleanName}
Business type: ${cleanType}
Customer notes: ${cleanCustomer || '(none provided)'}
Business guidance: ${cleanGuidance || '(none provided)'}

Return ONLY a JSON array of strings. No markdown, no explanation. Example: ["review one","review two"]`;

    const safeKey = encodeURIComponent(apiKey.trim());
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${safeKey}`;

    // Safety check for fetch
    if (typeof fetch !== 'function') {
      return res.status(500).json({ error: 'Runtime error: fetch not available.' });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    let geminiRes;
    try {
      geminiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.85,
            maxOutputTokens: 1000
          }
        })
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!geminiRes.ok) {
      const errText = await geminiRes.text().catch(() => 'Unknown');
      console.error('Gemini HTTP error:', geminiRes.status, errText);
      return res.status(502).json({ error: 'AI provider unavailable.' });
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    let reviews = [];
    if (rawText) {
      try {
        const parsed = JSON.parse(rawText);
        reviews = Array.isArray(parsed) 
          ? parsed.filter(item => typeof item === 'string' && item.trim()).slice(0, 5)
          : [];
      } catch {
        const match = rawText.match(/\[([\s\S]*?)\]/);
        if (match) {
          try {
            reviews = JSON.parse(`[${match[1]}]`).filter(item => typeof item === 'string').slice(0, 5);
          } catch { /* ignore */ }
        }
      }
    }

    if (!reviews.length) {
      console.error('Empty reviews. Raw:', rawText.slice(0, 200));
      return res.status(502).json({ error: 'AI returned empty response.' });
    }

    return res.status(200).json({ reviews });

  } catch (err) {
    console.error('FATAL:', err.name, err.message);
    return res.status(500).json({ error: 'Server error. Please retry.' });
  }
}
