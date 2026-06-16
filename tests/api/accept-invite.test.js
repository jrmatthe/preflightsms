import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockReqRes } from '../mocks/supabase.js';

const mockInviteSelect = vi.fn();   // result of invitations.select(...).eq('token').maybeSingle()
const mockInviteUpdate = vi.fn();   // captures the consume update payload
const mockProfileUpsert = vi.fn();  // captures the profile upsert
const mockCreateUser = vi.fn();
const mockUpdateUserById = vi.fn();
const mockGetUser = vi.fn();        // used by verifyAuth (only when Authorization header present)

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table) => {
      if (table === 'invitations') {
        return {
          select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: () => Promise.resolve(mockInviteSelect()) })) })),
          update: vi.fn((payload) => {
            mockInviteUpdate(payload);
            return { eq: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })) };
          }),
        };
      }
      if (table === 'profiles') {
        return { upsert: (...args) => { mockProfileUpsert(...args); return Promise.resolve({ error: null }); } };
      }
      return {};
    }),
    auth: {
      getUser: mockGetUser,
      admin: { createUser: mockCreateUser, updateUserById: mockUpdateUserById },
    },
  })),
}));

let handler;
const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
const past = new Date(Date.now() - 1000).toISOString();

beforeEach(async () => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
  mockGetUser.mockResolvedValue({ data: { user: null }, error: 'no token' });
  mockCreateUser.mockResolvedValue({ data: { user: { id: 'new-user-1' } }, error: null });
  mockUpdateUserById.mockResolvedValue({ error: null });
  // Default: no existing auth user (brand-new invitee)
  globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => ({ users: [] }) });
  vi.resetModules();
  const mod = await import('../../pages/api/accept-invite.js');
  handler = mod.default;
});

describe('GET /api/accept-invite (info)', () => {
  it('returns valid info for a pending, unexpired invite', async () => {
    mockInviteSelect.mockReturnValue({ data: { email: 'new@test.com', role: 'pilot', status: 'pending', expires_at: future, organizations: { name: 'PVTAIR' } }, error: null });
    const { req, res } = createMockReqRes({ method: 'GET', query: { token: 't' } });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ valid: true, email: 'new@test.com', role: 'pilot', orgName: 'PVTAIR' }));
  });

  it('marks an expired invite invalid', async () => {
    mockInviteSelect.mockReturnValue({ data: { email: 'new@test.com', role: 'pilot', status: 'pending', expires_at: past, organizations: { name: 'PVTAIR' } }, error: null });
    const { req, res } = createMockReqRes({ method: 'GET', query: { token: 't' } });
    await handler(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ valid: false, reason: 'expired' }));
  });
});

describe('POST /api/accept-invite (accept)', () => {
  it('creates a brand-new account + profile and consumes the invite', async () => {
    mockInviteSelect.mockReturnValue({ data: { id: 'inv-1', org_id: 'org-1', email: 'new@test.com', role: 'safety_manager', permissions: ['approver'], full_name: 'New User', status: 'pending', expires_at: future }, error: null });
    const { req, res } = createMockReqRes({ method: 'POST', body: { token: 't', password: 'password123', fullName: 'New User' } });
    await handler(req, res);
    expect(mockCreateUser).toHaveBeenCalled();
    expect(mockProfileUpsert).toHaveBeenCalled();
    expect(mockInviteUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: 'accepted' }));
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('derives role + permissions from the invitation, NOT the request body (no privilege escalation)', async () => {
    mockInviteSelect.mockReturnValue({ data: { id: 'inv-1', org_id: 'org-1', email: 'new@test.com', role: 'pilot', permissions: [], full_name: 'New User', status: 'pending', expires_at: future }, error: null });
    const { req, res } = createMockReqRes({ method: 'POST', body: { token: 't', password: 'password123', fullName: 'New User', role: 'admin', permissions: ['approver'], orgId: 'attacker-org' } });
    await handler(req, res);
    const [profilePayload] = mockProfileUpsert.mock.calls[0];
    expect(profilePayload.role).toBe('pilot');
    expect(profilePayload.permissions).toEqual([]);
    expect(profilePayload.org_id).toBe('org-1');
  });

  it('rejects an expired invitation (server-side enforcement)', async () => {
    mockInviteSelect.mockReturnValue({ data: { id: 'inv-1', org_id: 'org-1', email: 'new@test.com', role: 'pilot', permissions: [], status: 'pending', expires_at: past }, error: null });
    const { req, res } = createMockReqRes({ method: 'POST', body: { token: 't', password: 'password123', fullName: 'X' } });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(410);
    expect(mockCreateUser).not.toHaveBeenCalled();
    expect(mockInviteUpdate).not.toHaveBeenCalled();
  });

  it('rejects an already-used (non-pending) invitation (single-use)', async () => {
    mockInviteSelect.mockReturnValue({ data: { id: 'inv-1', org_id: 'org-1', email: 'new@test.com', role: 'pilot', permissions: [], status: 'accepted', expires_at: future }, error: null });
    const { req, res } = createMockReqRes({ method: 'POST', body: { token: 't', password: 'password123', fullName: 'X' } });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(410);
    expect(mockCreateUser).not.toHaveBeenCalled();
  });

  it('refuses to password-reset an already-active account (no account takeover)', async () => {
    mockInviteSelect.mockReturnValue({ data: { id: 'inv-1', org_id: 'org-1', email: 'existing@test.com', role: 'pilot', permissions: [], status: 'pending', expires_at: future }, error: null });
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => ({ users: [{ id: 'u9', email: 'existing@test.com', last_sign_in_at: '2026-01-01T00:00:00Z' }] }) });
    const { req, res } = createMockReqRes({ method: 'POST', body: { token: 't', password: 'password123', fullName: 'X' } });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(mockUpdateUserById).not.toHaveBeenCalled();
    expect(mockCreateUser).not.toHaveBeenCalled();
    expect(mockProfileUpsert).not.toHaveBeenCalled();
    expect(mockInviteUpdate).not.toHaveBeenCalled();
  });

  it('sets the password for a never-signed-in shell account (legacy pre-created invite)', async () => {
    mockInviteSelect.mockReturnValue({ data: { id: 'inv-1', org_id: 'org-1', email: 'shell@test.com', role: 'pilot', permissions: [], status: 'pending', expires_at: future }, error: null });
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => ({ users: [{ id: 'u-shell', email: 'shell@test.com', last_sign_in_at: null }] }) });
    const { req, res } = createMockReqRes({ method: 'POST', body: { token: 't', password: 'password123', fullName: 'Shell User' } });
    await handler(req, res);
    expect(mockUpdateUserById).toHaveBeenCalled();
    expect(mockProfileUpsert).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('rejects a short password on the new-user path', async () => {
    mockInviteSelect.mockReturnValue({ data: { id: 'inv-1', org_id: 'org-1', email: 'new@test.com', role: 'pilot', permissions: [], status: 'pending', expires_at: future }, error: null });
    const { req, res } = createMockReqRes({ method: 'POST', body: { token: 't', password: 'short', fullName: 'X' } });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockCreateUser).not.toHaveBeenCalled();
  });

  it('returns 404 for an unknown token', async () => {
    mockInviteSelect.mockReturnValue({ data: null, error: null });
    const { req, res } = createMockReqRes({ method: 'POST', body: { token: 'bad', password: 'password123', fullName: 'X' } });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
