try {
  let body;
  try {
    body = await req.json();
  } catch (e) {
    const text = await req.text();
    body = JSON.parse(text);
  }

  const { system, user } = body;

  if (!user) {
    return new Response(JSON.stringify({ error: { message: 'Missing user message' } }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 1000,
      system: system ?? '',
      messages: [{ role: 'user', content: user }],
    }),
  });

  const data = await res.json();

  return new Response(JSON.stringify(data), {
    status: res.status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
} catch (err) {
  return new Response(JSON.stringify({ error: { message: err.message } }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  });
}
