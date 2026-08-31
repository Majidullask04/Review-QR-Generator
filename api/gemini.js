const stripControl = (v) =>
  [...(v || '')]
    .filter((c) => {
      const code = c.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join('');

export default async function handler(req, res) {
  try {
    // ── CORS ──
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    // ── PARSE BODY SAFELY ──
    let body = {};
    try {
      if (typeof req.body === 'string') body = JSON.parse(req.body);
      else if (Buffer.isBuffer(req.body)) body = JSON.parse(req.body.toString());
      else if (req.body && typeof req.body === 'object') body = req.body;
    } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON body.' });
    }

    const { rating, businessName, businessType, typeContext, customerContext, businessGuidance, locationAbout } = body;
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

    // ── BUILD PROMPT ──
    const cleanName = stripControl(businessName.trim());
    const cleanType = stripControl((typeContext || businessType || 'local business').trim());
    const cleanCustomer = stripControl((customerContext || '').trim());
    const cleanGuidance = stripControl((businessGuidance || '').trim());
    const cleanAbout = stripControl((locationAbout || '').trim());

    const sentiment = numericRating >= 4 ? 'positive' : numericRating === 3 ? 'neutral/mixed' : 'negative';
    const toneInstruction = numericRating >= 4
      ? 'Be enthusiastic but not over-the-top. Use words like "loved", "definitely", "highly recommend", "go-to".'
      : numericRating === 3
      ? 'Be balanced. Mention both positives and things that could improve. Use words like "decent", "okay", "could be better", "average".'
      : 'Be honest but not rude. Explain what went wrong specifically. Use words like "disappointed", "unfortunately", "expected better", "issue with".';

    const prompt = `You are helping a real customer write a Google review for a real business.

Write ${numericRating >= 4 ? '5' : '4'} DIFFERENT review drafts. Each one must sound like it was written by a different real person.

CRITICAL RULES:
- The customer gave ${numericRating} out of 5 stars. Match this sentiment exactly.
- Write like a real human on a phone — short, casual, slightly imperfect grammar, conversational.
- NEVER use generic filler like "great experience", "amazing service", or "highly recommend" WITHOUT explaining WHY.
- Use ONLY facts from the "About this place" and "Customer notes" sections below. NEVER invent staff names, dishes, or details not provided.
- Vary the opening words for each draft. Some start with the business name, some with "Went to", "Tried", "Visited", "Just had", "Stopped by", etc.
- Each review must be 1-3 sentences, max 45 words.
- Do not mention AI, drafts, or that someone helped write it.
- Make them feel like real Google reviews people actually post.

${toneInstruction}

Business name: ${cleanName}
Business type: ${cleanType}
About this place: ${cleanAbout || '(not provided)'}
Customer notes: ${cleanCustomer || '(none provided)'}
Business guidance: ${cleanGuidance || '(none provided)'}

Return ONLY a JSON array of strings. No markdown, no explanation. Example: ["review one","review two","review three"]`;

    const safeKey = encodeURIComponent(apiKey.trim());
    const models = ['gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-2.0-flash'];
    let lastError = null;

    for (const model of models) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${safeKey}`;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const geminiRes = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.9,
              maxOutputTokens: 1200
            }
          })
        });

        clearTimeout(timeout);

        const responseText = await geminiRes.text();
        console.log(`Gemini ${model} status:`, geminiRes.status);
        console.log(`Gemini ${model} response:`, responseText.slice(0, 500));

        if (!geminiRes.ok) {
          lastError = `Model ${model} failed with ${geminiRes.status}: ${responseText.slice(0, 200)}`;
          continue;
        }

        const geminiData = JSON.parse(responseText);
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

        if (reviews.length) {
          return res.status(200).json({ reviews });
        }

        lastError = `Model ${model} returned empty reviews. Raw: ${rawText.slice(0, 200)}`;

      } catch (fetchErr) {
        lastError = `Model ${model} fetch error: ${fetchErr.message}`;
        console.error(lastError);
      }
    }

    console.error('All Gemini models failed. Last error:', lastError);
    return res.status(502).json({
      error: 'AI provider unavailable.',
      debug: lastError
    });

  } catch (err) {
    console.error('FATAL:', err.name, err.message);
    return res.status(500).json({ error: 'Server error. Please retry.' });
  }
}
