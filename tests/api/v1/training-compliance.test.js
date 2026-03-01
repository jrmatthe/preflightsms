import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockReqRes } from '../../mocks/supabase.js';

// ── Section 22.5.6: GET /api/v1/training/compliance ──

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
  const mod = await import('../../../pages/api/v1/training/compliance.js');
  handler = mod.default;
});

function mockVerifySuccess(overrides = {}) {
  const profilesQuery = vi.fn(() => Promise.resolve({
    data: [
      { id: 'u1', full_name: 'Pilot A', role: 'pilot' },
      { id: 'u2', full_name: 'Pilot B', role: 'pilot' },
    ],
    error: null,
  }));
  const reqsQuery = vi.fn(() => Promise.resolve({
    data: [
      { id: 'req-1', name: 'Annual Recurrent', org_id: 'org-1', recurrence_months: 12 },
    ],
    error: null,
  }));
  const recsQuery = vi.fn(() => Promise.resolve({
    data: [
      { id: 'rec-1', user_id: 'u1', requirement_id: 'req-1', completed_at: new Date().toISOString() },
    ],
    error: null,
  }));

  const supabase = {
    from: vi.fn((table) => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => {
          if (table === 'profiles') return profilesQuery();
          if (table === 'training_requirements') return reqsQuery();
          if (table === 'training_records') return recsQuery();
          return Promise.resolve({ data: [], error: null });
        }),
      })),
    })),
  };

  mockVerifyApiKey.mockResolvedValue({
    apiKey: { id: 'key-1', permissions: ['training:read'] },
    org: { id: 'org-1', tier: 'professional' },
    supabase,
    rateLimit: { limit: 100, remaining: 99 },
    error: null,
    ...overrides,
  });

  return { supabase };
}

describe('GET /api/v1/training/compliance', () => {
  it('rejects non-GET methods', async () => {
    const { req, res } = createMockReqRes({ method: 'POST' });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('returns 401 without auth', async () => {
    mockVerifyApiKey.mockResolvedValue({ apiKey: null, org: null, error: 'Missing or invalid API key.', status: 401 });
    const { req, res } = createMockReqRes({ method: 'GET' });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 403 without training:read permission', async () => {
    mockVerifySuccess();
    mockHasPermission.mockReturnValue(false);
    const { req, res } = createMockReqRes({ method: 'GET' });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing permission: training:read' });
  });

  it('returns compliance data with correct structure', async () => {
    mockVerifySuccess();
    mockHasPermission.mockReturnValue(true);
    const { req, res } = createMockReqRes({ method: 'GET' });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);

    const responseData = res.json.mock.calls[0][0];
    expect(responseData).toHaveProperty('data');
    expect(Array.isArray(responseData.data)).toBe(true);
    // Should have 2 users
    expect(responseData.data.length).toBe(2);

    // First user has completed the requirement
    const user1 = responseData.data.find(u => u.user_id === 'u1');
    expect(user1).toBeDefined();
    expect(user1.full_name).toBe('Pilot A');
    expect(user1.total_requirements).toBe(1);
    expect(user1.completed).toBe(1);
    expect(user1.compliance_pct).toBe(100);

    // Second user has not completed
    const user2 = responseData.data.find(u => u.user_id === 'u2');
    expect(user2).toBeDefined();
    expect(user2.completed).toBe(0);
    expect(user2.compliance_pct).toBe(0);
  });

  it('returns 100% compliance when no requirements exist', async () => {
    const supabase = {
      from: vi.fn((table) => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => {
            if (table === 'profiles') return Promise.resolve({ data: [{ id: 'u1', full_name: 'Pilot A', role: 'pilot' }], error: null });
            if (table === 'training_requirements') return Promise.resolve({ data: [], error: null });
            if (table === 'training_records') return Promise.resolve({ data: [], error: null });
            return Promise.resolve({ data: [], error: null });
          }),
        })),
      })),
    };
    mockVerifyApiKey.mockResolvedValue({
      apiKey: { id: 'key-1', permissions: ['training:read'] },
      org: { id: 'org-1' },
      supabase,
      rateLimit: { limit: 100, remaining: 99 },
      error: null,
    });
    mockHasPermission.mockReturnValue(true);

    const { req, res } = createMockReqRes({ method: 'GET' });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);

    const data = res.json.mock.calls[0][0].data;
    expect(data[0].compliance_pct).toBe(100);
  });
});
