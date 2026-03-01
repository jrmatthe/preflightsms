import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockReqRes } from '../mocks/supabase.js';

vi.mock('../../lib/apiAuth', () => ({
  verifyAuth: vi.fn().mockResolvedValue({ user: { id: 'user-1' }, error: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        then: (resolve) => resolve({ data: [], error: null }),
      };
      return chain;
    }),
  })),
}));

let handler;

beforeEach(async () => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
  process.env.CRON_SECRET = 'test-cron-secret';
  vi.resetModules();
  const mod = await import('../../pages/api/check-notifications.js');
  handler = mod.default;
});

describe('/api/check-notifications', () => {
  it('rejects requests without cron secret or orgId', async () => {
    const { req, res } = createMockReqRes({
      headers: {},
      query: {},
    });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('accepts cron secret for full-org sweep', async () => {
    const { req, res } = createMockReqRes({
      headers: { 'x-cron-secret': 'test-cron-secret' },
    });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  // GET is allowed (Vercel Cron uses GET)
  it('accepts GET requests with valid cron secret', async () => {
    const { req, res } = createMockReqRes({
      method: 'GET',
      headers: { 'x-cron-secret': 'test-cron-secret' },
    });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('accepts orgId parameter with valid auth for single-org check', async () => {
    const { req, res } = createMockReqRes({
      query: { orgId: 'org-123' },
      headers: { authorization: 'Bearer valid-token' },
    });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  // FIXED: orgId mode now requires Supabase auth token
  it('FIXED: orgId mode rejects unauthenticated requests', async () => {
    const { verifyAuth } = await import('../../lib/apiAuth');
    verifyAuth.mockResolvedValueOnce({ user: null, error: 'Unauthorized' });

    const { req, res } = createMockReqRes({
      query: { orgId: 'org-123' },
      headers: {}, // No auth
    });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns result counts', async () => {
    const { req, res } = createMockReqRes({
      headers: { 'x-cron-secret': 'test-cron-secret' },
    });
    await handler(req, res);
    const json = res.json.mock.calls[0][0];
    expect(json.results).toBeDefined();
    expect(json.results).toHaveProperty('training_expiring');
    expect(json.results).toHaveProperty('action_overdue');
    expect(json.results).toHaveProperty('action_due_soon');
  });
});
