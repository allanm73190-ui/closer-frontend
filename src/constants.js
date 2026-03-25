// ─── DESIGN SYSTEM — Soft Pastel 3D ─────────────────────────────────────────
export const P  = '#e87d6a';
export const P2 = '#d4604e';
export const A  = '#6aacce';
export const BG = 'linear-gradient(160deg,#f5ede6 0%,#e8f0f5 100%)';
export const WHITE = '#ffffff';
export const TXT   = '#5a4a3a';
export const TXT2  = '#b09080';
export const TXT3  = '#c8b8a8';
export const SAND  = '#f5ede6';

export const SH_CARD    = '5px 5px 15px rgba(174,130,100,.18), -3px -3px 10px rgba(255,255,255,.9)';
export const SH_SM      = '3px 3px 8px rgba(174,130,100,.15), -2px -2px 6px rgba(255,255,255,.85)';
export const SH_BTN     = '0 6px 18px rgba(232,125,106,.35), inset 0 1px 0 rgba(255,255,255,.25)';
export const SH_IN      = 'inset 2px 2px 5px rgba(174,130,100,.15), inset -1px -1px 4px rgba(255,255,255,.9)';
export const SH_HOVERED = '6px 6px 20px rgba(174,130,100,.22), -3px -3px 10px rgba(255,255,255,.9)';

export const R_SM=10, R_MD=14, R_LG=18, R_XL=24, R_FULL=50;

export const card   = (x={}) => ({ background:WHITE, borderRadius:R_LG, boxShadow:SH_CARD, ...x });
export const cardSm = (x={}) => ({ background:WHITE, borderRadius:R_MD, boxShadow:SH_SM,   ...x });
export const inp    = (x={}) => ({ width:'100%', background:SAND, border:'1px solid rgba(232,125,106,.15)', borderRadius:R_MD, padding:'11px 14px', fontSize:14, fontFamily:'inherit', outline:'none', boxSizing:'border-box', color:TXT, boxShadow:SH_IN, ...x });

export const BTN = {
  primary:   { background:`linear-gradient(135deg,${P},${P2})`, color:'white', border:'none', boxShadow:SH_BTN },
  secondary: { background:WHITE, color:TXT, border:'none', boxShadow:SH_SM },
  danger:    { background:'rgba(253,232,228,.8)', color:'#c05040', border:'1px solid rgba(192,80,64,.3)', boxShadow:'none' },
  ghost:     { background:'transparent', color:TXT2, border:'none', boxShadow:'none' },
  green:     { background:'rgba(218,240,216,.8)', color:'#5a9858', border:'1px solid rgba(90,152,88,.3)', boxShadow:'none' },
};

export const DS = {
  bgApp: BG, bgCard: WHITE, bgInput: SAND,
  primary: P, primary2: P2, accent: A,
  textPrimary: TXT, textSecondary: TXT2, textMuted: TXT3,
  success:'#5a9858', successBg:'rgba(218,240,216,.8)', successBorder:'rgba(90,152,88,.3)',
  warning:'#c07830', warningBg:'rgba(254,243,224,.8)', warningBorder:'rgba(192,120,48,.3)',
  danger:'#c05040',  dangerBg:'rgba(253,232,228,.8)',  dangerBorder:'rgba(192,80,64,.3)',
  info:'#3a7a9a',    infoBg:'rgba(218,237,245,.8)',    infoBorder:'rgba(58,122,154,.3)',
  shadowCard:SH_CARD, shadowCardHov:SH_HOVERED, shadowSm:SH_SM, shadowBtn:SH_BTN, shadowInset:SH_IN,
  radiusSm:R_SM, radiusMd:R_MD, radiusLg:R_LG, radiusXl:R_XL, radiusFull:R_FULL,
  bgNavItem:`linear-gradient(135deg,${P},${P2})`,
};

export const SECTIONS = [
  { key:'decouverte',         label:'Découverte'    },
  { key:'reformulation',      label:'Reformulation' },
  { key:'projection',         label:'Projection'    },
  { key:'presentation_offre', label:'Offre'         },
  { key:'closing',            label:'Closing'       },
];

export const PIPELINE_STAGES = [
  { key:'prospect',      label:'Prospects',   color:'#6b7280', bg:'#f1f5f9',              icon:'👤' },
  { key:'premier_appel', label:'1er appel',   color:'#e87d6a', bg:'rgba(253,232,228,.6)', icon:'📞' },
  { key:'relance',       label:'Relance',     color:'#d97706', bg:'#fef3c7',              icon:'🔄' },
  { key:'negociation',   label:'Négociation', color:'#e87d6a', bg:'rgba(255,248,245,.8)', icon:'🤝' },
  { key:'signe',         label:'Signés ✓',    color:'#059669', bg:'#d1fae5',              icon:'✅' },
  { key:'perdu',         label:'Perdus',      color:'#dc2626', bg:'#fee2e2',              icon:'❌' },
];

export const DEFAULT_DEBRIEF_CONFIG = [
  { key:'decouverte', title:'Phase de découverte', questions:[
    { id:'douleur_surface',   label:'Douleur de surface identifiée ?',          type:'radio',    options:[{value:'oui',label:'Oui'},{value:'non',label:'Non'}] },
    { id:'douleur_profonde',  label:'Douleur profonde / identitaire atteinte ?', type:'radio',    options:[{value:'oui',label:'✅ Oui — verbalisé fort'},{value:'partiel',label:'⚠️ Partiellement'},{value:'non',label:'❌ Non'}] },
    { id:'couches_douleur',   label:'Couches de douleur creusées',               type:'checkbox', options:[{value:'couche1',label:'Couche 1 : physique'},{value:'couche2',label:'Couche 2 : quotidien'},{value:'couche3',label:'Couche 3 : identité'}] },
    { id:'temporalite',       label:'Temporalité demandée ?',                    type:'radio',    options:[{value:'oui',label:'✅ Oui'},{value:'non',label:'❌ Non'}] },
    { id:'urgence',           label:'Urgence naturelle identifiée ?',            type:'radio',    options:[{value:'oui',label:'✅ Oui'},{value:'artificielle',label:'⚠️ Artificielle'},{value:'aucune',label:'❌ Aucune'}] },
  ]},
  { key:'reformulation', title:'Reformulation', questions:[
    { id:'reformulation',         label:'Reformulation faite ?',       type:'radio',    options:[{value:'oui',label:'✅ Complète'},{value:'partiel',label:'⚠️ Partielle'},{value:'non',label:'❌ Non'}] },
    { id:'prospect_reconnu',      label:"Le prospect s'est reconnu ?", type:'radio',    options:[{value:'oui',label:'✅ Oui'},{value:'moyen',label:'⚠️ Moyen'},{value:'non',label:'❌ Non'}] },
    { id:'couches_reformulation', label:'Les 3 couches présentes ?',   type:'checkbox', options:[{value:'physique',label:'Physique'},{value:'quotidien',label:'Quotidien'},{value:'identitaire',label:'Identitaire'}] },
  ]},
  { key:'projection', title:'Projection', questions:[
    { id:'projection_posee', label:'Question de projection posée ?',   type:'radio', options:[{value:'oui',label:'✅ Oui'},{value:'non',label:'❌ Non'}] },
    { id:'qualite_reponse',  label:'Qualité de la réponse',            type:'radio', options:[{value:'forte',label:'✅ Forte'},{value:'moyenne',label:'⚠️ Moyenne'},{value:'faible',label:'❌ Faible'}] },
    { id:'deadline_levier',  label:'Deadline utilisée comme levier ?', type:'radio', options:[{value:'oui',label:'✅ Oui'},{value:'non_exploitee',label:'⚠️ Non exploitée'},{value:'pas_de_deadline',label:'❌ Pas de deadline'}] },
  ]},
  { key:'presentation_offre', title:"Présentation de l'offre", questions:[
    { id:'colle_douleurs',          label:'Présentation collée aux douleurs ?', type:'radio', options:[{value:'oui',label:'✅ Oui'},{value:'partiel',label:'⚠️ Partiellement'},{value:'non',label:'❌ Non'}] },
    { id:'exemples_transformation', label:'Exemples bien choisis ?',            type:'radio', options:[{value:'oui',label:'✅ Oui'},{value:'moyen',label:'⚠️ Moyen'},{value:'non',label:'❌ Non'}] },
    { id:'duree_justifiee',         label:'Durée / Offre justifiée ?',          type:'radio', options:[{value:'oui',label:'✅ Oui'},{value:'partiel',label:'⚠️ Partiellement'},{value:'non',label:'❌ Non'}] },
  ]},
  { key:'closing', title:'Closing & Objections', questions:[
    { id:'annonce_prix',     label:'Annonce du prix',                      type:'radio',    options:[{value:'directe',label:'✅ Directe'},{value:'hesitante',label:'⚠️ Hésitante'},{value:'trop_rapide',label:'❌ Trop rapide'}] },
    { id:'silence_prix',     label:'Silence après le prix ?',              type:'radio',    options:[{value:'oui',label:'✅ Oui'},{value:'non',label:'❌ Non'}] },
    { id:'objections',       label:'Objection rencontrée',                 type:'checkbox', options:[{value:'budget',label:'Budget'},{value:'reflechir',label:'Besoin de réfléchir'},{value:'conjoint',label:'Conjoint'},{value:'methode',label:'Méthode'},{value:'aucune',label:'Aucune'}] },
    { id:'douleur_reancree', label:"Douleur réancrée avant l'objection ?", type:'radio',    options:[{value:'oui',label:'✅ Oui'},{value:'non',label:'❌ Non'}] },
    { id:'objection_isolee', label:'Objection bien isolée ?',              type:'radio',    options:[{value:'oui',label:'✅ Oui'},{value:'non',label:'❌ Non'}] },
    { id:'resultat_closing', label:'Résultat du closing',                  type:'radio',    options:[{value:'close',label:'✅ Closé'},{value:'retrograde',label:'⚠️ Rétrogradé'},{value:'relance',label:'📅 Relance'},{value:'porte_ouverte',label:'🔓 Porte ouverte'},{value:'perdu',label:'❌ Perdu'}] },
  ]},
];
