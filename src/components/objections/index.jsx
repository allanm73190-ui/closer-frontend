import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../../config/api';
import { DS, P, P2, TXT, TXT2, TXT3, R_SM, R_MD, R_LG, R_FULL, WHITE, SH_CARD, SH_SM, SH_BTN, SH_IN, card, cardSm, inp } from '../../styles/designSystem';
import { useIsMobile } from '../../hooks';
import { fmtDate, copy } from '../../utils/scoring';
import { Btn, Card, Spinner, Empty } from '../ui';

const OBJECTION_META = {
  budget:    { icon: '💰', color: '#c05040', bg: 'rgba(253,232,228,.8)',  border: 'rgba(192,80,64,.3)' },
  reflechir: { icon: '🤔', color: '#c07830', bg: 'rgba(254,243,224,.8)',  border: 'rgba(192,120,48,.3)' },
  conjoint:  { icon: '👥', color: '#6366f1', bg: 'rgba(237,233,254,.85)', border: 'rgba(99,102,241,.3)' },
  methode:   { icon: '❓', color: '#3a7a9a', bg: 'rgba(218,237,245,.8)',  border: 'rgba(58,122,154,.3)' },
};

function rateColor(rate) {
  if (rate >= 60) return { color: '#5a9858', bg: 'rgba(218,240,216,.8)', border: 'rgba(90,152,88,.3)' };
  if (rate >= 35) return { color: '#c07830', bg: 'rgba(254,243,224,.8)', border: 'rgba(192,120,48,.3)' };
  return { color: '#c05040', bg: 'rgba(253,232,228,.8)', border: 'rgba(192,80,64,.3)' };
}

function ObjectionCard({ objection, toast }) {
  const [expanded, setExpanded] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);
  const mob = useIsMobile();
  const meta = OBJECTION_META[objection.type] || { icon: '💬', color: TXT2, bg: 'rgba(245,237,230,.6)', border: 'rgba(176,144,128,.3)' };
  const rc = rateColor(objection.closingRate);
  const best = objection.bestResponses?.[0];

  const generateVariant = async () => {
    setAiLoading(true);
    try {
      const prompt = `Tu es un expert en closing commercial. Génère UNE réponse alternative et efficace pour cette objection de vente :

Objection : "${objection.label}"
Catégorie : ${objection.type}
Taux de closing actuel : ${objection.closingRate}%
Nombre de fois rencontrée : ${objection.count}

${best ? `Meilleure réponse connue (${objection.closingRate}% de closing) : "${best.notes || best.section_notes_closing?.improvement || 'Non documentée'}"` : ''}

Génère une réponse alternative qui :
1. Utilise une approche différente de la meilleure réponse connue
2. Inclut une question ouverte pour engager le prospect
3. Réancre la douleur identifiée en découverte
4. Est prête à l'emploi (verbatim)

Format : Donne UNIQUEMENT le script de réponse, sans explication. Max 3 phrases.`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 500,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      if (!response.ok) throw new Error('Erreur API');
      const data = await response.json();
      const text = data.content?.map(b => b.text || '').join('\n') || '';
      setAiResponse(text);
      toast('Variante IA générée !');
    } catch (e) {
      toast(e.message || 'Erreur IA', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div style={{ ...card(), overflow: 'hidden', transition: 'box-shadow .2s' }}>
      {/* Header */}
      <div
        onClick={() => setExpanded(v => !v)}
        style={{
          padding: '16px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: expanded ? `linear-gradient(135deg,${P},${P2})` : 'rgba(255,248,244,.5)',
          borderBottom: expanded ? 'none' : '1px solid rgba(232,125,106,.06)',
          transition: 'all .2s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, background: expanded ? 'rgba(255,255,255,.2)' : meta.bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0,
          }}>{meta.icon}</div>
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
              { label: 'Rencontrée', value: objection.count, icon: '📊' },
              { label: 'Closée', value: objection.closed, icon: '✅' },
              { label: 'Taux closing', value: `${objection.closingRate}%`, icon: '🎯' },
              { label: 'Debriefs liés', value: objection.debriefs.length, icon: '📋' },
            ].map(({ label, value, icon }) => (
              <div key={label} style={{ ...cardSm(), padding: '10px 12px', textAlign: 'center' }}>
                <p style={{ fontSize: 10, color: TXT3, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '.04em', fontWeight: 600 }}>{icon} {label}</p>
                <p style={{ fontSize: 18, fontWeight: 700, color: P, margin: 0 }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Best response */}
          {best && (
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#5a9858', textTransform: 'uppercase', letterSpacing: '.04em', margin: '0 0 8px' }}>
                ✅ Meilleure réponse ({objection.closed} closing{objection.closed > 1 ? 's' : ''})
              </p>
              <div style={{
                background: 'rgba(218,240,216,.3)', border: '1px solid rgba(90,152,88,.2)', borderRadius: R_MD,
                padding: '14px 16px', borderLeft: '3px solid #5a9858',
              }}>
                <p style={{ fontSize: 14, color: TXT, margin: 0, lineHeight: 1.65, fontStyle: 'italic' }}>
                  "{best.notes || best.section_notes_closing?.improvement || best.section_notes_closing?.strength || 'Réponse non documentée — pensez à remplir les notes dans vos debriefs !'}"
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                  <span style={{ fontSize: 12, color: TXT3 }}>Par {best.user_name} — {fmtDate(best.call_date)} — {best.prospect_name}</span>
                  <span style={{ background: 'rgba(218,240,216,.6)', color: '#5a9858', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>{Math.round(best.percentage || 0)}%</span>
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
                {objection.bestResponses.slice(1, 4).map((d, i) => (
                  <div key={d.id} style={{ ...cardSm(), padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, color: TXT, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {d.prospect_name} — {fmtDate(d.call_date)}
                      </p>
                      <p style={{ fontSize: 12, color: TXT3, margin: 0 }}>{d.user_name}</p>
                    </div>
                    <span style={{ background: 'rgba(218,240,216,.6)', color: '#5a9858', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{Math.round(d.percentage || 0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Variant */}
          <div style={{ borderTop: '1px solid rgba(232,125,106,.08)', paddingTop: 14 }}>
            {aiResponse ? (
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: P, textTransform: 'uppercase', letterSpacing: '.04em', margin: '0 0 8px' }}>
                  🤖 Variante IA
                </p>
                <div style={{
                  background: 'linear-gradient(135deg,rgba(253,232,228,.3),rgba(218,237,245,.2))', border: '1px solid rgba(232,125,106,.15)', borderRadius: R_MD,
                  padding: '14px 16px', borderLeft: `3px solid ${P}`,
                }}>
                  <p style={{ fontSize: 14, color: TXT, margin: 0, lineHeight: 1.65 }}>{aiResponse}</p>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <Btn variant="secondary" onClick={() => { copy(aiResponse); toast('Copié !'); }} style={{ fontSize: 12, padding: '6px 14px' }}>📋 Copier</Btn>
                  <Btn variant="secondary" onClick={generateVariant} disabled={aiLoading} style={{ fontSize: 12, padding: '6px 14px' }}>🔄 Autre variante</Btn>
                </div>
              </div>
            ) : (
              <Btn onClick={generateVariant} disabled={aiLoading} style={{ fontSize: 13 }}>
                {aiLoading ? '⏳ Génération...' : '🤖 Générer une variante IA'}
              </Btn>
            )}
          </div>

          {/* Worst cases (if any) */}
          {objection.worstCases.length > 0 && (
            <div style={{ marginTop: 14, borderTop: '1px solid rgba(232,125,106,.08)', paddingTop: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#c05040', textTransform: 'uppercase', letterSpacing: '.04em', margin: '0 0 8px' }}>
                ⚠️ Appels non closés avec cette objection
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {objection.worstCases.map(d => (
                  <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', fontSize: 12 }}>
                    <span style={{ color: TXT2 }}>{d.prospect_name} — {d.user_name} — {fmtDate(d.call_date)}</span>
                    <span style={{ color: '#c05040', fontWeight: 600 }}>{Math.round(d.percentage || 0)}%</span>
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: TXT, margin: 0 }}>📚 Objection Library</h1>
          <p style={{ color: TXT2, fontSize: 14, marginTop: 4 }}>Les meilleures réponses aux objections de votre équipe</p>
        </div>
        <Empty
          icon="💬"
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
      label: (OBJECTION_META[o.type]?.icon || '💬') + ' ' + o.label,
      count: o.count,
    })),
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: TXT, margin: 0 }}>📚 Objection Library</h1>
          <p style={{ color: TXT2, fontSize: 14, marginTop: 4 }}>
            {data.totalWithObjections} debriefs avec objections sur {data.total} total
          </p>
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: mob ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: mob ? 10 : 12 }}>
        {[
          { label: 'Objections', value: data.objections.reduce((s, o) => s + o.count, 0), icon: '💬', bg: 'rgba(253,232,228,.6)', c: P },
          { label: 'Types', value: data.objections.length, icon: '📊', bg: 'rgba(218,237,245,.6)', c: '#3a7a9a' },
          { label: 'Taux closing moy.', value: `${data.objections.length > 0 ? Math.round(data.objections.reduce((s, o) => s + o.closingRate, 0) / data.objections.length) : 0}%`, icon: '🎯', bg: 'rgba(218,240,216,.6)', c: '#5a9858' },
          { label: 'Plus fréquente', value: data.objections[0]?.label || '—', icon: '🔥', bg: 'rgba(254,243,224,.6)', c: '#c07830' },
        ].map(({ label, value, icon, bg, c }) => (
          <Card key={label} style={{ padding: mob ? '12px 14px' : '16px 20px', display: 'flex', alignItems: 'center', gap: mob ? 10 : 14 }}>
            <div style={{ width: mob ? 36 : 44, height: mob ? 36 : 44, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: mob ? 16 : 20, flexShrink: 0 }}>{icon}</div>
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
            border: filter === key ? 'none' : '1px solid rgba(232,125,106,.15)',
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
