import React, { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from '../api.js';
import { P, P2, A, TXT, TXT2, TXT3, SAND, WHITE, SH_CARD, SH_SM, SH_BTN, SH_IN, SH_HOVERED, R_SM, R_MD, R_LG, R_XL, R_FULL, card, cardSm, inp, BTN, DS, DEFAULT_DEBRIEF_CONFIG, PIPELINE_STAGES, SECTIONS } from '../constants.js';
import { fmtDate, fmtShort, computeScore, computeSectionScores, computeLevel, avgSectionScores } from '../utils.js';
import { useIsMobile, useToast, useDebriefConfig } from '../hooks.js';
import { Input, Textarea, Btn, AlertBox, Spinner, Card, Modal, Empty } from '../components/ui.jsx';
import { ScoreGauge, ScoreBadge, ClosedBadge, Radar, SectionBars, GamCard, Leaderboard, StatsRow, Chart, RadioGroup, CheckboxGroup, SectionNotes, CatCard, DebriefCard } from '../components/shared.jsx';
import { MiniPipeline, DealCard, DropColumn, AccordionColumn } from '../components/pipeline.jsx';
import { UserMenu } from '../components/layout.jsx';
import { MemberRow, TeamCard, ProgBar, ObjectiveBanner, ObjectiveModal, ActionPlanCard, CommentsSection } from '../components/hos.jsx';
import LeadSheet from './LeadSheet.jsx';

export default function PipelinePage({ user, toast, debriefs }) {
  const [deals, setDeals]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [openLead, setOpenLead] = useState(null);
  const [filter, setFilter]     = useState('all');
  const mob = useIsMobile();

  useEffect(()=>{
    apiFetch('/deals').then(setDeals).catch(()=>{}).finally(()=>setLoading(false));
  },[]);
  useEffect(()=>{
    const fn=()=>apiFetch('/deals').then(setDeals).catch(()=>{});
    window.addEventListener('focus',fn);
    return ()=>window.removeEventListener('focus',fn);
  },[]);

  const handleSave   = (deal,isEdit) => setDeals(p=>isEdit?p.map(d=>d.id===deal.id?deal:d):[deal,...p]);
  const handleMove   = async (id,status) => {
    setDeals(p=>p.map(d=>(d.id===id||d.id===String(id))?{...d,status}:d));
    try { const u=await apiFetch(`/deals/${id}`,{method:'PATCH',body:{status}}); setDeals(p=>p.map(d=>d.id===u.id?u:d)); }
    catch(e){ toast(e.message,'error'); apiFetch('/deals').then(setDeals).catch(()=>{}); }
  };
  const handleDelete = id => setDeals(p=>p.filter(d=>d.id!==id));

  const isHOS = user.role==='head_of_sales';
  const closers = [...new Map(deals.filter(d=>d.user_id).map(d=>[d.user_id,{id:d.user_id,name:d.user_name}])).values()];
  const displayDeals = filter==='all' ? deals : deals.filter(d=>d.user_id===filter);

  const signed  = deals.filter(d=>d.status==='signe');
  const active  = deals.filter(d=>!['signe','perdu'].includes(d.status));
  const closed  = deals.filter(d=>['signe','perdu'].includes(d.status));
  const overdue = active.filter(d=>d.follow_up_date&&new Date(d.follow_up_date)<new Date());
  const winRate = closed.length ? Math.round(signed.length/closed.length*100) : 0;
  const totalCA = signed.reduce((s,d)=>s+(d.value||0),0);
  const totalPipe = active.reduce((s,d)=>s+(d.value||0),0);

  if (loading) return <Spinner full/>;
  return (
    <div style={{display:'flex',flexDirection:'column',gap:20}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:700,color:TXT,margin:0}}>Pipeline</h1>
          <p style={{color:TXT2,fontSize:13,marginTop:4}}>{deals.length} lead{deals.length!==1?'s':''}</p>
        </div>
        <Btn onClick={()=>setOpenLead({})}>+ Nouveau lead</Btn>
      </div>

      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:mob?'repeat(2,1fr)':'repeat(4,1fr)',gap:10}}>
        {[
          {label:'CA Signé',  value:`${totalCA.toLocaleString('fr-FR')} €`,   color:'#5a9858', bg:'rgba(218,240,216,.5)'},
          {label:'Pipeline',  value:`${totalPipe.toLocaleString('fr-FR')} €`, color:P,          bg:'rgba(253,232,228,.5)'},
          {label:'Taux win',  value:`${winRate}%`,                            color:'#c07830',  bg:'rgba(254,243,224,.5)'},
          {label:'En retard', value:overdue.length,                           color:overdue.length>0?'#c05040':TXT3, bg:overdue.length>0?'rgba(253,232,228,.5)':'rgba(245,237,230,.3)'},
        ].map(({label,value,color,bg})=>(
          <div key={label} style={{...cardSm(),padding:'14px 16px'}}>
            <p style={{fontSize:10,color:TXT3,margin:'0 0 5px',textTransform:'uppercase',letterSpacing:'.05em',fontWeight:600}}>{label}</p>
            <p style={{fontSize:20,fontWeight:700,color,margin:0}}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filtre HOS */}
      {isHOS && closers.length>1 && (
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          {[{id:'all',name:'Tous'},...closers].map(c=>(
            <button key={c.id} type="button" onClick={()=>setFilter(c.id)}
              style={{padding:'6px 14px',borderRadius:R_FULL,border:`1.5px solid ${filter===c.id?P:'rgba(232,125,106,.2)'}`,background:filter===c.id?'rgba(253,232,228,.6)':WHITE,color:filter===c.id?P2:TXT2,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',transition:'all .15s'}}>
              {c.name}
            </button>
          ))}
        </div>
      )}

      {deals.length===0 ? (
        <Empty icon="🎯" title="Pipeline vide" subtitle="Créez votre premier lead pour commencer" action={<Btn onClick={()=>setOpenLead({})}>+ Créer un lead</Btn>}/>
      ) : mob ? (
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {PIPELINE_STAGES.map(stage=>(
            <AccordionColumn key={stage.key} stage={stage} deals={displayDeals.filter(d=>d.status===stage.key)} onOpen={setOpenLead} onMove={handleMove}/>
          ))}
        </div>
      ) : (
        <div style={{overflowX:'auto',paddingBottom:8}}>
          <div style={{display:'flex',gap:12,minWidth:`${PIPELINE_STAGES.length*190}px`}}>
            {PIPELINE_STAGES.map(stage=>(
              <DropColumn key={stage.key} stage={stage} deals={displayDeals.filter(d=>d.status===stage.key)} onOpen={setOpenLead} onMove={handleMove}/>
            ))}
          </div>
        </div>
      )}

      {openLead!==null && (
        <LeadSheet deal={openLead?.id?openLead:null} debriefs={debriefs||[]} onClose={()=>setOpenLead(null)} onSave={handleSave} onDelete={handleDelete} toast={toast}/>
      )}
    </div>
  );
}
