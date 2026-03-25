import React, { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from '../api.js';
import { P, P2, A, TXT, TXT2, TXT3, SAND, WHITE, SH_CARD, SH_SM, SH_BTN, SH_IN, SH_HOVERED, R_SM, R_MD, R_LG, R_XL, R_FULL, card, cardSm, inp, BTN, DS, DEFAULT_DEBRIEF_CONFIG, PIPELINE_STAGES, SECTIONS } from '../constants.js';
import { fmtDate, fmtShort, computeScore, computeSectionScores, computeLevel, avgSectionScores } from '../utils.js';
import { useIsMobile, useToast, useDebriefConfig } from '../hooks.js';

import { Btn, Card, Spinner, Empty } from './ui.jsx';

export function ScoreGauge({ percentage, size='lg' }) {
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

export function ScoreBadge({ pct }) {
  const s = pct>=80?{bg:'rgba(209,250,229,.85)',c:'#065f46',b:'rgba(110,231,183,.6)'}:pct>=60?{bg:'rgba(254,243,199,.85)',c:'#92400e',b:'rgba(252,211,77,.6)'}:pct>=40?{bg:'rgba(237,233,254,.85)',c:'#4c1d95',b:'rgba(196,181,253,.6)'}:{bg:'rgba(254,226,226,.85)',c:'#991b1b',b:'rgba(252,165,165,.6)'};
  return <span style={{ background:s.bg, color:s.c, border:`1px solid ${s.b}`, padding:'3px 10px', borderRadius:8, fontWeight:700, fontSize:13, whiteSpace:'nowrap' }}>{pct}%</span>;
}

export function ClosedBadge({ isClosed }) {
  if (isClosed === null || isClosed === undefined) return null;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'5px 10px', borderRadius:8, fontSize:12, fontWeight:600, whiteSpace:'nowrap', background:isClosed?'#d1fae5':'#fee2e2', color:isClosed?'#065f46':'#991b1b' }}>
      {isClosed ? '✓ Closer' : '✗ Non Closer'}
    </span>
  );
}

// ─── RADAR (5 sections exactes) ───────────────────────────────────────────────


export function Radar({ scores, color='#e87d6a', size=220 }) {
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


export function SectionBars({ scores, globalScores }) {
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

export function GamCard({ gam }) {
  if (!gam) return null;
  const { points, level, badges } = gam;
  const pct = level.next ? Math.min(Math.round(((points-level.min)/(level.next-level.min))*100), 100) : 100;
  return (
    <div style={{ background:'linear-gradient(135deg,#e87d6a,#d4604e)', borderRadius:16, padding:20, color:'white' }}>
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
            <div style={{ height:'100%', width:`${pct}%`, background:WHITE, borderRadius:4, transition:'width .7s' }}/>
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


export function Leaderboard({ refreshKey }) {
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

export function StatsRow({ debriefs }) {
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

export function Chart({ debriefs }) {
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

export function RadioGroup({ label, options, value, onChange }) {
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

export function CheckboxGroup({ label, options, value=[], onChange }) {
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

export function SectionNotes({ notes={}, onChange }) {
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

// ─── DEFAULT DEBRIEF CONFIG ───────────────────────────────────────────────────

// useDebriefConfig : appelé UNIQUEMENT dans App, jamais dans composants conditionnels


export function CatCard({ number, title, children }) {
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
export function S1({ data={}, onChange, notes, onNotes }) {
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
export function S2({ data={}, onChange, notes, onNotes }) {
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
export function S3({ data={}, onChange, notes, onNotes }) {
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
export function S4({ data={}, onChange, notes, onNotes }) {
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
export function S5({ data={}, onChange, notes, onNotes }) {
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

export function DebriefCard({ debrief, onClick, showUser }) {
  const [hov, setHov] = useState(false);
  const pct = Math.round(debrief.percentage || 0);
  return (
    <div onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ background:WHITE, border:`1px solid ${hov?'rgba(232,125,106,.2)':'rgba(255,255,255,.9)'}`, borderRadius:R_LG, padding:'14px 16px', cursor:'pointer', transition:'all .15s', boxShadow:hov?'0 6px 24px rgba(232,125,106,.15), 0 2px 6px rgba(232,125,106,.1)':'0 2px 8px rgba(100,80,200,.07)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
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
