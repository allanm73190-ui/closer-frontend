import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DS, P, P2, TXT, TXT3, R_SM, R_MD, R_FULL, SH_SM, card, inp } from '../../styles/designSystem';
import { fmtDate, copy } from '../../utils/scoring';
import { apiFetch } from '../../config/api';
import { fetchAIAnalysis } from '../../config/ai';
import { Card, Btn, Spinner, Textarea } from '../ui';

const G = (extra = {}) => ({
  background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
  borderRadius: 12, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', ...extra,
});

function AIAnalysisCard({ debrief, allDebriefs, autoTrigger, toast }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const triggered = useRef(false);

  useEffect(() => {
    if (!debrief?.id) return;
    try { const cached = localStorage.getItem(`cd_ai_${debrief.id}`); if (cached) setAnalysis(cached); } catch {}
  }, [debrief?.id]);

  const generate = useCallback(async () => {
    if (!debrief?.id || loading) return;
    setLoading(true); setCollapsed(false);
    try {
      const result = await fetchAIAnalysis(debrief.id);
      setAnalysis(result);
      try { localStorage.setItem(`cd_ai_${debrief.id}`, result); } catch {}
      toast('Analyse IA générée !');
    } catch (e) { toast(e.message || "Erreur lors de l'analyse IA", 'error'); }
    finally { setLoading(false); }
  }, [debrief?.id, loading, toast]);

  useEffect(() => {
    if (autoTrigger && !triggered.current && !analysis && debrief?.id) { triggered.current = true; generate(); }
  }, [autoTrigger, analysis, debrief?.id, generate]);

  if (!debrief) return null;

  const renderBold = (text) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} style={{ fontWeight: 700, color: P }}>{part.slice(2, -2)}</strong>;
      return <span key={i} style={{ color: 'var(--txt)' }}>{part}</span>;
    });
  };

  const renderMarkdown = (text) => {
    return text.split('\n').map((line, i) => {
      const t = line.trim();
      if (!t) return <div key={i} style={{ height: 8 }} />;
      if (t.startsWith('## ')) return <h2 key={i} style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt)', margin: '18px 0 10px', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>{t.slice(3)}</h2>;
      if (t.startsWith('### ')) return <h3 key={i} style={{ fontSize: 14, fontWeight: 700, color: P, margin: '14px 0 6px' }}>{t.slice(4)}</h3>;
      if (t.startsWith('**') && t.endsWith('**')) return <p key={i} style={{ fontWeight: 700, fontSize: 13, color: 'var(--txt)', margin: '10px 0 6px', background: 'var(--surface-accent)', padding: '10px 14px', borderRadius: 8, borderLeft: `3px solid ${P}` }}>{t.slice(2, -2)}</p>;
      if (t.startsWith('- ')) return <div key={i} style={{ display: 'flex', gap: 8, padding: '3px 0', fontSize: 13, color: 'var(--txt)', lineHeight: 1.6 }}><span style={{ color: P, flexShrink: 0, marginTop: 2 }}>{'•'}</span><span>{renderBold(t.slice(2))}</span></div>;
      return <p key={i} style={{ fontSize: 13, color: 'var(--txt)', lineHeight: 1.6, margin: '4px 0' }}>{renderBold(t)}</p>;
    });
  };

  return (
    <div style={{ ...G({ overflow: 'hidden' }) }}>
      {/* Header with violet accent */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', background: 'var(--accent-violet-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'white' }}>A</div>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)', margin: 0 }}>Analyse IA</h3>
            <p style={{ fontSize: 11, color: 'var(--txt3)', margin: 0 }}>CloserDebrief AI</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {analysis && <button onClick={() => setCollapsed(v => !v)} style={{ background: 'none', border: 'none', color: 'var(--txt3)', cursor: 'pointer', fontSize: 14, padding: '4px 8px' }}>{collapsed ? '▼' : '▲'}</button>}
          <Btn onClick={generate} disabled={loading} style={{ fontSize: 12, padding: '7px 14px' }}>
            {loading ? 'Analyse en cours...' : analysis ? 'Relancer' : 'Analyser'}
          </Btn>
        </div>
      </div>

      {loading && (
        <div style={{ padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <Spinner size={28} />
          <p style={{ fontSize: 13, color: 'var(--txt3)', margin: 0, textAlign: 'center' }}>L'IA analyse votre debrief...</p>
        </div>
      )}

      {analysis && !loading && !collapsed && (
        <div style={{ padding: '16px 20px', maxHeight: 600, overflowY: 'auto' }}>
          {renderMarkdown(analysis)}
          <div style={{ display: 'flex', gap: 8, marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <Btn variant="secondary" onClick={() => { copy(analysis); toast('Analyse copiée !'); }} style={{ fontSize: 12, padding: '6px 12px' }}>Copier</Btn>
            <Btn variant="secondary" onClick={generate} disabled={loading} style={{ fontSize: 12, padding: '6px 12px' }}>Régénérer</Btn>
          </div>
        </div>
      )}

      {!analysis && !loading && (
        <div style={{ padding: '32px 20px', textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--accent-violet-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 20, color: 'var(--accent-violet)' }}>A</div>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--txt)', margin: '0 0 6px' }}>Analyse IA disponible</p>
          <p style={{ fontSize: 13, color: 'var(--txt3)', margin: '0 0 16px' }}>Coaching personnalisé basé sur ce debrief</p>
          <Btn onClick={generate} style={{ fontSize: 13 }}>Lancer l'analyse</Btn>
        </div>
      )}
    </div>
  );
}

function CommentsSection({ debriefId, user, toast }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    apiFetch(`/debriefs/${debriefId}/comments`).then(setComments).catch(() => {}).finally(() => setLoading(false));
  }, [debriefId]);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    try { const c = await apiFetch(`/debriefs/${debriefId}/comments`, { method: 'POST', body: { content: text.trim() } }); setComments(prev => [...prev, c]); setText(''); }
    catch (e) { toast(e.message, 'error'); } finally { setSending(false); }
  };

  const del = async (id) => {
    try { await apiFetch(`/comments/${id}`, { method: 'DELETE' }); setComments(prev => prev.filter(c => c.id !== id)); }
    catch (e) { toast(e.message, 'error'); }
  };

  return (
    <div style={{ ...G({ overflow: 'hidden' }) }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface-accent)' }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)', margin: 0 }}>
          Commentaires
          {comments.length > 0 && <span style={{ marginLeft: 8, background: 'var(--glass-bg)', color: 'var(--txt)', fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 10 }}>{comments.length}</span>}
        </h3>
      </div>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? <Spinner size={24} /> : comments.length === 0 ? (
          <p style={{ color: 'var(--txt3)', fontSize: 13, textAlign: 'center', padding: '8px 0' }}>Aucun commentaire</p>
        ) : comments.map(c => (
          <div key={c.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 12, color: 'white', flexShrink: 0 }}>{c.author_name?.charAt(0)}</div>
            <div style={{ flex: 1, background: 'var(--glass-bg)', borderRadius: '0 10px 10px 10px', padding: '10px 14px', border: '1px solid var(--glass-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--txt)' }}>{c.author_name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--txt3)' }}>{fmtDate(c.created_at)}</span>
                  {(c.author_id === user.id || user.role === 'head_of_sales' || user.role === 'admin') && (
                    <button onClick={() => del(c.id)} style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontSize: 12, padding: 0 }}>{'✕'}</button>
                  )}
                </div>
              </div>
              <p style={{ fontSize: 13, color: 'var(--txt)', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{c.content}</p>
            </div>
          </div>
        ))}

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginTop: 4 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 12, color: 'white', flexShrink: 0 }}>{user.name?.charAt(0)}</div>
          <div style={{ flex: 1 }}>
            <Textarea placeholder="Ajouter un commentaire..." rows={2} value={text} onChange={e => setText(e.target.value)} />
          </div>
          <Btn onClick={send} disabled={sending || !text.trim()} style={{ padding: '10px 16px', fontSize: 13, alignSelf: 'flex-end' }}>{sending ? '...' : 'Envoyer'}</Btn>
        </div>
      </div>
    </div>
  );
}

export { AIAnalysisCard, CommentsSection };
