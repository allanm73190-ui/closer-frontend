import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { apiFetch } from '../../config/api';
import { DEFAULT_PIPELINE_STATUSES, normalizePipelineConfig } from '../../config/pipeline';
import { DS, P, P2, R_FULL, SH_SM, cardSm } from '../../styles/designSystem';
import { useIsMobile } from '../../hooks';
import { fmtDate } from '../../utils/scoring';
import { computeStreak } from '../../utils/streak';
import { filterByPeriod, sortDebriefs, paginateDebriefs } from '../../utils/historyFilters';
import { Btn, Input, Card, Spinner, Empty, ClosedBadge } from '../ui';
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

const G = (extra = {}) => ({
  background: 'var(--glass-bg)',
  border: '1px solid var(--glass-border)',
  borderRadius: 12,
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  ...extra,
});
const Gv = (extra = {}) => ({
  background: 'var(--accent-violet-soft)',
  border: '1px solid var(--accent-violet-border)',
  borderRadius: 12,
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  ...extra,
});

// ─── BENTO DASHBOARD ─────────────────────────────────────────────────────────
function Dashboard({ debriefs, navigate, user, gam, toast, objectivesRefreshTick = 0 }) {
  const mob = useIsMobile();
  const role = String(user?.role || '').toLowerCase();
  const isManager = role === 'head_of_sales' || role === 'admin';
  const [patternsData, setPatternsData] = useState(null);
  const [patternsLoading, setPatternsLoading] = useState(true);
  const [deals, setDeals] = useState([]);
  const [stages, setStages] = useState(DEFAULT_PIPELINE_STATUSES);
  const [dealsLoading, setDealsLoading] = useState(true);

  const latestDebriefs = [...debriefs]
    .sort((a, b) => new Date(b.call_date || b.created_at || 0) - new Date(a.call_date || a.created_at || 0))
    .slice(0, 5);

  const total = debriefs.length;
  const avg = total > 0 ? Math.round(debriefs.reduce((s, d) => s + (d.percentage || 0), 0) / total) : 0;
  const streak = computeStreak(debriefs);
  const closedCount = debriefs.filter(d => d.is_closed).length;
  const closeRate = total > 0 ? Math.round((closedCount / total) * 100) : 0;

  // Objection stats from debriefs
  const objectionCounts = {};
  debriefs.forEach(d => {
    (d.sections?.closing?.objections || []).filter(o => o && o !== 'aucune').forEach(o => {
      objectionCounts[o] = (objectionCounts[o] || 0) + 1;
    });
  });
  const topObjections = Object.entries(objectionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([key, count]) => ({ key, label: OBJECTION_LABELS[key] || key, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 }));

  useEffect(() => {
    let mounted = true;
    setPatternsLoading(true);
    apiFetch('/patterns')
      .then(data => { if (mounted) setPatternsData(data); })
      .catch(() => { if (mounted) setPatternsData(null); })
      .finally(() => { if (mounted) setPatternsLoading(false); });
    return () => { mounted = false; };
  }, [user?.id]);

  const loadDeals = useCallback(async (silent = false) => {
    if (!silent) setDealsLoading(true);
    try {
      const data = await apiFetch('/deals');
      setDeals(Array.isArray(data) ? data : (data?.data || []));
    } catch {
      if (!silent) setDeals([]);
    } finally {
      if (!silent) setDealsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDeals(false);
  }, [user?.id, loadDeals]);

  useEffect(() => {
    if (!user?.id) return;
    loadDeals(true);
  }, [debriefs.length, user?.id, loadDeals]);

  useEffect(() => {
    if (!user?.id) return;
    const onDealsUpdated = () => { loadDeals(true); };
    window.addEventListener('cd:deals-updated', onDealsUpdated);
    const timer = setInterval(() => { loadDeals(true); }, 30000);
    return () => {
      window.removeEventListener('cd:deals-updated', onDealsUpdated);
      clearInterval(timer);
    };
  }, [user?.id, loadDeals]);

  useEffect(() => {
    let mounted = true;
    apiFetch('/pipeline-config')
      .then(data => {
        if (!mounted) return;
        const n = normalizePipelineConfig(data || {});
        setStages(n.statuses || DEFAULT_PIPELINE_STATUSES);
      })
      .catch(() => { if (mounted) setStages(DEFAULT_PIPELINE_STATUSES); });
    return () => { mounted = false; };
  }, [user?.id]);

  const normalizedStages = useMemo(() => {
    const list = Array.isArray(stages) ? stages : DEFAULT_PIPELINE_STATUSES;
    const known = new Set(list.map(stage => stage.key));
    const unknown = [...new Set((deals || []).map(deal => deal.status).filter(status => status && !known.has(status)))]
      .map(status => ({ key: status, label: status, icon: '🧩', color: '#64748b', bg: '#e2e8f0', closed: false, won: false }));
    return [...list, ...unknown];
  }, [stages, deals]);
  const openKey = normalizedStages.find(stage => !stage.closed)?.key || 'prospect';
  const closedKeys = normalizedStages.filter(stage => stage.closed).map(stage => stage.key);
  const dealsForStats = useMemo(
    () => (Array.isArray(deals) ? deals : []).map(deal => ({ ...deal, status: deal?.status || openKey })),
    [deals, openKey]
  );
  const pipelineActiveCount = dealsForStats.filter(deal => !closedKeys.includes(deal.status)).length;
  const pipelineActiveValue = dealsForStats
    .filter(deal => !closedKeys.includes(deal.status))
    .reduce((sum, deal) => sum + (deal.value || 0), 0);
  const pipelineCounts = normalizedStages.map(st => ({
    ...st,
    count: dealsForStats.filter(d => d.status === st.key).length,
  })).filter(s => s.count > 0);

  const gamPct = gam?.level?.next
    ? Math.min(Math.round(((gam.points - gam.level.min) / (gam.level.next - gam.level.min)) * 100), 100)
    : 100;

  const nowLabel = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  const kpis = [
    {
      key: 'debriefs',
      label: isManager ? 'Débriefs équipe' : 'Débriefs ce mois',
      value: total,
      delta: total > 0 ? `+${Math.min(total, 12)} actifs` : 'Aucune donnée',
      tone: total > 0 ? 'up' : 'warn',
    },
    {
      key: 'score',
      label: 'Score moyen',
      value: `${avg}%`,
      delta: avg >= 75 ? 'Très bon niveau' : avg >= 60 ? 'À consolider' : 'Priorité coaching',
      tone: avg >= 75 ? 'up' : avg >= 60 ? 'warn' : 'down',
    },
    {
      key: 'closing',
      label: 'Taux de closing',
      value: `${closeRate}%`,
      delta: closeRate >= 35 ? 'Trajectoire positive' : 'Potentiel à débloquer',
      tone: closeRate >= 35 ? 'up' : 'warn',
    },
    {
      key: 'pipeline',
      label: 'Pipeline actif',
      value: `${pipelineActiveValue.toLocaleString('fr-FR')}€`,
      delta: `${pipelineActiveCount} opportunité${pipelineActiveCount > 1 ? 's' : ''}`,
      tone: pipelineActiveCount > 0 ? 'up' : 'warn',
    },
  ];

  const quickDebriefs = latestDebriefs;

  const renderDebriefItem = (debrief, compact = false) => {
    const pct = Math.round(debrief.percentage || 0);
    const scoreColor = pct >= 75 ? '#059669' : pct >= 60 ? '#D97706' : '#DC2626';
    return (
      <button
        key={debrief.id}
        type="button"
        onClick={() => navigate('Detail', debrief.id)}
        style={{
          width: '100%',
          border: '1px solid var(--border)',
          background: 'var(--card-soft)',
          borderRadius: 10,
          padding: compact ? '8px 9px' : '9px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          textAlign: 'left',
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        <div style={{ width: 34, height: 34, borderRadius: 8, background: `${scoreColor}16`, color: scoreColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
          {pct}%
        </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {debrief.prospect_name || 'Prospect'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--txt3)' }}>{fmtDate(debrief.call_date || debrief.created_at)}</div>
          </div>
          <ClosedBadge v={debrief.is_closed} compact />
        </button>
      );
  };

  const renderObjections = () => (
    topObjections.length === 0 ? (
      <div style={{ fontSize: 12, color: 'var(--txt3)' }}>Aucune objection remontée.</div>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {topObjections.map(objection => {
          const accent = objection.key === 'budget' ? '#DC2626' : objection.key === 'reflechir' ? '#D97706' : '#7C3AED';
          return (
            <div key={objection.key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: 'var(--txt2)', fontWeight: 600 }}>{objection.label}</span>
                <span style={{ fontSize: 11, color: accent, fontWeight: 700 }}>{objection.count}</span>
              </div>
              <div style={{ height: 5, borderRadius: 999, background: 'var(--surface-b)', overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(objection.pct, 100)}%`, height: '100%', background: accent }} />
              </div>
            </div>
          );
        })}
      </div>
    )
  );

  const renderPatterns = () => (
    patternsLoading ? (
      <Spinner size={18} />
    ) : (!patternsData?.patterns || patternsData.patterns.length === 0) ? (
      <div style={{ fontSize: 12, color: 'var(--txt3)' }}>Aucun pattern critique détecté.</div>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {patternsData.patterns.slice(0, 4).map(pattern => (
          <div key={pattern.id} style={{ border: '1px solid var(--border)', borderRadius: 9, padding: '9px 10px', background: 'var(--card-soft)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt)' }}>{pattern.title}</div>
            <div style={{ fontSize: 12, color: 'var(--txt3)', marginTop: 3 }}>{pattern.recommendation}</div>
          </div>
        ))}
      </div>
    )
  );

  const renderPipelineMini = () => (
    dealsLoading ? (
      <Spinner size={18} />
    ) : pipelineCounts.length === 0 ? (
      <div style={{ fontSize: 12, color: 'var(--txt3)' }}>Aucun lead en pipeline.</div>
    ) : (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
        {pipelineCounts.slice(0, 6).map(stage => (
          <div key={stage.key} style={{ border: '1px solid var(--border)', background: 'var(--card-soft)', borderRadius: 9, padding: '8px 9px' }}>
            <div style={{ fontSize: 10, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 700 }}>
              {stage.label}
            </div>
            <div style={{ marginTop: 4, fontSize: 18, fontWeight: 800, color: stage.color }}>
              {stage.count}
            </div>
          </div>
        ))}
      </div>
    )
  );

  if (mob) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="cd-card">
          <div style={{ fontSize: 21, fontWeight: 800, fontFamily: "'Manrope', 'Inter', sans-serif", color: 'var(--txt)' }}>
            {isManager ? 'Vue équipe' : `Bonjour, ${user.name} 👋`}
          </div>
          <div style={{ marginTop: 3, fontSize: 12, color: 'var(--txt3)' }}>{nowLabel}</div>
          <Btn onClick={() => navigate(isManager ? 'HOSPage' : 'NewDebrief')} style={{ marginTop: 12, width: '100%' }}>
            {isManager ? 'Espace équipe' : '+ Nouveau debrief'}
          </Btn>
        </div>

        <div className="cd-kpi-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
          {kpis.map(kpi => (
            <div key={kpi.key} className="cd-kpi-card">
              <div className="cd-kpi-label">{kpi.label}</div>
              <div className="cd-kpi-value" style={{ fontSize: 24 }}>{kpi.value}</div>
              <div className={`cd-kpi-delta ${kpi.tone}`}>{kpi.delta}</div>
            </div>
          ))}
        </div>

        <GamCard gam={gam} />
        {!isManager && <ObjectiveBanner userId={user.id} refreshTick={objectivesRefreshTick} />}

        <div className="cd-card">
          <div className="cd-card-title">Évolution du score</div>
          <Chart debriefs={debriefs} compact simple />
        </div>

        <div className="cd-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div className="cd-card-title" style={{ marginBottom: 0 }}>Derniers appels debriefés</div>
            <button onClick={() => navigate('History')} style={{ border: 'none', background: 'none', color: P, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Voir tout
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {quickDebriefs.length === 0 ? <Empty icon="📋" title="Aucun debrief" subtitle="Commencez avec un nouvel appel." /> : quickDebriefs.map(item => renderDebriefItem(item, true))}
          </div>
        </div>

        {isManager && (
          <div className="cd-card">
            <div className="cd-card-title">Détection de patterns</div>
            {renderPatterns()}
          </div>
        )}

        <div className="cd-card">
          <div className="cd-card-title">Objections fréquentes</div>
          {renderObjections()}
        </div>

        <div className="cd-card">
          <div className="cd-card-title">Pipeline</div>
          {renderPipelineMini()}
        </div>

        {!isManager && <ActionPlanCard closerId={user.id} isHOS={false} toast={toast} />}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <div className="page-title" style={{ fontSize: 28 }}>
            {isManager ? 'Vue équipe' : `Bonjour, ${user.name} 👋`}
          </div>
          <div className="page-subtitle">{nowLabel}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="secondary" onClick={() => navigate('History')}>Débriefs</Btn>
          <Btn onClick={() => navigate(isManager ? 'HOSPage' : 'NewDebrief')}>
            {isManager ? 'Mon équipe' : '+ Nouveau debrief'}
          </Btn>
        </div>
      </div>

      <div className="cd-kpi-grid">
        {kpis.map(kpi => (
          <div key={kpi.key} className="cd-kpi-card">
            <div className="cd-kpi-label">{kpi.label}</div>
            <div className="cd-kpi-value">{kpi.value}</div>
            <div className={`cd-kpi-delta ${kpi.tone}`}>{kpi.delta}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12, alignItems: 'start' }}>
        <div className="cd-card">
          <div className="cd-card-title">Évolution du score</div>
          <Chart debriefs={debriefs} compact simple />
        </div>

        <div className="cd-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div className="cd-card-title" style={{ marginBottom: 0 }}>Derniers appels debriefés</div>
            <button onClick={() => navigate('History')} style={{ border: 'none', background: 'none', color: P, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Voir tout
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {quickDebriefs.length === 0 ? <Empty icon="📋" title="Aucun debrief" subtitle="Commencez avec un nouvel appel." /> : quickDebriefs.map(item => renderDebriefItem(item, true))}
          </div>
        </div>
      </div>

      <div className="cd-grid-aside">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {!isManager && <ObjectiveBanner userId={user.id} refreshTick={objectivesRefreshTick} />}
          {!isManager && <ActionPlanCard closerId={user.id} isHOS={false} toast={toast} />}
          {isManager && (
            <div className="cd-card">
              <div className="cd-card-title">Détection de patterns</div>
              {renderPatterns()}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="cd-card" style={{ background: streak >= 3 ? 'linear-gradient(135deg, rgba(245,158,11,.12), rgba(239,68,68,.06))' : 'var(--card)' }}>
            <div className="cd-card-title">Progression</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 34, lineHeight: 1 }}>{streak >= 7 ? '🔥' : streak >= 3 ? '⚡' : '🎯'}</div>
              <div>
                <div style={{ fontSize: 30, fontWeight: 900, fontFamily: "'Manrope', 'Inter', sans-serif", color: streak > 0 ? '#D97706' : 'var(--txt3)', lineHeight: 1 }}>
                  {streak}
                </div>
                <div style={{ fontSize: 11, color: 'var(--txt3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                  Jour{streak > 1 ? 's' : ''} de streak
                </div>
              </div>
            </div>
            <div style={{ marginTop: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--txt3)', marginBottom: 4 }}>
                <span>{gam?.points || 0} XP</span>
                <span>{gam?.level?.next || gam?.points || 0} XP</span>
              </div>
              <div style={{ height: 7, borderRadius: 999, background: 'var(--surface-b)', overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(gamPct, 100)}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent-violet), var(--accent))' }} />
              </div>
            </div>
          </div>

          <div className="cd-card">
            <div className="cd-card-title">Objections fréquentes</div>
            {renderObjections()}
          </div>

          <div className="cd-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div className="cd-card-title" style={{ marginBottom: 0 }}>Pipeline</div>
              <button onClick={() => navigate('Pipeline')} style={{ border: 'none', background: 'none', color: P, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                Ouvrir
              </button>
            </div>
            {renderPipelineMini()}
          </div>
        </div>
      </div>
    </div>
  );
}


// ─── MINI PIPELINE (kept for backward compat if referenced elsewhere) ────────
function MiniPipeline({ navigate, user }) {
  const [deals, setDeals] = React.useState([]);
  const [stages, setStages] = React.useState(DEFAULT_PIPELINE_STATUSES);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    apiFetch('/deals').then(r => setDeals(Array.isArray(r) ? r : (r?.data || []))).catch(() => {}).finally(() => setLoading(false));
  }, []);
  React.useEffect(() => {
    let mounted = true;
    apiFetch('/pipeline-config')
      .then(data => { if (!mounted) return; setStages(normalizePipelineConfig(data || {}).statuses || DEFAULT_PIPELINE_STATUSES); })
      .catch(() => { if (!mounted) return; setStages(DEFAULT_PIPELINE_STATUSES); });
    return () => { mounted = false; };
  }, [user?.id]);

  if (loading) return <Spinner />;
  const closedKeys = stages.filter(s => s.closed).map(s => s.key);
  const wonKeys = stages.filter(s => s.won).map(s => s.key);
  const openKey = stages.find(s => !s.closed)?.key || 'prospect';
  const dealsForStats = (Array.isArray(deals) ? deals : []).map(deal => ({ ...deal, status: deal?.status || openKey }));
  const signed = dealsForStats.filter(d => wonKeys.includes(d.status)).reduce((s, d) => s + (d.value || 0), 0);
  const pipeline = dealsForStats.filter(d => !closedKeys.includes(d.status)).reduce((s, d) => s + (d.value || 0), 0);
  const closed = dealsForStats.filter(d => closedKeys.includes(d.status));
  const winRate = closed.length ? Math.round(dealsForStats.filter(d => wonKeys.includes(d.status)).length / closed.length * 100) : 0;

  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {[
        { label: 'CA Signé', value: `${signed.toLocaleString('fr-FR')}€`, color: '#059669' },
        { label: 'Pipeline', value: `${pipeline.toLocaleString('fr-FR')}€`, color: P },
        { label: 'Taux win', value: `${winRate}%`, color: 'var(--accent-violet)' },
      ].map(({ label, value, color }) => (
        <div key={label} style={{ flex: 1, ...G({ padding: '10px 12px' }) }}>
          <div style={{ fontSize: 10, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '.04em', fontWeight: 600, marginBottom: 3 }}>{label}</div>
          <div style={{ fontSize: 16, fontWeight: 700, color }}>{value}</div>
        </div>
      ))}
    </div>
  );
}


// ─── HISTORY ─────────────────────────────────────────────────────────────────
function History({ debriefs, navigate, user }) {
  const mob = useIsMobile();
  const [q, setQ] = useState('');
  const [resultFilter, setResultFilter] = useState('all');
  const [scoreFilter, setScoreFilter] = useState('all');
  const [objectionFilter, setObjectionFilter] = useState('all');
  const [prospectTypeFilter, setProspectTypeFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const isManager = ['head_of_sales', 'admin'].includes(String(user?.role || '').toLowerCase());
  const objectionOptions = [...new Set(debriefs.flatMap(d => (d.sections?.closing?.objections || []).filter(o => o && o !== 'aucune')))];
  const prospectTypeOptions = [...new Set(debriefs.map(d => String(d.sections?.__meta?.prospect_type || '').trim()).filter(Boolean))];
  const matchesScoreFilter = (pct, key) => key === 'low' ? pct < 50 : key === 'mid' ? pct >= 50 && pct < 75 : key === 'high' ? pct >= 75 : true;

  const allFiltered = sortDebriefs(
    filterByPeriod(debriefs, periodFilter).filter(d => {
      const s = q.toLowerCase();
      const objs = (d.sections?.closing?.objections || []).filter(o => o && o !== 'aucune');
      const pt = String(d.sections?.__meta?.prospect_type || '').trim();
      return (resultFilter === 'all' ? true : resultFilter === 'closed' ? !!d.is_closed : !d.is_closed)
        && matchesScoreFilter(d.percentage, scoreFilter)
        && (objectionFilter === 'all' || objs.includes(objectionFilter))
        && (prospectTypeFilter === 'all' || pt === prospectTypeFilter)
        && (!s || d.prospect_name?.toLowerCase().includes(s) || d.closer_name?.toLowerCase().includes(s) || d.user_name?.toLowerCase().includes(s));
    }), sortBy, 'desc');
  const filtered = paginateDebriefs(allFiltered, page, PAGE_SIZE);
  const hasMore = filtered.length < allFiltered.length;
  const hasFilters = resultFilter !== 'all' || scoreFilter !== 'all' || objectionFilter !== 'all' || prospectTypeFilter !== 'all' || periodFilter !== 'all';
  const sel = { background: 'var(--glass-bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 10px', fontSize: 12, color: 'var(--txt)', fontFamily: 'inherit', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--txt)', margin: 0 }}>Historique</h1>
        <p style={{ color: 'var(--txt3)', fontSize: 13, marginTop: 4 }}>{allFiltered.length} / {debriefs.length} debrief{debriefs.length !== 1 ? 's' : ''}</p>
      </div>
      <div style={{ position: 'relative' }}>
        <input placeholder="Rechercher..." value={q} onChange={e => setQ(e.target.value)} style={{ width: '100%', padding: '11px 14px', border: '1px solid var(--border)', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', background: 'var(--glass-bg)', color: 'var(--txt)', backdropFilter: 'blur(4px)' }} />
        {q && <button onClick={() => setQ('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--txt3)', cursor: 'pointer', fontSize: 18 }}>{'\u2715'}</button>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
        <select value={periodFilter} onChange={e => { setPeriodFilter(e.target.value); setPage(1); }} style={sel}><option value="all">Période: Toutes</option><option value="month">Ce mois</option><option value="quarter">Ce trimestre</option><option value="year">Cette année</option></select>
        <select value={resultFilter} onChange={e => { setResultFilter(e.target.value); setPage(1); }} style={sel}><option value="all">Résultat: Tous</option><option value="closed">Closés</option><option value="open">Non closés</option></select>
        <select value={scoreFilter} onChange={e => { setScoreFilter(e.target.value); setPage(1); }} style={sel}>{SCORE_FILTERS.map(f => <option key={f.key} value={f.key}>Score: {f.label}</option>)}</select>
        <select value={objectionFilter} onChange={e => { setObjectionFilter(e.target.value); setPage(1); }} style={sel}><option value="all">Objection: Toutes</option>{objectionOptions.map(o => <option key={o} value={o}>{OBJECTION_LABELS[o] || o}</option>)}</select>
        <select value={prospectTypeFilter} onChange={e => { setProspectTypeFilter(e.target.value); setPage(1); }} style={sel}><option value="all">Type: Tous</option>{prospectTypeOptions.map(t => <option key={t} value={t}>{PROSPECT_TYPE_LABELS[t] || t}</option>)}</select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={sel}><option value="date">Tri: Date</option><option value="score">Tri: Score</option><option value="prospect">Tri: Prospect</option></select>
      </div>
      {filtered.length === 0 ? (
        <Empty icon={'🔍'} title="Aucun résultat" subtitle={q ? `Aucun debrief pour "${q}"` : 'Aucun debrief'} action={(q || hasFilters) ? <Btn variant="secondary" onClick={() => { setQ(''); setResultFilter('all'); setScoreFilter('all'); setObjectionFilter('all'); setProspectTypeFilter('all'); setPeriodFilter('all'); setSortBy('date'); setPage(1); }}>Réinitialiser</Btn> : null} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(d => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'stretch', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}><DebriefCard debrief={d} onClick={() => navigate('Detail', d.id, 'History')} showUser={isManager} /></div>
              <Btn variant="secondary" onClick={() => navigate('EditDebrief', d.id, 'History')} style={{ fontSize: 12, padding: '0 12px' }}>Modifier</Btn>
            </div>
          ))}
          {hasMore && (
            <Btn variant="secondary" onClick={() => setPage(p => p + 1)} style={{ alignSelf: 'center', marginTop: 4 }}>
              Charger plus ({allFiltered.length - filtered.length} restants)
            </Btn>
          )}
        </div>
      )}
    </div>
  );
}


export { Dashboard, MiniPipeline, History };
