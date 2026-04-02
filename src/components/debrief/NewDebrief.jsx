import React, { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../../config/api';
import { DS } from '../../styles/designSystem';
import { useIsMobile } from '../../hooks';
import { computeScore, computeSectionScores } from '../../utils/scoring';
import { Btn, Input, Textarea, Card, ScoreGauge, ClosedBadge } from '../ui';
import { Radar } from '../ui/Charts';
import { RadioGroup, CheckboxGroup, SectionNotes, CatCard } from './FormPrimitives';
import { DEFAULT_DEBRIEF_CONFIG } from './Settings';
import { normalizeDebriefTemplateCatalog, buildTemplateSections, getDefaultTemplateCatalog } from '../../config/debriefTemplates';

function normalizeSectionKey(rawKey) {
  if (!rawKey) return rawKey;
  return rawKey === 'presentation_offre' ? 'offre' : rawKey;
}

function getSectionDataFromDebrief(allSections, storeKey) {
  const sections = allSections || {};
  if (sections[storeKey]) return sections[storeKey];
  if (storeKey === 'offre' && sections.presentation_offre) return sections.presentation_offre;
  return {};
}

function getSectionNotesFromDebrief(allNotes, storeKey) {
  const notes = allNotes || {};
  if (notes[storeKey]) return notes[storeKey];
  if (storeKey === 'offre' && notes.presentation_offre) return notes.presentation_offre;
  return {};
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

function getDebriefMeta(allSections) {
  const meta = allSections?.__meta;
  return meta && typeof meta === 'object' ? meta : {};
}

function normalizeTemplateKey(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function isYesOption(option) {
  if (!option) return false;
  const raw = `${option.value || ''} ${option.label || ''}`.toLowerCase();
  return raw.includes('oui') || raw.includes('yes');
}

function isNegativeOption(option) {
  if (!option) return true;
  const raw = `${option.value || ''} ${option.label || ''}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  return (
    /\bnon\b/.test(raw) ||
    raw.includes('aucun') ||
    raw.includes('aucune') ||
    raw.includes('pas ') ||
    raw.includes(' no')
  );
}

function shouldShowRadioDetail(sectionKey, option) {
  if (!option) return false;
  if (sectionKey === 'decouverte') return !isNegativeOption(option);
  return isYesOption(option);
}

function detailPlaceholderFromQuestion(label) {
  const text = String(label || '').toLowerCase();
  if (text.includes('douleur de surface')) return 'Décris la douleur concernée...';
  if (text.includes('temporalité')) return 'Précise la temporalité donnée par le prospect...';
  if (text.includes('urgence')) return "Décris l'urgence évoquée...";
  if (text.includes('projection')) return 'Décris la projection exprimée...';
  return 'Précise ici...';
}

const PROSPECT_TYPE_OPTIONS = [
  { value:'', label:'Non renseigné' },
  { value:'froid', label:'Prospect froid' },
  { value:'tiède', label:'Prospect tiède' },
  { value:'chaud', label:'Prospect chaud' },
  { value:'inbound', label:'Inbound' },
  { value:'outbound', label:'Outbound' },
];

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

function NewDebrief({ navigate, onSave, onUpdate, toast, user, debriefConfig, debriefTemplates, existingDebrief, fromPage, leadContext, autoAiAfterSave = true }) {
  const mob = useIsMobile();
  const isManager = user?.role === 'head_of_sales' || user?.role === 'admin';
  const isEditing = !!existingDebrief?.id;
  const [linkedDealId, setLinkedDealId] = useState(() => leadContext?.deal_id || null);
  const templateCatalog = useMemo(
    () => normalizeDebriefTemplateCatalog(debriefTemplates || getDefaultTemplateCatalog()),
    [debriefTemplates]
  );
  const [selectedTemplateKey, setSelectedTemplateKey] = useState(() => templateCatalog.defaultTemplateKey || 'standard');
  const [form, setForm] = useState({
    prospect_name:'',
    call_date:new Date().toISOString().split('T')[0],
    closer_name:'',
    prospect_type:'',
    call_link:'',
    is_closed:null,
    notes:'',
  });

  const templateSections = buildTemplateSections(selectedTemplateKey, debriefConfig || DEFAULT_DEBRIEF_CONFIG);
  const configSections = getConfigSections(templateSections);

  const [secs, setSecs] = useState(() => buildSectionsState(configSections));
  const [notes, setNotes] = useState(() => buildNotesState(configSections));
  const [loading, setLoading] = useState(false);
  const { total, max, percentage } = computeScore(secs);
  const sectionScores = useMemo(() => computeSectionScores(secs), [secs]);

  useEffect(() => {
    if (templateCatalog.templates.some(template => template.key === selectedTemplateKey)) return;
    setSelectedTemplateKey(templateCatalog.defaultTemplateKey || templateCatalog.templates[0]?.key || 'standard');
  }, [templateCatalog, selectedTemplateKey]);

  useEffect(() => {
    const freshSections = getConfigSections(buildTemplateSections(selectedTemplateKey, debriefConfig || DEFAULT_DEBRIEF_CONFIG));
    setSecs(prev => buildSectionsState(freshSections, prev));
    setNotes(prev => buildNotesState(freshSections, prev));
  }, [debriefConfig, selectedTemplateKey]);

  useEffect(() => {
    if (!isEditing) return;
    const meta = getDebriefMeta(existingDebrief.sections);
    const existingTemplateKey = normalizeTemplateKey(meta.offer_template_key || meta.offer_type || '');
    if (existingTemplateKey && templateCatalog.templates.some(template => template.key === existingTemplateKey)) {
      setSelectedTemplateKey(existingTemplateKey);
    }
    setForm({
      prospect_name: existingDebrief.prospect_name || '',
      call_date: existingDebrief.call_date || new Date().toISOString().split('T')[0],
      closer_name: existingDebrief.closer_name || '',
      prospect_type: meta.prospect_type || '',
      call_link: existingDebrief.call_link || '',
      is_closed: typeof existingDebrief.is_closed === 'boolean' ? existingDebrief.is_closed : null,
      notes: existingDebrief.notes || '',
    });

    const freshSections = getConfigSections(buildTemplateSections(selectedTemplateKey, debriefConfig || DEFAULT_DEBRIEF_CONFIG));
    const filledSections = buildSectionsState(freshSections);
    const filledNotes = buildNotesState(freshSections);

    for (const section of freshSections) {
      filledSections[section.storeKey] = getSectionDataFromDebrief(existingDebrief.sections, section.storeKey);
      filledNotes[section.storeKey] = getSectionNotesFromDebrief(existingDebrief.section_notes, section.storeKey);
    }

    setSecs(filledSections);
    setNotes(filledNotes);
    setLinkedDealId(null);
  }, [isEditing, existingDebrief?.id, debriefConfig, selectedTemplateKey, templateCatalog]);

  useEffect(() => {
    if (isEditing || !leadContext) return;
    const fullName = `${leadContext.first_name || ''} ${leadContext.last_name || ''}`.trim();
    setForm(prev => ({
      ...prev,
      prospect_name: leadContext.prospect_name || fullName || prev.prospect_name,
      call_date: leadContext.contact_date || prev.call_date,
      closer_name: prev.closer_name || user?.name || '',
      prospect_type: prev.prospect_type || '',
      is_closed: typeof leadContext.deal_closed === 'boolean' ? leadContext.deal_closed : prev.is_closed,
      notes: prev.notes || leadContext.note || '',
    }));
    setLinkedDealId(leadContext.deal_id || null);
  }, [leadContext, isEditing, user?.name]);

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
      const mergedSections = isEditing
        ? { ...(existingDebrief.sections || {}), ...secs }
        : secs;
      const mergedMeta = {
        ...(isEditing ? getDebriefMeta(existingDebrief.sections) : {}),
        offer_template_key: selectedTemplateKey,
        prospect_type: form.prospect_type || '',
      };
      mergedSections.__meta = mergedMeta;
      const mergedSectionNotes = isEditing
        ? { ...(existingDebrief.section_notes || {}), ...notes }
        : notes;
      const r = await apiFetch(isEditing ? `/debriefs/${existingDebrief.id}` : '/debriefs', {
        method: isEditing ? 'PATCH' : 'POST',
        body:{
          ...form,
          sections: mergedSections,
          section_notes: mergedSectionNotes,
          total_score: total,
          max_score: max,
          percentage,
          scores: {},
          criteria_notes: {},
        },
      });
      if (!isEditing && linkedDealId) {
        try {
          await apiFetch(`/deals/${linkedDealId}`, {
            method: 'PATCH',
            body: {
              debrief_id: r.debrief.id,
              deal_closed: !!form.is_closed,
            },
          });
        } catch {
          // Lien deal non bloquant: on garde le debrief même si le patch échoue
        }
      }
      if (isEditing) {
        onUpdate?.(r.debrief, r.gamification);
        toast('Debrief modifié');
        navigate('Detail', r.debrief.id, fromPage || 'History');
      } else {
        onSave(r.debrief, r.gamification);
        toast(`Debrief enregistré ! +${r.gamification.pointsEarned} pts`);
        navigate('Detail', r.debrief.id, null, { autoAI: !!autoAiAfterSave });
      }
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderQuestion = (section, question) => {
    const sectionKey = section.storeKey;
    const value = secs[sectionKey]?.[question.id];
    const detailKey = `${question.id}_note`;
    const detailValue = secs[sectionKey]?.[detailKey] || '';
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
          <label style={{ display:'block', fontSize:14, fontWeight:600, color:'var(--txt,#5a4a3a)', marginBottom:8 }}>
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

    const activeOption = options.find(option => option.value === value);
    const showYesDetail = shouldShowRadioDetail(sectionKey, activeOption);
    return (
      <div key={question.id}>
        <RadioGroup
          label={question.label}
          options={options}
          value={value}
          onChange={v => {
            setSecs(prev => {
              const prevSection = prev[sectionKey] || {};
              const nextSection = { ...prevSection, [question.id]: v };
              const nextActiveOption = options.find(option => option.value === v);
              if (!shouldShowRadioDetail(sectionKey, nextActiveOption)) delete nextSection[detailKey];
              return { ...prev, [sectionKey]: nextSection };
            });
          }}
        />
        {showYesDetail && (
          <div style={{ marginTop:-6, marginBottom:14 }}>
            <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em', color:DS.textMuted, marginBottom:6 }}>
              Détail complémentaire
            </label>
            <Textarea
              rows={2}
              placeholder={detailPlaceholderFromQuestion(question.label)}
              value={detailValue}
              onChange={e=>setAnswer(sectionKey, detailKey, e.target.value)}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <Btn variant="secondary" onClick={()=>navigate(fromPage || (isEditing ? 'History' : 'Dashboard'))} style={{ width:36, height:36, padding:0, borderRadius:8, fontSize:16, flexShrink:0 }}>←</Btn>
          <div>
            <h1 style={{ fontSize:22, fontWeight:800, color:'var(--txt,#5a4a3a)', margin:0 }}>
              {isEditing ? 'Modifier le debrief' : 'Nouveau debrief'}
            </h1>
            <p style={{ color:DS.textMuted, fontSize:13, marginTop:4 }}>
              {isEditing ? "Mettez à jour ce debrief depuis l'historique" : 'Évaluez votre dernier appel'}
            </p>
          </div>
        </div>
        {isManager && (
          <Btn
            variant="secondary"
            onClick={()=>navigate('Settings', isEditing ? existingDebrief?.id : null, isEditing ? 'EditDebrief' : 'NewDebrief', { settingsTab:'debrief' })}
            style={{ fontSize:13, padding:'9px 14px' }}
          >
            ⚙️ Paramètres questions
          </Btn>
        )}
      </div>

      {mob && (
        <Card style={{ background:'linear-gradient(135deg,#e87d6a,#d4604e)', border:'1px solid rgba(255,255,255,.3)', borderRadius:16, padding:'16px 18px', display:'flex', alignItems:'center', justifyContent:'space-between', color:'white' }}>
          <div>
            <p style={{ fontSize:11, opacity:.8, margin:0, textTransform:'uppercase', letterSpacing:'.05em' }}>Score en direct</p>
            <p style={{ fontSize:28, fontWeight:700, margin:0 }}>{percentage}%</p>
            <p style={{ fontSize:12, opacity:.7, margin:0 }}>{total} / {max} points</p>
          </div>
          {form.is_closed !== null && <ClosedBadge isClosed={form.is_closed} />}
        </Card>
      )}

      <Card style={{ padding:16, border:'1px solid var(--border)', background:'linear-gradient(135deg, var(--surface-a), var(--surface-b))' }}>
        <div style={{ display:'grid', gridTemplateColumns:mob?'1fr':'1fr 2fr', gap:10, alignItems:'center' }}>
          <div>
            <p style={{ margin:'0 0 4px', fontSize:12, fontWeight:700, color:'var(--txt,#5a4a3a)', textTransform:'uppercase', letterSpacing:'.04em' }}>Template d'offre</p>
            <p style={{ margin:0, fontSize:12, color:DS.textMuted }}>Le formulaire s’adapte selon votre type de produit.</p>
          </div>
          <div>
            <select
              value={selectedTemplateKey}
              onChange={e=>setSelectedTemplateKey(e.target.value)}
              style={{
                width:'100%',
                background:'var(--input-on-card)',
                border:'1px solid var(--border)',
                borderRadius:10,
                padding:'10px 12px',
                fontSize:13,
                fontFamily:'inherit',
                color:'var(--txt,#5a4a3a)',
              }}
            >
              {templateCatalog.templates.map(template => (
                <option key={template.key} value={template.key}>
                  {template.label}
                </option>
              ))}
            </select>
            <p style={{ margin:'6px 2px 0', fontSize:11, color:DS.textMuted }}>
              {templateCatalog.templates.find(template => template.key === selectedTemplateKey)?.description || ''}
            </p>
          </div>
        </div>
      </Card>

      <form onSubmit={submit}>
        <div style={{ display:'grid', gridTemplateColumns:mob?'1fr':'minmax(0, 1fr) 320px', gap:mob?16:26, alignItems:'start' }}>
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <Card style={{ padding:20 }}>
              <h3 style={{ fontSize:14, fontWeight:600, color:'var(--txt,#5a4a3a)', marginBottom:14 }}>Informations de l'appel</h3>
              <div style={{ display:'grid', gridTemplateColumns:mob?'1fr':'repeat(2,minmax(0,1fr))', gap:12, marginBottom:14 }}>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--txt,#5a4a3a)', marginBottom:6 }}>Prospect *</label>
                  <Input required placeholder="Nom du prospect" value={form.prospect_name} onChange={e=>setForm({ ...form, prospect_name:e.target.value })} />
                </div>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--txt,#5a4a3a)', marginBottom:6 }}>Closer *</label>
                  <Input required placeholder="Votre nom" value={form.closer_name} onChange={e=>setForm({ ...form, closer_name:e.target.value })} />
                </div>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--txt,#5a4a3a)', marginBottom:6 }}>Date *</label>
                  <Input type="date" required value={form.call_date} onChange={e=>setForm({ ...form, call_date:e.target.value })} />
                </div>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--txt,#5a4a3a)', marginBottom:6 }}>Type de prospect</label>
                  <select
                    value={form.prospect_type}
                    onChange={e=>setForm({ ...form, prospect_type:e.target.value })}
                    style={{
                      width:'100%',
                      background:'var(--input-on-card)',
                      border:'1px solid var(--border)',
                      borderRadius:10,
                      padding:'10px 12px',
                      fontSize:13,
                      fontFamily:'inherit',
                      color:'var(--txt,#5a4a3a)',
                      boxShadow:'0 1px 4px rgba(28,26,40,.08)',
                    }}
                  >
                    {PROSPECT_TYPE_OPTIONS.map(option => (
                      <option key={option.value || 'none'} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom:14 }}>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--txt,#5a4a3a)', marginBottom:6 }}>🔗 Lien enregistrement</label>
                <Input type="url" placeholder="https://..." value={form.call_link} onChange={e=>setForm({ ...form, call_link:e.target.value })} />
              </div>
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--txt,#5a4a3a)', marginBottom:8 }}>Résultat *</label>
                <div style={{ display:'flex', gap:10 }}>
                  {[{val:true,label:'✅ Closer',border:'#059669',bg:'var(--positive-bg)',c:'var(--positive-txt)'},{val:false,label:'❌ Non Closer',border:'#dc2626',bg:'var(--danger-bg)',c:'var(--danger-txt)'}].map(({val,label,border,bg,c})=>(
                    <button
                      key={String(val)}
                      type="button"
                      onClick={()=>setForm({ ...form, is_closed:val })}
                      style={{
                        flex:1, padding:'12px 14px', borderRadius:10, border:`2px solid ${form.is_closed===val?border:'var(--border)'}`,
                        background:form.is_closed===val?bg:'var(--input-on-card)', color:form.is_closed===val?c:'var(--txt2,#b09080)', fontWeight:600, fontSize:13, cursor:'pointer', fontFamily:'inherit', transition:'all .2s',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            <h2 style={{ fontSize:14, fontWeight:600, color:'var(--txt,#5a4a3a)', margin:0 }}>Évaluation des critères</h2>
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

            <Card style={{ padding:20 }}>
              <h3 style={{ fontSize:14, fontWeight:600, color:'var(--txt,#5a4a3a)', marginBottom:12 }}>Notes globales</h3>
              <Textarea placeholder="Notes libres sur l'appel..." value={form.notes} onChange={e=>setForm({ ...form, notes:e.target.value })} />
            </Card>

            {mob && (
              <>
                <Card style={{ padding:14, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Radar scores={sectionScores} size={238} />
                </Card>
                <Btn type="submit" disabled={loading} style={{ width:'100%', padding:'14px 20px', fontSize:15 }}>
                  {loading ? 'Enregistrement...' : (isEditing ? '💾 Enregistrer les modifications' : '💾 Enregistrer le debrief')}
                </Btn>
              </>
            )}
          </div>

          {!mob && (
            <div style={{ position:'sticky', top:80 }}>
              <Card style={{ padding:24, display:'flex', flexDirection:'column', alignItems:'center', gap:14, background:'linear-gradient(165deg, var(--surface-a), var(--surface-b))' }}>
                <h3 style={{ fontSize:14, fontWeight:600, color:'var(--txt,#5a4a3a)', margin:0 }}>Score en direct</h3>
                <ScoreGauge percentage={percentage} />
                <p style={{ fontSize:13, color:DS.textMuted, margin:0 }}>{total} / {max} points</p>
                {form.is_closed !== null && <ClosedBadge isClosed={form.is_closed} />}
                <div style={{ width:'100%', borderTop:'1px dashed var(--border)', paddingTop:10 }}>
                  <p style={{ margin:'0 0 8px', fontSize:11, fontWeight:700, color:DS.textMuted, textTransform:'uppercase', letterSpacing:'.06em', textAlign:'center' }}>
                    Radar Live
                  </p>
                  <div style={{ display:'flex', justifyContent:'center' }}>
                    <Radar scores={sectionScores} size={232} />
                  </div>
                </div>
                <Btn type="submit" disabled={loading} style={{ width:'100%' }}>
                  {loading ? 'Enregistrement...' : (isEditing ? '💾 Enregistrer les modifications' : '💾 Enregistrer le debrief')}
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
