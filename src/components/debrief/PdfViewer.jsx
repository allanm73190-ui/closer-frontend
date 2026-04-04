import React, { useEffect, useState } from 'react';
import { DS } from '../../styles/designSystem';
import { apiFetch } from '../../config/api';
import { fetchAIExportSummary } from '../../config/ai';
import { buildDebriefPdfPreviewHtml, downloadDebriefPdf } from '../../utils/pdfExport';
import { fmtDate, toScore20FromPercentage } from '../../utils/scoring';
import { Btn, Spinner } from '../ui';

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

function toReadableResult(debrief = {}) {
  const raw = String(debrief?.sections?.closing?.resultat_closing || debrief?.resultat_closing || '').trim().toLowerCase();
  if (raw && RESULT_LABELS[raw]) return RESULT_LABELS[raw];
  if (raw) return raw.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
  return debrief?.is_closed ? 'Closé' : 'Non closé';
}

function PdfViewer({ debrief, allDebriefs, user, toast, navigate }) {
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [payload, setPayload] = useState(null);
  const [html, setHtml] = useState('');

  useEffect(() => {
    let mounted = true;
    async function prepare() {
      if (!debrief?.id) return;
      setLoading(true);
      try {
        const summaryCacheKey = `cd_ai_export_summary_${debrief.id}`;
        const analysis = (() => {
          try { return localStorage.getItem(`cd_ai_${debrief.id}`) || ''; }
          catch { return ''; }
        })();
        let exportSummary = (() => {
          try { return localStorage.getItem(summaryCacheKey) || ''; }
          catch { return ''; }
        })();
        let comments = [];
        try {
          comments = await apiFetch(`/debriefs/${debrief.id}/comments`);
        } catch {
          comments = [];
        }
        if (analysis) {
          try {
            const freshSummary = await fetchAIExportSummary(analysis);
            if (freshSummary) {
              exportSummary = freshSummary;
              try { localStorage.setItem(summaryCacheKey, freshSummary); } catch {}
            }
          } catch {
            // Fallback silencieux: cache local ou résumé de secours côté export.
          }
        }
        const nextPayload = { debrief, comments, analysis, exportSummary, allDebriefs, user };
        if (!mounted) return;
        setPayload(nextPayload);
        setHtml(buildDebriefPdfPreviewHtml(nextPayload));
      } catch (e) {
        if (mounted) toast(e.message || "Impossible de préparer le visualisateur PDF", 'error');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    prepare();
    return () => { mounted = false; };
  }, [debrief?.id, allDebriefs, user, toast]);

  const handleCopyLink = async () => {
    if (!debrief?.id) return;
    try {
      const shareUrl = new URL(window.location.origin + window.location.pathname);
      shareUrl.searchParams.set('debrief_id', debrief.id);
      shareUrl.searchParams.set('pdf_view', '1');
      await navigator.clipboard.writeText(shareUrl.toString());
      toast('Lien du visualisateur copié');
    } catch {
      toast("Impossible de copier le lien pour l'instant", 'error');
    }
  };

  const handleDownload = async () => {
    if (!payload || downloading) return;
    setDownloading(true);
    try {
      await downloadDebriefPdf(payload);
      toast('PDF téléchargé (rendu fidèle)');
    } catch (e) {
      toast(e.message || "Impossible de télécharger le PDF", 'error');
    } finally {
      setDownloading(false);
    }
  };

  if (!debrief) {
    return (
      <div style={{ minHeight:'100vh', display:'grid', placeItems:'center', padding:24 }}>
        <div style={{ textAlign:'center' }}>
          <p style={{ margin:0, color:DS.textMuted }}>Debrief introuvable pour ce lien.</p>
          <Btn variant="secondary" onClick={()=>navigate('History')} style={{ marginTop:14 }}>Retour</Btn>
        </div>
      </div>
    );
  }

  const score20 = toScore20FromPercentage(Math.round(Number(debrief?.percentage || 0)));
  const resultLabel = toReadableResult(debrief);

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', background:'var(--bg)', position:'relative' }}>
      <div style={{ position:'absolute', top:-60, right:-40, width:220, height:220, borderRadius:'50%', background:'radial-gradient(circle, rgba(255,126,95,.18) 0%, rgba(255,126,95,0) 68%)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:-80, left:-60, width:260, height:260, borderRadius:'50%', background:'radial-gradient(circle, rgba(124,58,237,.14) 0%, rgba(124,58,237,0) 72%)', pointerEvents:'none' }} />

      <header style={{ position:'sticky', top:0, zIndex:40, background:'var(--card-soft)', borderBottom:'1px solid var(--border)', backdropFilter:'blur(16px)' }}>
        <div style={{ padding:'12px 16px', display:'grid', gridTemplateColumns:'minmax(0,1fr) auto', alignItems:'center', gap:10 }}>
          <div style={{ minWidth:0 }}>
            <p style={{ margin:0, fontSize:14, fontWeight:700, color:'var(--txt,#5a4a3a)' }}>Visualisateur PDF Debrief</p>
            <p style={{ margin:'2px 0 0', fontSize:12, color:DS.textMuted, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{debrief.prospect_name || 'Lead'} · {fmtDate(debrief.call_date || debrief.created_at)} · {resultLabel}</p>
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', justifyContent:'flex-end' }}>
            <Btn variant="secondary" onClick={()=>navigate('Detail', debrief.id, 'History')} style={{ fontSize:12, padding:'7px 12px' }}>
              ← Debrief
            </Btn>
            <Btn variant="secondary" onClick={handleCopyLink} style={{ fontSize:12, padding:'7px 12px' }}>
              🔗 Lien
            </Btn>
            <Btn onClick={handleDownload} disabled={downloading || !payload} style={{ fontSize:12, padding:'7px 12px' }}>
              {downloading ? 'Téléchargement...' : '⬇️ PDF'}
            </Btn>
          </div>
        </div>
      </header>

      <main style={{ flex:1, padding:12, position:'relative', zIndex:1 }}>
        <section style={{
          marginBottom:10,
          border:'1px solid var(--glass-border)',
          borderRadius:14,
          background:'linear-gradient(145deg, rgba(255,255,255,.78), rgba(255,247,240,.72))',
          boxShadow:'var(--sh-card)',
          backdropFilter:'blur(10px)',
          WebkitBackdropFilter:'blur(10px)',
          padding:'10px 12px',
          display:'grid',
          gridTemplateColumns:'minmax(0,1fr) auto',
          gap:10,
          alignItems:'center',
        }}>
          <div style={{ minWidth:0 }}>
            <p style={{ margin:'0 0 3px', fontSize:10, textTransform:'uppercase', letterSpacing:'.08em', color:DS.textMuted, fontWeight:800 }}>Rendu export final</p>
            <p style={{ margin:0, fontSize:13, color:'var(--txt2,#b09080)' }}>Prévisualisation fidèle du PDF avant téléchargement.</p>
          </div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', justifyContent:'flex-end' }}>
            <span style={{ fontSize:11, fontWeight:700, borderRadius:999, padding:'4px 8px', background:'var(--chip-bg)', color:'var(--txt,#5a4a3a)', border:'1px solid var(--border)' }}>
              Score {score20}/20
            </span>
            <span style={{ fontSize:11, fontWeight:700, borderRadius:999, padding:'4px 8px', background:debrief.is_closed ? 'var(--positive-bg)' : 'var(--danger-bg)', color:debrief.is_closed ? 'var(--positive-txt)' : 'var(--danger-txt)', border:'1px solid var(--border)' }}>
              {resultLabel}
            </span>
          </div>
        </section>

        {loading ? (
          <div style={{ height:'calc(100vh - 180px)', display:'flex', alignItems:'center', justifyContent:'center', color:DS.textMuted, gap:10, border:'1px solid var(--glass-border)', borderRadius:14, background:'var(--glass-bg)', boxShadow:'var(--sh-card)', backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)' }}>
            <Spinner size={22} />
            <span>Chargement du visualisateur...</span>
          </div>
        ) : (
          <iframe
            title="Visualisateur PDF Debrief"
            srcDoc={html}
            style={{ width:'100%', height:'calc(100vh - 180px)', border:'1px solid var(--glass-border)', borderRadius:14, background:'var(--card,#fff)', boxShadow:'var(--sh-card)' }}
          />
        )}
      </main>
    </div>
  );
}

export { PdfViewer };
