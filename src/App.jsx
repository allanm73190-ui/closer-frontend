import { useState, useEffect, useCallback } from "react";

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const API_BASE = 'https://closer-backend-production.up.railway.app/api';
// ─── API CLIENT ───────────────────────────────────────────────────────────────
function getToken() { return localStorage.getItem('closer_token'); }
function setToken(t) { localStorage.setItem('closer_token', t); }
function clearToken() { localStorage.removeItem('closer_token'); }

async function apiFetch(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erreur serveur');
  return data;
}

// ─── SCORE COMPUTATION ────────────────────────────────────────────────────────
function computeScore(sections) {
  let points = 0, max = 0;
  const count = (val, positive, total) => {
    max += total;
    if (Array.isArray(positive)) {
      if (Array.isArray(val)) points += val.filter(v => positive.includes(v)).length;
      else if (positive.includes(val)) points += 1;
    } else { if (val === positive) points += 1; }
  };
  const d = sections.decouverte || {};
  count(d.douleur_surface, 'oui', 1);
  count(d.douleur_profonde, ['oui', 'partiel'], 1);
  count(d.couches_douleur, ['couche1', 'couche2', 'couche3'], 3);
  count(d.temporalite, 'oui', 1);
  count(d.urgence, ['oui', 'artificielle'], 1);
  const r = sections.reformulation || {};
  count(r.reformulation, ['oui', 'partiel'], 1);
  count(r.prospect_reconnu, ['oui', 'moyen'], 1);
  count(r.couches_reformulation, ['physique', 'quotidien', 'identitaire'], 3);
  const p = sections.projection || {};
  count(p.projection_posee, 'oui', 1);
  count(p.qualite_reponse, ['forte', 'moyenne'], 1);
  count(p.deadline_levier, 'oui', 1);
  const o = sections.offre || {};
  count(o.colle_douleurs, ['oui', 'partiel'], 1);
  count(o.exemples_transformation, ['oui', 'moyen'], 1);
  count(o.duree_justifiee, ['oui', 'partiel'], 1);
  const c = sections.closing || {};
  count(c.annonce_prix, 'directe', 1);
  count(c.silence_prix, 'oui', 1);
  count(c.douleur_reancree, 'oui', 1);
  count(c.objection_isolee, 'oui', 1);
  count(c.resultat_closing, ['close', 'retrograde', 'relance'], 1);
  return { total: points, max, percentage: max > 0 ? Math.round((points / max) * 100) : 0 };
}

// ─── UTILITIES ────────────────────────────────────────────────────────────────
function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatDateShort(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

// ─── UI PRIMITIVES ────────────────────────────────────────────────────────────
function Input({ placeholder, value, onChange, type = 'text', required, style = {} }) {
  return (
    <input type={type} placeholder={placeholder} value={value} onChange={onChange} required={required}
      style={{ width: '100%', borderRadius: 8, border: '1px solid #e2e8f0', padding: '9px 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', color: '#1e293b', ...style }} />
  );
}

function Textarea({ placeholder, value, onChange, rows = 3 }) {
  return (
    <textarea placeholder={placeholder} value={value} onChange={onChange} rows={rows}
      style={{ width: '100%', borderRadius: 8, border: '1px solid #e2e8f0', padding: '8px 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none', resize: 'vertical', boxSizing: 'border-box', color: '#1e293b' }} />
  );
}

function Btn({ children, onClick, type = 'button', variant = 'primary', disabled, style = {} }) {
  const base = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', border: 'none', transition: 'all 0.2s', opacity: disabled ? 0.6 : 1, fontFamily: 'inherit' };
  const variants = {
    primary: { background: '#6366f1', color: 'white', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' },
    secondary: { background: 'white', color: '#374151', border: '1px solid #e2e8f0' },
    danger: { background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' },
    ghost: { background: 'transparent', color: '#64748b' },
  };
  return <button type={type} onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant], ...style }}>{children}</button>;
}

function Alert({ type, message }) {
  if (!message) return null;
  const styles = {
    error: { background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b' },
    success: { background: '#d1fae5', border: '1px solid #6ee7b7', color: '#065f46' },
  };
  return <div style={{ ...styles[type], padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{message}</div>;
}

// ─── SCORE GAUGE ──────────────────────────────────────────────────────────────
function ScoreGauge({ percentage, size = 'lg' }) {
  const radius = size === 'lg' ? 54 : 36;
  const stroke = size === 'lg' ? 8 : 6;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  const viewBox = size === 'lg' ? 130 : 90;
  const center = viewBox / 2;
  const color = percentage >= 80 ? '#059669' : percentage >= 60 ? '#d97706' : percentage >= 40 ? '#6366f1' : '#ef4444';
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={viewBox} height={viewBox} viewBox={`0 0 ${viewBox} ${viewBox}`}>
        <circle cx={center} cy={center} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
        <circle cx={center} cy={center} r={radius} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`} style={{ transition: 'stroke-dashoffset 1s ease-in-out' }} />
      </svg>
      <div style={{ position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontWeight: 700, fontSize: size === 'lg' ? 28 : 16, color }}>{Math.round(percentage)}%</span>
      </div>
    </div>
  );
}

function ScoreBadge({ pct }) {
  const s = pct >= 80 ? { background: '#d1fae5', color: '#065f46', border: '1px solid #6ee7b7' }
    : pct >= 60 ? { background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' }
    : pct >= 40 ? { background: '#ede9fe', color: '#4c1d95', border: '1px solid #c4b5fd' }
    : { background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' };
  return <span style={{ ...s, padding: '2px 10px', borderRadius: 8, fontWeight: 700, fontSize: 13 }}>{pct}%</span>;
}

function ClosedBadge({ isClosed }) {
  if (isClosed === null || isClosed === undefined) return null;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: isClosed ? '#d1fae5' : '#fee2e2', color: isClosed ? '#065f46' : '#991b1b' }}>
      {isClosed ? '✓ Closer' : '✗ Non Closer'}
    </span>
  );
}

// ─── STATS ────────────────────────────────────────────────────────────────────
function StatsOverview({ debriefs }) {
  const total = debriefs.length;
  const avgScore = total > 0 ? Math.round(debriefs.reduce((s, d) => s + (d.percentage || 0), 0) / total) : 0;
  const bestScore = total > 0 ? Math.round(Math.max(...debriefs.map(d => d.percentage || 0))) : 0;
  const sorted = [...debriefs].sort((a, b) => new Date(b.call_date) - new Date(a.call_date));
  const recentAvg = sorted.slice(0, 3).reduce((s, d) => s + (d.percentage || 0), 0) / Math.max(sorted.slice(0, 3).length, 1);
  const prevAvg = sorted.slice(3, 6).reduce((s, d) => s + (d.percentage || 0), 0) / Math.max(sorted.slice(3, 6).length, 1);
  const trend = sorted.slice(3, 6).length > 0 ? Math.round(recentAvg - prevAvg) : 0;
  const stats = [
    { label: 'Total appels', value: total, icon: '📞', bg: '#ede9fe', color: '#6366f1' },
    { label: 'Score moyen', value: `${avgScore}%`, icon: '🎯', bg: '#d1fae5', color: '#059669' },
    { label: 'Meilleur score', value: `${bestScore}%`, icon: '🏆', bg: '#fef3c7', color: '#d97706' },
    { label: 'Tendance', value: `${trend >= 0 ? '+' : ''}${trend}%`, icon: trend >= 0 ? '📈' : '📉', bg: trend >= 0 ? '#d1fae5' : '#fee2e2', color: trend >= 0 ? '#059669' : '#dc2626' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
      {stats.map(({ label, value, icon, bg, color }) => (
        <div key={label} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{icon}</div>
          <div>
            <p style={{ fontSize: 11, color: '#64748b', margin: 0, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
            <p style={{ fontSize: 22, fontWeight: 700, color, margin: 0 }}>{value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── PROGRESS CHART ───────────────────────────────────────────────────────────
function ProgressChart({ debriefs }) {
  const [hovered, setHovered] = useState(null);
  const data = [...debriefs].sort((a, b) => new Date(a.call_date) - new Date(b.call_date))
    .map(d => ({ date: formatDateShort(d.call_date), score: Math.round(d.percentage || 0), prospect: d.prospect_name }));
  if (data.length === 0) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 260, color: '#94a3b8', fontSize: 14 }}>Aucune donnée à afficher</div>;
  const W = 560, H = 220, padL = 40, padR = 20, padT = 20, padB = 30;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const xs = data.map((_, i) => padL + (i / Math.max(data.length - 1, 1)) * innerW);
  const ys = data.map(d => padT + innerH - (d.score / 100) * innerH);
  const path = xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${x} ${ys[i]}`).join(' ');
  const area = `${path} L ${xs[xs.length - 1]} ${padT + innerH} L ${padL} ${padT + innerH} Z`;
  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
        <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366f1" stopOpacity="0.2" /><stop offset="100%" stopColor="#6366f1" stopOpacity="0" /></linearGradient></defs>
        {[0, 25, 50, 75, 100].map(v => { const y = padT + innerH - (v / 100) * innerH; return <g key={v}><line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" /><text x={padL - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8">{v}%</text></g>; })}
        <path d={area} fill="url(#cg)" />
        <path d={path} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {data.map((d, i) => (
          <g key={i} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} style={{ cursor: 'pointer' }}>
            <circle cx={xs[i]} cy={ys[i]} r={hovered === i ? 7 : 5} fill="#6366f1" stroke="white" strokeWidth="2" />
            {hovered === i && <g><rect x={xs[i] - 55} y={ys[i] - 50} width={110} height={42} rx="6" fill="white" stroke="#e2e8f0" strokeWidth="1" /><text x={xs[i]} y={ys[i] - 32} textAnchor="middle" fontSize="11" fontWeight="600" fill="#1e293b">{d.prospect}</text><text x={xs[i]} y={ys[i] - 18} textAnchor="middle" fontSize="10" fill="#64748b">{d.date} — {d.score}%</text></g>}
            <text x={xs[i]} y={padT + innerH + 18} textAnchor="middle" fontSize="10" fill="#94a3b8">{d.date}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ─── RADAR CHART ──────────────────────────────────────────────────────────────
function RadarScore({ scores }) {
  if (!scores) return null;
  const keys = ['accroche', 'decouverte', 'douleur', 'presentation_offre', 'traitement_objections', 'closing', 'energie_ton', 'ecoute_active'];
  const labels = ['Accroche', 'Découverte', 'Douleur', 'Offre', 'Objections', 'Closing', 'Énergie', 'Écoute'];
  const n = keys.length, cx = 110, cy = 110, R = 80;
  const angle = i => (i / n) * 2 * Math.PI - Math.PI / 2;
  const dataPoints = keys.map((k, i) => { const val = (scores[k] || 0) / 5; const a = angle(i); return [cx + R * val * Math.cos(a), cy + R * val * Math.sin(a)]; });
  const polyPoints = dataPoints.map(p => p.join(',')).join(' ');
  return (
    <svg width="220" height="220" viewBox="0 0 220 220" style={{ overflow: 'visible' }}>
      {[1,2,3,4,5].map(level => { const r = (level/5)*R; const pts = keys.map((_,i) => { const a = angle(i); return `${cx+r*Math.cos(a)},${cy+r*Math.sin(a)}`; }).join(' '); return <polygon key={level} points={pts} fill="none" stroke="#e2e8f0" strokeWidth="1" />; })}
      {keys.map((_,i) => { const a = angle(i); return <line key={i} x1={cx} y1={cy} x2={cx+R*Math.cos(a)} y2={cy+R*Math.sin(a)} stroke="#e2e8f0" strokeWidth="1" />; })}
      <polygon points={polyPoints} fill="rgba(99,102,241,0.15)" stroke="#6366f1" strokeWidth="2" />
      {dataPoints.map(([x,y],i) => <circle key={i} cx={x} cy={y} r={3} fill="#6366f1" />)}
      {keys.map((_,i) => { const a = angle(i); const lx = cx+(R+20)*Math.cos(a); const ly = cy+(R+20)*Math.sin(a); return <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="central" fontSize="9" fill="#64748b" fontWeight="500">{labels[i]}</text>; })}
    </svg>
  );
}

// ─── DEBRIEF CARD ─────────────────────────────────────────────────────────────
function DebriefCard({ debrief, onClick, showUser }) {
  const [hovered, setHovered] = useState(false);
  const pct = Math.round(debrief.percentage || 0);
  return (
    <div onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ background: 'white', border: `1px solid ${hovered ? '#a5b4fc' : '#e2e8f0'}`, borderRadius: 12, padding: '14px 18px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: hovered ? '0 4px 16px rgba(99,102,241,0.1)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 600, fontSize: 14, color: '#1e293b', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{debrief.prospect_name}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: '#94a3b8', flexWrap: 'wrap' }}>
          <span>📅 {formatDate(debrief.call_date)}</span>
          <span>👤 {debrief.closer_name}</span>
          {showUser && debrief.user_name && <span style={{ background: '#f1f5f9', padding: '1px 6px', borderRadius: 4, color: '#64748b' }}>par {debrief.user_name}</span>}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <ClosedBadge isClosed={debrief.is_closed} />
        <ScoreBadge pct={pct} />
        <span style={{ color: hovered ? '#6366f1' : '#cbd5e1', fontSize: 18, transition: 'color 0.2s' }}>›</span>
      </div>
    </div>
  );
}

// ─── FORM PRIMITIVES ──────────────────────────────────────────────────────────
function RadioGroup({ label, options, value, onChange }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>{label}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {options.map(opt => (
          <label key={opt.value} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 8, border: `1px solid ${value === opt.value ? '#6366f1' : '#e2e8f0'}`, background: value === opt.value ? '#f5f3ff' : 'white', cursor: 'pointer', fontSize: 13, color: value === opt.value ? '#4c1d95' : '#64748b', transition: 'all 0.15s' }}>
            <input type="radio" style={{ marginTop: 2, accentColor: '#6366f1' }} checked={value === opt.value} onChange={() => onChange(opt.value)} />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function CheckboxGroup({ label, options, value = [], onChange }) {
  const toggle = v => value.includes(v) ? onChange(value.filter(x => x !== v)) : onChange([...value, v]);
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>{label}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {options.map(opt => (
          <label key={opt.value} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 8, border: `1px solid ${value.includes(opt.value) ? '#6366f1' : '#e2e8f0'}`, background: value.includes(opt.value) ? '#f5f3ff' : 'white', cursor: 'pointer', fontSize: 13, color: value.includes(opt.value) ? '#4c1d95' : '#64748b', transition: 'all 0.15s' }}>
            <input type="checkbox" style={{ marginTop: 2, accentColor: '#6366f1' }} checked={value.includes(opt.value)} onChange={() => toggle(opt.value)} />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function SectionNotes({ notes = {}, onChange }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, paddingTop: 16, marginTop: 8, borderTop: '1px solid #f1f5f9' }}>
      {[{ key: 'strength', label: '👍 Point fort', placeholder: 'Ce qui a bien fonctionné...', color: '#059669' }, { key: 'weakness', label: '👎 Point faible', placeholder: "Ce qui n'a pas bien fonctionné...", color: '#dc2626' }, { key: 'improvement', label: '📈 Amélioration', placeholder: 'Comment améliorer...', color: '#d97706' }].map(({ key, label, placeholder, color }) => (
        <div key={key}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color, marginBottom: 6 }}>{label}</label>
          <textarea rows={2} placeholder={placeholder} value={notes[key] || ''} onChange={e => onChange({ ...notes, [key]: e.target.value })}
            style={{ width: '100%', borderRadius: 8, border: '1px solid #e2e8f0', padding: '8px 10px', fontSize: 12, resize: 'none', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
        </div>
      ))}
    </div>
  );
}

function CategoryCard({ number, title, children }) {
  return (
    <div style={{ borderRadius: 12, border: '1px solid #e2e8f0', background: 'white', overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', background: '#f5f3ff', borderBottom: '1px solid #e2e8f0' }}>
        <span style={{ width: 28, height: 28, borderRadius: '50%', background: '#6366f1', color: 'white', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{number}</span>
        <h3 style={{ fontWeight: 600, fontSize: 14, margin: 0, color: '#1e293b' }}>{title}</h3>
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  );
}

// ─── EVALUATION SECTIONS ──────────────────────────────────────────────────────
function DecouverteSection({ data = {}, onChange, notes, onNotesChange }) {
  const set = (k, v) => onChange({ ...data, [k]: v });
  return (
    <CategoryCard number="1" title="Phase de découverte">
      <RadioGroup label="Douleur de surface identifiée ?" options={[{ value: 'oui', label: 'Oui' }, { value: 'non', label: 'Non' }]} value={data.douleur_surface} onChange={v => set('douleur_surface', v)} />
      {data.douleur_surface === 'oui' && <div style={{ marginTop: -8, marginBottom: 16 }}><Input placeholder="Note ce qu'elle était..." value={data.douleur_surface_note || ''} onChange={e => set('douleur_surface_note', e.target.value)} /></div>}
      <RadioGroup label="Douleur profonde / identitaire atteinte ?" options={[{ value: 'oui', label: '✅ Oui — le prospect l\'a verbalisé fort' }, { value: 'partiel', label: '⚠️ Partiellement — effleurée mais pas amplifiée' }, { value: 'non', label: '❌ Non — resté en surface' }]} value={data.douleur_profonde} onChange={v => set('douleur_profonde', v)} />
      {data.douleur_profonde && data.douleur_profonde !== 'non' && <div style={{ marginTop: -8, marginBottom: 16 }}><Input placeholder="Note la douleur profonde identifiée..." value={data.douleur_profonde_note || ''} onChange={e => set('douleur_profonde_note', e.target.value)} /></div>}
      <CheckboxGroup label="Couches de douleur creusées (0 à 3)" options={[{ value: 'couche1', label: 'Couche 1 : physique / performance' }, { value: 'couche2', label: 'Couche 2 : impact quotidien / social' }, { value: 'couche3', label: 'Couche 3 : identité / peur du futur' }]} value={data.couches_douleur || []} onChange={v => set('couches_douleur', v)} />
      <RadioGroup label="Temporalité de la douleur demandée ?" options={[{ value: 'oui', label: '✅ Oui — "depuis combien de temps ?"' }, { value: 'non', label: '❌ Non' }]} value={data.temporalite} onChange={v => set('temporalite', v)} />
      <RadioGroup label="Urgence naturelle identifiée ?" options={[{ value: 'oui', label: '✅ Oui' }, { value: 'artificielle', label: '⚠️ Non — urgence créée artificiellement' }, { value: 'aucune', label: '❌ Aucune urgence construite' }]} value={data.urgence} onChange={v => set('urgence', v)} />
      {data.urgence === 'oui' && <div style={{ marginTop: -8, marginBottom: 16 }}><Input placeholder="Laquelle ?" value={data.urgence_note || ''} onChange={e => set('urgence_note', e.target.value)} /></div>}
      <SectionNotes notes={notes} onChange={onNotesChange} />
    </CategoryCard>
  );
}

function ReformulationSection({ data = {}, onChange, notes, onNotesChange }) {
  const set = (k, v) => onChange({ ...data, [k]: v });
  return (
    <CategoryCard number="2" title="Reformulation">
      <RadioGroup label="Reformulation faite ?" options={[{ value: 'oui', label: '✅ Oui — complète et précise' }, { value: 'partiel', label: '⚠️ Partielle — manquait des éléments émotionnels' }, { value: 'non', label: '❌ Non' }]} value={data.reformulation} onChange={v => set('reformulation', v)} />
      <RadioGroup label="Le prospect s'est reconnu ?" options={[{ value: 'oui', label: '✅ Oui — réponse forte ("c\'est exactement ça")' }, { value: 'moyen', label: '⚠️ Moyen — acquiescement poli' }, { value: 'non', label: '❌ Non' }]} value={data.prospect_reconnu} onChange={v => set('prospect_reconnu', v)} />
      <CheckboxGroup label="Les 3 couches étaient présentes dans la reformulation ?" options={[{ value: 'physique', label: 'Douleur physique / performance' }, { value: 'quotidien', label: 'Impact quotidien' }, { value: 'identitaire', label: 'Dimension identitaire / émotionnelle' }]} value={data.couches_reformulation || []} onChange={v => set('couches_reformulation', v)} />
      <SectionNotes notes={notes} onChange={onNotesChange} />
    </CategoryCard>
  );
}

function ProjectionSection({ data = {}, onChange, notes, onNotesChange }) {
  const set = (k, v) => onChange({ ...data, [k]: v });
  return (
    <CategoryCard number="3" title="Projection">
      <RadioGroup label="Question de projection posée ?" options={[{ value: 'oui', label: '✅ Oui' }, { value: 'non', label: '❌ Non' }]} value={data.projection_posee} onChange={v => set('projection_posee', v)} />
      <RadioGroup label="Qualité de la réponse du prospect" options={[{ value: 'forte', label: '✅ Forte — réponse émotionnelle, identitaire' }, { value: 'moyenne', label: '⚠️ Moyenne — fonctionnelle ("je serais content")' }, { value: 'faible', label: '❌ Faible — vague, peu engagé' }]} value={data.qualite_reponse} onChange={v => set('qualite_reponse', v)} />
      <RadioGroup label="La deadline naturelle a été utilisée comme levier de closing ?" options={[{ value: 'oui', label: '✅ Oui — "si on démarre ce soir, tu arrives pile pour X"' }, { value: 'non_exploitee', label: '⚠️ Non — deadline identifiée mais non exploitée' }, { value: 'pas_de_deadline', label: '❌ Pas de deadline identifiée' }]} value={data.deadline_levier} onChange={v => set('deadline_levier', v)} />
      <SectionNotes notes={notes} onChange={onNotesChange} />
    </CategoryCard>
  );
}

function PresentationOffreSection({ data = {}, onChange, notes, onNotesChange }) {
  const set = (k, v) => onChange({ ...data, [k]: v });
  return (
    <CategoryCard number="4" title="Présentation de l'offre">
      <RadioGroup label="Présentation collée aux douleurs du prospect ?" options={[{ value: 'oui', label: '✅ Oui — chaque feature reliée à une douleur spécifique' }, { value: 'partiel', label: '⚠️ Partiellement — quelques liens faits' }, { value: 'non', label: '❌ Non — présentation générique, liste de features' }]} value={data.colle_douleurs} onChange={v => set('colle_douleurs', v)} />
      <RadioGroup label="Exemples de transformations / résultats bien choisis ?" options={[{ value: 'oui', label: '✅ Oui — le prospect s\'est reconnu' }, { value: 'moyen', label: '⚠️ Moyen' }, { value: 'non', label: '❌ Non — exemples inadaptés au profil' }]} value={data.exemples_transformation} onChange={v => set('exemples_transformation', v)} />
      <RadioGroup label="Durée / Offre bien justifiée ?" options={[{ value: 'oui', label: '✅ Oui — reliée à l\'objectif et au temps nécessaire' }, { value: 'partiel', label: '⚠️ Partiellement' }, { value: 'non', label: '❌ Non' }]} value={data.duree_justifiee} onChange={v => set('duree_justifiee', v)} />
      <SectionNotes notes={notes} onChange={onNotesChange} />
    </CategoryCard>
  );
}

function ClosingSection({ data = {}, onChange, notes, onNotesChange }) {
  const set = (k, v) => onChange({ ...data, [k]: v });
  return (
    <CategoryCard number="5" title="Closing & Objections">
      <RadioGroup label="Annonce du prix" options={[{ value: 'directe', label: '✅ Directe et assumée' }, { value: 'hesitante', label: '⚠️ Hésitante' }, { value: 'trop_rapide', label: '❌ Trop rapide sans ancrage de valeur avant' }]} value={data.annonce_prix} onChange={v => set('annonce_prix', v)} />
      <RadioGroup label="Silence après le prix respecté ?" options={[{ value: 'oui', label: '✅ Oui — laissé respirer' }, { value: 'non', label: '❌ Non — rempli trop vite' }]} value={data.silence_prix} onChange={v => set('silence_prix', v)} />
      <CheckboxGroup label="Objection principale rencontrée" options={[{ value: 'budget', label: 'Budget' }, { value: 'reflechir', label: '"J\'ai besoin de réfléchir"' }, { value: 'conjoint', label: 'Conjoint / autre personne à consulter' }, { value: 'methode', label: 'Pas convaincu de la méthode' }, { value: 'aucune', label: "Pas d'objection" }]} value={data.objections || []} onChange={v => set('objections', v)} />
      <RadioGroup label="Douleur réancrée AVANT de traiter l'objection ?" options={[{ value: 'oui', label: '✅ Oui — retour à la douleur avant toute négociation' }, { value: 'non', label: '❌ Non — passage direct à la solution / négociation' }]} value={data.douleur_reancree} onChange={v => set('douleur_reancree', v)} />
      <RadioGroup label="Objection bien isolée ?" options={[{ value: 'oui', label: '✅ Oui — "si ce point était réglé, tu partirais ?"' }, { value: 'non', label: '❌ Non' }]} value={data.objection_isolee} onChange={v => set('objection_isolee', v)} />
      <RadioGroup label="Résultat du closing" options={[{ value: 'close', label: '✅ Closé en direct' }, { value: 'retrograde', label: '⚠️ Rétrogradé (6 mois → 3 mois)' }, { value: 'relance', label: '📅 Relance planifiée avec date précise' }, { value: 'porte_ouverte', label: '🔓 Non closé — porte ouverte' }, { value: 'perdu', label: '❌ Non closé — perdu' }]} value={data.resultat_closing} onChange={v => set('resultat_closing', v)} />
      <SectionNotes notes={notes} onChange={onNotesChange} />
    </CategoryCard>
  );
}

// ─── AUTH PAGES ───────────────────────────────────────────────────────────────
function LoginPage({ onLogin, goToRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const data = await apiFetch('/auth/login', { method: 'POST', body: { email, password } });
      setToken(data.token);
      onLogin(data.user);
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 16px' }}>📞</div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1e293b', margin: 0 }}>CloserDebrief</h1>
          <p style={{ color: '#64748b', fontSize: 14, marginTop: 6 }}>Connectez-vous à votre compte</p>
        </div>
        <div style={{ background: 'white', borderRadius: 16, padding: 32, boxShadow: '0 8px 32px rgba(99,102,241,0.12)', border: '1px solid #e2e8f0' }}>
          <Alert type="error" message={error} />
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Email</label>
              <Input type="email" placeholder="votre@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Mot de passe</label>
              <Input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <Btn type="submit" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Connexion...' : 'Se connecter'}
            </Btn>
          </form>
          <p style={{ textAlign: 'center', fontSize: 13, color: '#64748b', marginTop: 20 }}>
            Pas encore de compte ?{' '}
            <button onClick={goToRegister} style={{ background: 'none', border: 'none', color: '#6366f1', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>S'inscrire</button>
          </p>
        </div>
        <p style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8', marginTop: 16 }}>
          Admin par défaut : admin@closerdebrief.com / Admin1234!
        </p>
      </div>
    </div>
  );
}

function RegisterPage({ onLogin, goToLogin }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) return setError('Les mots de passe ne correspondent pas');
    if (form.password.length < 8) return setError('Le mot de passe doit contenir au moins 8 caractères');
    setLoading(true);
    try {
      const data = await apiFetch('/auth/register', { method: 'POST', body: { name: form.name, email: form.email, password: form.password } });
      setToken(data.token);
      onLogin(data.user);
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 16px' }}>📞</div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1e293b', margin: 0 }}>CloserDebrief</h1>
          <p style={{ color: '#64748b', fontSize: 14, marginTop: 6 }}>Créez votre compte gratuitement</p>
        </div>
        <div style={{ background: 'white', borderRadius: 16, padding: 32, boxShadow: '0 8px 32px rgba(99,102,241,0.12)', border: '1px solid #e2e8f0' }}>
          <Alert type="error" message={error} />
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Nom complet</label>
              <Input placeholder="Jean Dupont" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Email</label>
              <Input type="email" placeholder="votre@email.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Mot de passe</label>
              <Input type="password" placeholder="8 caractères minimum" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Confirmer le mot de passe</label>
              <Input type="password" placeholder="••••••••" value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })} required />
            </div>
            <Btn type="submit" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Création...' : 'Créer mon compte'}
            </Btn>
          </form>
          <p style={{ textAlign: 'center', fontSize: 13, color: '#64748b', marginTop: 20 }}>
            Déjà un compte ?{' '}
            <button onClick={goToLogin} style={{ background: 'none', border: 'none', color: '#6366f1', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Se connecter</button>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGES ───────────────────────────────────────────────────────────────
function Dashboard({ debriefs, navigate, user }) {
  const recentDebriefs = debriefs.slice(0, 5);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1e293b', margin: 0 }}>Tableau de bord</h1>
          <p style={{ color: '#64748b', marginTop: 4, fontSize: 14 }}>
            Bonjour, {user.name} {user.role === 'admin' && <span style={{ background: '#fef3c7', color: '#92400e', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, marginLeft: 6 }}>Admin</span>}
          </p>
        </div>
        <Btn onClick={() => navigate('NewDebrief')}>+ Nouveau debrief</Btn>
      </div>
      <StatsOverview debriefs={debriefs} />
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: '#1e293b', marginBottom: 16 }}>Évolution du score</h2>
        <ProgressChart debriefs={debriefs} />
      </div>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, color: '#1e293b', margin: 0 }}>Derniers debriefs</h2>
          {debriefs.length > 5 && <button onClick={() => navigate('DebriefHistory')} style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: 13, cursor: 'pointer' }}>Voir tout ›</button>}
        </div>
        {recentDebriefs.length === 0 ? (
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 48, textAlign: 'center' }}>
            <p style={{ color: '#94a3b8', marginBottom: 16 }}>Aucun debrief enregistré</p>
            <Btn variant="secondary" onClick={() => navigate('NewDebrief')}>+ Créer votre premier debrief</Btn>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recentDebriefs.map(d => <DebriefCard key={d.id} debrief={d} onClick={() => navigate('DebriefDetail', d.id)} showUser={user.role === 'admin'} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function DebriefHistory({ debriefs, navigate, user }) {
  const [search, setSearch] = useState('');
  const filtered = debriefs.filter(d => {
    const q = search.toLowerCase();
    return d.prospect_name?.toLowerCase().includes(q) || d.closer_name?.toLowerCase().includes(q);
  });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0 }}>Historique des debriefs</h1>
        <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 4 }}>{debriefs.length} debrief{debriefs.length > 1 ? 's' : ''} enregistré{debriefs.length > 1 ? 's' : ''}</p>
      </div>
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 14 }}>🔍</span>
        <input placeholder="Rechercher par prospect ou closer..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
      </div>
      {filtered.length === 0
        ? <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 48, textAlign: 'center', color: '#94a3b8' }}>Aucun résultat trouvé</div>
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{filtered.map(d => <DebriefCard key={d.id} debrief={d} onClick={() => navigate('DebriefDetail', d.id)} showUser={user.role === 'admin'} />)}</div>
      }
    </div>
  );
}

function DebriefDetail({ debrief, navigate, onDelete }) {
  if (!debrief) return (
    <div style={{ textAlign: 'center', padding: 80 }}>
      <p style={{ color: '#94a3b8' }}>Debrief introuvable</p>
      <Btn variant="secondary" onClick={() => navigate('Dashboard')} style={{ marginTop: 16 }}>Retour</Btn>
    </div>
  );
  const pct = Math.round(debrief.percentage || 0);
  const CRITERIA_LABELS = { accroche: 'Accroche / Prise de contact', decouverte: 'Phase de découverte', douleur: 'Identification de la douleur', presentation_offre: "Présentation de l'offre", traitement_objections: 'Traitement des objections', closing: 'Closing', energie_ton: 'Énergie & Ton', ecoute_active: 'Écoute active' };
  const getBarColor = val => val >= 4 ? '#059669' : val >= 3 ? '#d97706' : val >= 2 ? '#6366f1' : '#ef4444';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Btn variant="secondary" onClick={() => navigate('Dashboard')} style={{ width: 36, height: 36, padding: 0, borderRadius: 8 }}>←</Btn>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', margin: 0 }}>{debrief.prospect_name}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
              <span>📅 {formatDate(debrief.call_date)}</span>
              <span>👤 {debrief.closer_name}</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ClosedBadge isClosed={debrief.is_closed} />
          {debrief.call_link && <a href={debrief.call_link} target="_blank" rel="noopener noreferrer" style={{ padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: 8, background: 'white', fontSize: 12, textDecoration: 'none', color: '#374151' }}>🔗 Écouter</a>}
          <Btn variant="danger" onClick={() => { onDelete(debrief.id); navigate('Dashboard'); }} style={{ width: 36, height: 36, padding: 0, borderRadius: 8 }}>🗑</Btn>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20 }}>
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <ScoreGauge percentage={pct} size="lg" />
          <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>{debrief.total_score} / {debrief.max_score} points</p>
          <RadarScore scores={debrief.scores} />
        </div>
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 20 }}>Détail par critère</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {Object.entries(CRITERIA_LABELS).map(([key, label]) => {
              const val = debrief.scores?.[key] || 0;
              const cn = debrief.criteria_notes?.[key];
              return (
                <div key={key}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 6, border: '1px solid #e2e8f0', color: '#374151' }}>{val}/5</span>
                  </div>
                  <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(val / 5) * 100}%`, background: getBarColor(val), borderRadius: 4, transition: 'width 0.7s ease-in-out' }} />
                  </div>
                  {cn && (cn.strength || cn.weakness || cn.improvement) && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 8 }}>
                      {cn.strength && <div style={{ fontSize: 11, padding: '6px 8px', borderRadius: 6, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534' }}>👍 {cn.strength}</div>}
                      {cn.weakness && <div style={{ fontSize: 11, padding: '6px 8px', borderRadius: 6, background: '#fff5f5', border: '1px solid #fca5a5', color: '#991b1b' }}>👎 {cn.weakness}</div>}
                      {cn.improvement && <div style={{ fontSize: 11, padding: '6px 8px', borderRadius: 6, background: '#fffbeb', border: '1px solid #fcd34d', color: '#92400e' }}>📈 {cn.improvement}</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {(debrief.strengths || debrief.improvements || debrief.notes) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {debrief.strengths && <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}><h3 style={{ fontSize: 13, fontWeight: 600, color: '#059669', marginBottom: 8 }}>Points forts</h3><p style={{ fontSize: 13, color: '#64748b', whiteSpace: 'pre-wrap' }}>{debrief.strengths}</p></div>}
          {debrief.improvements && <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}><h3 style={{ fontSize: 13, fontWeight: 600, color: '#d97706', marginBottom: 8 }}>Axes d'amélioration</h3><p style={{ fontSize: 13, color: '#64748b', whiteSpace: 'pre-wrap' }}>{debrief.improvements}</p></div>}
          {debrief.notes && <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}><h3 style={{ fontSize: 13, fontWeight: 600, color: '#6366f1', marginBottom: 8 }}>Notes</h3><p style={{ fontSize: 13, color: '#64748b', whiteSpace: 'pre-wrap' }}>{debrief.notes}</p></div>}
        </div>
      )}
    </div>
  );
}

function NewDebrief({ navigate, onSave }) {
  const [form, setForm] = useState({ prospect_name: '', call_date: new Date().toISOString().split('T')[0], closer_name: '', call_link: '', is_closed: null, notes: '' });
  const [sections, setSections] = useState({ decouverte: {}, reformulation: {}, projection: {}, offre: {}, closing: {} });
  const [sectionNotes, setSectionNotes] = useState({ decouverte: {}, reformulation: {}, projection: {}, offre: {}, closing: {} });
  const [loading, setLoading] = useState(false);
  const setSection = (key, val) => setSections(s => ({ ...s, [key]: val }));
  const setNote = (key, val) => setSectionNotes(n => ({ ...n, [key]: val }));
  const { total, max, percentage } = computeScore(sections);

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      const saved = await apiFetch('/debriefs', { method: 'POST', body: { ...form, sections, section_notes: sectionNotes, total_score: total, max_score: max, percentage, scores: {}, criteria_notes: {} } });
      onSave(saved);
      navigate('DebriefDetail', saved.id);
    } catch (err) {
      alert(err.message);
    } finally { setLoading(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Btn variant="secondary" onClick={() => navigate('Dashboard')} style={{ width: 36, height: 36, padding: 0, borderRadius: 8 }}>←</Btn>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', margin: 0 }}>Nouveau debrief</h1>
          <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 2 }}>Évaluez votre dernier appel</p>
        </div>
      </div>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 16 }}>Informations de l'appel</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
                <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Prospect</label><Input required placeholder="Nom du prospect" value={form.prospect_name} onChange={e => setForm({ ...form, prospect_name: e.target.value })} /></div>
                <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Closer</label><Input required placeholder="Votre nom" value={form.closer_name} onChange={e => setForm({ ...form, closer_name: e.target.value })} /></div>
                <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Date</label><Input type="date" required value={form.call_date} onChange={e => setForm({ ...form, call_date: e.target.value })} /></div>
              </div>
              <div style={{ marginBottom: 16 }}><label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>🔗 Lien enregistrement</label><Input type="url" placeholder="https://..." value={form.call_link} onChange={e => setForm({ ...form, call_link: e.target.value })} /></div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Résultat de l'appel</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[{ val: true, label: '✅ Closer', border: '#059669', bg: '#d1fae5', color: '#065f46' }, { val: false, label: '❌ Non Closer', border: '#dc2626', bg: '#fee2e2', color: '#991b1b' }].map(({ val, label, border, bg, color }) => (
                    <button key={String(val)} type="button" onClick={() => setForm({ ...form, is_closed: val })}
                      style={{ flex: 1, padding: '12px 16px', borderRadius: 10, border: `2px solid ${form.is_closed === val ? border : '#e2e8f0'}`, background: form.is_closed === val ? bg : 'white', color: form.is_closed === val ? color : '#94a3b8', fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s' }}>{label}</button>
                  ))}
                </div>
              </div>
            </div>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', margin: 0 }}>Évaluation des critères</h2>
            <DecouverteSection data={sections.decouverte} onChange={v => setSection('decouverte', v)} notes={sectionNotes.decouverte} onNotesChange={n => setNote('decouverte', n)} />
            <ReformulationSection data={sections.reformulation} onChange={v => setSection('reformulation', v)} notes={sectionNotes.reformulation} onNotesChange={n => setNote('reformulation', n)} />
            <ProjectionSection data={sections.projection} onChange={v => setSection('projection', v)} notes={sectionNotes.projection} onNotesChange={n => setNote('projection', n)} />
            <PresentationOffreSection data={sections.offre} onChange={v => setSection('offre', v)} notes={sectionNotes.offre} onNotesChange={n => setNote('offre', n)} />
            <ClosingSection data={sections.closing} onChange={v => setSection('closing', v)} notes={sectionNotes.closing} onNotesChange={n => setNote('closing', n)} />
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 12 }}>Notes globales</h3>
              <Textarea placeholder="Notes libres sur l'appel..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <div style={{ position: 'sticky', top: 80 }}>
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', margin: 0 }}>Score en direct</h3>
              <ScoreGauge percentage={percentage} size="lg" />
              <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>{total} / {max} points</p>
              {form.is_closed !== null && <ClosedBadge isClosed={form.is_closed} />}
              <Btn type="submit" disabled={loading} style={{ width: '100%' }}>
                {loading ? 'Enregistrement...' : '💾 Enregistrer le debrief'}
              </Btn>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const [authPage, setAuthPage] = useState('login'); // 'login' | 'register'
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [page, setPage] = useState('Dashboard');
  const [selectedId, setSelectedId] = useState(null);
  const [debriefs, setDebriefs] = useState([]);
  const [loadingDebriefs, setLoadingDebriefs] = useState(false);

  // Restore session on mount
  useEffect(() => {
    const token = getToken();
    if (!token) { setLoadingAuth(false); return; }
    apiFetch('/auth/me').then(u => { setUser(u); }).catch(() => { clearToken(); }).finally(() => setLoadingAuth(false));
  }, []);

  // Load debriefs when user is set
  useEffect(() => {
    if (!user) return;
    setLoadingDebriefs(true);
    apiFetch('/debriefs').then(setDebriefs).catch(console.error).finally(() => setLoadingDebriefs(false));
  }, [user]);

  const navigate = (p, id = null) => { setPage(p); setSelectedId(id); };
  const onLogin = u => { setUser(u); setPage('Dashboard'); };
  const onLogout = () => { clearToken(); setUser(null); setDebriefs([]); setPage('Dashboard'); };
  const onSave = d => setDebriefs(prev => [d, ...prev]);
  const onDelete = async id => {
    try { await apiFetch(`/debriefs/${id}`, { method: 'DELETE' }); setDebriefs(prev => prev.filter(d => d.id !== id)); } catch (err) { alert(err.message); }
  };
  const selectedDebrief = debriefs.find(d => d.id === selectedId);

  const navItems = [
    { key: 'Dashboard', label: 'Tableau de bord', icon: '⊞' },
    { key: 'NewDebrief', label: 'Nouveau debrief', icon: '+' },
    { key: 'DebriefHistory', label: 'Historique', icon: '🕐' },
  ];

  if (loadingAuth) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 36, height: 36, border: '4px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (!user) {
    return authPage === 'login'
      ? <LoginPage onLogin={onLogin} goToRegister={() => setAuthPage('register')} />
      : <RegisterPage onLogin={onLogin} goToLogin={() => setAuthPage('login')} />;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(16px)', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <button onClick={() => navigate('Dashboard')} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📞</div>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', letterSpacing: '-0.02em' }}>CloserDebrief</span>
          </button>
          <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {navItems.map(({ key, label, icon }) => (
              <button key={key} onClick={() => navigate(key)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s', background: page === key ? '#6366f1' : 'transparent', color: page === key ? 'white' : '#64748b', boxShadow: page === key ? '0 2px 8px rgba(99,102,241,0.3)' : 'none', fontFamily: 'inherit' }}>
                <span style={{ fontSize: 14 }}>{icon}</span>{label}
              </button>
            ))}
          </nav>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#6366f1' }}>
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{user.name}</span>
              {user.role === 'admin' && <span style={{ background: '#fef3c7', color: '#92400e', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>ADMIN</span>}
            </div>
            <Btn variant="secondary" onClick={onLogout} style={{ padding: '6px 12px', fontSize: 12 }}>Déconnexion</Btn>
          </div>
        </div>
      </header>
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
        {loadingDebriefs
          ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}><div style={{ width: 32, height: 32, border: '4px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /><style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style></div>
          : <>
            {page === 'Dashboard' && <Dashboard debriefs={debriefs} navigate={navigate} user={user} />}
            {page === 'NewDebrief' && <NewDebrief navigate={navigate} onSave={onSave} />}
            {page === 'DebriefHistory' && <DebriefHistory debriefs={debriefs} navigate={navigate} user={user} />}
            {page === 'DebriefDetail' && <DebriefDetail debrief={selectedDebrief} navigate={navigate} onDelete={onDelete} />}
          </>
        }
      </main>
    </div>
  );
}
