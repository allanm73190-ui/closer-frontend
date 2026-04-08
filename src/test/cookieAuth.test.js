import { describe, it, expect, vi } from 'vitest';

// Mock fetch global
const mockFetch = vi.fn();
global.fetch = mockFetch;

const { apiFetch, getToken, setToken, clearToken } = await import('../config/api?v=cookie-' + Date.now());

describe('Cookie-based auth (httpOnly)', () => {
  it('apiFetch does NOT send Authorization header', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) });
    await apiFetch('/test');
    const callArgs = mockFetch.mock.calls[0][1];
    expect(callArgs.headers).not.toHaveProperty('Authorization');
  });

  it('apiFetch sends credentials:include for cookie transport', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) });
    await apiFetch('/test');
    expect(mockFetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ credentials: 'include' }));
  });

  it('getToken() returns null (localStorage no longer used)', () => {
    localStorage.setItem('cd_token', 'old-legacy-token');
    expect(getToken()).toBeNull();
  });

  it('setToken() is a no-op — does not write to localStorage', () => {
    localStorage.removeItem('cd_token');
    setToken('some-token');
    expect(localStorage.getItem('cd_token')).toBeNull();
  });

  it('clearToken() removes legacy localStorage entry if present', () => {
    localStorage.setItem('cd_token', 'legacy');
    clearToken();
    expect(localStorage.getItem('cd_token')).toBeNull();
  });
});
