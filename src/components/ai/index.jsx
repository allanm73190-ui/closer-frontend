import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DS, P, P2, TXT, TXT3, R_SM, R_MD, R_FULL, SH_SM, card, inp } from '../../styles/designSystem';
import { fmtDate, copy } from '../../utils/scoring';
import { apiFetch } from '../../config/api';
import { fetchAIAnalysis } from '../../config/ai';
import { Card, Btn, Spinner, Textarea } from '../ui';

function AIAnalysisCard({ debrief, allDebriefs, autoTrigger, toast }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading]   = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const triggered = useRef(false);

  // Try to load cached analysis
  useEffect(() => {
    if (!debrief?.id) return;
    try {
      const cached = localStorage.getItem(`cd_ai_${debrief.id}`);
      if (cached) setAnalysis(cached);
    } catch {}
  }, [debrief?.id]);

  const generate = useCallback(async () => {
    if (!debrief?.id || loading) return;
    setLoading(true);
    setCollapsed(false);
    try {
      const result = await fetchAIAnalysis(debrief.id);
      setAnalysis(result);
      try { localStorage.setItem(`cd_ai_${debrief.id}`, result); } catch {}
      toast('Analyse IA générée !');
    } catch (e) {
      toast(e.message || "Erreur lors de l'analyse IA", 'error');
    } finally {
      setLoading(false);
    }
  }, [debrief?.id, loading, toast]);

  // Auto-trigger on mount if requested
  useEffect(() => {
    if (autoTrigger && !triggered.current && !analysis && debrief?.id) {
      triggered.current = true;
      generate();
    }
  }, [autoTrigger, analysis, debrief?.id, generate]);

  if (!debrief) return null;

  // Simple markdown-like renderer
  const renderMarkdown = (text) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={i} style={{ height: 8 }}/>;
      if (trimmed.startsWith('## ')) return <h2 key={i} style={{ fontSize: 18, fontWeight: 700, color: '#5a4a3a', margin: '20px 0 12px', borderBottom: '2px solid rgba(232,125,106,.2)', paddingBottom: 8 }}>{trimmed.slice(3)}</h2>;
      if (trimmed.startsWith('### ')) return <h3 key={i} style={{ fontSize: 15, fontWeight: 700, color: '#e87d6a', margin: '16px 0 8px' }}>{trimmed.slice(4)}</h3>;
      if (trimmed.startsWith('**') && trimmed.endsWith('**')) return <p key={i} style={{ fontWeight: 700, fontSize: 14, color: '#5a4a3a', margin: '12px 0 6px', background: 'rgba(253,232,228,.3)', padding: '10px 14px', borderRadius: 8, borderLeft: '3px solid #e87d6a' }}>{trimmed.slice(2, -2)}</p>;
      if (trimmed.startsWith('- ')) return <div key={i} style={{ display: 'flex', gap: 8, padding: '3px 0', fontSize: 13, color: '#5a4a3a', lineHeight: 1.6 }}><span style={{ color: '#e87d6a', flexShrink: 0, marginTop: 2 }}>•</span><span>{renderBold(trimmed.slice(2))}</span></div>;
      return <p key={i} style={{ fontSize: 13, color: '#5a4a3a', lineHeight: 1.6, margin: '4px 0' }}>{renderBold(trimmed)}</p>;
    });
  };

  const renderBold = (text) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} style={{ fontWeight: 700, color: '#d4604e' }}>{part.slice(2, -2)}</strong>;
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <Card style={{ overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(232,125,106,.08)', background: 'linear-gradient(135deg,rgba(253,232,228,.5),rgba(218,237,245,.3))', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#e87d6a,#d4604e)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🤖</div>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#5a4a3a', margin: 0 }}>Analyse IA</h3>
            <p style={{ fontSize: 11, color: DS.textMuted, margin: 0 }}>CloserDebrief AI</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {analysis && (
            <button onClick={() => setCollapsed(v => !v)} style={{ background: 'none', border: 'none', color: DS.textMuted, cursor: 'pointer', fontSize: 14, padding: '4px 8px' }}>
              {collapsed ? '▼' : '▲'}
            </button>
          )}
          <Btn onClick={generate} disabled={loading} style={{ fontSize: 12, padding: '7px 14px' }}>
            {loading ? '⏳ Analyse en cours...' : analysis ? '🔄 Relancer' : '🤖 Analyser'}
          </Btn>
        </div>
      </div>

      {loading && (
        <div style={{ padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <Spinner size={28}/>
          <p style={{ fontSize: 13, color: DS.textMuted, margin: 0, textAlign: 'center' }}>L'IA analyse votre debrief...<br/>Cela peut prendre quelques secondes.</p>
        </div>
      )}

      {analysis && !loading && !collapsed && (
        <div style={{ padding: '16px 20px', maxHeight: 600, overflowY: 'auto' }}>
          {renderMarkdown(analysis)}
          <div style={{ display: 'flex', gap: 8, marginTop: 16, paddingTop: 12, borderTop: '1px solid rgba(232,125,106,.1)' }}>
            <Btn variant="secondary" onClick={() => { copy(analysis); toast('Analyse copiée !'); }} style={{ fontSize: 12, padding: '6px 12px' }}>📋 Copier</Btn>
            <Btn variant="secondary" onClick={generate} disabled={loading} style={{ fontSize: 12, padding: '6px 12px' }}>🔄 Régénérer</Btn>
          </div>
        </div>
      )}

      {!analysis && !loading && (
        <div style={{ padding: '32px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: 36, margin: '0 0 10px' }}>🤖</p>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#5a4a3a', margin: '0 0 6px' }}>Analyse IA disponible</p>
          <p style={{ fontSize: 13, color: DS.textMuted, margin: '0 0 16px' }}>Obtenez un coaching personnalisé basé sur ce debrief</p>
          <Btn onClick={generate} style={{ fontSize: 13 }}>🤖 Lancer l'analyse</Btn>
        </div>
      )}
    </Card>
  );
}

function CommentsSection({ debriefId, user, toast }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [text, setText]         = useState('');
  const [sending, setSending]   = useState(false);

  useEffect(() => {
    apiFetch(`/debriefs/${debriefId}/comments`)
      .then(setComments).catch(()=>{}).finally(()=>setLoading(false));
  }, [debriefId]);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      const c = await apiFetch(`/debriefs/${debriefId}/comments`, { method:'POST', body:{ content:text.trim() }});
      setComments(prev => [...prev, c]);
      setText('');
    } catch(e) { toast(e.message, 'error'); } finally { setSending(false); }
  };

  const del = async (id) => {
    try {
      await apiFetch(`/comments/${id}`, { method:'DELETE' });
      setComments(prev => prev.filter(c => c.id!==id));
    } catch(e) { toast(e.message, 'error'); }
  };

  return (
    <Card style={{ overflow:'hidden' }}>
      <div style={{ padding:'14px 16px', borderBottom:'1px solid rgba(232,125,106,.08)', background:'rgba(255,245,242,.5)' }}>
        <h3 style={{ fontSize:14, fontWeight:700, color:'#5a4a3a', margin:0 }}>
          💬 Commentaires
          {comments.length > 0 && <span style={{ marginLeft:8, background:'rgba(255,245,242,.85)', color:'#5a4a3a', fontSize:11, fontWeight:600, padding:'2px 7px', borderRadius:10 }}>{comments.length}</span>}
        </h3>
      </div>
      <div style={{ padding:16, display:'flex', flexDirection:'column', gap:12 }}>
        {loading ? <Spinner size={24}/> : comments.length === 0 ? (
          <p style={{ color:DS.textMuted, fontSize:13, textAlign:'center', padding:'8px 0' }}>Aucun commentaire</p>
        ) : comments.map(c => (
          <div key={c.id} style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
            <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,#e87d6a,#d4604e)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:12, color:'white', flexShrink:0 }}>{c.author_name?.charAt(0)}</div>
            <div style={{ flex:1, background:'rgba(253,232,228,.2)', borderRadius:'0 10px 10px 10px', padding:'10px 14px', border:'1px solid rgba(232,125,106,.12)' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ fontWeight:600, fontSize:12, color:'#5a4a3a' }}>{c.author_name}</span>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:11, color:DS.textMuted }}>{fmtDate(c.created_at)}</span>
                  {(c.author_id === user.id || user.role === 'head_of_sales') && (
                    <button onClick={()=>del(c.id)} style={{ background:'none', border:'none', color:'#dc2626', cursor:'pointer', fontSize:12, padding:0 }}>✕</button>
                  )}
                </div>
              </div>
              <p style={{ fontSize:13, color:'#5a4a3a', margin:0, whiteSpace:'pre-wrap', lineHeight:1.5 }}>{c.content}</p>
            </div>
          </div>
        ))}

        {/* Input */}
        <div style={{ display:'flex', gap:10, alignItems:'flex-end', marginTop:4 }}>
          <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,#e87d6a,#d4604e)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:12, color:'white', flexShrink:0 }}>{user.name?.charAt(0)}</div>
          <div style={{ flex:1 }}>
            <Textarea placeholder="Ajouter un commentaire..." rows={2} value={text} onChange={e=>setText(e.target.value)}/>
          </div>
          <Btn onClick={send} disabled={sending||!text.trim()} style={{ padding:'10px 16px', fontSize:13, alignSelf:'flex-end' }}>{sending?'...':'Envoyer'}</Btn>
        </div>
      </div>
    </Card>
  );
}

// ─── PIPELINE PAGE ────────────────────────────────────────────────────────────
const PIPELINE_STAGES = [
  { key:'prospect',     label:'Prospects',    color:'#6b7280', bg:'#f1f5f9',  icon:'👤' },
  { key:'premier_appel',label:'1er appel',    color:'#e87d6a', bg:'rgba(253,232,228,.6)',  icon:'📞' },
  { key:'relance',      label:'Relance',      color:'#d97706', bg:'#fef3c7',  icon:'🔄' },
  { key:'negociation',  label:'Négociation',  color:'#e87d6a', bg:'rgba(255,248,245,.8)',  icon:'🤝' },
  { key:'signe',        label:'Signés ✓',     color:'#059669', bg:'#d1fae5',  icon:'✅' },
  { key:'perdu',        label:'Perdus',       color:'#dc2626', bg:'#fee2e2',  icon:'❌' },
];

export { AIAnalysisCard, CommentsSection };
