import { useState, useEffect, useCallback } from "react";

const API_BASE = 'https://closer-backend-production.up.railway.app/api';

function getToken() { return localStorage.getItem('closer_token'); }
function setToken(t) { localStorage.setItem('closer_token', t); }
function clearToken() { localStorage.removeItem('closer_token'); }

let _onSessionExpired = null;
async function apiFetch(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json();
  if (res.status === 401) { clearToken(); if (_onSessionExpired) _onSessionExpired(); throw new Error(data.error || 'Session expirée'); }
  if (!res.ok) throw new Error(data.error || 'Erreur serveur');
  return data;
}

// ─── SCORE LOCAL ──────────────────────────────────────────────────────────────
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
  count(d.douleur_surface,'oui',1); count(d.douleur_profonde,['oui','partiel'],1);
  count(d.couches_douleur,['couche1','couche2','couche3'],3);
  count(d.temporalite,'oui',1); count(d.urgence,['oui','artificielle'],1);
  const r = sections.reformulation || {};
  count(r.reformulation,['oui','partiel'],1); count(r.prospect_reconnu,['oui','moyen'],1);
  count(r.couches_reformulation,['physique','quotidien','identitaire'],3);
  const p = sections.projection || {};
  count(p.projection_posee,'oui',1); count(p.qualite_reponse,['forte','moyenne'],1); count(p.deadline_levier,'oui',1);
  const o = sections.offre || {};
  count(o.colle_douleurs,['oui','partiel'],1); count(o.exemples_transformation,['oui','moyen'],1); count(o.duree_justifiee,['oui','partiel'],1);
  const c = sections.closing || {};
  count(c.annonce_prix,'directe',1); count(c.silence_prix,'oui',1); count(c.douleur_reancree,'oui',1); count(c.objection_isolee,'oui',1);
  count(c.resultat_closing,['close','retrograde','relance'],1);
  return { total: points, max, percentage: max > 0 ? Math.round((points / max) * 100) : 0 };
}

// ─── SCORES PAR SECTION (5 sections uniquement) ───────────────────────────────
function computeSectionScores(sections) {
  const s = sections || {};
  const score = (pts, max) => max > 0 ? Math.round((pts / max) * 5) : 0;

  const d = s.decouverte || {};
  let dPts = 0;
  if (d.douleur_surface === 'oui') dPts++;
  if (['oui','partiel'].includes(d.douleur_profonde)) dPts++;
  if (Array.isArray(d.couches_douleur)) dPts += Math.min(d.couches_douleur.length, 3);
  if (d.temporalite === 'oui') dPts++;
  if (['oui','artificielle'].includes(d.urgence)) dPts++;

  const r = s.reformulation || {};
  let rPts = 0;
  if (['oui','partiel'].includes(r.reformulation)) rPts++;
  if (['oui','moyen'].includes(r.prospect_reconnu)) rPts++;
  if (Array.isArray(r.couches_reformulation)) rPts += Math.min(r.couches_reformulation.length, 3);

  const p = s.projection || {};
  let pPts = 0;
  if (p.projection_posee === 'oui') pPts++;
  if (['forte','moyenne'].includes(p.qualite_reponse)) pPts++;
  if (p.deadline_levier === 'oui') pPts++;

  const o = s.offre || {};
  let oPts = 0;
  if (['oui','partiel'].includes(o.colle_douleurs)) oPts++;
  if (['oui','moyen'].includes(o.exemples_transformation)) oPts++;
  if (['oui','partiel'].includes(o.duree_justifiee)) oPts++;

  const c = s.closing || {};
  let cPts = 0;
  if (c.annonce_prix === 'directe') cPts++;
  if (c.silence_prix === 'oui') cPts++;
  if (c.douleur_reancree === 'oui') cPts++;
  if (c.objection_isolee === 'oui') cPts++;
  if (['close','retrograde','relance'].includes(c.resultat_closing)) cPts++;

  return {
    decouverte:         score(dPts, 7),
    reformulation:      score(rPts, 5),
    projection:         score(pPts, 3),
    presentation_offre: score(oPts, 3),
    closing:            score(cPts, 5),
  };
}

// ─── UTILS ────────────────────────────────────────────────────────────────────
function formatDate(s) { try { return new Date(s).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'}); } catch { return s||''; } }
function formatDateShort(s) { try { return new Date(s).toLocaleDateString('fr-FR',{day:'2-digit',month:'short'}); } catch { return s||''; } }
function copyToClipboard(t) { navigator.clipboard.writeText(t).catch(()=>{}); }

// ─── TOAST ────────────────────────────────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((msg, type='success', duration=3500) => {
    const id = Date.now();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), duration);
  }, []);
  return { toasts, toast: add };
}
function ToastContainer({ toasts }) {
  return <div style={{position:'fixed',bottom:24,right:24,zIndex:9999,display:'flex',flexDirection:'column',gap:10}}>
    {toasts.map(t => <div key={t.id} style={{padding:'12px 18px',borderRadius:10,fontSize:14,fontWeight:500,background:t.type==='success'?'#1e293b':t.type==='error'?'#dc2626':'#6366f1',color:'white',boxShadow:'0 4px 20px rgba(0,0,0,0.15)',display:'flex',alignItems:'center',gap:8,animation:'slideIn 0.3s ease'}}>
      <span>{t.type==='success'?'✓':t.type==='error'?'✕':'ℹ'}</span>{t.msg}
    </div>)}
    <style>{`@keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
  </div>;
}

// ─── POINTS BURST ─────────────────────────────────────────────────────────────
function PointsBurst({ points, levelUp, newLevel }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => { const t = setTimeout(() => setVisible(false), 3000); return () => clearTimeout(t); }, []);
  if (!visible || !points) return null;
  return <div style={{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',zIndex:9998,pointerEvents:'none',textAlign:'center',animation:'burstIn 0.4s ease'}}>
    <div style={{background:'linear-gradient(135deg,#6366f1,#8b5cf6)',borderRadius:20,padding:'20px 32px',boxShadow:'0 8px 40px rgba(99,102,241,0.4)',color:'white'}}>
      <p style={{fontSize:32,fontWeight:800,margin:0}}>+{points} pts !</p>
      {levelUp && <p style={{fontSize:16,fontWeight:600,margin:'8px 0 0',opacity:0.9}}>🎉 Niveau atteint : {newLevel} !</p>}
    </div>
    <style>{`@keyframes burstIn{from{transform:translate(-50%,-50%) scale(0.5);opacity:0}to{transform:translate(-50%,-50%) scale(1);opacity:1}}`}</style>
  </div>;
}

// ─── UI PRIMITIVES ────────────────────────────────────────────────────────────
function Input({placeholder,value,onChange,type='text',required,style={}}) {
  return <input type={type} placeholder={placeholder} value={value} onChange={onChange} required={required}
    style={{width:'100%',borderRadius:8,border:'1px solid #e2e8f0',padding:'9px 12px',fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box',color:'#1e293b',...style}}/>;
}
function Textarea({placeholder,value,onChange,rows=3}) {
  return <textarea placeholder={placeholder} value={value} onChange={onChange} rows={rows}
    style={{width:'100%',borderRadius:8,border:'1px solid #e2e8f0',padding:'8px 12px',fontSize:13,fontFamily:'inherit',outline:'none',resize:'vertical',boxSizing:'border-box',color:'#1e293b'}}/>;
}
function Btn({children,onClick,type='button',variant='primary',disabled,style={}}) {
  const base={display:'inline-flex',alignItems:'center',justifyContent:'center',gap:8,padding:'10px 20px',borderRadius:10,fontSize:14,fontWeight:600,cursor:disabled?'not-allowed':'pointer',border:'none',transition:'all 0.2s',opacity:disabled?0.6:1,fontFamily:'inherit'};
  const variants={primary:{background:'#6366f1',color:'white',boxShadow:'0 4px 12px rgba(99,102,241,0.3)'},secondary:{background:'white',color:'#374151',border:'1px solid #e2e8f0'},danger:{background:'#fee2e2',color:'#dc2626',border:'1px solid #fca5a5'},ghost:{background:'transparent',color:'#64748b',border:'none'},green:{background:'#d1fae5',color:'#065f46',border:'1px solid #6ee7b7'}};
  return <button type={type} onClick={onClick} disabled={disabled} style={{...base,...variants[variant],...style}}>{children}</button>;
}
function Alert({type,message}) {
  if(!message) return null;
  const s={error:{background:'#fee2e2',border:'1px solid #fca5a5',color:'#991b1b'},success:{background:'#d1fae5',border:'1px solid #6ee7b7',color:'#065f46'}};
  return <div style={{...s[type],padding:'10px 14px',borderRadius:8,fontSize:13,marginBottom:16}}>{message}</div>;
}
function Spinner({full=false}) {
  const el=<div style={{width:32,height:32,border:'4px solid #e2e8f0',borderTopColor:'#6366f1',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>;
  return full?<div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'50vh'}}>{el}<style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>:el;
}
function EmptyState({icon,title,subtitle,action}) {
  return <div style={{background:'white',border:'1px solid #e2e8f0',borderRadius:12,padding:48,textAlign:'center'}}>
    <div style={{fontSize:40,marginBottom:12}}>{icon}</div>
    <p style={{fontWeight:600,fontSize:16,color:'#1e293b',marginBottom:4}}>{title}</p>
    <p style={{color:'#94a3b8',fontSize:13,marginBottom:action?20:0}}>{subtitle}</p>
    {action}
  </div>;
}

// ─── SCORE GAUGE ──────────────────────────────────────────────────────────────
function ScoreGauge({percentage,size='lg'}) {
  const r=size==='lg'?54:36,st=size==='lg'?8:6;
  const circ=2*Math.PI*r,off=circ-(percentage/100)*circ;
  const vb=size==='lg'?130:90,c=vb/2;
  const color=percentage>=80?'#059669':percentage>=60?'#d97706':percentage>=40?'#6366f1':'#ef4444';
  return <div style={{position:'relative',display:'inline-flex',alignItems:'center',justifyContent:'center'}}>
    <svg width={vb} height={vb} viewBox={`0 0 ${vb} ${vb}`}>
      <circle cx={c} cy={c} r={r} fill="none" stroke="#e2e8f0" strokeWidth={st}/>
      <circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth={st} strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round" transform={`rotate(-90 ${c} ${c})`} style={{transition:'stroke-dashoffset 1s ease-in-out'}}/>
    </svg>
    <div style={{position:'absolute',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <span style={{fontWeight:700,fontSize:size==='lg'?28:16,color}}>{Math.round(percentage)}%</span>
    </div>
  </div>;
}
function ScoreBadge({pct}) {
  const s=pct>=80?{bg:'#d1fae5',c:'#065f46',b:'#6ee7b7'}:pct>=60?{bg:'#fef3c7',c:'#92400e',b:'#fcd34d'}:pct>=40?{bg:'#ede9fe',c:'#4c1d95',b:'#c4b5fd'}:{bg:'#fee2e2',c:'#991b1b',b:'#fca5a5'};
  return <span style={{background:s.bg,color:s.c,border:`1px solid ${s.b}`,padding:'2px 10px',borderRadius:8,fontWeight:700,fontSize:13}}>{pct}%</span>;
}
function ClosedBadge({isClosed}) {
  if(isClosed===null||isClosed===undefined) return null;
  return <span style={{display:'inline-flex',alignItems:'center',gap:4,padding:'4px 10px',borderRadius:8,fontSize:12,fontWeight:600,background:isClosed?'#d1fae5':'#fee2e2',color:isClosed?'#065f46':'#991b1b'}}>{isClosed?'✓ Closer':'✗ Non Closer'}</span>;
}

// ─── RADAR CHART — 5 SECTIONS UNIQUEMENT ─────────────────────────────────────
function RadarScore({scores}) {
  if(!scores) return null;
  // Uniquement les 5 sections mesurées
  const SECTIONS=[
    {key:'decouverte',label:'Découverte'},
    {key:'reformulation',label:'Reformulation'},
    {key:'projection',label:'Projection'},
    {key:'presentation_offre',label:'Offre'},
    {key:'closing',label:'Closing'},
  ];
  const n=SECTIONS.length,cx=110,cy=110,R=80;
  const angle=i=>(i/n)*2*Math.PI-Math.PI/2;
  const pts=SECTIONS.map((s,i)=>{const v=(scores[s.key]||0)/5,a=angle(i);return[cx+R*v*Math.cos(a),cy+R*v*Math.sin(a)];});
  const allZero=SECTIONS.every(s=>(scores[s.key]||0)===0);
  return <svg width="220" height="220" viewBox="0 0 220 220" style={{overflow:'visible'}}>
    {[1,2,3,4,5].map(l=>{const r=(l/5)*R,ps=SECTIONS.map((_,i)=>{const a=angle(i);return`${cx+r*Math.cos(a)},${cy+r*Math.sin(a)}`;}).join(' ');return<polygon key={l} points={ps} fill="none" stroke="#e2e8f0" strokeWidth="1"/>;} )}
    {SECTIONS.map((_,i)=>{const a=angle(i);return<line key={i} x1={cx} y1={cy} x2={cx+R*Math.cos(a)} y2={cy+R*Math.sin(a)} stroke="#e2e8f0" strokeWidth="1"/>;})}
    {!allZero&&<polygon points={pts.map(p=>p.join(',')).join(' ')} fill="rgba(99,102,241,0.15)" stroke="#6366f1" strokeWidth="2"/>}
    {!allZero&&pts.map(([x,y],i)=><circle key={i} cx={x} cy={y} r={3} fill="#6366f1"/>)}
    {SECTIONS.map((s,i)=>{const a=angle(i);return<text key={i} x={cx+(R+22)*Math.cos(a)} y={cy+(R+22)*Math.sin(a)} textAnchor="middle" dominantBaseline="central" fontSize="9" fill="#64748b" fontWeight="500">{s.label}</text>;})}
  </svg>;
}

// ─── STATS OVERVIEW ───────────────────────────────────────────────────────────
function StatsOverview({debriefs}) {
  const total=debriefs.length;
  const avg=total>0?Math.round(debriefs.reduce((s,d)=>s+(d.percentage||0),0)/total):0;
  const best=total>0?Math.round(Math.max(...debriefs.map(d=>d.percentage||0))):0;
  const sorted=[...debriefs].sort((a,b)=>new Date(b.call_date)-new Date(a.call_date));
  const rA=sorted.slice(0,3).reduce((s,d)=>s+(d.percentage||0),0)/Math.max(sorted.slice(0,3).length,1);
  const pA=sorted.slice(3,6).reduce((s,d)=>s+(d.percentage||0),0)/Math.max(sorted.slice(3,6).length,1);
  const trend=sorted.slice(3,6).length>0?Math.round(rA-pA):0;
  return <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16}}>
    {[{label:'Total appels',value:total,icon:'📞',bg:'#ede9fe',color:'#6366f1'},
      {label:'Score moyen',value:`${avg}%`,icon:'🎯',bg:'#d1fae5',color:'#059669'},
      {label:'Meilleur score',value:`${best}%`,icon:'🏆',bg:'#fef3c7',color:'#d97706'},
      {label:'Tendance',value:`${trend>=0?'+':''}${trend}%`,icon:trend>=0?'📈':'📉',bg:trend>=0?'#d1fae5':'#fee2e2',color:trend>=0?'#059669':'#dc2626'},
    ].map(({label,value,icon,bg,color})=>(
      <div key={label} style={{background:'white',border:'1px solid #e2e8f0',borderRadius:12,padding:'16px 20px',display:'flex',alignItems:'center',gap:14}}>
        <div style={{width:44,height:44,borderRadius:12,background:bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>{icon}</div>
        <div>
          <p style={{fontSize:11,color:'#64748b',margin:0,fontWeight:500,textTransform:'uppercase',letterSpacing:'0.05em'}}>{label}</p>
          <p style={{fontSize:22,fontWeight:700,color,margin:0}}>{value}</p>
        </div>
      </div>
    ))}
  </div>;
}

// ─── PROGRESS CHART ───────────────────────────────────────────────────────────
function ProgressChart({debriefs}) {
  const [hov,setHov]=useState(null);
  const data=[...debriefs].sort((a,b)=>new Date(a.call_date)-new Date(b.call_date))
    .map(d=>({date:formatDateShort(d.call_date),score:Math.round(d.percentage||0),prospect:d.prospect_name||d.prospect||''}));
  if(data.length===0) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:260,color:'#94a3b8',fontSize:14}}>Aucune donnée — créez votre premier debrief !</div>;
  const W=560,H=220,pL=40,pR=20,pT=20,pB=30,iW=W-pL-pR,iH=H-pT-pB;
  const xs=data.map((_,i)=>pL+(i/Math.max(data.length-1,1))*iW);
  const ys=data.map(d=>pT+iH-(d.score/100)*iH);
  const path=xs.map((x,i)=>`${i===0?'M':'L'} ${x} ${ys[i]}`).join(' ');
  return <div style={{width:'100%',overflowX:'auto'}}>
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
      <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366f1" stopOpacity="0.2"/><stop offset="100%" stopColor="#6366f1" stopOpacity="0"/></linearGradient></defs>
      {[0,25,50,75,100].map(v=>{const y=pT+iH-(v/100)*iH;return <g key={v}><line x1={pL} y1={y} x2={W-pR} y2={y} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4"/><text x={pL-6} y={y+4} textAnchor="end" fontSize="10" fill="#94a3b8">{v}%</text></g>;})}
      <path d={`${path} L ${xs[xs.length-1]} ${pT+iH} L ${pL} ${pT+iH} Z`} fill="url(#cg)"/>
      <path d={path} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      {data.map((d,i)=>(
        <g key={i} onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)} style={{cursor:'pointer'}}>
          <circle cx={xs[i]} cy={ys[i]} r={hov===i?7:5} fill="#6366f1" stroke="white" strokeWidth="2"/>
          {hov===i&&<g><rect x={Math.min(xs[i]-55,W-pR-110)} y={ys[i]-50} width={110} height={42} rx="6" fill="white" stroke="#e2e8f0" strokeWidth="1"/><text x={Math.min(xs[i],W-pR-55)} y={ys[i]-32} textAnchor="middle" fontSize="11" fontWeight="600" fill="#1e293b">{d.prospect}</text><text x={Math.min(xs[i],W-pR-55)} y={ys[i]-18} textAnchor="middle" fontSize="10" fill="#64748b">{d.date} — {d.score}%</text></g>}
          <text x={xs[i]} y={pT+iH+18} textAnchor="middle" fontSize="10" fill="#94a3b8">{d.date}</text>
        </g>
      ))}
    </svg>
  </div>;
}

// ─── GAMIFICATION CARD ────────────────────────────────────────────────────────
function GamificationCard({gamification}) {
  if(!gamification) return null;
  const {points,level,badges}=gamification;
  const pct=level.next?Math.min(Math.round(((points-level.min)/(level.next-level.min))*100),100):100;
  return <div style={{background:'linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)',borderRadius:16,padding:24,color:'white'}}>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
      <div><p style={{fontSize:12,opacity:0.8,margin:0,textTransform:'uppercase',letterSpacing:'0.05em'}}>Niveau actuel</p><h2 style={{fontSize:22,fontWeight:700,margin:'4px 0 0'}}>{level.icon} {level.name}</h2></div>
      <div style={{textAlign:'right'}}><p style={{fontSize:12,opacity:0.8,margin:0}}>Points totaux</p><p style={{fontSize:28,fontWeight:700,margin:0}}>{points}</p></div>
    </div>
    {level.next&&<div style={{marginBottom:badges.length>0?16:0}}>
      <div style={{display:'flex',justifyContent:'space-between',fontSize:11,opacity:0.8,marginBottom:6}}><span>{points} pts</span><span>{level.next} pts pour le prochain niveau</span></div>
      <div style={{height:8,background:'rgba(255,255,255,0.2)',borderRadius:4}}><div style={{height:'100%',width:`${pct}%`,background:'white',borderRadius:4,transition:'width 0.7s ease'}}/></div>
    </div>}
    {badges.length>0&&<div><p style={{fontSize:11,opacity:0.8,marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>Badges</p><div style={{display:'flex',flexWrap:'wrap',gap:8}}>{badges.map(b=><span key={b.id} style={{background:'rgba(255,255,255,0.2)',padding:'4px 10px',borderRadius:20,fontSize:12,fontWeight:500}}>{b.icon} {b.label}</span>)}</div></div>}
  </div>;
}

// ─── LEADERBOARD ──────────────────────────────────────────────────────────────
function Leaderboard({refreshKey}) {
  const [data,setData]=useState([]);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{setLoading(true);apiFetch('/gamification/leaderboard').then(setData).catch(console.error).finally(()=>setLoading(false));},[refreshKey]);
  if(loading) return null;
  if(data.length===0) return null;
  return <div style={{background:'white',border:'1px solid #e2e8f0',borderRadius:12,overflow:'hidden'}}>
    <div style={{padding:'16px 20px',borderBottom:'1px solid #e2e8f0',background:'#f8fafc'}}><h3 style={{fontSize:15,fontWeight:600,color:'#1e293b',margin:0}}>🏆 Classement de l'équipe</h3></div>
    {data.map((c,i)=>(
      <div key={c.id} style={{display:'flex',alignItems:'center',gap:16,padding:'14px 20px',borderBottom:i<data.length-1?'1px solid #f1f5f9':'none',background:i===0?'#fffbeb':'white'}}>
        <div style={{width:32,height:32,borderRadius:'50%',background:i===0?'#fef3c7':i===1?'#f1f5f9':'#f8fafc',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:14,flexShrink:0}}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</div>
        <div style={{flex:1}}><p style={{fontWeight:600,fontSize:14,color:'#1e293b',margin:0}}>{c.name}</p><p style={{fontSize:12,color:'#94a3b8',margin:0}}>{c.level.icon} {c.level.name} · {c.totalDebriefs} debriefs · {c.closed} closings</p></div>
        <div style={{textAlign:'right'}}><p style={{fontWeight:700,fontSize:16,color:'#6366f1',margin:0}}>{c.points} pts</p><p style={{fontSize:12,color:'#94a3b8',margin:0}}>moy. {c.avgScore}%</p></div>
      </div>
    ))}
  </div>;
}

// ─── FORM PRIMITIVES ──────────────────────────────────────────────────────────
function RadioGroup({label,options,value,onChange}) {
  return <div style={{marginBottom:16}}>
    {label&&<p style={{fontSize:13,fontWeight:600,color:'#374151',marginBottom:8}}>{label}</p>}
    <div style={{display:'flex',flexDirection:'column',gap:6}}>
      {options.map(opt=>(
        <label key={opt.value} style={{display:'flex',alignItems:'flex-start',gap:10,padding:'10px 12px',borderRadius:8,border:`1px solid ${value===opt.value?'#6366f1':'#e2e8f0'}`,background:value===opt.value?'#f5f3ff':'white',cursor:'pointer',fontSize:13,color:value===opt.value?'#4c1d95':'#64748b',transition:'all 0.15s'}}>
          <input type="radio" style={{marginTop:2,accentColor:'#6366f1'}} checked={value===opt.value} onChange={()=>onChange(opt.value)}/>
          <span>{opt.label}</span>
        </label>
      ))}
    </div>
  </div>;
}
function CheckboxGroup({label,options,value=[],onChange}) {
  const toggle=v=>value.includes(v)?onChange(value.filter(x=>x!==v)):onChange([...value,v]);
  return <div style={{marginBottom:16}}>
    {label&&<p style={{fontSize:13,fontWeight:600,color:'#374151',marginBottom:8}}>{label}</p>}
    <div style={{display:'flex',flexDirection:'column',gap:6}}>
      {options.map(opt=>(
        <label key={opt.value} style={{display:'flex',alignItems:'flex-start',gap:10,padding:'10px 12px',borderRadius:8,border:`1px solid ${value.includes(opt.value)?'#6366f1':'#e2e8f0'}`,background:value.includes(opt.value)?'#f5f3ff':'white',cursor:'pointer',fontSize:13,color:value.includes(opt.value)?'#4c1d95':'#64748b',transition:'all 0.15s'}}>
          <input type="checkbox" style={{marginTop:2,accentColor:'#6366f1'}} checked={value.includes(opt.value)} onChange={()=>toggle(opt.value)}/>
          <span>{opt.label}</span>
        </label>
      ))}
    </div>
  </div>;
}
function SectionNotes({notes={},onChange}) {
  return <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,paddingTop:16,marginTop:8,borderTop:'1px solid #f1f5f9'}}>
    {[{key:'strength',label:'👍 Point fort',placeholder:'Ce qui a bien fonctionné...',color:'#059669'},{key:'weakness',label:'👎 Point faible',placeholder:"Ce qui n'a pas bien fonctionné...",color:'#dc2626'},{key:'improvement',label:'📈 Amélioration',placeholder:'Comment améliorer...',color:'#d97706'}].map(({key,label,placeholder,color})=>(
      <div key={key}><label style={{display:'block',fontSize:11,fontWeight:600,color,marginBottom:6}}>{label}</label>
        <textarea rows={2} placeholder={placeholder} value={notes[key]||''} onChange={e=>onChange({...notes,[key]:e.target.value})} style={{width:'100%',borderRadius:8,border:'1px solid #e2e8f0',padding:'8px 10px',fontSize:12,resize:'none',fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/>
      </div>
    ))}
  </div>;
}
function CategoryCard({number,title,children}) {
  return <div style={{borderRadius:12,border:'1px solid #e2e8f0',background:'white',overflow:'hidden',marginBottom:16}}>
    <div style={{display:'flex',alignItems:'center',gap:12,padding:'12px 20px',background:'#f5f3ff',borderBottom:'1px solid #e2e8f0'}}>
      <span style={{width:28,height:28,borderRadius:'50%',background:'#6366f1',color:'white',fontSize:12,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{number}</span>
      <h3 style={{fontWeight:600,fontSize:14,margin:0,color:'#1e293b'}}>{title}</h3>
    </div>
    <div style={{padding:20}}>{children}</div>
  </div>;
}

// ─── SECTIONS D'ÉVALUATION ────────────────────────────────────────────────────
function DecouverteSection({data={},onChange,notes,onNotesChange}) {
  const set=(k,v)=>onChange({...data,[k]:v});
  return <CategoryCard number="1" title="Phase de découverte">
    <RadioGroup label="Douleur de surface identifiée ?" options={[{value:'oui',label:'Oui'},{value:'non',label:'Non'}]} value={data.douleur_surface} onChange={v=>set('douleur_surface',v)}/>
    {data.douleur_surface==='oui'&&<div style={{marginTop:-8,marginBottom:16}}><Input placeholder="Note ce qu'elle était..." value={data.douleur_surface_note||''} onChange={e=>set('douleur_surface_note',e.target.value)}/></div>}
    <RadioGroup label="Douleur profonde / identitaire atteinte ?" options={[{value:'oui',label:"✅ Oui — verbalisé fort"},{value:'partiel',label:'⚠️ Partiellement'},{value:'non',label:'❌ Non'}]} value={data.douleur_profonde} onChange={v=>set('douleur_profonde',v)}/>
    {data.douleur_profonde&&data.douleur_profonde!=='non'&&<div style={{marginTop:-8,marginBottom:16}}><Input placeholder="Note la douleur profonde..." value={data.douleur_profonde_note||''} onChange={e=>set('douleur_profonde_note',e.target.value)}/></div>}
    <CheckboxGroup label="Couches de douleur creusées" options={[{value:'couche1',label:'Couche 1 : physique / performance'},{value:'couche2',label:'Couche 2 : impact quotidien / social'},{value:'couche3',label:'Couche 3 : identité / peur du futur'}]} value={data.couches_douleur||[]} onChange={v=>set('couches_douleur',v)}/>
    <RadioGroup label="Temporalité demandée ?" options={[{value:'oui',label:'✅ Oui'},{value:'non',label:'❌ Non'}]} value={data.temporalite} onChange={v=>set('temporalite',v)}/>
    <RadioGroup label="Urgence naturelle identifiée ?" options={[{value:'oui',label:'✅ Oui'},{value:'artificielle',label:'⚠️ Artificielle'},{value:'aucune',label:'❌ Aucune'}]} value={data.urgence} onChange={v=>set('urgence',v)}/>
    {data.urgence==='oui'&&<div style={{marginTop:-8,marginBottom:16}}><Input placeholder="Laquelle ?" value={data.urgence_note||''} onChange={e=>set('urgence_note',e.target.value)}/></div>}
    <SectionNotes notes={notes} onChange={onNotesChange}/>
  </CategoryCard>;
}
function ReformulationSection({data={},onChange,notes,onNotesChange}) {
  const set=(k,v)=>onChange({...data,[k]:v});
  return <CategoryCard number="2" title="Reformulation">
    <RadioGroup label="Reformulation faite ?" options={[{value:'oui',label:'✅ Complète et précise'},{value:'partiel',label:'⚠️ Partielle'},{value:'non',label:'❌ Non'}]} value={data.reformulation} onChange={v=>set('reformulation',v)}/>
    <RadioGroup label="Le prospect s'est reconnu ?" options={[{value:'oui',label:"✅ Oui — \"c'est exactement ça\""},{value:'moyen',label:'⚠️ Moyen'},{value:'non',label:'❌ Non'}]} value={data.prospect_reconnu} onChange={v=>set('prospect_reconnu',v)}/>
    <CheckboxGroup label="Les 3 couches présentes ?" options={[{value:'physique',label:'Douleur physique / performance'},{value:'quotidien',label:'Impact quotidien'},{value:'identitaire',label:'Dimension identitaire'}]} value={data.couches_reformulation||[]} onChange={v=>set('couches_reformulation',v)}/>
    <SectionNotes notes={notes} onChange={onNotesChange}/>
  </CategoryCard>;
}
function ProjectionSection({data={},onChange,notes,onNotesChange}) {
  const set=(k,v)=>onChange({...data,[k]:v});
  return <CategoryCard number="3" title="Projection">
    <RadioGroup label="Question de projection posée ?" options={[{value:'oui',label:'✅ Oui'},{value:'non',label:'❌ Non'}]} value={data.projection_posee} onChange={v=>set('projection_posee',v)}/>
    <RadioGroup label="Qualité de la réponse" options={[{value:'forte',label:'✅ Forte — émotionnelle, identitaire'},{value:'moyenne',label:'⚠️ Moyenne'},{value:'faible',label:'❌ Faible'}]} value={data.qualite_reponse} onChange={v=>set('qualite_reponse',v)}/>
    <RadioGroup label="Deadline utilisée comme levier ?" options={[{value:'oui',label:'✅ Oui'},{value:'non_exploitee',label:'⚠️ Non exploitée'},{value:'pas_de_deadline',label:'❌ Pas de deadline'}]} value={data.deadline_levier} onChange={v=>set('deadline_levier',v)}/>
    <SectionNotes notes={notes} onChange={onNotesChange}/>
  </CategoryCard>;
}
function PresentationOffreSection({data={},onChange,notes,onNotesChange}) {
  const set=(k,v)=>onChange({...data,[k]:v});
  return <CategoryCard number="4" title="Présentation de l'offre">
    <RadioGroup label="Présentation collée aux douleurs ?" options={[{value:'oui',label:'✅ Oui'},{value:'partiel',label:'⚠️ Partiellement'},{value:'non',label:'❌ Non — générique'}]} value={data.colle_douleurs} onChange={v=>set('colle_douleurs',v)}/>
    <RadioGroup label="Exemples bien choisis ?" options={[{value:'oui',label:"✅ Oui — le prospect s'est reconnu"},{value:'moyen',label:'⚠️ Moyen'},{value:'non',label:'❌ Non'}]} value={data.exemples_transformation} onChange={v=>set('exemples_transformation',v)}/>
    <RadioGroup label="Durée / Offre justifiée ?" options={[{value:'oui',label:'✅ Oui'},{value:'partiel',label:'⚠️ Partiellement'},{value:'non',label:'❌ Non'}]} value={data.duree_justifiee} onChange={v=>set('duree_justifiee',v)}/>
    <SectionNotes notes={notes} onChange={onNotesChange}/>
  </CategoryCard>;
}
function ClosingSection({data={},onChange,notes,onNotesChange}) {
  const set=(k,v)=>onChange({...data,[k]:v});
  return <CategoryCard number="5" title="Closing & Objections">
    <RadioGroup label="Annonce du prix" options={[{value:'directe',label:'✅ Directe et assumée'},{value:'hesitante',label:'⚠️ Hésitante'},{value:'trop_rapide',label:'❌ Trop rapide'}]} value={data.annonce_prix} onChange={v=>set('annonce_prix',v)}/>
    <RadioGroup label="Silence après le prix ?" options={[{value:'oui',label:'✅ Oui — laissé respirer'},{value:'non',label:'❌ Non — rempli trop vite'}]} value={data.silence_prix} onChange={v=>set('silence_prix',v)}/>
    <CheckboxGroup label="Objection rencontrée" options={[{value:'budget',label:'Budget'},{value:'reflechir',label:'"J\'ai besoin de réfléchir"'},{value:'conjoint',label:'Conjoint / autre personne'},{value:'methode',label:'Pas convaincu de la méthode'},{value:'aucune',label:"Pas d'objection"}]} value={data.objections||[]} onChange={v=>set('objections',v)}/>
    <RadioGroup label="Douleur réancrée avant l'objection ?" options={[{value:'oui',label:'✅ Oui'},{value:'non',label:'❌ Non'}]} value={data.douleur_reancree} onChange={v=>set('douleur_reancree',v)}/>
    <RadioGroup label="Objection bien isolée ?" options={[{value:'oui',label:'✅ Oui'},{value:'non',label:'❌ Non'}]} value={data.objection_isolee} onChange={v=>set('objection_isolee',v)}/>
    <RadioGroup label="Résultat du closing" options={[{value:'close',label:'✅ Closé en direct'},{value:'retrograde',label:'⚠️ Rétrogradé'},{value:'relance',label:'📅 Relance planifiée'},{value:'porte_ouverte',label:'🔓 Porte ouverte'},{value:'perdu',label:'❌ Perdu'}]} value={data.resultat_closing} onChange={v=>set('resultat_closing',v)}/>
    <SectionNotes notes={notes} onChange={onNotesChange}/>
  </CategoryCard>;
}

// ─── AUTH PAGES ───────────────────────────────────────────────────────────────
function AuthShell({subtitle,icon,children}) {
  return <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#f5f3ff 0%,#ede9fe 100%)',display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
    <div style={{width:'100%',maxWidth:460}}>
      <div style={{textAlign:'center',marginBottom:32}}>
        <div style={{width:56,height:56,borderRadius:16,background:'#6366f1',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,margin:'0 auto 16px'}}>{icon}</div>
        <h1 style={{fontSize:26,fontWeight:700,color:'#1e293b',margin:0}}>CloserDebrief</h1>
        <p style={{color:'#64748b',fontSize:14,marginTop:6}}>{subtitle}</p>
      </div>
      <div style={{background:'white',borderRadius:16,padding:32,boxShadow:'0 8px 32px rgba(99,102,241,0.12)',border:'1px solid #e2e8f0'}}>{children}</div>
    </div>
  </div>;
}
function LoginPage({onLogin,goToRegister,goToForgot}) {
  const [f,setF]=useState({email:'',password:''});
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);
  const submit=async e=>{e.preventDefault();setError('');setLoading(true);try{const data=await apiFetch('/auth/login',{method:'POST',body:f});setToken(data.token);onLogin(data.user,data.gamification);}catch(err){setError(err.message);}finally{setLoading(false);}};
  return <AuthShell icon="📞" subtitle="Connectez-vous à votre compte">
    <Alert type="error" message={error}/>
    <form onSubmit={submit}>
      <div style={{marginBottom:16}}><label style={{display:'block',fontSize:12,fontWeight:600,color:'#374151',marginBottom:6}}>Email</label><Input type="email" placeholder="votre@email.com" value={f.email} onChange={e=>setF({...f,email:e.target.value})} required/></div>
      <div style={{marginBottom:8}}><label style={{display:'block',fontSize:12,fontWeight:600,color:'#374151',marginBottom:6}}>Mot de passe</label><Input type="password" placeholder="••••••••" value={f.password} onChange={e=>setF({...f,password:e.target.value})} required/></div>
      <div style={{textAlign:'right',marginBottom:24}}><button type="button" onClick={goToForgot} style={{background:'none',border:'none',color:'#6366f1',fontSize:12,cursor:'pointer'}}>Mot de passe oublié ?</button></div>
      <Btn type="submit" disabled={loading} style={{width:'100%'}}>{loading?'Connexion...':'Se connecter'}</Btn>
    </form>
    <p style={{textAlign:'center',fontSize:13,color:'#64748b',marginTop:20}}>Pas encore de compte ?{' '}<button onClick={goToRegister} style={{background:'none',border:'none',color:'#6366f1',fontWeight:600,cursor:'pointer',fontSize:13}}>S'inscrire</button></p>
  </AuthShell>;
}
function RegisterPage({onLogin,goToLogin}) {
  const [f,setF]=useState({name:'',email:'',password:'',confirm:'',role:'closer',invite_code:''});
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);
  const submit=async e=>{
    e.preventDefault();setError('');
    if(f.password!==f.confirm) return setError('Les mots de passe ne correspondent pas');
    if(f.password.length<8) return setError('Mot de passe trop court (8 caractères min)');
    if(f.role==='closer'&&!f.invite_code) return setError("Un code d'invitation est requis");
    setLoading(true);
    try{const data=await apiFetch('/auth/register',{method:'POST',body:{name:f.name,email:f.email,password:f.password,role:f.role,invite_code:f.invite_code}});setToken(data.token);onLogin(data.user,data.gamification);}
    catch(err){setError(err.message);}finally{setLoading(false);}
  };
  return <AuthShell icon="📞" subtitle="Créez votre compte">
    <Alert type="error" message={error}/>
    <div style={{marginBottom:20}}>
      <label style={{display:'block',fontSize:12,fontWeight:600,color:'#374151',marginBottom:8}}>Je suis...</label>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
        {[{value:'closer',label:'🎯 Closer',desc:'Je fais des appels'},{value:'head_of_sales',label:'👑 Head of Sales',desc:'Je gère une équipe'}].map(({value,label,desc})=>(
          <button key={value} type="button" onClick={()=>setF({...f,role:value})} style={{padding:'12px 16px',borderRadius:10,border:`2px solid ${f.role===value?'#6366f1':'#e2e8f0'}`,background:f.role===value?'#f5f3ff':'white',cursor:'pointer',textAlign:'left',transition:'all 0.2s',fontFamily:'inherit'}}>
            <p style={{fontWeight:600,fontSize:13,color:f.role===value?'#4c1d95':'#374151',margin:0}}>{label}</p>
            <p style={{fontSize:11,color:'#94a3b8',margin:'2px 0 0'}}>{desc}</p>
          </button>
        ))}
      </div>
    </div>
    <form onSubmit={submit}>
      {[{key:'name',label:'Nom complet',ph:'Jean Dupont',type:'text'},{key:'email',label:'Email',ph:'votre@email.com',type:'email'},{key:'password',label:'Mot de passe',ph:'8 caractères minimum',type:'password'},{key:'confirm',label:'Confirmer',ph:'••••••••',type:'password'}].map(({key,label,ph,type})=>(
        <div key={key} style={{marginBottom:14}}><label style={{display:'block',fontSize:12,fontWeight:600,color:'#374151',marginBottom:6}}>{label}</label><Input type={type} placeholder={ph} value={f[key]} onChange={e=>setF({...f,[key]:e.target.value})} required/></div>
      ))}
      {f.role==='closer'&&<div style={{marginBottom:14}}>
        <label style={{display:'block',fontSize:12,fontWeight:600,color:'#374151',marginBottom:6}}>🔑 Code d'invitation</label>
        <Input placeholder="Ex: ABC12345" value={f.invite_code} onChange={e=>setF({...f,invite_code:e.target.value.toUpperCase()})} required/>
        <p style={{fontSize:11,color:'#94a3b8',marginTop:4}}>Demandez ce code à votre Head of Sales</p>
      </div>}
      <Btn type="submit" disabled={loading} style={{width:'100%',marginTop:8}}>{loading?'Création...':'Créer mon compte'}</Btn>
    </form>
    <p style={{textAlign:'center',fontSize:13,color:'#64748b',marginTop:20}}>Déjà un compte ?{' '}<button onClick={goToLogin} style={{background:'none',border:'none',color:'#6366f1',fontWeight:600,cursor:'pointer',fontSize:13}}>Se connecter</button></p>
  </AuthShell>;
}
function ForgotPasswordPage({goToLogin}) {
  const [email,setEmail]=useState('');const [sent,setSent]=useState(false);const [loading,setLoading]=useState(false);const [error,setError]=useState('');
  const submit=async e=>{e.preventDefault();setError('');setLoading(true);try{await apiFetch('/auth/forgot-password',{method:'POST',body:{email}});setSent(true);}catch(err){setError(err.message);}finally{setLoading(false);}};
  return <AuthShell icon="🔐" subtitle="Réinitialisation du mot de passe">
    {sent?<div style={{textAlign:'center'}}><div style={{fontSize:48,marginBottom:16}}>📬</div><h2 style={{fontSize:18,fontWeight:600,color:'#1e293b',marginBottom:8}}>Email envoyé !</h2><p style={{color:'#64748b',fontSize:14,marginBottom:24}}>Si cet email existe, vous recevrez un lien sous peu.</p><Btn variant="secondary" onClick={goToLogin} style={{width:'100%'}}>Retour à la connexion</Btn></div>:
    <><Alert type="error" message={error}/><form onSubmit={submit}><div style={{marginBottom:20}}><label style={{display:'block',fontSize:12,fontWeight:600,color:'#374151',marginBottom:6}}>Email</label><Input type="email" placeholder="votre@email.com" value={email} onChange={e=>setEmail(e.target.value)} required/></div><Btn type="submit" disabled={loading} style={{width:'100%'}}>{loading?'Envoi...':'Envoyer le lien'}</Btn></form><p style={{textAlign:'center',fontSize:13,marginTop:16}}><button onClick={goToLogin} style={{background:'none',border:'none',color:'#6366f1',cursor:'pointer',fontSize:13}}>← Retour</button></p></>}
  </AuthShell>;
}
function ResetPasswordPage({token,onDone}) {
  const [f,setF]=useState({password:'',confirm:''});const [error,setError]=useState('');const [success,setSuccess]=useState(false);const [loading,setLoading]=useState(false);
  const submit=async e=>{e.preventDefault();setError('');if(f.password!==f.confirm)return setError('Les mots de passe ne correspondent pas');if(f.password.length<8)return setError('Trop court');setLoading(true);try{await apiFetch('/auth/reset-password',{method:'POST',body:{token,password:f.password}});setSuccess(true);setTimeout(onDone,2000);}catch(err){setError(err.message);}finally{setLoading(false);}};
  return <AuthShell icon="🔑" subtitle="Nouveau mot de passe">
    {success?<Alert type="success" message="Mot de passe modifié ! Redirection..."/>:<><Alert type="error" message={error}/><form onSubmit={submit}><div style={{marginBottom:14}}><label style={{display:'block',fontSize:12,fontWeight:600,color:'#374151',marginBottom:6}}>Nouveau mot de passe</label><Input type="password" placeholder="8 caractères minimum" value={f.password} onChange={e=>setF({...f,password:e.target.value})} required/></div><div style={{marginBottom:20}}><label style={{display:'block',fontSize:12,fontWeight:600,color:'#374151',marginBottom:6}}>Confirmer</label><Input type="password" placeholder="••••••••" value={f.confirm} onChange={e=>setF({...f,confirm:e.target.value})} required/></div><Btn type="submit" disabled={loading} style={{width:'100%'}}>{loading?'Modification...':'Modifier le mot de passe'}</Btn></form></>}
  </AuthShell>;
}

// ─── DEBRIEF CARD ─────────────────────────────────────────────────────────────
function DebriefCard({debrief,onClick,showUser}) {
  const [h,setH]=useState(false);
  const pct=Math.round(debrief.percentage||0);
  return <div onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
    style={{background:'white',border:`1px solid ${h?'#a5b4fc':'#e2e8f0'}`,borderRadius:12,padding:'14px 18px',cursor:'pointer',transition:'all 0.2s',boxShadow:h?'0 4px 16px rgba(99,102,241,0.1)':'none',display:'flex',alignItems:'center',justifyContent:'space-between',gap:16}}>
    <div style={{flex:1,minWidth:0}}>
      <p style={{fontWeight:600,fontSize:14,color:'#1e293b',margin:'0 0 4px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{debrief.prospect_name}</p>
      <div style={{display:'flex',alignItems:'center',gap:12,fontSize:12,color:'#94a3b8',flexWrap:'wrap'}}>
        <span>📅 {formatDate(debrief.call_date)}</span>
        <span>👤 {debrief.closer_name}</span>
        {showUser&&debrief.user_name&&<span style={{background:'#f1f5f9',padding:'1px 6px',borderRadius:4}}>par {debrief.user_name}</span>}
      </div>
    </div>
    <div style={{display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
      <ClosedBadge isClosed={debrief.is_closed}/>
      <ScoreBadge pct={pct}/>
      <span style={{color:h?'#6366f1':'#cbd5e1',fontSize:18}}>›</span>
    </div>
  </div>;
}

// ─── HEAD OF SALES PAGE (DASHBOARD + ÉQUIPE) ─────────────────────────────────
function HOSPage({toast, leaderboardKey}) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [teamData, setTeamData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch('/team').then(setTeamData).catch(console.error).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load, leaderboardKey]);

  const generateCode = async () => {
    setGenerating(true);
    try { await apiFetch('/team/invite', { method: 'POST' }); load(); toast('Code généré !'); }
    catch (err) { toast(err.message, 'error'); } finally { setGenerating(false); }
  };
  const removeMember = async (id, name) => {
    if (!confirm(`Retirer ${name} de l'équipe ?`)) return;
    try { await apiFetch(`/team/members/${id}`, { method: 'DELETE' }); load(); toast(`${name} retiré de l'équipe`); }
    catch (err) { toast(err.message, 'error'); }
  };
  const handleCopy = (code) => { copyToClipboard(code); setCopied(code); toast('Code copié !'); setTimeout(() => setCopied(null), 2000); };

  if (loading) return <Spinner full />;
  const { members = [], inviteCodes = [] } = teamData || {};
  const sel = members.find(m => m.id === selected);

  // Métriques globales équipe
  const totalDebriefs = members.reduce((s, m) => s + m.totalDebriefs, 0);
  const totalClosings = members.reduce((s, m) => s + m.closed, 0);
  const avgTeamScore = members.length > 0 ? Math.round(members.reduce((s, m) => s + m.avgScore, 0) / members.length) : 0;
  const closeRate = totalDebriefs > 0 ? Math.round((totalClosings / totalDebriefs) * 100) : 0;
  const topPerformer = members.length > 0 ? members.reduce((best, m) => m.avgScore > best.avgScore ? m : best, members[0]) : null;
  const mostActive = members.length > 0 ? members.reduce((best, m) => m.totalDebriefs > best.totalDebriefs ? m : best, members[0]) : null;

  // Meilleure/pire section de l'équipe
  const sectionAvgs = ['decouverte','reformulation','projection','presentation_offre','closing'].map(key => {
    const vals = members.flatMap(m => m.chartData || []);
    return { key, label: {decouverte:'Découverte',reformulation:'Reformulation',projection:'Projection',presentation_offre:'Offre',closing:'Closing'}[key] };
  });

  return <div style={{display:'flex',flexDirection:'column',gap:24}}>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:16}}>
      <div>
        <h1 style={{fontSize:24,fontWeight:700,color:'#1e293b',margin:0}}>👑 Head of Sales</h1>
        <p style={{color:'#64748b',fontSize:14,marginTop:4}}>{members.length} closer{members.length!==1?'s':''} dans votre équipe</p>
      </div>
      {/* Tabs */}
      <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:4,borderRadius:10}}>
        {[{key:'dashboard',label:'📊 Dashboard'},{key:'equipe',label:'👥 Équipe'}].map(({key,label})=>(
          <button key={key} onClick={()=>setActiveTab(key)}
            style={{padding:'8px 16px',borderRadius:8,border:'none',fontSize:13,fontWeight:500,cursor:'pointer',transition:'all 0.2s',background:activeTab===key?'white':'transparent',color:activeTab===key?'#1e293b':'#64748b',boxShadow:activeTab===key?'0 1px 4px rgba(0,0,0,0.1)':'none',fontFamily:'inherit'}}>
            {label}
          </button>
        ))}
      </div>
    </div>

    {activeTab === 'dashboard' && (<>
      {members.length === 0 ?
        <EmptyState icon="👥" title="Aucun closer dans votre équipe" subtitle="Allez dans l'onglet Équipe pour générer des codes d'invitation" action={<Btn onClick={()=>setActiveTab('equipe')}>Gérer l'équipe</Btn>}/> :
      <>
        {/* KPIs équipe */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16}}>
          {[
            {label:'Debriefs équipe',value:totalDebriefs,icon:'📋',bg:'#ede9fe',color:'#6366f1'},
            {label:'Score moyen équipe',value:`${avgTeamScore}%`,icon:'🎯',bg:'#d1fae5',color:'#059669'},
            {label:'Taux de closing',value:`${closeRate}%`,icon:'✅',bg:'#fef3c7',color:'#d97706'},
            {label:'Total closings',value:totalClosings,icon:'🏆',bg:'#f0fdf4',color:'#059669'},
          ].map(({label,value,icon,bg,color})=>(
            <div key={label} style={{background:'white',border:'1px solid #e2e8f0',borderRadius:12,padding:'16px 20px',display:'flex',alignItems:'center',gap:14}}>
              <div style={{width:44,height:44,borderRadius:12,background:bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>{icon}</div>
              <div><p style={{fontSize:11,color:'#64748b',margin:0,fontWeight:500,textTransform:'uppercase',letterSpacing:'0.05em'}}>{label}</p><p style={{fontSize:22,fontWeight:700,color,margin:0}}>{value}</p></div>
            </div>
          ))}
        </div>

        {/* Top performers */}
        {(topPerformer||mostActive)&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          {topPerformer&&<div style={{background:'linear-gradient(135deg,#fef3c7,#fde68a)',border:'1px solid #fcd34d',borderRadius:12,padding:20}}>
            <p style={{fontSize:12,color:'#92400e',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em',margin:'0 0 8px'}}>🥇 Meilleur score moyen</p>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <div style={{width:40,height:40,borderRadius:'50%',background:'white',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:16,color:'#d97706'}}>{topPerformer.name.charAt(0)}</div>
              <div><p style={{fontWeight:700,fontSize:16,color:'#1e293b',margin:0}}>{topPerformer.name}</p><p style={{fontSize:13,color:'#92400e',margin:0}}>{topPerformer.avgScore}% de moyenne · {topPerformer.level.icon} {topPerformer.level.name}</p></div>
            </div>
          </div>}
          {mostActive&&mostActive.id!==topPerformer?.id&&<div style={{background:'linear-gradient(135deg,#ede9fe,#ddd6fe)',border:'1px solid #c4b5fd',borderRadius:12,padding:20}}>
            <p style={{fontSize:12,color:'#4c1d95',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em',margin:'0 0 8px'}}>🔥 Plus actif</p>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <div style={{width:40,height:40,borderRadius:'50%',background:'white',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:16,color:'#6366f1'}}>{mostActive.name.charAt(0)}</div>
              <div><p style={{fontWeight:700,fontSize:16,color:'#1e293b',margin:0}}>{mostActive.name}</p><p style={{fontSize:13,color:'#4c1d95',margin:0}}>{mostActive.totalDebriefs} debriefs · {mostActive.closed} closings</p></div>
            </div>
          </div>}
        </div>}

        {/* Tableau des closers */}
        <div style={{background:'white',border:'1px solid #e2e8f0',borderRadius:12,overflow:'hidden'}}>
          <div style={{padding:'16px 20px',borderBottom:'1px solid #e2e8f0',background:'#f8fafc'}}>
            <h3 style={{fontSize:15,fontWeight:600,color:'#1e293b',margin:0}}>Performance individuelle</h3>
          </div>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr style={{background:'#f8fafc'}}>
                {['Closer','Niveau','Debriefs','Score moy.','Closings','Taux closing','Points'].map(h=>(
                  <th key={h} style={{padding:'10px 16px',fontSize:11,fontWeight:600,color:'#64748b',textAlign:'left',textTransform:'uppercase',letterSpacing:'0.05em',borderBottom:'1px solid #e2e8f0'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...members].sort((a,b)=>b.avgScore-a.avgScore).map((m,i)=>{
                const cr=m.totalDebriefs>0?Math.round((m.closed/m.totalDebriefs)*100):0;
                return <tr key={m.id} onClick={()=>setSelected(selected===m.id?null:m.id)} style={{cursor:'pointer',background:selected===m.id?'#f5f3ff':i%2===0?'white':'#fafafa',borderBottom:'1px solid #f1f5f9'}}>
                  <td style={{padding:'12px 16px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div style={{width:32,height:32,borderRadius:'50%',background:'#ede9fe',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:13,color:'#6366f1',flexShrink:0}}>{m.name.charAt(0)}</div>
                      <span style={{fontWeight:600,fontSize:13,color:'#1e293b'}}>{m.name}</span>
                    </div>
                  </td>
                  <td style={{padding:'12px 16px',fontSize:12,color:'#64748b'}}>{m.level.icon} {m.level.name}</td>
                  <td style={{padding:'12px 16px',fontSize:13,fontWeight:600,color:'#1e293b'}}>{m.totalDebriefs}</td>
                  <td style={{padding:'12px 16px'}}>
                    <span style={{fontWeight:700,fontSize:13,color:m.avgScore>=80?'#059669':m.avgScore>=60?'#d97706':m.avgScore>=40?'#6366f1':'#ef4444'}}>{m.avgScore}%</span>
                  </td>
                  <td style={{padding:'12px 16px',fontSize:13,fontWeight:600,color:'#059669'}}>{m.closed}</td>
                  <td style={{padding:'12px 16px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div style={{flex:1,height:6,background:'#f1f5f9',borderRadius:3,overflow:'hidden'}}>
                        <div style={{height:'100%',width:`${cr}%`,background:cr>=50?'#059669':cr>=30?'#d97706':'#ef4444',borderRadius:3}}/>
                      </div>
                      <span style={{fontSize:12,fontWeight:600,color:'#374151',minWidth:32}}>{cr}%</span>
                    </div>
                  </td>
                  <td style={{padding:'12px 16px',fontWeight:700,fontSize:13,color:'#6366f1'}}>{m.points} pts</td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>

        {/* Graphique du closer sélectionné */}
        {sel&&<div style={{background:'white',border:'1px solid #6366f1',borderRadius:12,padding:24}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
            <div>
              <h3 style={{fontSize:15,fontWeight:600,color:'#1e293b',margin:0}}>📈 Évolution de {sel.name}</h3>
              <p style={{fontSize:13,color:'#94a3b8',marginTop:4}}>Moy. {sel.avgScore}% · {sel.totalDebriefs} debriefs · {sel.closed} closings · {sel.level.icon} {sel.level.name}</p>
            </div>
            <button onClick={()=>setSelected(null)} style={{background:'none',border:'none',color:'#94a3b8',cursor:'pointer',fontSize:18}}>✕</button>
          </div>
          {sel.chartData.length>0?
            <ProgressChart debriefs={sel.chartData.map((d,i)=>({...d,id:i,percentage:d.score,prospect_name:d.prospect,call_date:d.date}))}/>:
            <p style={{color:'#94a3b8',fontSize:13,textAlign:'center',padding:'20px 0'}}>Aucun debrief enregistré</p>
          }
          {sel.badges.length>0&&<div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:12}}>{sel.badges.map(b=><span key={b.id} style={{background:'#ede9fe',color:'#4c1d95',padding:'3px 10px',borderRadius:20,fontSize:12}}>{b.icon} {b.label}</span>)}</div>}
        </div>}
      </>}
    </>)}

    {activeTab === 'equipe' && (<>
      {/* Codes d'invitation */}
      <div style={{background:'white',border:'1px solid #e2e8f0',borderRadius:12,padding:24}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
          <div>
            <h3 style={{fontSize:15,fontWeight:600,color:'#1e293b',margin:0}}>🔑 Codes d'invitation</h3>
            <p style={{fontSize:12,color:'#94a3b8',marginTop:4}}>Chaque code est à usage unique — partagez-le à un closer</p>
          </div>
          <Btn onClick={generateCode} disabled={generating} style={{fontSize:13,padding:'8px 16px'}}>{generating?'Génération...':'+ Générer un code'}</Btn>
        </div>
        {inviteCodes.length===0?
          <div style={{background:'#f8fafc',borderRadius:8,padding:20,textAlign:'center',color:'#94a3b8',fontSize:13}}>Aucun code actif — générez-en un pour inviter un closer</div>:
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {inviteCodes.map(inv=>(
              <div key={inv.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',background:'#f8fafc',borderRadius:8,border:'1px solid #e2e8f0'}}>
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  <span style={{fontFamily:'monospace',fontSize:20,fontWeight:700,color:'#6366f1',letterSpacing:'0.15em'}}>{inv.code}</span>
                  <span style={{fontSize:11,color:'#94a3b8'}}>Valide · usage unique</span>
                </div>
                <Btn variant={copied===inv.code?'green':'secondary'} onClick={()=>handleCopy(inv.code)} style={{fontSize:12,padding:'6px 12px'}}>{copied===inv.code?'✓ Copié !':'📋 Copier'}</Btn>
              </div>
            ))}
          </div>
        }
      </div>

      {/* Membres */}
      <div style={{background:'white',border:'1px solid #e2e8f0',borderRadius:12,overflow:'hidden'}}>
        <div style={{padding:'16px 20px',borderBottom:'1px solid #e2e8f0',background:'#f8fafc'}}>
          <h3 style={{fontSize:15,fontWeight:600,color:'#1e293b',margin:0}}>Membres de l'équipe ({members.length})</h3>
        </div>
        {members.length===0?
          <div style={{padding:40,textAlign:'center',color:'#94a3b8'}}>Aucun membre — partagez un code d'invitation !</div>:
          members.map((m,i)=>(
            <div key={m.id}>
              <div style={{display:'flex',alignItems:'center',gap:16,padding:'16px 20px',borderBottom:i<members.length-1||selected===m.id?'1px solid #f1f5f9':'none',cursor:'pointer'}} onClick={()=>setSelected(selected===m.id?null:m.id)}>
                <div style={{width:40,height:40,borderRadius:'50%',background:'#ede9fe',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:16,color:'#6366f1',flexShrink:0}}>{m.name.charAt(0).toUpperCase()}</div>
                <div style={{flex:1}}>
                  <p style={{fontWeight:600,fontSize:14,color:'#1e293b',margin:0}}>{m.name}</p>
                  <p style={{fontSize:12,color:'#94a3b8',margin:0}}>{m.email} · {m.level.icon} {m.level.name}</p>
                </div>
                <div style={{display:'flex',gap:24,textAlign:'center',marginRight:16}}>
                  {[{l:'Debriefs',v:m.totalDebriefs,c:'#1e293b'},{l:'Moy.',v:`${m.avgScore}%`,c:'#1e293b'},{l:'Closings',v:m.closed,c:'#059669'}].map(({l,v,c})=>(
                    <div key={l}><p style={{fontSize:11,color:'#94a3b8',margin:0}}>{l}</p><p style={{fontWeight:700,color:c,margin:0}}>{v}</p></div>
                  ))}
                </div>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <span style={{fontWeight:700,fontSize:15,color:'#6366f1'}}>{m.points} pts</span>
                  <Btn variant="danger" onClick={e=>{e.stopPropagation();removeMember(m.id,m.name);}} style={{width:32,height:32,padding:0,borderRadius:8,fontSize:12}}>✕</Btn>
                  <span style={{color:selected===m.id?'#6366f1':'#cbd5e1',fontSize:16}}>{selected===m.id?'▲':'▼'}</span>
                </div>
              </div>
              {selected===m.id&&(
                <div style={{padding:'16px 20px 20px',background:'#fafafa',borderBottom:i<members.length-1?'1px solid #f1f5f9':'none'}}>
                  {m.chartData.length>0?<><p style={{fontSize:13,fontWeight:600,color:'#374151',marginBottom:12}}>📈 Évolution du score</p><ProgressChart debriefs={m.chartData.map((d,idx)=>({...d,id:idx,percentage:d.score,prospect_name:d.prospect,call_date:d.date}))}/></>:
                  <p style={{color:'#94a3b8',fontSize:13,textAlign:'center',padding:'20px 0'}}>Aucun debrief pour l'instant</p>}
                  {m.badges.length>0&&<div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:12}}>{m.badges.map(b=><span key={b.id} style={{background:'#ede9fe',color:'#4c1d95',padding:'3px 10px',borderRadius:20,fontSize:12}}>{b.icon} {b.label}</span>)}</div>}
                </div>
              )}
            </div>
          ))
        }
      </div>
    </>)}
  </div>;
}

// ─── PAGES PRINCIPALES ────────────────────────────────────────────────────────
function Dashboard({debriefs,navigate,user,gamification,leaderboardKey}) {
  const isHOS=user.role==='head_of_sales';
  return <div style={{display:'flex',flexDirection:'column',gap:32}}>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:16}}>
      <div><h1 style={{fontSize:28,fontWeight:700,color:'#1e293b',margin:0}}>Tableau de bord</h1><p style={{color:'#64748b',marginTop:4,fontSize:14}}>Bonjour, {user.name} 👋</p></div>
      <Btn onClick={()=>navigate('NewDebrief')}>+ Nouveau debrief</Btn>
    </div>
    {gamification&&<GamificationCard gamification={gamification}/>}
    <StatsOverview debriefs={debriefs}/>
    <div style={{background:'white',border:'1px solid #e2e8f0',borderRadius:12,padding:24}}>
      <h2 style={{fontSize:15,fontWeight:600,color:'#1e293b',marginBottom:16}}>Évolution du score</h2>
      <ProgressChart debriefs={debriefs}/>
    </div>
    <Leaderboard refreshKey={leaderboardKey}/>
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
        <h2 style={{fontSize:17,fontWeight:600,color:'#1e293b',margin:0}}>Derniers debriefs</h2>
        {debriefs.length>5&&<button onClick={()=>navigate('DebriefHistory')} style={{background:'none',border:'none',color:'#6366f1',fontSize:13,cursor:'pointer'}}>Voir tout ›</button>}
      </div>
      {debriefs.length===0?
        <EmptyState icon="📋" title="Aucun debrief enregistré" subtitle="Créez votre premier debrief pour suivre vos progrès" action={<Btn variant="secondary" onClick={()=>navigate('NewDebrief')}>+ Créer votre premier debrief</Btn>}/>:
        <div style={{display:'flex',flexDirection:'column',gap:10}}>{debriefs.slice(0,5).map(d=><DebriefCard key={d.id} debrief={d} onClick={()=>navigate('DebriefDetail',d.id)} showUser={isHOS}/>)}</div>
      }
    </div>
  </div>;
}

function DebriefHistory({debriefs,navigate,user}) {
  const [search,setSearch]=useState('');
  const isHOS=user.role==='head_of_sales';
  const filtered=debriefs.filter(d=>{const q=search.toLowerCase();return d.prospect_name?.toLowerCase().includes(q)||d.closer_name?.toLowerCase().includes(q)||d.user_name?.toLowerCase().includes(q);});
  return <div style={{display:'flex',flexDirection:'column',gap:24}}>
    <div><h1 style={{fontSize:24,fontWeight:700,color:'#1e293b',margin:0}}>Historique des debriefs</h1><p style={{color:'#94a3b8',fontSize:13,marginTop:4}}>{debriefs.length} debrief{debriefs.length!==1?'s':''} enregistré{debriefs.length!==1?'s':''}</p></div>
    <div style={{position:'relative'}}>
      <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'#94a3b8'}}>🔍</span>
      <input placeholder="Rechercher..." value={search} onChange={e=>setSearch(e.target.value)} style={{width:'100%',padding:'10px 12px 10px 36px',border:'1px solid #e2e8f0',borderRadius:10,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/>
      {search&&<button onClick={()=>setSearch('')} style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:'#94a3b8',cursor:'pointer',fontSize:16}}>✕</button>}
    </div>
    {filtered.length===0?<EmptyState icon="🔍" title="Aucun résultat" subtitle={search?`Aucun debrief pour "${search}"`:"Aucun debrief enregistré"} action={search?<Btn variant="secondary" onClick={()=>setSearch('')}>Effacer</Btn>:null}/>:
    <div style={{display:'flex',flexDirection:'column',gap:10}}>{filtered.map(d=><DebriefCard key={d.id} debrief={d} onClick={()=>navigate('DebriefDetail',d.id,'DebriefHistory')} showUser={isHOS}/>)}</div>}
  </div>;
}

function DebriefDetail({debrief,navigate,onDelete,fromPage}) {
  if(!debrief) return <div style={{textAlign:'center',padding:80}}><p style={{color:'#94a3b8'}}>Debrief introuvable</p><Btn variant="secondary" onClick={()=>navigate('Dashboard')} style={{marginTop:16}}>Retour</Btn></div>;
  const pct=Math.round(debrief.percentage||0);
  const SECTIONS=[
    {key:'decouverte',label:'Phase de découverte'},
    {key:'reformulation',label:'Reformulation'},
    {key:'projection',label:'Projection'},
    {key:'presentation_offre',label:"Présentation de l'offre"},
    {key:'closing',label:'Closing'},
  ];
  const getBarColor=v=>v>=4?'#059669':v>=3?'#d97706':v>=2?'#6366f1':'#ef4444';
  // Calculer les scores depuis les sections — toujours cohérent avec ce qui est évalué
  const sectionScores = computeSectionScores(debrief.sections || {});

  return <div style={{display:'flex',flexDirection:'column',gap:24}}>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
      <div style={{display:'flex',alignItems:'center',gap:12}}>
        <Btn variant="secondary" onClick={()=>navigate(fromPage||'Dashboard')} style={{width:36,height:36,padding:0,borderRadius:8}}>←</Btn>
        <div>
          <h1 style={{fontSize:22,fontWeight:700,color:'#1e293b',margin:0}}>{debrief.prospect_name}</h1>
          <div style={{display:'flex',gap:16,fontSize:12,color:'#94a3b8',marginTop:4}}>
            <span>📅 {formatDate(debrief.call_date)}</span>
            <span>👤 {debrief.closer_name}</span>
          </div>
        </div>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <ClosedBadge isClosed={debrief.is_closed}/>
        {debrief.call_link&&<a href={debrief.call_link} target="_blank" rel="noopener noreferrer" style={{padding:'6px 12px',border:'1px solid #e2e8f0',borderRadius:8,background:'white',fontSize:12,textDecoration:'none',color:'#374151'}}>🔗 Écouter</a>}
        <Btn variant="danger" onClick={()=>onDelete(debrief.id)} style={{width:36,height:36,padding:0,borderRadius:8}}>🗑</Btn>
      </div>
    </div>

    <div style={{display:'grid',gridTemplateColumns:'240px 1fr',gap:20}}>
      {/* Gauche : Score + Radar (5 sections cohérentes) */}
      <div style={{background:'white',border:'1px solid #e2e8f0',borderRadius:12,padding:24,display:'flex',flexDirection:'column',alignItems:'center',gap:12}}>
        <ScoreGauge percentage={pct} size="lg"/>
        <p style={{fontSize:13,color:'#94a3b8',margin:0}}>{debrief.total_score} / {debrief.max_score} points</p>
        <RadarScore scores={sectionScores}/>
      </div>

      {/* Droite : Barres par section */}
      <div style={{background:'white',border:'1px solid #e2e8f0',borderRadius:12,padding:24}}>
        <h3 style={{fontSize:14,fontWeight:600,color:'#1e293b',marginBottom:20}}>Score par section</h3>
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          {SECTIONS.map(({key,label})=>{
            const val=sectionScores[key]||0;
            return <div key={key}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
                <span style={{fontSize:13,fontWeight:600,color:'#374151'}}>{label}</span>
                <span style={{fontSize:12,fontWeight:700,padding:'2px 8px',borderRadius:6,border:'1px solid #e2e8f0',color:getBarColor(val)}}>{val}/5</span>
              </div>
              <div style={{height:10,background:'#f1f5f9',borderRadius:5,overflow:'hidden'}}>
                <div style={{height:'100%',width:`${(val/5)*100}%`,background:getBarColor(val),borderRadius:5,transition:'width 0.7s ease-in-out'}}/>
              </div>
              {/* Notes de section */}
              {debrief.section_notes?.[key]&&(()=>{const n=debrief.section_notes[key];if(!n.strength&&!n.weakness&&!n.improvement) return null;return <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginTop:8}}>
                {n.strength&&<div style={{fontSize:11,padding:'6px 8px',borderRadius:6,background:'#f0fdf4',border:'1px solid #bbf7d0',color:'#166534'}}>👍 {n.strength}</div>}
                {n.weakness&&<div style={{fontSize:11,padding:'6px 8px',borderRadius:6,background:'#fff5f5',border:'1px solid #fca5a5',color:'#991b1b'}}>👎 {n.weakness}</div>}
                {n.improvement&&<div style={{fontSize:11,padding:'6px 8px',borderRadius:6,background:'#fffbeb',border:'1px solid #fcd34d',color:'#92400e'}}>📈 {n.improvement}</div>}
              </div>;})()}
            </div>;
          })}
        </div>
      </div>
    </div>

    {(debrief.strengths||debrief.improvements||debrief.notes)&&(
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
        {debrief.strengths&&<div style={{background:'white',border:'1px solid #e2e8f0',borderRadius:12,padding:16}}><h3 style={{fontSize:13,fontWeight:600,color:'#059669',marginBottom:8}}>Points forts</h3><p style={{fontSize:13,color:'#64748b',whiteSpace:'pre-wrap'}}>{debrief.strengths}</p></div>}
        {debrief.improvements&&<div style={{background:'white',border:'1px solid #e2e8f0',borderRadius:12,padding:16}}><h3 style={{fontSize:13,fontWeight:600,color:'#d97706',marginBottom:8}}>Axes d'amélioration</h3><p style={{fontSize:13,color:'#64748b',whiteSpace:'pre-wrap'}}>{debrief.improvements}</p></div>}
        {debrief.notes&&<div style={{background:'white',border:'1px solid #e2e8f0',borderRadius:12,padding:16}}><h3 style={{fontSize:13,fontWeight:600,color:'#6366f1',marginBottom:8}}>Notes</h3><p style={{fontSize:13,color:'#64748b',whiteSpace:'pre-wrap'}}>{debrief.notes}</p></div>}
      </div>
    )}
  </div>;
}

function NewDebrief({navigate,onSave,toast}) {
  const [form,setForm]=useState({prospect_name:'',call_date:new Date().toISOString().split('T')[0],closer_name:'',call_link:'',is_closed:null,notes:''});
  const [sections,setSections]=useState({decouverte:{},reformulation:{},projection:{},offre:{},closing:{}});
  const [sectionNotes,setSectionNotes]=useState({decouverte:{},reformulation:{},projection:{},offre:{},closing:{}});
  const [loading,setLoading]=useState(false);
  const setSection=(key,val)=>setSections(s=>({...s,[key]:val}));
  const setNote=(key,val)=>setSectionNotes(n=>({...n,[key]:val}));
  const {total,max,percentage}=computeScore(sections);

  const submit=async e=>{
    e.preventDefault();
    if(form.is_closed===null){toast("Indiquez le résultat de l'appel",'error');return;}
    setLoading(true);
    try{
      const result=await apiFetch('/debriefs',{method:'POST',body:{...form,sections,section_notes:sectionNotes,total_score:total,max_score:max,percentage,scores:{},criteria_notes:{}}});
      onSave(result.debrief,result.gamification);
      toast(`Debrief enregistré ! +${result.gamification.pointsEarned} pts`);
      navigate('DebriefDetail',result.debrief.id);
    }catch(err){toast(err.message,'error');}finally{setLoading(false);}
  };

  return <div style={{display:'flex',flexDirection:'column',gap:24}}>
    <div style={{display:'flex',alignItems:'center',gap:12}}>
      <Btn variant="secondary" onClick={()=>navigate('Dashboard')} style={{width:36,height:36,padding:0,borderRadius:8}}>←</Btn>
      <div><h1 style={{fontSize:22,fontWeight:700,color:'#1e293b',margin:0}}>Nouveau debrief</h1><p style={{color:'#94a3b8',fontSize:13,marginTop:2}}>Évaluez votre dernier appel</p></div>
    </div>
    <form onSubmit={submit}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 300px',gap:24,alignItems:'start'}}>
        <div style={{display:'flex',flexDirection:'column',gap:20}}>
          <div style={{background:'white',border:'1px solid #e2e8f0',borderRadius:12,padding:20}}>
            <h3 style={{fontSize:14,fontWeight:600,color:'#1e293b',marginBottom:16}}>Informations de l'appel</h3>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:16}}>
              <div><label style={{display:'block',fontSize:12,fontWeight:600,color:'#374151',marginBottom:6}}>Prospect *</label><Input required placeholder="Nom du prospect" value={form.prospect_name} onChange={e=>setForm({...form,prospect_name:e.target.value})}/></div>
              <div><label style={{display:'block',fontSize:12,fontWeight:600,color:'#374151',marginBottom:6}}>Closer *</label><Input required placeholder="Votre nom" value={form.closer_name} onChange={e=>setForm({...form,closer_name:e.target.value})}/></div>
              <div><label style={{display:'block',fontSize:12,fontWeight:600,color:'#374151',marginBottom:6}}>Date *</label><Input type="date" required value={form.call_date} onChange={e=>setForm({...form,call_date:e.target.value})}/></div>
            </div>
            <div style={{marginBottom:16}}><label style={{display:'block',fontSize:12,fontWeight:600,color:'#374151',marginBottom:6}}>🔗 Lien enregistrement</label><Input type="url" placeholder="https://..." value={form.call_link} onChange={e=>setForm({...form,call_link:e.target.value})}/></div>
            <div>
              <label style={{display:'block',fontSize:12,fontWeight:600,color:'#374151',marginBottom:8}}>Résultat de l'appel *</label>
              <div style={{display:'flex',gap:10}}>
                {[{val:true,label:'✅ Closer',border:'#059669',bg:'#d1fae5',color:'#065f46'},{val:false,label:'❌ Non Closer',border:'#dc2626',bg:'#fee2e2',color:'#991b1b'}].map(({val,label,border,bg,color})=>(
                  <button key={String(val)} type="button" onClick={()=>setForm({...form,is_closed:val})}
                    style={{flex:1,padding:'12px 16px',borderRadius:10,border:`2px solid ${form.is_closed===val?border:'#e2e8f0'}`,background:form.is_closed===val?bg:'white',color:form.is_closed===val?color:'#94a3b8',fontWeight:600,fontSize:13,cursor:'pointer',fontFamily:'inherit',transition:'all 0.2s'}}>{label}</button>
                ))}
              </div>
            </div>
          </div>
          <h2 style={{fontSize:14,fontWeight:600,color:'#1e293b',margin:0}}>Évaluation des critères</h2>
          <DecouverteSection data={sections.decouverte} onChange={v=>setSection('decouverte',v)} notes={sectionNotes.decouverte} onNotesChange={n=>setNote('decouverte',n)}/>
          <ReformulationSection data={sections.reformulation} onChange={v=>setSection('reformulation',v)} notes={sectionNotes.reformulation} onNotesChange={n=>setNote('reformulation',n)}/>
          <ProjectionSection data={sections.projection} onChange={v=>setSection('projection',v)} notes={sectionNotes.projection} onNotesChange={n=>setNote('projection',n)}/>
          <PresentationOffreSection data={sections.offre} onChange={v=>setSection('offre',v)} notes={sectionNotes.offre} onNotesChange={n=>setNote('offre',n)}/>
          <ClosingSection data={sections.closing} onChange={v=>setSection('closing',v)} notes={sectionNotes.closing} onNotesChange={n=>setNote('closing',n)}/>
          <div style={{background:'white',border:'1px solid #e2e8f0',borderRadius:12,padding:20}}>
            <h3 style={{fontSize:14,fontWeight:600,color:'#1e293b',marginBottom:12}}>Notes globales</h3>
            <Textarea placeholder="Notes libres sur l'appel..." value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/>
          </div>
        </div>
        <div style={{position:'sticky',top:80}}>
          <div style={{background:'white',border:'1px solid #e2e8f0',borderRadius:12,padding:24,display:'flex',flexDirection:'column',alignItems:'center',gap:16}}>
            <h3 style={{fontSize:14,fontWeight:600,color:'#1e293b',margin:0}}>Score en direct</h3>
            <ScoreGauge percentage={percentage} size="lg"/>
            <p style={{fontSize:13,color:'#94a3b8',margin:0}}>{total} / {max} points</p>
            {form.is_closed!==null&&<ClosedBadge isClosed={form.is_closed}/>}
            <Btn type="submit" disabled={loading} style={{width:'100%'}}>{loading?'Enregistrement...':'💾 Enregistrer le debrief'}</Btn>
          </div>
        </div>
      </div>
    </form>
  </div>;
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const {toasts,toast}=useToast();
  const [authPage,setAuthPage]=useState('login');
  const [user,setUser]=useState(null);
  const [loadingAuth,setLoadingAuth]=useState(true);
  const [page,setPage]=useState('Dashboard');
  const [selectedId,setSelectedId]=useState(null);
  const [fromPage,setFromPage]=useState(null);
  const [debriefs,setDebriefs]=useState([]);
  const [loadingDebriefs,setLoadingDebriefs]=useState(false);
  const [gamification,setGamification]=useState(null);
  const [resetToken,setResetToken]=useState(null);
  const [burst,setBurst]=useState(null);
  const [leaderboardKey,setLeaderboardKey]=useState(0);

  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);
    const rt=params.get('reset_token');
    if(rt){setResetToken(rt);window.history.replaceState({},document.title,window.location.pathname);}
  },[]);

  useEffect(()=>{
    _onSessionExpired=()=>{setUser(null);setDebriefs([]);setGamification(null);setPage('Dashboard');setAuthPage('login');toast('Session expirée, veuillez vous reconnecter','error');};
    return()=>{_onSessionExpired=null;};
  },[toast]);

  useEffect(()=>{
    const token=getToken();
    if(!token){setLoadingAuth(false);return;}
    apiFetch('/auth/me').then(u=>setUser(u)).catch(()=>clearToken()).finally(()=>setLoadingAuth(false));
  },[]);

  useEffect(()=>{
    if(!user) return;
    setLoadingDebriefs(true);
    Promise.all([apiFetch('/debriefs'),apiFetch('/gamification/me')])
      .then(([d,g])=>{setDebriefs(d);setGamification(g);})
      .catch(console.error).finally(()=>setLoadingDebriefs(false));
  },[user]);

  const navigate=(p,id=null,from=null)=>{setPage(p);setSelectedId(id);if(from)setFromPage(from);else if(p!=='DebriefDetail')setFromPage(null);window.scrollTo({top:0,behavior:'smooth'});};
  const onLogin=(u,gam)=>{setUser(u);if(gam)setGamification(gam);setPage('Dashboard');toast(`Bienvenue, ${u.name} !`);};
  const onLogout=()=>{clearToken();setUser(null);setDebriefs([]);setGamification(null);setPage('Dashboard');setAuthPage('login');toast('Déconnecté');};

  const onSave=(debrief,gam)=>{
    setDebriefs(prev=>[debrief,...prev]);
    if(gam){
      setGamification(gam);setLeaderboardKey(k=>k+1);
      if(gam.pointsEarned>0){setBurst({points:gam.pointsEarned,levelUp:gam.levelUp,newLevel:gam.level.name});setTimeout(()=>setBurst(null),3500);}
    }
  };

  const onDelete=async(id)=>{
    if(!confirm('Supprimer ce debrief ?')) return;
    try{
      const result=await apiFetch(`/debriefs/${id}`,{method:'DELETE'});
      setDebriefs(prev=>prev.filter(d=>d.id!==id));
      if(result.gamification)setGamification(result.gamification);
      setLeaderboardKey(k=>k+1);
      toast('Debrief supprimé');
      navigate('Dashboard');
    }catch(err){toast(err.message,'error');}
  };

  const selectedDebrief=debriefs.find(d=>d.id===selectedId);
  const isHOS=user?.role==='head_of_sales';

  const navItems=[
    {key:'Dashboard',label:'Tableau de bord',icon:'⊞'},
    {key:'NewDebrief',label:'Nouveau debrief',icon:'+'},
    {key:'DebriefHistory',label:'Historique',icon:'🕐'},
    ...(isHOS?[{key:'HOSPage',label:'Head of Sales',icon:'👑'}]:[]),
  ];

  if(loadingAuth) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}><Spinner/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;
  if(resetToken) return <ResetPasswordPage token={resetToken} onDone={()=>{setResetToken(null);setAuthPage('login');toast('Mot de passe modifié !');}} />;
  if(!user){
    if(authPage==='register') return <RegisterPage onLogin={onLogin} goToLogin={()=>setAuthPage('login')}/>;
    if(authPage==='forgot') return <ForgotPasswordPage goToLogin={()=>setAuthPage('login')}/>;
    return <LoginPage onLogin={onLogin} goToRegister={()=>setAuthPage('register')} goToForgot={()=>setAuthPage('forgot')}/>;
  }

  return <div style={{minHeight:'100vh',background:'#f8fafc',fontFamily:"'Inter',system-ui,sans-serif"}}>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}} *{box-sizing:border-box}`}</style>
    {burst&&<PointsBurst points={burst.points} levelUp={burst.levelUp} newLevel={burst.newLevel}/>}
    <ToastContainer toasts={toasts}/>
    <header style={{position:'sticky',top:0,zIndex:50,background:'rgba(255,255,255,0.92)',backdropFilter:'blur(16px)',borderBottom:'1px solid #e2e8f0'}}>
      <div style={{maxWidth:1100,margin:'0 auto',padding:'0 24px',display:'flex',alignItems:'center',justifyContent:'space-between',height:64}}>
        <button onClick={()=>navigate('Dashboard')} style={{display:'flex',alignItems:'center',gap:10,background:'none',border:'none',cursor:'pointer',padding:0,fontFamily:'inherit'}}>
          <div style={{width:36,height:36,borderRadius:10,background:'#6366f1',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>📞</div>
          <span style={{fontSize:16,fontWeight:700,color:'#1e293b',letterSpacing:'-0.02em'}}>CloserDebrief</span>
        </button>
        <nav style={{display:'flex',alignItems:'center',gap:4}}>
          {navItems.map(({key,label,icon})=>(
            <button key={key} onClick={()=>navigate(key)}
              style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:8,border:'none',fontSize:13,fontWeight:500,cursor:'pointer',transition:'all 0.2s',background:page===key?'#6366f1':'transparent',color:page===key?'white':'#64748b',boxShadow:page===key?'0 2px 8px rgba(99,102,241,0.3)':'none',fontFamily:'inherit'}}>
              <span style={{fontSize:14}}>{icon}</span>{label}
            </button>
          ))}
        </nav>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{width:32,height:32,borderRadius:'50%',background:'#ede9fe',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'#6366f1'}}>{user.name.charAt(0).toUpperCase()}</div>
            <span style={{fontSize:13,fontWeight:500,color:'#374151'}}>{user.name}</span>
            {isHOS&&<span style={{background:'#fef3c7',color:'#92400e',fontSize:10,fontWeight:700,padding:'2px 6px',borderRadius:4}}>HOS</span>}
            {gamification&&<span style={{fontSize:14}} title={`${gamification.level.name} · ${gamification.points} pts`}>{gamification.level.icon}</span>}
          </div>
          <Btn variant="secondary" onClick={onLogout} style={{padding:'6px 12px',fontSize:12}}>Déconnexion</Btn>
        </div>
      </div>
    </header>
    <main style={{maxWidth:1100,margin:'0 auto',padding:'32px 24px'}}>
      {loadingDebriefs?<Spinner full/>:<>
        {page==='Dashboard'&&<Dashboard debriefs={debriefs} navigate={navigate} user={user} gamification={gamification} leaderboardKey={leaderboardKey}/>}
        {page==='NewDebrief'&&<NewDebrief navigate={navigate} onSave={onSave} toast={toast}/>}
        {page==='DebriefHistory'&&<DebriefHistory debriefs={debriefs} navigate={navigate} user={user}/>}
        {page==='DebriefDetail'&&<DebriefDetail debrief={selectedDebrief} navigate={navigate} onDelete={onDelete} fromPage={fromPage}/>}
        {page==='HOSPage'&&isHOS&&<HOSPage toast={toast} leaderboardKey={leaderboardKey}/>}
      </>}
    </main>
  </div>;
}
