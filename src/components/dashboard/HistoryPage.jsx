import React, { useMemo, useState } from 'react';
import { useIsMobile } from '../../hooks';
import { filterByPeriod, sortDebriefs, paginateDebriefs } from '../../utils/historyFilters';
import { Btn, Empty } from '../ui';
import { Icon } from '../ui/Icon';
import { DebriefCard } from '../debrief/DebriefCard';

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

  const objectionOptions = useMemo(
    () => [...new Set(debriefs.flatMap(d => (d.sections?.closing?.objections || []).filter(o => o && o !== 'aucune')))],
    [debriefs]
  );

  const prospectTypeOptions = useMemo(
    () => [...new Set(debriefs.map(d => String(d.sections?.__meta?.prospect_type || '').trim()).filter(Boolean))],
    [debriefs]
  );

  const matchesScoreFilter = (pct, key) => key === 'low' ? pct < 50 : key === 'mid' ? pct >= 50 && pct < 75 : key === 'high' ? pct >= 75 : true;

  const allFiltered = useMemo(
    () => sortDebriefs(
      filterByPeriod(debriefs, periodFilter).filter(d => {
        const s = q.toLowerCase();
        const objs = (d.sections?.closing?.objections || []).filter(o => o && o !== 'aucune');
        const pt = String(d.sections?.__meta?.prospect_type || '').trim();
        return (resultFilter === 'all' ? true : resultFilter === 'closed' ? !!d.is_closed : !d.is_closed)
          && matchesScoreFilter(d.percentage, scoreFilter)
          && (objectionFilter === 'all' || objs.includes(objectionFilter))
          && (prospectTypeFilter === 'all' || pt === prospectTypeFilter)
          && (!s || d.prospect_name?.toLowerCase().includes(s) || d.closer_name?.toLowerCase().includes(s) || d.user_name?.toLowerCase().includes(s));
      }),
      sortBy,
      'desc',
    ),
    [debriefs, periodFilter, q, resultFilter, scoreFilter, objectionFilter, prospectTypeFilter, sortBy]
  );

  const filtered = paginateDebriefs(allFiltered, page, PAGE_SIZE);
  const hasMore = filtered.length < allFiltered.length;
  const hasFilters = resultFilter !== 'all' || scoreFilter !== 'all' || objectionFilter !== 'all' || prospectTypeFilter !== 'all' || periodFilter !== 'all';

  const sel = {
    background: 'var(--glass-bg)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '9px 10px',
    fontSize: 12,
    color: 'var(--txt)',
    fontFamily: 'inherit',
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
  };

  return (
    <div className="cd-page-flow" style={{ gap: 14 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Historique des debriefs</h1>
          <p className="page-subtitle">{allFiltered.length} / {debriefs.length} debrief{debriefs.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        <input
          placeholder="Rechercher..."
          value={q}
          onChange={e => setQ(e.target.value)}
          style={{
            width: '100%',
            padding: '11px 14px',
            border: '1px solid var(--border)',
            borderRadius: 10,
            fontSize: 14,
            fontFamily: 'inherit',
            outline: 'none',
            boxSizing: 'border-box',
            background: 'var(--glass-bg)',
            color: 'var(--txt)',
            backdropFilter: 'blur(4px)',
          }}
        />
        {q && (
          <button
            onClick={() => setQ('')}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--txt3)', cursor: 'pointer', fontSize: 18 }}
          >
            {'\u2715'}
          </button>
        )}
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
        <Empty
          icon={<Icon name="search" size={34} color="var(--txt3)" />}
          title="Aucun résultat"
          subtitle={q ? `Aucun debrief pour "${q}"` : 'Aucun debrief'}
          action={(q || hasFilters) ? (
            <Btn
              variant="secondary"
              onClick={() => {
                setQ('');
                setResultFilter('all');
                setScoreFilter('all');
                setObjectionFilter('all');
                setProspectTypeFilter('all');
                setPeriodFilter('all');
                setSortBy('date');
                setPage(1);
              }}
            >
              Réinitialiser
            </Btn>
          ) : null}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(d => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'stretch', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <DebriefCard debrief={d} onClick={() => navigate('Detail', d.id, 'History')} showUser={isManager} />
              </div>
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

export { History };
