import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../config/api';
import { DS, P } from '../../styles/designSystem';
import { computeLevel } from '../../utils/scoring';
import { computeStreak } from '../../utils/streak';
import { useIsMobile } from '../../hooks';
import { Spinner, Icon } from '../ui';

const G = (extra = {}) => ({
  background: 'var(--glass-bg)',
  border: '1px solid var(--glass-border)',
  borderRadius: 12,
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  ...extra,
});

const RANK_COLORS = { 1: '#F59E0B', 2: '#94A3B8', 3: '#B45309' };

function GamCard({ gam }) {
  if (!gam) return null;
  const { points, level, badges } = gam;
  const pct = level.next ? Math.min(Math.round(((points - level.min) / (level.next - level.min)) * 100), 100) : 100;
  return (
    <div style={{ background: 'var(--gradient-primary)', borderRadius: 14, padding: 20, color: 'white' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <p style={{ fontSize: 11, opacity: .75, margin: 0, textTransform: 'uppercase', letterSpacing: '.06em' }}>Niveau</p>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: '4px 0 0', display:'inline-flex', alignItems:'center', gap:8 }}>
            <Icon name="award" size={18} color="white" />
            {level.name}
          </h2>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 11, opacity: .75, margin: 0 }}>Points</p>
          <p style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>{points}</p>
        </div>
      </div>
      {level.next && (
        <div style={{ marginBottom: badges.length > 0 ? 14 : 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, opacity: .75, marginBottom: 5 }}>
            <span>{points} pts</span>
            <span>{level.next - points} pts avant {computeLevel(level.next).name}</span>
          </div>
          <div style={{ height: 6, background: 'rgba(255,255,255,.2)', borderRadius: 3 }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'white', borderRadius: 3, transition: 'width .7s' }} />
          </div>
        </div>
      )}
      {badges.length > 0 && (
        <div>
          <p style={{ fontSize: 11, opacity: .75, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.06em' }}>Badges</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {badges.map(b => (
              <span key={b.id} style={{ background: 'rgba(255,255,255,.18)', padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 500, display:'inline-flex', alignItems:'center', gap:6 }}>
                <Icon name={b.icon || 'medal'} size={12} color="white" />
                {b.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function GamificationPage({ gam, user, debriefs = [] }) {
  const mob = useIsMobile();
  const [leaderboard, setLeaderboard] = useState([]);
  const [lbLoading, setLbLoading] = useState(true);

  useEffect(() => {
    setLbLoading(true);
    apiFetch('/gamification/leaderboard')
      .then(data => setLeaderboard(Array.isArray(data) ? data : []))
      .catch(() => setLeaderboard([]))
      .finally(() => setLbLoading(false));
  }, [user?.id]);

  if (!gam) return <Spinner full />;

  const { points, level, badges = [] } = gam;
  const pct = level.next
    ? Math.min(Math.round(((points - level.min) / (level.next - level.min)) * 100), 100)
    : 100;
  const total = debriefs.length;
  const avg = total > 0 ? Math.round(debriefs.reduce((s, d) => s + (d.percentage || 0), 0) / total) : 0;
  const streak = computeStreak(debriefs);
  const earnedBadges = badges.filter(b => !b.locked);
  const lockedBadges = badges.filter(b => b.locked);

  return (
    <div className="cd-page-flow" style={{ gap: 16 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Profil & Classement</h1>
          <p className="page-subtitle">{points} XP · Niveau {level.name}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : '1fr 1fr', gap: 16 }}>
      {/* Left — Profil XP + Badges */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ ...G({ padding: 24, marginBottom: 16 }) }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900, color: 'white', flexShrink: 0 }}>
              {(user?.name || 'U').substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--txt)' }}>{user?.name || '—'}</div>
              <div style={{ fontSize: 13, color: 'var(--txt3)', marginTop: 2 }}>{level.name}</div>
              <span style={{ display: 'inline-block', marginTop: 6, padding: '2px 10px', borderRadius: 999, background: 'rgba(124,58,237,.12)', color: 'var(--accent-violet)', fontSize: 11, fontWeight: 700, border: '1px solid rgba(124,58,237,.2)' }}>
                Niveau {level.name}
              </span>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
              <span style={{ fontWeight: 700, color: 'var(--txt)' }}>{points} XP</span>
              {level.next && <span style={{ color: 'var(--accent-violet)' }}>{level.next} XP — {computeLevel(level.next).name}</span>}
            </div>
            <div style={{ height: 10, borderRadius: 999, background: 'rgba(200,160,140,.1)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, var(--accent-violet), var(--accent))', borderRadius: 999, transition: 'width .6s ease' }} />
            </div>
            {level.next && (
              <div style={{ fontSize: 12, color: 'var(--txt3)', marginTop: 4 }}>
                {level.next - points} XP restants pour atteindre {computeLevel(level.next).name}
              </div>
            )}
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {[
              { label: 'Débriefs total', value: total, color: 'var(--txt)' },
              { label: 'Score moyen', value: `${avg}%`, color: P },
              { label: 'Streak', value: `${streak}j`, color: '#F59E0B' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
                <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...G({ padding: 20 }) }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 14 }}>
            Badges — {earnedBadges.length} / {badges.length}
          </div>
          {badges.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--txt3)', padding: '8px 0' }}>Aucun badge disponible.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
              {[...earnedBadges, ...lockedBadges].map(b => (
                <div key={b.id} style={{
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 8,
                  padding: '12px 8px',
                  textAlign: 'center',
                  opacity: b.locked ? 0.4 : 1,
                }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: b.locked ? 'rgba(200,160,140,.1)' : 'rgba(255,126,95,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
                    <Icon name={b.locked ? 'lock' : (b.icon || 'medal')} size={16} color="var(--txt2)" />
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--txt2)', lineHeight: 1.3 }}>{b.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right — Classement */}
      <div style={{ ...G({ padding: 20 }) }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 14 }}>
          Classement équipe
        </div>
        {lbLoading ? (
          <Spinner />
        ) : leaderboard.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--txt3)', padding: '8px 0' }}>Classement non disponible.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {leaderboard.map((entry, idx) => {
              const rank = idx + 1;
              const isMe = entry.user_id === user?.id || entry.id === user?.id;
              const rankColor = RANK_COLORS[rank] || 'var(--txt3)';
              return (
                <div key={entry.user_id || entry.id || idx} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '12px 14px',
                  borderRadius: 8,
                  background: isMe ? 'rgba(99,102,241,.06)' : 'var(--glass-bg)',
                  border: `1px solid ${isMe ? 'rgba(99,102,241,.25)' : 'var(--glass-border)'}`,
                }}>
                  <div style={{ fontSize: 16, fontWeight: 800, width: 24, textAlign: 'center', color: rankColor, flexShrink: 0 }}>{rank}</div>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                    {(entry.name || 'U').substring(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)' }}>
                      {entry.name}{isMe && <span style={{ fontSize: 11, color: 'var(--accent-violet)', marginLeft: 6 }}>(moi)</span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--txt3)' }}>{entry.level_name || '—'}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: isMe ? 'var(--accent-violet)' : 'var(--txt2)' }}>{entry.points} XP</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

export { GamCard, GamificationPage };
