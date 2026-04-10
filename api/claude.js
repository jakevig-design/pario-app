import { useState, useRef, useEffect } from "react";
import { FileText, Plus, Trash2, Loader, ChevronRight, CheckCircle, Pencil, X, Check, RefreshCw, AlertTriangle, Calendar, Save, Clock, ArrowLeft, ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { saveAs } from "file-saver";
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType, AlignmentType, HeadingLevel, LevelFormat } from "docx";
import { saveSession, loadSessions, loadSession, deleteSession } from "./supabase";

// ─── Fonts ────────────────────────────────────────────────────────────────────
const _link = document.createElement("link");
_link.rel = "stylesheet";
_link.href = "https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Lora:ital,wght@0,400;0,500;1,400&family=JetBrains+Mono:wght@400;500&display=swap";
document.head.appendChild(_link);

// ─── Palette tokens ───────────────────────────────────────────────────────────
// Sidebar/chrome: #1b2530 (navy-slate dark)
// Surface:        #141d26 (darker bg)
// Panel:          #1b2530 (card bg)
// Topbar:         #1f2e3a
// Teal accent:    #5DCAA5 (primary: active, success, req IDs)
// Amber accent:   #EF9F27 (secondary: export, mc pills, q progress)
// Body text:      #d8eaf2
// Muted text:     #607a8a
// Border:         rgba(255,255,255,0.07)

const _style = document.createElement("style");
_style.textContent = `
  *{box-sizing:border-box}
  .rq-root{font-family:'Lora',Georgia,serif;background:#141d26;min-height:100vh;color:#d8eaf2;display:flex;flex-direction:column}

  /* ── Dashboard layout ── */
  .rq-shell{display:flex;flex:1;min-height:0}
  .rq-sidebar{width:200px;flex-shrink:0;background:#1b2530;border-right:1px solid rgba(255,255,255,0.07);display:flex;flex-direction:column;padding:0}
  .rq-sidebar-logo{padding:20px 20px 16px;border-bottom:1px solid rgba(255,255,255,0.07)}
  .rq-sidebar-brand{font-family:'Syne',sans-serif;font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#5DCAA5;margin-bottom:2px}
  .rq-sidebar-title{font-family:'Syne',sans-serif;font-size:15px;font-weight:800;color:#d8eaf2}
  .rq-sidebar-session{font-family:'JetBrains Mono',monospace;font-size:9px;color:#3a5060;margin-top:4px}
  .rq-nav{padding:12px 0;flex:1}
  .rq-nav-item{display:flex;align-items:center;gap:10px;padding:9px 20px;font-family:'Syne',sans-serif;font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#607a8a;border-left:2px solid transparent;cursor:pointer;transition:all .15s}
  .rq-nav-item:hover{color:#a8c8d8;background:rgba(255,255,255,0.03)}
  .rq-nav-item.active{color:#5DCAA5;border-left-color:#5DCAA5;background:rgba(93,202,165,0.08)}
  .rq-nav-item.done{color:#3d7a5a}
  .rq-nav-item.done .rq-nav-num{background:#0f2a20;border-color:#1d4a36;color:#5DCAA5}
  .rq-nav-num{width:18px;height:18px;border-radius:50%;border:1.5px solid currentColor;display:flex;align-items:center;justify-content:center;font-size:9px;flex-shrink:0}
  .rq-sidebar-footer{padding:16px 20px;border-top:1px solid rgba(255,255,255,0.07)}

  /* ── Main content area ── */
  .rq-main{flex:1;display:flex;flex-direction:column;min-width:0}
  .rq-topbar{background:#1f2e3a;border-bottom:1px solid rgba(255,255,255,0.07);padding:14px 28px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0}
  .rq-topbar-left .rq-topbar-title{font-family:'Syne',sans-serif;font-size:14px;font-weight:700;color:#d8eaf2}
  .rq-topbar-left .rq-topbar-sub{font-size:11px;color:#607a8a;margin-top:2px}
  .rq-topbar-right{display:flex;align-items:center;gap:10px}
  .rq-save-chip{font-family:'JetBrains Mono',monospace;font-size:10px;color:#5DCAA5;background:rgba(93,202,165,0.1);padding:4px 10px;border-radius:3px;display:flex;align-items:center;gap:5px}
  .rq-export-btn{display:flex;align-items:center;gap:7px;background:#EF9F27;color:#1a0e00;font-family:'Syne',sans-serif;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:8px 16px;border:none;border-radius:4px;cursor:pointer;transition:background .15s;white-space:nowrap}
  .rq-export-btn:hover{background:#FAC775}
  .rq-export-btn:disabled{opacity:.4;cursor:not-allowed}
  .rq-content{flex:1;padding:28px 32px;overflow-y:auto}

  /* ── Metric cards ── */
  .rq-metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:24px}
  .rq-metric{background:#1b2530;border-radius:6px;padding:12px 14px;border:1px solid rgba(255,255,255,0.07)}
  .rq-metric-label{font-family:'Syne',sans-serif;font-size:9px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:#607a8a;margin-bottom:4px}
  .rq-metric-val{font-size:22px;font-weight:500;color:#d8eaf2}
  .rq-metric-sub{font-size:10px;color:#5DCAA5;margin-top:2px}
  .rq-metric-sub.amber{color:#EF9F27}

  /* ── Section label ── */
  .rq-section-label{font-family:'Syne',sans-serif;font-size:10px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#607a8a;margin-bottom:10px}

  /* ── Cards / panels ── */
  .rq-card{background:#1b2530;border:1px solid rgba(255,255,255,0.07);border-radius:8px;padding:18px 20px;margin-bottom:10px}
  .rq-card:hover{border-color:rgba(93,202,165,0.25)}

  /* ── Form elements ── */
  .rq-textarea{width:100%;border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:12px 14px;font-family:'Lora',serif;font-size:14px;color:#d8eaf2;background:#141d26;resize:vertical;min-height:80px;outline:none;transition:border-color .15s;line-height:1.65}
  .rq-textarea:focus{border-color:#5DCAA5}
  .rq-input{width:100%;border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:9px 12px;font-family:'Lora',serif;font-size:13px;color:#d8eaf2;background:#141d26;outline:none;transition:border-color .15s}
  .rq-input:focus{border-color:#5DCAA5}

  /* ── Buttons ── */
  .rq-btn-primary{display:inline-flex;align-items:center;gap:7px;background:#5DCAA5;color:#04342C;font-family:'Syne',sans-serif;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:10px 20px;border:none;border-radius:4px;cursor:pointer;transition:background .15s}
  .rq-btn-primary:hover{background:#9FE1CB}
  .rq-btn-primary:disabled{opacity:.4;cursor:not-allowed}
  .rq-btn-ghost{display:inline-flex;align-items:center;gap:6px;background:transparent;color:#607a8a;font-family:'Syne',sans-serif;font-size:10px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;padding:8px 12px;border:1px solid rgba(255,255,255,0.12);border-radius:4px;cursor:pointer;transition:all .15s}
  .rq-btn-ghost:hover{border-color:#5DCAA5;color:#5DCAA5}
  .rq-btn-ghost:disabled{opacity:.4;cursor:not-allowed}
  .rq-btn-icon{display:inline-flex;align-items:center;justify-content:center;background:transparent;padding:5px 7px;border:1px solid rgba(255,255,255,0.1);border-radius:4px;cursor:pointer;transition:all .15s;color:#607a8a}
  .rq-btn-icon:hover{border-color:#5DCAA5;color:#5DCAA5}
  .rq-btn-icon:disabled{opacity:.35;cursor:not-allowed}
  .rq-btn-del{color:#b85050;border-color:rgba(184,80,80,0.3)}
  .rq-btn-del:hover{background:rgba(184,80,80,0.1);color:#e07070}

  /* ── Req cards ── */
  .rq-req-id{font-family:'JetBrains Mono',monospace;font-size:10px;color:#5DCAA5;font-weight:500;margin-bottom:4px;background:#0f2a20;display:inline-block;padding:1px 6px;border-radius:2px;border:1px solid #1d4a36}
  .rq-req-text{font-size:13px;line-height:1.55;color:#a8c8d8;margin-top:4px}

  /* ── Q cards ── */
  .rq-q-card{border:1px solid rgba(255,255,255,0.07);border-radius:6px;padding:14px 16px;margin-bottom:8px;background:#141d26}
  .rq-badge{display:inline-block;font-family:'Syne',sans-serif;font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:2px 7px;border-radius:3px;margin-bottom:6px}
  .rq-badge-open{background:#0f2a20;color:#5DCAA5;border:1px solid #1d4a36}
  .rq-badge-mc{background:#2a1a08;color:#EF9F27;border:1px solid #4a3010}
  .rq-q-text{font-size:13px;color:#a8c8d8;line-height:1.5}
  .rq-mc-opts{margin-top:8px;display:flex;flex-wrap:wrap;gap:6px}
  .rq-mc-opt{font-family:'JetBrains Mono',monospace;font-size:11px;background:#1b2530;border:1px solid rgba(239,159,39,0.3);border-radius:3px;padding:3px 9px;color:#EF9F27}

  /* ── Scope ── */
  .rq-scope-box{font-size:14px;line-height:1.75;color:#a8c8d8;background:#141d26;border:1px solid rgba(255,255,255,0.07);border-radius:8px;padding:16px 20px;white-space:pre-wrap;font-family:'Lora',serif}
  .rq-scope-approved{background:rgba(93,202,165,0.08);border:1px solid rgba(93,202,165,0.3);border-radius:8px;padding:12px 16px;margin-bottom:14px;display:flex;align-items:center;gap:10px;font-family:'Syne',sans-serif;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#5DCAA5}
  .rq-flag-card{background:rgba(239,159,39,0.05);border:1px solid rgba(239,159,39,0.3);border-radius:8px;padding:14px 18px;margin-bottom:12px}
  .rq-flag-title{font-family:'Syne',sans-serif;font-size:10px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:#EF9F27;margin-bottom:6px;display:flex;align-items:center;gap:6px}
  .rq-flag-text{font-size:13px;color:#c8a870;line-height:1.6;margin-bottom:10px}

  /* ── 5Ws ── */
  .rq-5w-card{background:#1b2530;border:1px solid rgba(255,255,255,0.07);border-radius:8px;padding:18px 20px;margin-bottom:12px}
  .rq-5w-label{font-family:'Syne',sans-serif;font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#5DCAA5;margin-bottom:4px}
  .rq-5w-question{font-size:13px;font-weight:500;color:#d8eaf2;margin-bottom:10px;font-family:'Syne',sans-serif}

  /* ── Save bar ── */
  .sv-bar{display:flex;align-items:center;justify-content:space-between;background:#1b2530;border:1px solid rgba(255,255,255,0.07);border-radius:6px;padding:8px 14px;margin-bottom:20px;gap:12px}
  .sv-status{font-family:'JetBrains Mono',monospace;font-size:10px;color:#607a8a;display:flex;align-items:center;gap:6px}
  .sv-status.saved{color:#5DCAA5}
  .sv-status.saving{color:#EF9F27}
  .sv-status.error{color:#e07070}

  /* ── Progress ── */
  .rq-progress{display:flex;align-items:center;gap:10px;margin-bottom:28px}
  .rq-pb-wrap{flex:1;height:3px;background:rgba(255,255,255,0.08);border-radius:2px;overflow:hidden}
  .rq-pb{height:100%;background:#5DCAA5;border-radius:2px;transition:width .5s ease}
  .rq-pb-label{font-family:'JetBrains Mono',monospace;font-size:10px;color:#3a5060;white-space:nowrap}

  /* ── Misc ── */
  .rq-hint{font-size:13px;color:#607a8a;line-height:1.6;font-style:italic;margin:0 0 16px}
  .rq-error{background:rgba(184,80,80,0.1);border:1px solid rgba(184,80,80,0.3);border-radius:6px;padding:10px 14px;font-size:13px;color:#e07070;margin-top:10px}
  .rq-divider{border:none;border-top:1px solid rgba(255,255,255,0.07);margin:24px 0}
  .rq-row{display:flex;gap:8px;align-items:center}
  .rq-actions{display:flex;gap:8px;margin-top:14px;align-items:center;flex-wrap:wrap}
  .rq-req-group-label{font-family:'Syne',sans-serif;font-size:11px;font-weight:700;color:#a8c8d8;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.07)}
  .rq-loading-center{padding:36px 0;text-align:center;color:#607a8a;font-style:italic;font-family:'Lora',serif}

  /* ── Sessions ── */
  .sessions-panel{background:#1b2530;border:1px solid rgba(255,255,255,0.07);border-radius:8px;overflow:hidden;margin-bottom:24px}
  .sessions-header{padding:12px 18px;border-bottom:1px solid rgba(255,255,255,0.07);background:#1f2e3a}
  .sessions-title{font-family:'Syne',sans-serif;font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#607a8a}
  .session-row{display:flex;align-items:center;justify-content:space-between;padding:12px 18px;border-bottom:1px solid rgba(255,255,255,0.05);cursor:pointer;transition:background .15s;gap:12px}
  .session-row:last-child{border-bottom:none}
  .session-row:hover{background:rgba(255,255,255,0.03)}
  .session-name{font-family:'Syne',sans-serif;font-size:13px;font-weight:600;color:#d8eaf2;margin-bottom:2px}
  .session-meta{font-family:'JetBrains Mono',monospace;font-size:10px;color:#3a5060}
  .session-status{font-family:'Syne',sans-serif;font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:3px 8px;border-radius:3px}
  .session-status.draft{background:rgba(239,159,39,0.12);color:#EF9F27}
  .session-status.complete{background:rgba(93,202,165,0.12);color:#5DCAA5}

  /* ── Timeline ── */
  .tl-group-header{display:flex;align-items:center;justify-content:space-between;padding:9px 12px;background:#1f2e3a;border-radius:6px;margin-bottom:6px;cursor:pointer;user-select:none;border:1px solid rgba(255,255,255,0.07)}
  .tl-group-label{font-family:'Syne',sans-serif;font-size:10px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;display:flex;align-items:center;gap:6px}
  .tl-group-pre{color:#5DCAA5}
  .tl-group-rfp{color:#EF9F27}
  .tl-group-post{color:#a8c8d8}
  .tl-act-row{display:grid;gap:6px;align-items:center;margin-bottom:5px;padding:7px 10px;background:#1b2530;border:1px solid rgba(255,255,255,0.07);border-radius:6px;transition:border-color .15s}
  .tl-act-row:hover{border-color:rgba(93,202,165,0.3)}
  .tl-act-row.is-child{margin-left:22px;background:#141d26;border-left:2px solid rgba(239,159,39,0.4)}
  .tl-act-row.is-parent{border-left:2px solid rgba(93,202,165,0.4)}
  .tl-act-row.dragging{opacity:.5}
  .tl-act-row.drag-over{border-color:#5DCAA5;border-style:dashed}
  .tl-cell-input{border:1px solid rgba(255,255,255,0.1);border-radius:4px;padding:5px 7px;font-family:'Lora',serif;font-size:12px;color:#d8eaf2;background:#141d26;outline:none;width:100%}
  .tl-cell-input:focus{border-color:#5DCAA5}
  .tl-col-hdr{font-family:'Syne',sans-serif;font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#3a5060}

  /* ── Gantt ── */
  .gantt-wrap{overflow-x:auto;margin-top:20px}
  .gantt-container{min-width:640px;background:#1b2530;border:1px solid rgba(255,255,255,0.07);border-radius:8px;padding:18px}
  .gantt-title{font-family:'Syne',sans-serif;font-size:10px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:#3a5060;margin-bottom:14px}

  /* ── Market research ── */
  .vendor-card{background:#1b2530;border:1px solid rgba(255,255,255,0.07);border-radius:8px;padding:16px 18px;margin-bottom:10px;transition:border-color .15s}
  .vendor-card:hover{border-color:rgba(93,202,165,0.25)}
  .vendor-card.shortlisted{border-color:rgba(93,202,165,0.5);background:rgba(93,202,165,0.05)}
  .vendor-card.eliminated{opacity:.45;border-color:rgba(184,80,80,0.3)}
  .vendor-name{font-family:'Syne',sans-serif;font-size:14px;font-weight:700;color:#d8eaf2;margin-bottom:2px}
  .vendor-category{font-family:'Syne',sans-serif;font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#607a8a;margin-bottom:8px}
  .vendor-meta{display:flex;align-items:center;gap:10px;margin-bottom:8px;flex-wrap:wrap}
  .vendor-rating{font-family:'JetBrains Mono',monospace;font-size:11px;color:#EF9F27;display:flex;align-items:center;gap:4px}
  .vendor-reviews{font-family:'JetBrains Mono',monospace;font-size:10px;color:#3a5060}
  .vendor-desc{font-size:12px;color:#a8c8d8;line-height:1.5;margin-bottom:10px}
  .vendor-match{display:flex;align-items:center;gap:8px;margin-bottom:10px}
  .vendor-match-bar{flex:1;height:4px;background:rgba(255,255,255,0.08);border-radius:2px;overflow:hidden;max-width:120px}
  .vendor-match-fill{height:100%;border-radius:2px;background:#5DCAA5}
  .vendor-match-fill.medium{background:#EF9F27}
  .vendor-match-fill.low{background:#607a8a}
  .vendor-match-text{font-family:'JetBrains Mono',monospace;font-size:10px;color:#607a8a}
  .vendor-actions{display:flex;gap:6px}
  .vendor-btn{font-family:'Syne',sans-serif;font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:4px 10px;border-radius:3px;cursor:pointer;border:1px solid;transition:all .15s}
  .vendor-btn-shortlist{color:#5DCAA5;border-color:rgba(93,202,165,0.3);background:transparent}
  .vendor-btn-shortlist:hover,.vendor-btn-shortlist.active{background:rgba(93,202,165,0.15);border-color:#5DCAA5}
  .vendor-btn-eliminate{color:#e07070;border-color:rgba(184,80,80,0.3);background:transparent}
  .vendor-btn-eliminate:hover,.vendor-btn-eliminate.active{background:rgba(184,80,80,0.1);border-color:#e07070}
  .vendor-btn-g2{color:#607a8a;border-color:rgba(255,255,255,0.1);background:transparent}
  .vendor-btn-g2:hover{color:#a8c8d8;border-color:rgba(255,255,255,0.2)}
  .confidence-dot{width:6px;height:6px;border-radius:50%;display:inline-block;flex-shrink:0}
  .confidence-high{background:#5DCAA5}
  .confidence-medium{background:#EF9F27}
  .confidence-low{background:#607a8a}

  @keyframes spin{to{transform:rotate(360deg)}}
  .spin{animation:spin .8s linear infinite;display:inline-block}
  .rq-fade{animation:fadeUp .3s ease both}
  @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
`;
document.head.appendChild(_style);

// ─── Utils ────────────────────────────────────────────────────────────────────
const genId = () => "SES-" + Math.random().toString(36).substring(2, 9).toUpperCase();
const uid = () => "a" + Date.now() + Math.random().toString(36).substring(2, 5);

async function callClaude(system, user, useWebSearch = false) {
  const res = await fetch("/api/claude", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ system, user, useWebSearch }) });
  if (!res.ok) throw new Error(`API ${res.status}`);
  const d = await res.json();
  if (d.error) throw new Error(d.error.message);
  // Extract text from content blocks (web search returns multiple block types)
  return d.content?.filter(b => b.type === "text").map(b => b.text).join("") ?? "";
}

async function callJSON(system, user, useWebSearch = false) {
  const t = await callClaude(system, user, useWebSearch);
  return JSON.parse(t.replace(/```json\s*/g, "").replace(/```/g, "").trim());
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
function addCalDays(dateStr, days) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function calDaysBetween(startStr, endStr) {
  const s = new Date(startStr + "T00:00:00");
  const e = new Date(endStr + "T00:00:00");
  return Math.round((e - s) / 86400000);
}

function fmtDate(str) {
  if (!str) return "—";
  return new Date(str + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function today() { return new Date().toISOString().split("T")[0]; }

// ─── Default activities ───────────────────────────────────────────────────────
// offsetDays: n+ days after startDate for endDate default
// parentId: sub-activity of another
// group: Pre-RFP | RFP | Post-RFP
function makeDefaultActivities(startDate) {
  const t = startDate || today();

  // Helper: date string from a reference + offset
  const d = (base, offset) => addCalDays(base, offset);

  const scopeStart = t;
  const scopeEnd = d(t, 7);           // +1 week
  const marketEnd = d(t, 14);         // +2 weeks from scope start
  const vendorEnd = d(marketEnd, 7);  // +1 week from market end
  const finScopeEnd = d(vendorEnd, 7);
  const evalTeamEnd = d(vendorEnd, 14);
  const issueStart = d(evalTeamEnd, 3);
  const issueEnd = d(issueStart, 14);
  const vendorQEnd = d(issueStart, 4 + 2); // n+4 days start, +2 days duration
  const respondEnd = d(vendorQEnd, 3);
  const submitStart = d(respondEnd, 2);
  const submitEnd = d(submitStart, 7);
  const evalStart = d(respondEnd, 3);
  const evalRespEnd = d(evalStart, 8);
  const shortlistEnd = d(d(evalRespEnd, 1), 5);
  const techStart = d(d(shortlistEnd, 0), 28);
  const techEnd = d(techStart, 28);
  const evalTechEnd = d(techStart, 5);
  const alignStart = d(evalTechEnd, 10);
  const alignEnd = d(alignStart, 5);
  const finalStart = d(alignEnd, 10);
  const finalEnd = d(finalStart, 5);
  const negoStart = d(finalEnd, 1);
  const negoEnd = d(negoStart, 45);
  const implStart = d(negoEnd, 10);
  const implEnd = d(implStart, 45);

  return [
    // ── Pre-RFP ──
    { id: "a1",  group: "Pre-RFP",  parentId: null, name: "Draft Scope & Requirements",           startDate: scopeStart,  endDate: scopeEnd,     offsetDays: 7,  startOffsetDays: 0 },
    { id: "a2",  group: "Pre-RFP",  parentId: null, name: "Execute NDA",                           startDate: scopeStart,  endDate: issueStart,   offsetDays: calDaysBetween(scopeStart, issueStart), startOffsetDays: 0 },
    { id: "a3",  group: "Pre-RFP",  parentId: null, name: "Market Analysis",                       startDate: scopeStart,  endDate: marketEnd,    offsetDays: 14, startOffsetDays: 0 },
    { id: "a4",  group: "Pre-RFP",  parentId: null, name: "Vendor Identification",                 startDate: scopeStart,  endDate: vendorEnd,    offsetDays: calDaysBetween(scopeStart, vendorEnd), startOffsetDays: 0 },
    { id: "a5",  group: "Pre-RFP",  parentId: null, name: "Draft RFP",                             startDate: vendorEnd,   endDate: issueStart,   offsetDays: calDaysBetween(vendorEnd, issueStart), startOffsetDays: calDaysBetween(t, vendorEnd) },
    { id: "a5a", group: "Pre-RFP",  parentId: "a5", name: "Finalize Scope & Requirements",         startDate: vendorEnd,   endDate: finScopeEnd,  offsetDays: 7,  startOffsetDays: calDaysBetween(t, vendorEnd) },
    { id: "a5b", group: "Pre-RFP",  parentId: "a5", name: "Establish Evaluation Team, Criteria & Weighting", startDate: vendorEnd, endDate: evalTeamEnd, offsetDays: 14, startOffsetDays: calDaysBetween(t, vendorEnd) },
    // ── RFP ──
    { id: "a6",  group: "RFP",      parentId: null, name: "Issue RFP",                             startDate: issueStart,  endDate: issueEnd,     offsetDays: 14, startOffsetDays: calDaysBetween(t, issueStart) },
    { id: "a6a", group: "RFP",      parentId: "a6", name: "Vendors Submit Clarifying Questions",   startDate: d(issueStart, 4), endDate: vendorQEnd, offsetDays: 2, startOffsetDays: calDaysBetween(t, d(issueStart, 4)) },
    { id: "a6b", group: "RFP",      parentId: "a6", name: "Respond to Vendor Questions",           startDate: vendorQEnd,  endDate: respondEnd,   offsetDays: 3,  startOffsetDays: calDaysBetween(t, vendorQEnd) },
    { id: "a6c", group: "RFP",      parentId: "a6", name: "Submit RFP Response",                   startDate: submitStart, endDate: submitEnd,    offsetDays: 7,  startOffsetDays: calDaysBetween(t, submitStart) },
    { id: "a7",  group: "RFP",      parentId: null, name: "Evaluate RFP",                          startDate: evalStart,   endDate: evalTechEnd,  offsetDays: calDaysBetween(evalStart, evalTechEnd), startOffsetDays: calDaysBetween(t, evalStart) },
    { id: "a7a", group: "RFP",      parentId: "a7", name: "Evaluate Responses",                    startDate: evalStart,   endDate: evalRespEnd,  offsetDays: 8,  startOffsetDays: calDaysBetween(t, evalStart) },
    { id: "a7b", group: "RFP",      parentId: "a7", name: "Shortlist (Recommendation to Leadership)", startDate: d(evalRespEnd, 1), endDate: shortlistEnd, offsetDays: 5, startOffsetDays: calDaysBetween(t, d(evalRespEnd, 1)) },
    { id: "a7c", group: "RFP",      parentId: "a7", name: "Technical Evaluation (Demo / POC)",     startDate: techStart,   endDate: techEnd,      offsetDays: 28, startOffsetDays: calDaysBetween(t, techStart) },
    { id: "a7d", group: "RFP",      parentId: "a7", name: "Evaluate Technical Evaluation",         startDate: techStart,   endDate: evalTechEnd,  offsetDays: 5,  startOffsetDays: calDaysBetween(t, techStart) },
    // ── Post-RFP ──
    { id: "a8",  group: "Post-RFP", parentId: null, name: "Internal Alignment & Confirm Budget",   startDate: alignStart,  endDate: alignEnd,     offsetDays: 5,  startOffsetDays: calDaysBetween(t, alignStart) },
    { id: "a9",  group: "Post-RFP", parentId: null, name: "Final Recommendation",                  startDate: finalStart,  endDate: finalEnd,     offsetDays: 5,  startOffsetDays: calDaysBetween(t, finalStart) },
    { id: "a10", group: "Post-RFP", parentId: null, name: "Negotiate Contract",                    startDate: negoStart,   endDate: negoEnd,      offsetDays: 45, startOffsetDays: calDaysBetween(t, negoStart) },
    { id: "a11", group: "Post-RFP", parentId: null, name: "Implementation",                        startDate: implStart,   endDate: implEnd,      offsetDays: 45, startOffsetDays: calDaysBetween(t, implStart) },
  ];
}

const GROUPS = ["Pre-RFP", "RFP", "Post-RFP"];
const GROUP_COLORS = { "Pre-RFP": "#2e5984", "RFP": "#3a6a52", "Post-RFP": "#a05828" };

// ─── Gantt ────────────────────────────────────────────────────────────────────
function GanttChart({ activities }) {
  const allDates = activities.flatMap(a => [a.startDate, a.endDate]).filter(Boolean).sort();
  if (!allDates.length) return null;
  const minDate = allDates[0];
  const maxDate = allDates[allDates.length - 1];
  const totalDays = Math.max(calDaysBetween(minDate, maxDate), 1);
  const BAR_H = 22;

  const xPct = (dateStr) => {
    if (!dateStr) return 0;
    return Math.min(Math.max((calDaysBetween(minDate, dateStr) / totalDays) * 100, 0), 100);
  };
  const wPct = (s, e) => {
    if (!s || !e) return 1;
    return Math.max(Math.min((calDaysBetween(s, e) / totalDays) * 100, 100), 0.5);
  };

  // Month markers
  const markers = [];
  const mStart = new Date(minDate + "T00:00:00");
  const mEnd = new Date(maxDate + "T00:00:00");
  let md = new Date(mStart.getFullYear(), mStart.getMonth(), 1);
  while (md <= mEnd) {
    const ds = md.toISOString().split("T")[0];
    markers.push({ ds, pct: xPct(ds), label: md.toLocaleDateString("en-US", { month: "short", year: "2-digit" }) });
    md = new Date(md.getFullYear(), md.getMonth() + 1, 1);
  }

  return (
    <div className="gantt-wrap">
      <div className="gantt-container">
        <div className="gantt-title">Procurement Timeline — {fmtDate(minDate)} to {fmtDate(maxDate)}</div>
        <div style={{ display: "flex" }}>
          {/* Labels */}
          <div style={{ width: 210, flexShrink: 0 }}>
            <div style={{ height: 28, marginBottom: 4 }} />
            {GROUPS.map(g => {
              const gas = activities.filter(a => a.group === g);
              if (!gas.length) return null;
              return (
                <div key={g}>
                  <div style={{ height: 20, marginBottom: 4, display: "flex", alignItems: "center" }}>
                    <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: GROUP_COLORS[g] }}>{g}</span>
                  </div>
                  {gas.map(a => (
                    <div key={a.id} style={{ height: BAR_H, marginBottom: 4, display: "flex", alignItems: "center", paddingLeft: a.parentId ? 14 : 0 }}>
                      <span style={{ fontFamily: "'Lora',serif", fontSize: a.parentId ? 10 : 11, color: a.parentId ? "#607a8a" : "#a8c8d8", lineHeight: 1.2, paddingRight: 8, fontStyle: a.parentId ? "italic" : "normal", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {a.parentId ? "↳ " : ""}{a.name}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Chart area */}
          <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
            {/* Month markers */}
            <div style={{ height: 28, position: "relative", marginBottom: 4, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              {markers.map(m => (
                <div key={m.ds} style={{ position: "absolute", left: `${m.pct}%`, top: 0, height: "100%", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "#3a5060", paddingLeft: 3, whiteSpace: "nowrap" }}>{m.label}</span>
                </div>
              ))}
            </div>

            {GROUPS.map(g => {
              const gas = activities.filter(a => a.group === g);
              if (!gas.length) return null;
              const color = GROUP_COLORS[g];
              return (
                <div key={g}>
                  {/* Group span bar */}
                  <div style={{ height: 20, marginBottom: 4, position: "relative" }}>
                    {(() => {
                      const gDates = gas.flatMap(a => [a.startDate, a.endDate]).filter(Boolean).sort();
                      if (gDates.length < 2) return null;
                      return (
                        <div style={{ position: "absolute", left: `${xPct(gDates[0])}%`, width: `${wPct(gDates[0], gDates[gDates.length - 1])}%`, height: 6, top: 7, background: color, opacity: 0.25, borderRadius: 3 }} />
                      );
                    })()}
                  </div>
                  {gas.map(a => {
                    const isChild = !!a.parentId;
                    return (
                      <div key={a.id} style={{ height: BAR_H, marginBottom: 4, position: "relative" }}>
                        <div style={{
                          position: "absolute",
                          left: `${xPct(a.startDate)}%`,
                          width: `${wPct(a.startDate, a.endDate)}%`,
                          height: isChild ? "70%" : "100%",
                          top: isChild ? "15%" : 0,
                          background: isChild ? "transparent" : color,
                          border: isChild ? `1.5px solid ${color}` : "none",
                          opacity: isChild ? 0.8 : 1,
                          borderRadius: 3,
                          display: "flex", alignItems: "center", paddingLeft: 5, minWidth: 3,
                        }}>
                          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, color: isChild ? color : "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {a.endDate && a.startDate ? calDaysBetween(a.startDate, a.endDate) + "d" : ""}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ marginTop: 12, display: "flex", gap: 16, flexWrap: "wrap" }}>
          {GROUPS.map(g => (
            <div key={g} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 14, height: 8, background: GROUP_COLORS[g], borderRadius: 2 }} />
              <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 10, color: "#607a8a" }}>{g}</span>
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 14, height: 8, border: "1.5px solid #2e5984", borderRadius: 2 }} />
            <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 10, color: "#607a8a" }}>Sub-activity</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Prompts ──────────────────────────────────────────────────────────────────
const P_SCOPE_GENERATE = `You are a professional business analyst writing a project scope for a software procurement document.

The user has answered the following 5 intake questions. Use their answers to write a formal scope narrative.

SCOPE QUALITY RULES — the scope MUST:
1. Be specific — include concrete details about deadlines, milestones, or deliverables where the user provided them
2. Include exclusions — explicitly state what is out of scope to prevent scope creep
3. Use plain language — no jargon, no acronyms without explanation
4. Be 3-6 sentences of clear prose — no bullets, no headers

Return ONLY the scope text. No preamble, no explanation.`;

const P_SCOPE_EVALUATE = `You are a senior business analyst reviewing a project scope narrative for quality.

Evaluate the scope against these criteria:
1. SPECIFICITY — Are deadlines, milestones, or deliverables clearly defined?
2. EXCLUSIONS — Does it explicitly state what is out of scope?
3. PLAIN LANGUAGE — Is it free of unexplained jargon?
4. COMPLETENESS — Does it address who, what, where, when, and why?

Respond ONLY with valid JSON, no markdown:
{
  "passed": true or false,
  "flags": [
    {
      "criterion": "EXCLUSIONS",
      "issue": "The scope does not define what is explicitly out of scope.",
      "prompt": "What should be explicitly excluded from this project? For example, are there integrations, features, or departments that should not be included?"
    }
  ]
}

If all criteria pass, return { "passed": true, "flags": [] }.
Only flag genuine gaps — do not invent issues if the scope is solid.`;

const P_SCOPE_REFINE = `You are a professional business analyst refining a project scope narrative.

The user has provided additional information to address a gap in the scope. Incorporate their response naturally into the existing scope. Keep the same tone and style. Return ONLY the updated scope text — no preamble, no explanation.`;

const P_REQS = `You are a business analyst writing functional requirements for a software procurement RFP.

Generate 5-8 binary functional requirements from the project scope.

RULES FOR A GOOD BINARY REQUIREMENT:
1. One thing only — a single, testable capability. No compound statements joined by "and", "including", "such as", or lists.
2. Yes or no — a vendor must be able to answer it with a single yes or no. No partial answers possible.
3. No detail about how — do not specify fields, methods, integrations, sub-features, or implementation details. Those belong in discovery questions.
4. Short and direct — one sentence, starting with "The solution shall..." or "The system must..."

BAD example (compound, lists detail): "The solution shall track hardware assets including computers, mobile devices, and peripherals with fields for asset identification, assignment, location, and lifecycle status."
GOOD example (single, testable): "The solution shall track hardware assets within the ServiceNow CMDB."

Return ONLY a valid JSON array, no markdown, no preamble:
[{"id":"R-F1","text":"The solution shall..."},...]`;

const P_QS = `You are a business analyst writing a vendor discovery questionnaire.

Given a binary functional requirement, generate 2-3 follow-up questions that unpack the detail behind it. These questions should explore how the vendor implements the capability, what limitations exist, and what configuration or customization may be needed.

RULES:
- Ask about the specifics that were intentionally left out of the requirement (asset types, fields, methods, integrations, sub-features)
- Use multiple choice when the answer space is finite and predictable
- Use open-ended when the answer requires explanation or varies significantly by vendor
- Do not re-ask the requirement itself — assume the vendor said yes

Return ONLY valid JSON, no markdown:
[{"type":"open_ended","text":"..."},{"type":"multiple_choice","text":"...","options":["A","B","C"]}]`;

const P_MARKET = `You are a procurement analyst conducting market research for a software procurement.

Given a project scope and functional requirements, use web search to identify 5-8 relevant software vendors. Search G2.com, Gartner, and vendor websites for current ratings and descriptions.

After completing your research, you MUST respond with ONLY a valid JSON array — no introduction, no explanation, no markdown fences. Just the raw JSON array starting with [ and ending with ].

Each object in the array must have exactly these fields:
{
  "name": "Vendor Name",
  "category": "Software category (e.g. ITAM, ERP, CMDB)",
  "g2Rating": "4.5/5 or N/A",
  "g2ReviewCount": "1,200 reviews or N/A",
  "description": "One sentence describing what the vendor does.",
  "requirementsMatch": 4,
  "requirementsTotal": 6,
  "matchConfidence": "high",
  "g2Url": "https://www.g2.com/products/... or null"
}

requirementsMatch is your estimate of how many requirements this vendor meets.
matchConfidence is high, medium, or low based on how certain you are.
Your entire response must be parseable by JSON.parse() with no preprocessing.`;
const FIVE_WS = [
  { key: "who", label: "Who", question: "Who will use this system, and who owns this initiative?", placeholder: "e.g. Shop floor technicians will use it daily. The VP of Operations is the project sponsor." },
  { key: "what", label: "What", question: "What problem are you solving, or what capability are you adding?", placeholder: "e.g. We lose track of tools constantly. We need real-time visibility into tool location and condition." },
  { key: "where", label: "Where", question: "Where does this fit in your current environment? Any existing systems it must work with?", placeholder: "e.g. Must integrate with our SAP ERP. Deployed across 3 facilities in the US." },
  { key: "when", label: "When", question: "When is this needed, and what is driving the timeline?", placeholder: "e.g. Must be live by Q3. We have an audit in September that requires this to be in place." },
  { key: "why", label: "Why", question: "Why is the current state inadequate?", placeholder: "e.g. Everything is tracked on spreadsheets. We lose 10-15 tools per month and have no way to audit." },
];

// ─── DocX Export ──────────────────────────────────────────────────────────────
async function buildDocx({ sessionId, projectTitle, formalScope, requirements, questions, activities, rfpStart, goLive, vendors, vendorStatus }) {
  const b = { style: BorderStyle.SINGLE, size: 1, color: "D4CCC4" };
  const borders = { top: b, bottom: b, left: b, right: b };
  const cm = { top: 90, bottom: 90, left: 130, right: 130 };

  const hCell = (text, w) => new TableCell({ borders, margins: cm, width: { size: w, type: WidthType.DXA }, shading: { fill: "2E2925", type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: "F7F5F2", font: "Arial", size: 20 })] })] });
  const bCell = (text, w, shade) => new TableCell({ borders, margins: cm, width: { size: w, type: WidthType.DXA }, shading: { fill: shade ? "FAF9F7" : "FFFFFF", type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: String(text), font: "Arial", size: 20 })] })] });

  const numberingConfig = [{ reference: "nums", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 440, hanging: 360 } } } }] }];
  let alphaCounter = 0;

  const qChildren = [];
  for (const req of requirements) {
    const qs = questions[req.id] || [];
    if (!qs.length) continue;
    qChildren.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: `${req.id}: ${req.text}`, font: "Arial" })] }));
    qs.forEach(q => {
      qChildren.push(new Paragraph({ numbering: { reference: "nums", level: 0 }, children: [new TextRun({ text: q.text, font: "Arial", size: 22 })] }));
      if (q.type === "multiple_choice" && q.options?.length) {
        const ref = `alpha-${alphaCounter++}`;
        numberingConfig.push({ reference: ref, levels: [{ level: 0, format: LevelFormat.LOWER_LETTER, text: "%1)", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] });
        q.options.forEach(opt => qChildren.push(new Paragraph({ numbering: { reference: ref, level: 0 }, children: [new TextRun({ text: opt, font: "Arial", size: 20, color: "5A5048" })] })));
      } else {
        qChildren.push(new Paragraph({ children: [new TextRun({ text: "[Open response]", font: "Arial", size: 20, italics: true, color: "9A8E82" })] }));
      }
      qChildren.push(new Paragraph({ children: [new TextRun("")] }));
    });
  }

  const tlRows = [new TableRow({ children: [hCell("Activity", 3400), hCell("Start", 1900), hCell("End", 1900), hCell("Duration (days)", 2160)] })];
  let rowIdx = 0;
  for (const g of GROUPS) {
    const gas = activities.filter(a => a.group === g);
    if (!gas.length) continue;
    tlRows.push(new TableRow({ children: [new TableCell({ borders, margins: cm, columnSpan: 4, width: { size: 9360, type: WidthType.DXA }, shading: { fill: "F0EDE8", type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: g, bold: true, font: "Arial", size: 20, color: "6B5F52" })] })] })] }));
    gas.forEach(a => {
      const shade = rowIdx++ % 2 === 1;
      const dur = a.startDate && a.endDate ? String(calDaysBetween(a.startDate, a.endDate)) : "—";
      tlRows.push(new TableRow({ children: [bCell((a.parentId ? "    ↳ " : "") + a.name, 3400, shade), bCell(fmtDate(a.startDate), 1900, shade), bCell(fmtDate(a.endDate), 1900, shade), bCell(dur, 2160, shade)] }));
    });
  }

  const doc = new Document({
    numbering: { config: numberingConfig },
    styles: {
      default: { document: { run: { font: "Arial", size: 24 } } },
      paragraphStyles: [
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 36, bold: true, font: "Arial", color: "1A1714" }, paragraph: { spacing: { before: 400, after: 160 }, outlineLevel: 0 } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 26, bold: true, font: "Arial", color: "3A3028" }, paragraph: { spacing: { before: 280, after: 100 }, outlineLevel: 1 } },
      ]
    },
    sections: [{
      properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
      children: [
        new Paragraph({ children: [new TextRun({ text: projectTitle || "Requirements Document", bold: true, size: 56, font: "Arial", color: "1A1714" })] }),
        new Paragraph({ children: [new TextRun({ text: `Session ID: ${sessionId}`, font: "Arial", size: 18, color: "9A8E82" })] }),
        new Paragraph({ children: [new TextRun({ text: `Generated: ${new Date().toLocaleDateString()}`, font: "Arial", size: 18, color: "9A8E82" })] }),
        new Paragraph({ children: [new TextRun("")] }),
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "1. Project Scope", font: "Arial" })] }),
        new Paragraph({ children: [new TextRun({ text: formalScope, font: "Arial", size: 24 })], spacing: { line: 360 } }),
        new Paragraph({ children: [new TextRun("")] }),
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "2. Functional Requirements", font: "Arial" })] }),
        new Table({
          width: { size: 9360, type: WidthType.DXA }, columnWidths: [1440, 7920],
          rows: [
            new TableRow({ children: [hCell("ID", 1440), hCell("Requirement", 7920)] }),
            ...requirements.map((r, i) => new TableRow({ children: [
              new TableCell({ borders, margins: cm, width: { size: 1440, type: WidthType.DXA }, shading: { fill: i % 2 ? "FAF9F7" : "FFFFFF", type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: r.id, font: "Arial Narrow", size: 20 })] })] }),
              bCell(r.text, 7920, i % 2)
            ]}))
          ]
        }),
        new Paragraph({ children: [new TextRun("")] }),
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "3. Questions", font: "Arial" })] }),
        ...qChildren,
        new Paragraph({ children: [new TextRun("")] }),
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "4. Procurement Timeline", font: "Arial" })] }),
        new Paragraph({ children: [new TextRun({ text: `Start: ${fmtDate(rfpStart)}   |   Go-Live: ${fmtDate(goLive)}${rfpStart && goLive ? `   |   ${calDaysBetween(rfpStart, goLive)} calendar days` : ""}`, font: "Arial", size: 20, color: "6A6058" })] }),
        new Paragraph({ children: [new TextRun("")] }),
        new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [3400, 1900, 1900, 2160], rows: tlRows }),
        new Paragraph({ children: [new TextRun("")] }),
        ...(vendors && vendors.length > 0 ? [
          new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "5. Vendor Shortlist", font: "Arial" })] }),
          new Table({
            width: { size: 9360, type: WidthType.DXA },
            columnWidths: [2200, 1600, 1200, 1200, 3160],
            rows: [
              new TableRow({ children: [hCell("Vendor", 2200), hCell("Category", 1600), hCell("G2 Rating", 1200), hCell("Req. Match", 1200), hCell("Description", 3160)] }),
              ...vendors
                .filter(v => !vendorStatus || vendorStatus[v.name] !== "eliminated")
                .map((v, i) => new TableRow({ children: [
                  bCell(v.name + (vendorStatus && vendorStatus[v.name] === "shortlisted" ? " ✓" : ""), 2200, i % 2),
                  bCell(v.category || "—", 1600, i % 2),
                  bCell(v.g2Rating || "N/A", 1200, i % 2),
                  bCell(`${v.requirementsMatch}/${v.requirementsTotal}`, 1200, i % 2),
                  bCell(v.description || "—", 3160, i % 2),
                ]}))
            ]
          })
        ] : []),
      ]
    }]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Requirements_${sessionId}.docx`);
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function RequirementsAgent() {
  const [sessionId] = useState(genId);
  const [step, setStep] = useState(0);
  const [projectTitle, setProjectTitle] = useState("");
  const [view, setView] = useState("sessions");
  const [sessionsList, setSessionsList] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [lastSaved, setLastSaved] = useState(null);
  const isDirty = useRef(false);

  // Scope
  const [answers, setAnswers] = useState({ who: "", what: "", where: "", when: "", why: "" });
  const [formalScope, setFormalScope] = useState("");
  const [scopeFlags, setScopeFlags] = useState([]);
  const [flagResponses, setFlagResponses] = useState({});
  const [scopeApproved, setScopeApproved] = useState(false);
  const [scopeBusy, setScopeBusy] = useState(false);
  const [scopeErr, setScopeErr] = useState("");
  const [editingScope, setEditingScope] = useState(false);

  // Requirements
  const [requirements, setRequirements] = useState([]);
  const [reqsBusy, setReqsBusy] = useState(false);
  const [reqsErr, setReqsErr] = useState("");
  const [newReq, setNewReq] = useState("");
  const [editId, setEditId] = useState(null);
  const [editText, setEditText] = useState("");

  // Questions
  const [questions, setQuestions] = useState({});
  const [qBusy, setQBusy] = useState(false);
  const [qErr, setQErr] = useState("");

  // Timeline
  const [rfpStart, setRfpStart] = useState(today);
  const [goLive, setGoLive] = useState(() => addCalDays(today(), 180));
  const [activities, setActivities] = useState(() => makeDefaultActivities(today()));
  const [collapsedGroups, setCollapsedGroups] = useState({ "Pre-RFP": false, "RFP": false, "Post-RFP": false });
  const [dragId, setDragId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [newActName, setNewActName] = useState("");
  const [newActGroup, setNewActGroup] = useState("Pre-RFP");

  // Export
  const [exportBusy, setExportBusy] = useState(false);
  const [exportErr, setExportErr] = useState("");

  // Market research
  const [marketView, setMarketView] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [vendorStatus, setVendorStatus] = useState({}); // { vendorName: 'shortlisted' | 'eliminated' }
  const [marketBusy, setMarketBusy] = useState(false);
  const [marketErr, setMarketErr] = useState("");

  const allAnswered = FIVE_WS.every(w => answers[w.key].trim().length > 0);
  const isSkipped = (val) => val.trim().toLowerCase() === "skip";
  const allFlagResponsesFilled = scopeFlags.every(f => (flagResponses[f.criterion] || "").trim().length > 0);

  useEffect(() => { isDirty.current = true; }, [projectTitle, answers, formalScope, requirements, questions, activities]);

  useEffect(() => {
    setSessionsLoading(true);
    loadSessions().then(rows => { setSessionsList(rows); setSessionsLoading(false); });
  }, []);

  useEffect(() => {
    const t = setInterval(() => { if (isDirty.current && formalScope) doSave("draft"); }, 30000);
    return () => clearInterval(t);
  });

  const getSessionData = () => ({ step, projectTitle, answers, formalScope, scopeApproved, requirements, questions, activities, rfpStart, goLive, vendors, vendorStatus });

  const doSave = async (status = "draft") => {
    setSaveStatus("saving");
    const ok = await saveSession({ id: sessionId, projectTitle: projectTitle || "Untitled", status, data: getSessionData() });
    if (ok) { setSaveStatus("saved"); setLastSaved(new Date()); isDirty.current = false; loadSessions().then(setSessionsList); setTimeout(() => setSaveStatus("idle"), 2500); }
    else { setSaveStatus("error"); setTimeout(() => setSaveStatus("idle"), 3000); }
  };

  const doLoadSession = async (id) => {
    const row = await loadSession(id);
    if (!row?.data) return;
    const d = row.data;
    if (d.step !== undefined) setStep(d.step);
    if (d.projectTitle) setProjectTitle(d.projectTitle);
    if (d.answers) setAnswers(d.answers);
    if (d.formalScope) setFormalScope(d.formalScope);
    if (d.scopeApproved) setScopeApproved(d.scopeApproved);
    if (d.requirements) setRequirements(d.requirements);
    if (d.questions) setQuestions(d.questions);
    if (d.rfpStart) setRfpStart(d.rfpStart);
    if (d.goLive) setGoLive(d.goLive);
    // Only restore activities if they have the new group structure
    if (d.activities && d.activities.length > 0 && d.activities[0].group) {
      setActivities(d.activities);
    } else {
      setActivities(makeDefaultActivities(d.rfpStart || today()));
    }
    if (d.vendors) setVendors(d.vendors);
    if (d.vendorStatus) setVendorStatus(d.vendorStatus);
    setView("agent");
    setLastSaved(new Date(row.updated_at));
  };

  const doDeleteSession = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this session?")) return;
    await deleteSession(id);
    setSessionsList(p => p.filter(s => s.id !== id));
  };

  const handleRfpStartChange = (newStart) => {
    setRfpStart(newStart);
    // Recompute all dates from stored offsets relative to new start
    setActivities(prev => prev.map(a => ({
      ...a,
      startDate: addCalDays(newStart, a.startOffsetDays ?? 0),
      endDate: addCalDays(newStart, (a.startOffsetDays ?? 0) + (a.offsetDays ?? 7)),
    })));
  };

  const handleGoLiveChange = (newEnd) => {
    setGoLive(newEnd);
  };
  const doGenerateScope = async () => {
    setScopeBusy(true); setScopeErr(""); setScopeFlags([]); setScopeApproved(false);
    try {
      const userMsg = FIVE_WS.map(w => `${w.label.toUpperCase()}: ${answers[w.key]}`).join("\n");
      const scope = await callClaude(P_SCOPE_GENERATE, userMsg);
      setFormalScope(scope.trim());
      await doEvaluateScope(scope.trim());
    } catch { setScopeErr("Could not generate scope. Please try again."); }
    finally { setScopeBusy(false); }
  };

  const doEvaluateScope = async (scopeText) => {
    try {
      const result = await callJSON(P_SCOPE_EVALUATE, `Scope to evaluate:\n\n${scopeText}`);
      if (result.passed && result.flags.length === 0) { setScopeFlags([]); setScopeApproved(true); }
      else { setScopeFlags(result.flags || []); setScopeApproved(false); }
    } catch { setScopeFlags([]); setScopeApproved(true); }
  };

  const doRefineScope = async () => {
    setScopeBusy(true); setScopeErr("");
    try {
      const activeFlags = scopeFlags.filter(f => !isSkipped(flagResponses[f.criterion] || ""));
      if (activeFlags.length === 0) { setScopeFlags([]); setScopeApproved(true); setScopeBusy(false); return; }
      const additions = activeFlags.map(f => `GAP: ${f.issue}\nUSER RESPONSE: ${flagResponses[f.criterion] || ""}`).join("\n\n");
      const refined = await callClaude(P_SCOPE_REFINE, `EXISTING SCOPE:\n${formalScope}\n\nADDITIONAL INFORMATION:\n${additions}`);
      setFormalScope(refined.trim()); setFlagResponses({});
      await doEvaluateScope(refined.trim());
    } catch { setScopeErr("Could not refine scope. Please try again."); }
    finally { setScopeBusy(false); }
  };

  // ── Requirements ──
  const doGenerateReqs = async () => {
    setReqsBusy(true); setReqsErr("");
    try { const arr = await callJSON(P_REQS, `Scope: ${formalScope}`); setRequirements(arr); }
    catch { setReqsErr("Could not generate requirements. Please try again."); }
    finally { setReqsBusy(false); }
  };

  const addReq = () => { if (!newReq.trim()) return; setRequirements(p => [...p, { id: `R-C${p.length + 1}`, text: newReq.trim() }]); setNewReq(""); };
  const deleteReq = (id) => setRequirements(p => p.filter(r => r.id !== id));
  const saveEdit = (id) => { setRequirements(p => p.map(r => r.id === id ? { ...r, text: editText } : r)); setEditId(null); };

  // ── Questions ──
  const doGenerateQuestions = async () => {
    setQBusy(true); setQErr("");
    try {
      const out = {};
      for (const req of requirements) out[req.id] = await callJSON(P_QS, `Requirement: ${req.text}`);
      setQuestions(out); setStep(3);
    } catch { setQErr("Could not generate questions. Please try again."); }
    finally { setQBusy(false); }
  };

  // ── Timeline ──
  const updateActivity = (id, field, val) => {
    setActivities(prev => prev.map(a => {
      if (a.id !== id) return a;
      const next = { ...a, [field]: val };

      if (field === "startDate") {
        // Preserve duration, shift end date, recalculate startOffsetDays
        const dur = a.startDate && a.endDate ? calDaysBetween(a.startDate, a.endDate) : (a.offsetDays ?? 7);
        next.endDate = addCalDays(val, dur);
        next.startOffsetDays = rfpStart ? calDaysBetween(rfpStart, val) : 0;
        next.offsetDays = dur;
      }

      if (field === "endDate") {
        // Recalculate offsetDays from start to new end
        if (a.startDate) {
          next.offsetDays = calDaysBetween(a.startDate, val);
        }
      }

      if (field === "offsetDays") {
        // Recompute end date from start + new offset
        if (a.startDate) {
          next.endDate = addCalDays(a.startDate, parseInt(val) || 0);
        }
      }

      return next;
    }));
  };

  const deleteActivity = (id) => setActivities(p => p.filter(a => a.id !== id && a.parentId !== id));

  const addActivity = () => {
    if (!newActName.trim()) return;
    setActivities(p => [...p, { id: uid(), group: newActGroup, parentId: null, name: newActName.trim(), startDate: today(), endDate: addCalDays(today(), 7), offsetDays: 7 }]);
    setNewActName("");
  };

  const toggleGroup = (g) => setCollapsedGroups(p => ({ ...p, [g]: !p[g] }));

  // Drag handlers
  const onDragStart = (id) => setDragId(id);
  const onDragOver = (e, id) => { e.preventDefault(); setDragOverId(id); };
  const onDrop = (e, targetId) => {
    e.preventDefault();
    if (!dragId || dragId === targetId) { setDragId(null); setDragOverId(null); return; }
    setActivities(prev => {
      const arr = [...prev];
      const fromIdx = arr.findIndex(a => a.id === dragId);
      const toIdx = arr.findIndex(a => a.id === targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      // Move group to match target
      const targetGroup = arr[toIdx].group;
      const [moved] = arr.splice(fromIdx, 1);
      moved.group = targetGroup;
      if (moved.parentId) moved.parentId = null; // reset parent on drag
      arr.splice(toIdx, 0, moved);
      return arr;
    });
    setDragId(null); setDragOverId(null);
  };

  // ── Market research ──
  const doMarketResearch = async () => {
    setMarketBusy(true); setMarketErr("");
    try {
      const reqList = requirements.map(r => r.text).join("\n");
      const userMsg = `Project scope:\n${formalScope}\n\nFunctional requirements (${requirements.length} total):\n${reqList}`;
      const result = await callJSON(P_MARKET, userMsg, true);
      setVendors(result);
      setVendorStatus({});
    } catch (e) {
      setMarketErr("Market research failed. Please try again.");
    } finally {
      setMarketBusy(false);
    }
  };

  const toggleVendorStatus = (name, status) => {
    setVendorStatus(p => ({ ...p, [name]: p[name] === status ? null : status }));
  };

  // ── Export ──
  const doExport = async () => {
    setExportBusy(true); setExportErr("");
    try {
      await buildDocx({ sessionId, projectTitle, formalScope, requirements, questions, activities, rfpStart, goLive, vendors, vendorStatus });
      await doSave("complete");
    } catch { setExportErr("Export failed. Please try again."); }
    finally { setExportBusy(false); }
  };

  const pct = (step / 3) * 100;

  // ── Sessions view ──
  if (view === "sessions") {
    return (
      <div className="rq-root">
        <div className="rq-shell">
          <div className="rq-sidebar">
            <div className="rq-sidebar-logo">
              <div className="rq-sidebar-brand">Procurement</div>
              <div className="rq-sidebar-title">Agent</div>
            </div>
            <div style={{ flex: 1 }} />
            <div className="rq-sidebar-footer">
              <button className="rq-btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={() => setView("agent")}>
                <Plus size={13} /> New Session
              </button>
            </div>
          </div>
          <div className="rq-main">
            <div className="rq-topbar">
              <div className="rq-topbar-left">
                <div className="rq-topbar-title">Sessions</div>
                <div className="rq-topbar-sub">Select a session to resume or start a new one</div>
              </div>
            </div>
            <div className="rq-content">
              {sessionsLoading && <div className="rq-loading-center"><Loader size={18} className="spin" /></div>}
              {!sessionsLoading && sessionsList.length === 0 && (
                <div style={{ textAlign: "center", padding: "64px 0", color: "#3a5060", fontSize: 14, fontStyle: "italic" }}>No sessions yet. Start a new one.</div>
              )}
              {!sessionsLoading && sessionsList.length > 0 && (
                <div className="sessions-panel">
                  <div className="sessions-header"><div className="sessions-title">{sessionsList.length} session{sessionsList.length !== 1 ? "s" : ""}</div></div>
                  {sessionsList.map(s => (
                    <div className="session-row" key={s.id} onClick={() => doLoadSession(s.id)}>
                      <div style={{ minWidth: 0 }}>
                        <div className="session-name">{s.project_title || "Untitled"}</div>
                        <div className="session-meta">{s.id} · {new Date(s.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                        <span className={`session-status ${s.status}`}>{s.status}</span>
                        <button className="rq-btn-icon rq-btn-del" onClick={(e) => doDeleteSession(s.id, e)} style={{ padding: "5px 7px" }}><Trash2 size={12} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Agent view ──
  const stepLabels = ["Scope", "Requirements", "Questions", "Review"];
  const answeredReqs = Object.keys(questions).length;
  const openQ = Object.values(questions).flat().filter(q => q.type === "open_ended").length;
  const mcQ = Object.values(questions).flat().filter(q => q.type === "multiple_choice").length;

  return (
    <div className="rq-root">
      <div className="rq-shell">
        {/* ── Sidebar ── */}
        <div className="rq-sidebar">
          <div className="rq-sidebar-logo">
            <div className="rq-sidebar-brand">Procurement</div>
            <div className="rq-sidebar-title">Agent</div>
            <div className="rq-sidebar-session">{sessionId}</div>
          </div>
          <div className="rq-nav">
            {stepLabels.map((label, i) => (
              <div key={label} className={`rq-nav-item ${!marketView && i === step ? "active" : !marketView && i < step ? "done" : ""}`} onClick={() => { setMarketView(false); i <= step && setStep(i); }}>
                <div className="rq-nav-num">{i < step ? <CheckCircle size={11} /> : i + 1}</div>
                {label}
              </div>
            ))}
            <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "10px 0" }} />
            <div className={`rq-nav-item ${marketView ? "active" : ""}`} onClick={() => setMarketView(true)}>
              <div className="rq-nav-num" style={{ fontSize: 8 }}>M</div>
              Market
            </div>
          </div>
          <div className="rq-sidebar-footer">
            <button className="rq-btn-ghost" style={{ width: "100%", justifyContent: "center", marginBottom: 8 }} onClick={() => setView("sessions")}>
              <ArrowLeft size={12} /> Sessions
            </button>
          </div>
        </div>

        {/* ── Main ── */}
        <div className="rq-main">
          <div className="rq-topbar">
            <div className="rq-topbar-left">
              <div className="rq-topbar-title">{marketView ? "Market Research" : stepLabels[step]}</div>
              <div className="rq-topbar-sub">{projectTitle || "Untitled project"}{marketView ? " · Vendor identification" : ` · Step ${step + 1} of 4`}</div>
            </div>
            <div className="rq-topbar-right">
              <div className={`sv-status ${saveStatus === "idle" ? "" : saveStatus}`} style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, display: "flex", alignItems: "center", gap: 6 }}>
                {saveStatus === "saving" && <><Loader size={11} className="spin" /> Saving…</>}
                {saveStatus === "saved" && <span className="rq-save-chip"><CheckCircle size={11} /> Saved</span>}
                {saveStatus === "error" && <span style={{ color: "#e07070" }}>Save failed</span>}
                {saveStatus === "idle" && lastSaved && <span style={{ color: "#3a5060" }}><Clock size={11} style={{ display: "inline", marginRight: 4 }} />{lastSaved.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>}
              </div>
              <button className="rq-btn-ghost" onClick={() => doSave("draft")} disabled={saveStatus === "saving"}><Save size={11} /> Save</button>
              <button className="rq-export-btn" onClick={doExport} disabled={step < 3 || exportBusy}>
                {exportBusy ? <Loader size={14} className="spin" /> : <FileText size={14} />} Export .docx
              </button>
            </div>
          </div>

          <div className="rq-content">
            {/* Metric cards — shown from step 1 onwards */}
            {!marketView && step >= 1 && (
              <div className="rq-metrics">
                <div className="rq-metric">
                  <div className="rq-metric-label">Requirements</div>
                  <div className="rq-metric-val">{requirements.length}</div>
                  <div className="rq-metric-sub">binary</div>
                </div>
                <div className="rq-metric">
                  <div className="rq-metric-label">Questions</div>
                  <div className="rq-metric-val">{openQ + mcQ}</div>
                  <div className="rq-metric-sub">{answeredReqs > 0 ? `${answeredReqs} reqs covered` : "not yet generated"}</div>
                </div>
                <div className="rq-metric">
                  <div className="rq-metric-label">Open ended</div>
                  <div className="rq-metric-val">{openQ}</div>
                  <div className="rq-metric-sub amber">of {openQ + mcQ || "—"}</div>
                </div>
                <div className="rq-metric">
                  <div className="rq-metric-label">Multiple choice</div>
                  <div className="rq-metric-val">{mcQ}</div>
                  <div className="rq-metric-sub amber">of {openQ + mcQ || "—"}</div>
                </div>
              </div>
            )}

            {/* ── Market Research ── */}
            {marketView && (
              <div className="rq-fade">
                {!formalScope || !scopeApproved ? (
                  <div style={{ textAlign: "center", padding: "48px 0" }}>
                    <div style={{ color: "#607a8a", fontSize: 14, fontStyle: "italic", marginBottom: 16 }}>Complete and approve the project scope first.</div>
                    <button className="rq-btn-primary" onClick={() => { setMarketView(false); setStep(0); }}>Go to Scope <ChevronRight size={13} /></button>
                  </div>
                ) : (
                  <>
                    <p className="rq-hint">AI will search G2, Gartner, and vendor websites to identify 5–8 relevant vendors and score them against your requirements.</p>

                    {/* Shortlist summary */}
                    {vendors.length > 0 && (
                      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
                        <div className="rq-metric" style={{ minWidth: 100 }}>
                          <div className="rq-metric-label">Vendors found</div>
                          <div className="rq-metric-val">{vendors.length}</div>
                        </div>
                        <div className="rq-metric" style={{ minWidth: 100 }}>
                          <div className="rq-metric-label">Shortlisted</div>
                          <div className="rq-metric-val">{Object.values(vendorStatus).filter(s => s === "shortlisted").length}</div>
                          <div className="rq-metric-sub">for RFP</div>
                        </div>
                        <div className="rq-metric" style={{ minWidth: 100 }}>
                          <div className="rq-metric-label">Eliminated</div>
                          <div className="rq-metric-val">{Object.values(vendorStatus).filter(s => s === "eliminated").length}</div>
                          <div className="rq-metric-sub amber">ruled out</div>
                        </div>
                      </div>
                    )}

                    <div className="rq-actions" style={{ marginBottom: 20, marginTop: 0 }}>
                      <button className="rq-btn-primary" onClick={doMarketResearch} disabled={marketBusy}>
                        {marketBusy ? <><Loader size={13} className="spin" /> Researching vendors…</> : vendors.length > 0 ? <><RefreshCw size={13} /> Re-run research</> : <>Search vendors</>}
                      </button>
                    </div>

                    {marketErr && <div className="rq-error">{marketErr}</div>}

                    {marketBusy && (
                      <div className="rq-loading-center">
                        <Loader size={20} className="spin" style={{ marginBottom: 10 }} /><br />
                        Searching G2, Gartner, and vendor sites…
                      </div>
                    )}

                    {!marketBusy && vendors.map(v => {
                      const status = vendorStatus[v.name];
                      const matchPct = v.requirementsTotal > 0 ? v.requirementsMatch / v.requirementsTotal : 0;
                      return (
                        <div key={v.name} className={`vendor-card rq-fade${status === "shortlisted" ? " shortlisted" : status === "eliminated" ? " eliminated" : ""}`}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                            <div style={{ minWidth: 0 }}>
                              <div className="vendor-name">{v.name}</div>
                              <div className="vendor-category">{v.category}</div>
                            </div>
                            {status === "shortlisted" && <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#5DCAA5", background: "rgba(93,202,165,0.12)", padding: "3px 8px", borderRadius: 3, flexShrink: 0 }}>Shortlisted</span>}
                            {status === "eliminated" && <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#e07070", background: "rgba(184,80,80,0.1)", padding: "3px 8px", borderRadius: 3, flexShrink: 0 }}>Eliminated</span>}
                          </div>

                          <div className="vendor-meta">
                            {v.g2Rating && v.g2Rating !== "N/A" && (
                              <div className="vendor-rating">
                                <span style={{ color: "#EF9F27" }}>★</span> {v.g2Rating}
                              </div>
                            )}
                            {v.g2ReviewCount && v.g2ReviewCount !== "N/A" && (
                              <div className="vendor-reviews">{v.g2ReviewCount}</div>
                            )}
                          </div>

                          <div className="vendor-desc">{v.description}</div>

                          <div className="vendor-match">
                            <div className={`confidence-dot confidence-${v.matchConfidence || "low"}`} />
                            <div className="vendor-match-bar">
                              <div className={`vendor-match-fill ${v.matchConfidence === "medium" ? "medium" : v.matchConfidence === "low" ? "low" : ""}`} style={{ width: `${matchPct * 100}%` }} />
                            </div>
                            <div className="vendor-match-text">{v.requirementsMatch} of {v.requirementsTotal} requirements likely met</div>
                          </div>

                          <div className="vendor-actions">
                            <button className={`vendor-btn vendor-btn-shortlist${status === "shortlisted" ? " active" : ""}`} onClick={() => toggleVendorStatus(v.name, "shortlisted")}>
                              {status === "shortlisted" ? "✓ Shortlisted" : "Shortlist"}
                            </button>
                            <button className={`vendor-btn vendor-btn-eliminate${status === "eliminated" ? " active" : ""}`} onClick={() => toggleVendorStatus(v.name, "eliminated")}>
                              {status === "eliminated" ? "✗ Eliminated" : "Eliminate"}
                            </button>
                            {v.g2Url && (
                              <a href={v.g2Url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                                <button className="vendor-btn vendor-btn-g2">G2 ↗</button>
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            )}

            {/* ── Step 0: Scope ── */}
            {!marketView && step === 0 && (
              <div className="rq-fade">
                <div className="rq-section-label" style={{ marginBottom: 6 }}>Project title</div>
                <input className="rq-input" style={{ marginBottom: 22 }} placeholder="e.g. Enterprise Tool Tracking System" value={projectTitle} onChange={e => setProjectTitle(e.target.value)} />
                <div className="rq-section-label" style={{ marginBottom: 14 }}>Project intake</div>
                {FIVE_WS.map(w => (
                  <div className="rq-5w-card" key={w.key}>
                    <div className="rq-5w-label">{w.label}</div>
                    <div className="rq-5w-question">{w.question}</div>
                    <textarea key={`ta-${w.key}`} name={w.key} className="rq-textarea" placeholder={w.placeholder} value={answers[w.key]} onChange={e => { const k = w.key, v = e.target.value; setAnswers(p => ({ ...p, [k]: v })); }} rows={2} />
                  </div>
                ))}
                {scopeErr && <div className="rq-error">{scopeErr}</div>}
                {formalScope && (
                  <div style={{ marginTop: 20 }} className="rq-fade">
                    <div className="rq-section-label">Generated scope</div>
                    {editingScope ? (
                      <>
                        <textarea className="rq-textarea" value={formalScope} onChange={e => setFormalScope(e.target.value)} rows={5} style={{ marginBottom: 10 }} />
                        <div className="rq-actions"><button className="rq-btn-ghost" onClick={async () => { setEditingScope(false); await doEvaluateScope(formalScope); }}><Check size={12} /> Done editing</button></div>
                      </>
                    ) : (
                      <>
                        <div className="rq-scope-box">{formalScope}</div>
                        <div className="rq-actions">
                          <button className="rq-btn-ghost" onClick={() => setEditingScope(true)}><Pencil size={12} /> Edit</button>
                          <button className="rq-btn-ghost" onClick={doGenerateScope} disabled={scopeBusy}><RefreshCw size={12} /> Regenerate</button>
                        </div>
                      </>
                    )}
                    {scopeFlags.length > 0 && !editingScope && (
                      <div style={{ marginTop: 18 }} className="rq-fade">
                        <div className="rq-section-label" style={{ marginBottom: 10 }}>Scope review — action required</div>
                        {scopeFlags.map(flag => {
                          const val = flagResponses[flag.criterion] || "";
                          const skipped = isSkipped(val);
                          return (
                            <div className="rq-flag-card" key={flag.criterion} style={{ opacity: skipped ? 0.5 : 1 }}>
                              <div className="rq-flag-title"><AlertTriangle size={13} /> {flag.criterion}{skipped && <span style={{ marginLeft: 8, fontFamily: "'Syne',sans-serif", fontSize: 9, color: "#EF9F27", background: "rgba(239,159,39,0.15)", padding: "2px 7px", borderRadius: 3 }}>SKIPPED</span>}</div>
                              {!skipped && <div className="rq-flag-text">{flag.prompt}</div>}
                              <textarea className="rq-textarea" placeholder={`Your response… (type "skip" to dismiss)`} value={val} onChange={e => setFlagResponses(p => ({ ...p, [flag.criterion]: e.target.value }))} rows={skipped ? 1 : 2} style={{ opacity: skipped ? 0.6 : 1 }} />
                            </div>
                          );
                        })}
                        <div className="rq-actions">
                          <button className="rq-btn-primary" onClick={doRefineScope} disabled={scopeBusy || !allFlagResponsesFilled}>
                            {scopeBusy ? <><Loader size={13} className="spin" /> Refining…</> : <>Refine scope <ChevronRight size={13} /></>}
                          </button>
                        </div>
                      </div>
                    )}
                    {scopeApproved && !editingScope && (
                      <div style={{ marginTop: 14 }} className="rq-fade">
                        <div className="rq-scope-approved"><CheckCircle size={15} /> Scope approved — all criteria met</div>
                        <div className="rq-actions"><button className="rq-btn-primary" onClick={() => { setStep(1); doGenerateReqs(); }}>Generate requirements <ChevronRight size={13} /></button></div>
                      </div>
                    )}
                  </div>
                )}
                {!formalScope && (
                  <div className="rq-actions" style={{ marginTop: 8 }}>
                    <button className="rq-btn-primary" onClick={doGenerateScope} disabled={!allAnswered || scopeBusy}>
                      {scopeBusy ? <><Loader size={13} className="spin" /> Generating scope…</> : <>Generate scope <ChevronRight size={13} /></>}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Step 1: Requirements ── */}
            {!marketView && step === 1 && (
              <div className="rq-fade">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
                  <p className="rq-hint" style={{ marginBottom: 0 }}>Edit, delete, or add your own below.</p>
                  <button className="rq-btn-ghost" onClick={doGenerateReqs} disabled={reqsBusy}>{reqsBusy ? <Loader size={11} className="spin" /> : <RefreshCw size={11} />} Regenerate</button>
                </div>
                {reqsBusy && <div className="rq-loading-center"><Loader size={20} className="spin" style={{ marginBottom: 8 }} /><br />Generating requirements…</div>}
                {reqsErr && <div className="rq-error">{reqsErr}</div>}
                {!reqsBusy && requirements.map(req => (
                  <div className="rq-card rq-fade" key={req.id}>
                    <div className="rq-req-id">{req.id}</div>
                    {editId === req.id ? (
                      <>
                        <input className="rq-input" value={editText} onChange={e => setEditText(e.target.value)} style={{ marginTop: 8, marginBottom: 10 }} />
                        <div className="rq-row"><button className="rq-btn-ghost" onClick={() => saveEdit(req.id)}><Check size={11} /> Save</button><button className="rq-btn-ghost" onClick={() => setEditId(null)}><X size={11} /> Cancel</button></div>
                      </>
                    ) : (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                        <div className="rq-req-text">{req.text}</div>
                        <div className="rq-row" style={{ flexShrink: 0 }}>
                          <button className="rq-btn-icon" onClick={() => { setEditId(req.id); setEditText(req.text); }}><Pencil size={12} /></button>
                          <button className="rq-btn-icon rq-btn-del" onClick={() => deleteReq(req.id)}><Trash2 size={12} /></button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {!reqsBusy && (
                  <div className="rq-row" style={{ marginTop: 8 }}>
                    <input className="rq-input" placeholder="Add your own requirement…" value={newReq} onChange={e => setNewReq(e.target.value)} onKeyDown={e => e.key === "Enter" && addReq()} />
                    <button className="rq-btn-ghost" onClick={addReq} disabled={!newReq.trim()} style={{ whiteSpace: "nowrap" }}><Plus size={12} /> Add</button>
                  </div>
                )}
                {!reqsBusy && requirements.length > 0 && (
                  <div className="rq-actions" style={{ marginTop: 22 }}>
                    <button className="rq-btn-ghost" onClick={() => setStep(0)}>← Back</button>
                    <button className="rq-btn-primary" onClick={() => setStep(2)}>Continue to questions <ChevronRight size={13} /></button>
                  </div>
                )}
              </div>
            )}

            {/* ── Step 2: Questions ── */}
            {!marketView && step === 2 && (
              <div className="rq-fade">
                <p className="rq-hint">The agent will generate 2–3 follow-up questions per requirement — a mix of open-ended and multiple choice.</p>
                {qErr && <div className="rq-error">{qErr}</div>}
                {qBusy && <div className="rq-loading-center"><Loader size={20} className="spin" style={{ marginBottom: 8 }} /><br />Generating questions for {requirements.length} requirement{requirements.length !== 1 ? "s" : ""}…</div>}
                {!qBusy && Object.keys(questions).length === 0 && (
                  <div className="rq-actions">
                    <button className="rq-btn-ghost" onClick={() => setStep(1)}>← Back</button>
                    <button className="rq-btn-primary" onClick={doGenerateQuestions}>Generate questions <ChevronRight size={13} /></button>
                  </div>
                )}
                {!qBusy && Object.keys(questions).length > 0 && (
                  <>
                    {requirements.map(req => {
                      const qs = questions[req.id] || [];
                      return (
                        <div key={req.id} style={{ marginBottom: 22 }}>
                          <div className="rq-req-group-label">{req.id} — {req.text}</div>
                          {qs.map((q, i) => (
                            <div className="rq-q-card" key={i}>
                              <div className={`rq-badge ${q.type === "open_ended" ? "rq-badge-open" : "rq-badge-mc"}`}>{q.type === "open_ended" ? "Open ended" : "Multiple choice"}</div>
                              <div className="rq-q-text">{q.text}</div>
                              {q.type === "multiple_choice" && q.options?.length && (
                                <div className="rq-mc-opts">{q.options.map((o, j) => <span key={j} className="rq-mc-opt">{String.fromCharCode(65 + j)}. {o}</span>)}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                    <div className="rq-actions">
                      <button className="rq-btn-ghost" onClick={doGenerateQuestions} disabled={qBusy}><RefreshCw size={11} /> Regenerate</button>
                      <button className="rq-btn-primary" onClick={() => setStep(3)}>Continue to review <ChevronRight size={13} /></button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── Step 3: Review ── */}
            {!marketView && step === 3 && (
              <div className="rq-fade">
                <div className="rq-section-label">1. Scope</div>
                <div className="rq-scope-box" style={{ marginBottom: 24 }}>{formalScope}</div>
                <hr className="rq-divider" />

                <div className="rq-section-label">2. Functional requirements ({requirements.length})</div>
                <div style={{ marginBottom: 24 }}>
                  {requirements.map(req => (
                    <div className="rq-card" key={req.id} style={{ cursor: "default" }}>
                      <div className="rq-req-id">{req.id}</div>
                      <div className="rq-req-text">{req.text}</div>
                    </div>
                  ))}
                </div>
                <hr className="rq-divider" />

                <div className="rq-section-label">3. Questions</div>
                <div style={{ marginBottom: 24 }}>
                  {requirements.map(req => {
                    const qs = questions[req.id] || [];
                    return (
                      <div key={req.id} style={{ marginBottom: 22 }}>
                        <div className="rq-req-group-label">{req.id} — {req.text}</div>
                        {qs.map((q, i) => (
                          <div className="rq-q-card" key={i}>
                            <div className={`rq-badge ${q.type === "open_ended" ? "rq-badge-open" : "rq-badge-mc"}`}>{q.type === "open_ended" ? "Open ended" : "Multiple choice"}</div>
                            <div className="rq-q-text">{q.text}</div>
                            {q.type === "multiple_choice" && q.options?.length && (
                              <div className="rq-mc-opts">{q.options.map((o, j) => <span key={j} className="rq-mc-opt">{String.fromCharCode(65 + j)}. {o}</span>)}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
                <hr className="rq-divider" />

                {/* 4. Timeline */}
                <div className="rq-section-label">4. Procurement timeline</div>
                <p className="rq-hint">Set your start and go-live dates — all activity dates cascade automatically. Adjust individual dates or offsets as needed.</p>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 22 }}>
                  <div style={{ background: "#1b2530", border: "1px solid rgba(93,202,165,0.2)", borderRadius: 8, padding: "14px 16px" }}>
                    <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: ".18em", textTransform: "uppercase", color: "#5DCAA5", marginBottom: 6 }}>RFP Start Date</div>
                    <input type="date" className="rq-input" value={rfpStart} onChange={e => handleRfpStartChange(e.target.value)} />
                    <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 10, color: "#3a5060", marginTop: 5 }}>Drives all activity dates</div>
                  </div>
                  <div style={{ background: "#1b2530", border: "1px solid rgba(239,159,39,0.2)", borderRadius: 8, padding: "14px 16px" }}>
                    <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: ".18em", textTransform: "uppercase", color: "#EF9F27", marginBottom: 6 }}>Go-Live Date</div>
                    <input type="date" className="rq-input" value={goLive} onChange={e => handleGoLiveChange(e.target.value)} />
                    {rfpStart && goLive && (
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#607a8a", marginTop: 5 }}>{calDaysBetween(rfpStart, goLive)} calendar days total</div>
                    )}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "20px 1fr 110px 110px 70px 60px 32px", gap: 6, marginBottom: 6, paddingLeft: 10, paddingRight: 4 }}>
                  <div /><div className="tl-col-hdr">Activity</div><div className="tl-col-hdr">Start</div><div className="tl-col-hdr">End</div><div className="tl-col-hdr">Offset (days)</div><div className="tl-col-hdr">Duration</div><div />
                </div>

                {GROUPS.map(g => {
                  const gas = activities.filter(a => a.group === g);
                  const collapsed = collapsedGroups[g];
                  const colorClass = g === "Pre-RFP" ? "tl-group-pre" : g === "RFP" ? "tl-group-rfp" : "tl-group-post";
                  return (
                    <div key={g} style={{ marginBottom: 14 }}>
                      <div className="tl-group-header" onClick={() => toggleGroup(g)}>
                        <div className={`tl-group-label ${colorClass}`}>
                          <div style={{ width: 7, height: 7, borderRadius: "50%", background: GROUP_COLORS[g] }} />
                          {g} <span style={{ fontWeight: 400, color: "#3a5060", marginLeft: 4 }}>({gas.length})</span>
                        </div>
                        {collapsed ? <ChevronDown size={13} style={{ color: "#3a5060" }} /> : <ChevronUp size={13} style={{ color: "#3a5060" }} />}
                      </div>
                      {!collapsed && gas.map(a => {
                        const dur = a.startDate && a.endDate ? calDaysBetween(a.startDate, a.endDate) : "—";
                        return (
                          <div key={a.id}
                            className={`tl-act-row${a.parentId ? " is-child" : " is-parent"}${dragId === a.id ? " dragging" : ""}${dragOverId === a.id ? " drag-over" : ""}`}
                            style={{ gridTemplateColumns: "20px 1fr 110px 110px 70px 60px 32px", display: "grid", gap: 6 }}
                            draggable onDragStart={() => onDragStart(a.id)} onDragOver={(e) => onDragOver(e, a.id)} onDrop={(e) => onDrop(e, a.id)}
                          >
                            <div style={{ display: "flex", alignItems: "center", cursor: "grab", color: "#3a5060" }}><GripVertical size={13} /></div>
                            <input className="tl-cell-input" value={a.name} onChange={e => updateActivity(a.id, "name", e.target.value)} style={{ fontStyle: a.parentId ? "italic" : "normal" }} />
                            <input type="date" className="tl-cell-input" value={a.startDate || ""} onChange={e => updateActivity(a.id, "startDate", e.target.value)} />
                            <input type="date" className="tl-cell-input" value={a.endDate || ""} onChange={e => updateActivity(a.id, "endDate", e.target.value)} />
                            <input type="number" min="0" className="tl-cell-input" style={{ textAlign: "center" }} value={a.offsetDays ?? ""} onChange={e => updateActivity(a.id, "offsetDays", e.target.value)} />
                            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#3a5060", display: "flex", alignItems: "center", justifyContent: "center" }}>{dur}d</div>
                            <button className="rq-btn-icon rq-btn-del" onClick={() => deleteActivity(a.id)} style={{ padding: "4px 6px" }}><Trash2 size={11} /></button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}

                <div className="rq-row" style={{ marginTop: 8, marginBottom: 22 }}>
                  <input className="rq-input" placeholder="New activity name…" value={newActName} onChange={e => setNewActName(e.target.value)} onKeyDown={e => e.key === "Enter" && addActivity()} style={{ flex: 1 }} />
                  <select style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "9px 10px", fontFamily: "'Syne',sans-serif", fontSize: 11, color: "#d8eaf2", background: "#141d26", outline: "none" }} value={newActGroup} onChange={e => setNewActGroup(e.target.value)}>
                    {GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                  <button className="rq-btn-ghost" onClick={addActivity} disabled={!newActName.trim()} style={{ whiteSpace: "nowrap" }}><Plus size={12} /> Add</button>
                </div>

                <GanttChart activities={activities} />

                <hr className="rq-divider" />
                {exportErr && <div className="rq-error">{exportErr}</div>}
                <button className="rq-btn-primary" onClick={doExport} disabled={exportBusy} style={{ padding: "12px 28px" }}>
                  {exportBusy ? <><Loader size={14} className="spin" /> Exporting…</> : <><FileText size={14} /> Export to .docx</>}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
