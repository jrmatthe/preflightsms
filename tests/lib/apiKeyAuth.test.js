import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Section 22: API Authentication, Rate Limiting, Tier-Based Access ──

// Mock @supabase/supabase-js
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockLimit = vi.fn();
const mockSingle = vi.fn();
const mockUpdate = vi.fn();
const mockInsert = vi.fn();

function chainBuilder() {
  const b = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: mockSingle,
    update: vi.fn(() => ({ eq: vi.fn(() => ({ then: (cb) => cb() })) })),
    insert: vi.fn(() => ({ then: (cb) => cb() })),
  };
  return b;
}

const mockBuilder = chainBuilder();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table) => {
      if (table === 'api_keys') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue({
                  data: [{
                    id: 'key-1',
                    key_hash: 'expected-hash',
                    org_id: 'org-1',
                    permissions: ['frats:read', 'frats:write'],
                    is_active: true,
                    expires_at: null,
                    created_by: 'user-1',
                  }],
                  error: null,
                }),
              })),
            })),
          })),
          update: vi.fn(() => ({ eq: vi.fn(() => ({ then: (cb) => cb() })) })),
        };
      }
      if (table === 'organizations') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { id: 'org-1', tier: 'enterprise', feature_flags: {} },
                error: null,
              }),
            })),
          })),
        };
      }
      if (table === 'api_request_log') {
        return { insert: vi.fn(() => ({ then: (cb) => cb() })) };
      }
      return mockBuilder;
    }),
  })),
}));

let verifyApiKey, setRateLimitHeaders, logApiRequest, hasPermission;

beforeEach(async () => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
  vi.resetModules();
  const mod = await import('../../lib/apiKeyAuth.js');
  verifyApiKey = mod.verifyApiKey;
  setRateLimitHeaders = mod.setRateLimitHeaders;
  logApiRequest = mod.logApiRequest;
  hasPermission = mod.hasPermission;
});

// ── 22.1 Authentication ──

describe('verifyApiKey()', () => {
  // 22.1.1 Missing auth header
  it('returns error when no Authorization header', async () => {
    const req = { headers: {} };
    const result = await verifyApiKey(req);
    expect(result.error).toMatch(/Missing or invalid API key/);
    expect(result.apiKey).toBeNull();
  });

  // 22.1.1 Non-Bearer auth
  it('returns error for non-Bearer auth', async () => {
    const req = { headers: { authorization: 'Basic abc123' } };
    const result = await verifyApiKey(req);
    expect(result.error).toMatch(/Missing or invalid API key/);
  });

  // 22.1.2 Invalid key format (not pflt_ prefix)
  it('returns error for key without pflt_ prefix', async () => {
    const req = { headers: { authorization: 'Bearer sk_invalid_key' } };
    const result = await verifyApiKey(req);
    expect(result.error).toMatch(/Missing or invalid API key/);
  });

  // Server not configured
  it('returns error when Supabase not configured', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    vi.resetModules();
    const mod = await import('../../lib/apiKeyAuth.js');
    const req = { headers: { authorization: 'Bearer pflt_test123' } };
    const result = await mod.verifyApiKey(req);
    expect(result.error).toMatch(/Server not configured/);
  });
});

// ── 22.2 Rate Limiting ──

describe('setRateLimitHeaders()', () => {
  it('sets X-RateLimit-Limit and X-RateLimit-Remaining headers', () => {
    const res = { setHeader: vi.fn() };
    setRateLimitHeaders(res, { limit: 100, remaining: 95 });
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 100);
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 95);
  });

  it('does nothing when rateLimit is null', () => {
    const res = { setHeader: vi.fn() };
    setRateLimitHeaders(res, null);
    expect(res.setHeader).not.toHaveBeenCalled();
  });

  it('does nothing when rateLimit is undefined', () => {
    const res = { setHeader: vi.fn() };
    setRateLimitHeaders(res, undefined);
    expect(res.setHeader).not.toHaveBeenCalled();
  });
});

// ── 22.4 Permission-Based Access ──

describe('hasPermission()', () => {
  // 22.4.1 Key with matching permission
  it('returns true when API key has the requested permission', () => {
    const apiKey = { permissions: ['frats:read', 'frats:write', 'fleet:read'] };
    expect(hasPermission(apiKey, 'frats:read')).toBe(true);
  });

  // 22.4.2 Key without matching permission
  it('returns false when API key lacks the requested permission', () => {
    const apiKey = { permissions: ['fleet:read'] };
    expect(hasPermission(apiKey, 'frats:read')).toBe(false);
  });

  it('returns false when permissions array is empty', () => {
    const apiKey = { permissions: [] };
    expect(hasPermission(apiKey, 'frats:read')).toBe(false);
  });

  it('returns false when permissions is null/undefined', () => {
    expect(hasPermission({ permissions: null }, 'frats:read')).toBe(false);
    expect(hasPermission({}, 'frats:read')).toBe(false);
  });

  it('handles multiple permission strings', () => {
    const apiKey = { permissions: ['frats:read', 'reports:read', 'users:read', 'fleet:read', 'training:read'] };
    expect(hasPermission(apiKey, 'frats:read')).toBe(true);
    expect(hasPermission(apiKey, 'reports:read')).toBe(true);
    expect(hasPermission(apiKey, 'frats:write')).toBe(false);
  });
});

// ── logApiRequest() ──

describe('logApiRequest()', () => {
  it('inserts a log entry with correct fields', () => {
    const mockFrom = vi.fn(() => ({
      insert: vi.fn(() => ({ then: vi.fn() })),
    }));
    const supabase = { from: mockFrom };
    logApiRequest(supabase, 'key-1', 'org-1', 'GET', '/api/v1/frats', 200, Date.now() - 50);
    expect(mockFrom).toHaveBeenCalledWith('api_request_log');
  });

  it('calculates response_time_ms from startTime', () => {
    const insertMock = vi.fn(() => ({ then: vi.fn() }));
    const supabase = { from: vi.fn(() => ({ insert: insertMock })) };
    const startTime = Date.now() - 100;
    logApiRequest(supabase, 'key-1', 'org-1', 'GET', '/api/v1/frats', 200, startTime);
    const insertedData = insertMock.mock.calls[0][0];
    expect(insertedData.response_time_ms).toBeGreaterThanOrEqual(0);
    expect(insertedData.method).toBe('GET');
    expect(insertedData.path).toBe('/api/v1/frats');
    expect(insertedData.status_code).toBe(200);
  });
});
