// api/scrape.js
// ─────────────────────────────────────────────────────────────
// Vercel serverless function — fetches a URL server-side,
// strips to clean text, then uses Haiku to extract a company
// profile for BuyRight scope context injection.
// ─────────────────────────────────────────────────────────────

async function extractText(html) {
  // Remove scripts, styles, nav, footer, header noise
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<header[\s\S]*?<\/header>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  // Cap at ~6000 chars to stay within token budget
  return text.slice(0, 6000);
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
    const { url } = JSON.parse(Buffer.concat(buffers).toString());

    if (!url) return res.status(400).json({ error: { message: 'Missing url' } });

    // Normalize URL
    const normalized = url.startsWith('http') ? url : `https://${url}`;

    // Fetch the page
    let pageText = '';
    try {
      const pageRes = await fetch(normalized, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; BuyRight/1.0)',
          'Accept': 'text/html,application/xhtml+xml',
        },
        signal: AbortSignal.timeout(8000),
      });
      const html = await pageRes.text();
      pageText = await extractText(html);
    } catch (fetchErr) {
      return res.status(422).json({ error: { message: `Could not fetch URL: ${fetchErr.message}` } });
    }

    if (!pageText || pageText.length < 100) {
      return res.status(422).json({ error: { message: 'Page returned no readable content.' } });
    }

    // Extract company profile with Haiku
    const system = `You are a business intelligence analyst. Given the text content of a company website, extract a structured company profile. Be concise and factual. Use null for any field you cannot determine from the content.

Return ONLY valid JSON, no markdown, no explanation:
{
  "name": "Official company name",
  "vertical": "Primary industry/vertical",
  "subVertical": "More specific category or null",
  "employeeCount": "Approximate headcount or null",
  "hq": "City, Country or null",
  "publicPrivate": "Public or Private or null",
  "ticker": "Stock ticker if public, else null",
  "description": "One sentence describing what the company does",
  "knownTechStack": ["up to 3 enterprise systems mentioned on the site"],
  "regulatoryContext": "Any compliance context mentioned (e.g. HIPAA, SOX, GDPR) or null"
}`;

    const profileRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        system,
        messages: [{ role: 'user', content: `Website content:\n\n${pageText}` }],
      }),
    });

    const profileData = await profileRes.json();
    if (!profileRes.ok || profileData.error) {
      return res.status(profileRes.status).json(profileData);
    }

    const text = (profileData.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    return res.status(200).json({ profile: text });

  } catch (err) {
    return res.status(500).json({ error: { message: err.message } });
  }
}
