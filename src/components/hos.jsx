import React, { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from '../api.js';
import { P, P2, A, TXT, TXT2, TXT3, SAND, WHITE, SH_CARD, SH_SM, SH_BTN, SH_IN, SH_HOVERED, R_SM, R_MD, R_LG, R_XL, R_FULL, card, cardSm, inp, BTN, DS, DEFAULT_DEBRIEF_CONFIG, PIPELINE_STAGES, SECTIONS } from '../constants.js';
import { fmtDate, fmtShort, computeScore, computeSectionScores, computeLevel, avgSectionScores } from '../utils.js';
import { useIsMobile, useToast, useDebriefConfig } from '../hooks.js';

import { Input, Btn, AlertBox, Modal, Card, Spinner, Empty } from './ui.jsx';
import { ScoreGauge, Radar } from './shared.jsx';

export function MemberRow({ member, teams, currentTeamId, onRemove, onMove, selected, onSelect, onObjectives }) {
  const [movingTo, setMovingTo] = useState('');
  const mob = useIsMobile();
  const otherTeams = teams.filter(t => t.id !== currentTeamId);
  return (
    <>
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', cursor:'pointer', background:selected?'rgba(255,248,245,.8)':'white', transition:'background .1s' }} onClick={onSelect}>
        <div style={{ width:36, height:36, borderRadius:'50%', background:'rgba(255,245,242,.85)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:14, color:'#e87d6a', flexShrink:0 }}>{member.name.charAt(0)}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ fontWeight:600, fontSize:14, color:'#5a4a3a', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{member.name}</p>
          <p style={{ fontSize:12, color:'#c8b8a8', margin:0 }}>{member.level.icon} {member.level.name} · {member.totalDebriefs} debriefs · {member.avgScore}%</p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
          {!mob && otherTeams.length > 0 && (
            <select value={movingTo} onChange={e=>setMovingTo(e.target.value)} onClick={e=>e.stopPropagation()}
              style={{ fontSize:12, border:'1px solid rgba(232,125,106,.12)', borderRadius:6, padding:'4px 8px', fontFamily:'inherit', color:'#5a4a3a', background:'#ffffff', cursor:'pointer' }}>
              <option value="">Déplacer...</option>
              {otherTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}
          {movingTo && <Btn variant="green" onClick={e=>{e.stopPropagation();onMove(member.id,movingTo);setMovingTo('');}} style={{fontSize:12,padding:'4px 10px'}}>✓</Btn>}
          <Btn variant="danger" onClick={e=>{e.stopPropagation();onRemove(member.id,member.name);}} style={{width:30,height:30,padding:0,borderRadius:8,fontSize:12}}>✕</Btn>
          <span style={{ color:selected?'#e87d6a':'#d1d5db', fontSize:14 }}>{selected?'▲':'▼'}</span>
        </div>
      </div>
      {selected && (
        <div style={{ padding:'14px 16px 18px', background:'rgba(253,232,228,.15)', borderTop:'1px solid rgba(232,125,106,.08)' }}>
          {mob && otherTeams.length > 0 && (
            <div style={{ marginBottom:12, display:'flex', gap:8 }}>
              <select value={movingTo} onChange={e=>setMovingTo(e.target.value)} style={{ flex:1, fontSize:13, border:'1px solid rgba(232,125,106,.12)', borderRadius:8, padding:'8px 10px', fontFamily:'inherit', color:'#5a4a3a', background:'#ffffff' }}>
                <option value="">Déplacer vers une autre équipe...</option>
                {otherTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              {movingTo && <Btn variant="green" onClick={()=>{onMove(member.id,movingTo);setMovingTo('');}} style={{fontSize:13,padding:'8px 14px'}}>✓</Btn>}
            </div>
          )}
          {member.chartData.length > 0
            ? <><p style={{fontSize:13,fontWeight:600,color:'#5a4a3a',marginBottom:10}}>📈 Évolution</p><Chart debriefs={member.chartData.map((d,i)=>({...d,id:i,percentage:d.score,prospect_name:d.prospect,call_date:d.date}))}/></>
            : <p style={{color:'#c8b8a8',fontSize:13,textAlign:'center',padding:'16px 0'}}>Aucun debrief enregistré</p>
          }
          {member.badges.length > 0 && <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:10}}>{member.badges.map(b=><span key={b.id} style={{background:'rgba(255,245,242,.85)',color:'#5a4a3a',padding:'3px 10px',borderRadius:20,fontSize:12}}>{b.icon} {b.label}</span>)}</div>}
        </div>
      )}
    </>
  );
}

// ─── TEAM CARD (composant dédié — pas de hook dans les maps) ─────────────────

export function TeamCard({ team, allDebriefs, onClick }) {
  const [hov, setHov] = useState(false);
  const td = (allDebriefs||[]).filter(d => team.members.some(m => m.id === d.user_id));
  const avg  = td.length > 0 ? Math.round(td.reduce((s,d)=>s+(d.percentage||0),0)/td.length) : 0;
  const cls  = td.filter(d => d.is_closed).length;
  const rate = td.length > 0 ? Math.round((cls/td.length)*100) : 0;
  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} onClick={onClick}
      style={{ background:'#ffffff', border:`2px solid ${hov?'#e87d6a':'rgba(255,255,255,.9)'}`, borderRadius:16, padding:20, cursor:'pointer', transition:'all .2s', boxShadow:hov?'0 12px 40px rgba(232,125,106,.2), 0 2px 10px rgba(232,125,106,.1)':'0 6px 24px rgba(100,80,200,.1), 0 2px 8px rgba(100,80,200,.06)', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:4, background:'linear-gradient(90deg,#e87d6a,#6aacce)' }}/>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:16, marginTop:4 }}>
        <div>
          <h3 style={{ fontSize:17, fontWeight:700, color:'#5a4a3a', margin:'0 0 4px' }}>{team.name}</h3>
          <p style={{ fontSize:12, color:'#c8b8a8', margin:0 }}>{team.members.length} membre{team.members.length!==1?'s':''} · {td.length} debrief{td.length!==1?'s':''}</p>
        </div>
        <span style={{ fontSize:20, color:hov?'#e87d6a':'#d1d5db', transition:'color .2s' }}>→</span>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
        {[{ l:'Score moy.', v:`${avg}%`,  c:avg>=80?'#059669':avg>=60?'#d97706':'#e87d6a' },
          { l:'Closings',   v:cls,         c:'#059669' },
          { l:'Taux',       v:`${rate}%`,  c:rate>=40?'#059669':'#d97706' },
        ].map(({ l, v, c }) => (
          <div key={l} style={{ background:'rgba(253,232,228,.2)', borderRadius:8, padding:'8px 10px', textAlign:'center' }}>
            <p style={{ fontSize:10, color:'#c8b8a8', margin:'0 0 2px', textTransform:'uppercase', letterSpacing:'.04em' }}>{l}</p>
            <p style={{ fontWeight:700, fontSize:15, color:c, margin:0 }}>{v}</p>
          </div>
        ))}
      </div>
      {team.members.length > 0 && (
        <div style={{ display:'flex', marginTop:12 }}>
          {team.members.slice(0,5).map((m,i) => (
            <div key={m.id} style={{ width:28, height:28, borderRadius:'50%', background:`hsl(${(i*67)%360},60%,70%)`, border:'2px solid white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'white', marginLeft:i>0?-8:0, zIndex:10-i }}>{m.name.charAt(0)}</div>
          ))}
          {team.members.length > 5 && (
            <div style={{ width:28, height:28, borderRadius:'50%', background:'#e2e8f0', border:'2px solid white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:600, color:'#6b7280', marginLeft:-8 }}>+{team.members.length-5}</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── HOS PAGE ─────────────────────────────────────────────────────────────────

export function ProgBar({ label, current, target, color='#e87d6a' }) {
  if (!target) return null;
  const pct = Math.min(Math.round((current / target) * 100), 100);
  const done = current >= target;
  return (
    <div style={{ flex:1, minWidth:120 }}>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, fontWeight:600, marginBottom:4 }}>
        <span style={{ color:'#5a4a3a' }}>{label}</span>
        <span style={{ color:done?'#059669':color }}>{current}/{target}{done?' ✓':''}</span>
      </div>
      <div style={{ height:6, background:'#e2e8f0', borderRadius:3, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${pct}%`, background:done?'#059669':color, borderRadius:3, transition:'width .7s' }}/>
      </div>
    </div>
  );
}

// ─── OBJECTIF BANNER (closer dashboard) ──────────────────────────────────────

export function ObjectiveBanner({ userId }) {
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
    return (
      <div style={{ flex:1 }}>
        <p style={{ fontSize:11, fontWeight:600, color:'#6b7280', textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 10px' }}>{label}</p>
        <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
          {obj.target_debriefs > 0 && <ProgBar label="Debriefs" current={p.debriefs||0} target={obj.target_debriefs} color='#e87d6a'/>}
          {obj.target_score    > 0 && <ProgBar label="Score moy." current={p.score||0} target={obj.target_score} color='#d97706'/>}
          {obj.target_closings > 0 && <ProgBar label="Closings" current={p.closings||0} target={obj.target_closings} color='#059669'/>}
          {obj.target_revenue  > 0 && <ProgBar label="CA (€)" current={p.revenue||0} target={obj.target_revenue} color='#8b5cf6'/>}
        </div>
      </div>
    );
  };

  return (
    <div style={{ background:'#ffffff', border:'1px solid rgba(232,125,106,.12)', borderRadius:12, padding:'16px 20px', borderLeft:'4px solid #e87d6a' }}>
      <p style={{ fontSize:13, fontWeight:700, color:'#5a4a3a', margin:'0 0 14px' }}>🎯 Mes objectifs</p>
      <div style={{ display:'flex', gap:24, flexWrap:'wrap' }}>
        {render(monthly, 'Ce mois-ci')}
        {monthly && weekly && <div style={{ width:1, background:'#e2e8f0', alignSelf:'stretch' }}/>}
        {render(weekly, 'Cette semaine')}
      </div>
    </div>
  );
}

// ─── OBJECTIVE MODAL (HOS → closer) ──────────────────────────────────────────

export function ObjectiveModal({ closer, onClose, toast }) {
  const [tab, setTab] = useState('monthly');
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const day = now.getDay() || 7;
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - day + 1);
  const weekStartStr = weekStart.toISOString().split('T')[0];

  const [form, setForm] = useState({ target_debriefs:'', target_score:'', target_closings:'', target_revenue:'' });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await apiFetch('/objectives', { method:'POST', body: {
        closer_id: closer.id,
        period_type: tab,
        period_start: tab === 'monthly' ? monthStart : weekStartStr,
        target_debriefs: Number(form.target_debriefs) || 0,
        target_score:    Number(form.target_score) || 0,
        target_closings: Number(form.target_closings) || 0,
        target_revenue:  Number(form.target_revenue) || 0,
      }});
      toast(`Objectifs de ${closer.name} mis à jour !`);
      onClose();
    } catch(e) { toast(e.message, 'error'); } finally { setSaving(false); }
  };

  return (
    <Modal title={`🎯 Objectifs — ${closer.name}`} onClose={onClose}>
      <div style={{ display:'flex', gap:4, background:'rgba(232,125,106,.06)', padding:4, borderRadius:R_SM, marginBottom:20 }}>
        {[{key:'monthly',label:'📅 Ce mois'},{key:'weekly',label:'📆 Cette semaine'}].map(({key,label}) => (
          <button key={key} onClick={()=>setTab(key)} style={{ flex:1, padding:'7px 12px', borderRadius:6, border:'none', fontSize:13, fontWeight:500, cursor:'pointer', background:tab===key?'white':'transparent', color:tab===key?'#1e293b':'#64748b', fontFamily:'inherit', boxShadow:tab===key?'0 1px 3px rgba(0,0,0,.08)':'none' }}>{label}</button>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
        {[
          { key:'target_debriefs', label:'📋 Debriefs', ph:'Ex: 20' },
          { key:'target_score',    label:'🎯 Score moyen (%)', ph:'Ex: 70' },
          { key:'target_closings', label:'✅ Closings', ph:'Ex: 5' },
          { key:'target_revenue',  label:'💶 CA (€)', ph:'Ex: 15000' },
        ].map(({ key, label, ph }) => (
          <div key={key}>
            <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#5a4a3a', marginBottom:5 }}>{label}</label>
            <Input type="number" placeholder={ph} value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})}/>
          </div>
        ))}
      </div>
      <p style={{ fontSize:12, color:'#c8b8a8', margin:'0 0 16px' }}>Laissez 0 pour ne pas suivre un indicateur.</p>
      <div style={{ display:'flex', gap:10 }}>
        <Btn onClick={save} disabled={saving} style={{ flex:1 }}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Btn>
        <Btn variant="secondary" onClick={onClose} style={{ flex:1 }}>Annuler</Btn>
      </div>
    </Modal>
  );
}

// ─── ACTION PLANS (closer dashboard + HOS) ───────────────────────────────────

export function ActionPlanCard({ closerId, isHOS, toast }) {
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
      <div style={{ padding:'14px 16px', borderBottom:'1px solid rgba(232,125,106,.08)', background:'rgba(255,245,242,.5)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <h3 style={{ fontSize:14, fontWeight:700, color:'#5a4a3a', margin:0 }}>📌 Plan d'action</h3>
          <p style={{ fontSize:11, color:'#c8b8a8', margin:0 }}>{active.length}/3 axe{active.length!==1?'s':''} actif{active.length!==1?'s':''}</p>
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
            <p style={{ color:'#c8b8a8', fontSize:13, textAlign:'center', padding:'12px 0' }}>
              {isHOS ? 'Aucun axe actif. Cliquez "+ Ajouter" pour en définir un.' : "Aucun axe de travail défini pour l'instant."}
            </p>
          )}

          {active.map(plan => (
            <div key={plan.id} style={{ display:'flex', gap:12, padding:'12px 14px', background:'rgba(253,232,228,.15)', borderRadius:R_SM, border:'1px solid rgba(232,125,106,.1)', alignItems:'flex-start' }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:'#e87d6a', marginTop:5, flexShrink:0 }}/>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontWeight:600, fontSize:13, color:'#5a4a3a', margin:'0 0 2px' }}>{plan.axis}</p>
                {plan.description && <p style={{ fontSize:12, color:'#6b7280', margin:0 }}>{plan.description}</p>}
                <p style={{ fontSize:11, color:'#c8b8a8', margin:'4px 0 0' }}>
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
            <div style={{ padding:'14px', background:WHITE, borderRadius:10, border:'1px solid rgba(196,181,253,.5)', display:'flex', flexDirection:'column', gap:10 }}>
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
              <p style={{ fontSize:11, color:'#c8b8a8', fontWeight:600, textTransform:'uppercase', letterSpacing:'.04em', marginBottom:8 }}>Récemment résolus</p>
              {resolved.map(plan => (
                <div key={plan.id} style={{ display:'flex', gap:10, padding:'8px 10px', borderRadius:8, alignItems:'center', opacity:.65 }}>
                  <span style={{ color:'#059669', fontSize:12 }}>✓</span>
                  <span style={{ fontSize:12, color:'#6b7280', textDecoration:'line-through', flex:1 }}>{plan.axis}</span>
                  <span style={{ fontSize:11, color:'#c8b8a8' }}>{fmtDate(plan.resolved_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ─── COMMENTS SECTION (debrief detail) ───────────────────────────────────────

export function CommentsSection({ debriefId, user, toast }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [text, setText]         = useState('');
  const [sending, setSending]   = useState(false);

  useEffect(() => {
    apiFetch(`/debriefs/${debriefId}/comments`)
      .then(setComments).catch(()=>{}).finally(()=>setLoading(false));
  }, [debriefId]);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      const c = await apiFetch(`/debriefs/${debriefId}/comments`, { method:'POST', body:{ content:text.trim() }});
      setComments(prev => [...prev, c]);
      setText('');
    } catch(e) { toast(e.message, 'error'); } finally { setSending(false); }
  };

  const del = async (id) => {
    try {
      await apiFetch(`/comments/${id}`, { method:'DELETE' });
      setComments(prev => prev.filter(c => c.id!==id));
    } catch(e) { toast(e.message, 'error'); }
  };

  return (
    <Card style={{ overflow:'hidden' }}>
      <div style={{ padding:'14px 16px', borderBottom:'1px solid rgba(232,125,106,.08)', background:'rgba(255,245,242,.5)' }}>
        <h3 style={{ fontSize:14, fontWeight:700, color:'#5a4a3a', margin:0 }}>
          💬 Commentaires
          {comments.length > 0 && <span style={{ marginLeft:8, background:'rgba(255,245,242,.85)', color:'#5a4a3a', fontSize:11, fontWeight:600, padding:'2px 7px', borderRadius:10 }}>{comments.length}</span>}
        </h3>
      </div>
      <div style={{ padding:16, display:'flex', flexDirection:'column', gap:12 }}>
        {loading ? <Spinner size={24}/> : comments.length === 0 ? (
          <p style={{ color:'#c8b8a8', fontSize:13, textAlign:'center', padding:'8px 0' }}>Aucun commentaire</p>
        ) : comments.map(c => (
          <div key={c.id} style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
            <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,#e87d6a,#d4604e)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:12, color:'white', flexShrink:0 }}>{c.author_name?.charAt(0)}</div>
            <div style={{ flex:1, background:'rgba(253,232,228,.2)', borderRadius:'0 10px 10px 10px', padding:'10px 14px', border:'1px solid rgba(232,125,106,.12)' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ fontWeight:600, fontSize:12, color:'#5a4a3a' }}>{c.author_name}</span>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:11, color:'#c8b8a8' }}>{fmtDate(c.created_at)}</span>
                  {(c.author_id === user.id || user.role === 'head_of_sales') && (
                    <button onClick={()=>del(c.id)} style={{ background:'none', border:'none', color:'#dc2626', cursor:'pointer', fontSize:12, padding:0 }}>✕</button>
                  )}
                </div>
              </div>
              <p style={{ fontSize:13, color:'#5a4a3a', margin:0, whiteSpace:'pre-wrap', lineHeight:1.5 }}>{c.content}</p>
            </div>
          </div>
        ))}

        {/* Input */}
        <div style={{ display:'flex', gap:10, alignItems:'flex-end', marginTop:4 }}>
          <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,#e87d6a,#d4604e)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:12, color:'white', flexShrink:0 }}>{user.name?.charAt(0)}</div>
          <div style={{ flex:1 }}>
            <Textarea placeholder="Ajouter un commentaire..." rows={2} value={text} onChange={e=>setText(e.target.value)}/>
          </div>
          <Btn onClick={send} disabled={sending||!text.trim()} style={{ padding:'10px 16px', fontSize:13, alignSelf:'flex-end' }}>{sending?'...':'Envoyer'}</Btn>
        </div>
      </div>
    </Card>
  );
}

// ─── PIPELINE PAGE ────────────────────────────────────────────────────────────


