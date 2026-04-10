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

    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      ...(useWebSearch ? { 'anthropic-beta': 'web-search-2025-03-05' } : {}),
    };

    const tools = useWebSearch
      ? [{ type: 'web_search_20250305', name: 'web_search' }]
      : undefined;

    let messages = [{ role: 'user', content: user }];
    let finalText = '';

    // Agentic loop — keep running until stop_reason is end_turn (not tool_use)
    for (let i = 0; i < 10; i++) {
      const body = {
        model: 'claude-sonnet-4-5',
        max_tokens: 4000,
        system: system ?? '',
        messages,
        ...(tools ? { tools } : {}),
      };

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        return res.status(response.status).json(data);
      }

      // Collect text from this turn
      const textBlocks = (data.content || []).filter(b => b.type === 'text');
      if (textBlocks.length) {
        finalText = textBlocks.map(b => b.text).join('');
      }

      // If done, return synthetic response with just the final text
      if (data.stop_reason === 'end_turn' || !tools) {
        return res.status(200).json({
          content: [{ type: 'text', text: finalText }],
          stop_reason: 'end_turn',
        });
      }

      // If tool_use, build next messages turn with tool results
      const toolUseBlocks = (data.content || []).filter(b => b.type === 'tool_use');
      if (!toolUseBlocks.length) {
        return res.status(200).json({
          content: [{ type: 'text', text: finalText }],
          stop_reason: 'end_turn',
        });
      }

      // Add assistant turn and tool results to messages
      messages = [
        ...messages,
        { role: 'assistant', content: data.content },
        {
          role: 'user',
          content: toolUseBlocks.map(b => ({
            type: 'tool_result',
            tool_use_id: b.id,
            content: b.input?.results
              ? JSON.stringify(b.input.results)
              : 'Search completed.',
          })),
        },
      ];
    }

    return res.status(200).json({
      content: [{ type: 'text', text: finalText }],
      stop_reason: 'end_turn',
    });

  } catch (err) {
    return res.status(500).json({ error: { message: err.message } });
  }
}
