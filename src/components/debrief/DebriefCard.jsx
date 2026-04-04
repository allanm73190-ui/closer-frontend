import React, { useState } from 'react';
import { DS, P } from '../../styles/designSystem';
import { fmtDate } from '../../utils/scoring';
import { ScoreBadge, ClosedBadge } from '../ui';

function DebriefCard({ debrief, onClick, showUser }) {
  const [hov, setHov] = useState(false);
  const pct = Math.round(debrief.percentage || 0);
  return (
    <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: 'var(--glass-bg)',
        border: `1px solid ${hov ? 'rgba(255,126,95,.15)' : 'var(--glass-border)'}`,
        borderRadius: DS.radiusLg,
        padding: '14px 16px',
        cursor: 'pointer',
        transition: 'all .18s',
        boxShadow: hov ? '0 12px 28px rgba(255,126,95,.12), 0 4px 10px rgba(74,52,40,.06)' : '0 4px 12px rgba(74,52,40,.04)',
        transform: hov ? 'translateY(-1px)' : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
      }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--txt)', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{debrief.prospect_name}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--txt3)', flexWrap: 'wrap' }}>
          <span>{fmtDate(debrief.call_date)}</span>
          <span>{debrief.closer_name}</span>
          {showUser && debrief.user_name && <span style={{ background: 'var(--surface-accent)', padding: '2px 7px', borderRadius: 999, border: '1px solid var(--border)' }}>par {debrief.user_name}</span>}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <ClosedBadge isClosed={debrief.is_closed} />
        <ScoreBadge pct={pct} />
        <span style={{ color: hov ? P : 'var(--txt3)', fontSize: 18, transition: 'color .15s' }}>{'\u2192'}</span>
      </div>
    </div>
  );
}

export { DebriefCard };
