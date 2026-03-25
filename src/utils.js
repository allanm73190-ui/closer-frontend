// ─── UTILS ────────────────────────────────────────────────────────────────────

export const fmtDate  = s => { try { return new Date(s).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'}); } catch { return s||''; }};
export const fmtShort = s => { try { return new Date(s).toLocaleDateString('fr-FR',{day:'2-digit',month:'short'}); }             catch { return s||''; }};
export const copy     = t => navigator.clipboard.writeText(t).catch(()=>{});

export function computeScore(sections) {
  let pts = 0, max = 0;
  const add = (val, pos, total) => {
    max += total;
    if (Array.isArray(pos)) {
      if (Array.isArray(val)) pts += val.filter(v => pos.includes(v)).length;
      else if (pos.includes(val)) pts++;
    } else if (val === pos) pts++;
  };
  const d = sections.decouverte || {};
  add(d.douleur_surface, 'oui', 1);
  add(d.douleur_profonde, ['oui','partiel'], 1);
  add(d.couches_douleur, ['couche1','couche2','couche3'], 3);
  add(d.temporalite, 'oui', 1);
  add(d.urgence, ['oui','artificielle'], 1);
  const r = sections.reformulation || {};
  add(r.reformulation, ['oui','partiel'], 1);
  add(r.prospect_reconnu, ['oui','moyen'], 1);
  add(r.couches_reformulation, ['physique','quotidien','identitaire'], 3);
  const p = sections.projection || {};
  add(p.projection_posee, 'oui', 1);
  add(p.qualite_reponse, ['forte','moyenne'], 1);
  add(p.deadline_levier, 'oui', 1);
  const o = sections.offre || {};
  add(o.colle_douleurs, ['oui','partiel'], 1);
  add(o.exemples_transformation, ['oui','moyen'], 1);
  add(o.duree_justifiee, ['oui','partiel'], 1);
  const c = sections.closing || {};
  add(c.annonce_prix, 'directe', 1);
  add(c.silence_prix, 'oui', 1);
  add(c.douleur_reancree, 'oui', 1);
  add(c.objection_isolee, 'oui', 1);
  add(c.resultat_closing, ['close','retrograde','relance'], 1);
  return { total: pts, max, percentage: max > 0 ? Math.round((pts / max) * 100) : 0 };
}

export function computeSectionScores(sections) {
  const s = sections || {};
  const pct = (pts, max) => max > 0 ? Math.round((pts / max) * 5) : 0;
  const d = s.decouverte || {};
  let dP = 0;
  if (d.douleur_surface === 'oui') dP++;
  if (['oui','partiel'].includes(d.douleur_profonde)) dP++;
  if (Array.isArray(d.couches_douleur)) dP += Math.min(d.couches_douleur.length, 3);
  if (d.temporalite === 'oui') dP++;
  if (['oui','artificielle'].includes(d.urgence)) dP++;
  const r = s.reformulation || {};
  let rP = 0;
  if (['oui','partiel'].includes(r.reformulation)) rP++;
  if (['oui','moyen'].includes(r.prospect_reconnu)) rP++;
  if (Array.isArray(r.couches_reformulation)) rP += Math.min(r.couches_reformulation.length, 3);
  const p = s.projection || {};
  let pP = 0;
  if (p.projection_posee === 'oui') pP++;
  if (['forte','moyenne'].includes(p.qualite_reponse)) pP++;
  if (p.deadline_levier === 'oui') pP++;
  const o = s.presentation_offre || s.offre || {};
  let oP = 0;
  if (['oui','partiel'].includes(o.colle_douleurs)) oP++;
  if (['oui','moyen'].includes(o.exemples_transformation)) oP++;
  if (['oui','partiel'].includes(o.duree_justifiee)) oP++;
  const c = s.closing || {};
  let cP = 0;
  if (c.annonce_prix === 'directe') cP++;
  if (c.silence_prix === 'oui') cP++;
  if (c.douleur_reancree === 'oui') cP++;
  if (c.objection_isolee === 'oui') cP++;
  if (['close','retrograde','relance'].includes(c.resultat_closing)) cP++;
  return {
    decouverte:         pct(dP, 7),
    reformulation:      pct(rP, 5),
    projection:         pct(pP, 3),
    presentation_offre: pct(oP, 3),
    closing:            pct(cP, 5),
  };
}

export function computeLevel(p) {
  if (p >= 500) return { name:'Légende',      icon:'👑', min:500, next:null };
  if (p >= 200) return { name:'Expert',        icon:'💎', min:200, next:500  };
  if (p >= 100) return { name:'Confirmé',      icon:'🥇', min:100, next:200  };
  if (p >= 50)  return { name:'Intermédiaire', icon:'🥈', min:50,  next:100  };
  if (p >= 20)  return { name:'Débutant+',     icon:'🥉', min:20,  next:50   };
  return              { name:'Débutant',       icon:'🌱', min:0,   next:20   };
}

export function avgSectionScores(debriefs) {
  if (!debriefs.length) return null;
  const keys = ['decouverte','reformulation','projection','presentation_offre','closing'];
  const sums = Object.fromEntries(keys.map(k => [k, 0]));
  let count = 0;
  debriefs.forEach(d => {
    const sc = computeSectionScores(d.sections || {});
    if (Object.values(sc).some(v => v > 0)) {
      keys.forEach(k => { sums[k] += sc[k] || 0; });
      count++;
    }
  });
  if (!count) return null;
  return Object.fromEntries(keys.map(k => [k, Math.round(sums[k] / count)]));
}
