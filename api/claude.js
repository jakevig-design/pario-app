// api/claude.js
// ─────────────────────────────────────────────────────────────
// Vercel serverless function — proxies Anthropic API calls.
// Supports optional web search via useWebSearch: true in body.
// Deploy at repo ROOT. Set ANTHROPIC_API_KEY in Vercel env vars.
// ─────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const buffers = [];
    for await (const chunk of req) buffers.push(chunk);
    const raw = Buffer.concat(buffers).toString();
    const { system, user, useWebSearch } = JSON.parse(raw);

    if (!user) {
      return res.status(400).json({ error: { message: 'Missing user message' } });
    }

    const body = {
      model: 'claude-sonnet-4-5',
      max_tokens: 2000,
      system: system ?? '',
      messages: [{ role: 'user', content: user }],
    };

    // Enable web search when requested
    if (useWebSearch) {
      body.tools = [{ type: 'web_search_20250305', name: 'web_search' }];
      body.max_tokens = 4000;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: { message: err.message } });
  }
}
