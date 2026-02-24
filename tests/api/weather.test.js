import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockReqRes } from '../mocks/supabase.js';

let handler;

beforeEach(async () => {
  vi.clearAllMocks();
  vi.resetModules();
  globalThis.fetch = vi.fn();
  const mod = await import('../../pages/api/weather.js');
  handler = mod.default;
});

describe('GET /api/weather', () => {
  it('returns 400 when ids parameter is missing', async () => {
    const { req, res } = createMockReqRes({ method: 'GET', query: {} });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('fetches METAR and TAF data in parallel', async () => {
    globalThis.fetch.mockResolvedValue({
      status: 200,
      ok: true,
      text: () => Promise.resolve('[]'),
    });
    const { req, res } = createMockReqRes({
      method: 'GET',
      query: { ids: 'KSFO,KLAX' },
    });
    await handler(req, res);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      metars: expect.any(Array),
      tafs: expect.any(Array),
    }));
  });

  it('handles 204 No Content responses gracefully', async () => {
    globalThis.fetch.mockResolvedValue({
      status: 204,
      ok: true,
      text: () => Promise.resolve(''),
    });
    const { req, res } = createMockReqRes({
      method: 'GET',
      query: { ids: 'KXYZ' },
    });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ metars: [], tafs: [] });
  });

  it('handles malformed JSON from upstream', async () => {
    globalThis.fetch.mockResolvedValue({
      status: 200,
      ok: true,
      text: () => Promise.resolve('not json'),
    });
    const { req, res } = createMockReqRes({
      method: 'GET',
      query: { ids: 'KSFO' },
    });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ metars: [], tafs: [] });
  });

  it('returns 502 on upstream fetch failure', async () => {
    globalThis.fetch.mockRejectedValue(new Error('Network error'));
    const { req, res } = createMockReqRes({
      method: 'GET',
      query: { ids: 'KSFO' },
    });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(502);
  });

  it('sets cache control headers', async () => {
    globalThis.fetch.mockResolvedValue({
      status: 200,
      ok: true,
      text: () => Promise.resolve('[]'),
    });
    const { req, res } = createMockReqRes({
      method: 'GET',
      query: { ids: 'KSFO' },
    });
    await handler(req, res);
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', expect.stringContaining('s-maxage'));
  });
});
