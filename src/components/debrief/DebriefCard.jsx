import React, { useState } from 'react';
import { DS } from '../../styles/designSystem';
import { fmtDate } from '../../utils/scoring';
import { ScoreBadge, ClosedBadge } from '../ui';

function DebriefCard({ debrief, onClick, showUser }) {
  const [hov, setHov] = useState(false);
  const pct = Math.round(debrief.percentage || 0);
  return (
    <div onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{
        background:'linear-gradient(145deg, rgba(255,255,255,.95), rgba(253,241,235,.72))',
        border:`1px solid ${hov?'rgba(232,125,106,.26)':'var(--border)'}`,
        borderRadius:DS.radiusLg,
        padding:'16px 18px',
        cursor:'pointer',
        transition:'all .18s',
        boxShadow:hov?'0 20px 34px rgba(232,125,106,.18), 0 6px 14px rgba(68,53,47,.08)':'0 8px 18px rgba(68,53,47,.08)',
        transform:hov ? 'translateY(-2px)' : 'none',
        display:'flex',
        alignItems:'center',
        justifyContent:'space-between',
        gap:12,
      }}>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontWeight:700, fontSize:14, color:'var(--txt,#5a4a3a)', margin:'0 0 5px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{debrief.prospect_name}</p>
        <div style={{ display:'flex', alignItems:'center', gap:10, fontSize:12, color:DS.textMuted, flexWrap:'wrap' }}>
          <span>📅 {fmtDate(debrief.call_date)}</span>
          <span>👤 {debrief.closer_name}</span>
          {showUser&&debrief.user_name&&<span style={{background:'rgba(253,232,228,.34)',padding:'2px 7px',borderRadius:999, border:'1px solid var(--border)'}}>par {debrief.user_name}</span>}
        </div>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
        <ClosedBadge isClosed={debrief.is_closed}/>
        <ScoreBadge pct={pct}/>
        <span style={{ color:hov?'#e87d6a':'#d1d5db', fontSize:18, transition:'color .15s' }}>→</span>
      </div>
    </div>
  );
}


export { DebriefCard };
