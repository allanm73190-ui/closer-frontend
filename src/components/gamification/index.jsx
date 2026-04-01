import React from 'react';
import { DS } from '../../styles/designSystem';
import { computeLevel } from '../../utils/scoring';

function GamCard({ gam }) {
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
            <div style={{ height:'100%', width:`${pct}%`, background:DS.bgCard, borderRadius:4, transition:'width .7s' }}/>
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

export { GamCard };
