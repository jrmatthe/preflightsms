import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockReqRes } from '../../mocks/supabase.js';

// ── Section 22.5: API v1 Reports Endpoints ──

vi.mock('@/lib/apiKeyAuth', () => ({
  verifyApiKey: vi.fn(),
  setRateLimitHeaders: vi.fn(),
  logApiRequest: vi.fn(),
  hasPermission: vi.fn(),
}));

let handler, mockVerifyApiKey, mockHasPermission;

beforeEach(async () => {
  vi.clearAllMocks();
  vi.resetModules();
  const authMod = await import('@/lib/apiKeyAuth');
  mockVerifyApiKey = authMod.verifyApiKey;
  mockHasPermission = authMod.hasPermission;
  const mod = await import('../../../pages/api/v1/reports/index.js');
  handler = mod.default;
});

function mockVerifySuccess(overrides = {}) {
  const mockQuery = {};
  ['select', 'eq', 'order', 'range', 'gte', 'lte', 'insert'].forEach(m => {
    mockQuery[m] = vi.fn(() => mockQuery);
  });
  // Make query thenable so `await query` resolves after full chain
  mockQuery.then = (resolve) => resolve({ data: [], error: null, count: 0 });
  mockQuery.single = vi.fn().mockResolvedValue({ data: { id: 'rpt-1' }, error: null });
  const supabase = { from: vi.fn(() => mockQuery) };
  mockVerifyApiKey.mockResolvedValue({
    apiKey: { id: 'key-1', permissions: ['reports:read', 'reports:write'], created_by: 'user-1' },
    org: { id: 'org-1', tier: 'enterprise' },
    supabase, rateLimit: { limit: 100, remaining: 99 }, apiAccess: true, error: null, ...overrides,
  });
  return { supabase, mockQuery };
}

describe('GET /api/v1/reports', () => {
  it('returns 401 without auth', async () => {
    mockVerifyApiKey.mockResolvedValue({ error: 'Missing or invalid API key.', status: 401 });
    const { req, res } = createMockReqRes({ method: 'GET' });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 403 without reports:read permission', async () => {
    mockVerifySuccess();
    mockHasPermission.mockReturnValue(false);
    const { req, res } = createMockReqRes({ method: 'GET' });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns paginated reports for valid key', async () => {
    const { mockQuery } = mockVerifySuccess();
    mockHasPermission.mockReturnValue(true);
    mockQuery.then = (resolve) => resolve({ data: [{ id: 'r1' }], error: null, count: 1 });
    const { req, res } = createMockReqRes({ method: 'GET', query: {} });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('applies status filter', async () => {
    const { mockQuery } = mockVerifySuccess();
    mockHasPermission.mockReturnValue(true);
    mockQuery.then = (resolve) => resolve({ data: [], error: null, count: 0 });
    const { req, res } = createMockReqRes({ method: 'GET', query: { status: 'open' } });
    await handler(req, res);
    expect(mockQuery.eq).toHaveBeenCalledWith('status', 'open');
  });

  it('applies category filter', async () => {
    const { mockQuery } = mockVerifySuccess();
    mockHasPermission.mockReturnValue(true);
    mockQuery.then = (resolve) => resolve({ data: [], error: null, count: 0 });
    const { req, res } = createMockReqRes({ method: 'GET', query: { category: 'wildlife' } });
    await handler(req, res);
    expect(mockQuery.eq).toHaveBeenCalledWith('category', 'wildlife');
  });
});

describe('POST /api/v1/reports', () => {
  it('returns 403 when read_only', async () => {
    mockVerifySuccess({ apiAccess: 'read_only' });
    const { req, res } = createMockReqRes({ method: 'POST', body: { category: 'hazard', description: 'test' } });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 400 when required fields missing', async () => {
    mockVerifySuccess({ apiAccess: true });
    mockHasPermission.mockReturnValue(true);
    const { req, res } = createMockReqRes({ method: 'POST', body: { category: 'hazard' } });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('creates report with 201', async () => {
    const { mockQuery } = mockVerifySuccess({ apiAccess: true });
    mockHasPermission.mockReturnValue(true);
    mockQuery.single = vi.fn().mockResolvedValue({ data: { id: 'rpt-new' }, error: null });
    const { req, res } = createMockReqRes({ method: 'POST', body: { category: 'hazard', description: 'Bird strike' } });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('returns 403 without reports:write', async () => {
    mockVerifySuccess({ apiAccess: true });
    mockHasPermission.mockReturnValue(false);
    const { req, res } = createMockReqRes({ method: 'POST', body: { category: 'hazard', description: 'test' } });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe('Unsupported methods', () => {
  it('returns 405 for PUT', async () => {
    mockVerifySuccess();
    const { req, res } = createMockReqRes({ method: 'PUT' });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });
});
