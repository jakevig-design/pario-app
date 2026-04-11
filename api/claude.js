// api/claude.js
// ─────────────────────────────────────────────────────────────
// Vercel serverless function — proxies Anthropic API calls.
// Supports optional web search via useWebSearch: true in body.
// For market research (useWebSearch:true), uses a two-step approach:
//   1. Web search call to gather vendor intel as prose
//   2. Clean formatting call to convert prose to JSON array
// Deploy at repo ROOT. Set ANTHROPIC_API_KEY in Vercel env vars.
// ─────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function callAnthropic(headers, body, retries = 3) {
  let lastData, lastStatus;
  for (let attempt = 0; attempt < retries; attempt++) {
    if (attempt > 0) await sleep(attempt * 3000);
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    lastData = await response.json();
    lastStatus = response.status;
    if (response.status === 429) continue;
    return { data: lastData, status: lastStatus, ok: response.ok };
  }
  return { data: lastData, status: lastStatus, ok: false };
}

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

    const baseHeaders = {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    };

    // ── Standard call (no web search) ──
    if (!useWebSearch) {
      const { data, status, ok } = await callAnthropic(baseHeaders, {
        model: 'claude-sonnet-4-5',
        max_tokens: 4000,
        system: system ?? '',
        messages: [{ role: 'user', content: user }],
      });
      if (!ok || data.error) return res.status(status).json(data);
      const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
      return res.status(200).json({ content: [{ type: 'text', text }], stop_reason: data.stop_reason });
    }

    // ── Two-step market research ──

    // Step 1: Web search — gather vendor intel as prose
    const searchSystem = `You are a procurement analyst researching software vendors. 
Use web search to find 6-8 relevant vendors for the described procurement need.
For each vendor find: full name, software category, G2 rating and review count if available, 
a one-sentence description, and the G2 URL. Write your findings as clear prose — one paragraph per vendor.
Do not format as JSON yet. Just research and describe what you find.`;

    const { data: searchData, status: searchStatus, ok: searchOk } = await callAnthropic(
      { ...baseHeaders, 'anthropic-beta': 'web-search-2025-03-05' },
      {
        model: 'claude-sonnet-4-5',
        max_tokens: 6000,
        system: searchSystem,
        messages: [{ role: 'user', content: user }],
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      }
    );

    if (!searchOk || searchData.error) return res.status(searchStatus).json(searchData);
    const researchText = (searchData.content || []).filter(b => b.type === 'text').map(b => b.text).join('');

    // Step 2: Clean formatting call — convert prose to JSON, no web search
    const formatSystem = `You are a data formatter. Convert vendor research notes into a JSON array.
Output ONLY a valid JSON array — nothing else. No explanation, no markdown, no code fences.
Start your response with [ and end with ].

Each object must have exactly these fields:
{
  "name": "Vendor Name",
  "category": "Software category",
  "g2Rating": "4.5/5 or N/A",
  "g2ReviewCount": "1,200 reviews or N/A",
  "description": "One sentence describing what the vendor does.",
  "requirementsMatch": 4,
  "requirementsTotal": 6,
  "matchConfidence": "high",
  "g2Url": "https://www.g2.com/products/... or null"
}

For requirementsMatch and requirementsTotal, use the requirements list provided to estimate fit.
matchConfidence is high, medium, or low.`;

    const formatUser = `Here is my vendor research:\n\n${researchText}\n\n---\nOriginal procurement context:\n${user}`;

    const { data: formatData, status: formatStatus, ok: formatOk } = await callAnthropic(
      baseHeaders,
      {
        model: 'claude-sonnet-4-5',
        max_tokens: 4000,
        system: formatSystem,
        messages: [{ role: 'user', content: formatUser }],
      }
    );

    if (!formatOk || formatData.error) return res.status(formatStatus).json(formatData);
    const finalText = (formatData.content || []).filter(b => b.type === 'text').map(b => b.text).join('');

    return res.status(200).json({
      content: [{ type: 'text', text: finalText }],
      stop_reason: formatData.stop_reason,
    });

  } catch (err) {
    return res.status(500).json({ error: { message: err.message } });
  }
}
