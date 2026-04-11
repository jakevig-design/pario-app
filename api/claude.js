// api/claude.js
// ─────────────────────────────────────────────────────────────
// Vercel serverless function — proxies Anthropic API calls.
// Supports optional web search via useWebSearch: true in body.
// Deploy at repo ROOT. Set ANTHROPIC_API_KEY in Vercel env vars.
// ─────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

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

    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      ...(useWebSearch ? { 'anthropic-beta': 'web-search-2025-03-05' } : {}),
    };

    const body = {
      model: 'claude-sonnet-4-5',
      max_tokens: 4000,
      system: system ?? '',
      messages: [{ role: 'user', content: user }],
      ...(useWebSearch ? { tools: [{ type: 'web_search_20250305', name: 'web_search' }] } : {}),
    };

    // Retry up to 3 times on 429 with exponential backoff
    let lastData, lastStatus;
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) await sleep(attempt * 3000);

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      lastData = await response.json();
      lastStatus = response.status;

      if (response.status === 429) continue; // retry
      if (!response.ok || lastData.error) {
        return res.status(lastStatus).json(lastData);
      }

      // Success — extract text blocks
      const textBlocks = (lastData.content || []).filter(b => b.type === 'text');
      const finalText = textBlocks.map(b => b.text).join('');

      return res.status(200).json({
        content: [{ type: 'text', text: finalText }],
        stop_reason: lastData.stop_reason,
      });
    }

    // All retries exhausted
    return res.status(lastStatus).json(lastData);

  } catch (err) {
    return res.status(500).json({ error: { message: err.message } });
  }
}
