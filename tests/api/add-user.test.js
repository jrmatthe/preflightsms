import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockReqRes } from '../mocks/supabase.js';

const mockProfilesSingle = vi.fn(); // caller profile, then existing-member check
const mockInvDupe = vi.fn();        // pending-invite dupe check
const mockInvInsert = vi.fn();      // captures the invitation insert payload
const mockCreateUser = vi.fn();     // MUST NOT be called by the invite path
const mockGetUser = vi.fn();        // verifyAuth

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table) => {
      if (table === 'profiles') {
        const chain = { select: vi.fn(() => chain), eq: vi.fn(() => chain), single: () => Promise.resolve(mockProfilesSingle()) };
        return chain;
      }
      if (table === 'invitations') {
        const chain = {
          select: vi.fn(() => chain),
          eq: vi.fn(() => chain),
          single: () => Promise.resolve(mockInvDupe()),
          insert: vi.fn((payload) => {
            mockInvInsert(payload);
            return { select: vi.fn(() => ({ single: () => Promise.resolve({ data: { token: 'tok-123' }, error: null }) })) };
          }),
        };
        return chain;
      }
      if (table === 'organizations') {
        const chain = { select: vi.fn(() => chain), eq: vi.fn(() => chain), single: () => Promise.resolve({ data: { name: 'PVTAIR' }, error: null }) };
        return chain;
      }
      return {};
    }),
    auth: { getUser: mockGetUser, admin: { createUser: mockCreateUser } },
  })),
}));

let handler;

beforeEach(async () => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
  process.env.RESEND_API_KEY = 'test-resend-key';
  mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1', email: 'admin@test.com' } }, error: null });
  mockProfilesSingle.mockReturnValueOnce({ data: { id: 'admin-1', org_id: 'org-1', role: 'admin' }, error: null }) // caller
    .mockReturnValueOnce({ data: null, error: { code: 'PGRST116' } }); // no existing member
  mockInvDupe.mockReturnValue({ data: null, error: { code: 'PGRST116' } }); // no pending dupe
  globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => ({ id: 'email-1' }) }); // Resend ok
  vi.resetModules();
  const mod = await import('../../pages/api/add-user.js');
  handler = mod.default;
});

const authHeaders = { authorization: 'Bearer admin-token' };

describe('POST /api/add-user (invite-only)', () => {
  it('rejects non-POST methods', async () => {
    const { req, res } = createMockReqRes({ method: 'GET' });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('returns 401 without an auth token', async () => {
    const { req, res } = createMockReqRes({ body: { email: 'a@b.com', fullName: 'A', orgId: 'org-1' }, headers: {} });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 403 when the caller is not an admin-level role', async () => {
    mockProfilesSingle.mockReset();
    mockProfilesSingle.mockReturnValueOnce({ data: { id: 'admin-1', org_id: 'org-1', role: 'pilot' }, error: null });
    const { req, res } = createMockReqRes({ body: { email: 'a@b.com', fullName: 'A', orgId: 'org-1' }, headers: authHeaders });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockInvInsert).not.toHaveBeenCalled();
  });

  it('creates ONLY an invitation — no auth user, no profile — and returns a token', async () => {
    const { req, res } = createMockReqRes({ body: { email: 'New@Test.com', fullName: 'New User', role: 'safety_manager', permissions: ['approver'], orgId: 'org-1' }, headers: authHeaders });
    await handler(req, res);
    // No account is created at invite time
    expect(mockCreateUser).not.toHaveBeenCalled();
    // Invitation carries role/permissions/full_name + a 30-day expiry, with a normalized email
    expect(mockInvInsert).toHaveBeenCalledWith(expect.objectContaining({
      org_id: 'org-1',
      email: 'new@test.com',
      role: 'safety_manager',
      permissions: ['approver'],
      full_name: 'New User',
    }));
    const [payload] = mockInvInsert.mock.calls[0];
    expect(payload.expires_at).toBeDefined();
    const days = (new Date(payload.expires_at) - Date.now()) / (24 * 60 * 60 * 1000);
    expect(days).toBeGreaterThan(29);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, token: 'tok-123' }));
  });

  it('blocks inviting someone who is already a member', async () => {
    mockProfilesSingle.mockReset();
    mockProfilesSingle.mockReturnValueOnce({ data: { id: 'admin-1', org_id: 'org-1', role: 'admin' }, error: null }) // caller
      .mockReturnValueOnce({ data: { id: 'existing-1' }, error: null }); // existing member found
    const { req, res } = createMockReqRes({ body: { email: 'member@test.com', fullName: 'M', orgId: 'org-1' }, headers: authHeaders });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockInvInsert).not.toHaveBeenCalled();
  });
});
