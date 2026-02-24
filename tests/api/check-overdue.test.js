import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockReqRes } from '../mocks/supabase.js';

// Track mock calls
const mockFromCalls = {};
const mockUpdate = vi.fn();
const mockSelect = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table) => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        update: vi.fn((...args) => { mockUpdate(table, ...args); return chain; }),
        insert: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        then: (resolve) => {
          if (table === 'flights') {
            return resolve({ data: [], error: null });
          }
          if (table === 'notification_contacts') {
            return resolve({ data: [], error: null });
          }
          if (table === 'profiles') {
            return resolve({ data: [], error: null });
          }
          return resolve({ data: null, error: null });
        },
      };
      mockFromCalls[table] = chain;
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
  process.env.RESEND_API_KEY = 'test-resend-key';
  vi.resetModules();
  const mod = await import('../../pages/api/check-overdue.js');
  handler = mod.default;
});

describe('POST /api/check-overdue', () => {
  it('rejects requests without valid cron secret', async () => {
    const { req, res } = createMockReqRes({
      headers: { 'x-cron-secret': 'wrong-secret' },
    });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('accepts cron secret from header', async () => {
    const { req, res } = createMockReqRes({
      headers: { 'x-cron-secret': 'test-cron-secret' },
    });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('accepts cron secret from query parameter', async () => {
    const { req, res } = createMockReqRes({
      query: { secret: 'test-cron-secret' },
      headers: {},
    });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  // FIXED: When CRON_SECRET is not set, requests are now rejected
  it('FIXED: rejects requests when CRON_SECRET env var is empty', async () => {
    delete process.env.CRON_SECRET;
    vi.resetModules();
    const mod = await import('../../pages/api/check-overdue.js');
    const { req, res } = createMockReqRes({
      headers: { 'x-cron-secret': 'anything' },
    });
    await mod.default(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 500 when Supabase not configured', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    vi.resetModules();
    const mod = await import('../../pages/api/check-overdue.js');
    const { req, res } = createMockReqRes({
      headers: { 'x-cron-secret': 'test-cron-secret' },
    });
    await mod.default(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('returns 500 when no notification provider configured', async () => {
    delete process.env.RESEND_API_KEY;
    vi.resetModules();
    const mod = await import('../../pages/api/check-overdue.js');
    const { req, res } = createMockReqRes({
      headers: { 'x-cron-secret': 'test-cron-secret' },
    });
    await mod.default(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.stringContaining('No notification provider'),
    }));
  });

  it('returns success with "No overdue flights" when none found', async () => {
    const { req, res } = createMockReqRes({
      headers: { 'x-cron-secret': 'test-cron-secret' },
    });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('No overdue flights'),
    }));
  });

  // FIXED: Now rejects non-POST methods with 405
  it('FIXED: rejects non-POST methods', async () => {
    const { req, res } = createMockReqRes({
      method: 'GET',
      headers: { 'x-cron-secret': 'test-cron-secret' },
    });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  // FIXED: reset=true is now disabled and returns 403
  it('FIXED: reset=true returns 403 instead of resetting', async () => {
    const { req, res } = createMockReqRes({
      query: { secret: 'test-cron-secret', reset: 'true' },
      headers: {},
    });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.stringContaining('disabled'),
    }));
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
