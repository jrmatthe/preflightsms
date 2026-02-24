import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockReqRes } from '../mocks/supabase.js';

const mockListUsers = vi.fn();
const mockUpdateUserById = vi.fn();
const mockUpsert = vi.fn();
const mockInvitationQuery = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table) => {
      if (table === 'invitations') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: mockInvitationQuery,
            }),
          }),
        };
      }
      return {
        upsert: (...args) => { mockUpsert(...args); return { then: (r) => r({ error: null }) }; },
      };
    }),
    auth: {
      admin: {
        listUsers: mockListUsers,
        updateUserById: mockUpdateUserById,
      },
    },
  })),
}));

let handler;

beforeEach(async () => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
  vi.resetModules();
  const mod = await import('../../pages/api/rejoin-org.js');
  handler = mod.default;
});

describe('POST /api/rejoin-org', () => {
  it('rejects non-POST methods', async () => {
    const { req, res } = createMockReqRes({ method: 'GET' });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('validates required fields', async () => {
    const { req, res } = createMockReqRes({
      body: { email: 'test@test.com' },
    });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.stringContaining('Missing required fields'),
    }));
  });

  it('returns 401 when no invitation token provided', async () => {
    const { req, res } = createMockReqRes({
      body: { email: 'test@test.com', password: 'pass', orgId: 'org-1' },
    });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'Missing invitation token',
    }));
  });

  it('returns 401 when invitation token is invalid', async () => {
    mockInvitationQuery.mockResolvedValue({ data: null, error: { message: 'Not found' } });
    const { req, res } = createMockReqRes({
      body: { email: 'test@test.com', password: 'pass', orgId: 'org-1', invitationToken: 'bad-token' },
    });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'Invalid invitation token',
    }));
  });

  it('returns 401 when invitation is not pending', async () => {
    mockInvitationQuery.mockResolvedValue({
      data: { id: 'inv-1', email: 'test@test.com', org_id: 'org-1', status: 'accepted' },
      error: null,
    });
    const { req, res } = createMockReqRes({
      body: { email: 'test@test.com', password: 'pass', orgId: 'org-1', invitationToken: 'some-token' },
    });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'Invitation is no longer pending',
    }));
  });

  it('returns 401 when email does not match invitation', async () => {
    mockInvitationQuery.mockResolvedValue({
      data: { id: 'inv-1', email: 'other@test.com', org_id: 'org-1', status: 'pending' },
      error: null,
    });
    const { req, res } = createMockReqRes({
      body: { email: 'test@test.com', password: 'pass', orgId: 'org-1', invitationToken: 'valid-token' },
    });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'Email does not match invitation',
    }));
  });

  it('returns 401 when org does not match invitation', async () => {
    mockInvitationQuery.mockResolvedValue({
      data: { id: 'inv-1', email: 'test@test.com', org_id: 'org-2', status: 'pending' },
      error: null,
    });
    const { req, res } = createMockReqRes({
      body: { email: 'test@test.com', password: 'pass', orgId: 'org-1', invitationToken: 'valid-token' },
    });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'Organization does not match invitation',
    }));
  });

  it('proceeds when invitation is valid and matching', async () => {
    mockInvitationQuery.mockResolvedValue({
      data: { id: 'inv-1', email: 'test@test.com', org_id: 'org-1', status: 'pending' },
      error: null,
    });
    mockListUsers.mockResolvedValue({
      data: { users: [{ id: 'user-1', email: 'test@test.com' }] },
      error: null,
    });
    mockUpdateUserById.mockResolvedValue({ error: null });

    const { req, res } = createMockReqRes({
      body: { email: 'test@test.com', password: 'newpass', orgId: 'org-1', invitationToken: 'valid-token' },
    });
    await handler(req, res);
    // FIXED: listUsers now uses filtered lookup instead of fetching all users
    expect(mockListUsers).toHaveBeenCalledWith({ page: 1, perPage: 1, filter: 'test@test.com' });
    expect(mockUpdateUserById).toHaveBeenCalledWith('user-1', { password: 'newpass' });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('returns 404 when user not found after valid invitation (empty result)', async () => {
    mockInvitationQuery.mockResolvedValue({
      data: { id: 'inv-1', email: 'missing@test.com', org_id: 'org-1', status: 'pending' },
      error: null,
    });
    // FIXED: With filtered listUsers, an unknown email returns empty array
    mockListUsers.mockResolvedValue({
      data: { users: [] },
      error: null,
    });
    const { req, res } = createMockReqRes({
      body: { email: 'missing@test.com', password: 'pass', orgId: 'org-1', invitationToken: 'valid-token' },
    });
    await handler(req, res);
    expect(mockListUsers).toHaveBeenCalledWith({ page: 1, perPage: 1, filter: 'missing@test.com' });
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 404 when filtered user email does not exactly match', async () => {
    mockInvitationQuery.mockResolvedValue({
      data: { id: 'inv-1', email: 'partial@test.com', org_id: 'org-1', status: 'pending' },
      error: null,
    });
    // Filter might return a partial match; code checks exact email equality
    mockListUsers.mockResolvedValue({
      data: { users: [{ id: 'other', email: 'partial-match@test.com' }] },
      error: null,
    });
    const { req, res } = createMockReqRes({
      body: { email: 'partial@test.com', password: 'pass', orgId: 'org-1', invitationToken: 'valid-token' },
    });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  // FIXED: Unauthenticated password reset is now blocked
  it('FIXED: blocks unauthenticated password reset without invitation token', async () => {
    mockListUsers.mockResolvedValue({
      data: { users: [{ id: 'user-1', email: 'victim@test.com' }] },
      error: null,
    });
    mockUpdateUserById.mockResolvedValue({ error: null });

    const { req, res } = createMockReqRes({
      body: { email: 'victim@test.com', password: 'hacked123', orgId: 'org-1' },
      headers: {},
    });
    await handler(req, res);
    // Now blocked — requires invitationToken
    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockUpdateUserById).not.toHaveBeenCalled();
  });
});
