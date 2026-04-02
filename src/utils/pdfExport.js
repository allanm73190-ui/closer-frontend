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

function normalizeAiLine(line = '') {
  return String(line || '')
    .replace(/\*\*/g, '')
    .replace(/__/g, '')
    .replace(/`/g, '')
    .replace(/^[-•]\s*/, '')
    .trim();
}

function splitLabeledLine(line = '') {
  const cleaned = normalizeAiLine(line);
  if (!cleaned) return { label: '', text: '' };
  const separators = [':', ' — ', ' – ', ' - '];
  for (const sep of separators) {
    const idx = cleaned.indexOf(sep);
    if (idx <= 1) continue;
    const label = cleaned.slice(0, idx).trim();
    const text = cleaned.slice(idx + sep.length).trim();
    if (!label || !text) continue;
    if (label.length > 44) continue;
    return { label, text };
  }
  return { label: '', text: cleaned };
}

function pickAiLine(lines = [], patterns = []) {
  const source = Array.isArray(lines) ? lines : [];
  const tests = Array.isArray(patterns) ? patterns : [];
  for (const line of source) {
    const normalized = normalizeAiLine(line);
    if (!normalized) continue;
    if (tests.some(pattern => pattern.test(normalized))) return normalized;
  }
  return '';
}

function buildAiInsights({ analysisLines = [], actionPriority = '', topSections = [], prioritySections = [] }) {
  const cleanLines = dedupeStrings((analysisLines || []).map(normalizeAiLine).filter(Boolean));
  const strongFallback = topSections[0]
    ? `Levier principal: ${cleanSectionLabel(topSections[0].label)} (${topSections[0].score}/5).`
    : 'Levier principal non identifié.';
  const weakFallback = prioritySections[0]
    ? `Point faible principal: ${cleanSectionLabel(prioritySections[0].label)} (${prioritySections[0].score}/5).`
    : 'Point faible principal non identifié.';

  const pointFort = pickAiLine(cleanLines, [/point fort|strength|atout|réussi|reussi|solide|maitri|maîtris/i]) || strongFallback;
  const pointFaible = pickAiLine(cleanLines, [/point faible|weak|risque|bloqu|frein|manque|amélior|amelior/i]) || weakFallback;

  const recommendationCandidates = cleanLines.filter(line => {
    if (!line) return false;
    if (line === pointFort || line === pointFaible) return false;
    return /action|priorit|recommand|prochain|corrig|travaill|objectif|next/i.test(line);
  });

  const fallbackRecs = [
    actionPriority || 'Formaliser une action prioritaire mesurable avant le prochain appel.',
    prioritySections[0]
      ? `Travailler la section ${cleanSectionLabel(prioritySections[0].label)} avec répétition ciblée.`
      : 'Stabiliser la phase de closing avec un script d’isolation.',
    topSections[0]
      ? `Conserver le levier ${cleanSectionLabel(topSections[0].label)} dans le prochain call.`
      : 'Capitaliser sur les points forts observés lors du call.',
  ];

  const recommendations = dedupeStrings([...recommendationCandidates, ...fallbackRecs])
    .slice(0, 3)
    .map((item, idx) => ({
      priority: idx === 0 ? 'Haute' : idx === 1 ? 'Moyenne' : 'Basse',
      text: item,
    }));

  return { pointFort, pointFaible, recommendations };
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
  const analysisDigest = dedupeStrings(
    [...keyBullets, ...analysisLines]
      .map(normalizeAiLine)
      .filter(Boolean)
  ).slice(0, 4);
  const decisionSummary = buildDecisionSummary({
    debrief: safeDebrief,
    percentage,
    scoreReading: getScoreReading(percentage),
    dominantObjection,
    actionPriority,
  });
  const { pointFort, pointFaible, recommendations } = buildAiInsights({
    analysisLines,
    actionPriority,
    topSections,
    prioritySections,
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
    aiStrongPoint: pointFort,
    aiWeakPoint: pointFaible,
    recommendations,
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
    actionPriority,
    dominantObjection,
    closingRate,
    aiConfidence,
    risk,
    sectionInsights,
    signals,
    analysisDigest,
    scoreReading,
    aiStrongPoint,
    aiWeakPoint,
    recommendations,
  } = ctx;

  const analysisHtml = analysisDigest.length > 0
    ? `<ul class="list list--ai">${analysisDigest.map(item => {
        const parsed = splitLabeledLine(item);
        if (parsed.label) {
          return `<li class="ai-line"><strong>${escapeHtml(parsed.label)}</strong> : ${escapeHtml(parsed.text)}</li>`;
        }
        return `<li class="ai-line">${escapeHtml(parsed.text)}</li>`;
      }).join('')}</ul>`
    : '<p class="hint">Synthèse IA non disponible.</p>';

  const recommendationsHtml = (recommendations.length > 0 ? recommendations : [
    { priority: 'Haute', text: actionPriority || 'Définir une action prioritaire claire.' },
    { priority: 'Moyenne', text: 'Consolider les sections les plus faibles.' },
    { priority: 'Basse', text: 'Renforcer le levier principal déjà présent.' },
  ]).slice(0, 3).map(rec => `
    <li class="rec-item">
      <span class="rec-priority rec-priority--${slugify(rec.priority || 'moyenne')}">${escapeHtml(rec.priority || 'Moyenne')}</span>
      <span>${escapeHtml(normalizeAiLine(rec.text || ''))}</span>
    </li>
  `).join('');

  const sectionBarsHtml = sectionInsights.map(section => `
    <div class="bar-row">
      <div class="bar-row__label">
        <span>${escapeHtml(cleanSectionLabel(section.label))}</span>
        <strong>${section.score}/5</strong>
      </div>
      <div class="bar-row__track">
        <div class="bar-row__fill" style="width:${(section.score / 5) * 100}%;background:${barColor(section.score)}"></div>
      </div>
    </div>
  `).join('');

  const sectionDetailsHtml = sectionInsights.map(section => {
    const firstEvidence = section.evidence?.[0]?.value ? truncateText(section.evidence[0].value, 110) : 'Aucun signal clé saisi.';
    return `
      <article class="section-card">
        <div class="section-card__head">
          <h3>${escapeHtml(cleanSectionLabel(section.label))}</h3>
          <span style="color:${barColor(section.score)}">${section.score}/5</span>
        </div>
        <div class="section-card__track">
          <div class="section-card__fill" style="width:${(section.score / 5) * 100}%;background:${barColor(section.score)}"></div>
        </div>
        <p><strong>Point fort:</strong> ${escapeHtml(section.strength || 'Non renseigné')}</p>
        <p><strong>Point faible:</strong> ${escapeHtml(section.weakness || 'Non renseigné')}</p>
        <p><strong>Action:</strong> ${escapeHtml(section.improvement || section.focus || 'Non renseigné')}</p>
        <p><strong>Signal clé:</strong> ${escapeHtml(firstEvidence)}</p>
      </article>
    `;
  }).join('');

  const keySignalsHtml = signals.length > 0
    ? `<ul class="list">${signals.slice(0, 4).map(signal => `<li><strong>${escapeHtml(signal.section)}</strong> · ${escapeHtml(signal.label)} : ${escapeHtml(truncateText(signal.value, 120))}</li>`).join('')}</ul>`
    : '<p class="hint">Aucun extrait libre saisi dans le debrief.</p>';

  const shortLink = debrief.call_link ? truncateText(debrief.call_link, 72) : 'Non renseigné';

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
      <svg viewBox="0 0 264 264" width="100%" height="230" role="img" aria-label="Radar compétences">
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
          width: min(900px, calc(100vw - 36px));
          margin: 20px auto 38px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .pdf-page {
          background: var(--paper);
          border-radius: 22px;
          box-shadow: 0 14px 34px rgba(74, 58, 47, .1);
          padding: 30px;
          min-height: 1120px;
        }
        .page-label {
          margin: 0 0 12px;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: .1em;
          font-weight: 700;
          color: #8d7769;
        }
        .hero-cockpit {
          display: grid;
          grid-template-columns: 1fr 210px;
          gap: 14px;
          align-items: stretch;
          margin-bottom: 14px;
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
          font-size: 30px;
          line-height: 1.12;
          color: #fff;
        }
        .hero-meta {
          margin: 8px 0 0;
          color: #f7f1eb;
          font-size: 13px;
        }
        .hero-link {
          color: #fff;
          text-decoration: none;
          border-bottom: 1px solid rgba(255,255,255,.5);
        }
        .hero-link:hover {
          border-bottom-color: #fff;
        }
        .hero-tags {
          margin-top: 10px;
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
          font-size: 48px;
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
          gap: 8px;
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }
        .kpi-card {
          border: 1px solid var(--line);
          border-radius: 14px;
          background: #fff;
          padding: 10px 12px;
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
          margin: 8px 0 0;
          font-size: 28px;
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
          margin-top: 14px;
          display: grid;
          gap: 10px;
          grid-template-columns: 1fr 1fr;
        }
        .cockpit-card {
          border: 1px solid var(--line);
          border-radius: 16px;
          background: #fff;
          padding: 13px;
        }
        .cockpit-card h2 {
          margin: 0 0 8px;
          font-size: 16px;
          color: #3f3128;
        }
        .radar-note {
          margin: 4px 0 0;
          font-size: 12px;
          color: #7d6a5d;
        }
        .bar-row + .bar-row { margin-top: 10px; }
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
        .panel {
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 13px;
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
          line-height: 1.5;
        }
        .list li + li { margin-top: 5px; }
        .list--signals li strong {
          color: #5a4a3a;
        }
        .list--ai {
          margin-top: 2px;
          padding-left: 16px;
        }
        .ai-line {
          line-height: 1.55;
        }
        .ai-summary {
          margin-top: 12px;
        }
        .ai-summary p {
          margin: 8px 0 0;
          font-size: 13px;
          line-height: 1.5;
          color: #5f4e41;
        }
        .recommendations {
          margin-top: 10px;
        }
        .rec-list {
          margin: 0;
          padding: 0;
          list-style: none;
          display: grid;
          gap: 8px;
        }
        .rec-item {
          display: flex;
          gap: 8px;
          align-items: flex-start;
          font-size: 13px;
          line-height: 1.45;
          color: #5f4d40;
        }
        .rec-priority {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 68px;
          padding: 3px 8px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .06em;
          text-transform: uppercase;
          flex-shrink: 0;
        }
        .rec-priority--haute {
          background: #fee2e2;
          color: #b91c1c;
          border: 1px solid #fecaca;
        }
        .rec-priority--moyenne {
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #fde68a;
        }
        .rec-priority--basse {
          background: #dcfce7;
          color: #166534;
          border: 1px solid #bbf7d0;
        }
        .detail-grid {
          display: grid;
          gap: 10px;
        }
        .section-card {
          border: 1px solid #f1e2d7;
          border-radius: 12px;
          padding: 12px;
          background: #fffdfa;
        }
        .section-card__head {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          align-items: baseline;
          margin-bottom: 6px;
        }
        .section-card__head h3 {
          margin: 0;
          font-size: 14px;
        }
        .section-card__head span {
          font-size: 13px;
          font-weight: 700;
        }
        .section-card__track {
          height: 10px;
          border-radius: 999px;
          background: #efe2d8;
          overflow: hidden;
          margin-bottom: 8px;
        }
        .section-card__fill {
          height: 100%;
          border-radius: inherit;
        }
        .section-card p {
          margin: 6px 0 0;
          font-size: 12px;
          color: #6f5d4f;
          line-height: 1.45;
        }
        .annex-box {
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 12px;
          background: #fff;
        }
        .annex-box h3 {
          margin: 0 0 8px;
          font-size: 14px;
          color: #433329;
        }
        .annex-box p {
          margin: 6px 0 0;
          font-size: 12px;
          line-height: 1.45;
          color: #6f5e50;
        }
        .annex-grid {
          margin-top: 10px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .footer {
          margin-top: 16px;
          border-top: 1px solid var(--line);
          padding-top: 12px;
          display: flex;
          justify-content: space-between;
          gap: 10px;
          color: #8f7d6e;
          font-size: 11px;
        }
        @media (max-width: 860px) {
          .pdf-page { padding: 20px; border-radius: 14px; min-height: auto; }
          .hero-cockpit { grid-template-columns: 1fr; }
          .kpi-grid { grid-template-columns: 1fr 1fr; }
          .cockpit-grid { grid-template-columns: 1fr; }
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
              <h1>${escapeHtml(debrief.prospect_name || 'Nom prénom lead non renseigné')}</h1>
              <p class="hero-meta">
                Date: ${escapeHtml(fmtDate(debrief.call_date))}
                · Résultat: ${debrief.is_closed ? 'Closé' : 'Non closé'}
              </p>
              <p class="hero-meta">Closer: ${escapeHtml(debrief.closer_name || debrief.user_name || 'Non renseigné')}</p>
              <p class="hero-meta">
                Lien de l'appel:
                ${debrief.call_link
                  ? `<a class="hero-link" href="${escapeHtml(debrief.call_link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(shortLink)}</a>`
                  : 'Non renseigné'}
              </p>
              <div class="hero-tags">
                <span class="tag">${debrief.is_closed ? 'Closé' : 'Non closé'}</span>
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
              <p class="kpi-value">${closingRate}%</p>
            </article>
            <article class="kpi-card">
              <p class="kpi-title">Risque</p>
              <p class="kpi-value">${escapeHtml(risk.label.replace('Risque ', ''))}</p>
            </article>
            <article class="kpi-card">
              <p class="kpi-title">Confiance IA</p>
              <p class="kpi-value">${aiConfidence}%</p>
            </article>
            <article class="kpi-card">
              <p class="kpi-title">Objection</p>
              <p class="kpi-sub" style="margin-top:8px;font-size:13px;">${escapeHtml(dominantObjection || 'Aucune')}</p>
            </article>
          </section>

          <section class="cockpit-grid">
            <article class="cockpit-card">
              <h2>Radar compétences</h2>
              ${radarSvg}
              <p class="radar-note">Axes: découverte → closing</p>
            </article>
            <article class="cockpit-card">
              <h2>Barres par section</h2>
              ${sectionBarsHtml}
              <div class="signal-card">
                <h3>Signal prioritaire</h3>
                <p>${escapeHtml(signals[0] ? `${signals[0].section} · ${signals[0].label}: ${truncateText(signals[0].value, 95)}` : 'Aucun signal prioritaire détecté.')}</p>
              </div>
            </article>
          </section>

          <section class="panel" style="margin-top:14px;">
            <h2>Synthèse IA</h2>
            ${analysisHtml}
            <div class="decision ai-summary">
              <p><strong>Point fort :</strong> ${escapeHtml(aiStrongPoint || 'Non renseigné')}</p>
              <p><strong>Point faible :</strong> ${escapeHtml(aiWeakPoint || 'Non renseigné')}</p>
            </div>
          </section>

          <section class="panel recommendations">
            <h2>3 recommandations priorisées</h2>
            <ul class="rec-list">${recommendationsHtml}</ul>
          </section>
        </section>

        <section class="pdf-page">
          <p class="page-label">Page secondaire · Détails complets</p>
          <section class="panel">
            <h2>Performance détaillée par section</h2>
            <div class="detail-grid">${sectionDetailsHtml}</div>
          </section>

          <section class="panel" style="margin-top:10px;">
            <h2>Annexe compacte</h2>
            <div class="annex-grid">
              <article class="annex-box">
                <h3>Résumé opérationnel</h3>
                <p><strong>Action prioritaire :</strong> ${escapeHtml(actionPriority || 'Non renseigné')}</p>
                <p><strong>Score global :</strong> ${score20}/20 (${percentage}%)</p>
                <p><strong>Note closer :</strong> ${escapeHtml(truncateText(debrief.notes || 'Non renseignée', 180))}</p>
                <p><strong>Taux closing :</strong> ${closingRate}% · <strong>Confiance IA :</strong> ${aiConfidence}%</p>
              </article>
              <article class="annex-box">
                <h3>Extraits saisis (champs libres)</h3>
                ${keySignalsHtml}
              </article>
            </div>
            <p class="hint" style="margin-top:10px;">Risque actuel : ${escapeHtml(risk.label)} · Objection dominante : ${escapeHtml(dominantObjection || 'Aucune')}</p>
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
  const { title } = ctx;
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
    if (!docRef) throw new Error("Impossible de préparer le rendu PDF.");

    if (docRef.fonts?.ready) {
      try { await docRef.fonts.ready; } catch {}
    }
    await new Promise(resolve => window.setTimeout(resolve, 180));

    const pages = Array.from(docRef.querySelectorAll('.pdf-page'));
    if (pages.length === 0) throw new Error("Aucune page PDF à exporter.");

    const { default: html2canvas } = await import('html2canvas');
    const pdf = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const targetPages = pages.slice(0, 2);

    for (let i = 0; i < targetPages.length; i += 1) {
      const pageEl = targetPages[i];
      const pageRect = pageEl.getBoundingClientRect();
      const canvas = await html2canvas(pageEl, {
        scale: 2.25,
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

export { getSectionNote };
