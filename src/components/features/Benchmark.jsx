import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../config/api';
import { DS, cardSm } from '../../styles/designSystem';
import { useIsMobile } from '../../hooks';
import { avgSectionScores } from '../../utils/scoring';
import { Btn, Card, Empty, Spinner } from '../ui';
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

export function BenchmarkPage({ user, debriefs, navigate, toast }) {
  const mob = useIsMobile();
  const isHOS = user?.role === 'head_of_sales';
  const [periodKey, setPeriodKey] = useState(PERIOD_OPTIONS[0].key);
  const [managedClosers, setManagedClosers] = useState([]);
  const [selectedCloserId, setSelectedCloserId] = useState(isHOS ? '' : user?.id || '');
  const [closerLoading, setCloserLoading] = useState(isHOS);
  const [patterns, setPatterns] = useState([]);
  const [patternsLoading, setPatternsLoading] = useState(true);

  useEffect(() => {
    if (!isHOS) return;
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
  }, [isHOS, selectedCloserId, toast]);

  const scopedDebriefs = useMemo(() => {
    const targetId = isHOS ? selectedCloserId : user?.id;
    if (!targetId) return [];
    return sortByDateDesc((debriefs || []).filter(item => item.user_id === targetId));
  }, [debriefs, isHOS, selectedCloserId, user?.id]);

  const period = PERIOD_OPTIONS.find(option => option.key === periodKey) || PERIOD_OPTIONS[0];
  const buckets = useMemo(() => buildBuckets(scopedDebriefs, period), [scopedDebriefs, period]);
  const currentMetrics = useMemo(() => computeMetrics(buckets.current), [buckets.current]);
  const previousMetrics = useMemo(() => computeMetrics(buckets.previous), [buckets.previous]);
  const currentSections = useMemo(() => avgSectionScores(buckets.current), [buckets.current]);
  const previousSections = useMemo(() => avgSectionScores(buckets.previous), [buckets.previous]);
  const selectedCloserName = useMemo(() => {
    if (!isHOS) return user?.name || 'Closer';
    return managedClosers.find(closer => closer.id === selectedCloserId)?.name || 'Closer';
  }, [isHOS, managedClosers, selectedCloserId, user?.name]);

  useEffect(() => {
    let mounted = true;
    if (isHOS && !selectedCloserId) {
      setPatterns([]);
      setPatternsLoading(false);
      return () => { mounted = false; };
    }
    setPatternsLoading(true);
    const query = isHOS ? `?closer_id=${encodeURIComponent(selectedCloserId)}` : '';
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
  }, [isHOS, selectedCloserId, toast]);

  const comparisonLabel = period.days
    ? `${period.days} derniers jours vs période précédente`
    : `${period.calls} derniers appels vs ${period.calls} précédents`;
  const canRender = scopedDebriefs.length > 0;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
      <Card style={{ padding:mob ? '16px 14px' : '18px 20px', background:'linear-gradient(145deg, var(--surface-a), var(--surface-b))' }}>
        <div style={{ display:'flex', justifyContent:'space-between', gap:10, alignItems:'flex-start', flexWrap:'wrap' }}>
          <div>
            <p style={{ margin:'0 0 4px', fontSize:11, color:DS.textMuted, textTransform:'uppercase', letterSpacing:'.08em', fontWeight:700 }}>
              Benchmark interne
            </p>
            <h1 style={{ margin:0, fontSize:mob ? 21 : 24, color:'var(--txt,#5a4a3a)', fontWeight:800 }}>
              {selectedCloserName}
            </h1>
            <p style={{ margin:'6px 0 0', fontSize:13, color:'var(--txt2,#b09080)' }}>
              Comparaison contre l’historique personnel uniquement, sans classement public.
            </p>
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
        <div style={{ display:'flex', gap:8, marginTop:12, flexWrap:'wrap', alignItems:'center' }}>
          {PERIOD_OPTIONS.map(option => (
            <button
              key={option.key}
              type="button"
              onClick={() => setPeriodKey(option.key)}
              style={{
                border:'none',
                borderRadius:999,
                padding:'7px 12px',
                fontFamily:'inherit',
                fontSize:12,
                fontWeight:700,
                cursor:'pointer',
                background:periodKey === option.key ? 'linear-gradient(135deg,#e87d6a,#d4604e)' : 'var(--input,#f5ede6)',
                color:periodKey === option.key ? 'white' : 'var(--txt2,#b09080)',
              }}
            >
              {option.label}
            </button>
          ))}
          {isHOS && (
            <select
              value={selectedCloserId}
              onChange={event => setSelectedCloserId(event.target.value)}
              style={{ marginLeft:'auto', minWidth:180, background:'var(--card,#fff)', border:'1px solid var(--border)', borderRadius:10, padding:'8px 10px', fontSize:12, color:'var(--txt,#5a4a3a)', fontFamily:'inherit' }}
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
        <p style={{ margin:'8px 0 0', fontSize:12, color:DS.textMuted }}>{comparisonLabel}</p>
      </Card>

      {closerLoading ? (
        <Card style={{ padding:16 }}>
          <Spinner size={20} />
        </Card>
      ) : !canRender ? (
        <Empty
          icon="📉"
          title="Pas assez de données"
          subtitle="Créez quelques debriefs pour activer le benchmark interne."
          action={<Btn onClick={()=>navigate('NewDebrief')}>Créer un debrief</Btn>}
        />
      ) : (
        <>
          <div style={{ display:'grid', gridTemplateColumns:mob ? 'repeat(2,1fr)' : 'repeat(4, minmax(0,1fr))', gap:10 }}>
            {[
              {
                label:'Debriefs',
                value:currentMetrics.total,
                delta:formatDelta(currentMetrics.total, previousMetrics.total),
                current:currentMetrics.total,
                previous:previousMetrics.total,
                suffix:'',
              },
              {
                label:'Score moyen',
                value:`${Math.round(currentMetrics.avgScore)}%`,
                delta:formatDelta(currentMetrics.avgScore, previousMetrics.avgScore, '%'),
                current:currentMetrics.avgScore,
                previous:previousMetrics.avgScore,
              },
              {
                label:'Closing rate',
                value:`${currentMetrics.closeRate}%`,
                delta:formatDelta(currentMetrics.closeRate, previousMetrics.closeRate, '%'),
                current:currentMetrics.closeRate,
                previous:previousMetrics.closeRate,
              },
              {
                label:'Appels avec objections',
                value:`${currentMetrics.objectionRate}%`,
                delta:formatDelta(currentMetrics.objectionRate, previousMetrics.objectionRate, '%'),
                current:currentMetrics.objectionRate,
                previous:previousMetrics.objectionRate,
              },
            ].map(item => (
              <div key={item.label} style={{ ...cardSm(), padding:'12px 12px', display:'flex', flexDirection:'column', gap:4 }}>
                <p style={{ margin:0, fontSize:10, textTransform:'uppercase', letterSpacing:'.06em', color:DS.textMuted, fontWeight:700 }}>{item.label}</p>
                <p style={{ margin:0, fontSize:20, fontWeight:800, color:'var(--txt,#5a4a3a)' }}>{item.value}</p>
                <p style={{ margin:0, fontSize:11, fontWeight:700, color:deltaColor(item.current, item.previous) }}>
                  vs période précédente: {item.delta}
                </p>
              </div>
            ))}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:mob ? '1fr' : '1.05fr .95fr', gap:12, alignItems:'start' }}>
            <Card style={{ padding:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', gap:10, alignItems:'center', marginBottom:8, flexWrap:'wrap' }}>
                <h2 style={{ margin:0, fontSize:15, color:'var(--txt,#5a4a3a)', fontWeight:700 }}>
                  Évolution personnelle
                </h2>
                <span style={{ fontSize:11, color:DS.textMuted }}>
                  {scopedDebriefs.length} appels
                </span>
              </div>
              <Chart debriefs={scopedDebriefs.slice(0, 24)} compact />
            </Card>

            <Card style={{ padding:16 }}>
              <h2 style={{ margin:'0 0 8px', fontSize:15, color:'var(--txt,#5a4a3a)', fontWeight:700 }}>
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

          <Card style={{ padding:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:10 }}>
              <h2 style={{ margin:0, fontSize:15, color:'var(--txt,#5a4a3a)', fontWeight:700 }}>
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
                  <div key={pattern.id} style={{ ...cardSm(), padding:'10px 11px', background:'var(--surface-accent)' }}>
                    <p style={{ margin:'0 0 4px', fontSize:13, fontWeight:700, color:'var(--txt,#5a4a3a)' }}>
                      {pattern.title}
                    </p>
                    <p style={{ margin:'0 0 6px', fontSize:11, color:DS.textMuted }}>
                      {pattern.count} cas · {pattern.rate}% des appels non closés
                    </p>
                    <p style={{ margin:0, fontSize:12, color:'var(--txt2,#b09080)' }}>
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
