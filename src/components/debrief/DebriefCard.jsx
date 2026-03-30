import React, { useState } from 'react';
import { P, DS, card } from '../../styles/designSystem';
import { fmtDate } from '../../utils/scoring';
import { ScoreBadge, ClosedBadge } from '../ui';

function DebriefCard({ debrief, onClick, showUser }) {
  const [hov, setHov] = useState(false);
  const pct = Math.round(debrief.percentage || 0);
  return (
    <div onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ background:DS.bgCard, border:`1px solid ${hov?'rgba(232,125,106,.2)':'rgba(255,255,255,.9)'}`, borderRadius:DS.radiusLg, padding:'14px 16px', cursor:'pointer', transition:'all .15s', boxShadow:hov?'0 6px 24px rgba(232,125,106,.15), 0 2px 6px rgba(232,125,106,.1)':'0 2px 8px rgba(100,80,200,.07)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontWeight:600, fontSize:14, color:'#5a4a3a', margin:'0 0 4px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{debrief.prospect_name}</p>
        <div style={{ display:'flex', alignItems:'center', gap:10, fontSize:12, color:DS.textMuted, flexWrap:'wrap' }}>
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


export { DebriefCard };
