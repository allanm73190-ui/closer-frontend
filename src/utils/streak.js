function toLocalDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Calcule le streak (jours consécutifs avec ≥1 debrief) jusqu'à aujourd'hui.
 * @param {Array} debriefs - liste de debriefs avec champ call_date (YYYY-MM-DD)
 * @param {Date|string} [referenceDate] - date de référence (utile pour tests)
 * @returns {number} nombre de jours consécutifs
 */
export function computeStreak(debriefs, referenceDate = new Date()) {
  if (!debriefs || debriefs.length === 0) return 0;

  const dates = new Set(
    debriefs.map(d => (d.call_date || '').slice(0, 10)).filter(Boolean)
  );

  let streak = 0;
  const cursor = new Date(referenceDate);
  cursor.setHours(0, 0, 0, 0);

  while (dates.has(toLocalDateStr(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}
