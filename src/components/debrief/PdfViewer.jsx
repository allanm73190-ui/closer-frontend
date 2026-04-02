import React, { useEffect, useState } from 'react';
import { DS } from '../../styles/designSystem';
import { apiFetch } from '../../config/api';
import { buildDebriefPdfPreviewHtml, downloadDebriefPdf } from '../../utils/pdfExport';
import { Btn, Spinner } from '../ui';

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
        const analysis = (() => {
          try { return localStorage.getItem(`cd_ai_${debrief.id}`) || ''; }
          catch { return ''; }
        })();
        let comments = [];
        try {
          comments = await apiFetch(`/debriefs/${debrief.id}/comments`);
        } catch {
          comments = [];
        }
        const nextPayload = { debrief, comments, analysis, allDebriefs, user };
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

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', background:'var(--bg)' }}>
      <header style={{ position:'sticky', top:0, zIndex:40, background:'var(--card-soft)', borderBottom:'1px solid var(--border)', backdropFilter:'blur(16px)' }}>
        <div style={{ padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, flexWrap:'wrap' }}>
          <div>
            <p style={{ margin:0, fontSize:14, fontWeight:700, color:'var(--txt,#5a4a3a)' }}>Visualisateur PDF Debrief</p>
            <p style={{ margin:'2px 0 0', fontSize:12, color:DS.textMuted }}>{debrief.prospect_name || 'Lead'} · rendu fidèle en 2 pages</p>
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <Btn variant="secondary" onClick={()=>navigate('Detail', debrief.id, 'History')} style={{ fontSize:12, padding:'7px 12px' }}>
              Retour debrief
            </Btn>
            <Btn variant="secondary" onClick={handleCopyLink} style={{ fontSize:12, padding:'7px 12px' }}>
              🔗 Copier le lien
            </Btn>
            <Btn onClick={handleDownload} disabled={downloading || !payload} style={{ fontSize:12, padding:'7px 12px' }}>
              {downloading ? 'Téléchargement...' : '⬇️ Télécharger PDF'}
            </Btn>
          </div>
        </div>
      </header>

      <main style={{ flex:1, padding:10 }}>
        {loading ? (
          <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:DS.textMuted, gap:10 }}>
            <Spinner size={22}/>
            <span>Chargement du visualisateur...</span>
          </div>
        ) : (
          <iframe
            title="Visualisateur PDF Debrief"
            srcDoc={html}
            style={{ width:'100%', height:'calc(100vh - 96px)', border:'1px solid var(--border)', borderRadius:12, background:'var(--card,#fff)' }}
          />
        )}
      </main>
    </div>
  );
}

export { PdfViewer };
