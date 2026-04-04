// ─── CONFIG ───────────────────────────────────────────────────────────────────
const RAW_API_BASE = String(import.meta.env.VITE_API_BASE || 'https://closer-backend-production.up.railway.app').trim();
const NORMALIZED_API_BASE = RAW_API_BASE.replace(/\/+$/, '');
export const API_BASE = NORMALIZED_API_BASE.endsWith('/api') ? NORMALIZED_API_BASE : `${NORMALIZED_API_BASE}/api`;
const REQUEST_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 15000);
const AI_REQUEST_TIMEOUT_MS = Number(import.meta.env.VITE_API_AI_TIMEOUT_MS || 90000);

function decodeEscapedUnicodeString(value) {
  if (typeof value !== 'string') return value;
  if (!value.includes('\\u') && !value.includes('\\x')) return value;
  return value
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\x([0-9a-fA-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function deepDecodeEscapedUnicode(input) {
  if (Array.isArray(input)) return input.map(deepDecodeEscapedUnicode);
  if (input && typeof input === 'object') {
    const output = {};
    for (const [key, value] of Object.entries(input)) output[key] = deepDecodeEscapedUnicode(value);
    return output;
  }
  return decodeEscapedUnicodeString(input);
}

// ─── AUTH TOKENS ─────────────────────────────────────────────────────────────
export function getToken()  { return localStorage.getItem('cd_token'); }
export function setToken(t) { localStorage.setItem('cd_token', t); }
export function clearToken(){ localStorage.removeItem('cd_token'); }

// ─── SESSION EXPIRY CALLBACK ─────────────────────────────────────────────────
let _onExpired = null;
export function setOnExpired(fn) { _onExpired = fn; }

// ─── API FETCH ───────────────────────────────────────────────────────────────
export async function apiFetch(path, opts = {}) {
  const token = getToken();
  const { timeoutMs, ...fetchOpts } = opts;
  const isAiPath = typeof path === 'string' && path.startsWith('/ai/');
  const preferredTimeout = timeoutMs ?? (isAiPath ? AI_REQUEST_TIMEOUT_MS : REQUEST_TIMEOUT_MS);
  const resolvedTimeoutMs = Number.isFinite(Number(preferredTimeout)) && Number(preferredTimeout) > 0
    ? Number(preferredTimeout)
    : REQUEST_TIMEOUT_MS;
  let res;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), resolvedTimeoutMs);
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...fetchOpts,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...fetchOpts.headers,
      },
      body: fetchOpts.body ? JSON.stringify(fetchOpts.body) : undefined,
    });
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new Error(
        isAiPath
          ? "L'analyse IA prend plus de temps que prévu. Réessayez dans quelques secondes."
          : 'Le serveur met trop de temps à répondre. Réessayez.'
      );
    }
    throw new Error('Impossible de contacter le serveur. Vérifiez votre connexion.');
  } finally {
    clearTimeout(timeoutId);
  }
  const rawData = await res.json().catch(() => ({}));
  const data = deepDecodeEscapedUnicode(rawData);
  if (res.status === 401) {
    clearToken();
    _onExpired?.();
    throw new Error(data.error || 'Session expirée');
  }
  if (!res.ok) {
    const detail = typeof data.detail === 'string' ? data.detail.trim() : '';
    const base = data.error || 'Erreur serveur';
    throw new Error(detail ? `${base} — ${detail}` : base);
  }
  return data;
}
