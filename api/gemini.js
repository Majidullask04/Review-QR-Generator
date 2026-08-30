export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { rating, businessName } = req.body;
  
  const prompt = `Generate ${rating >= 4 ? '5' : '4'} short, authentic Google review options for a restaurant called "${businessName || 'this restaurant'}". 
The customer gave ${rating} out of 5 stars.
Each review must be 1-2 sentences, sound like a real person wrote it (casual, slightly imperfect grammar is OK), and match the ${rating}-star sentiment.
Return ONLY a JSON array of strings. No markdown, no explanation. Example: ["Great food!","Loved the ambiance."]`;
  
  try {
    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.8, maxOutputTokens: 500 }
      })
    });
    
    if (!geminiRes.ok) {
      return res.status(geminiRes.status).json({ error: 'API Error' });
    }
    
    const data = await geminiRes.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('Proxy Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
