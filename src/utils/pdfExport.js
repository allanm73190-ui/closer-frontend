import { SECTIONS } from '../config/ai';
import { jsPDF } from 'jspdf';
import { computeSectionScores, fmtDate, toScore20FromPercentage } from './scoring';

const OBJECTION_LABELS = {
  budget: 'Budget',
  reflechir: 'Besoin de reflechir',
  conjoint: 'Validation du conjoint',
  methode: 'Doute sur la methode',
  aucune: 'Aucune',
};

const SECTION_DETAILS_ORDER = [
  { key: 'decouverte', label: 'Découverte' },
  { key: 'reformulation', label: 'Reformulation' },
  { key: 'projection', label: 'Projection' },
  { key: 'presentation_offre', label: "Présentation de l'offre" },
  { key: 'closing', label: 'Closing & Objections' },
];

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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

function renderText(value = '') {
  return escapeHtml(value).replace(/\n/g, '<br/>');
}

function barColor(score) {
  if (score >= 4) return '#059669';
  if (score >= 3) return '#d97706';
  if (score >= 2) return '#e87d6a';
  return '#ef4444';
}

function getSectionNote(sectionNotes, key) {
  if (!sectionNotes) return null;
  return sectionNotes[key] || (key === 'presentation_offre' ? sectionNotes.offre : null) || null;
}

function getSectionData(sections, key) {
  if (!sections) return {};
  return sections[key] || (key === 'presentation_offre' ? sections.offre : null) || {};
}

function formatFieldLabel(rawKey = '') {
  return String(rawKey || '')
    .replace(/_note$/i, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

function formatFieldValue(value) {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map(item => String(item)).join(', ');
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return '';
    }
  }
  return String(value);
}

function readSectionNote(noteObj, keys = []) {
  if (!noteObj || typeof noteObj !== 'object') return '';
  for (const key of keys) {
    const value = noteObj[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function cleanMarkdownLine(line = '') {
  return String(line || '')
    .replace(/^#{1,6}\s+/, '')
    .replace(/^[-*]\s+/, '')
    .replace(/^\d+[.)]\s+/, '')
    .replace(/\*\*/g, '')
    .trim();
}

function extractAnalysisLines(text) {
  if (!text) return [];
  return String(text)
    .split('\n')
    .map(line => cleanMarkdownLine(line))
    .filter(Boolean);
}

function extractActionPriority(text) {
  if (!text) return '';
  const strongMatch = text.match(/\*\*ACTION PRIORITAIRE\s*:\s*([^*]+)\*\*/i);
  if (strongMatch?.[1]) return strongMatch[1].trim();
  const plainMatch = text.match(/ACTION PRIORITAIRE\s*:\s*(.+)/i);
  return plainMatch?.[1]?.trim() || '';
}

function extractKeyBullets(text) {
  if (!text) return [];
  const lines = text.split('\n').map(line => line.trim());
  const bullets = lines
    .filter(line => /^[-*]\s+/.test(line) || /^\d+[.)]\s+/.test(line))
    .map(line => line.replace(/^[-*]\s+/, '').replace(/^\d+[.)]\s+/, '').trim())
    .filter(Boolean);
  if (bullets.length > 0) return bullets.slice(0, 6);
  return lines.filter(Boolean).slice(0, 4);
}

function getDominantObjection(debrief) {
  const objections = debrief?.sections?.closing?.objections || [];
  const objection = objections.find(item => item && item !== 'aucune');
  if (!objection) return debrief?.is_closed ? 'Aucune objection bloquante' : 'Aucune objection renseignee';
  return OBJECTION_LABELS[objection] || objection.replace(/_/g, ' ');
}

function getTopSections(scores) {
  return [...SECTIONS]
    .map(section => ({ ...section, score: scores[section.key] || 0 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);
}

function getPrioritySections(scores) {
  return [...SECTIONS]
    .map(section => ({ ...section, score: scores[section.key] || 0 }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 2);
}

function cleanSectionLabel(label = '') {
  return String(label || '').replace(/^[^\p{L}\p{N}]+/u, '').trim();
}

function truncateText(value = '', max = 120) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trim()}…`;
}

function dedupeStrings(values = []) {
  const seen = new Set();
  return values.filter(value => {
    const key = String(value || '').trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isLowSignalValue(value = '') {
  const raw = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
  if (!raw) return true;
  return (
    raw === 'oui' ||
    raw === 'non' ||
    raw === 'partiellement' ||
    raw === 'aucune' ||
    raw === 'aucun' ||
    raw === 'moyen' ||
    raw === 'faible' ||
    raw === 'forte' ||
    raw === 'fort' ||
    raw === 'complete' ||
    raw === 'partielle' ||
    raw === 'directe' ||
    raw === 'hesitante' ||
    raw === 'trop rapide' ||
    raw === 'close' ||
    raw === 'perdu' ||
    raw === 'relance' ||
    raw === 'porte ouverte'
  );
}

function getRiskMeta(percentage = 0, isClosed = false) {
  if (percentage >= 80 && isClosed) return { label: 'Risque faible', tone: 'good' };
  if (percentage >= 62) return { label: 'Risque modéré', tone: 'warn' };
  return { label: 'Risque élevé', tone: 'danger' };
}

function getScoreReading(percentage = 0) {
  if (percentage >= 85) return 'Très solide';
  if (percentage >= 72) return 'Solide';
  if (percentage >= 58) return 'À stabiliser';
  return 'Prioritaire à corriger';
}

function toRgb(color = '#e87d6a') {
  const map = {
    '#059669': [5, 150, 105],
    '#d97706': [217, 119, 6],
    '#e87d6a': [232, 125, 106],
    '#ef4444': [239, 68, 68],
  };
  return map[color] || [232, 125, 106];
}

function formatEvidenceLabel(rawKey = '') {
  const base = String(rawKey || '').replace(/_note$/i, '');
  if (/^q\d+$/i.test(base) || /^question[_-]?\d+$/i.test(base)) return 'Signal prospect';
  return formatFieldLabel(base);
}

function extractSectionEvidence(sectionData = {}, maxItems = 3) {
  const entries = Object.entries(sectionData || {});
  const explicit = [];

  for (const [key, value] of entries) {
    if (!/_note$/i.test(key)) continue;
    if (typeof value !== 'string' || !value.trim()) continue;
    explicit.push({
      label: formatEvidenceLabel(key),
      value: value.trim(),
    });
  }

  if (explicit.length > 0) return explicit.slice(0, maxItems);

  const fallback = [];
  for (const [key, value] of entries) {
    if (/_note$/i.test(key)) continue;
    const formatted = formatFieldValue(value).trim();
    if (!formatted || isLowSignalValue(formatted)) continue;
    if (formatted.length < 5) continue;
    fallback.push({
      label: formatEvidenceLabel(key),
      value: formatted,
    });
  }
  return fallback.slice(0, maxItems);
}

function buildSectionInsights(debrief, scores) {
  return SECTION_DETAILS_ORDER.map(({ key, label }) => {
    const score = scores[key] || 0;
    const sectionLabel = cleanSectionLabel(label);
    const note = getSectionNote(debrief?.section_notes, key);
    const strength = readSectionNote(note, ['strength', 'strengths']);
    const weakness = readSectionNote(note, ['weakness', 'weaknesses']);
    const improvement = readSectionNote(note, ['improvement', 'improvements']);
    const focus = improvement || weakness || strength || '';
    const evidence = extractSectionEvidence(getSectionData(debrief?.sections, key), 2);

    return {
      key,
      label: sectionLabel,
      score,
      strength,
      weakness,
      improvement,
      focus,
      evidence,
    };
  });
}

function buildExecutiveHighlights({ keyBullets, topSections, prioritySections, dominantObjection, actionPriority, sectionInsights }) {
  const evidenceLine = sectionInsights
    .flatMap(section => (section.evidence || []).map(item => `${section.label}: ${truncateText(item.value, 88)}`))
    .find(Boolean);

  const highlights = [
    ...keyBullets.slice(0, 2),
    topSections[0]
      ? `Levier principal: ${cleanSectionLabel(topSections[0].label)} (${topSections[0].score}/5).`
      : '',
    prioritySections[0]
      ? `Point de vigilance: ${cleanSectionLabel(prioritySections[0].label)} (${prioritySections[0].score}/5).`
      : '',
    dominantObjection.toLowerCase().includes('aucune')
      ? ''
      : `Objection dominante: ${dominantObjection}.`,
    evidenceLine ? `Verbatim clé: "${evidenceLine}"` : '',
    `Action à exécuter: ${actionPriority}`,
  ];

  return dedupeStrings(highlights).slice(0, 6);
}

function buildDecisionSummary({ debrief, percentage, scoreReading, dominantObjection, actionPriority }) {
  const status = debrief?.is_closed ? 'Closé' : 'Non closé';
  const objectionText = String(dominantObjection || '').toLowerCase().includes('aucune')
    ? 'sans objection bloquante explicite'
    : `frein principal: ${String(dominantObjection || '').toLowerCase()}`;
  return `Verdict ${status} · ${percentage}% (${scoreReading}) · ${objectionText}. Priorité suivante: ${actionPriority}`;
}

function buildExportContext({ debrief, comments = [], analysis = '' }) {
  const safeDebrief = debrief || {};
  const title = `debrief-${slugify(safeDebrief.prospect_name || 'prospect')}-${safeDebrief.call_date || 'export'}.pdf`;
  const percentage = Math.round(safeDebrief.percentage || 0);
  const score20 = toScore20FromPercentage(percentage);
  const scores = computeSectionScores(safeDebrief.sections || {});
  const topSections = getTopSections(scores);
  const prioritySections = getPrioritySections(scores);
  const actionPriority = extractActionPriority(analysis) || "Formaliser une action mesurable avant le prochain appel.";
  const keyBullets = extractKeyBullets(analysis);
  const analysisLines = extractAnalysisLines(analysis);
  const dominantObjection = getDominantObjection(safeDebrief);
  const risk = getRiskMeta(percentage, !!safeDebrief.is_closed);
  const sectionInsights = buildSectionInsights(safeDebrief, scores);
  const signals = sectionInsights
    .flatMap(section =>
      (section.evidence || []).map(item => ({
        section: section.label,
        label: item.label,
        value: item.value,
      }))
    )
    .slice(0, 8);
  const executiveHighlights = buildExecutiveHighlights({
    keyBullets,
    topSections,
    prioritySections,
    dominantObjection,
    actionPriority,
    sectionInsights,
  });
  const analysisDigest = dedupeStrings([...keyBullets, ...analysisLines]).slice(0, 4);
  const decisionSummary = buildDecisionSummary({
    debrief: safeDebrief,
    percentage,
    scoreReading: getScoreReading(percentage),
    dominantObjection,
    actionPriority,
  });

  return {
    title,
    debrief: safeDebrief,
    percentage,
    score20,
    scores,
    topSections,
    prioritySections,
    actionPriority,
    keyBullets,
    analysisLines,
    latestComments: [...comments].slice(-2).reverse(),
    dominantObjection,
    risk,
    sectionInsights,
    signals: signals.slice(0, 4),
    executiveHighlights: executiveHighlights.slice(0, 4),
    analysisDigest,
    decisionSummary,
    scoreReading: getScoreReading(percentage),
  };
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
          <p class="text">On met en avant l'essentiel d'abord, puis les détails utiles en annexe.</p>
        </div>
      </div>
    </body>
  </html>`;
}

function buildDebriefPdfHtml(payload) {
  const ctx = buildExportContext(payload || {});
  const {
    title,
    debrief,
    percentage,
    score20,
    topSections,
    prioritySections,
    actionPriority,
    latestComments,
    dominantObjection,
    risk,
    sectionInsights,
    signals,
    executiveHighlights,
    analysisDigest,
    decisionSummary,
    scoreReading,
  } = ctx;

  const riskToneClass = risk.tone === 'good' ? 'chip--good' : risk.tone === 'warn' ? 'chip--warn' : 'chip--danger';

  const highlightsHtml = executiveHighlights.length > 0
    ? `<ul class="list">${executiveHighlights.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
    : '<p class="hint">Aucune synthèse disponible.</p>';

  const signalsHtml = signals.length > 0
    ? `<ul class="list list--signals">${signals.map(signal => `<li><strong>${escapeHtml(signal.section)}</strong> · ${escapeHtml(signal.label)}: ${escapeHtml(truncateText(signal.value, 180))}</li>`).join('')}</ul>`
    : '<p class="hint">Aucun champ libre significatif n’a été saisi sur ce debrief.</p>';

  const scoreRows = sectionInsights.map(section => `
    <article class="score-row">
      <div class="score-row__head">
        <strong>${escapeHtml(section.label)}</strong>
        <span style="color:${barColor(section.score)}">${section.score}/5</span>
      </div>
      <div class="score-row__track">
        <div class="score-row__fill" style="width:${(section.score / 5) * 100}%;background:${barColor(section.score)}"></div>
      </div>
      <p class="score-row__focus">${escapeHtml(truncateText(section.focus || 'Aucun axe explicite saisi pour cette section.', 170))}</p>
    </article>
  `).join('');

  const analysisHtml = analysisDigest.length > 0
    ? `<ul class="list">${analysisDigest.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
    : '<p class="hint">Aucune analyse IA disponible.</p>';

  const commentsHtml = latestComments.length > 0
    ? latestComments.map(comment => `
      <div class="comment">
        <p class="comment__meta"><strong>${escapeHtml(comment.author_name || 'Équipe')}</strong> · ${escapeHtml(fmtDate(comment.created_at))}</p>
        <p>${renderText(comment.content || '')}</p>
      </div>
    `).join('')
    : '<p class="hint">Aucun commentaire équipe sur ce debrief.</p>';

  const annexHtml = sectionInsights.map(section => {
    const evidence = section.evidence.length > 0
      ? `<ul class="mini-list">${section.evidence.map(item => `<li><strong>${escapeHtml(item.label)}:</strong> ${escapeHtml(truncateText(item.value, 150))}</li>`).join('')}</ul>`
      : '<p class="hint" style="margin-top:6px;">Aucun détail libre saisi.</p>';

    return `
      <article class="annex-card">
        <div class="annex-card__head">
          <h3>${escapeHtml(section.label)}</h3>
          <span style="color:${barColor(section.score)}">${section.score}/5</span>
        </div>
        <p><strong>Point fort:</strong> ${escapeHtml(section.strength || 'Non renseigné')}</p>
        <p><strong>Point faible:</strong> ${escapeHtml(section.weakness || 'Non renseigné')}</p>
        <p><strong>Action ciblée:</strong> ${escapeHtml(section.improvement || 'Non renseigné')}</p>
        ${evidence}
      </article>
    `;
  }).join('');

  return `<!doctype html>
  <html lang="fr">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${escapeHtml(title)}</title>
      <style>
        :root {
          --text: #3b2f27;
          --muted: #8f7d6e;
          --line: #ead8cb;
          --bg: #f8f4f0;
          --paper: #ffffff;
          --accent-dark: #d4604e;
        }
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; }
        body {
          font-family: Inter, system-ui, sans-serif;
          background: var(--bg);
          color: var(--text);
        }
        .topbar {
          position: sticky;
          top: 0;
          z-index: 10;
          background: rgba(255,255,255,.92);
          border-bottom: 1px solid var(--line);
          padding: 10px 16px;
          font-size: 12px;
          color: var(--muted);
        }
        .pdf-stack {
          width: min(1080px, calc(100vw - 28px));
          margin: 18px auto 32px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .pdf-page {
          background: var(--paper);
          border-radius: 22px;
          box-shadow: 0 14px 34px rgba(74, 58, 47, .1);
          padding: 26px;
        }
        .page-label {
          margin: 0 0 10px;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: .1em;
          font-weight: 700;
          color: #8f7d6e;
        }
        .hero {
          display: grid;
          grid-template-columns: 1fr minmax(220px, 260px);
          gap: 16px;
          align-items: stretch;
          margin-bottom: 14px;
        }
        .hero-main {
          border: 1px solid var(--line);
          border-radius: 16px;
          padding: 16px;
          background: linear-gradient(160deg, #fffaf6 0%, #fff1ea 100%);
        }
        .kicker {
          margin: 0 0 8px;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: .1em;
          font-weight: 700;
          color: #a48572;
        }
        .hero-main h1 {
          margin: 0;
          font-size: 29px;
          line-height: 1.14;
        }
        .hero-meta {
          margin: 8px 0 0;
          color: #7a6557;
          font-size: 14px;
        }
        .chips {
          margin-top: 12px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .chip {
          border: 1px solid var(--line);
          background: #fff;
          color: #6f5f51;
          font-size: 11px;
          font-weight: 700;
          border-radius: 999px;
          padding: 6px 10px;
        }
        .chip--good { background: #ecfdf5; border-color: #8ce4bf; color: #166534; }
        .chip--warn { background: #fffbeb; border-color: #f9cf8a; color: #92400e; }
        .chip--danger { background: #fef2f2; border-color: #f8c6c6; color: #991b1b; }
        .hero-score {
          border: 1px solid #f1cabf;
          border-radius: 16px;
          background: linear-gradient(160deg, #fef2ec 0%, #ffe8df 100%);
          padding: 14px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .hero-score p {
          margin: 0;
          color: #8b6e5c;
          font-size: 12px;
        }
        .hero-score strong {
          display: block;
          margin-top: 6px;
          font-size: 54px;
          line-height: 1;
          color: var(--accent-dark);
        }
        .hero-score small {
          font-size: 13px;
          color: #795f51;
          margin-top: 6px;
        }
        .decision {
          margin-top: 12px;
          border: 1px solid #f3d7ca;
          border-radius: 12px;
          background: linear-gradient(160deg, #fff8f4 0%, #fff1ea 100%);
          padding: 14px;
        }
        .decision h2 {
          margin: 0 0 6px;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: .06em;
          color: #8a6b5a;
        }
        .decision p {
          margin: 0;
          font-size: 14px;
          line-height: 1.5;
          color: #5d4b3e;
        }
        .split {
          margin-top: 12px;
          display: grid;
          gap: 10px;
          grid-template-columns: 1fr 1fr;
        }
        .panel {
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 12px;
          background: #fff;
        }
        .panel h2 {
          margin: 0 0 8px;
          font-size: 14px;
          color: #4e4035;
        }
        .hint {
          margin: 0;
          color: var(--muted);
          font-size: 12px;
          line-height: 1.45;
        }
        .list {
          margin: 0;
          padding-left: 18px;
          font-size: 13px;
          line-height: 1.45;
        }
        .list li + li { margin-top: 5px; }
        .list--signals li strong {
          color: #5a4a3a;
        }
        .score-rows {
          display: grid;
          gap: 10px;
        }
        .score-row {
          border: 1px solid #f0e1d7;
          border-radius: 10px;
          padding: 10px;
          background: #fffcfa;
        }
        .score-row__head {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          align-items: baseline;
          margin-bottom: 6px;
          font-size: 13px;
        }
        .score-row__track {
          height: 10px;
          border-radius: 999px;
          background: #f2e2d8;
          overflow: hidden;
        }
        .score-row__fill {
          height: 100%;
          border-radius: inherit;
        }
        .score-row__focus {
          margin: 8px 0 0;
          font-size: 12px;
          color: #705f52;
          line-height: 1.45;
        }
        .comment + .comment {
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px dashed var(--line);
        }
        .comment__meta {
          margin: 0;
          color: #8f7d6e;
          font-size: 11px;
        }
        .comment p {
          margin: 4px 0 0;
          font-size: 12px;
          line-height: 1.45;
        }
        .panel--soft {
          margin-top: 12px;
          background: #fcf8f4;
        }
        .annex-grid {
          margin-top: 8px;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
        .annex-card {
          border: 1px solid var(--line);
          border-radius: 10px;
          padding: 10px;
          background: #fff;
        }
        .annex-card__head {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          align-items: baseline;
        }
        .annex-card h3 {
          margin: 0 0 6px;
          font-size: 13px;
        }
        .annex-card p {
          margin: 0 0 5px;
          font-size: 12px;
          line-height: 1.45;
          color: #6f5e50;
        }
        .mini-list {
          margin: 6px 0 0;
          padding-left: 16px;
          font-size: 12px;
          color: #6f5e50;
          line-height: 1.4;
        }
        .mini-list li + li { margin-top: 4px; }
        .footer {
          margin-top: 12px;
          border-top: 1px solid var(--line);
          padding-top: 10px;
          display: flex;
          justify-content: space-between;
          gap: 10px;
          color: #8f7d6e;
          font-size: 11px;
        }
        @media (max-width: 860px) {
          .pdf-page { padding: 16px; border-radius: 14px; }
          .hero { grid-template-columns: 1fr; }
          .split { grid-template-columns: 1fr; }
          .annex-grid { grid-template-columns: 1fr; }
        }
        @media print {
          body { background: #fff; }
          .topbar { display: none; }
          .pdf-stack {
            width: 100%;
            margin: 0;
            gap: 0;
          }
          .pdf-page {
            box-shadow: none;
            border-radius: 0;
            padding: 14mm;
            page-break-after: always;
            break-after: page;
          }
          .pdf-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }
        }
      </style>
    </head>
    <body>
      <div class="topbar">Prévisualisation PDF: 1 page principale (clés), 1 page secondaire (détails).</div>
      <main class="pdf-stack">
        <section class="pdf-page">
          <p class="page-label">Page principale · Éléments clés</p>
          <section class="hero">
            <div class="hero-main">
              <p class="kicker">Export debrief priorisé</p>
              <h1>${escapeHtml(debrief.prospect_name || 'Prospect non renseigné')}</h1>
              <p class="hero-meta">
                ${escapeHtml(fmtDate(debrief.call_date))} · ${escapeHtml(debrief.closer_name || debrief.user_name || 'Closer non renseigné')}
              </p>
              <div class="chips">
                <span class="chip">${debrief.is_closed ? 'Closé' : 'Non closé'}</span>
                <span class="chip ${riskToneClass}">${escapeHtml(risk.label)}</span>
                <span class="chip">Objection: ${escapeHtml(dominantObjection)}</span>
              </div>
            </div>
            <aside class="hero-score">
              <p>Score global</p>
              <strong>${score20}</strong>
              <small>/20 · ${percentage}% · ${escapeHtml(scoreReading)}</small>
            </aside>
          </section>

          <section class="decision">
            <h2>Résumé décisionnel</h2>
            <p>${escapeHtml(decisionSummary)}</p>
          </section>

          <section class="split">
            <article class="panel">
              <h2>Essentiel (4 points max)</h2>
              ${highlightsHtml}
            </article>
            <article class="panel">
              <h2>Plan immédiat</h2>
              <p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#604f42;">${escapeHtml(actionPriority)}</p>
              <ul class="list">
                <li>Levier principal: ${topSections[0] ? `${escapeHtml(cleanSectionLabel(topSections[0].label))} (${topSections[0].score}/5)` : 'Non renseigné'}</li>
                <li>Risque principal: ${prioritySections[0] ? `${escapeHtml(cleanSectionLabel(prioritySections[0].label))} (${prioritySections[0].score}/5)` : 'Non renseigné'}</li>
              </ul>
              ${debrief.notes ? `<p class="hint" style="margin-top:8px;"><strong>Note closer:</strong> ${renderText(truncateText(debrief.notes, 190))}</p>` : ''}
            </article>
          </section>

          <section class="split" style="margin-top:12px;">
            <article class="panel">
              <h2>Synthèse IA en bref</h2>
              ${analysisHtml}
            </article>
            <article class="panel">
              <h2>Repères rapides</h2>
              <ul class="list">
                <li>Statut: ${debrief.is_closed ? 'Closé' : 'Non closé'}</li>
                <li>Score: ${score20}/20</li>
                <li>Risque: ${escapeHtml(risk.label)}</li>
              </ul>
            </article>
          </section>
        </section>

        <section class="pdf-page">
          <p class="page-label">Page secondaire · Détails complets</p>
          <section class="panel" style="margin-top:0;">
            <h2>Performance détaillée par section</h2>
            <div class="score-rows">${scoreRows}</div>
          </section>

          <section class="split" style="margin-top:12px;">
            <article class="panel">
              <h2>Verbatims décisifs (champs libres)</h2>
              ${signalsHtml}
            </article>
            <article class="panel">
              <h2>Commentaires équipe</h2>
              ${commentsHtml}
            </article>
          </section>

          <section class="panel panel--soft">
            <h2>Annexe détaillée</h2>
            <div class="annex-grid">${annexHtml}</div>
          </section>

          <footer class="footer">
            <span>CloserDebrief · Export debrief</span>
            <span>${escapeHtml(title)}</span>
          </footer>
        </section>
      </main>
    </body>
  </html>`;
}

export function buildDebriefPdfPreviewHtml(payload) {
  return buildDebriefPdfHtml(payload);
}

export function openDebriefPdfWindow(debrief) {
  const title = `debrief-${slugify(debrief?.prospect_name || 'prospect')}-${debrief?.call_date || 'export'}.pdf`;
  const exportWindow = window.open('', '_blank', 'width=1120,height=860');
  if (!exportWindow) throw new Error("Le navigateur a bloque l'ouverture de la fenetre PDF. Autorisez les popups pour continuer.");
  exportWindow.document.open();
  exportWindow.document.write(buildLoadingHtml(title));
  exportWindow.document.close();
  return exportWindow;
}

export function renderDebriefPdfWindow(targetWindow, payload) {
  if (!targetWindow || targetWindow.closed) throw new Error("La fenetre d'export a ete fermee avant la generation du PDF.");
  const html = buildDebriefPdfHtml(payload);
  targetWindow.document.open();
  targetWindow.document.write(html);
  targetWindow.document.close();
  targetWindow.focus();
}

export async function downloadDebriefPdf(payload) {
  const ctx = buildExportContext(payload || {});
  const {
    title,
    debrief,
    percentage,
    score20,
    topSections,
    prioritySections,
    actionPriority,
    latestComments,
    dominantObjection,
    sectionInsights,
    signals,
    executiveHighlights,
    analysisDigest,
    decisionSummary,
    scoreReading,
  } = ctx;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentW = pageW - margin * 2;
  let y = margin;

  const ensureSpace = (required = 8) => {
    if (y + required <= pageH - margin) return;
    doc.addPage();
    y = margin;
  };

  const writeText = (text, {
    x = margin,
    width = contentW,
    size = 10.5,
    bold = false,
    color = [72, 60, 50],
    lineHeight = 4.6,
  } = {}) => {
    const safe = String(text || '').trim();
    if (!safe) return;
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(safe, width);
    for (const line of lines) {
      ensureSpace(lineHeight + 0.5);
      doc.text(line, x, y);
      y += lineHeight;
    }
  };

  const writeBullet = (text, { indent = 0, size = 10.2, color = [79, 66, 56], width = contentW - indent - 6 } = {}) => {
    const safe = String(text || '').trim();
    if (!safe) return;
    const x = margin + indent;
    const bulletX = x + 1.2;
    const textX = x + 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(safe, width);
    ensureSpace(5);
    doc.text('•', bulletX, y);
    doc.text(lines[0], textX, y);
    y += 4.8;
    for (let i = 1; i < lines.length; i += 1) {
      ensureSpace(4.8);
      doc.text(lines[i], textX, y);
      y += 4.8;
    }
  };

  const drawDivider = () => {
    ensureSpace(5);
    doc.setDrawColor(233, 216, 203);
    doc.setLineWidth(0.35);
    doc.line(margin, y, pageW - margin, y);
    y += 5;
  };

  const sectionTitle = text => {
    ensureSpace(8);
    doc.setFillColor(255, 243, 236);
    doc.setDrawColor(236, 191, 174);
    doc.roundedRect(margin, y - 3.4, contentW, 7.4, 1.8, 1.8, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(191, 87, 69);
    doc.text(String(text || ''), margin + 2.4, y + 1.1);
    y += 7.5;
  };

  const drawSummaryCard = (x, topY, w, h, titleText, lines, fill = [255, 249, 244]) => {
    doc.setFillColor(...fill);
    doc.setDrawColor(234, 216, 203);
    doc.roundedRect(x, topY, w, h, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.6);
    doc.setTextColor(84, 68, 56);
    doc.text(titleText, x + 2.8, topY + 4.8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.8);
    doc.setTextColor(110, 93, 78);
    let ly = topY + 9.2;
    (lines || []).slice(0, 3).forEach(item => {
      const split = doc.splitTextToSize(item, w - 5.6);
      if (split.length > 0) {
        doc.text(`- ${split[0]}`, x + 2.8, ly);
        ly += 3.9;
      }
    });
  };

  ensureSpace(24);
  doc.setFillColor(255, 245, 238);
  doc.setDrawColor(240, 208, 194);
  doc.roundedRect(margin, y - 2, contentW, 24, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16.8);
  doc.setTextColor(73, 58, 47);
  doc.text('Export Debrief', margin + 3, y + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.2);
  doc.setTextColor(118, 100, 86);
  doc.text('Lecture stratégique priorisée', margin + 3, y + 9.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(73, 58, 47);
  doc.text(truncateText(debrief.prospect_name || 'Prospect non renseigné', 56), margin + 3, y + 15);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(128, 108, 93);
  doc.text(`${fmtDate(debrief.call_date)} · ${debrief.closer_name || debrief.user_name || 'Closer non renseigné'}`, margin + 3, y + 19.3);

  const scoreBoxW = 38;
  const scoreBoxX = pageW - margin - scoreBoxW;
  doc.setFillColor(255, 234, 226);
  doc.setDrawColor(240, 192, 175);
  doc.roundedRect(scoreBoxX, y + 1, scoreBoxW, 20, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(212, 96, 78);
  doc.text(`${score20}`, scoreBoxX + scoreBoxW / 2, y + 10.8, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.6);
  doc.setTextColor(122, 101, 88);
  doc.text(`/20 · ${percentage}%`, scoreBoxX + scoreBoxW / 2, y + 15.7, { align: 'center' });
  y += 27;

  drawDivider();
  writeText(decisionSummary, {
    size: 10.2,
    bold: true,
    color: [78, 63, 52],
  });
  writeText(`Résultat: ${debrief.is_closed ? 'Closé' : 'Non closé'} · Objection dominante: ${dominantObjection}`, {
    size: 9.9,
    color: [112, 94, 80],
  });
  if (debrief.call_link) {
    writeText(`Lien appel: ${debrief.call_link}`, {
      size: 9.2,
      color: [120, 103, 89],
    });
  }

  drawDivider();
  sectionTitle('Essentiel (4 points max)');
  if (executiveHighlights.length > 0) {
    executiveHighlights.slice(0, 4).forEach(item => writeBullet(item));
  } else {
    writeBullet('Aucune synthèse disponible.');
  }

  ensureSpace(26);
  const cardW = (contentW - 8) / 3;
  const cardTop = y;
  const topLines = topSections.length > 0
    ? topSections.map(section => `${cleanSectionLabel(section.label)} (${section.score}/5)`)
    : ['Non renseigné'];
  const priorityLines = prioritySections.length > 0
    ? prioritySections.map(section => `${cleanSectionLabel(section.label)} (${section.score}/5)`)
    : ['Non renseigné'];
  drawSummaryCard(margin, cardTop, cardW, 24, 'Forces', topLines, [255, 246, 241]);
  drawSummaryCard(margin + cardW + 4, cardTop, cardW, 24, 'Axes critiques', priorityLines, [255, 250, 241]);
  drawSummaryCard(margin + (cardW + 4) * 2, cardTop, cardW, 24, 'Action', [truncateText(actionPriority, 92)], [243, 250, 246]);
  y += 28;

  sectionTitle('Synthèse IA en bref');
  if (analysisDigest.length > 0) {
    analysisDigest.slice(0, 3).forEach(item => writeBullet(item, { size: 9.8 }));
  } else {
    writeBullet('Aucune synthèse IA disponible.');
  }
  if (debrief.notes) {
    writeText(`Note closer: ${truncateText(debrief.notes, 170)}`, {
      size: 9.2,
      color: [112, 94, 80],
    });
  }

  doc.addPage();
  y = margin;

  sectionTitle('Détails complets');
  writeText(`Résultat: ${debrief.is_closed ? 'Closé' : 'Non closé'} · Objection dominante: ${dominantObjection}`, {
    size: 9.9,
    color: [112, 94, 80],
  });

  sectionTitle('Performance par section');
  const priorityKeySet = new Set(prioritySections.map(section => section.key));
  const topKeySet = new Set(topSections.map(section => section.key));
  for (const section of sectionInsights) {
    ensureSpace(11);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.7);
    doc.setTextColor(81, 65, 53);
    doc.text(section.label, margin + 1.2, y + 1.3);
    doc.text(`${section.score}/5`, margin + contentW - 1.2, y + 1.3, { align: 'right' });
    const trackX = margin + 36;
    const trackW = contentW - 48;
    doc.setFillColor(243, 228, 216);
    doc.roundedRect(trackX, y - 1.4, trackW, 2.9, 1.4, 1.4, 'F');
    doc.setFillColor(...toRgb(barColor(section.score)));
    doc.roundedRect(trackX, y - 1.4, (trackW * section.score) / 5, 2.9, 1.4, 1.4, 'F');
    y += 4.2;
    const needsFocus = (priorityKeySet.has(section.key) || topKeySet.has(section.key)) && section.focus;
    if (needsFocus) {
      const prefix = priorityKeySet.has(section.key) ? 'Axe critique: ' : 'Levier: ';
      writeText(truncateText(`${prefix}${section.focus}`, 110), {
        size: 8.7,
        color: [119, 99, 84],
        lineHeight: 3.8,
      });
    } else {
      y += 1.1;
    }
  }

  sectionTitle('Verbatims décisifs');
  if (signals.length > 0) {
    signals.slice(0, 6).forEach(signal => {
      writeBullet(`${signal.section} · ${signal.label}: ${truncateText(signal.value, 125)}`, { size: 9.4 });
    });
  } else {
    writeBullet('Aucun signal terrain libre saisi sur ce debrief.');
  }

  if (latestComments.length > 0) {
    sectionTitle('Commentaires équipe');
    latestComments.slice(0, 2).forEach(comment => {
      writeText(`${comment.author_name || 'Équipe'} · ${fmtDate(comment.created_at)}`, {
        bold: true,
        size: 9.2,
        color: [93, 76, 64],
        lineHeight: 4.0,
      });
      writeText(truncateText(comment.content || '', 180), {
        size: 9.2,
        color: [108, 91, 78],
        lineHeight: 4.0,
      });
      y += 0.8;
    });
  }

  const annexSections = sectionInsights.filter(section =>
    section.strength || section.weakness || section.improvement || (section.evidence && section.evidence.length > 0)
  );
  if (annexSections.length > 0) {
    sectionTitle('Annexe compacte');
    annexSections.slice(0, 5).forEach(section => {
      const summaryLine = `${section.label} (${section.score}/5) · + ${truncateText(section.strength || 'n/a', 34)} · - ${truncateText(section.weakness || 'n/a', 34)} · → ${truncateText(section.improvement || 'n/a', 34)}`;
      writeBullet(summaryLine, { size: 8.9, color: [106, 89, 75] });
    });
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);
  doc.setTextColor(145, 145, 145);
  doc.text(`Généré le ${fmtDate(new Date().toISOString())} · CloserDebrief`, margin, pageH - 7);
  doc.save(title);
}

export { getSectionNote };
