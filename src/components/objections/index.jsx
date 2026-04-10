import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../config/api';
import { DS, P, P2, TXT, TXT2, TXT3, R_SM, R_MD, R_LG, R_FULL, WHITE, SH_CARD, SH_SM, SH_BTN, SH_IN, card, cardSm } from '../../styles/designSystem';
import { useIsMobile } from '../../hooks';
import { fmtDate, copy } from '../../utils/scoring';
import { Btn, Card, Spinner, Empty, Icon } from '../ui';

const G = (extra = {}) => ({ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 12, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', ...extra });

const OBJECTION_META = {
  budget:    { icon: 'euro', color: '#DC2626', bg: 'rgba(255,126,95,.12)',  border: 'rgba(192,80,64,.3)' },
  reflechir: { icon: 'help', color: '#D97706', bg: 'rgba(254,243,224,.8)',  border: 'rgba(192,120,48,.3)' },
  conjoint:  { icon: 'users', color: '#6366f1', bg: 'rgba(237,233,254,.85)', border: 'rgba(99,102,241,.3)' },
  methode:   { icon: 'message-square-warning', color: '#7C3AED', bg: 'rgba(124,58,237,.12)',  border: 'rgba(58,122,154,.3)' },
};

function rateColor(rate) {
  if (rate >= 60) return { color: '#059669', bg: 'rgba(218,240,216,.8)', border: 'rgba(90,152,88,.3)' };
  if (rate >= 35) return { color: '#D97706', bg: 'rgba(254,243,224,.8)', border: 'rgba(192,120,48,.3)' };
  return { color: '#DC2626', bg: 'rgba(255,126,95,.12)', border: 'rgba(192,80,64,.3)' };
}

function ObjectionCard({ objection, toast }) {
  const [expanded, setExpanded] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);
  const mob = useIsMobile();
  const meta = OBJECTION_META[objection.type] || { icon: 'message-square', color: TXT2, bg: 'rgba(245,237,230,.6)', border: 'rgba(200,160,140,.3)' };
  const rc = rateColor(objection.closingRate);
  const best = objection.bestResponses?.[0];

  const generateVariant = async () => {
    setAiLoading(true);
    try {
      const best_response = best ? (best.notes || best.section_notes_closing?.improvement || null) : null;
      const data = await apiFetch('/ai/objection-variant', {
        method: 'POST',
        body: {
          objection_type:  objection.type,
          objection_label: objection.label,
          closing_rate:    objection.closingRate,
          count:           objection.count,
          best_response,
        },
      });
      setAiResponse(data.variant || '');
      toast('Variante IA générée !');
    } catch (e) {
      toast(e.message || 'Erreur IA', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div style={{ ...G(), overflow: 'hidden', transition: 'box-shadow .2s' }}>
      {/* Header */}
      <div
        onClick={() => setExpanded(v => !v)}
        style={{
          padding: '16px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: expanded ? `linear-gradient(135deg,${P},${P2})` : 'rgba(255,248,244,.5)',
          borderBottom: expanded ? 'none' : '1px solid rgba(255,126,95,.06)',
          transition: 'all .2s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, background: expanded ? 'rgba(255,255,255,.2)' : meta.bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icon name={meta.icon} size={18} color={expanded ? 'white' : meta.color} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 700, fontSize: 14, color: expanded ? 'white' : TXT, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {objection.label}
            </p>
            <p style={{ fontSize: 12, color: expanded ? 'rgba(255,255,255,.75)' : TXT3, margin: 0 }}>
              {objection.count} fois rencontrée
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <span style={{
            background: expanded ? 'rgba(255,255,255,.2)' : rc.bg, color: expanded ? 'white' : rc.color,
            border: `1px solid ${expanded ? 'rgba(255,255,255,.3)' : rc.border}`,
            padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
          }}>
            {objection.closingRate}% closing
          </span>
          <span style={{ color: expanded ? 'rgba(255,255,255,.8)' : TXT3, fontSize: 13, transition: 'transform .2s', display: 'inline-block', transform: expanded ? 'rotate(180deg)' : 'none' }}>▾</span>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ padding: '18px 18px 16px' }}>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: mob ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: 8, marginBottom: 16 }}>
            {[
              { label: 'Rencontrée', value: objection.count, icon: 'bar-chart-2' },
              { label: 'Closée', value: objection.closed, icon: 'check-circle' },
              { label: 'Taux closing', value: `${objection.closingRate}%`, icon: 'target' },
              { label: 'Debriefs liés', value: objection.debriefs.length, icon: 'file-text' },
            ].map(({ label, value, icon }) => (
              <div key={label} style={{ ...cardSm(), padding: '10px 12px', textAlign: 'center' }}>
                <p style={{ fontSize: 10, color: TXT3, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '.04em', fontWeight: 600, display:'inline-flex', gap:6, alignItems:'center' }}>
                  <Icon name={icon} size={12} color={TXT3} />
                  {label}
                </p>
                <p style={{ fontSize: 18, fontWeight: 700, color: P, margin: 0 }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Best response */}
          {best && (
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '.04em', margin: '0 0 8px' }}>
                Meilleure réponse ({objection.closed} closing{objection.closed > 1 ? 's' : ''})
              </p>
              <div style={{
                background: 'rgba(218,240,216,.3)', border: '1px solid rgba(90,152,88,.2)', borderRadius: R_MD,
                padding: '14px 16px', borderLeft: '3px solid #059669',
              }}>
                <p style={{ fontSize: 14, color: TXT, margin: 0, lineHeight: 1.65, fontStyle: 'italic' }}>
                  "{best.notes || best.section_notes_closing?.improvement || best.section_notes_closing?.strength || 'Réponse non documentée — pensez à remplir les notes dans vos debriefs !'}"
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                  <span style={{ fontSize: 12, color: TXT3 }}>Par {best.user_name} — {fmtDate(best.call_date)} — {best.prospect_name}</span>
                  <span style={{ background: 'rgba(218,240,216,.6)', color: '#059669', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>{Math.round(best.percentage || 0)}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Other successful responses */}
          {objection.bestResponses.length > 1 && (
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: TXT2, textTransform: 'uppercase', letterSpacing: '.04em', margin: '0 0 8px' }}>
                Autres réponses gagnantes
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {objection.bestResponses.slice(1, 4).map(d => (
                  <div key={d.id} style={{ ...cardSm(), padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, color: TXT, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {d.prospect_name} — {fmtDate(d.call_date)}
                      </p>
                      <p style={{ fontSize: 12, color: TXT3, margin: 0 }}>{d.user_name}</p>
                    </div>
                    <span style={{ background: 'rgba(218,240,216,.6)', color: '#059669', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{Math.round(d.percentage || 0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Living objection library */}
          {Array.isArray(objection.validatedResponses) && objection.validatedResponses.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '.04em', margin: '0 0 8px' }}>
                Bibliothèque vivante (réponses validées)
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {objection.validatedResponses.slice(0, 4).map((item, idx) => (
                  <div key={`${item.text.slice(0, 32)}_${idx}`} style={{ background:'rgba(124,58,237,.12)', border:'1px solid rgba(58,122,154,.22)', borderRadius:R_MD, padding:'12px 12px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8, marginBottom:6, flexWrap:'wrap' }}>
                      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                        <span style={{ padding:'2px 7px', borderRadius:999, fontSize:10, fontWeight:700, background:item.validated ? 'rgba(218,240,216,.8)' : 'rgba(254,243,224,.9)', color:item.validated ? '#059669' : '#D97706' }}>
                          {item.validated ? 'Validée' : 'À confirmer'}
                        </span>
                        <span style={{ padding:'2px 7px', borderRadius:999, fontSize:10, fontWeight:700, background:'rgba(255,255,255,.85)', color:'#7C3AED' }}>
                          {item.closeRate}% closing
                        </span>
                        <span style={{ padding:'2px 7px', borderRadius:999, fontSize:10, fontWeight:700, background:'rgba(255,255,255,.85)', color:'#7C3AED' }}>
                          {item.uses} usage{item.uses > 1 ? 's' : ''}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => { copy(item.text); toast('Réponse copiée'); }}
                        style={{ border:'none', background:'var(--glass-bg)', borderRadius:8, padding:'4px 8px', fontSize:11, cursor:'pointer', color:'#7C3AED', fontWeight:700 }}
                      >
                        Copier
                      </button>
                    </div>
                    <p style={{ margin:0, fontSize:13, color:TXT, lineHeight:1.55 }}>
                      "{item.text}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Variant */}
          <div style={{ borderTop: '1px solid rgba(255,126,95,.08)', paddingTop: 14 }}>
            {aiResponse ? (
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: P, textTransform: 'uppercase', letterSpacing: '.04em', margin: '0 0 8px' }}>
                  Variante IA
                </p>
                <div style={{
                  background: 'linear-gradient(135deg,rgba(255,126,95,.14),rgba(124,58,237,.1))', border: '1px solid rgba(255,126,95,.15)', borderRadius: R_MD,
                  padding: '14px 16px', borderLeft: `3px solid ${P}`,
                }}>
                  <p style={{ fontSize: 14, color: TXT, margin: 0, lineHeight: 1.65 }}>{aiResponse}</p>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <Btn variant="secondary" onClick={() => { copy(aiResponse); toast('Copié !'); }} style={{ fontSize: 12, padding: '6px 14px', display:'inline-flex', alignItems:'center', gap:6 }}>
                    <Icon name="copy" size={12} />
                    Copier
                  </Btn>
                  <Btn variant="secondary" onClick={generateVariant} disabled={aiLoading} style={{ fontSize: 12, padding: '6px 14px', display:'inline-flex', alignItems:'center', gap:6 }}>
                    <Icon name="route" size={12} />
                    Autre variante
                  </Btn>
                </div>
              </div>
            ) : (
              <Btn onClick={generateVariant} disabled={aiLoading} style={{ fontSize: 13 }}>
                {aiLoading ? 'Génération...' : 'Générer une variante IA'}
              </Btn>
            )}
          </div>

          {/* Worst cases (if any) */}
          {objection.worstCases.length > 0 && (
            <div style={{ marginTop: 14, borderTop: '1px solid rgba(255,126,95,.08)', paddingTop: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '.04em', margin: '0 0 8px' }}>
                Appels non closés avec cette objection
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {objection.worstCases.map(d => (
                  <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', fontSize: 12 }}>
                    <span style={{ color: TXT2 }}>{d.prospect_name} — {d.user_name} — {fmtDate(d.call_date)}</span>
                    <span style={{ color: '#DC2626', fontWeight: 600 }}>{Math.round(d.percentage || 0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ObjectionLibrary({ toast }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const mob = useIsMobile();

  useEffect(() => {
    apiFetch('/objections')
      .then(setData)
      .catch(e => toast(e.message, 'error'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner full />;

  if (!data || data.objections.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: TXT, margin: 0 }}>Objection Library</h1>
          <p style={{ color: TXT2, fontSize: 14, marginTop: 4 }}>Les meilleures réponses aux objections de votre équipe</p>
        </div>
        <Empty
          icon={<Icon name="message-square" size={36} color="var(--txt3)" />}
          title="Aucune objection collectée"
          subtitle="Les objections s'ajoutent automatiquement à chaque debrief. Créez votre premier debrief pour commencer !"
        />
      </div>
    );
  }

  const filtered = filter === 'all' ? data.objections : data.objections.filter(o => o.type === filter);
  const categories = [
    { key: 'all', label: 'Toutes', count: data.objections.reduce((s, o) => s + o.count, 0) },
    ...data.objections.map(o => ({
      key: o.type,
      label: o.label,
      count: o.count,
    })),
  ];

  return (
    <div className="cd-page-flow" style={{ gap: 16 }}>
      {/* Header */}
      <Card className="cd-hero-card" style={{ padding:16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p className="cd-hero-kicker">Objections</p>
            <h1 className="cd-hero-title" style={{ fontSize: 24 }}>Bibliothèque d'objections</h1>
            <p className="cd-hero-subtitle">{data.totalWithObjections} debriefs avec objections</p>
          </div>
        </div>
      </Card>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: mob ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: mob ? 10 : 12 }}>
        {[
          { label: 'Objections', value: data.objections.reduce((s, o) => s + o.count, 0), icon: 'message-square', bg: 'rgba(255,126,95,.14)', c: P },
          { label: 'Types', value: data.objections.length, icon: 'bar-chart-2', bg: 'rgba(124,58,237,.12)', c: '#7C3AED' },
          { label: 'Taux closing moy.', value: `${data.objections.length > 0 ? Math.round(data.objections.reduce((s, o) => s + o.closingRate, 0) / data.objections.length) : 0}%`, icon: 'target', bg: 'rgba(218,240,216,.6)', c: '#059669' },
          { label: 'Plus fréquente', value: data.objections[0]?.label || '—', icon: 'trending-up', bg: 'rgba(254,243,224,.6)', c: '#D97706' },
        ].map(({ label, value, icon, bg, c }) => (
          <Card key={label} style={{ padding: mob ? '12px 14px' : '16px 20px', display: 'flex', alignItems: 'center', gap: mob ? 10 : 14, background:'linear-gradient(145deg, rgba(255,255,255,.95), rgba(249,239,233,.74))' }}>
            <div style={{ width: mob ? 36 : 44, height: mob ? 36 : 44, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name={icon} size={mob ? 16 : 20} color={c} />
            </div>
            <div>
              <p style={{ fontSize: 10, color: TXT3, margin: 0, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</p>
              <p style={{ fontSize: typeof value === 'string' && value.length > 6 ? 14 : (mob ? 18 : 22), fontWeight: 700, color: c, margin: 0 }}>{value}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {categories.map(({ key, label, count }) => (
          <button key={key} onClick={() => setFilter(key)} style={{
            padding: '7px 14px', borderRadius: 20, fontSize: 13, fontWeight: filter === key ? 700 : 500,
            cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
            background: filter === key ? `linear-gradient(135deg,${P},${P2})` : WHITE,
            color: filter === key ? 'white' : TXT2,
            border: filter === key ? 'none' : '1px solid rgba(255,126,95,.15)',
            boxShadow: filter === key ? SH_BTN : SH_SM,
          }}>
            {label} ({count})
          </button>
        ))}
      </div>

      {/* Objection cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.map(obj => (
          <ObjectionCard key={obj.type} objection={obj} toast={toast} />
        ))}
      </div>
    </div>
  );
}
