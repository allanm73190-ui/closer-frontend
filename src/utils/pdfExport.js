import { jsPDF } from 'jspdf';
import { computeSectionScores, fmtDate, toScore20FromPercentage } from './scoring';

const SECTION_ORDER = [
  { key: 'decouverte', label: 'Découverte' },
  { key: 'reformulation', label: 'Reformulation' },
  { key: 'projection', label: 'Projection' },
  { key: 'presentation_offre', label: "Présentation de l'offre" },
  { key: 'closing', label: 'Closing & Objections' },
];

const RESULT_LABELS = {
  close: 'Closé',
  signe: 'Closé',
  closed: 'Closé',
  relance: 'Relance',
  retrograde: 'Rétrogradé',
  porte_ouverte: 'Porte ouverte',
  ouvert: 'Porte ouverte',
  perdu: 'Perdu',
  non_close: 'Non closé',
  non_closé: 'Non closé',
  non_closé_: 'Non closé',
};

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function asText(value = '') {
  return String(value ?? '').trim();
}

function slugify(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function stripMarkdown(value = '') {
  return String(value || '')
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/^\s*[-*•]\s+/gm, '')
    .trim();
}

function toCleanLines(value = '') {
  return stripMarkdown(value)
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
}

function toParagraphs(value = '') {
  return String(value || '')
    .replace(/\r/g, '\n')
    .split(/\n{2,}/)
    .map(block => block
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .join(' '))
    .map(stripMarkdown)
    .map(block => block.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function toBarColor(score) {
  if (score >= 4) return '#059669';
  if (score >= 3) return '#d97706';
  if (score >= 2) return '#e87d6a';
  return '#dc2626';
}

function toReadableResult(debrief = {}) {
  const raw = asText(debrief?.sections?.closing?.resultat_closing || debrief?.resultat_closing).toLowerCase();
  if (raw && RESULT_LABELS[raw]) return RESULT_LABELS[raw];
  if (raw) return raw.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
  return debrief?.is_closed ? 'Closé' : 'Non closé';
}

function toSingleParagraph(value = '') {
  return String(value || '')
    .replace(/\r/g, '\n')
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .split('\n')
    .map(line => line.trim())
    .map(line => line.replace(/^[-*•]\s+/, ''))
    .map(line => line.replace(/^\d+\s*[.)]\s+/, ''))
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildFallbackSummary(analysisText = '') {
  const lines = toCleanLines(analysisText)
    .filter(line => !/^#+\s*/.test(line))
    .filter(line => !/^\d+\s*[\.\)]\s*$/.test(line))
    .filter(line => line.length > 16);

  if (lines.length === 0) return [];

  const keywords = [
    'verdict',
    'forces',
    'point fort',
    'failles',
    'faible',
    'risque',
    'pattern',
    'compétence',
    'action',
    'prioritaire',
  ];

  const picked = [];
  for (const line of lines) {
    const low = line.toLowerCase();
    if (keywords.some(keyword => low.includes(keyword))) {
      picked.push(line);
    }
    if (picked.length >= 5) break;
  }

  if (picked.length < 3) {
    for (const line of lines) {
      if (!picked.includes(line)) picked.push(line);
      if (picked.length >= 4) break;
    }
  }
  return toSingleParagraph(picked.slice(0, 4).join(' '));
}

function normalizeActionText(value = '') {
  const cleaned = String(value || '')
    .replace(/^[-*•]\s*/, '')
    .replace(/^action prioritaire\s*[:\-]\s*/i, '')
    .replace(/^action concr[eè]te\s*[:\-]\s*/i, '')
    .replace(/^action concr[eè]te pour les 10 prochains calls\s*[:\-]\s*/i, '')
    .replace(/^action pour les 10 prochains calls\s*[:\-]\s*/i, '')
    .replace(/^\d+\s*[.)]\s*action prioritaire\s*[:\-]\s*/i, '')
    .replace(/^\d+\s*[.)]\s*action concr[eè]te(?: pour les 10 prochains calls)?\s*[:\-]\s*/i, '')
    .replace(/^\d+\s*[.)]\s*script de correction\s*[:\-]\s*/i, '')
    .replace(/^script de correction\s*$/i, '')
    .replace(/^script de correction\s*[:\-]\s*/i, '')
    .trim();

  const idx = cleaned.indexOf(':');
  if (idx > 0 && idx < 70) {
    const head = cleaned.slice(0, idx).toLowerCase();
    if (
      head.includes('action')
      || head.includes('script')
      || head.includes('prioritaire')
      || head.includes('prochains calls')
    ) {
      return cleaned.slice(idx + 1).trim();
    }
  }
  return cleaned;
}

function extractPriorityActions(analysisText = '', debrief = {}) {
  const lines = toCleanLines(analysisText)
    .map(normalizeActionText)
    .filter(Boolean);
  const paragraphs = toParagraphs(analysisText)
    .map(normalizeActionText)
    .filter(Boolean);

  const selected = [];
  const addCandidate = (candidate) => {
    const clean = normalizeActionText(candidate);
    if (!clean || clean.length < 14) return;
    if (selected.some(item => item.toLowerCase() === clean.toLowerCase())) return;
    selected.push(clean);
  };

  lines.forEach(line => {
    const low = line.toLowerCase();
    if (
      low.includes('action prioritaire')
      || low.includes('action concrète')
      || low.includes('action concrete')
      || low.includes('prochains calls')
      || low.includes('prochain appel')
      || low.includes('script')
      || low.includes('corriger')
      || low.includes('automatiser')
    ) {
      addCandidate(line);
    }
  });

  paragraphs.forEach(block => {
    const low = block.toLowerCase();
    if (
      low.includes('action prioritaire')
      || low.includes('action concrète')
      || low.includes('action concrete')
      || low.includes('prochains calls')
      || low.includes('script de correction')
      || low.includes('action à mener')
      || low.includes('action a mener')
    ) {
      addCandidate(block);
    }
  });

  const improvementPool = [
    debrief?.improvements,
    debrief?.section_notes?.decouverte?.improvement,
    debrief?.section_notes?.reformulation?.improvement,
    debrief?.section_notes?.projection?.improvement,
    debrief?.section_notes?.presentation_offre?.improvement,
    debrief?.section_notes?.offre?.improvement,
    debrief?.section_notes?.closing?.improvement,
  ]
    .map(value => asText(value))
    .filter(Boolean);

  improvementPool.forEach(addCandidate);

  if (selected.length < 2) {
    addCandidate('Structurer la découverte avec une douleur précise, une temporalité claire et un impact chiffré.');
  }
  if (selected.length < 2) {
    addCandidate("Isoler l'objection dominante puis valider un next-step daté avant la fin de l'appel.");
  }

  return selected.slice(0, 2);
}

function getScoreExtremes(scores = {}) {
  const rows = SECTION_ORDER.map(section => ({
    label: section.label,
    score: Number(scores[section.key] || 0),
  }));
  rows.sort((a, b) => b.score - a.score);
  return { strongest: rows[0] || null, weakest: rows[rows.length - 1] || null };
}

export function getSectionNote(sectionNotes, key) {
  if (!sectionNotes) return null;
  return sectionNotes[key] || (key === 'presentation_offre' ? sectionNotes.offre : null) || null;
}

function normalizeNote(note) {
  return {
    strength: asText(note?.strength || note?.strengths),
    weakness: asText(note?.weakness || note?.weaknesses),
    improvement: asText(note?.improvement || note?.improvements),
  };
}

function buildSectionBars(scores = {}) {
  return SECTION_ORDER.map(section => {
    const score = Number(scores[section.key] || 0);
    const width = Math.max(0, Math.min(100, (score / 5) * 100));
    return `
      <div class="bar-row">
        <div class="bar-head">
          <span>${escapeHtml(section.label)}</span>
          <strong>${score.toFixed(1)}/5</strong>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${width}%;background:${toBarColor(score)};"></div>
        </div>
      </div>
    `;
  }).join('');
}

function buildDetailedSections(debrief = {}, scores = {}) {
  const notes = debrief.section_notes || {};
  return SECTION_ORDER.map(section => {
    const score = Number(scores[section.key] || 0);
    const width = Math.max(0, Math.min(100, (score / 5) * 100));
    const note = normalizeNote(getSectionNote(notes, section.key));
    return `
      <article class="detail-card">
        <div class="detail-head">
          <h4>${escapeHtml(section.label)}</h4>
          <span>${score.toFixed(1)}/5</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${width}%;background:${toBarColor(score)};"></div>
        </div>
        <div class="note-grid">
          <div class="note-box ok">
            <p class="note-label">Point fort</p>
            <p class="note-text">${escapeHtml(note.strength || 'Non renseigné')}</p>
          </div>
          <div class="note-box ko">
            <p class="note-label">Point faible</p>
            <p class="note-text">${escapeHtml(note.weakness || 'Non renseigné')}</p>
          </div>
          <div class="note-box up">
            <p class="note-label">Amélioration</p>
            <p class="note-text">${escapeHtml(note.improvement || 'Non renseigné')}</p>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

function polarPoint(index, total, ratio, center, radius) {
  const angle = (-Math.PI / 2) + ((Math.PI * 2) * index / total);
  const r = radius * ratio;
  const x = center + Math.cos(angle) * r;
  const y = center + Math.sin(angle) * r;
  return `${x.toFixed(2)},${y.toFixed(2)}`;
}

function buildRadarSvg(scores = {}) {
  const labels = SECTION_ORDER.map(section => section.label);
  const values = SECTION_ORDER.map(section => Math.max(0, Math.min(5, Number(scores[section.key] || 0))));
  const total = labels.length;
  const size = 340;
  const center = size / 2;
  const radius = 112;

  const levelPolygons = [0.25, 0.5, 0.75, 1].map(level => {
    const points = labels.map((_, idx) => polarPoint(idx, total, level, center, radius)).join(' ');
    return `<polygon points="${points}" class="radar-level" />`;
  }).join('');

  const axes = labels.map((_, idx) => {
    const end = polarPoint(idx, total, 1, center, radius);
    const [x2, y2] = end.split(',');
    return `<line x1="${center}" y1="${center}" x2="${x2}" y2="${y2}" class="radar-axis" />`;
  }).join('');

  const dataPoints = values.map((value, idx) => polarPoint(idx, total, value / 5, center, radius)).join(' ');

  const dataDots = values.map((value, idx) => {
    const [x, y] = polarPoint(idx, total, value / 5, center, radius).split(',');
    return `<circle cx="${x}" cy="${y}" r="4" class="radar-dot" />`;
  }).join('');

  const labelPoints = labels.map((label, idx) => {
    const [x, y] = polarPoint(idx, total, 1.16, center, radius).split(',');
    return `<text x="${x}" y="${y}" class="radar-label" text-anchor="middle">${escapeHtml(label)}</text>`;
  }).join('');

  return `
    <svg viewBox="0 0 ${size} ${size}" class="radar-svg" role="img" aria-label="Radar des sections">
      ${levelPolygons}
      ${axes}
      <polygon points="${dataPoints}" class="radar-shape" />
      ${dataDots}
      ${labelPoints}
    </svg>
  `;
}

function formatAnalysisToHtml(analysisText = '') {
  if (!asText(analysisText)) {
    return '<p class="hint">Aucune analyse IA disponible.</p>';
  }

  const rows = String(analysisText).split('\n');
  let html = '';
  let inList = false;

  const closeList = () => {
    if (inList) {
      html += '</ul>';
      inList = false;
    }
  };

  rows.forEach(rawRow => {
    const trimmed = rawRow.trim();
    const row = stripMarkdown(trimmed);

    if (!row) {
      closeList();
      return;
    }

    if (/^#{1,6}\s*/.test(trimmed)) {
      closeList();
      html += `<h3>${escapeHtml(row.replace(/^#+\s*/, ''))}</h3>`;
      return;
    }

    if (/^\d+[\.\)]\s+/.test(row)) {
      closeList();
      html += `<h3>${escapeHtml(row)}</h3>`;
      return;
    }

    if (/^[-*•]\s+/.test(trimmed)) {
      if (!inList) {
        html += '<ul class="analysis-list">';
        inList = true;
      }
      html += `<li>${escapeHtml(row)}</li>`;
      return;
    }

    closeList();

    if (/^[^:]{3,60}:\s+/.test(row)) {
      const idx = row.indexOf(':');
      const label = row.slice(0, idx + 1);
      const text = row.slice(idx + 1).trim();
      html += `<p><strong>${escapeHtml(label)}</strong> ${escapeHtml(text)}</p>`;
      return;
    }

    html += `<p>${escapeHtml(row)}</p>`;
  });

  closeList();
  return html || '<p class="hint">Aucune analyse IA disponible.</p>';
}

function buildContext(payload = {}) {
  const debrief = payload?.debrief || {};
  const title = `debrief-${slugify(debrief.prospect_name || 'prospect')}-${debrief.call_date || 'export'}.pdf`;
  const percentage = Math.round(Number(debrief.percentage || 0));
  const score20 = toScore20FromPercentage(percentage);
  const scores = computeSectionScores(debrief.sections || {});
  const resultLabel = toReadableResult(debrief);
  const analysisText = asText(payload?.analysis || '');
  const exportSummary = toSingleParagraph(payload?.exportSummary || '');

  return {
    debrief,
    title,
    percentage,
    score20,
    scores,
    resultLabel,
    analysisText,
    exportSummary,
  };
}

function buildDebriefPdfHtml(payload) {
  const ctx = buildContext(payload);
  const {
    debrief,
    title,
    percentage,
    score20,
    scores,
    resultLabel,
    analysisText,
    exportSummary,
  } = ctx;

  const summaryText = exportSummary || buildFallbackSummary(analysisText);
  const priorityActions = extractPriorityActions(analysisText, debrief);
  const extremes = getScoreExtremes(scores);
  const sectionBars = buildSectionBars(scores);
  const detailedSections = buildDetailedSections(debrief, scores);
  const radarSvg = buildRadarSvg(scores);
  const fullAnalysisHtml = formatAnalysisToHtml(analysisText);

  const callLink = asText(debrief.call_link);
  const leadName = asText(debrief.prospect_name) || 'Non renseigné';
  const closerName = asText(debrief.closer_name || debrief.user_name) || 'Non renseigné';

  return `<!doctype html>
  <html lang="fr">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${escapeHtml(title)}</title>
      <style>
        :root {
          --paper: #fffdfa;
          --bg: #f3f6fc;
          --text: #33291f;
          --muted: #7c6a59;
          --line: #e6d9cd;
          --accent: #e87d6a;
          --accent-2: #d4604e;
        }
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; }
        body {
          font-family: Inter, system-ui, sans-serif;
          color: var(--text);
          background: linear-gradient(165deg, #eaf0fb 0%, #f8eee7 100%);
        }
        .topbar {
          position: sticky;
          top: 0;
          z-index: 20;
          background: rgba(255, 255, 255, .9);
          backdrop-filter: blur(6px);
          border-bottom: 1px solid var(--line);
          padding: 10px 14px;
          font-size: 12px;
          color: var(--muted);
        }
        .stack {
          width: min(940px, calc(100vw - 30px));
          margin: 18px auto 28px;
          display: grid;
          gap: 18px;
        }
        .page {
          background: var(--paper);
          border: 1px solid #f0e4d9;
          border-radius: 20px;
          box-shadow: 0 16px 34px rgba(70, 52, 40, .12);
          padding: 24px;
          min-height: 1120px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .actions-section {
          margin-top: auto;
        }
        .kicker {
          margin: 0;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: .08em;
          font-weight: 700;
          color: var(--muted);
        }
        .header-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 220px;
          gap: 12px;
        }
        .card {
          border: 1px solid var(--line);
          border-radius: 14px;
          background: #fff;
          padding: 14px;
        }
        .lead-info {
          display: grid;
          gap: 8px;
        }
        .lead-row {
          display: grid;
          grid-template-columns: 112px minmax(0, 1fr);
          gap: 8px;
          align-items: start;
          font-size: 13px;
        }
        .lead-row strong {
          color: #59493d;
        }
        .lead-row span {
          color: #392f26;
          overflow-wrap: anywhere;
        }
        .lead-row a {
          color: #9c4233;
          text-decoration: none;
          border-bottom: 1px solid rgba(156, 66, 51, .35);
        }
        .score-card {
          display: grid;
          place-items: center;
          text-align: center;
          background: linear-gradient(165deg, #243145 0%, #3c4a64 55%, var(--accent) 100%);
          color: #fff;
          border-radius: 14px;
          padding: 14px;
        }
        .score-card .score {
          font-size: 48px;
          font-weight: 800;
          line-height: 1;
          letter-spacing: -.02em;
        }
        .score-card .base {
          margin-top: 3px;
          font-size: 13px;
          opacity: .9;
        }
        .score-card .result {
          margin-top: 10px;
          font-size: 13px;
          font-weight: 700;
          padding: 6px 10px;
          border-radius: 999px;
          background: rgba(255, 255, 255, .18);
          border: 1px solid rgba(255, 255, 255, .25);
        }
        .summary-text {
          margin: 0;
          font-size: 13px;
          line-height: 1.62;
          color: #46392e;
          white-space: pre-wrap;
        }
        .summary-note {
          margin: 8px 0 0;
          font-size: 11px;
          color: var(--muted);
        }
        .viz-grid {
          display: grid;
          grid-template-columns: 1fr 1.1fr;
          gap: 12px;
          align-items: stretch;
        }
        .radar-wrap {
          display: grid;
          place-items: center;
          min-height: 308px;
          border: 1px solid var(--line);
          border-radius: 14px;
          background: linear-gradient(170deg, #fff 0%, #fff8f2 100%);
          padding: 10px;
        }
        .radar-svg { width: 100%; max-width: 320px; height: auto; }
        .radar-level {
          fill: none;
          stroke: #efe1d5;
          stroke-width: 1.1;
        }
        .radar-axis {
          stroke: #ecdccf;
          stroke-width: 1;
        }
        .radar-shape {
          fill: rgba(232, 125, 106, .22);
          stroke: #d4604e;
          stroke-width: 2.4;
        }
        .radar-dot {
          fill: #d4604e;
          stroke: #fff;
          stroke-width: 1.2;
        }
        .radar-label {
          font-size: 10px;
          fill: #5d4b3d;
          font-weight: 600;
        }
        .bars-wrap {
          border: 1px solid var(--line);
          border-radius: 14px;
          background: #fff;
          padding: 14px;
          display: grid;
          gap: 10px;
          align-content: start;
        }
        .bar-row + .bar-row { margin-top: 8px; }
        .bar-head {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 4px;
          font-size: 13px;
        }
        .bar-track {
          height: 10px;
          border-radius: 999px;
          background: #efe2d8;
          overflow: hidden;
        }
        .bar-fill {
          height: 100%;
          border-radius: inherit;
        }
        .inline-metrics {
          margin-top: 6px;
          display: grid;
          grid-template-columns: 1fr;
          gap: 6px;
        }
        .metric-row {
          font-size: 12px;
          color: #5d4d3f;
          background: #faf5ef;
          border: 1px solid #efe3d8;
          border-radius: 9px;
          padding: 7px 9px;
        }
        .actions-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
        .action-card {
          border: 1px solid #eedfce;
          border-radius: 12px;
          background: linear-gradient(160deg, #fff 0%, #fff6ee 100%);
          padding: 12px;
        }
        .action-tag {
          display: inline-block;
          padding: 3px 8px;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: .06em;
          border-radius: 999px;
          background: rgba(212, 96, 78, .12);
          color: #a5402f;
          font-weight: 700;
          margin-bottom: 7px;
        }
        .action-card p {
          margin: 0;
          font-size: 13px;
          color: #42362c;
          line-height: 1.5;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }
        .analysis-block {
          border: 1px solid var(--line);
          border-radius: 14px;
          background: #fff;
          padding: 14px;
        }
        .analysis-block h3 {
          margin: 12px 0 6px;
          font-size: 15px;
          color: #3e3025;
        }
        .analysis-block h3:first-child { margin-top: 0; }
        .analysis-block p {
          margin: 0 0 8px;
          font-size: 13px;
          color: #4a3b2f;
          line-height: 1.56;
          white-space: pre-wrap;
        }
        .analysis-list {
          margin: 0 0 10px;
          padding-left: 20px;
          display: grid;
          gap: 6px;
          font-size: 13px;
          color: #4a3b2f;
        }
        .detail-stack {
          display: grid;
          gap: 10px;
        }
        .detail-card {
          border: 1px solid #ebdfd3;
          border-radius: 12px;
          background: #fffdfa;
          padding: 12px;
        }
        .detail-head {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          align-items: baseline;
          margin-bottom: 6px;
        }
        .detail-head h4 {
          margin: 0;
          font-size: 14px;
          color: #3d2f24;
        }
        .detail-head span {
          font-size: 12px;
          font-weight: 700;
          color: #5a4b3e;
        }
        .note-grid {
          margin-top: 10px;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
        }
        .note-box {
          border-radius: 10px;
          padding: 8px;
          border: 1px solid transparent;
          min-height: 74px;
        }
        .note-box.ok {
          background: #f0fdf4;
          border-color: #bbf7d0;
        }
        .note-box.ko {
          background: #fef2f2;
          border-color: #fecaca;
        }
        .note-box.up {
          background: #fff7ed;
          border-color: #fed7aa;
        }
        .note-label {
          margin: 0 0 5px;
          font-size: 11px;
          font-weight: 700;
          color: #5f4f40;
          text-transform: uppercase;
          letter-spacing: .04em;
        }
        .note-text {
          margin: 0;
          font-size: 12px;
          line-height: 1.44;
          color: #403428;
          white-space: pre-wrap;
        }
        .hint {
          margin: 0;
          font-size: 13px;
          color: var(--muted);
          line-height: 1.5;
        }
        @media (max-width: 900px) {
          .page { min-height: auto; padding: 18px; border-radius: 14px; }
          .header-grid { grid-template-columns: 1fr; }
          .viz-grid { grid-template-columns: 1fr; }
          .actions-grid { grid-template-columns: 1fr; }
          .note-grid { grid-template-columns: 1fr; }
          .lead-row { grid-template-columns: 1fr; gap: 3px; }
        }
        @media print {
          body { background: #fff; }
          .topbar { display: none; }
          .stack { width: 100%; margin: 0; gap: 0; }
          .page {
            border: none;
            box-shadow: none;
            border-radius: 0;
            page-break-after: always;
            break-after: page;
            padding: 12mm;
          }
          .page:last-child {
            page-break-after: auto;
            break-after: auto;
          }
        }
      </style>
    </head>
    <body>
      <div class="topbar">Export Debrief · format 2 pages (header, résumé IA, radar, actions, analyse complète)</div>
      <main class="stack">
        <section class="page">
          <p class="kicker">Page 1 · Synthèse opérationnelle</p>

          <section class="header-grid">
            <article class="card lead-info">
              <div class="lead-row">
                <strong>Nom / Prénom</strong>
                <span>${escapeHtml(leadName)}</span>
              </div>
              <div class="lead-row">
                <strong>Date</strong>
                <span>${escapeHtml(fmtDate(debrief.call_date))}</span>
              </div>
              <div class="lead-row">
                <strong>Closer</strong>
                <span>${escapeHtml(closerName)}</span>
              </div>
              <div class="lead-row">
                <strong>Lien appel</strong>
                <span>${
                  callLink
                    ? `<a href="${escapeHtml(callLink)}" target="_blank" rel="noopener noreferrer">${escapeHtml(callLink)}</a>`
                    : 'Non renseigné'
                }</span>
              </div>
            </article>

            <article class="score-card">
              <div class="score">${score20}</div>
              <div class="base">/20 · ${percentage}%</div>
              <div class="result">${escapeHtml(resultLabel)}</div>
            </article>
          </section>

          <section class="card">
            <h2 style="margin:0 0 8px;font-size:16px;">Résumé IA</h2>
            ${
              summaryText
                ? `<p class="summary-text">${escapeHtml(summaryText)}</p>`
                : '<p class="hint">Aucune synthèse IA disponible pour ce debrief.</p>'
            }
            <p class="summary-note">Résumé généré via appel IA dédié à partir de la synthèse du debrief.</p>
          </section>

          <section class="viz-grid">
            <article class="radar-wrap">
              ${radarSvg}
            </article>
            <article class="bars-wrap">
              <h2 style="margin:0;font-size:16px;">Scores par section</h2>
              ${sectionBars}
              <div class="inline-metrics">
                <div class="metric-row">
                  <strong>Point le plus solide :</strong>
                  ${escapeHtml(extremes.strongest ? `${extremes.strongest.label} (${extremes.strongest.score.toFixed(1)}/5)` : 'N/A')}
                </div>
                <div class="metric-row">
                  <strong>Lacune principale :</strong>
                  ${escapeHtml(extremes.weakest ? `${extremes.weakest.label} (${extremes.weakest.score.toFixed(1)}/5)` : 'N/A')}
                </div>
              </div>
            </article>
          </section>

          <section class="card actions-section">
            <h2 style="margin:0 0 8px;font-size:16px;">2 actions prioritaires</h2>
            <div class="actions-grid">
              <article class="action-card">
                <span class="action-tag">Priorité 1</span>
                <p>${escapeHtml(priorityActions[0] || 'Action prioritaire non définie')}</p>
              </article>
              <article class="action-card">
                <span class="action-tag">Priorité 2</span>
                <p>${escapeHtml(priorityActions[1] || 'Action secondaire non définie')}</p>
              </article>
            </div>
          </section>
        </section>

        <section class="page">
          <p class="kicker">Page 2 · Analyse complète et détails par section</p>

          <section class="analysis-block">
            <h2 style="margin:0 0 8px;font-size:18px;">Analyse complète de l'IA</h2>
            ${fullAnalysisHtml}
          </section>

          <section class="card">
            <h2 style="margin:0 0 8px;font-size:16px;">Scores détaillés & commentaires du debrief</h2>
            <div class="detail-stack">
              ${detailedSections}
            </div>
          </section>
        </section>
      </main>
    </body>
  </html>`;
}

export function buildDebriefPdfPreviewHtml(payload) {
  return buildDebriefPdfHtml(payload);
}

function buildLoadingHtml(title) {
  return `<!doctype html>
  <html lang="fr">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${escapeHtml(title)}</title>
      <style>
        body {
          margin: 0;
          min-height: 100vh;
          display: grid;
          place-items: center;
          background: #f4efe9;
          font-family: Inter, system-ui, sans-serif;
          color: #5a4a3a;
        }
        .loading {
          width: min(500px, calc(100vw - 40px));
          padding: 24px;
          border-radius: 18px;
          background: white;
          box-shadow: 0 14px 32px rgba(90, 74, 58, .14);
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .dot {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          border: 4px solid rgba(232, 125, 106, .15);
          border-top-color: #e87d6a;
          animation: spin .8s linear infinite;
          flex-shrink: 0;
        }
        .title {
          margin: 0 0 4px;
          font-size: 16px;
          font-weight: 700;
        }
        .text {
          margin: 0;
          font-size: 13px;
          color: #8d7a6b;
          line-height: 1.5;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      </style>
    </head>
    <body>
      <div class="loading">
        <div class="dot"></div>
        <div>
          <p class="title">Préparation du PDF</p>
          <p class="text">Génération du rendu en cours...</p>
        </div>
      </div>
    </body>
  </html>`;
}

export function openDebriefPdfWindow(debrief) {
  const title = `debrief-${slugify(debrief?.prospect_name || 'prospect')}-${debrief?.call_date || 'export'}.pdf`;
  const exportWindow = window.open('', '_blank', 'width=1120,height=860');
  if (!exportWindow) {
    throw new Error("Le navigateur a bloqué l'ouverture de la fenêtre PDF. Autorisez les popups pour continuer.");
  }
  exportWindow.document.open();
  exportWindow.document.write(buildLoadingHtml(title));
  exportWindow.document.close();
  return exportWindow;
}

export function renderDebriefPdfWindow(targetWindow, payload) {
  if (!targetWindow || targetWindow.closed) {
    throw new Error("La fenêtre d'export a été fermée avant la génération du PDF.");
  }
  const html = buildDebriefPdfHtml(payload);
  targetWindow.document.open();
  targetWindow.document.write(html);
  targetWindow.document.close();
  targetWindow.focus();
}

export async function downloadDebriefPdf(payload) {
  const { title } = buildContext(payload || {});
  const html = buildDebriefPdfHtml(payload || {});
  const CAPTURE_WIDTH = 1200;
  const CAPTURE_HEIGHT = Math.round(CAPTURE_WIDTH * Math.sqrt(2));

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.left = '-10000px';
  iframe.style.top = '0';
  iframe.style.width = `${CAPTURE_WIDTH}px`;
  iframe.style.height = `${CAPTURE_HEIGHT}px`;
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  document.body.appendChild(iframe);

  const cleanup = () => {
    try { iframe.remove(); } catch {}
  };

  try {
    await new Promise((resolve, reject) => {
      let done = false;
      const timeoutId = window.setTimeout(() => {
        if (done) return;
        done = true;
        reject(new Error("Le visualisateur PDF met trop de temps à se charger."));
      }, 12000);

      iframe.onload = () => {
        if (done) return;
        done = true;
        window.clearTimeout(timeoutId);
        resolve();
      };

      iframe.srcdoc = html;
    });

    const docRef = iframe.contentDocument;
    if (!docRef) throw new Error('Impossible de préparer le rendu PDF.');

    if (docRef.fonts?.ready) {
      try { await docRef.fonts.ready; } catch {}
    }
    await new Promise(resolve => window.setTimeout(resolve, 180));

    const pages = Array.from(docRef.querySelectorAll('.page'));
    if (pages.length === 0) throw new Error("Aucune page PDF à exporter.");

    const { default: html2canvas } = await import('html2canvas');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();

    for (let i = 0; i < pages.length; i += 1) {
      const pageEl = pages[i];
      const pageRect = pageEl.getBoundingClientRect();
      const canvas = await html2canvas(pageEl, {
        scale: 2.2,
        useCORS: true,
        backgroundColor: '#fffdfa',
        logging: false,
        windowWidth: CAPTURE_WIDTH,
        windowHeight: CAPTURE_HEIGHT,
        width: Math.ceil(pageRect.width),
        height: Math.ceil(pageRect.height),
        scrollX: 0,
        scrollY: 0,
      });

      const img = canvas.toDataURL('image/png');
      const props = pdf.getImageProperties(img);
      const printableW = pageW - 10;
      const printableH = pageH - 10;
      const ratio = Math.min(printableW / props.width, printableH / props.height);
      const renderW = props.width * ratio;
      const renderH = props.height * ratio;
      const x = (pageW - renderW) / 2;
      const y = (pageH - renderH) / 2;

      if (i > 0) pdf.addPage();
      pdf.addImage(img, 'PNG', x, y, renderW, renderH, undefined, 'FAST');
    }

    pdf.save(title);
  } finally {
    cleanup();
  }
}
