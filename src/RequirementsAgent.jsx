
import { useState } from "react";
import { FileText, Plus, Trash2, Loader, ChevronRight, CheckCircle, Pencil, X, Check, RefreshCw } from "lucide-react";
import { saveAs } from "file-saver";
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, ShadingType, AlignmentType, HeadingLevel, LevelFormat
} from "docx";

// ─── Font injection ───────────────────────────────────────────────────────────
const link = document.createElement("link");
link.rel = "stylesheet";
link.href = "https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Lora:ital,wght@0,400;0,500;1,400&family=JetBrains+Mono:wght@400;500&display=swap";
document.head.appendChild(link);

const style = document.createElement("style");
style.textContent = `
  .rq-root { font-family: 'Lora', Georgia, serif; background: #f7f5f2; min-height: 100vh; color: #1a1714; }
  .rq-root * { box-sizing: border-box; }
  .rq-header { background: #1a1714; padding: 28px 40px; display: flex; justify-content: space-between; align-items: center; }
  .rq-logo { font-family: 'Syne', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: #c9b99a; margin-bottom: 4px; }
  .rq-title { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 800; color: #f7f5f2; margin: 0; }
  .rq-session { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #5a5048; margin-top: 4px; }
  .rq-export-btn { display: flex; align-items: center; gap: 8px; background: #c9b99a; color: #1a1714; font-family: 'Syne', sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; transition: background 0.15s; white-space: nowrap; }
  .rq-export-btn:hover { background: #e2d5be; }
  .rq-export-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .rq-stepper { display: flex; border-bottom: 1px solid #e3ddd6; background: #fff; padding: 0 32px; overflow-x: auto; }
  .rq-step { display: flex; align-items: center; gap: 8px; padding: 16px 20px 16px 0; font-family: 'Syne', sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #b0a899; border-bottom: 2px solid transparent; margin-bottom: -1px; white-space: nowrap; }
  .rq-step.active { color: #1a1714; border-bottom-color: #c9b99a; }
  .rq-step.done { color: #5a8a6a; }
  .rq-step-num { width: 20px; height: 20px; border-radius: 50%; border: 1.5px solid currentColor; display: flex; align-items: center; justify-content: center; font-size: 10px; flex-shrink: 0; }
  .rq-body { max-width: 820px; margin: 0 auto; padding: 40px 24px; }
  .rq-section-label { font-family: 'Syne', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: #b0a899; margin-bottom: 10px; }
  .rq-textarea { width: 100%; border: 1.5px solid #e3ddd6; border-radius: 6px; padding: 14px 16px; font-family: 'Lora', serif; font-size: 15px; color: #1a1714; background: #faf9f7; resize: vertical; min-height: 110px; outline: none; transition: border-color 0.15s; line-height: 1.65; }
  .rq-textarea:focus { border-color: #c9b99a; background: #fff; }
  .rq-input { width: 100%; border: 1.5px solid #e3ddd6; border-radius: 6px; padding: 10px 14px; font-family: 'Lora', serif; font-size: 14px; color: #1a1714; background: #faf9f7; outline: none; transition: border-color 0.15s; }
  .rq-input:focus { border-color: #c9b99a; background: #fff; }
  .rq-btn-primary { display: inline-flex; align-items: center; gap: 8px; background: #1a1714; color: #f7f5f2; font-family: 'Syne', sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; padding: 12px 22px; border: none; border-radius: 4px; cursor: pointer; transition: background 0.15s; }
  .rq-btn-primary:hover { background: #2e2925; }
  .rq-btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
  .rq-btn-ghost { display: inline-flex; align-items: center; gap: 6px; background: transparent; color: #6b5f52; font-family: 'Syne', sans-serif; font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; padding: 8px 12px; border: 1.5px solid #e3ddd6; border-radius: 4px; cursor: pointer; transition: all 0.15s; }
  .rq-btn-ghost:hover { border-color: #c9b99a; color: #1a1714; }
  .rq-btn-ghost:disabled { opacity: 0.4; cursor: not-allowed; }
  .rq-btn-icon { display: inline-flex; align-items: center; justify-content: center; background: transparent; padding: 6px 8px; border: 1.5px solid #e3ddd6; border-radius: 4px; cursor: pointer; transition: all 0.15s; color: #8a7e72; }
  .rq-btn-icon:hover { border-color: #c9b99a; color: #1a1714; }
  .rq-btn-del { color: #b85050; border-color: #e8c8c8; }
  .rq-btn-del:hover { background: #fff0f0; border-color: #d09090; color: #8a2020; }
  .rq-req-card { background: #fff; border: 1.5px solid #e3ddd6; border-radius: 8px; padding: 18px 20px; margin-bottom: 10px; transition: border-color 0.15s; }
  .rq-req-card:hover { border-color: #d0c4b4; }
  .rq-req-id { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #c9b99a; font-weight: 500; margin-bottom: 4px; }
  .rq-req-text { font-size: 14px; line-height: 1.55; color: #1a1714; }
  .rq-q-card { border: 1.5px solid #e3ddd6; border-radius: 6px; padding: 16px 18px; margin-bottom: 8px; background: #faf9f7; }
  .rq-badge { display: inline-block; font-family: 'Syne', sans-serif; font-size: 9px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; padding: 3px 7px; border-radius: 3px; margin-bottom: 7px; }
  .rq-badge-open { background: #edf0ff; color: #3a4fa0; }
  .rq-badge-mc { background: #edf7f2; color: #2a6a4a; }
  .rq-q-text { font-size: 14px; color: #2e2925; line-height: 1.5; }
  .rq-mc-opts { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 6px; }
  .rq-mc-opt { font-family: 'JetBrains Mono', monospace; font-size: 11px; background: #fff; border: 1px solid #d4ccc4; border-radius: 3px; padding: 3px 10px; color: #5a5048; }
  .rq-scope-box { font-size: 14px; line-height: 1.75; color: #2e2925; background: #faf9f7; border: 1px solid #e3ddd6; border-radius: 8px; padding: 18px 22px; white-space: pre-wrap; font-family: 'Lora', serif; }
  .rq-progress { display: flex; align-items: center; gap: 10px; margin-bottom: 36px; }
  .rq-pb-wrap { flex: 1; height: 3px; background: #e3ddd6; border-radius: 2px; overflow: hidden; }
  .rq-pb { height: 100%; background: #c9b99a; border-radius: 2px; transition: width 0.5s ease; }
  .rq-pb-label { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #b0a899; white-space: nowrap; }
  .rq-hint { font-size: 13px; color: #8a7e72; line-height: 1.6; font-style: italic; margin: 0 0 16px 0; }
  .rq-error { background: #fff4f0; border: 1px solid #f0c4b4; border-radius: 6px; padding: 10px 14px; font-size: 13px; color: #b85030; margin-top: 10px; font-family: 'Lora', serif; }
  .rq-divider { border: none; border-top: 1px solid #e3ddd6; margin: 28px 0; }
  .rq-row { display: flex; gap: 8px; align-items: center; }
  .rq-actions { display: flex; gap: 8px; margin-top: 16px; align-items: center; }
  .rq-req-group-label { font-family: 'Syne', sans-serif; font-size: 12px; font-weight: 700; color: #2e2925; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #e3ddd6; }
  .rq-loading-center { padding: 36px 0; text-align: center; color: #8a7e72; font-style: italic; font-family: 'Lora', serif; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .spin { animation: spin 0.8s linear infinite; display: inline-block; }
  .rq-fade { animation: fadeUp 0.3s ease both; }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
`;
document.head.appendChild(style);

// ─── Utils ────────────────────────────────────────────────────────────────────
const genId = () => "SES-" + Math.random().toString(36).substring(2, 9).toUpperCase();

async function callClaude(system, user) {
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system, user }),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  const d = await res.json();
  return d.content.find(b => b.type === 'text')?.text ?? '';
}

async function callJSON(system, user) {
  const t = await callClaude(system, user);
  return JSON.parse(t.replace(/```json\s*/g, "").replace(/```/g, "").trim());
}

// ─── Prompts ──────────────────────────────────────────────────────────────────
const P_SCOPE = `You are a professional business analyst. The user gives you a rough informal description of a project or procurement need.
Rewrite it as a concise, formal scope narrative (3-5 sentences) suitable for a requirements document.
Use clear, direct language. Return plain prose only — no bullets, no headers, no preamble. Just the scope text.`;

const P_REQS = `You are a business analyst writing a software procurement RFP.
Given a project scope, generate 5-8 binary functional requirements. Each must be phrased so a vendor can answer Yes or No.
Start each with "The solution shall..." or "The system must...".
Return ONLY a valid JSON array, no markdown, no preamble:
[{"id":"R-F1","text":"The solution shall..."},...]`;

const P_QS = `You are a business analyst writing a vendor discovery questionnaire.
Given a functional requirement, generate exactly 2-3 follow-up questions to help evaluate vendor compliance.
Use multiple choice when the answer space is predictable and finite; otherwise open-ended.
Return ONLY valid JSON, no markdown:
[{"type":"open_ended","text":"..."},{"type":"multiple_choice","text":"...","options":["A","B","C"]}]`;

// ─── DocX Export ──────────────────────────────────────────────────────────────
async function buildDocx({ sessionId, projectTitle, formalScope, requirements, questions }) {
  const b = { style: BorderStyle.SINGLE, size: 1, color: "D4CCC4" };
  const borders = { top: b, bottom: b, left: b, right: b };
  const cm = { top: 90, bottom: 90, left: 130, right: 130 };

  const hCell = (text) => new TableCell({
    borders, margins: cm,
    shading: { fill: "2E2925", type: ShadingType.CLEAR },
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: "F7F5F2", font: "Arial", size: 20 })] })]
  });
  const bCell = (text, shade) => new TableCell({
    borders, margins: cm,
    shading: { fill: shade ? "FAF9F7" : "FFFFFF", type: ShadingType.CLEAR },
    children: [new Paragraph({ children: [new TextRun({ text, font: "Arial", size: 20 })] })]
  });

  const qChildren = [];
  for (const req of requirements) {
    const qs = questions[req.id] || [];
    if (!qs.length) continue;
    qChildren.push(new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text: `${req.id}: ${req.text}`, font: "Arial" })]
    }));
    qs.forEach((q, i) => {
      qChildren.push(new Paragraph({
        numbering: { reference: "nums", level: 0 },
        children: [new TextRun({ text: q.text, font: "Arial", size: 22 })]
      }));
      if (q.type === "multiple_choice" && q.options?.length) {
        q.options.forEach(opt => qChildren.push(new Paragraph({
          numbering: { reference: "alpha", level: 0 },
          children: [new TextRun({ text: opt, font: "Arial", size: 20, color: "5A5048" })]
        })));
      } else {
        qChildren.push(new Paragraph({
          children: [new TextRun({ text: "[Open response]", font: "Arial", size: 20, italics: true, color: "9A8E82" })]
        }));
      }
      qChildren.push(new Paragraph({ children: [new TextRun("")] }));
    });
  }

  const doc = new Document({
    numbering: {
      config: [
        { reference: "nums", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 440, hanging: 360 } } } }] },
        { reference: "alpha", levels: [{ level: 0, format: LevelFormat.LOWER_LETTER, text: "%1)", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      ]
    },
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
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [1100, 6860, 1400],
          rows: [
            new TableRow({ children: [hCell("ID"), hCell("Requirement"), hCell("Type")] }),
            ...requirements.map((r, i) => new TableRow({ children: [bCell(r.id, i % 2), bCell(r.text, i % 2), bCell("Binary", i % 2)] }))
          ]
        }),
        new Paragraph({ children: [new TextRun("")] }),
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "3. Discovery Questions", font: "Arial" })] }),
        ...qChildren,
      ]
    }]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Requirements_${sessionId}.docx`);
}

// ─── Component ────────────────────────────────────────────────────────────────
const STEPS = ["Scope", "Requirements", "Questions", "Review"];

export default function RequirementsAgent() {
  const [sessionId] = useState(genId);
  const [step, setStep] = useState(0);

  const [projectTitle, setProjectTitle] = useState("");
  const [roughScope, setRoughScope] = useState("");
  const [formalScope, setFormalScope] = useState("");
  const [editingScope, setEditingScope] = useState(false);
  const [scopeBusy, setScopeBusy] = useState(false);
  const [scopeErr, setScopeErr] = useState("");

  const [requirements, setRequirements] = useState([]);
  const [reqsBusy, setReqsBusy] = useState(false);
  const [reqsErr, setReqsErr] = useState("");
  const [newReq, setNewReq] = useState("");
  const [editId, setEditId] = useState(null);
  const [editText, setEditText] = useState("");

  const [questions, setQuestions] = useState({});
  const [qBusy, setQBusy] = useState(false);
  const [qErr, setQErr] = useState("");

  const [exportBusy, setExportBusy] = useState(false);
  const [exportErr, setExportErr] = useState("");

  // ── Scope handlers ──
  const doFormalizeScope = async () => {
    setScopeBusy(true); setScopeErr("");
    try {
      const r = await callClaude(P_SCOPE, roughScope);
      setFormalScope(r.trim());
      setEditingScope(false);
    } catch { setScopeErr("Could not formalize scope. Please try again."); }
    finally { setScopeBusy(false); }
  };

  // ── Requirement handlers ──
  const doGenerateReqs = async () => {
    setReqsBusy(true); setReqsErr("");
    try {
      const arr = await callJSON(P_REQS, `Scope: ${formalScope}`);
      setRequirements(arr);
    } catch { setReqsErr("Could not generate requirements. Please try again."); }
    finally { setReqsBusy(false); }
  };

  const addReq = () => {
    if (!newReq.trim()) return;
    const n = requirements.length + 1;
    setRequirements(p => [...p, { id: `R-C${n}`, text: newReq.trim() }]);
    setNewReq("");
  };

  const deleteReq = (id) => setRequirements(p => p.filter(r => r.id !== id));

  const saveEdit = (id) => {
    setRequirements(p => p.map(r => r.id === id ? { ...r, text: editText } : r));
    setEditId(null);
  };

  // ── Question handlers ──
  const doGenerateQuestions = async () => {
    setQBusy(true); setQErr("");
    try {
      const out = {};
      for (const req of requirements) {
        out[req.id] = await callJSON(P_QS, `Requirement: ${req.text}`);
      }
      setQuestions(out);
      setStep(3);
    } catch { setQErr("Could not generate questions. Please try again."); }
    finally { setQBusy(false); }
  };

  // ── Export ──
  const doExport = async () => {
    setExportBusy(true); setExportErr("");
    try {
      await buildDocx({ sessionId, projectTitle, formalScope, requirements, questions });
    } catch { setExportErr("Export failed. Please try again."); }
    finally { setExportBusy(false); }
  };

  const pct = (step / (STEPS.length - 1)) * 100;

  return (
    <div className="rq-root">
      {/* Header */}
      <div className="rq-header">
        <div>
          <div className="rq-logo">Requirements Discovery</div>
          <div className="rq-title">Procurement Agent</div>
          <div className="rq-session">{sessionId}</div>
        </div>
        <button className="rq-export-btn" onClick={doExport} disabled={step < 3 || exportBusy}>
          {exportBusy ? <Loader size={15} className="spin" /> : <FileText size={15} />}
          Export .docx
        </button>
      </div>

      {/* Stepper */}
      <div className="rq-stepper">
        {STEPS.map((label, i) => (
          <div key={label} className={`rq-step ${i === step ? "active" : i < step ? "done" : ""}`}>
            <div className="rq-step-num">
              {i < step ? <CheckCircle size={12} /> : i + 1}
            </div>
            {label}
          </div>
        ))}
      </div>

      <div className="rq-body">
        {/* Progress */}
        <div className="rq-progress">
          <div className="rq-pb-wrap"><div className="rq-pb" style={{ width: `${pct}%` }} /></div>
          <div className="rq-pb-label">Step {step + 1} / {STEPS.length}</div>
        </div>

        {/* ── Step 0: Scope ── */}
        {step === 0 && (
          <div className="rq-fade">
            <div className="rq-section-label" style={{ marginBottom: 8 }}>Project Title</div>
            <input className="rq-input" style={{ marginBottom: 24 }} placeholder="e.g. Enterprise Tool Tracking System" value={projectTitle} onChange={e => setProjectTitle(e.target.value)} />

            <div className="rq-section-label">Describe Your Project</div>
            <p className="rq-hint">Don't worry about perfect language — write what comes naturally. What problem are you solving? What should the system do?</p>
            <textarea className="rq-textarea" placeholder="We need a system that can track tools on the shop floor, flag damaged ones, and sync with our ERP…" value={roughScope} onChange={e => setRoughScope(e.target.value)} rows={5} />
            {scopeErr && <div className="rq-error">{scopeErr}</div>}

            <div className="rq-actions">
              <button className="rq-btn-primary" onClick={doFormalizeScope} disabled={!roughScope.trim() || scopeBusy}>
                {scopeBusy ? <><Loader size={14} className="spin" /> Formalizing…</> : <>Formalize Scope <ChevronRight size={14} /></>}
              </button>
            </div>

            {formalScope && (
              <div style={{ marginTop: 28 }} className="rq-fade">
                <div className="rq-section-label">Formalized Scope</div>
                {editingScope ? (
                  <>
                    <textarea className="rq-textarea" value={formalScope} onChange={e => setFormalScope(e.target.value)} rows={4} />
                    <div className="rq-actions">
                      <button className="rq-btn-ghost" onClick={() => setEditingScope(false)}><Check size={12} /> Done</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="rq-scope-box">{formalScope}</div>
                    <div className="rq-actions">
                      <button className="rq-btn-ghost" onClick={() => setEditingScope(true)}><Pencil size={12} /> Edit</button>
                      <button className="rq-btn-ghost" onClick={doFormalizeScope} disabled={scopeBusy}><RefreshCw size={12} /> Regenerate</button>
                    </div>
                  </>
                )}
                <div style={{ marginTop: 20 }}>
                  <button className="rq-btn-primary" onClick={() => { setStep(1); doGenerateReqs(); }}>
                    Generate Requirements <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Step 1: Requirements ── */}
        {step === 1 && (
          <div className="rq-fade">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <div className="rq-section-label">Functional Requirements</div>
                <p className="rq-hint" style={{ marginBottom: 0 }}>Review, edit, delete, or add your own requirements below.</p>
              </div>
              <button className="rq-btn-ghost" onClick={doGenerateReqs} disabled={reqsBusy}>
                {reqsBusy ? <Loader size={12} className="spin" /> : <RefreshCw size={12} />} Regenerate
              </button>
            </div>

            {reqsBusy && (
              <div className="rq-loading-center">
                <Loader size={20} className="spin" style={{ marginBottom: 8 }} /><br />
                Generating requirements from scope…
              </div>
            )}
            {reqsErr && <div className="rq-error">{reqsErr}</div>}

            {!reqsBusy && requirements.map(req => (
              <div className="rq-req-card rq-fade" key={req.id}>
                <div className="rq-req-id">{req.id}</div>
                {editId === req.id ? (
                  <>
                    <input className="rq-input" value={editText} onChange={e => setEditText(e.target.value)} style={{ marginBottom: 10 }} />
                    <div className="rq-row">
                      <button className="rq-btn-ghost" onClick={() => saveEdit(req.id)}><Check size={12} /> Save</button>
                      <button className="rq-btn-ghost" onClick={() => setEditId(null)}><X size={12} /> Cancel</button>
                    </div>
                  </>
                ) : (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <div className="rq-req-text">{req.text}</div>
                    <div className="rq-row" style={{ flexShrink: 0 }}>
                      <button className="rq-btn-icon" onClick={() => { setEditId(req.id); setEditText(req.text); }}><Pencil size={13} /></button>
                      <button className="rq-btn-icon rq-btn-del" onClick={() => deleteReq(req.id)}><Trash2 size={13} /></button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {!reqsBusy && (
              <div className="rq-row" style={{ marginTop: 8 }}>
                <input className="rq-input" placeholder="Add your own requirement…" value={newReq} onChange={e => setNewReq(e.target.value)} onKeyDown={e => e.key === "Enter" && addReq()} />
                <button className="rq-btn-ghost" onClick={addReq} disabled={!newReq.trim()} style={{ whiteSpace: "nowrap" }}><Plus size={13} /> Add</button>
              </div>
            )}

            {!reqsBusy && requirements.length > 0 && (
              <div className="rq-actions" style={{ marginTop: 24 }}>
                <button className="rq-btn-ghost" onClick={() => setStep(0)}>← Back</button>
                <button className="rq-btn-primary" onClick={() => setStep(2)}>
                  Continue to Questions <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Generate Questions ── */}
        {step === 2 && (
          <div className="rq-fade">
            <div className="rq-section-label">Discovery Questions</div>
            <p className="rq-hint">The agent will generate 2–3 follow-up questions per requirement — a mix of open-ended and multiple choice.</p>
            {qErr && <div className="rq-error">{qErr}</div>}
            {qBusy && (
              <div className="rq-loading-center">
                <Loader size={20} className="spin" style={{ marginBottom: 8 }} /><br />
                Generating questions for {requirements.length} requirement{requirements.length !== 1 ? "s" : ""}…
              </div>
            )}
            {!qBusy && (
              <div className="rq-actions">
                <button className="rq-btn-ghost" onClick={() => setStep(1)}>← Back</button>
                <button className="rq-btn-primary" onClick={doGenerateQuestions}>
                  Generate Questions <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Step 3: Review ── */}
        {step === 3 && (
          <div className="rq-fade">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
              <div>
                <div className="rq-section-label">Review &amp; Export</div>
                <p className="rq-hint" style={{ marginBottom: 0 }}>Review everything before exporting.</p>
              </div>
              <button className="rq-btn-ghost" onClick={() => setStep(2)}>← Back</button>
            </div>

            <div className="rq-section-label">1. Scope</div>
            <div className="rq-scope-box" style={{ marginBottom: 28 }}>{formalScope}</div>
            <hr className="rq-divider" />

            <div className="rq-section-label">2. Functional Requirements ({requirements.length})</div>
            <div style={{ marginBottom: 28 }}>
              {requirements.map(req => (
                <div className="rq-req-card" key={req.id} style={{ cursor: "default" }}>
                  <div className="rq-req-id">{req.id}</div>
                  <div className="rq-req-text">{req.text}</div>
                </div>
              ))}
            </div>
            <hr className="rq-divider" />

            <div className="rq-section-label">3. Discovery Questions</div>
            <div style={{ marginBottom: 28 }}>
              {requirements.map(req => {
                const qs = questions[req.id] || [];
                return (
                  <div key={req.id} style={{ marginBottom: 24 }}>
                    <div className="rq-req-group-label">{req.id} — {req.text}</div>
                    {qs.map((q, i) => (
                      <div className="rq-q-card" key={i}>
                        <div className={`rq-badge ${q.type === "open_ended" ? "rq-badge-open" : "rq-badge-mc"}`}>
                          {q.type === "open_ended" ? "Open Ended" : "Multiple Choice"}
                        </div>
                        <div className="rq-q-text">{q.text}</div>
                        {q.type === "multiple_choice" && q.options?.length && (
                          <div className="rq-mc-opts">
                            {q.options.map((o, j) => (
                              <span key={j} className="rq-mc-opt">{String.fromCharCode(65 + j)}. {o}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>

            {exportErr && <div className="rq-error">{exportErr}</div>}
            <button className="rq-btn-primary" onClick={doExport} disabled={exportBusy} style={{ padding: "14px 28px", fontSize: 12 }}>
              {exportBusy ? <><Loader size={15} className="spin" /> Exporting…</> : <><FileText size={15} /> Export to .docx</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
