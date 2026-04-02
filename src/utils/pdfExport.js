import { jsPDF } from 'jspdf';
import { computeSectionScores, fmtDate, toScore20FromPercentage } from './scoring';

const SECTION_ORDER = [
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

function toLines(text = '', max = 10) {
  return String(text || '')
    .split('\n')
    .map(line => line.replace(/\*\*/g, '').replace(/^[-*]\s*/, '').trim())
    .filter(Boolean)
    .slice(0, max);
}

function toBarColor(score) {
  if (score >= 4) return '#059669';
  if (score >= 3) return '#d97706';
  if (score >= 2) return '#e87d6a';
  return '#ef4444';
}

function buildContext(payload) {
  const debrief = payload?.debrief || {};
  const title = `debrief-${slugify(debrief.prospect_name || 'prospect')}-${debrief.call_date || 'export'}.pdf`;
  const percentage = Math.round(Number(debrief.percentage || 0));
  const score20 = toScore20FromPercentage(percentage);
  const scores = computeSectionScores(debrief.sections || {});
  const analysisText = String(payload?.analysis || '').trim();
  const analysisLines = toLines(analysisText, 12);
  return {
    title,
    debrief,
    percentage,
    score20,
    scores,
    analysisText,
    analysisLines,
  };
}

export function getSectionNote(sectionNotes, key) {
  if (!sectionNotes) return null;
  return sectionNotes[key] || (key === 'presentation_offre' ? sectionNotes.offre : null) || null;
}

function buildSectionRows(scores = {}) {
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

function buildSectionNotes(debrief = {}) {
  const notes = debrief.section_notes || {};
  const cards = SECTION_ORDER.map(section => {
    const note = getSectionNote(notes, section.key);
    const strength = String(note?.strength || note?.strengths || '').trim();
    const weakness = String(note?.weakness || note?.weaknesses || '').trim();
    const improvement = String(note?.improvement || note?.improvements || '').trim();
    if (!strength && !weakness && !improvement) return '';
    return `
      <article class="note-card">
        <h3>${escapeHtml(section.label)}</h3>
        ${strength ? `<p><strong>Point fort:</strong> ${escapeHtml(strength)}</p>` : ''}
        ${weakness ? `<p><strong>Point faible:</strong> ${escapeHtml(weakness)}</p>` : ''}
        ${improvement ? `<p><strong>Amélioration:</strong> ${escapeHtml(improvement)}</p>` : ''}
      </article>
    `;
  }).filter(Boolean);

  if (cards.length === 0) {
    return '<p class="hint">Base vierge: aucune note section renseignée.</p>';
  }
  return `<div class="note-grid">${cards.join('')}</div>`;
}

function buildDebriefPdfHtml(payload) {
  const ctx = buildContext(payload);
  const {
    title,
    debrief,
    percentage,
    score20,
    scores,
    analysisText,
    analysisLines,
  } = ctx;

  const shortLink = String(debrief.call_link || '').trim();
  const sectionRows = buildSectionRows(scores);
  const sectionNotesHtml = buildSectionNotes(debrief);
  const analysisHtml = analysisLines.length > 0
    ? `<ul class="list">${analysisLines.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
    : '<p class="hint">Base vierge: aucune synthèse IA fournie.</p>';

  return `<!doctype html>
  <html lang="fr">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${escapeHtml(title)}</title>
      <style>
        :root {
          --paper: #fffdfa;
          --line: #e9dccf;
          --text: #3c2f25;
          --muted: #7e6d5e;
          --bg: #f2f5fb;
          --accent: #e87d6a;
        }
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; }
        body {
          font-family: Inter, system-ui, sans-serif;
          background: linear-gradient(160deg, #eef2fb 0%, #f7eee8 100%);
          color: var(--text);
        }
        .topbar {
          position: sticky;
          top: 0;
          z-index: 10;
          padding: 10px 14px;
          border-bottom: 1px solid var(--line);
          background: rgba(255,255,255,.9);
          font-size: 12px;
          color: var(--muted);
        }
        .stack {
          width: min(920px, calc(100vw - 32px));
          margin: 18px auto 30px;
          display: grid;
          gap: 18px;
        }
        .page {
          background: var(--paper);
          border: 1px solid #efe4da;
          border-radius: 20px;
          box-shadow: 0 14px 30px rgba(70, 52, 40, .1);
          padding: 26px;
          min-height: 1120px;
        }
        .kicker {
          margin: 0 0 10px;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: .09em;
          font-weight: 700;
          color: var(--muted);
        }
        .hero {
          border: 1px solid #f1e3d7;
          border-radius: 14px;
          padding: 14px;
          background: linear-gradient(110deg, #253043 0%, #2f3d53 45%, var(--accent) 100%);
          color: #fff;
        }
        .hero h1 {
          margin: 0;
          font-size: 28px;
          line-height: 1.1;
          letter-spacing: -.02em;
        }
        .hero p {
          margin: 8px 0 0;
          font-size: 13px;
          color: #f6eee9;
        }
        .hero a {
          color: #fff;
          text-decoration: none;
          border-bottom: 1px solid rgba(255,255,255,.6);
        }
        .meta-grid {
          margin-top: 12px;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
        .meta-box {
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 12px;
          background: #fff;
        }
        .meta-box p {
          margin: 0;
          font-size: 12px;
          color: var(--muted);
        }
        .meta-box strong {
          display: block;
          margin-top: 5px;
          font-size: 26px;
          color: #d4604e;
        }
        .panel {
          margin-top: 12px;
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
        .hint {
          margin: 0;
          font-size: 12px;
          color: var(--muted);
          line-height: 1.45;
        }
        .list {
          margin: 0;
          padding-left: 18px;
          font-size: 13px;
          line-height: 1.5;
        }
        .list li + li { margin-top: 5px; }
        .bar-row + .bar-row { margin-top: 9px; }
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
        .note-grid {
          display: grid;
          gap: 10px;
        }
        .note-card {
          border: 1px solid #f1e4d9;
          border-radius: 10px;
          background: #fffdfa;
          padding: 10px;
        }
        .note-card h3 {
          margin: 0 0 6px;
          font-size: 14px;
        }
        .note-card p {
          margin: 5px 0 0;
          font-size: 12px;
          line-height: 1.45;
          color: #665648;
        }
        @media (max-width: 860px) {
          .page { min-height: auto; padding: 18px; border-radius: 14px; }
          .meta-grid { grid-template-columns: 1fr; }
        }
        @media print {
          body { background: #fff; }
          .topbar { display: none; }
          .stack { width: 100%; margin: 0; gap: 0; }
          .page {
            box-shadow: none;
            border-radius: 0;
            border: none;
            page-break-after: always;
            break-after: page;
            padding: 14mm;
          }
          .page:last-child {
            page-break-after: auto;
            break-after: auto;
          }
        }
      </style>
    </head>
    <body>
      <div class="topbar">Base vierge export debrief · version minimale</div>
      <main class="stack">
        <section class="page">
          <p class="kicker">Page 1 · Informations brutes</p>
          <section class="hero">
            <h1>${escapeHtml(debrief.prospect_name || 'Lead non renseigné')}</h1>
            <p>Date: ${escapeHtml(fmtDate(debrief.call_date))} · Résultat: ${debrief.is_closed ? 'Closé' : 'Non closé'}</p>
            <p>Closer: ${escapeHtml(debrief.closer_name || debrief.user_name || 'Non renseigné')}</p>
            <p>Lien appel: ${
              shortLink
                ? `<a href="${escapeHtml(shortLink)}" target="_blank" rel="noopener noreferrer">${escapeHtml(shortLink)}</a>`
                : 'Non renseigné'
            }</p>
          </section>

          <section class="meta-grid">
            <article class="meta-box">
              <p>Score global</p>
              <strong>${score20}</strong>
              <p>/20 · ${percentage}%</p>
            </article>
            <article class="meta-box">
              <p>Statut export</p>
              <strong style="font-size:18px;color:#3f3228;">Base vierge</strong>
              <p>Prêt pour redesign complet</p>
            </article>
          </section>

          <section class="panel">
            <h2>Synthèse IA (brute)</h2>
            ${analysisHtml}
          </section>

          <section class="panel">
            <h2>Notes de l'appel</h2>
            ${
              analysisText
                ? '<p class="hint">La synthèse IA ci-dessus est affichée sans reformulation.</p>'
                : `<p class="hint">${escapeHtml(debrief.notes || 'Aucune note closer renseignée.')}</p>`
            }
          </section>
        </section>

        <section class="page">
          <p class="kicker">Page 2 · Scores et notes section</p>
          <section class="panel">
            <h2>Scores par section</h2>
            ${sectionRows}
          </section>
          <section class="panel">
            <h2>Notes par section</h2>
            ${sectionNotesHtml}
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
          <p class="text">Génération de la base vierge en cours...</p>
        </div>
      </div>
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
    if (!docRef) throw new Error("Impossible de préparer le rendu PDF.");

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
