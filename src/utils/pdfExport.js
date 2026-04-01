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
  const latestComments = [...comments].slice(-6).reverse();

  const sectionRows = SECTION_DETAILS_ORDER.map(({ key, label }) => {
    const value = scores[key] || 0;
    const note = getSectionNote(debrief.section_notes, key);
    const sectionData = getSectionData(debrief.sections, key);
    const answers = Object.entries(sectionData || {})
      .map(([answerKey, answerValue]) => ({ label: formatFieldLabel(answerKey), value: formatFieldValue(answerValue) }))
      .filter(item => item.value);

    const notesHtml = [
      note?.strength ? `<p class="note note--good"><strong>Point fort:</strong> ${escapeHtml(note.strength)}</p>` : '',
      note?.weakness ? `<p class="note note--bad"><strong>Point faible:</strong> ${escapeHtml(note.weakness)}</p>` : '',
      note?.improvement ? `<p class="note note--warn"><strong>A améliorer:</strong> ${escapeHtml(note.improvement)}</p>` : '',
    ].filter(Boolean).join('');

    const answersHtml = answers.length > 0
      ? `<ul class="answers">${answers.map(item => `<li><strong>${escapeHtml(item.label)}:</strong> ${escapeHtml(item.value)}</li>`).join('')}</ul>`
      : '<p class="hint">Aucune réponse détaillée renseignée pour cette section.</p>';

    return `
      <div class="section-row">
        <div class="section-row__head">
          <span>${escapeHtml(label)}</span>
          <strong style="color:${barColor(value)}">${value}/5</strong>
        </div>
        <div class="bar">
          <div class="fill" style="width:${(value / 5) * 100}%;background:${barColor(value)}"></div>
        </div>
        ${notesHtml || '<p class="hint">Aucune note sectionnelle.</p>'}
        <div class="answers-wrap">
          <h4>Détails des réponses</h4>
          ${answersHtml}
        </div>
      </div>
    `;
  }).join('');

  const summaryList = keyBullets.length > 0
    ? `<ul>${keyBullets.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
    : '<p class="hint">Aucune synthèse IA disponible pour ce debrief.</p>';

  const analysisHtml = analysisLines.length > 0
    ? `<div class="analysis-list">${analysisLines.map(item => `<p>${escapeHtml(item)}</p>`).join('')}</div>`
    : '<p class="hint">Aucune analyse IA complète disponible.</p>';

  const commentsHtml = latestComments.length > 0
    ? latestComments.map(comment => `
      <div class="comment">
        <p class="comment__meta"><strong>${escapeHtml(comment.author_name || 'Equipe')}</strong> · ${escapeHtml(fmtDate(comment.created_at))}</p>
        <p>${renderText(comment.content || '')}</p>
      </div>
    `).join('')
    : '<p class="hint">Aucun commentaire ajouté.</p>';

  return `<!doctype html>
  <html lang="fr">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${escapeHtml(title)}</title>
      <style>
        :root {
          --text: #42352b;
          --muted: #867466;
          --line: rgba(232, 125, 106, .16);
          --paper: #fffdfb;
          --accent: #e87d6a;
          --good: #166534;
          --good-bg: #f0fdf4;
          --bad: #991b1b;
          --bad-bg: #fff5f5;
          --warn: #92400e;
          --warn-bg: #fffbeb;
        }
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; }
        body {
          font-family: Inter, system-ui, sans-serif;
          background: #f3eee8;
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
        .sheet {
          width: min(1020px, calc(100vw - 26px));
          margin: 16px auto 28px;
          background: var(--paper);
          border-radius: 18px;
          box-shadow: 0 14px 40px rgba(90,74,58,.16);
          padding: 24px;
        }
        .hero {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: flex-start;
          padding: 18px;
          border-radius: 14px;
          background: linear-gradient(135deg, #fff0eb 0%, #f5f8fb 100%);
          border: 1px solid var(--line);
        }
        .hero h1 {
          margin: 0 0 6px;
          font-size: 26px;
          line-height: 1.1;
        }
        .meta {
          margin: 0;
          color: var(--muted);
          font-size: 13px;
          line-height: 1.5;
        }
        .score {
          text-align: right;
        }
        .score strong {
          display: block;
          font-size: 34px;
          line-height: 1;
          color: var(--accent);
        }
        .score span {
          font-size: 12px;
          color: var(--muted);
        }
        .grid {
          margin-top: 16px;
          display: grid;
          gap: 12px;
          grid-template-columns: 1.1fr .9fr;
        }
        .card {
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 14px;
          background: white;
        }
        .card h2 {
          margin: 0 0 10px;
          font-size: 14px;
        }
        .hint {
          margin: 8px 0 0;
          color: var(--muted);
          font-size: 12px;
          line-height: 1.45;
        }
        .chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 10px;
        }
        .chip {
          padding: 5px 10px;
          border-radius: 999px;
          font-size: 12px;
          background: #fff3ef;
          color: #c05a47;
          border: 1px solid var(--line);
        }
        .section-list {
          display: grid;
          gap: 12px;
        }
        .section-row {
          border: 1px solid var(--line);
          border-radius: 10px;
          padding: 10px 11px;
          background: #fffdfb;
        }
        .section-row__head {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 10px;
          font-size: 13px;
          font-weight: 700;
        }
        .bar {
          margin-top: 6px;
          height: 7px;
          border-radius: 999px;
          background: rgba(232,125,106,.12);
          overflow: hidden;
        }
        .fill {
          height: 100%;
          border-radius: inherit;
        }
        .note {
          margin: 7px 0 0;
          padding: 7px 8px;
          border-radius: 8px;
          font-size: 12px;
          line-height: 1.45;
          border: 1px solid transparent;
        }
        .note--good { color: var(--good); background: var(--good-bg); border-color: #bbf7d0; }
        .note--bad { color: var(--bad); background: var(--bad-bg); border-color: #fca5a5; }
        .note--warn { color: var(--warn); background: var(--warn-bg); border-color: #fcd34d; }
        .answers-wrap {
          margin-top: 8px;
          border: 1px solid var(--line);
          border-radius: 8px;
          padding: 8px;
          background: #fff;
        }
        .answers-wrap h4 {
          margin: 0 0 6px;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: .04em;
          color: var(--muted);
        }
        .answers {
          margin: 0;
          padding-left: 18px;
          font-size: 12px;
          line-height: 1.45;
        }
        .answers li + li { margin-top: 4px; }
        ul {
          margin: 0;
          padding-left: 18px;
          font-size: 13px;
          line-height: 1.55;
        }
        li + li {
          margin-top: 6px;
        }
        .analysis-list {
          display: grid;
          gap: 6px;
        }
        .analysis-list p {
          margin: 0;
          font-size: 12px;
          line-height: 1.5;
          border-left: 2px solid rgba(232,125,106,.25);
          padding-left: 8px;
        }
        .comment + .comment {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px dashed var(--line);
        }
        .comment p {
          margin: 4px 0 0;
          font-size: 13px;
          line-height: 1.55;
        }
        .comment__meta {
          margin: 0;
          color: var(--muted);
          font-size: 11px;
        }
        .action {
          margin-top: 12px;
          padding: 10px 12px;
          border-radius: 10px;
          background: #fff2ed;
          border: 1px solid var(--line);
          font-size: 13px;
          line-height: 1.5;
        }
        .footer {
          margin-top: 16px;
          font-size: 11px;
          color: var(--muted);
          display: flex;
          justify-content: space-between;
          gap: 10px;
          border-top: 1px solid var(--line);
          padding-top: 10px;
        }
        @media (max-width: 780px) {
          .sheet { padding: 16px; }
          .hero { flex-direction: column; }
          .score { text-align: left; }
          .grid { grid-template-columns: 1fr; }
        }
      </style>
    </head>
    <body>
      <div class="topbar">Prévisualisation PDF: relisez puis lancez le téléchargement.</div>
      <main class="sheet">
        <section class="hero">
          <div>
            <h1>${escapeHtml(debrief.prospect_name || 'Prospect')}</h1>
            <p class="meta">Closer: ${escapeHtml(debrief.closer_name || debrief.user_name || 'Non renseigne')}</p>
            <p class="meta">Date appel: ${escapeHtml(fmtDate(debrief.call_date))} · Resultat: ${debrief.is_closed ? 'Closé' : 'Non closé'}</p>
            <p class="meta">Objection dominante: ${escapeHtml(getDominantObjection(debrief))}</p>
            ${debrief.call_link ? `<p class="meta">Lien appel: ${escapeHtml(debrief.call_link)}</p>` : ''}
          </div>
          <div class="score">
            <strong>${score20}/20</strong>
            <span>${pct}% de performance</span>
          </div>
        </section>

        <section class="grid">
          <article class="card">
            <h2>Résumé stratégique</h2>
            <div class="chips">
              ${topSections.map(section => `<span class="chip">Point fort: ${escapeHtml(section.label.replace(/^[^\p{L}\p{N}]+/u, '').trim())} (${section.score}/5)</span>`).join('')}
              ${prioritySections.map(section => `<span class="chip">Priorite: ${escapeHtml(section.label.replace(/^[^\p{L}\p{N}]+/u, '').trim())} (${section.score}/5)</span>`).join('')}
            </div>
            <div class="action"><strong>Action prioritaire:</strong> ${escapeHtml(actionPriority)}</div>
            ${debrief.notes ? `<p class="hint"><strong>Note closer:</strong> ${renderText(debrief.notes)}</p>` : ''}
            ${debrief.strengths ? `<p class="hint"><strong>Forces notées:</strong> ${renderText(debrief.strengths)}</p>` : ''}
            ${debrief.improvements ? `<p class="hint"><strong>Axes notés:</strong> ${renderText(debrief.improvements)}</p>` : ''}
          </article>

          <article class="card">
            <h2>Synthèse IA rapide</h2>
            ${summaryList}
          </article>
        </section>

        <section class="card" style="margin-top:12px">
          <h2>Détails debrief par section</h2>
          <div class="section-list">${sectionRows}</div>
        </section>

        <section class="grid">
          <article class="card">
            <h2>Analyse IA complète</h2>
            ${analysisHtml}
          </article>
          <article class="card">
            <h2>Commentaires équipe</h2>
            ${commentsHtml}
          </article>
        </section>

        <footer class="footer">
          <span>CloserDebrief · Export détaillé</span>
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

  doc.setFillColor(255, 241, 235);
  doc.roundedRect(margin, y - 2, contentW, 26, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(50, 58, 75);
  doc.text(`${debrief?.prospect_name || 'Prospect'}`, margin + 3, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(92, 104, 122);
  doc.text(`Closer: ${debrief?.closer_name || debrief?.user_name || 'Non renseigné'}`, margin + 3, y + 11);
  doc.text(`Date: ${fmtDate(debrief?.call_date)} · Résultat: ${debrief?.is_closed ? 'Closé' : 'Non closé'}`, margin + 3, y + 16);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(232, 125, 106);
  doc.text(`${score20}/20`, pageW - margin - 22, y + 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.text(`${pct}%`, pageW - margin - 22, y + 14);
  y += 31;

  sectionTitle('Vue d’ensemble');
  writeBullet(`Objection dominante: ${getDominantObjection(debrief)}`);
  writeBullet(`Points forts: ${topSections.map(section => `${section.label.replace(/^[^\p{L}\p{N}]+/u, '').trim()} (${section.score}/5)`).join(', ') || 'Aucun'}`);
  writeBullet(`Priorités: ${prioritySections.map(section => `${section.label.replace(/^[^\p{L}\p{N}]+/u, '').trim()} (${section.score}/5)`).join(', ') || 'Aucune'}`);
  if (debrief?.call_link) writeBullet(`Lien d'appel: ${debrief.call_link}`);
  if (debrief?.notes) writeBullet(`Note closer: ${debrief.notes}`);
  if (debrief?.strengths) writeBullet(`Points forts notés: ${debrief.strengths}`);
  if (debrief?.improvements) writeBullet(`Axes d'amélioration notés: ${debrief.improvements}`);

  sectionTitle('Score et détails par section');
  SECTION_DETAILS_ORDER.forEach(({ key, label }) => {
    const value = scores[key] || 0;
    const note = getSectionNote(debrief?.section_notes, key);
    const sectionData = getSectionData(debrief?.sections, key);
    writeText(`${label}: ${value}/5`, { size: 11, bold: true, color: [64, 64, 64], line: 5 });
    if (note?.strength) writeBullet(`Point fort: ${note.strength}`);
    if (note?.weakness) writeBullet(`Point faible: ${note.weakness}`);
    if (note?.improvement) writeBullet(`A améliorer: ${note.improvement}`);
    const details = Object.entries(sectionData || {})
      .map(([fieldKey, fieldValue]) => `${formatFieldLabel(fieldKey)}: ${formatFieldValue(fieldValue)}`)
      .filter(Boolean);
    if (details.length === 0) {
      writeBullet('Aucune réponse détaillée dans cette section.');
    } else {
      details.forEach(detail => writeBullet(detail));
    }
    y += 1;
  });

  sectionTitle('Synthèse IA (points clés)');
  if (keyBullets.length > 0) {
    keyBullets.slice(0, 8).forEach(item => writeBullet(item));
  } else {
    writeBullet('Aucune synthèse IA disponible.');
  }

  sectionTitle('Analyse IA complète');
  if (analysisLines.length > 0) {
    analysisLines.forEach(line => writeBullet(line));
  } else {
    writeBullet('Aucune analyse IA complète disponible.');
  }

  sectionTitle('Plan d’action');
  writeText(`Action prioritaire: ${actionPriority}`, { size: 11, bold: true, color: [95, 55, 40], line: 5.5 });

  if (latestComments.length > 0) {
    sectionTitle('Commentaires récents');
    latestComments.forEach(comment => {
      writeText(`${comment.author_name || 'Équipe'} — ${fmtDate(comment.created_at)}`, { size: 10, bold: true, color: [90, 90, 90], line: 4.8 });
      writeText(comment.content || '', { size: 10.5, color: [72, 72, 72], line: 4.8 });
      y += 1.5;
    });
  }

  ensureSpace(8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(145, 145, 145);
  doc.text(`Généré le ${fmtDate(new Date().toISOString())} — CloserDebrief`, margin, pageH - 7);
  doc.save(title);
}

export { getSectionNote };
