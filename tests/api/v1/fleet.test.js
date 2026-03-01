import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockReqRes } from '../../mocks/supabase.js';

// ── Section 22.5.3: GET /api/v1/fleet ──

vi.mock('@/lib/apiKeyAuth', () => ({
  verifyApiKey: vi.fn(),
  setRateLimitHeaders: vi.fn(),
  logApiRequest: vi.fn(),
  hasPermission: vi.fn(),
}));

let handler, mockVerifyApiKey, mockHasPermission, mockSetRateLimitHeaders;

beforeEach(async () => {
  vi.clearAllMocks();
  vi.resetModules();
  const authMod = await import('@/lib/apiKeyAuth');
  mockVerifyApiKey = authMod.verifyApiKey;
  mockHasPermission = authMod.hasPermission;
  mockSetRateLimitHeaders = authMod.setRateLimitHeaders;
  const mod = await import('../../../pages/api/v1/fleet.js');
  handler = mod.default;
});

function mockVerifySuccess(overrides = {}) {
  const mockQuery = {};
  ['select', 'eq', 'order'].forEach(m => { mockQuery[m] = vi.fn(() => mockQuery); });
  const supabase = { from: vi.fn(() => mockQuery) };
  mockVerifyApiKey.mockResolvedValue({
    apiKey: { id: 'key-1', permissions: ['fleet:read'] },
    org: { id: 'org-1', tier: 'professional' },
    supabase, rateLimit: { limit: 100, remaining: 99 }, apiAccess: 'read_only', error: null, ...overrides,
  });
  return { supabase, mockQuery };
}

describe('GET /api/v1/fleet', () => {
  it('rejects non-GET methods', async () => {
    const { req, res } = createMockReqRes({ method: 'POST' });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('returns 401 without auth', async () => {
    mockVerifyApiKey.mockResolvedValue({ error: 'Missing or invalid API key.', status: 401 });
    const { req, res } = createMockReqRes({ method: 'GET' });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 403 without fleet:read', async () => {
    mockVerifySuccess();
    mockHasPermission.mockReturnValue(false);
    const { req, res } = createMockReqRes({ method: 'GET' });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns fleet data', async () => {
    const { mockQuery } = mockVerifySuccess();
    mockHasPermission.mockReturnValue(true);
    mockQuery.order = vi.fn(() => Promise.resolve({ data: [{ id: 'a1', type: 'PC-12' }], error: null }));
    const { req, res } = createMockReqRes({ method: 'GET' });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('returns empty array when no aircraft', async () => {
    const { mockQuery } = mockVerifySuccess();
    mockHasPermission.mockReturnValue(true);
    mockQuery.order = vi.fn(() => Promise.resolve({ data: null, error: null }));
    const { req, res } = createMockReqRes({ method: 'GET' });
    await handler(req, res);
    expect(res.json).toHaveBeenCalledWith({ data: [] });
  });

  it('returns 500 on db error', async () => {
    const { mockQuery } = mockVerifySuccess();
    mockHasPermission.mockReturnValue(true);
    mockQuery.order = vi.fn(() => Promise.resolve({ data: null, error: { message: 'DB error' } }));
    const { req, res } = createMockReqRes({ method: 'GET' });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('sets rate limit headers', async () => {
    const { mockQuery } = mockVerifySuccess();
    mockHasPermission.mockReturnValue(true);
    mockQuery.order = vi.fn(() => Promise.resolve({ data: [], error: null }));
    const { req, res } = createMockReqRes({ method: 'GET' });
    await handler(req, res);
    expect(mockSetRateLimitHeaders).toHaveBeenCalled();
  });
});
