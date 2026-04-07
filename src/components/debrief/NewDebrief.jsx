import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../config/api';
import { DS } from '../../styles/designSystem';
import { useIsMobile } from '../../hooks';
import { computeScore } from '../../utils/scoring';
import { Btn, Input, Textarea, Card, ScoreGauge, ClosedBadge, Modal } from '../ui';
import { RadioGroup, CheckboxGroup, SectionNotes, CatCard } from './FormPrimitives';
import { DebriefConfigEditor, DEFAULT_DEBRIEF_CONFIG } from './Settings';

function normalizeSectionKey(rawKey) {
  if (!rawKey) return rawKey;
  return rawKey === 'presentation_offre' ? 'offre' : rawKey;
}

function getConfigSections(config) {
  const base = Array.isArray(config) && config.length > 0 ? config : DEFAULT_DEBRIEF_CONFIG;
  return base.map((section, idx) => {
    const sectionKey = section.key || `section_${idx + 1}`;
    return {
    ...section,
    key: sectionKey,
    storeKey: normalizeSectionKey(sectionKey),
    questions: Array.isArray(section.questions) ? section.questions : [],
    };
  });
}

function buildSectionsState(configSections, previous = null) {
  const next = {};
  for (const section of configSections) {
    const key = section.storeKey;
    next[key] = previous?.[key] || {};
  }
  return next;
}

function buildNotesState(configSections, previous = null) {
  const next = {};
  for (const section of configSections) {
    const key = section.storeKey;
    next[key] = previous?.[key] || {};
  }
  return next;
}

function NewDebrief({ navigate, onSave, toast, user, debriefConfig, setDebriefConfig }) {
  const mob = useIsMobile();
  const isHOS = user?.role === 'head_of_sales';
  const [showDebriefSettings, setShowDebriefSettings] = useState(false);
  const [form, setForm] = useState({
    prospect_name:'',
    call_date:new Date().toISOString().split('T')[0],
    closer_name:'',
    call_link:'',
    is_closed:null,
    notes:'',
  });

  const configSections = getConfigSections(debriefConfig);

  const [secs, setSecs] = useState(() => buildSectionsState(configSections));
  const [notes, setNotes] = useState(() => buildNotesState(configSections));
  const [loading, setLoading] = useState(false);
  const { total, max, percentage } = computeScore(secs);

  useEffect(() => {
    const freshSections = getConfigSections(debriefConfig);
    setSecs(prev => buildSectionsState(freshSections, prev));
    setNotes(prev => buildNotesState(freshSections, prev));
  }, [debriefConfig]);

  const setAnswer = (sectionKey, questionId, value) => {
    setSecs(prev => ({
      ...prev,
      [sectionKey]: {
        ...(prev[sectionKey] || {}),
        [questionId]: value,
      },
    }));
  };

  const submit = async e => {
    e.preventDefault();
    if (form.is_closed === null) {
      toast("Indiquez le résultat de l'appel", 'error');
      return;
    }
    setLoading(true);
    try {
      const r = await apiFetch('/debriefs', {
        method:'POST',
        body:{
          ...form,
          sections: secs,
          section_notes: notes,
          total_score: total,
          max_score: max,
          percentage,
          scores: {},
          criteria_notes: {},
        },
      });
      onSave(r.debrief, r.gamification);
      toast(`Debrief enregistré ! +${r.gamification.pointsEarned} pts`);
      navigate('Detail', r.debrief.id, null, { autoAI: true });
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderQuestion = (section, question) => {
    const sectionKey = section.storeKey;
    const value = secs[sectionKey]?.[question.id];
    const type = question.type || 'radio';
    const options = Array.isArray(question.options) && question.options.length > 0
      ? question.options
      : [{ value:'oui', label:'Oui' }, { value:'non', label:'Non' }];

    if (type === 'checkbox') {
      return (
        <CheckboxGroup
          key={question.id}
          label={question.label}
          options={options}
          value={Array.isArray(value) ? value : []}
          onChange={v=>setAnswer(sectionKey, question.id, v)}
        />
      );
    }

    if (type === 'text') {
      return (
        <div key={question.id} style={{ marginBottom:16 }}>
          <label style={{ display:'block', fontSize:14, fontWeight:600, color:'#5a4a3a', marginBottom:8 }}>
            {question.label}
          </label>
          <Textarea
            rows={3}
            placeholder="Votre réponse..."
            value={typeof value === 'string' ? value : ''}
            onChange={e=>setAnswer(sectionKey, question.id, e.target.value)}
          />
        </div>
      );
    }

    return (
      <RadioGroup
        key={question.id}
        label={question.label}
        options={options}
        value={value}
        onChange={v=>setAnswer(sectionKey, question.id, v)}
      />
    );
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      {showDebriefSettings && (
        <Modal title="Paramètres des questions debrief" onClose={()=>setShowDebriefSettings(false)}>
          <DebriefConfigEditor
            debriefConfig={debriefConfig}
            setDebriefConfig={setDebriefConfig}
            onClose={()=>setShowDebriefSettings(false)}
            toast={toast}
          />
        </Modal>
      )}

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <Btn variant="secondary" onClick={()=>navigate('Dashboard')} style={{ width:36, height:36, padding:0, borderRadius:8, fontSize:16, flexShrink:0 }}>←</Btn>
          <div>
            <h1 style={{ fontSize:20, fontWeight:700, color:'#5a4a3a', margin:0 }}>Nouveau debrief</h1>
            <p style={{ color:DS.textMuted, fontSize:13, marginTop:2 }}>Évaluez votre dernier appel</p>
          </div>
        </div>
        {isHOS && (
          <Btn variant="secondary" onClick={()=>setShowDebriefSettings(true)} style={{ fontSize:13, padding:'9px 14px' }}>
            ⚙️ Paramètres questions
          </Btn>
        )}
      </div>

      {mob && (
        <div style={{ background:'linear-gradient(135deg,#e87d6a,#d4604e)', borderRadius:12, padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', color:'white' }}>
          <div>
            <p style={{ fontSize:11, opacity:.8, margin:0, textTransform:'uppercase', letterSpacing:'.05em' }}>Score en direct</p>
            <p style={{ fontSize:28, fontWeight:700, margin:0 }}>{percentage}%</p>
            <p style={{ fontSize:12, opacity:.7, margin:0 }}>{total} / {max} points</p>
          </div>
          {form.is_closed !== null && <ClosedBadge isClosed={form.is_closed} />}
        </div>
      )}

      <form onSubmit={submit}>
        <div style={{ display:'grid', gridTemplateColumns:mob?'1fr':'1fr 300px', gap:mob?16:24, alignItems:'start' }}>
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <Card style={{ padding:16 }}>
              <h3 style={{ fontSize:14, fontWeight:600, color:'#5a4a3a', marginBottom:14 }}>Informations de l'appel</h3>
              <div style={{ display:'grid', gridTemplateColumns:mob?'1fr':'repeat(3,1fr)', gap:12, marginBottom:14 }}>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#5a4a3a', marginBottom:6 }}>Prospect *</label>
                  <Input required placeholder="Nom du prospect" value={form.prospect_name} onChange={e=>setForm({ ...form, prospect_name:e.target.value })} />
                </div>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#5a4a3a', marginBottom:6 }}>Closer *</label>
                  <Input required placeholder="Votre nom" value={form.closer_name} onChange={e=>setForm({ ...form, closer_name:e.target.value })} />
                </div>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#5a4a3a', marginBottom:6 }}>Date *</label>
                  <Input type="date" required value={form.call_date} onChange={e=>setForm({ ...form, call_date:e.target.value })} />
                </div>
              </div>
              <div style={{ marginBottom:14 }}>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#5a4a3a', marginBottom:6 }}>🔗 Lien enregistrement</label>
                <Input type="url" placeholder="https://..." value={form.call_link} onChange={e=>setForm({ ...form, call_link:e.target.value })} />
              </div>
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#5a4a3a', marginBottom:8 }}>Résultat *</label>
                <div style={{ display:'flex', gap:10 }}>
                  {[{val:true,label:'✅ Closer',border:'#059669',bg:'#d1fae5',c:'#065f46'},{val:false,label:'❌ Non Closer',border:'#dc2626',bg:'#fee2e2',c:'#991b1b'}].map(({val,label,border,bg,c})=>(
                    <button
                      key={String(val)}
                      type="button"
                      onClick={()=>setForm({ ...form, is_closed:val })}
                      style={{
                        flex:1, padding:'12px 14px', borderRadius:10, border:`2px solid ${form.is_closed===val?border:'#e2e8f0'}`,
                        background:form.is_closed===val?bg:'white', color:form.is_closed===val?c:'#94a3b8', fontWeight:600, fontSize:13, cursor:'pointer', fontFamily:'inherit', transition:'all .2s',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            <h2 style={{ fontSize:14, fontWeight:600, color:'#5a4a3a', margin:0 }}>Évaluation des critères</h2>
            {configSections.map((section, idx) => (
              <CatCard key={section.key || idx} number={String(idx + 1)} title={section.title || `Section ${idx + 1}`}>
                {section.questions.length > 0
                  ? section.questions.map(question => renderQuestion(section, question))
                  : <p style={{ fontSize:13, color:DS.textMuted, margin:'0 0 12px' }}>Aucune question configurée.</p>
                }
                <SectionNotes
                  notes={notes[section.storeKey] || {}}
                  onChange={newNotes => setNotes(prev => ({ ...prev, [section.storeKey]: newNotes }))}
                />
              </CatCard>
            ))}

            <Card style={{ padding:16 }}>
              <h3 style={{ fontSize:14, fontWeight:600, color:'#5a4a3a', marginBottom:12 }}>Notes globales</h3>
              <Textarea placeholder="Notes libres sur l'appel..." value={form.notes} onChange={e=>setForm({ ...form, notes:e.target.value })} />
            </Card>

            {(() => {
              // Lot 1 — feedback qualité léger côté front (déterministe, indicatif)
              const sectionsArr = ['decouverte','reformulation','projection','offre','closing'];
              const notesObj = form.section_notes || {};
              const filledNotes = sectionsArr.filter(k => (notesObj[k] || '').trim().length >= 40).length;
              const hints = [];
              if (filledNotes < 3) hints.push(`Ajoute des notes détaillées sur au moins 3 sections (actuellement ${filledNotes}/5)`);
              const dayDiff = (() => {
                try { return Math.floor((Date.now() - new Date(form.call_date).getTime()) / 86400000); } catch { return 0; }
              })();
              if (dayDiff > 5) hints.push('Soumission tardive : pense à debriefer dans les 48h pour préserver la fraîcheur');
              if (!hints.length) return null;
              return (
                <Card style={{ padding:12, background:'#fef3c7', borderColor:'#fde68a' }}>
                  <p style={{ fontSize:12, fontWeight:600, margin:'0 0 6px', color:'#92400e' }}>💡 Améliorer la qualité du debrief</p>
                  <ul style={{ margin:0, paddingLeft:18, fontSize:12, color:'#78350f' }}>
                    {hints.map(h => <li key={h}>{h}</li>)}
                  </ul>
                </Card>
              );
            })()}

            {mob && (
              <Btn type="submit" disabled={loading} style={{ width:'100%', padding:'14px 20px', fontSize:15 }}>
                {loading ? 'Enregistrement...' : '💾 Enregistrer le debrief'}
              </Btn>
            )}
          </div>

          {!mob && (
            <div style={{ position:'sticky', top:80 }}>
              <Card style={{ padding:24, display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
                <h3 style={{ fontSize:14, fontWeight:600, color:'#5a4a3a', margin:0 }}>Score en direct</h3>
                <ScoreGauge percentage={percentage} />
                <p style={{ fontSize:13, color:DS.textMuted, margin:0 }}>{total} / {max} points</p>
                {form.is_closed !== null && <ClosedBadge isClosed={form.is_closed} />}
                <Btn type="submit" disabled={loading} style={{ width:'100%' }}>
                  {loading ? 'Enregistrement...' : '💾 Enregistrer le debrief'}
                </Btn>
              </Card>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}

export { NewDebrief };
