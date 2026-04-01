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
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

function formatFieldValue(value) {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map(item => String(item)).join(', ');
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  if (typeof value === 'object') {
    try { return JSON.stringify(value); } catch { return ''; }
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
  if (bullets.length > 0) return bullets.slice(0, 4);
  return lines.filter(Boolean).slice(0, 2);
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
          width: min(460px, calc(100vw - 40px));
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
          <p class="title">Preparation du PDF</p>
          <p class="text">Le debrief est simplifie pour un rendu lisible et rapide a partager.</p>
        </div>
      </div>
    </body>
  </html>`;
}

function buildDebriefPdfHtml({ debrief, comments = [], analysis = '' }) {
  const title = `debrief-${slugify(debrief.prospect_name || 'prospect')}-${debrief.call_date || 'export'}.pdf`;
  const pct = Math.round(debrief.percentage || 0);
  const score20 = toScore20FromPercentage(pct);
  const scores = computeSectionScores(debrief.sections || {});
  const topSections = getTopSections(scores);
  const prioritySections = getPrioritySections(scores);
  const actionPriority = extractActionPriority(analysis) || "Formaliser une action mesurable avant le prochain appel.";
  const keyBullets = extractKeyBullets(analysis);
  const analysisLines = extractAnalysisLines(analysis);
  const latestComments = [...comments].slice(-4).reverse();

  const scoreRows = SECTION_DETAILS_ORDER.map(({ key, label }) => {
    const value = scores[key] || 0;
    return `
      <div class="score-row">
        <div class="score-row__label">${escapeHtml(label)}</div>
        <div class="score-row__bar">
          <div class="score-row__fill" style="width:${(value / 5) * 100}%;background:${barColor(value)}"></div>
        </div>
        <div class="score-row__value">${value}/5</div>
      </div>
    `;
  }).join('');

  const sectionRows = SECTION_DETAILS_ORDER.map(({ key, label }) => {
    const value = scores[key] || 0;
    const note = getSectionNote(debrief.section_notes, key);
    const strength = readSectionNote(note, ['strength', 'strengths']) || 'Point fort non renseigné.';
    const weakness = readSectionNote(note, ['weakness', 'weaknesses']) || 'Point faible non renseigné.';
    const improvement = readSectionNote(note, ['improvement', 'improvements']) || 'Piste de progression non renseignée.';
    const sectionData = getSectionData(debrief.sections, key);
    const answers = Object.entries(sectionData || {})
      .map(([answerKey, answerValue]) => ({ label: formatFieldLabel(answerKey), value: formatFieldValue(answerValue) }))
      .filter(item => item.value)
      .slice(0, 6);

    const answersText = answers.length > 0
      ? answers.map(item => `${item.label}: ${item.value}`).join(' · ')
      : 'Aucune réponse détaillée pour cette section.';

    return `
      <article class="detail-card">
        <div class="detail-card__head">
          <h3>${escapeHtml(label)}</h3>
          <span style="color:${barColor(value)}">${value}/5</span>
        </div>
        <p><strong>Bien fait:</strong> ${escapeHtml(strength)}</p>
        <p><strong>A corriger:</strong> ${escapeHtml(weakness)}</p>
        <p><strong>Coach note:</strong> ${escapeHtml(improvement)}</p>
        <p class="answers-line"><strong>Réponses clés:</strong> ${escapeHtml(answersText)}</p>
      </article>
    `;
  }).join('');

  const summaryList = keyBullets.length > 0
    ? `<ul>${keyBullets.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
    : '<p class="hint">Aucune synthèse IA disponible.</p>';

  const analysisHtml = analysisLines.length > 0
    ? `<div class="analysis-list">${analysisLines.slice(0, 10).map(item => `<p>${escapeHtml(item)}</p>`).join('')}</div>`
    : '<p class="hint">Aucune analyse IA complète disponible.</p>';

  const commentsHtml = latestComments.length > 0
    ? latestComments.map(comment => `
      <div class="comment">
        <p class="comment__meta"><strong>${escapeHtml(comment.author_name || 'Equipe')}</strong> · ${escapeHtml(fmtDate(comment.created_at))}</p>
        <p>${renderText(comment.content || '')}</p>
      </div>
    `).join('')
    : '<p class="hint">Aucun commentaire équipe.</p>';

  const planItems = [
    `Jours 1-2: drill ciblé sur l'action prioritaire (${actionPriority}).`,
    'Jours 3-4: application en conditions réelles sur 3 appels.',
    'Jours 5-7: revue HOS + ajustement des scripts de closing.',
  ];

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
          --accent: #e87d6a;
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
        .sheet {
          width: min(1072px, calc(100vw - 28px));
          margin: 18px auto 32px;
          background: var(--paper);
          border-radius: 22px;
          box-shadow: 0 14px 34px rgba(74, 58, 47, .1);
          padding: 28px 28px 24px;
        }
        .title {
          margin: 0;
          font-size: 38px;
          line-height: 1.1;
          font-weight: 700;
          color: var(--text);
        }
        .subtitle {
          margin: 10px 0 0;
          font-size: 15px;
          color: var(--muted);
        }
        .sep {
          margin: 16px 0;
          border: none;
          border-top: 1px solid var(--line);
        }
        .section-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: .08em;
          font-weight: 700;
          color: var(--muted);
          margin: 0 0 8px;
        }
        .identity {
          display: grid;
          gap: 12px;
          grid-template-columns: 1fr auto;
          align-items: start;
        }
        .identity p {
          margin: 0 0 6px;
          font-size: 15px;
          line-height: 1.45;
        }
        .score-big {
          text-align: right;
        }
        .score-big strong {
          display: block;
          font-size: 52px;
          line-height: 1;
          color: #d4604e;
        }
        .score-big span {
          font-size: 14px;
          color: var(--muted);
        }
        .snapshot {
          display: grid;
          gap: 12px;
          grid-template-columns: repeat(3, 1fr);
        }
        .snapshot-card {
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 12px;
          min-height: 120px;
        }
        .snapshot-card h3 {
          margin: 0 0 8px;
          font-size: 14px;
        }
        .snapshot-card p {
          margin: 0 0 5px;
          font-size: 13px;
          line-height: 1.45;
          color: #6e5d4f;
        }
        .snapshot-card--a { background: #fff6f2; }
        .snapshot-card--b { background: #fff9f0; }
        .snapshot-card--c { background: #f2fbf7; }
        .score-grid {
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 12px;
          background: #fcf8f5;
          display: grid;
          gap: 8px;
        }
        .score-row {
          display: grid;
          grid-template-columns: 170px 1fr 64px;
          align-items: center;
          gap: 10px;
        }
        .score-row__label {
          font-size: 13px;
          font-weight: 600;
        }
        .score-row__bar {
          height: 10px;
          border-radius: 999px;
          background: #f2e2d8;
          overflow: hidden;
        }
        .score-row__fill {
          height: 100%;
          border-radius: inherit;
        }
        .score-row__value {
          font-size: 13px;
          font-weight: 700;
          text-align: right;
        }
        .detail-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        .detail-card {
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 12px;
          background: #fff;
        }
        .detail-card__head {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          align-items: center;
          margin-bottom: 8px;
        }
        .detail-card__head h3 {
          margin: 0;
          font-size: 14px;
        }
        .detail-card__head span {
          font-size: 13px;
          font-weight: 700;
        }
        .detail-card p {
          margin: 0 0 6px;
          font-size: 12px;
          line-height: 1.45;
          color: #6f5e50;
        }
        .detail-card .answers-line {
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px dashed var(--line);
        }
        .closing-focus {
          margin-top: 12px;
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 12px;
          background: #fff;
        }
        .closing-focus h3 {
          margin: 0 0 8px;
          font-size: 14px;
        }
        .closing-focus p {
          margin: 0 0 6px;
          font-size: 13px;
          color: #6d5d4f;
        }
        .hint {
          margin: 0;
          color: var(--muted);
          font-size: 12px;
          line-height: 1.45;
        }
        ul {
          margin: 0;
          padding-left: 18px;
          font-size: 13px;
          line-height: 1.5;
        }
        li + li {
          margin-top: 5px;
        }
        .bottom-grid {
          margin-top: 12px;
          display: grid;
          gap: 12px;
          grid-template-columns: 1fr 1fr;
        }
        .block {
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 12px;
        }
        .analysis-list {
          display: grid;
          gap: 5px;
        }
        .analysis-list p {
          margin: 0;
          font-size: 12px;
          line-height: 1.45;
          padding-left: 8px;
          border-left: 2px solid rgba(232,125,106,.25);
        }
        .comment + .comment {
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px dashed var(--line);
        }
        .comment p {
          margin: 4px 0 0;
          font-size: 12px;
          line-height: 1.45;
        }
        .comment__meta {
          margin: 0;
          color: var(--muted);
          font-size: 11px;
        }
        .plan-list {
          margin: 0;
          padding-left: 18px;
        }
        .plan-list li {
          font-size: 12px;
          line-height: 1.45;
          color: #6e5d4f;
        }
        .action-box {
          margin-top: 10px;
          border: 1px solid var(--line);
          background: #fff2ec;
          border-radius: 10px;
          padding: 10px;
          font-size: 12px;
          line-height: 1.45;
        }
        .footer {
          margin-top: 14px;
          font-size: 11px;
          color: var(--muted);
          display: flex;
          justify-content: space-between;
          gap: 10px;
          border-top: 1px solid var(--line);
          padding-top: 10px;
        }
        @media (max-width: 780px) {
          .sheet { padding: 16px; border-radius: 14px; }
          .identity { grid-template-columns: 1fr; }
          .score-big { text-align: left; }
          .snapshot { grid-template-columns: 1fr; }
          .score-row { grid-template-columns: 1fr; gap: 6px; }
          .score-row__value { text-align: left; }
          .detail-grid { grid-template-columns: 1fr; }
          .bottom-grid { grid-template-columns: 1fr; }
        }
      </style>
    </head>
    <body>
      <div class="topbar">Prévisualisation PDF: infos détaillées + design minimal.</div>
      <main class="sheet">
        <h1 class="title">Export Debrief</h1>
        <p class="subtitle">Executive details dans un design ultra clean</p>
        <hr class="sep" />

        <section class="identity">
          <div>
            <p class="section-label">Identité call</p>
            <p><strong>Prospect:</strong> ${escapeHtml(debrief.prospect_name || 'Non renseigné')}</p>
            <p><strong>Closer:</strong> ${escapeHtml(debrief.closer_name || debrief.user_name || 'Non renseigné')} · <strong>Date:</strong> ${escapeHtml(fmtDate(debrief.call_date))}</p>
            <p><strong>Résultat:</strong> ${debrief.is_closed ? 'Closé' : 'Non closé'} · <strong>Objection dominante:</strong> ${escapeHtml(getDominantObjection(debrief))}</p>
            ${debrief.call_link ? `<p><strong>Lien appel:</strong> ${escapeHtml(debrief.call_link)}</p>` : ''}
          </div>
          <div class="score-big">
            <strong>${score20}</strong>
            <span>/20 · ${pct}% de performance</span>
          </div>
        </section>
        <hr class="sep" />

        <p class="section-label">Snapshot stratégique</p>
        <section class="snapshot">
          <article class="snapshot-card snapshot-card--a">
            <h3>Points forts</h3>
            ${topSections.length > 0
              ? topSections.map(section => `<p>- ${escapeHtml(section.label.replace(/^[^\p{L}\p{N}]+/u, '').trim())} (${section.score}/5)</p>`).join('')
              : '<p>- Non renseigné</p>'}
          </article>
          <article class="snapshot-card snapshot-card--b">
            <h3>Priorités</h3>
            ${prioritySections.length > 0
              ? prioritySections.map(section => `<p>- ${escapeHtml(section.label.replace(/^[^\p{L}\p{N}]+/u, '').trim())} (${section.score}/5)</p>`).join('')
              : '<p>- Non renseigné</p>'}
          </article>
          <article class="snapshot-card snapshot-card--c">
            <h3>Action prioritaire</h3>
            <p>${escapeHtml(actionPriority)}</p>
            ${debrief.notes ? `<p class="hint"><strong>Note closer:</strong> ${renderText(debrief.notes)}</p>` : ''}
          </article>
        </section>
        <hr class="sep" />

        <p class="section-label">Section scores</p>
        <section class="score-grid">${scoreRows}</section>
        <hr class="sep" />

        <p class="section-label">Détails sectionnels</p>
        <section class="detail-grid">${sectionRows}</section>
        <section class="closing-focus">
          <h3>Focus closing & objection</h3>
          <p><strong>Objection principale:</strong> ${escapeHtml(getDominantObjection(debrief))}</p>
          ${analysisLines.length > 0 ? `<p><strong>Alternative IA:</strong> ${escapeHtml(analysisLines.slice(0, 1).join(' '))}</p>` : ''}
          <p><strong>Priorité technique:</strong> annonce prix + silence + isolation objection.</p>
        </section>
        <hr class="sep" />

        <p class="section-label">IA, plan 7 jours et commentaires</p>
        <section class="bottom-grid">
          <article class="block">
            <h3 style="margin:0 0 8px;font-size:14px;">Synthèse IA</h3>
            ${summaryList}
            <h3 style="margin:12px 0 8px;font-size:14px;">Analyse IA complète</h3>
            ${analysisHtml}
          </article>
          <article class="block">
            <h3 style="margin:0 0 8px;font-size:14px;">Plan 7 jours</h3>
            <ol class="plan-list">
              ${planItems.map(item => `<li>${escapeHtml(item)}</li>`).join('')}
            </ol>
            <div class="action-box"><strong>Action prioritaire:</strong> ${escapeHtml(actionPriority)}</div>
            <h3 style="margin:12px 0 8px;font-size:14px;">Commentaires équipe</h3>
            ${commentsHtml}
          </article>
        </section>

        <footer class="footer">
          <span>CloserDebrief · Export debrief</span>
          <span>${escapeHtml(title)}</span>
        </footer>
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

export async function downloadDebriefPdf({ debrief, comments = [], analysis = '' }) {
  const title = `debrief-${slugify(debrief?.prospect_name || 'prospect')}-${debrief?.call_date || 'export'}.pdf`;
  const pct = Math.round(debrief?.percentage || 0);
  const score20 = toScore20FromPercentage(pct);
  const scores = computeSectionScores(debrief?.sections || {});
  const topSections = getTopSections(scores);
  const prioritySections = getPrioritySections(scores);
  const actionPriority = extractActionPriority(analysis) || "Formaliser une action mesurable avant le prochain appel.";
  const keyBullets = extractKeyBullets(analysis);
  const analysisLines = extractAnalysisLines(analysis);
  const latestComments = [...comments].slice(-6).reverse();

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

  const writeText = (text, { size = 11, bold = false, color = [45, 58, 75], line = 5 } = {}) => {
    const safe = String(text || '').trim();
    if (!safe) return;
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(safe, contentW);
    for (const lineText of lines) {
      ensureSpace(line + 1);
      doc.text(lineText, margin, y);
      y += line;
    }
  };

  const writeBullet = (text) => {
    const safe = String(text || '').trim();
    if (!safe) return;
    const bulletX = margin + 2;
    const textX = margin + 7;
    const textWidth = contentW - 7;
    const lines = doc.splitTextToSize(safe, textWidth);
    ensureSpace(6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(65, 65, 65);
    doc.text('•', bulletX, y);
    doc.text(lines[0], textX, y);
    y += 5;
    for (let i = 1; i < lines.length; i++) {
      ensureSpace(5);
      doc.text(lines[i], textX, y);
      y += 5;
    }
  };

  const sectionTitle = (text) => {
    ensureSpace(9);
    doc.setDrawColor(235, 125, 106);
    doc.setFillColor(255, 242, 236);
    doc.roundedRect(margin, y - 4, contentW, 8, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(212, 96, 78);
    doc.text(text, margin + 2.5, y + 1.5);
    y += 10;
  };

  const drawSeparator = () => {
    ensureSpace(6);
    doc.setDrawColor(234, 216, 203);
    doc.setLineWidth(0.4);
    doc.line(margin, y, pageW - margin, y);
    y += 6;
  };

  const writeLabel = (text) => {
    ensureSpace(6);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(155, 138, 122);
    doc.text(String(text || '').toUpperCase(), margin, y);
    y += 5;
  };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(59, 47, 39);
  doc.text('Export Debrief', margin, y + 2);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(143, 125, 110);
  doc.text('Executive details dans un design ultra clean', margin, y + 1);
  y += 6;
  drawSeparator();

  writeLabel('Identite call');
  writeText(`Prospect: ${debrief?.prospect_name || 'Non renseigné'}`, { size: 11.2, bold: true, color: [66, 52, 43], line: 5.2 });
  writeText(`Closer: ${debrief?.closer_name || debrief?.user_name || 'Non renseigné'} · Date: ${fmtDate(debrief?.call_date)}`, { size: 10.5, color: [98, 84, 72], line: 4.8 });
  writeText(`Résultat: ${debrief?.is_closed ? 'Closé' : 'Non closé'} · Objection dominante: ${getDominantObjection(debrief)}`, { size: 10.5, color: [98, 84, 72], line: 4.8 });
  if (debrief?.call_link) writeText(`Lien appel: ${debrief.call_link}`, { size: 10.2, color: [110, 96, 84], line: 4.6 });
  ensureSpace(10);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(212, 96, 78);
  doc.text(`${score20}/20`, pageW - margin - 44, y - 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(143, 125, 110);
  doc.text(`${pct}%`, pageW - margin - 20, y - 8);
  drawSeparator();

  writeLabel('Snapshot strategique');
  ensureSpace(24);
  const cardW = (contentW - 8) / 3;
  const cardY = y;
  const drawMiniCard = (x, titleText, lines, fill) => {
    doc.setFillColor(...fill);
    doc.setDrawColor(234, 216, 203);
    doc.roundedRect(x, cardY, cardW, 24, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.2);
    doc.setTextColor(74, 58, 47);
    doc.text(titleText, x + 3, cardY + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.4);
    doc.setTextColor(106, 91, 79);
    let ly = cardY + 10;
    (lines || []).slice(0, 3).forEach(line => {
      const split = doc.splitTextToSize(line, cardW - 6);
      split.slice(0, 1).forEach(s => {
        doc.text(`- ${s}`, x + 3, ly);
        ly += 4.3;
      });
    });
  };
  const topLines = topSections.length > 0
    ? topSections.map(section => `${section.label.replace(/^[^\p{L}\p{N}]+/u, '').trim()} (${section.score}/5)`)
    : ['Non renseigné'];
  const priorityLines = prioritySections.length > 0
    ? prioritySections.map(section => `${section.label.replace(/^[^\p{L}\p{N}]+/u, '').trim()} (${section.score}/5)`)
    : ['Non renseigné'];
  drawMiniCard(margin, 'Points forts', topLines, [255, 246, 242]);
  drawMiniCard(margin + cardW + 4, 'Priorités', priorityLines, [255, 249, 240]);
  drawMiniCard(margin + (cardW + 4) * 2, 'Action prioritaire', [actionPriority], [242, 251, 247]);
  y += 28;
  drawSeparator();

  writeLabel('Section scores');
  ensureSpace(38);
  doc.setFillColor(252, 248, 245);
  doc.setDrawColor(234, 216, 203);
  doc.roundedRect(margin, y, contentW, 36, 2, 2, 'FD');
  let rowY = y + 6;
  SECTION_DETAILS_ORDER.forEach(({ key, label }) => {
    const value = scores[key] || 0;
    const barX = margin + 45;
    const barW = contentW - 78;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(83, 66, 55);
    doc.text(label, margin + 3, rowY + 1);
    doc.setFillColor(242, 226, 216);
    doc.roundedRect(barX, rowY - 1.6, barW, 2.8, 1.4, 1.4, 'F');
    const color = barColor(value);
    const rgb = color === '#059669' ? [5, 150, 105]
      : color === '#d97706' ? [217, 119, 6]
        : color === '#e87d6a' ? [232, 125, 106]
          : [239, 68, 68];
    doc.setFillColor(...rgb);
    doc.roundedRect(barX, rowY - 1.6, (barW * value) / 5, 2.8, 1.4, 1.4, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(83, 66, 55);
    doc.text(`${value}/5`, margin + contentW - 10, rowY + 1, { align: 'right' });
    rowY += 6.5;
  });
  y += 40;
  drawSeparator();

  writeLabel('Details sectionnels');
  SECTION_DETAILS_ORDER.forEach(({ key, label }) => {
    const value = scores[key] || 0;
    const note = getSectionNote(debrief?.section_notes, key);
    const strength = readSectionNote(note, ['strength', 'strengths']) || 'Point fort non renseigné.';
    const weakness = readSectionNote(note, ['weakness', 'weaknesses']) || 'Point faible non renseigné.';
    const improvement = readSectionNote(note, ['improvement', 'improvements']) || 'Piste de progression non renseignée.';
    const sectionData = getSectionData(debrief?.sections, key);
    const answers = Object.entries(sectionData || {})
      .map(([fieldKey, fieldValue]) => `${formatFieldLabel(fieldKey)}: ${formatFieldValue(fieldValue)}`)
      .filter(Boolean)
      .slice(0, 4)
      .join(' · ');

    ensureSpace(28);
    doc.setDrawColor(234, 216, 203);
    doc.roundedRect(margin, y, contentW, 26, 2, 2);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(74, 58, 47);
    doc.text(`${label} - ${value}/5`, margin + 3, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.4);
    doc.setTextColor(108, 92, 79);
    doc.text(doc.splitTextToSize(`Bien fait: ${strength}`, contentW - 6), margin + 3, y + 9);
    doc.text(doc.splitTextToSize(`A corriger: ${weakness}`, contentW - 6), margin + 3, y + 14);
    doc.text(doc.splitTextToSize(`Coach note: ${improvement}`, contentW - 6), margin + 3, y + 19);
    doc.text(doc.splitTextToSize(`Réponses clés: ${answers || 'Aucune réponse détaillée.'}`, contentW - 6), margin + 3, y + 24);
    y += 30;
  });
  drawSeparator();

  writeLabel('Ia, plan 7 jours et commentaires');
  sectionTitle('Synthèse IA');
  if (keyBullets.length > 0) keyBullets.slice(0, 8).forEach(item => writeBullet(item));
  else writeBullet('Aucune synthèse IA disponible.');

  sectionTitle('Analyse IA complète');
  if (analysisLines.length > 0) analysisLines.slice(0, 16).forEach(line => writeBullet(line));
  else writeBullet('Aucune analyse IA complète disponible.');

  sectionTitle('Plan 7 jours');
  writeBullet(`Jours 1-2: drill ciblé sur l'action prioritaire (${actionPriority}).`);
  writeBullet('Jours 3-4: application en conditions réelles sur 3 appels.');
  writeBullet('Jours 5-7: revue HOS + ajustement des scripts de closing.');
  writeText(`Action prioritaire: ${actionPriority}`, { size: 10.5, bold: true, color: [95, 55, 40], line: 5 });

  sectionTitle('Commentaires équipe');
  if (latestComments.length > 0) {
    latestComments.forEach(comment => {
      writeText(`${comment.author_name || 'Équipe'} — ${fmtDate(comment.created_at)}`, { size: 9.8, bold: true, color: [90, 90, 90], line: 4.5 });
      writeText(comment.content || '', { size: 10, color: [72, 72, 72], line: 4.5 });
      y += 1.2;
    });
  } else {
    writeBullet('Aucun commentaire équipe.');
  }

  ensureSpace(8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(145, 145, 145);
  doc.text(`Généré le ${fmtDate(new Date().toISOString())} — CloserDebrief`, margin, pageH - 7);
  doc.save(title);
}

export { getSectionNote };
