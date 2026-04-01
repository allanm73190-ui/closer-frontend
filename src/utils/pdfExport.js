import { SECTIONS } from '../config/ai';
import { computeSectionScores, fmtDate } from './scoring';

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

function renderInlineMarkdown(value = '') {
  return String(value)
    .split(/(\*\*.*?\*\*)/g)
    .map(part => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return `<strong>${escapeHtml(part.slice(2, -2))}</strong>`;
      }
      return escapeHtml(part);
    })
    .join('');
}

function renderTextBlock(value = '') {
  return escapeHtml(value).replace(/\n/g, '<br/>');
}

function stripSectionLabel(label = '') {
  return label.replace(/^[^\p{L}\p{N}]+/u, '').trim();
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

function getProgressDebriefs(allDebriefs = [], debrief) {
  const source = [...allDebriefs];
  const filtered = source.filter(item => {
    if (!item) return false;
    if (debrief.user_id && item.user_id) return item.user_id === debrief.user_id;
    if (debrief.closer_name && item.closer_name) return item.closer_name === debrief.closer_name;
    return true;
  });
  return filtered
    .sort((a, b) => new Date(a.call_date || a.created_at || 0) - new Date(b.call_date || b.created_at || 0))
    .slice(-5);
}

function getDominantObjection(debrief) {
  const objections = debrief?.sections?.closing?.objections || [];
  const objection = objections.find(item => item && item !== 'aucune');
  if (!objection) return debrief?.is_closed ? 'Aucune objection bloquante' : 'Aucune objection renseignee';
  return OBJECTION_LABELS[objection] || objection.replace(/_/g, ' ');
}

function extractBetween(text, startPattern) {
  if (!text) return '';
  const regex = new RegExp(`(?:^|\\n)###\\s*${startPattern}\\s*\\n([\\s\\S]*?)(?=\\n###\\s|\\n\\*\\*ACTION PRIORITAIRE|$)`, 'i');
  const match = text.match(regex);
  return match?.[1]?.trim() || '';
}

function extractActionPriority(text) {
  if (!text) return '';
  const strongMatch = text.match(/\*\*ACTION PRIORITAIRE\s*:\s*([^*]+)\*\*/i);
  if (strongMatch?.[1]) return strongMatch[1].trim();
  const plainMatch = text.match(/ACTION PRIORITAIRE\s*:\s*(.+)/i);
  return plainMatch?.[1]?.trim() || '';
}

function getFallbackAction(debrief) {
  if (debrief?.improvements) {
    const firstLine = debrief.improvements.split('\n').map(line => line.trim()).find(Boolean);
    if (firstLine) return firstLine;
  }
  const sectionNote = Object.values(debrief?.section_notes || {}).find(
    item => item?.improvement || item?.weakness
  );
  if (sectionNote?.improvement) return sectionNote.improvement;
  if (sectionNote?.weakness) return sectionNote.weakness;
  return "Formaliser un axe de progression concret avant le prochain appel.";
}

function buildAiHtml(text) {
  if (!text) {
    return `
      <div class="empty-state">
        <div class="empty-state__icon">AI</div>
        <div>
          <h3>Aucune analyse IA enregistree</h3>
          <p>Genere l'analyse depuis le debrief avant l'export si tu veux l'inclure dans le PDF.</p>
        </div>
      </div>
    `;
  }

  const lines = text.split('\n');
  const html = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      html.push('</ul>');
      inList = false;
    }
  };

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) {
      closeList();
      return;
    }

    if (trimmed.startsWith('## ')) {
      closeList();
      html.push(`<h2>${escapeHtml(trimmed.slice(3))}</h2>`);
      return;
    }

    if (trimmed.startsWith('### ')) {
      closeList();
      html.push(`<h3>${escapeHtml(trimmed.slice(4))}</h3>`);
      return;
    }

    if (trimmed.startsWith('**ACTION PRIORITAIRE')) {
      closeList();
      html.push(`<div class="action-callout">${renderInlineMarkdown(trimmed)}</div>`);
      return;
    }

    if (trimmed.startsWith('- ')) {
      if (!inList) {
        html.push('<ul>');
        inList = true;
      }
      html.push(`<li>${renderInlineMarkdown(trimmed.slice(2))}</li>`);
      return;
    }

    closeList();
    html.push(`<p>${renderInlineMarkdown(trimmed)}</p>`);
  });

  closeList();
  return html.join('');
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
          background: linear-gradient(160deg,#f5ede6 0%,#e8f0f5 100%);
          font-family: Inter, system-ui, sans-serif;
          color: #5a4a3a;
        }
        .loading {
          width: min(480px, calc(100vw - 40px));
          padding: 28px;
          border-radius: 28px;
          background: rgba(255,255,255,.92);
          box-shadow: 0 24px 48px rgba(90,74,58,.14);
          display: flex;
          align-items: center;
          gap: 18px;
        }
        .spinner {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          border: 4px solid rgba(232,125,106,.16);
          border-top-color: #e87d6a;
          animation: spin .8s linear infinite;
          flex-shrink: 0;
        }
        .title {
          font-size: 18px;
          font-weight: 700;
          margin: 0 0 6px;
        }
        .text {
          font-size: 14px;
          margin: 0;
          color: #8d7a6b;
          line-height: 1.5;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      </style>
    </head>
    <body>
      <div class="loading">
        <div class="spinner"></div>
        <div>
          <p class="title">Preparation de l'export PDF</p>
          <p class="text">Le debrief est mis en page dans une version imprimable. La boite de dialogue PDF va s'ouvrir automatiquement.</p>
        </div>
      </div>
    </body>
  </html>`;
}

function buildDebriefPdfHtml({ debrief, comments = [], analysis = '', allDebriefs = [] }) {
  const title = `debrief-${slugify(debrief.prospect_name || 'prospect')}-${debrief.call_date || 'export'}.pdf`;
  const pct = Math.round(debrief.percentage || 0);
  const scores = computeSectionScores(debrief.sections || {});
  const actionPriority = extractActionPriority(analysis) || getFallbackAction(debrief);
  const scriptSuggested = extractBetween(analysis, '7\\.?\\s*SCRIPT SUGG[ÉE]R[ÉE]') || '';
  const coachingSuggested = extractBetween(analysis, '6\\.?\\s*COACHING PERSONNALIS[ÉE]') || '';
  const progress = getProgressDebriefs(allDebriefs, debrief);
  const progressMax = Math.max(...progress.map(item => Math.round(item.percentage || 0)), 100);
  const sectionRows = SECTIONS.map(({ key, label }) => {
    const sectionScore = scores[key] || 0;
    const note = getSectionNote(debrief.section_notes, key);
    const noteChips = [
      note?.strength ? `<span class="note-chip note-chip--good">Point fort : ${escapeHtml(note.strength)}</span>` : '',
      note?.weakness ? `<span class="note-chip note-chip--warn">Point faible : ${escapeHtml(note.weakness)}</span>` : '',
      note?.improvement ? `<span class="note-chip note-chip--info">Progression : ${escapeHtml(note.improvement)}</span>` : '',
    ].filter(Boolean).join('');
    return `
      <div class="section-row">
        <div class="section-row__head">
          <div>
            <h4>${escapeHtml(stripSectionLabel(label))}</h4>
            <p>${note?.improvement ? escapeHtml(note.improvement) : "Section evaluee a partir du debrief renseigne."}</p>
          </div>
          <span class="score-pill" style="color:${barColor(sectionScore)}">${sectionScore}/5</span>
        </div>
        <div class="score-track">
          <div class="score-fill" style="width:${(sectionScore / 5) * 100}%;background:${barColor(sectionScore)}"></div>
        </div>
        ${noteChips ? `<div class="note-chip-list">${noteChips}</div>` : ''}
      </div>
    `;
  }).join('');

  const quickNotes = [
    debrief.strengths ? `<div class="info-card info-card--good"><h4>Points forts</h4><p>${renderTextBlock(debrief.strengths)}</p></div>` : '',
    debrief.improvements ? `<div class="info-card info-card--warn"><h4>Axes d'amelioration</h4><p>${renderTextBlock(debrief.improvements)}</p></div>` : '',
    debrief.notes ? `<div class="info-card info-card--plain"><h4>Notes du closer</h4><p>${renderTextBlock(debrief.notes)}</p></div>` : '',
  ].filter(Boolean).join('');

  const shownComments = [...comments].slice(-4).reverse();
  const commentsHtml = shownComments.length
    ? shownComments.map(comment => `
        <article class="comment">
          <div class="comment__meta">
            <strong>${escapeHtml(comment.author_name || 'Equipe')}</strong>
            <span>${escapeHtml(fmtDate(comment.created_at))}</span>
          </div>
          <p>${renderTextBlock(comment.content || '')}</p>
        </article>
      `).join('')
    : `
      <div class="empty-state empty-state--compact">
        <div class="empty-state__icon">C</div>
        <div>
          <h3>Aucun commentaire</h3>
          <p>Le debrief sera exporte sans fil de commentaires tant qu'aucun retour n'est ajoute.</p>
        </div>
      </div>
    `;

  const progressHtml = progress.length
    ? `
      <div class="progress-chart">
        ${progress.map(item => {
          const value = Math.round(item.percentage || 0);
          const height = Math.max(18, Math.round((value / progressMax) * 90));
          const isCurrent = item.id === debrief.id;
          return `
            <div class="progress-chart__item">
              <div class="progress-chart__bar ${isCurrent ? 'is-current' : ''}" style="height:${height}px"></div>
              <span class="progress-chart__value">${value}%</span>
              <span class="progress-chart__label">${escapeHtml(fmtDate(item.call_date))}</span>
            </div>
          `;
        }).join('')}
      </div>
    `
    : `<p class="muted">Pas encore assez d'historique pour afficher une tendance.</p>`;

  const aiHtml = buildAiHtml(analysis);

  return `<!doctype html>
  <html lang="fr">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${escapeHtml(title)}</title>
      <style>
        :root {
          --coral: #e87d6a;
          --coral-dark: #d4604e;
          --blue: #6aacce;
          --text: #5a4a3a;
          --text-soft: #8f7a69;
          --muted: #b8a697;
          --line: rgba(232,125,106,.12);
          --paper: #ffffff;
          --paper-soft: #fff9f6;
          --paper-blue: #f5fbfe;
          --shadow: 0 24px 60px rgba(90,74,58,.14);
        }
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; }
        body {
          font-family: Inter, system-ui, sans-serif;
          background: linear-gradient(160deg,#f5ede6 0%,#e8f0f5 100%);
          color: var(--text);
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .screen-toolbar {
          position: sticky;
          top: 0;
          z-index: 10;
          display: flex;
          justify-content: center;
          padding: 18px 18px 0;
        }
        .screen-toolbar__inner {
          width: min(1100px, calc(100vw - 32px));
          padding: 12px 14px;
          border-radius: 20px;
          background: rgba(255,255,255,.88);
          backdrop-filter: blur(12px);
          box-shadow: 0 18px 40px rgba(90,74,58,.14);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
        }
        .screen-toolbar__text {
          font-size: 13px;
          color: var(--text-soft);
        }
        .screen-toolbar__actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .toolbar-btn {
          border: none;
          cursor: pointer;
          border-radius: 999px;
          padding: 10px 18px;
          font: 600 13px Inter, system-ui, sans-serif;
        }
        .toolbar-btn--primary {
          background: linear-gradient(135deg,var(--coral),var(--coral-dark));
          color: white;
        }
        .toolbar-btn--secondary {
          background: white;
          color: var(--text);
          box-shadow: 0 8px 20px rgba(90,74,58,.1);
        }
        .document {
          width: 210mm;
          margin: 18px auto 42px;
        }
        .page {
          min-height: 272mm;
          margin-bottom: 16px;
          padding: 18mm 16mm;
          border-radius: 28px;
          background: linear-gradient(180deg,#fffefe 0%,#fff9f6 100%);
          box-shadow: var(--shadow);
          break-after: page;
          page-break-after: always;
        }
        .page:last-child {
          break-after: auto;
          page-break-after: auto;
          background: linear-gradient(180deg,#fffefe 0%,#f9fcfe 100%);
        }
        .hero {
          border-radius: 28px;
          padding: 22px 24px;
          background: linear-gradient(135deg,var(--coral),var(--coral-dark));
          color: white;
          display: flex;
          justify-content: space-between;
          gap: 18px;
          align-items: flex-start;
          margin-bottom: 18px;
        }
        .hero--soft {
          background: linear-gradient(135deg,#f4f9fc 0%,#fff3ee 100%);
          color: var(--text);
        }
        .hero__brand {
          display: flex;
          gap: 14px;
          align-items: center;
          margin-bottom: 14px;
        }
        .hero__badge {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          display: grid;
          place-items: center;
          background: rgba(255,255,255,.18);
          font-weight: 700;
          font-size: 22px;
        }
        .hero--soft .hero__badge {
          background: white;
          color: var(--coral);
        }
        .hero__eyebrow {
          font-size: 13px;
          font-weight: 700;
          margin: 0 0 6px;
          opacity: .92;
        }
        .hero__title {
          margin: 0 0 8px;
          font-size: 34px;
          line-height: 1.05;
        }
        .hero__subtitle {
          margin: 0;
          max-width: 540px;
          font-size: 14px;
          line-height: 1.55;
          opacity: .88;
        }
        .hero__tag {
          white-space: nowrap;
          border-radius: 999px;
          padding: 8px 14px;
          font-size: 12px;
          font-weight: 700;
          background: rgba(255,255,255,.16);
        }
        .hero--soft .hero__tag {
          background: rgba(255,255,255,.94);
          color: var(--text);
        }
        .page-grid {
          display: grid;
          grid-template-columns: 210px 1fr;
          gap: 18px;
          align-items: start;
        }
        .stack {
          display: grid;
          gap: 16px;
        }
        .card {
          background: white;
          border-radius: 24px;
          padding: 22px;
          box-shadow: 0 14px 36px rgba(90,74,58,.08);
          break-inside: avoid;
          page-break-inside: avoid;
        }
        .card--soft {
          background: rgba(255,248,244,.92);
        }
        .card--blue {
          background: rgba(245,251,254,.95);
        }
        .sidebar-card {
          background: rgba(255,248,244,.9);
          border-radius: 24px;
          padding: 22px;
          box-shadow: 0 14px 36px rgba(90,74,58,.08);
        }
        .eyebrow {
          margin: 0 0 10px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .08em;
          text-transform: uppercase;
          color: #c1ae9f;
        }
        .title-lg {
          margin: 0 0 6px;
          font-size: 18px;
          line-height: 1.15;
        }
        .muted {
          margin: 0;
          font-size: 13px;
          color: var(--text-soft);
          line-height: 1.6;
        }
        .gauge {
          width: 132px;
          height: 132px;
          margin: 0 auto 18px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background:
            radial-gradient(closest-side, white 75%, transparent 76% 100%),
            conic-gradient(var(--coral) ${pct}%, rgba(232,125,106,.14) 0);
        }
        .gauge__value {
          font-size: 32px;
          font-weight: 700;
          color: var(--text);
        }
        .pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 8px 14px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
        }
        .pill--success {
          background: #dff6ea;
          color: #0c7752;
        }
        .chip-list {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 14px;
        }
        .chip {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 7px 12px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
        }
        .chip--coral {
          background: rgba(232,125,106,.12);
          color: var(--coral-dark);
        }
        .chip--blue {
          background: rgba(106,172,206,.12);
          color: #4d8097;
        }
        .chip--amber {
          background: rgba(245, 190, 76, .16);
          color: #b36f1b;
        }
        .overview-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin-top: 14px;
        }
        .mini-card {
          padding: 16px;
          border-radius: 18px;
          background: rgba(255,247,242,.96);
        }
        .mini-card--blue {
          background: rgba(243,249,252,.98);
        }
        .mini-card h4 {
          margin: 0 0 6px;
          font-size: 11px;
          letter-spacing: .08em;
          text-transform: uppercase;
          color: #c1ae9f;
        }
        .mini-card p {
          margin: 0;
          font-size: 14px;
          line-height: 1.5;
          color: var(--text);
          font-weight: 600;
        }
        .action-banner {
          margin-top: 12px;
          padding: 12px 16px;
          border-radius: 16px;
          background: rgba(232,125,106,.08);
          font-size: 13px;
          line-height: 1.5;
          color: var(--text);
        }
        .section-list {
          display: grid;
          gap: 14px;
          margin-top: 14px;
        }
        .section-row {
          display: grid;
          gap: 10px;
        }
        .section-row__head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
        }
        .section-row__head h4 {
          margin: 0 0 4px;
          font-size: 15px;
        }
        .section-row__head p {
          margin: 0;
          font-size: 12px;
          color: var(--text-soft);
          line-height: 1.5;
        }
        .score-pill {
          flex-shrink: 0;
          padding: 6px 10px;
          border-radius: 999px;
          background: rgba(232,125,106,.08);
          font-size: 12px;
          font-weight: 700;
        }
        .score-track {
          height: 8px;
          border-radius: 999px;
          background: rgba(232,125,106,.1);
          overflow: hidden;
        }
        .score-fill {
          height: 100%;
          border-radius: inherit;
        }
        .note-chip-list {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .note-chip {
          display: inline-flex;
          padding: 8px 10px;
          border-radius: 12px;
          font-size: 11px;
          line-height: 1.45;
          max-width: 100%;
        }
        .note-chip--good {
          background: #eefaf3;
          color: #166534;
        }
        .note-chip--warn {
          background: #fff6eb;
          color: #9a5b11;
        }
        .note-chip--info {
          background: #eef7fb;
          color: #3d758d;
        }
        .info-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-top: 14px;
        }
        .info-card {
          border-radius: 18px;
          padding: 18px;
          min-height: 132px;
        }
        .info-card h4 {
          margin: 0 0 10px;
          font-size: 14px;
        }
        .info-card p {
          margin: 0;
          font-size: 13px;
          line-height: 1.65;
        }
        .info-card--good {
          background: #f0fbf5;
          color: #166534;
        }
        .info-card--warn {
          background: #fff8ef;
          color: #8a560e;
        }
        .info-card--plain {
          background: #fff4f0;
          color: var(--text);
        }
        .action-priority {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
        }
        .action-priority p {
          margin: 8px 0 0;
          font-size: 14px;
          line-height: 1.6;
        }
        .action-pill {
          flex-shrink: 0;
          padding: 10px 16px;
          border-radius: 999px;
          background: linear-gradient(135deg,var(--coral),var(--coral-dark));
          color: white;
          font-size: 12px;
          font-weight: 700;
        }
        .page-two-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.55fr) minmax(240px, .85fr);
          gap: 16px;
          align-items: start;
        }
        .analysis h2 {
          margin: 0 0 12px;
          font-size: 20px;
          line-height: 1.2;
        }
        .analysis h3 {
          margin: 20px 0 8px;
          font-size: 14px;
          color: var(--coral-dark);
        }
        .analysis p,
        .analysis li {
          font-size: 13px;
          line-height: 1.7;
          color: var(--text);
        }
        .analysis ul {
          margin: 0;
          padding-left: 18px;
        }
        .analysis strong {
          color: var(--coral-dark);
        }
        .action-callout {
          margin-top: 18px;
          border-left: 4px solid var(--coral);
          padding: 14px 16px;
          border-radius: 16px;
          background: rgba(232,125,106,.08);
          font-size: 13px;
          line-height: 1.6;
        }
        .sidebar-stack {
          display: grid;
          gap: 16px;
        }
        .quote-card {
          background: rgba(243,249,252,.98);
        }
        .quote-card blockquote {
          margin: 16px 0 0;
          font-size: 14px;
          line-height: 1.75;
          color: var(--text);
          padding-left: 14px;
          border-left: 3px solid rgba(106,172,206,.35);
        }
        .checklist {
          display: grid;
          gap: 10px;
          margin-top: 14px;
        }
        .checklist__item {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          font-size: 13px;
          line-height: 1.55;
        }
        .checklist__dot {
          width: 8px;
          height: 8px;
          margin-top: 7px;
          border-radius: 999px;
          background: var(--coral);
          flex-shrink: 0;
        }
        .comment-list {
          display: grid;
          gap: 12px;
          margin-top: 12px;
        }
        .comment {
          border-radius: 16px;
          background: rgba(255,247,242,.98);
          padding: 14px 16px;
        }
        .comment__meta {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: baseline;
          margin-bottom: 8px;
          font-size: 12px;
          color: var(--text-soft);
        }
        .comment p {
          margin: 0;
          font-size: 13px;
          line-height: 1.6;
          color: var(--text);
        }
        .progress-chart {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(68px, 1fr));
          gap: 10px;
          align-items: end;
          min-height: 128px;
          margin-top: 14px;
        }
        .progress-chart__item {
          display: grid;
          justify-items: center;
          gap: 8px;
        }
        .progress-chart__bar {
          width: 28px;
          border-radius: 999px 999px 8px 8px;
          background: rgba(232,125,106,.25);
        }
        .progress-chart__bar.is-current {
          background: linear-gradient(180deg,var(--coral),var(--coral-dark));
        }
        .progress-chart__value {
          font-size: 12px;
          font-weight: 700;
          color: var(--text);
        }
        .progress-chart__label {
          font-size: 10px;
          color: var(--muted);
          text-align: center;
          line-height: 1.35;
        }
        .empty-state {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px;
          border-radius: 16px;
          background: rgba(255,248,244,.85);
        }
        .empty-state--compact {
          padding: 12px 14px;
        }
        .empty-state__icon {
          width: 34px;
          height: 34px;
          flex-shrink: 0;
          border-radius: 12px;
          display: grid;
          place-items: center;
          background: rgba(232,125,106,.12);
          color: var(--coral-dark);
          font-size: 12px;
          font-weight: 700;
        }
        .empty-state h3 {
          margin: 0 0 4px;
          font-size: 14px;
        }
        .empty-state p {
          margin: 0;
          font-size: 12px;
          color: var(--text-soft);
          line-height: 1.5;
        }
        .footer {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin-top: 22px;
          font-size: 11px;
          color: var(--muted);
        }
        @page {
          size: A4;
          margin: 10mm;
        }
        @media print {
          body {
            background: white;
          }
          .screen-toolbar {
            display: none !important;
          }
          .document {
            margin: 0;
            width: auto;
          }
          .page {
            margin: 0;
            border-radius: 0;
            box-shadow: none;
            min-height: auto;
          }
        }
      </style>
    </head>
    <body>
      <div class="screen-toolbar">
        <div class="screen-toolbar__inner">
          <div class="screen-toolbar__text">Le document est pret. Utilise "Enregistrer en PDF" dans la boite d'impression si elle ne s'ouvre pas automatiquement.</div>
          <div class="screen-toolbar__actions">
            <button class="toolbar-btn toolbar-btn--secondary" onclick="window.close()">Fermer</button>
            <button class="toolbar-btn toolbar-btn--primary" onclick="window.print()">Imprimer / PDF</button>
          </div>
        </div>
      </div>

      <main class="document">
        <section class="page">
          <header class="hero">
            <div>
              <div class="hero__brand">
                <div class="hero__badge">CD</div>
                <div>
                  <p class="hero__eyebrow">CloserDebrief</p>
                  <h1 class="hero__title">Export debrief premium</h1>
                </div>
              </div>
              <p class="hero__subtitle">Synthese post-appel prete pour l'archive, le coaching et le partage equipe.</p>
            </div>
            <div class="hero__tag">Format PDF A4</div>
          </header>

          <div class="page-grid">
            <aside class="stack">
              <div class="sidebar-card">
                <p class="eyebrow">Performance</p>
                <div class="gauge"><span class="gauge__value">${pct}%</span></div>
                <div style="text-align:center;margin-bottom:16px;">
                  <span class="pill pill--success">${debrief.is_closed ? 'Close' : 'Non close'}</span>
                </div>
                <p class="eyebrow">Resume rapide</p>
                <p class="muted">${escapeHtml(`${debrief.total_score || 0} / ${debrief.max_score || 0} points`)}</p>
                <p class="muted">${escapeHtml(fmtDate(debrief.call_date))}</p>
                <p class="muted">${escapeHtml(debrief.closer_name || debrief.user_name || 'Closer non renseigne')}</p>
                ${debrief.call_link ? `<p class="muted"><a href="${escapeHtml(debrief.call_link)}" target="_blank" rel="noreferrer" style="color:#d4604e;text-decoration:none;">Lien d'enregistrement</a></p>` : ''}
                <div style="height:1px;background:rgba(232,125,106,.1);margin:18px 0;"></div>
                <p class="eyebrow">Lecture coach</p>
                <p class="muted">Objection dominante : ${escapeHtml(getDominantObjection(debrief))}</p>
                <p class="muted">Action cle : ${escapeHtml(actionPriority)}</p>
              </div>
            </aside>

            <div class="stack">
              <article class="card">
                <p class="eyebrow" style="color:#d27b69;">Debrief</p>
                <h2 class="title-lg" style="font-size:36px;margin-bottom:6px;">${escapeHtml(debrief.prospect_name || 'Prospect')}</h2>
                <p class="muted">Closer : ${escapeHtml(debrief.closer_name || debrief.user_name || 'Non renseigne')} • Appel du ${escapeHtml(fmtDate(debrief.call_date))}</p>
                <p class="muted" style="margin-top:8px;">Document exporte le ${escapeHtml(fmtDate(new Date().toISOString()))} depuis la fiche de detail du debrief.</p>
                <div class="chip-list">
                  <span class="chip chip--coral">${debrief.is_closed ? 'Prospect closé' : 'Prospect a relancer'}</span>
                  <span class="chip chip--blue">${escapeHtml(`${pct}% de performance`)}</span>
                  <span class="chip chip--amber">${escapeHtml(getDominantObjection(debrief))}</span>
                </div>
              </article>

              <article class="card card--soft">
                <h3 class="title-lg">Vue d'ensemble</h3>
                <p class="muted">Une carte de synthese aeree, lisible en ecran comme en impression.</p>
                <div class="overview-grid">
                  <div class="mini-card">
                    <h4>Decision</h4>
                    <p>${debrief.is_closed ? 'Bonne adhesion et signature obtenue' : 'Echange positif mais non closé'}</p>
                  </div>
                  <div class="mini-card mini-card--blue">
                    <h4>Objection dominante</h4>
                    <p>${escapeHtml(getDominantObjection(debrief))}</p>
                  </div>
                </div>
                <div class="action-banner"><strong>Action prioritaire :</strong> ${escapeHtml(actionPriority)}</div>
              </article>

              <article class="card">
                <h3 class="title-lg">Scores par section</h3>
                <div class="section-list">${sectionRows}</div>
              </article>

              ${quickNotes ? `<article class="card"><h3 class="title-lg">Notes de synthese</h3><div class="info-grid">${quickNotes}</div></article>` : ''}
            </div>
          </div>

          <footer class="footer">
            <span>CloserDebrief • synthese debrief</span>
            <span>${escapeHtml(title)}</span>
          </footer>
        </section>

        <section class="page">
          <header class="hero hero--soft">
            <div>
              <div class="hero__brand">
                <div class="hero__badge">AI</div>
                <div>
                  <p class="hero__eyebrow" style="color:#8a7465;">CloserDebrief AI</p>
                  <h1 class="hero__title" style="color:#5a4a3a;">Synthese coaching</h1>
                </div>
              </div>
              <p class="hero__subtitle" style="color:#8f7b6b;">La page 2 reprend l'analyse IA, le plan d'action et le suivi collaboratif dans un format imprimable propre.</p>
            </div>
          </header>

          <article class="card card--soft" style="margin-bottom:16px;">
            <div class="action-priority">
              <div>
                <p class="eyebrow" style="margin-bottom:6px;color:#d27b69;">Action prioritaire</p>
                <p>${escapeHtml(actionPriority)}</p>
              </div>
              <div class="action-pill">A deployer</div>
            </div>
          </article>

          <div class="page-two-grid">
            <article class="card analysis">
              <h2>Analyse IA condensee</h2>
              <p class="muted">On conserve la substance de la carte IA actuelle dans une mise en page faite pour le PDF.</p>
              ${aiHtml}
            </article>

            <aside class="sidebar-stack">
              ${scriptSuggested ? `
                <article class="card quote-card">
                  <p class="eyebrow">Script recommande</p>
                  <span class="chip chip--blue">verbatim pret a l'emploi</span>
                  <blockquote>${renderTextBlock(scriptSuggested)}</blockquote>
                </article>
              ` : ''}

              <article class="card">
                <h3 class="title-lg">Checklist appel suivant</h3>
                <div class="checklist">
                  ${[
                    actionPriority,
                    coachingSuggested || "Annoncer le prix plus lentement et laisser un silence complet avant de relancer.",
                    "Isoler l'objection unique avant de traiter la suite.",
                    "Reconnecter l'offre aux douleurs explicites du prospect.",
                    "Terminer avec une prochaine etape datee.",
                  ].filter(Boolean).slice(0, 5).map(item => `
                    <div class="checklist__item">
                      <span class="checklist__dot"></span>
                      <span>${escapeHtml(item)}</span>
                    </div>
                  `).join('')}
                </div>
              </article>

              <article class="card card--blue">
                <h3 class="title-lg">Progression recente</h3>
                ${progressHtml}
              </article>
            </aside>
          </div>

          <article class="card" style="margin-top:16px;">
            <h3 class="title-lg">Commentaires et suivi</h3>
            <div class="comment-list">${commentsHtml}</div>
          </article>

          <footer class="footer">
            <span>CloserDebrief • synthese coaching</span>
            <span>analyse IA • coaching • suivi</span>
          </footer>
        </section>
      </main>
    </body>
  </html>`;
}

export function openDebriefPdfWindow(debrief) {
  const title = `debrief-${slugify(debrief?.prospect_name || 'prospect')}-${debrief?.call_date || 'export'}.pdf`;
  const exportWindow = window.open('', '_blank', 'width=1180,height=900');
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
  targetWindow.setTimeout(() => {
    try {
      targetWindow.print();
    } catch (err) {
      targetWindow.focus();
    }
  }, 450);
}

export { getSectionNote };
