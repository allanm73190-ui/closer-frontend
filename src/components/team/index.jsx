import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../../config/api';
import { DS } from '../../styles/designSystem';
import { useIsMobile } from '../../hooks';
import { avgSectionScores, copy } from '../../utils/scoring';
import { Btn, Card, Modal, Spinner, Empty, Input } from '../ui';

const G = (extra = {}) => ({ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 12, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', ...extra });
import { Radar, SectionBars } from '../ui/Charts';
import { Chart } from '../dashboard/StatsChart';
import { ObjectiveModal } from '../gamification/Objectives';

function getTeamDebriefs(team, allDebriefs) {
  if (!team) return [];
  const ids = (team.members || []).map(m => m.id);
  return (allDebriefs || []).filter(d => ids.includes(d.user_id));
}

function computeTeamStats(team, allDebriefs) {
  const debriefs = getTeamDebriefs(team, allDebriefs);
  const total = debriefs.length;
  const avg = total > 0 ? Math.round(debriefs.reduce((sum, d) => sum + (d.percentage || 0), 0) / total) : 0;
  const closed = debriefs.filter(d => d.is_closed).length;
  const closeRate = total > 0 ? Math.round((closed / total) * 100) : 0;
  return { total, avg, closed, closeRate, debriefs };
}

function TeamTile({ team, active, allDebriefs, onSelect }) {
  const stats = computeTeamStats(team, allDebriefs);
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        border:'none',
        borderRadius:14,
        padding:'16px 18px',
        textAlign:'left',
        cursor:'pointer',
        background:active ? 'var(--gradient-primary)' : 'var(--glass-bg)',
        color:active ? 'white' : '#4A3428',
        boxShadow:active ? '0 16px 34px rgba(255,126,95,.35)' : '0 12px 24px rgba(28,26,40,.09)',
        transition:'all .2s',
      }}
    >
      <p style={{ margin:'0 0 4px', fontSize:16, fontWeight:700 }}>{team.name}</p>
      <p style={{ margin:'0 0 10px', fontSize:12, color:active ? 'rgba(255,255,255,.8)' : DS.textMuted }}>
        {(team.members || []).length} membre{(team.members || []).length > 1 ? 's' : ''} · {stats.total} debrief{stats.total > 1 ? 's' : ''}
      </p>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
        {[{ label:'Score', value:`${stats.avg}%` }, { label:'Closings', value:stats.closed }, { label:'Taux', value:`${stats.closeRate}%` }].map(kpi => (
          <div key={kpi.label} style={{ background:active ? 'rgba(255,255,255,.16)' : 'rgba(255,126,95,.12)', borderRadius:8, padding:'6px 8px' }}>
            <p style={{ margin:'0 0 2px', fontSize:10, textTransform:'uppercase', letterSpacing:'.04em', opacity:active ? .82 : .64 }}>
              {kpi.label}
            </p>
            <p style={{ margin:0, fontSize:14, fontWeight:700 }}>{kpi.value}</p>
          </div>
        ))}
      </div>
    </button>
  );
}

function MemberCard({ member, teamId, teams, allDebriefs, selected, onToggle, onRemove, onMove, onObjectives }) {
  const [targetTeamId, setTargetTeamId] = useState('');
  const otherTeams = teams.filter(t => t.id !== teamId);
  const memberDebriefs = (allDebriefs || []).filter(d => d.user_id === member.id);
  const sectionScores = avgSectionScores(memberDebriefs);
  const closeRate = member.totalDebriefs > 0 ? Math.round((member.closed / member.totalDebriefs) * 100) : 0;

  return (
    <div style={{ border:'1px solid rgba(255,126,95,.12)', borderRadius:12, overflow:'hidden', background:'var(--glass-bg)' }}>
      <div
        onClick={onToggle}
        style={{
          display:'flex',
          alignItems:'center',
          gap:12,
          padding:'12px 14px',
          cursor:'pointer',
          background:selected ? 'rgba(255,248,245,.85)' : 'white',
        }}
      >
        <div style={{ width:36, height:36, borderRadius:'50%', background:'rgba(255,245,242,.9)', color:'#FF7E5F', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, flexShrink:0 }}>
          {member.name?.charAt(0)}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ margin:'0 0 2px', fontSize:14, fontWeight:700, color:'#4A3428', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{member.name}</p>
          <p style={{ margin:0, fontSize:12, color:DS.textMuted }}>
            {member.totalDebriefs} debrief{member.totalDebriefs > 1 ? 's' : ''} · {member.avgScore}% · {closeRate}% de closing
          </p>
        </div>
        <span style={{ color:selected ? '#FF7E5F' : '#cbd5e1', fontSize:13 }}>{selected ? '▲' : '▼'}</span>
      </div>

      {selected && (
        <div style={{ padding:'14px 14px 16px', borderTop:'1px solid rgba(255,126,95,.08)', background:'rgba(255,248,245,.45)', display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
            {[{ label:'Debriefs', value:member.totalDebriefs }, { label:'Closings', value:member.closed }, { label:'Taux', value:`${closeRate}%` }].map(stat => (
              <div key={stat.label} style={{ background:'var(--glass-bg)', border:'1px solid rgba(255,126,95,.1)', borderRadius:8, padding:'8px 10px' }}>
                <p style={{ margin:'0 0 2px', fontSize:11, color:DS.textMuted }}>{stat.label}</p>
                <p style={{ margin:0, fontSize:15, fontWeight:700, color:'#4A3428' }}>{stat.value}</p>
              </div>
            ))}
          </div>

          {sectionScores && <SectionBars scores={sectionScores} />}

          {member.chartData?.length > 0 && (
            <div>
              <p style={{ margin:'0 0 8px', fontSize:12, color:DS.textMuted }}>Évolution</p>
              <Chart
                debriefs={member.chartData.map((d, i) => ({
                  id:i,
                  date:d.date,
                  score:d.score,
                  prospect:d.prospect,
                }))}
              />
            </div>
          )}

          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <Btn variant="secondary" onClick={()=>onObjectives(member)} style={{ fontSize:12, padding:'7px 12px' }}>
              🎯 Objectifs
            </Btn>
            {otherTeams.length > 0 && (
              <>
                <select
                  value={targetTeamId}
                  onChange={e=>setTargetTeamId(e.target.value)}
                  style={{
                    background:'var(--glass-bg)',
                    border:'1px solid rgba(255,126,95,.2)',
                    borderRadius:8,
                    padding:'8px 10px',
                    fontSize:12,
                    fontFamily:'inherit',
                    color:'#4A3428',
                  }}
                >
                  <option value="">Déplacer vers...</option>
                  {otherTeams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
                </select>
                <Btn variant="secondary" onClick={()=>{ onMove(member.id, targetTeamId); setTargetTeamId(''); }} disabled={!targetTeamId} style={{ fontSize:12, padding:'7px 12px' }}>
                  Déplacer
                </Btn>
              </>
            )}
            <Btn variant="danger" onClick={()=>onRemove(member.id, member.name)} style={{ fontSize:12, padding:'7px 12px' }}>
              Retirer
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}

function ManagerCopilotCard({ toast }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState(null);

  const loadSummary = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await apiFetch('/ai/manager-summary');
      setSummary(data);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  const periodLabel = summary?.period
    ? `${summary.period.current_from} → ${summary.period.current_to}`
    : '';

  return (
    <Card style={{ padding:16, border:'1px solid rgba(124,58,237,.22)', background:'linear-gradient(135deg, rgba(124,58,237,.14), rgba(255,126,95,.16))' }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8, flexWrap:'wrap', marginBottom:10 }}>
        <div>
          <h3 style={{ margin:'0 0 2px', fontSize:15, color:'#4A3428' }}>🧭 Copilot Manager</h3>
          <p style={{ margin:0, fontSize:12, color:DS.textMuted }}>
            Résumé hebdo équipe + recommandations actionnables {periodLabel ? `(${periodLabel})` : ''}
          </p>
        </div>
        <Btn variant="secondary" onClick={()=>loadSummary(true)} disabled={refreshing || loading} style={{ fontSize:12, padding:'7px 11px' }}>
          {refreshing ? 'Actualisation...' : '↻ Actualiser'}
        </Btn>
      </div>

      {loading ? (
        <Spinner size={22} />
      ) : !summary ? (
        <p style={{ margin:0, fontSize:12, color:DS.textMuted }}>Impossible de charger le résumé manager.</p>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {summary.metrics && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4, minmax(0,1fr))', gap:8 }}>
              {[
                { label:'Debriefs semaine', value:summary.metrics.current_week?.total ?? 0, color:'#FF7E5F' },
                { label:'Score moyen', value:`${summary.metrics.current_week?.avgScore ?? 0}%`, color:'#059669' },
                { label:'Closing', value:`${summary.metrics.current_week?.closeRate ?? 0}%`, color:'#d97706' },
                { label:'Deals à risque', value:summary.metrics.pipeline_alerts?.atRisk ?? 0, color:'#dc2626' },
              ].map(item => (
                <div key={item.label} style={{ background:'var(--glass-bg)', border:'1px solid rgba(124,58,237,.2)', borderRadius:10, padding:'8px 10px' }}>
                  <p style={{ margin:'0 0 3px', fontSize:10, color:DS.textMuted, textTransform:'uppercase', letterSpacing:'.04em' }}>{item.label}</p>
                  <p style={{ margin:0, fontSize:18, fontWeight:700, color:item.color }}>{item.value}</p>
                </div>
              ))}
            </div>
          )}

          {Array.isArray(summary.highlights) && summary.highlights.length > 0 && (
            <div style={{ background:'var(--glass-bg)', border:'1px solid rgba(124,58,237,.2)', borderRadius:10, padding:'10px 12px' }}>
              <p style={{ margin:'0 0 6px', fontSize:12, fontWeight:700, color:'#7C3AED' }}>Faits marquants</p>
              <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                {summary.highlights.slice(0, 4).map((line, idx) => (
                  <p key={idx} style={{ margin:0, fontSize:12, color:'#4A3428' }}>• {line}</p>
                ))}
              </div>
            </div>
          )}

          {Array.isArray(summary.recommendations) && summary.recommendations.length > 0 && (
            <div style={{ background:'var(--glass-bg)', border:'1px solid rgba(124,58,237,.2)', borderRadius:10, padding:'10px 12px' }}>
              <p style={{ margin:'0 0 6px', fontSize:12, fontWeight:700, color:'#7C3AED' }}>Recommandations concrètes</p>
              <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                {summary.recommendations.slice(0, 4).map((line, idx) => (
                  <p key={idx} style={{ margin:0, fontSize:12, color:'#4A3428' }}>• {line}</p>
                ))}
              </div>
            </div>
          )}

          {summary.aiSummary && (
            <div style={{ background:'var(--glass-bg)', border:'1px solid rgba(124,58,237,.2)', borderRadius:10, padding:'10px 12px' }}>
              <p style={{ margin:'0 0 6px', fontSize:12, fontWeight:700, color:'#7C3AED' }}>
                Synthèse IA {summary.model ? `(${summary.model})` : ''}
              </p>
              <p style={{ margin:0, fontSize:12, color:'#4A3428', whiteSpace:'pre-wrap', lineHeight:1.55 }}>
                {summary.aiSummary}
              </p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function HOSPage({ toast, allDebriefs }) {
  const mob = useIsMobile();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTeamId, setActiveTeamId] = useState(null);
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [editingTeamId, setEditingTeamId] = useState(null);
  const [generatingCodeFor, setGeneratingCodeFor] = useState(null);
  const [copiedCode, setCopiedCode] = useState('');
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const [objectiveCloser, setObjectiveCloser] = useState(null);

  const loadTeams = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await apiFetch('/teams');
      const normalized = (data || []).map(team => ({
        ...team,
        members: Array.isArray(team.members) ? team.members : [],
        inviteCodes: Array.isArray(team.inviteCodes) ? team.inviteCodes : [],
      }));
      setTeams(normalized);
      setLastSyncAt(new Date());
      if (!activeTeamId && normalized.length > 0) {
        setActiveTeamId(normalized[0].id);
      }
      if (activeTeamId && !normalized.some(team => team.id === activeTeamId)) {
        setActiveTeamId(normalized[0]?.id || null);
      }
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast, activeTeamId]);

  useEffect(() => { loadTeams(); }, [loadTeams]);

  useEffect(() => {
    const timer = setInterval(() => {
      loadTeams(true);
    }, 30000);
    return () => clearInterval(timer);
  }, [loadTeams]);

  const createTeam = async () => {
    const name = newTeamName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const team = await apiFetch('/teams', { method:'POST', body:{ name } });
      setShowCreate(false);
      setNewTeamName('');
      setActiveTeamId(team.id);
      toast(`Équipe "${team.name}" créée`);
      await loadTeams(true);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setCreating(false);
    }
  };

  const renameTeam = async () => {
    const name = editingName.trim();
    if (!editingTeamId || !name) return;
    try {
      await apiFetch(`/teams/${editingTeamId}`, { method:'PATCH', body:{ name } });
      setEditingTeamId(null);
      setEditingName('');
      toast('Équipe renommée');
      await loadTeams(true);
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const deleteTeam = async (team) => {
    if (!confirm(`Supprimer l'équipe "${team.name}" ? Les membres seront retirés mais leurs données seront conservées.`)) return;
    try {
      await apiFetch(`/teams/${team.id}`, { method:'DELETE' });
      toast('Équipe supprimée');
      await loadTeams(true);
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const generateInviteCode = async (teamId) => {
    setGeneratingCodeFor(teamId);
    try {
      await apiFetch(`/teams/${teamId}/invite`, { method:'POST' });
      toast("Code d'invitation généré");
      await loadTeams(true);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setGeneratingCodeFor(null);
    }
  };

  const deleteInviteCode = async (teamId, codeId) => {
    try {
      await apiFetch(`/teams/${teamId}/invite/${codeId}`, { method:'DELETE' });
      toast('Code supprimé');
      await loadTeams(true);
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const removeMember = async (teamId, memberId, memberName) => {
    if (!confirm(`Retirer ${memberName} de l'équipe ? Ses debriefs seront conservés.`)) return;
    try {
      await apiFetch(`/teams/${teamId}/members/${memberId}`, { method:'DELETE' });
      setSelectedMemberId(null);
      toast(`${memberName} retiré`);
      await loadTeams(true);
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const moveMember = async (memberId, toTeamId) => {
    if (!toTeamId) return;
    try {
      await apiFetch(`/teams/${toTeamId}/members/${memberId}`, { method:'PATCH' });
      setSelectedMemberId(null);
      toast('Membre déplacé');
      await loadTeams(true);
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const activeTeam = teams.find(team => team.id === activeTeamId) || null;
  const teamStats = computeTeamStats(activeTeam, allDebriefs);
  const teamSectionScores = avgSectionScores(teamStats.debriefs);
  const globalSectionScores = avgSectionScores(allDebriefs || []);

  if (loading) return <Spinner full />;

  return (
    <div className="cd-page-flow" style={{ gap: 18 }}>
      <Card className="cd-hero-card" style={{ padding: 18 }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
          <div>
            <p className="cd-hero-kicker">Équipes</p>
            <h1 className="cd-hero-title" style={{ fontSize: 24 }}>Espace équipe</h1>
            <p className="cd-hero-subtitle">
              {teams.length} équipe{teams.length > 1 ? 's' : ''}
              {lastSyncAt && ` · Synchro ${lastSyncAt.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })}`}
            </p>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <Btn variant="secondary" onClick={()=>loadTeams(true)} disabled={refreshing}>{refreshing ? 'Synchro...' : 'Actualiser'}</Btn>
            <Btn onClick={()=>setShowCreate(true)}>+ Nouvelle équipe</Btn>
          </div>
        </div>
      </Card>

      <ManagerCopilotCard toast={toast} />

      {teams.length === 0 ? (
        <Empty
          icon="👥"
          title="Aucune équipe"
          subtitle="Créez votre première équipe pour inviter des closers."
          action={<Btn onClick={()=>setShowCreate(true)}>Créer une équipe</Btn>}
        />
      ) : (
        <>
          <div style={{ display:'grid', gridTemplateColumns:mob ? '1fr' : 'repeat(auto-fill,minmax(260px,1fr))', gap:12 }}>
            {teams.map(team => (
              <TeamTile
                key={team.id}
                team={team}
                allDebriefs={allDebriefs}
                active={team.id === activeTeamId}
                onSelect={() => {
                  setActiveTeamId(team.id);
                  setSelectedMemberId(null);
                }}
              />
            ))}
          </div>

          {activeTeam && (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <Card style={{ padding:16 }}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10, flexWrap:'wrap' }}>
                  <div>
                    {editingTeamId === activeTeam.id ? (
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <Input
                          value={editingName}
                          onChange={e=>setEditingName(e.target.value)}
                          onKeyDown={e=>{ if (e.key === 'Enter') renameTeam(); if (e.key === 'Escape') { setEditingTeamId(null); setEditingName(''); } }}
                          style={{ minWidth:220 }}
                        />
                        <Btn onClick={renameTeam} style={{ fontSize:12, padding:'7px 10px' }}>✓</Btn>
                        <Btn variant="secondary" onClick={()=>{ setEditingTeamId(null); setEditingName(''); }} style={{ fontSize:12, padding:'7px 10px' }}>✕</Btn>
                      </div>
                    ) : (
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <h2 style={{ margin:0, fontSize:20, color:'#4A3428' }}>{activeTeam.name}</h2>
                        <button onClick={()=>{ setEditingTeamId(activeTeam.id); setEditingName(activeTeam.name); }} style={{ border:'none', background:'none', cursor:'pointer', fontSize:16, color:DS.textMuted }}>✏️</button>
                      </div>
                    )}
                  </div>
                  <Btn variant="danger" onClick={()=>deleteTeam(activeTeam)} style={{ fontSize:12, padding:'8px 12px' }}>
                    Supprimer l'équipe
                  </Btn>
                </div>

                <div style={{ marginTop:14, display:'grid', gridTemplateColumns:mob ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap:10 }}>
                  {[{ label:'Debriefs', value:teamStats.total, color:'#FF7E5F' }, { label:'Score moyen', value:`${teamStats.avg}%`, color:'#059669' }, { label:'Closings', value:teamStats.closed, color:'#059669' }, { label:'Taux closing', value:`${teamStats.closeRate}%`, color:'#d97706' }].map(kpi => (
                    <div key={kpi.label} style={{ border:'1px solid rgba(255,126,95,.12)', borderRadius:12, padding:'10px 12px', background:'linear-gradient(145deg, rgba(255,255,255,.92), rgba(249,239,233,.74))' }}>
                      <p style={{ margin:'0 0 3px', fontSize:11, color:DS.textMuted, textTransform:'uppercase', letterSpacing:'.04em' }}>{kpi.label}</p>
                      <p style={{ margin:0, fontSize:20, fontWeight:700, color:kpi.color }}>{kpi.value}</p>
                    </div>
                  ))}
                </div>
              </Card>

              {teamSectionScores && teamStats.total > 0 && (
                <Card style={{ padding:16 }}>
                  <h3 style={{ margin:'0 0 4px', fontSize:14, color:'#4A3428' }}>Analyse de performance par section</h3>
                  <p style={{ margin:'0 0 16px', fontSize:12, color:DS.textMuted }}>Comparaison équipe vs global</p>
                  <div style={{ display:'grid', gridTemplateColumns:mob ? '1fr' : '1fr 1fr', gap:20, alignItems:'center' }}>
                    <div style={{ display:'flex', justifyContent:'center' }}>
                      <Radar scores={teamSectionScores} color="#059669" />
                    </div>
                    <SectionBars scores={teamSectionScores} globalScores={globalSectionScores} />
                  </div>
                </Card>
              )}

              {teamStats.total > 0 && (
                <Card style={{ padding:16 }}>
                  <h3 style={{ margin:'0 0 10px', fontSize:14, color:'#4A3428' }}>Évolution de l'équipe</h3>
                  <Chart debriefs={teamStats.debriefs} />
                </Card>
              )}

              <Card style={{ padding:16 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, flexWrap:'wrap' }}>
                  <div>
                    <h3 style={{ margin:'0 0 3px', fontSize:14, color:'#4A3428' }}>Codes d'invitation</h3>
                  </div>
                  <Btn onClick={()=>generateInviteCode(activeTeam.id)} disabled={generatingCodeFor === activeTeam.id} style={{ fontSize:12, padding:'8px 12px' }}>
                    {generatingCodeFor === activeTeam.id ? 'Génération...' : '🔑 Générer un code'}
                  </Btn>
                </div>

                <div style={{ marginTop:12, display:'flex', flexWrap:'wrap', gap:8 }}>
                  {activeTeam.inviteCodes.length === 0 && (
                    <p style={{ margin:0, fontSize:13, color:DS.textMuted }}>Aucun code actif.</p>
                  )}
                  {activeTeam.inviteCodes.map(code => (
                    <div key={code.id} style={{ display:'flex', alignItems:'center', gap:8, border:'1px solid rgba(255,126,95,.18)', background:'rgba(255,248,245,.85)', borderRadius:10, padding:'8px 10px' }}>
                      <span style={{ fontFamily:'ui-monospace, SFMono-Regular, Menlo, monospace', fontWeight:700, letterSpacing:'.08em', color:'#FF7E5F' }}>{code.code}</span>
                      <button
                        onClick={() => { copy(code.code); setCopiedCode(code.code); toast('Code copié'); setTimeout(() => setCopiedCode(''), 1500); }}
                        style={{ border:'none', background:'none', cursor:'pointer', color:copiedCode === code.code ? '#059669' : '#64748b' }}
                        title="Copier"
                      >
                        {copiedCode === code.code ? '✓' : '📋'}
                      </button>
                      <button onClick={()=>deleteInviteCode(activeTeam.id, code.id)} style={{ border:'none', background:'none', cursor:'pointer', color:'#dc2626' }} title="Supprimer">✕</button>
                    </div>
                  ))}
                </div>
              </Card>

              <Card style={{ padding:16 }}>
                <h3 style={{ margin:'0 0 8px', fontSize:14, color:'#4A3428' }}>
                  Closer de l'équipe ({activeTeam.members.length})
                </h3>
                {activeTeam.members.length === 0 ? (
                  <p style={{ margin:0, fontSize:13, color:DS.textMuted }}>Aucun membre. Partagez un code d'invitation.</p>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    {[...activeTeam.members].sort((a, b) => b.avgScore - a.avgScore).map(member => (
                      <MemberCard
                        key={member.id}
                        member={member}
                        teamId={activeTeam.id}
                        teams={teams}
                        allDebriefs={allDebriefs}
                        selected={selectedMemberId === member.id}
                        onToggle={()=>setSelectedMemberId(selectedMemberId === member.id ? null : member.id)}
                        onRemove={(memberId, memberName)=>removeMember(activeTeam.id, memberId, memberName)}
                        onMove={moveMember}
                        onObjectives={closer=>setObjectiveCloser(closer)}
                      />
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}
        </>
      )}

      {showCreate && (
        <Modal title="Créer une nouvelle équipe" onClose={()=>setShowCreate(false)}>
          <div style={{ marginBottom:20 }}>
            <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#4A3428', marginBottom:6 }}>Nom de l'équipe</label>
            <Input
              placeholder="Ex: Team Setter FR"
              value={newTeamName}
              onChange={e=>setNewTeamName(e.target.value)}
              onKeyDown={e=>{ if (e.key === 'Enter') createTeam(); }}
              autoFocus
            />
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <Btn onClick={createTeam} disabled={creating || !newTeamName.trim()} style={{ flex:1 }}>
              {creating ? 'Création...' : 'Créer'}
            </Btn>
            <Btn variant="secondary" onClick={()=>setShowCreate(false)} style={{ flex:1 }}>
              Annuler
            </Btn>
          </div>
        </Modal>
      )}

      {objectiveCloser && (
        <ObjectiveModal closer={objectiveCloser} onClose={()=>setObjectiveCloser(null)} toast={toast}/>
      )}
    </div>
  );
}

export { HOSPage };
