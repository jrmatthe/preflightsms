import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockReqRes } from '../mocks/supabase.js';

// Mock bcryptjs and jsonwebtoken
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed-password'),
    compare: vi.fn().mockResolvedValue(true),
  },
}));

const mockJwtSign = vi.fn().mockReturnValue('mock-jwt-token');
const mockJwtVerify = vi.fn();
vi.mock('jsonwebtoken', () => ({
  default: {
    sign: (...args) => mockJwtSign(...args),
    verify: (...args) => mockJwtVerify(...args),
  },
}));

// Mock supabase
const mockFromData = {};
const mockSupabase = {
  from: vi.fn((table) => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(mockFromData[table] || { data: null, error: null }),
      then: (resolve) => resolve(mockFromData[table] || { data: [], error: null }),
    };
    return chain;
  }),
  auth: {
    admin: {
      deleteUser: vi.fn().mockResolvedValue({ error: null }),
    },
  },
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

let handler;

beforeEach(async () => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
  process.env.PLATFORM_ADMIN_SECRET = 'test-admin-secret';
  vi.resetModules();
  const mod = await import('../../pages/api/platform-admin.js');
  handler = mod.default;
});

describe('POST /api/platform-admin', () => {
  it('rejects non-POST methods', async () => {
    const { req, res } = createMockReqRes({ method: 'GET' });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('returns 500 when Supabase not configured', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    vi.resetModules();
    const mod = await import('../../pages/api/platform-admin.js');
    const { req, res } = createMockReqRes({ body: { action: 'login' } });
    await mod.default(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('returns 400 for unknown action', async () => {
    const { req, res } = createMockReqRes({
      body: { action: 'unknown_action' },
    });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  // ── SETUP ──
  describe('action: setup', () => {
    it('requires email, password, and name', async () => {
      const { req, res } = createMockReqRes({
        body: { action: 'setup', email: 'admin@test.com' },
      });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ── LOGIN ──
  describe('action: login', () => {
    it('requires email and password', async () => {
      const { req, res } = createMockReqRes({
        body: { action: 'login', email: 'admin@test.com' },
      });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ── VERIFY ──
  describe('action: verify', () => {
    it('returns 401 for invalid token', async () => {
      mockJwtVerify.mockImplementation(() => { throw new Error('invalid'); });
      const { req, res } = createMockReqRes({
        body: { action: 'verify', token: 'bad-token' },
      });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('returns admin claims for valid token', async () => {
      mockJwtVerify.mockReturnValue({ id: 'admin-1', email: 'admin@test.com', name: 'Admin' });
      const { req, res } = createMockReqRes({
        body: { action: 'verify', token: 'valid-token' },
      });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        admin: expect.objectContaining({ email: 'admin@test.com' }),
      }));
    });
  });

  // ── CHECK_SETUP ──
  describe('action: check_setup', () => {
    it('returns needs_setup: true when no admins exist', async () => {
      mockFromData.platform_admins = { data: [], error: null };
      const { req, res } = createMockReqRes({
        body: { action: 'check_setup' },
      });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ── AUTHENTICATED ACTIONS ──
  describe('authenticated actions', () => {
    it('list_admins requires valid token', async () => {
      mockJwtVerify.mockImplementation(() => { throw new Error('invalid'); });
      const { req, res } = createMockReqRes({
        body: { action: 'list_admins', token: 'bad' },
      });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('remove_admin prevents self-removal', async () => {
      mockJwtVerify.mockReturnValue({ id: 'admin-1', email: 'a@b.com', name: 'A' });
      const { req, res } = createMockReqRes({
        body: { action: 'remove_admin', token: 'valid', admin_id: 'admin-1' },
      });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.stringContaining("Can't remove yourself"),
      }));
    });

    it('update_org requires org_id', async () => {
      mockJwtVerify.mockReturnValue({ id: 'admin-1' });
      const { req, res } = createMockReqRes({
        body: { action: 'update_org', token: 'valid', updates: {} },
      });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('delete_org requires org_id', async () => {
      mockJwtVerify.mockReturnValue({ id: 'admin-1' });
      const { req, res } = createMockReqRes({
        body: { action: 'delete_org', token: 'valid' },
      });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('setup rejects password shorter than 8 characters', async () => {
      mockFromData.platform_admins = { data: [], error: null };
      const { req, res } = createMockReqRes({
        body: { action: 'setup', email: 'admin@test.com', password: 'short', name: 'Admin' },
      });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.stringContaining('8 characters'),
      }));
    });

    it('add_admin rejects password shorter than 8 characters', async () => {
      mockJwtVerify.mockReturnValue({ id: 'admin-1', email: 'a@b.com', name: 'A' });
      const { req, res } = createMockReqRes({
        body: { action: 'add_admin', token: 'valid', email: 'new@test.com', password: 'short', name: 'New' },
      });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.stringContaining('8 characters'),
      }));
    });
  });

  // ── SECURITY ──
  describe('Security', () => {
    // FIXED: When PLATFORM_ADMIN_SECRET is not set, authenticated actions are rejected
    it('FIXED: rejects authenticated actions when PLATFORM_ADMIN_SECRET is not set', async () => {
      delete process.env.PLATFORM_ADMIN_SECRET;
      vi.resetModules();
      const mod = await import('../../pages/api/platform-admin.js');
      const { req, res } = createMockReqRes({
        body: { action: 'verify', token: 'any-token' },
      });
      await mod.default(req, res);
      // verifyToken returns null when JWT_SECRET is not set
      expect(res.status).toHaveBeenCalledWith(401);
    });

    // check_setup is intentionally unauthenticated (it's the bootstrap check)
    it('check_setup is unauthenticated — reveals if platform has admins', async () => {
      const { req, res } = createMockReqRes({
        body: { action: 'check_setup' },
      });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
