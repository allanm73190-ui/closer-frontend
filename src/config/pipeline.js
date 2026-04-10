export const DEFAULT_PIPELINE_STATUSES = [
  { key:'prospect', label:'Prospects', icon:'user-round', color:'var(--txt3)', bg:'#f1f5f9', closed:false, won:false },
  { key:'premier_appel', label:'1er appel', icon:'phone-call', color:'#FF7E5F', bg:'rgba(255,126,95,.06,.6)', closed:false, won:false },
  { key:'relance', label:'Relance', icon:'refresh-cw', color:'#d97706', bg:'#fef3c7', closed:false, won:false },
  { key:'negociation', label:'Négociation', icon:'handshake', color:'#3b82f6', bg:'#dbeafe', closed:false, won:false },
  { key:'signe', label:'Signés', icon:'badge-check', color:'#059669', bg:'#d1fae5', closed:true, won:true },
  { key:'perdu', label:'Perdus', icon:'circle-x', color:'#dc2626', bg:'#fee2e2', closed:true, won:false },
];

export const LEAD_FIELD_OPTIONS = [
  { key:'first_name', label:'Prénom', type:'text', placeholder:'Prénom' },
  { key:'last_name', label:'Nom', type:'text', placeholder:'Nom' },
  { key:'email', label:'Email', type:'email', placeholder:'email@domaine.com' },
  { key:'phone', label:'Téléphone', type:'text', placeholder:'+33...' },
  { key:'source', label:'Source', type:'text', placeholder:'LinkedIn, Inbound...' },
  { key:'deal_closed', label:'Deal closé', type:'boolean' },
  { key:'value', label:'Montant (€)', type:'number', placeholder:'0' },
  { key:'contact_date', label:'Date', type:'date' },
  { key:'note', label:'Note', type:'textarea', placeholder:'Informations utiles sur ce lead...' },
];

export const DEFAULT_PIPELINE_CONFIG = {
  statuses: DEFAULT_PIPELINE_STATUSES,
  importantFields: LEAD_FIELD_OPTIONS.map(field => field.key),
};

function sanitizeKey(value = '', fallback = 'status') {
  const base = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return base || fallback;
}

function normalizeStatuses(statuses) {
  const source = Array.isArray(statuses) ? statuses : DEFAULT_PIPELINE_STATUSES;
  const seen = new Set();
  const normalized = source
    .map((status, idx) => {
      const key = sanitizeKey(status?.key || status?.label || `status_${idx + 1}`, `status_${idx + 1}`);
      if (seen.has(key)) return null;
      seen.add(key);
      return {
        key,
        label: String(status?.label || key).trim() || key,
        icon: String(status?.icon || 'shape').trim() || 'shape',
        color: String(status?.color || 'var(--txt3)'),
        bg: String(status?.bg || '#f1f5f9'),
        closed: Boolean(status?.closed),
        won: Boolean(status?.won),
      };
    })
    .filter(Boolean);
  if (normalized.length > 0) return normalized;
  return DEFAULT_PIPELINE_STATUSES;
}

function normalizeImportantFields(fields) {
  const allowed = new Set(LEAD_FIELD_OPTIONS.map(field => field.key));
  const list = Array.isArray(fields) ? fields.filter(key => allowed.has(key)) : [];
  return list.length > 0 ? list : DEFAULT_PIPELINE_CONFIG.importantFields;
}

export function normalizePipelineConfig(config) {
  return {
    statuses: normalizeStatuses(config?.statuses),
    importantFields: normalizeImportantFields(config?.importantFields),
  };
}

export function makeStatusKey(label, fallback = 'status') {
  return sanitizeKey(label, fallback);
}
