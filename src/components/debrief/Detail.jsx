import React, { useState } from 'react';
import { DS } from '../../styles/designSystem';
import { useIsMobile } from '../../hooks';
import { computeSectionScores, avgSectionScores, fmtDate, toScore20FromPercentage } from '../../utils/scoring';
import { buildDebriefPdfPreviewHtml, downloadDebriefPdf, getSectionNote } from '../../utils/pdfExport';
import { SECTIONS } from '../../config/ai';
import { apiFetch } from '../../config/api';
import { Btn, Card, ScoreGauge, ClosedBadge, Spinner } from '../ui';
import { Radar, SectionBars } from '../ui/Charts';
import { AIAnalysisCard, CommentsSection } from '../ai';
import { QualityBadge, QualityFlagsList, QualityBreakdown } from './QualityBadge';

function Detail({ debrief: debriefProp, navigate, onDelete, fromPage, user, toast, allDebriefs, autoAI }) {
  const [debrief, setDebrief] = useState(debriefProp);
  React.useEffect(() => { setDebrief(debriefProp); }, [debriefProp]);
  const mob = useIsMobile();
  const isManager = user && (user.role === 'head_of_sales' || user.role === 'admin');
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const submitReview = async (status) => {
    if (reviewBusy || !debrief) return;
    setReviewBusy(true);
    try {
      await apiFetch(`/debriefs/${debrief.id}/review`, { method: 'POST', body: { status, review_note: reviewNote } });
      setDebrief({ ...debrief, validation_status: status, validated_at: new Date().toISOString() });
      setReviewNote('');
      toast?.(`Debrief ${status === 'validated' ? 'validé' : status === 'corrected' ? 'corrigé' : 'rejeté'}`, 'success');
    } catch (e) {
      toast?.(e.message || 'Erreur review', 'error');
    } finally {
      setReviewBusy(false);
    }
  };
  const [exportingPdf, setExportingPdf] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewPayload, setPreviewPayload] = useState(null);
  const [downloadingPreview, setDownloadingPreview] = useState(false);
  if (!debrief) return (
    <div style={{ textAlign:'center', padding:60 }}>
      <p style={{ color:DS.textMuted }}>Debrief introuvable</p>
      <Btn variant="secondary" onClick={()=>navigate('Dashboard')} style={{ marginTop:16 }}>Retour</Btn>
    </div>
  );
  const pct    = Math.round(debrief.percentage || 0);
  const score20 = toScore20FromPercentage(pct);
  const scores = computeSectionScores(debrief.sections || {});
  const globalScores = avgSectionScores((allDebriefs || []).filter(item => item.id !== debrief.id));

  const buildPdfPayload = async () => {
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

    return { debrief, comments, analysis, allDebriefs, user };
  };

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      const payload = await buildPdfPayload();
      setPreviewPayload(payload);
      setPreviewHtml(buildDebriefPdfPreviewHtml(payload));
      setPreviewOpen(true);
    } catch (e) {
      toast(e.message || "Impossible de préparer la prévisualisation PDF", 'error');
    } finally {
      setExportingPdf(false);
    }
  };

  const handleDownloadFromPreview = async () => {
    if (!previewPayload) return;
    setDownloadingPreview(true);
    try {
      await downloadDebriefPdf(previewPayload);
      toast('PDF téléchargé');
      setPreviewOpen(false);
    } catch (e) {
      toast(e.message || "Impossible de télécharger le PDF", 'error');
    } finally {
      setDownloadingPreview(false);
    }
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <Btn variant="secondary" onClick={()=>navigate(fromPage||'Dashboard')} style={{width:36,height:36,padding:0,borderRadius:8,fontSize:16,flexShrink:0}}>←</Btn>
          <div>
            <h1 style={{ fontSize:mob?18:22, fontWeight:700, color:'var(--txt,#4A3428)', margin:0 }}>{debrief.prospect_name}</h1>
            <div style={{ display:'flex', gap:12, fontSize:12, color:DS.textMuted, marginTop:4, flexWrap:'wrap' }}>
              <span>📅 {fmtDate(debrief.call_date)}</span>
              <span>👤 {debrief.closer_name}</span>
              {debrief.user_name && <span>par {debrief.user_name}</span>}
            </div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
          <ClosedBadge isClosed={debrief.is_closed}/>
          <Btn variant="secondary" onClick={()=>navigate('EditDebrief', debrief.id, fromPage || 'History')} style={{ padding:'8px 14px', fontSize:12 }}>
            ✏️ Modifier
          </Btn>
          <Btn onClick={handleExportPdf} disabled={exportingPdf} style={{ padding:'8px 14px', fontSize:12 }}>
            {exportingPdf ? 'Préparation prévisualisation...' : '📄 Prévisualiser le PDF'}
          </Btn>
          {debrief.call_link && <a href={debrief.call_link} target="_blank" rel="noopener noreferrer" style={{padding:'6px 12px',border:'1px solid var(--border)',borderRadius:8,background:'var(--glass-bg)',fontSize:12,textDecoration:'none',color:'var(--txt,#4A3428)'}}>🔗 Écouter</a>}
          <Btn variant="danger" onClick={()=>onDelete(debrief.id)} style={{width:36,height:36,padding:0,borderRadius:8,fontSize:14}}>🗑</Btn>
        </div>
      </div>

      {typeof debrief.overall_quality_score === 'number' && (
        <Card style={{ padding: 14, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <strong style={{ fontSize: 13 }}>Qualité du debrief</strong>
            <QualityBadge score={debrief.overall_quality_score} flags={debrief.quality_flags} />
            {debrief.validation_status && debrief.validation_status !== 'pending' && (
              <span style={{ fontSize: 11, color: '#6b7280' }}>statut: {debrief.validation_status}</span>
            )}
          </div>
          <QualityBreakdown breakdown={debrief.quality_breakdown} />
          <QualityFlagsList flags={debrief.quality_flags} />
          {isManager && (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="Note de review (optionnel)"
                rows={2}
                style={{ width: '100%', fontSize: 12, padding: 6, border: '1px solid var(--border)', borderRadius: 6 }}
              />
              <div style={{ display: 'flex', gap: 6 }}>
                <Btn variant="secondary" disabled={reviewBusy} onClick={() => submitReview('validated')} style={{ fontSize: 11, padding: '6px 10px' }}>✅ Valider</Btn>
                <Btn variant="secondary" disabled={reviewBusy} onClick={() => submitReview('corrected')} style={{ fontSize: 11, padding: '6px 10px' }}>✏️ Corriger</Btn>
                <Btn variant="danger" disabled={reviewBusy} onClick={() => submitReview('rejected')} style={{ fontSize: 11, padding: '6px 10px' }}>✖ Rejeter</Btn>
              </div>
            </div>
          )}
        </Card>
      )}

      {mob ? (
        <>
          <Card style={{ padding:20, display:'flex', flexDirection:'column', alignItems:'center', gap:12, background:'var(--glass-bg)', backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)' }}>
            <ScoreGauge percentage={pct}/>
            <p style={{ fontSize:13, color:DS.textMuted, margin:0 }}>{score20} / 20 points</p>
            <Radar scores={scores} compareScores={globalScores} size={246} />
            {globalScores && (
              <p style={{ margin:0, fontSize:11, color:DS.textMuted }}>
                Pleine = debrief · Pointillé = moyenne globale
              </p>
            )}
          </Card>
          <Card style={{ padding:20 }}>
            <h3 style={{ fontSize:14, fontWeight:700, color:'var(--txt,#4A3428)', marginBottom:16 }}>Score par section</h3>
            <SectionBars scores={scores} globalScores={globalScores} />
          </Card>
        </>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'minmax(320px, 360px) minmax(0, 1fr)', gap:22, alignItems:'start' }}>
          <Card style={{ padding:24, display:'flex', flexDirection:'column', alignItems:'center', gap:14, background:'var(--glass-bg)', backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)' }}>
            <ScoreGauge percentage={pct}/>
            <p style={{ fontSize:13, color:DS.textMuted, margin:0 }}>{score20} / 20 points</p>
            <div style={{ width:'100%', borderTop:'1px dashed var(--border)', paddingTop:10 }}>
              <p style={{ margin:'0 0 6px', fontSize:11, color:DS.textMuted, fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', textAlign:'center' }}>
                Radar Comparatif
              </p>
              <div style={{ display:'flex', justifyContent:'center' }}>
                <Radar scores={scores} compareScores={globalScores} size={258} />
              </div>
            </div>
            {globalScores && (
              <p style={{ margin:0, fontSize:11, color:DS.textMuted }}>
                Pleine = ce debrief · Pointillé = base historique
              </p>
            )}
          </Card>

          <Card style={{ padding:24 }}>
            <h3 style={{ fontSize:14, fontWeight:700, color:'var(--txt,#4A3428)', marginBottom:18 }}>Score par section</h3>
            <SectionBars scores={scores} globalScores={globalScores} />
            <div style={{ display:'flex', flexDirection:'column', gap:10, marginTop:16 }}>
              {SECTIONS.map(({ key }) => {
                const sn = getSectionNote(debrief.section_notes, key);
                if (!sn || (!sn.strength && !sn.weakness && !sn.improvement)) return null;
                return (
                  <div key={`${key}_notes`} style={{ border:'1px solid var(--border)', borderRadius:10, padding:'9px 10px', background:'var(--card-soft)' }}>
                    <p style={{ margin:'0 0 6px', fontSize:11, fontWeight:700, color:DS.textMuted, textTransform:'uppercase', letterSpacing:'.04em' }}>
                      {key.replace('_', ' ')}
                    </p>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:8 }}>
                      {sn.strength    && <div style={{fontSize:11,padding:'6px 8px',borderRadius:8,background:'var(--positive-bg)',border:'1px solid rgba(74,222,128,.42)',color:'var(--positive-txt)'}}>👍 {sn.strength}</div>}
                      {sn.weakness    && <div style={{fontSize:11,padding:'6px 8px',borderRadius:8,background:'var(--danger-bg)',border:'1px solid rgba(252,165,165,.42)',color:'var(--danger-txt)'}}>👎 {sn.weakness}</div>}
                      {sn.improvement && <div style={{fontSize:11,padding:'6px 8px',borderRadius:8,background:'var(--warning-bg)',border:'1px solid rgba(252,211,77,.42)',color:'var(--warning-txt)'}}>📈 {sn.improvement}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {(debrief.strengths||debrief.improvements||debrief.notes) && (
        <div style={{ display:'grid', gridTemplateColumns:mob?'1fr':'repeat(3,1fr)', gap:12 }}>
          {debrief.strengths    && <Card style={{padding:16}}><h3 style={{fontSize:13,fontWeight:600,color:'var(--positive-txt)',marginBottom:8}}>Points forts</h3><p style={{fontSize:13,color:'var(--txt2,#B09080)',whiteSpace:'pre-wrap',margin:0}}>{debrief.strengths}</p></Card>}
          {debrief.improvements && <Card style={{padding:16}}><h3 style={{fontSize:13,fontWeight:600,color:'var(--warning-txt)',marginBottom:8}}>Axes d'amélioration</h3><p style={{fontSize:13,color:'var(--txt2,#B09080)',whiteSpace:'pre-wrap',margin:0}}>{debrief.improvements}</p></Card>}
          {debrief.notes        && <Card style={{padding:16}}><h3 style={{fontSize:13,fontWeight:600,color:'var(--txt,#4A3428)',marginBottom:8}}>Notes</h3><p style={{fontSize:13,color:'var(--txt2,#B09080)',whiteSpace:'pre-wrap',margin:0}}>{debrief.notes}</p></Card>}
        </div>
      )}

      {/* AI Analysis */}
      <AIAnalysisCard debrief={debrief} allDebriefs={allDebriefs} autoTrigger={autoAI} toast={toast}/>

      {/* Comments */}
      <CommentsSection debriefId={debrief.id} user={user} toast={toast}/>

      {previewOpen && (
        <div
          style={{
            position:'fixed',
            inset:0,
            zIndex:9500,
            background:'rgba(20, 25, 32, .5)',
            display:'flex',
            alignItems:'center',
            justifyContent:'center',
            padding:mob ? 8 : 20,
          }}
          onClick={e => e.target === e.currentTarget && !downloadingPreview && setPreviewOpen(false)}
        >
          <div
            style={{
              width:'100%',
              maxWidth:mob ? '100%' : 1180,
              height:mob ? '94vh' : '92vh',
              background:'var(--glass-bg)',
              borderRadius:14,
              border:'1px solid var(--border)',
              boxShadow:'var(--sh-card)',
              display:'flex',
              flexDirection:'column',
              overflow:'hidden',
            }}
          >
            <div style={{ padding:'10px 12px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, flexWrap:'wrap' }}>
              <div>
                <p style={{ margin:0, fontSize:14, fontWeight:700, color:'var(--txt,#4A3428)' }}>Prévisualisation export PDF</p>
                <p style={{ margin:'2px 0 0', fontSize:12, color:DS.textMuted }}>Vérifie le rendu, puis télécharge.</p>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <Btn variant="secondary" onClick={()=>setPreviewOpen(false)} disabled={downloadingPreview} style={{ fontSize:12, padding:'7px 12px' }}>
                  Fermer
                </Btn>
                <Btn onClick={handleDownloadFromPreview} disabled={downloadingPreview || !previewPayload} style={{ fontSize:12, padding:'7px 12px' }}>
                  {downloadingPreview ? 'Téléchargement...' : '⬇️ Télécharger le PDF'}
                </Btn>
              </div>
            </div>

            <div style={{ flex:1, background:'var(--bg)' }}>
              {previewHtml ? (
                <iframe
                  title="Prévisualisation PDF Debrief"
                  srcDoc={previewHtml}
                  style={{ width:'100%', height:'100%', border:'none' }}
                />
              ) : (
                <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:DS.textMuted, gap:10 }}>
                  <Spinner size={22}/>
                  <span>Chargement de la prévisualisation...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export { Detail };
