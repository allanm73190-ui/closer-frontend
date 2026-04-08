import React, { useState } from 'react';
import { DS, P } from '../../styles/designSystem';
import { fmtDate } from '../../utils/scoring';
import { ClosedBadge } from '../ui';
import { QualityBadge } from './QualityBadge';

function ScoreCircle({ pct }) {
  const col = pct >= 75 ? '#059669' : pct >= 50 ? '#D97706' : pct >= 30 ? P : '#DC2626';
  const bg = pct >= 75 ? 'rgba(5,150,105,.08)' : pct >= 50 ? 'rgba(217,119,6,.08)' : pct >= 30 ? 'rgba(255,126,95,.08)' : 'rgba(220,38,38,.08)';
  const border = pct >= 75 ? 'rgba(5,150,105,.22)' : pct >= 50 ? 'rgba(217,119,6,.22)' : pct >= 30 ? 'rgba(255,126,95,.22)' : 'rgba(220,38,38,.22)';
  return (
    <div style={{
      width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
      background: bg, border: `2px solid ${border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column',
    }}>
      <span style={{ fontSize: 13, fontWeight: 800, color: col, lineHeight: 1 }}>{pct}</span>
      <span style={{ fontSize: 8, fontWeight: 600, color: col, opacity: .7, letterSpacing: '.04em' }}>%</span>
    </div>
  );
}

function DebriefCard({ debrief, onClick, showUser }) {
  const [hov, setHov] = useState(false);
  const pct = Math.round(debrief.percentage || 0);
  return (
    <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? 'rgba(255,255,255,.75)' : 'var(--glass-bg)',
        border: `1px solid ${hov ? 'rgba(255,126,95,.2)' : 'var(--glass-border)'}`,
        borderRadius: DS.radiusLg,
        padding: '12px 14px',
        cursor: 'pointer',
        transition: 'all .18s',
        boxShadow: hov ? '0 8px 24px rgba(255,126,95,.1), 0 2px 8px rgba(74,52,40,.06)' : '0 2px 8px rgba(74,52,40,.04)',
        transform: hov ? 'translateY(-1px)' : 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
      }}>

      {/* Score circle — LEFT */}
      <ScoreCircle pct={pct} />

      {/* Info — CENTER */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--txt)', margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {debrief.prospect_name}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--txt3)', flexWrap: 'wrap' }}>
          <span>{fmtDate(debrief.call_date)}</span>
          {debrief.closer_name && <span>· {debrief.closer_name}</span>}
          {showUser && debrief.user_name && (
            <span style={{ background: 'var(--surface-accent)', padding: '1px 6px', borderRadius: 999, border: '1px solid var(--border)' }}>
              {debrief.user_name}
            </span>
          )}
        </div>
        {/* Badges row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5, flexWrap: 'wrap' }}>
          <ClosedBadge isClosed={debrief.is_closed} />
          <QualityBadge score={debrief.overall_quality_score} flags={debrief.quality_flags} compact />
        </div>
      </div>

      {/* Chevron — RIGHT */}
      <span style={{ color: hov ? P : 'var(--txt3)', fontSize: 18, transition: 'color .15s', flexShrink: 0 }}>{'\u203A'}</span>
    </div>
  );
}

export { DebriefCard };
