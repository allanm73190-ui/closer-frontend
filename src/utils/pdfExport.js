import { SECTIONS } from '../config/ai';
import { computeSectionScores, fmtDate, toScore20FromPercentage } from './scoring';

const OBJECTION_LABELS = {
  budget: 'Budget',
  reflechir: 'Besoin de reflechir',
  conjoint: 'Validation du conjoint',
  methode: 'Doute sur la methode',
  aucune: 'Aucune',
};

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
  if (bullets.length > 0) return bullets.slice(0, 5);
  return lines.filter(Boolean).slice(0, 3);
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
  const latestComments = [...comments].slice(-2).reverse();
  const sectionRows = SECTIONS.map(({ key, label }) => {
    const value = scores[key] || 0;
    const note = getSectionNote(debrief.section_notes, key);
    const highlight = note?.improvement || note?.weakness || note?.strength || '';
    return `
      <div class="section-row">
        <div class="section-row__head">
          <span>${escapeHtml(label.replace(/^[^\p{L}\p{N}]+/u, '').trim())}</span>
          <strong style="color:${barColor(value)}">${value}/5</strong>
        </div>
        <div class="bar">
          <div class="fill" style="width:${(value / 5) * 100}%;background:${barColor(value)}"></div>
        </div>
        ${highlight ? `<p class="hint">${escapeHtml(highlight)}</p>` : ''}
      </div>
    `;
  }).join('');

  const summaryList = keyBullets.length > 0
    ? `<ul>${keyBullets.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
    : '<p class="hint">Aucune synthese IA disponible pour ce debrief.</p>';

  const commentsHtml = latestComments.length > 0
    ? latestComments.map(comment => `
      <div class="comment">
        <p class="comment__meta"><strong>${escapeHtml(comment.author_name || 'Equipe')}</strong> · ${escapeHtml(fmtDate(comment.created_at))}</p>
        <p>${renderText(comment.content || '')}</p>
      </div>
    `).join('')
    : '<p class="hint">Aucun commentaire ajoute.</p>';

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
          width: min(920px, calc(100vw - 26px));
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
          gap: 10px;
        }
        .section-row__head {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 10px;
          font-size: 13px;
        }
        .bar {
          margin-top: 5px;
          height: 7px;
          border-radius: 999px;
          background: rgba(232,125,106,.12);
          overflow: hidden;
        }
        .fill {
          height: 100%;
          border-radius: inherit;
        }
        ul {
          margin: 0;
          padding-left: 18px;
          font-size: 13px;
          line-height: 1.55;
        }
        li + li {
          margin-top: 6px;
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
      <div class="topbar">Export lisible (sans impression automatique). Utilisez le menu navigateur si vous souhaitez l'enregistrer en PDF.</div>
      <main class="sheet">
        <section class="hero">
          <div>
            <h1>${escapeHtml(debrief.prospect_name || 'Prospect')}</h1>
            <p class="meta">Closer: ${escapeHtml(debrief.closer_name || debrief.user_name || 'Non renseigne')}</p>
            <p class="meta">Date appel: ${escapeHtml(fmtDate(debrief.call_date))} · Resultat: ${debrief.is_closed ? 'Closé' : 'Non closé'}</p>
            <p class="meta">Objection dominante: ${escapeHtml(getDominantObjection(debrief))}</p>
          </div>
          <div class="score">
            <strong>${score20}/20</strong>
            <span>${pct}% de performance</span>
          </div>
        </section>

        <section class="grid">
          <article class="card">
            <h2>Sections debrief</h2>
            <div class="section-list">${sectionRows}</div>
          </article>

          <article class="card">
            <h2>Points importants</h2>
            <div class="chips">
              ${topSections.map(section => `<span class="chip">Point fort: ${escapeHtml(section.label.replace(/^[^\p{L}\p{N}]+/u, '').trim())} (${section.score}/5)</span>`).join('')}
              ${prioritySections.map(section => `<span class="chip">Priorite: ${escapeHtml(section.label.replace(/^[^\p{L}\p{N}]+/u, '').trim())} (${section.score}/5)</span>`).join('')}
            </div>
            <div class="action"><strong>Action prioritaire:</strong> ${escapeHtml(actionPriority)}</div>
            ${debrief.notes ? `<p class="hint"><strong>Note closer:</strong> ${renderText(debrief.notes)}</p>` : ''}
          </article>
        </section>

        <section class="grid">
          <article class="card">
            <h2>Synthese IA (version courte)</h2>
            ${summaryList}
          </article>
          <article class="card">
            <h2>Commentaires recents</h2>
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

export { getSectionNote };
