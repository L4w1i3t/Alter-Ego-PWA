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
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-openai-key, Authorization');
  };

  setCORS();

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userKey = (req.headers['x-openai-key'] as string) || '';
    const apiKey = userKey || process.env.OPENAI_API_KEY || '';
    if (!apiKey) {
      return res.status(401).json({ error: 'Missing OpenAI API key' });
    }
    const body = req.body || {};
    if (!body || !Array.isArray(body.messages) || typeof body.model !== 'string') {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    // Enforce some sane defaults
    body.stream = false;
    if (body.max_tokens) {
      body.max_tokens = Math.min(Number(body.max_tokens), 2000);
    }

    const isProjectScopedKey = apiKey.startsWith('sk-proj-');
    const upstreamHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    };
    if (isProjectScopedKey) {
      upstreamHeaders['OpenAI-Beta'] = 'allow-project-key';
      const projectId = process.env.OPENAI_PROJECT_ID || '';
      if (projectId) {
        upstreamHeaders['OpenAI-Project'] = projectId;
      }
    }

    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: upstreamHeaders,
      body: JSON.stringify(body),
    });

    const text = await upstream.text();
    const upstreamStatus = upstream.status;

    try {
      const payload = JSON.parse(text);
      setCORS();
      return res.status(upstreamStatus).json(payload);
    } catch {
      setCORS();
      const fallbackStatus = upstreamStatus >= 400 ? upstreamStatus : 502;
      return res.status(fallbackStatus).json({
        error: 'OpenAI returned a non-JSON response',
        detail: text.slice(0, 1000),
        status: upstreamStatus,
      });
    }
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Proxy error' });
  }
}

