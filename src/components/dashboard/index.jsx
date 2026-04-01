import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../config/api';
import { loadPipelineConfig, DEFAULT_PIPELINE_STATUSES } from '../../config/pipeline';
import { DS, P, P2, TXT, TXT3, R_SM, R_MD, R_FULL, SH_SM, SH_BTN, card, cardSm } from '../../styles/designSystem';
import { useIsMobile } from '../../hooks';
import { Btn, Input, Card, Spinner, Empty } from '../ui';
import { GamCard } from '../gamification';
import { StatsRow, Chart } from './StatsChart';
import { DebriefCard } from '../debrief/DebriefCard';
import { ObjectiveBanner } from '../gamification/Objectives';
import { ActionPlanCard } from '../gamification/Objectives';

function Dashboard({ debriefs, navigate, user, gam, toast }) {
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
      <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:14, alignItems:'start' }}>
        <Card style={{ padding:20 }}>
          <h2 style={{ fontSize:14, fontWeight:600, color:'var(--txt,#5a4a3a)', marginBottom:14 }}>Évolution du score</h2>
          <Chart debriefs={debriefs}/>
        </Card>
      </div>

    {/* Mini Pipeline */}
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <h2 style={{ fontSize:16, fontWeight:700, color:'var(--txt,#5a4a3a)', margin:0 }}>🎯 Pipeline</h2>
      </div>
      <MiniPipeline navigate={navigate} user={user}/>
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
function MiniPipeline({ navigate, user }) {
  const [deals, setDeals] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const stages = React.useMemo(() => {
    try {
      return loadPipelineConfig(user?.id).statuses || DEFAULT_PIPELINE_STATUSES;
    } catch {
      return DEFAULT_PIPELINE_STATUSES;
    }
  }, [user?.id, deals.length]);

  React.useEffect(() => {
    apiFetch('/deals').then(setDeals).catch(()=>{}).finally(()=>setLoading(false));
  }, []);

  if (loading) return <Spinner/>;

  const closedKeys = stages.filter(stage => stage.closed).map(stage => stage.key);
  const wonKeys = stages.filter(stage => stage.won).map(stage => stage.key);
  const signed   = deals.filter(d=>wonKeys.includes(d.status)).reduce((s,d)=>s+(d.value||0),0);
  const pipeline = deals.filter(d=>!closedKeys.includes(d.status)).reduce((s,d)=>s+(d.value||0),0);
  const closed   = deals.filter(d=>closedKeys.includes(d.status));
  const winRate  = closed.length ? Math.round(deals.filter(d=>wonKeys.includes(d.status)).length/closed.length*100) : 0;
  const late     = deals.filter(d=>d.follow_up_date && new Date(d.follow_up_date)<new Date() && !closedKeys.includes(d.status)).length;

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
            <p style={{ fontSize:10, color:'var(--txt3,#c8b8a8)', margin:'0 0 4px', textTransform:'uppercase', letterSpacing:'.04em', fontWeight:600 }}>{label}</p>
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
                      <p style={{ fontWeight:600, fontSize:12, color:'var(--txt,#5a4a3a)', margin:'0 0 3px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.prospect_name}</p>
                      {d.value>0 && <p style={{ fontSize:11, color:'#5a9858', fontWeight:700, margin:0 }}>{d.value.toLocaleString('fr-FR')} €</p>}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <button onClick={()=>navigate('Pipeline')} style={{ background:'white', color:'var(--txt,#5a4a3a)', border:'none', boxShadow:SH_SM, padding:'8px 16px', fontSize:13, borderRadius:R_FULL, alignSelf:'flex-end', cursor:'pointer', fontFamily:'inherit' }}>
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
        <p style={{ color:DS.textMuted, fontSize:13, marginTop:4 }}>{debriefs.length} debrief{debriefs.length!==1?'s':''}</p>
      </div>
      <div style={{ position:'relative' }}>
        <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:DS.textMuted, pointerEvents:'none' }}>🔍</span>
        <input placeholder="Rechercher..." value={q} onChange={e=>setQ(e.target.value)} style={{ width:'100%', padding:'12px 36px', border:'1px solid rgba(232,125,106,.12)', borderRadius:10, fontSize:14, fontFamily:'inherit', outline:'none', boxSizing:'border-box' }}/>
        {q && <button onClick={()=>setQ('')} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:DS.textMuted, cursor:'pointer', fontSize:18 }}>✕</button>}
      </div>
      {filtered.length===0
        ? <Empty icon="🔍" title="Aucun résultat" subtitle={q?`Aucun debrief pour "${q}"`:'Aucun debrief'} action={q?<Btn variant="secondary" onClick={()=>setQ('')}>Effacer</Btn>:null}/>
        : (
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {filtered.map(d => (
              <div key={d.id} style={{ display:'flex', alignItems:'stretch', gap:8 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <DebriefCard debrief={d} onClick={()=>navigate('Detail',d.id,'History')} showUser={isHOS}/>
                </div>
                <Btn variant="secondary" onClick={()=>navigate('EditDebrief', d.id, 'History')} style={{ fontSize:12, padding:'0 12px' }}>
                  ✏️ Modifier
                </Btn>
              </div>
            ))}
          </div>
        )
      }
    </div>
  );
}


export { Dashboard, MiniPipeline, History };
