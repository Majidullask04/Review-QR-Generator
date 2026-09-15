// api/places.js - Google Places API Proxy for searching businesses and getting review links
export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const query = req.method === 'POST' ? req.body?.query : req.query?.query;
  const clientKey = req.method === 'POST' ? req.body?.apiKey : req.query?.apiKey;
  const apiKey = clientKey?.trim() || process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_PLACE_API_KEY;

  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  if (!apiKey) {
    return res.status(400).json({
      error: 'Google Places API Key is not configured. Please enter your API key or configure GOOGLE_PLACES_API_KEY.',
      code: 'MISSING_API_KEY'
    });
  }

  try {
    // Search using Google Places Text Search API (establishment)
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query.trim())}&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      return res.status(400).json({
        error: data.error_message || `Google Places API returned status: ${data.status}`,
        status: data.status
      });
    }

    const results = (data.results || []).slice(0, 8).map((place) => ({
      placeId: place.place_id,
      name: place.name,
      address: place.formatted_address || '',
      rating: place.rating,
      userRatingsTotal: place.user_ratings_total,
      reviewUrl: `https://search.google.com/local/writereview?placeid=${place.place_id}`
    }));

    return res.status(200).json({
      success: true,
      places: results
    });
  } catch (error) {
    console.error('Google Places Proxy Error:', error);
    return res.status(500).json({
      error: 'Failed to contact Google Places API. Check network or API key.'
    });
  }
}
