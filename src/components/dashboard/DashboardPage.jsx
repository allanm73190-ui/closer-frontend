import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { apiFetch } from '../../config/api';
import { DEFAULT_PIPELINE_STATUSES, normalizePipelineConfig } from '../../config/pipeline';
import { DS, P } from '../../styles/designSystem';
import { useIsMobile } from '../../hooks';
import { fmtDate } from '../../utils/scoring';
import { computeStreak } from '../../utils/streak';
import { Btn, Card, Spinner, Empty, ClosedBadge } from '../ui';
import { Icon } from '../ui/Icon';
import { GamCard } from '../gamification';
import { Chart } from './StatsChart';
import { ObjectiveBanner } from '../gamification/Objectives';
import { ActionPlanCard } from '../gamification/Objectives';

const OBJECTION_LABELS = {
  budget: 'Budget',
  reflechir: 'Besoin de réfléchir',
  conjoint: 'Conjoint / tiers',
  methode: 'Méthode / doute',
};
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
      .map(status => ({ key: status, label: status, icon: 'shape', color: '#64748b', bg: '#e2e8f0', closed: false, won: false }));
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
          <ClosedBadge isClosed={debrief.is_closed} compact />
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
      <div className="cd-page-flow">
        <div className="cd-hero-card">
          <p className="cd-hero-kicker">{isManager ? 'Pilotage équipe' : 'Tableau de bord'}</p>
          <h1 className="cd-hero-title">{isManager ? 'Vue équipe' : `Bonjour, ${user.name}`}</h1>
          <p className="cd-hero-subtitle">{nowLabel}</p>
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <Btn variant="secondary" onClick={() => navigate('History')} style={{ flex: 1 }}>Débriefs</Btn>
            <Btn onClick={() => navigate(isManager ? 'HOSPage' : 'NewDebrief')} style={{ flex: 1 }}>
              {isManager ? 'Mon équipe' : 'Nouveau'}
            </Btn>
          </div>
        </div>

        <div className="cd-kpi-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
          {kpis.map(kpi => (
            <div key={kpi.key} className="cd-kpi-card">
              <div className="cd-kpi-label">{kpi.label}</div>
              <div className="cd-kpi-value" style={{ fontSize: 23 }}>{kpi.value}</div>
              <div className={`cd-kpi-delta ${kpi.tone}`}>{kpi.delta}</div>
            </div>
          ))}
        </div>

        <Card className="cd-surface-muted" style={{ padding: 14 }}>
          <div className="cd-card-title">Évolution du score</div>
          <Chart debriefs={debriefs} compact simple />
        </Card>

        <Card style={{ padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div className="cd-card-title" style={{ marginBottom: 0 }}>Derniers appels debriefés</div>
            <button onClick={() => navigate('History')} style={{ border: 'none', background: 'none', color: P, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Voir tout
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {quickDebriefs.length === 0 ? <Empty icon={<Icon name="file-text" size={36} color="var(--txt3)" />} title="Aucun debrief" subtitle="Commencez avec un nouvel appel." /> : quickDebriefs.map(item => renderDebriefItem(item, true))}
          </div>
        </Card>

        <GamCard gam={gam} />
        {!isManager && <ObjectiveBanner userId={user.id} refreshTick={objectivesRefreshTick} />}
        {!isManager && <ActionPlanCard closerId={user.id} isHOS={false} toast={toast} />}
        {isManager && (
          <Card style={{ padding: 14 }}>
            <div className="cd-card-title">Détection de patterns</div>
            {renderPatterns()}
          </Card>
        )}

        <div className="cd-section-grid-2">
          <Card style={{ padding: 14 }}>
            <div className="cd-card-title">Objections fréquentes</div>
            {renderObjections()}
          </Card>
          <Card style={{ padding: 14 }}>
            <div className="cd-card-title">Pipeline</div>
            {renderPipelineMini()}
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="cd-page-flow">
      <div className="cd-hero-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div>
            <p className="cd-hero-kicker">{isManager ? 'Pilotage équipe' : 'Tableau de bord'}</p>
            <h1 className="cd-hero-title">{isManager ? 'Vue équipe' : `Bonjour, ${user.name}`}</h1>
            <p className="cd-hero-subtitle">{nowLabel}</p>
            <div style={{ marginTop: 10, display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              <span className="cd-chip">{total} debriefs</span>
              <span className="cd-chip">Score moyen {avg}%</span>
              <span className="cd-chip">{closeRate}% closing</span>
              <span className="cd-chip">{pipelineActiveCount} opportunités actives</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="secondary" onClick={() => navigate('History')}>Débriefs</Btn>
            <Btn onClick={() => navigate(isManager ? 'HOSPage' : 'NewDebrief')}>
              {isManager ? 'Mon équipe' : '+ Nouveau debrief'}
            </Btn>
          </div>
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

      <div className="cd-section-grid-2">
        <Card className="cd-surface-muted" style={{ padding: 16 }}>
          <div className="cd-card-title">Évolution du score</div>
          <Chart debriefs={debriefs} compact simple />
        </Card>
        <Card style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div className="cd-card-title" style={{ marginBottom: 0 }}>Derniers appels debriefés</div>
            <button onClick={() => navigate('History')} style={{ border: 'none', background: 'none', color: P, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Voir tout
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {quickDebriefs.length === 0 ? <Empty icon={<Icon name="file-text" size={36} color="var(--txt3)" />} title="Aucun debrief" subtitle="Commencez avec un nouvel appel." /> : quickDebriefs.map(item => renderDebriefItem(item, true))}
          </div>
        </Card>
      </div>

      <div className="cd-section-grid-3">
        <Card style={{ padding: 14, background: streak >= 3 ? 'linear-gradient(135deg, rgba(245,158,11,.16), rgba(239,68,68,.08))' : 'var(--panel-3)' }}>
          <div className="cd-card-title">Progression</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon name="flame" size={30} color={streak > 0 ? '#D97706' : 'var(--txt3)'} />
            <div>
              <div style={{ fontSize: 28, fontWeight: 900, fontFamily: "'Manrope', 'Inter', sans-serif", color: streak > 0 ? '#D97706' : 'var(--txt3)', lineHeight: 1 }}>
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
        </Card>

        <Card style={{ padding: 14 }}>
          <div className="cd-card-title">Objections fréquentes</div>
          {renderObjections()}
        </Card>

        <Card style={{ padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div className="cd-card-title" style={{ marginBottom: 0 }}>Pipeline</div>
            <button onClick={() => navigate('Pipeline')} style={{ border: 'none', background: 'none', color: P, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Ouvrir
            </button>
          </div>
          {renderPipelineMini()}
        </Card>
      </div>

      {isManager ? (
        <Card style={{ padding: 14 }}>
          <div className="cd-card-title">Détection de patterns</div>
          {renderPatterns()}
        </Card>
      ) : (
        <div className="cd-section-grid-2">
          <ObjectiveBanner userId={user.id} refreshTick={objectivesRefreshTick} />
          <ActionPlanCard closerId={user.id} isHOS={false} toast={toast} />
        </div>
      )}
    </div>
  );
}
export { Dashboard };
