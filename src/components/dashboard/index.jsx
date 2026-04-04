import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../config/api';
import { DEFAULT_PIPELINE_STATUSES, normalizePipelineConfig } from '../../config/pipeline';
import { DS, P, R_FULL, SH_SM, cardSm } from '../../styles/designSystem';
import { useIsMobile } from '../../hooks';
import { fmtDate } from '../../utils/scoring';
import { Btn, Input, Card, Spinner, Empty } from '../ui';
import { GamCard } from '../gamification';
import { StatsRow, Chart } from './StatsChart';
import { DebriefCard } from '../debrief/DebriefCard';
import { ObjectiveBanner } from '../gamification/Objectives';
import { ActionPlanCard } from '../gamification/Objectives';

const OBJECTION_LABELS = {
  budget: 'Budget',
  reflechir: 'Besoin de réfléchir',
  conjoint: 'Conjoint / tiers',
  methode: 'Méthode / doute',
};

const PROSPECT_TYPE_LABELS = {
  froid: 'Prospect froid',
  'tiède': 'Prospect tiède',
  chaud: 'Prospect chaud',
  inbound: 'Inbound',
  outbound: 'Outbound',
};

const SCORE_FILTERS = [
  { key: 'all', label: 'Tous les scores' },
  { key: 'low', label: '0-49%' },
  { key: 'mid', label: '50-74%' },
  { key: 'high', label: '75-100%' },
];

// Glass card helper
const glass = (extra = {}) => ({
  background: 'var(--glass-bg)',
  border: '1px solid var(--glass-border)',
  borderRadius: 12,
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  ...extra,
});

function Dashboard({ debriefs, navigate, user, gam, toast }) {
  const mob = useIsMobile();
  const isHOS = user.role === 'head_of_sales';
  const [patternsData, setPatternsData] = useState(null);
  const [patternsLoading, setPatternsLoading] = useState(true);
  const latestDebriefs = [...debriefs]
    .sort((a, b) => new Date(b.call_date || b.created_at || 0) - new Date(a.call_date || a.created_at || 0))
    .slice(0, 6);

  useEffect(() => {
    let mounted = true;
    setPatternsLoading(true);
    apiFetch('/patterns')
      .then(data => { if (mounted) setPatternsData(data); })
      .catch(() => { if (mounted) setPatternsData(null); })
      .finally(() => { if (mounted) setPatternsLoading(false); });
    return () => { mounted = false; };
  }, [user?.id]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

      {/* ── Hero banner ────────────────────────────────────────────────── */}
      <div style={{ ...glass({ padding: mob ? '18px 16px' : '22px 24px' }) }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--txt3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.1em' }}>Tableau de bord</p>
            <h1 style={{ fontSize: mob ? 22 : 28, fontWeight: 700, color: 'var(--txt)', margin: 0, letterSpacing: '-.02em' }}>Bonjour, {user.name}</h1>
            <p style={{ color: 'var(--txt2)', marginTop: 6, fontSize: 13, maxWidth: 520 }}>
              Pilotez vos performances, vos priorités de closing et les prochaines actions à fort impact.
            </p>
          </div>
          <Btn onClick={() => navigate('NewDebrief')} style={{ minWidth: 160 }}>+ Nouveau debrief</Btn>
        </div>
        <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['Vue globale live', 'Patterns IA', 'Pipeline synchronisé'].map(tag => (
            <span key={tag} style={{
              padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
              color: P, background: 'var(--surface-accent)', border: '1px solid var(--nav-active-border)',
            }}>
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* ── Gamification + Objectives ──────────────────────────────────── */}
      {isHOS ? (
        <GamCard gam={gam} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : '1.1fr .9fr', gap: 12 }}>
          <GamCard gam={gam} />
          <ObjectiveBanner userId={user.id} />
        </div>
      )}

      {/* ── Stats row ──────────────────────────────────────────────────── */}
      <StatsRow debriefs={debriefs} />

      {/* ── Patterns IA ────────────────────────────────────────────────── */}
      <div style={{ ...glass({ padding: 14 }) }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 10 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--txt)' }}>Détection de patterns</h2>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--txt3)' }}>
              {isHOS ? "Tendances prioritaires de l'équipe" : 'Tendances prioritaires sur vos appels non closés'}
            </p>
          </div>
          <Btn variant="secondary" onClick={() => navigate('History')} style={{ fontSize: 12, padding: '6px 11px' }}>
            Ouvrir l'historique
          </Btn>
        </div>

        {patternsLoading ? (
          <Spinner size={20} />
        ) : (!patternsData?.patterns || patternsData.patterns.length === 0) ? (
          <p style={{ margin: 0, fontSize: 12, color: 'var(--txt3)' }}>
            Aucun pattern critique détecté pour le moment.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {patternsData.patterns.slice(0, 3).map(pattern => (
              <div key={pattern.id} style={{
                border: '1px solid var(--border)', borderRadius: 10,
                padding: '9px 12px', background: 'var(--surface-accent)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--txt)' }}>{pattern.title}</p>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--danger-txt)' }}>{pattern.count} cas ({pattern.rate}%)</span>
                </div>
                <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--txt3)' }}>{pattern.message}</p>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--txt)' }}>Action suggérée: {pattern.recommendation}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Chart + Latest debriefs ────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : 'minmax(0,1fr) minmax(0,1fr)', gap: 12, alignItems: 'start' }}>
        <div style={{ ...glass({ padding: 16 }) }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)', marginBottom: 8 }}>Évolution du score</h2>
          <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--txt3)' }}>Vue simplifiée sur les derniers appels.</p>
          <Chart debriefs={debriefs} compact simple />
        </div>

        <div style={{ ...glass({ padding: 16 }) }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)', margin: 0 }}>Historique des derniers appels</h2>
            {debriefs.length > 0 && (
              <button onClick={() => navigate('History')} style={{ background: 'none', border: 'none', color: P, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>
                Voir tout →
              </button>
            )}
          </div>

          {latestDebriefs.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--txt3)' }}>Aucun appel debriefé pour le moment.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {latestDebriefs.map((d, idx) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => navigate('Detail', d.id)}
                  style={{
                    border: '1px solid var(--border)',
                    background: 'var(--glass-bg)',
                    borderRadius: 10,
                    padding: '9px 12px',
                    textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                    backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
                    transition: 'all .15s',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--txt)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {d.prospect_name || 'Prospect'}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--txt3)' }}>
                      {fmtDate(d.call_date || d.created_at)} · {d.closer_name || d.user_name || 'Closer'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 999,
                      background: (d.percentage || 0) >= 75 ? 'var(--positive-bg)' : 'var(--warning-bg)',
                      color: (d.percentage || 0) >= 75 ? 'var(--positive-txt)' : 'var(--warning-txt)',
                    }}>
                      {Math.round(d.percentage || 0)}%
                    </span>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 999,
                      background: d.is_closed ? 'var(--positive-bg)' : 'var(--danger-bg)',
                      color: d.is_closed ? 'var(--positive-txt)' : 'var(--danger-txt)',
                    }}>
                      {d.is_closed ? 'Closé' : 'Non closé'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Mini Pipeline ──────────────────────────────────────────────── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--txt)', margin: 0 }}>Pipeline</h2>
        </div>
        <MiniPipeline navigate={navigate} user={user} />
      </div>

      {!isHOS && <ActionPlanCard closerId={user.id} isHOS={false} toast={toast} />}
    </div>
  );
}


// ─── MINI PIPELINE ───────────────────────────────────────────────────────────
function MiniPipeline({ navigate, user }) {
  const [deals, setDeals] = React.useState([]);
  const [stages, setStages] = React.useState(DEFAULT_PIPELINE_STATUSES);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    apiFetch('/deals').then(setDeals).catch(() => {}).finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    let mounted = true;
    apiFetch('/pipeline-config')
      .then(data => {
        if (!mounted) return;
        const normalized = normalizePipelineConfig(data || {});
        setStages(normalized.statuses || DEFAULT_PIPELINE_STATUSES);
      })
      .catch(() => { if (!mounted) return; setStages(DEFAULT_PIPELINE_STATUSES); });
    return () => { mounted = false; };
  }, [user?.id]);

  if (loading) return <Spinner />;

  const closedKeys = stages.filter(stage => stage.closed).map(stage => stage.key);
  const wonKeys = stages.filter(stage => stage.won).map(stage => stage.key);
  const signed = deals.filter(d => wonKeys.includes(d.status)).reduce((s, d) => s + (d.value || 0), 0);
  const pipeline = deals.filter(d => !closedKeys.includes(d.status)).reduce((s, d) => s + (d.value || 0), 0);
  const closed = deals.filter(d => closedKeys.includes(d.status));
  const winRate = closed.length ? Math.round(deals.filter(d => wonKeys.includes(d.status)).length / closed.length * 100) : 0;
  const noDate = deals.filter(d => !(d.contact_date || d.follow_up_date)).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
        {[
          { label: 'CA Signé', value: `${signed.toLocaleString('fr-FR')} €`, color: '#059669' },
          { label: 'Pipeline', value: `${pipeline.toLocaleString('fr-FR')} €`, color: P },
          { label: 'Taux win', value: `${winRate}%`, color: 'var(--accent-violet)' },
          { label: 'Sans date', value: noDate, color: noDate > 0 ? '#D97706' : 'var(--txt3)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            ...glass({ padding: '10px 12px' }),
          }}>
            <p style={{ fontSize: 10, color: 'var(--txt3)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '.04em', fontWeight: 600 }}>{label}</p>
            <p style={{ fontSize: 17, fontWeight: 700, color, margin: 0 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Mini Kanban */}
      {deals.length > 0 && (
        <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
          <div style={{ display: 'flex', gap: 8, minWidth: 'max-content' }}>
            {stages.map(st => {
              const cols = deals.filter(d => d.status === st.key);
              if (!cols.length) return null;
              return (
                <div key={st.key} style={{ minWidth: 140, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div style={{ background: st.bg, borderRadius: 8, padding: '5px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: st.color }}>{st.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: st.color }}>{cols.length}</span>
                  </div>
                  {cols.slice(0, 3).map(d => (
                    <div key={d.id} style={{ ...glass({ padding: '8px 10px', borderRadius: 10 }) }}>
                      <p style={{ fontWeight: 600, fontSize: 12, color: 'var(--txt)', margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.prospect_name}</p>
                      {d.value > 0 && <p style={{ fontSize: 11, color: '#059669', fontWeight: 700, margin: 0 }}>{d.value.toLocaleString('fr-FR')} €</p>}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <button onClick={() => navigate('Pipeline')} style={{
        background: 'var(--glass-bg)', color: 'var(--txt)',
        border: '1px solid var(--glass-border)',
        boxShadow: 'var(--sh-sm)', padding: '8px 16px', fontSize: 13,
        borderRadius: 10, alignSelf: 'flex-end', cursor: 'pointer', fontFamily: 'inherit',
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
      }}>
        Voir tout le pipeline →
      </button>
    </div>
  );
}

// ─── HISTORY ─────────────────────────────────────────────────────────────────
function History({ debriefs, navigate, user }) {
  const [q, setQ] = useState('');
  const [resultFilter, setResultFilter] = useState('all');
  const [scoreFilter, setScoreFilter] = useState('all');
  const [objectionFilter, setObjectionFilter] = useState('all');
  const [prospectTypeFilter, setProspectTypeFilter] = useState('all');
  const isHOS = user.role === 'head_of_sales';
  const objectionOptions = [...new Set(
    debriefs.flatMap(d => (d.sections?.closing?.objections || []).filter(obj => obj && obj !== 'aucune'))
  )];
  const prospectTypeOptions = [...new Set(
    debriefs.map(d => String(d.sections?.__meta?.prospect_type || '').trim()).filter(Boolean)
  )];

  const matchesScoreFilter = (percentage, filterKey) => {
    const pct = Number(percentage || 0);
    if (filterKey === 'low') return pct < 50;
    if (filterKey === 'mid') return pct >= 50 && pct < 75;
    if (filterKey === 'high') return pct >= 75;
    return true;
  };

  const filtered = debriefs.filter(d => {
    const s = q.toLowerCase();
    const objections = (d.sections?.closing?.objections || []).filter(obj => obj && obj !== 'aucune');
    const prospectType = String(d.sections?.__meta?.prospect_type || '').trim();
    const resultMatch = resultFilter === 'all' ? true : (resultFilter === 'closed' ? !!d.is_closed : !d.is_closed);
    const scoreMatch = matchesScoreFilter(d.percentage, scoreFilter);
    const objectionMatch = objectionFilter === 'all' ? true : objections.includes(objectionFilter);
    const prospectTypeMatch = prospectTypeFilter === 'all' ? true : prospectType === prospectTypeFilter;
    const searchMatch = !s
      || d.prospect_name?.toLowerCase().includes(s)
      || d.closer_name?.toLowerCase().includes(s)
      || d.user_name?.toLowerCase().includes(s)
      || objections.some(obj => (OBJECTION_LABELS[obj] || obj).toLowerCase().includes(s))
      || PROSPECT_TYPE_LABELS[prospectType]?.toLowerCase().includes(s);
    return resultMatch && scoreMatch && objectionMatch && prospectTypeMatch && searchMatch;
  });
  const hasAdvancedFilters = resultFilter !== 'all' || scoreFilter !== 'all' || objectionFilter !== 'all' || prospectTypeFilter !== 'all';

  const selectStyle = {
    background: 'var(--glass-bg)', border: '1px solid var(--border)',
    borderRadius: 10, padding: '9px 10px', fontSize: 12,
    color: 'var(--txt)', fontFamily: 'inherit',
    backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--txt)', margin: 0 }}>Historique</h1>
        <p style={{ color: 'var(--txt3)', fontSize: 13, marginTop: 4 }}>{debriefs.length} debrief{debriefs.length !== 1 ? 's' : ''}</p>
      </div>

      <div style={{ position: 'relative' }}>
        <input placeholder="Rechercher..." value={q} onChange={e => setQ(e.target.value)} style={{
          width: '100%', padding: '11px 36px',
          border: '1px solid var(--border)', borderRadius: 10,
          fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
          background: 'var(--glass-bg)', color: 'var(--txt)',
          backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
        }} />
        {q && <button onClick={() => setQ('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--txt3)', cursor: 'pointer', fontSize: 18 }}>{'\u2715'}</button>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
        <select value={resultFilter} onChange={e => setResultFilter(e.target.value)} style={selectStyle}>
          <option value="all">Résultat: Tous</option>
          <option value="closed">Résultat: Closés</option>
          <option value="open">Résultat: Non closés</option>
        </select>
        <select value={scoreFilter} onChange={e => setScoreFilter(e.target.value)} style={selectStyle}>
          {SCORE_FILTERS.map(f => <option key={f.key} value={f.key}>Score: {f.label}</option>)}
        </select>
        <select value={objectionFilter} onChange={e => setObjectionFilter(e.target.value)} style={selectStyle}>
          <option value="all">Objection: Toutes</option>
          {objectionOptions.map(o => <option key={o} value={o}>{OBJECTION_LABELS[o] || o}</option>)}
        </select>
        <select value={prospectTypeFilter} onChange={e => setProspectTypeFilter(e.target.value)} style={selectStyle}>
          <option value="all">Type prospect: Tous</option>
          {prospectTypeOptions.map(t => <option key={t} value={t}>{PROSPECT_TYPE_LABELS[t] || t}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <Empty
          icon="🔍"
          title="Aucun résultat"
          subtitle={q ? `Aucun debrief pour "${q}"` : 'Aucun debrief'}
          action={(q || hasAdvancedFilters) ? (
            <Btn variant="secondary" onClick={() => { setQ(''); setResultFilter('all'); setScoreFilter('all'); setObjectionFilter('all'); setProspectTypeFilter('all'); }}>
              Réinitialiser les filtres
            </Btn>
          ) : null}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(d => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'stretch', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <DebriefCard debrief={d} onClick={() => navigate('Detail', d.id, 'History')} showUser={isHOS} />
              </div>
              <Btn variant="secondary" onClick={() => navigate('EditDebrief', d.id, 'History')} style={{ fontSize: 12, padding: '0 12px' }}>
                Modifier
              </Btn>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export { Dashboard, MiniPipeline, History };
