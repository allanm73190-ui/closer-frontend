import React, { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from '../api.js';
import { P, P2, TXT, TXT2, TXT3, R_MD, R_FULL, BTN, DEFAULT_DEBRIEF_CONFIG } from '../constants.js';
import { computeScore } from '../utils.js';
import { useIsMobile } from '../hooks.js';
import { Input, Textarea, Btn, Card } from '../components/ui.jsx';
import { ScoreGauge, ClosedBadge, RadioGroup, CheckboxGroup, SectionNotes, CatCard } from '../components/shared.jsx';
export default function NewDebrief({ navigate, onSave, toast, debriefConfig }) {
  const mob = useIsMobile();
  const cfg = debriefConfig && debriefConfig.length > 0 ? debriefConfig : DEFAULT_DEBRIEF_CONFIG;

  const [form, setForm]   = useState({ prospect_name:'', call_date:new Date().toISOString().split('T')[0], closer_name:'', call_link:'', is_closed:null, notes:'' });
  const [secs, setSecs]   = useState({});
  const [notes, setNotes] = useState({});
  const [loading, setLoading] = useState(false);

  // Score temps réel basé sur computeScore (utilise les clés standard)
  const { total, max, percentage } = computeScore(secs);

  const setSecVal = (secKey, qid, val) => setSecs(p => ({...p, [secKey]: {...(p[secKey]||{}), [qid]:val}}));
  const setNoteVal = (secKey, data) => setNotes(p => ({...p, [secKey]: data}));

  const submit = async e => {
    e.preventDefault();
    if (form.is_closed === null) { toast("Indiquez le résultat de l'appel", 'error'); return; }
    setLoading(true);
    try {
      const r = await apiFetch('/debriefs', { method:'POST', body:{ ...form, sections:secs, section_notes:notes, total_score:total, max_score:max, percentage, scores:{}, criteria_notes:{} }});
      onSave(r.debrief, r.gamification);
      toast(`Debrief enregistré ! +${r.gamification?.pointsEarned||0} pts`);
      navigate('Detail', r.debrief.id);
    } catch(e) { toast(e.message,'error'); } finally { setLoading(false); }
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <Btn variant="secondary" onClick={()=>navigate('Dashboard')} style={{width:36,height:36,padding:0,borderRadius:8,fontSize:16,flexShrink:0}}>←</Btn>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700, color:TXT, margin:0 }}>Nouveau debrief</h1>
          <p style={{ color:TXT2, fontSize:13, marginTop:2 }}>Évaluez votre dernier appel</p>
        </div>
      </div>

      {mob && (
        <div style={{ background:`linear-gradient(135deg,${P},${P2})`, borderRadius:R_MD, padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', color:'white' }}>
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
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

            {/* Infos appel */}
            <Card style={{ padding:16 }}>
              <h3 style={{ fontSize:14, fontWeight:600, color:TXT, marginBottom:14 }}>Informations de l'appel</h3>
              <div style={{ display:'grid', gridTemplateColumns:mob?'1fr':'repeat(3,1fr)', gap:12, marginBottom:14 }}>
                <div>
                  <label style={{display:'block',fontSize:12,fontWeight:600,color:TXT,marginBottom:5}}>Prospect *</label>
                  <Input placeholder="Jean Dupont" value={form.prospect_name} onChange={e=>setForm({...form,prospect_name:e.target.value})} required autoFocus/>
                </div>
                <div>
                  <label style={{display:'block',fontSize:12,fontWeight:600,color:TXT,marginBottom:5}}>Nom du closer</label>
                  <Input placeholder="Votre nom" value={form.closer_name} onChange={e=>setForm({...form,closer_name:e.target.value})}/>
                </div>
                <div>
                  <label style={{display:'block',fontSize:12,fontWeight:600,color:TXT,marginBottom:5}}>Date de l'appel</label>
                  <Input type="date" value={form.call_date} onChange={e=>setForm({...form,call_date:e.target.value})}/>
                </div>
              </div>
              <div style={{ marginBottom:14 }}>
                <label style={{display:'block',fontSize:12,fontWeight:600,color:TXT,marginBottom:5}}>Lien d'enregistrement</label>
                <Input placeholder="https://..." value={form.call_link} onChange={e=>setForm({...form,call_link:e.target.value})}/>
              </div>
              <div>
                <label style={{display:'block',fontSize:12,fontWeight:600,color:TXT,marginBottom:8}}>Résultat de l'appel *</label>
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  {[{v:true,l:'✅ Closé — vente signée',c:'#059669',bg:'#d1fae5'},{v:false,l:'❌ Non closé',c:'#dc2626',bg:'#fee2e2'}].map(({v,l,c,bg})=>(
                    <button key={String(v)} type="button" onClick={()=>setForm({...form,is_closed:v})}
                      style={{flex:1,padding:'10px 14px',borderRadius:R_MD,border:`2px solid ${form.is_closed===v?c:'#e2e8f0'}`,background:form.is_closed===v?bg:'white',color:form.is_closed===v?c:TXT2,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',transition:'all .15s'}}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            {/* Sections dynamiques */}
            {cfg.map((section) => {
              const secData  = secs[section.key] || {};
              const secNotes = notes[section.key] || {};
              const sectionIdx = cfg.indexOf(section);
              return (
                <CatCard key={section.key} number={String(sectionIdx+1)} title={section.title}>
                  {section.questions.map(q => {
                    const val = secData[q.id];
                    const setVal = v => setSecVal(section.key, q.id, v);
                    if (q.type === 'radio')    return <RadioGroup key={q.id} label={q.label} options={q.options||[]} value={val} onChange={setVal}/>;
                    if (q.type === 'checkbox') return <CheckboxGroup key={q.id} label={q.label} options={q.options||[]} value={val||[]} onChange={setVal}/>;
                    if (q.type === 'text')     return (
                      <div key={q.id} style={{marginBottom:16}}>
                        <label style={{display:'block',fontSize:13,fontWeight:600,color:TXT,marginBottom:6}}>{q.label}</label>
                        <Textarea placeholder="Votre réponse..." value={val||''} onChange={e=>setVal(e.target.value)} rows={2}/>
                      </div>
                    );
                    return null;
                  })}
                  <SectionNotes notes={secNotes} onChange={d=>setNoteVal(section.key,d)}/>
                </CatCard>
              );
            })}

            {/* Notes globales */}
            <Card style={{padding:16}}>
              <label style={{display:'block',fontSize:12,fontWeight:600,color:TXT,marginBottom:8}}>Notes globales</label>
              <Textarea placeholder="Points clés, impressions générales..." value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} rows={3}/>
            </Card>

            {mob && <button type="submit" disabled={loading} style={{...BTN.primary,width:'100%',padding:'14px 20px',fontSize:15,borderRadius:R_FULL,cursor:loading?'not-allowed':'pointer',opacity:loading?.6:1,fontFamily:'inherit',border:'none',fontWeight:700}}>{loading?'Enregistrement...':'💾 Enregistrer le debrief'}</button>}
          </div>

          {/* Panel score desktop */}
          {!mob && (
            <div style={{ position:'sticky', top:24, display:'flex', flexDirection:'column', gap:12 }}>
              <Card style={{ padding:20 }}>
                <p style={{fontSize:11,color:TXT3,textTransform:'uppercase',letterSpacing:'.06em',margin:'0 0 12px'}}>Score en direct</p>
                <div style={{textAlign:'center',marginBottom:16}}>
                  <ScoreGauge percentage={percentage} size="lg"/>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:13,color:TXT2,marginBottom:16}}>
                  <span>{total} pts</span><span>/ {max} pts max</span>
                </div>
                {form.is_closed !== null && (
                  <div style={{textAlign:'center',marginBottom:12}}>
                    <ClosedBadge isClosed={form.is_closed}/>
                  </div>
                )}
                <button type="submit" disabled={loading} style={{...BTN.primary,width:'100%',padding:'12px 20px',fontSize:14,borderRadius:R_FULL,cursor:loading?'not-allowed':'pointer',opacity:loading?.6:1,fontFamily:'inherit',border:'none',fontWeight:700}}>{loading?'Enregistrement...':'💾 Enregistrer'}</button>
              </Card>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}

