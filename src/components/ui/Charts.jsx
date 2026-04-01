import React from 'react';
import { DS } from '../../styles/designSystem';
import { SECTIONS } from '../../config/ai';

// ─── RADAR CHART ─────────────────────────────────────────────────────────────
function valueForKey(scores, key) {
  if (!scores) return 0;
  if (scores[key] != null) return Number(scores[key]) || 0;
  if (key === 'presentation_offre' && scores.offre != null) return Number(scores.offre) || 0;
  if (key === 'offre' && scores.presentation_offre != null) return Number(scores.presentation_offre) || 0;
  return 0;
}

function buildPolygonPoints({ values, size, radius }) {
  const n = SECTIONS.length;
  const cx = size / 2;
  const cy = size / 2;
  const angle = i => (i / n) * 2 * Math.PI - Math.PI / 2;
  return SECTIONS.map((section, i) => {
    const val = Math.max(0, Math.min(5, valueForKey(values, section.key)));
    const ratio = val / 5;
    const a = angle(i);
    return [cx + radius * ratio * Math.cos(a), cy + radius * ratio * Math.sin(a)];
  });
}

export function Radar({ scores, compareScores=null, color='#e87d6a', compareColor='#6aacce', size=260 }) {
  if (!scores) return null;
  const n = SECTIONS.length;
  const cx = size / 2;
  const cy = size / 2;
  const R = size * 0.33;
  const angle = i => (i / n) * 2 * Math.PI - Math.PI / 2;
  const pts = buildPolygonPoints({ values:scores, size, radius:R });
  const hasCompare = !!compareScores;
  const comparePts = hasCompare ? buildPolygonPoints({ values:compareScores, size, radius:R }) : [];
  const allZero = SECTIONS.every(s => valueForKey(scores, s.key) === 0);
  const fill = color === '#059669' ? 'rgba(5,150,105,.16)' : 'rgba(232,125,106,.17)';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow:'visible', maxWidth:'100%' }}>
      {[1,2,3,4,5].map(l => {
        const r = (l / 5) * R;
        const ps = SECTIONS.map((_,i) => { const a=angle(i); return `${cx+r*Math.cos(a)},${cy+r*Math.sin(a)}`; }).join(' ');
        return <polygon key={l} points={ps} fill={l === 5 ? 'rgba(255,255,255,.35)' : 'none'} stroke="rgba(148,163,184,.28)" strokeWidth="1"/>;
      })}
      {SECTIONS.map((_,i) => { const a=angle(i); return <line key={i} x1={cx} y1={cy} x2={cx+R*Math.cos(a)} y2={cy+R*Math.sin(a)} stroke="rgba(148,163,184,.32)" strokeWidth="1"/>; })}

      {hasCompare && (
        <polygon points={comparePts.map(p => p.join(',')).join(' ')} fill={`${compareColor}20`} stroke={compareColor} strokeWidth="2" strokeDasharray="4 4" />
      )}

      {!allZero && (
        <>
          <polygon points={pts.map(p=>p.join(',')).join(' ')} fill={fill} stroke={color} strokeWidth="2.6"/>
          {pts.map(([x,y],i) => <circle key={i} cx={x} cy={y} r={4.5} fill={color} stroke="white" strokeWidth="2"/>)}
        </>
      )}

      {SECTIONS.map((s,i) => {
        const a = angle(i);
        const shortLabel = s.label.replace(/[^\w\sÀ-ÿ]/g, '').trim();
        return (
          <text
            key={i}
            x={cx+(R+26)*Math.cos(a)}
            y={cy+(R+26)*Math.sin(a)}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="9.5"
            fill="#64748b"
            fontWeight="700"
          >
            {shortLabel}
          </text>
        );
      })}

      <circle cx={cx} cy={cy} r={3.2} fill="rgba(148,163,184,.65)" />
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
              <span style={{ fontSize:13, fontWeight:700, color:'var(--txt,#5a4a3a)' }}>{LABELS[key]}</span>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                {globalScores && <span style={{ fontSize:11, color:DS.textMuted }}>{glob}/5 global</span>}
                <span style={{ fontSize:12, fontWeight:700, padding:'3px 8px', borderRadius:999, border:'1px solid var(--border)', background:'var(--chip-bg)', color:col(val) }}>{val}/5</span>
                {diff !== null && diff !== 0 && <span style={{ fontSize:11, fontWeight:600, color:diff>0?'#059669':'#ef4444' }}>{diff>0?'+':''}{diff}</span>}
              </div>
            </div>
            <div style={{ position:'relative', height:10, background:'rgba(148,163,184,.16)', borderRadius:999, overflow:'visible' }}>
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
