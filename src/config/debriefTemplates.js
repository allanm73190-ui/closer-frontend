import { DEFAULT_DEBRIEF_CONFIG } from '../components/debrief/Settings';

const FALLBACK_TEMPLATE_CATALOG = {
  defaultTemplateKey: 'standard',
  templates: [
    { key: 'standard', label: 'Standard Closer', description: 'Template généraliste pour la majorité des offres.' },
    { key: 'high_ticket', label: 'High Ticket', description: 'Offres premium avec enjeu valeur/prix et engagement élevé.' },
    { key: 'b2b_service', label: 'Service B2B', description: 'Vente de services aux entreprises avec parties prenantes.' },
    { key: 'formation_coaching', label: 'Formation / Coaching', description: "Programmes d'accompagnement et de transformation." },
  ],
};

const TEMPLATE_QUESTION_OVERRIDES = {
  high_ticket: {
    decouverte: {
      douleur_surface: { label: "Perte financière ou coût d'inaction clairement identifié ?" },
      urgence: { label: "Urgence business/ROI identifiée ?" },
    },
    projection: {
      projection_posee: { label: "Projection posée sur le coût de la non-décision ?" },
    },
    presentation_offre: {
      colle_douleurs: { label: "Positionnement premium relié aux enjeux du prospect ?" },
      duree_justifiee: { label: "Niveau d'investissement et durée bien justifiés ?" },
    },
    closing: {
      annonce_prix: { label: "Annonce de l'investissement premium" },
      objections: {
        options: [
          { value:'budget', label:'Budget / Investissement' },
          { value:'reflechir', label:'Je dois réfléchir' },
          { value:'conjoint', label:'Validation partenaire / associé' },
          { value:'methode', label:'Preuves / Méthode' },
          { value:'aucune', label:'Aucune' },
        ],
      },
    },
  },
  b2b_service: {
    decouverte: {
      douleur_surface: { label: 'Enjeu business prioritaire identifié ?' },
      temporalite: { label: 'Timing projet / trimestre validé ?' },
    },
    reformulation: {
      prospect_reconnu: { label: "Le décideur reconnaît l'impact business ?" },
    },
    projection: {
      deadline_levier: { label: 'Deadline liée au cycle de décision exploitée ?' },
    },
    presentation_offre: {
      exemples_transformation: { label: 'Cas clients / ROI comparables présentés ?' },
    },
    closing: {
      objections: {
        options: [
          { value:'budget', label:'Budget annuel / arbitrage' },
          { value:'reflechir', label:'Comité / délai interne' },
          { value:'conjoint', label:'Décideur manquant' },
          { value:'methode', label:'Fit process / déploiement' },
          { value:'aucune', label:'Aucune' },
        ],
      },
    },
  },
  formation_coaching: {
    decouverte: {
      douleur_surface: { label: 'Blocage principal du prospect identifié ?' },
      douleur_profonde: { label: 'Impact identitaire / confiance bien creusé ?' },
    },
    projection: {
      projection_posee: { label: 'Projection sur la transformation future posée ?' },
      qualite_reponse: { label: "Niveau d'engagement dans la réponse" },
    },
    presentation_offre: {
      exemples_transformation: { label: 'Exemples de transformation crédibles donnés ?' },
      duree_justifiee: { label: "Cadence d'accompagnement justifiée ?" },
    },
    closing: {
      objections: {
        options: [
          { value:'budget', label:'Budget personnel' },
          { value:'reflechir', label:'Je ne suis pas prêt(e)' },
          { value:'conjoint', label:'Validation proche/famille' },
          { value:'methode', label:'Peur de ne pas appliquer' },
          { value:'aucune', label:'Aucune' },
        ],
      },
    },
  },
};

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeTemplateKey(value, fallback) {
  const base = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return base || fallback;
}

export function normalizeDebriefTemplateCatalog(rawCatalog) {
  const source = rawCatalog && typeof rawCatalog === 'object' ? rawCatalog : {};
  const sourceTemplates = Array.isArray(source.templates) && source.templates.length > 0
    ? source.templates
    : FALLBACK_TEMPLATE_CATALOG.templates;
  const seen = new Set();
  const templates = [];
  for (let i = 0; i < sourceTemplates.length; i++) {
    const template = sourceTemplates[i] || {};
    const keyBase = normalizeTemplateKey(template.key || template.label || `template_${i + 1}`, `template_${i + 1}`);
    let key = keyBase;
    let suffix = 2;
    while (seen.has(key)) {
      key = `${keyBase}_${suffix}`;
      suffix += 1;
    }
    seen.add(key);
    templates.push({
      key,
      label: String(template.label || key).trim() || key,
      description: String(template.description || '').trim(),
      aiFocus: String(template.aiFocus || '').trim(),
    });
  }
  const defaultKey = normalizeTemplateKey(source.defaultTemplateKey || '', '');
  const resolvedDefault = templates.some(template => template.key === defaultKey)
    ? defaultKey
    : (templates[0]?.key || FALLBACK_TEMPLATE_CATALOG.defaultTemplateKey);
  return { defaultTemplateKey: resolvedDefault, templates };
}

function applyTemplateOverrides(baseSections, templateKey) {
  const overrides = TEMPLATE_QUESTION_OVERRIDES[templateKey];
  if (!overrides) return baseSections;
  return baseSections.map(section => {
    const sectionOverrides = overrides[section.key];
    if (!sectionOverrides) return section;
    return {
      ...section,
      questions: (section.questions || []).map(question => {
        const questionOverride = sectionOverrides[question.id];
        if (!questionOverride) return question;
        return {
          ...question,
          label: questionOverride.label || question.label,
          options: Array.isArray(questionOverride.options) ? questionOverride.options : question.options,
        };
      }),
    };
  });
}

export function buildTemplateSections(templateKey, baseConfig) {
  const source = Array.isArray(baseConfig) && baseConfig.length > 0 ? baseConfig : DEFAULT_DEBRIEF_CONFIG;
  const cloned = deepClone(source);
  return applyTemplateOverrides(cloned, templateKey);
}

export function getDefaultTemplateCatalog() {
  return FALLBACK_TEMPLATE_CATALOG;
}
