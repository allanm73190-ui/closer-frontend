// ─── CONFIG ───────────────────────────────────────────────────────────────────
const RAW_API_BASE = String(import.meta.env.VITE_API_BASE || 'https://closer-backend-production.up.railway.app').trim();
const NORMALIZED_API_BASE = RAW_API_BASE.replace(/\/+$/, '');
export const API_BASE = NORMALIZED_API_BASE.endsWith('/api') ? NORMALIZED_API_BASE : `${NORMALIZED_API_BASE}/api`;
const REQUEST_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 15000);

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
  let res;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...opts,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...opts.headers,
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new Error('Le serveur met trop de temps à répondre. Réessayez.');
    }
    throw new Error('Impossible de contacter le serveur. Vérifiez votre connexion.');
  } finally {
    clearTimeout(timeoutId);
  }
  const data = await res.json().catch(() => ({}));
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
