import { describe, it, expect, vi } from 'vitest';

// Mock fetch global
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Importer après le mock
const { apiFetch } = await import('../config/api?v=' + Date.now());

describe('apiFetch', () => {
  it('inclut credentials: include dans chaque requête', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
    });
    await apiFetch('/test');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ credentials: 'include' })
    );
  });
});
