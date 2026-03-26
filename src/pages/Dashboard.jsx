import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TXT } from '../constants.js';
import { useIsMobile } from '../hooks.js';
import { Btn, Card, Empty } from '../components/ui.jsx';
import { GamCard, Leaderboard, StatsRow, Chart, DebriefCard } from '../components/shared.jsx';
import { MiniPipeline } from '../components/pipeline.jsx';
import { ObjectiveBanner, ActionPlanCard } from '../components/hos.jsx';
export default function Dashboard({ debriefs, navigate, user, gam, lbKey, toast }) {
  const mob = useIsMobile();
  const isHOS = user.role === 'head_of_sales';
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:700, color:'#5a4a3a', margin:0 }}>Tableau de bord</h1>
          <p style={{ color:'#6b7280', marginTop:4, fontSize:14 }}>Bonjour, {user.name} 👋</p>
        </div>
        <Btn onClick={()=>navigate('NewDebrief')}>+ Nouveau debrief</Btn>
      </div>
      {!isHOS && <ObjectiveBanner userId={user.id}/>}
      <GamCard gam={gam}/>
      <StatsRow debriefs={debriefs}/>
      <div style={{ display:'grid', gridTemplateColumns:mob?'1fr':'1fr 320px', gap:14, alignItems:'start' }}>
        <Card style={{ padding:20 }}>
          <h2 style={{ fontSize:14, fontWeight:600, color:TXT, marginBottom:14 }}>Évolution du score</h2>
          <Chart debriefs={debriefs}/>
        </Card>
        <Leaderboard refreshKey={lbKey}/>
      </div>

    {/* Mini Pipeline */}
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <h2 style={{ fontSize:16, fontWeight:700, color:TXT, margin:0 }}>🎯 Pipeline</h2>
      </div>
      <MiniPipeline navigate={navigate}/>
    </div>
      {!isHOS && <ActionPlanCard closerId={user.id} isHOS={false} toast={toast}/>}
      <div>
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
