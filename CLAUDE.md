# CLAUDE.md — Pario

> Standing context for Claude Code. Read this first every session.

## What this project is

Pario is a SaaS business case tool that helps enterprise business leaders define what they need before buying software. The user chats with Pario; Pario produces a complete business case — scope, differentiators, pressure-test questions, vendor landscape, timeline, and executive narrative — ready to feed into downstream procurement systems.

Built and operated by **Acuity Sourcing LLC** (Jake Vigneri). Currently targeting a Fortune 100 design partner.

Positioning: *"Inside intelligence for enterprise software"* — not an RFP tool, a business case tool. Primary user is a VP/Director-level business leader evaluating niche software in the $200K–$500K range. Core promise: 5 minutes of input + 5 minutes of AI + 5 minutes to review = 15-minute business case.

Roadmap: Pario is the pre-vendor / intake layer. **Procurement OS** (separate, downstream) handles RFP, scoring, contract. Coupa marketplace integration is a later target — Pario sits at the front of the procurement chain, before the requisition exists.

## Current state (as of 2026-04-28 evening session)

- ✅ Working: chat intake (~4–6 exchanges), DONE detection + bullet parsing, scope generation, Supabase session save, `dev.planwithpario.com` deploy with CORS, consumer UI shell (pill nav, chat panel, output panel, building blocks).
- ✅ **Auto-flow scope-side cascade now fires** (as of commits `857f985`, `7e8c5b2`, `78861ed` on `dev`). The original blocker was `doEvaluateScope` gating `scopeApproved` on a `passed` field that the LLM frequently omits. Now gated on flags being empty (flags = source of truth); expert-questions step decoupled from the gate.
- 🚧 Full end-to-end cascade (requirements → questions → market → timeline → narrative) verification: pending Jake's manual test on `dev.planwithpario.com`. The unblock got us to `[Pario] Triggering doAutoFlow`; whether every downstream step completes cleanly is the next thing to confirm.
- 🚧 Sidebar drawer pill clicks don't navigate; output building-block content rendering needs verification; PDF export logo is CORS-blocked in the print window.
- ❌ Latent: `P_SCOPE_EVALUATE` returns a malformed shape — an array `[{…}]` instead of the documented `{passed, flags}` object. Defensive code in `doEvaluateScope` masks it, but either the prompt or `callJSON` needs a proper fix.
- ❌ Pre-merge cleanup before `dev` → `main`: remove `[Pario]` debug `console.log` calls and the `[DEV] Skip chat` button (it's a debug-only harness, not product).

**Design decision recorded tonight:** expert questions (`P_SCOPE_EXPERT`) are advisory, not blocking. They are still fetched and surfaced in the building-block panel for optional review, but they do not gate `scopeApproved`. This restores the handoff §1 "no manual steps" promise for the auto-flow.

**Branch warning:** `dev` is ahead of `main`. All work continues on `dev`. Never push directly to `main`.

## Architecture

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React (Vite) | Single-page application. All UI and state in `src/RequirementsAgent.jsx` |
| API proxy | Vercel Serverless (Node.js) | All AI calls proxied here. CORS, rate limiting, usage logging. |
| Database | Supabase (PostgreSQL) | Sessions, users, tenant config, usage logs. RLS on all tables. |
| Auth | Supabase Auth | Email/password. Session management. |
| AI | Anthropic Claude API | Sonnet 4.6 (primary), Haiku 4.5 (market research) |
| Hosting | Vercel | Auto-deploy from GitHub on push to `main` or `dev` branch |
| DNS | Cloudflare | DNS only — grey cloud. No proxy (conflicts with Vercel routing). |

Other dependencies: `@supabase/supabase-js`, `lucide-react`, `docx` (Word export), `file-saver`. Supabase project: `rysvlgllmnvxchxmraql.supabase.co` (Pro plan). LLM_PROVIDER env supports `anthropic` (active), `together`, `groq` via `PROVIDER_CONFIG` in `api/claude.js`. Gemini explicitly out of scope.

Repos:
- App: `github.com/jakevig-design/pario-app`
- Marketing site + docs: `github.com/jakevig-design/pario-site`

## Architecture notes

- Single React component, no router. View state (`scope` | `requirements` | `questions` | `market` | `timeline` | `summary` | `sessions`) controls what renders. Tab labels are de-procured: scope→"The Problem", requirements→"Differentiators", questions→"Pressure Test", market→"The Landscape", timeline→"The Plan", summary→"Executive Brief".
- All AI prompts live in `src/prompts.js` (~371 lines). Keys: `P_SCOPE_CHAT(companyCtx)`, `P_SCOPE_GENERATE`, `P_SCOPE_EVALUATE`, `P_SCOPE_REFINE`, `P_SCOPE_EXPERT`, `P_REQS`, `P_QS`, `P_MARKET(companyCtx)`, `P_TIMELINE_DATE`, `P_NARRATIVE`, plus `FIVE_WS`. Edit prompts here without touching UI code.
- Auto-flow chain (in `RequirementsAgent.jsx`): `doSendChatMessage` → DONE detected → `doGenerateScopeFromBullets` → `doEvaluateScope` → sets `scopeApproved`. A `useEffect` on `[scopeApproved]` then calls `doAutoFlow`, which cascades: `doGenerateReqs` → `doGenerateQuestions` → `doExtractTimelineDate` → `doMarketResearch` → `doGenerateNarrative`.
- DONE detection: `doSendChatMessage` checks `upperReply.includes("DONE")`, extracts JSON array between first `[` and last `]`, parses bullets, collapses chat, calls `setTimeout(() => doGenerateScopeFromBullets(bullets), 100)`.
- `getIdentity()` is defined at `RequirementsAgent.jsx:955`, before all call sites. It returns `{userId, tenantId, sessionId}` and was previously the root cause of silent auto-flow hangs when defined after its callers.
- Scope evaluation gate: passes if `flags.length === 0`, regardless of whether the response includes a `passed` field. The LLM does not consistently include it. Expert questions are fetched for advisory display only and do not gate the cascade.
- All AI calls proxy through `api/claude.js`. It enforces CORS via `ALLOWED_ORIGINS`, per-tenant rate limits via `checkRateLimit`, and logs cost per call to `api_usage` via `logUsage`. Market research is a two-step call: Haiku web search → Sonnet JSON-format pass.
- Multi-tenancy: tenant config from Supabase `tenant_config` is injected into `P_SCOPE_CHAT`, `P_SCOPE_GENERATE`, `P_MARKET`, and the PDF export logo. Tenants today: `acme` (demo), `moodys`, `kraft-heinz`. Demo tenants: 5 req/min, 30 req/day. Real users: 10/min, 100/day.

## Key files

- `src/RequirementsAgent.jsx` — entire UI, state, logic, CSS, prompt orchestration. Refactor deferred until after design-partner validation.
- `src/prompts.js` — all prompts.
- `src/supabase.js` — auth, profile, session CRUD, `logEvent`.
- `src/ErrorBoundary.jsx` — top-level error UI.
- `api/claude.js` — Vercel serverless proxy. CORS allowlist, rate limits, provider routing, cost logging, two-step market research.
- `api/scrape.js` — scrape helper (108 lines).

Key Supabase tables: `tenant_config`, `user_profiles`, `procurement_sessions`, `api_usage`, `market_entries`, `session_events`.

## Conventions

- **Styling:** inline `<style>` injected at module load + inline `style={{...}}` props. CSS class prefix `rq-`. No CSS-in-JS library, no Tailwind. Fonts: Syne (UI), Lora (body), JetBrains Mono.
- **Components:** single mega-component. Don't add new component files unless explicitly asked — refactor is deferred.
- **Data fetching:** direct calls to `src/supabase.js` helpers; AI calls go through the inline `callClaude`/`callJSON` helpers in `src/RequirementsAgent.jsx` to `/api/claude`.
- **Types:** plain JavaScript (`.jsx`). No TypeScript.
- **Tone in user-facing copy:** confident, slightly cheeky. Examples: *"Got it, take a break while I get some work done"* / *"Asking the hard questions so you don't have to."* / *"Your business case is ready. Go get that alignment!"*

## Domains

| URL | Branch | Purpose |
|---|---|---|
| `app.planwithpario.com` | `main` | Production app — login required |
| `demo.planwithpario.com` | `main` | Open demo — auto-login as Acme Co. |
| `dev.planwithpario.com` | `dev` | Staging — test here before merging to main |
| `www.planwithpario.com` | `main` | Marketing site (separate repo: `pario-site`) |
| `docs.planwithpario.com` | `main` | Docs site (served from `pario-site/docs/`) |

## Environment variables

| Variable | Location | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | Server-side only | Anthropic API auth. Never in client bundle. |
| `SUPABASE_URL` | Server-side only | Supabase project URL for server-side calls |
| `SUPABASE_SERVICE_KEY` | Server-side only | Service role key. Bypasses RLS. Never in client bundle. |
| `VITE_SUPABASE_URL` | Client bundle | Supabase URL for frontend auth. Public. |
| `VITE_SUPABASE_ANON_KEY` | Client bundle | Anon key for frontend auth. Public. RLS enforces access. |
| `LLM_PROVIDER` | Server-side only | Active AI provider. Default: `anthropic`. Options: `together`, `groq` |

Commands:

- Dev: `npm run dev`
- Build: `npm run build`
- Preview: `npm run preview`

## API proxy — /api/claude

- URL: `https://app.planwithpario.com/api/claude`
- Method: `POST`
- Auth: CORS allowlist (origin-based)

Request body fields: `system` (required), `user` (required), `useWebSearch` (optional boolean), `model` (optional: `fast` / `strong` / `default`).

Rate limits: production users 10/min, 100/day. Demo/dev tenants (`acme`) 5/min, 30/day.

Error codes: `400 missing_field`, `403 origin_not_allowed`, `403 origin_required`, `429 rate_limit_minute`, `429 rate_limit_day`, `429 tenant_budget`.

## Database schema

**`tenant_config`:** `tenant_id` (PK), `company_name`, `brand_name`, `vertical`, `employee_count`, `tech_stack` (TEXT[]), `regulatory_context`, `logo_url`, `monthly_call_limit`.

**`procurement_sessions`:** `id` (PK), `user_id` (FK), `tenant_id` (FK), `project_title`, `status` (`draft` / `active` / `complete`), `data` (JSONB — full session state), `updated_at`.

**`api_usage`:** `id` (PK), `user_id` (FK), `tenant_id` (FK), `call_type`, `model`, `input_tokens`, `output_tokens`, `estimated_cost_usd`.

## Prompt system

| Prompt | Model | Purpose |
|---|---|---|
| `P_SCOPE_CHAT` | Sonnet 4.6 | Intake conversation. Max 4 questions. Outputs DONE + JSON scope bullets. |
| `P_SCOPE_GENERATE` | Sonnet 4.6 | Generates formal scope prose from approved bullets. |
| `P_SCOPE_EVALUATE` | Sonnet 4.6 | 7-criteria quality check. Returns pass/fail with flags. |
| `P_REQS` | Sonnet 4.6 | Generates 0–4 functional requirements (differentiators). |
| `P_QS` | Sonnet 4.6 | 4–5 vendor pressure-test questions. Single call. |
| `P_MARKET` | Haiku 4.5 + Sonnet 4.6 | Vendor research. Haiku for search, Sonnet for formatting. |
| `P_TIMELINE_DATE` | Sonnet 4.6 | Extracts target date from scope. Defaults to 90 days. |
| `P_NARRATIVE` | Sonnet 4.6 | 3-paragraph executive business case narrative. |

## Prompt ethos rules

These rules are enforced across all prompts. Never remove or override them.

- Budget is never included in any output — scope, requirements, questions, or narrative.
- Requirements are differentiators — what separates vendors, not table stakes.
- Zero differentiators is a valid output — Pario does not manufacture requirements.
- Questions surface vendor limitations — not confirmation that vendors can do something.
- Urgency, timeline pressure, and current-state failures never appear in vendor-facing outputs.
- Platform switches are minimum 12 months — Pario timelines reflect this.
- No em dashes in any output.

## Deployment workflow

1. All changes go to the `dev` branch first.
2. Test on `dev.planwithpario.com`.
3. Merge `dev` to `main` when confirmed working.
4. Vercel auto-deploys to `app.planwithpario.com` and `demo.planwithpario.com`.
5. Create a GitHub release tag (`vX.X.X`) after each stable release.

**Never push directly to `main`.**

Jake works without a terminal day-to-day; code is edited via GitHub web UI or Claude Code. When pasting whole-file replacements via the GitHub web editor, do a full select-all + replace — partial pastes silently corrupt the file.

**Rollback:**

- Option A (fastest): Vercel dashboard → `pario-app` → Deployments → find last good deployment → three dots → Promote to Production.
- Option B: `git revert HEAD && git push origin main`.

Always test on `dev.planwithpario.com` before merging to `main`.

## Useful commands

```bash
npm run dev
npm run build
git checkout dev   # always work here, never on main
```

## Don't touch / be careful with

- Production Supabase data — never run destructive queries against prod.
- Any API keys committed accidentally — flag immediately, do not commit fixes silently.
- Existing prompt templates in production until A/B tested — prompts encode 20 years of procurement experience, prefer surgical edits over rewrites.
- The handoff doc lists DPA-to-attorney as a hard gate before any GE Vernova (design partner) data enters the system. Do not enable any flow that would ingest design-partner data until that gate is cleared.
- Don't merge `dev` → `main` while `[DEV] Skip chat` button or `[Pario]` debug logs are still present.
- **`README.md` is severely stale** — it describes a prior product name "BuyRight" with different feature framing. Do not treat it as authoritative for anything; rely on this file.

## Open questions / decisions pending

- DPA → PA attorney for design partner — STILL PENDING; critical path.
- `P_SCOPE_EVALUATE` response shape: LLM returns `[{…}]` array instead of `{passed, flags}` object. Decide whether to fix prompt-side (tighten the schema instruction) or parser-side (`callJSON` unwraps single-element arrays). Defensive flags-as-truth gate is a workaround, not a fix.
- Sidebar drawer nav wiring (pill clicks, drawer items don't navigate to sections).
- Building-block content rendering — each block should expand with editable content; needs verification once full cascade confirmed.
- PDF export logo CORS — convert external logo URLs to base64 before injecting into the print window.
- Multi-tenant architecture maturity (RLS, org model, RBAC) — Procurement OS is going multi-tenant; whether Pario follows the same pattern now or after stabilization.
- LLM provider primacy — `LLM_PROVIDER` switch already exists; whether to actively evaluate Together / Groq / DeepSeek / Llama 4 against the cost baseline (~$0.12/full session, ~$0.05/partial).
- SOC 2 — architecture decisions pending.
- Tenant onboarding — currently manual SQL seeding.
- COGS dashboard tab, market data subscriptions (Vendr/Zluri/Zylo), PDF Gantt-as-base64 — all deferred.
- Prompt tuning session: chat is 2–3 questions too long; `P_REQS` should consistently use "differentiators" language; `P_MARKET` should score per-differentiator (pass/fail per vendor per differentiator) instead of aggregate.

## Working with Claude Code on this project

- Before non-trivial changes: confirm we're on `dev`, not `main`.
- Summarize understanding + plan before editing the mega-component.
- Ask before installing new dependencies.
- For LLM-related changes, note which provider is being targeted — providers are not interchangeable in prompt format or capabilities.
- Commits should be small and reversible while we're stabilizing.
- README.md is stale (describes a prior product name "BuyRight"); rely on this file, not the README.
