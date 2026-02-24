import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockReqRes } from '../mocks/supabase.js';

const mockProfiles = vi.fn();
const mockCallerProfile = vi.fn();
const mockGetUser = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table) => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        single: vi.fn().mockImplementation(() => {
          // Return caller profile when queried with id + org_id
          return Promise.resolve(mockCallerProfile());
        }),
        then: (resolve) => {
          if (table === 'profiles') return resolve({ data: mockProfiles(), error: null });
          return resolve({ data: [], error: null });
        },
      };
      return chain;
    }),
    auth: {
      getUser: mockGetUser,
    },
  })),
}));

let handler;

beforeEach(async () => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
  process.env.RESEND_API_KEY = 'test-resend-key';
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'pilot@test.com' } }, error: null });
  mockCallerProfile.mockReturnValue({ data: { id: 'user-1', org_id: 'org-1' }, error: null });
  globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => ({}) });
  vi.resetModules();
  const mod = await import('../../pages/api/request-approval.js');
  handler = mod.default;
});

describe('POST /api/request-approval', () => {
  it('rejects non-POST methods', async () => {
    const { req, res } = createMockReqRes({ method: 'GET' });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('returns 401 when no auth token provided', async () => {
    const { req, res } = createMockReqRes({
      body: { orgId: 'org-1' },
      headers: {},
    });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 401 when auth token is invalid', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Invalid token' } });
    vi.resetModules();
    const mod = await import('../../pages/api/request-approval.js');
    const { req, res } = createMockReqRes({
      body: { orgId: 'org-1' },
      headers: { authorization: 'Bearer bad-token' },
    });
    await mod.default(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 403 when caller is not a member of the org', async () => {
    mockCallerProfile.mockReturnValue({ data: null, error: { message: 'Not found' } });
    const { req, res } = createMockReqRes({
      body: { orgId: 'org-1', fratCode: 'FRAT-001', pilot: 'John', aircraft: 'PC-12', score: 40, riskLevel: 'HIGH RISK' },
      headers: { authorization: 'Bearer valid-token' },
    });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 500 when Resend not configured', async () => {
    delete process.env.RESEND_API_KEY;
    vi.resetModules();
    const mod = await import('../../pages/api/request-approval.js');
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    const { req, res } = createMockReqRes({
      body: { orgId: 'org-1' },
      headers: { authorization: 'Bearer valid-token' },
    });
    await mod.default(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('returns sent: 0 when no approvers found', async () => {
    mockProfiles.mockReturnValue([
      { id: 'u1', full_name: 'Pilot', email: 'pilot@test.com', role: 'pilot', permissions: [] },
    ]);
    const { req, res } = createMockReqRes({
      body: { orgId: 'org-1', fratCode: 'FRAT-001', pilot: 'John', aircraft: 'PC-12' },
      headers: { authorization: 'Bearer valid-token' },
    });
    await handler(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ sent: 0 }));
  });

  it('sends emails to admin, safety_manager, and chief_pilot roles', async () => {
    mockProfiles.mockReturnValue([
      { id: 'u1', full_name: 'Admin', email: 'admin@test.com', role: 'admin', permissions: [] },
      { id: 'u2', full_name: 'Safety', email: 'safety@test.com', role: 'safety_manager', permissions: [] },
      { id: 'u3', full_name: 'Chief', email: 'chief@test.com', role: 'chief_pilot', permissions: [] },
      { id: 'u4', full_name: 'Pilot', email: 'pilot@test.com', role: 'pilot', permissions: [] },
    ]);
    const { req, res } = createMockReqRes({
      body: {
        orgId: 'org-1', fratCode: 'FRAT-001', pilot: 'John',
        aircraft: 'PC-12', departure: 'KSFO', destination: 'KLAX',
        score: 45, riskLevel: 'HIGH RISK',
      },
      headers: { authorization: 'Bearer valid-token' },
    });
    await handler(req, res);
    // Should send to admin, safety_manager, chief_pilot (3 emails), not pilot
    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
  });

  it('sends emails to users with approver permission', async () => {
    mockProfiles.mockReturnValue([
      { id: 'u1', full_name: 'Approver', email: 'app@test.com', role: 'pilot', permissions: ['approver'] },
    ]);
    const { req, res } = createMockReqRes({
      body: { orgId: 'org-1', fratCode: 'FRAT-001', pilot: 'John', aircraft: 'PC-12', score: 40, riskLevel: 'HIGH RISK' },
      headers: { authorization: 'Bearer valid-token' },
    });
    await handler(req, res);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  // FIXED: Unauthenticated requests are now blocked
  it('FIXED: blocks unauthenticated approval request emails', async () => {
    mockProfiles.mockReturnValue([
      { id: 'u1', full_name: 'Admin', email: 'admin@test.com', role: 'admin', permissions: [] },
    ]);
    const { req, res } = createMockReqRes({
      body: { orgId: 'org-1', fratCode: 'FRAT-SPAM', pilot: 'Spammer', score: 99, riskLevel: 'CRITICAL' },
      headers: {}, // No auth
    });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
