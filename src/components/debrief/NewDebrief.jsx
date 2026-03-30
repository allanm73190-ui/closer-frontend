import React, { useState } from 'react';
import { apiFetch } from '../../config/api';
import { DS, P, P2, TXT, TXT3, R_SM, R_MD, R_FULL, SH_SM, SH_BTN, card, cardSm } from '../../styles/designSystem';
import { useIsMobile } from '../../hooks';
import { computeScore } from '../../utils/scoring';
import { Btn, Input, Textarea, Card, ScoreGauge, AlertBox, ClosedBadge } from '../ui';
import { RadioGroup, CheckboxGroup, SectionNotes, CatCard, S1, S2, S3, S4, S5 } from './FormPrimitives';

function NewDebrief({ navigate, onSave, toast, debriefConfig }) {
  const mob = useIsMobile();
  const [form, setForm] = useState({ prospect_name:'', call_date:new Date().toISOString().split('T')[0], closer_name:'', call_link:'', is_closed:null, notes:'' });
  const [secs,  setSecs]  = useState({ decouverte:{}, reformulation:{}, projection:{}, offre:{}, closing:{} });
  const [notes, setNotes] = useState({ decouverte:{}, reformulation:{}, projection:{}, offre:{}, closing:{} });
  const [loading, setLoading] = useState(false);
  const { total, max, percentage } = computeScore(secs);

  const submit = async e => {
    e.preventDefault();
    if (form.is_closed === null) { toast("Indiquez le résultat de l'appel", 'error'); return; }
    setLoading(true);
    try {
      const r = await apiFetch('/debriefs',{ method:'POST', body:{ ...form, sections:secs, section_notes:notes, total_score:total, max_score:max, percentage, scores:{}, criteria_notes:{} } });
      onSave(r.debrief, r.gamification);
      toast(`Debrief enregistré ! +${r.gamification.pointsEarned} pts`);
      navigate('Detail', r.debrief.id, null, { autoAI: true });
    } catch(e) { toast(e.message,'error'); } finally { setLoading(false); }
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <Btn variant="secondary" onClick={()=>navigate('Dashboard')} style={{width:36,height:36,padding:0,borderRadius:8,fontSize:16,flexShrink:0}}>←</Btn>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700, color:'#5a4a3a', margin:0 }}>Nouveau debrief</h1>
          <p style={{ color:DS.textMuted, fontSize:13, marginTop:2 }}>Évaluez votre dernier appel</p>
        </div>
      </div>

      {/* Score en haut sur mobile */}
      {mob && (
        <div style={{ background:'linear-gradient(135deg,#e87d6a,#d4604e)', borderRadius:12, padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', color:'white' }}>
          <div>
            <p style={{ fontSize:11, opacity:.8, margin:0, textTransform:'uppercase', letterSpacing:'.05em' }}>Score en direct</p>
            <p style={{ fontSize:28, fontWeight:700, margin:0 }}>{percentage}%</p>
            <p style={{ fontSize:12, opacity:.7, margin:0 }}>{total} / {max} points</p>
          </div>
          {form.is_closed !== null && <ClosedBadge isClosed={form.is_closed}/>}
        </div>
      )}

      <form onSubmit={submit}>
        <div style={{ display:'grid', gridTemplateColumns:mob?'1fr':'1fr 300px', gap:mob?16:24, alignItems:'start' }}>
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <Card style={{ padding:16 }}>
              <h3 style={{ fontSize:14, fontWeight:600, color:'#5a4a3a', marginBottom:14 }}>Informations de l'appel</h3>
              <div style={{ display:'grid', gridTemplateColumns:mob?'1fr':'repeat(3,1fr)', gap:12, marginBottom:14 }}>
                <div><label style={{display:'block',fontSize:12,fontWeight:600,color:'#5a4a3a',marginBottom:6}}>Prospect *</label><Input required placeholder="Nom du prospect" value={form.prospect_name} onChange={e=>setForm({...form,prospect_name:e.target.value})}/></div>
                <div><label style={{display:'block',fontSize:12,fontWeight:600,color:'#5a4a3a',marginBottom:6}}>Closer *</label><Input required placeholder="Votre nom" value={form.closer_name} onChange={e=>setForm({...form,closer_name:e.target.value})}/></div>
                <div><label style={{display:'block',fontSize:12,fontWeight:600,color:'#5a4a3a',marginBottom:6}}>Date *</label><Input type="date" required value={form.call_date} onChange={e=>setForm({...form,call_date:e.target.value})}/></div>
              </div>
              <div style={{ marginBottom:14 }}>
                <label style={{display:'block',fontSize:12,fontWeight:600,color:'#5a4a3a',marginBottom:6}}>🔗 Lien enregistrement</label>
                <Input type="url" placeholder="https://..." value={form.call_link} onChange={e=>setForm({...form,call_link:e.target.value})}/>
              </div>
              <div>
                <label style={{display:'block',fontSize:12,fontWeight:600,color:'#5a4a3a',marginBottom:8}}>Résultat *</label>
                <div style={{ display:'flex', gap:10 }}>
                  {[{val:true,label:'✅ Closer',border:'#059669',bg:'#d1fae5',c:'#065f46'},{val:false,label:'❌ Non Closer',border:'#dc2626',bg:'#fee2e2',c:'#991b1b'}].map(({val,label,border,bg,c})=>(
                    <button key={String(val)} type="button" onClick={()=>setForm({...form,is_closed:val})} style={{flex:1,padding:'12px 14px',borderRadius:10,border:`2px solid ${form.is_closed===val?border:'#e2e8f0'}`,background:form.is_closed===val?bg:'white',color:form.is_closed===val?c:'#94a3b8',fontWeight:600,fontSize:13,cursor:'pointer',fontFamily:'inherit',transition:'all .2s'}}>{label}</button>
                  ))}
                </div>
              </div>
            </Card>
            <h2 style={{ fontSize:14, fontWeight:600, color:'#5a4a3a', margin:0 }}>Évaluation des critères</h2>
            <S1 data={secs.decouverte}    onChange={v=>setSecs(s=>({...s,decouverte:v}))}    notes={notes.decouverte}    onNotes={n=>setNotes(p=>({...p,decouverte:n}))}/>
            <S2 data={secs.reformulation}  onChange={v=>setSecs(s=>({...s,reformulation:v}))}  notes={notes.reformulation}  onNotes={n=>setNotes(p=>({...p,reformulation:n}))}/>
            <S3 data={secs.projection}     onChange={v=>setSecs(s=>({...s,projection:v}))}     notes={notes.projection}     onNotes={n=>setNotes(p=>({...p,projection:n}))}/>
            <S4 data={secs.offre}          onChange={v=>setSecs(s=>({...s,offre:v}))}          notes={notes.offre}          onNotes={n=>setNotes(p=>({...p,offre:n}))}/>
            <S5 data={secs.closing}        onChange={v=>setSecs(s=>({...s,closing:v}))}        notes={notes.closing}        onNotes={n=>setNotes(p=>({...p,closing:n}))}/>
            <Card style={{ padding:16 }}>
              <h3 style={{ fontSize:14, fontWeight:600, color:'#5a4a3a', marginBottom:12 }}>Notes globales</h3>
              <Textarea placeholder="Notes libres sur l'appel..." value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/>
            </Card>
            {mob && <Btn type="submit" disabled={loading} style={{width:'100%',padding:'14px 20px',fontSize:15}}>{loading?'Enregistrement...':'💾 Enregistrer le debrief'}</Btn>}
          </div>

          {/* Sidebar score — desktop */}
          {!mob && (
            <div style={{ position:'sticky', top:80 }}>
              <Card style={{ padding:24, display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
                <h3 style={{ fontSize:14, fontWeight:600, color:'#5a4a3a', margin:0 }}>Score en direct</h3>
                <ScoreGauge percentage={percentage}/>
                <p style={{ fontSize:13, color:DS.textMuted, margin:0 }}>{total} / {max} points</p>
                {form.is_closed !== null && <ClosedBadge isClosed={form.is_closed}/>}
                <Btn type="submit" disabled={loading} style={{width:'100%'}}>{loading?'Enregistrement...':'💾 Enregistrer le debrief'}</Btn>
              </Card>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}


export { NewDebrief };
