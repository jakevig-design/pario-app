PROCUREMENT AGENT
=================

An AI-powered procurement requirements tool built with Vite + React,
deployed on Vercel, with session persistence via Supabase.


WHAT IT DOES
------------

The agent guides a procurement manager through four steps to produce
a structured requirements document:

1. SCOPE
   Structured 5Ws intake (Who, What, Where, When, Why). AI formalizes
   the rough input into a polished scope narrative, then evaluates it
   against quality criteria (specificity, exclusions, plain language,
   completeness) and prompts for refinement if anything is missing.
   Type "skip" to dismiss any flag.

2. REQUIREMENTS
   AI generates 5-8 binary functional requirements from the scope
   ("The solution shall..."), each answerable Yes/No by a vendor.
   User can edit, delete, and add their own.

3. QUESTIONS
   AI generates 2-3 follow-up discovery questions per requirement,
   automatically typed as open-ended or multiple choice.

4. REVIEW & EXPORT
   Full review of all content plus an interactive procurement timeline.
   Export everything to a formatted .docx file.


PROCUREMENT TIMELINE
--------------------

The timeline includes 20 pre-built activities across three collapsible groups:

  Pre-RFP
    - Draft Scope & Requirements
    - Execute NDA
    - Market Analysis
    - Vendor Identification
    - Draft RFP
        > Finalize Scope & Requirements
        > Establish Evaluation Team, Criteria & Weighting

  RFP
    - Issue RFP
        > Vendors Submit Clarifying Questions
        > Respond to Vendor Questions
        > Submit RFP Response
    - Evaluate RFP
        > Evaluate Responses
        > Shortlist (Recommendation to Leadership)
        > Technical Evaluation (Demo / POC)
        > Evaluate Technical Evaluation

  Post-RFP
    - Internal Alignment & Confirm Budget
    - Final Recommendation
    - Negotiate Contract
    - Implementation

Set an RFP Start Date and Go-Live Date. All activity dates cascade
automatically from the start date. Each activity has an editable offset
(n+ days) that drives its end date. Activities can be reordered by drag
and drop, renamed, deleted, or added. A Gantt chart renders live from
the activity state.


TECH STACK
----------

  Frontend      Vite + React
  AI            Anthropic Claude (via Vercel Edge Function proxy)
  Persistence   Supabase (PostgreSQL)
  Hosting       Vercel
  Domain        Custom domain via GoDaddy DNS
  Export        docx + file-saver


PROJECT STRUCTURE
-----------------

  rfp-agent/
  |-- api/
  |   |-- claude.js               Vercel Edge Function, proxies Anthropic API
  |-- src/
  |   |-- App.jsx                 Root component
  |   |-- main.jsx                React entry point
  |   |-- RequirementsAgent.jsx   Main application component
  |   |-- supabase.js             Supabase client and session helpers
  |-- index.html
  |-- package.json
  |-- vite.config.js


ENVIRONMENT VARIABLES
---------------------

Set these in Vercel under Settings > Environment Variables:

  ANTHROPIC_API_KEY       Your Anthropic API key
                          Get it at console.anthropic.com

  VITE_SUPABASE_URL       Your Supabase project URL
                          e.g. https://xxxx.supabase.co

  VITE_SUPABASE_ANON_KEY  Your Supabase publishable key
                          Found under Settings > API Keys in Supabase


SUPABASE SETUP
--------------

Run this in the Supabase SQL Editor:

  create table procurement_sessions (
    id text primary key,
    status text not null default 'draft',
    project_title text,
    data jsonb,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  );

  create policy "allow all" on procurement_sessions
    for all
    using (true)
    with check (true);


LOCAL DEVELOPMENT
-----------------

  npm install
  npm run dev

App runs at http://localhost:5173. AI features require the Anthropic API
key. For local dev, test against the deployed Vercel URL or set up a
local proxy.


DEPLOYMENT
----------

Vercel auto-deploys on every push to main.

  git add .
  git commit -m "your change"
  git push


CUSTOMIZING AI PROMPTS
----------------------

All prompts are defined as constants near the top of
src/RequirementsAgent.jsx. Edit any of these directly in GitHub
and Vercel will redeploy automatically.

  P_SCOPE_GENERATE    How the scope narrative is written from 5Ws answers
  P_SCOPE_EVALUATE    Criteria used to evaluate and flag the scope
  P_SCOPE_REFINE      How flagged gaps are incorporated into the scope
  P_REQS              How binary functional requirements are generated
  P_QS                How discovery questions are generated per requirement


SESSION PERSISTENCE
-------------------

Sessions save to Supabase automatically every 30 seconds once a scope
has been generated, and on every manual Save Draft click. Sessions are
marked "complete" when the .docx is exported. All sessions are accessible
from the Sessions landing screen. Click any row to resume, or delete
with the trash icon.
