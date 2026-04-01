import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../config/api';
import { fmtDate, computeSectionScores } from '../../utils/scoring';
import { SECTIONS } from '../../config/ai';
import {
  DEFAULT_PIPELINE_CONFIG,
  DEFAULT_PIPELINE_STATUSES,
  normalizePipelineConfig,
  makeStatusKey,
} from '../../config/pipeline';
import { DS } from '../../styles/designSystem';
import { useIsMobile } from '../../hooks';
import { Btn, Card, Modal, Spinner, Empty, ScoreBadge, ClosedBadge, Input, Textarea } from '../ui';

function getStageByKey(stages, key) {
  return stages.find(stage => stage.key === key) || null;
}

function getWonStatusKey(stages) {
  return stages.find(stage => stage.won)?.key || 'signe';
}

function getOpenStatusKey(stages) {
  return stages.find(stage => !stage.closed)?.key || 'prospect';
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

function LeadSheet({ deal, statuses, debriefs, onClose, onSave, onDelete, onCreateDebrief, toast }) {
  const mob = useIsMobile();
  const initialDealClosed = typeof deal?.deal_closed === 'boolean'
    ? deal.deal_closed
    : !!getStageByKey(statuses, deal?.status)?.won;
  const [form, setForm] = useState({
    prospect_name: deal?.prospect_name || '',
    first_name: deal?.first_name || '',
    last_name: deal?.last_name || '',
    email: deal?.email || '',
    phone: deal?.phone || '',
    source: deal?.source || '',
    value: deal?.value != null ? String(deal.value) : '',
    contact_date: deal?.contact_date || deal?.follow_up_date || '',
    note: deal?.note || deal?.notes || '',
    debrief_id: deal?.debrief_id || '',
    status: deal?.status || statuses[0]?.key || 'prospect',
    deal_closed: initialDealClosed,
  });
  const [activeTab, setActiveTab] = useState('contact');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [creatingDebrief, setCreatingDebrief] = useState(false);
  const isNew = !deal?.id;
  const linkedDebrief = debriefs.find(item => item.id === form.debrief_id);
  const activeStage = getStageByKey(statuses, form.status) || statuses[0];

  const setValue = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const buildProspectName = () => {
    const fromContact = `${form.first_name || ''} ${form.last_name || ''}`.trim();
    return fromContact || form.prospect_name.trim();
  };

  const buildStatus = () => {
    if (form.deal_closed) return getWonStatusKey(statuses);
    const isCurrentClosed = !!getStageByKey(statuses, form.status)?.closed;
    if (isCurrentClosed) return getOpenStatusKey(statuses);
    return form.status || getOpenStatusKey(statuses);
  };

  const saveLead = async ({ closeAfter = true, silent = false } = {}) => {
    const prospectName = buildProspectName();
    if (!prospectName) {
      toast('Nom ou prénom requis', 'error');
      return null;
    }
    setSaving(true);
    try {
      const payload = {
        prospect_name: prospectName,
        first_name: form.first_name || '',
        last_name: form.last_name || '',
        email: form.email || '',
        phone: form.phone || '',
        source: form.source || '',
        deal_closed: !!form.deal_closed,
        value: Number(form.value) || 0,
        contact_date: form.contact_date || null,
        note: form.note || '',
        debrief_id: form.debrief_id || null,
        status: buildStatus(),
      };
      const result = isNew
        ? await apiFetch('/deals', { method:'POST', body: payload })
        : await apiFetch(`/deals/${deal.id}`, { method:'PATCH', body: payload });
      onSave(result, !isNew);
      if (!silent) toast(isNew ? 'Contact créé !' : 'Contact mis à jour !');
      if (closeAfter) onClose();
      return result;
    } catch (e) {
      toast(e.message, 'error');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deal?.id || !confirm('Supprimer ce contact ?')) return;
    setDeleting(true);
    try {
      await apiFetch(`/deals/${deal.id}`, { method:'DELETE' });
      onDelete(deal.id);
      toast('Contact supprimé');
      onClose();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const createDebrief = async () => {
    setCreatingDebrief(true);
    try {
      let currentDeal = deal;
      if (!currentDeal?.id) {
        currentDeal = await saveLead({ closeAfter:false, silent:true });
        if (!currentDeal?.id) return;
      }
      onCreateDebrief({
        deal_id: currentDeal.id,
        prospect_name: buildProspectName(),
        first_name: form.first_name || '',
        last_name: form.last_name || '',
        email: form.email || '',
        phone: form.phone || '',
        source: form.source || '',
        value: Number(form.value) || 0,
        contact_date: form.contact_date || '',
        note: form.note || '',
        deal_closed: !!form.deal_closed,
      });
      onClose();
    } finally {
      setCreatingDebrief(false);
    }
  };

  return (
    <div style={{ position:'fixed', inset:0, zIndex:9000, background:'rgba(10,15,25,.42)', display:'flex', alignItems:'center', justifyContent:'center', padding:mob?8:20 }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:'var(--card,#fff)', borderRadius:mob?14:18, width:mob?'calc(100vw - 16px)':'min(660px, calc(100vw - 44px))', maxHeight:'92vh', overflowY:'auto', boxShadow:'var(--sh-card)', border:'1px solid var(--border)' }}>
        <div style={{ padding:'18px 18px 0', position:'sticky', top:0, background:'var(--card,#fff)', zIndex:2 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <StatusBadge stage={activeStage} />
            <div style={{ display:'flex', gap:8 }}>
              {!isNew && <Btn variant="danger" onClick={remove} disabled={deleting} style={{ fontSize:12, padding:'7px 10px' }}>Supprimer</Btn>}
              <button onClick={onClose} style={{ border:'none', background:'none', cursor:'pointer', fontSize:20, color:'var(--txt3,#c8b8a8)' }}>✕</button>
            </div>
          </div>

          <div style={{ display:'flex', gap:6, marginBottom:12 }}>
            {[
              { key:'contact', label:'Fiche contact' },
              { key:'debrief', label:'Nouveau Debrief' },
            ].map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={()=>setActiveTab(tab.key)}
                style={{
                  border:'none',
                  borderRadius:999,
                  padding:'7px 12px',
                  fontFamily:'inherit',
                  fontSize:12,
                  fontWeight:700,
                  cursor:'pointer',
                  background:activeTab === tab.key ? 'linear-gradient(135deg,#e87d6a,#d4604e)' : 'var(--input,#f5ede6)',
                  color:activeTab === tab.key ? 'white' : 'var(--txt2,#b09080)',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding:'14px 18px 20px', display:'flex', flexDirection:'column', gap:16 }}>
          {activeTab === 'contact' && (
            <>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label style={{ display:'block', fontSize:11, fontWeight:700, color:DS.textMuted, textTransform:'uppercase', marginBottom:6 }}>Nom *</label>
                  <Input value={form.last_name} onChange={e=>setValue('last_name', e.target.value)} />
                </div>
                <div>
                  <label style={{ display:'block', fontSize:11, fontWeight:700, color:DS.textMuted, textTransform:'uppercase', marginBottom:6 }}>Prénom *</label>
                  <Input value={form.first_name} onChange={e=>setValue('first_name', e.target.value)} />
                </div>
                <div>
                  <label style={{ display:'block', fontSize:11, fontWeight:700, color:DS.textMuted, textTransform:'uppercase', marginBottom:6 }}>Email</label>
                  <Input type="email" value={form.email} onChange={e=>setValue('email', e.target.value)} />
                </div>
                <div>
                  <label style={{ display:'block', fontSize:11, fontWeight:700, color:DS.textMuted, textTransform:'uppercase', marginBottom:6 }}>Téléphone</label>
                  <Input value={form.phone} onChange={e=>setValue('phone', e.target.value)} />
                </div>
                <div>
                  <label style={{ display:'block', fontSize:11, fontWeight:700, color:DS.textMuted, textTransform:'uppercase', marginBottom:6 }}>Source</label>
                  <Input value={form.source} onChange={e=>setValue('source', e.target.value)} />
                </div>
                <div>
                  <label style={{ display:'block', fontSize:11, fontWeight:700, color:DS.textMuted, textTransform:'uppercase', marginBottom:6 }}>Valeur (€)</label>
                  <Input type="number" value={form.value} onChange={e=>setValue('value', e.target.value)} />
                </div>
                <div>
                  <label style={{ display:'block', fontSize:11, fontWeight:700, color:DS.textMuted, textTransform:'uppercase', marginBottom:6 }}>Date</label>
                  <Input type="date" value={form.contact_date} onChange={e=>setValue('contact_date', e.target.value)} />
                </div>
              </div>

              <div>
                <label style={{ display:'block', fontSize:11, fontWeight:700, color:DS.textMuted, textTransform:'uppercase', marginBottom:8 }}>Deal (closé ou non)</label>
                <div style={{ display:'flex', gap:10 }}>
                  <button
                    type="button"
                    onClick={()=>setValue('deal_closed', true)}
                    style={{ flex:1, padding:'11px 12px', borderRadius:10, border:`1.5px solid ${form.deal_closed ? '#059669' : 'var(--border)'}`, background:form.deal_closed ? 'rgba(209,250,229,.8)' : 'var(--card,#fff)', color:form.deal_closed ? '#065f46' : DS.textMuted, fontWeight:700, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}
                  >
                    ✅ Closé
                  </button>
                  <button
                    type="button"
                    onClick={()=>setValue('deal_closed', false)}
                    style={{ flex:1, padding:'11px 12px', borderRadius:10, border:`1.5px solid ${!form.deal_closed ? '#dc2626' : 'var(--border)'}`, background:!form.deal_closed ? 'rgba(254,226,226,.8)' : 'var(--card,#fff)', color:!form.deal_closed ? '#991b1b' : DS.textMuted, fontWeight:700, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}
                  >
                    ❌ Non closé
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display:'block', fontSize:11, fontWeight:700, color:DS.textMuted, textTransform:'uppercase', marginBottom:6 }}>Note</label>
                <Textarea rows={4} value={form.note} onChange={e=>setValue('note', e.target.value)} />
              </div>
            </>
          )}

          {activeTab === 'debrief' && (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <Card style={{ padding:14, border:'1px solid rgba(106,172,206,.3)' }}>
                <p style={{ margin:'0 0 6px', fontWeight:700, fontSize:14, color:'var(--txt,#5a4a3a)' }}>
                  {buildProspectName() || 'Contact à compléter'}
                </p>
                <p style={{ margin:'0 0 8px', fontSize:12, color:DS.textMuted }}>
                  {form.email || 'Email non renseigné'} · {form.phone || 'Téléphone non renseigné'}
                </p>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  <span style={{ padding:'3px 8px', borderRadius:999, fontSize:11, background:'var(--input,#f5ede6)', border:'1px solid var(--border)' }}>Source: {form.source || '—'}</span>
                  <span style={{ padding:'3px 8px', borderRadius:999, fontSize:11, background:'var(--input,#f5ede6)', border:'1px solid var(--border)' }}>Valeur: {(Number(form.value) || 0).toLocaleString('fr-FR')} €</span>
                  <span style={{ padding:'3px 8px', borderRadius:999, fontSize:11, background:'var(--input,#f5ede6)', border:'1px solid var(--border)' }}>Date: {form.contact_date ? fmtDate(form.contact_date) : '—'}</span>
                </div>
              </Card>

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

              <Btn onClick={createDebrief} disabled={creatingDebrief}>
                {creatingDebrief ? 'Préparation...' : '➕ Nouveau Debrief lié à ce contact'}
              </Btn>
            </div>
          )}

          <Btn onClick={()=>saveLead()} disabled={saving || !buildProspectName()} style={{ width:'100%' }}>
            {saving ? 'Enregistrement...' : isNew ? 'Créer le contact' : 'Enregistrer la fiche'}
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
  const contactName = `${deal.first_name || ''} ${deal.last_name || ''}`.trim() || deal.prospect_name;
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
        {contactName}
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
    onSave({
      ...draft,
      statuses: normalizedStatuses,
      importantFields: ['first_name', 'last_name', 'email', 'phone', 'source', 'deal_closed', 'value', 'contact_date', 'note'],
    });
  };

  const statusesInUse = new Set((deals || []).map(deal => deal.status));

  return (
    <Modal title="Paramètres pipeline" onClose={onClose}>
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <p style={{ margin:0, fontSize:12, color:DS.textMuted }}>
          Personnalisez les statuts pipeline. La fiche contact reste unifiée pour toute l’équipe.
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

        <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
          <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
          <Btn onClick={save}>Sauvegarder</Btn>
        </div>
      </div>
    </Modal>
  );
}

function PipelinePage({ user, toast, debriefs, navigate }) {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openLead, setOpenLead] = useState(null);
  const [filter, setFilter] = useState('all');
  const [showSettings, setShowSettings] = useState(false);
  const [pipelineConfig, setPipelineConfig] = useState(DEFAULT_PIPELINE_CONFIG);
  const mob = useIsMobile();

  useEffect(() => {
    let mounted = true;
    apiFetch('/pipeline-config')
      .then(data => {
        if (!mounted) return;
        setPipelineConfig(normalizePipelineConfig(data || DEFAULT_PIPELINE_CONFIG));
      })
      .catch(err => {
        if (!mounted) return;
        setPipelineConfig(DEFAULT_PIPELINE_CONFIG);
        toast(err.message, 'error');
      });
    return () => { mounted = false; };
  }, [user?.id, toast]);

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
  const noDateCount = deals.filter(deal => !(deal.contact_date || deal.follow_up_date)).length;
  const closed = deals.filter(deal => closedKeys.includes(deal.status));
  const winRate = closed.length > 0 ? Math.round((deals.filter(deal => wonKeys.includes(deal.status)).length / closed.length) * 100) : 0;

  const savePipelineSettings = (nextConfig) => {
    apiFetch('/pipeline-config', { method:'PUT', body: nextConfig })
      .then(saved => {
        setPipelineConfig(normalizePipelineConfig(saved || nextConfig));
        setShowSettings(false);
        toast('Pipeline personnalisé');
      })
      .catch(err => toast(err.message, 'error'));
  };

  const openNewDebriefFromLead = (leadContext) => {
    navigate?.('NewDebrief', null, 'Pipeline', { leadContext });
  };

  if (loading) return <Spinner full />;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <Card style={{ padding:16, border:'1px solid var(--border)', background:'linear-gradient(135deg, rgba(253,232,228,.55), rgba(218,237,245,.55))' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12, flexWrap:'wrap' }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:700, color:'var(--txt,#5a4a3a)', margin:0 }}>🎯 Pipeline</h1>
            <p style={{ color:DS.textMuted, fontSize:13, margin:'4px 0 0' }}>
              {deals.length} contact{deals.length !== 1 ? 's' : ''} · fiche contact unifiée
            </p>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            {isHOS && <Btn variant="secondary" onClick={()=>setShowSettings(true)}>⚙️ Paramètres</Btn>}
            <Btn onClick={()=>setOpenLead({})}>+ Nouveau lead</Btn>
          </div>
        </div>
        <div style={{ marginTop:10, display:'flex', flexWrap:'wrap', gap:8 }}>
          {['Nom', 'Prénom', 'Email', 'Téléphone', 'Source', 'Deal closé/non', 'Valeur', 'Date', 'Note'].map(item => (
            <span key={item} style={{ padding:'4px 9px', borderRadius:999, background:'var(--card,#fff)', border:'1px solid var(--border)', fontSize:11, color:DS.textMuted }}>{item}</span>
          ))}
        </div>
      </Card>

      <div style={{ display:'grid', gridTemplateColumns:mob ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap:10 }}>
        {[
          { label:'CA signé', value:`${totalValue.toLocaleString('fr-FR')} €`, icon:'💶', color:'#059669' },
          { label:'Pipeline actif', value:`${totalPipe.toLocaleString('fr-FR')} €`, icon:'🧭', color:'#e87d6a' },
          { label:'Taux win', value:`${winRate}%`, icon:'🏆', color:'#d97706' },
          { label:'Sans date', value:noDateCount, icon:'🗓️', color:noDateCount > 0 ? '#d97706' : '#64748b' },
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
          debriefs={debriefs || []}
          onClose={()=>setOpenLead(null)}
          onSave={handleSave}
          onDelete={handleDelete}
          onCreateDebrief={openNewDebriefFromLead}
          toast={toast}
        />
      )}

      {showSettings && isHOS && (
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
