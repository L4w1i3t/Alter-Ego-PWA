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
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  };

  setCORS();

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userKey = (req.headers['x-elevenlabs-key'] as string) || '';
    const apiKey = userKey || process.env.ELEVENLABS_API_KEY || '';
    if (!apiKey) {
      return res.status(401).json({ error: 'Missing ElevenLabs API key' });
    }
    const body = req.body || {};
    const { voiceId, ...rest } = body || {};
    if (typeof voiceId !== 'string' || typeof rest?.text !== 'string') {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    const upstream = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(rest),
    });

    // Forward audio or error JSON
    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.status(upstream.status);
    res.setHeader('Content-Type', contentType);
    setCORS();
    return res.send(buf);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Proxy error' });
  }
}
