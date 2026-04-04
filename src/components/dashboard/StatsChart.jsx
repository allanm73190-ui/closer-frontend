import React, { useState } from 'react';
import { DS, P, SH_SM, R_MD, R_FULL } from '../../styles/designSystem';
import { useIsMobile } from '../../hooks';
import { fmtShort } from '../../utils/scoring';
import { Card } from '../ui';

function StatsRow({ debriefs }) {
  const mob = useIsMobile();
  const total = debriefs.length;
  const avg = total > 0 ? Math.round(debriefs.reduce((s, d) => s + (d.percentage || 0), 0) / total) : 0;
  const best = total > 0 ? Math.max(...debriefs.map(d => d.percentage || 0)) : 0;
  const sorted = [...debriefs].sort((a, b) => new Date(b.call_date) - new Date(a.call_date));
  const rA = sorted.slice(0, 3).reduce((s, d) => s + (d.percentage || 0), 0) / Math.max(sorted.slice(0, 3).length, 1);
  const pA = sorted.slice(3, 6).reduce((s, d) => s + (d.percentage || 0), 0) / Math.max(sorted.slice(3, 6).length, 1);
  const trend = sorted.slice(3, 6).length > 0 ? Math.round(rA - pA) : 0;
  const items = [
    { label: 'Total appels', value: total, c: 'var(--txt)' },
    { label: 'Score moyen', value: `${avg}%`, c: 'var(--positive-txt)' },
    { label: 'Meilleur score', value: `${Math.round(best)}%`, c: 'var(--warning-txt)' },
    { label: 'Tendance', value: `${trend >= 0 ? '+' : ''}${trend}%`, c: trend >= 0 ? 'var(--positive-txt)' : 'var(--danger-txt)' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: mob ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: mob ? 8 : 10 }}>
      {items.map(({ label, value, c }) => (
        <div key={label} style={{
          background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
          borderRadius: 12, padding: mob ? '12px 14px' : '14px 16px',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        }}>
          <p style={{ fontSize: 11, color: 'var(--txt3)', margin: '0 0 6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</p>
          <p style={{ fontSize: mob ? 22 : 26, fontWeight: 700, color: c, margin: 0, letterSpacing: '-.02em' }}>{value}</p>
        </div>
      ))}
    </div>
  );
}

function Chart({ debriefs, compact = false, simple = false }) {
  const [hov, setHov] = useState(null);
  const data = [...debriefs]
    .sort((a, b) => new Date(a.call_date || a.date) - new Date(b.call_date || b.date))
    .map(d => ({ date: fmtShort(d.call_date || d.date), score: Math.round(d.percentage || d.score || 0), prospect: d.prospect_name || d.prospect || '' }));

  if (!data.length) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: compact ? 150 : 200, color: 'var(--txt3)', fontSize: 14 }}>
      Aucune donnée — créez votre premier debrief !
    </div>
  );

  if (simple) {
    const simpleData = data.slice(-8);
    const avg = Math.round(simpleData.reduce((sum, item) => sum + item.score, 0) / simpleData.length);
    const last = simpleData[simpleData.length - 1]?.score || 0;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: compact ? 118 : 142 }}>
          {simpleData.map((item, idx) => (
            <div key={`${item.date}_${idx}`} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: '100%', maxWidth: 20,
                height: `${Math.max(16, item.score)}%`,
                borderRadius: '6px 6px 4px 4px',
                background: item.score >= 75
                  ? 'linear-gradient(180deg, #6EE7B7, #059669)'
                  : item.score >= 55
                    ? 'linear-gradient(180deg, #FEB47B, #D97706)'
                    : 'var(--gradient-primary)',
                boxShadow: '0 4px 10px rgba(74,52,40,.06)',
              }} title={`${item.prospect || 'Debrief'} · ${item.score}%`} />
              <span style={{ fontSize: 10, color: 'var(--txt3)', fontWeight: 500 }}>{item.date}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12 }}>
          <span style={{ color: 'var(--txt2)' }}>Moyenne récente: <strong style={{ color: 'var(--txt)' }}>{avg}%</strong></span>
          <span style={{ color: 'var(--txt2)' }}>Dernier appel: <strong style={{ color: 'var(--txt)' }}>{last}%</strong></span>
        </div>
      </div>
    );
  }

  const W = compact ? 500 : 560;
  const H = compact ? 142 : 188;
  const pL = 42, pR = 16, pT = compact ? 12 : 16, pB = compact ? 20 : 26;
  const iW = W - pL - pR, iH = H - pT - pB;
  const xs = data.map((_, i) => pL + (i / Math.max(data.length - 1, 1)) * iW);
  const ys = data.map(d => pT + iH - (d.score / 100) * iH);
  const path = xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${x} ${ys[i]}`).join(' ');

  return (
    <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ minWidth: 280 }}>
        <defs>
          <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={P} stopOpacity=".1" />
            <stop offset="100%" stopColor={P} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 50, 100].map(v => {
          const y = pT + iH - (v / 100) * iH;
          return <g key={v}><line x1={pL} y1={y} x2={W - pR} y2={y} stroke="rgba(200,160,140,.06)" strokeWidth="1" /><text x={pL - 6} y={y + 4} textAnchor="end" fontSize="10" fill="var(--txt3)">{v}%</text></g>;
        })}
        <path d={`${path} L ${xs[xs.length - 1]} ${pT + iH} L ${pL} ${pT + iH} Z`} fill="url(#cg)" />
        <path d={path} fill="none" stroke={P} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {data.map((d, i) => (
          <g key={i} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)} onTouchStart={() => setHov(hov === i ? null : i)} style={{ cursor: 'pointer' }}>
            <circle cx={xs[i]} cy={ys[i]} r={hov === i ? 6 : 4} fill={P} stroke="white" strokeWidth="2" />
            {hov === i && (
              <g>
                <rect x={Math.max(pL, Math.min(xs[i] - 55, W - pR - 110))} y={ys[i] - 52} width={110} height={44} rx="8" fill="rgba(255,255,255,.9)" stroke="rgba(200,160,140,.1)" strokeWidth="1" />
                <text x={Math.max(pL + 55, Math.min(xs[i], W - pR - 55))} y={ys[i] - 34} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--txt)">{d.prospect || '—'}</text>
                <text x={Math.max(pL + 55, Math.min(xs[i], W - pR - 55))} y={ys[i] - 18} textAnchor="middle" fontSize="10" fill="var(--txt2)">{d.date} · {d.score}%</text>
              </g>
            )}
            {(!compact || i % 2 === 0 || i === data.length - 1) && (
              <text x={xs[i]} y={pT + iH + 16} textAnchor="middle" fontSize="10" fill="var(--txt3)">{d.date}</text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

export { StatsRow, Chart };
