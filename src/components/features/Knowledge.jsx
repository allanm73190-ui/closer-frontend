import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../config/api';
import { DS, cardSm } from '../../styles/designSystem';
import { useIsMobile } from '../../hooks';
import { copy, fmtDate } from '../../utils/scoring';
import { Btn, Card, Empty, Spinner } from '../ui';
import { Icon } from '../ui/Icon';

const OBJECTION_META = {
  budget: { icon:'wallet', color:'#c05040', label:'Budget' },
  reflechir: { icon:'brain', color:'#c07830', label:'Réfléchir' },
  conjoint: { icon:'users', color:'#6366f1', label:'Conjoint' },
  methode: { icon:'flask-conical', color:'#3a7a9a', label:'Méthode' },
};

function normalizeText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractBestResponseText(response) {
  const text = normalizeText(
    response?.notes
    || response?.section_notes_closing?.improvement
    || response?.section_notes_closing?.strength
    || response?.section_notes_closing?.weakness
  );
  return text.length >= 24 ? text : '';
}

function makeKnowledgeItems(objections) {
  const map = {};
  for (const objection of (objections || [])) {
    const meta = OBJECTION_META[objection.type] || { icon:'message-square', color:'#6b7280', label:objection.label || 'Objection' };

    for (const response of (objection.validatedResponses || [])) {
      const text = normalizeText(response.text);
      if (!text) continue;
      const key = `${objection.type}::${text.toLowerCase()}`;
      if (!map[key]) {
        map[key] = {
          id:key,
          type:objection.type,
          objectionLabel:objection.label || meta.label,
          objectionIcon:meta.icon,
          objectionColor:meta.color,
          text,
          closeRate:Number(response.closeRate || objection.closingRate || 0),
          uses:Number(response.uses || 0),
          avgScore:Number(response.avgScore || 0),
          validated:!!response.validated,
          source:'Bibliothèque validée',
          debriefId:null,
          example:null,
        };
      }
    }

    for (const best of (objection.bestResponses || []).slice(0, 3)) {
      const text = extractBestResponseText(best);
      if (!text) continue;
      const key = `${objection.type}::best::${text.toLowerCase()}`;
      if (!map[key]) {
        map[key] = {
          id:key,
          type:objection.type,
          objectionLabel:objection.label || meta.label,
          objectionIcon:meta.icon,
          objectionColor:meta.color,
          text,
          closeRate:Number(best.percentage || objection.closingRate || 0),
          uses:1,
          avgScore:Number(best.percentage || 0),
          validated:!!best.is_closed,
          source:'Meilleur debrief',
          debriefId:best.id || null,
          example:best.call_date ? `Extrait du ${fmtDate(best.call_date)}` : null,
        };
      }
    }
  }

  return Object.values(map).sort((a, b) => {
    if (b.validated !== a.validated) return (b.validated ? 1 : 0) - (a.validated ? 1 : 0);
    if (b.closeRate !== a.closeRate) return b.closeRate - a.closeRate;
    if (b.uses !== a.uses) return b.uses - a.uses;
    return b.avgScore - a.avgScore;
  });
}

const glassPanel = (extra = {}) => ({
  ...cardSm(),
  background:'var(--glass-bg)',
  border:'1px solid var(--glass-border)',
  boxShadow:'var(--sh-card)',
  backdropFilter:'blur(10px)',
  WebkitBackdropFilter:'blur(10px)',
  ...extra,
});

export function KnowledgePage({ navigate, toast }) {
  const mob = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [objections, setObjections] = useState([]);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [qualityFilter, setQualityFilter] = useState('all');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    apiFetch('/objections')
      .then(data => {
        if (!mounted) return;
        setObjections(Array.isArray(data?.objections) ? data.objections : []);
      })
      .catch(error => {
        if (!mounted) return;
        toast(error.message, 'error');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => { mounted = false; };
  }, [toast]);

  const items = useMemo(() => makeKnowledgeItems(objections), [objections]);
  const categories = useMemo(() => {
    const keys = [...new Set(items.map(item => item.type))];
    return keys.map(key => ({
      key,
      label:OBJECTION_META[key]?.label || key,
      icon:OBJECTION_META[key]?.icon || 'message-square',
      count:items.filter(item => item.type === key).length,
    }));
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return items.filter(item => {
      const matchType = typeFilter === 'all' ? true : item.type === typeFilter;
      const matchQuality = qualityFilter === 'all'
        ? true
        : qualityFilter === 'validated'
          ? item.validated
          : qualityFilter === 'impact'
            ? item.closeRate >= 60 && item.uses >= 2
            : item.source === 'Meilleur debrief';
      const matchQuery = !q
        || item.text.toLowerCase().includes(q)
        || item.objectionLabel.toLowerCase().includes(q)
        || item.source.toLowerCase().includes(q);
      return matchType && matchQuality && matchQuery;
    });
  }, [items, qualityFilter, query, typeFilter]);

  const validatedCount = items.filter(item => item.validated).length;
  const highImpactCount = items.filter(item => item.closeRate >= 60 && item.uses >= 2).length;

  if (loading) {
    return <Spinner full />;
  }

  return (
    <div className="cd-page-flow" style={{ position:'relative', gap:16, isolation:'isolate' }}>
      <div style={{ position:'absolute', top:-50, left:-30, width:190, height:190, borderRadius:'50%', background:'radial-gradient(circle, rgba(124,58,237,.14) 0%, rgba(124,58,237,0) 70%)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:40, right:-40, width:200, height:200, borderRadius:'50%', background:'radial-gradient(circle, rgba(232,125,106,.16) 0%, rgba(232,125,106,0) 70%)', pointerEvents:'none' }} />

      <Card className="cd-hero-card" style={{ ...glassPanel({ padding:mob ? '18px 15px' : '22px 22px', background:'var(--panel-1)' }) }}>
        <div style={{ display:'flex', justifyContent:'space-between', gap:10, alignItems:'flex-start', flexWrap:'wrap' }}>
          <div>
            <p className="cd-hero-kicker">Centre de connaissances</p>
            <h1 className="cd-hero-title" style={{ fontSize:mob ? 22 : 25 }}>
              Scripts réutilisables
            </h1>
            <p className="cd-hero-subtitle">
              Extraits issus des meilleurs debriefs, triés par impact réel.
            </p>
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <Btn variant="secondary" onClick={()=>navigate('Dashboard')} style={{ fontSize:12, padding:'7px 11px' }}>
              ← Dashboard
            </Btn>
            <Btn onClick={()=>navigate('NewDebrief')} style={{ fontSize:12, padding:'7px 11px' }}>
              Utiliser dans un debrief
            </Btn>
          </div>
        </div>
        <div style={{ marginTop:10, display:'flex', gap:7, flexWrap:'wrap' }}>
          <span style={{ fontSize:10, fontWeight:700, borderRadius:999, padding:'3px 8px', background:'var(--chip-bg)', color:'var(--txt,#4A3428)', border:'1px solid var(--border)' }}>
            Total: {items.length}
          </span>
          <span style={{ fontSize:10, fontWeight:700, borderRadius:999, padding:'3px 8px', background:'var(--chip-bg)', color:'var(--txt,#4A3428)', border:'1px solid var(--border)' }}>
            Validés: {validatedCount}
          </span>
          <span style={{ fontSize:10, fontWeight:700, borderRadius:999, padding:'3px 8px', background:'var(--chip-bg)', color:'var(--txt,#4A3428)', border:'1px solid var(--border)' }}>
            Haut impact: {highImpactCount}
          </span>
        </div>
      </Card>

      {items.length === 0 ? (
        <Empty
          icon={<Icon name="book-open" size={36} color="var(--txt3)" />}
          title="Aucune connaissance disponible"
          subtitle="Les snippets se construisent automatiquement avec les debriefs et objections."
          action={<Btn onClick={()=>navigate('NewDebrief')}>Créer un debrief</Btn>}
        />
      ) : (
        <>
          <div style={{ display:'grid', gridTemplateColumns:mob ? 'repeat(2,1fr)' : 'repeat(4,minmax(0,1fr))', gap:10 }}>
            {[
              { label:'Snippets totaux', value:items.length, color:'var(--txt,#4A3428)', icon:'library', bg:'linear-gradient(145deg, rgba(255,255,255,.75), rgba(255,126,95,.1))', border:'rgba(255,126,95,.2)' },
              { label:'Validés', value:validatedCount, color:'var(--positive-txt)', icon:'verified', bg:'linear-gradient(145deg, rgba(255,255,255,.75), rgba(5,150,105,.1))', border:'rgba(5,150,105,.2)' },
              { label:'Haut impact', value:highImpactCount, color:'var(--warning-txt)', icon:'bolt', bg:'linear-gradient(145deg, rgba(255,255,255,.75), rgba(217,119,6,.1))', border:'rgba(217,119,6,.2)' },
              { label:'Types', value:categories.length, color:'#3a7a9a', icon:'layers-3', bg:'linear-gradient(145deg, rgba(255,255,255,.75), rgba(106,172,206,.14))', border:'rgba(106,172,206,.22)' },
            ].map(kpi => (
              <div key={kpi.label} style={{ ...glassPanel({ padding:'12px 12px', background:kpi.bg, border:`1px solid ${kpi.border}`, minHeight:84 }) }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8 }}>
                  <p style={{ margin:'0 0 4px', fontSize:10, textTransform:'uppercase', letterSpacing:'.06em', color:DS.textMuted, fontWeight:700 }}>
                    {kpi.label}
                  </p>
                  <Icon name={kpi.icon} size={16} color="var(--txt3,#c8b8a8)" />
                </div>
                <p style={{ margin:0, fontSize:22, fontWeight:800, color:kpi.color }}>{kpi.value}</p>
              </div>
            ))}
          </div>

          <Card style={{ ...glassPanel({ padding:12 }) }}>
            <div style={{ display:'grid', gridTemplateColumns:mob ? '1fr' : 'minmax(260px,1fr) repeat(2,minmax(160px,.45fr))', gap:8 }}>
              <input
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Rechercher par objection, script ou source..."
                style={{ width:'100%', border:'1px solid var(--glass-border)', borderRadius:10, background:'var(--input-on-card)', padding:'10px 11px', fontSize:13, color:'var(--txt,#4A3428)', fontFamily:'inherit', outline:'none', boxShadow:'var(--sh-in)' }}
              />
              <select
                value={typeFilter}
                onChange={event => setTypeFilter(event.target.value)}
                style={{ width:mob ? '100%' : undefined, border:'1px solid var(--glass-border)', borderRadius:10, background:'var(--glass-bg)', padding:'10px 11px', fontSize:12, color:'var(--txt,#4A3428)', fontFamily:'inherit', boxShadow:'var(--sh-sm)' }}
              >
                <option value="all">Toutes les objections</option>
                {categories.map(category => (
                <option key={category.key} value={category.key}>
                    {category.label} ({category.count})
                </option>
              ))}
              </select>
              <select
                value={qualityFilter}
                onChange={event => setQualityFilter(event.target.value)}
                style={{ width:mob ? '100%' : undefined, border:'1px solid var(--glass-border)', borderRadius:10, background:'var(--glass-bg)', padding:'10px 11px', fontSize:12, color:'var(--txt,#4A3428)', fontFamily:'inherit', boxShadow:'var(--sh-sm)' }}
              >
                <option value="all">Qualité: toutes</option>
                <option value="validated">Validées</option>
                <option value="impact">Haut impact</option>
                <option value="fresh">Nouveaux extraits</option>
              </select>
            </div>
          </Card>

          {filtered.length === 0 ? (
            <Empty
              icon={<Icon name="search" size={36} color="var(--txt3)" />}
              title="Aucun snippet"
              subtitle="Ajustez les filtres pour voir plus de résultats."
              action={
                <Btn
                  variant="secondary"
                  onClick={() => {
                    setQuery('');
                    setTypeFilter('all');
                    setQualityFilter('all');
                  }}
                >
                  Réinitialiser les filtres
                </Btn>
              }
            />
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:mob ? '1fr' : 'repeat(2, minmax(0,1fr))', gap:10 }}>
              {filtered.map(item => (
                <Card key={item.id} style={{ ...glassPanel({ padding:'12px 12px', border:`1px solid ${item.objectionColor}30`, background:`linear-gradient(145deg, rgba(255,255,255,.76), ${item.objectionColor}12)`, minHeight:168 }) }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10 }}>
                    <div style={{ minWidth:0 }}>
                      <p style={{ margin:'0 0 4px', fontSize:12, fontWeight:700, color:item.objectionColor }}>
                        <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
                          <Icon name={item.objectionIcon || 'message-square'} size={13} color={item.objectionColor} />
                          {item.objectionLabel}
                        </span>
                      </p>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                        <span style={{ fontSize:10, fontWeight:700, borderRadius:999, padding:'2px 7px', background:item.validated ? 'var(--positive-bg)' : 'var(--warning-bg)', color:item.validated ? 'var(--positive-txt)' : 'var(--warning-txt)' }}>
                          {item.validated ? 'Validée' : 'À confirmer'}
                        </span>
                        <span style={{ fontSize:10, fontWeight:700, borderRadius:999, padding:'2px 7px', background:'var(--surface-info)', color:'#3a7a9a' }}>
                          {item.closeRate}% closing
                        </span>
                        <span style={{ fontSize:10, fontWeight:700, borderRadius:999, padding:'2px 7px', background:'var(--chip-bg)', color:'var(--txt2,#b09080)' }}>
                          {item.uses} usage{item.uses > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    <span style={{ fontSize:10, color:DS.textMuted, flexShrink:0, padding:'2px 6px', borderRadius:999, background:'var(--chip-bg)', border:'1px solid var(--border)' }}>
                      {item.source}
                    </span>
                  </div>

                  <p style={{ margin:'9px 0 8px', fontSize:13, color:'var(--txt,#4A3428)', lineHeight:1.55 }}>
                    "{item.text}"
                  </p>

                  {item.example && (
                    <p style={{ margin:'0 0 8px', fontSize:11, color:DS.textMuted }}>
                      {item.example}
                    </p>
                  )}

                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    <Btn
                      variant="secondary"
                      onClick={() => {
                        copy(item.text);
                        toast('Snippet copié');
                      }}
                      style={{ fontSize:11, padding:'6px 10px' }}
                    >
                      <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
                        <Icon name="copy" size={12} color="currentColor" />
                        Copier
                      </span>
                    </Btn>
                    {item.debriefId && (
                      <Btn
                        variant="secondary"
                        onClick={() => navigate('Detail', item.debriefId, 'Knowledge')}
                        style={{ fontSize:11, padding:'6px 10px' }}
                      >
                        <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
                          <Icon name="search" size={12} color="currentColor" />
                          Ouvrir la source
                        </span>
                      </Btn>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
