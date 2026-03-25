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
export default function LeadSheet({ deal, debriefs, onClose, onSave, onDelete, toast }) {
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
              <button onClick={onClose} style={{ background:'none', border:'none', color:'#c8b8a8', cursor:'pointer', fontSize:22, lineHeight:1, padding:'2px 6px' }}>✕</button>
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
              <div style={{ marginTop:12, padding:'14px 16px', background:WHITE, borderRadius:10, border:'1px solid rgba(196,181,253,.5)' }}>
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
            }} style={{ width:'100%', padding:'10px', borderRadius:R_FULL, background:'white', border:'1px solid rgba(232,125,106,.2)', color:'#b09080', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', boxShadow:SH_SM, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
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

// ─── DEAL CARD — Rich card (Option C) ────────────────────────────────────────
