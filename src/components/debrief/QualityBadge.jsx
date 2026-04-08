import React from 'react';

// Lot 1 — Debrief Quality v1
// Affichage compact du score qualité + flags. Tolère l'absence de données (fallback propre).

const FLAG_LABELS = {
  late_submission: 'Soumission tardive',
  missing_required_answers: 'Réponses manquantes',
  suspicious_uniform_answers: 'Réponses uniformes',
  low_detail: 'Peu de détails',
  manager_corrected: 'Corrigé manager',
};

function colorForScore(score) {
  if (typeof score !== 'number') return '#9ca3af';
  if (score >= 80) return '#16a34a';
  if (score >= 60) return '#ca8a04';
  return '#dc2626';
}

export function QualityBadge({ score, flags = [], compact = false }) {
  if (typeof score !== 'number') return null;
  const color = colorForScore(score);
  return (
    <span
      title={Array.isArray(flags) && flags.length ? flags.map(f => FLAG_LABELS[f] || f).join(' • ') : `Qualité ${score}/100`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: compact ? '2px 6px' : '3px 8px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        background: `${color}1a`,
        color,
        border: `1px solid ${color}40`,
      }}
    >
      {`Q ${score}`}
      {Array.isArray(flags) && flags.length > 0 && <span style={{ opacity: 0.8 }}>{`• ${flags.length}`}</span>}
    </span>
  );
}

export function QualityFlagsList({ flags = [] }) {
  if (!Array.isArray(flags) || flags.length === 0) return null;
  return (
    <ul style={{ margin: '6px 0 0', paddingLeft: 16, fontSize: 12, color: '#92400e' }}>
      {flags.map(f => <li key={f}>{FLAG_LABELS[f] || f}</li>)}
    </ul>
  );
}

export function QualityBreakdown({ breakdown }) {
  if (!breakdown) return null;
  const items = [
    ['Complétude', breakdown.completeness_score],
    ['Détail', breakdown.detail_score],
    ['Fraîcheur', breakdown.freshness_score],
    ['Cohérence', breakdown.consistency_score],
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 8 }}>
      {items.map(([label, val]) => (
        <div key={label} style={{ fontSize: 11, color: 'var(--txt3, #6b7280)' }}>
          {label}: <strong style={{ color: colorForScore(val) }}>{typeof val === 'number' ? val : '—'}</strong>
        </div>
      ))}
    </div>
  );
}
