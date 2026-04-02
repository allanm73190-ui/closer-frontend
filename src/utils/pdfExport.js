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

function computeClosingRate(allDebriefs = [], fallbackDebrief = {}) {
  const pool = Array.isArray(allDebriefs) && allDebriefs.length > 0 ? allDebriefs : [fallbackDebrief];
  const total = pool.length;
  if (total <= 0) return 0;
  const closed = pool.filter(item => !!item?.is_closed).length;
  return Math.round((closed / total) * 100);
}

function computeAiConfidence({ percentage = 0, hasAnalysis = false, signalCount = 0 }) {
  const base = 52 + Math.round(percentage * 0.35);
  const analysisBoost = hasAnalysis ? 8 : 0;
  const signalBoost = Math.min(8, signalCount * 2);
  return Math.max(40, Math.min(97, base + analysisBoost + signalBoost));
}

function buildNextCallGoal({ prioritySections = [], actionPriority = '' }) {
  const weakest = Array.isArray(prioritySections) && prioritySections.length > 0 ? prioritySections[0] : null;
  if (!weakest) return actionPriority || 'Stabiliser le closing avant le prochain appel.';
  const target = Math.min(5, Number(weakest.score || 0) + 1.0);
  return `${cleanSectionLabel(weakest.label)} à ${target.toFixed(1)}/5 au prochain appel`;
}

function buildDecisionSummary({ debrief, percentage, scoreReading, dominantObjection, actionPriority }) {
  const status = debrief?.is_closed ? 'Closé' : 'Non closé';
  const objectionText = String(dominantObjection || '').toLowerCase().includes('aucune')
    ? 'sans objection bloquante explicite'
    : `frein principal: ${String(dominantObjection || '').toLowerCase()}`;
  return `Verdict ${status} · ${percentage}% (${scoreReading}) · ${objectionText}. Priorité suivante: ${actionPriority}`;
}

function buildExportContext({ debrief, comments = [], analysis = '', allDebriefs = [] }) {
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
  const signalCount = signals.length;
  const closingRate = computeClosingRate(allDebriefs, safeDebrief);
  const debriefCount = Array.isArray(allDebriefs) && allDebriefs.length > 0 ? allDebriefs.length : 1;
  const aiConfidence = computeAiConfidence({
    percentage,
    hasAnalysis: !!String(analysis || '').trim(),
    signalCount,
  });
  const nextCallGoal = buildNextCallGoal({ prioritySections, actionPriority });
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
    latestComments: [...comments].slice(-4).reverse(),
    dominantObjection,
    debriefCount,
    closingRate,
    aiConfidence,
    nextCallGoal,
    risk,
    sectionInsights,
    signals,
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
    debriefCount,
    closingRate,
    aiConfidence,
    nextCallGoal,
    risk,
    sectionInsights,
    signals,
    executiveHighlights,
    analysisDigest,
    decisionSummary,
    scoreReading,
  } = ctx;

  const riskToneClass = risk.tone === 'good'
    ? 'kpi-value--good'
    : risk.tone === 'warn'
      ? 'kpi-value--warn'
      : 'kpi-value--danger';

  const highlightsHtml = executiveHighlights.length > 0
    ? `<ul class="list">${executiveHighlights.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
    : '<p class="hint">Aucune synthèse disponible.</p>';

  const analysisHtml = analysisDigest.length > 0
    ? `<ul class="list">${analysisDigest.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
    : '<p class="hint">Aucune analyse IA disponible.</p>';

  const keySignalsHtml = signals.length > 0
    ? `<ul class="list list--signals">${signals.slice(0, 4).map(signal => `<li><strong>${escapeHtml(signal.section)}</strong> · ${escapeHtml(signal.label)}: ${escapeHtml(truncateText(signal.value, 160))}</li>`).join('')}</ul>`
    : '<p class="hint">Aucun signal terrain saisi.</p>';

  const commentsHtml = latestComments.length > 0
    ? latestComments.slice(0, 4).map(comment => `
      <div class="comment">
        <p class="comment__meta"><strong>${escapeHtml(comment.author_name || 'Équipe')}</strong> · ${escapeHtml(fmtDate(comment.created_at))}</p>
        <p>${renderText(comment.content || '')}</p>
      </div>
    `).join('')
    : '<p class="hint">Aucun commentaire équipe sur ce debrief.</p>';

  const sectionBarsHtml = sectionInsights.map(section => `
    <div class="bar-row">
      <div class="bar-row__label">
        <span>${escapeHtml(section.label)}</span>
        <strong>${section.score}/5</strong>
      </div>
      <div class="bar-row__track">
        <div class="bar-row__fill" style="width:${(section.score / 5) * 100}%;background:${barColor(section.score)}"></div>
      </div>
    </div>
  `).join('');

  const detailRowsHtml = sectionInsights.map(section => {
    const evidence = section.evidence.length > 0
      ? section.evidence.map(item => `${item.label}: ${truncateText(item.value, 110)}`).join(' · ')
      : 'Aucun signal libre explicite.';
    return `
      <article class="detail-row">
        <div class="detail-row__head">
          <h3>${escapeHtml(section.label)}</h3>
          <span style="color:${barColor(section.score)}">${section.score}/5</span>
        </div>
        <div class="detail-row__track">
          <div class="detail-row__fill" style="width:${(section.score / 5) * 100}%;background:${barColor(section.score)}"></div>
        </div>
        <p><strong>Focus:</strong> ${escapeHtml(section.focus || 'Non renseigné')}</p>
        <p><strong>Signaux:</strong> ${escapeHtml(evidence)}</p>
      </article>
    `;
  }).join('');

  const annexHtml = sectionInsights.map(section => `
    <article class="annex-card">
      <div class="annex-card__head">
        <h3>${escapeHtml(section.label)}</h3>
        <span style="color:${barColor(section.score)}">${section.score}/5</span>
      </div>
      <p><strong>Point fort:</strong> ${escapeHtml(section.strength || 'Non renseigné')}</p>
      <p><strong>Point faible:</strong> ${escapeHtml(section.weakness || 'Non renseigné')}</p>
      <p><strong>Action ciblée:</strong> ${escapeHtml(section.improvement || 'Non renseigné')}</p>
    </article>
  `).join('');

  const keySignal = signals[0]
    ? `${signals[0].section} · ${signals[0].label}: ${truncateText(signals[0].value, 95)}`
    : 'Aucun signal prioritaire détecté.';

  const radarSvg = (() => {
    const axes = sectionInsights.length > 0
      ? sectionInsights
      : SECTION_DETAILS_ORDER.map(section => ({
        key: section.key,
        label: cleanSectionLabel(section.label),
        score: 0,
      }));
    const count = axes.length || 5;
    const cx = 132;
    const cy = 132;
    const outer = 92;
    const point = (index, value) => {
      const angle = (-Math.PI / 2) + ((Math.PI * 2 * index) / count);
      const ratio = Math.max(0, Math.min(5, Number(value || 0))) / 5;
      const radius = outer * ratio;
      return {
        x: cx + (Math.cos(angle) * radius),
        y: cy + (Math.sin(angle) * radius),
      };
    };
    const ring = value => axes.map((_, index) => {
      const p = point(index, value);
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    }).join(' ');
    const spokes = axes.map((_, index) => {
      const p = point(index, 5);
      return `<line x1="${cx}" y1="${cy}" x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}" stroke="#E8D9CD" stroke-width="1"/>`;
    }).join('');
    const labels = axes.map((axis, index) => {
      const p = point(index, 5.9);
      const anchor = p.x < cx - 22 ? 'end' : p.x > cx + 22 ? 'start' : 'middle';
      return `<text x="${p.x.toFixed(1)}" y="${(p.y + 4).toFixed(1)}" text-anchor="${anchor}" style="font:600 10px Inter,system-ui,sans-serif;fill:#7C695B;">${escapeHtml(cleanSectionLabel(axis.label || axis.key || 'Section'))}</text>`;
    }).join('');
    const dataPolygon = axes.map((axis, index) => {
      const p = point(index, axis.score);
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    }).join(' ');
    return `
      <svg viewBox="0 0 264 264" width="100%" height="250" role="img" aria-label="Radar compétences">
        <polygon points="${ring(5)}" fill="none" stroke="#E8D9CD" stroke-width="2"/>
        <polygon points="${ring(3.5)}" fill="none" stroke="#E8D9CD" stroke-width="1.4"/>
        <polygon points="${ring(2)}" fill="none" stroke="#E8D9CD" stroke-width="1.1"/>
        ${spokes}
        <polygon points="${dataPolygon}" fill="rgba(232,125,106,0.22)" stroke="#D4604E" stroke-width="3"/>
        ${labels}
      </svg>
    `;
  })();

  return `<!doctype html>
  <html lang="fr">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${escapeHtml(title)}</title>
      <style>
        :root {
          --text: #352a22;
          --muted: #847264;
          --line: #eadccf;
          --paper: #fffdfa;
          --hero-dark: #253043;
          --hero-coral: #e87d6a;
        }
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; }
        body {
          font-family: Inter, system-ui, sans-serif;
          background: linear-gradient(150deg, #eff2f9 0%, #f7efe8 100%);
          color: var(--text);
        }
        .topbar {
          position: sticky;
          top: 0;
          z-index: 10;
          background: rgba(255,255,255,.9);
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
          color: #8d7769;
        }
        .hero-cockpit {
          display: grid;
          grid-template-columns: 1fr minmax(220px, 260px);
          gap: 14px;
          align-items: stretch;
          margin-bottom: 12px;
        }
        .hero-main {
          border-radius: 18px;
          padding: 18px;
          background: linear-gradient(110deg, var(--hero-dark) 0%, #2f3d53 45%, var(--hero-coral) 100%);
        }
        .kicker {
          margin: 0 0 8px;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: .1em;
          font-weight: 700;
          color: #d6dde8;
        }
        .hero-main h1 {
          margin: 0;
          font-size: 31px;
          line-height: 1.14;
          color: #fff;
        }
        .hero-meta {
          margin: 8px 0 0;
          color: #f7f1eb;
          font-size: 15px;
        }
        .hero-tags {
          margin-top: 12px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .tag {
          border: 1px solid rgba(255,255,255,.24);
          background: rgba(255,255,255,.14);
          color: #fff;
          font-size: 11px;
          font-weight: 700;
          border-radius: 999px;
          padding: 6px 11px;
        }
        .hero-score {
          border: 1px solid #f2ddd2;
          border-radius: 18px;
          background: #fff6f2;
          padding: 16px;
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
          font-size: 56px;
          line-height: 1;
          color: #d4604e;
        }
        .hero-score small {
          font-size: 13px;
          color: #795f51;
          margin-top: 6px;
        }
        .kpi-grid {
          margin-top: 12px;
          display: grid;
          gap: 10px;
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
        .kpi-card {
          border: 1px solid var(--line);
          border-radius: 14px;
          background: #fff;
          padding: 12px 14px;
        }
        .kpi-title {
          margin: 0;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: .1em;
          color: #8e796b;
          font-weight: 700;
        }
        .kpi-value {
          margin: 10px 0 0;
          font-size: 34px;
          line-height: 1;
          font-weight: 800;
          color: #364359;
        }
        .kpi-value--good { color: #2f7a4a; }
        .kpi-value--warn { color: #d97706; }
        .kpi-value--danger { color: #dc2626; }
        .kpi-sub {
          margin: 8px 0 0;
          font-size: 12px;
          color: #7e6b5d;
        }
        .cockpit-grid {
          margin-top: 12px;
          display: grid;
          gap: 10px;
          grid-template-columns: 1fr 1fr;
        }
        .cockpit-card {
          border: 1px solid var(--line);
          border-radius: 16px;
          background: #fff;
          padding: 12px;
        }
        .cockpit-card h2 {
          margin: 0 0 8px;
          font-size: 18px;
          color: #3f3128;
        }
        .radar-note {
          margin: 4px 0 0;
          font-size: 12px;
          color: #7d6a5d;
        }
        .bar-row + .bar-row { margin-top: 9px; }
        .bar-row__label {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 4px;
          font-size: 13px;
        }
        .bar-row__track {
          height: 10px;
          border-radius: 999px;
          background: #efe2d8;
          overflow: hidden;
        }
        .bar-row__fill {
          height: 100%;
          border-radius: inherit;
        }
        .signal-card {
          margin-top: 10px;
          border: 1px solid #f1e2d7;
          border-radius: 12px;
          background: #fff8f4;
          padding: 10px;
        }
        .signal-card h3 {
          margin: 0 0 6px;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: .08em;
          color: #ab5c49;
        }
        .signal-card p {
          margin: 0;
          font-size: 13px;
          color: #6a584b;
          line-height: 1.45;
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
          font-size: 16px;
          color: #433329;
        }
        .decision {
          margin: 8px 0 0;
          padding: 10px;
          border: 1px solid #f1e2d7;
          border-radius: 12px;
          background: #fffbf8;
        }
        .decision p {
          margin: 0;
          font-size: 13px;
          color: #5f4e41;
          line-height: 1.48;
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
        .detail-grid {
          display: grid;
          gap: 10px;
        }
        .detail-row {
          border: 1px solid #f1e2d7;
          border-radius: 12px;
          padding: 10px;
          background: #fffdfa;
        }
        .detail-row__head {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          align-items: baseline;
          margin-bottom: 6px;
        }
        .detail-row__head h3 {
          margin: 0;
          font-size: 14px;
        }
        .detail-row__head span {
          font-size: 13px;
          font-weight: 700;
        }
        .detail-row__track {
          height: 10px;
          border-radius: 999px;
          background: #efe2d8;
          overflow: hidden;
          margin-bottom: 7px;
        }
        .detail-row__fill {
          height: 100%;
          border-radius: inherit;
        }
        .detail-row p {
          margin: 5px 0 0;
          font-size: 12px;
          color: #6f5d4f;
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
        .annex-grid {
          margin-top: 8px;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
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
          .hero-cockpit { grid-template-columns: 1fr; }
          .kpi-grid { grid-template-columns: 1fr; }
          .cockpit-grid { grid-template-columns: 1fr; }
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
      <div class="topbar">Prévisualisation PDF · Style Data Cockpit (mockup 4) · 2 pages.</div>
      <main class="pdf-stack">
        <section class="pdf-page">
          <p class="page-label">Page principale · Éléments clés</p>
          <section class="hero-cockpit">
            <div class="hero-main">
              <p class="kicker">PDF Debrief | Data Cockpit</p>
              <h1>Performance cockpit debrief</h1>
              <p class="hero-meta">
                Prospect: ${escapeHtml(debrief.prospect_name || 'Non renseigné')}
                · Closer: ${escapeHtml(debrief.closer_name || debrief.user_name || 'Non renseigné')}
                · Date: ${escapeHtml(fmtDate(debrief.call_date))}
              </p>
              <div class="hero-tags">
                <span class="tag">${debrief.is_closed ? 'Closé' : 'Non closé'}</span>
                <span class="tag">Objection: ${escapeHtml(dominantObjection)}</span>
                <span class="tag">${escapeHtml(scoreReading)}</span>
              </div>
            </div>
            <aside class="hero-score">
              <p>Score</p>
              <strong>${score20}</strong>
              <small>/20 · ${percentage}%</small>
            </aside>
          </section>

          <section class="kpi-grid">
            <article class="kpi-card">
              <p class="kpi-title">Taux closing</p>
              <p class="kpi-value kpi-value--good">${closingRate}%</p>
              <p class="kpi-sub">${debriefCount} debrief(s)</p>
            </article>
            <article class="kpi-card">
              <p class="kpi-title">Risque deal</p>
              <p class="kpi-value ${riskToneClass}">${escapeHtml(risk.label.replace('Risque ', ''))}</p>
              <p class="kpi-sub">${debrief.is_closed ? 'Issue gagnée' : 'Issue à confirmer'}</p>
            </article>
            <article class="kpi-card">
              <p class="kpi-title">Confiance IA</p>
              <p class="kpi-value">${aiConfidence}%</p>
              <p class="kpi-sub">base signaux + score</p>
            </article>
          </section>

          <section class="cockpit-grid">
            <article class="cockpit-card">
              <h2>Radar compétences</h2>
              ${radarSvg}
              <p class="radar-note">Pleine: ce debrief · Axes: découverte à closing</p>
            </article>
            <article class="cockpit-card">
              <h2>Barres par section</h2>
              ${sectionBarsHtml}
              <div class="signal-card">
                <h3>Signal prioritaire</h3>
                <p>${escapeHtml(keySignal)}</p>
              </div>
            </article>
          </section>

          <section class="split" style="margin-top:12px;">
            <article class="panel">
              <h2>Synthèse IA court format</h2>
              ${analysisHtml}
              <div class="decision" style="margin-top:10px;">
                <p>${escapeHtml(decisionSummary)}</p>
              </div>
            </article>
            <article class="panel">
              <h2>Next Call Goal</h2>
              <p style="margin:0 0 8px;font-size:14px;color:#5f4d40;line-height:1.5;">${escapeHtml(nextCallGoal)}</p>
              <ul class="list">
                <li>Action prioritaire: ${escapeHtml(actionPriority)}</li>
                <li>Levier principal: ${topSections[0] ? `${escapeHtml(cleanSectionLabel(topSections[0].label))} (${topSections[0].score}/5)` : 'Non renseigné'}</li>
                <li>Risque principal: ${prioritySections[0] ? `${escapeHtml(cleanSectionLabel(prioritySections[0].label))} (${prioritySections[0].score}/5)` : 'Non renseigné'}</li>
              </ul>
              ${debrief.notes ? `<p class="hint" style="margin-top:8px;"><strong>Note closer:</strong> ${renderText(truncateText(debrief.notes, 170))}</p>` : ''}
            </article>
          </section>
        </section>

        <section class="pdf-page">
          <p class="page-label">Page secondaire · Détails complets</p>
          <section class="panel">
            <h2>Performance détaillée par section</h2>
            <div class="detail-grid">${detailRowsHtml}</div>
          </section>

          <section class="split" style="margin-top:12px;">
            <article class="panel">
              <h2>Verbatims décisifs (champs libres)</h2>
              ${keySignalsHtml}
            </article>
            <article class="panel">
              <h2>Commentaires équipe</h2>
              ${commentsHtml}
            </article>
          </section>

          <section class="panel">
            <h2>Annexe compacte</h2>
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
    debriefCount,
    closingRate,
    aiConfidence,
    nextCallGoal,
    risk,
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

  ensureSpace(26);
  doc.setFillColor(37, 48, 67);
  doc.setDrawColor(37, 48, 67);
  doc.roundedRect(margin, y - 2, contentW, 26, 3, 3, 'FD');
  doc.setFillColor(232, 125, 106);
  doc.roundedRect(margin + contentW - 45, y - 2, 45, 26, 0, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16.8);
  doc.setTextColor(255, 255, 255);
  doc.text('Performance cockpit debrief', margin + 3, y + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.8);
  doc.setTextColor(225, 232, 242);
  doc.text('PDF Debrief | Data Cockpit', margin + 3, y + 9.2);
  doc.setTextColor(245, 247, 250);
  doc.text(`Prospect: ${truncateText(debrief.prospect_name || 'Non renseigné', 32)} · Closer: ${truncateText(debrief.closer_name || debrief.user_name || 'Non renseigné', 22)}`, margin + 3, y + 14.2);
  doc.text(`Date: ${fmtDate(debrief.call_date)} · ${debrief.is_closed ? 'Closé' : 'Non closé'} · ${dominantObjection}`, margin + 3, y + 18.9);

  const scoreBoxW = 38;
  const scoreBoxX = pageW - margin - scoreBoxW;
  doc.setFillColor(255, 246, 241);
  doc.setDrawColor(241, 214, 201);
  doc.roundedRect(scoreBoxX, y + 1.4, scoreBoxW, 20.5, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(212, 96, 78);
  doc.text(`${score20}`, scoreBoxX + scoreBoxW / 2, y + 11.2, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.6);
  doc.setTextColor(122, 101, 88);
  doc.text(`/20 · ${percentage}%`, scoreBoxX + scoreBoxW / 2, y + 16.2, { align: 'center' });
  y += 29;

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
  drawSummaryCard(
    margin,
    cardTop,
    cardW,
    24,
    'Taux closing',
    [`${closingRate}%`, `${debriefCount} debrief(s)`],
    [244, 250, 255],
  );
  drawSummaryCard(
    margin + cardW + 4,
    cardTop,
    cardW,
    24,
    'Risque deal',
    [risk.label, `Objection: ${truncateText(dominantObjection, 42)}`],
    [255, 249, 241],
  );
  drawSummaryCard(
    margin + (cardW + 4) * 2,
    cardTop,
    cardW,
    24,
    'Confiance IA',
    [`${aiConfidence}%`, truncateText(nextCallGoal, 62)],
    [245, 250, 246],
  );
  y += 28;

  sectionTitle('Synthèse IA court format');
  if (analysisDigest.length > 0) {
    analysisDigest.slice(0, 3).forEach(item => writeBullet(item, { size: 9.8 }));
  } else {
    writeBullet('Aucune synthèse IA disponible.');
  }
  writeText(`Next call goal: ${nextCallGoal}`, {
    size: 9.2,
    color: [88, 75, 65],
  });
  if (debrief.notes) {
    writeText(`Note closer: ${truncateText(debrief.notes, 170)}`, {
      size: 9.2,
      color: [112, 94, 80],
    });
  }

  doc.addPage();
  y = margin;

  sectionTitle('Cockpit détaillé');
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
