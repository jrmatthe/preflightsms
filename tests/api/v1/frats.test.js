import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockReqRes } from '../../mocks/supabase.js';

// ── Section 22: API v1 FRAT Endpoints ──

// Mock the apiKeyAuth module using path from test file
vi.mock('@/lib/apiKeyAuth', () => ({
  verifyApiKey: vi.fn(),
  setRateLimitHeaders: vi.fn(),
  logApiRequest: vi.fn(),
  hasPermission: vi.fn(),
}));

let handler;
let mockVerifyApiKey, mockSetRateLimitHeaders, mockLogApiRequest, mockHasPermission;

beforeEach(async () => {
  vi.clearAllMocks();
  vi.resetModules();

  // Re-import mocks to get fresh references
  const authMod = await import('@/lib/apiKeyAuth');
  mockVerifyApiKey = authMod.verifyApiKey;
  mockSetRateLimitHeaders = authMod.setRateLimitHeaders;
  mockLogApiRequest = authMod.logApiRequest;
  mockHasPermission = authMod.hasPermission;

  const mod = await import('../../../pages/api/v1/frats/index.js');
  handler = mod.default;
});

function mockVerifySuccess(overrides = {}) {
  const mockQuery = {};
  ['select', 'eq', 'order', 'range', 'ilike', 'gte', 'lte', 'insert'].forEach(m => {
    mockQuery[m] = vi.fn(() => mockQuery);
  });
  // Make query thenable so `await query` resolves after the full chain
  mockQuery.then = (resolve) => resolve({ data: [], error: null, count: 0 });
  mockQuery.single = vi.fn().mockResolvedValue({ data: { id: 'frat-1', frat_code: 'FRAT-TEST' }, error: null });

  const supabase = { from: vi.fn(() => mockQuery) };

  mockVerifyApiKey.mockResolvedValue({
    apiKey: { id: 'key-1', permissions: ['frats:read', 'frats:write'], created_by: 'user-1' },
    org: { id: 'org-1', tier: 'enterprise' },
    supabase,
    rateLimit: { limit: 100, remaining: 99, exceeded: false },
    apiAccess: true,
    error: null,
    ...overrides,
  });

  return { supabase, mockQuery };
}

// ── GET /api/v1/frats ──

describe('GET /api/v1/frats', () => {
  it('returns 401 when no API key provided', async () => {
    mockVerifyApiKey.mockResolvedValue({ error: 'Missing or invalid API key.', status: 401 });
    const { req, res } = createMockReqRes({ method: 'GET' });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing or invalid API key.' });
  });

  it('returns 401 for expired API key', async () => {
    mockVerifyApiKey.mockResolvedValue({ error: 'API key expired', status: 401 });
    const { req, res } = createMockReqRes({ method: 'GET' });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 403 when key lacks frats:read permission', async () => {
    mockVerifySuccess();
    mockHasPermission.mockReturnValue(false);
    const { req, res } = createMockReqRes({ method: 'GET' });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing permission: frats:read' });
  });

  it('returns 200 with frats data for valid key', async () => {
    const { mockQuery } = mockVerifySuccess();
    mockHasPermission.mockReturnValue(true);
    mockQuery.then = (resolve) => resolve({ data: [{ id: 'f1' }], error: null, count: 1 });

    const { req, res } = createMockReqRes({ method: 'GET', query: { page: '1', per_page: '10' } });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('respects page and per_page query params', async () => {
    const { mockQuery } = mockVerifySuccess();
    mockHasPermission.mockReturnValue(true);
    mockQuery.then = (resolve) => resolve({ data: [], error: null, count: 50 });

    const { req, res } = createMockReqRes({ method: 'GET', query: { page: '2', per_page: '10' } });
    await handler(req, res);
    expect(mockQuery.range).toHaveBeenCalledWith(10, 19);
  });

  it('applies pilot filter via ilike', async () => {
    const { mockQuery } = mockVerifySuccess();
    mockHasPermission.mockReturnValue(true);
    mockQuery.then = (resolve) => resolve({ data: [], error: null, count: 0 });

    const { req, res } = createMockReqRes({ method: 'GET', query: { pilot: 'Smith' } });
    await handler(req, res);
    expect(mockQuery.ilike).toHaveBeenCalledWith('pilot', '%Smith%');
  });

  it('sets rate limit headers on success', async () => {
    mockVerifySuccess();
    mockHasPermission.mockReturnValue(true);
    const { req, res } = createMockReqRes({ method: 'GET' });
    await handler(req, res);
    expect(mockSetRateLimitHeaders).toHaveBeenCalled();
  });
});

// ── POST /api/v1/frats ──

describe('POST /api/v1/frats', () => {
  it('returns 403 when apiAccess is read_only', async () => {
    mockVerifySuccess({ apiAccess: 'read_only' });
    mockHasPermission.mockReturnValue(true);
    const { req, res } = createMockReqRes({
      method: 'POST',
      body: { pilot: 'Smith', aircraft: 'PC-12', departure: 'KJFK', destination: 'KLAX' },
    });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Write access requires Enterprise plan' });
  });

  it('creates FRAT with 201 for Enterprise key', async () => {
    const { mockQuery } = mockVerifySuccess({ apiAccess: true });
    mockHasPermission.mockReturnValue(true);
    mockQuery.single = vi.fn().mockResolvedValue({ data: { id: 'frat-new' }, error: null });

    const { req, res } = createMockReqRes({
      method: 'POST',
      body: { pilot: 'Smith', aircraft: 'PC-12', departure: 'KJFK', destination: 'KLAX' },
    });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('returns 400 when required fields missing', async () => {
    mockVerifySuccess({ apiAccess: true });
    mockHasPermission.mockReturnValue(true);
    const { req, res } = createMockReqRes({
      method: 'POST',
      body: { pilot: 'Smith' },
    });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Required fields: pilot, aircraft, departure, destination' });
  });

  it('returns 403 when key lacks frats:write', async () => {
    mockVerifySuccess({ apiAccess: true });
    mockHasPermission.mockReturnValue(false);
    const { req, res } = createMockReqRes({
      method: 'POST',
      body: { pilot: 'Smith', aircraft: 'PC-12', departure: 'KJFK', destination: 'KLAX' },
    });
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

  it('returns 405 for DELETE', async () => {
    mockVerifySuccess();
    const { req, res } = createMockReqRes({ method: 'DELETE' });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });
});
