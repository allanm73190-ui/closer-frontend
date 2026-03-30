import React from 'react';
import { DS } from '../../styles/designSystem';
import { SECTIONS } from '../../config/ai';

// ─── RADAR CHART ─────────────────────────────────────────────────────────────
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

// ─── SECTION BARS ────────────────────────────────────────────────────────────
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
                {globalScores && <span style={{ fontSize:11, color:DS.textMuted }}>{glob}/5 global</span>}
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
      {globalScores && <p style={{ fontSize:11, color:DS.textMuted, margin:0 }}>— trait gris = moyenne globale</p>}
    </div>
  );
}
