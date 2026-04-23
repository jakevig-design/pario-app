// api/claude.js
// ─────────────────────────────────────────────────────────────
// Vercel serverless function — proxies Anthropic API calls.
// Rate limiting: per-user sliding window (in-memory + Supabase usage log)
// Token budgets: tightened per call type to minimize cost
// ─────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ── In-memory rate limiter ────────────────────────────────────
const rateLimitStore = new Map();

// Standard limits for authenticated users
const LIMITS = { perMinute: 10, perDay: 100 };

// Tighter limits for the demo tenant — covers one full auto-flow run
// with room for a few regenerations, prevents abuse
const DEMO_LIMITS = { perMinute: 5, perDay: 30 };
const DEMO_TENANTS = ['acme', 'demo'];

function checkRateLimit(userId, tenantId) {
  const now = Date.now();
  const minuteAgo = now - 60 * 1000;
  const dayAgo = now - 24 * 60 * 60 * 1000;
  if (!rateLimitStore.has(userId)) rateLimitStore.set(userId, []);
  const calls = rateLimitStore.get(userId);
  const recent = calls.filter(t => t > dayAgo);
  rateLimitStore.set(userId, recent);
  const lastMinute = recent.filter(t => t > minuteAgo).length;

  // Apply tighter limits for demo tenants
  const limits = DEMO_TENANTS.includes(tenantId) ? DEMO_LIMITS : LIMITS;

  if (lastMinute >= limits.perMinute) return { allowed: false, reason: 'rate_limit_minute', message: 'Too many requests — please wait a moment before trying again.' };
  if (recent.length >= limits.perDay) return {
    allowed: false,
    reason: 'rate_limit_day',
    message: DEMO_TENANTS.includes(tenantId)
      ? 'The demo has reached its daily limit. Visit app.planwithpario.com to create a free account.'
      : 'You\'ve reached your daily usage limit. Resets in 24 hours.',
  };
  recent.push(now);
  rateLimitStore.set(userId, recent);
  return { allowed: true };
}

// ── Token budgets per call type ───────────────────────────────
const TOKEN_BUDGETS = {
  chat: 600, scope: 2500, evaluate: 800, refine: 2000, expert: 600,
  requirements: 1000, market: 3000, narrative: 1500, format: 2000, default: 2000,
};

function getTokenBudget(system) {
  if (!system) return TOKEN_BUDGETS.default;
  const s = system.toLowerCase();
  if (s.includes('intake assistant') || s.includes('clarifying questions')) return TOKEN_BUDGETS.chat;
  if (s.includes('evaluate') && s.includes('flags')) return TOKEN_BUDGETS.evaluate;
  if (s.includes('refining a project scope')) return TOKEN_BUDGETS.refine;
  if (s.includes('expert-level clarifying')) return TOKEN_BUDGETS.expert;
  if (s.includes('binary functional requirements')) return TOKEN_BUDGETS.requirements;
  if (s.includes('vendor') && s.includes('market')) return TOKEN_BUDGETS.market;
  if (s.includes('executive business case')) return TOKEN_BUDGETS.narrative;
  if (s.includes('writing a formal project scope')) return TOKEN_BUDGETS.scope;
  if (s.includes('data formatter')) return TOKEN_BUDGETS.format;
  return TOKEN_BUDGETS.default;
}

// ── Supabase usage logging ────────────────────────────────────
function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function estimateCost(model, inputTokens = 0, outputTokens = 0) {
  const pricing = {
    'claude-sonnet-4-6':          { input: 3.00,  output: 15.00 },
    'claude-haiku-4-5-20251001':  { input: 1.00,  output: 5.00  },
    'claude-opus-4-6':            { input: 5.00,  output: 25.00 },
    // Open model estimates (Together AI / Groq)
    'meta-llama/Llama-3.3-70B-Instruct-Turbo': { input: 0.88, output: 0.88 },
    'meta-llama/Llama-3.1-8B-Instruct-Turbo':  { input: 0.18, output: 0.18 },
    'llama-3.3-70b-versatile':    { input: 0.59,  output: 0.79  },
    'llama-3.1-8b-instant':       { input: 0.05,  output: 0.08  },
  };
  const p = pricing[model] || pricing['claude-sonnet-4-6'];
  return ((inputTokens / 1_000_000) * p.input) + ((outputTokens / 1_000_000) * p.output);
}

async function logUsage({ userId, tenantId, sessionId, callType, model, inputTokens, outputTokens }) {
  try {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.from('api_usage').insert({
      user_id: userId || null, tenant_id: tenantId || null, session_id: sessionId || null,
      call_type: callType || 'unknown', model,
      input_tokens: inputTokens || 0, output_tokens: outputTokens || 0,
      estimated_cost_usd: estimateCost(model, inputTokens, outputTokens),
      created_at: new Date().toISOString(),
    });
  } catch (e) { console.warn('Usage log failed:', e.message); }
}

async function checkTenantBudget(tenantId) {
  if (!tenantId) return { allowed: true };
  try {
    const supabase = getSupabase();
    if (!supabase) return { allowed: true };
    const { data: tenant } = await supabase.from('tenant_config').select('monthly_call_limit').eq('tenant_id', tenantId).single();
    if (!tenant?.monthly_call_limit) return { allowed: true };
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const { count } = await supabase.from('api_usage').select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId).gte('created_at', monthStart.toISOString());
    if ((count || 0) >= tenant.monthly_call_limit) return { allowed: false, reason: 'tenant_budget', message: 'Your organization has reached its monthly usage limit. Contact your administrator.' };
    return { allowed: true };
  } catch (e) { return { allowed: true }; }
}

// ── Provider configuration ────────────────────────────────────
// To switch providers, change ACTIVE_PROVIDER and set the
// corresponding API key in Vercel environment variables.
// Supported: 'anthropic' | 'together' | 'groq'
const ACTIVE_PROVIDER = process.env.LLM_PROVIDER || 'anthropic';

const PROVIDER_CONFIG = {
  anthropic: {
    url: 'https://api.anthropic.com/v1/messages',
    apiKey: () => process.env.ANTHROPIC_API_KEY,
    headers: (key) => ({ 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' }),
    // Model name mapping: Pario internal name → Anthropic model ID
    models: {
      default: 'claude-sonnet-4-6',
      fast:    'claude-haiku-4-5-20251001',
      strong:  'claude-sonnet-4-6',
    },
    // Normalize response to { text, inputTokens, outputTokens }
    parseResponse: (data) => ({
      text: (data.content || []).filter(b => b.type === 'text').map(b => b.text).join(''),
      inputTokens: data.usage?.input_tokens,
      outputTokens: data.usage?.output_tokens,
      stopReason: data.stop_reason,
    }),
    // Build request body from Pario's normalized format
    buildBody: (model, maxTokens, system, messages) => ({ model, max_tokens: maxTokens, system: system ?? '', messages }),
  },

  together: {
    url: 'https://api.together.xyz/v1/chat/completions',
    apiKey: () => process.env.TOGETHER_API_KEY,
    headers: (key) => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` }),
    models: {
      default: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      fast:    'meta-llama/Llama-3.1-8B-Instruct-Turbo',
      strong:  'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    },
    parseResponse: (data) => ({
      text: data.choices?.[0]?.message?.content || '',
      inputTokens: data.usage?.prompt_tokens,
      outputTokens: data.usage?.completion_tokens,
      stopReason: data.choices?.[0]?.finish_reason,
    }),
    buildBody: (model, maxTokens, system, messages) => ({
      model, max_tokens: maxTokens,
      messages: [{ role: 'system', content: system ?? '' }, ...messages],
    }),
  },

  groq: {
    url: 'https://api.groq.com/openai/v1/chat/completions',
    apiKey: () => process.env.GROQ_API_KEY,
    headers: (key) => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` }),
    models: {
      default: 'llama-3.3-70b-versatile',
      fast:    'llama-3.1-8b-instant',
      strong:  'llama-3.3-70b-versatile',
    },
    parseResponse: (data) => ({
      text: data.choices?.[0]?.message?.content || '',
      inputTokens: data.usage?.prompt_tokens,
      outputTokens: data.usage?.completion_tokens,
      stopReason: data.choices?.[0]?.finish_reason,
    }),
    buildBody: (model, maxTokens, system, messages) => ({
      model, max_tokens: maxTokens,
      messages: [{ role: 'system', content: system ?? '' }, ...messages],
    }),
  },
};

// ── Generic LLM caller with retry ────────────────────────────
async function callLLM({ system, messages, modelTier = 'default', maxTokens, providerOverride } = {}, retries = 3) {
  const providerName = providerOverride || ACTIVE_PROVIDER;
  const provider = PROVIDER_CONFIG[providerName];
  if (!provider) throw new Error(`Unknown provider: ${providerName}`);

  const apiKey = provider.apiKey();
  if (!apiKey) throw new Error(`Missing API key for provider: ${providerName}`);

  const model = provider.models[modelTier] || provider.models.default;
  const headers = provider.headers(apiKey);
  const body = provider.buildBody(model, maxTokens, system, messages);

  let lastData, lastStatus;
  for (let attempt = 0; attempt < retries; attempt++) {
    if (attempt > 0) await sleep(attempt * 3000);
    const response = await fetch(provider.url, { method: 'POST', headers, body: JSON.stringify(body) });
    lastData = await response.json();
    lastStatus = response.status;
    if (response.status === 429) continue;
    return {
      data: lastData,
      status: lastStatus,
      ok: response.ok,
      parsed: response.ok ? provider.parseResponse(lastData) : null,
      model,
      provider: providerName,
    };
  }
  return { data: lastData, status: lastStatus, ok: false, parsed: null, model, provider: providerName };
}

// ── Legacy Anthropic caller — kept for web search calls ───────
// Web search uses Anthropic-specific beta headers and isn't
// abstracted yet. When open model web search is available,
// migrate this to callLLM with a webSearch option.
async function callAnthropic(headers, body, retries = 3) {
  let lastData, lastStatus;
  for (let attempt = 0; attempt < retries; attempt++) {
    if (attempt > 0) await sleep(attempt * 3000);
    const response = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers, body: JSON.stringify(body) });
    lastData = await response.json();
    lastStatus = response.status;
    if (response.status === 429) continue;
    return { data: lastData, status: lastStatus, ok: response.ok };
  }
  return { data: lastData, status: lastStatus, ok: false };
}

// ── Allowed origins ───────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'https://demo.planwithpario.com',
  'https://app.planwithpario.com',
  'https://www.planwithpario.com',
  'https://planwithpario.com',
  'https://agent.acuitysourcing.com',
  'https://www.jvtestspace.com',
  'https://jvtestspace.com',
];

// ── Main handler ──────────────────────────────────────────────
export default async function handler(req, res) {
  const origin = req.headers['origin'];
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  } else if (!origin) {
    // Server-to-server calls have no origin header — allow
    res.setHeader('Access-Control-Allow-Origin', 'null');
  } else {
    // Unknown origin — reject preflight, block request
    if (req.method === 'OPTIONS') return res.status(204).end();
    return res.status(403).json({ error: { message: 'Origin not allowed' } });
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-User-Id, X-Tenant-Id, X-Session-Id');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).end();

  const userId = req.headers['x-user-id'] || 'anonymous';
  const tenantId = req.headers['x-tenant-id'] || null;
  const sessionId = req.headers['x-session-id'] || null;

  const rateCheck = checkRateLimit(userId, tenantId);
  if (!rateCheck.allowed) return res.status(429).json({ error: { type: rateCheck.reason, message: rateCheck.message } });

  const budgetCheck = await checkTenantBudget(tenantId);
  if (!budgetCheck.allowed) return res.status(429).json({ error: { type: budgetCheck.reason, message: budgetCheck.message } });

  try {
    const buffers = [];
    for await (const chunk of req) buffers.push(chunk);
    const raw = Buffer.concat(buffers).toString();
    const { system, user, useWebSearch, model: modelOverride } = JSON.parse(raw);
    if (!user) return res.status(400).json({ error: { message: 'Missing user message' } });

    const baseHeaders = { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' };

    if (!useWebSearch) {
      const modelTier = modelOverride === 'fast' ? 'fast' : modelOverride === 'strong' ? 'strong' : 'default';
      const maxTokens = getTokenBudget(system);
      const { parsed, status, ok, model } = await callLLM({
        system, messages: [{ role: 'user', content: user }], modelTier, maxTokens,
      });
      if (!ok || !parsed) return res.status(status).json({ error: { message: 'LLM call failed' } });
      logUsage({ userId, tenantId, sessionId, callType: 'standard', model, inputTokens: parsed.inputTokens, outputTokens: parsed.outputTokens });
      return res.status(200).json({ content: [{ type: 'text', text: parsed.text }], stop_reason: parsed.stopReason });
    }

    // Two-step market research
    const searchSystem = `You are a procurement analyst researching software vendors.
Use web search to find 6-8 relevant vendors for the described procurement need.
For each vendor find: full name, software category, G2 rating and review count if available,
a one-sentence description, and the G2 URL. Write your findings as clear prose — one paragraph per vendor.
Do not format as JSON yet. Just research and describe what you find.`;

    const { data: searchData, status: searchStatus, ok: searchOk } = await callAnthropic(
      { ...baseHeaders, 'anthropic-beta': 'web-search-2025-03-05' },
      { model: 'claude-haiku-4-5-20251001', max_tokens: TOKEN_BUDGETS.market, system: searchSystem, messages: [{ role: 'user', content: user }], tools: [{ type: 'web_search_20250305', name: 'web_search' }] }
    );
    if (!searchOk || searchData.error) return res.status(searchStatus).json(searchData);
    logUsage({ userId, tenantId, sessionId, callType: 'market_search', model: 'claude-haiku-4-5-20251001', inputTokens: searchData.usage?.input_tokens, outputTokens: searchData.usage?.output_tokens });
    const researchText = (searchData.content || []).filter(b => b.type === 'text').map(b => b.text).join('');

    const formatSystem = `You are a data formatter. Convert vendor research notes into a JSON array.
Output ONLY a valid JSON array. No explanation, no markdown, no code fences. Start with [ and end with ].
Each object: { "name": "...", "category": "...", "g2Rating": "...", "g2ReviewCount": "...", "description": "...", "requirementsMatch": 4, "requirementsTotal": 6, "matchConfidence": "high", "g2Url": "..." }`;

    const { data: formatData, status: formatStatus, ok: formatOk } = await callAnthropic(baseHeaders, {
      model: 'claude-sonnet-4-5', max_tokens: TOKEN_BUDGETS.format, system: formatSystem,
      messages: [{ role: 'user', content: `Convert to JSON array:\n\n${researchText}` }],
    });
    if (!formatOk || formatData.error) return res.status(formatStatus).json(formatData);
    logUsage({ userId, tenantId, sessionId, callType: 'market_format', model: 'claude-sonnet-4-5', inputTokens: formatData.usage?.input_tokens, outputTokens: formatData.usage?.output_tokens });
    const finalText = (formatData.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    return res.status(200).json({ content: [{ type: 'text', text: finalText }], stop_reason: formatData.stop_reason });

  } catch (err) {
    return res.status(500).json({ error: { message: err.message } });
  }
}
