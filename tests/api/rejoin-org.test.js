import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockReqRes } from '../mocks/supabase.js';

const mockListUsers = vi.fn();
const mockUpdateUserById = vi.fn();
const mockUpsert = vi.fn();
const mockSelect = vi.fn();
const mockSingle = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      upsert: (...args) => { mockUpsert(...args); return { then: (r) => r({ error: null }) }; },
    })),
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

  it('returns 404 when user not found', async () => {
    mockListUsers.mockResolvedValue({
      data: { users: [{ id: 'other', email: 'other@test.com' }] },
      error: null,
    });
    const { req, res } = createMockReqRes({
      body: { email: 'missing@test.com', password: 'pass', orgId: 'org-1' },
    });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('finds user by email (case-insensitive match)', async () => {
    mockListUsers.mockResolvedValue({
      data: { users: [{ id: 'user-1', email: 'test@test.com' }] },
      error: null,
    });
    mockUpdateUserById.mockResolvedValue({ error: null });

    const { req, res } = createMockReqRes({
      body: { email: '  Test@TEST.com  ', password: 'newpass', orgId: 'org-1' },
    });
    await handler(req, res);
    // BUG: The code does user.email === email.toLowerCase().trim()
    // But listUsers returns the stored email. If stored email has mixed case,
    // the comparison fails because it compares stored email against lowercased input.
    // This works only if Supabase stores emails lowercase.
  });

  // BUG: No authentication — anyone who knows an email can reset their password
  it('BUG: unauthenticated endpoint allows password reset for any known email', async () => {
    mockListUsers.mockResolvedValue({
      data: { users: [{ id: 'user-1', email: 'victim@test.com' }] },
      error: null,
    });
    mockUpdateUserById.mockResolvedValue({ error: null });

    const { req, res } = createMockReqRes({
      body: { email: 'victim@test.com', password: 'hacked123', orgId: 'org-1' },
      headers: {}, // No auth
    });
    await handler(req, res);
    // Successfully changes the user's password without any verification
    expect(mockUpdateUserById).toHaveBeenCalled();
  });

  // BUG: listUsers() fetches ALL users from auth — expensive and doesn't scale
  it('BUG: listUsers fetches entire user table to find one user', async () => {
    mockListUsers.mockResolvedValue({
      data: { users: [] },
      error: null,
    });
    const { req, res } = createMockReqRes({
      body: { email: 'test@test.com', password: 'pass', orgId: 'org-1' },
    });
    await handler(req, res);
    // Calls listUsers() without any filter — fetches all users
    expect(mockListUsers).toHaveBeenCalledWith();
  });
});
