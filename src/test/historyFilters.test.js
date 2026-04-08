import { filterByPeriod, sortDebriefs, paginateDebriefs } from '../utils/historyFilters';

const D = (call_date, percentage = 50) => ({ id: call_date, call_date, percentage });

describe('filterByPeriod', () => {
  it('filtre par mois courant', () => {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-10`;
    const lastMonth = new Date(now.getFullYear(), now.getMonth()-1, 10).toISOString().slice(0,10);
    const debriefs = [D(thisMonth), D(lastMonth)];
    expect(filterByPeriod(debriefs, 'month')).toHaveLength(1);
    expect(filterByPeriod(debriefs, 'month')[0].call_date).toBe(thisMonth);
  });
});

describe('sortDebriefs', () => {
  it('trie par score DESC', () => {
    const result = sortDebriefs([D('2026-01-01', 30), D('2026-01-02', 80), D('2026-01-03', 55)], 'score', 'desc');
    expect(result.map(d => d.percentage)).toEqual([80, 55, 30]);
  });

  it('trie par date ASC', () => {
    const result = sortDebriefs([D('2026-03-01'), D('2026-01-01'), D('2026-02-01')], 'date', 'asc');
    expect(result.map(d => d.call_date)).toEqual(['2026-01-01', '2026-02-01', '2026-03-01']);
  });
});

describe('paginateDebriefs', () => {
  const items = Array.from({ length: 50 }, (_, i) => D(`2026-01-${String(i+1).padStart(2,'0')}`));

  it('page 1 limit 20 → 20 items', () => {
    expect(paginateDebriefs(items, 1, 20)).toHaveLength(20);
  });

  it('page 2 limit 20 → 40 items cumulatifs', () => {
    expect(paginateDebriefs(items, 2, 20)).toHaveLength(40);
  });
});
