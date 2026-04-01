import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../config/api';
import { fmtDate, computeSectionScores } from '../../utils/scoring';
import { SECTIONS } from '../../config/ai';
import {
  DEFAULT_PIPELINE_CONFIG,
  DEFAULT_PIPELINE_STATUSES,
  LEAD_FIELD_OPTIONS,
  loadPipelineConfig,
  savePipelineConfig,
  makeStatusKey,
} from '../../config/pipeline';
import { DS } from '../../styles/designSystem';
import { useIsMobile } from '../../hooks';
import { Btn, Card, Modal, Spinner, Empty, ScoreBadge, ClosedBadge, Input, Textarea } from '../ui';

function getStageByKey(stages, key) {
  return stages.find(stage => stage.key === key) || null;
}

function StatusBadge({ stage, compact=false }) {
  if (!stage) return null;
  return (
    <span
      style={{
        display:'inline-flex',
        alignItems:'center',
        gap:6,
        padding:compact ? '2px 8px' : '4px 10px',
        borderRadius:999,
        border:`1px solid ${stage.color}33`,
        background:stage.bg,
        color:stage.color,
        fontSize:compact ? 11 : 12,
        fontWeight:700,
      }}
    >
      <span>{stage.icon}</span>
      <span>{stage.label}</span>
    </span>
  );
}

function LeadSheet({ deal, statuses, importantFields, debriefs, onClose, onSave, onDelete, toast }) {
  const [form, setForm] = useState({
    prospect_name: deal?.prospect_name || '',
    source: deal?.source || '',
    value: deal?.value != null ? String(deal.value) : '',
    status: deal?.status || statuses[0]?.key || 'prospect',
    follow_up_date: deal?.follow_up_date || '',
    notes: deal?.notes || '',
    debrief_id: deal?.debrief_id || '',
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isNew = !deal?.id;
  const linkedDebrief = debriefs.find(item => item.id === form.debrief_id);
  const activeStage = getStageByKey(statuses, form.status) || statuses[0];
  const visibleFields = LEAD_FIELD_OPTIONS.filter(field => importantFields.includes(field.key));

  const setValue = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const save = async () => {
    if (!form.prospect_name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        prospect_name: form.prospect_name.trim(),
        source: form.source || '',
        value: Number(form.value) || 0,
        status: form.status || statuses[0]?.key || 'prospect',
        follow_up_date: form.follow_up_date || null,
        notes: form.notes || '',
        debrief_id: form.debrief_id || null,
      };
      const result = isNew
        ? await apiFetch('/deals', { method:'POST', body: payload })
        : await apiFetch(`/deals/${deal.id}`, { method:'PATCH', body: payload });
      onSave(result, !isNew);
      toast(isNew ? 'Lead créé !' : 'Lead mis à jour !');
      onClose();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deal?.id || !confirm('Supprimer ce lead ?')) return;
    setDeleting(true);
    try {
      await apiFetch(`/deals/${deal.id}`, { method:'DELETE' });
      onDelete(deal.id);
      toast('Lead supprimé');
      onClose();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const renderField = (field) => {
    if (field.key === 'notes') {
      return (
        <div key={field.key}>
          <label style={{ display:'block', fontSize:11, fontWeight:700, color:DS.textMuted, textTransform:'uppercase', marginBottom:6 }}>
            {field.label}
          </label>
          <Textarea
            rows={3}
            placeholder={field.placeholder}
            value={form.notes}
            onChange={e=>setValue('notes', e.target.value)}
          />
        </div>
      );
    }

    if (field.key === 'debrief_id') {
      return (
        <div key={field.key}>
          <label style={{ display:'block', fontSize:11, fontWeight:700, color:DS.textMuted, textTransform:'uppercase', marginBottom:6 }}>
            {field.label}
          </label>
          <select
            value={form.debrief_id}
            onChange={e=>setValue('debrief_id', e.target.value)}
            style={{
              width:'100%',
              borderRadius:10,
              border:'1px solid var(--border)',
              background:'var(--card,#fff)',
              color:'var(--txt,#5a4a3a)',
              fontFamily:'inherit',
              fontSize:13,
              padding:'10px 12px',
            }}
          >
            <option value="">Aucun debrief lié</option>
            {debriefs.map(d => (
              <option key={d.id} value={d.id}>
                {d.prospect_name} — {fmtDate(d.call_date)} ({Math.round(d.percentage || 0)}%)
              </option>
            ))}
          </select>
        </div>
      );
    }

    return (
      <div key={field.key}>
        <label style={{ display:'block', fontSize:11, fontWeight:700, color:DS.textMuted, textTransform:'uppercase', marginBottom:6 }}>
          {field.label}
        </label>
        <Input
          type={field.type}
          placeholder={field.placeholder || ''}
          value={String(form[field.key] ?? '')}
          onChange={e=>setValue(field.key, e.target.value)}
        />
      </div>
    );
  };

  return (
    <div style={{ position:'fixed', inset:0, zIndex:9000, background:'rgba(10,15,25,.35)', display:'flex', alignItems:'flex-end', justifyContent:'center' }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:'var(--card,#fff)', borderRadius:'18px 18px 0 0', width:'100%', maxWidth:620, maxHeight:'92vh', overflowY:'auto', boxShadow:'var(--sh-card)', border:'1px solid var(--border)' }}>
        <div style={{ padding:'18px 18px 0', position:'sticky', top:0, background:'var(--card,#fff)', zIndex:2 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <StatusBadge stage={activeStage} />
            <div style={{ display:'flex', gap:8 }}>
              {!isNew && <Btn variant="danger" onClick={remove} disabled={deleting} style={{ fontSize:12, padding:'7px 10px' }}>Supprimer</Btn>}
              <button onClick={onClose} style={{ border:'none', background:'none', cursor:'pointer', fontSize:20, color:'var(--txt3,#c8b8a8)' }}>✕</button>
            </div>
          </div>

          <Input
            placeholder="Nom du prospect *"
            value={form.prospect_name}
            onChange={e=>setValue('prospect_name', e.target.value)}
            style={{ fontSize:20, fontWeight:700, padding:'10px 2px', border:'none', borderBottom:'2px solid var(--border)', borderRadius:0, boxShadow:'none', background:'transparent' }}
          />
        </div>

        <div style={{ padding:'14px 18px 20px', display:'flex', flexDirection:'column', gap:16 }}>
          <div>
            <label style={{ display:'block', fontSize:11, fontWeight:700, color:DS.textMuted, textTransform:'uppercase', marginBottom:8 }}>Statut</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
              {statuses.map(stage => (
                <button
                  key={stage.key}
                  type="button"
                  onClick={()=>setValue('status', stage.key)}
                  style={{
                    padding:'6px 12px',
                    borderRadius:999,
                    border:`1.5px solid ${form.status===stage.key ? stage.color : 'var(--border)'}`,
                    background:form.status===stage.key ? stage.bg : 'var(--card,#fff)',
                    color:form.status===stage.key ? stage.color : 'var(--txt2,#b09080)',
                    fontFamily:'inherit',
                    fontSize:12,
                    fontWeight:700,
                    cursor:'pointer',
                  }}
                >
                  {stage.icon} {stage.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {visibleFields.filter(field => field.key !== 'notes').map(renderField)}
          </div>
          {visibleFields.some(field => field.key === 'notes') && renderField(LEAD_FIELD_OPTIONS.find(field => field.key === 'notes'))}

          {linkedDebrief && (
            <Card style={{ padding:12, border:'1px solid rgba(106,172,206,.3)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', gap:10, alignItems:'flex-start', marginBottom:8 }}>
                <div>
                  <p style={{ margin:0, fontWeight:700, fontSize:14, color:'var(--txt,#5a4a3a)' }}>{linkedDebrief.prospect_name}</p>
                  <p style={{ margin:'2px 0 0', fontSize:12, color:DS.textMuted }}>{fmtDate(linkedDebrief.call_date)} · {linkedDebrief.closer_name}</p>
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  <ScoreBadge pct={Math.round(linkedDebrief.percentage || 0)} />
                  <ClosedBadge isClosed={linkedDebrief.is_closed} />
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:6 }}>
                {SECTIONS.map(({ key }) => {
                  const value = computeSectionScores(linkedDebrief.sections || {})[key] || 0;
                  return (
                    <div key={key} style={{ background:'var(--input,#f5ede6)', borderRadius:8, padding:'5px 4px', textAlign:'center', fontSize:11, color:barColor(value), fontWeight:700 }}>
                      {value}/5
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {!isNew && (
            <Btn
              variant="secondary"
              onClick={async()=>{
                try {
                  await apiFetch('/zapier/push-deal', { method:'POST', body:{ deal_id: deal.id } });
                  toast('Synchronisé avec iClosed !');
                } catch (e) {
                  toast(e.message, 'error');
                }
              }}
              style={{ fontSize:13 }}
            >
              🔄 Synchroniser avec iClosed
            </Btn>
          )}

          <Btn onClick={save} disabled={saving || !form.prospect_name.trim()} style={{ width:'100%' }}>
            {saving ? 'Enregistrement...' : isNew ? 'Créer le lead' : 'Enregistrer'}
          </Btn>
        </div>
      </div>
    </div>
  );
}

function barColor(value) {
  if (value >= 4) return '#059669';
  if (value >= 3) return '#d97706';
  if (value >= 2) return '#e87d6a';
  return '#ef4444';
}

function DealCard({ deal, stages, onOpen }) {
  const [dragging, setDragging] = useState(false);
  const stage = getStageByKey(stages, deal.status) || stages[0] || { color:'#64748b', bg:'#f1f5f9', icon:'•', label:'Statut' };
  const debriefScore = deal.debrief_score != null ? Math.round(deal.debrief_score) : null;
  return (
    <div
      draggable
      onDragStart={e => { e.dataTransfer.setData('dealId', deal.id); setDragging(true); }}
      onDragEnd={()=>setDragging(false)}
      onClick={()=>onOpen(deal)}
      style={{
        background:'var(--card,#fff)',
        borderRadius:10,
        padding:'10px 11px',
        cursor:'pointer',
        border:'1px solid var(--border)',
        opacity: dragging ? 0.5 : 1,
        boxShadow: dragging ? 'var(--sh-card)' : 'var(--sh-sm)',
        transition:'all .15s',
      }}
    >
      <p style={{ margin:'0 0 6px', fontSize:13, fontWeight:700, color:'var(--txt,#5a4a3a)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
        {deal.prospect_name}
      </p>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
        {deal.value > 0 && <span style={{ fontSize:12, fontWeight:700, color:'#059669' }}>{deal.value.toLocaleString('fr-FR')} €</span>}
        {debriefScore != null && (
          <span style={{ fontSize:10, fontWeight:700, padding:'1px 7px', borderRadius:999, background:'var(--input,#f5ede6)', color:'var(--txt,#5a4a3a)' }}>
            {debriefScore}%
          </span>
        )}
      </div>
      <div style={{ marginTop:6, display:'flex', alignItems:'center', justifyContent:'space-between', gap:6 }}>
        {deal.closer_name && <span style={{ fontSize:11, color:DS.textMuted, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>👤 {deal.closer_name}</span>}
        <StatusBadge stage={stage} compact />
      </div>
      {deal.follow_up_date && new Date(deal.follow_up_date) < new Date() && !stage.closed && (
        <p style={{ margin:'6px 0 0', fontSize:10, fontWeight:700, color:'#dc2626' }}>⚠️ Relance en retard</p>
      )}
    </div>
  );
}

function DropColumn({ stage, deals, onOpen, onMove, stages }) {
  const [over, setOver] = useState(false);
  const totalValue = deals.reduce((sum, deal) => sum + (deal.value || 0), 0);
  return (
    <div
      style={{ flex:1, minWidth:210, display:'flex', flexDirection:'column', gap:8 }}
      onDragOver={e=>{ e.preventDefault(); setOver(true); }}
      onDragLeave={()=>setOver(false)}
      onDrop={e=>{ e.preventDefault(); setOver(false); const id = e.dataTransfer.getData('dealId'); if (id) onMove(id, stage.key); }}
    >
      <div style={{ padding:'8px 11px', background:over ? `${stage.color}22` : stage.bg, borderRadius:10, border:over ? `2px solid ${stage.color}` : '2px solid transparent', display:'flex', justifyContent:'space-between', gap:6, alignItems:'center', transition:'all .15s' }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span>{stage.icon}</span>
          <span style={{ fontSize:12, fontWeight:700, color:stage.color }}>{stage.label}</span>
          <span style={{ fontSize:10, fontWeight:700, color:stage.color, background:'rgba(255,255,255,.75)', borderRadius:999, padding:'1px 6px' }}>
            {deals.length}
          </span>
        </div>
        {totalValue > 0 && <span style={{ fontSize:10, fontWeight:700, color:stage.color }}>{totalValue.toLocaleString('fr-FR')} €</span>}
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:7, minHeight:68, borderRadius:10, padding:over ? 5 : 0, background:over ? 'rgba(106,172,206,.08)' : 'transparent' }}>
        {deals.map(deal => (
          <DealCard key={deal.id} deal={deal} stages={stages} onOpen={onOpen} />
        ))}
        {deals.length === 0 && (
          <div style={{ border:'1.5px dashed var(--border)', borderRadius:10, padding:'18px 10px', textAlign:'center', color:DS.textMuted, fontSize:11 }}>
            {over ? 'Déposer ici' : 'Vide'}
          </div>
        )}
      </div>
    </div>
  );
}

function AccordionColumn({ stage, deals, stages, onOpen, onMove }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderRadius:10, background:'var(--card,#fff)', border:'1px solid var(--border)', overflow:'hidden', boxShadow:'var(--sh-sm)' }}>
      <button type="button" onClick={()=>setOpen(v=>!v)} style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', background:stage.bg, border:'none', cursor:'pointer', fontFamily:'inherit' }}>
        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
          <span>{stage.icon}</span>
          <span style={{ fontSize:12, fontWeight:700, color:stage.color }}>{stage.label}</span>
          <span style={{ fontSize:10, fontWeight:700, color:stage.color, background:'rgba(255,255,255,.8)', borderRadius:999, padding:'1px 6px' }}>{deals.length}</span>
        </div>
        <span style={{ color:stage.color, fontSize:12 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{ padding:'8px 10px', display:'flex', flexDirection:'column', gap:7 }}>
          {deals.length === 0
            ? <p style={{ textAlign:'center', color:DS.textMuted, fontSize:12, margin:'6px 0' }}>Vide</p>
            : deals.map(deal => <DealCard key={deal.id} deal={deal} stages={stages} onOpen={onOpen} onMove={onMove} />)}
        </div>
      )}
    </div>
  );
}

function PipelineSettingsModal({ config, deals, onClose, onSave, toast }) {
  const [draft, setDraft] = useState(() => JSON.parse(JSON.stringify(config || DEFAULT_PIPELINE_CONFIG)));

  useEffect(() => {
    setDraft(JSON.parse(JSON.stringify(config || DEFAULT_PIPELINE_CONFIG)));
  }, [config]);

  const updateStatus = (idx, patch) => {
    setDraft(prev => ({
      ...prev,
      statuses: prev.statuses.map((status, statusIdx) => statusIdx === idx ? { ...status, ...patch } : status),
    }));
  };

  const removeStatus = (idx) => {
    setDraft(prev => ({
      ...prev,
      statuses: prev.statuses.filter((_, statusIdx) => statusIdx !== idx),
    }));
  };

  const moveStatus = (idx, direction) => {
    setDraft(prev => {
      const next = [...prev.statuses];
      const targetIdx = idx + direction;
      if (targetIdx < 0 || targetIdx >= next.length) return prev;
      [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
      return { ...prev, statuses: next };
    });
  };

  const toggleField = (fieldKey) => {
    setDraft(prev => {
      const exists = prev.importantFields.includes(fieldKey);
      return {
        ...prev,
        importantFields: exists
          ? prev.importantFields.filter(key => key !== fieldKey)
          : [...prev.importantFields, fieldKey],
      };
    });
  };

  const addStatus = () => {
    const nextLabel = `Nouveau statut ${draft.statuses.length + 1}`;
    const nextKey = makeStatusKey(nextLabel, `status_${draft.statuses.length + 1}`);
    setDraft(prev => ({
      ...prev,
      statuses: [
        ...prev.statuses,
        { key: nextKey, label: nextLabel, icon:'🧩', color:'#64748b', bg:'#e2e8f0', closed:false, won:false },
      ],
    }));
  };

  const save = () => {
    if (!draft.statuses?.length) {
      toast('Ajoutez au moins un statut', 'error');
      return;
    }
    if (!draft.importantFields?.length) {
      toast('Sélectionnez au moins une information lead', 'error');
      return;
    }
    const usedKeys = new Set();
    const normalizedStatuses = draft.statuses.map((status, idx) => {
      const normalizedKeyBase = makeStatusKey(status.key || status.label || `status_${idx + 1}`, `status_${idx + 1}`);
      let normalizedKey = normalizedKeyBase;
      let suffix = 2;
      while (usedKeys.has(normalizedKey)) {
        normalizedKey = `${normalizedKeyBase}_${suffix}`;
        suffix += 1;
      }
      usedKeys.add(normalizedKey);
      return {
        ...status,
        key: normalizedKey,
        label: String(status.label || normalizedKey).trim() || normalizedKey,
        icon: String(status.icon || '•').trim() || '•',
      };
    });
    onSave({ ...draft, statuses: normalizedStatuses });
  };

  const statusesInUse = new Set((deals || []).map(deal => deal.status));

  return (
    <Modal title="Paramètres pipeline" onClose={onClose}>
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <p style={{ margin:0, fontSize:12, color:DS.textMuted }}>
          Personnalisez les statuts et les informations importantes à afficher dans chaque fiche lead.
        </p>

        <Card style={{ padding:12, border:'1px solid var(--border)' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <h3 style={{ margin:0, fontSize:13, color:'var(--txt,#5a4a3a)' }}>Statuts pipeline</h3>
            <Btn variant="secondary" onClick={addStatus} style={{ fontSize:12, padding:'6px 10px' }}>+ Ajouter</Btn>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {(draft.statuses || []).map((status, idx) => (
              <div key={`${status.key}_${idx}`} style={{ border:'1px solid var(--border)', borderRadius:10, padding:10, background:'var(--input,#f5ede6)' }}>
                <div style={{ display:'grid', gridTemplateColumns:'42px 1fr 1fr', gap:8, marginBottom:8 }}>
                  <Input value={status.icon} onChange={e=>updateStatus(idx, { icon: e.target.value })} placeholder="🎯" />
                  <Input value={status.label} onChange={e=>updateStatus(idx, { label: e.target.value })} placeholder="Label statut" />
                  <Input value={status.key} onChange={e=>updateStatus(idx, { key: e.target.value })} placeholder="clé_statut" />
                </div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <label style={{ fontSize:11, color:DS.textMuted }}>Couleur</label>
                    <input type="color" value={status.color} onChange={e=>updateStatus(idx, { color: e.target.value })} />
                    <label style={{ fontSize:11, color:DS.textMuted }}>Fond</label>
                    <input type="color" value={status.bg.startsWith('#') ? status.bg : '#f1f5f9'} onChange={e=>updateStatus(idx, { bg: e.target.value })} />
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <label style={{ fontSize:11, color:DS.textMuted }}>
                      <input type="checkbox" checked={!!status.closed} onChange={e=>updateStatus(idx, { closed: e.target.checked })} /> Clôturé
                    </label>
                    <label style={{ fontSize:11, color:DS.textMuted }}>
                      <input type="checkbox" checked={!!status.won} onChange={e=>updateStatus(idx, { won: e.target.checked, closed: e.target.checked ? true : status.closed })} /> Gagné
                    </label>
                  </div>
                </div>
                <div style={{ marginTop:8, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <p style={{ margin:0, fontSize:11, color: statusesInUse.has(status.key) ? '#d97706' : DS.textMuted }}>
                    {statusesInUse.has(status.key) ? 'Statut actuellement utilisé par des leads' : 'Aucun lead sur ce statut'}
                  </p>
                  <div style={{ display:'flex', gap:6 }}>
                    <Btn variant="secondary" onClick={()=>moveStatus(idx, -1)} style={{ fontSize:11, padding:'4px 8px' }}>↑</Btn>
                    <Btn variant="secondary" onClick={()=>moveStatus(idx, 1)} style={{ fontSize:11, padding:'4px 8px' }}>↓</Btn>
                    <Btn variant="danger" onClick={()=>removeStatus(idx)} style={{ fontSize:11, padding:'4px 8px' }}>Suppr.</Btn>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card style={{ padding:12, border:'1px solid var(--border)' }}>
          <h3 style={{ margin:'0 0 10px', fontSize:13, color:'var(--txt,#5a4a3a)' }}>Informations importantes du lead</h3>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {LEAD_FIELD_OPTIONS.map(field => (
              <label key={field.key} style={{ fontSize:12, color:'var(--txt,#5a4a3a)', display:'flex', alignItems:'center', gap:6, background:'var(--input,#f5ede6)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 10px' }}>
                <input
                  type="checkbox"
                  checked={draft.importantFields.includes(field.key)}
                  onChange={()=>toggleField(field.key)}
                />
                {field.label}
              </label>
            ))}
          </div>
        </Card>

        <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
          <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
          <Btn onClick={save}>Sauvegarder</Btn>
        </div>
      </div>
    </Modal>
  );
}

function PipelinePage({ user, toast, debriefs }) {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openLead, setOpenLead] = useState(null);
  const [filter, setFilter] = useState('all');
  const [showSettings, setShowSettings] = useState(false);
  const [pipelineConfig, setPipelineConfig] = useState(DEFAULT_PIPELINE_CONFIG);
  const mob = useIsMobile();

  useEffect(() => {
    setPipelineConfig(loadPipelineConfig(user?.id));
  }, [user?.id]);

  useEffect(() => {
    apiFetch('/deals')
      .then(setDeals)
      .catch(err => toast(err.message, 'error'))
      .finally(() => setLoading(false));
  }, []);

  const statuses = useMemo(() => {
    const list = pipelineConfig?.statuses?.length ? pipelineConfig.statuses : DEFAULT_PIPELINE_STATUSES;
    const known = new Set(list.map(status => status.key));
    const unknown = [...new Set((deals || []).map(deal => deal.status).filter(status => status && !known.has(status)))]
      .map(status => ({ key: status, label: status, icon:'🧩', color:'#64748b', bg:'#e2e8f0', closed:false, won:false }));
    return [...list, ...unknown];
  }, [pipelineConfig, deals]);

  const importantFields = pipelineConfig?.importantFields?.length
    ? pipelineConfig.importantFields
    : DEFAULT_PIPELINE_CONFIG.importantFields;

  const handleSave = (deal, isEdit) => {
    setDeals(prev => isEdit ? prev.map(item => item.id === deal.id ? deal : item) : [deal, ...prev]);
  };

  const handleMove = async (id, status) => {
    try {
      const updated = await apiFetch(`/deals/${id}`, { method:'PATCH', body:{ status } });
      setDeals(prev => prev.map(item => item.id === id ? updated : item));
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const handleDelete = (id) => setDeals(prev => prev.filter(item => item.id !== id));

  const isHOS = user.role === 'head_of_sales';
  const closers = [...new Map(deals.map(deal => [deal.user_id, { id: deal.user_id, name: deal.user_name }])).values()];
  const displayDeals = filter === 'all' ? deals : deals.filter(deal => deal.user_id === filter);

  const closedKeys = statuses.filter(status => status.closed).map(status => status.key);
  const wonKeys = statuses.filter(status => status.won).map(status => status.key);
  const totalValue = deals.filter(deal => wonKeys.includes(deal.status)).reduce((sum, deal) => sum + (deal.value || 0), 0);
  const totalPipe = deals.filter(deal => !closedKeys.includes(deal.status)).reduce((sum, deal) => sum + (deal.value || 0), 0);
  const overdueCount = deals.filter(deal => deal.follow_up_date && new Date(deal.follow_up_date) < new Date() && !closedKeys.includes(deal.status)).length;
  const closed = deals.filter(deal => closedKeys.includes(deal.status));
  const winRate = closed.length > 0 ? Math.round((deals.filter(deal => wonKeys.includes(deal.status)).length / closed.length) * 100) : 0;

  const savePipelineSettings = (nextConfig) => {
    const saved = savePipelineConfig(user?.id, nextConfig);
    setPipelineConfig(saved);
    setShowSettings(false);
    toast('Pipeline personnalisé');
  };

  if (loading) return <Spinner full />;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <Card style={{ padding:16, border:'1px solid var(--border)', background:'linear-gradient(135deg, rgba(253,232,228,.55), rgba(218,237,245,.55))' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12, flexWrap:'wrap' }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:700, color:'var(--txt,#5a4a3a)', margin:0 }}>🎯 Pipeline</h1>
            <p style={{ color:DS.textMuted, fontSize:13, margin:'4px 0 0' }}>
              {deals.length} lead{deals.length !== 1 ? 's' : ''} · Statuts et informations configurables
            </p>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <Btn variant="secondary" onClick={()=>setShowSettings(true)}>⚙️ Paramètres</Btn>
            <Btn onClick={()=>setOpenLead({})}>+ Nouveau lead</Btn>
          </div>
        </div>
        <div style={{ marginTop:10, display:'flex', flexWrap:'wrap', gap:8 }}>
          {importantFields.map(fieldKey => {
            const field = LEAD_FIELD_OPTIONS.find(item => item.key === fieldKey);
            return <span key={fieldKey} style={{ padding:'4px 9px', borderRadius:999, background:'var(--card,#fff)', border:'1px solid var(--border)', fontSize:11, color:DS.textMuted }}>{field?.label || fieldKey}</span>;
          })}
        </div>
      </Card>

      <div style={{ display:'grid', gridTemplateColumns:mob ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap:10 }}>
        {[
          { label:'CA signé', value:`${totalValue.toLocaleString('fr-FR')} €`, icon:'💶', color:'#059669' },
          { label:'Pipeline actif', value:`${totalPipe.toLocaleString('fr-FR')} €`, icon:'🧭', color:'#e87d6a' },
          { label:'Taux win', value:`${winRate}%`, icon:'🏆', color:'#d97706' },
          { label:'Relances en retard', value:overdueCount, icon:'⏰', color:overdueCount > 0 ? '#dc2626' : '#64748b' },
        ].map(kpi => (
          <Card key={kpi.label} style={{ padding:'12px 13px' }}>
            <p style={{ margin:'0 0 6px', fontSize:11, textTransform:'uppercase', letterSpacing:'.05em', color:DS.textMuted }}>{kpi.label}</p>
            <p style={{ margin:0, fontSize:22, fontWeight:700, color:kpi.color }}>{kpi.value}</p>
            <p style={{ margin:'4px 0 0', fontSize:12 }}>{kpi.icon}</p>
          </Card>
        ))}
      </div>

      {isHOS && closers.length > 1 && (
        <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
          <button
            onClick={()=>setFilter('all')}
            style={{ padding:'6px 12px', borderRadius:999, border:`1.5px solid ${filter === 'all' ? '#e87d6a' : 'var(--border)'}`, background:filter === 'all' ? 'rgba(253,232,228,.6)' : 'var(--card,#fff)', color:filter === 'all' ? '#e87d6a' : DS.textMuted, fontSize:12, fontWeight:700, fontFamily:'inherit', cursor:'pointer' }}
          >
            Tous les closers
          </button>
          {closers.map(closer => (
            <button
              key={closer.id}
              onClick={()=>setFilter(closer.id)}
              style={{ padding:'6px 12px', borderRadius:999, border:`1.5px solid ${filter === closer.id ? '#e87d6a' : 'var(--border)'}`, background:filter === closer.id ? 'rgba(253,232,228,.6)' : 'var(--card,#fff)', color:filter === closer.id ? '#e87d6a' : DS.textMuted, fontSize:12, fontWeight:700, fontFamily:'inherit', cursor:'pointer' }}
            >
              👤 {closer.name}
            </button>
          ))}
        </div>
      )}

      {displayDeals.length === 0 ? (
        <Empty icon="🎯" title="Pipeline vide" subtitle="Créez votre premier lead" action={<Btn onClick={()=>setOpenLead({})}>+ Créer un lead</Btn>} />
      ) : mob ? (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {statuses.map(stage => (
            <AccordionColumn key={stage.key} stage={stage} deals={displayDeals.filter(deal => deal.status === stage.key)} stages={statuses} onOpen={setOpenLead} onMove={handleMove} />
          ))}
        </div>
      ) : (
        <div style={{ overflowX:'auto', WebkitOverflowScrolling:'touch', paddingBottom:8 }}>
          <div style={{ display:'flex', gap:12, minWidth:`${statuses.length * 220}px` }}>
            {statuses.map(stage => (
              <DropColumn key={stage.key} stage={stage} deals={displayDeals.filter(deal => deal.status === stage.key)} onOpen={setOpenLead} onMove={handleMove} stages={statuses} />
            ))}
          </div>
        </div>
      )}

      {openLead !== null && (
        <LeadSheet
          deal={openLead?.id ? openLead : null}
          statuses={statuses}
          importantFields={importantFields}
          debriefs={debriefs || []}
          onClose={()=>setOpenLead(null)}
          onSave={handleSave}
          onDelete={handleDelete}
          toast={toast}
        />
      )}

      {showSettings && (
        <PipelineSettingsModal
          config={pipelineConfig}
          deals={deals}
          onClose={()=>setShowSettings(false)}
          onSave={savePipelineSettings}
          toast={toast}
        />
      )}
    </div>
  );
}

export { LeadSheet, DealCard, DropColumn, AccordionColumn, PipelinePage };
