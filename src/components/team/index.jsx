import React, { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from '../../config/api';
import { DS, P, P2, TXT, TXT2, TXT3, R_SM, R_MD, R_LG, R_FULL, SH_SM, SH_BTN, SH_CARD, card, cardSm, inp } from '../../styles/designSystem';
import { useIsMobile, useBreakpoint } from '../../hooks';
import { computeLevel, computeSectionScores, avgSectionScores, fmtDate, copy } from '../../utils/scoring';
import { SECTIONS } from '../../config/ai';
import { Btn, Input, Textarea, Card, Modal, Spinner, Empty, AlertBox, ScoreGauge, ScoreBadge, ClosedBadge } from '../ui';
import { Radar, SectionBars } from '../ui/Charts';
import { DebriefCard } from '../debrief/DebriefCard';
import { GamCard, Leaderboard } from '../gamification';
import { ObjectiveModal, ActionPlanCard } from '../gamification/Objectives';
import { Chart } from '../dashboard/StatsChart';

function MemberRow({ member, teams, currentTeamId, onRemove, onMove, selected, onSelect, onObjectives }) {
  const [movingTo, setMovingTo] = useState('');
  const mob = useIsMobile();
  const otherTeams = teams.filter(t => t.id !== currentTeamId);
  return (
    <>
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', cursor:'pointer', background:selected?'rgba(255,248,245,.8)':'white', transition:'background .1s' }} onClick={onSelect}>
        <div style={{ width:36, height:36, borderRadius:'50%', background:'rgba(255,245,242,.85)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:14, color:'#e87d6a', flexShrink:0 }}>{member.name.charAt(0)}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ fontWeight:600, fontSize:14, color:'#5a4a3a', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{member.name}</p>
          <p style={{ fontSize:12, color:DS.textMuted, margin:0 }}>{member.level.icon} {member.level.name} · {member.totalDebriefs} debriefs · {member.avgScore}%</p>
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
            : <p style={{color:DS.textMuted,fontSize:13,textAlign:'center',padding:'16px 0'}}>Aucun debrief enregistré</p>
          }
          {member.badges.length > 0 && <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:10}}>{member.badges.map(b=><span key={b.id} style={{background:'rgba(255,245,242,.85)',color:'#5a4a3a',padding:'3px 10px',borderRadius:20,fontSize:12}}>{b.icon} {b.label}</span>)}</div>}
        </div>
      )}
    </>
  );
}

// ─── TEAM CARD (composant dédié — pas de hook dans les maps) ─────────────────
function TeamCard({ team, allDebriefs, onClick }) {
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
          <p style={{ fontSize:12, color:DS.textMuted, margin:0 }}>{team.members.length} membre{team.members.length!==1?'s':''} · {td.length} debrief{td.length!==1?'s':''}</p>
        </div>
        <span style={{ fontSize:20, color:hov?'#e87d6a':'#d1d5db', transition:'color .2s' }}>→</span>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
        {[{ l:'Score moy.', v:`${avg}%`,  c:avg>=80?'#059669':avg>=60?'#d97706':'#e87d6a' },
          { l:'Closings',   v:cls,         c:'#059669' },
          { l:'Taux',       v:`${rate}%`,  c:rate>=40?'#059669':'#d97706' },
        ].map(({ l, v, c }) => (
          <div key={l} style={{ background:'rgba(253,232,228,.2)', borderRadius:8, padding:'8px 10px', textAlign:'center' }}>
            <p style={{ fontSize:10, color:DS.textMuted, margin:'0 0 2px', textTransform:'uppercase', letterSpacing:'.04em' }}>{l}</p>
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
function HOSPage({ toast, leaderboardKey, allDebriefs }) {
  const [tab,  setTab]  = useState('dashboard');
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTeamId, setActiveTeamId] = useState(null);  // null = liste, string = détail
  const [selMember, setSelMember] = useState(null);
  const [scope, setScope] = useState('all');
  const [generating, setGenerating] = useState(null);
  const [copied, setCopied] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingTeam, setEditingTeam] = useState(null);
  const [creating, setCreating] = useState(false);
  const [objectiveTarget, setObjectiveTarget] = useState(null);
  const mob = useIsMobile();

  const load = useCallback(() => {
    setLoading(true);
    apiFetch('/teams').then(d=>setTeams((d||[]).map(t=>({...t,inviteCodes:Array.isArray(t.inviteCodes)?t.inviteCodes:[],members:Array.isArray(t.members)?t.members:[]})))).catch(()=>setTeams([])).finally(()=>setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  // Reset activeTeamId if tab changes
  useEffect(() => { if (tab !== 'equipes') setActiveTeamId(null); }, [tab]);

  const createTeam = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try { const t = await apiFetch('/teams',{method:'POST',body:{name:newName.trim()}}); setTeams(p=>[...p,t]); setNewName(''); setShowCreate(false); toast(`Équipe "${t.name}" créée !`); }
    catch(e) { toast(e.message,'error'); } finally { setCreating(false); }
  };
  const renameTeam = async () => {
    if (!editingTeam?.name.trim()) return;
    try { await apiFetch(`/teams/${editingTeam.id}`,{method:'PATCH',body:{name:editingTeam.name.trim()}}); setTeams(p=>p.map(t=>t.id===editingTeam.id?{...t,name:editingTeam.name.trim()}:t)); setEditingTeam(null); toast('Équipe renommée'); }
    catch(e) { toast(e.message,'error'); }
  };
  const deleteTeam = async (id, name) => {
    if (!confirm(`Supprimer l'équipe "${name}" ? Les membres seront libérés.`)) return;
    try { await apiFetch(`/teams/${id}`,{method:'DELETE'}); setTeams(p=>p.filter(t=>t.id!==id)); setActiveTeamId(null); toast('Équipe supprimée'); }
    catch(e) { toast(e.message,'error'); }
  };
  const genCode = async (teamId) => {
    setGenerating(teamId);
    try { const inv = await apiFetch(`/teams/${teamId}/invite`,{method:'POST'}); setTeams(p=>p.map(t=>t.id===teamId?{...t,inviteCodes:[inv,...(t.inviteCodes||[])]}:t)); toast('Code généré !'); }
    catch(e) { toast(e.message,'error'); } finally { setGenerating(null); }
  };
  const delCode = async (teamId, codeId) => {
    try { await apiFetch(`/teams/${teamId}/invite/${codeId}`,{method:'DELETE'}); setTeams(p=>p.map(t=>t.id===teamId?{...t,inviteCodes:(t.inviteCodes||[]).filter(c=>c.id!==codeId)}:t)); toast('Code supprimé'); }
    catch(e) { toast(e.message,'error'); }
  };
  const removeMember = async (teamId, memberId, name) => {
    if (!confirm(`Retirer ${name} ?`)) return;
    try { await apiFetch(`/teams/${teamId}/members/${memberId}`,{method:'DELETE'}); setTeams(p=>p.map(t=>t.id===teamId?{...t,members:t.members.filter(m=>m.id!==memberId)}:t)); setSelMember(null); toast(`${name} retiré`); }
    catch(e) { toast(e.message,'error'); }
  };
  const moveMember = async (memberId, toTeamId) => {
    const fromTeam = teams.find(t => t.members.some(m => m.id===memberId));
    if (!fromTeam) return;
    const member = fromTeam.members.find(m => m.id===memberId);
    try { await apiFetch(`/teams/${toTeamId}/members/${memberId}`,{method:'PATCH'}); setTeams(p=>p.map(t=>{ if(t.id===fromTeam.id)return{...t,members:t.members.filter(m=>m.id!==memberId)}; if(t.id===toTeamId)return{...t,members:[...t.members,{...member,team_id:toTeamId}]}; return t;})); const tt=teams.find(t=>t.id===toTeamId); toast(`${member.name} déplacé vers "${tt?.name}"`); setSelMember(null); }
    catch(e) { toast(e.message,'error'); }
  };
  const doCopy = code => { copy(code); setCopied(code); toast('Code copié !'); setTimeout(()=>setCopied(null),2000); };

  if (loading) return <Spinner full/>;

  const allMembers = teams.flatMap(t => t.members);

  // Debriefs filtrés selon scope
  const scopedDebriefs = (() => {
    if (!allDebriefs?.length) return [];
    if (scope === 'all') return allDebriefs;
    if (scope.startsWith('team:')) {
      const t = teams.find(t => t.id===scope.split(':')[1]);
      const ids = (t?.members||[]).map(m => m.id);
      return allDebriefs.filter(d => ids.includes(d.user_id));
    }
    if (scope.startsWith('closer:')) return allDebriefs.filter(d => d.user_id===scope.split(':')[1]);
    return allDebriefs;
  })();

  const scopeLabel = scope==='all' ? "Toute l'équipe"
    : scope.startsWith('team:')   ? teams.find(t=>t.id===scope.split(':')[1])?.name || 'Équipe'
    : allMembers.find(m=>m.id===scope.split(':')[1])?.name || 'Closer';

  const fTotal  = scopedDebriefs.length;
  const fAvg    = fTotal>0 ? Math.round(scopedDebriefs.reduce((s,d)=>s+(d.percentage||0),0)/fTotal) : 0;
  const fCls    = scopedDebriefs.filter(d=>d.is_closed).length;
  const fRate   = fTotal>0 ? Math.round((fCls/fTotal)*100) : 0;

  const globalSS = avgSectionScores(allDebriefs||[]);
  const scopedSS = avgSectionScores(scopedDebriefs);

  const SLABELS = { decouverte:'Découverte', reformulation:'Reformulation', projection:'Projection', presentation_offre:"Présentation offre", closing:'Closing' };
  const weakest  = scopedSS ? SECTIONS.reduce((w,s)=>(scopedSS[s.key]||0)<(scopedSS[w.key]||0)?s:w, SECTIONS[0]) : null;
  const strongest= scopedSS ? SECTIONS.reduce((w,s)=>(scopedSS[s.key]||0)>(scopedSS[w.key]||0)?s:w, SECTIONS[0]) : null;

  const bc = color => color==='#e87d6a'?'rgba(232,125,106,.15)':color==='#059669'?'rgba(5,150,105,.15)':'rgba(217,119,6,.15)';

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

      {/* ─── HEADER ─── */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700, color:'#5a4a3a', margin:0 }}>👑 Head of Sales</h1>
          <p style={{ color:'#6b7280', fontSize:13, marginTop:4 }}>{teams.length} équipe{teams.length!==1?'s':''} · {allMembers.length} closer{allMembers.length!==1?'s':''}</p>
        </div>
        <div style={{ display:'flex', gap:4, background:'rgba(232,125,106,.06)', padding:4, borderRadius:DS.radiusMd }}>
          {[{key:'dashboard',label:'📊'},{key:'equipes',label:'👥'}].map(({key,label})=>(
            <button key={key} onClick={()=>setTab(key)} style={{ padding:'8px 16px', borderRadius:8, border:'none', fontSize:13, fontWeight:500, cursor:'pointer', transition:'all .2s', background:tab===key?'white':'transparent', color:tab===key?'#1e293b':'#64748b', boxShadow:tab===key?'0 1px 4px rgba(0,0,0,.08)':'none', fontFamily:'inherit' }}>
              {label}{!mob&&<span> {key==='dashboard'?'Dashboard':'Équipes'}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* ─── DASHBOARD ─── */}
      {tab==='dashboard' && (
        allMembers.length===0
          ? <Empty icon="👥" title="Aucun closer" subtitle="Créez des équipes et générez des codes" action={<Btn onClick={()=>setTab('equipes')}>Gérer les équipes</Btn>}/>
          : <>
              {/* Sélecteur scope */}
              <Card style={{ padding:'14px 16px' }}>
                <p style={{ fontSize:11, fontWeight:600, color:'#6b7280', textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 10px' }}>Filtrer les données</p>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  <button onClick={()=>setScope('all')} style={{ padding:'7px 14px', borderRadius:20, border:`1.5px solid ${scope==='all'?'#e87d6a':'#e2e8f0'}`, background:scope==='all'?'rgba(253,232,228,.6)':'white', color:scope==='all'?'#4c1d95':'#64748b', fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>🌍 Toute l'équipe</button>
                  {teams.map(t => <button key={t.id} onClick={()=>setScope(`team:${t.id}`)} style={{ padding:'7px 14px', borderRadius:20, border:`1.5px solid ${scope===`team:${t.id}`?'#059669':'rgba(232,125,106,.15)'}`, background:scope===`team:${t.id}`?'#d1fae5':'white', color:scope===`team:${t.id}`?'#065f46':'#6b7280', fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>👥 {t.name}</button>)}
                  {allMembers.map(m => <button key={m.id} onClick={()=>setScope(`closer:${m.id}`)} style={{ padding:'7px 14px', borderRadius:20, border:`1.5px solid ${scope===`closer:${m.id}`?'#8b5cf6':'rgba(232,125,106,.15)'}`, background:scope===`closer:${m.id}`?'rgba(255,248,245,.8)':'white', color:scope===`closer:${m.id}`?'#4c1d95':'#64748b', fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>👤 {m.name}</button>)}
                </div>
              </Card>

              {/* KPIs */}
              <div>
                <p style={{ fontSize:13, fontWeight:600, color:'#6b7280', margin:'0 0 10px' }}>📊 {scopeLabel} · {fTotal} debrief{fTotal!==1?'s':''}</p>
                <div style={{ display:'grid', gridTemplateColumns:mob?'repeat(2,1fr)':'repeat(4,1fr)', gap:mob?10:12 }}>
                  {[{l:'Debriefs',value:fTotal,icon:'📋',bg:'rgba(253,232,228,.6)',c:'#e87d6a'},{l:'Score moyen',value:`${fAvg}%`,icon:'🎯',bg:'#d1fae5',c:'#059669'},{l:'Taux closing',value:`${fRate}%`,icon:'✅',bg:'#fef3c7',c:'#d97706'},{l:'Closings',value:fCls,icon:'🏆',bg:'#f0fdf4',c:'#059669'}].map(({l,value,icon,bg,c})=>(
                    <Card key={l} style={{ padding:'12px 14px', display:'flex', alignItems:'center', gap:12 }}>
                      <div style={{ width:38, height:38, borderRadius:10, background:bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>{icon}</div>
                      <div>
                        <p style={{ fontSize:10, color:'#6b7280', margin:0, fontWeight:500, textTransform:'uppercase', letterSpacing:'.04em' }}>{l}</p>
                        <p style={{ fontSize:20, fontWeight:700, color:c, margin:0 }}>{value}</p>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Axe fort / faible */}
              {weakest && strongest && (
                <div style={{ display:'grid', gridTemplateColumns:mob?'1fr':'1fr 1fr', gap:12 }}>
                  <div style={{ background:'linear-gradient(135deg,#fee2e2,#fca5a5)', border:'1px solid #f87171', borderRadius:12, padding:16 }}>
                    <p style={{ fontSize:11, color:'#7f1d1d', fontWeight:600, textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 6px' }}>⚠️ Axe à travailler</p>
                    <p style={{ fontWeight:700, fontSize:18, color:'#5a4a3a', margin:'0 0 2px' }}>{SLABELS[weakest.key]}</p>
                    <p style={{ fontSize:13, color:'#7f1d1d', margin:0 }}>Score moyen : <strong>{scopedSS[weakest.key]}/5</strong></p>
                  </div>
                  <div style={{ background:'linear-gradient(135deg,#d1fae5,#6ee7b7)', border:'1px solid #34d399', borderRadius:12, padding:16 }}>
                    <p style={{ fontSize:11, color:'#064e3b', fontWeight:600, textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 6px' }}>✅ Point fort</p>
                    <p style={{ fontWeight:700, fontSize:18, color:'#5a4a3a', margin:'0 0 2px' }}>{SLABELS[strongest.key]}</p>
                    <p style={{ fontSize:13, color:'#064e3b', margin:0 }}>Score moyen : <strong>{scopedSS[strongest.key]}/5</strong></p>
                  </div>
                </div>
              )}

              {/* Radar + Barres */}
              {scopedSS && fTotal > 0 && (
                <Card style={{ padding:20 }}>
                  <h3 style={{ fontSize:14, fontWeight:600, color:'#5a4a3a', margin:'0 0 4px' }}>Analyse par section</h3>
                  <p style={{ fontSize:12, color:DS.textMuted, margin:'0 0 20px' }}>{scopeLabel}{scope!=='all'?' · vs moyenne globale':''}</p>
                  <div style={{ display:'grid', gridTemplateColumns:mob?'1fr':'1fr 1fr', gap:24, alignItems:'center' }}>
                    <div style={{ display:'flex', justifyContent:'center' }}>
                      <Radar scores={scopedSS} color={scope.startsWith('closer:')?'#8b5cf6':scope.startsWith('team:')?'#059669':'#e87d6a'}/>
                    </div>
                    <SectionBars scores={scopedSS} globalScores={scope!=='all'?globalSS:null}/>
                  </div>
                </Card>
              )}

              {/* Évolution */}
              {fTotal > 0 && (
                <Card style={{ padding:20 }}>
                  <h3 style={{ fontSize:14, fontWeight:600, color:'#5a4a3a', margin:'0 0 4px' }}>Évolution du score</h3>
                  <p style={{ fontSize:12, color:DS.textMuted, margin:'0 0 16px' }}>{scopeLabel} · {fTotal} appel{fTotal!==1?'s':''}</p>
                  <Chart debriefs={scopedDebriefs}/>
                </Card>
              )}

              {/* Tableau performance */}
              {(() => {
                const displayMembers = scope==='all' ? allMembers
                  : scope.startsWith('team:') ? (teams.find(t=>t.id===scope.split(':')[1])?.members||[])
                  : allMembers.filter(m => m.id===scope.split(':')[1]);
                if (!displayMembers.length) return null;
                return (
                  <Card style={{ overflow:'hidden' }}>
                    <div style={{ padding:'14px 16px', borderBottom:'1px solid rgba(232,125,106,.08)', background:'rgba(255,245,242,.5)' }}>
                      <h3 style={{ fontSize:14, fontWeight:600, color:'#5a4a3a', margin:0 }}>Performance individuelle</h3>
                    </div>
                    {mob ? (
                      <div>
                        {[...displayMembers].sort((a,b)=>b.avgScore-a.avgScore).map((m,i) => {
                          const cr = m.totalDebriefs>0 ? Math.round((m.closed/m.totalDebriefs)*100) : 0;
                          const mTeam = teams.find(t=>t.members.some(x=>x.id===m.id));
                          const isSel = selMember===m.id;
                          const ms = avgSectionScores((allDebriefs||[]).filter(d=>d.user_id===m.id));
                          return (
                            <div key={m.id} style={{ borderBottom:i<displayMembers.length-1?'1px solid rgba(232,125,106,.08)':'none' }}>
                              <div style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 16px', cursor:'pointer', background:isSel?'rgba(255,248,245,.8)':'white' }} onClick={()=>setSelMember(isSel?null:m.id)}>
                                <div style={{ width:36, height:36, borderRadius:'50%', background:'rgba(255,245,242,.85)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:14, color:'#e87d6a', flexShrink:0 }}>{m.name.charAt(0)}</div>
                                <div style={{ flex:1, minWidth:0 }}>
                                  <p style={{ fontWeight:600, fontSize:14, color:'#5a4a3a', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.name}</p>
                                  <p style={{ fontSize:12, color:DS.textMuted, margin:0 }}>{mTeam?.name} · {m.avgScore}%</p>
                                </div>
                                <div style={{ textAlign:'right', flexShrink:0 }}>
                                  <p style={{ fontWeight:700, fontSize:14, color:m.avgScore>=80?'#059669':m.avgScore>=60?'#d97706':'#ef4444', margin:0 }}>{m.avgScore}%</p>
                                  <p style={{ fontSize:11, color:DS.textMuted, margin:0 }}>{m.totalDebriefs} debriefs</p>
                                </div>
                                <span style={{ color:isSel?'#e87d6a':'#d1d5db', fontSize:14 }}>{isSel?'▲':'▼'}</span>
                              </div>
                              {isSel && (
                                <div style={{ padding:'12px 16px 16px', background:'rgba(253,232,228,.15)', borderTop:'1px solid rgba(232,125,106,.08)' }}>
                                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:14 }}>
                                    {[{l:'Debriefs',v:m.totalDebriefs},{l:'Closings',v:m.closed},{l:'Taux',v:`${cr}%`}].map(({l,v})=>(
                                      <div key={l} style={{ background:'#ffffff', borderRadius:8, padding:'8px 10px', textAlign:'center', border:'1px solid rgba(232,125,106,.12)' }}>
                                        <p style={{ fontSize:11, color:DS.textMuted, margin:0 }}>{l}</p>
                                        <p style={{ fontWeight:700, color:'#5a4a3a', margin:0, fontSize:14 }}>{v}</p>
                                      </div>
                                    ))}
                                  </div>
                                  {ms && <SectionBars scores={ms} globalScores={globalSS}/>}
                                  {m.chartData.length>0 && <div style={{marginTop:14}}><Chart debriefs={m.chartData.map((d,i)=>({...d,id:i,percentage:d.score,prospect_name:d.prospect,call_date:d.date}))}/></div>}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ overflowX:'auto' }}>
                        <table style={{ width:'100%', borderCollapse:'collapse' }}>
                          <thead>
                            <tr style={{ background:'rgba(253,232,228,.2)' }}>
                              {['Closer','Équipe','Debriefs','Score','Découv.','Reform.','Proj.','Offre','Closing','Closings','Taux'].map(h=>(
                                <th key={h} style={{ padding:'10px 12px', fontSize:11, fontWeight:600, color:'#6b7280', textAlign:'left', textTransform:'uppercase', letterSpacing:'.04em', borderBottom:'1px solid rgba(232,125,106,.12)', whiteSpace:'nowrap' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {[...displayMembers].sort((a,b)=>b.avgScore-a.avgScore).map((m,i) => {
                              const cr    = m.totalDebriefs>0 ? Math.round((m.closed/m.totalDebriefs)*100) : 0;
                              const mTeam = teams.find(t=>t.members.some(x=>x.id===m.id));
                              const isSel = selMember===m.id;
                              const ms    = avgSectionScores((allDebriefs||[]).filter(d=>d.user_id===m.id));
                              const sc    = v => v>=4?'#059669':v>=3?'#d97706':v>=2?'#e87d6a':'#ef4444';
                              return (
                                <React.Fragment key={m.id}>
                                  <tr onClick={()=>setSelMember(isSel?null:m.id)} style={{ cursor:'pointer', background:isSel?'rgba(255,248,245,.8)':i%2===0?'white':'#fafafa', borderBottom:'1px solid rgba(232,125,106,.08)' }}>
                                    <td style={{ padding:'10px 12px' }}>
                                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                        <div style={{ width:26, height:26, borderRadius:'50%', background:'rgba(255,245,242,.85)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:11, color:'#e87d6a', flexShrink:0 }}>{m.name.charAt(0)}</div>
                                        <span style={{ fontWeight:600, fontSize:13, color:'#5a4a3a' }}>{m.name}</span>
                                      </div>
                                    </td>
                                    <td style={{ padding:'10px 12px' }}><span style={{ fontSize:11, background:'rgba(253,232,228,.2)', padding:'2px 6px', borderRadius:5, color:'#6b7280' }}>{mTeam?.name||'—'}</span></td>
                                    <td style={{ padding:'10px 12px', fontSize:13, fontWeight:600, color:'#5a4a3a' }}>{m.totalDebriefs}</td>
                                    <td style={{ padding:'10px 12px' }}><span style={{ fontWeight:700, fontSize:13, color:m.avgScore>=80?'#059669':m.avgScore>=60?'#d97706':'#ef4444' }}>{m.avgScore}%</span></td>
                                    {ms ? ['decouverte','reformulation','projection','presentation_offre','closing'].map(k=>(
                                      <td key={k} style={{ padding:'10px 12px' }}><span style={{ fontWeight:700, fontSize:12, color:sc(ms[k]) }}>{ms[k]}/5</span></td>
                                    )) : [...Array(5)].map((_,j)=><td key={j} style={{ padding:'10px 12px', color:DS.textMuted, fontSize:12 }}>—</td>)}
                                    <td style={{ padding:'10px 12px', fontSize:13, fontWeight:600, color:'#059669' }}>{m.closed}</td>
                                    <td style={{ padding:'10px 12px' }}>
                                      <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                                        <div style={{ width:44, height:5, background:'rgba(253,232,228,.2)', borderRadius:3, overflow:'hidden' }}>
                                          <div style={{ height:'100%', width:`${cr}%`, background:cr>=50?'#059669':cr>=30?'#d97706':'#ef4444', borderRadius:3 }}/>
                                        </div>
                                        <span style={{ fontSize:11, fontWeight:600, color:'#5a4a3a' }}>{cr}%</span>
                                      </div>
                                    </td>
                                  </tr>
                                  {isSel && (
                                    <tr>
                                      <td colSpan={11} style={{ padding:0, background:'rgba(253,232,228,.15)', borderBottom:'1px solid rgba(232,125,106,.08)' }}>
                                        <div style={{ padding:'20px 24px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
                                          <div>
                                            <p style={{ fontSize:13, fontWeight:600, color:'#5a4a3a', marginBottom:12 }}>Scores par section</p>
                                            {ms ? <SectionBars scores={ms} globalScores={globalSS}/> : <p style={{ color:DS.textMuted, fontSize:13 }}>Pas assez de données</p>}
                                          </div>
                                          <div>
                                            <p style={{ fontSize:13, fontWeight:600, color:'#5a4a3a', marginBottom:8 }}>Évolution</p>
                                            {m.chartData.length > 0 ? <Chart debriefs={m.chartData.map((d,i)=>({...d,id:i,percentage:d.score,prospect_name:d.prospect,call_date:d.date}))}/> : <p style={{ color:DS.textMuted, fontSize:13 }}>Aucun debrief</p>}
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </Card>
                );
              })()}
            </>
      )}

      {/* ─── ÉQUIPES — LISTE ─── */}
      {tab==='equipes' && !activeTeamId && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <Btn onClick={()=>setShowCreate(true)}>+ Nouvelle équipe</Btn>
          </div>
          {teams.length === 0
            ? <Empty icon="👥" title="Aucune équipe" subtitle="Créez votre première équipe pour inviter des closers" action={<Btn onClick={()=>setShowCreate(true)}>+ Créer une équipe</Btn>}/>
            : <div style={{ display:'grid', gridTemplateColumns:mob?'1fr':'repeat(auto-fill,minmax(280px,1fr))', gap:16 }}>
                {teams.map(team => (
                  <TeamCard key={team.id} team={team} allDebriefs={allDebriefs} onClick={()=>setActiveTeamId(team.id)}/>
                ))}
              </div>
          }
        </div>
      )}

      {/* ─── ÉQUIPES — DÉTAIL ─── */}
      {tab==='equipes' && activeTeamId && (() => {
        const team = teams.find(t => t.id===activeTeamId);
        if (!team) return null;
        const td   = (allDebriefs||[]).filter(d => team.members.some(m => m.id===d.user_id));
        const tAvg  = td.length>0 ? Math.round(td.reduce((s,d)=>s+(d.percentage||0),0)/td.length) : 0;
        const tCls  = td.filter(d=>d.is_closed).length;
        const tRate = td.length>0 ? Math.round((tCls/td.length)*100) : 0;
        const tSS   = avgSectionScores(td);
        return (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {/* Header */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <Btn variant="secondary" onClick={()=>setActiveTeamId(null)} style={{width:36,height:36,padding:0,borderRadius:8,fontSize:16}}>←</Btn>
                <div>
                  {editingTeam?.id===team.id ? (
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <input value={editingTeam.name} onChange={e=>setEditingTeam({...editingTeam,name:e.target.value})} onKeyDown={e=>{if(e.key==='Enter')renameTeam();if(e.key==='Escape')setEditingTeam(null);}} style={{ fontSize:18, fontWeight:700, border:'2px solid #e87d6a', borderRadius:8, padding:'4px 10px', fontFamily:'inherit', outline:'none' }} autoFocus/>
                      <Btn onClick={renameTeam} style={{padding:'5px 12px',fontSize:12}}>✓</Btn>
                      <Btn variant="ghost" onClick={()=>setEditingTeam(null)} style={{padding:'5px 8px',fontSize:12}}>✕</Btn>
                    </div>
                  ) : (
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <h1 style={{ fontSize:20, fontWeight:700, color:'#5a4a3a', margin:0 }}>{team.name}</h1>
                      <button onClick={()=>setEditingTeam({id:team.id,name:team.name})} style={{ background:'none', border:'none', cursor:'pointer', fontSize:16, color:DS.textMuted, padding:'2px 4px' }}>✏️</button>
                    </div>
                  )}
                  <p style={{ color:'#6b7280', fontSize:13, marginTop:2 }}>{team.members.length} membre{team.members.length!==1?'s':''} · {td.length} debrief{td.length!==1?'s':''}</p>
                </div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <Btn onClick={()=>genCode(team.id)} disabled={generating===team.id} style={{fontSize:13,padding:'8px 14px'}}>{generating===team.id?'Génération...':'🔑 Générer un code'}</Btn>
                <Btn variant="danger" onClick={()=>deleteTeam(team.id,team.name)} style={{padding:'8px 12px',fontSize:13}}>🗑</Btn>
              </div>
            </div>

            {/* KPIs équipe */}
            <div style={{ display:'grid', gridTemplateColumns:mob?'repeat(2,1fr)':'repeat(4,1fr)', gap:mob?10:12 }}>
              {[{l:'Debriefs',v:td.length,i:'📋',bg:'rgba(253,232,228,.6)',c:'#e87d6a'},{l:'Score moyen',v:`${tAvg}%`,i:'🎯',bg:'#d1fae5',c:'#059669'},{l:'Taux closing',v:`${tRate}%`,i:'✅',bg:'#fef3c7',c:'#d97706'},{l:'Closings',v:tCls,i:'🏆',bg:'#f0fdf4',c:'#059669'}].map(({l,v,i,bg,c})=>(
                <Card key={l} style={{padding:'12px 14px',display:'flex',alignItems:'center',gap:12}}>
                  <div style={{width:38,height:38,borderRadius:10,background:bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>{i}</div>
                  <div><p style={{fontSize:10,color:'#6b7280',margin:0,fontWeight:500,textTransform:'uppercase',letterSpacing:'.04em'}}>{l}</p><p style={{fontSize:20,fontWeight:700,color:c,margin:0}}>{v}</p></div>
                </Card>
              ))}
            </div>

            {/* Codes */}
            <Card style={{ padding:20 }}>
              <h3 style={{ fontSize:14, fontWeight:600, color:'#5a4a3a', margin:'0 0 12px' }}>🔑 Codes d'invitation actifs</h3>
              {team.inviteCodes.length === 0
                ? <p style={{ color:DS.textMuted, fontSize:13, margin:0 }}>Aucun code actif — cliquez sur "Générer un code" ci-dessus</p>
                : <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                    {team.inviteCodes.map(inv => (
                      <div key={inv.id} style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(253,232,228,.2)', border:'1px solid rgba(232,125,106,.12)', borderRadius:10, padding:'8px 12px' }}>
                        <span style={{ fontFamily:'monospace', fontSize:16, fontWeight:700, color:'#e87d6a', letterSpacing:'.12em' }}>{inv.code}</span>
                        <button onClick={()=>doCopy(inv.code)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:14, color:copied===inv.code?'#059669':'#94a3b8', padding:2 }}>{copied===inv.code?'✓':'📋'}</button>
                        <button onClick={()=>delCode(team.id,inv.id)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:12, color:'#dc2626', padding:2 }}>✕</button>
                      </div>
                    ))}
                  </div>
              }
            </Card>

            {/* Radar équipe */}
            {tSS && td.length > 0 && (
              <Card style={{ padding:20 }}>
                <h3 style={{ fontSize:14, fontWeight:600, color:'#5a4a3a', margin:'0 0 4px' }}>Analyse par section — {team.name}</h3>
                <p style={{ fontSize:12, color:DS.textMuted, margin:'0 0 20px' }}>Score moyen · comparé à la moyenne globale</p>
                <div style={{ display:'grid', gridTemplateColumns:mob?'1fr':'1fr 1fr', gap:24, alignItems:'center' }}>
                  <div style={{ display:'flex', justifyContent:'center' }}><Radar scores={tSS} color="#059669"/></div>
                  <SectionBars scores={tSS} globalScores={globalSS}/>
                </div>
              </Card>
            )}

            {/* Membres */}
            <Card style={{ overflow:'hidden' }}>
              <div style={{ padding:'14px 16px', borderBottom:'1px solid rgba(232,125,106,.08)', background:'rgba(255,245,242,.5)' }}>
                <h3 style={{ fontSize:14, fontWeight:600, color:'#5a4a3a', margin:0 }}>Membres ({team.members.length})</h3>
              </div>
              {team.members.length === 0
                ? <div style={{ padding:'32px 16px', textAlign:'center', color:DS.textMuted, fontSize:13 }}>Aucun membre — partagez un code d'invitation !</div>
                : team.members.map((m,i) => (
                    <div key={m.id} style={{ borderBottom:i<team.members.length-1?'1px solid rgba(232,125,106,.08)':'none' }}>
                      <MemberRow member={m} teams={teams} currentTeamId={team.id} onRemove={(id,name)=>removeMember(team.id,id,name)} onMove={(mid,tid)=>moveMember(mid,tid)} selected={selMember===m.id} onSelect={()=>setSelMember(selMember===m.id?null:m.id)} onObjectives={()=>setObjectiveTarget(m)} onActionPlans={()=>setSelMember(selMember===m.id?null:m.id)}/>
                      {selMember===m.id && (
                        <div style={{ padding:'14px 16px 18px', borderTop:'1px solid #f5f3ff', background:'rgba(253,232,228,.15)', display:'flex', flexDirection:'column', gap:14 }}>
                          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                            <Btn onClick={e=>{e.stopPropagation();setObjectiveTarget(m);}} style={{ fontSize:12, padding:'7px 14px' }}>🎯 Objectifs</Btn>
                          </div>
                          <ActionPlanCard closerId={m.id} isHOS={true} toast={toast}/>
                        </div>
                      )}
                    </div>
                  ))
              }
            </Card>
          </div>
        );
      })()}

      {/* Objective modal */}
      {objectiveTarget && <ObjectiveModal closer={objectiveTarget} onClose={()=>setObjectiveTarget(null)} toast={toast}/>}

      {/* Modal créer équipe */}
      {showCreate && (
        <Modal title="Créer une nouvelle équipe" onClose={()=>setShowCreate(false)}>
          <div style={{ marginBottom:20 }}>
            <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#5a4a3a', marginBottom:6 }}>Nom de l'équipe</label>
            <Input placeholder="Ex: Équipe Paris, Closers B2B..." value={newName} onChange={e=>setNewName(e.target.value)} autoFocus onKeyDown={e=>{if(e.key==='Enter')createTeam();}}/>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <Btn onClick={createTeam} disabled={creating||!newName.trim()} style={{flex:1}}>{creating?'Création...':'Créer'}</Btn>
            <Btn variant="secondary" onClick={()=>setShowCreate(false)} style={{flex:1}}>Annuler</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}


export { MemberRow, TeamCard, HOSPage };
