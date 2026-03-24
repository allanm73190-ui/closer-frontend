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

function useBreakpoint() {
  const [bp, setBp] = useState(() => {
    const w = window.innerWidth;
    return w < 768 ? 'mobile' : w < 1200 ? 'tablet' : 'desktop';
  });
  useEffect(() => {
    const h = () => {
      const w = window.innerWidth;
      setBp(w < 768 ? 'mobile' : w < 1200 ? 'tablet' : 'desktop');
    };
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return bp;
}



const P  = '#e87d6a';   // primaire corail
const P2 = '#d4604e';   // primaire foncé
const A  = '#6aacce';   // accent bleu ciel
const BG = 'linear-gradient(160deg,#f5ede6 0%,#e8f0f5 100%)';
const WHITE = '#ffffff';
const TXT  = '#5a4a3a';  // texte principal
const TXT2 = '#b09080';  // texte secondaire
const TXT3 = '#c8b8a8';  // texte muted
const SAND = '#f5ede6';  // fond inputs

// Ombres neumorphiques
const SH_CARD = '5px 5px 15px rgba(174,130,100,.18), -3px -3px 10px rgba(255,255,255,.9)';
const SH_SM   = '3px 3px 8px rgba(174,130,100,.15), -2px -2px 6px rgba(255,255,255,.85)';
const SH_BTN  = '0 6px 18px rgba(232,125,106,.35), inset 0 1px 0 rgba(255,255,255,.25)';
const SH_IN   = 'inset 2px 2px 5px rgba(174,130,100,.15), inset -1px -1px 4px rgba(255,255,255,.9)';
const SH_HOVERED = '6px 6px 20px rgba(174,130,100,.22), -3px -3px 10px rgba(255,255,255,.9)';

// Radius
const R_SM = 10; const R_MD = 14; const R_LG = 18; const R_XL = 24; const R_FULL = 50;

const DS = {
  bgApp: BG, bgCard: WHITE, bgInput: SAND,
  primary: P, primary2: P2, accent: A,
  textPrimary: TXT, textSecondary: TXT2, textMuted: TXT3,
  success:'#5a9858', successBg:'rgba(218,240,216,.8)', successBorder:'rgba(90,152,88,.3)',
  warning:'#c07830', warningBg:'rgba(254,243,224,.8)', warningBorder:'rgba(192,120,48,.3)',
  danger:'#c05040',  dangerBg:'rgba(253,232,228,.8)',  dangerBorder:'rgba(192,80,64,.3)',
  info:'#3a7a9a',    infoBg:'rgba(218,237,245,.8)',    infoBorder:'rgba(58,122,154,.3)',
  shadowCard: SH_CARD, shadowCardHov: SH_HOVERED, shadowSm: SH_SM,
  shadowBtn: SH_BTN, shadowInset: SH_IN,
  radiusSm:R_SM, radiusMd:R_MD, radiusLg:R_LG, radiusXl:R_XL, radiusFull:R_FULL,
  border: 'none',
  bgNavItem: `linear-gradient(135deg,${P},${P2})`,
};

// ─── HELPERS STYLE ────────────────────────────────────────────────────────────
const card = (extra={}) => ({ background:'#ffffff', borderRadius:R_LG, boxShadow:SH_CARD, ...extra });
const cardSm = (extra={}) => ({ background:'#ffffff', borderRadius:R_MD, boxShadow:SH_SM, ...extra });
const inp = (extra={}) => ({ width:'100%', background:'#f5ede6', border:'1px solid rgba(232,125,106,.15)',
  borderRadius:R_MD, padding:'11px 14px', fontSize:14, fontFamily:'inherit',
  outline:'none', boxSizing:'border-box', color:'#5a4a3a', boxShadow:SH_IN, ...extra
});


// ─── CONFIG DEBRIEF PAR DÉFAUT ───────────────────────────────────────────────
const DEFAULT_DEBRIEF_CONFIG = [
  {
    key: 'decouverte',
    title: 'Phase de découverte',
    questions: [
      { id:'douleur_surface',   label:'Douleur de surface identifiée ?',          type:'radio',    options:[{value:'oui',label:'Oui'},{value:'non',label:'Non'}], hasNote:true },
      { id:'douleur_profonde',  label:'Douleur profonde / identitaire atteinte ?', type:'radio',    options:[{value:'oui',label:'✅ Oui — verbalisé fort'},{value:'partiel',label:'⚠️ Partiellement'},{value:'non',label:'❌ Non'}], hasNote:true },
      { id:'couches_douleur',   label:'Couches de douleur creusées',               type:'checkbox', options:[{value:'couche1',label:'Couche 1 : physique / performance'},{value:'couche2',label:'Couche 2 : impact quotidien / social'},{value:'couche3',label:'Couche 3 : identité / peur du futur'}] },
      { id:'temporalite',       label:'Temporalité demandée ?',                    type:'radio',    options:[{value:'oui',label:'✅ Oui'},{value:'non',label:'❌ Non'}] },
      { id:'urgence',           label:'Urgence naturelle identifiée ?',            type:'radio',    options:[{value:'oui',label:'✅ Oui'},{value:'artificielle',label:'⚠️ Artificielle'},{value:'aucune',label:'❌ Aucune'}], hasNote:true },
    ]
  },
  {
    key: 'reformulation',
    title: 'Reformulation',
    questions: [
      { id:'reformulation',     label:'Reformulation faite ?',         type:'radio',    options:[{value:'oui',label:'✅ Complète et précise'},{value:'partiel',label:'⚠️ Partielle'},{value:'non',label:'❌ Non'}] },
      { id:'prospect_reconnu',  label:"Le prospect s'est reconnu ?",   type:'radio',    options:[{value:'oui',label:"✅ Oui — c'est exactement ça"},{value:'moyen',label:'⚠️ Moyen'},{value:'non',label:'❌ Non'}] },
      { id:'couches_reformulation', label:'Les 3 couches présentes ?', type:'checkbox', options:[{value:'physique',label:'Douleur physique / performance'},{value:'quotidien',label:'Impact quotidien'},{value:'identitaire',label:'Dimension identitaire'}] },
    ]
  },
  {
    key: 'projection',
    title: 'Projection',
    questions: [
      { id:'projection_posee',  label:'Question de projection posée ?', type:'radio', options:[{value:'oui',label:'✅ Oui'},{value:'non',label:'❌ Non'}] },
      { id:'qualite_reponse',   label:'Qualité de la réponse',          type:'radio', options:[{value:'forte',label:'✅ Forte — émotionnelle, identitaire'},{value:'moyenne',label:'⚠️ Moyenne'},{value:'faible',label:'❌ Faible'}] },
      { id:'deadline_levier',   label:'Deadline utilisée comme levier ?', type:'radio', options:[{value:'oui',label:'✅ Oui'},{value:'non_exploitee',label:'⚠️ Non exploitée'},{value:'pas_de_deadline',label:'❌ Pas de deadline'}] },
    ]
  },
  {
    key: 'presentation_offre',
    title: "Présentation de l'offre",
    questions: [
      { id:'colle_douleurs',        label:'Présentation collée aux douleurs ?', type:'radio', options:[{value:'oui',label:'✅ Oui'},{value:'partiel',label:'⚠️ Partiellement'},{value:'non',label:'❌ Non — générique'}] },
      { id:'exemples_transformation', label:'Exemples bien choisis ?',         type:'radio', options:[{value:'oui',label:"✅ Oui — le prospect s'est reconnu"},{value:'moyen',label:'⚠️ Moyen'},{value:'non',label:'❌ Non'}] },
      { id:'duree_justifiee',       label:'Durée / Offre justifiée ?',         type:'radio', options:[{value:'oui',label:'✅ Oui'},{value:'partiel',label:'⚠️ Partiellement'},{value:'non',label:'❌ Non'}] },
    ]
  },
  {
    key: 'closing',
    title: 'Closing & Objections',
    questions: [
      { id:'annonce_prix',     label:'Annonce du prix',                     type:'radio',    options:[{value:'directe',label:'✅ Directe et assumée'},{value:'hesitante',label:'⚠️ Hésitante'},{value:'trop_rapide',label:'❌ Trop rapide'}] },
      { id:'silence_prix',     label:'Silence après le prix ?',             type:'radio',    options:[{value:'oui',label:'✅ Oui — laissé respirer'},{value:'non',label:'❌ Non — rempli trop vite'}] },
      { id:'objections',       label:'Objection rencontrée',                type:'checkbox', options:[{value:'budget',label:'Budget'},{value:'reflechir',label:"J'ai besoin de réfléchir"},{value:'conjoint',label:'Conjoint / autre personne'},{value:'methode',label:'Pas convaincu de la méthode'},{value:'aucune',label:"Pas d'objection"}] },
      { id:'douleur_reancree', label:"Douleur réancrée avant l'objection ?", type:'radio',   options:[{value:'oui',label:'✅ Oui'},{value:'non',label:'❌ Non'}] },
      { id:'objection_isolee', label:'Objection bien isolée ?',             type:'radio',    options:[{value:'oui',label:'✅ Oui'},{value:'non',label:'❌ Non'}] },
      { id:'resultat_closing', label:'Résultat du closing',                 type:'radio',    options:[{value:'close',label:'✅ Closé en direct'},{value:'retrograde',label:'⚠️ Rétrogradé'},{value:'relance',label:'📅 Relance planifiée'},{value:'porte_ouverte',label:'🔓 Porte ouverte'},{value:'perdu',label:'❌ Perdu'}] },
    ]
  },
];

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
  const bg = { success:'rgba(232,125,106,.92)', error:'rgba(220,38,38,.92)', info:'rgba(8,145,178,.92)' };
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
      <div style={{ background:'linear-gradient(135deg,#e87d6a,#d4604e)', borderRadius:20, padding:'24px 36px', color:'white', textAlign:'center', animation:'burstIn .4s cubic-bezier(.34,1.56,.64,1)', boxShadow:'0 8px 40px rgba(232,125,106,.4)' }}>
        <p style={{ fontSize:32, fontWeight:800, margin:0 }}>+{points} pts !</p>
        {levelUp && <p style={{ fontSize:15, fontWeight:600, margin:'8px 0 0', opacity:.9 }}>🎉 Niveau : {newLevel}</p>}
      </div>
      <style>{`@keyframes burstIn{from{transform:scale(.3);opacity:0}to{transform:none;opacity:1}}`}</style>
    </div>
  );
}

// ─── UI PRIMITIVES ────────────────────────────────────────────────────────────

function Input({ placeholder, value, onChange, type='text', required, autoFocus, style={} }) {
  const [focus, setFocus] = React.useState(false);
  return (
    <input type={type} placeholder={placeholder} value={value} onChange={onChange}
      required={required} autoFocus={autoFocus}
      style={{ ...inp(), borderColor: focus?P:'rgba(232,125,106,.15)',
        boxShadow: focus ? SH_IN+', 0 0 0 3px rgba(232,125,106,.1)' : SH_IN, ...style }}
      onFocus={()=>setFocus(true)} onBlur={()=>setFocus(false)}
    />
  );
}

function Textarea({ placeholder, value, onChange, rows=3 }) {
  return (
    <textarea placeholder={placeholder} value={value} onChange={onChange} rows={rows}
      style={{ ...inp(), resize:'vertical' }}
    />
  );
}

const BTN = {
  primary:   { background:`linear-gradient(135deg,${P},${P2})`, color:'white', border:'none', boxShadow:SH_BTN },
  secondary: { background:WHITE, color:'#5a4a3a', border:'none', boxShadow:SH_SM },
  danger:    { background:'rgba(253,232,228,.8)', color:'#c05040', border:'1px solid rgba(192,80,64,.3)', boxShadow:'none' },
  ghost:     { background:'transparent', color:'#b09080', border:'none', boxShadow:'none' },
  green:     { background:'rgba(218,240,216,.8)', color:'#5a9858', border:'1px solid rgba(90,152,88,.3)', boxShadow:'none' },
};
function Btn({ children, onClick, type='button', variant='primary', disabled, style={} }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{
      display:'inline-flex', alignItems:'center', justifyContent:'center',
      gap:8, padding:'10px 20px', borderRadius:R_FULL, fontSize:14, fontWeight:600,
      cursor:disabled?'not-allowed':'pointer', transition:'all .15s',
      opacity:disabled?.55:1, fontFamily:'inherit', ...BTN[variant], ...style
    }}>{children}</button>
  );
}

function AlertBox({ type, message }) {
  if (!message) return null;
  const s = { error:{bg:'rgba(253,232,228,.8)',b:'rgba(192,80,64,.3)',c:'#c05040'}, success:{bg:'rgba(218,240,216,.8)',b:'rgba(90,152,88,.3)',c:'#5a9858'}, info:{bg:'rgba(218,237,245,.8)',b:'rgba(58,122,154,.3)',c:'#3a7a9a'} }[type||'info'];
  return <div style={{ background:s.bg, border:`1px solid ${s.b}`, color:s.c, padding:'12px 14px', borderRadius:R_SM, fontSize:14, marginBottom:16 }}>{message}</div>;
}

function Spinner({ full=false, size=32 }) {
  const el = <><div style={{ width:size, height:size, border:`${size>20?4:3}px solid rgba(232,125,106,.15)`, borderTopColor:P, borderRadius:'50%', animation:'spin .75s linear infinite' }}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></>;
  return full ? <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'50vh' }}>{el}</div> : el;
}

function Empty({ icon, title, subtitle, action }) {
  return (
    <div style={{ ...card(), padding:'40px 24px', textAlign:'center' }}>
      <div style={{ fontSize:40, marginBottom:12 }}>{icon}</div>
      <p style={{ fontWeight:700, fontSize:16, color:'#5a4a3a', margin:'0 0 6px' }}>{title}</p>
      <p style={{ color:'#c8b8a8', fontSize:14, margin:`0 0 ${action?'20px':'0'}` }}>{subtitle}</p>
      {action}
    </div>
  );
}

function Card({ children, style={} }) {
  return <div style={{ ...card(), ...style }}>{children}</div>;
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:9000, background:'rgba(90,74,58,.2)', display:'flex', alignItems:'flex-end', justifyContent:'center' }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:WHITE, borderRadius:'24px 24px 0 0', padding:24, width:'100%', maxWidth:500, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 -8px 32px rgba(174,130,100,.2)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <h2 style={{ fontSize:17, fontWeight:700, color:'#5a4a3a', margin:0 }}>{title}</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#c8b8a8', cursor:'pointer', fontSize:22, lineHeight:1, padding:'2px 6px' }}>✕</button>
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
  const color = percentage>=80?'#059669':percentage>=60?'#d97706':percentage>=40?'#e87d6a':'#ef4444';
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
  const s = pct>=80?{bg:'rgba(209,250,229,.85)',c:'#065f46',b:'rgba(110,231,183,.6)'}:pct>=60?{bg:'rgba(254,243,199,.85)',c:'#92400e',b:'rgba(252,211,77,.6)'}:pct>=40?{bg:'rgba(218,237,245,.8)',c:'#3a7a9a',b:'rgba(58,122,154,.3)'}:{bg:'rgba(254,226,226,.85)',c:'#991b1b',b:'rgba(252,165,165,.6)'};
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

function Radar({ scores, color='#e87d6a', size=220 }) {
  if (!scores) return null;
  const n=SECTIONS.length, cx=size/2, cy=size/2, R=size*0.36;
  const angle = i => (i/n)*2*Math.PI - Math.PI/2;
  const pts = SECTIONS.map((s,i) => {
    const v = (scores[s.key]||0) / 5;
    const a = angle(i);
    return [cx + R*v*Math.cos(a), cy + R*v*Math.sin(a)];
  });
  const fill = color==='#e87d6a'?'rgba(232,125,106,.15)':color==='#059669'?'rgba(5,150,105,.15)':'rgba(217,119,6,.15)';
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
  const col = v => v>=4?'#059669':v>=3?'#d97706':v>=2?'#e87d6a':'#ef4444';
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      {SECTIONS.map(({ key }) => {
        const val  = scores?.[key] || 0;
        const glob = globalScores?.[key] || 0;
        const diff = globalScores ? Math.round((val - glob) * 10) / 10 : null;
        return (
          <div key={key}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:5 }}>
              <span style={{ fontSize:13, fontWeight:600, color:'#5a4a3a' }}>{LABELS[key]}</span>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                {globalScores && <span style={{ fontSize:11, color:'#c8b8a8' }}>{glob}/5 global</span>}
                <span style={{ fontSize:13, fontWeight:700, padding:'2px 8px', borderRadius:6, border:'1px solid rgba(232,125,106,.12)', color:col(val) }}>{val}/5</span>
                {diff !== null && diff !== 0 && <span style={{ fontSize:11, fontWeight:600, color:diff>0?'#059669':'#ef4444' }}>{diff>0?'+':''}{diff}</span>}
              </div>
            </div>
            <div style={{ position:'relative', height:10, background:'rgba(253,232,228,.2)', borderRadius:5, overflow:'visible' }}>
              <div style={{ height:'100%', width:`${(val/5)*100}%`, background:col(val), borderRadius:5, transition:'width .7s ease' }}/>
              {globalScores && glob > 0 && <div style={{ position:'absolute', top:-2, left:`${(glob/5)*100}%`, width:2, height:14, background:'#94a3b8', borderRadius:2 }} title={`Global: ${glob}/5`}/>}
            </div>
          </div>
        );
      })}
      {globalScores && <p style={{ fontSize:11, color:'#c8b8a8', margin:0 }}>— trait gris = moyenne globale</p>}
    </div>
  );
}

// ─── GAMIFICATION CARD ────────────────────────────────────────────────────────
function GamCard({ gam }) {
  if (!gam) return null;
  const { points, level, badges } = gam;
  const pct = level.next ? Math.min(Math.round((points - level.min) / (level.next - level.min) * 100), 100) : 100;
  return (
    <div style={{ background:`linear-gradient(135deg,${P},${P2})`, borderRadius:R_LG, padding:'16px 20px', color:'white' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <div>
          <p style={{ fontSize:10, opacity:.75, margin:0, textTransform:'uppercase', letterSpacing:'.06em' }}>Niveau</p>
          <h2 style={{ fontSize:17, fontWeight:700, margin:'3px 0 0' }}>{level.icon} {level.name}</h2>
        </div>
        <div style={{ textAlign:'right' }}>
          <p style={{ fontSize:10, opacity:.75, margin:0 }}>Points</p>
          <p style={{ fontSize:22, fontWeight:700, margin:0 }}>{points}</p>
        </div>
      </div>
      {level.next && (
        <div style={{ marginBottom: badges.length > 0 ? 10 : 0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, opacity:.75, marginBottom:4 }}>
            <span>{points} pts</span>
            <span>{level.next - points} pts avant {computeLevel(level.next).name}</span>
          </div>
          <div style={{ height:6, background:'rgba(255,255,255,.2)', borderRadius:3 }}>
            <div style={{ height:'100%', width:`${pct}%`, background:'rgba(255,255,255,.9)', borderRadius:3, transition:'width .7s' }}/>
          </div>
        </div>
      )}
      {badges.length > 0 && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
          {badges.map(b => (
            <span key={b.id} style={{ background:'rgba(255,255,255,.2)', padding:'3px 10px', borderRadius:20, fontSize:11 }}>{b.icon} {b.label}</span>
          ))}
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
      <div style={{ padding:'14px 16px', borderBottom:'1px solid rgba(232,125,106,.08)', background:'rgba(255,245,242,.5)' }}>
        <h3 style={{ fontSize:14, fontWeight:600, color:'#5a4a3a', margin:0 }}>🏆 Classement</h3>
      </div>
      {data.map((c,i) => (
        <div key={c.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderBottom:i<data.length-1?'1px solid rgba(232,125,106,.08)':'none', background:i===0?'#fffbeb':'white' }}>
          <div style={{ width:28, height:28, borderRadius:'50%', background:i===0?'#fef3c7':i===1?'#f1f5f9':'#f8fafc', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:13, flexShrink:0 }}>
            {i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ fontWeight:600, fontSize:13, color:'#5a4a3a', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.name}</p>
            <p style={{ fontSize:11, color:'#c8b8a8', margin:0 }}>{c.level.icon} {c.level.name} · {c.totalDebriefs} debriefs</p>
          </div>
          <div style={{ textAlign:'right', flexShrink:0 }}>
            <p style={{ fontWeight:700, fontSize:14, color:'#e87d6a', margin:0 }}>{c.points} pts</p>
            <p style={{ fontSize:11, color:'#c8b8a8', margin:0 }}>{c.avgScore}%</p>
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
    { label:'Total appels',   value:total,                         icon:'📞', bg:'rgba(253,232,228,.6)', c:'#e87d6a' },
    { label:'Score moyen',    value:`${avg}%`,                     icon:'🎯', bg:'#d1fae5', c:'#059669' },
    { label:'Meilleur score', value:`${Math.round(best)}%`,        icon:'🏆', bg:'#fef3c7', c:'#d97706' },
    { label:'Tendance',       value:`${trend>=0?'+':''}${trend}%`, icon:trend>=0?'📈':'📉', bg:trend>=0?'#d1fae5':'#fee2e2', c:trend>=0?'#059669':'#dc2626' },
  ];
  return (
    <div style={{ display:'grid', gridTemplateColumns:mob?'repeat(2,1fr)':'repeat(4,1fr)', gap:mob?10:12 }}>
      {items.map(({ label, value, icon, bg, c }) => (
        <Card key={label} style={{ padding:mob?'12px 14px':'16px 20px', display:'flex', alignItems:'center', gap:mob?10:14 }}>
          <div style={{ width:mob?36:44, height:mob?36:44, borderRadius:10, background:bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:mob?16:20, flexShrink:0 }}>{icon}</div>
          <div>
            <p style={{ fontSize:10, color:'#6b7280', margin:0, fontWeight:500, textTransform:'uppercase', letterSpacing:'.04em' }}>{label}</p>
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
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:200, color:'#c8b8a8', fontSize:14 }}>
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
            <stop offset="0%" stopColor="#e87d6a" stopOpacity=".18"/>
            <stop offset="100%" stopColor="#e87d6a" stopOpacity="0"/>
          </linearGradient>
        </defs>
        {[0,50,100].map(v => {
          const y = pT + iH - (v/100) * iH;
          return <g key={v}><line x1={pL} y1={y} x2={W-pR} y2={y} stroke="#f1f5f9" strokeWidth="1"/><text x={pL-6} y={y+4} textAnchor="end" fontSize="10" fill="#94a3b8">{v}%</text></g>;
        })}
        <path d={`${path} L ${xs[xs.length-1]} ${pT+iH} L ${pL} ${pT+iH} Z`} fill="url(#cg)"/>
        <path d={path} fill="none" stroke="#e87d6a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        {data.map((d,i) => (
          <g key={i} onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)} onTouchStart={()=>setHov(hov===i?null:i)} style={{ cursor:'pointer' }}>
            <circle cx={xs[i]} cy={ys[i]} r={hov===i?7:5} fill="#e87d6a" stroke="white" strokeWidth="2"/>
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
      {label && <p style={{ fontSize:14, fontWeight:600, color:'#5a4a3a', marginBottom:8 }}>{label}</p>}
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {options.map(opt => (
          <label key={opt.value} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'12px 14px', borderRadius:8, border:`1px solid ${value===opt.value?'#e87d6a':'#e2e8f0'}`, background:value===opt.value?'rgba(255,248,245,.8)':'white', cursor:'pointer', fontSize:14, color:value===opt.value?'#4c1d95':'#64748b', transition:'all .15s' }}>
            <input type="radio" style={{ marginTop:3, accentColor:'#e87d6a', flexShrink:0 }} checked={value===opt.value} onChange={()=>onChange(opt.value)}/>
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
      {label && <p style={{ fontSize:14, fontWeight:600, color:'#5a4a3a', marginBottom:8 }}>{label}</p>}
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {options.map(opt => (
          <label key={opt.value} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'12px 14px', borderRadius:8, border:`1px solid ${value.includes(opt.value)?'#e87d6a':'#e2e8f0'}`, background:value.includes(opt.value)?'rgba(255,248,245,.8)':'white', cursor:'pointer', fontSize:14, color:value.includes(opt.value)?'#4c1d95':'#64748b', transition:'all .15s' }}>
            <input type="checkbox" style={{ marginTop:3, accentColor:'#e87d6a', flexShrink:0 }} checked={value.includes(opt.value)} onChange={()=>toggle(opt.value)}/>
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
    <div style={{ display:'grid', gridTemplateColumns:mob?'1fr':'repeat(3,1fr)', gap:10, paddingTop:16, marginTop:8, borderTop:'1px solid rgba(232,125,106,.08)' }}>
      {[
        { key:'strength',    label:'👍 Point fort',   placeholder:'Ce qui a bien fonctionné...', color:'#059669' },
        { key:'weakness',    label:'👎 Point faible', placeholder:"Ce qui n'a pas marché...",    color:'#dc2626' },
        { key:'improvement', label:'📈 Amélioration', placeholder:'Comment s\'améliorer...',     color:'#d97706' },
      ].map(({ key, label, placeholder, color }) => (
        <div key={key}>
          <label style={{ display:'block', fontSize:11, fontWeight:600, color, marginBottom:5 }}>{label}</label>
          <textarea rows={mob?2:3} placeholder={placeholder} value={notes[key]||''} onChange={e=>onChange({...notes,[key]:e.target.value})} style={{ width:'100%', borderRadius:8, border:'1px solid rgba(232,125,106,.12)', padding:'7px 10px', fontSize:12, resize:'none', fontFamily:'inherit', outline:'none', boxSizing:'border-box' }}/>
        </div>
      ))}
    </div>
  );
}
function CatCard({ number, title, children }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div style={{ ...cardSm(), overflow:'hidden', marginBottom:10 }}>
      <button type="button" onClick={()=>setOpen(v=>!v)} style={{
        display:'flex', alignItems:'center', gap:12, padding:'12px 16px',
        background: open ? `linear-gradient(135deg,${P},${P2})` : `linear-gradient(135deg,rgba(253,232,228,.4),rgba(253,240,238,.2))`,
        width:'100%', border:'none', cursor:'pointer', fontFamily:'inherit', transition:'all .2s'
      }}>
        <span style={{ width:26, height:26, borderRadius:'50%', background:open?'rgba(255,255,255,.25)':P, color:'white', fontSize:11, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{number}</span>
        <span style={{ fontWeight:700, fontSize:14, color:open?'white':TXT, flex:1, textAlign:'left' }}>{title}</span>
        <span style={{ fontSize:13, color:open?'rgba(255,255,255,.8)':TXT3, transition:'transform .2s', display:'inline-block', transform:open?'rotate(180deg)':'none' }}>▾</span>
      </button>
      {open && <div style={{ padding:16, borderTop:`1px solid rgba(232,125,106,.1)` }}>{children}</div>}
    </div>
  );
}
// ─── AUTH PAGES ───────────────────────────────────────────────────────────────
function AuthShell({ subtitle, icon, children }) {
  return (
    <div style={{ minHeight:'100vh', background:"linear-gradient(160deg,#f5ede6,#e8f0f5)", display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ width:'100%', maxWidth:460 }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ width:56, height:56, borderRadius:16, background:`linear-gradient(135deg,${P},${P2})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, margin:'0 auto 14px', boxShadow:SH_BTN }}>
            {icon}
          </div>
          <h1 style={{ fontSize:24, fontWeight:700, color:'#5a4a3a', margin:0 }}>CloserDebrief</h1>
          <p style={{ color:'#b09080', fontSize:14, marginTop:6 }}>{subtitle}</p>
        </div>
        <div style={{ ...card(), padding:28 }}>{children}</div>
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
        <div style={{marginBottom:16}}><label style={{display:'block',fontSize:13,fontWeight:600,color:'#5a4a3a',marginBottom:6}}>Email</label><Input type="email" placeholder="votre@email.com" value={f.email} onChange={e=>setF({...f,email:e.target.value})} required autoFocus/></div>
        <div style={{marginBottom:8}}><label style={{display:'block',fontSize:13,fontWeight:600,color:'#5a4a3a',marginBottom:6}}>Mot de passe</label><Input type="password" placeholder="••••••••" value={f.password} onChange={e=>setF({...f,password:e.target.value})} required/></div>
        <div style={{textAlign:'right',marginBottom:24}}><button type="button" onClick={goForgot} style={{background:'none',border:'none',color:'#e87d6a',fontSize:13,cursor:'pointer'}}>Mot de passe oublié ?</button></div>
        <Btn type="submit" disabled={loading} style={{width:'100%'}}>{loading?'Connexion...':'Se connecter'}</Btn>
      </form>
      <p style={{textAlign:'center',fontSize:14,color:'#6b7280',marginTop:20}}>Pas encore de compte ?{' '}<button onClick={goRegister} style={{background:'none',border:'none',color:'#e87d6a',fontWeight:600,cursor:'pointer',fontSize:14}}>S'inscrire</button></p>
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
        <label style={{display:'block',fontSize:13,fontWeight:600,color:'#5a4a3a',marginBottom:8}}>Je suis...</label>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          {[{value:'closer',label:'🎯 Closer',desc:'Je fais des appels'},{value:'head_of_sales',label:'👑 Head of Sales',desc:'Je gère une équipe'}].map(({value,label,desc})=>(
            <button key={value} type="button" onClick={()=>setF({...f,role:value})} style={{padding:'12px 14px',borderRadius:10,border:`2px solid ${f.role===value?'#e87d6a':'#e2e8f0'}`,background:f.role===value?'rgba(255,248,245,.8)':'white',cursor:'pointer',textAlign:'left',fontFamily:'inherit'}}>
              <p style={{fontWeight:600,fontSize:13,color:f.role===value?'#4c1d95':'#374151',margin:0}}>{label}</p>
              <p style={{fontSize:11,color:'#c8b8a8',margin:'2px 0 0'}}>{desc}</p>
            </button>
          ))}
        </div>
      </div>
      <form onSubmit={submit}>
        {[{key:'name',label:'Nom complet',ph:'Jean Dupont',type:'text'},{key:'email',label:'Email',ph:'votre@email.com',type:'email'},{key:'password',label:'Mot de passe',ph:'8 caractères minimum',type:'password'},{key:'confirm',label:'Confirmer',ph:'••••••••',type:'password'}].map(({key,label,ph,type})=>(
          <div key={key} style={{marginBottom:14}}><label style={{display:'block',fontSize:13,fontWeight:600,color:'#5a4a3a',marginBottom:6}}>{label}</label><Input type={type} placeholder={ph} value={f[key]} onChange={e=>setF({...f,[key]:e.target.value})} required/></div>
        ))}
        {f.role==='closer'&&(
          <div style={{marginBottom:14}}>
            <label style={{display:'block',fontSize:13,fontWeight:600,color:'#5a4a3a',marginBottom:6}}>🔑 Code d'invitation</label>
            <Input placeholder="Ex: ABC12345" value={f.invite_code} onChange={e=>setF({...f,invite_code:e.target.value.toUpperCase()})} required/>
            <p style={{fontSize:12,color:'#c8b8a8',marginTop:4}}>Demandez ce code à votre Head of Sales</p>
          </div>
        )}
        <Btn type="submit" disabled={loading} style={{width:'100%',marginTop:8}}>{loading?'Création...':'Créer mon compte'}</Btn>
      </form>
      <p style={{textAlign:'center',fontSize:14,color:'#6b7280',marginTop:20}}>Déjà un compte ?{' '}<button onClick={goLogin} style={{background:'none',border:'none',color:'#e87d6a',fontWeight:600,cursor:'pointer',fontSize:14}}>Se connecter</button></p>
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
        ? <div style={{textAlign:'center'}}><div style={{fontSize:48,marginBottom:16}}>📬</div><h2 style={{fontSize:18,fontWeight:600,color:'#5a4a3a',marginBottom:8}}>Email envoyé !</h2><p style={{color:'#6b7280',fontSize:14,marginBottom:24}}>Si cet email est enregistré, vous recevrez un lien.</p><Btn variant="secondary" onClick={goLogin} style={{width:'100%'}}>Retour à la connexion</Btn></div>
        : <><AlertBox type="error" message={err}/><form onSubmit={submit}><div style={{marginBottom:20}}><label style={{display:'block',fontSize:13,fontWeight:600,color:'#5a4a3a',marginBottom:6}}>Email</label><Input type="email" placeholder="votre@email.com" value={email} onChange={e=>setEmail(e.target.value)} required autoFocus/></div><Btn type="submit" disabled={loading} style={{width:'100%'}}>{loading?'Envoi...':'Envoyer le lien'}</Btn></form><p style={{textAlign:'center',fontSize:13,marginTop:16}}><button onClick={goLogin} style={{background:'none',border:'none',color:'#e87d6a',cursor:'pointer',fontSize:13}}>← Retour</button></p></>
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
          : <><AlertBox type="error" message={err}/><form onSubmit={submit}><div style={{marginBottom:14}}><label style={{display:'block',fontSize:13,fontWeight:600,color:'#5a4a3a',marginBottom:6}}>Nouveau mot de passe</label><Input type="password" placeholder="8 caractères minimum" value={f.password} onChange={e=>setF({...f,password:e.target.value})} required autoFocus/></div><div style={{marginBottom:20}}><label style={{display:'block',fontSize:13,fontWeight:600,color:'#5a4a3a',marginBottom:6}}>Confirmer</label><Input type="password" placeholder="••••••••" value={f.confirm} onChange={e=>setF({...f,confirm:e.target.value})} required/></div><Btn type="submit" disabled={loading} style={{width:'100%'}}>{loading?'Modification...':'Modifier le mot de passe'}</Btn></form></>}
    </AuthShell>
  );
}

// ─── HOOK useDebriefConfig ────────────────────────────────────────────────────
function useDebriefConfig() {
  const [config, setConfig] = React.useState(DEFAULT_DEBRIEF_CONFIG);
  const [loaded, setLoaded] = React.useState(false);
  React.useEffect(() => {
    apiFetch('/debrief-config')
      .then(d => { if (d && d.sections && Array.isArray(d.sections) && d.sections.length > 0) setConfig(d.sections); })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);
  return [config, setConfig, loaded];
}

// ─── DEBRIEF CONFIG EDITOR (HOS only) ────────────────────────────────────────
function DebriefConfigEditor({ onClose, toast }) {
  const [config, setConfig, loaded] = useDebriefConfig();
  const [saving, setSaving] = React.useState(false);
  const [activeSection, setActiveSection] = React.useState(0);

  const updateSection = (si, field, val) => {
    setConfig(prev => prev.map((s, i) => i === si ? { ...s, [field]: val } : s));
  };

  const updateQuestion = (si, qi, field, val) => {
    setConfig(prev => prev.map((s, i) => i !== si ? s : {
      ...s,
      questions: s.questions.map((q, j) => j !== qi ? q : { ...q, [field]: val })
    }));
  };

  const addQuestion = si => {
    const id = `q_${Date.now()}`;
    setConfig(prev => prev.map((s, i) => i !== si ? s : {
      ...s,
      questions: [...s.questions, { id, label: 'Nouvelle question', type: 'radio', options: [{value:'oui',label:'Oui'},{value:'non',label:'Non'}] }]
    }));
  };

  const removeQuestion = (si, qi) => {
    setConfig(prev => prev.map((s, i) => i !== si ? s : {
      ...s,
      questions: s.questions.filter((_, j) => j !== qi)
    }));
  };

  const addSection = () => {
    const id = `section_${Date.now()}`;
    setConfig(prev => [...prev, { key: id, title: 'Nouvelle section', questions: [] }]);
    setActiveSection(config.length);
  };

  const removeSection = si => {
    if (config.length <= 1) return toast('Il faut au moins une section', 'error');
    setConfig(prev => prev.filter((_, i) => i !== si));
    setActiveSection(Math.max(0, activeSection - 1));
  };

  const save = async () => {
    setSaving(true);
    try {
      await apiFetch('/debrief-config', { method:'PUT', body:{ sections: config } });
      toast('Configuration sauvegardée !');
      onClose();
    } catch(e) { toast(e.message, 'error'); } finally { setSaving(false); }
  };

  const reset = async () => {
    if (!confirm('Réinitialiser aux questions par défaut ?')) return;
    try {
      await apiFetch('/debrief-config', { method:'DELETE' });
      setConfig(DEFAULT_DEBRIEF_CONFIG);
      toast('Configuration réinitialisée');
    } catch(e) { toast(e.message, 'error'); }
  };

  if (!loaded) return <div style={{padding:40,textAlign:'center'}}><Spinner/></div>;

  const sec = config[activeSection] || config[0];
  const si = activeSection;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
      {/* Tabs sections */}
      <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:16 }}>
        {config.map((s, i) => (
          <button key={s.key} onClick={() => setActiveSection(i)}
            style={{ padding:'5px 12px', borderRadius:R_FULL, border:'none', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', background:i===activeSection?`linear-gradient(135deg,${P},${P2})`:'rgba(253,232,228,.3)', color:i===activeSection?'white':TXT2, transition:'all .15s' }}>
            {i+1}. {s.title}
          </button>
        ))}
        <button onClick={addSection} style={{ padding:'5px 12px', borderRadius:R_FULL, border:`1px dashed rgba(232,125,106,.4)`, fontSize:12, cursor:'pointer', fontFamily:'inherit', background:'transparent', color:TXT3 }}>
          + Section
        </button>
      </div>

      {sec && (
        <div style={{ ...card(), padding:16, marginBottom:16 }}>
          {/* Titre de la section */}
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
            <Input value={sec.title} onChange={e => updateSection(si, 'title', e.target.value)} style={{fontSize:14,fontWeight:700}}/>
            {config.length > 1 && (
              <button onClick={() => removeSection(si)} style={{ padding:'8px 10px', borderRadius:R_SM, border:'none', background:'rgba(253,232,228,.6)', color:'#c05040', cursor:'pointer', fontSize:13, flexShrink:0 }}>🗑</button>
            )}
          </div>

          {/* Questions */}
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {sec.questions.map((q, qi) => (
              <div key={q.id} style={{ background:SAND, borderRadius:R_SM, padding:'12px 14px', border:'1px solid rgba(232,125,106,.1)' }}>
                <div style={{ display:'flex', gap:8, marginBottom:8 }}>
                  <Input value={q.label} onChange={e => updateQuestion(si, qi, 'label', e.target.value)} style={{fontSize:13}}/>
                  <select value={q.type} onChange={e => updateQuestion(si, qi, 'type', e.target.value)}
                    style={{ padding:'8px 10px', borderRadius:R_SM, border:'1px solid rgba(232,125,106,.15)', background:SAND, fontSize:12, color:TXT, fontFamily:'inherit', cursor:'pointer', flexShrink:0 }}>
                    <option value="radio">Choix unique</option>
                    <option value="checkbox">Choix multiple</option>
                    <option value="text">Texte libre</option>
                  </select>
                  <button onClick={() => removeQuestion(si, qi)} style={{ padding:'8px 10px', borderRadius:R_SM, border:'none', background:'rgba(253,232,228,.6)', color:'#c05040', cursor:'pointer', fontSize:13, flexShrink:0 }}>🗑</button>
                </div>
                {q.type !== 'text' && (
                  <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                    {(q.options || []).map((opt, oi) => (
                      <div key={oi} style={{ display:'flex', gap:6 }}>
                        <Input value={opt.value} onChange={e => updateQuestion(si, qi, 'options', q.options.map((o,k)=>k===oi?{...o,value:e.target.value}:o))} style={{fontSize:11,flex:'0 0 90px'}}/>
                        <Input value={opt.label} onChange={e => updateQuestion(si, qi, 'options', q.options.map((o,k)=>k===oi?{...o,label:e.target.value}:o))} style={{fontSize:11}}/>
                        <button onClick={() => updateQuestion(si, qi, 'options', q.options.filter((_,k)=>k!==oi))}
                          style={{ border:'none', background:'none', color:'#c8b8a8', cursor:'pointer', fontSize:14, padding:'0 4px' }}>✕</button>
                      </div>
                    ))}
                    <button onClick={() => updateQuestion(si, qi, 'options', [...(q.options||[]), {value:`opt${Date.now()}`,label:'Nouvelle option'}])}
                      style={{ alignSelf:'flex-start', padding:'4px 10px', borderRadius:R_SM, border:`1px dashed rgba(232,125,106,.3)`, background:'transparent', fontSize:11, color:TXT3, cursor:'pointer', fontFamily:'inherit' }}>
                      + Option
                    </button>
                  </div>
                )}
              </div>
            ))}
            <button onClick={() => addQuestion(si)}
              style={{ padding:'8px 14px', borderRadius:R_SM, border:`1px dashed rgba(232,125,106,.3)`, background:'transparent', fontSize:12, color:TXT3, cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}>
              + Ajouter une question
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display:'flex', gap:8, justifyContent:'space-between' }}>
        <button onClick={reset} style={{ padding:'8px 14px', borderRadius:R_FULL, border:`1px solid rgba(192,80,64,.3)`, background:'rgba(253,232,228,.5)', color:'#c05040', fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
          Réinitialiser par défaut
        </button>
        <div style={{ display:'flex', gap:8 }}>
          <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
          <Btn onClick={save} disabled={saving}>{saving ? 'Sauvegarde...' : 'Sauvegarder'}</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── ACCOUNT SETTINGS ────────────────────────────────────────────────────────
function AccountSettings({ user, onClose, toast }) {
  const isHOS = user.role === 'head_of_sales';
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

  const tabs = [
    { key:'profil',    label:'👤 Profil' },
    { key:'securite',  label:'🔒 Sécurité' },
    ...(isHOS ? [{ key:'questions', label:'📋 Questions' }] : []),
  ];

  return (
    <Modal title="Paramètres du compte" onClose={onClose}>
      <div style={{display:'flex',gap:4,background:'rgba(253,232,228,.2)',padding:4,borderRadius:8,marginBottom:20,flexWrap:'wrap'}}>
        {tabs.map(({key,label})=>(
          <button key={key} onClick={()=>setTab(key)} style={{flex:1,padding:'7px 12px',borderRadius:6,border:'none',fontSize:13,fontWeight:500,cursor:'pointer',background:tab===key?'white':'transparent',color:tab===key?TXT:'#64748b',boxShadow:tab===key?'0 1px 3px rgba(0,0,0,.08)':'none',fontFamily:'inherit',minWidth:80}}>{label}</button>
        ))}
      </div>

      {tab==='profil' && (
        <div>
          <div style={{display:'flex',alignItems:'center',gap:14,padding:16,background:'rgba(253,232,228,.2)',borderRadius:12,marginBottom:20}}>
            <div style={{width:52,height:52,borderRadius:'50%',background:`linear-gradient(135deg,${P},${P2})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:700,color:'white',flexShrink:0}}>{user.name.charAt(0)}</div>
            <div>
              <p style={{fontWeight:700,fontSize:16,color:TXT,margin:0}}>{user.name}</p>
              <p style={{fontSize:13,color:TXT2,margin:'2px 0 0'}}>{user.email}</p>
              <span style={{display:'inline-block',marginTop:4,background:isHOS?'#fef3c7':'rgba(253,232,228,.6)',color:isHOS?'#92400e':P2,fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:4}}>
                {isHOS?'👑 Head of Sales':'🎯 Closer'}
              </span>
            </div>
          </div>
          <p style={{fontSize:13,color:TXT3,textAlign:'center'}}>La modification du profil sera disponible prochainement.</p>
        </div>
      )}

      {tab==='securite' && (
        <div>
          <p style={{fontSize:13,fontWeight:600,color:TXT,marginBottom:16}}>Changer le mot de passe</p>
          <AlertBox type="error" message={err}/>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {[{key:'current',label:'Mot de passe actuel'},{key:'next',label:'Nouveau mot de passe'},{key:'confirm',label:'Confirmer'}].map(({key,label})=>(
              <div key={key}><label style={{display:'block',fontSize:12,fontWeight:600,color:TXT,marginBottom:5}}>{label}</label><Input type="password" placeholder="••••••••" value={pwd[key]} onChange={e=>setPwd({...pwd,[key]:e.target.value})}/></div>
            ))}
            <Btn onClick={changePwd} disabled={saving||!pwd.current||!pwd.next||!pwd.confirm} style={{marginTop:4}}>{saving?'Modification...':'Modifier le mot de passe'}</Btn>
          </div>
        </div>
      )}

      {tab==='questions' && isHOS && (
        <DebriefConfigEditor onClose={onClose} toast={toast}/>
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
      style={{ background:'#ffffff', border:`1px solid ${hov?'rgba(232,125,106,.2)':'rgba(255,255,255,.9)'}`, borderRadius:18, padding:'14px 16px', cursor:'pointer', transition:'all .15s', boxShadow:hov?'0 6px 24px rgba(232,125,106,.15), 0 2px 6px rgba(232,125,106,.1)':'0 2px 8px rgba(100,80,200,.07)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontWeight:600, fontSize:14, color:'#5a4a3a', margin:'0 0 4px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{debrief.prospect_name}</p>
        <div style={{ display:'flex', alignItems:'center', gap:10, fontSize:12, color:'#c8b8a8', flexWrap:'wrap' }}>
          <span>📅 {fmtDate(debrief.call_date)}</span>
          <span>👤 {debrief.closer_name}</span>
          {showUser&&debrief.user_name&&<span style={{background:'rgba(253,232,228,.2)',padding:'1px 6px',borderRadius:4}}>par {debrief.user_name}</span>}
        </div>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
        <ClosedBadge isClosed={debrief.is_closed}/>
        <ScoreBadge pct={pct}/>
        <span style={{ color:hov?'#e87d6a':'#d1d5db', fontSize:18, transition:'color .15s' }}>›</span>
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
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', cursor:'pointer', background:selected?'rgba(255,248,245,.8)':'white', transition:'background .1s' }} onClick={onSelect}>
        <div style={{ width:36, height:36, borderRadius:'50%', background:'rgba(255,245,242,.85)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:14, color:'#e87d6a', flexShrink:0 }}>{member.name.charAt(0)}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ fontWeight:600, fontSize:14, color:'#5a4a3a', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{member.name}</p>
          <p style={{ fontSize:12, color:'#c8b8a8', margin:0 }}>{member.level.icon} {member.level.name} · {member.totalDebriefs} debriefs · {member.avgScore}%</p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
          {!mob && otherTeams.length > 0 && (
            <select value={movingTo} onChange={e=>setMovingTo(e.target.value)} onClick={e=>e.stopPropagation()}
              style={{ fontSize:12, border:'1px solid rgba(232,125,106,.12)', borderRadius:6, padding:'4px 8px', fontFamily:'inherit', color:'#5a4a3a', background:'#ffffff', cursor:'pointer' }}>
              <option value="">Déplacer...</option>
              {otherTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}
          {movingTo && <Btn variant="green" onClick={e=>{e.stopPropagation();onMove(member.id,movingTo);setMovingTo('');}} style={{fontSize:12,padding:'4px 10px'}}>✓</Btn>}
          <Btn variant="danger" onClick={e=>{e.stopPropagation();onRemove(member.id,member.name);}} style={{width:30,height:30,padding:0,borderRadius:8,fontSize:12}}>✕</Btn>
          <span style={{ color:selected?'#e87d6a':'#d1d5db', fontSize:14 }}>{selected?'▲':'▼'}</span>
        </div>
      </div>
      {selected && (
        <div style={{ padding:'14px 16px 18px', background:'rgba(253,232,228,.15)', borderTop:'1px solid rgba(232,125,106,.08)' }}>
          {mob && otherTeams.length > 0 && (
            <div style={{ marginBottom:12, display:'flex', gap:8 }}>
              <select value={movingTo} onChange={e=>setMovingTo(e.target.value)} style={{ flex:1, fontSize:13, border:'1px solid rgba(232,125,106,.12)', borderRadius:8, padding:'8px 10px', fontFamily:'inherit', color:'#5a4a3a', background:'#ffffff' }}>
                <option value="">Déplacer vers une autre équipe...</option>
                {otherTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              {movingTo && <Btn variant="green" onClick={()=>{onMove(member.id,movingTo);setMovingTo('');}} style={{fontSize:13,padding:'8px 14px'}}>✓</Btn>}
            </div>
          )}
          {member.chartData.length > 0
            ? <><p style={{fontSize:13,fontWeight:600,color:'#5a4a3a',marginBottom:10}}>📈 Évolution</p><Chart debriefs={member.chartData.map((d,i)=>({...d,id:i,percentage:d.score,prospect_name:d.prospect,call_date:d.date}))}/></>
            : <p style={{color:'#c8b8a8',fontSize:13,textAlign:'center',padding:'16px 0'}}>Aucun debrief enregistré</p>
          }
          {member.badges.length > 0 && <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:10}}>{member.badges.map(b=><span key={b.id} style={{background:'rgba(255,245,242,.85)',color:'#5a4a3a',padding:'3px 10px',borderRadius:20,fontSize:12}}>{b.icon} {b.label}</span>)}</div>}
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
      style={{ background:'#ffffff', border:`2px solid ${hov?'#e87d6a':'rgba(255,255,255,.9)'}`, borderRadius:16, padding:20, cursor:'pointer', transition:'all .2s', boxShadow:hov?'0 12px 40px rgba(232,125,106,.2), 0 2px 10px rgba(232,125,106,.1)':'0 6px 24px rgba(100,80,200,.1), 0 2px 8px rgba(100,80,200,.06)', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:4, background:'linear-gradient(90deg,#e87d6a,#6aacce)' }}/>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:16, marginTop:4 }}>
        <div>
          <h3 style={{ fontSize:17, fontWeight:700, color:'#5a4a3a', margin:'0 0 4px' }}>{team.name}</h3>
          <p style={{ fontSize:12, color:'#c8b8a8', margin:0 }}>{team.members.length} membre{team.members.length!==1?'s':''} · {td.length} debrief{td.length!==1?'s':''}</p>
        </div>
        <span style={{ fontSize:20, color:hov?'#e87d6a':'#d1d5db', transition:'color .2s' }}>→</span>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
        {[{ l:'Score moy.', v:`${avg}%`,  c:avg>=80?'#059669':avg>=60?'#d97706':'#e87d6a' },
          { l:'Closings',   v:cls,         c:'#059669' },
          { l:'Taux',       v:`${rate}%`,  c:rate>=40?'#059669':'#d97706' },
        ].map(({ l, v, c }) => (
          <div key={l} style={{ background:'rgba(253,232,228,.2)', borderRadius:8, padding:'8px 10px', textAlign:'center' }}>
            <p style={{ fontSize:10, color:'#c8b8a8', margin:'0 0 2px', textTransform:'uppercase', letterSpacing:'.04em' }}>{l}</p>
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
            <div style={{ width:28, height:28, borderRadius:'50%', background:'#e2e8f0', border:'2px solid white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:600, color:'#6b7280', marginLeft:-8 }}>+{team.members.length-5}</div>
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
    apiFetch('/teams').then(d=>setTeams((d||[]).map(t=>({...t,inviteCodes:t.inviteCodes||[],members:t.members||[]})))).catch(()=>setTeams([])).finally(()=>setLoading(false));
  }, []);
  useEffect(() => { load(); }, []); // Ne pas dépendre de leaderboardKey — évite reset au moindre debrief

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
    try { const inv = await apiFetch(`/teams/${teamId}/invite`,{method:'POST'}); setTeams(p=>p.map(t=>t.id===teamId?{...t,inviteCodes:[inv,...(t.inviteCodes||[])]}:t)); toast('Code généré !'); }
    catch(e) { toast(e.message,'error'); } finally { setGenerating(null); }
  };
  const delCode = async (teamId, codeId) => {
    try { await apiFetch(`/teams/${teamId}/invite/${codeId}`,{method:'DELETE'}); setTeams(p=>p.map(t=>t.id===teamId?{...t,inviteCodes:(t.inviteCodes||[]).filter(c=>c.id!==codeId)}:t)); toast('Code supprimé'); }
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

  const bc = color => color==='#e87d6a'?'rgba(232,125,106,.15)':color==='#059669'?'rgba(5,150,105,.15)':'rgba(217,119,6,.15)';

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

      {/* ─── HEADER ─── */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700, color:'#5a4a3a', margin:0 }}>👑 Head of Sales</h1>
          <p style={{ color:'#6b7280', fontSize:13, marginTop:4 }}>{teams.length} équipe{teams.length!==1?'s':''} · {allMembers.length} closer{allMembers.length!==1?'s':''}</p>
        </div>
        <div style={{ display:'flex', gap:4, background:'rgba(232,125,106,.06)', padding:4, borderRadius:14 }}>
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
                <p style={{ fontSize:11, fontWeight:600, color:'#6b7280', textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 10px' }}>Filtrer les données</p>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  <button onClick={()=>setScope('all')} style={{ padding:'7px 14px', borderRadius:20, border:`1.5px solid ${scope==='all'?'#e87d6a':'#e2e8f0'}`, background:scope==='all'?'rgba(253,232,228,.6)':'white', color:scope==='all'?'#4c1d95':'#64748b', fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>🌍 Toute l'équipe</button>
                  {teams.map(t => <button key={t.id} onClick={()=>setScope(`team:${t.id}`)} style={{ padding:'7px 14px', borderRadius:20, border:`1.5px solid ${scope===`team:${t.id}`?'#059669':'rgba(232,125,106,.15)'}`, background:scope===`team:${t.id}`?'#d1fae5':'white', color:scope===`team:${t.id}`?'#065f46':'#6b7280', fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>👥 {t.name}</button>)}
                  {allMembers.map(m => <button key={m.id} onClick={()=>setScope(`closer:${m.id}`)} style={{ padding:'7px 14px', borderRadius:20, border:`1.5px solid ${scope===`closer:${m.id}`?'#8b5cf6':'rgba(232,125,106,.15)'}`, background:scope===`closer:${m.id}`?'rgba(255,248,245,.8)':'white', color:scope===`closer:${m.id}`?'#4c1d95':'#64748b', fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>👤 {m.name}</button>)}
                </div>
              </Card>

              {/* KPIs */}
              <div>
                <p style={{ fontSize:13, fontWeight:600, color:'#6b7280', margin:'0 0 10px' }}>📊 {scopeLabel} · {fTotal} debrief{fTotal!==1?'s':''}</p>
                <div style={{ display:'grid', gridTemplateColumns:mob?'repeat(2,1fr)':'repeat(4,1fr)', gap:mob?10:12 }}>
                  {[{l:'Debriefs',value:fTotal,icon:'📋',bg:'rgba(253,232,228,.6)',c:'#e87d6a'},{l:'Score moyen',value:`${fAvg}%`,icon:'🎯',bg:'#d1fae5',c:'#059669'},{l:'Taux closing',value:`${fRate}%`,icon:'✅',bg:'#fef3c7',c:'#d97706'},{l:'Closings',value:fCls,icon:'🏆',bg:'#f0fdf4',c:'#059669'}].map(({l,value,icon,bg,c})=>(
                    <Card key={l} style={{ padding:'12px 14px', display:'flex', alignItems:'center', gap:12 }}>
                      <div style={{ width:38, height:38, borderRadius:10, background:bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>{icon}</div>
                      <div>
                        <p style={{ fontSize:10, color:'#6b7280', margin:0, fontWeight:500, textTransform:'uppercase', letterSpacing:'.04em' }}>{l}</p>
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
                    <p style={{ fontWeight:700, fontSize:18, color:'#5a4a3a', margin:'0 0 2px' }}>{SLABELS[weakest.key]}</p>
                    <p style={{ fontSize:13, color:'#7f1d1d', margin:0 }}>Score moyen : <strong>{scopedSS[weakest.key]}/5</strong></p>
                  </div>
                  <div style={{ background:'linear-gradient(135deg,#d1fae5,#6ee7b7)', border:'1px solid #34d399', borderRadius:12, padding:16 }}>
                    <p style={{ fontSize:11, color:'#064e3b', fontWeight:600, textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 6px' }}>✅ Point fort</p>
                    <p style={{ fontWeight:700, fontSize:18, color:'#5a4a3a', margin:'0 0 2px' }}>{SLABELS[strongest.key]}</p>
                    <p style={{ fontSize:13, color:'#064e3b', margin:0 }}>Score moyen : <strong>{scopedSS[strongest.key]}/5</strong></p>
                  </div>
                </div>
              )}

              {/* Radar + Barres */}
              {scopedSS && fTotal > 0 && (
                <Card style={{ padding:20 }}>
                  <h3 style={{ fontSize:14, fontWeight:600, color:'#5a4a3a', margin:'0 0 4px' }}>Analyse par section</h3>
                  <p style={{ fontSize:12, color:'#c8b8a8', margin:'0 0 20px' }}>{scopeLabel}{scope!=='all'?' · vs moyenne globale':''}</p>
                  <div style={{ display:'grid', gridTemplateColumns:mob?'1fr':'1fr 1fr', gap:24, alignItems:'center' }}>
                    <div style={{ display:'flex', justifyContent:'center' }}>
                      <Radar scores={scopedSS} color={scope.startsWith('closer:')?'#8b5cf6':scope.startsWith('team:')?'#059669':'#e87d6a'}/>
                    </div>
                    <SectionBars scores={scopedSS} globalScores={scope!=='all'?globalSS:null}/>
                  </div>
                </Card>
              )}

              {/* Évolution */}
              {fTotal > 0 && (
                <Card style={{ padding:20 }}>
                  <h3 style={{ fontSize:14, fontWeight:600, color:'#5a4a3a', margin:'0 0 4px' }}>Évolution du score</h3>
                  <p style={{ fontSize:12, color:'#c8b8a8', margin:'0 0 16px' }}>{scopeLabel} · {fTotal} appel{fTotal!==1?'s':''}</p>
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
                    <div style={{ padding:'14px 16px', borderBottom:'1px solid rgba(232,125,106,.08)', background:'rgba(255,245,242,.5)' }}>
                      <h3 style={{ fontSize:14, fontWeight:600, color:'#5a4a3a', margin:0 }}>Performance individuelle</h3>
                    </div>
                    {mob ? (
                      <div>
                        {[...displayMembers].sort((a,b)=>b.avgScore-a.avgScore).map((m,i) => {
                          const cr = m.totalDebriefs>0 ? Math.round((m.closed/m.totalDebriefs)*100) : 0;
                          const mTeam = teams.find(t=>t.members.some(x=>x.id===m.id));
                          const isSel = selMember===m.id;
                          const ms = avgSectionScores((allDebriefs||[]).filter(d=>d.user_id===m.id));
                          return (
                            <div key={m.id} style={{ borderBottom:i<displayMembers.length-1?'1px solid rgba(232,125,106,.08)':'none' }}>
                              <div style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 16px', cursor:'pointer', background:isSel?'rgba(255,248,245,.8)':'white' }} onClick={()=>setSelMember(isSel?null:m.id)}>
                                <div style={{ width:36, height:36, borderRadius:'50%', background:'rgba(255,245,242,.85)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:14, color:'#e87d6a', flexShrink:0 }}>{m.name.charAt(0)}</div>
                                <div style={{ flex:1, minWidth:0 }}>
                                  <p style={{ fontWeight:600, fontSize:14, color:'#5a4a3a', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.name}</p>
                                  <p style={{ fontSize:12, color:'#c8b8a8', margin:0 }}>{mTeam?.name} · {m.avgScore}%</p>
                                </div>
                                <div style={{ textAlign:'right', flexShrink:0 }}>
                                  <p style={{ fontWeight:700, fontSize:14, color:m.avgScore>=80?'#059669':m.avgScore>=60?'#d97706':'#ef4444', margin:0 }}>{m.avgScore}%</p>
                                  <p style={{ fontSize:11, color:'#c8b8a8', margin:0 }}>{m.totalDebriefs} debriefs</p>
                                </div>
                                <span style={{ color:isSel?'#e87d6a':'#d1d5db', fontSize:14 }}>{isSel?'▲':'▼'}</span>
                              </div>
                              {isSel && (
                                <div style={{ padding:'12px 16px 16px', background:'rgba(253,232,228,.15)', borderTop:'1px solid rgba(232,125,106,.08)' }}>
                                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:14 }}>
                                    {[{l:'Debriefs',v:m.totalDebriefs},{l:'Closings',v:m.closed},{l:'Taux',v:`${cr}%`}].map(({l,v})=>(
                                      <div key={l} style={{ background:'#ffffff', borderRadius:8, padding:'8px 10px', textAlign:'center', border:'1px solid rgba(232,125,106,.12)' }}>
                                        <p style={{ fontSize:11, color:'#c8b8a8', margin:0 }}>{l}</p>
                                        <p style={{ fontWeight:700, color:'#5a4a3a', margin:0, fontSize:14 }}>{v}</p>
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
                            <tr style={{ background:'rgba(253,232,228,.2)' }}>
                              {['Closer','Équipe','Debriefs','Score','Découv.','Reform.','Proj.','Offre','Closing','Closings','Taux'].map(h=>(
                                <th key={h} style={{ padding:'10px 12px', fontSize:11, fontWeight:600, color:'#6b7280', textAlign:'left', textTransform:'uppercase', letterSpacing:'.04em', borderBottom:'1px solid rgba(232,125,106,.12)', whiteSpace:'nowrap' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {[...displayMembers].sort((a,b)=>b.avgScore-a.avgScore).map((m,i) => {
                              const cr    = m.totalDebriefs>0 ? Math.round((m.closed/m.totalDebriefs)*100) : 0;
                              const mTeam = teams.find(t=>t.members.some(x=>x.id===m.id));
                              const isSel = selMember===m.id;
                              const ms    = avgSectionScores((allDebriefs||[]).filter(d=>d.user_id===m.id));
                              const sc    = v => v>=4?'#059669':v>=3?'#d97706':v>=2?'#e87d6a':'#ef4444';
                              return (
                                <React.Fragment key={m.id}>
                                  <tr onClick={()=>setSelMember(isSel?null:m.id)} style={{ cursor:'pointer', background:isSel?'rgba(255,248,245,.8)':i%2===0?'white':'#fafafa', borderBottom:'1px solid rgba(232,125,106,.08)' }}>
                                    <td style={{ padding:'10px 12px' }}>
                                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                        <div style={{ width:26, height:26, borderRadius:'50%', background:'rgba(255,245,242,.85)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:11, color:'#e87d6a', flexShrink:0 }}>{m.name.charAt(0)}</div>
                                        <span style={{ fontWeight:600, fontSize:13, color:'#5a4a3a' }}>{m.name}</span>
                                      </div>
                                    </td>
                                    <td style={{ padding:'10px 12px' }}><span style={{ fontSize:11, background:'rgba(253,232,228,.2)', padding:'2px 6px', borderRadius:5, color:'#6b7280' }}>{mTeam?.name||'—'}</span></td>
                                    <td style={{ padding:'10px 12px', fontSize:13, fontWeight:600, color:'#5a4a3a' }}>{m.totalDebriefs}</td>
                                    <td style={{ padding:'10px 12px' }}><span style={{ fontWeight:700, fontSize:13, color:m.avgScore>=80?'#059669':m.avgScore>=60?'#d97706':'#ef4444' }}>{m.avgScore}%</span></td>
                                    {ms ? ['decouverte','reformulation','projection','presentation_offre','closing'].map(k=>(
                                      <td key={k} style={{ padding:'10px 12px' }}><span style={{ fontWeight:700, fontSize:12, color:sc(ms[k]) }}>{ms[k]}/5</span></td>
                                    )) : [...Array(5)].map((_,j)=><td key={j} style={{ padding:'10px 12px', color:'#c8b8a8', fontSize:12 }}>—</td>)}
                                    <td style={{ padding:'10px 12px', fontSize:13, fontWeight:600, color:'#059669' }}>{m.closed}</td>
                                    <td style={{ padding:'10px 12px' }}>
                                      <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                                        <div style={{ width:44, height:5, background:'rgba(253,232,228,.2)', borderRadius:3, overflow:'hidden' }}>
                                          <div style={{ height:'100%', width:`${cr}%`, background:cr>=50?'#059669':cr>=30?'#d97706':'#ef4444', borderRadius:3 }}/>
                                        </div>
                                        <span style={{ fontSize:11, fontWeight:600, color:'#5a4a3a' }}>{cr}%</span>
                                      </div>
                                    </td>
                                  </tr>
                                  {isSel && (
                                    <tr>
                                      <td colSpan={11} style={{ padding:0, background:'rgba(253,232,228,.15)', borderBottom:'1px solid rgba(232,125,106,.08)' }}>
                                        <div style={{ padding:'20px 24px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
                                          <div>
                                            <p style={{ fontSize:13, fontWeight:600, color:'#5a4a3a', marginBottom:12 }}>Scores par section</p>
                                            {ms ? <SectionBars scores={ms} globalScores={globalSS}/> : <p style={{ color:'#c8b8a8', fontSize:13 }}>Pas assez de données</p>}
                                          </div>
                                          <div>
                                            <p style={{ fontSize:13, fontWeight:600, color:'#5a4a3a', marginBottom:8 }}>Évolution</p>
                                            {m.chartData.length > 0 ? <Chart debriefs={m.chartData.map((d,i)=>({...d,id:i,percentage:d.score,prospect_name:d.prospect,call_date:d.date}))}/> : <p style={{ color:'#c8b8a8', fontSize:13 }}>Aucun debrief</p>}
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
                      <input value={editingTeam.name} onChange={e=>setEditingTeam({...editingTeam,name:e.target.value})} onKeyDown={e=>{if(e.key==='Enter')renameTeam();if(e.key==='Escape')setEditingTeam(null);}} style={{ fontSize:18, fontWeight:700, border:'2px solid #e87d6a', borderRadius:8, padding:'4px 10px', fontFamily:'inherit', outline:'none' }} autoFocus/>
                      <Btn onClick={renameTeam} style={{padding:'5px 12px',fontSize:12}}>✓</Btn>
                      <Btn variant="ghost" onClick={()=>setEditingTeam(null)} style={{padding:'5px 8px',fontSize:12}}>✕</Btn>
                    </div>
                  ) : (
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <h1 style={{ fontSize:20, fontWeight:700, color:'#5a4a3a', margin:0 }}>{team.name}</h1>
                      <button onClick={()=>setEditingTeam({id:team.id,name:team.name})} style={{ background:'none', border:'none', cursor:'pointer', fontSize:16, color:'#c8b8a8', padding:'2px 4px' }}>✏️</button>
                    </div>
                  )}
                  <p style={{ color:'#6b7280', fontSize:13, marginTop:2 }}>{team.members.length} membre{team.members.length!==1?'s':''} · {td.length} debrief{td.length!==1?'s':''}</p>
                </div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <Btn onClick={()=>genCode(team.id)} disabled={generating===team.id} style={{fontSize:13,padding:'8px 14px'}}>{generating===team.id?'Génération...':'🔑 Générer un code'}</Btn>
                <Btn variant="danger" onClick={()=>deleteTeam(team.id,team.name)} style={{padding:'8px 12px',fontSize:13}}>🗑</Btn>
              </div>
            </div>

            {/* KPIs équipe */}
            <div style={{ display:'grid', gridTemplateColumns:mob?'repeat(2,1fr)':'repeat(4,1fr)', gap:mob?10:12 }}>
              {[{l:'Debriefs',v:td.length,i:'📋',bg:'rgba(253,232,228,.6)',c:'#e87d6a'},{l:'Score moyen',v:`${tAvg}%`,i:'🎯',bg:'#d1fae5',c:'#059669'},{l:'Taux closing',v:`${tRate}%`,i:'✅',bg:'#fef3c7',c:'#d97706'},{l:'Closings',v:tCls,i:'🏆',bg:'#f0fdf4',c:'#059669'}].map(({l,v,i,bg,c})=>(
                <Card key={l} style={{padding:'12px 14px',display:'flex',alignItems:'center',gap:12}}>
                  <div style={{width:38,height:38,borderRadius:10,background:bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>{i}</div>
                  <div><p style={{fontSize:10,color:'#6b7280',margin:0,fontWeight:500,textTransform:'uppercase',letterSpacing:'.04em'}}>{l}</p><p style={{fontSize:20,fontWeight:700,color:c,margin:0}}>{v}</p></div>
                </Card>
              ))}
            </div>

            {/* Codes */}
            <Card style={{ padding:20 }}>
              <h3 style={{ fontSize:14, fontWeight:600, color:'#5a4a3a', margin:'0 0 12px' }}>🔑 Codes d'invitation actifs</h3>
              {team.inviteCodes.length === 0
                ? <p style={{ color:'#c8b8a8', fontSize:13, margin:0 }}>Aucun code actif — cliquez sur "Générer un code" ci-dessus</p>
                : <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                    {team.inviteCodes.map(inv => (
                      <div key={inv.id} style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(253,232,228,.2)', border:'1px solid rgba(232,125,106,.12)', borderRadius:10, padding:'8px 12px' }}>
                        <span style={{ fontFamily:'monospace', fontSize:16, fontWeight:700, color:'#e87d6a', letterSpacing:'.12em' }}>{inv.code}</span>
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
                <h3 style={{ fontSize:14, fontWeight:600, color:'#5a4a3a', margin:'0 0 4px' }}>Analyse par section — {team.name}</h3>
                <p style={{ fontSize:12, color:'#c8b8a8', margin:'0 0 20px' }}>Score moyen · comparé à la moyenne globale</p>
                <div style={{ display:'grid', gridTemplateColumns:mob?'1fr':'1fr 1fr', gap:24, alignItems:'center' }}>
                  <div style={{ display:'flex', justifyContent:'center' }}><Radar scores={tSS} color="#059669"/></div>
                  <SectionBars scores={tSS} globalScores={globalSS}/>
                </div>
              </Card>
            )}

            {/* Membres */}
            <Card style={{ overflow:'hidden' }}>
              <div style={{ padding:'14px 16px', borderBottom:'1px solid rgba(232,125,106,.08)', background:'rgba(255,245,242,.5)' }}>
                <h3 style={{ fontSize:14, fontWeight:600, color:'#5a4a3a', margin:0 }}>Membres ({team.members.length})</h3>
              </div>
              {team.members.length === 0
                ? <div style={{ padding:'32px 16px', textAlign:'center', color:'#c8b8a8', fontSize:13 }}>Aucun membre — partagez un code d'invitation !</div>
                : team.members.map((m,i) => (
                    <div key={m.id} style={{ borderBottom:i<team.members.length-1?'1px solid rgba(232,125,106,.08)':'none' }}>
                      <MemberRow member={m} teams={teams} currentTeamId={team.id} onRemove={(id,name)=>removeMember(team.id,id,name)} onMove={(mid,tid)=>moveMember(mid,tid)} selected={selMember===m.id} onSelect={()=>setSelMember(selMember===m.id?null:m.id)} onObjectives={()=>setObjectiveTarget(m)} onActionPlans={()=>setSelMember(selMember===m.id?null:m.id)}/>
                      {selMember===m.id && (
                        <div style={{ padding:'14px 16px 18px', borderTop:'1px solid #f5f3ff', background:'rgba(253,232,228,.15)', display:'flex', flexDirection:'column', gap:14 }}>
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
            <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#5a4a3a', marginBottom:6 }}>Nom de l'équipe</label>
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
  const mob = useIsMobile();
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:700, color:'#5a4a3a', margin:0 }}>Tableau de bord</h1>
          <p style={{ color:'#6b7280', marginTop:4, fontSize:14 }}>Bonjour, {user.name} 👋</p>
        </div>
        <Btn onClick={()=>navigate('NewDebrief')}>+ Nouveau debrief</Btn>
      </div>
      {!isHOS && <ObjectiveBanner userId={user.id}/>}
      <GamCard gam={gam}/>
      <div>
        <p style={{ fontSize:11, fontWeight:700, color:'#c8b8a8', textTransform:'uppercase', letterSpacing:'.06em', margin:'0 0 10px' }}>📊 Statistiques</p>
        <StatsRow debriefs={debriefs}/>
      </div>
      <div>
        <p style={{ fontSize:11, fontWeight:700, color:'#c8b8a8', textTransform:'uppercase', letterSpacing:'.06em', margin:'0 0 10px' }}>📈 Performance</p>
        <div style={{ display:'grid', gridTemplateColumns:mob?'1fr':'1fr 320px', gap:14, alignItems:'start' }}>
          <Card style={{ padding:20 }}>
            <h2 style={{ fontSize:14, fontWeight:600, color:'#5a4a3a', marginBottom:14 }}>Évolution du score</h2>
            <Chart debriefs={debriefs}/>
          </Card>
          <Leaderboard refreshKey={lbKey}/>
        </div>
      </div>

    {/* Mini Pipeline */}
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <h2 style={{ fontSize:16, fontWeight:700, color:'#5a4a3a', margin:0 }}>🎯 Pipeline</h2>
      </div>
      <MiniPipeline navigate={navigate}/>
    </div>
      {!isHOS && <ActionPlanCard closerId={user.id} isHOS={false} toast={toast}/>}
      <div>
        <p style={{ fontSize:11, fontWeight:700, color:'#c8b8a8', textTransform:'uppercase', letterSpacing:'.06em', margin:'0 0 10px' }}>📋 Derniers debriefs</p>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <h2 style={{ fontSize:16, fontWeight:600, color:'#5a4a3a', margin:0 }}>Derniers debriefs</h2>
          {debriefs.length>5 && <button onClick={()=>navigate('History')} style={{background:'none',border:'none',color:'#e87d6a',fontSize:13,cursor:'pointer'}}>Voir tout ›</button>}
        </div>
        {debriefs.length===0
          ? <Empty icon="📋" title="Aucun debrief" subtitle="Créez votre premier debrief pour suivre vos progrès" action={<Btn variant="secondary" onClick={()=>navigate('NewDebrief')}>+ Créer votre premier debrief</Btn>}/>
          : <div style={{display:'flex',flexDirection:'column',gap:10}}>{debriefs.slice(0,5).map(d=><DebriefCard key={d.id} debrief={d} onClick={()=>navigate('Detail',d.id)} showUser={isHOS}/>)}</div>
        }
      </div>
    </div>
  );
}


// ─── MINI PIPELINE (Dashboard) ────────────────────────────────────────────────
function MiniPipeline({ navigate }) {
  const [deals, setDeals] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => {
    apiFetch('/deals').then(setDeals).catch(()=>{}).finally(()=>setLoading(false));
  }, []);

  if (loading) return <Spinner/>;

  const signed   = deals.filter(d=>d.status==='signe').reduce((s,d)=>s+(d.value||0),0);
  const pipeline = deals.filter(d=>!['signe','perdu'].includes(d.status)).reduce((s,d)=>s+(d.value||0),0);
  const closed   = deals.filter(d=>['signe','perdu'].includes(d.status));
  const winRate  = closed.length ? Math.round(deals.filter(d=>d.status==='signe').length/closed.length*100) : 0;
  const late     = deals.filter(d=>d.follow_up_date && new Date(d.follow_up_date)<new Date() && !['signe','perdu'].includes(d.status)).length;

  const stages = [
    { key:'prospect',     label:'Prospect',   color:'#a09080', bg:'rgba(245,237,230,.6)' },
    { key:'premier_appel',label:'1er appel',  color:'#e87d6a', bg:'rgba(253,232,228,.6)' },
    { key:'relance',      label:'Relance',    color:'#c07830', bg:'rgba(254,243,224,.6)' },
    { key:'negociation',  label:'Négo.',      color:'#3a7a9a', bg:'rgba(218,237,245,.6)' },
    { key:'signe',        label:'Signés ✓',   color:'#5a9858', bg:'rgba(218,240,216,.6)' },
    { key:'perdu',        label:'Perdus',     color:'#c05040', bg:'rgba(253,232,228,.6)' },
  ];

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
        {[
          { label:'CA Signé',  value:`${signed.toLocaleString('fr-FR')} €`,  color:'#5a9858' },
          { label:'Pipeline',  value:`${pipeline.toLocaleString('fr-FR')} €`, color:'#e87d6a' },
          { label:'Taux win',  value:`${winRate}%`,                           color:'#6aacce' },
          { label:'En retard', value:late,                                    color:late>0?'#c05040':'#c8b8a8' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ ...cardSm(), padding:'12px 14px' }}>
            <p style={{ fontSize:10, color:'#c8b8a8', margin:'0 0 4px', textTransform:'uppercase', letterSpacing:'.04em', fontWeight:600 }}>{label}</p>
            <p style={{ fontSize:18, fontWeight:700, color, margin:0 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Mini Kanban */}
      {deals.length > 0 && (
        <div style={{ overflowX:'auto', paddingBottom:4 }}>
          <div style={{ display:'flex', gap:8, minWidth:'max-content' }}>
            {stages.map(st => {
              const cols = deals.filter(d=>d.status===st.key);
              if (!cols.length) return null;
              return (
                <div key={st.key} style={{ minWidth:140, display:'flex', flexDirection:'column', gap:6 }}>
                  <div style={{ background:st.bg, borderRadius:8, padding:'5px 10px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <span style={{ fontSize:11, fontWeight:700, color:st.color }}>{st.label}</span>
                    <span style={{ fontSize:11, fontWeight:700, color:st.color }}>{cols.length}</span>
                  </div>
                  {cols.slice(0,3).map(d => (
                    <div key={d.id} style={{ ...cardSm(), padding:'8px 10px' }}>
                      <p style={{ fontWeight:600, fontSize:12, color:'#5a4a3a', margin:'0 0 3px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.prospect_name}</p>
                      {d.value>0 && <p style={{ fontSize:11, color:'#5a9858', fontWeight:700, margin:0 }}>{d.value.toLocaleString('fr-FR')} €</p>}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <button onClick={()=>navigate('Pipeline')} style={{ ...BTN.secondary, padding:'8px 16px', fontSize:13, borderRadius:R_FULL, alignSelf:'flex-end', cursor:'pointer', fontFamily:'inherit' }}>
        Voir tout le pipeline →
      </button>
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
        <h1 style={{ fontSize:22, fontWeight:700, color:'#5a4a3a', margin:0 }}>Historique</h1>
        <p style={{ color:'#c8b8a8', fontSize:13, marginTop:4 }}>{debriefs.length} debrief{debriefs.length!==1?'s':''}</p>
      </div>
      <div style={{ position:'relative' }}>
        <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#c8b8a8', pointerEvents:'none' }}>🔍</span>
        <input placeholder="Rechercher..." value={q} onChange={e=>setQ(e.target.value)} style={{ width:'100%', padding:'12px 36px', border:'1px solid rgba(232,125,106,.12)', borderRadius:10, fontSize:14, fontFamily:'inherit', outline:'none', boxSizing:'border-box' }}/>
        {q && <button onClick={()=>setQ('')} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#c8b8a8', cursor:'pointer', fontSize:18 }}>✕</button>}
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
      <p style={{ color:'#c8b8a8' }}>Debrief introuvable</p>
      <Btn variant="secondary" onClick={()=>navigate('Dashboard')} style={{ marginTop:16 }}>Retour</Btn>
    </div>
  );
  const pct    = Math.round(debrief.percentage || 0);
  const scores = computeSectionScores(debrief.sections || {});
  const barCol = v => v>=4?'#059669':v>=3?'#d97706':v>=2?'#e87d6a':'#ef4444';
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <Btn variant="secondary" onClick={()=>navigate(fromPage||'Dashboard')} style={{width:36,height:36,padding:0,borderRadius:8,fontSize:16,flexShrink:0}}>←</Btn>
          <div>
            <h1 style={{ fontSize:mob?18:22, fontWeight:700, color:'#5a4a3a', margin:0 }}>{debrief.prospect_name}</h1>
            <div style={{ display:'flex', gap:12, fontSize:12, color:'#c8b8a8', marginTop:4, flexWrap:'wrap' }}>
              <span>📅 {fmtDate(debrief.call_date)}</span>
              <span>👤 {debrief.closer_name}</span>
              {debrief.user_name && <span>par {debrief.user_name}</span>}
            </div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
          <ClosedBadge isClosed={debrief.is_closed}/>
          {debrief.call_link && <a href={debrief.call_link} target="_blank" rel="noopener noreferrer" style={{padding:'6px 12px',border:'1px solid rgba(232,125,106,.12)',borderRadius:8,background:'#ffffff',fontSize:12,textDecoration:'none',color:'#5a4a3a'}}>🔗 Écouter</a>}
          <Btn variant="danger" onClick={()=>onDelete(debrief.id)} style={{width:36,height:36,padding:0,borderRadius:8,fontSize:14}}>🗑</Btn>
        </div>
      </div>

      {mob ? (
        <>
          <Card style={{ padding:20, display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
            <ScoreGauge percentage={pct}/>
            <p style={{ fontSize:13, color:'#c8b8a8', margin:0 }}>{debrief.total_score} / {debrief.max_score} points</p>
            <Radar scores={scores}/>
          </Card>
          <Card style={{ padding:20 }}>
            <h3 style={{ fontSize:14, fontWeight:600, color:'#5a4a3a', marginBottom:16 }}>Score par section</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {SECTIONS.map(({ key, label }) => {
                const val = scores[key]||0;
                return (
                  <div key={key}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:5 }}>
                      <span style={{ fontSize:14, fontWeight:600, color:'#5a4a3a' }}>{label}</span>
                      <span style={{ fontSize:13, fontWeight:700, padding:'2px 8px', borderRadius:6, border:'1px solid rgba(232,125,106,.12)', color:barCol(val) }}>{val}/5</span>
                    </div>
                    <div style={{ height:8, background:'rgba(232,125,106,.1)', borderRadius:4, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${(val/5)*100}%`, background:barCol(val), borderRadius:4, transition:'width .7s' }}/>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'280px 1fr', gap:20, alignItems:'start' }}>
          <Card style={{ padding:24, display:'flex', flexDirection:'column', alignItems:'center', gap:14 }}>
            <ScoreGauge percentage={pct}/>
            <p style={{ fontSize:13, color:'#c8b8a8', margin:0 }}>{debrief.total_score} / {debrief.max_score} points</p>
            <Radar scores={scores}/>
          </Card>
          <Card style={{ padding:24 }}>
            <h3 style={{ fontSize:14, fontWeight:600, color:'#5a4a3a', marginBottom:20 }}>Score par section</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {SECTIONS.map(({ key, label }) => {
                const val = scores[key]||0;
                const sn  = debrief.section_notes?.[key];
                return (
                  <div key={key}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:5 }}>
                      <span style={{ fontSize:13, fontWeight:600, color:'#5a4a3a' }}>{label}</span>
                      <span style={{ fontSize:12, fontWeight:700, padding:'2px 8px', borderRadius:6, border:'1px solid rgba(232,125,106,.12)', color:barCol(val) }}>{val}/5</span>
                    </div>
                    <div style={{ height:8, background:'rgba(232,125,106,.1)', borderRadius:4, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${(val/5)*100}%`, background:barCol(val), borderRadius:4, transition:'width .7s' }}/>
                    </div>
                    {sn && (sn.strength||sn.weakness||sn.improvement) && (
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginTop:8 }}>
                        {sn.strength    && <div style={{fontSize:11,padding:'6px 8px',borderRadius:6,background:'#f0fdf4',border:'1px solid #bbf7d0',color:'#166534'}}>👍 {sn.strength}</div>}
                        {sn.weakness    && <div style={{fontSize:11,padding:'6px 8px',borderRadius:6,background:'#fff5f5',border:'1px solid #fca5a5',color:'#991b1b'}}>👎 {sn.weakness}</div>}
                        {sn.improvement && <div style={{fontSize:11,padding:'6px 8px',borderRadius:6,background:'rgba(255,251,235,.7)',border:'1px solid #fcd34d',color:'#92400e'}}>📈 {sn.improvement}</div>}
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
          {debrief.strengths    && <Card style={{padding:16}}><h3 style={{fontSize:13,fontWeight:600,color:'#059669',marginBottom:8}}>Points forts</h3><p style={{fontSize:13,color:'#6b7280',whiteSpace:'pre-wrap',margin:0}}>{debrief.strengths}</p></Card>}
          {debrief.improvements && <Card style={{padding:16}}><h3 style={{fontSize:13,fontWeight:600,color:'#d97706',marginBottom:8}}>Axes d'amélioration</h3><p style={{fontSize:13,color:'#6b7280',whiteSpace:'pre-wrap',margin:0}}>{debrief.improvements}</p></Card>}
          {debrief.notes        && <Card style={{padding:16}}><h3 style={{fontSize:13,fontWeight:600,color:'#e87d6a',marginBottom:8}}>Notes</h3><p style={{fontSize:13,color:'#6b7280',whiteSpace:'pre-wrap',margin:0}}>{debrief.notes}</p></Card>}
        </div>
      )}

      {/* Comments */}
      {user.role !== 'head_of_sales' && <ActionPlanCard closerId={user.id} isHOS={false} toast={toast}/>}
      <CommentsSection debriefId={debrief.id} user={user} toast={toast}/>
    </div>
  );
}

function NewDebrief({ navigate, onSave, toast }) {
  const [config, , loaded] = useDebriefConfig(); // config = DEFAULT si API échoue
  if (!loaded) return <Spinner full/>;
  const [form, setForm] = useState({ prospect_name:'', call_date: new Date().toISOString().split('T')[0], is_closed:false });
  const [sections, setSections] = useState({});
  const [notes, setNotes] = useState({});
  const [loading, setLoading] = useState(false);
  const mob = useIsMobile();

  const updateSection = (key, data) => setSections(p => ({...p, [key]:data}));
  const updateNotes   = (key, data) => setNotes(p => ({...p, [key]:data}));

  const score = computeScore(sections);
  const pct   = Math.round((score.points / Math.max(score.max,1)) * 100);

  const submit = async e => {
    e && e.preventDefault();
    if (!form.prospect_name.trim()) return toast('Nom du prospect requis', 'error');
    setLoading(true);
    try {
      const res = await apiFetch('/debriefs', { method:'POST', body:{ ...form, sections, notes } });
      onSave(res.debrief, res.gamification);
      toast('Debrief enregistré ! +' + (res.gamification?.pointsEarned||0) + ' pts');
      navigate('Dashboard');
    } catch(e) { toast(e.message, 'error'); } finally { setLoading(false); }
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700, color:TXT, margin:0 }}>Nouveau debrief</h1>
          <p style={{ color:TXT2, fontSize:13, marginTop:4 }}>Analysez votre appel section par section</p>
        </div>
        <Btn variant="secondary" onClick={()=>navigate('Dashboard')}>← Retour</Btn>
      </div>

      {/* Infos prospect */}
      <Card style={{ padding:16 }}>
        <div style={{ display:'grid', gridTemplateColumns:mob?'1fr':'1fr 1fr', gap:12 }}>
          <div>
            <label style={{ display:'block', fontSize:12, fontWeight:600, color:TXT, marginBottom:5 }}>Nom du prospect *</label>
            <Input placeholder="Jean Dupont" value={form.prospect_name} onChange={e=>setForm({...form,prospect_name:e.target.value})} autoFocus/>
          </div>
          <div>
            <label style={{ display:'block', fontSize:12, fontWeight:600, color:TXT, marginBottom:5 }}>Date de l'appel</label>
            <Input type="date" value={form.call_date} onChange={e=>setForm({...form,call_date:e.target.value})}/>
          </div>
        </div>
        <div style={{ marginTop:12, display:'flex', alignItems:'center', gap:10 }}>
          <input type="checkbox" id="is_closed" checked={form.is_closed} onChange={e=>setForm({...form,is_closed:e.target.checked})} style={{ width:16, height:16, accentColor:P, cursor:'pointer' }}/>
          <label htmlFor="is_closed" style={{ fontSize:13, color:TXT, cursor:'pointer' }}>✅ Call closé (vente signée)</label>
        </div>
      </Card>

      {/* Score live */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 16px', background:`linear-gradient(135deg,${P},${P2})`, borderRadius:R_MD, color:'white' }}>
        <span style={{ fontSize:13, fontWeight:600 }}>Score en cours</span>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ height:6, width:120, background:'rgba(255,255,255,.3)', borderRadius:3 }}>
            <div style={{ height:'100%', width:`${pct}%`, background:'white', borderRadius:3, transition:'width .4s' }}/>
          </div>
          <span style={{ fontSize:18, fontWeight:700 }}>{pct}%</span>
        </div>
      </div>

      {/* Sections dynamiques depuis config */}
      {config.map((section, idx) => (
        <CatCard key={section.key} number={String(idx+1)} title={section.title}>
          {section.questions.map(q => {
            const val = (sections[section.key] || {})[q.id];
            const setVal = v => updateSection(section.key, { ...(sections[section.key]||{}), [q.id]: v });
            if (q.type === 'radio') return (
              <RadioGroup key={q.id} label={q.label} options={q.options||[]} value={val} onChange={setVal}/>
            );
            if (q.type === 'checkbox') return (
              <CheckboxGroup key={q.id} label={q.label} options={q.options||[]} value={val||[]} onChange={setVal}/>
            );
            if (q.type === 'text') return (
              <div key={q.id} style={{ marginBottom:16 }}>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:TXT, marginBottom:6 }}>{q.label}</label>
                <Textarea placeholder="Votre réponse..." value={val||''} onChange={e=>setVal(e.target.value)}/>
              </div>
            );
            return null;
          })}
          <SectionNotes notes={notes[section.key]||{}} onChange={d=>updateNotes(section.key,d)}/>
        </CatCard>
      ))}

      {/* Bouton submit */}
      <Btn onClick={submit} disabled={loading} style={{ width:'100%', padding:'14px 20px', fontSize:15 }}>
        {loading ? 'Enregistrement...' : '💾 Enregistrer le debrief'}
      </Btn>
    </div>
  );
}

function UserMenu({ user, gam, onLogout, onSettings, toast, sidebar=false }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);
  return (
    <div ref={ref} style={{ position:'relative', flexShrink:0, width:sidebar?'100%':'auto' }}>
      <button onClick={()=>setOpen(v=>!v)} style={{
        display:'flex', alignItems:'center', gap:8,
        background:open?`rgba(232,125,106,.08)`:WHITE,
        border:'none', borderRadius:R_MD,
        padding: sidebar?'8px 10px':'5px 10px',
        cursor:'pointer', fontFamily:'inherit', transition:'all .15s',
        boxShadow:SH_SM, width:sidebar?'100%':'auto'
      }}>
        <div style={{ width:30, height:30, borderRadius:'50%', background:`linear-gradient(135deg,${P},${A})`, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:12, color:'white', flexShrink:0 }}>
          {user.name?.charAt(0).toUpperCase()}
        </div>
        {(sidebar || !useIsMobile()) && <>
          <div style={{ flex:1, textAlign:'left', minWidth:0 }}>
            <p style={{ fontSize:13, fontWeight:600, color:'#5a4a3a', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user.name}</p>
            <p style={{ fontSize:11, color:'#c8b8a8', margin:0 }}>{user.role==='head_of_sales'?'Head of Sales':'Closer'}</p>
          </div>
          {gam && <span style={{ fontSize:13 }} title={`${gam.level.name} · ${gam.points} pts`}>{gam.level.icon}</span>}
          <span style={{ fontSize:10, color:TXT3 }}>{open?'▲':'▼'}</span>
        </>}
      </button>
      {open && (
        <div style={{
          position:'absolute', right:0,
          bottom: sidebar ? 'calc(100% + 8px)' : 'auto',
          top: sidebar ? 'auto' : 'calc(100% + 6px)',
          background:WHITE, borderRadius:R_LG, boxShadow:SH_HOVERED,
          minWidth:220, zIndex:200, overflow:'hidden'
        }}>
          {/* Header */}
          <div style={{ padding:'14px 16px', borderBottom:`1px solid rgba(232,125,106,.1)`, background:`rgba(253,232,228,.2)` }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:36, height:36, borderRadius:'50%', background:`linear-gradient(135deg,${P},${P2})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:'white', flexShrink:0 }}>
                {user.name?.charAt(0)}
              </div>
              <div>
                <p style={{ fontWeight:600, fontSize:13, color:'#5a4a3a', margin:0 }}>{user.name}</p>
                <p style={{ fontSize:11, color:'#c8b8a8', margin:0 }}>{user.email}</p>
              </div>
            </div>
            {gam && (
              <div style={{ marginTop:10, padding:'7px 10px', background:`linear-gradient(135deg,${P},${P2})`, borderRadius:R_SM, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ fontSize:12, color:'white', fontWeight:500 }}>{gam.level.icon} {gam.level.name}</span>
                <span style={{ fontSize:12, color:'rgba(255,255,255,.85)', fontWeight:600 }}>{gam.points} pts</span>
              </div>
            )}
          </div>
          {/* Items */}
          {[
            { icon:'⚙️', label:'Paramètres du compte', action:()=>{ onSettings(); setOpen(false); } },
            { icon:'🔔', label:'Notifications',         action:()=>{ toast('Bientôt disponible !','info'); setOpen(false); } },
          ].map(({ icon, label, action }) => (
            <button key={label} onClick={action} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'11px 16px', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:13, color:'#5a4a3a', textAlign:'left', transition:'background .1s' }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(253,232,228,.2)'}
              onMouseLeave={e=>e.currentTarget.style.background='none'}>
              <span style={{ fontSize:16, width:20, textAlign:'center' }}>{icon}</span>{label}
            </button>
          ))}
          <div style={{ height:1, background:'rgba(232,125,106,.1)', margin:'4px 0' }}/>
          <button onClick={()=>{ onLogout(); setOpen(false); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'11px 16px', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:13, color:'#c05040', textAlign:'left', transition:'background .1s' }}
            onMouseEnter={e=>e.currentTarget.style.background='rgba(253,232,228,.2)'}
            onMouseLeave={e=>e.currentTarget.style.background='none'}>
            <span style={{ fontSize:16, width:20, textAlign:'center' }}>↩</span>Déconnexion
          </button>
        </div>
      )}
    </div>
  );
}
function ProgBar({ label, current, target, color='#e87d6a' }) {
  if (!target) return null;
  const pct = Math.min(Math.round((current / target) * 100), 100);
  const done = current >= target;
  return (
    <div style={{ flex:1, minWidth:120 }}>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, fontWeight:600, marginBottom:4 }}>
        <span style={{ color:'#5a4a3a' }}>{label}</span>
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
        <p style={{ fontSize:11, fontWeight:600, color:'#6b7280', textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 10px' }}>{label}</p>
        <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
          {obj.target_debriefs > 0 && <ProgBar label="Debriefs" current={p.debriefs||0} target={obj.target_debriefs} color='#e87d6a'/>}
          {obj.target_score    > 0 && <ProgBar label="Score moy." current={p.score||0} target={obj.target_score} color='#d97706'/>}
          {obj.target_closings > 0 && <ProgBar label="Closings" current={p.closings||0} target={obj.target_closings} color='#059669'/>}
          {obj.target_revenue  > 0 && <ProgBar label="CA (€)" current={p.revenue||0} target={obj.target_revenue} color='#8b5cf6'/>}
        </div>
      </div>
    );
  };

  return (
    <div style={{ background:'#ffffff', border:'1px solid rgba(232,125,106,.12)', borderRadius:12, padding:'16px 20px', borderLeft:'4px solid #e87d6a' }}>
      <p style={{ fontSize:13, fontWeight:700, color:'#5a4a3a', margin:'0 0 14px' }}>🎯 Mes objectifs</p>
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
      <div style={{ display:'flex', gap:4, background:'rgba(232,125,106,.06)', padding:4, borderRadius:10, marginBottom:20 }}>
        {[{key:'monthly',label:'📅 Ce mois'},{key:'weekly',label:'📆 Cette semaine'}].map(({key,label}) => (
          <button type="button" key={key} onClick={()=>setTab(key)} style={{ flex:1, padding:'7px 12px', borderRadius:6, border:'none', fontSize:13, fontWeight:500, cursor:'pointer', background:tab===key?'white':'transparent', color:tab===key?'#1e293b':'#64748b', fontFamily:'inherit', boxShadow:tab===key?'0 1px 3px rgba(0,0,0,.08)':'none' }}>{label}</button>
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
            <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#5a4a3a', marginBottom:5 }}>{label}</label>
            <Input type="number" placeholder={ph} value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})}/>
          </div>
        ))}
      </div>
      <p style={{ fontSize:12, color:'#c8b8a8', margin:'0 0 16px' }}>Laissez 0 pour ne pas suivre un indicateur.</p>
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
      <div style={{ padding:'14px 16px', borderBottom:'1px solid rgba(232,125,106,.08)', background:'rgba(255,245,242,.5)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <h3 style={{ fontSize:14, fontWeight:700, color:'#5a4a3a', margin:0 }}>📌 Plan d'action</h3>
          <p style={{ fontSize:11, color:'#c8b8a8', margin:0 }}>{active.length}/3 axe{active.length!==1?'s':''} actif{active.length!==1?'s':''}</p>
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
            <p style={{ color:'#c8b8a8', fontSize:13, textAlign:'center', padding:'12px 0' }}>
              {isHOS ? 'Aucun axe actif. Cliquez "+ Ajouter" pour en définir un.' : "Aucun axe de travail défini pour l'instant."}
            </p>
          )}

          {active.map(plan => (
            <div key={plan.id} style={{ display:'flex', gap:12, padding:'12px 14px', background:'rgba(253,232,228,.15)', borderRadius:10, border:'1px solid rgba(232,125,106,.1)', alignItems:'flex-start' }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:'#e87d6a', marginTop:5, flexShrink:0 }}/>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontWeight:600, fontSize:13, color:'#5a4a3a', margin:'0 0 2px' }}>{plan.axis}</p>
                {plan.description && <p style={{ fontSize:12, color:'#6b7280', margin:0 }}>{plan.description}</p>}
                <p style={{ fontSize:11, color:'#c8b8a8', margin:'4px 0 0' }}>
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
            <div style={{ padding:'14px', background:'#ffffff', borderRadius:10, border:'1px solid rgba(196,181,253,.5)', display:'flex', flexDirection:'column', gap:10 }}>
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
              <p style={{ fontSize:11, color:'#c8b8a8', fontWeight:600, textTransform:'uppercase', letterSpacing:'.04em', marginBottom:8 }}>Récemment résolus</p>
              {resolved.map(plan => (
                <div key={plan.id} style={{ display:'flex', gap:10, padding:'8px 10px', borderRadius:8, alignItems:'center', opacity:.65 }}>
                  <span style={{ color:'#059669', fontSize:12 }}>✓</span>
                  <span style={{ fontSize:12, color:'#6b7280', textDecoration:'line-through', flex:1 }}>{plan.axis}</span>
                  <span style={{ fontSize:11, color:'#c8b8a8' }}>{fmtDate(plan.resolved_at)}</span>
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
      <div style={{ padding:'14px 16px', borderBottom:'1px solid rgba(232,125,106,.08)', background:'rgba(255,245,242,.5)' }}>
        <h3 style={{ fontSize:14, fontWeight:700, color:'#5a4a3a', margin:0 }}>
          💬 Commentaires
          {comments.length > 0 && <span style={{ marginLeft:8, background:'rgba(255,245,242,.85)', color:'#5a4a3a', fontSize:11, fontWeight:600, padding:'2px 7px', borderRadius:10 }}>{comments.length}</span>}
        </h3>
      </div>
      <div style={{ padding:16, display:'flex', flexDirection:'column', gap:12 }}>
        {loading ? <Spinner size={24}/> : comments.length === 0 ? (
          <p style={{ color:'#c8b8a8', fontSize:13, textAlign:'center', padding:'8px 0' }}>Aucun commentaire</p>
        ) : comments.map(c => (
          <div key={c.id} style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
            <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,#e87d6a,#d4604e)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:12, color:'white', flexShrink:0 }}>{c.author_name?.charAt(0)}</div>
            <div style={{ flex:1, background:'rgba(253,232,228,.2)', borderRadius:'0 10px 10px 10px', padding:'10px 14px', border:'1px solid rgba(232,125,106,.12)' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ fontWeight:600, fontSize:12, color:'#5a4a3a' }}>{c.author_name}</span>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:11, color:'#c8b8a8' }}>{fmtDate(c.created_at)}</span>
                  {(c.author_id === user.id || user.role === 'head_of_sales') && (
                    <button onClick={()=>del(c.id)} style={{ background:'none', border:'none', color:'#dc2626', cursor:'pointer', fontSize:12, padding:0 }}>✕</button>
                  )}
                </div>
              </div>
              <p style={{ fontSize:13, color:'#5a4a3a', margin:0, whiteSpace:'pre-wrap', lineHeight:1.5 }}>{c.content}</p>
            </div>
          </div>
        ))}

        {/* Input */}
        <div style={{ display:'flex', gap:10, alignItems:'flex-end', marginTop:4 }}>
          <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,#e87d6a,#d4604e)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:12, color:'white', flexShrink:0 }}>{user.name?.charAt(0)}</div>
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
  { key:'prospect',     label:'Prospects',    color:'#6b7280', bg:'#f1f5f9',  icon:'👤' },
  { key:'premier_appel',label:'1er appel',    color:'#e87d6a', bg:'rgba(253,232,228,.6)',  icon:'📞' },
  { key:'relance',      label:'Relance',      color:'#d97706', bg:'#fef3c7',  icon:'🔄' },
  { key:'negociation',  label:'Négociation',  color:'#e87d6a', bg:'rgba(255,248,245,.8)',  icon:'🤝' },
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
    <div style={{ position:'fixed', inset:0, zIndex:9000, background:'rgba(90,74,58,.2)', display:'flex', alignItems:'flex-end', justifyContent:'center' }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:'#ffffff', borderRadius:'16px 16px 0 0', width:'100%', maxWidth:560, maxHeight:'92vh', overflowY:'auto', boxShadow:'0 -8px 40px rgba(0,0,0,.15)' }}>

        {/* Header */}
        <div style={{ padding:'20px 20px 0', position:'sticky', top:0, background:'#ffffff', zIndex:1 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              {(() => {
                const stage = PIPELINE_STAGES.find(s => s.key === form.status) || PIPELINE_STAGES[0];
                return <span style={{ background:stage.bg, color:stage.color, fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:20 }}>{stage.icon} {stage.label}</span>;
              })()}
            </div>
            <div style={{ display:'flex', gap:8 }}>
              {!isNew && <button onClick={del} disabled={deleting} style={{ background:'#fee2e2', border:'none', color:'#dc2626', borderRadius:8, padding:'6px 12px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>🗑 Supprimer</button>}
              <button onClick={onClose} style={{ background:'none', border:'none', color:'#c8b8a8', cursor:'pointer', fontSize:22, lineHeight:1, padding:'2px 6px' }}>✕</button>
            </div>
          </div>
          {/* Nom prospect */}
          <input
            placeholder="Nom du prospect *"
            value={form.prospect_name}
            onChange={e=>setForm({...form,prospect_name:e.target.value})}
            style={{ width:'100%', fontSize:20, fontWeight:700, color:'#5a4a3a', border:'none', outline:'none', borderBottom:'2px solid #e2e8f0', paddingBottom:10, marginBottom:16, fontFamily:'inherit', boxSizing:'border-box', background:'#f5ede6' }}
            onFocus={e=>e.target.style.borderBottomColor='#e87d6a'}
            onBlur={e=>e.target.style.borderBottomColor='#e2e8f0'}
          />
        </div>

        <div style={{ padding:'0 20px 24px', display:'flex', flexDirection:'column', gap:20 }}>

          {/* Statut */}
          <div>
            <label style={{ display:'block', fontSize:11, fontWeight:600, color:'#6b7280', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:8 }}>Statut</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {PIPELINE_STAGES.map(s => (
                <button key={s.key} onClick={()=>setForm({...form,status:s.key})}
                  style={{ padding:'6px 14px', borderRadius:20, border:`1.5px solid ${form.status===s.key?s.color:'#e2e8f0'}`, background:form.status===s.key?s.bg:'white', color:form.status===s.key?s.color:'#6b7280', fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:'inherit', transition:'all .15s' }}>
                  {s.icon} {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Infos clés */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:600, color:'#6b7280', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:6 }}>💶 CA (€)</label>
              <input type="number" placeholder="0" value={form.value} onChange={e=>setForm({...form,value:e.target.value})}
                style={{ width:'100%', borderRadius:8, border:'1px solid rgba(232,125,106,.12)', padding:'10px 12px', fontSize:14, fontFamily:'inherit', outline:'none', boxSizing:'border-box', background:'#f5ede6', color:'#5a4a3a' }}
                onFocus={e=>e.target.style.borderColor='#e87d6a'} onBlur={e=>e.target.style.borderColor='#e2e8f0'}/>
            </div>
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:600, color:'#6b7280', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:6 }}>📅 Relance</label>
              <input type="date" value={form.follow_up_date} onChange={e=>setForm({...form,follow_up_date:e.target.value})}
                style={{ width:'100%', borderRadius:8, border:'1px solid rgba(232,125,106,.12)', padding:'10px 12px', fontSize:14, fontFamily:'inherit', outline:'none', boxSizing:'border-box', background:'#f5ede6', color:'#5a4a3a' }}
                onFocus={e=>e.target.style.borderColor='#e87d6a'} onBlur={e=>e.target.style.borderColor='#e2e8f0'}/>
            </div>
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:600, color:'#6b7280', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:6 }}>📥 Source</label>
              <input placeholder="LinkedIn, Inbound..." value={form.source} onChange={e=>setForm({...form,source:e.target.value})}
                style={{ width:'100%', borderRadius:8, border:'1px solid rgba(232,125,106,.12)', padding:'10px 12px', fontSize:14, fontFamily:'inherit', outline:'none', boxSizing:'border-box', background:'#f5ede6', color:'#5a4a3a' }}
                onFocus={e=>e.target.style.borderColor='#e87d6a'} onBlur={e=>e.target.style.borderColor='#e2e8f0'}/>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={{ display:'block', fontSize:11, fontWeight:600, color:'#6b7280', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:6 }}>📝 Notes</label>
            <textarea placeholder="Notes libres sur ce lead..." value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} rows={3}
              style={{ width:'100%', borderRadius:10, border:'1px solid rgba(232,125,106,.2)', background:'#ffffff', padding:'10px 14px', fontSize:14, fontFamily:'inherit', outline:'none', resize:'vertical', boxSizing:'border-box', color:'#5a4a3a', boxShadow:'inset 0 1px 4px rgba(100,80,200,.06)' }}
              onFocus={e=>e.target.style.borderColor='#e87d6a'} onBlur={e=>e.target.style.borderColor='#e2e8f0'}/>
          </div>

          {/* Debrief lié */}
          <div>
            <label style={{ display:'block', fontSize:11, fontWeight:600, color:'#6b7280', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:8 }}>📞 Debrief lié</label>
            <select value={form.debrief_id} onChange={e=>setForm({...form,debrief_id:e.target.value})}
              style={{ width:'100%', borderRadius:8, border:'1px solid rgba(232,125,106,.12)', padding:'10px 12px', fontSize:14, fontFamily:'inherit', outline:'none', color:'#5a4a3a', background:'#ffffff', boxSizing:'border-box' }}>
              <option value="">— Aucun debrief lié</option>
              {debriefs.map(d => (
                <option key={d.id} value={d.id}>{d.prospect_name} — {fmtDate(d.call_date)} ({d.percentage}%)</option>
              ))}
            </select>

            {/* Aperçu du debrief lié */}
            {linkedDebrief && (
              <div style={{ marginTop:12, padding:'14px 16px', background:'#ffffff', borderRadius:10, border:'1px solid rgba(196,181,253,.5)' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                  <div>
                    <p style={{ fontWeight:700, fontSize:14, color:'#5a4a3a', margin:0 }}>{linkedDebrief.prospect_name}</p>
                    <p style={{ fontSize:12, color:'#6b7280', margin:'2px 0 0' }}>📅 {fmtDate(linkedDebrief.call_date)} · 👤 {linkedDebrief.closer_name}</p>
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
                  const col = v => v>=4?'#059669':v>=3?'#d97706':v>=2?'#e87d6a':'#ef4444';
                  return (
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                      {SECTIONS.map(({key}) => (
                        <div key={key} style={{ flex:1, minWidth:50 }}>
                          <p style={{ fontSize:10, color:'#6b7280', margin:'0 0 3px', textAlign:'center' }}>{LABELS[key]}</p>
                          <div style={{ height:5, background:'#e2e8f0', borderRadius:3, overflow:'hidden' }}>
                            <div style={{ height:'100%', width:`${(scores[key]/5)*100}%`, background:col(scores[key]), borderRadius:3 }}/>
                          </div>
                          <p style={{ fontSize:10, color:col(scores[key]), fontWeight:700, margin:'2px 0 0', textAlign:'center' }}>{scores[key]}/5</p>
                        </div>
                      ))}
                    </div>
                  );
                })()}
                {linkedDebrief.notes && <p style={{ fontSize:12, color:'#6b7280', margin:'10px 0 0', fontStyle:'italic' }}>"{linkedDebrief.notes}"</p>}
              </div>
            )}
          </div>

          {/* Sync iClosed */}
          {!isNew && (
            <button onClick={async()=>{
              try {
                await apiFetch('/zapier/push-deal', {method:'POST', body:{deal_id:deal.id}});
                toast('Synchronisé avec iClosed !');
              } catch(e){ toast(e.message,'error'); }
            }} style={{ width:'100%', padding:'10px', borderRadius:50, background:'white', border:'1px solid rgba(232,125,106,.2)', color:'#b09080', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', boxShadow:SH_SM, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              <span>🔄</span> Synchroniser avec iClosed
            </button>
          )}

          {/* Bouton save */}
          <button onClick={save} disabled={saving||!form.prospect_name.trim()}
            style={{ width:'100%', padding:'14px', borderRadius:12, background:'#e87d6a', color:'white', border:'none', fontSize:15, fontWeight:700, cursor:saving||!form.prospect_name.trim()?'not-allowed':'pointer', opacity:saving||!form.prospect_name.trim()?.55:1, fontFamily:'inherit', transition:'opacity .15s' }}>
            {saving ? 'Enregistrement...' : isNew ? 'Créer le lead' : 'Enregistrer les modifications'}
          </button>

        </div>
      </div>
    </div>
  );
}

// ─── DEAL CARD — Option C Rich ────────────────────────────────────────────────
function DealCard({ deal, onOpen, onMove }) {
  const [showMenu, setShowMenu] = useState(false);
  const [dragging, setDragging] = useState(false);
  const draggedRef = useRef(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const h = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const isOverdue = deal.follow_up_date && new Date(deal.follow_up_date) < new Date() && !['signe','perdu'].includes(deal.status);
  const stage = PIPELINE_STAGES.find(s => s.key === deal.status) || PIPELINE_STAGES[0];

  // Score du debrief lié
  const scoreVal = deal.debrief_score != null ? deal.debrief_score : null;
  const scoreColor = scoreVal == null ? '#c8b8a8' : scoreVal >= 80 ? '#5a9858' : scoreVal >= 60 ? '#c07830' : '#c05040';

  const fmtDate = d => { try { return new Date(d).toLocaleDateString('fr-FR',{day:'2-digit',month:'short'}); } catch { return d; }};

  return (
    <div
      draggable
      onDragStart={e => { e.dataTransfer.setData('dealId', String(deal.id)); draggedRef.current = true; setDragging(true); e.dataTransfer.effectAllowed = 'move'; }}
      onDragEnd={() => { setDragging(false); setTimeout(() => { draggedRef.current = false; }, 100); }}
      onClick={() => { if (!draggedRef.current) onOpen(deal); }}
      style={{ background:'#ffffff', borderRadius:12, boxShadow:dragging ? '0 12px 32px rgba(232,125,106,.25)' : SH_SM, border:`1px solid ${isOverdue ? 'rgba(192,80,64,.25)' : 'rgba(232,125,106,.08)'}`, padding:'12px 14px', cursor:'grab', transition:'all .15s', opacity:dragging ? .5 : 1, transform:dragging ? 'rotate(2deg) scale(1.02)' : 'none', userSelect:'none' }}
      onMouseEnter={e => { if (!dragging) e.currentTarget.style.boxShadow = SH_HOVERED; }}
      onMouseLeave={e => { if (!dragging) e.currentTarget.style.boxShadow = SH_SM; }}>

      {/* Ligne 1 — Nom + menu */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
        <p style={{ fontWeight:700, fontSize:14, color:TXT, margin:0, flex:1, marginRight:8, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{deal.prospect_name}</p>
        <div ref={menuRef} style={{ position:'relative', flexShrink:0 }}>
          <button onClick={e => { e.stopPropagation(); setShowMenu(v => !v); }}
            style={{ background:'none', border:'none', color:TXT3, cursor:'pointer', fontSize:18, padding:'0 2px', lineHeight:1, fontFamily:'inherit' }}>⋮</button>
          {showMenu && (
            <div style={{ position:'absolute', right:0, top:'calc(100% + 4px)', background:'#ffffff', borderRadius:R_MD, boxShadow:SH_HOVERED, minWidth:170, zIndex:100, overflow:'hidden' }}>
              {PIPELINE_STAGES.filter(s => s.key !== deal.status).map(s => (
                <button key={s.key} onClick={e => { e.stopPropagation(); onMove(deal.id, s.key); setShowMenu(false); }}
                  style={{ width:'100%', display:'flex', alignItems:'center', gap:8, padding:'9px 14px', background:'none', border:'none', fontSize:12, cursor:'pointer', fontFamily:'inherit', color:TXT, textAlign:'left' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(253,232,228,.2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                  <span style={{ fontSize:13 }}>{s.icon}</span> → {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Ligne 2 — CA + source */}
      <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:10 }}>
        <p style={{ fontSize:14, fontWeight:700, color:'#5a9858', margin:0 }}>
          {deal.value > 0 ? `${deal.value.toLocaleString('fr-FR')} €` : <span style={{ color:TXT3, fontSize:12, fontWeight:400 }}>Aucun CA</span>}
        </p>
        {deal.source && <span style={{ fontSize:11, color:TXT3 }}>{deal.source}</span>}
      </div>

      {/* Barre score debrief */}
      <div style={{ marginBottom:10 }}>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:TXT3, marginBottom:3 }}>
          <span>Score debrief</span>
          <span style={{ color:scoreColor, fontWeight:700 }}>{scoreVal != null ? `${scoreVal}%` : 'Aucun'}</span>
        </div>
        <div style={{ height:4, background:'#f0e8e0', borderRadius:2 }}>
          {scoreVal != null && <div style={{ height:'100%', width:`${scoreVal}%`, background:`linear-gradient(90deg,${P},${P2})`, borderRadius:2, transition:'width .5s' }}/>}
        </div>
      </div>

      {/* Ligne 3 — Closer + date */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontSize:11, color:TXT3 }}>{deal.user_name || '—'}</span>
        {deal.follow_up_date && (
          <span style={{ fontSize:11, fontWeight:isOverdue ? 700 : 400, color:isOverdue ? '#c05040' : TXT3 }}>
            {isOverdue ? '⚠ ' : ''}{fmtDate(deal.follow_up_date)}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── DROP COLUMN — Kanban desktop ─────────────────────────────────────────────
function DropColumn({ stage, deals, onOpen, onMove }) {
  const [over, setOver] = useState(false);
  return (
    <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', gap:8 }}>
      {/* Header — sans montant */}
      <div style={{ padding:'8px 12px', background:stage.bg, borderRadius:R_SM, display:'flex', alignItems:'center', justifyContent:'space-between', borderLeft:`3px solid ${stage.color}` }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ fontSize:13 }}>{stage.icon}</span>
          <span style={{ fontSize:12, fontWeight:700, color:stage.color }}>{stage.label}</span>
        </div>
        <span style={{ background:'#ffffff', color:stage.color, fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:R_FULL, minWidth:22, textAlign:'center' }}>{deals.length}</span>
      </div>

      {/* Zone de drop */}
      <div
        onDragOver={e => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={e => { e.preventDefault(); setOver(false); const id = e.dataTransfer.getData('dealId'); if (id) onMove(id, stage.key); }}
        style={{ display:'flex', flexDirection:'column', gap:8, minHeight:100, padding:over ? 6 : 0, background:over ? stage.bg : 'transparent', borderRadius:R_SM, border:`2px dashed ${over ? stage.color : 'transparent'}`, transition:'all .15s' }}>
        {deals.map(deal => <DealCard key={deal.id} deal={deal} onOpen={onOpen} onMove={onMove}/>)}
        {deals.length === 0 && !over && (
          <div style={{ border:`2px dashed rgba(232,125,106,.15)`, borderRadius:R_SM, padding:'20px 10px', textAlign:'center', color:TXT3, fontSize:11 }}>
            Déposez ici
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ACCORDION COLUMN — Mobile ─────────────────────────────────────────────────
function AccordionColumn({ stage, deals, onOpen, onMove }) {
  const [open, setOpen] = useState(deals.length > 0);
  return (
    <div style={{ borderRadius:R_MD, overflow:'hidden', border:`1px solid rgba(232,125,106,.1)`, background:'#ffffff', boxShadow:SH_SM }}>
      <button onClick={() => setOpen(v => !v)} style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', background:open ? stage.bg : '#ffffff', border:'none', cursor:'pointer', fontFamily:'inherit', transition:'background .2s' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:14 }}>{stage.icon}</span>
          <span style={{ fontSize:13, fontWeight:700, color:stage.color }}>{stage.label}</span>
          <span style={{ background:'#ffffff', color:stage.color, fontSize:11, fontWeight:700, padding:'1px 8px', borderRadius:R_FULL }}>{deals.length}</span>
        </div>
        <span style={{ color:TXT3, fontSize:12, transition:'transform .2s', display:'inline-block', transform:open ? 'rotate(180deg)' : 'none' }}>▼</span>
      </button>
      {open && (
        <div style={{ padding:'8px 12px 12px', display:'flex', flexDirection:'column', gap:8, borderTop:`1px solid rgba(232,125,106,.08)` }}>
          {deals.length === 0
            ? <p style={{ fontSize:12, color:TXT3, textAlign:'center', padding:'12px 0' }}>Aucun lead dans cette catégorie</p>
            : deals.map(deal => <DealCard key={deal.id} deal={deal} onOpen={onOpen} onMove={onMove}/>)
          }
        </div>
      )}
    </div>
  );
}

// ─── PIPELINE PAGE ─────────────────────────────────────────────────────────────
function PipelinePage({ user, toast, debriefs }) {
  const [deals, setDeals]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [openLead, setOpenLead] = useState(null);
  const [filter, setFilter]     = useState('all');
  const mob = useIsMobile();

  useEffect(() => {
    apiFetch('/deals').then(setDeals).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onFocus = () => apiFetch('/deals').then(setDeals).catch(() => {});
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const handleSave   = (deal, isEdit) => setDeals(prev => isEdit ? prev.map(d => d.id === deal.id ? deal : d) : [deal, ...prev]);
  const handleMove   = async (id, status) => {
    // Optimistic update
    setDeals(prev => prev.map(d => d.id === id || d.id === String(id) ? { ...d, status } : d));
    try {
      const updated = await apiFetch(`/deals/${id}`, { method:'PATCH', body:{ status } });
      setDeals(prev => prev.map(d => d.id === updated.id ? updated : d));
    } catch(e) {
      toast(e.message, 'error');
      apiFetch('/deals').then(setDeals).catch(() => {});
    }
  };
  const handleDelete = id => setDeals(prev => prev.filter(d => d.id !== id));

  const isHOS = user.role === 'head_of_sales';
  const closers = [...new Map(deals.filter(d => d.user_id).map(d => [d.user_id, { id:d.user_id, name:d.user_name }])).values()];
  const displayDeals = filter === 'all' ? deals : deals.filter(d => d.user_id === filter);

  const signed   = deals.filter(d => d.status === 'signe');
  const active   = deals.filter(d => !['signe','perdu'].includes(d.status));
  const closed   = deals.filter(d => ['signe','perdu'].includes(d.status));
  const overdue  = active.filter(d => d.follow_up_date && new Date(d.follow_up_date) < new Date());
  const winRate  = closed.length ? Math.round(signed.length / closed.length * 100) : 0;
  const totalCA  = signed.reduce((s,d) => s + (d.value||0), 0);
  const totalPipe = active.reduce((s,d) => s + (d.value||0), 0);

  if (loading) return <Spinner full/>;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700, color:TXT, margin:0 }}>Pipeline</h1>
          <p style={{ color:TXT2, fontSize:13, marginTop:4 }}>{deals.length} lead{deals.length !== 1 ? 's' : ''}</p>
        </div>
        <Btn onClick={() => setOpenLead({})}>+ Nouveau lead</Btn>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:mob ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap:10 }}>
        {[
          { label:'CA Signé',  value:`${totalCA.toLocaleString('fr-FR')} €`,   color:'#5a9858', bg:'rgba(218,240,216,.5)' },
          { label:'Pipeline',  value:`${totalPipe.toLocaleString('fr-FR')} €`, color:P,         bg:'rgba(253,232,228,.5)' },
          { label:'Taux win',  value:`${winRate}%`,                            color:'#c07830',  bg:'rgba(254,243,224,.5)' },
          { label:'En retard', value:overdue.length,                           color:overdue.length > 0 ? '#c05040' : TXT3, bg:overdue.length > 0 ? 'rgba(253,232,228,.5)' : 'rgba(245,237,230,.3)' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} style={{ ...cardSm(), padding:'14px 16px' }}>
            <p style={{ fontSize:10, color:TXT3, margin:'0 0 5px', textTransform:'uppercase', letterSpacing:'.05em', fontWeight:600 }}>{label}</p>
            <p style={{ fontSize:20, fontWeight:700, color, margin:0 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filtre closer HOS */}
      {isHOS && closers.length > 1 && (
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {[{ id:'all', name:'Tous' }, ...closers].map(c => (
            <button key={c.id} onClick={() => setFilter(c.id)}
              style={{ padding:'6px 14px', borderRadius:R_FULL, border:`1.5px solid ${filter === c.id ? P : 'rgba(232,125,106,.2)'}`, background:filter === c.id ? 'rgba(253,232,228,.6)' : WHITE, color:filter === c.id ? P2 : TXT2, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', transition:'all .15s' }}>
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Kanban desktop / Accordéon mobile */}
      {deals.length === 0 ? (
        <Empty icon="🎯" title="Pipeline vide" subtitle="Créez votre premier lead pour commencer" action={<Btn onClick={() => setOpenLead({})}>+ Créer un lead</Btn>}/>
      ) : mob ? (
        /* ── MOBILE : accordéon ── */
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {PIPELINE_STAGES.map(stage => (
            <AccordionColumn key={stage.key} stage={stage} deals={displayDeals.filter(d => d.status === stage.key)} onOpen={setOpenLead} onMove={handleMove}/>
          ))}
        </div>
      ) : (
        /* ── DESKTOP : kanban ── */
        <div style={{ overflowX:'auto', paddingBottom:8 }}>
          <div style={{ display:'flex', gap:12, minWidth:`${PIPELINE_STAGES.length * 190}px` }}>
            {PIPELINE_STAGES.map(stage => (
              <DropColumn key={stage.key} stage={stage} deals={displayDeals.filter(d => d.status === stage.key)} onOpen={setOpenLead} onMove={handleMove}/>
            ))}
          </div>
        </div>
      )}

      {/* Fiche lead */}
      {openLead !== null && (
        <LeadSheet
          deal={openLead?.id ? openLead : null}
          debriefs={debriefs || []}
          onClose={() => setOpenLead(null)}
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

  // Clean dark mode residue
  useEffect(() => {
    localStorage.removeItem('cd_dark');
    document.documentElement.removeAttribute('data-theme');
  }, []);

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
    { key:'Pipeline',  label:'Pipeline',  icon:'🎯' },
    ...(isHOS ? [{ key:'HOSPage', label:'Équipe', icon:'👥' }] : []),
    { key:'NewDebrief', label:'Debrief',  icon:'📞' },
    { key:'History',   label:'Historique', icon:'🕐' },
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
  const Content = () => (
    <>
      {page==='Dashboard' && <Dashboard debriefs={debriefs} navigate={navigate} user={user} gam={gam} lbKey={lbKey} toast={toast}/>}
      {page==='NewDebrief' && <NewDebrief navigate={navigate} onSave={onSave} toast={toast}/>}
      {page==='History'   && <History debriefs={debriefs} navigate={navigate} user={user}/>}
      {page==='Detail'    && <Detail debrief={selDebrief} navigate={navigate} onDelete={onDelete} fromPage={from} user={user} toast={toast}/>}
      {page==='Pipeline'  && <PipelinePage user={user} toast={toast} debriefs={debriefs}/>}
      {page==='HOSPage' && isHOS && <HOSPage toast={toast} leaderboardKey={lbKey} allDebriefs={debriefs}/>}
    </>
  );

  return (
    <div style={{ minHeight:'100vh', background:"linear-gradient(160deg,#f5ede6 0%,#e8f0f5 100%)", fontFamily:"'Inter',system-ui,sans-serif" }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        *{box-sizing:border-box;margin:0;padding:0}
        html{background:#f5ede6;min-height:100%}
        body{background:linear-gradient(160deg,#f5ede6 0%,#e8f0f5 100%);min-height:100vh;min-width:100vw}
        #root{min-height:100vh;min-width:100vw;background:transparent}
        input,select,textarea,button{-webkit-appearance:none;touch-action:manipulation}
        input[type=date]::-webkit-calendar-picker-indicator{filter:opacity(0.5)}
        ::placeholder{color:rgba(180,150,120,.5)!important}
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-thumb{background:rgba(232,125,106,.3);border-radius:3px}
        ::-webkit-scrollbar-track{background:transparent}
      `}</style>

      {burst && <Burst points={burst.points} levelUp={burst.levelUp} newLevel={burst.newLevel} onDone={()=>setBurst(null)}/>}
      <Toasts list={toasts}/>
      {showSettings && <AccountSettings user={user} onClose={()=>setShowSettings(false)} toast={toast}/>}

      {mob ? (
        <>
          <header style={{ position:'sticky', top:0, zIndex:50, background:'#fff8f4', borderBottom:'1px solid rgba(232,125,106,.12)', boxShadow:'0 2px 10px rgba(174,130,100,.08)' }}>
            <div style={{ padding:'0 14px', display:'flex', alignItems:'center', justifyContent:'space-between', height:52 }}>
              <button onClick={()=>navigate('Dashboard')} style={{ display:'flex', alignItems:'center', gap:8, background:'none', border:'none', cursor:'pointer', padding:0, fontFamily:'inherit' }}>
                <div style={{ width:30, height:30, borderRadius:8, background:`linear-gradient(135deg,${P},${P2})`, boxShadow:SH_BTN, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>📞</div>
                <span style={{ fontSize:14, fontWeight:700, color:TXT }}>CloserDebrief</span>
              </button>
              <UserMenu user={user} gam={gam} onLogout={onLogout} onSettings={()=>setShowSettings(true)} toast={toast}/>
            </div>
          </header>
          <main style={{ padding:'16px 14px 90px' }}>
            {dataLoading ? <Spinner full/> : <Content/>}
          </main>
          <nav style={{ position:'fixed', bottom:0, left:0, right:0, background:'#fff8f4', borderTop:'1px solid rgba(232,125,106,.12)', boxShadow:'0 -3px 12px rgba(174,130,100,.08)', display:'flex', alignItems:'center', justifyContent:'space-around', padding:`6px 0 max(8px,env(safe-area-inset-bottom))`, zIndex:40 }}>
            {navItems.map(({ key, label, icon }) => (
              <button key={key} onClick={()=>navigate(key)} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2, background:'none', border:'none', cursor:'pointer', padding:'4px 10px', fontFamily:'inherit', flex:1 }}>
                <div style={{ width:36, height:28, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, background:page===key?`linear-gradient(135deg,${P},${P2})`:'transparent', boxShadow:page===key?SH_BTN:'none', transition:'all .2s' }}>{icon}</div>
                <span style={{ fontSize:10, fontWeight:600, color:page===key?P:TXT3 }}>{label}</span>
              </button>
            ))}
          </nav>
        </>
      ) : (
        <div style={{ display:'flex', minHeight:'100vh' }}>
          <aside style={{ width:220, flexShrink:0, position:'sticky', top:0, height:'100vh', display:'flex', flexDirection:'column', background:'#fff8f4', borderRight:'1px solid rgba(232,125,106,.12)', boxShadow:'4px 0 14px rgba(174,130,100,.08)', padding:'18px 10px', zIndex:40 }}>
            <button onClick={()=>navigate('Dashboard')} style={{ display:'flex', alignItems:'center', gap:10, background:'none', border:'none', cursor:'pointer', padding:'10px 12px', borderRadius:R_MD, marginBottom:20, fontFamily:'inherit', width:'100%', transition:'background .15s' }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(232,125,106,.07)'}
              onMouseLeave={e=>e.currentTarget.style.background='none'}>
              <div style={{ width:34, height:34, borderRadius:10, background:`linear-gradient(135deg,${P},${P2})`, boxShadow:SH_BTN, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>📞</div>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:TXT }}>CloserDebrief</div>
                <div style={{ fontSize:10, color:TXT3 }}>Sales OS</div>
              </div>
            </button>
            <div style={{ display:'flex', flexDirection:'column', gap:3, flex:1 }}>
              {navItems.map(({ key, label, icon }) => (
                <button key={key} onClick={()=>navigate(key)}
                  style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:R_MD, border:'none', fontSize:13, fontWeight:page===key?700:500, cursor:'pointer', transition:'all .18s', background:page===key?`linear-gradient(135deg,${P},${P2})`:'transparent', color:page===key?'white':TXT2, boxShadow:page===key?SH_BTN:'none', fontFamily:'inherit', textAlign:'left', width:'100%' }}
                  onMouseEnter={e=>{ if(page!==key) e.currentTarget.style.background='rgba(232,125,106,.08)'; }}
                  onMouseLeave={e=>{ if(page!==key) e.currentTarget.style.background='transparent'; }}>
                  <span style={{ fontSize:16, width:22, textAlign:'center' }}>{icon}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
            <div style={{ borderTop:'1px solid rgba(232,125,106,.1)', paddingTop:12, marginTop:8 }}>
              <UserMenu user={user} gam={gam} onLogout={onLogout} onSettings={()=>setShowSettings(true)} toast={toast} sidebar/>
            </div>
          </aside>
          <main style={{ flex:1, minWidth:0, padding:'28px 40px', overflowX:'hidden' }}>
            {dataLoading ? <Spinner full/> : <Content/>}
          </main>
        </div>
      )}
    </div>
  );
}
