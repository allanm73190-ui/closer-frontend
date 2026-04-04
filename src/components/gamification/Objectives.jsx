import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../../config/api';
import { DS, P, P2, TXT, TXT3, R_SM, R_MD, R_FULL, SH_SM, card, cardSm, inp } from '../../styles/designSystem';
import { useIsMobile } from '../../hooks';
import { fmtDate } from '../../utils/scoring';
import { Btn, Input, Textarea, Card, Modal, Spinner, ProgBar } from '../ui';

function ObjectiveBanner({ userId }) {
  const [objectives, setObjectives] = useState([]);
  useEffect(() => {
    apiFetch('/objectives/me').then(setObjectives).catch(() => {});
  }, [userId]);

  const monthly = objectives.find(o => o.period_type === 'monthly');
  const weekly  = objectives.find(o => o.period_type === 'weekly');
  if (!monthly && !weekly) return null;

  const render = (obj, label) => {
    if (!obj) return null;
    const p = obj.progress || {};
    const targetReecoutes = Number(obj.target_reecoutes ?? obj.target_debriefs ?? 0);
    const targetPerformance = Number(obj.target_performance ?? obj.target_score ?? 0);
    return (
      <div style={{ flex:1 }}>
        <p style={{ fontSize:11, fontWeight:600, color:'var(--txt3)', textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 10px' }}>{label}</p>
        <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
          {targetReecoutes > 0 && <ProgBar label="Réécoutes" current={p.reecoutes ?? p.debriefs ?? 0} target={targetReecoutes} color='#FF7E5F'/>}
          {targetPerformance > 0 && <ProgBar label="Performance (%)" current={p.performance ?? p.score ?? 0} target={targetPerformance} color='#d97706'/>}
          {obj.target_closings > 0 && <ProgBar label="Closings" current={p.closings||0} target={obj.target_closings} color='#059669'/>}
          {obj.target_revenue  > 0 && <ProgBar label="CA (€)" current={p.revenue||0} target={obj.target_revenue} color='#8b5cf6'/>}
        </div>
      </div>
    );
  };

  return (
    <div style={{ background:'#ffffff', border:'1px solid rgba(255,126,95,.12)', borderRadius:12, padding:'16px 20px', borderLeft:'4px solid #FF7E5F' }}>
      <p style={{ fontSize:13, fontWeight:700, color:'#4A3428', margin:'0 0 14px' }}>🎯 Mes objectifs</p>
      <div style={{ display:'flex', gap:24, flexWrap:'wrap' }}>
        {render(monthly, 'Ce mois-ci')}
        {monthly && weekly && <div style={{ width:1, background:'#e2e8f0', alignSelf:'stretch' }}/>}
        {render(weekly, 'Cette semaine')}
      </div>
    </div>
  );
}

// ─── OBJECTIVE MODAL (HOS → closer) ──────────────────────────────────────────
function ObjectiveModal({ closer, onClose, toast }) {
  const [tab, setTab] = useState('monthly');
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const day = now.getDay() || 7;
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - day + 1);
  const weekStartStr = weekStart.toISOString().split('T')[0];

  const [objectives, setObjectives] = useState([]);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [form, setForm] = useState({ target_reecoutes:'', target_score:'', target_closings:'', target_revenue:'' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoadingExisting(true);
    apiFetch(`/objectives/closer/${closer.id}`)
      .then(data => { if (mounted) setObjectives(Array.isArray(data) ? data : []); })
      .catch(() => { if (mounted) setObjectives([]); })
      .finally(() => { if (mounted) setLoadingExisting(false); });
    return () => { mounted = false; };
  }, [closer.id]);

  useEffect(() => {
    const targetStart = tab === 'monthly' ? monthStart : weekStartStr;
    const existing = objectives.find(obj => obj.period_type === tab && obj.period_start === targetStart)
      || objectives.find(obj => obj.period_type === tab);

    setForm({
      target_reecoutes: String(Number(existing?.target_reecoutes ?? existing?.target_debriefs ?? 0) || ''),
      target_score: String(Number(existing?.target_score ?? existing?.target_performance ?? 0) || ''),
      target_closings: String(Number(existing?.target_closings ?? 0) || ''),
      target_revenue: String(Number(existing?.target_revenue ?? 0) || ''),
    });
  }, [tab, objectives, monthStart, weekStartStr]);

  const save = async () => {
    setSaving(true);
    try {
      await apiFetch('/objectives', { method:'POST', body: {
        closer_id: closer.id,
        period_type: tab,
        period_start: tab === 'monthly' ? monthStart : weekStartStr,
        target_reecoutes: Number(form.target_reecoutes) || 0,
        target_debriefs: Number(form.target_reecoutes) || 0,
        target_score:    Number(form.target_score) || 0,
        target_performance: Number(form.target_score) || 0,
        target_closings: Number(form.target_closings) || 0,
        target_revenue:  Number(form.target_revenue) || 0,
      }});
      toast(`Objectifs de ${closer.name} mis à jour !`);
      onClose();
    } catch(e) { toast(e.message, 'error'); } finally { setSaving(false); }
  };

  return (
    <Modal title={`🎯 Objectifs — ${closer.name}`} onClose={onClose}>
      <div style={{ display:'flex', gap:4, background:'rgba(255,126,95,.06)', padding:4, borderRadius:DS.radiusSm, marginBottom:20 }}>
        {[{key:'monthly',label:'📅 Ce mois'},{key:'weekly',label:'📆 Cette semaine'}].map(({key,label}) => (
          <button key={key} onClick={()=>setTab(key)} style={{ flex:1, padding:'7px 12px', borderRadius:6, border:'none', fontSize:13, fontWeight:500, cursor:'pointer', background:tab===key?'white':'transparent', color:tab===key?'#1e293b':'#64748b', fontFamily:'inherit', boxShadow:tab===key?'0 1px 3px rgba(0,0,0,.08)':'none' }}>{label}</button>
        ))}
      </div>
      {loadingExisting ? (
        <div style={{ padding:'18px 0', display:'flex', justifyContent:'center' }}>
          <Spinner size={22}/>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
          {[
            { key:'target_reecoutes', label:'🎧 Réécoutes', ph:'Ex: 20' },
            { key:'target_score',    label:'📈 Performance (%)', ph:'Ex: 70' },
            { key:'target_closings', label:'✅ Closings', ph:'Ex: 5' },
            { key:'target_revenue',  label:'💶 CA (€)', ph:'Ex: 15000' },
          ].map(({ key, label, ph }) => (
            <div key={key}>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#4A3428', marginBottom:5 }}>{label}</label>
              <Input type="number" placeholder={ph} value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})}/>
            </div>
          ))}
        </div>
      )}
      <p style={{ fontSize:12, color:DS.textMuted, margin:'0 0 16px' }}>Laissez 0 pour ne pas suivre un indicateur.</p>
      <div style={{ display:'flex', gap:10 }}>
        <Btn onClick={save} disabled={saving} style={{ flex:1 }}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Btn>
        <Btn variant="secondary" onClick={onClose} style={{ flex:1 }}>Annuler</Btn>
      </div>
    </Modal>
  );
}


function ActionPlanCard({ closerId, isHOS, toast }) {
  const [plans, setPlans]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm]     = useState({ axis:'', description:'' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    const path = isHOS ? `/action-plans/closer/${closerId}` : '/action-plans/me';
    apiFetch(path).then(setPlans).catch(()=>[]).finally(()=>setLoading(false));
  }, [closerId, isHOS]);
  useEffect(load, [load]);

  const add = async () => {
    if (!form.axis.trim()) return;
    setSaving(true);
    try {
      const p = await apiFetch('/action-plans', { method:'POST', body:{ closer_id:closerId, axis:form.axis.trim(), description:form.description.trim() }});
      setPlans(prev => [p, ...prev]);
      setForm({ axis:'', description:'' });
      setShowAdd(false);
      toast("Plan d'action ajouté !");
    } catch(e) { toast(e.message, 'error'); } finally { setSaving(false); }
  };

  const resolve = async (id) => {
    try {
      const updated = await apiFetch(`/action-plans/${id}`, { method:'PATCH', body:{ status:'resolved' }});
      setPlans(prev => prev.map(p => p.id===id ? updated : p));
      toast('Axe marqué comme résolu ✓');
    } catch(e) { toast(e.message, 'error'); }
  };

  const remove = async (id) => {
    try {
      await apiFetch(`/action-plans/${id}`, { method:'DELETE' });
      setPlans(prev => prev.filter(p => p.id!==id));
      toast('Plan supprimé');
    } catch(e) { toast(e.message, 'error'); }
  };

  const active   = plans.filter(p => p.status==='active');
  const resolved = plans.filter(p => p.status==='resolved').slice(0,3);

  return (
    <Card style={{ overflow:'hidden' }}>
      <div style={{ padding:'14px 16px', borderBottom:'1px solid rgba(255,126,95,.08)', background:'rgba(255,245,242,.5)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <h3 style={{ fontSize:14, fontWeight:700, color:'#4A3428', margin:0 }}>📌 Plan d'action</h3>
          <p style={{ fontSize:11, color:DS.textMuted, margin:0 }}>{active.length}/3 axe{active.length!==1?'s':''} actif{active.length!==1?'s':''}</p>
        </div>
        {isHOS && active.length < 3 && (
          <Btn onClick={()=>setShowAdd(true)} style={{ fontSize:12, padding:'6px 12px' }}>+ Ajouter</Btn>
        )}
      </div>

      {loading ? (
        <div style={{ padding:20, display:'flex', justifyContent:'center' }}><Spinner size={24}/></div>
      ) : (
        <div style={{ padding:16, display:'flex', flexDirection:'column', gap:10 }}>
          {active.length === 0 && !showAdd && (
            <p style={{ color:DS.textMuted, fontSize:13, textAlign:'center', padding:'12px 0' }}>
              {isHOS ? 'Aucun axe actif. Cliquez "+ Ajouter" pour en définir un.' : "Aucun axe de travail défini pour l'instant."}
            </p>
          )}

          {active.map(plan => (
            <div key={plan.id} style={{ display:'flex', gap:12, padding:'12px 14px', background:'rgba(255,126,95,.06,.15)', borderRadius:DS.radiusSm, border:'1px solid rgba(255,126,95,.1)', alignItems:'flex-start' }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:'#FF7E5F', marginTop:5, flexShrink:0 }}/>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontWeight:600, fontSize:13, color:'#4A3428', margin:'0 0 2px' }}>{plan.axis}</p>
                {plan.description && <p style={{ fontSize:12, color:'var(--txt3)', margin:0 }}>{plan.description}</p>}
                <p style={{ fontSize:11, color:DS.textMuted, margin:'4px 0 0' }}>
                  Ajouté le {fmtDate(plan.created_at)}
                </p>
              </div>
              <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                <button onClick={()=>resolve(plan.id)} title="Marquer comme résolu" style={{ background:'#d1fae5', border:'1px solid #6ee7b7', color:'#065f46', borderRadius:7, padding:'4px 8px', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>✓ Résolu</button>
                {isHOS && <button onClick={()=>remove(plan.id)} style={{ background:'none', border:'none', color:'#dc2626', cursor:'pointer', fontSize:14, padding:'2px 4px' }}>✕</button>}
              </div>
            </div>
          ))}

          {showAdd && (
            <div style={{ padding:'14px', background:DS.bgCard, borderRadius:10, border:'1px solid rgba(196,181,253,.5)', display:'flex', flexDirection:'column', gap:10 }}>
              <Input placeholder="Axe de travail (ex: Améliorer le closing)" value={form.axis} onChange={e=>setForm({...form,axis:e.target.value})} autoFocus/>
              <Textarea placeholder="Description (optionnel)" rows={2} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/>
              <div style={{ display:'flex', gap:8 }}>
                <Btn onClick={add} disabled={saving||!form.axis.trim()} style={{ flex:1, fontSize:13, padding:'8px 14px' }}>{saving?'...':'Ajouter'}</Btn>
                <Btn variant="secondary" onClick={()=>{setShowAdd(false);setForm({axis:'',description:''}); }} style={{ fontSize:13, padding:'8px 14px' }}>Annuler</Btn>
              </div>
            </div>
          )}

          {resolved.length > 0 && (
            <div style={{ marginTop:4 }}>
              <p style={{ fontSize:11, color:DS.textMuted, fontWeight:600, textTransform:'uppercase', letterSpacing:'.04em', marginBottom:8 }}>Récemment résolus</p>
              {resolved.map(plan => (
                <div key={plan.id} style={{ display:'flex', gap:10, padding:'8px 10px', borderRadius:8, alignItems:'center', opacity:.65 }}>
                  <span style={{ color:'#059669', fontSize:12 }}>✓</span>
                  <span style={{ fontSize:12, color:'var(--txt3)', textDecoration:'line-through', flex:1 }}>{plan.axis}</span>
                  <span style={{ fontSize:11, color:DS.textMuted }}>{fmtDate(plan.resolved_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}


export { ObjectiveBanner, ObjectiveModal, ActionPlanCard };
