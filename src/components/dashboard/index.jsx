import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { apiFetch } from '../../config/api';
import { DEFAULT_PIPELINE_STATUSES, normalizePipelineConfig } from '../../config/pipeline';
import { DS, P, P2, R_FULL, SH_SM, cardSm } from '../../styles/designSystem';
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
function Dashboard({ debriefs, navigate, user, gam, toast }) {
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
    .slice(0, 4);

  const total = debriefs.length;
  const avg = total > 0 ? Math.round(debriefs.reduce((s, d) => s + (d.percentage || 0), 0) / total) : 0;
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
      setDeals(Array.isArray(data) ? data : []);
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
  const closedKeys = normalizedStages.filter(stage => stage.closed).map(stage => stage.key);
  const openStages = normalizedStages.filter(stage => !stage.closed);
  const pipelineCounts = openStages.map(st => ({
    ...st,
    count: deals.filter(d => d.status === st.key).length,
  })).filter(s => s.count > 0).slice(0, 4);

  const gamPct = gam?.level?.next
    ? Math.min(Math.round(((gam.points - gam.level.min) / (gam.level.next - gam.level.min)) * 100), 100)
    : 100;

  // ─── MOBILE LAYOUT (stacked) ───────────────────────────────────────────────
  if (mob) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ ...G({ padding: '16px 14px' }) }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--txt)' }}>Bonjour, {user.name}</div>
          <div style={{ fontSize: 12, color: 'var(--txt2)', marginTop: 2 }}>{debriefs.length} debriefs · Pipeline: {deals.filter(d => !closedKeys.includes(d.status)).length} leads</div>
          <Btn onClick={() => navigate('NewDebrief')} style={{ marginTop: 12, width: '100%' }}>+ Nouveau debrief</Btn>
        </div>
        <GamCard gam={gam} />
        {!isManager && <ObjectiveBanner userId={user.id} />}
        <StatsRow debriefs={debriefs} />
        <div style={{ ...G({ padding: 14 }) }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)', marginBottom: 8 }}>Évolution</div>
          <Chart debriefs={debriefs} compact simple />
        </div>
        <div style={{ ...G({ padding: 14 }) }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)' }}>Derniers debriefs</span>
            <button onClick={() => navigate('History')} style={{ background: 'none', border: 'none', color: P, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Tout voir</button>
          </div>
          {latestDebriefs.map(d => (
            <div key={d.id} style={{ marginBottom: 6 }}>
              <DebriefCard debrief={d} onClick={() => navigate('Detail', d.id)} showUser={isManager} />
            </div>
          ))}
        </div>
        {!isManager && <ActionPlanCard closerId={user.id} isHOS={false} toast={toast} />}
      </div>
    );
  }

  // ─── DESKTOP BENTO GRID ────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── Header row ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--txt)', letterSpacing: '-.02em' }}>Bonjour, {user.name}</div>
          <div style={{ fontSize: 12, color: 'var(--txt2)', marginTop: 2 }}>{total} debriefs · Score moyen {avg}% · Pipeline: {deals.filter(d => !closedKeys.includes(d.status)).reduce((s, d) => s + (d.value || 0), 0).toLocaleString('fr-FR')}€</div>
        </div>
        <Btn onClick={() => navigate('NewDebrief')}>+ Nouveau debrief</Btn>
      </div>

      {/* ── Bento grid ─────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gridAutoRows: 'minmax(76px, auto)', gap: 10 }}>

        {/* Row 1: 4 stat cards */}
        <div style={{ gridColumn: 'span 3', ...G({ padding: 14, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }) }}>
          <div style={{ fontSize: 11, color: 'var(--txt3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>Debriefs</div>
          <div>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--txt)', lineHeight: 1, letterSpacing: '-.02em' }}>{total}</div>
            {debriefs.length > 0 && <div style={{ fontSize: 11, color: P, marginTop: 4 }}>+{Math.min(total, 12)} ce mois</div>}
          </div>
        </div>

        <div style={{ gridColumn: 'span 3', ...G({ padding: 14, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }) }}>
          <div style={{ fontSize: 11, color: 'var(--txt3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>Score moyen</div>
          <div>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--txt)', lineHeight: 1, letterSpacing: '-.02em' }}>{avg}%</div>
            <div style={{ fontSize: 11, color: '#059669', marginTop: 4 }}>
              {(() => {
                const sorted = [...debriefs].sort((a, b) => new Date(b.call_date) - new Date(a.call_date));
                const rA = sorted.slice(0, 3).reduce((s, d) => s + (d.percentage || 0), 0) / Math.max(sorted.slice(0, 3).length, 1);
                const pA = sorted.slice(3, 6).reduce((s, d) => s + (d.percentage || 0), 0) / Math.max(sorted.slice(3, 6).length, 1);
                const t = sorted.slice(3, 6).length > 0 ? Math.round(rA - pA) : 0;
                return t >= 0 ? `+${t}pts` : `${t}pts`;
              })()}
            </div>
          </div>
        </div>

        <div style={{ gridColumn: 'span 3', ...G({ padding: 14, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }) }}>
          <div style={{ fontSize: 11, color: 'var(--txt3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>Taux closing</div>
          <div>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--txt)', lineHeight: 1, letterSpacing: '-.02em' }}>{closeRate}%</div>
            <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 4 }}>Objectif: 40%</div>
          </div>
        </div>

        {/* Gamification mini card */}
        <div style={{ gridColumn: 'span 3', ...Gv({ padding: 14, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }) }}>
          {gam ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 16, height: 16, borderRadius: 4, background: 'rgba(124,58,237,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: 'var(--accent-violet)', fontWeight: 700 }}>{gam.level?.icon || 'N'}</div>
                <span style={{ fontSize: 11, color: 'var(--accent-violet)', fontWeight: 500 }}>{gam.level?.name || 'Niveau'}</span>
              </div>
              <div>
                <div style={{ height: 4, borderRadius: 2, background: 'rgba(200,160,140,.08)', marginTop: 6 }}><div style={{ width: `${gamPct}%`, height: '100%', background: 'var(--accent-violet)', borderRadius: 2 }} /></div>
                <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 4 }}>{gam.points}{gam.level?.next ? `/${gam.level.next}` : ''} XP</div>
              </div>
            </>
          ) : (
            <div style={{ fontSize: 11, color: 'var(--txt3)' }}>Chargement...</div>
          )}
        </div>

        {/* Row 2-3: Chart (span 8x2) + IA Insights (span 4x2) */}
        <div style={{ gridColumn: 'span 8', gridRow: 'span 2', ...G({ padding: 14, display: 'flex', flexDirection: 'column' }) }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt)' }}>Évolution des scores</span>
            <div style={{ display: 'flex', gap: 3 }}>
              <span style={{ padding: '2px 7px', borderRadius: 4, background: 'var(--surface-accent)', fontSize: 11, color: P, fontWeight: 500 }}>7j</span>
              <span style={{ padding: '2px 7px', borderRadius: 4, fontSize: 11, color: 'var(--txt3)' }}>30j</span>
              <span style={{ padding: '2px 7px', borderRadius: 4, fontSize: 11, color: 'var(--txt3)' }}>90j</span>
            </div>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <Chart debriefs={debriefs} compact simple />
          </div>
        </div>

        <div style={{ gridColumn: 'span 4', gridRow: 'span 2', ...Gv({ padding: 14, display: 'flex', flexDirection: 'column' }) }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
            <div style={{ width: 16, height: 16, borderRadius: 4, background: 'rgba(124,58,237,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--accent-violet)' }}>A</div>
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--accent-violet)' }}>IA Insights</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--txt2)', lineHeight: 1.65, flex: 1 }}>
            {patternsLoading ? (
              <Spinner size={18} />
            ) : (!patternsData?.patterns || patternsData.patterns.length === 0) ? (
              <span>Aucun pattern critique détecté pour le moment.</span>
            ) : (
              patternsData.patterns.slice(0, 2).map(p => (
                <div key={p.id} style={{ marginBottom: 8 }}>
                  <span style={{ fontWeight: 600, color: 'var(--txt)' }}>{p.title}</span>
                  <span style={{ color: 'var(--txt3)' }}> \u2014 {p.recommendation}</span>
                </div>
              ))
            )}
            <div
              onClick={() => navigate('History')}
              style={{ padding: '5px 10px', borderRadius: 7, background: 'rgba(124,58,237,.06)', border: '1px solid var(--accent-violet-border)', fontSize: 11, color: 'var(--accent-violet)', marginTop: 6, cursor: 'pointer', display: 'inline-block' }}
            >
              Analyse complète
            </div>
          </div>
        </div>

        {/* Row 4: Debriefs (span 5) + Pipeline (span 4) + Objections (span 3) */}
        <div style={{ gridColumn: 'span 5', ...G({ padding: 14 }) }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt)' }}>Derniers debriefs</span>
            <button onClick={() => navigate('History')} style={{ background: 'none', border: 'none', color: P, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Tout voir</button>
          </div>
          {latestDebriefs.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--txt3)', padding: '8px 0' }}>Aucun debrief.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {latestDebriefs.map(d => {
                const pct = Math.round(d.percentage || 0);
                const col = pct >= 75 ? '#059669' : pct >= 50 ? '#D97706' : '#DC2626';
                return (
                  <button key={d.id} type="button" onClick={() => navigate('Detail', d.id)} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
                    borderRadius: 8, background: 'rgba(255,255,255,.4)', border: 'none',
                    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', width: '100%',
                    transition: 'background .15s',
                  }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: `${col}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: col, fontWeight: 500, flexShrink: 0 }}>
                      {(d.prospect_name || 'P').substring(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.prospect_name || 'Prospect'}</div>
                      <div style={{ fontSize: 11, color: 'var(--txt3)' }}>{fmtDate(d.call_date || d.created_at)}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <div style={{ width: 36, height: 3, borderRadius: 2, background: 'rgba(200,160,140,.08)' }}><div style={{ width: `${pct}%`, height: '100%', background: col, borderRadius: 2 }} /></div>
                      <span style={{ fontSize: 12, color: col, fontWeight: 600, minWidth: 28, textAlign: 'right' }}>{pct}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ gridColumn: 'span 4', ...G({ padding: 14 }) }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt)' }}>Pipeline</span>
            <button onClick={() => navigate('Pipeline')} style={{ background: 'none', border: 'none', color: P, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Ouvrir</button>
          </div>
          {dealsLoading ? <Spinner size={18} /> : (
            <div style={{ display: 'flex', gap: 5 }}>
              {pipelineCounts.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--txt3)' }}>Aucun lead.</div>
              ) : pipelineCounts.map(st => (
                <div key={st.key} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--txt3)', marginBottom: 3 }}>{st.label?.split(' ')[0] || st.key}</div>
                  <div style={{
                    height: 32, borderRadius: 7,
                    background: `${st.color}10`, border: `1px solid ${st.color}20`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 600, color: st.color,
                  }}>{st.count}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ gridColumn: 'span 3', ...G({ padding: 14 }) }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt)', marginBottom: 8 }}>Objections top</div>
          {topObjections.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--txt3)' }}>Aucune objection.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {topObjections.map(o => {
                const col = o.key === 'budget' ? 'rgba(220,38,38,.35)' : o.key === 'reflechir' ? 'rgba(217,119,6,.35)' : 'rgba(124,58,237,.3)';
                return (
                  <div key={o.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(200,160,140,.06)' }}>
                      <div style={{ width: `${o.pct}%`, height: '100%', background: col, borderRadius: 2 }} />
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--txt2)', minWidth: 50 }}>{o.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Action plan (below bento) ──────────────────────────────────── */}
      {!isManager && <ActionPlanCard closerId={user.id} isHOS={false} toast={toast} />}
    </div>
  );
}


// ─── MINI PIPELINE (kept for backward compat if referenced elsewhere) ────────
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
      .then(data => { if (!mounted) return; setStages(normalizePipelineConfig(data || {}).statuses || DEFAULT_PIPELINE_STATUSES); })
      .catch(() => { if (!mounted) return; setStages(DEFAULT_PIPELINE_STATUSES); });
    return () => { mounted = false; };
  }, [user?.id]);

  if (loading) return <Spinner />;
  const closedKeys = stages.filter(s => s.closed).map(s => s.key);
  const wonKeys = stages.filter(s => s.won).map(s => s.key);
  const signed = deals.filter(d => wonKeys.includes(d.status)).reduce((s, d) => s + (d.value || 0), 0);
  const pipeline = deals.filter(d => !closedKeys.includes(d.status)).reduce((s, d) => s + (d.value || 0), 0);
  const closed = deals.filter(d => closedKeys.includes(d.status));
  const winRate = closed.length ? Math.round(deals.filter(d => wonKeys.includes(d.status)).length / closed.length * 100) : 0;

  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {[
        { label: 'CA Signé', value: `${signed.toLocaleString('fr-FR')}€`, color: '#059669' },
        { label: 'Pipeline', value: `${pipeline.toLocaleString('fr-FR')}\u20ac`, color: P },
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
  const isManager = ['head_of_sales', 'admin'].includes(String(user?.role || '').toLowerCase());
  const objectionOptions = [...new Set(debriefs.flatMap(d => (d.sections?.closing?.objections || []).filter(o => o && o !== 'aucune')))];
  const prospectTypeOptions = [...new Set(debriefs.map(d => String(d.sections?.__meta?.prospect_type || '').trim()).filter(Boolean))];
  const matchesScoreFilter = (pct, key) => key === 'low' ? pct < 50 : key === 'mid' ? pct >= 50 && pct < 75 : key === 'high' ? pct >= 75 : true;

  const filtered = debriefs.filter(d => {
    const s = q.toLowerCase();
    const objs = (d.sections?.closing?.objections || []).filter(o => o && o !== 'aucune');
    const pt = String(d.sections?.__meta?.prospect_type || '').trim();
    return (resultFilter === 'all' ? true : resultFilter === 'closed' ? !!d.is_closed : !d.is_closed)
      && matchesScoreFilter(d.percentage, scoreFilter)
      && (objectionFilter === 'all' || objs.includes(objectionFilter))
      && (prospectTypeFilter === 'all' || pt === prospectTypeFilter)
      && (!s || d.prospect_name?.toLowerCase().includes(s) || d.closer_name?.toLowerCase().includes(s) || d.user_name?.toLowerCase().includes(s));
  });
  const hasFilters = resultFilter !== 'all' || scoreFilter !== 'all' || objectionFilter !== 'all' || prospectTypeFilter !== 'all';
  const sel = { background: 'var(--glass-bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 10px', fontSize: 12, color: 'var(--txt)', fontFamily: 'inherit', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--txt)', margin: 0 }}>Historique</h1>
        <p style={{ color: 'var(--txt3)', fontSize: 13, marginTop: 4 }}>{debriefs.length} debrief{debriefs.length !== 1 ? 's' : ''}</p>
      </div>
      <div style={{ position: 'relative' }}>
        <input placeholder="Rechercher..." value={q} onChange={e => setQ(e.target.value)} style={{ width: '100%', padding: '11px 14px', border: '1px solid var(--border)', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', background: 'var(--glass-bg)', color: 'var(--txt)', backdropFilter: 'blur(4px)' }} />
        {q && <button onClick={() => setQ('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--txt3)', cursor: 'pointer', fontSize: 18 }}>{'\u2715'}</button>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
        <select value={resultFilter} onChange={e => setResultFilter(e.target.value)} style={sel}><option value="all">Résultat: Tous</option><option value="closed">Closés</option><option value="open">Non closés</option></select>
        <select value={scoreFilter} onChange={e => setScoreFilter(e.target.value)} style={sel}>{SCORE_FILTERS.map(f => <option key={f.key} value={f.key}>Score: {f.label}</option>)}</select>
        <select value={objectionFilter} onChange={e => setObjectionFilter(e.target.value)} style={sel}><option value="all">Objection: Toutes</option>{objectionOptions.map(o => <option key={o} value={o}>{OBJECTION_LABELS[o] || o}</option>)}</select>
        <select value={prospectTypeFilter} onChange={e => setProspectTypeFilter(e.target.value)} style={sel}><option value="all">Type: Tous</option>{prospectTypeOptions.map(t => <option key={t} value={t}>{PROSPECT_TYPE_LABELS[t] || t}</option>)}</select>
      </div>
      {filtered.length === 0 ? (
        <Empty icon={'🔍'} title="Aucun résultat" subtitle={q ? `Aucun debrief pour "${q}"` : 'Aucun debrief'} action={(q || hasFilters) ? <Btn variant="secondary" onClick={() => { setQ(''); setResultFilter('all'); setScoreFilter('all'); setObjectionFilter('all'); setProspectTypeFilter('all'); }}>Réinitialiser</Btn> : null} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(d => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'stretch', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}><DebriefCard debrief={d} onClick={() => navigate('Detail', d.id, 'History')} showUser={isManager} /></div>
              <Btn variant="secondary" onClick={() => navigate('EditDebrief', d.id, 'History')} style={{ fontSize: 12, padding: '0 12px' }}>Modifier</Btn>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


export { Dashboard, MiniPipeline, History };
