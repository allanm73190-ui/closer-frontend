import { computeStreak } from '../utils/streak';

describe('computeStreak', () => {
  const reference = '2026-04-08';

  it('retourne 0 pour aucun debrief', () => {
    expect(computeStreak([], reference)).toBe(0);
  });

  it('streak de 3 jours consecutifs', () => {
    expect(computeStreak([
      { call_date: '2026-04-08' },
      { call_date: '2026-04-07' },
      { call_date: '2026-04-06' },
    ], reference)).toBe(3);
  });

  it('streak 1 si seulement aujourd hui', () => {
    expect(computeStreak([{ call_date: '2026-04-08' }], reference)).toBe(1);
  });

  it('streak 0 si dernier debrief il y a 2 jours', () => {
    expect(computeStreak([{ call_date: '2026-04-06' }], reference)).toBe(0);
  });
});
