import { useState, useRef, useEffect } from "react";
import { FileText, Plus, Trash2, Loader, ChevronRight, CheckCircle, Pencil, X, Check, RefreshCw, AlertTriangle, Calendar, Save, Clock, ArrowLeft, ChevronDown, ChevronUp, GripVertical, ThumbsUp, ThumbsDown } from "lucide-react";
import { saveAs } from "file-saver";
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType, AlignmentType, HeadingLevel, LevelFormat } from "docx";
import { saveSession, loadSessions, loadSession, deleteSession, signIn, signUp, signOut, getSession, onAuthStateChange, loadUserProfile, saveUserProfile, logEvent } from "./supabase";
import { P_SCOPE_CHAT, P_SCOPE_GENERATE, P_SCOPE_EVALUATE, P_SCOPE_REFINE, P_SCOPE_EXPERT, P_REQS, P_QS, P_MARKET, P_NARRATIVE, P_TIMELINE_DATE, FIVE_WS } from "./prompts";

// ─── Fonts ────────────────────────────────────────────────────────────────────
const _link = document.createElement("link");
_link.rel = "stylesheet";
_link.href = "https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Lora:ital,wght@0,400;0,500;1,400&family=JetBrains+Mono:wght@400;500&display=swap";
_link.media = "print";
_link.onload = function(){ this.media = "all"; };
const _preconn = document.createElement("link");
_preconn.rel = "preconnect";
_preconn.href = "https://fonts.googleapis.com";
document.head.insertBefore(_preconn, document.head.firstChild);
document.head.appendChild(_link);

// ─── Palette tokens ───────────────────────────────────────────────────────────
// A3 Light Professional theme
// Background:  #F9F8F8   Sidebar/card: #FFFFFF
// Accent:      #C2410C   Amber:        #D97706
// Body text:   #111827   Muted:        #6B7280
// Border:      rgba(0,0,0,0.07)

const _style = document.createElement("style");
_style.textContent = `
  *{box-sizing:border-box}
  .rq-root{font-family:'Lora',Georgia,serif;background:#F9F8F8;min-height:100vh;color:#111827;display:flex;flex-direction:column}

  /* Two-panel consumer shell */
  .rq-shell{display:flex;flex:1;min-height:100vh}
  .rq-chat-panel{display:flex;flex-direction:column;background:#FFFFFF;border-right:1px solid rgba(0,0,0,0.07);min-height:0;overflow:hidden}
  .rq-chat-header{padding:14px 18px;border-bottom:1px solid rgba(0,0,0,0.07);display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
  .rq-chat-logo{font-family:'Syne',sans-serif;font-size:16px;font-weight:800;color:#1E293B;letter-spacing:-0.02em}
  .rq-chat-logo-dot{color:#C2410C}
  .rq-chat-actions{display:flex;align-items:center;gap:8px}
  .rq-messages{flex:1;overflow-y:auto;padding:16px 18px;display:flex;flex-direction:column;gap:10px}
  .rq-msg{display:flex;flex-direction:column;gap:3px}
  .rq-msg-bot .rq-bubble{background:#F9F8F8;color:#111827;border-radius:0 10px 10px 10px;padding:11px 14px;font-size:13px;line-height:1.65;max-width:88%;font-family:'Lora',serif;border:1px solid rgba(0,0,0,0.06)}
  .rq-msg-user{align-items:flex-end}
  .rq-msg-user .rq-bubble{background:#1E293B;color:#F8FAFC;border-radius:10px 10px 0 10px;padding:11px 14px;font-size:13px;line-height:1.65;max-width:85%;font-family:'Lora',serif}
  .rq-msg-label{font-family:'Syne',sans-serif;font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#9CA3AF;padding:0 4px}
  .rq-chat-input-wrap{padding:12px 18px;border-top:1px solid rgba(0,0,0,0.07);flex-shrink:0}
  .rq-chat-input-row{display:flex;gap:8px;align-items:flex-end}
  .rq-chat-textarea{flex:1;border:1px solid rgba(0,0,0,0.12);border-radius:8px;padding:10px 13px;font-size:13px;resize:none;min-height:42px;max-height:120px;background:#F9F8F8;color:#111827;font-family:'Lora',serif;outline:none;transition:border-color .15s;line-height:1.5}
  .rq-chat-textarea:focus{border-color:#C2410C;background:#FFFFFF}
  .rq-chat-send{width:38px;height:38px;background:#1E293B;border:none;border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:background .15s}
  .rq-chat-send:hover{background:#C2410C}
  .rq-chat-send:disabled{opacity:.35;cursor:not-allowed}
  .rq-output-panel{display:flex;flex-direction:column;background:#F9F8F8;min-height:0;overflow:hidden}
  .rq-output-header{padding:14px 20px;border-bottom:1px solid rgba(0,0,0,0.07);background:#FFFFFF;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
  .rq-output-title{font-family:'Syne',sans-serif;font-size:13px;font-weight:700;color:#111827}
  .rq-output-sub{font-family:'Syne',sans-serif;font-size:10px;color:#9CA3AF;margin-top:2px}
  .rq-output-steps{display:flex;gap:5px;align-items:center}
  .rq-output-step{font-family:'Syne',sans-serif;font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:3px 10px;border-radius:20px;border:1px solid rgba(0,0,0,0.1);color:#9CA3AF;background:#FFFFFF;transition:all .3s}
  .rq-output-step.done{background:#F0FDF4;color:#15803D;border-color:#BBF7D0}
  .rq-output-step.active{background:#FFF7ED;color:#C2410C;border-color:#FDBA74}
  .rq-output-body{flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:14px}
  .rq-output-card{background:#FFFFFF;border:1px solid rgba(0,0,0,0.07);border-radius:10px;padding:18px 20px;animation:fadeUp .4s ease both}
  .rq-output-card-label{font-family:'Syne',sans-serif;font-size:9px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:#C2410C;margin-bottom:8px}
  .rq-output-card-title{font-family:'Syne',sans-serif;font-size:14px;font-weight:700;color:#111827;margin-bottom:8px;line-height:1.4;letter-spacing:-0.01em}
  .rq-output-card-body{font-size:13px;color:#6B7280;line-height:1.65;font-family:'Lora',serif}
  .rq-output-building{display:flex;align-items:center;gap:8px;padding:10px 14px;background:#FFF7ED;border:1px solid rgba(194,65,12,0.2);border-radius:6px;margin-top:8px}
  .rq-output-building-dot{width:6px;height:6px;border-radius:50%;background:#C2410C;animation:pulse 1s infinite}
  .rq-output-building-text{font-family:'Syne',sans-serif;font-size:11px;color:#C2410C;font-weight:600}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
  .rq-output-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px 32px;text-align:center}
  .rq-output-empty-icon{font-size:32px;margin-bottom:16px;opacity:.4}
  .rq-output-empty-title{font-family:'Syne',sans-serif;font-size:14px;font-weight:700;color:#9CA3AF;margin-bottom:8px}
  .rq-output-empty-sub{font-size:13px;color:#C5C0B8;line-height:1.6;max-width:260px;font-family:'Lora',serif}
  .rq-export-row{padding:12px 20px;border-top:1px solid rgba(0,0,0,0.07);background:#FFFFFF;display:flex;gap:8px;align-items:center;flex-shrink:0}
  .rq-diff-table{width:100%;border-collapse:collapse;font-size:11px;margin-top:10px}
  .rq-diff-table th{font-family:'Syne',sans-serif;font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#9CA3AF;text-align:left;padding:6px 10px;border-bottom:1px solid rgba(0,0,0,0.07)}
  .rq-diff-table td{padding:8px 10px;border-bottom:1px solid rgba(0,0,0,0.05);color:#374151;font-size:12px}
  .rq-diff-table tr:last-child td{border-bottom:none}
  .rq-diff-check{color:#15803D;font-size:14px}
  .rq-diff-cross{color:#DC2626;font-size:14px}
  .rq-cost-band{display:flex;align-items:center;gap:16px;margin-top:14px;padding:12px 16px;background:#F9F8F8;border-radius:8px;border:1px solid rgba(0,0,0,0.06)}
  .rq-cost-range{font-family:'Syne',sans-serif;font-size:20px;font-weight:800;color:#1E293B;letter-spacing:-0.03em}
  .rq-cost-label{font-family:'Syne',sans-serif;font-size:10px;color:#9CA3AF}
  .rq-tl-row{display:flex;gap:8px;margin-top:10px}
  .rq-tl-box{flex:1;background:#F9F8F8;border-radius:6px;padding:10px 12px;border:1px solid rgba(0,0,0,0.06)}
  .rq-tl-label{font-family:'Syne',sans-serif;font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#9CA3AF;margin-bottom:4px}
  .rq-tl-val{font-family:'Syne',sans-serif;font-size:13px;font-weight:700;color:#1E293B}
  .rq-drawer-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.3);z-index:40}
  .rq-drawer-overlay.open{display:block}
  .rq-drawer{position:fixed;top:0;left:0;height:100vh;width:240px;background:#FFFFFF;border-right:1px solid rgba(0,0,0,0.07);display:flex;flex-direction:column;z-index:50;transform:translateX(-100%);transition:transform .2s}
  .rq-drawer.open{transform:translateX(0)}
  .rq-drawer-header{padding:16px 20px;border-bottom:1px solid rgba(0,0,0,0.07);display:flex;align-items:center;justify-content:space-between}
  .rq-drawer-title{font-family:'Syne',sans-serif;font-size:11px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:#9CA3AF}
  .rq-drawer-close{background:none;border:none;cursor:pointer;color:#9CA3AF;padding:4px;display:flex;align-items:center;justify-content:center}
  .rq-drawer-footer{padding:16px 20px;border-top:1px solid rgba(0,0,0,0.07)}
  .rq-nav{padding:12px 0;flex:1;overflow-y:auto}
  .rq-nav-item{display:flex;align-items:center;gap:10px;padding:9px 20px;font-family:'Syne',sans-serif;font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#9CA3AF;border-left:2px solid transparent;cursor:pointer;transition:all .15s}
  .rq-nav-item:hover{color:#374151;background:rgba(0,0,0,0.03)}
  .rq-nav-item.active{color:#C2410C;border-left-color:#C2410C;background:#FFF7ED}
  .rq-nav-item.done{color:#6B7280}
  .rq-nav-item.done .rq-nav-num{background:#FFF7ED;border-color:#FDBA74;color:#C2410C}
  .rq-nav-num{width:18px;height:18px;border-radius:50%;border:1.5px solid currentColor;display:flex;align-items:center;justify-content:center;font-size:9px;flex-shrink:0}
  .rq-main{flex:1;display:flex;flex-direction:column;min-width:0}
  .rq-topbar{background:#FFFFFF;border-bottom:1px solid rgba(0,0,0,0.07);padding:12px 20px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;gap:10px}
  .rq-topbar-left .rq-topbar-title{font-family:'Syne',sans-serif;font-size:14px;font-weight:700;color:#111827}
  .rq-topbar-left .rq-topbar-sub{font-size:11px;color:#6B7280;margin-top:2px}
  .rq-topbar-right{display:flex;align-items:center;gap:8px;flex-shrink:0}
  .rq-save-chip{font-family:'JetBrains Mono',monospace;font-size:10px;color:#C2410C;background:#FFF7ED;padding:4px 10px;border-radius:3px;display:flex;align-items:center;gap:5px}
  .rq-export-btn{display:flex;align-items:center;gap:7px;background:#C2410C;color:#FFFFFF;font-family:'Syne',sans-serif;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:8px 14px;border:none;border-radius:4px;cursor:pointer;transition:background .15s;white-space:nowrap}
  .rq-export-btn:hover{background:#9A3412}
  .rq-export-btn:disabled{opacity:.4;cursor:not-allowed}
  .rq-content{flex:1;padding:28px 32px;overflow-y:auto}
  .rq-metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:24px}
  .rq-metric{background:#FFFFFF;border-radius:6px;padding:12px 14px;border:1px solid rgba(0,0,0,0.07);text-align:center}
  .rq-metric-label{font-family:'Syne',sans-serif;font-size:9px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:#9CA3AF;margin-bottom:4px}
  .rq-metric-val{font-size:22px;font-weight:500;color:#111827}
  .rq-metric-sub{font-size:10px;color:#C2410C;margin-top:2px}
  .rq-metric-sub.amber{color:#D97706}
  .rq-section-label{font-family:'Syne',sans-serif;font-size:10px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#9CA3AF;margin-bottom:10px}
  .rq-card{background:#FFFFFF;border:1px solid rgba(0,0,0,0.07);border-radius:8px;padding:18px 20px;margin-bottom:10px}
  .rq-card:hover{border-color:rgba(194,65,12,0.3)}
  .rq-textarea{width:100%;border:1px solid rgba(0,0,0,0.12);border-radius:6px;padding:12px 14px;font-family:'Lora',serif;font-size:14px;color:#111827;background:#FFFFFF;resize:vertical;min-height:80px;outline:none;transition:border-color .15s;line-height:1.65}
  .rq-textarea:focus{border-color:#C2410C}
  .rq-input{width:100%;border:1px solid rgba(0,0,0,0.12);border-radius:6px;padding:9px 12px;font-family:'Lora',serif;font-size:13px;color:#111827;background:#FFFFFF;outline:none;transition:border-color .15s}
  .rq-input:focus{border-color:#C2410C}
  .rq-btn-primary{display:inline-flex;align-items:center;gap:7px;background:#C2410C;color:#FFFFFF;font-family:'Syne',sans-serif;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:10px 20px;border:none;border-radius:4px;cursor:pointer;transition:background .15s}
  .rq-btn-primary:hover{background:#9A3412}
  .rq-btn-primary:disabled{opacity:.4;cursor:not-allowed}
  .rq-btn-ghost{display:inline-flex;align-items:center;gap:6px;background:transparent;color:#6B7280;font-family:'Syne',sans-serif;font-size:10px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;padding:8px 12px;border:1px solid rgba(0,0,0,0.12);border-radius:4px;cursor:pointer;transition:all .15s}
  .rq-btn-ghost:hover{border-color:#C2410C;color:#C2410C}
  .rq-btn-ghost:disabled{opacity:.4;cursor:not-allowed}
  .rq-btn-icon{display:inline-flex;align-items:center;justify-content:center;background:transparent;padding:5px 7px;border:1px solid rgba(0,0,0,0.1);border-radius:4px;cursor:pointer;transition:all .15s;color:#6B7280}
  .rq-btn-icon:hover{border-color:#C2410C;color:#C2410C}
  .rq-btn-icon:disabled{opacity:.35;cursor:not-allowed}
  .rq-btn-del{color:#DC2626;border-color:rgba(220,38,38,0.3)}
  .rq-btn-del:hover{background:rgba(220,38,38,0.06);color:#DC2626}
  .rq-req-id{font-family:'JetBrains Mono',monospace;font-size:10px;color:#C2410C;font-weight:500;margin-bottom:4px;background:#FFF7ED;display:inline-block;padding:1px 6px;border-radius:2px;border:1px solid #FDBA74}
  .rq-req-text{font-size:13px;line-height:1.55;color:#374151;margin-top:4px}
  .rq-q-card{border:1px solid rgba(0,0,0,0.07);border-radius:6px;padding:14px 16px;margin-bottom:8px;background:#FFFFFF}
  .rq-badge{display:inline-block;font-family:'Syne',sans-serif;font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:2px 7px;border-radius:3px;margin-bottom:6px}
  .rq-badge-open{background:#FFF7ED;color:#C2410C;border:1px solid #FDBA74}
  .rq-badge-mc{background:#FFFBEB;color:#D97706;border:1px solid #FCD34D}
  .rq-q-text{font-size:13px;color:#374151;line-height:1.5}
  .rq-mc-opts{margin-top:8px;display:flex;flex-wrap:wrap;gap:6px}
  .rq-mc-opt{font-family:'JetBrains Mono',monospace;font-size:11px;background:#FFFBEB;border:1px solid rgba(217,119,6,0.3);border-radius:3px;padding:3px 9px;color:#D97706}
  .rq-scope-box{font-size:14px;line-height:1.75;color:#374151;background:#F9F8F8;border:1px solid rgba(0,0,0,0.07);border-radius:8px;padding:16px 20px;white-space:pre-wrap;font-family:'Lora',serif}
  .rq-scope-approved{background:#FFF7ED;border:1px solid rgba(194,65,12,0.3);border-radius:8px;padding:12px 16px;margin-bottom:14px;display:flex;align-items:center;gap:10px;font-family:'Syne',sans-serif;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#C2410C}
  .rq-flag-card{background:#FFFBEB;border:1px solid rgba(217,119,6,0.3);border-radius:8px;padding:14px 18px;margin-bottom:12px}
  .rq-flag-title{font-family:'Syne',sans-serif;font-size:10px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:#D97706;margin-bottom:6px;display:flex;align-items:center;gap:6px}
  .rq-flag-text{font-size:13px;color:#92400E;line-height:1.6;margin-bottom:10px}
  .rq-5w-card{background:#FFFFFF;border:1px solid rgba(0,0,0,0.07);border-radius:8px;padding:18px 20px;margin-bottom:12px}
  .rq-5w-label{font-family:'Syne',sans-serif;font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#C2410C;margin-bottom:4px}
  .rq-5w-question{font-size:13px;font-weight:500;color:#111827;margin-bottom:10px;font-family:'Syne',sans-serif}
  .sv-bar{display:flex;align-items:center;justify-content:space-between;background:#FFFFFF;border:1px solid rgba(0,0,0,0.07);border-radius:6px;padding:8px 14px;margin-bottom:20px;gap:12px}
  .sv-status{font-family:'JetBrains Mono',monospace;font-size:10px;color:#9CA3AF;display:flex;align-items:center;gap:6px}
  .sv-status.saved{color:#C2410C}
  .sv-status.saving{color:#D97706}
  .sv-status.error{color:#DC2626}
  .rq-progress{display:flex;align-items:center;gap:10px;margin-bottom:28px}
  .rq-step-bar{display:flex;align-items:center;gap:0;padding:10px 20px;background:#FFFFFF;border-bottom:1px solid rgba(0,0,0,0.05);overflow-x:auto;flex-shrink:0}
  .rq-step-item{display:flex;align-items:center;gap:0;flex-shrink:0}
  .rq-step-connector{width:24px;height:2px;background:rgba(0,0,0,0.08);margin:0 2px;transition:background .3s}
  .rq-step-connector.done{background:#FDBA74}
  .rq-step-dot{width:22px;height:22px;border-radius:50%;border:1.5px solid rgba(0,0,0,0.12);display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-size:9px;font-weight:700;color:#9CA3AF;transition:all .2s;background:#FFFFFF}
  .rq-step-dot.active{background:#C2410C;border-color:#C2410C;color:#FFFFFF}
  .rq-step-dot.done{background:#FFF7ED;border-color:#FDBA74;color:#C2410C}
  .rq-step-dot.locked{opacity:.35;cursor:default}
  .rq-step-label{font-family:'Syne',sans-serif;font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-left:6px;white-space:nowrap}
  .rq-step-label.active{color:#C2410C}
  .rq-step-label.done{color:#9CA3AF}
  .rq-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:24px;padding-top:16px;border-top:1px solid rgba(0,0,0,0.07)}
  .rq-divider{border:none;border-top:1px solid rgba(0,0,0,0.07);margin:16px 0}
  .rq-hint{font-size:12px;color:#9CA3AF;line-height:1.6;font-style:italic;font-family:'Lora',serif}
  .rq-error{background:#FEF2F2;border:1px solid rgba(220,38,38,0.3);border-radius:6px;padding:10px 14px;font-size:12px;color:#DC2626;margin-bottom:14px}
  .rq-loading-center{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px 24px;text-align:center}
  .tl-group-label{font-family:'Syne',sans-serif;font-size:10px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;margin-bottom:8px;margin-top:16px}
  .tl-group-pre{color:#C2410C}
  .tl-group-rfx{color:#D97706}
  .tl-group-post{color:#6B7280}
  .tl-act-row{display:grid;gap:6px;align-items:center;margin-bottom:5px;padding:7px 10px;background:#FFFFFF;border:1px solid rgba(0,0,0,0.07);border-radius:6px;transition:border-color .15s}
  .tl-act-row:hover{border-color:rgba(194,65,12,0.3)}
  .tl-act-row.is-child{margin-left:22px;background:#F9F8F8;border-left:2px solid rgba(217,119,6,0.4)}
  .tl-act-row.is-parent{border-left:2px solid rgba(194,65,12,0.4)}
  .tl-act-row.dragging{opacity:.5}
  .tl-act-row.drag-over{border-color:#C2410C;border-style:dashed}
  .tl-cell-input{border:1px solid rgba(0,0,0,0.1);border-radius:4px;padding:5px 7px;font-family:'Lora',serif;font-size:12px;color:#111827;background:#FFFFFF;outline:none;width:100%}
  .tl-cell-input:focus{border-color:#C2410C}
  .tl-col-hdr{font-family:'Syne',sans-serif;font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#9CA3AF}
  .gantt-wrap{overflow-x:auto;margin-top:20px}
  .gantt-container{min-width:640px;background:#FFFFFF;border:1px solid rgba(0,0,0,0.07);border-radius:8px;padding:18px}
  .gantt-title{font-family:'Syne',sans-serif;font-size:10px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:#9CA3AF;margin-bottom:14px}
  .vendor-card{background:#FFFFFF;border:1px solid rgba(0,0,0,0.07);border-radius:8px;padding:16px 18px;margin-bottom:10px;transition:border-color .15s}
  .vendor-card:hover{border-color:rgba(194,65,12,0.25)}
  .vendor-card.shortlisted{border-color:rgba(194,65,12,0.4);background:#FFF7ED}
  .vendor-card.eliminated{opacity:.45;border-color:rgba(220,38,38,0.2)}
  .vendor-name{font-family:'Syne',sans-serif;font-size:14px;font-weight:700;color:#111827;margin-bottom:2px}
  .vendor-category{font-family:'Syne',sans-serif;font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#9CA3AF;margin-bottom:8px}
  .vendor-meta{display:flex;align-items:center;gap:10px;margin-bottom:8px;flex-wrap:wrap}
  .vendor-badges{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px}
  .vendor-badge{font-family:'Syne',sans-serif;font-size:9px;font-weight:700;letter-spacing:.06em;padding:2px 7px;border-radius:3px;white-space:nowrap}
  .vb-saas{background:#F0FDF4;color:#166534;border:1px solid #BBF7D0}
  .vb-onprem{background:#FFFBEB;color:#D97706;border:1px solid #FCD34D}
  .vb-hybrid{background:#EFF6FF;color:#1E40AF;border:1px solid #BFDBFE}
  .vb-low{background:#F0FDF4;color:#166534;border:1px solid #BBF7D0}
  .vb-medium{background:#FFFBEB;color:#D97706;border:1px solid #FCD34D}
  .vb-high{background:#FEF2F2;color:#DC2626;border:1px solid #FECACA}
  .vb-startup{background:#F0FDF4;color:#166534;border:1px solid #BBF7D0}
  .vb-growth{background:#FFF7ED;color:#C2410C;border:1px solid #FDBA74}
  .vb-established{background:#F3F4F6;color:#374151;border:1px solid #D1D5DB}
  .vb-legacy{background:#F9FAFB;color:#6B7280;border:1px solid #E5E7EB}
  .vb-neutral{background:#F3F4F6;color:#6B7280;border:1px solid #E5E7EB}
  .vendor-rating{font-family:'JetBrains Mono',monospace;font-size:11px;color:#D97706;display:flex;align-items:center;gap:4px}
  .vendor-reviews{font-family:'JetBrains Mono',monospace;font-size:10px;color:#9CA3AF}
  .vendor-desc{font-size:12px;color:#6B7280;line-height:1.5;margin-bottom:10px}
  .vendor-match{display:flex;align-items:center;gap:8px;margin-bottom:10px}
  .vendor-match-bar{flex:1;height:4px;background:rgba(0,0,0,0.06);border-radius:2px;overflow:hidden;max-width:120px}
  .vendor-match-fill{height:100%;border-radius:2px;background:#C2410C}
  .vendor-match-fill.medium{background:#D97706}
  .vendor-match-fill.low{background:#D1D5DB}
  .vendor-match-text{font-family:'JetBrains Mono',monospace;font-size:10px;color:#9CA3AF}
  .vendor-actions{display:flex;gap:6px}
  .vendor-btn{font-family:'Syne',sans-serif;font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:4px 10px;border-radius:3px;cursor:pointer;border:1px solid;transition:all .15s}
  .vendor-btn-shortlist{color:#C2410C;border-color:rgba(194,65,12,0.3);background:transparent}
  .vendor-btn-shortlist:hover,.vendor-btn-shortlist.active{background:#FFF7ED;border-color:#C2410C}
  .vendor-btn-eliminate{color:#DC2626;border-color:rgba(220,38,38,0.3);background:transparent}
  .vendor-btn-eliminate:hover,.vendor-btn-eliminate.active{background:#FEF2F2;border-color:#DC2626}
  .vendor-btn-g2{color:#9CA3AF;border-color:rgba(0,0,0,0.1);background:transparent}
  .vendor-btn-g2:hover{color:#374151;border-color:rgba(0,0,0,0.2)}
  .confidence-dot{width:6px;height:6px;border-radius:50%;display:inline-block;flex-shrink:0}
  .confidence-high{background:#C2410C}
  .confidence-medium{background:#D97706}
  .confidence-low{background:#D1D5DB}
  @keyframes spin{to{transform:rotate(360deg)}}
  .spin{animation:spin .8s linear infinite;display:inline-block}
  .rq-fade{animation:fadeUp .3s ease both}
  @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  .rq-skeleton{background:linear-gradient(90deg,#F3F4F6 25%,#E5E7EB 50%,#F3F4F6 75%);background-size:200% 100%;animation:shimmer 1.4s ease-in-out infinite;border-radius:6px}
  @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
  .rq-hamburger{display:none;background:none;border:none;cursor:pointer;padding:6px;color:#374151}
  .rq-sidebar-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.3);z-index:40}
  @media(max-width:768px){
    .rq-shell{grid-template-columns:1fr;grid-template-rows:55vh 1fr;height:auto;min-height:100vh}
    .rq-chat-panel{height:55vh;border-right:none;border-bottom:1px solid rgba(0,0,0,0.07)}
    .rq-output-panel{min-height:45vh}
    .rq-hamburger{display:flex;align-items:center;justify-content:center}
    .rq-output-steps{display:none}
    .rq-content{padding:18px 16px}
    .rq-metrics{grid-template-columns:1fr 1fr}
    .tl-col-hdr:nth-child(4),.tl-act-row>*:nth-child(4){display:none}
    .gantt-wrap{margin-left:-16px;margin-right:-16px}
  }
  @media(max-width:480px){
    .rq-metrics{grid-template-columns:1fr 1fr}
    .rq-actions{flex-wrap:wrap}
    .rq-btn-primary,.rq-btn-ghost{font-size:10px;padding:8px 12px}
  }
`;
document.head.appendChild(_style);

// ─── Utils ────────────────────────────────────────────────────────────────────
const genId = () => "SES-" + Math.random().toString(36).substring(2, 9).toUpperCase();
const uid = () => "a" + Date.now() + Math.random().toString(36).substring(2, 5);

async function callClaude(system, user, useWebSearch = false, model = null, identity = {}) {
  const body = { system, user, useWebSearch };
  if (model) body.model = model;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  try {
    const res = await fetch("/api/claude", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(identity.userId   && { "X-User-Id":    identity.userId }),
        ...(identity.tenantId && { "X-Tenant-Id":  identity.tenantId }),
        ...(identity.sessionId && { "X-Session-Id": identity.sessionId }),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const d = await res.json();
    if (!res.ok || d.error) throw new Error(`API ${res.status}: ${d.error?.type || ""} — ${d.error?.message || JSON.stringify(d)}`);
    return d.content?.filter(b => b.type === "text").map(b => b.text).join("") ?? "";
  } catch (e) {
    clearTimeout(timeout);
    if (e.name === "AbortError") throw new Error("Request timed out — please try again.");
    throw e;
  }
}

async function callJSON(system, user, useWebSearch = false, model = null, identity = {}) {
  const t = await callClaude(system, user, useWebSearch, model, identity);
  const fenceMatch = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenceMatch ? fenceMatch[1].trim() : t;
  const arrMatch = candidate.match(/\[[\s\S]*\]/);
  const objMatch = candidate.match(/\{[\s\S]*\}/);
  const jsonStr = (arrMatch ? arrMatch[0] : objMatch ? objMatch[0] : candidate).trim();
  try {
    return JSON.parse(jsonStr);
  } catch {
    throw new Error(`JSON parse failed. Raw response: ${t.slice(0, 300)}`);
  }
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
// group: Pre-RFx | RFx | Post-RFx
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
    // ── Pre-RFx ──
    { id: "a1",  group: "Pre-RFx",  parentId: null, name: "Draft Scope & Requirements",           startDate: scopeStart,  endDate: scopeEnd,     offsetDays: 7,  startOffsetDays: 0 },
    { id: "a2",  group: "Pre-RFx",  parentId: null, name: "Execute NDA",                           startDate: scopeStart,  endDate: issueStart,   offsetDays: calDaysBetween(scopeStart, issueStart), startOffsetDays: 0 },
    { id: "a3",  group: "Pre-RFx",  parentId: null, name: "Market Analysis",                       startDate: scopeStart,  endDate: marketEnd,    offsetDays: 14, startOffsetDays: 0 },
    { id: "a4",  group: "Pre-RFx",  parentId: null, name: "Vendor Identification",                 startDate: scopeStart,  endDate: vendorEnd,    offsetDays: calDaysBetween(scopeStart, vendorEnd), startOffsetDays: 0 },
    { id: "a5",  group: "Pre-RFx",  parentId: null, name: "Draft RFx",                             startDate: vendorEnd,   endDate: issueStart,   offsetDays: calDaysBetween(vendorEnd, issueStart), startOffsetDays: calDaysBetween(t, vendorEnd) },
    { id: "a5a", group: "Pre-RFx",  parentId: "a5", name: "Finalize Scope & Requirements",         startDate: vendorEnd,   endDate: finScopeEnd,  offsetDays: 7,  startOffsetDays: calDaysBetween(t, vendorEnd) },
    { id: "a5b", group: "Pre-RFx",  parentId: "a5", name: "Establish Evaluation Team, Criteria & Weighting", startDate: vendorEnd, endDate: evalTeamEnd, offsetDays: 14, startOffsetDays: calDaysBetween(t, vendorEnd) },
    // ── RFx ──
    { id: "a6",  group: "RFx",      parentId: null, name: "Issue RFx",                             startDate: issueStart,  endDate: issueEnd,     offsetDays: 14, startOffsetDays: calDaysBetween(t, issueStart) },
    { id: "a6a", group: "RFx",      parentId: "a6", name: "Vendors Submit Clarifying Questions",   startDate: d(issueStart, 4), endDate: vendorQEnd, offsetDays: 2, startOffsetDays: calDaysBetween(t, d(issueStart, 4)) },
    { id: "a6b", group: "RFx",      parentId: "a6", name: "Respond to Vendor Questions",           startDate: vendorQEnd,  endDate: respondEnd,   offsetDays: 3,  startOffsetDays: calDaysBetween(t, vendorQEnd) },
    { id: "a6c", group: "RFx",      parentId: "a6", name: "Submit RFx Response",                   startDate: submitStart, endDate: submitEnd,    offsetDays: 7,  startOffsetDays: calDaysBetween(t, submitStart) },
    { id: "a7",  group: "RFx",      parentId: null, name: "Evaluate RFx",                          startDate: evalStart,   endDate: evalTechEnd,  offsetDays: calDaysBetween(evalStart, evalTechEnd), startOffsetDays: calDaysBetween(t, evalStart) },
    { id: "a7a", group: "RFx",      parentId: "a7", name: "Evaluate Responses",                    startDate: evalStart,   endDate: evalRespEnd,  offsetDays: 8,  startOffsetDays: calDaysBetween(t, evalStart) },
    { id: "a7b", group: "RFx",      parentId: "a7", name: "Shortlist (Recommendation to Leadership)", startDate: d(evalRespEnd, 1), endDate: shortlistEnd, offsetDays: 5, startOffsetDays: calDaysBetween(t, d(evalRespEnd, 1)) },
    { id: "a7c", group: "RFx",      parentId: "a7", name: "Technical Evaluation (Demo / POC)",     startDate: techStart,   endDate: techEnd,      offsetDays: 28, startOffsetDays: calDaysBetween(t, techStart) },
    { id: "a7d", group: "RFx",      parentId: "a7", name: "Evaluate Technical Evaluation",         startDate: techStart,   endDate: evalTechEnd,  offsetDays: 5,  startOffsetDays: calDaysBetween(t, techStart) },
    // ── Post-RFx ──
    { id: "a8",  group: "Post-RFx", parentId: null, name: "Internal Alignment & Confirm Budget",   startDate: alignStart,  endDate: alignEnd,     offsetDays: 5,  startOffsetDays: calDaysBetween(t, alignStart) },
    { id: "a9",  group: "Post-RFx", parentId: null, name: "Final Recommendation",                  startDate: finalStart,  endDate: finalEnd,     offsetDays: 5,  startOffsetDays: calDaysBetween(t, finalStart) },
    { id: "a10", group: "Post-RFx", parentId: null, name: "Due Diligence",                         startDate: vendorEnd,   endDate: negoEnd,      offsetDays: calDaysBetween(vendorEnd, negoEnd), startOffsetDays: calDaysBetween(t, vendorEnd) },
    { id: "a11", group: "Post-RFx", parentId: null, name: "Negotiate Contract",                    startDate: negoStart,   endDate: negoEnd,      offsetDays: 45, startOffsetDays: calDaysBetween(t, negoStart) },
    { id: "a12", group: "Post-RFx", parentId: null, name: "Implementation",                        startDate: implStart,   endDate: implEnd,      offsetDays: 45, startOffsetDays: calDaysBetween(t, implStart) },
  ];
}

const GROUPS = ["Pre-RFx", "RFx", "Post-RFx"];
const GROUP_COLORS = { "Pre-RFx": "#2e5984", "RFx": "#3a6a52", "Post-RFx": "#a05828" };

// ─── Sole source activities ────────────────────────────────────────────────────
function makeSoleSourceActivities(startDate) {
  const t = startDate || today();
  const d = (base, offset) => addCalDays(base, offset);

  const scopeEnd   = d(t, 7);
  const memoStart  = d(t, 7);
  const memoEnd    = d(memoStart, 7);
  const demoStart  = d(memoEnd, 5);
  const demoEnd    = d(demoStart, 14);
  const alignStart = d(demoEnd, 3);
  const alignEnd   = d(alignStart, 5);
  const finalStart = d(alignEnd, 5);
  const finalEnd   = d(finalStart, 5);
  const negoStart  = d(finalEnd, 1);
  const negoEnd    = d(negoStart, 30);
  const implStart  = d(negoEnd, 7);
  const implEnd    = d(implStart, 45);

  // All activities in a single flat group — no Pre-RFx/RFx/Post-RFx headings
  return [
    { id: "s1", group: "Activities", parentId: null, name: "Draft Scope & Requirements",          startDate: t,          endDate: scopeEnd,   offsetDays: 7,  startOffsetDays: 0 },
    { id: "s2", group: "Activities", parentId: null, name: "Draft Sole Source Justification",     startDate: memoStart,  endDate: memoEnd,    offsetDays: 7,  startOffsetDays: calDaysBetween(t, memoStart) },
    { id: "s3", group: "Activities", parentId: null, name: "Technical Evaluation (Demo / POC)",   startDate: demoStart,  endDate: demoEnd,    offsetDays: 14, startOffsetDays: calDaysBetween(t, demoStart) },
    { id: "s4", group: "Activities", parentId: null, name: "Due Diligence",                       startDate: demoEnd,    endDate: negoEnd,    offsetDays: calDaysBetween(demoEnd, negoEnd), startOffsetDays: calDaysBetween(t, demoEnd) },
    { id: "s5", group: "Activities", parentId: null, name: "Internal Alignment & Confirm Budget", startDate: alignStart, endDate: alignEnd,   offsetDays: 5,  startOffsetDays: calDaysBetween(t, alignStart) },
    { id: "s6", group: "Activities", parentId: null, name: "Final Recommendation",                startDate: finalStart, endDate: finalEnd,   offsetDays: 5,  startOffsetDays: calDaysBetween(t, finalStart) },
    { id: "s7", group: "Activities", parentId: null, name: "Negotiate Contract",                  startDate: negoStart,  endDate: negoEnd,    offsetDays: 30, startOffsetDays: calDaysBetween(t, negoStart) },
    { id: "s8", group: "Activities", parentId: null, name: "Implementation",                      startDate: implStart,  endDate: implEnd,    offsetDays: 45, startOffsetDays: calDaysBetween(t, implStart) },
  ];
}

// ─── Auto-suggest buying channel from scope bullets ───────────────────────────
function suggestChannel(scopeBullets, formalScope) {
  const text = [...(scopeBullets || []), formalScope || ""].join(" ").toLowerCase();
  const soleSourceSignals = [
    "sole source", "single vendor", "only vendor", "existing vendor", "incumbent",
    "proprietary", "no alternative", "only option", "continuation", "existing contract",
    "current provider", "specific vendor", "named vendor", "sole supplier",
  ];
  const hits = soleSourceSignals.filter(s => text.includes(s));
  return hits.length >= 1 ? "sole-source" : "competitive-bid";
}

// ─── Gantt ────────────────────────────────────────────────────────────────────
function GanttChart({ activities }) {
  const allDates = activities.flatMap(a => [a.startDate, a.endDate]).filter(Boolean).sort();
  if (!allDates.length) return (
    <div style={{ color: "#9CA3AF", fontStyle: "italic", fontSize: 13, marginBottom: 24 }}>No dates set — configure your timeline first.</div>
  );
  const minDate = allDates[0];
  const maxDate = allDates[allDates.length - 1];
  const totalDays = Math.max(calDaysBetween(minDate, maxDate), 1);
  const BAR_H = 28;
  const GROUP_ROW_H = 26;

  // Derive groups dynamically from activities — supports both competitive bid and sole source
  const isSoleSource = activities.every(a => a.group === "Activities");
  const groups = isSoleSource ? ["Activities"] : GROUPS;
  const groupColors = { ...GROUP_COLORS, "Activities": "#5DCAA5" };
  const showGroupHeaders = !isSoleSource;

  const xPct = (dateStr) => {
    if (!dateStr) return 0;
    return Math.min(Math.max((calDaysBetween(minDate, dateStr) / totalDays) * 100, 0), 100);
  };
  const wPct = (s, e) => {
    if (!s || !e) return 0.5;
    return Math.max(Math.min((calDaysBetween(s, e) / totalDays) * 100, 100), 0.8);
  };

  // Month markers
  const markers = [];
  const mStart = new Date(minDate + "T00:00:00");
  const mEnd = new Date(maxDate + "T00:00:00");
  let md = new Date(mStart.getFullYear(), mStart.getMonth(), 1);
  while (md <= mEnd) {
    const ds = md.toISOString().split("T")[0];
    markers.push({ ds, pct: xPct(ds), label: md.toLocaleDateString("en-US", { month: "short", year: "numeric" }) });
    md = new Date(md.getFullYear(), md.getMonth() + 1, 1);
  }

  const totalWeeks = Math.round(totalDays / 7);

  return (
    <div style={{ overflowX: "auto", marginBottom: 24 }}>
      <div style={{ minWidth: 700, background: "#F9F8F8", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 10, padding: "20px 24px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "#C2410C" }}>Buying Timeline</div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#6B7280" }}>
            {new Date(minDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            <span style={{ margin: "0 8px", color: "#9CA3AF" }}>→</span>
            {new Date(maxDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            <span style={{ marginLeft: 12, color: "#D97706" }}>{totalWeeks} weeks</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 0 }}>
          {/* Label column */}
          <div style={{ width: 240, flexShrink: 0, paddingRight: 16 }}>
            <div style={{ height: 32, marginBottom: 2 }} />
            {groups.map(g => {
              const gas = activities.filter(a => a.group === g);
              if (!gas.length) return null;
              return (
                <div key={g}>
                  {showGroupHeaders && (
                    <div style={{ height: GROUP_ROW_H, display: "flex", alignItems: "center" }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: groupColors[g], marginRight: 7, flexShrink: 0 }} />
                      <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: groupColors[g] }}>{g}</span>
                    </div>
                  )}
                  {gas.map(a => (
                    <div key={a.id} style={{ height: BAR_H + 6, display: "flex", alignItems: "center", paddingLeft: a.parentId ? 18 : 2 }}>
                      <span style={{
                        fontFamily: a.parentId ? "'Lora',serif" : "'Syne',sans-serif",
                        fontSize: a.parentId ? 11 : 12,
                        fontWeight: a.parentId ? 400 : 600,
                        fontStyle: a.parentId ? "italic" : "normal",
                        color: a.parentId ? "#6B7280" : "#374151",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        lineHeight: 1.3,
                      }}>{a.name}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Chart area */}
          <div style={{ flex: 1, minWidth: 0, position: "relative", borderLeft: "1px solid rgba(0,0,0,0.07)" }}>
            {/* Month header */}
            <div style={{ height: 32, position: "relative", marginBottom: 2, borderBottom: "1px solid rgba(0,0,0,0.1)" }}>
              {markers.map(m => (
                <div key={m.ds} style={{ position: "absolute", left: `${m.pct}%`, top: 0, height: "100%", display: "flex", alignItems: "center", paddingLeft: 6 }}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#6B7280", whiteSpace: "nowrap" }}>{m.label}</span>
                  <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 1, background: "rgba(0,0,0,0.06)" }} />
                </div>
              ))}
            </div>

            {groups.map(g => {
              const gas = activities.filter(a => a.group === g);
              if (!gas.length) return null;
              const color = groupColors[g];
              return (
                <div key={g}>
                  {/* Group span bar — only shown for competitive bid */}
                  {showGroupHeaders && (
                    <div style={{ height: GROUP_ROW_H, position: "relative", display: "flex", alignItems: "center" }}>
                      {(() => {
                        const gDates = gas.flatMap(a => [a.startDate, a.endDate]).filter(Boolean).sort();
                        if (gDates.length < 2) return null;
                        return <div style={{ position: "absolute", left: `${xPct(gDates[0])}%`, width: `${wPct(gDates[0], gDates[gDates.length - 1])}%`, height: 4, background: color, opacity: 0.2, borderRadius: 2 }} />;
                      })()}
                    </div>
                  )}
                  {gas.map(a => {
                    const isChild = !!a.parentId;
                    const hasBar = a.startDate && a.endDate;
                    return (
                      <div key={a.id} style={{ height: BAR_H + 6, position: "relative", display: "flex", alignItems: "center" }}>
                        {/* Grid lines */}
                        {markers.map(m => (
                          <div key={m.ds} style={{ position: "absolute", left: `${m.pct}%`, top: 0, bottom: 0, width: 1, background: "rgba(0,0,0,0.04)" }} />
                        ))}
                        {hasBar && (
                          <div style={{
                            position: "absolute",
                            left: `${xPct(a.startDate)}%`,
                            width: `${wPct(a.startDate, a.endDate)}%`,
                            height: isChild ? BAR_H * 0.6 : BAR_H,
                            background: isChild ? "transparent" : color,
                            border: isChild ? `2px solid ${color}` : "none",
                            opacity: isChild ? 0.75 : 0.9,
                            borderRadius: 4,
                            display: "flex", alignItems: "center", paddingLeft: 7, overflow: "hidden",
                          }}>
                            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: isChild ? color : "rgba(0,0,0,0.75)", fontWeight: 600, whiteSpace: "nowrap" }}>
                              {calDaysBetween(a.startDate, a.endDate)}d
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(0,0,0,0.06)", display: "flex", gap: 20, flexWrap: "wrap" }}>
          {showGroupHeaders && groups.map(g => (
            <div key={g} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 16, height: 10, background: groupColors[g], borderRadius: 3, opacity: 0.9 }} />
              <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 10, color: "#6B7280" }}>{g}</span>
            </div>
          ))}
          {showGroupHeaders && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 16, height: 10, border: "2px solid #9CA3AF", borderRadius: 3 }} />
              <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 10, color: "#6B7280" }}>Sub-activity</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Prompts ──────────────────────────────────────────────────────────────────

// ─── DocX Export ──────────────────────────────────────────────────────────────
async function buildDocx({ sessionId, projectTitle, formalScope, narrative, requirements, questions, activities, rfpStart, goLive, vendors, vendorStatus, userProfile }) {
  const b = { style: BorderStyle.SINGLE, size: 1, color: "D4CCC4" };
  const borders = { top: b, bottom: b, left: b, right: b };
  const cm = { top: 90, bottom: 90, left: 130, right: 130 };

  const hCell = (text, w) => new TableCell({ borders, margins: cm, width: { size: w, type: WidthType.DXA }, shading: { fill: "2E2925", type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: "F7F5F2", font: "Arial", size: 20 })] })] });
  const bCell = (text, w, shade) => new TableCell({ borders, margins: cm, width: { size: w, type: WidthType.DXA }, shading: { fill: shade ? "FAF9F7" : "FFFFFF", type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: String(text || "—"), font: "Arial", size: 20 })] })] });

  const numberingConfig = [{ reference: "nums", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 440, hanging: 360 } } } }] }];
  let alphaCounter = 0;

  const qChildren = [];
  // Support both new flat structure (questions.scope) and legacy per-requirement structure
  const flatQuestions = questions.scope || [];
  const legacyQuestions = !questions.scope && Object.keys(questions).length > 0;

  if (flatQuestions.length > 0) {
    qChildren.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "Vendor Discovery Questions", font: "Arial" })] }));
    flatQuestions.forEach((q, i) => {
      qChildren.push(new Paragraph({ numbering: { reference: "nums", level: 0 }, children: [new TextRun({ text: `Q${i+1}: ${q.text}`, font: "Arial", size: 22 })] }));
      if (q.type === "multiple_choice" && q.options?.length) {
        const ref = `alpha-${alphaCounter++}`;
        numberingConfig.push({ reference: ref, levels: [{ level: 0, format: LevelFormat.LOWER_LETTER, text: "%1)", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] });
        q.options.forEach(opt => qChildren.push(new Paragraph({ numbering: { reference: ref, level: 0 }, children: [new TextRun({ text: opt, font: "Arial", size: 20, color: "5A5048" })] })));
      } else {
        qChildren.push(new Paragraph({ children: [new TextRun({ text: "[Open response]", font: "Arial", size: 20, italics: true, color: "9A8E82" })] }));
      }
      qChildren.push(new Paragraph({ children: [new TextRun("")] }));
    });
  } else if (legacyQuestions) {
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

  // Narrative paragraphs — split on newlines for proper paragraph breaks
  const narrativeText = narrative || formalScope || "";
  const narrativeParas = narrativeText.split(/\n+/).filter(Boolean).map(para =>
    new Paragraph({ children: [new TextRun({ text: para, font: "Arial", size: 24 })], spacing: { line: 360, after: 160 } })
  );

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
        new Paragraph({ children: [new TextRun({ text: `Generated: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`, font: "Arial", size: 18, color: "9A8E82" })] }),
        ...(userProfile ? [new Paragraph({ children: [new TextRun({ text: `Prepared by: ${[userProfile.name, userProfile.title, userProfile.department, userProfile.tenant_config?.brand_name || userProfile.tenant_config?.company_name].filter(Boolean).join(", ")}`, font: "Arial", size: 18, color: "9A8E82" })] })] : []),
        new Paragraph({ children: [new TextRun("")] }),
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "1. Business Case", font: "Arial" })] }),
        ...narrativeParas,
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
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "4. Buying Timeline", font: "Arial" })] }),
        new Paragraph({ children: [new TextRun({ text: `Start: ${fmtDate(rfpStart)}   |   Go-Live: ${fmtDate(goLive)}${rfpStart && goLive ? `   |   ${calDaysBetween(rfpStart, goLive)} calendar days` : ""}`, font: "Arial", size: 20, color: "6A6058" })] }),
        new Paragraph({ children: [new TextRun("")] }),
        new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [3400, 1900, 1900, 2160], rows: tlRows }),
        new Paragraph({ children: [new TextRun("")] }),
        ...(vendors && vendors.length > 0 ? [
          new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "5. Vendor Shortlist", font: "Arial" })] }),
          new Paragraph({ children: [new TextRun({ text: "Pricing estimates are agent-generated. Verify with vendors before use in budget planning.", font: "Arial", size: 18, italics: true, color: "9A8E82" })] }),
          new Paragraph({ children: [new TextRun("")] }),
          new Table({
            width: { size: 9360, type: WidthType.DXA },
            columnWidths: [1800, 1200, 1400, 900, 1060, 3000],
            rows: [
              new TableRow({ children: [hCell("Vendor", 1800), hCell("Category", 1200), hCell("Est. Price (Yr 1)", 1400), hCell("Confidence", 900), hCell("Req. Match", 1060), hCell("Description", 3000)] }),
              ...vendors
                .filter(v => !vendorStatus || vendorStatus[v.name] !== "eliminated")
                .map((v, i) => new TableRow({ children: [
                  bCell(v.name + (vendorStatus && vendorStatus[v.name] === "shortlisted" ? " ✓" : ""), 1800, i % 2),
                  bCell(v.category, 1200, i % 2),
                  bCell(v.estimatedPrice || "Contact vendor", 1400, i % 2),
                  bCell(v.priceConfidence ? `${v.priceConfidence} conf.` : "—", 900, i % 2),
                  bCell(`${v.requirementsMatch}/${v.requirementsTotal}`, 1060, i % 2),
                  bCell(v.description, 3000, i % 2),
                ]}))
            ]
          })
        ] : []),
      ]
    }]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${projectTitle ? projectTitle.replace(/[^a-zA-Z0-9_-]/g, "_") : "Pario"}.docx`);
}

// ─── Component ────────────────────────────────────────────────────────────────
// ─── Profile Setup Screen (first login) ──────────────────────
function ProfileSetupScreen({ onComplete }) {
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const handle = async () => {
    if (!name.trim()) { setErr("Please enter your name."); return; }
    setBusy(true); setErr("");
    const ok = await saveUserProfile({ name: name.trim(), title: title.trim(), role: "buyer" });
    if (ok) {
      onComplete({ name: name.trim(), title: title.trim() });
    } else {
      setErr("Could not save profile — please try again.");
      setBusy(false);
    }
  };

  return (
    <div className="rq-root" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 400, padding: "0 24px" }}>
        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: ".2em", textTransform: "uppercase", color: "#C2410C", marginBottom: 8 }}>One quick thing</div>
        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 800, color: "#111827", marginBottom: 6 }}>Tell us who you are</div>
        <div style={{ fontFamily: "'Lora',serif", fontSize: 13, color: "#6B7280", marginBottom: 28 }}>This appears on your exported documents.</div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: ".15em", textTransform: "uppercase", color: "#9CA3AF", marginBottom: 6 }}>Your name</div>
          <input className="rq-input" placeholder="e.g. Jane Smith" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && handle()} autoFocus />
        </div>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: ".15em", textTransform: "uppercase", color: "#9CA3AF", marginBottom: 6 }}>Your title <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span></div>
          <input className="rq-input" placeholder="e.g. VP Operations" value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === "Enter" && handle()} />
        </div>
        {err && <div className="rq-error" style={{ marginBottom: 14 }}>{err}</div>}
        <button className="rq-btn-primary" style={{ width: "100%", justifyContent: "center", padding: "12px" }} onClick={handle} disabled={busy}>
          {busy ? <><Loader size={13} className="spin" /> Saving…</> : <>Let's go <ChevronRight size={13} /></>}
        </button>
      </div>
    </div>
  );
}

// ─── Login Screen ─────────────────────────────────────────────
function LoginScreen({ onUnconfirmed }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("signin");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const handle = async () => {
    if (!email.trim() || !password.trim()) { setErr("Email and password are required."); return; }
    setBusy(true); setErr(""); setMsg("");
    const fn = mode === "signup" ? signUp : signIn;
    const { data, error } = await fn(email, password);
    if (error) {
      if (error.message?.toLowerCase().includes("email not confirmed")) {
        onUnconfirmed?.();
      } else {
        setErr(error.message);
      }
      setBusy(false);
      return;
    }
    if (mode === "signup") {
      onUnconfirmed?.();
    }
    setBusy(false);
  };

  return (
    <div className="rq-root" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 400, padding: "0 24px" }}>
        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: ".2em", textTransform: "uppercase", color: "#C2410C", marginBottom: 8 }}>Pario</div>
        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 800, color: "#111827", marginBottom: 6 }}>
          {mode === "signup" ? "Create your account" : "Welcome back"}
        </div>
        <div style={{ fontFamily: "'Lora',serif", fontSize: 13, color: "#6B7280", marginBottom: 28 }}>
          {mode === "signup" ? "Start building better business cases." : "Sign in to continue."}
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: ".15em", textTransform: "uppercase", color: "#9CA3AF", marginBottom: 6 }}>Email</div>
          <input className="rq-input" type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && handle()} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: ".15em", textTransform: "uppercase", color: "#9CA3AF", marginBottom: 6 }}>Password</div>
          <input className="rq-input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handle()} />
        </div>
        {err && <div className="rq-error" style={{ marginBottom: 14 }}>{err}</div>}
        {msg && <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 6, padding: "10px 14px", fontSize: 13, color: "#166534", marginBottom: 14 }}>{msg}</div>}
        <button className="rq-btn-primary" style={{ width: "100%", justifyContent: "center", padding: "12px" }} onClick={handle} disabled={busy}>
          {busy ? <><Loader size={13} className="spin" /> {mode === "signup" ? "Creating account…" : "Signing in…"}</> : mode === "signup" ? "Create account" : "Sign in"}
        </button>
        <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "#6B7280" }}>
          {mode === "signin" ? <>No account? <button style={{ background: "none", border: "none", color: "#C2410C", cursor: "pointer", fontSize: 13, fontWeight: 600, padding: 0 }} onClick={() => { setMode("signup"); setErr(""); setMsg(""); }}>Create one</button></> : <>Have an account? <button style={{ background: "none", border: "none", color: "#C2410C", cursor: "pointer", fontSize: 13, fontWeight: 600, padding: 0 }} onClick={() => { setMode("signin"); setErr(""); setMsg(""); }}>Sign in</button></>}
        </div>
        <div style={{ textAlign: "center", marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(0,0,0,0.07)", fontSize: 11, color: "#9CA3AF", lineHeight: 1.6 }}>
          By continuing you agree to Pario's{" "}
          <a href="https://www.planwithpario.com/terms" target="_blank" rel="noopener noreferrer" style={{ color: "#C2410C", textDecoration: "none" }}>Terms of Use</a>
          {" "}and{" "}
          <a href="https://www.planwithpario.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "#C2410C", textDecoration: "none" }}>Privacy Policy</a>.
        </div>
      </div>
    </div>
  );
}

export default function RequirementsAgent() {
  const [sessionId, setSessionId] = useState(genId);
  const [step, setStep] = useState(0);
  const [projectTitle, setProjectTitle] = useState("");
  const [view, setView] = useState("splash");
  const [sessionsList, setSessionsList] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [lastSaved, setLastSaved] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileEditName, setProfileEditName] = useState("");
  const [profileEditTitle, setProfileEditTitle] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [tenantBrandName, setTenantBrandName] = useState("");
  const tenantProfileRef = useRef(null); // persists across session resets
  const isDirty = useRef(false);

  // Scope
  const [answers, setAnswers] = useState({ who: "", what: "", where: "", when: "", why: "", freeform: "", companyName: "", companyProfile: null });
  const [companyLookupBusy, setCompanyLookupBusy] = useState(false);
  const [companyLookupErr, setCompanyLookupErr] = useState("");
  const [narrative, setNarrative] = useState("");
  const [narrativeBusy, setNarrativeBusy] = useState(false);
  const [formalScope, setFormalScope] = useState("");
  const [prevScope, setPrevScope] = useState(null); // versioning
  const [isStale, setIsStale] = useState(false); // true when initial description changed post-generation
  const [autoFlowing, setAutoFlowing] = useState(false); // true during auto-flow cascade
  const [execSummary, setExecSummary] = useState("");
  const [scopeBullets, setScopeBullets] = useState([]);
  const [bulletsApproved, setBulletsApproved] = useState(false);
  const [chatMessages, setChatMessages] = useState([]); // [{role, content}]
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [bulletsCollapsed, setBulletsCollapsed] = useState(false);
  const [continuingChat, setContinuingChat] = useState(false);
  const [inputCollapsed, setInputCollapsed] = useState(false);
  const [scopeFlags, setScopeFlags] = useState([]);
  const [flagResponses, setFlagResponses] = useState({});
  const [scopeApproved, setScopeApproved] = useState(false);
  const [scopeBusy, setScopeBusy] = useState(false);
  const [scopeErr, setScopeErr] = useState("");
  const [editingScope, setEditingScope] = useState(false);
  const [expertQuestions, setExpertQuestions] = useState([]);
  const [expertResponses, setExpertResponses] = useState({});
  const [expertApproved, setExpertApproved] = useState(false);

  // Requirements
  const [requirements, setRequirements] = useState([]);
  const [prevRequirements, setPrevRequirements] = useState(null); // versioning
  const [scopeFeedback, setScopeFeedback] = useState(null); // 'up' | 'down' | null
  const [reqsFeedback, setReqsFeedback] = useState(null);
  const [vendorsFeedback, setVendorsFeedback] = useState(null);
  const [emailUnconfirmed, setEmailUnconfirmed] = useState(false);
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
  const [buyingChannel, setBuyingChannel] = useState(null); // null | "competitive-bid" | "sole-source"
  const [channelSuggested, setChannelSuggested] = useState(false);
  const [timelineDefaulted, setTimelineDefaulted] = useState(false); // true when 90-day default was applied
  const [collapsedGroups, setCollapsedGroups] = useState({ "Pre-RFx": false, "RFx": false, "Post-RFx": false });
  const [dragId, setDragId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [newActName, setNewActName] = useState("");
  const [newActGroup, setNewActGroup] = useState("Pre-RFx");

  // Export
  const [exportBusy, setExportBusy] = useState(false);
  const [exportErr, setExportErr] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);

  // Market research
  const [vendors, setVendors] = useState([]);
  const [vendorStatus, setVendorStatus] = useState({}); // { vendorName: 'shortlisted' | 'eliminated' }
  const [marketBusy, setMarketBusy] = useState(false);
  const [marketErr, setMarketErr] = useState("");

  const allAnswered = (answers.freeform || "").trim().length > 20 || FIVE_WS.every(w => answers[w.key].trim().length > 0);
  const isSkipped = (val) => val.trim().toLowerCase() === "skip";
  const allFlagResponsesFilled = scopeFlags.every((_, idx) => (flagResponses[idx] || "").trim().length > 0);

  // ── Identity helper — defined early so all functions can use it ──
  const getIdentity = () => ({
    userId: authUser?.id,
    tenantId: userProfile?.tenant_id,
    sessionId,
  });

  // Unsaved changes warning on close/navigate away
  useEffect(() => {
    const handler = (e) => {
      if (isDirty.current && formalScope) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [formalScope]);

  useEffect(() => { isDirty.current = true; }, [projectTitle, answers, formalScope, requirements, questions, activities]);

  // Auth + tenant config loading
  useEffect(() => {
    const IS_DEMO_SUBDOMAIN = window.location.hostname === 'demo.planwithpario.com';

    getSession().then(async session => {
      // Auto sign-in for demo subdomain if no session exists
      if (!session && IS_DEMO_SUBDOMAIN) {
        const { data, error } = await signIn('test@acme.com', 'test');
        if (!error && data?.user) {
          setAuthUser(data.user);
        }
        setAuthLoading(false);
        return;
      }

      const user = session?.user || null;
      setAuthUser(user);
      setAuthLoading(false);
      if (user) {
        // Load sessions only after we know who the user is
        setSessionsLoading(true);
        loadSessions(user.id).then(rows => { setSessionsList(rows); setSessionsLoading(false); });
        loadUserProfile().then(profile => {
          setUserProfile(profile);
          if (profile?.tenant_config) {
            const tc = profile.tenant_config;
            setTenantBrandName(tc.brand_name || tc.company_name || "");
            const companyProfile = {
              name: tc.company_name,
              brandName: tc.brand_name || tc.company_name,
              vertical: tc.vertical,
              subVertical: tc.sub_vertical,
              employeeCount: tc.employee_count,
              hq: tc.hq,
              publicPrivate: tc.public_private,
              ticker: tc.ticker,
              description: tc.description,
              knownTechStack: tc.tech_stack || [],
              regulatoryContext: tc.regulatory_context,
            };
            tenantProfileRef.current = companyProfile;
            setAnswers(p => ({ ...p, companyProfile }));

            // Demo tenant — sign out on browser close so session never persists
            if (profile.tenant_id === 'demo' || profile.tenant_id === 'acme') {
              window.addEventListener('beforeunload', () => { signOut(); });
            }
          }
        });
      }
    });
    const unsub = onAuthStateChange((event, session) => {
      const user = session?.user || null;
      setAuthUser(user);
      if (user) {
        setSessionsLoading(true);
        loadSessions(user.id).then(rows => { setSessionsList(rows); setSessionsLoading(false); });
      } else {
        setUserProfile(null);
        setSessionsList([]);
        setAnswers(p => ({ ...p, companyProfile: null }));
      }
    });
    return unsub;
  }, []);

  const formalScopeRef = useRef(formalScope);
  useEffect(() => { formalScopeRef.current = formalScope; }, [formalScope]);

  const doSaveRef = useRef(null);
  useEffect(() => { doSaveRef.current = doSave; });

  useEffect(() => {
    const t = setInterval(() => {
      if (isDirty.current && formalScopeRef.current) doSaveRef.current?.("draft");
    }, 30000);
    return () => clearInterval(t);
  }, []);

  const resetSession = () => {
    setSessionId(genId());
    setProjectTitle("");
    setAnswers(prev => ({ who: "", what: "", where: "", when: "", why: "", freeform: "", companyName: prev.companyName || "", companyProfile: tenantProfileRef.current || prev.companyProfile || null }));
    setCompanyLookupBusy(false);
    setCompanyLookupErr("");
    setNarrative("");
    setNarrativeBusy(false);
    setFormalScope("");
    setExecSummary("");
    setScopeBullets([]);
    setBulletsApproved(false);
    setChatMessages([]);
    setChatInput("");
    setChatCollapsed(false);
    setBulletsCollapsed(false);
    setContinuingChat(false);
    setInputCollapsed(false);
    setScopeFlags([]);
    setFlagResponses({});
    setScopeApproved(false);
    setScopeErr("");
    setEditingScope(false);
    setExpertQuestions([]);
    setExpertResponses({});
    setExpertApproved(false);
    setRequirements([]);
    setReqsErr("");
    setNewReq("");
    setEditId(null);
    setQuestions({});
    setQErr("");
    setVendors([]);
    setVendorStatus({});
    setMarketErr("");
    setActivities(makeDefaultActivities(today()));
    setBuyingChannel(null);
    setChannelSuggested(false);
    setRfpStart(today());
    setGoLive(addCalDays(today(), 180));
    setView("scope");
  };

  const getSessionData = () => ({ step, projectTitle, answers, formalScope, execSummary, scopeBullets, bulletsApproved, chatMessages, scopeApproved, requirements, questions, activities, rfpStart, goLive, buyingChannel, vendors, vendorStatus, narrative });

  const doSave = async (status = "draft") => {
    setSaveStatus("saving");
    const userId = authUser?.id || null;
    const tenantId = userProfile?.tenant_id || null;
    const ok = await saveSession({ id: sessionId, projectTitle: projectTitle || "Untitled", status, data: getSessionData(), userId, tenantId });
    if (ok) { setSaveStatus("saved"); setLastSaved(new Date()); isDirty.current = false; loadSessions(authUser?.id).then(setSessionsList); setTimeout(() => setSaveStatus("idle"), 2500); }
    else { setSaveStatus("error"); setTimeout(() => setSaveStatus("idle"), 3000); }
  };

  const doLoadSession = async (id) => {
    setSessionLoading(true);
    const row = await loadSession(id, authUser?.id);
    setSessionLoading(false);
    if (!row?.data) return;
    const d = row.data;
    setSessionId(id);
    if (d.step !== undefined) setStep(d.step);
    if (d.projectTitle) setProjectTitle(d.projectTitle);
    if (d.answers) setAnswers(d.answers);
    if (d.formalScope) setFormalScope(d.formalScope);
    if (d.execSummary) setExecSummary(d.execSummary);
    if (d.scopeBullets) setScopeBullets(d.scopeBullets);
    if (d.bulletsApproved) setBulletsApproved(d.bulletsApproved);
    if (d.chatMessages) setChatMessages(d.chatMessages);
    if (d.scopeApproved) setScopeApproved(d.scopeApproved);
    setEditingScope(false);
    if (d.requirements) setRequirements(d.requirements);
    if (d.questions) setQuestions(d.questions);
    if (d.rfpStart) setRfpStart(d.rfpStart);
    if (d.goLive) setGoLive(d.goLive);
    if (d.buyingChannel) { setBuyingChannel(d.buyingChannel); setChannelSuggested(true); }
    // Only restore activities if they have the new group structure
    if (d.activities && d.activities.length > 0 && d.activities[0].group) {
      // Migrate old Pre-RFP/RFP/Post-RFP group names to Pre-RFx/RFx/Post-RFx
      const migrated = d.activities.map(a => ({
        ...a,
        group: a.group === "Pre-RFP" ? "Pre-RFx" : a.group === "RFP" ? "RFx" : a.group === "Post-RFP" ? "Post-RFx" : a.group
      }));
      setActivities(migrated);
    } else {
      setActivities(makeDefaultActivities(d.rfpStart || today()));
    }
    if (d.vendors) setVendors(d.vendors);
    if (d.vendorStatus) setVendorStatus(d.vendorStatus);
    if (d.narrative) setNarrative(d.narrative);
    setView("scope");
    setLastSaved(new Date(row.updated_at));
  };

  const doDeleteSession = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this project?")) return;
    await deleteSession(id, authUser?.id);
    setSessionsList(p => p.filter(s => s.id !== id));
  };

  const doDeleteCurrentSession = async () => {
    if (!window.confirm(`Delete "${projectTitle || "this project"}"? This cannot be undone.`)) return;
    await deleteSession(sessionId, authUser?.id);
    setSessionsList(p => p.filter(s => s.id !== sessionId));
    resetSession();
    setView("sessions");
  };

  const doSelectChannel = (channel) => {
    setBuyingChannel(channel);
    setChannelSuggested(true);
    const newActivities = channel === "sole-source"
      ? makeSoleSourceActivities(rfpStart)
      : makeDefaultActivities(rfpStart);
    setActivities(newActivities);
    // Update go-live to last activity end date
    const lastDate = newActivities.map(a => a.endDate).filter(Boolean).sort().pop();
    if (lastDate) setGoLive(lastDate);
  };

  // Auto-suggest channel when requirements are first generated
  useEffect(() => {
    if (requirements.length > 0 && !channelSuggested && (scopeBullets.length > 0 || formalScope)) {
      const suggested = suggestChannel(scopeBullets, formalScope);
      setBuyingChannel(suggested);
      setChannelSuggested(true);
    }
  }, [requirements]);

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
  const doSendChatMessage = async (userText) => {
    if (!userText?.trim()) return;
    const newMessages = [...chatMessages, { role: "user", content: userText.trim() }];
    setChatMessages(newMessages);
    setChatInput("");
    setChatBusy(true);
    try {
      // Build system prompt outside JSON.stringify to catch errors early
      const p = answers.companyProfile || tenantProfileRef.current;
      const companyCtx = p ? [
        p.name && `Company: ${p.name}`,
        p.vertical && `Industry: ${p.vertical}${p.subVertical ? ` — ${p.subVertical}` : ""}`,
        p.hq && `HQ: ${p.hq}`,
        p.publicPrivate && `Type: ${p.publicPrivate}${p.ticker ? ` (${p.ticker})` : ""}`,
        p.knownTechStack?.length && `Known tech stack: ${p.knownTechStack.join(", ")}`,
        p.regulatoryContext && `Regulatory obligations: ${p.regulatoryContext}`,
        p.description && `About: ${p.description}`,
      ].filter(Boolean).join("\n") : null;
      const systemPrompt = P_SCOPE_CHAT(companyCtx);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      const res = await fetch("/api/claude", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authUser?.id           && { "X-User-Id":    authUser.id }),
          ...(userProfile?.tenant_id  && { "X-Tenant-Id":  userProfile.tenant_id }),
          ...(sessionId              && { "X-Session-Id": sessionId }),
        },
        body: JSON.stringify({
          system: systemPrompt,
          user: newMessages.map(m => `${m.role === "user" ? "User" : "Pario"}: ${m.content}`).join("\n\n"),
          model: "claude-sonnet-4-6",
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const data = await res.json();

      // Handle API errors
      if (!res.ok || data.error) {
        const detail = data.error?.message || `HTTP ${res.status}`;
        console.error('[Pario] Chat API error:', detail, JSON.stringify(data).substring(0, 200));
        setChatMessages(prev => [...prev, { role: "assistant", content: "Something went wrong — please try again." }]);
        return;
      }

      console.log('[Pario] Chat API response ok, extracting reply...');

      // Extract text from content array
      const reply = (Array.isArray(data.content)
        ? data.content.filter(b => b.type === "text").map(b => b.text).join("")
        : (typeof data.content === "string" ? data.content : "")
      ).trim();

      if (!reply) {
        setChatMessages(prev => [...prev, { role: "assistant", content: "I didn't get a response — please try again." }]);
        return;
      }

      // DONE detection — catch DONE in any format followed by a JSON array
      console.log('[Pario] Raw reply first 300 chars:', reply?.substring(0, 300));
      const upperReply = reply.toUpperCase();
      const hasDone = upperReply.includes('DONE');
      const hasArray = reply.includes('[') && reply.includes(']');
      console.log('[Pario] hasDone:', hasDone, 'hasArray:', hasArray);

      if (hasDone && hasArray) {
        // Find the outermost JSON array — first [ to last ]
        const arrStart = reply.indexOf('[');
        const arrEnd = reply.lastIndexOf(']');
        if (arrStart !== -1 && arrEnd > arrStart) {
          try {
            const jsonStr = reply.substring(arrStart, arrEnd + 1);
            console.log('[Pario] Attempting JSON parse, length:', jsonStr.length);
            const bullets = JSON.parse(jsonStr);
            if (Array.isArray(bullets) && bullets.length > 0) {
              setScopeBullets(bullets);
              setChatCollapsed(true);
              setBulletsCollapsed(false);
              setContinuingChat(false);
              console.log('[Pario] DONE + array parsed, bullets:', bullets.length, '— firing scope generation');
              setTimeout(() => doGenerateScopeFromBullets(bullets), 100);
              return;
            }
          } catch(e) {
            console.log('[Pario] JSON parse failed:', e.message);
          }
        }
      }

      // Strip all markdown formatting from conversational replies
      const clean = reply
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/\*(.*?)\*/g, "$1")
        .replace(/`(.*?)`/g, "$1")
        .replace(/^#+\s+/gm, "")
        .trim();

      // If the reply accidentally contains conversation history, extract only the last Pario line
      const lines = clean.split("\n").filter(Boolean);
      const lastPario = [...lines].reverse().find(l => !l.startsWith("User:") && !l.startsWith("Pario:"));
      const finalContent = lastPario
        ? lastPario.replace(/^Pario:\s*/i, "").trim()
        : clean.replace(/^Pario:\s*/i, "").trim();

      setChatMessages(prev => [...prev, { role: "assistant", content: finalContent }]);
    } catch (e) {
      const msg = e.name === "AbortError" ? "Request timed out — please try again." : "Something went wrong — please try again.";
      setChatMessages(prev => [...prev, { role: "assistant", content: msg }]);
    } finally {
      setChatBusy(false);
    }
  };

  const doStartChat = async () => {
    const input = answers.freeform?.trim();
    if (!input) return;
    setScopeBullets([]); setBulletsApproved(false);
    setFormalScope(""); setScopeApproved(false); setScopeFlags([]); setExpertQuestions([]);
    setChatMessages([]);
    setInputCollapsed(true);
    await doSendChatMessage(input);
  };

  const doGenerateScopeFromBullets = async (bullets) => {
    console.log('[Pario] doGenerateScopeFromBullets called, bullets:', bullets.length);
    if (formalScope) setPrevScope(formalScope);
    setScopeBusy(true); setScopeErr(""); setScopeFlags([]); setScopeApproved(false);
    try {
      const identity = { userId: authUser?.id, tenantId: userProfile?.tenant_id, sessionId };
      const p = answers.companyProfile || tenantProfileRef.current;
      const companyCtx = p ? [
        p.name && `Company: ${p.name}`,
        p.vertical && `Industry: ${p.vertical}${p.subVertical ? ` — ${p.subVertical}` : ""}`,
        p.employeeCount && `Employees: ${p.employeeCount}`,
        p.hq && `HQ: ${p.hq}`,
        p.publicPrivate && `Type: ${p.publicPrivate}${p.ticker ? ` (${p.ticker})` : ""}`,
        p.knownTechStack?.length && `Known tech: ${p.knownTechStack.join(", ")}`,
        p.regulatoryContext && `Regulatory context: ${p.regulatoryContext}`,
      ].filter(Boolean).join("\n") : "";
      const bulletText = bullets.map(b => `• ${b}`).join("\n");
      const userMsg = companyCtx ? `${companyCtx}\n\nApproved scope bullets:\n${bulletText}` : `Scope bullets:\n${bulletText}`;
      console.log('[Pario] Calling callClaude for scope generation...');
      const scope = await callClaude(P_SCOPE_GENERATE, userMsg, false, null, identity);
      console.log('[Pario] Scope generated, length:', scope?.length);
      setFormalScope(scope.trim());
      setBulletsCollapsed(true);
      await doEvaluateScope(scope.trim());
    } catch(e) {
      console.error('[Pario] doGenerateScopeFromBullets error:', e.message);
      setScopeErr("Could not generate scope. Please try again.");
    }
    finally { setScopeBusy(false); }
  };

  const doGenerateScope = async () => {
    if (formalScope) setPrevScope(formalScope); // save previous version
    setScopeBusy(true); setScopeErr(""); setScopeFlags([]); setScopeApproved(false);
    try {
      const p = answers.companyProfile || tenantProfileRef.current;
      const companyCtx = p ? [
        p.name && `Company: ${p.name}`,
        p.vertical && `Industry: ${p.vertical}${p.subVertical ? ` — ${p.subVertical}` : ""}`,
        p.employeeCount && `Employees: ${p.employeeCount}`,
        p.hq && `HQ: ${p.hq}`,
        p.publicPrivate && `Type: ${p.publicPrivate}${p.ticker ? ` (${p.ticker})` : ""}`,
        p.knownTechStack?.length && `Known tech: ${p.knownTechStack.join(", ")}`,
        p.regulatoryContext && `Regulatory context: ${p.regulatoryContext}`,
      ].filter(Boolean).join("\n") : "";
      const bulletText = scopeBullets.length > 0
        ? scopeBullets.map(b => `• ${b}`).join("\n")
        : (answers.freeform || FIVE_WS.map(w => answers[w.key]).filter(Boolean).join("\n"));
      const userMsg = companyCtx ? `${companyCtx}\n\nApproved scope bullets:\n${bulletText}` : `Scope bullets:\n${bulletText}`;
      const scope = await callClaude(P_SCOPE_GENERATE, userMsg, false, null, getIdentity());
      setFormalScope(scope.trim());
      setBulletsCollapsed(true);
      await doEvaluateScope(scope.trim());
    } catch { setScopeErr("Could not generate scope. Please try again."); }
    finally { setScopeBusy(false); }
  };

  const doCompanyLookup = async (url) => {
    if (!url?.trim()) return;
    setCompanyLookupBusy(true); setCompanyLookupErr("");
    setAnswers(p => ({ ...p, companyProfile: null }));
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setCompanyLookupErr(data.error?.message || "Could not read that URL — try the homepage or about page.");
        return;
      }
      // Parse the profile JSON from the response
      const text = data.profile || "";
      const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      const candidate = fenceMatch ? fenceMatch[1].trim() : text;
      const objMatch = candidate.match(/\{[\s\S]*\}/);
      const profile = JSON.parse(objMatch ? objMatch[0] : candidate);
      setAnswers(p => ({ ...p, companyProfile: profile }));
    } catch {
      setCompanyLookupErr("Could not read that URL — try the homepage or about page.");
    } finally {
      setCompanyLookupBusy(false);
    }
  };

  const doEvaluateScope = async (scopeText) => {
    console.log('[Pario] doEvaluateScope entered, scope length:', scopeText?.length);
    try {
      const result = await callJSON(P_SCOPE_EVALUATE, `Scope to evaluate:\n\n${scopeText}`, false, null, getIdentity());
      console.log('[Pario] eval result — passed:', result?.passed, 'flags:', result?.flags?.length ?? 0);
      if (result.passed && result.flags.length === 0) {
        setScopeFlags([]);
        setFlagResponses({});
        // Fire expert questions
        try {
          const eq = await callJSON(P_SCOPE_EXPERT, `Scope:\n\n${scopeText}`, false, null, getIdentity());
          console.log('[Pario] expert questions returned:', eq?.length ?? 0);
          if (eq && eq.length > 0) {
            setExpertQuestions(eq);
            setExpertApproved(false);
          } else {
            console.log('[Pario] no expert questions — approving scope');
            setExpertApproved(true);
            setScopeApproved(true);
          }
        } catch (e) {
          console.log('[Pario] expert questions threw — approving scope (fail open):', e.message);
          setExpertApproved(true); // fail open
          setScopeApproved(true);
        }
      } else {
        console.log('[Pario] eval failed or has flags — awaiting user');
        setScopeFlags(result.flags || []);
        setFlagResponses({});
        setScopeApproved(false);
      }
    } catch (e) {
      console.log('[Pario] eval threw — approving scope (fail open):', e.message);
      setScopeFlags([]);
      setScopeApproved(true);
      logEvent("scope_approved", { sessionId, userId: authUser?.id, tenantId: userProfile?.tenant_id });
    }
  };

  const doSubmitExpertAnswers = async () => {
    setScopeBusy(true); setScopeErr("");
    try {
      const answered = expertQuestions.filter(q => {
        const r = expertResponses[q.question] || "";
        return r.trim().length > 0 && r.trim().toLowerCase() !== "skip";
      });
      if (answered.length === 0) {
        setExpertQuestions([]);
        setScopeApproved(true);
        setScopeBusy(false);
        return;
      }
      const additions = answered.map(q => `EXPERT QUESTION: ${q.question}\nUSER RESPONSE: ${expertResponses[q.question]}`).join("\n\n");
      const refined = await callClaude(P_SCOPE_REFINE, `EXISTING SCOPE:\n${formalScope}\n\nADDITIONAL INFORMATION:\n${additions}`, false, null, getIdentity());
      setFormalScope(refined.trim());
      setExpertQuestions([]);
      setExpertResponses({});
      // Re-evaluate the refined scope — keep iterating until it passes
      await doEvaluateScope(refined.trim());
    } catch { setScopeErr("Could not refine scope. Please try again."); }
    finally { setScopeBusy(false); }
  };

  const doRefineScope = async () => {
    setScopeBusy(true); setScopeErr("");
    try {
      const activeFlags = scopeFlags.filter((_, idx) => !isSkipped(flagResponses[idx] || ""));
      if (activeFlags.length === 0) { setScopeFlags([]); setScopeApproved(true); setScopeBusy(false); return; }
      const additions = scopeFlags.map((f, idx) => {
        const val = flagResponses[idx] || "";
        if (isSkipped(val)) return null;
        return `GAP: ${f.issue}\nUSER RESPONSE: ${val}`;
      }).filter(Boolean).join("\n\n");
      const refined = await callClaude(P_SCOPE_REFINE, `EXISTING SCOPE:\n${formalScope}\n\nADDITIONAL INFORMATION:\n${additions}`);
      setFormalScope(refined.trim()); setFlagResponses({});
      await doEvaluateScope(refined.trim());
    } catch { setScopeErr("Could not refine scope. Please try again."); }
    finally { setScopeBusy(false); }
  };

  // ── Requirements ──
  const doGenerateReqs = async () => {
    if (requirements.length) setPrevRequirements(requirements); // save previous version
    setReqsBusy(true); setReqsErr("");
    try {
      const arr = await callJSON(P_REQS, `Scope: ${formalScope}`, false, null, getIdentity());
      setRequirements(arr);
      logEvent("requirements_generated", { sessionId, userId: authUser?.id, tenantId: userProfile?.tenant_id, meta: { count: arr.length } });
    }
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
      const reqList = requirements.length > 0
        ? `\n\nFunctional requirements:\n${requirements.map(r => r.text).join("\n")}`
        : "";
      const userMsg = `Project scope:\n${formalScope}${reqList}`;
      const result = await callJSON(P_QS, userMsg, false, null, getIdentity());
      // Store as flat array under a "scope" key for compatibility
      setQuestions({ scope: result });
      logEvent("questions_generated", { sessionId, userId: authUser?.id, tenantId: userProfile?.tenant_id, meta: { count: result.length } });
    } catch (e) {
      console.error("Question generation error:", e);
      setQErr("Could not generate questions. Please try again.");
    }
    finally { setQBusy(false); }
  };

  const [reqDragId, setReqDragId] = useState(null);
  const [reqDragOverId, setReqDragOverId] = useState(null);

  const onReqDragStart = (id) => setReqDragId(id);
  const onReqDragOver = (e, id) => { e.preventDefault(); setReqDragOverId(id); };
  const onReqDrop = (e, targetId) => {
    e.preventDefault();
    if (!reqDragId || reqDragId === targetId) { setReqDragId(null); setReqDragOverId(null); return; }
    setRequirements(prev => {
      const arr = [...prev];
      const from = arr.findIndex(r => r.id === reqDragId);
      const to = arr.findIndex(r => r.id === targetId);
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return arr;
    });
    setReqDragId(null); setReqDragOverId(null);
  };
  const updateActivity = (id, field, val) => {
    setActivities(prev => {
      const arr = prev.map(a => {
        if (a.id !== id) return a;
        const next = { ...a, [field]: val };

        if (field === "startDate") {
          const dur = a.startDate && a.endDate ? calDaysBetween(a.startDate, a.endDate) : (a.offsetDays ?? 7);
          next.endDate = addCalDays(val, dur);
          next.startOffsetDays = rfpStart ? calDaysBetween(rfpStart, val) : 0;
          next.offsetDays = dur;
        }
        if (field === "endDate") {
          if (a.startDate) next.offsetDays = calDaysBetween(a.startDate, val);
        }
        if (field === "offsetDays") {
          if (a.startDate) next.endDate = addCalDays(a.startDate, parseInt(val) || 0);
        }
        return next;
      });

      // Cascade start/end date changes to children
      if (field === "startDate" || field === "endDate") {
        const parent = arr.find(a => a.id === id);
        const original = prev.find(a => a.id === id);
        if (parent && original) {
          const delta = field === "startDate"
            ? calDaysBetween(original.startDate, parent.startDate)
            : calDaysBetween(original.endDate, parent.endDate);

          if (delta !== 0) {
            return arr.map(a => {
              if (a.parentId !== id) return a;
              return {
                ...a,
                startDate: a.startDate ? addCalDays(a.startDate, delta) : a.startDate,
                endDate:   a.endDate   ? addCalDays(a.endDate,   delta) : a.endDate,
                startOffsetDays: rfpStart && a.startDate ? calDaysBetween(rfpStart, addCalDays(a.startDate, delta)) : a.startOffsetDays,
              };
            });
          }
        }
      }

      return arr;
    });
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
      const reqList = requirements.length > 0
        ? `\n\nFunctional requirements (${requirements.length} total):\n${requirements.map(r => r.text).join("\n")}`
        : "";
      const p = answers.companyProfile || tenantProfileRef.current;
      const companyCtx = p ? [
        p.name && `Company: ${p.name}`,
        p.vertical && `Industry: ${p.vertical}${p.subVertical ? ` — ${p.subVertical}` : ""}`,
        p.hq && `HQ: ${p.hq}`,
        p.regulatoryContext && `Regulatory obligations: ${p.regulatoryContext}`,
        p.description && `About: ${p.description}`,
      ].filter(Boolean).join("\n") : null;
      const userMsg = `Project scope:\n${formalScope}${reqList}`;
      const result = await callJSON(P_MARKET(companyCtx), userMsg, false, "claude-haiku-4-5-20251001", getIdentity());
      setVendors(result);
      // Auto-shortlist top 3 by requirements fit score
      const sorted = [...result].sort((a, b) => {
        const aScore = a.requirementsTotal > 0 ? a.requirementsMatch / a.requirementsTotal : 0;
        const bScore = b.requirementsTotal > 0 ? b.requirementsMatch / b.requirementsTotal : 0;
        if (bScore !== aScore) return bScore - aScore;
        const confOrder = { high: 3, medium: 2, low: 1 };
        return (confOrder[b.matchConfidence] || 0) - (confOrder[a.matchConfidence] || 0);
      });
      const autoStatus = {};
      sorted.forEach((v, i) => { autoStatus[v.name] = i < 3 ? "shortlisted" : null; });
      setVendorStatus(autoStatus);
      logEvent("market_research_run", { sessionId, userId: authUser?.id, tenantId: userProfile?.tenant_id, meta: { vendorCount: result.length } });
    } catch (e) {
      setMarketErr(`Market research failed: ${e.message}`);
    } finally {
      setMarketBusy(false);
    }
  };

  const doExtractTimelineDate = async () => {
    if (!scopeBullets.length && !formalScope) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const bulletText = scopeBullets.length > 0
        ? scopeBullets.map(b => `• ${b}`).join("\n")
        : formalScope;
      const result = await callJSON(P_TIMELINE_DATE, `Today's date: ${today}\n\nScope bullets:\n${bulletText}`, false, null, getIdentity());
      if (result.hasDate && result.targetDate) {
        setGoLive(result.targetDate);
        // Set RFx start to today if not already set
        if (!rfpStart) {
          setRfpStart(today);
        }
        if (result.defaultUsed) {
          setTimelineDefaulted(true);
        }
      } else {
        // Default to 90 days from today
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 90);
        setGoLive(defaultDate.toISOString().split('T')[0]);
        if (!rfpStart) setRfpStart(today);
        setTimelineDefaulted(true);
      }
    } catch (e) {
      // Silent fail — timeline can be set manually
      console.warn('Timeline date extraction failed:', e.message);
    }
  };

  const doGenerateNarrative = async () => {
    setNarrativeBusy(true);
    try {
      const bulletText = scopeBullets.length > 0
        ? `Scope bullets:\n${scopeBullets.map(b => `• ${b}`).join("\n")}`
        : `Scope:\n${formalScope}`;
      const timelineCtx = rfpStart && goLive
        ? `\n\nTimeline: Start ${new Date(rfpStart + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}, Go-live ${new Date(goLive + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} (${Math.round(calDaysBetween(rfpStart, goLive) / 7)} weeks)`
        : "";
      const shortlisted = vendors.filter(v => vendorStatus[v.name] === "shortlisted");
      const vendorCtx = vendors.length > 0 ? `\n\nVendor market: ${vendors.length} vendors identified${shortlisted.length > 0 ? `, ${shortlisted.length} shortlisted` : ""}. ${
        vendors.filter(v => v.estimatedPrice && v.estimatedPrice !== "Contact for pricing").map(v => v.estimatedPrice).slice(0, 3).join(", ")
      }${vendors.some(v => v.estimatedPrice) ? " estimated Year 1 cost range." : ""}` : "";
      const userMsg = `${bulletText}${timelineCtx}${vendorCtx}`;
      const result = await callClaude(P_NARRATIVE, userMsg, false, "claude-sonnet-4-5", getIdentity());
      setNarrative(result.trim());
      logEvent("narrative_generated", { sessionId, userId: authUser?.id, tenantId: userProfile?.tenant_id });
    } catch { /* silent fail */ }
    finally { setNarrativeBusy(false); }
  };

  // ── Auto-flow: trigger full cascade after scope approval ────
  const doAutoFlow = async () => {
    if (!formalScope) return;
    setAutoFlowing(true);
    try {
      // Run all steps — no view switching, overlay handles UX
      await doGenerateReqs();
      await doGenerateQuestions();
      await doExtractTimelineDate();
      await doMarketResearch();
      await doGenerateNarrative();
      setIsStale(false);
    } catch (e) {
      console.error("Auto-flow error:", e);
    } finally {
      setAutoFlowing(false);
      setView("summary");
    }
  };

  const StaleWarning = () => isStale ? (
    <div style={{ background: "#FFF7ED", border: "1px solid rgba(194,65,12,0.3)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 11, fontWeight: 600, color: "#C2410C", letterSpacing: ".06em" }}>
        ⚠ Initial description changed — this content may not reflect your latest input.
      </div>
      <button className="rq-btn-ghost" style={{ fontSize: 11, flexShrink: 0 }} onClick={doAutoFlow}>Regenerate all →</button>
    </div>
  ) : null;

  // ── Auto-generate on tab arrival (manual navigation only) ──
  useEffect(() => {
    if (autoFlowing) return; // auto-flow handles its own sequencing
    if (view === "summary" && formalScope && !narrative && !narrativeBusy) {
      doGenerateNarrative();
    }
  }, [view]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-trigger full flow when scope is approved ──────────
  useEffect(() => {
    console.log('[Pario] scopeApproved useEffect fired:', scopeApproved, 'formalScope:', !!formalScope, 'autoFlowing:', autoFlowing, 'narrative:', !!narrative);
    if (scopeApproved && formalScope && !autoFlowing && !narrative) {
      console.log('[Pario] Triggering doAutoFlow');
      setChatCollapsed(true);
      doAutoFlow();
    }
  }, [scopeApproved]); // eslint-disable-line react-hooks/exhaustive-deps

  // getIdentity defined earlier in component

  const doLogFeedback = (type, value) => {
    const setters = { scope: setScopeFeedback, requirements: setReqsFeedback, vendors: setVendorsFeedback };
    setters[type]?.(value);
    logEvent(`feedback_${value}`, { sessionId, userId: authUser?.id, tenantId: userProfile?.tenant_id, meta: { type } });
  };

  const toggleVendorStatus = (name, status) => {
    setVendorStatus(p => ({ ...p, [name]: p[name] === status ? null : status }));
  };

  // ── Export ──
  const doExport = async () => {
    setExportBusy(true); setExportErr("");
    try {
      await buildDocx({ sessionId, projectTitle, formalScope, narrative, requirements, questions, activities, rfpStart, goLive, vendors, vendorStatus, userProfile });
      await doSave("complete");
      logEvent("docx_exported", { sessionId, userId: authUser?.id, tenantId: userProfile?.tenant_id });
    } catch { setExportErr("Export failed. Please try again."); }
    finally { setExportBusy(false); }
  };

  const doExportPDF = async () => {
    setPdfBusy(true);
    try {
      const shortlisted = vendors.filter(v => vendorStatus[v.name] === "shortlisted");
      const logoUrl = userProfile?.tenant_config?.logo_url ||
        (userProfile?.tenant_config?.website_url
          ? `https://logo.clearbit.com/${new URL(userProfile.tenant_config.website_url).hostname}`
          : 'https://www.planwithpario.com/pario-logo.png');

      // Build PDF HTML content
      const timelineStr = rfpStart && goLive
        ? `${new Date(rfpStart + 'T00:00:00').toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} → ${new Date(goLive + 'T00:00:00').toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} (${Math.round(calDaysBetween(rfpStart, goLive) / 7)} weeks)`
        : 'Dates not set';

      const cleanScope = formalScope
        .replace(/^#{1,3}\s+/gm, '')
        .replace(/^[-*]\s+/gm, '')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .trim();

      const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 11pt; color: #1E293B; background: white; }
  .page { padding: 48px 56px; max-width: 800px; margin: 0 auto; }
  .cover { min-height: 100vh; display: flex; flex-direction: column; justify-content: space-between; padding: 64px 56px; }
  .cover-logo { height: 36px; object-fit: contain; object-position: left; }
  .cover-title { font-size: 32pt; font-weight: 700; color: #1E293B; letter-spacing: -0.02em; margin-bottom: 12px; line-height: 1.1; }
  .cover-sub { font-size: 13pt; color: #64748B; margin-bottom: 8px; }
  .cover-date { font-size: 10pt; color: #94A3B8; }
  .cover-tag { display: inline-block; font-size: 9pt; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: #C2410C; background: #FFF7ED; padding: 4px 10px; border-radius: 4px; margin-bottom: 24px; }
  h1 { font-size: 16pt; font-weight: 700; color: #1E293B; margin: 32px 0 12px; padding-bottom: 6px; border-bottom: 2px solid #C2410C; }
  h2 { font-size: 12pt; font-weight: 700; color: #334155; margin: 20px 0 8px; }
  p { font-size: 11pt; line-height: 1.7; color: #374151; margin-bottom: 10px; }
  .req-row { display: flex; gap: 12px; padding: 8px 0; border-bottom: 1px solid #F1F5F9; }
  .req-id { font-size: 9pt; font-weight: 700; color: #C2410C; min-width: 40px; padding-top: 2px; }
  .req-text { font-size: 10pt; color: #374151; line-height: 1.5; }
  .vendor-card { border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px 16px; margin-bottom: 12px; }
  .vendor-name { font-size: 12pt; font-weight: 700; color: #1E293B; }
  .vendor-cat { font-size: 9pt; color: #94A3B8; margin-bottom: 6px; }
  .vendor-desc { font-size: 10pt; color: #374151; line-height: 1.5; margin-bottom: 8px; }
  .vendor-price { font-size: 10pt; font-weight: 600; color: #1E293B; background: #F8FAFC; padding: 5px 10px; border-radius: 4px; display: inline-block; }
  .timeline-row { display: flex; gap: 16px; margin-bottom: 12px; }
  .timeline-box { flex: 1; border: 1px solid #E2E8F0; border-radius: 6px; padding: 10px 14px; }
  .timeline-label { font-size: 8pt; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #94A3B8; margin-bottom: 4px; }
  .timeline-val { font-size: 11pt; font-weight: 600; color: #1E293B; }
  .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #E2E8F0; display: flex; justify-content: space-between; align-items: center; }
  .footer-brand { font-size: 9pt; color: #94A3B8; }
  .footer-date { font-size: 9pt; color: #94A3B8; }
  .disclaimer { font-size: 8pt; color: #94A3B8; margin-top: 16px; line-height: 1.5; }
  @media print { .page-break { page-break-before: always; } }
</style>
</head>
<body>

<!-- COVER PAGE -->
<div class="cover">
  <div>
    <img src="${logoUrl}" class="cover-logo" onerror="this.src='https://www.planwithpario.com/pario-logo.png'" />
  </div>
  <div>
    <div class="cover-tag">Software Evaluation Brief</div>
    <div class="cover-title">${projectTitle || "Untitled Project"}</div>
    <div class="cover-sub">${userProfile?.tenant_config?.company_name || userProfile?.tenant_config?.brand_name || ""}</div>
    <div class="cover-date">Generated ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>
  </div>
  <div style="font-size: 9pt; color: #94A3B8;">Prepared with Pario · planwithpario.com</div>
</div>

<!-- CONTENT -->
<div class="page page-break">

  <h1>Business Case</h1>
  ${narrative ? narrative.split(/\n+/).filter(Boolean).map(p => `<p>${p}</p>`).join('') : '<p>Narrative not yet generated.</p>'}

  <h1>Project Scope</h1>
  ${cleanScope.split(/\n+/).filter(Boolean).map(p => `<p>${p}</p>`).join('')}

  <h1>Functional Requirements</h1>
  ${requirements.length > 0
    ? requirements.map(r => `<div class="req-row"><div class="req-id">${r.id}</div><div class="req-text">${r.text}</div></div>`).join('')
    : '<p>No requirements generated.</p>'
  }

  <h1>Vendor Shortlist</h1>
  ${shortlisted.length > 0
    ? shortlisted.map(v => `
      <div class="vendor-card">
        <div class="vendor-name">${v.name}</div>
        <div class="vendor-cat">${v.category}</div>
        <div class="vendor-desc">${v.description}</div>
        ${v.estimatedPrice ? `<span class="vendor-price">${v.estimatedPrice} · ${v.pricingModel || ''}</span>` : ''}
      </div>`).join('')
    : '<p>No vendors shortlisted.</p>'
  }

  <h1>Buying Timeline</h1>
  <div class="timeline-row">
    <div class="timeline-box">
      <div class="timeline-label">RFx Start</div>
      <div class="timeline-val">${rfpStart ? new Date(rfpStart + 'T00:00:00').toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : '—'}</div>
    </div>
    <div class="timeline-box">
      <div class="timeline-label">Go-Live</div>
      <div class="timeline-val">${goLive ? new Date(goLive + 'T00:00:00').toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : '—'}</div>
    </div>
    <div class="timeline-box">
      <div class="timeline-label">Duration</div>
      <div class="timeline-val">${rfpStart && goLive ? Math.round(calDaysBetween(rfpStart, goLive) / 7) + ' weeks' : '—'}</div>
    </div>
  </div>
  ${timelineDefaulted ? '<p style="font-size:9pt;color:#C2410C;margin-top:8px;">⚠ Timeline defaulted to 90 days — no deadline was provided during intake. Verify before sharing.</p>' : ''}

  <div class="disclaimer">
    Vendor pricing estimates are AI-generated based on publicly available market data and should be verified directly with vendors before use in budget planning or executive presentations.
    ${timelineDefaulted ? ' Timeline end date was defaulted to 90 days from session date as no deadline was provided.' : ''}
  </div>

  <div class="footer">
    <div class="footer-brand">Prepared with Pario · planwithpario.com</div>
    <div class="footer-date">${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>
  </div>

</div>
</body>
</html>`;

      // Open in new window and trigger print to PDF
      const win = window.open('', '_blank');
      win.document.write(html);
      win.document.close();
      win.onload = () => { win.print(); };
      logEvent("pdf_exported", { sessionId, userId: authUser?.id, tenantId: userProfile?.tenant_id });
    } catch (e) {
      console.error('PDF export failed:', e);
    } finally {
      setPdfBusy(false);
    }
  };

  const pct = (step / 3) * 100;
  const NAV_VIEWS = ["scope", "requirements", "questions", "market", "timeline", "summary"];
  const NAV_LABELS = ["The Problem", "Differentiators", "Pressure Test", "The Landscape", "The Plan", "Executive Brief"];
  const answeredReqs = Object.keys(questions).length;
  const allQuestions = questions.scope || Object.values(questions).flat();
  const openQ = allQuestions.filter(q => q.type === "open_ended").length;
  const mcQ = allQuestions.filter(q => q.type === "multiple_choice").length;

  const topbarTitles = {
    splash: "Home", sessions: "Projects",
    scope: "Scope", requirements: "Requirements", questions: "Questions",
    market: "Market Research", timeline: "Timeline", summary: "Summary",
  };
  const topbarSubs = {
    splash: "Pario", sessions: "All projects",
    scope: projectTitle || "Untitled project",
    requirements: projectTitle || "Untitled project",
    questions: projectTitle || "Untitled project",
    market: (projectTitle || "Untitled project") + " ",
    timeline: projectTitle || "Untitled project",
    summary: (projectTitle || "Untitled project") + " ",
  };

  // Redirect splash to scope in new consumer UI
  useEffect(() => {
    if (view === "splash") setView("scope");
  }, [view]);

  // ── Auth loading ──
  if (authLoading) {
    return (
      <div className="rq-root" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader size={24} className="spin" style={{ color: "#C2410C" }} />
      </div>
    );
  }

  // ── Login screen ──
  if (!authUser) {
    return <LoginScreen onUnconfirmed={() => setEmailUnconfirmed(true)} />;
  }

  // ── Email not confirmed ──
  if (emailUnconfirmed) {
    return (
      <div className="rq-root" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: 400, padding: "0 24px", textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📬</div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: "#111827", marginBottom: 8 }}>Check your email</div>
          <div style={{ fontFamily: "'Lora',serif", fontSize: 14, color: "#6B7280", lineHeight: 1.7, marginBottom: 24 }}>We sent you a confirmation link. Click it to activate your account, then come back and sign in.</div>
          <button className="rq-btn-ghost" onClick={() => setEmailUnconfirmed(false)}>Back to sign in</button>
        </div>
      </div>
    );
  }

  // ── First login — profile setup ──
  if (authUser && userProfile !== null && !userProfile?.name) {
    return <ProfileSetupScreen onComplete={(profile) => setUserProfile(p => ({ ...p, ...profile }))} />;
  }

  // ── Shared sidebar ──
  // ── Output panel step indicator ──────────────────────────
  const outputSteps = [
    { key: "problem", label: "Problem", done: !!formalScope },
    { key: "differentiators", label: "Differentiators", done: requirements.length > 0 },
    { key: "vendors", label: "Vendors", done: vendors.length > 0 },
    { key: "plan", label: "Plan", done: !!narrative },
  ];

  const activeStep = outputSteps.filter(s => s.done).length;

  // ── Advanced drawer (replaces sidebar) ───────────────────
  const advancedDrawer = (
    <>
      <div className={`rq-drawer-overlay ${sidebarOpen ? "open" : ""}`} onClick={() => setSidebarOpen(false)} />
      <div className={`rq-drawer ${sidebarOpen ? "open" : ""}`}>
        <div className="rq-drawer-header">
          <div className="rq-drawer-title">Workspace</div>
          <button className="rq-drawer-close" onClick={() => setSidebarOpen(false)}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>
        <div className="rq-nav">
          {NAV_VIEWS.map((v, i) => {
            const locked = !formalScope && v !== "scope";
            return (
              <div key={v}
                className={`rq-nav-item ${view === v ? "active" : ""}`}
                onClick={() => { if (!locked) { setView(v); setSidebarOpen(false); } }}
                style={{ opacity: locked ? 0.35 : 1, cursor: locked ? "default" : "pointer" }}
              >
                <div className="rq-nav-num">{i + 1}</div>
                {NAV_LABELS[i]}
              </div>
            );
          })}
          <div style={{ height: 1, background: "rgba(0,0,0,0.07)", margin: "10px 0" }} />
          <div className={`rq-nav-item ${view === "sessions" ? "active" : ""}`} onClick={() => { setView("sessions"); setSidebarOpen(false); }}>
            <div className="rq-nav-num" style={{ fontSize: 8 }}>S</div>Projects
          </div>
        </div>
        {authUser && (
          <div className="rq-drawer-footer">
            <div
              onClick={() => { setProfileEditName(userProfile?.name || ""); setProfileEditTitle(userProfile?.title || ""); setShowProfileModal(true); setSidebarOpen(false); }}
              style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "6px 8px", borderRadius: 6 }}
            >
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#FFF7ED", border: "1px solid #FDBA74", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 10, fontWeight: 700, color: "#C2410C" }}>
                  {(userProfile?.name || authUser?.email || "?").charAt(0).toUpperCase()}
                </span>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 11, fontWeight: 600, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {userProfile?.name || authUser?.email?.split("@")[0] || "Profile"}
                </div>
                {userProfile?.title && <div style={{ fontSize: 10, color: "#9CA3AF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userProfile.title}</div>}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );

  // ── Output panel content ──────────────────────────────────
  const outputContent = (() => {
    // Empty state — before intake starts
    if (!formalScope && !autoFlowing && chatMessages.length < 2) {
      return (
        <div className="rq-output-empty">
          <div className="rq-output-empty-icon">📋</div>
          <div className="rq-output-empty-title">Your business case will appear here</div>
          <div className="rq-output-empty-sub">Answer Pario's questions and your evaluation package will build as you go.</div>
        </div>
      );
    }

    return (
      <>
        {/* Problem statement — appears after scope approved */}
        {formalScope && (
          <div className="rq-output-card">
            <div className="rq-output-card-label">The problem</div>
            <div className="rq-output-card-body" style={{ whiteSpace: "pre-wrap" }}>
              {formalScope.replace(/^#{1,3}\s+/gm, '').replace(/^[-*]\s+/gm, '').replace(/\*\*(.*?)\*\*/g, '$1').trim()}
            </div>
          </div>
        )}

        {/* Differentiators — appears after requirements generated */}
        {(requirements.length > 0 || reqsBusy) && (
          <div className="rq-output-card">
            <div className="rq-output-card-label">What differentiates the right solution</div>
            {reqsBusy ? (
              <div className="rq-output-building">
                <div className="rq-output-building-dot" />
                <div className="rq-output-building-text">Identifying differentiators…</div>
              </div>
            ) : requirements.length === 0 ? (
              <div className="rq-output-card-body" style={{ fontStyle: "italic" }}>No clear differentiators found for this category — market data is limited. See Pressure Test for vendor questions.</div>
            ) : (
              <div style={{ marginTop: 4 }}>
                {requirements.map((r, i) => (
                  <div key={r.id} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: i < requirements.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
                    <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 9, fontWeight: 700, color: "#C2410C", minWidth: 32, paddingTop: 2 }}>{r.id}</div>
                    <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.6 }}>{r.text}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Vendor comparison — appears after market research */}
        {(vendors.length > 0 || marketBusy) && (
          <div className="rq-output-card">
            <div className="rq-output-card-label">Vendor comparison</div>
            {marketBusy ? (
              <div className="rq-output-building">
                <div className="rq-output-building-dot" />
                <div className="rq-output-building-text">Researching the market…</div>
              </div>
            ) : (
              <>
                {requirements.length > 0 && vendors.length > 0 ? (
                  <div style={{ overflowX: "auto" }}>
                    <table className="rq-diff-table">
                      <thead>
                        <tr>
                          <th style={{ width: "35%" }}>Differentiator</th>
                          {vendors.filter(v => vendorStatus[v.name] === "shortlisted").slice(0, 3).map(v => (
                            <th key={v.name}>{v.name}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {requirements.map(r => (
                          <tr key={r.id}>
                            <td style={{ fontSize: 11, color: "#374151" }}>{r.text}</td>
                            {vendors.filter(v => vendorStatus[v.name] === "shortlisted").slice(0, 3).map(v => {
                              const score = v.requirementsMatch / (v.requirementsTotal || 1);
                              return (
                                <td key={v.name} style={{ textAlign: "center" }}>
                                  <span className={score > 0.6 ? "rq-diff-check" : "rq-diff-cross"}>
                                    {score > 0.6 ? "✓" : "✗"}
                                  </span>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  vendors.filter(v => vendorStatus[v.name] === "shortlisted").map(v => (
                    <div key={v.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                      <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700, color: "#111827" }}>{v.name}</div>
                      <div style={{ fontSize: 11, color: "#9CA3AF" }}>{v.category}</div>
                    </div>
                  ))
                )}
                {/* Cost range */}
                {vendors.length > 0 && (() => {
                  const prices = vendors.filter(v => v.estimatedPrice).map(v => {
                    const m = v.estimatedPrice?.match(/[\d,]+/g);
                    return m ? parseInt(m[0].replace(/,/g, '')) : null;
                  }).filter(Boolean);
                  if (prices.length < 2) return null;
                  const low = Math.min(...prices);
                  const high = Math.max(...prices);
                  return (
                    <div className="rq-cost-band">
                      <div>
                        <div className="rq-cost-label">Market pricing range</div>
                        <div className="rq-cost-range">${(low/1000).toFixed(0)}K – ${(high/1000).toFixed(0)}K <span style={{ fontSize: 13, fontWeight: 400, color: "#9CA3AF" }}>/ yr</span></div>
                      </div>
                      <div style={{ fontSize: 10, color: "#9CA3AF", fontStyle: "italic", marginLeft: "auto", maxWidth: 160, textAlign: "right" }}>AI estimate — verify with vendors</div>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        )}

        {/* Timeline — appears after date extraction */}
        {(rfpStart && goLive) && (
          <div className="rq-output-card">
            <div className="rq-output-card-label">The plan</div>
            {timelineDefaulted && (
              <div style={{ fontSize: 11, color: "#C2410C", marginBottom: 8, fontFamily: "'Syne',sans-serif" }}>⚠ No deadline provided — defaulted to 90 days. Adjust in The Plan tab.</div>
            )}
            <div className="rq-tl-row">
              <div className="rq-tl-box">
                <div className="rq-tl-label">Start</div>
                <div className="rq-tl-val">{new Date(rfpStart + 'T00:00:00').toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
              </div>
              <div className="rq-tl-box">
                <div className="rq-tl-label">Go-live</div>
                <div className="rq-tl-val">{new Date(goLive + 'T00:00:00').toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
              </div>
              <div className="rq-tl-box">
                <div className="rq-tl-label">Duration</div>
                <div className="rq-tl-val">{Math.round(calDaysBetween(rfpStart, goLive) / 7)}w</div>
              </div>
            </div>
          </div>
        )}

        {/* Narrative — appears after auto-flow completes */}
        {(narrative || narrativeBusy) && (
          <div className="rq-output-card">
            <div className="rq-output-card-label">Business case</div>
            {narrativeBusy ? (
              <div className="rq-output-building">
                <div className="rq-output-building-dot" />
                <div className="rq-output-building-text">Writing business case…</div>
              </div>
            ) : (
              <div className="rq-output-card-body" style={{ whiteSpace: "pre-line" }}>{narrative}</div>
            )}
          </div>
        )}
      </>
    );
  })();

  const sidebarNav = advancedDrawer;
  const topbar = null;

  return (
    <div className="rq-root" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>

      {/* ── Profile modal ── */}
      {showProfileModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "#FFFFFF", borderRadius: 16, padding: "28px 28px 24px", width: "100%", maxWidth: 360, boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 20 }}>Edit profile</div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: ".15em", textTransform: "uppercase", color: "#9CA3AF", marginBottom: 6 }}>Name</div>
              <input className="rq-input" value={profileEditName} onChange={e => setProfileEditName(e.target.value)} placeholder="Your name" />
            </div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: ".15em", textTransform: "uppercase", color: "#9CA3AF", marginBottom: 6 }}>Title <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span></div>
              <input className="rq-input" value={profileEditTitle} onChange={e => setProfileEditTitle(e.target.value)} placeholder="Your title" />
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="rq-btn-ghost" style={{ fontSize: 12 }} onClick={signOut}>Sign out</button>
              <button className="rq-btn-ghost" style={{ fontSize: 12 }} onClick={() => setShowProfileModal(false)}>Cancel</button>
              <button className="rq-btn-primary" style={{ fontSize: 12 }} disabled={profileSaving || !profileEditName.trim()} onClick={async () => { setProfileSaving(true); const ok = await saveUserProfile({ name: profileEditName.trim(), title: profileEditTitle.trim(), role: userProfile?.role || "buyer" }); if (ok) { setUserProfile(p => ({ ...p, name: profileEditName.trim(), title: profileEditTitle.trim() })); setShowProfileModal(false); } setProfileSaving(false); }}>
                {profileSaving ? <><Loader size={11} className="spin" /> Saving…</> : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Advanced drawer ── */}
      {advancedDrawer}

      {/* ── Sessions view ── */}
      {view === "sessions" && (
        <div className="rq-content" style={{ maxWidth: 720, margin: "0 auto", width: "100%", padding: "32px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>Projects</div>
            <button className="rq-btn-ghost" onClick={() => setView("scope")}><ArrowLeft size={11} /> Back</button>
          </div>
          {sessionsLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[1,2,3].map(i => <div key={i} className="rq-skeleton" style={{ height: 64, borderRadius: 10 }} />)}
            </div>
          ) : sessions.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 24px", color: "#9CA3AF", fontFamily: "'Lora',serif", fontSize: 14 }}>No saved projects yet.</div>
          ) : (
            sessions.map(s => (
              <div key={s.id} onClick={() => loadSession(s)} style={{ background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 10, padding: "14px 18px", marginBottom: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", transition: "border-color .15s" }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(194,65,12,0.3)"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(0,0,0,0.07)"}
              >
                <div>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 3 }}>{s.project_title || "Untitled project"}</div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#9CA3AF" }}>{new Date(s.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · {s.status || "draft"}</div>
                </div>
                <ChevronRight size={14} style={{ color: "#9CA3AF" }} />
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Main app shell ── */}
      {view !== "sessions" && view !== "splash" && (
        <div style={{ display: "flex", flex: 1, minHeight: 0 }}>

          {/* ── Pill nav ── */}
          <div style={{ width: 52, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 0 16px", gap: 0, background: "#FFFFFF", borderRight: "1px solid rgba(0,0,0,0.06)" }}>
            {/* Logo mark */}
            <div style={{ marginBottom: 16, cursor: "pointer" }} onClick={() => { setProfileEditName(userProfile?.name || ""); setProfileEditTitle(userProfile?.title || ""); setShowProfileModal(true); }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#FFF7ED", border: "1px solid #FDBA74", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 10, fontWeight: 700, color: "#C2410C" }}>
                  {(userProfile?.name || authUser?.email || "P").charAt(0).toUpperCase()}
                </span>
              </div>
            </div>

            {NAV_VIEWS.map((v, i) => {
              const isActive = view === v;
              const isDone = NAV_VIEWS.indexOf(view) > i || (scopeApproved && i === 0);
              const isLocked = !formalScope && v !== "scope";
              return (
                <div key={v} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  {i > 0 && <div style={{ width: 1, height: 8, background: isDone ? "#FDBA74" : "rgba(0,0,0,0.08)" }} />}
                  <div
                    onClick={() => { if (!isLocked) { setView(v); setSidebarOpen(false); } }}
                    title={NAV_LABELS[i]}
                    style={{
                      width: 36, borderRadius: 20, padding: "8px 0",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                      cursor: isLocked ? "default" : "pointer",
                      border: `0.5px solid ${isActive ? "#1E293B" : isDone ? "#FDBA74" : "rgba(0,0,0,0.1)"}`,
                      background: isActive ? "#1E293B" : isDone ? "#FFF7ED" : "#F9F8F8",
                      opacity: isLocked ? 0.3 : 1,
                      transition: "all .2s",
                    }}
                  >
                    <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 10, fontWeight: 700, color: isActive ? "#FFFFFF" : isDone ? "#C2410C" : "#9CA3AF" }}>{i + 1}</div>
                    <div style={{ width: 4, height: 4, borderRadius: "50%", background: isActive ? "#C2410C" : isDone ? "#FDBA74" : "rgba(0,0,0,0.15)" }} />
                  </div>
                </div>
              );
            })}

            {/* Bottom actions */}
            <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
              <button title="Projects" onClick={() => setView("sessions")} style={{ width: 32, height: 32, borderRadius: 8, border: "0.5px solid rgba(0,0,0,0.1)", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#9CA3AF" }}>
                <FileText size={13} />
              </button>
              <button title="New project" onClick={() => { if (formalScope || chatMessages.length > 0) { if (!window.confirm("Start a new project?")) return; } resetSession(); setView("scope"); setChatCollapsed(false); }} style={{ width: 32, height: 32, borderRadius: 8, border: "0.5px solid rgba(0,0,0,0.1)", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#9CA3AF" }}>
                <Plus size={13} />
              </button>
            </div>
          </div>

          {/* ── Main content ── */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, background: "#F9F8F8" }}>

            {/* Top bar */}
            <div style={{ background: "#FFFFFF", borderBottom: "1px solid rgba(0,0,0,0.06)", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 800, color: "#1E293B", letterSpacing: "-0.02em" }}>
                Pario<span style={{ color: "#C2410C" }}>.</span>
                {tenantBrandName && <span style={{ fontSize: 11, fontWeight: 400, color: "#9CA3AF", marginLeft: 10 }}>{tenantBrandName}</span>}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {saveStatus === "saving" && <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#D97706" }}>Saving…</span>}
                {saveStatus === "saved" && <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#C2410C" }}>Saved</span>}
                {narrative && (
                  <>
                    <button className="rq-btn-ghost" style={{ fontSize: 11 }} onClick={doExportPDF} disabled={pdfBusy}>
                      {pdfBusy ? <><Loader size={11} className="spin" /> Generating…</> : <><FileText size={11} /> Export PDF</>}
                    </button>
                    <button className="rq-btn-ghost" style={{ fontSize: 11 }} onClick={doExport} disabled={exportBusy}>
                      {exportBusy ? <><Loader size={11} className="spin" /></> : <><FileText size={11} /> .docx</>}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* ── Auto-flow loading screen ── */}
            {autoFlowing && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 24px", background: "#FFFFFF" }}>
                <Loader size={32} className="spin" style={{ color: "#C2410C", marginBottom: 24 }} />
                <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 800, color: "#1E293B", letterSpacing: "-0.02em", marginBottom: 10, textAlign: "center" }}>
                  Asking the hard questions so you don't have to.
                </div>
                <div style={{ fontFamily: "'Lora',serif", fontSize: 14, color: "#9CA3AF", textAlign: "center", maxWidth: 400, lineHeight: 1.7, marginBottom: 40 }}>
                  Building your requirements, researching vendors, and writing your business case.
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", maxWidth: 360 }}>
                  {[
                    { label: "Identifying differentiators", done: requirements.length > 0 },
                    { label: "Generating pressure test questions", done: questions.scope?.length > 0 },
                    { label: "Researching the market", done: vendors.length > 0 },
                    { label: "Setting the timeline", done: !!rfpStart },
                    { label: "Writing your business case", done: !!narrative },
                  ].map((step, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", background: step.done ? "#F0FDF4" : "#F9F8F8", border: `1px solid ${step.done ? "#BBF7D0" : "rgba(0,0,0,0.06)"}`, borderRadius: 10, transition: "all .3s" }}>
                      <div style={{ width: 18, height: 18, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: step.done ? "#22C55E" : "#E5E7EB", flexShrink: 0 }}>
                        {step.done ? <span style={{ color: "white", fontSize: 10, fontWeight: 700 }}>✓</span> : <Loader size={9} className="spin" style={{ color: "#9CA3AF" }} />}
                      </div>
                      <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 12, fontWeight: 600, color: step.done ? "#15803D" : "#9CA3AF" }}>{step.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Main scrollable content ── */}
            {!autoFlowing && (
              <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", maxWidth: 760, margin: "0 auto", width: "100%" }}>

                {/* ── CHAT BLOCK ── */}
                {!chatCollapsed ? (
                  <div style={{ background: "#FFFFFF", borderRadius: 16, border: "1px solid rgba(0,0,0,0.07)", marginBottom: 16, overflow: "hidden" }}>
                    <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(0,0,0,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "#C2410C" }}>The problem</div>
                      {saveStatus === "saving" && <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#D97706" }}>Saving…</span>}
                    </div>

                    {/* Messages */}
                    <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 10, minHeight: 120 }} id="chat-messages">
                      {chatMessages.length === 0 && !chatBusy && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#9CA3AF" }}>Pario</div>
                          <div style={{ background: "#F9F8F8", border: "1px solid rgba(0,0,0,0.06)", borderRadius: "0 10px 10px 10px", padding: "11px 14px", fontSize: 13, lineHeight: 1.65, maxWidth: "88%", fontFamily: "'Lora',serif", color: "#111827" }}>
                            {tenantBrandName ? `Welcome${userProfile?.name ? `, ${userProfile.name.split(' ')[0]}` : ""}. ` : ""}What's the business problem you're trying to solve — and how do you think software can help?
                          </div>
                        </div>
                      )}
                      {/* DEV ONLY: Skip chat button */}
                      {chatMessages.length === 0 && !chatBusy && (
                        <div style={{ marginTop: 8 }}>
                          <button
                            className="rq-btn-ghost"
                            style={{ fontSize: 10, opacity: 0.5 }}
                            onClick={() => {
                              const testBullets = [
                                "Business problem: Manual contract management process — legal reviewing everything via email, deals slipping before Q3 close",
                                "Software case: CLM platform to centralize contract lifecycle, reduce review time, and provide audit trail",
                                "Sponsor: General Counsel. ~40 users across legal and sales",
                                "Integration required: Salesforce (CRM). SOX compliance — audit trails required",
                                "Budget: ~$100K annually",
                                "Success: Legal processing contracts in system instead of email by Q3. Out of scope: e-signature replacement"
                              ];
                              setScopeBullets(testBullets);
                              setChatCollapsed(true);
                              doGenerateScopeFromBullets(testBullets);
                            }}
                          >
                            [DEV] Skip chat →
                          </button>
                        </div>
                      )}
                      {chatMessages.map((m, i) => (
                        <div key={i} style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
                          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#9CA3AF" }}>
                            {m.role === "user" ? (userProfile?.name?.split(' ')[0] || "You") : "Pario"}
                          </div>
                          <div style={{
                            background: m.role === "user" ? "#1E293B" : "#F9F8F8",
                            color: m.role === "user" ? "#F8FAFC" : "#111827",
                            border: m.role === "user" ? "none" : "1px solid rgba(0,0,0,0.06)",
                            borderRadius: m.role === "user" ? "10px 10px 0 10px" : "0 10px 10px 10px",
                            padding: "11px 14px", fontSize: 13, lineHeight: 1.65,
                            maxWidth: "88%", fontFamily: "'Lora',serif", whiteSpace: "pre-wrap"
                          }}>{m.content}</div>
                        </div>
                      ))}
                      {chatBusy && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#9CA3AF" }}>Pario</div>
                          <div style={{ background: "#F9F8F8", border: "1px solid rgba(0,0,0,0.06)", borderRadius: "0 10px 10px 10px", padding: "11px 14px", fontSize: 13, maxWidth: "88%" }}>
                            <Loader size={12} className="spin" style={{ color: "#9CA3AF" }} />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Scope approved CTA */}
                    {scopeApproved && !autoFlowing && (
                      <div style={{ padding: "12px 18px", background: "#FFF7ED", borderTop: "1px solid rgba(194,65,12,0.15)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                        <div style={{ fontFamily: "'Lora',serif", fontSize: 13, color: "#92400E", fontStyle: "italic" }}>Got it, take a break while I get some work done</div>
                        <button className="rq-btn-primary" style={{ flexShrink: 0 }} onClick={() => { setChatCollapsed(true); doAutoFlow(); }}>
                          Build business case →
                        </button>
                      </div>
                    )}

                    {/* Chat input */}
                    {!scopeApproved && (
                      <div style={{ padding: "10px 18px", borderTop: "1px solid rgba(0,0,0,0.07)", display: "flex", gap: 8, alignItems: "flex-end" }}>
                        <textarea
                          style={{ flex: 1, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 10, padding: "10px 13px", fontSize: 13, resize: "none", minHeight: 42, maxHeight: 120, background: "#F9F8F8", color: "#111827", fontFamily: "'Lora',serif", outline: "none", lineHeight: 1.5 }}
                          placeholder={chatBusy ? "Pario is thinking…" : "Reply to Pario…"}
                          value={chatInput}
                          disabled={chatBusy}
                          onChange={e => setChatInput(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (chatInput.trim() && !chatBusy) doSendChatMessage(chatInput); }}}
                          rows={1}
                        />
                        <button
                          onClick={() => doSendChatMessage(chatInput)}
                          disabled={chatBusy || !chatInput.trim()}
                          style={{ width: 38, height: 38, background: chatInput.trim() ? "#1E293B" : "#E5E7EB", border: "none", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: chatInput.trim() ? "pointer" : "default", flexShrink: 0, transition: "background .15s" }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill={chatInput.trim() ? "white" : "#9CA3AF"}><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Chat collapsed */
                  <div style={{ background: "#FFFFFF", borderRadius: 12, border: "1px solid rgba(0,0,0,0.07)", marginBottom: 16, padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
                    onClick={() => setChatCollapsed(false)}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22C55E" }} />
                      <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 11, fontWeight: 700, color: "#374151" }}>
                        {projectTitle || "Scope captured"}
                      </div>
                    </div>
                    <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 10, color: "#9CA3AF" }}>Tap to review ↓</div>
                  </div>
                )}

                {/* ── OUTPUT ── appears after auto-flow */}
                {narrative && !autoFlowing && (
                  <>
                    {/* Success banner */}
                    <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 12, padding: "14px 18px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#22C55E", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span style={{ color: "white", fontSize: 11, fontWeight: 700 }}>✓</span>
                      </div>
                      <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700, color: "#15803D" }}>
                        Your business case is ready. Go get that alignment!
                      </div>
                    </div>

                    {/* Business case narrative */}
                    <div style={{ background: "#FFFFFF", borderRadius: 16, border: "1px solid rgba(0,0,0,0.07)", padding: "22px 24px", marginBottom: 14 }}>
                      <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: ".15em", textTransform: "uppercase", color: "#C2410C", marginBottom: 10 }}>Business case</div>
                      <div style={{ fontFamily: "'Lora',serif", fontSize: 14, lineHeight: 1.8, color: "#374151", whiteSpace: "pre-line" }}>{narrative}</div>
                    </div>

                    {/* Vendor comparison */}
                    {vendors.filter(v => vendorStatus[v.name] === "shortlisted").length > 0 && (
                      <div style={{ background: "#FFFFFF", borderRadius: 16, border: "1px solid rgba(0,0,0,0.07)", padding: "22px 24px", marginBottom: 14 }}>
                        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: ".15em", textTransform: "uppercase", color: "#C2410C", marginBottom: 14 }}>Vendor comparison</div>
                        <div style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                            <thead>
                              <tr>
                                <th style={{ fontFamily: "'Syne',sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#9CA3AF", textAlign: "left", padding: "6px 10px", borderBottom: "1px solid rgba(0,0,0,0.07)", width: "40%" }}>Differentiator</th>
                                {vendors.filter(v => vendorStatus[v.name] === "shortlisted").slice(0, 3).map(v => (
                                  <th key={v.name} style={{ fontFamily: "'Syne',sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#9CA3AF", textAlign: "center", padding: "6px 10px", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>{v.name}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {requirements.map(r => (
                                <tr key={r.id}>
                                  <td style={{ padding: "9px 10px", borderBottom: "1px solid rgba(0,0,0,0.05)", fontSize: 12, color: "#374151", lineHeight: 1.5 }}>{r.text}</td>
                                  {vendors.filter(v => vendorStatus[v.name] === "shortlisted").slice(0, 3).map(v => {
                                    const score = v.requirementsMatch / (v.requirementsTotal || 1);
                                    return (
                                      <td key={v.name} style={{ padding: "9px 10px", borderBottom: "1px solid rgba(0,0,0,0.05)", textAlign: "center" }}>
                                        <span style={{ fontSize: 15, color: score > 0.6 ? "#15803D" : "#DC2626" }}>{score > 0.6 ? "✓" : "✗"}</span>
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {/* Cost range */}
                        {(() => {
                          const prices = vendors.filter(v => v.estimatedPrice).map(v => {
                            const m = v.estimatedPrice?.match(/[\d,]+/g);
                            return m ? parseInt(m[0].replace(/,/g, '')) : null;
                          }).filter(Boolean);
                          if (prices.length < 2) return null;
                          const low = Math.min(...prices);
                          const high = Math.max(...prices);
                          return (
                            <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 16, padding: "12px 16px", background: "#F9F8F8", borderRadius: 10, border: "1px solid rgba(0,0,0,0.06)" }}>
                              <div>
                                <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "#9CA3AF", marginBottom: 3 }}>Market pricing range</div>
                                <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: "#1E293B", letterSpacing: "-0.03em" }}>${Math.round(low/1000)}K – ${Math.round(high/1000)}K <span style={{ fontSize: 13, fontWeight: 400, color: "#9CA3AF" }}>/ yr</span></div>
                              </div>
                              <div style={{ fontSize: 11, color: "#9CA3AF", fontStyle: "italic", marginLeft: "auto", maxWidth: 180, textAlign: "right", fontFamily: "'Lora',serif" }}>AI estimate — verify with vendors before budgeting</div>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* Timeline */}
                    {rfpStart && goLive && (
                      <div style={{ background: "#FFFFFF", borderRadius: 16, border: "1px solid rgba(0,0,0,0.07)", padding: "22px 24px", marginBottom: 14 }}>
                        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: ".15em", textTransform: "uppercase", color: "#C2410C", marginBottom: 14 }}>The plan</div>
                        {timelineDefaulted && <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 11, color: "#C2410C", marginBottom: 10 }}>⚠ No deadline provided — defaulted to 90 days. Adjust in The Plan tab.</div>}
                        <div style={{ display: "flex", gap: 10 }}>
                          {[
                            { label: "RFx start", val: new Date(rfpStart + 'T00:00:00').toLocaleDateString("en-US", { month: "short", day: "numeric" }) },
                            { label: "Go-live", val: new Date(goLive + 'T00:00:00').toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) },
                            { label: "Duration", val: Math.round(calDaysBetween(rfpStart, goLive) / 7) + " weeks" },
                          ].map(t => (
                            <div key={t.label} style={{ flex: 1, background: "#F9F8F8", borderRadius: 8, padding: "10px 14px", border: "1px solid rgba(0,0,0,0.06)" }}>
                              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "#9CA3AF", marginBottom: 4 }}>{t.label}</div>
                              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 700, color: "#1E293B" }}>{t.val}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ── BUILDING BLOCKS (manual override) ── */}
                    <div style={{ marginTop: 8, marginBottom: 8 }}>
                      <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: ".15em", textTransform: "uppercase", color: "#9CA3AF", marginBottom: 10, textAlign: "center" }}>
                        Edit details
                      </div>
                      {NAV_VIEWS.filter(v => v !== "scope").map((v, i) => {
                        const labels = { requirements: "Differentiators", questions: "Pressure Test", market: "The Landscape", timeline: "The Plan", summary: "Executive Brief" };
                        const isExpanded = view === v;
                        return (
                          <div key={v} style={{ background: "#FFFFFF", borderRadius: 12, border: "1px solid rgba(0,0,0,0.07)", marginBottom: 8, overflow: "hidden" }}>
                            <div
                              onClick={() => setView(isExpanded ? "summary" : v)}
                              style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", background: isExpanded ? "#FFF7ED" : "#FFFFFF" }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 10, fontWeight: 700, color: isExpanded ? "#C2410C" : "#9CA3AF" }}>{labels[v]}</div>
                              </div>
                              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 10, color: "#9CA3AF" }}>{isExpanded ? "↑" : "↓"}</div>
                            </div>
                            {isExpanded && (
                              <div style={{ borderTop: "1px solid rgba(0,0,0,0.07)", padding: "16px", maxHeight: 400, overflowY: "auto" }}>
                                {/* Render the appropriate tab content */}
                                {view === "requirements" && (
                                  <div>
                                    <StaleWarning />
                                    {reqsBusy ? <div className="rq-loading-center"><Loader size={20} className="spin" style={{ color: "#C2410C" }} /></div> : (
                                      <>
                                        {requirements.map(r => (
                                          <div key={r.id} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                                            <div className="rq-req-id">{r.id}</div>
                                            <div className="rq-req-text">{r.text}</div>
                                          </div>
                                        ))}
                                        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                                          <button className="rq-btn-ghost" onClick={doGenerateReqs} disabled={reqsBusy}><RefreshCw size={10} /> Regenerate</button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                )}
                                {view === "questions" && (
                                  <div>
                                    <StaleWarning />
                                    {qBusy ? <div className="rq-loading-center"><Loader size={20} className="spin" style={{ color: "#C2410C" }} /></div> : (
                                      <>
                                        {(questions.scope || []).map((q, i) => (
                                          <div className="rq-q-card" key={i}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 10, fontWeight: 700, color: "#C2410C" }}>Q{i + 1}</div>
                                              <div className={`rq-badge ${q.type === "open_ended" ? "rq-badge-open" : "rq-badge-mc"}`}>{q.type === "open_ended" ? "Open ended" : "Multiple choice"}</div>
                                            </div>
                                            <div className="rq-q-text">{q.text}</div>
                                          </div>
                                        ))}
                                        <div style={{ marginTop: 12 }}>
                                          <button className="rq-btn-ghost" onClick={doGenerateQuestions} disabled={qBusy}><RefreshCw size={10} /> Regenerate</button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                )}
                                {view === "market" && (
                                  <div>
                                    <StaleWarning />
                                    {marketBusy ? <div className="rq-loading-center"><Loader size={20} className="spin" style={{ color: "#C2410C" }} /></div> : (
                                      <>
                                        {vendors.map(v => (
                                          <div key={v.name} className={`vendor-card${vendorStatus[v.name] === "shortlisted" ? " shortlisted" : vendorStatus[v.name] === "eliminated" ? " eliminated" : ""}`}>
                                            <div className="vendor-name">{v.name}</div>
                                            <div className="vendor-category">{v.category}</div>
                                            <div className="vendor-desc">{v.description}</div>
                                            <div className="vendor-actions">
                                              <button className={`vendor-btn vendor-btn-shortlist${vendorStatus[v.name] === "shortlisted" ? " active" : ""}`} onClick={() => setVendorStatus(s => ({ ...s, [v.name]: s[v.name] === "shortlisted" ? null : "shortlisted" }))}>Shortlist</button>
                                              <button className={`vendor-btn vendor-btn-eliminate${vendorStatus[v.name] === "eliminated" ? " active" : ""}`} onClick={() => setVendorStatus(s => ({ ...s, [v.name]: s[v.name] === "eliminated" ? null : "eliminated" }))}>Eliminate</button>
                                            </div>
                                          </div>
                                        ))}
                                        <div style={{ marginTop: 12 }}>
                                          <button className="rq-btn-ghost" onClick={doMarketResearch} disabled={marketBusy}><RefreshCw size={10} /> Rerun market research</button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                )}
                                {view === "timeline" && (
                                  <div>
                                    {timelineDefaulted && (
                                      <div style={{ background: "#FFF7ED", border: "1px solid rgba(194,65,12,0.3)", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 11, color: "#C2410C", fontFamily: "'Syne',sans-serif", fontWeight: 600 }}>
                                        No deadline was provided — timeline defaulted to 90 days. Adjust the go-live date below.
                                      </div>
                                    )}
                                    <GanttChart activities={activities} />
                                  </div>
                                )}
                                {view === "summary" && (
                                  <div>
                                    <div className="rq-scope-box" style={{ marginBottom: 16 }}>{formalScope}</div>
                                    <div style={{ display: "flex", gap: 10 }}>
                                      <button className="rq-btn-primary" onClick={doExport} disabled={exportBusy}><FileText size={11} /> Export .docx</button>
                                      <button className="rq-btn-ghost" onClick={doExportPDF} disabled={pdfBusy}><FileText size={11} /> Export PDF</button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* ── Stale warning ── */}
                {isStale && !autoFlowing && formalScope && (
                  <div style={{ background: "#FFF7ED", border: "1px solid rgba(194,65,12,0.3)", borderRadius: 10, padding: "10px 16px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 11, fontWeight: 600, color: "#C2410C" }}>
                      ⚠ Scope changed — business case may be out of date.
                    </div>
                    <button className="rq-btn-ghost" style={{ fontSize: 11, flexShrink: 0 }} onClick={() => { setChatCollapsed(true); doAutoFlow(); }}>Rebuild →</button>
                  </div>
                )}

              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
