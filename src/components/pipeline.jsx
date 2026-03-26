import React, { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from '../api.js';
import { P, P2, TXT, TXT3, WHITE, SH_SM, SH_HOVERED, R_SM, R_MD, R_FULL, cardSm, BTN, PIPELINE_STAGES } from '../constants.js';

import { Spinner } from './ui.jsx';

export function DealCard({ deal, onOpen, onMove }) {
  const [showMenu, setShowMenu] = useState(false);
  const [dragging, setDragging] = useState(false);
  const draggedRef = useRef(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const h = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const isOverdue = deal.follow_up_date && new Date(deal.follow_up_date) < new Date() && !['signe','perdu'].includes(deal.status);
  const scoreVal  = deal.debrief_score != null ? deal.debrief_score : null;
  const scoreColor = scoreVal == null ? TXT3 : scoreVal>=80 ? '#5a9858' : scoreVal>=60 ? '#c07830' : '#c05040';
  const fmtD = d => { try { return new Date(d).toLocaleDateString('fr-FR',{day:'2-digit',month:'short'}); } catch { return d; }};

  return (
    <div draggable
      onDragStart={e=>{ e.dataTransfer.setData('dealId',String(deal.id)); draggedRef.current=true; setDragging(true); e.dataTransfer.effectAllowed='move'; }}
      onDragEnd={()=>{ setDragging(false); setTimeout(()=>{ draggedRef.current=false; },100); }}
      onClick={()=>{ if(!draggedRef.current) onOpen(deal); }}
      style={{ background:WHITE, borderRadius:R_MD, boxShadow:dragging?SH_HOVERED:SH_SM, border:`1px solid ${isOverdue?'rgba(192,80,64,.25)':'rgba(232,125,106,.08)'}`, padding:'12px 14px', cursor:'grab', transition:'all .15s', opacity:dragging?.5:1, transform:dragging?'rotate(2deg) scale(1.02)':'none', userSelect:'none' }}
      onMouseEnter={e=>{ if(!dragging) e.currentTarget.style.boxShadow=SH_HOVERED; }}
      onMouseLeave={e=>{ if(!dragging) e.currentTarget.style.boxShadow=SH_SM; }}>
      {/* Nom + menu */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
        <p style={{fontWeight:700,fontSize:14,color:TXT,margin:0,flex:1,marginRight:8,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{deal.prospect_name}</p>
        <div ref={menuRef} style={{position:'relative',flexShrink:0}}>
          <button onClick={e=>{e.stopPropagation();setShowMenu(v=>!v);}} style={{background:'none',border:'none',color:TXT3,cursor:'pointer',fontSize:18,padding:'0 2px',lineHeight:1,fontFamily:'inherit'}}>⋮</button>
          {showMenu && (
            <div style={{position:'absolute',right:0,top:'calc(100% + 4px)',background:WHITE,borderRadius:R_MD,boxShadow:SH_HOVERED,minWidth:170,zIndex:100,overflow:'hidden'}}>
              {PIPELINE_STAGES.filter(s=>s.key!==deal.status).map(s=>(
                <button key={s.key} onClick={e=>{e.stopPropagation();onMove(deal.id,s.key);setShowMenu(false);}}
                  style={{width:'100%',display:'flex',alignItems:'center',gap:8,padding:'9px 14px',background:'none',border:'none',fontSize:12,cursor:'pointer',fontFamily:'inherit',color:TXT,textAlign:'left'}}
                  onMouseEnter={e=>e.currentTarget.style.background='rgba(253,232,228,.2)'}
                  onMouseLeave={e=>e.currentTarget.style.background='none'}>
                  <span style={{fontSize:13}}>{s.icon}</span> → {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* CA + source */}
      <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:10}}>
        <p style={{fontSize:14,fontWeight:700,color:'#5a9858',margin:0}}>
          {deal.value>0 ? `${deal.value.toLocaleString('fr-FR')} €` : <span style={{color:TXT3,fontSize:12,fontWeight:400}}>Aucun CA</span>}
        </p>
        {deal.source && <span style={{fontSize:11,color:TXT3}}>{deal.source}</span>}
      </div>
      {/* Barre score */}
      <div style={{marginBottom:10}}>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:TXT3,marginBottom:3}}>
          <span>Score debrief</span>
          <span style={{color:scoreColor,fontWeight:700}}>{scoreVal!=null?`${scoreVal}%`:'Aucun'}</span>
        </div>
        <div style={{height:4,background:'#f0e8e0',borderRadius:2}}>
          {scoreVal!=null && <div style={{height:'100%',width:`${scoreVal}%`,background:`linear-gradient(90deg,${P},${P2})`,borderRadius:2,transition:'width .5s'}}/>}
        </div>
      </div>
      {/* Closer + date */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span style={{fontSize:11,color:TXT3}}>{deal.user_name||'—'}</span>
        {deal.follow_up_date && <span style={{fontSize:11,fontWeight:isOverdue?700:400,color:isOverdue?'#c05040':TXT3}}>{isOverdue?'⚠ ':''}{fmtD(deal.follow_up_date)}</span>}
      </div>
    </div>
  );
}

// ─── DROP COLUMN — Kanban desktop ─────────────────────────────────────────────

export function DropColumn({ stage, deals, onOpen, onMove }) {
  const [over, setOver] = useState(false);
  return (
    <div style={{flex:1,minWidth:0,display:'flex',flexDirection:'column',gap:8}}>
      <div style={{padding:'8px 12px',background:stage.bg,borderRadius:R_SM,display:'flex',alignItems:'center',justifyContent:'space-between',borderLeft:`3px solid ${stage.color}`}}>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <span style={{fontSize:13}}>{stage.icon}</span>
          <span style={{fontSize:12,fontWeight:700,color:stage.color}}>{stage.label}</span>
        </div>
        <span style={{background:WHITE,color:stage.color,fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:R_FULL,minWidth:22,textAlign:'center'}}>{deals.length}</span>
      </div>
      <div
        onDragOver={e=>{e.preventDefault();setOver(true);}}
        onDragLeave={()=>setOver(false)}
        onDrop={e=>{e.preventDefault();setOver(false);const id=e.dataTransfer.getData('dealId');if(id)onMove(id,stage.key);}}
        style={{display:'flex',flexDirection:'column',gap:8,minHeight:100,padding:over?6:0,background:over?stage.bg:'transparent',borderRadius:R_SM,border:`2px dashed ${over?stage.color:'transparent'}`,transition:'all .15s'}}>
        {deals.map(d=><DealCard key={d.id} deal={d} onOpen={onOpen} onMove={onMove}/>)}
        {deals.length===0 && !over && <div style={{border:`2px dashed rgba(232,125,106,.15)`,borderRadius:R_SM,padding:'20px 10px',textAlign:'center',color:TXT3,fontSize:11}}>Déposez ici</div>}
      </div>
    </div>
  );
}

// ─── ACCORDION COLUMN — Mobile ─────────────────────────────────────────────────

export function AccordionColumn({ stage, deals, onOpen, onMove }) {
  const [open, setOpen] = useState(deals.length > 0);
  useEffect(()=>{ if(deals.length>0) setOpen(true); },[deals.length]);
  return (
    <div style={{borderRadius:R_MD,overflow:'hidden',border:`1px solid rgba(232,125,106,.1)`,background:WHITE,boxShadow:SH_SM}}>
      <button type="button" onClick={()=>setOpen(v=>!v)} style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',background:open?stage.bg:WHITE,border:'none',cursor:'pointer',fontFamily:'inherit',transition:'background .2s'}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={{fontSize:14}}>{stage.icon}</span>
          <span style={{fontSize:13,fontWeight:700,color:stage.color}}>{stage.label}</span>
          <span style={{background:WHITE,color:stage.color,fontSize:11,fontWeight:700,padding:'1px 8px',borderRadius:R_FULL}}>{deals.length}</span>
        </div>
        <span style={{color:TXT3,fontSize:12,transition:'transform .2s',display:'inline-block',transform:open?'rotate(180deg)':'none'}}>▼</span>
      </button>
      {open && (
        <div style={{padding:'8px 12px 12px',display:'flex',flexDirection:'column',gap:8,borderTop:`1px solid rgba(232,125,106,.08)`}}>
          {deals.length===0
            ? <p style={{fontSize:12,color:TXT3,textAlign:'center',padding:'12px 0'}}>Aucun lead</p>
            : deals.map(d=><DealCard key={d.id} deal={d} onOpen={onOpen} onMove={onMove}/>)
          }
        </div>
      )}
    </div>
  );
}

// ─── PIPELINE PAGE ─────────────────────────────────────────────────────────────

export function MiniPipeline({ navigate }) {
  const [deals, setDeals] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => {
    apiFetch('/deals').then(setDeals).catch(()=>{}).finally(()=>setLoading(false));
  }, []);

  if (loading) return <Spinner/>;

  const signed   = deals.filter(d=>d.status==='signe').reduce((s,d)=>s+(d.value||0),0);
  const pipeline = deals.filter(d=>!['signe','perdu'].includes(d.status)).reduce((s,d)=>s+(d.value||0),0);
  const closed   = deals.filter(d=>['signe','perdu'].includes(d.status));
  const winRate  = closed.length ? Math.round(deals.filter(d=>d.status==='signe').length/closed.length*100) : 0;
  const late     = deals.filter(d=>d.follow_up_date && new Date(d.follow_up_date)<new Date() && !['signe','perdu'].includes(d.status)).length;

  const stages = [
    { key:'prospect',     label:'Prospect',   color:'#a09080', bg:'rgba(245,237,230,.6)' },
    { key:'premier_appel',label:'1er appel',  color:'#e87d6a', bg:'rgba(253,232,228,.6)' },
    { key:'relance',      label:'Relance',    color:'#c07830', bg:'rgba(254,243,224,.6)' },
    { key:'negociation',  label:'Négo.',      color:'#3a7a9a', bg:'rgba(218,237,245,.6)' },
    { key:'signe',        label:'Signés ✓',   color:'#5a9858', bg:'rgba(218,240,216,.6)' },
    { key:'perdu',        label:'Perdus',     color:'#c05040', bg:'rgba(253,232,228,.6)' },
  ];

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
            <p style={{ fontSize:10, color:TXT3, margin:'0 0 4px', textTransform:'uppercase', letterSpacing:'.04em', fontWeight:600 }}>{label}</p>
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
                      <p style={{ fontWeight:600, fontSize:12, color:TXT, margin:'0 0 3px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.prospect_name}</p>
                      {d.value>0 && <p style={{ fontSize:11, color:'#5a9858', fontWeight:700, margin:0 }}>{d.value.toLocaleString('fr-FR')} €</p>}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <button onClick={()=>navigate('Pipeline')} style={{ ...BTN.secondary, padding:'8px 16px', fontSize:13, borderRadius:R_FULL, alignSelf:'flex-end', cursor:'pointer', fontFamily:'inherit' }}>
        Voir tout le pipeline →
      </button>
    </div>
  );
}

