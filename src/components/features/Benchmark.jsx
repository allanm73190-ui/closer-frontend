import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../config/api';
import { DS, cardSm } from '../../styles/designSystem';
import { useIsMobile } from '../../hooks';
import { avgSectionScores } from '../../utils/scoring';
import { Btn, Card, Empty, Spinner } from '../ui';
import { Icon } from '../ui/Icon';
import { Radar, SectionBars } from '../ui/Charts';
import { Chart } from '../dashboard/StatsChart';

const PERIOD_OPTIONS = [
  { key:'30d', label:'30 jours', days:30 },
  { key:'60d', label:'60 jours', days:60 },
  { key:'12c', label:'12 appels', calls:12 },
];

function toDate(value) {
  const date = new Date(value || 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

function sortByDateDesc(list) {
  return [...(list || [])].sort((a, b) => {
    const da = toDate(a.call_date || a.created_at)?.getTime() || 0;
    const db = toDate(b.call_date || b.created_at)?.getTime() || 0;
    return db - da;
  });
}

function buildBuckets(list, period) {
  const sorted = sortByDateDesc(list);
  if (!period) return { current:sorted, previous:[] };

  if (period.calls) {
    const current = sorted.slice(0, period.calls);
    const previous = sorted.slice(period.calls, period.calls * 2);
    return { current, previous };
  }

  const days = period.days || 30;
  const now = new Date();
  const currentStart = new Date(now);
  currentStart.setDate(now.getDate() - days);
  const previousStart = new Date(currentStart);
  previousStart.setDate(currentStart.getDate() - days);

  const current = sorted.filter(item => {
    const date = toDate(item.call_date || item.created_at);
    return date && date >= currentStart;
  });
  const previous = sorted.filter(item => {
    const date = toDate(item.call_date || item.created_at);
    return date && date >= previousStart && date < currentStart;
  });
  return { current, previous };
}

function average(values) {
  if (!values.length) return 0;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

function computeMetrics(list) {
  const total = list.length;
  const avgScore = total > 0 ? average(list.map(item => Number(item.percentage || 0))) : 0;
  const closeCount = list.filter(item => !!item.is_closed).length;
  const closeRate = total > 0 ? Math.round((closeCount / total) * 100) : 0;
  const withObjection = list.filter(item => {
    const objections = item.sections?.closing?.objections || [];
    return objections.some(objection => objection && objection !== 'aucune');
  }).length;
  const objectionRate = total > 0 ? Math.round((withObjection / total) * 100) : 0;
  return { total, avgScore, closeCount, closeRate, objectionRate };
}

function formatDelta(current, previous, suffix = '') {
  if (!Number.isFinite(previous) || previous === 0) {
    if (Number.isFinite(current) && current !== 0) return `+${Math.round(current)}${suffix}`;
    return `0${suffix}`;
  }
  const delta = Math.round((current - previous) * 10) / 10;
  return `${delta > 0 ? '+' : ''}${delta}${suffix}`;
}

function deltaColor(current, previous) {
  if (current > previous) return 'var(--positive-txt)';
  if (current < previous) return 'var(--danger-txt)';
  return DS.textMuted;
}

const glassPanel = (extra = {}) => ({
  ...cardSm(),
  background:'var(--glass-bg)',
  border:'1px solid var(--glass-border)',
  boxShadow:'var(--sh-card)',
  backdropFilter:'blur(10px)',
  WebkitBackdropFilter:'blur(10px)',
  ...extra,
});

export function BenchmarkPage({ user, debriefs, navigate, toast }) {
  const mob = useIsMobile();
  const isManager = user?.role === 'head_of_sales' || user?.role === 'admin';
  const [periodKey, setPeriodKey] = useState(PERIOD_OPTIONS[0].key);
  const [managedClosers, setManagedClosers] = useState([]);
  const [selectedCloserId, setSelectedCloserId] = useState(isManager ? '' : user?.id || '');
  const [closerLoading, setCloserLoading] = useState(isManager);
  const [patterns, setPatterns] = useState([]);
  const [patternsLoading, setPatternsLoading] = useState(true);

  useEffect(() => {
    if (!isManager) return;
    let mounted = true;
    setCloserLoading(true);
    apiFetch('/teams')
      .then(data => {
        if (!mounted) return;
        const map = {};
        for (const team of (data || [])) {
          for (const member of (team.members || [])) {
            if (!member?.id) continue;
            if (!map[member.id]) {
              map[member.id] = { id: member.id, name: member.name || 'Closer' };
            }
          }
        }
        const closers = Object.values(map).sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity:'base' }));
        setManagedClosers(closers);
        if (!selectedCloserId && closers.length > 0) {
          setSelectedCloserId(closers[0].id);
        }
      })
      .catch(error => {
        if (!mounted) return;
        toast(error.message, 'error');
      })
      .finally(() => {
        if (!mounted) return;
        setCloserLoading(false);
      });
    return () => { mounted = false; };
  }, [isManager, selectedCloserId, toast]);

  const scopedDebriefs = useMemo(() => {
    const targetId = isManager ? selectedCloserId : user?.id;
    if (!targetId) return [];
    return sortByDateDesc((debriefs || []).filter(item => item.user_id === targetId));
  }, [debriefs, isManager, selectedCloserId, user?.id]);

  const period = PERIOD_OPTIONS.find(option => option.key === periodKey) || PERIOD_OPTIONS[0];
  const buckets = useMemo(() => buildBuckets(scopedDebriefs, period), [scopedDebriefs, period]);
  const currentMetrics = useMemo(() => computeMetrics(buckets.current), [buckets.current]);
  const previousMetrics = useMemo(() => computeMetrics(buckets.previous), [buckets.previous]);
  const currentSections = useMemo(() => avgSectionScores(buckets.current), [buckets.current]);
  const previousSections = useMemo(() => avgSectionScores(buckets.previous), [buckets.previous]);
  const selectedCloserName = useMemo(() => {
    if (!isManager) return user?.name || 'Closer';
    return managedClosers.find(closer => closer.id === selectedCloserId)?.name || 'Closer';
  }, [isManager, managedClosers, selectedCloserId, user?.name]);

  useEffect(() => {
    let mounted = true;
    if (isManager && !selectedCloserId) {
      setPatterns([]);
      setPatternsLoading(false);
      return () => { mounted = false; };
    }
    setPatternsLoading(true);
    const query = isManager ? `?closer_id=${encodeURIComponent(selectedCloserId)}` : '';
    apiFetch(`/patterns${query}`)
      .then(data => {
        if (!mounted) return;
        setPatterns(Array.isArray(data?.patterns) ? data.patterns : []);
      })
      .catch(error => {
        if (!mounted) return;
        setPatterns([]);
        toast(error.message, 'error');
      })
      .finally(() => {
        if (!mounted) return;
        setPatternsLoading(false);
      });
    return () => { mounted = false; };
  }, [isManager, selectedCloserId, toast]);

  const comparisonLabel = period.days
    ? `${period.days} derniers jours vs période précédente`
    : `${period.calls} derniers appels vs ${period.calls} précédents`;
  const canRender = scopedDebriefs.length > 0;

  const metricCards = [
    {
      label:'Debriefs',
      value:currentMetrics.total,
      delta:formatDelta(currentMetrics.total, previousMetrics.total),
      current:currentMetrics.total,
      previous:previousMetrics.total,
      icon:'file-text',
      tint:'linear-gradient(145deg, rgba(255,255,255,.72), rgba(255,246,238,.62))',
      border:'rgba(232,125,106,.18)',
    },
    {
      label:'Score moyen',
      value:`${Math.round(currentMetrics.avgScore)}%`,
      delta:formatDelta(currentMetrics.avgScore, previousMetrics.avgScore, '%'),
      current:currentMetrics.avgScore,
      previous:previousMetrics.avgScore,
      icon:'bar-chart-2',
      tint:'linear-gradient(145deg, rgba(255,255,255,.72), rgba(106,172,206,.14))',
      border:'rgba(106,172,206,.28)',
    },
    {
      label:'Closing rate',
      value:`${currentMetrics.closeRate}%`,
      delta:formatDelta(currentMetrics.closeRate, previousMetrics.closeRate, '%'),
      current:currentMetrics.closeRate,
      previous:previousMetrics.closeRate,
      icon:'award',
      tint:'linear-gradient(145deg, rgba(255,255,255,.72), rgba(5,150,105,.12))',
      border:'rgba(5,150,105,.28)',
    },
    {
      label:'Appels avec objections',
      value:`${currentMetrics.objectionRate}%`,
      delta:formatDelta(currentMetrics.objectionRate, previousMetrics.objectionRate, '%'),
      current:currentMetrics.objectionRate,
      previous:previousMetrics.objectionRate,
      icon:'message-square-warning',
      tint:'linear-gradient(145deg, rgba(255,255,255,.72), rgba(124,58,237,.13))',
      border:'rgba(124,58,237,.28)',
    },
  ];

  return (
    <div className="cd-page-flow" style={{ position:'relative', gap:16, isolation:'isolate' }}>
      <div style={{ position:'absolute', top:-30, right:-40, width:180, height:180, borderRadius:'50%', background:'radial-gradient(circle, rgba(232,125,106,.16) 0%, rgba(232,125,106,0) 68%)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:10, left:-40, width:220, height:220, borderRadius:'50%', background:'radial-gradient(circle, rgba(106,172,206,.14) 0%, rgba(106,172,206,0) 68%)', pointerEvents:'none' }} />

      <div className="page-header">
        <div style={{ display:'flex', justifyContent:'space-between', gap:10, alignItems:'flex-start', flexWrap:'wrap' }}>
          <div>
            <h1 className="page-title">{selectedCloserName}</h1>
            <p className="page-subtitle">Benchmark interne</p>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
            <Btn variant="secondary" onClick={()=>navigate('Dashboard')} style={{ fontSize:12, padding:'7px 11px' }}>
              ← Dashboard
            </Btn>
            <Btn onClick={()=>navigate('NewDebrief')} style={{ fontSize:12, padding:'7px 11px' }}>
              + Nouveau debrief
            </Btn>
          </div>
        </div>
      </div>

      <Card className="cd-surface-muted" style={{ ...glassPanel({ padding:mob ? '18px 15px' : '22px 22px', background:'var(--panel-1)' }) }}>
        <div style={{ display:'flex', gap:8, marginTop:12, flexWrap:'wrap', alignItems:'center' }}>
          {PERIOD_OPTIONS.map(option => (
            <button
              key={option.key}
              type="button"
              onClick={() => setPeriodKey(option.key)}
              style={{
                border:'none',
                borderRadius:999,
                padding:'8px 13px',
                fontFamily:'inherit',
                fontSize:11,
                fontWeight:700,
                cursor:'pointer',
                background:periodKey === option.key ? 'linear-gradient(135deg,#e87d6a,#d4604e)' : 'var(--glass-bg)',
                color:periodKey === option.key ? 'white' : 'var(--txt2,#B09080)',
                border:periodKey === option.key ? '1px solid rgba(255,255,255,.24)' : '1px solid var(--border)',
                boxShadow:periodKey === option.key ? 'var(--sh-btn)' : 'var(--sh-sm)',
              }}
            >
              {option.label}
            </button>
          ))}
          {isManager && (
            <select
              value={selectedCloserId}
              onChange={event => setSelectedCloserId(event.target.value)}
              style={{ marginLeft:mob ? '0' : 'auto', minWidth:mob ? '100%' : 180, background:'var(--glass-bg)', border:'1px solid var(--glass-border)', borderRadius:10, padding:'8px 10px', fontSize:12, color:'var(--txt,#4A3428)', fontFamily:'inherit', boxShadow:'var(--sh-sm)' }}
              disabled={closerLoading}
            >
              {closerLoading && <option value="">Chargement...</option>}
              {!closerLoading && managedClosers.length === 0 && <option value="">Aucun closer disponible</option>}
              {!closerLoading && managedClosers.map(closer => (
                <option key={closer.id} value={closer.id}>{closer.name}</option>
              ))}
            </select>
          )}
        </div>
        <div style={{ marginTop:10, display:'flex', gap:7, flexWrap:'wrap' }}>
          <span style={{ fontSize:10, fontWeight:700, borderRadius:999, padding:'3px 8px', background:'var(--chip-bg)', color:'var(--txt,#4A3428)', border:'1px solid var(--border)' }}>
            Score: {Math.round(currentMetrics.avgScore)}%
          </span>
          <span style={{ fontSize:10, fontWeight:700, borderRadius:999, padding:'3px 8px', background:'var(--chip-bg)', color:'var(--txt,#4A3428)', border:'1px solid var(--border)' }}>
            Closing: {currentMetrics.closeRate}%
          </span>
          <span style={{ fontSize:10, fontWeight:700, borderRadius:999, padding:'3px 8px', background:'var(--chip-bg)', color:'var(--txt,#4A3428)', border:'1px solid var(--border)' }}>
            Objections: {currentMetrics.objectionRate}%
          </span>
        </div>
        <p style={{ margin:'8px 0 0', fontSize:12, color:DS.textMuted }}>{comparisonLabel}</p>
      </Card>

      {closerLoading ? (
        <Card style={{ padding:16 }}>
          <Spinner size={20} />
        </Card>
      ) : !canRender ? (
        <Empty
          icon={<Icon name="bar-chart-2" size={36} color="var(--txt3)" />}
          title="Pas assez de données"
          subtitle="Créez quelques debriefs pour activer le benchmark interne."
          action={<Btn onClick={()=>navigate('NewDebrief')}>Créer un debrief</Btn>}
        />
      ) : (
        <>
          <div style={{ display:'grid', gridTemplateColumns:mob ? 'repeat(2,1fr)' : 'repeat(4, minmax(0,1fr))', gap:10 }}>
            {metricCards.map(item => (
              <div key={item.label} style={{ ...glassPanel({ padding:'12px 12px', display:'flex', flexDirection:'column', gap:4, background:item.tint, border:`1px solid ${item.border}`, minHeight:86 }) }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8 }}>
                  <p style={{ margin:0, fontSize:10, textTransform:'uppercase', letterSpacing:'.06em', color:DS.textMuted, fontWeight:700 }}>{item.label}</p>
                  <Icon name={item.icon} size={16} color="var(--txt3,#c8b8a8)" />
                </div>
                <p style={{ margin:0, fontSize:22, fontWeight:800, color:'var(--txt,#4A3428)' }}>{item.value}</p>
                <p style={{ margin:0, fontSize:11, fontWeight:700, color:deltaColor(item.current, item.previous) }}>
                  vs période précédente: {item.delta}
                </p>
              </div>
            ))}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:mob ? '1fr' : '1.05fr .95fr', gap:12, alignItems:'start' }}>
            <Card style={{ ...glassPanel({ padding:16 }) }}>
              <div style={{ display:'flex', justifyContent:'space-between', gap:10, alignItems:'center', marginBottom:8, flexWrap:'wrap' }}>
                <h2 style={{ margin:0, fontSize:15, color:'var(--txt,#4A3428)', fontWeight:700, display:'inline-flex', alignItems:'center', gap:6 }}>
                  <Icon name="activity" size={17} color="var(--txt3,#c8b8a8)" />
                  Évolution personnelle
                </h2>
                <span style={{ fontSize:11, color:DS.textMuted }}>
                  {scopedDebriefs.length} appels
                </span>
              </div>
              <Chart debriefs={scopedDebriefs.slice(0, 24)} compact />
            </Card>

            <Card style={{ ...glassPanel({ padding:16 }) }}>
              <h2 style={{ margin:'0 0 8px', fontSize:15, color:'var(--txt,#4A3428)', fontWeight:700, display:'inline-flex', alignItems:'center', gap:6 }}>
                <Icon name="radar" size={17} color="var(--txt3,#c8b8a8)" />
                Répartition des compétences
              </h2>
              {!currentSections ? (
                <p style={{ margin:0, fontSize:12, color:DS.textMuted }}>
                  Pas assez d’appels pour générer un radar fiable.
                </p>
              ) : (
                <>
                  <div style={{ display:'flex', justifyContent:'center', marginBottom:8 }}>
                    <Radar
                      scores={currentSections}
                      compareScores={previousSections}
                      color="#e87d6a"
                      compareColor="#6aacce"
                      size={mob ? 240 : 260}
                    />
                  </div>
                  <SectionBars scores={currentSections} globalScores={previousSections || undefined} />
                </>
              )}
            </Card>
          </div>

          <Card style={{ ...glassPanel({ padding:16, background:'linear-gradient(150deg, rgba(255,255,255,.7), rgba(124,58,237,.08))' }) }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:10 }}>
              <h2 style={{ margin:0, fontSize:15, color:'var(--txt,#4A3428)', fontWeight:700, display:'inline-flex', alignItems:'center', gap:6 }}>
                <Icon name="brain" size={17} color="var(--accent-violet,#7C3AED)" />
                Patterns prioritaires
              </h2>
              <Btn variant="secondary" onClick={()=>navigate('Knowledge')} style={{ fontSize:12, padding:'6px 10px' }}>
                Ouvrir le centre de connaissances
              </Btn>
            </div>
            {patternsLoading ? (
              <Spinner size={20} />
            ) : patterns.length === 0 ? (
              <p style={{ margin:0, fontSize:12, color:DS.textMuted }}>
                Aucun pattern critique détecté sur la période actuelle.
              </p>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:mob ? '1fr' : 'repeat(3, minmax(0,1fr))', gap:8 }}>
                {patterns.slice(0, 3).map(pattern => (
                  <div key={pattern.id} style={{ ...glassPanel({ padding:'10px 11px', background:'linear-gradient(150deg, rgba(255,255,255,.74), rgba(255,126,95,.08))', border:'1px solid rgba(255,126,95,.2)' }) }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                      <p style={{ margin:'0 0 4px', fontSize:13, fontWeight:700, color:'var(--txt,#4A3428)' }}>
                        {pattern.title}
                      </p>
                      <span style={{ flexShrink:0, fontSize:10, fontWeight:700, borderRadius:999, padding:'2px 7px', background:'var(--danger-bg)', color:'var(--danger-txt)' }}>
                        Priorité
                      </span>
                    </div>
                    <p style={{ margin:'0 0 6px', fontSize:11, color:DS.textMuted }}>
                      {pattern.count} cas · {pattern.rate}% des appels non closés
                    </p>
                    <p style={{ margin:0, fontSize:12, color:'var(--txt2,#B09080)' }}>
                      {pattern.recommendation}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
