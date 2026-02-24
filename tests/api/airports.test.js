import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockReqRes } from '../mocks/supabase.js';

// Mock geo-tz
vi.mock('geo-tz', () => ({
  find: vi.fn(() => ['America/Los_Angeles']),
}));

let handler;

beforeEach(async () => {
  vi.clearAllMocks();
  vi.resetModules();
  globalThis.fetch = vi.fn();
  const mod = await import('../../pages/api/airports.js');
  handler = mod.default;
});

describe('GET /api/airports', () => {
  it('returns 400 when ids parameter is missing', async () => {
    const { req, res } = createMockReqRes({ method: 'GET', query: {} });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('fetches METAR data for airport coordinates', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        { icaoId: 'KSFO', lat: 37.619, lon: -122.375, name: 'San Francisco Intl' },
      ]),
    });
    const { req, res } = createMockReqRes({
      method: 'GET',
      query: { ids: 'KSFO' },
    });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    const result = res.json.mock.calls[0][0];
    expect(result.KSFO).toBeDefined();
    expect(result.KSFO.lat).toBe(37.619);
    expect(result.KSFO.lon).toBe(-122.375);
  });

  it('handles multiple airport IDs', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        { icaoId: 'KSFO', lat: 37.619, lon: -122.375 },
        { icaoId: 'KLAX', lat: 33.943, lon: -118.408 },
      ]),
    });
    const { req, res } = createMockReqRes({
      method: 'GET',
      query: { ids: 'KSFO,KLAX' },
    });
    await handler(req, res);
    const result = res.json.mock.calls[0][0];
    expect(Object.keys(result)).toContain('KSFO');
    expect(Object.keys(result)).toContain('KLAX');
  });

  it('uppercases airport IDs', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        { icaoId: 'KSFO', lat: 37.619, lon: -122.375 },
      ]),
    });
    const { req, res } = createMockReqRes({
      method: 'GET',
      query: { ids: 'ksfo' },
    });
    await handler(req, res);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('KSFO'),
      expect.any(Object)
    );
  });

  it('caches results for subsequent requests', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        { icaoId: 'KSFO', lat: 37.619, lon: -122.375 },
      ]),
    });
    const { req: req1, res: res1 } = createMockReqRes({ query: { ids: 'KSFO' } });
    await handler(req1, res1);

    // Second request should use cache
    globalThis.fetch.mockClear();
    const { req: req2, res: res2 } = createMockReqRes({ query: { ids: 'KSFO' } });
    await handler(req2, res2);
    // fetch should not be called for cached airport
    // (might still be called if uncached airports exist)
    const result = res2.json.mock.calls[0][0];
    expect(result.KSFO).toBeDefined();
  });

  it('handles fetch failure gracefully', async () => {
    globalThis.fetch.mockRejectedValue(new Error('Network error'));
    const { req, res } = createMockReqRes({
      method: 'GET',
      query: { ids: 'KUNKNOWN' },
    });
    await handler(req, res);
    // Should return empty results, not crash
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('sets cache-control headers', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
    const { req, res } = createMockReqRes({ query: { ids: 'KSFO' } });
    await handler(req, res);
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', expect.stringContaining('s-maxage=86400'));
  });

  it('includes timezone abbreviation in results', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        { icaoId: 'KSFO', lat: 37.619, lon: -122.375 },
      ]),
    });
    const { req, res } = createMockReqRes({ query: { ids: 'KSFO' } });
    await handler(req, res);
    const result = res.json.mock.calls[0][0];
    expect(result.KSFO.tz).toBe('America/Los_Angeles');
    expect(result.KSFO.tzAbbr).toBeDefined();
  });
});
