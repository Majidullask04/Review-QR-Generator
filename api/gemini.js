export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { rating, businessName, businessType, typeContext } = req.body;
  
  const randomSeed = Math.floor(Math.random() * 1000000);
  
  const prompt = `You are a real customer who just visited ${businessName}, which is ${typeContext || 'a local business'}.

Write ${rating >= 4 ? '5' : '4'} authentic Google review options.

INSTRUCTIONS:
- The customer gave ${rating} out of 5 stars.
- Write in a casual, conversational tone — like texting a friend.
- Include SPECIFIC details that a real customer would mention (names of services, specific products, exact experiences).
- Use imperfect grammar, abbreviations, and casual language. Vary sentence length.
- NEVER use generic phrases like "great experience" or "highly recommend" without SPECIFIC reasons.
- Match the ${rating}-star sentiment exactly.
- Each review must be 1-3 sentences, max 40 words.
- Make it sound like a real human wrote it, not a marketing team.
- CRITICAL: Ensure these reviews are completely unique every time. Do not repeat standard examples.
- Random Seed: ${randomSeed} (Use this to generate highly varied and unique situations for the reviews).

Return ONLY a JSON array of strings. No markdown, no explanation.

Example: ["The deep tissue massage at ${businessName} actually fixed my shoulder pain! Sarah knew exactly where the knots were. Already booked my next appointment.","Came here for a quick trim and left with the best fade I've ever had. The hot towel finish was a nice touch."]`;

  try {
    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.9, maxOutputTokens: 800 }
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
