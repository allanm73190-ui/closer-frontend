/**
 * Filtre les debriefs par période.
 * @param {Array} debriefs
 * @param {'all'|'month'|'quarter'|'year'} period
 */
export function filterByPeriod(debriefs, period) {
  if (!period || period === 'all') return debriefs;
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-indexed
  return debriefs.filter(d => {
    const date = new Date(d.call_date);
    if (isNaN(date)) return false;
    if (period === 'month')   return date.getFullYear() === y && date.getMonth() === m;
    if (period === 'quarter') {
      const q = Math.floor(m / 3);
      return date.getFullYear() === y && Math.floor(date.getMonth() / 3) === q;
    }
    if (period === 'year')    return date.getFullYear() === y;
    return true;
  });
}

/**
 * Trie les debriefs.
 * @param {Array} debriefs
 * @param {'date'|'score'|'prospect'} sortBy
 * @param {'asc'|'desc'} dir
 */
export function sortDebriefs(debriefs, sortBy = 'date', dir = 'desc') {
  const arr = [...debriefs];
  arr.sort((a, b) => {
    let va, vb;
    if (sortBy === 'date')     { va = a.call_date || ''; vb = b.call_date || ''; }
    else if (sortBy === 'score')   { va = a.percentage ?? 0; vb = b.percentage ?? 0; }
    else if (sortBy === 'prospect') { va = (a.prospect_name || '').toLowerCase(); vb = (b.prospect_name || '').toLowerCase(); }
    else return 0;
    if (va < vb) return dir === 'desc' ? 1 : -1;
    if (va > vb) return dir === 'desc' ? -1 : 1;
    return 0;
  });
  return arr;
}

/**
 * Retourne une tranche paginée.
 * @param {Array} debriefs
 * @param {number} page  1-indexed
 * @param {number} limit
 */
export function paginateDebriefs(debriefs, page = 1, limit = 20) {
  const offset = (page - 1) * limit;
  return debriefs.slice(0, offset + limit); // cumulative "load more" pattern
}
