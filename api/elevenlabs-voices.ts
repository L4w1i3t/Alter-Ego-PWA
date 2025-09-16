export default async function handler(req: any, res: any) {
  const allowed = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  const origin = req.headers.origin || '';
  const allowOrigin = allowed.length === 0 || allowed.includes(origin) ? origin || '*' : '';

  const setCORS = () => {
    if (allowOrigin) {
      res.setHeader('Access-Control-Allow-Origin', allowOrigin);
      res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-elevenlabs-key');
  };

  setCORS();

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userKey = (req.headers['x-elevenlabs-key'] as string) || '';
    const apiKey = userKey || process.env.ELEVENLABS_API_KEY || '';
    if (!apiKey) {
      return res.status(401).json({ error: 'Missing ElevenLabs API key' });
    }

    const upstream = await fetch('https://api.elevenlabs.io/v1/voices', {
      method: 'GET',
      headers: {
        'xi-api-key': apiKey,
      },
    });

    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', 'application/json');
    setCORS();
    return res.send(text);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Proxy error' });
  }
}

