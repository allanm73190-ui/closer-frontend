import React, { useState, useEffect, useCallback, useRef } from "react";

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const API_BASE = 'https://closer-backend-production.up.railway.app/api';

// ─── AUTH TOKENS ─────────────────────────────────────────────────────────────
function getToken()  { return localStorage.getItem('cd_token'); }
function setToken(t) { localStorage.setItem('cd_token', t); }
function clearToken(){ localStorage.removeItem('cd_token'); }

let _onExpired = null;

async function apiFetch(path, opts = {}) {
  const token = getToken();
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...opts.headers,
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new Error('Impossible de contacter le serveur. Vérifiez votre connexion.');
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    clearToken();
    _onExpired?.();
    throw new Error(data.error || 'Session expirée');
  }
  if (!res.ok) throw new Error(data.error || 'Erreur serveur');
  return data;
}

// ─── RESPONSIVE ───────────────────────────────────────────────────────────────
function useIsMobile(bp = 768) {
  const [v, setV] = useState(() => window.innerWidth < bp);
  useEffect(() => {
    const h = () => setV(window.innerWidth < bp);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, [bp]);
  return v;
}

// ─── SCORES ───────────────────────────────────────────────────────────────────
function computeScore(sections) {
  let pts = 0, max = 0;
  const add = (val, pos, total) => {
    max += total;
    if (Array.isArray(pos)) {
      if (Array.isArray(val)) pts += val.filter(v => pos.includes(v)).length;
      else if (pos.includes(val)) pts++;
    } else if (val === pos) pts++;
  };
  const d = sections.decouverte || {};
  add(d.douleur_surface, 'oui', 1);
  add(d.douleur_profonde, ['oui','partiel'], 1);
  add(d.couches_douleur, ['couche1','couche2','couche3'], 3);
  add(d.temporalite, 'oui', 1);
  add(d.urgence, ['oui','artificielle'], 1);
  const r = sections.reformulation || {};
  add(r.reformulation, ['oui','partiel'], 1);
  add(r.prospect_reconnu, ['oui','moyen'], 1);
  add(r.couches_reformulation, ['physique','quotidien','identitaire'], 3);
  const p = sections.projection || {};
  add(p.projection_posee, 'oui', 1);
  add(p.qualite_reponse, ['forte','moyenne'], 1);
  add(p.deadline_levier, 'oui', 1);
  const o = sections.offre || {};
  add(o.colle_douleurs, ['oui','partiel'], 1);
  add(o.exemples_transformation, ['oui','moyen'], 1);
  add(o.duree_justifiee, ['oui','partiel'], 1);
  const c = sections.closing || {};
  add(c.annonce_prix, 'directe', 1);
  add(c.silence_prix, 'oui', 1);
  add(c.douleur_reancree, 'oui', 1);
  add(c.objection_isolee, 'oui', 1);
  add(c.resultat_closing, ['close','retrograde','relance'], 1);
  return { total: pts, max, percentage: max > 0 ? Math.round((pts / max) * 100) : 0 };
}

// Identique au backend
function computeSectionScores(sections) {
  const s = sections || {};
  const pct = (pts, max) => max > 0 ? Math.round((pts / max) * 5) : 0;
  const d = s.decouverte || {};
  let dP = 0;
  if (d.douleur_surface === 'oui') dP++;
  if (['oui','partiel'].includes(d.douleur_profonde)) dP++;
  if (Array.isArray(d.couches_douleur)) dP += Math.min(d.couches_douleur.length, 3);
  if (d.temporalite === 'oui') dP++;
  if (['oui','artificielle'].includes(d.urgence)) dP++;
  const r = s.reformulation || {};
  let rP = 0;
  if (['oui','partiel'].includes(r.reformulation)) rP++;
  if (['oui','moyen'].includes(r.prospect_reconnu)) rP++;
  if (Array.isArray(r.couches_reformulation)) rP += Math.min(r.couches_reformulation.length, 3);
  const p = s.projection || {};
  let pP = 0;
  if (p.projection_posee === 'oui') pP++;
  if (['forte','moyenne'].includes(p.qualite_reponse)) pP++;
  if (p.deadline_levier === 'oui') pP++;
  const o = s.offre || {};
  let oP = 0;
  if (['oui','partiel'].includes(o.colle_douleurs)) oP++;
  if (['oui','moyen'].includes(o.exemples_transformation)) oP++;
  if (['oui','partiel'].includes(o.duree_justifiee)) oP++;
  const c = s.closing || {};
  let cP = 0;
  if (c.annonce_prix === 'directe') cP++;
  if (c.silence_prix === 'oui') cP++;
  if (c.douleur_reancree === 'oui') cP++;
  if (c.objection_isolee === 'oui') cP++;
  if (['close','retrograde','relance'].includes(c.resultat_closing)) cP++;
  return {
    decouverte: pct(dP,7), reformulation: pct(rP,5),
    projection: pct(pP,3), presentation_offre: pct(oP,3), closing: pct(cP,5),
  };
}

function computeLevel(p) {
  if (p >= 500) return { name:'Légende',      icon:'👑', min:500, next:null };
  if (p >= 200) return { name:'Expert',        icon:'💎', min:200, next:500  };
  if (p >= 100) return { name:'Confirmé',      icon:'🥇', min:100, next:200  };
  if (p >= 50)  return { name:'Intermédiaire', icon:'🥈', min:50,  next:100  };
  if (p >= 20)  return { name:'Débutant+',     icon:'🥉', min:20,  next:50   };
  return              { name:'Débutant',       icon:'🌱', min:0,   next:20   };
}

// Moyenne des scores de section sur un tableau de debriefs
function avgSectionScores(debriefs) {
  const keys = ['decouverte','reformulation','projection','presentation_offre','closing'];
  const sums = Object.fromEntries(keys.map(k => [k, 0]));
  let n = 0;
  for (const d of debriefs) {
    if (!d.sections) continue;
    const s = computeSectionScores(d.sections);
    keys.forEach(k => { sums[k] += s[k]; });
    n++;
  }
  if (n === 0) return null;
  return Object.fromEntries(keys.map(k => [k, Math.round((sums[k] / n) * 10) / 10]));
}

// ─── UTILS ────────────────────────────────────────────────────────────────────
const fmtDate  = s => { try { return new Date(s).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'}); } catch { return s||''; }};
const fmtShort = s => { try { return new Date(s).toLocaleDateString('fr-FR',{day:'2-digit',month:'short'}); }             catch { return s||''; }};
const copy     = t => navigator.clipboard.writeText(t).catch(()=>{});

// ─── TOAST ────────────────────────────────────────────────────────────────────
function useToast() {
  const [list, setList] = useState([]);
  const toast = useCallback((msg, type = 'success', ms = 3500) => {
    const id = Date.now() + Math.random();
    setList(p => [...p.slice(-4), { id, msg, type }]);
    setTimeout(() => setList(p => p.filter(t => t.id !== id)), ms);
  }, []);
  return { list, toast };
}
function Toasts({ list }) {
  const mob = useIsMobile();
  if (!list.length) return null;
  const bg = { success:'#1e293b', error:'#dc2626', info:'#6366f1' };
  const ic = { success:'✓', error:'✕', info:'ℹ' };
  return (
    <div style={{ position:'fixed', bottom:mob?16:24, right:mob?8:24, left:mob?8:'auto', zIndex:9999, display:'flex', flexDirection:'column', gap:8 }}>
      {list.map(t => (
        <div key={t.id} style={{ padding:'12px 16px', borderRadius:10, fontSize:13, fontWeight:500, background:bg[t.type]||bg.success, color:'white', display:'flex', alignItems:'center', gap:8, animation:'toastIn .25s ease', boxShadow:'0 4px 20px rgba(0,0,0,.15)' }}>
          <span style={{ flexShrink:0 }}>{ic[t.type]||ic.success}</span>{t.msg}
        </div>
      ))}
      <style>{`@keyframes toastIn{from{transform:translateX(110%);opacity:0}to{transform:none;opacity:1}}`}</style>
    </div>
  );
}

// ─── BURST ────────────────────────────────────────────────────────────────────
function Burst({ points, levelUp, newLevel, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return (
    <div style={{ position:'fixed', inset:0, zIndex:9998, pointerEvents:'none', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius:20, padding:'24px 36px', color:'white', textAlign:'center', animation:'burstIn .4s cubic-bezier(.34,1.56,.64,1)', boxShadow:'0 8px 40px rgba(99,102,241,.5)' }}>
        <p style={{ fontSize:32, fontWeight:800, margin:0 }}>+{points} pts !</p>
        {levelUp && <p style={{ fontSize:15, fontWeight:600, margin:'8px 0 0', opacity:.9 }}>🎉 Niveau : {newLevel}</p>}
      </div>
      <style>{`@keyframes burstIn{from{transform:scale(.3);opacity:0}to{transform:none;opacity:1}}`}</style>
    </div>
  );
}

// ─── UI PRIMITIVES ────────────────────────────────────────────────────────────
function Input({ placeholder, value, onChange, type='text', required, autoFocus, style={} }) {
  return (
    <input type={type} placeholder={placeholder} value={value} onChange={onChange}
      required={required} autoFocus={autoFocus}
      style={{ width:'100%', borderRadius:8, border:'1px solid #e2e8f0', padding:'11px 12px', fontSize:14, fontFamily:'inherit', outline:'none', boxSizing:'border-box', color:'#1e293b', transition:'border-color .15s', ...style }}
      onFocus={e => e.target.style.borderColor = '#6366f1'}
      onBlur={e  => e.target.style.borderColor = '#e2e8f0'}
    />
  );
}
function Textarea({ placeholder, value, onChange, rows=3 }) {
  return (
    <textarea placeholder={placeholder} value={value} onChange={onChange} rows={rows}
      style={{ width:'100%', borderRadius:8, border:'1px solid #e2e8f0', padding:'10px 12px', fontSize:14, fontFamily:'inherit', outline:'none', resize:'vertical', boxSizing:'border-box', color:'#1e293b' }}
    />
  );
}

const BTN_VARIANTS = {
  primary:   { background:'#6366f1', color:'white',    border:'none',                  boxShadow:'0 2px 8px rgba(99,102,241,.3)' },
  secondary: { background:'white',   color:'#374151',  border:'1px solid #e2e8f0',     boxShadow:'none' },
  danger:    { background:'#fee2e2', color:'#dc2626',  border:'1px solid #fca5a5',     boxShadow:'none' },
  ghost:     { background:'transparent', color:'#64748b', border:'none',               boxShadow:'none' },
  green:     { background:'#d1fae5', color:'#065f46',  border:'1px solid #6ee7b7',     boxShadow:'none' },
};
function Btn({ children, onClick, type='button', variant='primary', disabled, style={} }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', gap:8, padding:'11px 20px', borderRadius:10, fontSize:14, fontWeight:600, cursor:disabled?'not-allowed':'pointer', transition:'all .15s', opacity:disabled?.55:1, fontFamily:'inherit', ...BTN_VARIANTS[variant], ...style }}>
      {children}
    </button>
  );
}
function AlertBox({ type, message }) {
  if (!message) return null;
  const styles = {
    error:   { background:'#fee2e2', border:'1px solid #fca5a5', color:'#991b1b' },
    success: { background:'#d1fae5', border:'1px solid #6ee7b7', color:'#065f46' },
    info:    { background:'#ede9fe', border:'1px solid #c4b5fd', color:'#4c1d95' },
  };
  return <div style={{ ...styles[type||'info'], padding:'12px 14px', borderRadius:8, fontSize:14, marginBottom:16 }}>{message}</div>;
}
function Spinner({ full=false, size=32 }) {
  const el = (
    <>
      <div style={{ width:size, height:size, border:`${size>20?4:3}px solid #e2e8f0`, borderTopColor:'#6366f1', borderRadius:'50%', animation:'spin .75s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </>
  );
  return full ? <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'50vh' }}>{el}</div> : el;
}
function Empty({ icon, title, subtitle, action }) {
  return (
    <div style={{ background:'white', border:'1px solid #e2e8f0', borderRadius:12, padding:'40px 24px', textAlign:'center' }}>
      <div style={{ fontSize:40, marginBottom:12 }}>{icon}</div>
      <p style={{ fontWeight:600, fontSize:16, color:'#1e293b', margin:'0 0 6px' }}>{title}</p>
      <p style={{ color:'#94a3b8', fontSize:14, margin:`0 0 ${action?'20px':'0'}` }}>{subtitle}</p>
      {action}
    </div>
  );
}
function Card({ children, style={} }) {
  return <div style={{ background:'white', border:'1px solid #e2e8f0', borderRadius:12, ...style }}>{children}</div>;
}
function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:9000, background:'rgba(0,0,0,.4)', display:'flex', alignItems:'flex-end', justifyContent:'center' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:'white', borderRadius:'16px 16px 0 0', padding:24, width:'100%', maxWidth:500, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 -8px 40px rgba(0,0,0,.15)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <h2 style={{ fontSize:17, fontWeight:700, color:'#1e293b', margin:0 }}>{title}</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#94a3b8', cursor:'pointer', fontSize:22, lineHeight:1, padding:'2px 6px' }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── SCORE GAUGE ──────────────────────────────────────────────────────────────
function ScoreGauge({ percentage, size='lg' }) {
  const r  = size==='lg' ? 54 : 36;
  const st = size==='lg' ? 8  : 6;
  const circ = 2 * Math.PI * r;
  const off  = circ - (Math.min(percentage, 100) / 100) * circ;
  const vb   = size==='lg' ? 130 : 90;
  const c    = vb / 2;
  const color = percentage>=80?'#059669':percentage>=60?'#d97706':percentage>=40?'#6366f1':'#ef4444';
  return (
    <div style={{ position:'relative', display:'inline-flex', alignItems:'center', justifyContent:'center' }}>
      <svg width={vb} height={vb} viewBox={`0 0 ${vb} ${vb}`}>
        <circle cx={c} cy={c} r={r} fill="none" stroke="#e2e8f0" strokeWidth={st}/>
        <circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth={st}
          strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
          transform={`rotate(-90 ${c} ${c})`} style={{ transition:'stroke-dashoffset .8s ease' }}/>
      </svg>
      <div style={{ position:'absolute', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <span style={{ fontWeight:700, fontSize:size==='lg'?28:16, color }}>{Math.round(percentage)}%</span>
      </div>
    </div>
  );
}
function ScoreBadge({ pct }) {
  const s = pct>=80?{bg:'#d1fae5',c:'#065f46',b:'#6ee7b7'}:pct>=60?{bg:'#fef3c7',c:'#92400e',b:'#fcd34d'}:pct>=40?{bg:'#ede9fe',c:'#4c1d95',b:'#c4b5fd'}:{bg:'#fee2e2',c:'#991b1b',b:'#fca5a5'};
  return <span style={{ background:s.bg, color:s.c, border:`1px solid ${s.b}`, padding:'3px 10px', borderRadius:8, fontWeight:700, fontSize:13, whiteSpace:'nowrap' }}>{pct}%</span>;
}
function ClosedBadge({ isClosed }) {
  if (isClosed === null || isClosed === undefined) return null;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'5px 10px', borderRadius:8, fontSize:12, fontWeight:600, whiteSpace:'nowrap', background:isClosed?'#d1fae5':'#fee2e2', color:isClosed?'#065f46':'#991b1b' }}>
      {isClosed ? '✓ Closer' : '✗ Non Closer'}
    </span>
  );
}

// ─── RADAR (5 sections exactes) ───────────────────────────────────────────────
const SECTIONS = [
  { key:'decouverte',         label:'Découverte'    },
  { key:'reformulation',      label:'Reformulation' },
  { key:'projection',         label:'Projection'    },
  { key:'presentation_offre', label:'Offre'         },
  { key:'closing',            label:'Closing'       },
];

function Radar({ scores, color='#6366f1', size=220 }) {
  if (!scores) return null;
  const n=SECTIONS.length, cx=size/2, cy=size/2, R=size*0.36;
  const angle = i => (i/n)*2*Math.PI - Math.PI/2;
  const pts = SECTIONS.map((s,i) => {
    const v = (scores[s.key]||0) / 5;
    const a = angle(i);
    return [cx + R*v*Math.cos(a), cy + R*v*Math.sin(a)];
  });
  const fill = color==='#6366f1'?'rgba(99,102,241,.15)':color==='#059669'?'rgba(5,150,105,.15)':'rgba(217,119,6,.15)';
  const allZero = SECTIONS.every(s => (scores[s.key]||0) === 0);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow:'visible', maxWidth:'100%' }}>
      {[1,2,3,4,5].map(l => {
        const r = (l/5)*R;
        const ps = SECTIONS.map((_,i) => { const a=angle(i); return `${cx+r*Math.cos(a)},${cy+r*Math.sin(a)}`; }).join(' ');
        return <polygon key={l} points={ps} fill="none" stroke="#e2e8f0" strokeWidth="1"/>;
      })}
      {SECTIONS.map((_,i) => { const a=angle(i); return <line key={i} x1={cx} y1={cy} x2={cx+R*Math.cos(a)} y2={cy+R*Math.sin(a)} stroke="#e2e8f0" strokeWidth="1"/>; })}
      {!allZero && <>
        <polygon points={pts.map(p=>p.join(',')).join(' ')} fill={fill} stroke={color} strokeWidth="2.5"/>
        {pts.map(([x,y],i) => <circle key={i} cx={x} cy={y} r={4} fill={color} stroke="white" strokeWidth="2"/>)}
      </>}
      {SECTIONS.map((s,i) => {
        const a = angle(i);
        return <text key={i} x={cx+(R+22)*Math.cos(a)} y={cy+(R+22)*Math.sin(a)} textAnchor="middle" dominantBaseline="central" fontSize="9" fill="#64748b" fontWeight="500">{s.label}</text>;
      })}
    </svg>
  );
}

function SectionBars({ scores, globalScores }) {
  const LABELS = { decouverte:'Découverte', reformulation:'Reformulation', projection:'Projection', presentation_offre:"Présentation offre", closing:'Closing' };
  const col = v => v>=4?'#059669':v>=3?'#d97706':v>=2?'#6366f1':'#ef4444';
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      {SECTIONS.map(({ key }) => {
        const val  = scores?.[key] || 0;
        const glob = globalScores?.[key] || 0;
        const diff = globalScores ? Math.round((val - glob) * 10) / 10 : null;
        return (
          <div key={key}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:5 }}>
              <span style={{ fontSize:13, fontWeight:600, color:'#374151' }}>{LABELS[key]}</span>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                {globalScores && <span style={{ fontSize:11, color:'#94a3b8' }}>{glob}/5 global</span>}
                <span style={{ fontSize:13, fontWeight:700, padding:'2px 8px', borderRadius:6, border:'1px solid #e2e8f0', color:col(val) }}>{val}/5</span>
                {diff !== null && diff !== 0 && <span style={{ fontSize:11, fontWeight:600, color:diff>0?'#059669':'#ef4444' }}>{diff>0?'+':''}{diff}</span>}
              </div>
            </div>
            <div style={{ position:'relative', height:10, background:'#f1f5f9', borderRadius:5, overflow:'visible' }}>
              <div style={{ height:'100%', width:`${(val/5)*100}%`, background:col(val), borderRadius:5, transition:'width .7s ease' }}/>
              {globalScores && glob > 0 && <div style={{ position:'absolute', top:-2, left:`${(glob/5)*100}%`, width:2, height:14, background:'#94a3b8', borderRadius:2 }} title={`Global: ${glob}/5`}/>}
            </div>
          </div>
        );
      })}
      {globalScores && <p style={{ fontSize:11, color:'#94a3b8', margin:0 }}>— trait gris = moyenne globale</p>}
    </div>
  );
}

// ─── GAMIFICATION CARD ────────────────────────────────────────────────────────
function GamCard({ gam }) {
  if (!gam) return null;
  const { points, level, badges } = gam;
  const pct = level.next ? Math.min(Math.round(((points-level.min)/(level.next-level.min))*100), 100) : 100;
  return (
    <div style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius:16, padding:20, color:'white' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <div>
          <p style={{ fontSize:11, opacity:.75, margin:0, textTransform:'uppercase', letterSpacing:'.06em' }}>Niveau</p>
          <h2 style={{ fontSize:20, fontWeight:700, margin:'4px 0 0' }}>{level.icon} {level.name}</h2>
        </div>
        <div style={{ textAlign:'right' }}>
          <p style={{ fontSize:11, opacity:.75, margin:0 }}>Points</p>
          <p style={{ fontSize:26, fontWeight:700, margin:0 }}>{points}</p>
        </div>
      </div>
      {level.next && (
        <div style={{ marginBottom:badges.length>0?14:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, opacity:.75, marginBottom:5 }}>
            <span>{points} pts</span>
            <span>{level.next - points} pts avant {computeLevel(level.next).name}</span>
          </div>
          <div style={{ height:8, background:'rgba(255,255,255,.2)', borderRadius:4 }}>
            <div style={{ height:'100%', width:`${pct}%`, background:'rgba(255,255,255,.9)', borderRadius:4, transition:'width .7s' }}/>
          </div>
        </div>
      )}
      {badges.length > 0 && (
        <div>
          <p style={{ fontSize:11, opacity:.75, marginBottom:8, textTransform:'uppercase', letterSpacing:'.06em' }}>Badges</p>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {badges.map(b => <span key={b.id} style={{ background:'rgba(255,255,255,.2)', padding:'4px 10px', borderRadius:20, fontSize:12, fontWeight:500 }}>{b.icon} {b.label}</span>)}
          </div>
        </div>
      )}
    </div>
  );
}

function Leaderboard({ refreshKey }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    apiFetch('/gamification/leaderboard').then(setData).catch(() => setData([])).finally(() => setLoading(false));
  }, [refreshKey]);
  if (loading || !data.length) return null;
  return (
    <Card style={{ overflow:'hidden' }}>
      <div style={{ padding:'14px 16px', borderBottom:'1px solid #f1f5f9', background:'#f8fafc' }}>
        <h3 style={{ fontSize:14, fontWeight:600, color:'#1e293b', margin:0 }}>🏆 Classement</h3>
      </div>
      {data.map((c,i) => (
        <div key={c.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderBottom:i<data.length-1?'1px solid #f1f5f9':'none', background:i===0?'#fffbeb':'white' }}>
          <div style={{ width:28, height:28, borderRadius:'50%', background:i===0?'#fef3c7':i===1?'#f1f5f9':'#f8fafc', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:13, flexShrink:0 }}>
            {i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ fontWeight:600, fontSize:13, color:'#1e293b', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.name}</p>
            <p style={{ fontSize:11, color:'#94a3b8', margin:0 }}>{c.level.icon} {c.level.name} · {c.totalDebriefs} debriefs</p>
          </div>
          <div style={{ textAlign:'right', flexShrink:0 }}>
            <p style={{ fontWeight:700, fontSize:14, color:'#6366f1', margin:0 }}>{c.points} pts</p>
            <p style={{ fontSize:11, color:'#94a3b8', margin:0 }}>{c.avgScore}%</p>
          </div>
        </div>
      ))}
    </Card>
  );
}

// ─── STATS ────────────────────────────────────────────────────────────────────
function StatsRow({ debriefs }) {
  const mob   = useIsMobile();
  const total = debriefs.length;
  const avg   = total > 0 ? Math.round(debriefs.reduce((s,d)=>s+(d.percentage||0),0)/total) : 0;
  const best  = total > 0 ? Math.max(...debriefs.map(d=>d.percentage||0)) : 0;
  const sorted = [...debriefs].sort((a,b) => new Date(b.call_date)-new Date(a.call_date));
  const rA = sorted.slice(0,3).reduce((s,d)=>s+(d.percentage||0),0) / Math.max(sorted.slice(0,3).length,1);
  const pA = sorted.slice(3,6).reduce((s,d)=>s+(d.percentage||0),0) / Math.max(sorted.slice(3,6).length,1);
  const trend = sorted.slice(3,6).length > 0 ? Math.round(rA - pA) : 0;
  const items = [
    { label:'Total appels',   value:total,                         icon:'📞', bg:'#ede9fe', c:'#6366f1' },
    { label:'Score moyen',    value:`${avg}%`,                     icon:'🎯', bg:'#d1fae5', c:'#059669' },
    { label:'Meilleur score', value:`${Math.round(best)}%`,        icon:'🏆', bg:'#fef3c7', c:'#d97706' },
    { label:'Tendance',       value:`${trend>=0?'+':''}${trend}%`, icon:trend>=0?'📈':'📉', bg:trend>=0?'#d1fae5':'#fee2e2', c:trend>=0?'#059669':'#dc2626' },
  ];
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:mob?10:16 }}>
      {items.map(({ label, value, icon, bg, c }) => (
        <Card key={label} style={{ padding:mob?'12px 14px':'16px 20px', display:'flex', alignItems:'center', gap:mob?10:14 }}>
          <div style={{ width:mob?36:44, height:mob?36:44, borderRadius:10, background:bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:mob?16:20, flexShrink:0 }}>{icon}</div>
          <div>
            <p style={{ fontSize:10, color:'#64748b', margin:0, fontWeight:500, textTransform:'uppercase', letterSpacing:'.04em' }}>{label}</p>
            <p style={{ fontSize:mob?18:22, fontWeight:700, color:c, margin:0 }}>{value}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ─── CHART ────────────────────────────────────────────────────────────────────
function Chart({ debriefs }) {
  const [hov, setHov] = useState(null);
  const data = [...debriefs]
    .sort((a,b) => new Date(a.call_date||a.date) - new Date(b.call_date||b.date))
    .map(d => ({ date:fmtShort(d.call_date||d.date), score:Math.round(d.percentage||d.score||0), prospect:d.prospect_name||d.prospect||'' }));
  if (!data.length) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:200, color:'#94a3b8', fontSize:14 }}>
      Aucune donnée — créez votre premier debrief !
    </div>
  );
  const W=560, H=200, pL=44, pR=20, pT=16, pB=28;
  const iW=W-pL-pR, iH=H-pT-pB;
  const xs = data.map((_,i) => pL + (i / Math.max(data.length-1,1)) * iW);
  const ys = data.map(d  => pT + iH - (d.score / 100) * iH);
  const path = xs.map((x,i) => `${i===0?'M':'L'} ${x} ${ys[i]}`).join(' ');
  return (
    <div style={{ width:'100%', overflowX:'auto', WebkitOverflowScrolling:'touch' }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ minWidth:280 }}>
        <defs>
          <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity=".18"/>
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0"/>
          </linearGradient>
        </defs>
        {[0,50,100].map(v => {
          const y = pT + iH - (v/100) * iH;
          return <g key={v}><line x1={pL} y1={y} x2={W-pR} y2={y} stroke="#f1f5f9" strokeWidth="1"/><text x={pL-6} y={y+4} textAnchor="end" fontSize="10" fill="#94a3b8">{v}%</text></g>;
        })}
        <path d={`${path} L ${xs[xs.length-1]} ${pT+iH} L ${pL} ${pT+iH} Z`} fill="url(#cg)"/>
        <path d={path} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        {data.map((d,i) => (
          <g key={i} onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)} onTouchStart={()=>setHov(hov===i?null:i)} style={{ cursor:'pointer' }}>
            <circle cx={xs[i]} cy={ys[i]} r={hov===i?7:5} fill="#6366f1" stroke="white" strokeWidth="2"/>
            {hov===i && (
              <g>
                <rect x={Math.max(pL, Math.min(xs[i]-55, W-pR-110))} y={ys[i]-52} width={110} height={44} rx="6" fill="white" stroke="#e2e8f0" strokeWidth="1"/>
                <text x={Math.max(pL+55, Math.min(xs[i], W-pR-55))} y={ys[i]-34} textAnchor="middle" fontSize="11" fontWeight="600" fill="#1e293b">{d.prospect||'—'}</text>
                <text x={Math.max(pL+55, Math.min(xs[i], W-pR-55))} y={ys[i]-18} textAnchor="middle" fontSize="10" fill="#64748b">{d.date} · {d.score}%</text>
              </g>
            )}
            <text x={xs[i]} y={pT+iH+16} textAnchor="middle" fontSize="10" fill="#94a3b8">{d.date}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ─── FORM PRIMITIVES ──────────────────────────────────────────────────────────
function RadioGroup({ label, options, value, onChange }) {
  return (
    <div style={{ marginBottom:16 }}>
      {label && <p style={{ fontSize:14, fontWeight:600, color:'#374151', marginBottom:8 }}>{label}</p>}
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {options.map(opt => (
          <label key={opt.value} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'12px 14px', borderRadius:8, border:`1px solid ${value===opt.value?'#6366f1':'#e2e8f0'}`, background:value===opt.value?'#f5f3ff':'white', cursor:'pointer', fontSize:14, color:value===opt.value?'#4c1d95':'#64748b', transition:'all .15s' }}>
            <input type="radio" style={{ marginTop:3, accentColor:'#6366f1', flexShrink:0 }} checked={value===opt.value} onChange={()=>onChange(opt.value)}/>
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
function CheckboxGroup({ label, options, value=[], onChange }) {
  const toggle = v => value.includes(v) ? onChange(value.filter(x=>x!==v)) : onChange([...value, v]);
  return (
    <div style={{ marginBottom:16 }}>
      {label && <p style={{ fontSize:14, fontWeight:600, color:'#374151', marginBottom:8 }}>{label}</p>}
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {options.map(opt => (
          <label key={opt.value} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'12px 14px', borderRadius:8, border:`1px solid ${value.includes(opt.value)?'#6366f1':'#e2e8f0'}`, background:value.includes(opt.value)?'#f5f3ff':'white', cursor:'pointer', fontSize:14, color:value.includes(opt.value)?'#4c1d95':'#64748b', transition:'all .15s' }}>
            <input type="checkbox" style={{ marginTop:3, accentColor:'#6366f1', flexShrink:0 }} checked={value.includes(opt.value)} onChange={()=>toggle(opt.value)}/>
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
function SectionNotes({ notes={}, onChange }) {
  const mob = useIsMobile(640);
  return (
    <div style={{ display:'grid', gridTemplateColumns:mob?'1fr':'repeat(3,1fr)', gap:10, paddingTop:16, marginTop:8, borderTop:'1px solid #f1f5f9' }}>
      {[
        { key:'strength',    label:'👍 Point fort',   placeholder:'Ce qui a bien fonctionné...', color:'#059669' },
        { key:'weakness',    label:'👎 Point faible', placeholder:"Ce qui n'a pas marché...",    color:'#dc2626' },
        { key:'improvement', label:'📈 Amélioration', placeholder:'Comment s\'améliorer...',     color:'#d97706' },
      ].map(({ key, label, placeholder, color }) => (
        <div key={key}>
          <label style={{ display:'block', fontSize:11, fontWeight:600, color, marginBottom:5 }}>{label}</label>
          <textarea rows={mob?2:3} placeholder={placeholder} value={notes[key]||''} onChange={e=>onChange({...notes,[key]:e.target.value})} style={{ width:'100%', borderRadius:8, border:'1px solid #e2e8f0', padding:'7px 10px', fontSize:12, resize:'none', fontFamily:'inherit', outline:'none', boxSizing:'border-box' }}/>
        </div>
      ))}
    </div>
  );
}
function CatCard({ number, title, children }) {
  return (
    <div style={{ borderRadius:12, border:'1px solid #e2e8f0', background:'white', overflow:'hidden', marginBottom:16 }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', background:'#f5f3ff', borderBottom:'1px solid #e2e8f0' }}>
        <span style={{ width:28, height:28, borderRadius:'50%', background:'#6366f1', color:'white', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{number}</span>
        <h3 style={{ fontWeight:600, fontSize:14, margin:0, color:'#1e293b' }}>{title}</h3>
      </div>
      <div style={{ padding:16 }}>{children}</div>
    </div>
  );
}

// ─── SECTIONS D'ÉVALUATION ────────────────────────────────────────────────────
function S1({ data={}, onChange, notes, onNotes }) {
  const set = (k,v) => onChange({...data,[k]:v});
  return (
    <CatCard number="1" title="Phase de découverte">
      <RadioGroup label="Douleur de surface identifiée ?" options={[{value:'oui',label:'Oui'},{value:'non',label:'Non'}]} value={data.douleur_surface} onChange={v=>set('douleur_surface',v)}/>
      {data.douleur_surface==='oui'&&<div style={{marginTop:-8,marginBottom:16}}><Input placeholder="Note ce qu'elle était..." value={data.douleur_surface_note||''} onChange={e=>set('douleur_surface_note',e.target.value)}/></div>}
      <RadioGroup label="Douleur profonde / identitaire atteinte ?" options={[{value:'oui',label:"✅ Oui — verbalisé fort"},{value:'partiel',label:'⚠️ Partiellement'},{value:'non',label:'❌ Non'}]} value={data.douleur_profonde} onChange={v=>set('douleur_profonde',v)}/>
      {data.douleur_profonde&&data.douleur_profonde!=='non'&&<div style={{marginTop:-8,marginBottom:16}}><Input placeholder="Note la douleur profonde..." value={data.douleur_profonde_note||''} onChange={e=>set('douleur_profonde_note',e.target.value)}/></div>}
      <CheckboxGroup label="Couches de douleur creusées" options={[{value:'couche1',label:'Couche 1 : physique / performance'},{value:'couche2',label:'Couche 2 : impact quotidien / social'},{value:'couche3',label:'Couche 3 : identité / peur du futur'}]} value={data.couches_douleur||[]} onChange={v=>set('couches_douleur',v)}/>
      <RadioGroup label="Temporalité demandée ?" options={[{value:'oui',label:'✅ Oui'},{value:'non',label:'❌ Non'}]} value={data.temporalite} onChange={v=>set('temporalite',v)}/>
      <RadioGroup label="Urgence naturelle identifiée ?" options={[{value:'oui',label:'✅ Oui'},{value:'artificielle',label:'⚠️ Artificielle'},{value:'aucune',label:'❌ Aucune'}]} value={data.urgence} onChange={v=>set('urgence',v)}/>
      {data.urgence==='oui'&&<div style={{marginTop:-8,marginBottom:16}}><Input placeholder="Laquelle ?" value={data.urgence_note||''} onChange={e=>set('urgence_note',e.target.value)}/></div>}
      <SectionNotes notes={notes} onChange={onNotes}/>
    </CatCard>
  );
}
function S2({ data={}, onChange, notes, onNotes }) {
  const set = (k,v) => onChange({...data,[k]:v});
  return (
    <CatCard number="2" title="Reformulation">
      <RadioGroup label="Reformulation faite ?" options={[{value:'oui',label:'✅ Complète et précise'},{value:'partiel',label:'⚠️ Partielle'},{value:'non',label:'❌ Non'}]} value={data.reformulation} onChange={v=>set('reformulation',v)}/>
      <RadioGroup label="Le prospect s'est reconnu ?" options={[{value:'oui',label:"✅ Oui — \"c'est exactement ça\""},{value:'moyen',label:'⚠️ Moyen'},{value:'non',label:'❌ Non'}]} value={data.prospect_reconnu} onChange={v=>set('prospect_reconnu',v)}/>
      <CheckboxGroup label="Les 3 couches présentes ?" options={[{value:'physique',label:'Douleur physique / performance'},{value:'quotidien',label:'Impact quotidien'},{value:'identitaire',label:'Dimension identitaire'}]} value={data.couches_reformulation||[]} onChange={v=>set('couches_reformulation',v)}/>
      <SectionNotes notes={notes} onChange={onNotes}/>
    </CatCard>
  );
}
function S3({ data={}, onChange, notes, onNotes }) {
  const set = (k,v) => onChange({...data,[k]:v});
  return (
    <CatCard number="3" title="Projection">
      <RadioGroup label="Question de projection posée ?" options={[{value:'oui',label:'✅ Oui'},{value:'non',label:'❌ Non'}]} value={data.projection_posee} onChange={v=>set('projection_posee',v)}/>
      <RadioGroup label="Qualité de la réponse" options={[{value:'forte',label:'✅ Forte — émotionnelle, identitaire'},{value:'moyenne',label:'⚠️ Moyenne'},{value:'faible',label:'❌ Faible'}]} value={data.qualite_reponse} onChange={v=>set('qualite_reponse',v)}/>
      <RadioGroup label="Deadline utilisée comme levier ?" options={[{value:'oui',label:'✅ Oui'},{value:'non_exploitee',label:'⚠️ Non exploitée'},{value:'pas_de_deadline',label:'❌ Pas de deadline'}]} value={data.deadline_levier} onChange={v=>set('deadline_levier',v)}/>
      <SectionNotes notes={notes} onChange={onNotes}/>
    </CatCard>
  );
}
function S4({ data={}, onChange, notes, onNotes }) {
  const set = (k,v) => onChange({...data,[k]:v});
  return (
    <CatCard number="4" title="Présentation de l'offre">
      <RadioGroup label="Présentation collée aux douleurs ?" options={[{value:'oui',label:'✅ Oui'},{value:'partiel',label:'⚠️ Partiellement'},{value:'non',label:'❌ Non — générique'}]} value={data.colle_douleurs} onChange={v=>set('colle_douleurs',v)}/>
      <RadioGroup label="Exemples bien choisis ?" options={[{value:'oui',label:"✅ Oui — le prospect s'est reconnu"},{value:'moyen',label:'⚠️ Moyen'},{value:'non',label:'❌ Non'}]} value={data.exemples_transformation} onChange={v=>set('exemples_transformation',v)}/>
      <RadioGroup label="Durée / Offre justifiée ?" options={[{value:'oui',label:'✅ Oui'},{value:'partiel',label:'⚠️ Partiellement'},{value:'non',label:'❌ Non'}]} value={data.duree_justifiee} onChange={v=>set('duree_justifiee',v)}/>
      <SectionNotes notes={notes} onChange={onNotes}/>
    </CatCard>
  );
}
function S5({ data={}, onChange, notes, onNotes }) {
  const set = (k,v) => onChange({...data,[k]:v});
  return (
    <CatCard number="5" title="Closing & Objections">
      <RadioGroup label="Annonce du prix" options={[{value:'directe',label:'✅ Directe et assumée'},{value:'hesitante',label:'⚠️ Hésitante'},{value:'trop_rapide',label:'❌ Trop rapide'}]} value={data.annonce_prix} onChange={v=>set('annonce_prix',v)}/>
      <RadioGroup label="Silence après le prix ?" options={[{value:'oui',label:'✅ Oui — laissé respirer'},{value:'non',label:'❌ Non — rempli trop vite'}]} value={data.silence_prix} onChange={v=>set('silence_prix',v)}/>
      <CheckboxGroup label="Objection rencontrée" options={[{value:'budget',label:'Budget'},{value:'reflechir',label:'"J\'ai besoin de réfléchir"'},{value:'conjoint',label:'Conjoint / autre personne'},{value:'methode',label:'Pas convaincu de la méthode'},{value:'aucune',label:"Pas d'objection"}]} value={data.objections||[]} onChange={v=>set('objections',v)}/>
      <RadioGroup label="Douleur réancrée avant l'objection ?" options={[{value:'oui',label:'✅ Oui'},{value:'non',label:'❌ Non'}]} value={data.douleur_reancree} onChange={v=>set('douleur_reancree',v)}/>
      <RadioGroup label="Objection bien isolée ?" options={[{value:'oui',label:'✅ Oui'},{value:'non',label:'❌ Non'}]} value={data.objection_isolee} onChange={v=>set('objection_isolee',v)}/>
      <RadioGroup label="Résultat du closing" options={[{value:'close',label:'✅ Closé en direct'},{value:'retrograde',label:'⚠️ Rétrogradé'},{value:'relance',label:'📅 Relance planifiée'},{value:'porte_ouverte',label:'🔓 Porte ouverte'},{value:'perdu',label:'❌ Perdu'}]} value={data.resultat_closing} onChange={v=>set('resultat_closing',v)}/>
      <SectionNotes notes={notes} onChange={onNotes}/>
    </CatCard>
  );
}

// ─── AUTH PAGES ───────────────────────────────────────────────────────────────
function AuthShell({ subtitle, icon, children }) {
  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#f5f3ff,#ede9fe)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ width:'100%', maxWidth:460 }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ width:56, height:56, borderRadius:16, background:'#6366f1', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, margin:'0 auto 14px' }}>{icon}</div>
          <h1 style={{ fontSize:24, fontWeight:700, color:'#1e293b', margin:0 }}>CloserDebrief</h1>
          <p style={{ color:'#64748b', fontSize:14, marginTop:6 }}>{subtitle}</p>
        </div>
        <div style={{ background:'white', borderRadius:16, padding:24, boxShadow:'0 8px 32px rgba(99,102,241,.1)', border:'1px solid #e2e8f0' }}>{children}</div>
      </div>
    </div>
  );
}

function LoginPage({ onLogin, goRegister, goForgot }) {
  const [f, setF] = useState({ email:'', password:'' });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async e => {
    e.preventDefault(); setErr(''); setLoading(true);
    try { const d = await apiFetch('/auth/login',{method:'POST',body:f}); setToken(d.token); onLogin(d.user,d.gamification); }
    catch(e) { setErr(e.message); } finally { setLoading(false); }
  };
  return (
    <AuthShell icon="📞" subtitle="Connectez-vous à votre compte">
      <AlertBox type="error" message={err}/>
      <form onSubmit={submit}>
        <div style={{marginBottom:16}}><label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>Email</label><Input type="email" placeholder="votre@email.com" value={f.email} onChange={e=>setF({...f,email:e.target.value})} required autoFocus/></div>
        <div style={{marginBottom:8}}><label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>Mot de passe</label><Input type="password" placeholder="••••••••" value={f.password} onChange={e=>setF({...f,password:e.target.value})} required/></div>
        <div style={{textAlign:'right',marginBottom:24}}><button type="button" onClick={goForgot} style={{background:'none',border:'none',color:'#6366f1',fontSize:13,cursor:'pointer'}}>Mot de passe oublié ?</button></div>
        <Btn type="submit" disabled={loading} style={{width:'100%'}}>{loading?'Connexion...':'Se connecter'}</Btn>
      </form>
      <p style={{textAlign:'center',fontSize:14,color:'#64748b',marginTop:20}}>Pas encore de compte ?{' '}<button onClick={goRegister} style={{background:'none',border:'none',color:'#6366f1',fontWeight:600,cursor:'pointer',fontSize:14}}>S'inscrire</button></p>
    </AuthShell>
  );
}

function RegisterPage({ onLogin, goLogin }) {
  const [f, setF] = useState({ name:'', email:'', password:'', confirm:'', role:'closer', invite_code:'' });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async e => {
    e.preventDefault(); setErr('');
    if (f.password !== f.confirm) return setErr('Les mots de passe ne correspondent pas');
    if (f.password.length < 8) return setErr('Mot de passe trop court (8 car. min)');
    if (f.role==='closer'&&!f.invite_code) return setErr("Un code d'invitation est requis");
    setLoading(true);
    try { const d = await apiFetch('/auth/register',{method:'POST',body:{name:f.name,email:f.email,password:f.password,role:f.role,invite_code:f.invite_code}}); setToken(d.token); onLogin(d.user,d.gamification); }
    catch(e) { setErr(e.message); } finally { setLoading(false); }
  };
  return (
    <AuthShell icon="📞" subtitle="Créez votre compte">
      <AlertBox type="error" message={err}/>
      <div style={{marginBottom:20}}>
        <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:8}}>Je suis...</label>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          {[{value:'closer',label:'🎯 Closer',desc:'Je fais des appels'},{value:'head_of_sales',label:'👑 Head of Sales',desc:'Je gère une équipe'}].map(({value,label,desc})=>(
            <button key={value} type="button" onClick={()=>setF({...f,role:value})} style={{padding:'12px 14px',borderRadius:10,border:`2px solid ${f.role===value?'#6366f1':'#e2e8f0'}`,background:f.role===value?'#f5f3ff':'white',cursor:'pointer',textAlign:'left',fontFamily:'inherit'}}>
              <p style={{fontWeight:600,fontSize:13,color:f.role===value?'#4c1d95':'#374151',margin:0}}>{label}</p>
              <p style={{fontSize:11,color:'#94a3b8',margin:'2px 0 0'}}>{desc}</p>
            </button>
          ))}
        </div>
      </div>
      <form onSubmit={submit}>
        {[{key:'name',label:'Nom complet',ph:'Jean Dupont',type:'text'},{key:'email',label:'Email',ph:'votre@email.com',type:'email'},{key:'password',label:'Mot de passe',ph:'8 caractères minimum',type:'password'},{key:'confirm',label:'Confirmer',ph:'••••••••',type:'password'}].map(({key,label,ph,type})=>(
          <div key={key} style={{marginBottom:14}}><label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>{label}</label><Input type={type} placeholder={ph} value={f[key]} onChange={e=>setF({...f,[key]:e.target.value})} required/></div>
        ))}
        {f.role==='closer'&&(
          <div style={{marginBottom:14}}>
            <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>🔑 Code d'invitation</label>
            <Input placeholder="Ex: ABC12345" value={f.invite_code} onChange={e=>setF({...f,invite_code:e.target.value.toUpperCase()})} required/>
            <p style={{fontSize:12,color:'#94a3b8',marginTop:4}}>Demandez ce code à votre Head of Sales</p>
          </div>
        )}
        <Btn type="submit" disabled={loading} style={{width:'100%',marginTop:8}}>{loading?'Création...':'Créer mon compte'}</Btn>
      </form>
      <p style={{textAlign:'center',fontSize:14,color:'#64748b',marginTop:20}}>Déjà un compte ?{' '}<button onClick={goLogin} style={{background:'none',border:'none',color:'#6366f1',fontWeight:600,cursor:'pointer',fontSize:14}}>Se connecter</button></p>
    </AuthShell>
  );
}

function ForgotPage({ goLogin }) {
  const [email, setEmail] = useState('');
  const [sent, setSent]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr]     = useState('');
  const submit = async e => {
    e.preventDefault(); setErr(''); setLoading(true);
    try { await apiFetch('/auth/forgot-password',{method:'POST',body:{email}}); setSent(true); }
    catch(e) { setErr(e.message); } finally { setLoading(false); }
  };
  return (
    <AuthShell icon="🔐" subtitle="Réinitialisation du mot de passe">
      {sent
        ? <div style={{textAlign:'center'}}><div style={{fontSize:48,marginBottom:16}}>📬</div><h2 style={{fontSize:18,fontWeight:600,color:'#1e293b',marginBottom:8}}>Email envoyé !</h2><p style={{color:'#64748b',fontSize:14,marginBottom:24}}>Si cet email est enregistré, vous recevrez un lien.</p><Btn variant="secondary" onClick={goLogin} style={{width:'100%'}}>Retour à la connexion</Btn></div>
        : <><AlertBox type="error" message={err}/><form onSubmit={submit}><div style={{marginBottom:20}}><label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>Email</label><Input type="email" placeholder="votre@email.com" value={email} onChange={e=>setEmail(e.target.value)} required autoFocus/></div><Btn type="submit" disabled={loading} style={{width:'100%'}}>{loading?'Envoi...':'Envoyer le lien'}</Btn></form><p style={{textAlign:'center',fontSize:13,marginTop:16}}><button onClick={goLogin} style={{background:'none',border:'none',color:'#6366f1',cursor:'pointer',fontSize:13}}>← Retour</button></p></>
      }
    </AuthShell>
  );
}

function ResetPage({ token, onDone }) {
  const [f, setF] = useState({ password:'', confirm:'' });
  const [err, setErr] = useState('');
  const [ok, setOk]   = useState(false);
  const [loading, setLoading] = useState(false);
  const submit = async e => {
    e.preventDefault(); setErr('');
    if (f.password !== f.confirm) return setErr('Les mots de passe ne correspondent pas');
    if (f.password.length < 8) return setErr('Trop court');
    setLoading(true);
    try { await apiFetch('/auth/reset-password',{method:'POST',body:{token,password:f.password}}); setOk(true); setTimeout(onDone, 2000); }
    catch(e) { setErr(e.message); } finally { setLoading(false); }
  };
  return (
    <AuthShell icon="🔑" subtitle="Nouveau mot de passe">
      {ok ? <AlertBox type="success" message="Mot de passe modifié ! Redirection..."/>
          : <><AlertBox type="error" message={err}/><form onSubmit={submit}><div style={{marginBottom:14}}><label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>Nouveau mot de passe</label><Input type="password" placeholder="8 caractères minimum" value={f.password} onChange={e=>setF({...f,password:e.target.value})} required autoFocus/></div><div style={{marginBottom:20}}><label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>Confirmer</label><Input type="password" placeholder="••••••••" value={f.confirm} onChange={e=>setF({...f,confirm:e.target.value})} required/></div><Btn type="submit" disabled={loading} style={{width:'100%'}}>{loading?'Modification...':'Modifier le mot de passe'}</Btn></form></>}
    </AuthShell>
  );
}

// ─── ACCOUNT SETTINGS ────────────────────────────────────────────────────────
function AccountSettings({ user, onClose, toast }) {
  const [tab, setTab] = useState('profil');
  const [pwd, setPwd] = useState({ current:'', next:'', confirm:'' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const changePwd = async () => {
    setErr('');
    if (pwd.next !== pwd.confirm) return setErr('Les mots de passe ne correspondent pas');
    if (pwd.next.length < 8) return setErr('Trop court (8 caractères min)');
    setSaving(true);
    try { await apiFetch('/auth/change-password',{method:'POST',body:{currentPassword:pwd.current,newPassword:pwd.next}}); toast('Mot de passe modifié !'); setPwd({current:'',next:'',confirm:''}); }
    catch(e) { setErr(e.message); } finally { setSaving(false); }
  };
  return (
    <Modal title="Paramètres du compte" onClose={onClose}>
      <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:4,borderRadius:8,marginBottom:20}}>
        {[{key:'profil',label:'👤 Profil'},{key:'securite',label:'🔒 Sécurité'}].map(({key,label})=>(
          <button key={key} onClick={()=>setTab(key)} style={{flex:1,padding:'7px 12px',borderRadius:6,border:'none',fontSize:13,fontWeight:500,cursor:'pointer',background:tab===key?'white':'transparent',color:tab===key?'#1e293b':'#64748b',boxShadow:tab===key?'0 1px 3px rgba(0,0,0,.08)':'none',fontFamily:'inherit'}}>{label}</button>
        ))}
      </div>
      {tab==='profil'&&(
        <div>
          <div style={{display:'flex',alignItems:'center',gap:14,padding:16,background:'#f8fafc',borderRadius:12,marginBottom:20}}>
            <div style={{width:52,height:52,borderRadius:'50%',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:700,color:'white',flexShrink:0}}>{user.name.charAt(0)}</div>
            <div>
              <p style={{fontWeight:700,fontSize:16,color:'#1e293b',margin:0}}>{user.name}</p>
              <p style={{fontSize:13,color:'#64748b',margin:'2px 0 0'}}>{user.email}</p>
              <span style={{display:'inline-block',marginTop:4,background:user.role==='head_of_sales'?'#fef3c7':'#ede9fe',color:user.role==='head_of_sales'?'#92400e':'#4c1d95',fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:4}}>
                {user.role==='head_of_sales'?'👑 Head of Sales':'🎯 Closer'}
              </span>
            </div>
          </div>
          <p style={{fontSize:13,color:'#94a3b8',textAlign:'center'}}>La modification du profil sera disponible prochainement.</p>
        </div>
      )}
      {tab==='securite'&&(
        <div>
          <p style={{fontSize:13,fontWeight:600,color:'#374151',marginBottom:16}}>Changer le mot de passe</p>
          <AlertBox type="error" message={err}/>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {[{key:'current',label:'Mot de passe actuel'},{key:'next',label:'Nouveau mot de passe'},{key:'confirm',label:'Confirmer'}].map(({key,label})=>(
              <div key={key}><label style={{display:'block',fontSize:12,fontWeight:600,color:'#374151',marginBottom:5}}>{label}</label><Input type="password" placeholder="••••••••" value={pwd[key]} onChange={e=>setPwd({...pwd,[key]:e.target.value})}/></div>
            ))}
            <Btn onClick={changePwd} disabled={saving||!pwd.current||!pwd.next||!pwd.confirm} style={{marginTop:4}}>{saving?'Modification...':'Modifier le mot de passe'}</Btn>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ─── DEBRIEF CARD ─────────────────────────────────────────────────────────────
function DebriefCard({ debrief, onClick, showUser }) {
  const [hov, setHov] = useState(false);
  const pct = Math.round(debrief.percentage || 0);
  return (
    <div onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ background:'white', border:`1px solid ${hov?'#a5b4fc':'#e2e8f0'}`, borderRadius:12, padding:'14px 16px', cursor:'pointer', transition:'all .15s', boxShadow:hov?'0 4px 16px rgba(99,102,241,.1)':'none', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontWeight:600, fontSize:14, color:'#1e293b', margin:'0 0 4px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{debrief.prospect_name}</p>
        <div style={{ display:'flex', alignItems:'center', gap:10, fontSize:12, color:'#94a3b8', flexWrap:'wrap' }}>
          <span>📅 {fmtDate(debrief.call_date)}</span>
          <span>👤 {debrief.closer_name}</span>
          {showUser&&debrief.user_name&&<span style={{background:'#f1f5f9',padding:'1px 6px',borderRadius:4}}>par {debrief.user_name}</span>}
        </div>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
        <ClosedBadge isClosed={debrief.is_closed}/>
        <ScoreBadge pct={pct}/>
        <span style={{ color:hov?'#6366f1':'#d1d5db', fontSize:18, transition:'color .15s' }}>›</span>
      </div>
    </div>
  );
}

// ─── MEMBER ROW ───────────────────────────────────────────────────────────────
function MemberRow({ member, teams, currentTeamId, onRemove, onMove, selected, onSelect, onObjectives }) {
  const [movingTo, setMovingTo] = useState('');
  const mob = useIsMobile();
  const otherTeams = teams.filter(t => t.id !== currentTeamId);
  return (
    <>
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', cursor:'pointer', background:selected?'#f5f3ff':'white', transition:'background .1s' }} onClick={onSelect}>
        <div style={{ width:36, height:36, borderRadius:'50%', background:'#ede9fe', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:14, color:'#6366f1', flexShrink:0 }}>{member.name.charAt(0)}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ fontWeight:600, fontSize:14, color:'#1e293b', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{member.name}</p>
          <p style={{ fontSize:12, color:'#94a3b8', margin:0 }}>{member.level.icon} {member.level.name} · {member.totalDebriefs} debriefs · {member.avgScore}%</p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
          {!mob && otherTeams.length > 0 && (
            <select value={movingTo} onChange={e=>setMovingTo(e.target.value)} onClick={e=>e.stopPropagation()}
              style={{ fontSize:12, border:'1px solid #e2e8f0', borderRadius:6, padding:'4px 8px', fontFamily:'inherit', color:'#374151', background:'white', cursor:'pointer' }}>
              <option value="">Déplacer...</option>
              {otherTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}
          {movingTo && <Btn variant="green" onClick={e=>{e.stopPropagation();onMove(member.id,movingTo);setMovingTo('');}} style={{fontSize:12,padding:'4px 10px'}}>✓</Btn>}
          <Btn variant="danger" onClick={e=>{e.stopPropagation();onRemove(member.id,member.name);}} style={{width:30,height:30,padding:0,borderRadius:8,fontSize:12}}>✕</Btn>
          <span style={{ color:selected?'#6366f1':'#d1d5db', fontSize:14 }}>{selected?'▲':'▼'}</span>
        </div>
      </div>
      {selected && (
        <div style={{ padding:'14px 16px 18px', background:'#fafafa', borderTop:'1px solid #f1f5f9' }}>
          {mob && otherTeams.length > 0 && (
            <div style={{ marginBottom:12, display:'flex', gap:8 }}>
              <select value={movingTo} onChange={e=>setMovingTo(e.target.value)} style={{ flex:1, fontSize:13, border:'1px solid #e2e8f0', borderRadius:8, padding:'8px 10px', fontFamily:'inherit', color:'#374151', background:'white' }}>
                <option value="">Déplacer vers une autre équipe...</option>
                {otherTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              {movingTo && <Btn variant="green" onClick={()=>{onMove(member.id,movingTo);setMovingTo('');}} style={{fontSize:13,padding:'8px 14px'}}>✓</Btn>}
            </div>
          )}
          {member.chartData.length > 0
            ? <><p style={{fontSize:13,fontWeight:600,color:'#374151',marginBottom:10}}>📈 Évolution</p><Chart debriefs={member.chartData.map((d,i)=>({...d,id:i,percentage:d.score,prospect_name:d.prospect,call_date:d.date}))}/></>
            : <p style={{color:'#94a3b8',fontSize:13,textAlign:'center',padding:'16px 0'}}>Aucun debrief enregistré</p>
          }
          {member.badges.length > 0 && <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:10}}>{member.badges.map(b=><span key={b.id} style={{background:'#ede9fe',color:'#4c1d95',padding:'3px 10px',borderRadius:20,fontSize:12}}>{b.icon} {b.label}</span>)}</div>}
        </div>
      )}
    </>
  );
}

// ─── TEAM CARD (composant dédié — pas de hook dans les maps) ─────────────────
function TeamCard({ team, allDebriefs, onClick }) {
  const [hov, setHov] = useState(false);
  const td = (allDebriefs||[]).filter(d => team.members.some(m => m.id === d.user_id));
  const avg  = td.length > 0 ? Math.round(td.reduce((s,d)=>s+(d.percentage||0),0)/td.length) : 0;
  const cls  = td.filter(d => d.is_closed).length;
  const rate = td.length > 0 ? Math.round((cls/td.length)*100) : 0;
  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} onClick={onClick}
      style={{ background:'white', border:`2px solid ${hov?'#6366f1':'#e2e8f0'}`, borderRadius:16, padding:20, cursor:'pointer', transition:'all .2s', boxShadow:hov?'0 8px 24px rgba(99,102,241,.15)':'0 1px 4px rgba(0,0,0,.04)', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:4, background:'linear-gradient(90deg,#6366f1,#8b5cf6)' }}/>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:16, marginTop:4 }}>
        <div>
          <h3 style={{ fontSize:17, fontWeight:700, color:'#1e293b', margin:'0 0 4px' }}>{team.name}</h3>
          <p style={{ fontSize:12, color:'#94a3b8', margin:0 }}>{team.members.length} membre{team.members.length!==1?'s':''} · {td.length} debrief{td.length!==1?'s':''}</p>
        </div>
        <span style={{ fontSize:20, color:hov?'#6366f1':'#d1d5db', transition:'color .2s' }}>→</span>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
        {[{ l:'Score moy.', v:`${avg}%`,  c:avg>=80?'#059669':avg>=60?'#d97706':'#6366f1' },
          { l:'Closings',   v:cls,         c:'#059669' },
          { l:'Taux',       v:`${rate}%`,  c:rate>=40?'#059669':'#d97706' },
        ].map(({ l, v, c }) => (
          <div key={l} style={{ background:'#f8fafc', borderRadius:8, padding:'8px 10px', textAlign:'center' }}>
            <p style={{ fontSize:10, color:'#94a3b8', margin:'0 0 2px', textTransform:'uppercase', letterSpacing:'.04em' }}>{l}</p>
            <p style={{ fontWeight:700, fontSize:15, color:c, margin:0 }}>{v}</p>
          </div>
        ))}
      </div>
      {team.members.length > 0 && (
        <div style={{ display:'flex', marginTop:12 }}>
          {team.members.slice(0,5).map((m,i) => (
            <div key={m.id} style={{ width:28, height:28, borderRadius:'50%', background:`hsl(${(i*67)%360},60%,70%)`, border:'2px solid white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'white', marginLeft:i>0?-8:0, zIndex:10-i }}>{m.name.charAt(0)}</div>
          ))}
          {team.members.length > 5 && (
            <div style={{ width:28, height:28, borderRadius:'50%', background:'#e2e8f0', border:'2px solid white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:600, color:'#64748b', marginLeft:-8 }}>+{team.members.length-5}</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── HOS PAGE ─────────────────────────────────────────────────────────────────
function HOSPage({ toast, leaderboardKey, allDebriefs }) {
  const [tab,  setTab]  = useState('dashboard');
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTeamId, setActiveTeamId] = useState(null);  // null = liste, string = détail
  const [selMember, setSelMember] = useState(null);
  const [scope, setScope] = useState('all');
  const [generating, setGenerating] = useState(null);
  const [copied, setCopied] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingTeam, setEditingTeam] = useState(null);
  const [creating, setCreating] = useState(false);
  const [objectiveTarget, setObjectiveTarget] = useState(null);
  const mob = useIsMobile();

  const load = useCallback(() => {
    setLoading(true);
    apiFetch('/teams').then(setTeams).catch(()=>setTeams([])).finally(()=>setLoading(false));
  }, []);
  useEffect(() => { load(); }, [leaderboardKey]);

  // Reset activeTeamId if tab changes
  useEffect(() => { if (tab !== 'equipes') setActiveTeamId(null); }, [tab]);

  const createTeam = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try { const t = await apiFetch('/teams',{method:'POST',body:{name:newName.trim()}}); setTeams(p=>[...p,t]); setNewName(''); setShowCreate(false); toast(`Équipe "${t.name}" créée !`); }
    catch(e) { toast(e.message,'error'); } finally { setCreating(false); }
  };
  const renameTeam = async () => {
    if (!editingTeam?.name.trim()) return;
    try { await apiFetch(`/teams/${editingTeam.id}`,{method:'PATCH',body:{name:editingTeam.name.trim()}}); setTeams(p=>p.map(t=>t.id===editingTeam.id?{...t,name:editingTeam.name.trim()}:t)); setEditingTeam(null); toast('Équipe renommée'); }
    catch(e) { toast(e.message,'error'); }
  };
  const deleteTeam = async (id, name) => {
    if (!confirm(`Supprimer l'équipe "${name}" ? Les membres seront libérés.`)) return;
    try { await apiFetch(`/teams/${id}`,{method:'DELETE'}); setTeams(p=>p.filter(t=>t.id!==id)); setActiveTeamId(null); toast('Équipe supprimée'); }
    catch(e) { toast(e.message,'error'); }
  };
  const genCode = async (teamId) => {
    setGenerating(teamId);
    try { const inv = await apiFetch(`/teams/${teamId}/invite`,{method:'POST'}); setTeams(p=>p.map(t=>t.id===teamId?{...t,inviteCodes:[inv,...t.inviteCodes]}:t)); toast('Code généré !'); }
    catch(e) { toast(e.message,'error'); } finally { setGenerating(null); }
  };
  const delCode = async (teamId, codeId) => {
    try { await apiFetch(`/teams/${teamId}/invite/${codeId}`,{method:'DELETE'}); setTeams(p=>p.map(t=>t.id===teamId?{...t,inviteCodes:t.inviteCodes.filter(c=>c.id!==codeId)}:t)); toast('Code supprimé'); }
    catch(e) { toast(e.message,'error'); }
  };
  const removeMember = async (teamId, memberId, name) => {
    if (!confirm(`Retirer ${name} ?`)) return;
    try { await apiFetch(`/teams/${teamId}/members/${memberId}`,{method:'DELETE'}); setTeams(p=>p.map(t=>t.id===teamId?{...t,members:t.members.filter(m=>m.id!==memberId)}:t)); setSelMember(null); toast(`${name} retiré`); }
    catch(e) { toast(e.message,'error'); }
  };
  const moveMember = async (memberId, toTeamId) => {
    const fromTeam = teams.find(t => t.members.some(m => m.id===memberId));
    if (!fromTeam) return;
    const member = fromTeam.members.find(m => m.id===memberId);
    try { await apiFetch(`/teams/${toTeamId}/members/${memberId}`,{method:'PATCH'}); setTeams(p=>p.map(t=>{ if(t.id===fromTeam.id)return{...t,members:t.members.filter(m=>m.id!==memberId)}; if(t.id===toTeamId)return{...t,members:[...t.members,{...member,team_id:toTeamId}]}; return t;})); const tt=teams.find(t=>t.id===toTeamId); toast(`${member.name} déplacé vers "${tt?.name}"`); setSelMember(null); }
    catch(e) { toast(e.message,'error'); }
  };
  const doCopy = code => { copy(code); setCopied(code); toast('Code copié !'); setTimeout(()=>setCopied(null),2000); };

  if (loading) return <Spinner full/>;

  const allMembers = teams.flatMap(t => t.members);

  // Debriefs filtrés selon scope
  const scopedDebriefs = (() => {
    if (!allDebriefs?.length) return [];
    if (scope === 'all') return allDebriefs;
    if (scope.startsWith('team:')) {
      const t = teams.find(t => t.id===scope.split(':')[1]);
      const ids = (t?.members||[]).map(m => m.id);
      return allDebriefs.filter(d => ids.includes(d.user_id));
    }
    if (scope.startsWith('closer:')) return allDebriefs.filter(d => d.user_id===scope.split(':')[1]);
    return allDebriefs;
  })();

  const scopeLabel = scope==='all' ? "Toute l'équipe"
    : scope.startsWith('team:')   ? teams.find(t=>t.id===scope.split(':')[1])?.name || 'Équipe'
    : allMembers.find(m=>m.id===scope.split(':')[1])?.name || 'Closer';

  const fTotal  = scopedDebriefs.length;
  const fAvg    = fTotal>0 ? Math.round(scopedDebriefs.reduce((s,d)=>s+(d.percentage||0),0)/fTotal) : 0;
  const fCls    = scopedDebriefs.filter(d=>d.is_closed).length;
  const fRate   = fTotal>0 ? Math.round((fCls/fTotal)*100) : 0;

  const globalSS = avgSectionScores(allDebriefs||[]);
  const scopedSS = avgSectionScores(scopedDebriefs);

  const SLABELS = { decouverte:'Découverte', reformulation:'Reformulation', projection:'Projection', presentation_offre:"Présentation offre", closing:'Closing' };
  const weakest  = scopedSS ? SECTIONS.reduce((w,s)=>(scopedSS[s.key]||0)<(scopedSS[w.key]||0)?s:w, SECTIONS[0]) : null;
  const strongest= scopedSS ? SECTIONS.reduce((w,s)=>(scopedSS[s.key]||0)>(scopedSS[w.key]||0)?s:w, SECTIONS[0]) : null;

  const bc = color => color==='#6366f1'?'rgba(99,102,241,.15)':color==='#059669'?'rgba(5,150,105,.15)':'rgba(217,119,6,.15)';

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

      {/* ─── HEADER ─── */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700, color:'#1e293b', margin:0 }}>👑 Head of Sales</h1>
          <p style={{ color:'#64748b', fontSize:13, marginTop:4 }}>{teams.length} équipe{teams.length!==1?'s':''} · {allMembers.length} closer{allMembers.length!==1?'s':''}</p>
        </div>
        <div style={{ display:'flex', gap:4, background:'#f1f5f9', padding:4, borderRadius:10 }}>
          {[{key:'dashboard',label:'📊'},{key:'equipes',label:'👥'}].map(({key,label})=>(
            <button key={key} onClick={()=>setTab(key)} style={{ padding:'8px 16px', borderRadius:8, border:'none', fontSize:13, fontWeight:500, cursor:'pointer', transition:'all .2s', background:tab===key?'white':'transparent', color:tab===key?'#1e293b':'#64748b', boxShadow:tab===key?'0 1px 4px rgba(0,0,0,.08)':'none', fontFamily:'inherit' }}>
              {label}{!mob&&<span> {key==='dashboard'?'Dashboard':'Équipes'}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* ─── DASHBOARD ─── */}
      {tab==='dashboard' && (
        allMembers.length===0
          ? <Empty icon="👥" title="Aucun closer" subtitle="Créez des équipes et générez des codes" action={<Btn onClick={()=>setTab('equipes')}>Gérer les équipes</Btn>}/>
          : <>
              {/* Sélecteur scope */}
              <Card style={{ padding:'14px 16px' }}>
                <p style={{ fontSize:11, fontWeight:600, color:'#64748b', textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 10px' }}>Filtrer les données</p>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  <button onClick={()=>setScope('all')} style={{ padding:'7px 14px', borderRadius:20, border:`1.5px solid ${scope==='all'?'#6366f1':'#e2e8f0'}`, background:scope==='all'?'#ede9fe':'white', color:scope==='all'?'#4c1d95':'#64748b', fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>🌍 Toute l'équipe</button>
                  {teams.map(t => <button key={t.id} onClick={()=>setScope(`team:${t.id}`)} style={{ padding:'7px 14px', borderRadius:20, border:`1.5px solid ${scope===`team:${t.id}`?'#059669':'#e2e8f0'}`, background:scope===`team:${t.id}`?'#d1fae5':'white', color:scope===`team:${t.id}`?'#065f46':'#64748b', fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>👥 {t.name}</button>)}
                  {allMembers.map(m => <button key={m.id} onClick={()=>setScope(`closer:${m.id}`)} style={{ padding:'7px 14px', borderRadius:20, border:`1.5px solid ${scope===`closer:${m.id}`?'#8b5cf6':'#e2e8f0'}`, background:scope===`closer:${m.id}`?'#f5f3ff':'white', color:scope===`closer:${m.id}`?'#4c1d95':'#64748b', fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>👤 {m.name}</button>)}
                </div>
              </Card>

              {/* KPIs */}
              <div>
                <p style={{ fontSize:13, fontWeight:600, color:'#64748b', margin:'0 0 10px' }}>📊 {scopeLabel} · {fTotal} debrief{fTotal!==1?'s':''}</p>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:mob?10:16 }}>
                  {[{l:'Debriefs',value:fTotal,icon:'📋',bg:'#ede9fe',c:'#6366f1'},{l:'Score moyen',value:`${fAvg}%`,icon:'🎯',bg:'#d1fae5',c:'#059669'},{l:'Taux closing',value:`${fRate}%`,icon:'✅',bg:'#fef3c7',c:'#d97706'},{l:'Closings',value:fCls,icon:'🏆',bg:'#f0fdf4',c:'#059669'}].map(({l,value,icon,bg,c})=>(
                    <Card key={l} style={{ padding:'12px 14px', display:'flex', alignItems:'center', gap:12 }}>
                      <div style={{ width:38, height:38, borderRadius:10, background:bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>{icon}</div>
                      <div>
                        <p style={{ fontSize:10, color:'#64748b', margin:0, fontWeight:500, textTransform:'uppercase', letterSpacing:'.04em' }}>{l}</p>
                        <p style={{ fontSize:20, fontWeight:700, color:c, margin:0 }}>{value}</p>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Axe fort / faible */}
              {weakest && strongest && (
                <div style={{ display:'grid', gridTemplateColumns:mob?'1fr':'1fr 1fr', gap:12 }}>
                  <div style={{ background:'linear-gradient(135deg,#fee2e2,#fca5a5)', border:'1px solid #f87171', borderRadius:12, padding:16 }}>
                    <p style={{ fontSize:11, color:'#7f1d1d', fontWeight:600, textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 6px' }}>⚠️ Axe à travailler</p>
                    <p style={{ fontWeight:700, fontSize:18, color:'#1e293b', margin:'0 0 2px' }}>{SLABELS[weakest.key]}</p>
                    <p style={{ fontSize:13, color:'#7f1d1d', margin:0 }}>Score moyen : <strong>{scopedSS[weakest.key]}/5</strong></p>
                  </div>
                  <div style={{ background:'linear-gradient(135deg,#d1fae5,#6ee7b7)', border:'1px solid #34d399', borderRadius:12, padding:16 }}>
                    <p style={{ fontSize:11, color:'#064e3b', fontWeight:600, textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 6px' }}>✅ Point fort</p>
                    <p style={{ fontWeight:700, fontSize:18, color:'#1e293b', margin:'0 0 2px' }}>{SLABELS[strongest.key]}</p>
                    <p style={{ fontSize:13, color:'#064e3b', margin:0 }}>Score moyen : <strong>{scopedSS[strongest.key]}/5</strong></p>
                  </div>
                </div>
              )}

              {/* Radar + Barres */}
              {scopedSS && fTotal > 0 && (
                <Card style={{ padding:20 }}>
                  <h3 style={{ fontSize:14, fontWeight:600, color:'#1e293b', margin:'0 0 4px' }}>Analyse par section</h3>
                  <p style={{ fontSize:12, color:'#94a3b8', margin:'0 0 20px' }}>{scopeLabel}{scope!=='all'?' · vs moyenne globale':''}</p>
                  <div style={{ display:'grid', gridTemplateColumns:mob?'1fr':'1fr 1fr', gap:24, alignItems:'center' }}>
                    <div style={{ display:'flex', justifyContent:'center' }}>
                      <Radar scores={scopedSS} color={scope.startsWith('closer:')?'#8b5cf6':scope.startsWith('team:')?'#059669':'#6366f1'}/>
                    </div>
                    <SectionBars scores={scopedSS} globalScores={scope!=='all'?globalSS:null}/>
                  </div>
                </Card>
              )}

              {/* Évolution */}
              {fTotal > 0 && (
                <Card style={{ padding:20 }}>
                  <h3 style={{ fontSize:14, fontWeight:600, color:'#1e293b', margin:'0 0 4px' }}>Évolution du score</h3>
                  <p style={{ fontSize:12, color:'#94a3b8', margin:'0 0 16px' }}>{scopeLabel} · {fTotal} appel{fTotal!==1?'s':''}</p>
                  <Chart debriefs={scopedDebriefs}/>
                </Card>
              )}

              {/* Tableau performance */}
              {(() => {
                const displayMembers = scope==='all' ? allMembers
                  : scope.startsWith('team:') ? (teams.find(t=>t.id===scope.split(':')[1])?.members||[])
                  : allMembers.filter(m => m.id===scope.split(':')[1]);
                if (!displayMembers.length) return null;
                return (
                  <Card style={{ overflow:'hidden' }}>
                    <div style={{ padding:'14px 16px', borderBottom:'1px solid #f1f5f9', background:'#f8fafc' }}>
                      <h3 style={{ fontSize:14, fontWeight:600, color:'#1e293b', margin:0 }}>Performance individuelle</h3>
                    </div>
                    {mob ? (
                      <div>
                        {[...displayMembers].sort((a,b)=>b.avgScore-a.avgScore).map((m,i) => {
                          const cr = m.totalDebriefs>0 ? Math.round((m.closed/m.totalDebriefs)*100) : 0;
                          const mTeam = teams.find(t=>t.members.some(x=>x.id===m.id));
                          const isSel = selMember===m.id;
                          const ms = avgSectionScores((allDebriefs||[]).filter(d=>d.user_id===m.id));
                          return (
                            <div key={m.id} style={{ borderBottom:i<displayMembers.length-1?'1px solid #f1f5f9':'none' }}>
                              <div style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 16px', cursor:'pointer', background:isSel?'#f5f3ff':'white' }} onClick={()=>setSelMember(isSel?null:m.id)}>
                                <div style={{ width:36, height:36, borderRadius:'50%', background:'#ede9fe', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:14, color:'#6366f1', flexShrink:0 }}>{m.name.charAt(0)}</div>
                                <div style={{ flex:1, minWidth:0 }}>
                                  <p style={{ fontWeight:600, fontSize:14, color:'#1e293b', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.name}</p>
                                  <p style={{ fontSize:12, color:'#94a3b8', margin:0 }}>{mTeam?.name} · {m.avgScore}%</p>
                                </div>
                                <div style={{ textAlign:'right', flexShrink:0 }}>
                                  <p style={{ fontWeight:700, fontSize:14, color:m.avgScore>=80?'#059669':m.avgScore>=60?'#d97706':'#ef4444', margin:0 }}>{m.avgScore}%</p>
                                  <p style={{ fontSize:11, color:'#94a3b8', margin:0 }}>{m.totalDebriefs} debriefs</p>
                                </div>
                                <span style={{ color:isSel?'#6366f1':'#d1d5db', fontSize:14 }}>{isSel?'▲':'▼'}</span>
                              </div>
                              {isSel && (
                                <div style={{ padding:'12px 16px 16px', background:'#fafafa', borderTop:'1px solid #f1f5f9' }}>
                                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:14 }}>
                                    {[{l:'Debriefs',v:m.totalDebriefs},{l:'Closings',v:m.closed},{l:'Taux',v:`${cr}%`}].map(({l,v})=>(
                                      <div key={l} style={{ background:'white', borderRadius:8, padding:'8px 10px', textAlign:'center', border:'1px solid #e2e8f0' }}>
                                        <p style={{ fontSize:11, color:'#94a3b8', margin:0 }}>{l}</p>
                                        <p style={{ fontWeight:700, color:'#1e293b', margin:0, fontSize:14 }}>{v}</p>
                                      </div>
                                    ))}
                                  </div>
                                  {ms && <SectionBars scores={ms} globalScores={globalSS}/>}
                                  {m.chartData.length>0 && <div style={{marginTop:14}}><Chart debriefs={m.chartData.map((d,i)=>({...d,id:i,percentage:d.score,prospect_name:d.prospect,call_date:d.date}))}/></div>}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ overflowX:'auto' }}>
                        <table style={{ width:'100%', borderCollapse:'collapse' }}>
                          <thead>
                            <tr style={{ background:'#f8fafc' }}>
                              {['Closer','Équipe','Debriefs','Score','Découv.','Reform.','Proj.','Offre','Closing','Closings','Taux'].map(h=>(
                                <th key={h} style={{ padding:'10px 12px', fontSize:11, fontWeight:600, color:'#64748b', textAlign:'left', textTransform:'uppercase', letterSpacing:'.04em', borderBottom:'1px solid #e2e8f0', whiteSpace:'nowrap' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {[...displayMembers].sort((a,b)=>b.avgScore-a.avgScore).map((m,i) => {
                              const cr    = m.totalDebriefs>0 ? Math.round((m.closed/m.totalDebriefs)*100) : 0;
                              const mTeam = teams.find(t=>t.members.some(x=>x.id===m.id));
                              const isSel = selMember===m.id;
                              const ms    = avgSectionScores((allDebriefs||[]).filter(d=>d.user_id===m.id));
                              const sc    = v => v>=4?'#059669':v>=3?'#d97706':v>=2?'#6366f1':'#ef4444';
                              return (
                                <React.Fragment key={m.id}>
                                  <tr onClick={()=>setSelMember(isSel?null:m.id)} style={{ cursor:'pointer', background:isSel?'#f5f3ff':i%2===0?'white':'#fafafa', borderBottom:'1px solid #f1f5f9' }}>
                                    <td style={{ padding:'10px 12px' }}>
                                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                        <div style={{ width:26, height:26, borderRadius:'50%', background:'#ede9fe', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:11, color:'#6366f1', flexShrink:0 }}>{m.name.charAt(0)}</div>
                                        <span style={{ fontWeight:600, fontSize:13, color:'#1e293b' }}>{m.name}</span>
                                      </div>
                                    </td>
                                    <td style={{ padding:'10px 12px' }}><span style={{ fontSize:11, background:'#f1f5f9', padding:'2px 6px', borderRadius:5, color:'#64748b' }}>{mTeam?.name||'—'}</span></td>
                                    <td style={{ padding:'10px 12px', fontSize:13, fontWeight:600, color:'#1e293b' }}>{m.totalDebriefs}</td>
                                    <td style={{ padding:'10px 12px' }}><span style={{ fontWeight:700, fontSize:13, color:m.avgScore>=80?'#059669':m.avgScore>=60?'#d97706':'#ef4444' }}>{m.avgScore}%</span></td>
                                    {ms ? ['decouverte','reformulation','projection','presentation_offre','closing'].map(k=>(
                                      <td key={k} style={{ padding:'10px 12px' }}><span style={{ fontWeight:700, fontSize:12, color:sc(ms[k]) }}>{ms[k]}/5</span></td>
                                    )) : [...Array(5)].map((_,j)=><td key={j} style={{ padding:'10px 12px', color:'#94a3b8', fontSize:12 }}>—</td>)}
                                    <td style={{ padding:'10px 12px', fontSize:13, fontWeight:600, color:'#059669' }}>{m.closed}</td>
                                    <td style={{ padding:'10px 12px' }}>
                                      <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                                        <div style={{ width:44, height:5, background:'#f1f5f9', borderRadius:3, overflow:'hidden' }}>
                                          <div style={{ height:'100%', width:`${cr}%`, background:cr>=50?'#059669':cr>=30?'#d97706':'#ef4444', borderRadius:3 }}/>
                                        </div>
                                        <span style={{ fontSize:11, fontWeight:600, color:'#374151' }}>{cr}%</span>
                                      </div>
                                    </td>
                                  </tr>
                                  {isSel && (
                                    <tr>
                                      <td colSpan={11} style={{ padding:0, background:'#fafafa', borderBottom:'1px solid #f1f5f9' }}>
                                        <div style={{ padding:'20px 24px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
                                          <div>
                                            <p style={{ fontSize:13, fontWeight:600, color:'#374151', marginBottom:12 }}>Scores par section</p>
                                            {ms ? <SectionBars scores={ms} globalScores={globalSS}/> : <p style={{ color:'#94a3b8', fontSize:13 }}>Pas assez de données</p>}
                                          </div>
                                          <div>
                                            <p style={{ fontSize:13, fontWeight:600, color:'#374151', marginBottom:8 }}>Évolution</p>
                                            {m.chartData.length > 0 ? <Chart debriefs={m.chartData.map((d,i)=>({...d,id:i,percentage:d.score,prospect_name:d.prospect,call_date:d.date}))}/> : <p style={{ color:'#94a3b8', fontSize:13 }}>Aucun debrief</p>}
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </Card>
                );
              })()}
            </>
      )}

      {/* ─── ÉQUIPES — LISTE ─── */}
      {tab==='equipes' && !activeTeamId && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <Btn onClick={()=>setShowCreate(true)}>+ Nouvelle équipe</Btn>
          </div>
          {teams.length === 0
            ? <Empty icon="👥" title="Aucune équipe" subtitle="Créez votre première équipe pour inviter des closers" action={<Btn onClick={()=>setShowCreate(true)}>+ Créer une équipe</Btn>}/>
            : <div style={{ display:'grid', gridTemplateColumns:mob?'1fr':'repeat(auto-fill,minmax(280px,1fr))', gap:16 }}>
                {teams.map(team => (
                  <TeamCard key={team.id} team={team} allDebriefs={allDebriefs} onClick={()=>setActiveTeamId(team.id)}/>
                ))}
              </div>
          }
        </div>
      )}

      {/* ─── ÉQUIPES — DÉTAIL ─── */}
      {tab==='equipes' && activeTeamId && (() => {
        const team = teams.find(t => t.id===activeTeamId);
        if (!team) return null;
        const td   = (allDebriefs||[]).filter(d => team.members.some(m => m.id===d.user_id));
        const tAvg  = td.length>0 ? Math.round(td.reduce((s,d)=>s+(d.percentage||0),0)/td.length) : 0;
        const tCls  = td.filter(d=>d.is_closed).length;
        const tRate = td.length>0 ? Math.round((tCls/td.length)*100) : 0;
        const tSS   = avgSectionScores(td);
        return (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {/* Header */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <Btn variant="secondary" onClick={()=>setActiveTeamId(null)} style={{width:36,height:36,padding:0,borderRadius:8,fontSize:16}}>←</Btn>
                <div>
                  {editingTeam?.id===team.id ? (
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <input value={editingTeam.name} onChange={e=>setEditingTeam({...editingTeam,name:e.target.value})} onKeyDown={e=>{if(e.key==='Enter')renameTeam();if(e.key==='Escape')setEditingTeam(null);}} style={{ fontSize:18, fontWeight:700, border:'2px solid #6366f1', borderRadius:8, padding:'4px 10px', fontFamily:'inherit', outline:'none' }} autoFocus/>
                      <Btn onClick={renameTeam} style={{padding:'5px 12px',fontSize:12}}>✓</Btn>
                      <Btn variant="ghost" onClick={()=>setEditingTeam(null)} style={{padding:'5px 8px',fontSize:12}}>✕</Btn>
                    </div>
                  ) : (
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <h1 style={{ fontSize:20, fontWeight:700, color:'#1e293b', margin:0 }}>{team.name}</h1>
                      <button onClick={()=>setEditingTeam({id:team.id,name:team.name})} style={{ background:'none', border:'none', cursor:'pointer', fontSize:16, color:'#94a3b8', padding:'2px 4px' }}>✏️</button>
                    </div>
                  )}
                  <p style={{ color:'#64748b', fontSize:13, marginTop:2 }}>{team.members.length} membre{team.members.length!==1?'s':''} · {td.length} debrief{td.length!==1?'s':''}</p>
                </div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <Btn onClick={()=>genCode(team.id)} disabled={generating===team.id} style={{fontSize:13,padding:'8px 14px'}}>{generating===team.id?'Génération...':'🔑 Générer un code'}</Btn>
                <Btn variant="danger" onClick={()=>deleteTeam(team.id,team.name)} style={{padding:'8px 12px',fontSize:13}}>🗑</Btn>
              </div>
            </div>

            {/* KPIs équipe */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:mob?10:16 }}>
              {[{l:'Debriefs',v:td.length,i:'📋',bg:'#ede9fe',c:'#6366f1'},{l:'Score moyen',v:`${tAvg}%`,i:'🎯',bg:'#d1fae5',c:'#059669'},{l:'Taux closing',v:`${tRate}%`,i:'✅',bg:'#fef3c7',c:'#d97706'},{l:'Closings',v:tCls,i:'🏆',bg:'#f0fdf4',c:'#059669'}].map(({l,v,i,bg,c})=>(
                <Card key={l} style={{padding:'12px 14px',display:'flex',alignItems:'center',gap:12}}>
                  <div style={{width:38,height:38,borderRadius:10,background:bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>{i}</div>
                  <div><p style={{fontSize:10,color:'#64748b',margin:0,fontWeight:500,textTransform:'uppercase',letterSpacing:'.04em'}}>{l}</p><p style={{fontSize:20,fontWeight:700,color:c,margin:0}}>{v}</p></div>
                </Card>
              ))}
            </div>

            {/* Codes */}
            <Card style={{ padding:20 }}>
              <h3 style={{ fontSize:14, fontWeight:600, color:'#1e293b', margin:'0 0 12px' }}>🔑 Codes d'invitation actifs</h3>
              {team.inviteCodes.length === 0
                ? <p style={{ color:'#94a3b8', fontSize:13, margin:0 }}>Aucun code actif — cliquez sur "Générer un code" ci-dessus</p>
                : <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                    {team.inviteCodes.map(inv => (
                      <div key={inv.id} style={{ display:'flex', alignItems:'center', gap:8, background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:10, padding:'8px 12px' }}>
                        <span style={{ fontFamily:'monospace', fontSize:16, fontWeight:700, color:'#6366f1', letterSpacing:'.12em' }}>{inv.code}</span>
                        <button onClick={()=>doCopy(inv.code)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:14, color:copied===inv.code?'#059669':'#94a3b8', padding:2 }}>{copied===inv.code?'✓':'📋'}</button>
                        <button onClick={()=>delCode(team.id,inv.id)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:12, color:'#dc2626', padding:2 }}>✕</button>
                      </div>
                    ))}
                  </div>
              }
            </Card>

            {/* Radar équipe */}
            {tSS && td.length > 0 && (
              <Card style={{ padding:20 }}>
                <h3 style={{ fontSize:14, fontWeight:600, color:'#1e293b', margin:'0 0 4px' }}>Analyse par section — {team.name}</h3>
                <p style={{ fontSize:12, color:'#94a3b8', margin:'0 0 20px' }}>Score moyen · comparé à la moyenne globale</p>
                <div style={{ display:'grid', gridTemplateColumns:mob?'1fr':'1fr 1fr', gap:24, alignItems:'center' }}>
                  <div style={{ display:'flex', justifyContent:'center' }}><Radar scores={tSS} color="#059669"/></div>
                  <SectionBars scores={tSS} globalScores={globalSS}/>
                </div>
              </Card>
            )}

            {/* Membres */}
            <Card style={{ overflow:'hidden' }}>
              <div style={{ padding:'14px 16px', borderBottom:'1px solid #f1f5f9', background:'#f8fafc' }}>
                <h3 style={{ fontSize:14, fontWeight:600, color:'#1e293b', margin:0 }}>Membres ({team.members.length})</h3>
              </div>
              {team.members.length === 0
                ? <div style={{ padding:'32px 16px', textAlign:'center', color:'#94a3b8', fontSize:13 }}>Aucun membre — partagez un code d'invitation !</div>
                : team.members.map((m,i) => (
                    <div key={m.id} style={{ borderBottom:i<team.members.length-1?'1px solid #f1f5f9':'none' }}>
                      <MemberRow member={m} teams={teams} currentTeamId={team.id} onRemove={(id,name)=>removeMember(team.id,id,name)} onMove={(mid,tid)=>moveMember(mid,tid)} selected={selMember===m.id} onSelect={()=>setSelMember(selMember===m.id?null:m.id)} onObjectives={()=>setObjectiveTarget(m)} onActionPlans={()=>setSelMember(selMember===m.id?null:m.id)}/>
                      {selMember===m.id && (
                        <div style={{ padding:'14px 16px 18px', borderTop:'1px solid #f5f3ff', background:'#fafafa', display:'flex', flexDirection:'column', gap:14 }}>
                          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                            <Btn onClick={e=>{e.stopPropagation();setObjectiveTarget(m);}} style={{ fontSize:12, padding:'7px 14px' }}>🎯 Objectifs</Btn>
                          </div>
                          <ActionPlanCard closerId={m.id} isHOS={true} toast={toast}/>
                        </div>
                      )}
                    </div>
                  ))
              }
            </Card>
          </div>
        );
      })()}

      {/* Objective modal */}
      {objectiveTarget && <ObjectiveModal closer={objectiveTarget} onClose={()=>setObjectiveTarget(null)} toast={toast}/>}

      {/* Modal créer équipe */}
      {showCreate && (
        <Modal title="Créer une nouvelle équipe" onClose={()=>setShowCreate(false)}>
          <div style={{ marginBottom:20 }}>
            <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 }}>Nom de l'équipe</label>
            <Input placeholder="Ex: Équipe Paris, Closers B2B..." value={newName} onChange={e=>setNewName(e.target.value)} autoFocus onKeyDown={e=>{if(e.key==='Enter')createTeam();}}/>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <Btn onClick={createTeam} disabled={creating||!newName.trim()} style={{flex:1}}>{creating?'Création...':'Créer'}</Btn>
            <Btn variant="secondary" onClick={()=>setShowCreate(false)} style={{flex:1}}>Annuler</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── PAGES ────────────────────────────────────────────────────────────────────
function Dashboard({ debriefs, navigate, user, gam, lbKey, toast }) {
  const isHOS = user.role === 'head_of_sales';
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:700, color:'#1e293b', margin:0 }}>Tableau de bord</h1>
          <p style={{ color:'#64748b', marginTop:4, fontSize:14 }}>Bonjour, {user.name} 👋</p>
        </div>
        <Btn onClick={()=>navigate('NewDebrief')}>+ Nouveau debrief</Btn>
      </div>
      {!isHOS && <ObjectiveBanner userId={user.id}/>}
      <GamCard gam={gam}/>
      <StatsRow debriefs={debriefs}/>
      <Card style={{ padding:20 }}>
        <h2 style={{ fontSize:14, fontWeight:600, color:'#1e293b', marginBottom:14 }}>Évolution du score</h2>
        <Chart debriefs={debriefs}/>
      </Card>
      <Leaderboard refreshKey={lbKey}/>
      {!isHOS && <ActionPlanCard closerId={user.id} isHOS={false} toast={toast}/>}
      <div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <h2 style={{ fontSize:16, fontWeight:600, color:'#1e293b', margin:0 }}>Derniers debriefs</h2>
          {debriefs.length>5 && <button onClick={()=>navigate('History')} style={{background:'none',border:'none',color:'#6366f1',fontSize:13,cursor:'pointer'}}>Voir tout ›</button>}
        </div>
        {debriefs.length===0
          ? <Empty icon="📋" title="Aucun debrief" subtitle="Créez votre premier debrief pour suivre vos progrès" action={<Btn variant="secondary" onClick={()=>navigate('NewDebrief')}>+ Créer votre premier debrief</Btn>}/>
          : <div style={{display:'flex',flexDirection:'column',gap:10}}>{debriefs.slice(0,5).map(d=><DebriefCard key={d.id} debrief={d} onClick={()=>navigate('Detail',d.id)} showUser={isHOS}/>)}</div>
        }
      </div>
    </div>
  );
}

function History({ debriefs, navigate, user }) {
  const [q, setQ] = useState('');
  const isHOS = user.role==='head_of_sales';
  const filtered = debriefs.filter(d => {
    const s = q.toLowerCase();
    return d.prospect_name?.toLowerCase().includes(s) || d.closer_name?.toLowerCase().includes(s) || d.user_name?.toLowerCase().includes(s);
  });
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div>
        <h1 style={{ fontSize:22, fontWeight:700, color:'#1e293b', margin:0 }}>Historique</h1>
        <p style={{ color:'#94a3b8', fontSize:13, marginTop:4 }}>{debriefs.length} debrief{debriefs.length!==1?'s':''}</p>
      </div>
      <div style={{ position:'relative' }}>
        <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#94a3b8', pointerEvents:'none' }}>🔍</span>
        <input placeholder="Rechercher..." value={q} onChange={e=>setQ(e.target.value)} style={{ width:'100%', padding:'12px 36px', border:'1px solid #e2e8f0', borderRadius:10, fontSize:14, fontFamily:'inherit', outline:'none', boxSizing:'border-box' }}/>
        {q && <button onClick={()=>setQ('')} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#94a3b8', cursor:'pointer', fontSize:18 }}>✕</button>}
      </div>
      {filtered.length===0
        ? <Empty icon="🔍" title="Aucun résultat" subtitle={q?`Aucun debrief pour "${q}"`:'Aucun debrief'} action={q?<Btn variant="secondary" onClick={()=>setQ('')}>Effacer</Btn>:null}/>
        : <div style={{display:'flex',flexDirection:'column',gap:10}}>{filtered.map(d=><DebriefCard key={d.id} debrief={d} onClick={()=>navigate('Detail',d.id,'History')} showUser={isHOS}/>)}</div>
      }
    </div>
  );
}

function Detail({ debrief, navigate, onDelete, fromPage, user, toast }) {
  const mob = useIsMobile();
  if (!debrief) return (
    <div style={{ textAlign:'center', padding:60 }}>
      <p style={{ color:'#94a3b8' }}>Debrief introuvable</p>
      <Btn variant="secondary" onClick={()=>navigate('Dashboard')} style={{ marginTop:16 }}>Retour</Btn>
    </div>
  );
  const pct    = Math.round(debrief.percentage || 0);
  const scores = computeSectionScores(debrief.sections || {});
  const barCol = v => v>=4?'#059669':v>=3?'#d97706':v>=2?'#6366f1':'#ef4444';
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <Btn variant="secondary" onClick={()=>navigate(fromPage||'Dashboard')} style={{width:36,height:36,padding:0,borderRadius:8,fontSize:16,flexShrink:0}}>←</Btn>
          <div>
            <h1 style={{ fontSize:mob?18:22, fontWeight:700, color:'#1e293b', margin:0 }}>{debrief.prospect_name}</h1>
            <div style={{ display:'flex', gap:12, fontSize:12, color:'#94a3b8', marginTop:4, flexWrap:'wrap' }}>
              <span>📅 {fmtDate(debrief.call_date)}</span>
              <span>👤 {debrief.closer_name}</span>
              {debrief.user_name && <span>par {debrief.user_name}</span>}
            </div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
          <ClosedBadge isClosed={debrief.is_closed}/>
          {debrief.call_link && <a href={debrief.call_link} target="_blank" rel="noopener noreferrer" style={{padding:'6px 12px',border:'1px solid #e2e8f0',borderRadius:8,background:'white',fontSize:12,textDecoration:'none',color:'#374151'}}>🔗 Écouter</a>}
          <Btn variant="danger" onClick={()=>onDelete(debrief.id)} style={{width:36,height:36,padding:0,borderRadius:8,fontSize:14}}>🗑</Btn>
        </div>
      </div>

      {mob ? (
        <>
          <Card style={{ padding:20, display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
            <ScoreGauge percentage={pct}/>
            <p style={{ fontSize:13, color:'#94a3b8', margin:0 }}>{debrief.total_score} / {debrief.max_score} points</p>
            <Radar scores={scores}/>
          </Card>
          <Card style={{ padding:20 }}>
            <h3 style={{ fontSize:14, fontWeight:600, color:'#1e293b', marginBottom:16 }}>Score par section</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {SECTIONS.map(({ key, label }) => {
                const val = scores[key]||0;
                return (
                  <div key={key}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:5 }}>
                      <span style={{ fontSize:14, fontWeight:600, color:'#374151' }}>{label}</span>
                      <span style={{ fontSize:13, fontWeight:700, padding:'2px 8px', borderRadius:6, border:'1px solid #e2e8f0', color:barCol(val) }}>{val}/5</span>
                    </div>
                    <div style={{ height:10, background:'#f1f5f9', borderRadius:5, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${(val/5)*100}%`, background:barCol(val), borderRadius:5, transition:'width .7s' }}/>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'240px 1fr', gap:20, alignItems:'start' }}>
          <Card style={{ padding:24, display:'flex', flexDirection:'column', alignItems:'center', gap:14 }}>
            <ScoreGauge percentage={pct}/>
            <p style={{ fontSize:13, color:'#94a3b8', margin:0 }}>{debrief.total_score} / {debrief.max_score} points</p>
            <Radar scores={scores}/>
          </Card>
          <Card style={{ padding:24 }}>
            <h3 style={{ fontSize:14, fontWeight:600, color:'#1e293b', marginBottom:20 }}>Score par section</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {SECTIONS.map(({ key, label }) => {
                const val = scores[key]||0;
                const sn  = debrief.section_notes?.[key];
                return (
                  <div key={key}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:5 }}>
                      <span style={{ fontSize:13, fontWeight:600, color:'#374151' }}>{label}</span>
                      <span style={{ fontSize:12, fontWeight:700, padding:'2px 8px', borderRadius:6, border:'1px solid #e2e8f0', color:barCol(val) }}>{val}/5</span>
                    </div>
                    <div style={{ height:10, background:'#f1f5f9', borderRadius:5, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${(val/5)*100}%`, background:barCol(val), borderRadius:5, transition:'width .7s' }}/>
                    </div>
                    {sn && (sn.strength||sn.weakness||sn.improvement) && (
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginTop:8 }}>
                        {sn.strength    && <div style={{fontSize:11,padding:'6px 8px',borderRadius:6,background:'#f0fdf4',border:'1px solid #bbf7d0',color:'#166534'}}>👍 {sn.strength}</div>}
                        {sn.weakness    && <div style={{fontSize:11,padding:'6px 8px',borderRadius:6,background:'#fff5f5',border:'1px solid #fca5a5',color:'#991b1b'}}>👎 {sn.weakness}</div>}
                        {sn.improvement && <div style={{fontSize:11,padding:'6px 8px',borderRadius:6,background:'#fffbeb',border:'1px solid #fcd34d',color:'#92400e'}}>📈 {sn.improvement}</div>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {(debrief.strengths||debrief.improvements||debrief.notes) && (
        <div style={{ display:'grid', gridTemplateColumns:mob?'1fr':'repeat(3,1fr)', gap:12 }}>
          {debrief.strengths    && <Card style={{padding:16}}><h3 style={{fontSize:13,fontWeight:600,color:'#059669',marginBottom:8}}>Points forts</h3><p style={{fontSize:13,color:'#64748b',whiteSpace:'pre-wrap',margin:0}}>{debrief.strengths}</p></Card>}
          {debrief.improvements && <Card style={{padding:16}}><h3 style={{fontSize:13,fontWeight:600,color:'#d97706',marginBottom:8}}>Axes d'amélioration</h3><p style={{fontSize:13,color:'#64748b',whiteSpace:'pre-wrap',margin:0}}>{debrief.improvements}</p></Card>}
          {debrief.notes        && <Card style={{padding:16}}><h3 style={{fontSize:13,fontWeight:600,color:'#6366f1',marginBottom:8}}>Notes</h3><p style={{fontSize:13,color:'#64748b',whiteSpace:'pre-wrap',margin:0}}>{debrief.notes}</p></Card>}
        </div>
      )}

      {/* Comments */}
      <CommentsSection debriefId={debrief.id} user={user} toast={toast}/>
    </div>
  );
}

function NewDebrief({ navigate, onSave, toast }) {
  const mob = useIsMobile();
  const [form, setForm] = useState({ prospect_name:'', call_date:new Date().toISOString().split('T')[0], closer_name:'', call_link:'', is_closed:null, notes:'' });
  const [secs,  setSecs]  = useState({ decouverte:{}, reformulation:{}, projection:{}, offre:{}, closing:{} });
  const [notes, setNotes] = useState({ decouverte:{}, reformulation:{}, projection:{}, offre:{}, closing:{} });
  const [loading, setLoading] = useState(false);
  const { total, max, percentage } = computeScore(secs);

  const submit = async e => {
    e.preventDefault();
    if (form.is_closed === null) { toast("Indiquez le résultat de l'appel", 'error'); return; }
    setLoading(true);
    try {
      const r = await apiFetch('/debriefs',{ method:'POST', body:{ ...form, sections:secs, section_notes:notes, total_score:total, max_score:max, percentage, scores:{}, criteria_notes:{} } });
      onSave(r.debrief, r.gamification);
      toast(`Debrief enregistré ! +${r.gamification.pointsEarned} pts`);
      navigate('Detail', r.debrief.id);
    } catch(e) { toast(e.message,'error'); } finally { setLoading(false); }
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <Btn variant="secondary" onClick={()=>navigate('Dashboard')} style={{width:36,height:36,padding:0,borderRadius:8,fontSize:16,flexShrink:0}}>←</Btn>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700, color:'#1e293b', margin:0 }}>Nouveau debrief</h1>
          <p style={{ color:'#94a3b8', fontSize:13, marginTop:2 }}>Évaluez votre dernier appel</p>
        </div>
      </div>

      {/* Score en haut sur mobile */}
      {mob && (
        <div style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius:12, padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', color:'white' }}>
          <div>
            <p style={{ fontSize:11, opacity:.8, margin:0, textTransform:'uppercase', letterSpacing:'.05em' }}>Score en direct</p>
            <p style={{ fontSize:28, fontWeight:700, margin:0 }}>{percentage}%</p>
            <p style={{ fontSize:12, opacity:.7, margin:0 }}>{total} / {max} points</p>
          </div>
          {form.is_closed !== null && <ClosedBadge isClosed={form.is_closed}/>}
        </div>
      )}

      <form onSubmit={submit}>
        <div style={{ display:'grid', gridTemplateColumns:mob?'1fr':'1fr 300px', gap:mob?16:24, alignItems:'start' }}>
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <Card style={{ padding:16 }}>
              <h3 style={{ fontSize:14, fontWeight:600, color:'#1e293b', marginBottom:14 }}>Informations de l'appel</h3>
              <div style={{ display:'grid', gridTemplateColumns:mob?'1fr':'repeat(3,1fr)', gap:12, marginBottom:14 }}>
                <div><label style={{display:'block',fontSize:12,fontWeight:600,color:'#374151',marginBottom:6}}>Prospect *</label><Input required placeholder="Nom du prospect" value={form.prospect_name} onChange={e=>setForm({...form,prospect_name:e.target.value})}/></div>
                <div><label style={{display:'block',fontSize:12,fontWeight:600,color:'#374151',marginBottom:6}}>Closer *</label><Input required placeholder="Votre nom" value={form.closer_name} onChange={e=>setForm({...form,closer_name:e.target.value})}/></div>
                <div><label style={{display:'block',fontSize:12,fontWeight:600,color:'#374151',marginBottom:6}}>Date *</label><Input type="date" required value={form.call_date} onChange={e=>setForm({...form,call_date:e.target.value})}/></div>
              </div>
              <div style={{ marginBottom:14 }}>
                <label style={{display:'block',fontSize:12,fontWeight:600,color:'#374151',marginBottom:6}}>🔗 Lien enregistrement</label>
                <Input type="url" placeholder="https://..." value={form.call_link} onChange={e=>setForm({...form,call_link:e.target.value})}/>
              </div>
              <div>
                <label style={{display:'block',fontSize:12,fontWeight:600,color:'#374151',marginBottom:8}}>Résultat *</label>
                <div style={{ display:'flex', gap:10 }}>
                  {[{val:true,label:'✅ Closer',border:'#059669',bg:'#d1fae5',c:'#065f46'},{val:false,label:'❌ Non Closer',border:'#dc2626',bg:'#fee2e2',c:'#991b1b'}].map(({val,label,border,bg,c})=>(
                    <button key={String(val)} type="button" onClick={()=>setForm({...form,is_closed:val})} style={{flex:1,padding:'12px 14px',borderRadius:10,border:`2px solid ${form.is_closed===val?border:'#e2e8f0'}`,background:form.is_closed===val?bg:'white',color:form.is_closed===val?c:'#94a3b8',fontWeight:600,fontSize:13,cursor:'pointer',fontFamily:'inherit',transition:'all .2s'}}>{label}</button>
                  ))}
                </div>
              </div>
            </Card>
            <h2 style={{ fontSize:14, fontWeight:600, color:'#1e293b', margin:0 }}>Évaluation des critères</h2>
            <S1 data={secs.decouverte}    onChange={v=>setSecs(s=>({...s,decouverte:v}))}    notes={notes.decouverte}    onNotes={n=>setNotes(p=>({...p,decouverte:n}))}/>
            <S2 data={secs.reformulation}  onChange={v=>setSecs(s=>({...s,reformulation:v}))}  notes={notes.reformulation}  onNotes={n=>setNotes(p=>({...p,reformulation:n}))}/>
            <S3 data={secs.projection}     onChange={v=>setSecs(s=>({...s,projection:v}))}     notes={notes.projection}     onNotes={n=>setNotes(p=>({...p,projection:n}))}/>
            <S4 data={secs.offre}          onChange={v=>setSecs(s=>({...s,offre:v}))}          notes={notes.offre}          onNotes={n=>setNotes(p=>({...p,offre:n}))}/>
            <S5 data={secs.closing}        onChange={v=>setSecs(s=>({...s,closing:v}))}        notes={notes.closing}        onNotes={n=>setNotes(p=>({...p,closing:n}))}/>
            <Card style={{ padding:16 }}>
              <h3 style={{ fontSize:14, fontWeight:600, color:'#1e293b', marginBottom:12 }}>Notes globales</h3>
              <Textarea placeholder="Notes libres sur l'appel..." value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/>
            </Card>
            {mob && <Btn type="submit" disabled={loading} style={{width:'100%',padding:'14px 20px',fontSize:15}}>{loading?'Enregistrement...':'💾 Enregistrer le debrief'}</Btn>}
          </div>

          {/* Sidebar score — desktop */}
          {!mob && (
            <div style={{ position:'sticky', top:80 }}>
              <Card style={{ padding:24, display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
                <h3 style={{ fontSize:14, fontWeight:600, color:'#1e293b', margin:0 }}>Score en direct</h3>
                <ScoreGauge percentage={percentage}/>
                <p style={{ fontSize:13, color:'#94a3b8', margin:0 }}>{total} / {max} points</p>
                {form.is_closed !== null && <ClosedBadge isClosed={form.is_closed}/>}
                <Btn type="submit" disabled={loading} style={{width:'100%'}}>{loading?'Enregistrement...':'💾 Enregistrer le debrief'}</Btn>
              </Card>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}

// ─── USER MENU ────────────────────────────────────────────────────────────────
function UserMenu({ user, gam, onLogout, onSettings, toast }) {
  const [open, setOpen] = useState(false);
  const mob = useIsMobile();
  const ref = useRef(null);

  // Fermer sur clic extérieur
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div ref={ref} style={{ position:'relative', flexShrink:0 }}>
      <button onClick={()=>setOpen(o=>!o)} style={{ display:'flex', alignItems:'center', gap:8, border:`1px solid ${open?'#c4b5fd':'#e2e8f0'}`, borderRadius:10, padding:'5px 10px', cursor:'pointer', fontFamily:'inherit', transition:'all .15s', background:open?'#f5f3ff':'white' }}>
        <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'white', flexShrink:0 }}>{user.name.charAt(0).toUpperCase()}</div>
        {!mob && <span style={{ fontSize:13, fontWeight:500, color:'#374151' }}>{user.name}</span>}
        {user.role==='head_of_sales' && !mob && <span style={{ background:'#fef3c7', color:'#92400e', fontSize:10, fontWeight:700, padding:'2px 6px', borderRadius:4 }}>HOS</span>}
        {gam && <span style={{ fontSize:13 }} title={`${gam.level.name} · ${gam.points} pts`}>{gam.level.icon}</span>}
        <span style={{ fontSize:10, color:'#94a3b8' }}>{open?'▲':'▼'}</span>
      </button>

      {open && (
        <div style={{ position:'absolute', right:0, top:'calc(100% + 8px)', background:'white', border:'1px solid #e2e8f0', borderRadius:12, boxShadow:'0 8px 32px rgba(0,0,0,.12)', minWidth:220, zIndex:200, overflow:'hidden' }}>
          {/* Profil */}
          <div style={{ padding:'14px 16px', borderBottom:'1px solid #f1f5f9', background:'#f8fafc' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:'white', flexShrink:0 }}>{user.name.charAt(0)}</div>
              <div>
                <p style={{ fontWeight:600, fontSize:13, color:'#1e293b', margin:0 }}>{user.name}</p>
                <p style={{ fontSize:11, color:'#94a3b8', margin:0 }}>{user.email}</p>
              </div>
            </div>
            {gam && (
              <div style={{ marginTop:10, padding:'8px 10px', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ fontSize:12, color:'white', fontWeight:500 }}>{gam.level.icon} {gam.level.name}</span>
                <span style={{ fontSize:12, color:'rgba(255,255,255,.85)', fontWeight:600 }}>{gam.points} pts</span>
              </div>
            )}
          </div>

          {/* Actions */}
          {[
            { icon:'⚙️', label:'Paramètres du compte', action:()=>{ onSettings(); setOpen(false); } },
            { icon:'🔔', label:'Notifications',         action:()=>{ toast('Bientôt disponible !','info'); setOpen(false); } },
          ].map(({ icon, label, action }) => (
            <button key={label} onClick={action} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'11px 16px', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:13, color:'#374151', textAlign:'left', transition:'background .1s' }}
              onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
              onMouseLeave={e=>e.currentTarget.style.background='none'}>
              <span style={{ fontSize:16, width:20, textAlign:'center' }}>{icon}</span>{label}
            </button>
          ))}

          <div style={{ height:1, background:'#f1f5f9', margin:'4px 0' }}/>

          <button onClick={()=>{ onLogout(); setOpen(false); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'11px 16px', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:13, color:'#dc2626', textAlign:'left', transition:'background .1s' }}
            onMouseEnter={e=>e.currentTarget.style.background='#fff5f5'}
            onMouseLeave={e=>e.currentTarget.style.background='none'}>
            <span style={{ fontSize:16, width:20, textAlign:'center' }}>↩</span>Déconnexion
          </button>
        </div>
      )}
    </div>
  );
}


// ─── PROG BAR ─────────────────────────────────────────────────────────────────
function ProgBar({ label, current, target, color='#6366f1' }) {
  if (!target) return null;
  const pct = Math.min(Math.round((current / target) * 100), 100);
  const done = current >= target;
  return (
    <div style={{ flex:1, minWidth:120 }}>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, fontWeight:600, marginBottom:4 }}>
        <span style={{ color:'#374151' }}>{label}</span>
        <span style={{ color:done?'#059669':color }}>{current}/{target}{done?' ✓':''}</span>
      </div>
      <div style={{ height:6, background:'#e2e8f0', borderRadius:3, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${pct}%`, background:done?'#059669':color, borderRadius:3, transition:'width .7s' }}/>
      </div>
    </div>
  );
}

// ─── OBJECTIF BANNER (closer dashboard) ──────────────────────────────────────
function ObjectiveBanner({ userId }) {
  const [objectives, setObjectives] = useState([]);
  useEffect(() => {
    apiFetch('/objectives/me').then(setObjectives).catch(() => {});
  }, [userId]);

  const monthly = objectives.find(o => o.period_type === 'monthly');
  const weekly  = objectives.find(o => o.period_type === 'weekly');
  if (!monthly && !weekly) return null;

  const render = (obj, label) => {
    if (!obj) return null;
    const p = obj.progress || {};
    return (
      <div style={{ flex:1 }}>
        <p style={{ fontSize:11, fontWeight:600, color:'#64748b', textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 10px' }}>{label}</p>
        <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
          {obj.target_debriefs > 0 && <ProgBar label="Debriefs" current={p.debriefs||0} target={obj.target_debriefs} color='#6366f1'/>}
          {obj.target_score    > 0 && <ProgBar label="Score moy." current={p.score||0} target={obj.target_score} color='#d97706'/>}
          {obj.target_closings > 0 && <ProgBar label="Closings" current={p.closings||0} target={obj.target_closings} color='#059669'/>}
          {obj.target_revenue  > 0 && <ProgBar label="CA (€)" current={p.revenue||0} target={obj.target_revenue} color='#8b5cf6'/>}
        </div>
      </div>
    );
  };

  return (
    <div style={{ background:'white', border:'1px solid #e2e8f0', borderRadius:12, padding:'16px 20px', borderLeft:'4px solid #6366f1' }}>
      <p style={{ fontSize:13, fontWeight:700, color:'#1e293b', margin:'0 0 14px' }}>🎯 Mes objectifs</p>
      <div style={{ display:'flex', gap:24, flexWrap:'wrap' }}>
        {render(monthly, 'Ce mois-ci')}
        {monthly && weekly && <div style={{ width:1, background:'#e2e8f0', alignSelf:'stretch' }}/>}
        {render(weekly, 'Cette semaine')}
      </div>
    </div>
  );
}

// ─── OBJECTIVE MODAL (HOS → closer) ──────────────────────────────────────────
function ObjectiveModal({ closer, onClose, toast }) {
  const [tab, setTab] = useState('monthly');
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const day = now.getDay() || 7;
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - day + 1);
  const weekStartStr = weekStart.toISOString().split('T')[0];

  const [form, setForm] = useState({ target_debriefs:'', target_score:'', target_closings:'', target_revenue:'' });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await apiFetch('/objectives', { method:'POST', body: {
        closer_id: closer.id,
        period_type: tab,
        period_start: tab === 'monthly' ? monthStart : weekStartStr,
        target_debriefs: Number(form.target_debriefs) || 0,
        target_score:    Number(form.target_score) || 0,
        target_closings: Number(form.target_closings) || 0,
        target_revenue:  Number(form.target_revenue) || 0,
      }});
      toast(`Objectifs de ${closer.name} mis à jour !`);
      onClose();
    } catch(e) { toast(e.message, 'error'); } finally { setSaving(false); }
  };

  return (
    <Modal title={`🎯 Objectifs — ${closer.name}`} onClose={onClose}>
      <div style={{ display:'flex', gap:4, background:'#f1f5f9', padding:4, borderRadius:8, marginBottom:20 }}>
        {[{key:'monthly',label:'📅 Ce mois'},{key:'weekly',label:'📆 Cette semaine'}].map(({key,label}) => (
          <button key={key} onClick={()=>setTab(key)} style={{ flex:1, padding:'7px 12px', borderRadius:6, border:'none', fontSize:13, fontWeight:500, cursor:'pointer', background:tab===key?'white':'transparent', color:tab===key?'#1e293b':'#64748b', fontFamily:'inherit', boxShadow:tab===key?'0 1px 3px rgba(0,0,0,.08)':'none' }}>{label}</button>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
        {[
          { key:'target_debriefs', label:'📋 Debriefs', ph:'Ex: 20' },
          { key:'target_score',    label:'🎯 Score moyen (%)', ph:'Ex: 70' },
          { key:'target_closings', label:'✅ Closings', ph:'Ex: 5' },
          { key:'target_revenue',  label:'💶 CA (€)', ph:'Ex: 15000' },
        ].map(({ key, label, ph }) => (
          <div key={key}>
            <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#374151', marginBottom:5 }}>{label}</label>
            <Input type="number" placeholder={ph} value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})}/>
          </div>
        ))}
      </div>
      <p style={{ fontSize:12, color:'#94a3b8', margin:'0 0 16px' }}>Laissez 0 pour ne pas suivre un indicateur.</p>
      <div style={{ display:'flex', gap:10 }}>
        <Btn onClick={save} disabled={saving} style={{ flex:1 }}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Btn>
        <Btn variant="secondary" onClick={onClose} style={{ flex:1 }}>Annuler</Btn>
      </div>
    </Modal>
  );
}

// ─── ACTION PLANS (closer dashboard + HOS) ───────────────────────────────────
function ActionPlanCard({ closerId, isHOS, toast }) {
  const [plans, setPlans]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm]     = useState({ axis:'', description:'' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    const path = isHOS ? `/action-plans/closer/${closerId}` : '/action-plans/me';
    apiFetch(path).then(setPlans).catch(()=>[]).finally(()=>setLoading(false));
  }, [closerId, isHOS]);
  useEffect(load, [load]);

  const add = async () => {
    if (!form.axis.trim()) return;
    setSaving(true);
    try {
      const p = await apiFetch('/action-plans', { method:'POST', body:{ closer_id:closerId, axis:form.axis.trim(), description:form.description.trim() }});
      setPlans(prev => [p, ...prev]);
      setForm({ axis:'', description:'' });
      setShowAdd(false);
      toast("Plan d'action ajouté !");
    } catch(e) { toast(e.message, 'error'); } finally { setSaving(false); }
  };

  const resolve = async (id) => {
    try {
      const updated = await apiFetch(`/action-plans/${id}`, { method:'PATCH', body:{ status:'resolved' }});
      setPlans(prev => prev.map(p => p.id===id ? updated : p));
      toast('Axe marqué comme résolu ✓');
    } catch(e) { toast(e.message, 'error'); }
  };

  const remove = async (id) => {
    try {
      await apiFetch(`/action-plans/${id}`, { method:'DELETE' });
      setPlans(prev => prev.filter(p => p.id!==id));
      toast('Plan supprimé');
    } catch(e) { toast(e.message, 'error'); }
  };

  const active   = plans.filter(p => p.status==='active');
  const resolved = plans.filter(p => p.status==='resolved').slice(0,3);

  return (
    <Card style={{ overflow:'hidden' }}>
      <div style={{ padding:'14px 16px', borderBottom:'1px solid #f1f5f9', background:'#f8fafc', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <h3 style={{ fontSize:14, fontWeight:700, color:'#1e293b', margin:0 }}>📌 Plan d'action</h3>
          <p style={{ fontSize:11, color:'#94a3b8', margin:0 }}>{active.length}/3 axe{active.length!==1?'s':''} actif{active.length!==1?'s':''}</p>
        </div>
        {isHOS && active.length < 3 && (
          <Btn onClick={()=>setShowAdd(true)} style={{ fontSize:12, padding:'6px 12px' }}>+ Ajouter</Btn>
        )}
      </div>

      {loading ? (
        <div style={{ padding:20, display:'flex', justifyContent:'center' }}><Spinner size={24}/></div>
      ) : (
        <div style={{ padding:16, display:'flex', flexDirection:'column', gap:10 }}>
          {active.length === 0 && !showAdd && (
            <p style={{ color:'#94a3b8', fontSize:13, textAlign:'center', padding:'12px 0' }}>
              {isHOS ? 'Aucun axe actif. Cliquez "+ Ajouter" pour en définir un.' : "Aucun axe de travail défini pour l'instant."}
            </p>
          )}

          {active.map(plan => (
            <div key={plan.id} style={{ display:'flex', gap:12, padding:'12px 14px', background:'#f8fafc', borderRadius:10, border:'1px solid #e2e8f0', alignItems:'flex-start' }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:'#6366f1', marginTop:5, flexShrink:0 }}/>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontWeight:600, fontSize:13, color:'#1e293b', margin:'0 0 2px' }}>{plan.axis}</p>
                {plan.description && <p style={{ fontSize:12, color:'#64748b', margin:0 }}>{plan.description}</p>}
                <p style={{ fontSize:11, color:'#94a3b8', margin:'4px 0 0' }}>
                  Ajouté le {fmtDate(plan.created_at)}
                </p>
              </div>
              <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                <button onClick={()=>resolve(plan.id)} title="Marquer comme résolu" style={{ background:'#d1fae5', border:'1px solid #6ee7b7', color:'#065f46', borderRadius:7, padding:'4px 8px', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>✓ Résolu</button>
                {isHOS && <button onClick={()=>remove(plan.id)} style={{ background:'none', border:'none', color:'#dc2626', cursor:'pointer', fontSize:14, padding:'2px 4px' }}>✕</button>}
              </div>
            </div>
          ))}

          {showAdd && (
            <div style={{ padding:'14px', background:'#f5f3ff', borderRadius:10, border:'1px solid #c4b5fd', display:'flex', flexDirection:'column', gap:10 }}>
              <Input placeholder="Axe de travail (ex: Améliorer le closing)" value={form.axis} onChange={e=>setForm({...form,axis:e.target.value})} autoFocus/>
              <Textarea placeholder="Description (optionnel)" rows={2} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/>
              <div style={{ display:'flex', gap:8 }}>
                <Btn onClick={add} disabled={saving||!form.axis.trim()} style={{ flex:1, fontSize:13, padding:'8px 14px' }}>{saving?'...':'Ajouter'}</Btn>
                <Btn variant="secondary" onClick={()=>{setShowAdd(false);setForm({axis:'',description:''}); }} style={{ fontSize:13, padding:'8px 14px' }}>Annuler</Btn>
              </div>
            </div>
          )}

          {resolved.length > 0 && (
            <div style={{ marginTop:4 }}>
              <p style={{ fontSize:11, color:'#94a3b8', fontWeight:600, textTransform:'uppercase', letterSpacing:'.04em', marginBottom:8 }}>Récemment résolus</p>
              {resolved.map(plan => (
                <div key={plan.id} style={{ display:'flex', gap:10, padding:'8px 10px', borderRadius:8, alignItems:'center', opacity:.65 }}>
                  <span style={{ color:'#059669', fontSize:12 }}>✓</span>
                  <span style={{ fontSize:12, color:'#64748b', textDecoration:'line-through', flex:1 }}>{plan.axis}</span>
                  <span style={{ fontSize:11, color:'#94a3b8' }}>{fmtDate(plan.resolved_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ─── COMMENTS SECTION (debrief detail) ───────────────────────────────────────
function CommentsSection({ debriefId, user, toast }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [text, setText]         = useState('');
  const [sending, setSending]   = useState(false);

  useEffect(() => {
    apiFetch(`/debriefs/${debriefId}/comments`)
      .then(setComments).catch(()=>{}).finally(()=>setLoading(false));
  }, [debriefId]);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      const c = await apiFetch(`/debriefs/${debriefId}/comments`, { method:'POST', body:{ content:text.trim() }});
      setComments(prev => [...prev, c]);
      setText('');
    } catch(e) { toast(e.message, 'error'); } finally { setSending(false); }
  };

  const del = async (id) => {
    try {
      await apiFetch(`/comments/${id}`, { method:'DELETE' });
      setComments(prev => prev.filter(c => c.id!==id));
    } catch(e) { toast(e.message, 'error'); }
  };

  return (
    <Card style={{ overflow:'hidden' }}>
      <div style={{ padding:'14px 16px', borderBottom:'1px solid #f1f5f9', background:'#f8fafc' }}>
        <h3 style={{ fontSize:14, fontWeight:700, color:'#1e293b', margin:0 }}>
          💬 Commentaires
          {comments.length > 0 && <span style={{ marginLeft:8, background:'#ede9fe', color:'#4c1d95', fontSize:11, fontWeight:600, padding:'2px 7px', borderRadius:10 }}>{comments.length}</span>}
        </h3>
      </div>
      <div style={{ padding:16, display:'flex', flexDirection:'column', gap:12 }}>
        {loading ? <Spinner size={24}/> : comments.length === 0 ? (
          <p style={{ color:'#94a3b8', fontSize:13, textAlign:'center', padding:'8px 0' }}>Aucun commentaire</p>
        ) : comments.map(c => (
          <div key={c.id} style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
            <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:12, color:'white', flexShrink:0 }}>{c.author_name?.charAt(0)}</div>
            <div style={{ flex:1, background:'#f8fafc', borderRadius:'0 10px 10px 10px', padding:'10px 14px', border:'1px solid #e2e8f0' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ fontWeight:600, fontSize:12, color:'#374151' }}>{c.author_name}</span>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:11, color:'#94a3b8' }}>{fmtDate(c.created_at)}</span>
                  {(c.author_id === user.id || user.role === 'head_of_sales') && (
                    <button onClick={()=>del(c.id)} style={{ background:'none', border:'none', color:'#dc2626', cursor:'pointer', fontSize:12, padding:0 }}>✕</button>
                  )}
                </div>
              </div>
              <p style={{ fontSize:13, color:'#374151', margin:0, whiteSpace:'pre-wrap', lineHeight:1.5 }}>{c.content}</p>
            </div>
          </div>
        ))}

        {/* Input */}
        <div style={{ display:'flex', gap:10, alignItems:'flex-end', marginTop:4 }}>
          <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:12, color:'white', flexShrink:0 }}>{user.name?.charAt(0)}</div>
          <div style={{ flex:1 }}>
            <Textarea placeholder="Ajouter un commentaire..." rows={2} value={text} onChange={e=>setText(e.target.value)}/>
          </div>
          <Btn onClick={send} disabled={sending||!text.trim()} style={{ padding:'10px 16px', fontSize:13, alignSelf:'flex-end' }}>{sending?'...':'Envoyer'}</Btn>
        </div>
      </div>
    </Card>
  );
}

// ─── PIPELINE PAGE ────────────────────────────────────────────────────────────
const PIPELINE_STAGES = [
  { key:'prospect',     label:'Prospects',    color:'#64748b', bg:'#f1f5f9',  icon:'👤' },
  { key:'premier_appel',label:'1er appel',    color:'#6366f1', bg:'#ede9fe',  icon:'📞' },
  { key:'relance',      label:'Relance',      color:'#d97706', bg:'#fef3c7',  icon:'🔄' },
  { key:'negociation',  label:'Négociation',  color:'#7c3aed', bg:'#f5f3ff',  icon:'🤝' },
  { key:'signe',        label:'Signés ✓',     color:'#059669', bg:'#d1fae5',  icon:'✅' },
  { key:'perdu',        label:'Perdus',       color:'#dc2626', bg:'#fee2e2',  icon:'❌' },
];

function LeadSheet({ deal, debriefs, onClose, onSave, onDelete, toast }) {
  const [form, setForm] = useState({
    prospect_name: deal?.prospect_name || '',
    source:        deal?.source        || '',
    value:         deal?.value != null ? String(deal.value) : '',
    status:        deal?.status        || 'prospect',
    follow_up_date:deal?.follow_up_date|| '',
    notes:         deal?.notes         || '',
    debrief_id:    deal?.debrief_id    || '',
  });
  const [saving, setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isNew = !deal?.id;

  const linkedDebrief = debriefs.find(d => d.id === form.debrief_id);

  const save = async () => {
    if (!form.prospect_name.trim()) return;
    setSaving(true);
    try {
      const body = { ...form, value: Number(form.value) || 0, debrief_id: form.debrief_id || null };
      const result = isNew
        ? await apiFetch('/deals', { method:'POST', body })
        : await apiFetch(`/deals/${deal.id}`, { method:'PATCH', body });
      onSave(result, !isNew);
      toast(isNew ? 'Lead créé !' : 'Lead mis à jour !');
      onClose();
    } catch(e) { toast(e.message, 'error'); } finally { setSaving(false); }
  };

  const del = async () => {
    if (!confirm('Supprimer ce lead ?')) return;
    setDeleting(true);
    try {
      await apiFetch(`/deals/${deal.id}`, { method:'DELETE' });
      onDelete(deal.id);
      toast('Lead supprimé');
      onClose();
    } catch(e) { toast(e.message, 'error'); } finally { setDeleting(false); }
  };

  return (
    <div style={{ position:'fixed', inset:0, zIndex:9000, background:'rgba(0,0,0,.4)', display:'flex', alignItems:'flex-end', justifyContent:'center' }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:'white', borderRadius:'16px 16px 0 0', width:'100%', maxWidth:560, maxHeight:'92vh', overflowY:'auto', boxShadow:'0 -8px 40px rgba(0,0,0,.15)' }}>

        {/* Header */}
        <div style={{ padding:'20px 20px 0', position:'sticky', top:0, background:'white', zIndex:1 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              {(() => {
                const stage = PIPELINE_STAGES.find(s => s.key === form.status) || PIPELINE_STAGES[0];
                return <span style={{ background:stage.bg, color:stage.color, fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:20 }}>{stage.icon} {stage.label}</span>;
              })()}
            </div>
            <div style={{ display:'flex', gap:8 }}>
              {!isNew && <button onClick={del} disabled={deleting} style={{ background:'#fee2e2', border:'none', color:'#dc2626', borderRadius:8, padding:'6px 12px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>🗑 Supprimer</button>}
              <button onClick={onClose} style={{ background:'none', border:'none', color:'#94a3b8', cursor:'pointer', fontSize:22, lineHeight:1, padding:'2px 6px' }}>✕</button>
            </div>
          </div>
          {/* Nom prospect */}
          <input
            placeholder="Nom du prospect *"
            value={form.prospect_name}
            onChange={e=>setForm({...form,prospect_name:e.target.value})}
            style={{ width:'100%', fontSize:20, fontWeight:700, color:'#1e293b', border:'none', outline:'none', borderBottom:'2px solid #e2e8f0', paddingBottom:10, marginBottom:16, fontFamily:'inherit', boxSizing:'border-box', background:'transparent' }}
            onFocus={e=>e.target.style.borderBottomColor='#6366f1'}
            onBlur={e=>e.target.style.borderBottomColor='#e2e8f0'}
          />
        </div>

        <div style={{ padding:'0 20px 24px', display:'flex', flexDirection:'column', gap:20 }}>

          {/* Statut */}
          <div>
            <label style={{ display:'block', fontSize:11, fontWeight:600, color:'#64748b', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:8 }}>Statut</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {PIPELINE_STAGES.map(s => (
                <button key={s.key} onClick={()=>setForm({...form,status:s.key})}
                  style={{ padding:'6px 14px', borderRadius:20, border:`1.5px solid ${form.status===s.key?s.color:'#e2e8f0'}`, background:form.status===s.key?s.bg:'white', color:form.status===s.key?s.color:'#64748b', fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:'inherit', transition:'all .15s' }}>
                  {s.icon} {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Infos clés */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:600, color:'#64748b', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:6 }}>💶 CA (€)</label>
              <input type="number" placeholder="0" value={form.value} onChange={e=>setForm({...form,value:e.target.value})}
                style={{ width:'100%', borderRadius:8, border:'1px solid #e2e8f0', padding:'10px 12px', fontSize:14, fontFamily:'inherit', outline:'none', boxSizing:'border-box', color:'#1e293b' }}
                onFocus={e=>e.target.style.borderColor='#6366f1'} onBlur={e=>e.target.style.borderColor='#e2e8f0'}/>
            </div>
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:600, color:'#64748b', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:6 }}>📅 Relance</label>
              <input type="date" value={form.follow_up_date} onChange={e=>setForm({...form,follow_up_date:e.target.value})}
                style={{ width:'100%', borderRadius:8, border:'1px solid #e2e8f0', padding:'10px 12px', fontSize:14, fontFamily:'inherit', outline:'none', boxSizing:'border-box', color:'#1e293b' }}
                onFocus={e=>e.target.style.borderColor='#6366f1'} onBlur={e=>e.target.style.borderColor='#e2e8f0'}/>
            </div>
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:600, color:'#64748b', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:6 }}>📥 Source</label>
              <input placeholder="LinkedIn, Inbound..." value={form.source} onChange={e=>setForm({...form,source:e.target.value})}
                style={{ width:'100%', borderRadius:8, border:'1px solid #e2e8f0', padding:'10px 12px', fontSize:14, fontFamily:'inherit', outline:'none', boxSizing:'border-box', color:'#1e293b' }}
                onFocus={e=>e.target.style.borderColor='#6366f1'} onBlur={e=>e.target.style.borderColor='#e2e8f0'}/>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={{ display:'block', fontSize:11, fontWeight:600, color:'#64748b', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:6 }}>📝 Notes</label>
            <textarea placeholder="Notes libres sur ce lead..." value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} rows={3}
              style={{ width:'100%', borderRadius:8, border:'1px solid #e2e8f0', padding:'10px 12px', fontSize:14, fontFamily:'inherit', outline:'none', resize:'vertical', boxSizing:'border-box', color:'#1e293b' }}
              onFocus={e=>e.target.style.borderColor='#6366f1'} onBlur={e=>e.target.style.borderColor='#e2e8f0'}/>
          </div>

          {/* Debrief lié */}
          <div>
            <label style={{ display:'block', fontSize:11, fontWeight:600, color:'#64748b', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:8 }}>📞 Debrief lié</label>
            <select value={form.debrief_id} onChange={e=>setForm({...form,debrief_id:e.target.value})}
              style={{ width:'100%', borderRadius:8, border:'1px solid #e2e8f0', padding:'10px 12px', fontSize:14, fontFamily:'inherit', outline:'none', color:'#1e293b', background:'white', boxSizing:'border-box' }}>
              <option value="">— Aucun debrief lié</option>
              {debriefs.map(d => (
                <option key={d.id} value={d.id}>{d.prospect_name} — {fmtDate(d.call_date)} ({d.percentage}%)</option>
              ))}
            </select>

            {/* Aperçu du debrief lié */}
            {linkedDebrief && (
              <div style={{ marginTop:12, padding:'14px 16px', background:'#f5f3ff', borderRadius:10, border:'1px solid #c4b5fd' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                  <div>
                    <p style={{ fontWeight:700, fontSize:14, color:'#1e293b', margin:0 }}>{linkedDebrief.prospect_name}</p>
                    <p style={{ fontSize:12, color:'#64748b', margin:'2px 0 0' }}>📅 {fmtDate(linkedDebrief.call_date)} · 👤 {linkedDebrief.closer_name}</p>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
                    <ScoreBadge pct={Math.round(linkedDebrief.percentage||0)}/>
                    <ClosedBadge isClosed={linkedDebrief.is_closed}/>
                  </div>
                </div>
                {/* Mini barres sections */}
                {(() => {
                  const scores = computeSectionScores(linkedDebrief.sections || {});
                  const LABELS = {decouverte:'Déc.',reformulation:'Ref.',projection:'Proj.',presentation_offre:'Offre',closing:'Closing'};
                  const col = v => v>=4?'#059669':v>=3?'#d97706':v>=2?'#6366f1':'#ef4444';
                  return (
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                      {SECTIONS.map(({key}) => (
                        <div key={key} style={{ flex:1, minWidth:50 }}>
                          <p style={{ fontSize:10, color:'#64748b', margin:'0 0 3px', textAlign:'center' }}>{LABELS[key]}</p>
                          <div style={{ height:5, background:'#e2e8f0', borderRadius:3, overflow:'hidden' }}>
                            <div style={{ height:'100%', width:`${(scores[key]/5)*100}%`, background:col(scores[key]), borderRadius:3 }}/>
                          </div>
                          <p style={{ fontSize:10, color:col(scores[key]), fontWeight:700, margin:'2px 0 0', textAlign:'center' }}>{scores[key]}/5</p>
                        </div>
                      ))}
                    </div>
                  );
                })()}
                {linkedDebrief.notes && <p style={{ fontSize:12, color:'#64748b', margin:'10px 0 0', fontStyle:'italic' }}>"{linkedDebrief.notes}"</p>}
              </div>
            )}
          </div>

          {/* Bouton save */}
          <button onClick={save} disabled={saving||!form.prospect_name.trim()}
            style={{ width:'100%', padding:'14px', borderRadius:12, background:'#6366f1', color:'white', border:'none', fontSize:15, fontWeight:700, cursor:saving||!form.prospect_name.trim()?'not-allowed':'pointer', opacity:saving||!form.prospect_name.trim()?.55:1, fontFamily:'inherit', transition:'opacity .15s' }}>
            {saving ? 'Enregistrement...' : isNew ? 'Créer le lead' : 'Enregistrer les modifications'}
          </button>

        </div>
      </div>
    </div>
  );
}

function DealCard({ deal, onOpen, onMove, stages }) {
  const [showMenu, setShowMenu] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setShowMenu(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const isOverdue = deal.follow_up_date && new Date(deal.follow_up_date) < new Date() && !['signe','perdu'].includes(deal.status);

  return (
    <div onClick={()=>onOpen(deal)}
      style={{ background:'white', border:`1px solid ${isOverdue?'#fca5a5':'#e2e8f0'}`, borderRadius:10, padding:'12px 14px', cursor:'pointer', position:'relative', boxShadow:'0 1px 3px rgba(0,0,0,.05)', transition:'box-shadow .15s' }}
      onMouseEnter={e=>e.currentTarget.style.boxShadow='0 4px 12px rgba(99,102,241,.12)'}
      onMouseLeave={e=>e.currentTarget.style.boxShadow='0 1px 3px rgba(0,0,0,.05)'}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
        <p style={{ fontWeight:600, fontSize:13, color:'#1e293b', margin:0, flex:1, marginRight:8 }}>{deal.prospect_name}</p>
        <div ref={ref} style={{ position:'relative' }}>
          <button onClick={e=>{e.stopPropagation();setShowMenu(v=>!v);}}
            style={{ background:'none', border:'none', color:'#94a3b8', cursor:'pointer', fontSize:16, padding:'0 2px', lineHeight:1 }}>⋮</button>
          {showMenu && (
            <div style={{ position:'absolute', right:0, top:'100%', background:'white', border:'1px solid #e2e8f0', borderRadius:10, boxShadow:'0 4px 16px rgba(0,0,0,.1)', minWidth:160, zIndex:50, overflow:'hidden' }}>
              {stages.filter(s=>s.key!==deal.status).map(s => (
                <button key={s.key} onClick={e=>{e.stopPropagation();onMove(deal.id,s.key);setShowMenu(false);}}
                  style={{ width:'100%', display:'flex', alignItems:'center', gap:8, padding:'9px 14px', background:'none', border:'none', fontSize:12, cursor:'pointer', fontFamily:'inherit', color:'#374151', textAlign:'left' }}
                  onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
                  onMouseLeave={e=>e.currentTarget.style.background='none'}>
                  {s.icon} → {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:5, alignItems:'center' }}>
        {deal.value > 0 && <span style={{ fontSize:11, fontWeight:700, color:'#059669', background:'#d1fae5', padding:'2px 7px', borderRadius:6 }}>{deal.value.toLocaleString('fr-FR')} €</span>}
        {deal.source && <span style={{ fontSize:11, color:'#64748b', background:'#f1f5f9', padding:'2px 7px', borderRadius:6 }}>{deal.source}</span>}
        {deal.follow_up_date && (
          <span style={{ fontSize:11, color:isOverdue?'#dc2626':'#94a3b8', background:isOverdue?'#fee2e2':'transparent', padding:'2px 4px', borderRadius:4, fontWeight:isOverdue?600:400 }}>
            {isOverdue?'⚠️ ':''}{deal.follow_up_date}
          </span>
        )}
        {deal.debrief_id && <span style={{ fontSize:11, color:'#6366f1', background:'#ede9fe', padding:'2px 7px', borderRadius:6 }}>📞 debrief</span>}
      </div>
      {deal.user_name && <p style={{ fontSize:11, color:'#94a3b8', margin:'6px 0 0' }}>👤 {deal.user_name}</p>}
    </div>
  );
}

function PipelinePage({ user, toast, debriefs }) {
  const [deals, setDeals]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [openLead, setOpenLead] = useState(null); // null | {} (new) | deal (edit)
  const [filter, setFilter]     = useState('all');
  const mob = useIsMobile();

  useEffect(() => {
    apiFetch('/deals').then(setDeals).catch(()=>{}).finally(()=>setLoading(false));
  }, []);

  const handleSave = (deal, isEdit) => {
    setDeals(prev => isEdit ? prev.map(d=>d.id===deal.id?deal:d) : [deal,...prev]);
  };
  const handleMove = async (id, status) => {
    try {
      const updated = await apiFetch(`/deals/${id}`, { method:'PATCH', body:{ status }});
      setDeals(prev => prev.map(d => d.id===id ? updated : d));
    } catch(e) { toast(e.message, 'error'); }
  };
  const handleDelete = (id) => {
    setDeals(prev => prev.filter(d => d.id!==id));
  };

  const isHOS = user.role === 'head_of_sales';
  const closers = [...new Map(deals.map(d=>[d.user_id,{id:d.user_id,name:d.user_name}])).values()];
  const displayDeals = filter==='all' ? deals : deals.filter(d=>d.user_id===filter);

  const totalValue   = deals.filter(d=>d.status==='signe').reduce((s,d)=>s+(d.value||0),0);
  const totalPipe    = deals.filter(d=>!['signe','perdu'].includes(d.status)).reduce((s,d)=>s+(d.value||0),0);
  const overdueCount = deals.filter(d=>d.follow_up_date&&new Date(d.follow_up_date)<new Date()&&!['signe','perdu'].includes(d.status)).length;
  const closed       = deals.filter(d=>['signe','perdu'].includes(d.status));
  const winRate      = closed.length > 0 ? Math.round((deals.filter(d=>d.status==='signe').length/closed.length)*100) : 0;

  if (loading) return <Spinner full/>;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700, color:'#1e293b', margin:0 }}>🎯 Pipeline</h1>
          <p style={{ color:'#64748b', fontSize:13, marginTop:4 }}>{deals.length} lead{deals.length!==1?'s':''}</p>
        </div>
        <Btn onClick={()=>setOpenLead({})}>+ Nouveau lead</Btn>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:mob?10:16 }}>
        {[
          { label:'CA Signé',   value:`${totalValue.toLocaleString('fr-FR')} €`, icon:'💶', bg:'#d1fae5', c:'#059669' },
          { label:'Pipeline',   value:`${totalPipe.toLocaleString('fr-FR')} €`,  icon:'🔮', bg:'#ede9fe', c:'#6366f1' },
          { label:'Taux win',   value:`${winRate}%`,                             icon:'🏆', bg:'#fef3c7', c:'#d97706' },
          { label:'En retard',  value:overdueCount,                              icon:'⚠️', bg:overdueCount>0?'#fee2e2':'#f1f5f9', c:overdueCount>0?'#dc2626':'#64748b' },
        ].map(({ label, value, icon, bg, c }) => (
          <Card key={label} style={{ padding:'12px 14px', display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:38, height:38, borderRadius:10, background:bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>{icon}</div>
            <div>
              <p style={{ fontSize:10, color:'#64748b', margin:0, fontWeight:500, textTransform:'uppercase', letterSpacing:'.04em' }}>{label}</p>
              <p style={{ fontSize:20, fontWeight:700, color:c, margin:0 }}>{value}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Filtre closer (HOS) */}
      {isHOS && closers.length > 1 && (
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          <button onClick={()=>setFilter('all')} style={{ padding:'6px 14px', borderRadius:20, border:`1.5px solid ${filter==='all'?'#6366f1':'#e2e8f0'}`, background:filter==='all'?'#ede9fe':'white', color:filter==='all'?'#4c1d95':'#64748b', fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>Tous</button>
          {closers.map(c => (
            <button key={c.id} onClick={()=>setFilter(c.id)} style={{ padding:'6px 14px', borderRadius:20, border:`1.5px solid ${filter===c.id?'#6366f1':'#e2e8f0'}`, background:filter===c.id?'#ede9fe':'white', color:filter===c.id?'#4c1d95':'#64748b', fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>👤 {c.name}</button>
          ))}
        </div>
      )}

      {/* Kanban */}
      {deals.length === 0 ? (
        <Empty icon="🎯" title="Pipeline vide" subtitle="Créez votre premier lead ou soumettez un debrief" action={<Btn onClick={()=>setOpenLead({})}>+ Créer un lead</Btn>}/>
      ) : (
        <div style={{ overflowX:'auto', WebkitOverflowScrolling:'touch', paddingBottom:8 }}>
          <div style={{ display:'flex', gap:12, minWidth:mob?`${PIPELINE_STAGES.length*220}px`:'auto' }}>
            {PIPELINE_STAGES.map(stage => {
              const stageDeals = displayDeals.filter(d => d.status===stage.key);
              const stageValue = stageDeals.reduce((s,d)=>s+(d.value||0),0);
              return (
                <div key={stage.key} style={{ flex:1, minWidth:mob?210:0, display:'flex', flexDirection:'column', gap:8 }}>
                  <div style={{ padding:'8px 12px', background:stage.bg, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <span style={{ fontSize:13 }}>{stage.icon}</span>
                      <span style={{ fontSize:12, fontWeight:700, color:stage.color }}>{stage.label}</span>
                      <span style={{ background:'white', color:stage.color, fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:10 }}>{stageDeals.length}</span>
                    </div>
                    {stageValue > 0 && <span style={{ fontSize:10, fontWeight:600, color:stage.color }}>{stageValue.toLocaleString('fr-FR')} €</span>}
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:7, minHeight:50 }}>
                    {stageDeals.map(deal => (
                      <DealCard key={deal.id} deal={deal} onOpen={setOpenLead} onMove={handleMove} stages={PIPELINE_STAGES}/>
                    ))}
                    {stageDeals.length === 0 && (
                      <div style={{ border:'2px dashed #e2e8f0', borderRadius:10, padding:'16px 10px', textAlign:'center', color:'#cbd5e1', fontSize:11 }}>Vide</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Fiche lead */}
      {openLead !== null && (
        <LeadSheet
          deal={openLead?.id ? openLead : null}
          debriefs={debriefs || []}
          onClose={()=>setOpenLead(null)}
          onSave={handleSave}
          onDelete={handleDelete}
          toast={toast}
        />
      )}
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const { list: toasts, toast } = useToast();

  const [authView, setAuthView] = useState('login');
  const [user,    setUser]    = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [page,    setPage]    = useState('Dashboard');
  const [selId,   setSelId]   = useState(null);
  const [from,    setFrom]    = useState(null);
  const [debriefs, setDebriefs] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [gam,     setGam]     = useState(null);
  const [resetToken, setResetToken] = useState(null);
  const [burst,   setBurst]   = useState(null);
  const [lbKey,   setLbKey]   = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const mob = useIsMobile();

  // Detect reset token in URL
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const rt = p.get('reset_token');
    if (rt) { setResetToken(rt); window.history.replaceState({}, '', window.location.pathname); }
  }, []);

  // Session expiry
  useEffect(() => {
    _onExpired = () => { setUser(null); setDebriefs([]); setGam(null); setPage('Dashboard'); setAuthView('login'); toast('Session expirée, veuillez vous reconnecter', 'error'); };
    return () => { _onExpired = null; };
  }, [toast]);

  // Restore session
  useEffect(() => {
    const t = getToken();
    if (!t) { setAuthLoading(false); return; }
    apiFetch('/auth/me').then(setUser).catch(() => clearToken()).finally(() => setAuthLoading(false));
  }, []);

  // Load data
  useEffect(() => {
    if (!user) return;
    setDataLoading(true);
    Promise.all([apiFetch('/debriefs'), apiFetch('/gamification/me')])
      .then(([d, g]) => { setDebriefs(d); setGam(g); })
      .catch(err => toast(err.message, 'error'))
      .finally(() => setDataLoading(false));
  }, [user]);

  const navigate = (p, id=null, from=null) => {
    setPage(p); setSelId(id);
    if (from) setFrom(from);
    else if (p !== 'Detail') setFrom(null);
    window.scrollTo({ top:0, behavior:'smooth' });
  };

  const onLogin = (u, g) => { setUser(u); if (g) setGam(g); setPage('Dashboard'); toast(`Bienvenue, ${u.name} !`); };
  const onLogout = () => { clearToken(); setUser(null); setDebriefs([]); setGam(null); setPage('Dashboard'); setAuthView('login'); toast('Déconnecté'); };

  const onSave = (debrief, g) => {
    setDebriefs(p => [debrief, ...p]);
    if (g) { setGam(g); setLbKey(k=>k+1); if (g.pointsEarned>0) setBurst({ points:g.pointsEarned, levelUp:g.levelUp, newLevel:g.level.name }); }
  };

  const onDelete = async id => {
    if (!confirm('Supprimer ce debrief ?')) return;
    try {
      const r = await apiFetch(`/debriefs/${id}`,{ method:'DELETE' });
      setDebriefs(p => p.filter(d => d.id!==id));
      if (r.gamification) setGam(r.gamification);
      setLbKey(k=>k+1);
      toast('Debrief supprimé');
      navigate(from || 'Dashboard');
    } catch(e) { toast(e.message, 'error'); }
  };

  const selDebrief = debriefs.find(d => d.id===selId);
  const isHOS = user?.role === 'head_of_sales';
  const navItems = [
    { key:'Dashboard', label:'Dashboard', icon:'⊞' },
    { key:'NewDebrief', label:'Nouveau',  icon:'+' },
    { key:'History',    label:'Historique', icon:'🕐' },
    { key:'Pipeline', label:'Pipeline', icon:'🎯' },
    ...(isHOS ? [{ key:'HOSPage', label:'HOS', icon:'👑' }] : []),
  ];

  // ─── Auth gates ────────────────────────────────────────────────────────────
  if (authLoading) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}><Spinner/></div>;
  if (resetToken)  return <ResetPage token={resetToken} onDone={()=>{ setResetToken(null); setAuthView('login'); toast('Mot de passe modifié !'); }}/>;
  if (!user) {
    if (authView==='register') return <RegisterPage onLogin={onLogin} goLogin={()=>setAuthView('login')}/>;
    if (authView==='forgot')   return <ForgotPage   goLogin={()=>setAuthView('login')}/>;
    return <LoginPage onLogin={onLogin} goRegister={()=>setAuthView('register')} goForgot={()=>setAuthView('forgot')}/>;
  }

  // ─── Main app ──────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:'100vh', background:'#f8fafc', fontFamily:"'Inter',system-ui,sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} *{box-sizing:border-box} input,select,textarea,button{-webkit-appearance:none;touch-action:manipulation}`}</style>

      {burst && <Burst points={burst.points} levelUp={burst.levelUp} newLevel={burst.newLevel} onDone={()=>setBurst(null)}/>}
      <Toasts list={toasts}/>
      {showSettings && <AccountSettings user={user} onClose={()=>setShowSettings(false)} toast={toast}/>}

      {/* Header */}
      <header style={{ position:'sticky', top:0, zIndex:50, background:'rgba(255,255,255,.96)', backdropFilter:'blur(16px)', borderBottom:'1px solid #e2e8f0' }}>
        <div style={{ maxWidth:1100, margin:'0 auto', padding:`0 ${mob?12:24}px`, display:'flex', alignItems:'center', justifyContent:'space-between', height:56 }}>
          {/* Logo */}
          <button onClick={()=>navigate('Dashboard')} style={{ display:'flex', alignItems:'center', gap:8, background:'none', border:'none', cursor:'pointer', padding:0, fontFamily:'inherit', flexShrink:0 }}>
            <div style={{ width:32, height:32, borderRadius:9, background:'#6366f1', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15 }}>📞</div>
            {!mob && <span style={{ fontSize:15, fontWeight:700, color:'#1e293b', letterSpacing:'-.02em' }}>CloserDebrief</span>}
          </button>

          {/* Nav */}
          <nav style={{ display:'flex', alignItems:'center', gap:2 }}>
            {navItems.map(({ key, label, icon }) => (
              <button key={key} onClick={()=>navigate(key)} style={{ display:'flex', alignItems:'center', gap:mob?0:6, padding:mob?'8px 10px':'7px 12px', borderRadius:8, border:'none', fontSize:13, fontWeight:500, cursor:'pointer', transition:'all .15s', background:page===key?'#6366f1':'transparent', color:page===key?'white':'#64748b', boxShadow:page===key?'0 2px 8px rgba(99,102,241,.25)':'none', fontFamily:'inherit' }}>
                <span style={{ fontSize:mob?18:14 }}>{icon}</span>
                {!mob && <span>{label}</span>}
              </button>
            ))}
          </nav>

          {/* User menu */}
          <UserMenu user={user} gam={gam} onLogout={onLogout} onSettings={()=>setShowSettings(true)} toast={toast}/>
        </div>
      </header>

      {/* Main content */}
      <main style={{ maxWidth:1100, margin:'0 auto', padding:mob?'16px 12px':'32px 24px' }}>
        {dataLoading ? <Spinner full/> : (
          <>
            {page==='Dashboard' && <Dashboard debriefs={debriefs} navigate={navigate} user={user} gam={gam} lbKey={lbKey} toast={toast}/>}
            {page==='NewDebrief' && <NewDebrief navigate={navigate} onSave={onSave} toast={toast}/>}
            {page==='History'   && <History debriefs={debriefs} navigate={navigate} user={user}/>}
            {page==='Detail'    && <Detail debrief={selDebrief} navigate={navigate} onDelete={onDelete} fromPage={from} user={user} toast={toast}/>}
            {page==='Pipeline'  && <PipelinePage user={user} toast={toast} debriefs={debriefs}/>}
            {page==='HOSPage' && isHOS && <HOSPage toast={toast} leaderboardKey={lbKey} allDebriefs={debriefs}/>}
          </>
        )}
      </main>

      {/* Bottom nav — mobile */}
      {mob && (
        <nav style={{ position:'fixed', bottom:0, left:0, right:0, background:'rgba(255,255,255,.97)', backdropFilter:'blur(16px)', borderTop:'1px solid #e2e8f0', display:'flex', alignItems:'center', justifyContent:'space-around', padding:'8px 0 max(8px,env(safe-area-inset-bottom))', zIndex:40 }}>
          {navItems.map(({ key, label, icon }) => (
            <button key={key} onClick={()=>navigate(key)} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, background:'none', border:'none', cursor:'pointer', padding:'4px 16px', fontFamily:'inherit', color:page===key?'#6366f1':'#94a3b8', transition:'color .15s' }}>
              <span style={{ fontSize:20 }}>{icon}</span>
              <span style={{ fontSize:10, fontWeight:500 }}>{label}</span>
            </button>
          ))}
        </nav>
      )}
      {mob && <div style={{ height:70 }}/>}
    </div>
  );
}
