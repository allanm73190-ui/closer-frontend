// ─── CONFIG ───────────────────────────────────────────────────────────────────
export const API_BASE = 'https://closer-backend-production.up.railway.app/api';

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
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...opts.headers,
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new Error('Impossible de contacter le serveur. Vérifiez votre connexion.');
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
