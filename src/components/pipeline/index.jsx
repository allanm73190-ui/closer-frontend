import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../config/api';
import { DS, P, P2, TXT, TXT2, TXT3, R_SM, R_MD, R_LG, R_FULL, WHITE, SH_SM, SH_BTN, SH_CARD, card, cardSm, inp } from '../../styles/designSystem';
import { useIsMobile, useBreakpoint } from '../../hooks';
import { fmtDate, computeSectionScores } from '../../utils/scoring';
import { SECTIONS } from '../../config/ai';
import { Btn, Input, Textarea, Card, Modal, Spinner, Empty, AlertBox, ScoreBadge, ClosedBadge } from '../ui';

const PIPELINE_STAGES = [
  { key:'prospect',     label:'Prospects',    color:'#6b7280', bg:'#f1f5f9',  icon:'👤' },
  { key:'premier_appel',label:'1er appel',    color:'#e87d6a', bg:'rgba(253,232,228,.6)',  icon:'📞' },
  { key:'relance',      label:'Relance',      color:'#d97706', bg:'#fef3c7',  icon:'🔄' },
  { key:'negociation',  label:'Négociation',  color:'#e87d6a', bg:'rgba(255,248,245,.8)',  icon:'🤝' },
  { key:'signe',        label:'Signés ✓',     color:'#059669', bg:'#d1fae5',  icon:'✅' },
  { key:'perdu',        label:'Perdus',       color:'#dc2626', bg:'#fee2e2',  icon:'❌' },
];

function LeadSheet({ deal, debriefs, onClose, onSave, onDelete, toast }) {
  const [form, setForm] = useState({
    prospect_name: deal?.prospect_name || '',
    source:        deal?.source        || '',
    value:         deal?.value != null ? String(deal.value) : '',
    status:        deal?.status        || 'prospect',
    follow_up_date:deal?.follow_up_date|| '',
    notes:         deal?.notes         || '',
    debrief_id:    deal?.debrief_id    || '',
  });
  const [saving, setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isNew = !deal?.id;

  const linkedDebrief = debriefs.find(d => d.id === form.debrief_id);

  const save = async () => {
    if (!form.prospect_name.trim()) return;
    setSaving(true);
    try {
      const body = { ...form, value: Number(form.value) || 0, debrief_id: form.debrief_id || null };
      const result = isNew
        ? await apiFetch('/deals', { method:'POST', body })
        : await apiFetch(`/deals/${deal.id}`, { method:'PATCH', body });
      onSave(result, !isNew);
      toast(isNew ? 'Lead créé !' : 'Lead mis à jour !');
      onClose();
    } catch(e) { toast(e.message, 'error'); } finally { setSaving(false); }
  };

  const del = async () => {
    if (!confirm('Supprimer ce lead ?')) return;
    setDeleting(true);
    try {
      await apiFetch(`/deals/${deal.id}`, { method:'DELETE' });
      onDelete(deal.id);
      toast('Lead supprimé');
      onClose();
    } catch(e) { toast(e.message, 'error'); } finally { setDeleting(false); }
  };

  return (
    <div style={{ position:'fixed', inset:0, zIndex:9000, background:'rgba(90,74,58,.2)', display:'flex', alignItems:'flex-end', justifyContent:'center' }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:'#ffffff', borderRadius:'16px 16px 0 0', width:'100%', maxWidth:560, maxHeight:'92vh', overflowY:'auto', boxShadow:'0 -8px 40px rgba(0,0,0,.15)' }}>

        {/* Header */}
        <div style={{ padding:'20px 20px 0', position:'sticky', top:0, background:'#ffffff', zIndex:1 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              {(() => {
                const stage = PIPELINE_STAGES.find(s => s.key === form.status) || PIPELINE_STAGES[0];
                return <span style={{ background:stage.bg, color:stage.color, fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:20 }}>{stage.icon} {stage.label}</span>;
              })()}
            </div>
            <div style={{ display:'flex', gap:8 }}>
              {!isNew && <button onClick={del} disabled={deleting} style={{ background:'#fee2e2', border:'none', color:'#dc2626', borderRadius:8, padding:'6px 12px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>🗑 Supprimer</button>}
              <button onClick={onClose} style={{ background:'none', border:'none', color:DS.textMuted, cursor:'pointer', fontSize:22, lineHeight:1, padding:'2px 6px' }}>✕</button>
            </div>
          </div>
          {/* Nom prospect */}
          <input
            placeholder="Nom du prospect *"
            value={form.prospect_name}
            onChange={e=>setForm({...form,prospect_name:e.target.value})}
            style={{ width:'100%', fontSize:20, fontWeight:700, color:'#5a4a3a', border:'none', outline:'none', borderBottom:'2px solid #e2e8f0', paddingBottom:10, marginBottom:16, fontFamily:'inherit', boxSizing:'border-box', background:'transparent' }}
            onFocus={e=>e.target.style.borderBottomColor='#e87d6a'}
            onBlur={e=>e.target.style.borderBottomColor='#e2e8f0'}
          />
        </div>

        <div style={{ padding:'0 20px 24px', display:'flex', flexDirection:'column', gap:20 }}>

          {/* Statut */}
          <div>
            <label style={{ display:'block', fontSize:11, fontWeight:600, color:'#6b7280', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:8 }}>Statut</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {PIPELINE_STAGES.map(s => (
                <button key={s.key} onClick={()=>setForm({...form,status:s.key})}
                  style={{ padding:'6px 14px', borderRadius:20, border:`1.5px solid ${form.status===s.key?s.color:'#e2e8f0'}`, background:form.status===s.key?s.bg:'white', color:form.status===s.key?s.color:'#6b7280', fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:'inherit', transition:'all .15s' }}>
                  {s.icon} {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Infos clés */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:600, color:'#6b7280', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:6 }}>💶 CA (€)</label>
              <input type="number" placeholder="0" value={form.value} onChange={e=>setForm({...form,value:e.target.value})}
                style={{ width:'100%', borderRadius:8, border:'1px solid rgba(232,125,106,.12)', padding:'10px 12px', fontSize:14, fontFamily:'inherit', outline:'none', boxSizing:'border-box', color:'#5a4a3a' }}
                onFocus={e=>e.target.style.borderColor='#e87d6a'} onBlur={e=>e.target.style.borderColor='#e2e8f0'}/>
            </div>
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:600, color:'#6b7280', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:6 }}>📅 Relance</label>
              <input type="date" value={form.follow_up_date} onChange={e=>setForm({...form,follow_up_date:e.target.value})}
                style={{ width:'100%', borderRadius:8, border:'1px solid rgba(232,125,106,.12)', padding:'10px 12px', fontSize:14, fontFamily:'inherit', outline:'none', boxSizing:'border-box', color:'#5a4a3a' }}
                onFocus={e=>e.target.style.borderColor='#e87d6a'} onBlur={e=>e.target.style.borderColor='#e2e8f0'}/>
            </div>
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:600, color:'#6b7280', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:6 }}>📥 Source</label>
              <input placeholder="LinkedIn, Inbound..." value={form.source} onChange={e=>setForm({...form,source:e.target.value})}
                style={{ width:'100%', borderRadius:8, border:'1px solid rgba(232,125,106,.12)', padding:'10px 12px', fontSize:14, fontFamily:'inherit', outline:'none', boxSizing:'border-box', color:'#5a4a3a' }}
                onFocus={e=>e.target.style.borderColor='#e87d6a'} onBlur={e=>e.target.style.borderColor='#e2e8f0'}/>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={{ display:'block', fontSize:11, fontWeight:600, color:'#6b7280', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:6 }}>📝 Notes</label>
            <textarea placeholder="Notes libres sur ce lead..." value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} rows={3}
              style={{ width:'100%', borderRadius:10, border:'1px solid rgba(232,125,106,.2)', background:'#ffffff', padding:'10px 14px', fontSize:14, fontFamily:'inherit', outline:'none', resize:'vertical', boxSizing:'border-box', color:'#5a4a3a', boxShadow:'inset 0 1px 4px rgba(100,80,200,.06)' }}
              onFocus={e=>e.target.style.borderColor='#e87d6a'} onBlur={e=>e.target.style.borderColor='#e2e8f0'}/>
          </div>

          {/* Debrief lié */}
          <div>
            <label style={{ display:'block', fontSize:11, fontWeight:600, color:'#6b7280', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:8 }}>📞 Debrief lié</label>
            <select value={form.debrief_id} onChange={e=>setForm({...form,debrief_id:e.target.value})}
              style={{ width:'100%', borderRadius:8, border:'1px solid rgba(232,125,106,.12)', padding:'10px 12px', fontSize:14, fontFamily:'inherit', outline:'none', color:'#5a4a3a', background:'#ffffff', boxSizing:'border-box' }}>
              <option value="">— Aucun debrief lié</option>
              {debriefs.map(d => (
                <option key={d.id} value={d.id}>{d.prospect_name} — {fmtDate(d.call_date)} ({d.percentage}%)</option>
              ))}
            </select>

            {/* Aperçu du debrief lié */}
            {linkedDebrief && (
              <div style={{ marginTop:12, padding:'14px 16px', background:DS.bgCard, borderRadius:10, border:'1px solid rgba(196,181,253,.5)' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                  <div>
                    <p style={{ fontWeight:700, fontSize:14, color:'#5a4a3a', margin:0 }}>{linkedDebrief.prospect_name}</p>
                    <p style={{ fontSize:12, color:'#6b7280', margin:'2px 0 0' }}>📅 {fmtDate(linkedDebrief.call_date)} · 👤 {linkedDebrief.closer_name}</p>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
                    <ScoreBadge pct={Math.round(linkedDebrief.percentage||0)}/>
                    <ClosedBadge isClosed={linkedDebrief.is_closed}/>
                  </div>
                </div>
                {/* Mini barres sections */}
                {(() => {
                  const scores = computeSectionScores(linkedDebrief.sections || {});
                  const LABELS = {decouverte:'Déc.',reformulation:'Ref.',projection:'Proj.',presentation_offre:'Offre',closing:'Closing'};
                  const col = v => v>=4?'#059669':v>=3?'#d97706':v>=2?'#e87d6a':'#ef4444';
                  return (
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                      {SECTIONS.map(({key}) => (
                        <div key={key} style={{ flex:1, minWidth:50 }}>
                          <p style={{ fontSize:10, color:'#6b7280', margin:'0 0 3px', textAlign:'center' }}>{LABELS[key]}</p>
                          <div style={{ height:5, background:'#e2e8f0', borderRadius:3, overflow:'hidden' }}>
                            <div style={{ height:'100%', width:`${(scores[key]/5)*100}%`, background:col(scores[key]), borderRadius:3 }}/>
                          </div>
                          <p style={{ fontSize:10, color:col(scores[key]), fontWeight:700, margin:'2px 0 0', textAlign:'center' }}>{scores[key]}/5</p>
                        </div>
                      ))}
                    </div>
                  );
                })()}
                {linkedDebrief.notes && <p style={{ fontSize:12, color:'#6b7280', margin:'10px 0 0', fontStyle:'italic' }}>"{linkedDebrief.notes}"</p>}
              </div>
            )}
          </div>

          {/* Sync iClosed */}
          {!isNew && (
            <button onClick={async()=>{
              try {
                await apiFetch('/zapier/push-deal', {method:'POST', body:{deal_id:deal.id}});
                toast('Synchronisé avec iClosed !');
              } catch(e){ toast(e.message,'error'); }
            }} style={{ width:'100%', padding:'10px', borderRadius:DS.radiusFull, background:'white', border:'1px solid rgba(232,125,106,.2)', color:DS.textSecondary, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', boxShadow:DS.shadowSm, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              <span>🔄</span> Synchroniser avec iClosed
            </button>
          )}

          {/* Bouton save */}
          <button onClick={save} disabled={saving||!form.prospect_name.trim()}
            style={{ width:'100%', padding:'14px', borderRadius:12, background:'#e87d6a', color:'white', border:'none', fontSize:15, fontWeight:700, cursor:saving||!form.prospect_name.trim()?'not-allowed':'pointer', opacity:saving||!form.prospect_name.trim()?.55:1, fontFamily:'inherit', transition:'opacity .15s' }}>
            {saving ? 'Enregistrement...' : isNew ? 'Créer le lead' : 'Enregistrer les modifications'}
          </button>

        </div>
      </div>
    </div>
  );
}

function DealCard({ deal, onOpen, onMove, stages }) {
  const [dragging, setDragging] = useState(false);
  const debriefScore = deal.debrief_score != null ? Math.round(deal.debrief_score) : null;
  const stageInfo = stages.find(s=>s.key===deal.status)||{color:'#64748b',bg:'#f1f5f9'};
  return (
    <div
      draggable
      onDragStart={e => { e.dataTransfer.setData('dealId', deal.id); setDragging(true); }}
      onDragEnd={()=>setDragging(false)}
      onClick={()=>onOpen(deal)}
      style={{
        background:'white', borderRadius:10, padding:'10px 12px', cursor:'pointer',
        boxShadow: dragging ? '0 8px 24px rgba(0,0,0,.15)' : '0 1px 4px rgba(0,0,0,.08)',
        opacity: dragging ? 0.5 : 1,
        border:'1px solid rgba(232,125,106,.1)',
        transition:'all .15s', userSelect:'none'
      }}
    >
      <p style={{ fontWeight:600, fontSize:13, color:'#1e293b', margin:'0 0 4px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{deal.prospect_name}</p>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:6 }}>
        {deal.value > 0 && <span style={{ fontSize:12, fontWeight:700, color:'#059669' }}>{deal.value.toLocaleString('fr-FR')} €</span>}
        {debriefScore != null && (
          <span style={{ fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:6,
            background: debriefScore>=70?'#d1fae5':debriefScore>=40?'#fef3c7':'#fee2e2',
            color: debriefScore>=70?'#059669':debriefScore>=40?'#d97706':'#dc2626' }}>
            {debriefScore}%
          </span>
        )}
      </div>
      {deal.closer_name && <p style={{ fontSize:11, color:'#94a3b8', margin:'4px 0 0' }}>👤 {deal.closer_name}</p>}
      {deal.follow_up_date && new Date(deal.follow_up_date) < new Date() && !['signe','perdu'].includes(deal.status) && (
        <p style={{ fontSize:10, color:'#ef4444', margin:'3px 0 0', fontWeight:600 }}>⚠️ Relance en retard</p>
      )}
    </div>
  );
}

function DropColumn({ stage, deals, onOpen, onMove }) {
  const [over, setOver] = useState(false);
  const totalValue = deals.reduce((s,d)=>s+(d.value||0),0);
  return (
    <div
      style={{ flex:1, minWidth:180, display:'flex', flexDirection:'column', gap:8 }}
      onDragOver={e=>{ e.preventDefault(); setOver(true); }}
      onDragLeave={()=>setOver(false)}
      onDrop={e=>{ e.preventDefault(); setOver(false); const id=e.dataTransfer.getData('dealId'); if(id) onMove(id,stage.key); }}
    >
      <div style={{ padding:'8px 12px', background:over?stage.color+'22':stage.bg, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'space-between', border:over?`2px solid ${stage.color}`:'2px solid transparent', transition:'all .15s' }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ fontSize:13 }}>{stage.icon}</span>
          <span style={{ fontSize:12, fontWeight:700, color:stage.color }}>{stage.label}</span>
          <span style={{ background:'white', color:stage.color, fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:10 }}>{deals.length}</span>
        </div>
        {totalValue > 0 && <span style={{ fontSize:10, fontWeight:600, color:stage.color }}>{totalValue.toLocaleString('fr-FR')} €</span>}
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:7, minHeight:60, borderRadius:10, padding:over?'6px':'0', background:over?'rgba(232,125,106,.04)':'transparent', transition:'all .15s' }}>
        {deals.map(deal => (
          <DealCard key={deal.id} deal={deal} onOpen={onOpen} onMove={onMove} stages={PIPELINE_STAGES}/>
        ))}
        {deals.length === 0 && (
          <div style={{ border:'2px dashed', borderColor:over?stage.color:'#e2e8f0', borderRadius:10, padding:'20px 10px', textAlign:'center', color:over?stage.color:'#cbd5e1', fontSize:11, transition:'all .15s' }}>{over?'Déposer ici':'Vide'}</div>
        )}
      </div>
    </div>
  );
}

function AccordionColumn({ stage, deals, onOpen, onMove }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderRadius:10, background:'white', boxShadow:'0 1px 4px rgba(0,0,0,.08)', overflow:'hidden' }}>
      <button type="button" onClick={()=>setOpen(v=>!v)} style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:stage.bg, border:'none', cursor:'pointer', fontFamily:'inherit' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span>{stage.icon}</span>
          <span style={{ fontWeight:700, fontSize:13, color:stage.color }}>{stage.label}</span>
          <span style={{ background:'white', color:stage.color, fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:10 }}>{deals.length}</span>
        </div>
        <span style={{ color:stage.color, fontSize:12 }}>{open?'▲':'▼'}</span>
      </button>
      {open && (
        <div style={{ padding:'8px 10px', display:'flex', flexDirection:'column', gap:7 }}>
          {deals.length === 0 ? <p style={{ textAlign:'center', color:'#94a3b8', fontSize:12, margin:'8px 0' }}>Vide</p>
          : deals.map(deal => <DealCard key={deal.id} deal={deal} onOpen={onOpen} onMove={onMove} stages={PIPELINE_STAGES}/>)}
        </div>
      )}
    </div>
  );
}

function PipelinePage({ user, toast, debriefs }) {
  const [deals, setDeals]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [openLead, setOpenLead] = useState(null); // null | {} (new) | deal (edit)
  const [filter, setFilter]     = useState('all');
  const mob = useIsMobile();

  useEffect(() => {
    apiFetch('/deals').then(setDeals).catch(()=>{}).finally(()=>setLoading(false));
  }, []);

  const handleSave = (deal, isEdit) => {
    setDeals(prev => isEdit ? prev.map(d=>d.id===deal.id?deal:d) : [deal,...prev]);
  };
  const handleMove = async (id, status) => {
    try {
      const updated = await apiFetch(`/deals/${id}`, { method:'PATCH', body:{ status }});
      setDeals(prev => prev.map(d => d.id===id ? updated : d));
    } catch(e) { toast(e.message, 'error'); }
  };
  const handleDelete = (id) => {
    setDeals(prev => prev.filter(d => d.id!==id));
  };

  const isHOS = user.role === 'head_of_sales';
  const closers = [...new Map(deals.map(d=>[d.user_id,{id:d.user_id,name:d.user_name}])).values()];
  const displayDeals = filter==='all' ? deals : deals.filter(d=>d.user_id===filter);

  const totalValue   = deals.filter(d=>d.status==='signe').reduce((s,d)=>s+(d.value||0),0);
  const totalPipe    = deals.filter(d=>!['signe','perdu'].includes(d.status)).reduce((s,d)=>s+(d.value||0),0);
  const overdueCount = deals.filter(d=>d.follow_up_date&&new Date(d.follow_up_date)<new Date()&&!['signe','perdu'].includes(d.status)).length;
  const closed       = deals.filter(d=>['signe','perdu'].includes(d.status));
  const winRate      = closed.length > 0 ? Math.round((deals.filter(d=>d.status==='signe').length/closed.length)*100) : 0;

  if (loading) return <Spinner full/>;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700, color:'#5a4a3a', margin:0 }}>🎯 Pipeline</h1>
          <p style={{ color:'#6b7280', fontSize:13, marginTop:4 }}>{deals.length} lead{deals.length!==1?'s':''}</p>
        </div>
        <Btn onClick={()=>setOpenLead({})}>+ Nouveau lead</Btn>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:mob?'repeat(2,1fr)':'repeat(4,1fr)', gap:mob?10:12 }}>
        {[
          { label:'CA Signé',   value:`${totalValue.toLocaleString('fr-FR')} €`, icon:'💶', bg:'#d1fae5', c:'#059669' },
          { label:'Pipeline',   value:`${totalPipe.toLocaleString('fr-FR')} €`,  icon:'🔮', bg:'rgba(253,232,228,.6)', c:'#e87d6a' },
          { label:'Taux win',   value:`${winRate}%`,                             icon:'🏆', bg:'#fef3c7', c:'#d97706' },
          { label:'En retard',  value:overdueCount,                              icon:'⚠️', bg:overdueCount>0?'#fee2e2':'#f1f5f9', c:overdueCount>0?'#dc2626':'#64748b' },
        ].map(({ label, value, icon, bg, c }) => (
          <Card key={label} style={{ padding:'12px 14px', display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:38, height:38, borderRadius:10, background:bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>{icon}</div>
            <div>
              <p style={{ fontSize:10, color:'#6b7280', margin:0, fontWeight:500, textTransform:'uppercase', letterSpacing:'.04em' }}>{label}</p>
              <p style={{ fontSize:20, fontWeight:700, color:c, margin:0 }}>{value}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Filtre closer (HOS) */}
      {isHOS && closers.length > 1 && (
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          <button onClick={()=>setFilter('all')} style={{ padding:'6px 14px', borderRadius:20, border:`1.5px solid ${filter==='all'?'#e87d6a':'rgba(232,125,106,.2)'}`, background:filter==='all'?'rgba(253,232,228,.6)':'white', color:filter==='all'?'#4c1d95':'#64748b', fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>Tous</button>
          {closers.map(c => (
            <button key={c.id} onClick={()=>setFilter(c.id)} style={{ padding:'6px 14px', borderRadius:20, border:`1.5px solid ${filter===c.id?'#e87d6a':'rgba(232,125,106,.2)'}`, background:filter===c.id?'rgba(253,232,228,.6)':'white', color:filter===c.id?'#4c1d95':'#64748b', fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>👤 {c.name}</button>
          ))}
        </div>
      )}

      {/* Kanban */}
      {deals.length === 0 ? (
        <Empty icon="🎯" title="Pipeline vide" subtitle="Créez votre premier lead" action={<Btn onClick={()=>setOpenLead({})}>+ Créer un lead</Btn>}/>
      ) : mob ? (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {PIPELINE_STAGES.map(stage => (
            <AccordionColumn key={stage.key} stage={stage} deals={displayDeals.filter(d=>d.status===stage.key)} onOpen={setOpenLead} onMove={handleMove}/>
          ))}
        </div>
      ) : (
        <div style={{ overflowX:'auto', WebkitOverflowScrolling:'touch', paddingBottom:8 }}>
          <div style={{ display:'flex', gap:12, minWidth:`${PIPELINE_STAGES.length*200}px` }}>
            {PIPELINE_STAGES.map(stage => (
              <DropColumn key={stage.key} stage={stage} deals={displayDeals.filter(d=>d.status===stage.key)} onOpen={setOpenLead} onMove={handleMove}/>
            ))}
          </div>
        </div>
      )}

      {openLead !== null && (
        <LeadSheet
          deal={openLead?.id ? openLead : null}
          debriefs={debriefs || []}
          onClose={()=>setOpenLead(null)}
          onSave={handleSave}
          onDelete={handleDelete}
          toast={toast}
        />
      )}
    </div>
  );
}


export { LeadSheet, DealCard, DropColumn, AccordionColumn, PipelinePage };
