import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../config/api';
import { DS } from '../../styles/designSystem';
import { computeLevel } from '../../utils/scoring';
import { Card } from '../ui';

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
            <p style={{ fontSize:11, color:DS.textMuted, margin:0 }}>{c.level.icon} {c.level.name} · {c.totalDebriefs} debriefs</p>
          </div>
          <div style={{ textAlign:'right', flexShrink:0 }}>
            <p style={{ fontWeight:700, fontSize:14, color:'#e87d6a', margin:0 }}>{c.points} pts</p>
            <p style={{ fontSize:11, color:DS.textMuted, margin:0 }}>{c.avgScore}%</p>
          </div>
        </div>
      ))}
    </Card>
  );
}

export { GamCard, Leaderboard };
