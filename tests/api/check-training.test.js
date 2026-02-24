import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockReqRes } from '../mocks/supabase.js';

const mockFromData = {};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table) => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        then: (resolve) => resolve(mockFromData[table] || { data: [], error: null }),
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
  process.env.RESEND_API_KEY = 'test-resend-key';
  globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => ({}) });
  vi.resetModules();
  const mod = await import('../../pages/api/check-training.js');
  handler = mod.default;
});

describe('POST /api/check-training', () => {
  it('rejects unauthorized requests', async () => {
    const { req, res } = createMockReqRes({
      headers: { 'x-cron-secret': 'wrong' },
    });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 500 when RESEND_API_KEY not set', async () => {
    delete process.env.RESEND_API_KEY;
    vi.resetModules();
    const mod = await import('../../pages/api/check-training.js');
    const { req, res } = createMockReqRes({
      headers: { 'x-cron-secret': 'test-cron-secret' },
    });
    await mod.default(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('returns success when no expiring records', async () => {
    mockFromData.training_records = { data: [], error: null };
    const { req, res } = createMockReqRes({
      headers: { 'x-cron-secret': 'test-cron-secret' },
    });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('No expiring'),
    }));
  });

  // BUG: Same auth bypass as check-overdue when CRON_SECRET is not set
  it('BUG: bypasses auth when CRON_SECRET env var is empty', async () => {
    delete process.env.CRON_SECRET;
    vi.resetModules();
    const mod = await import('../../pages/api/check-training.js');
    const { req, res } = createMockReqRes({
      headers: { 'x-cron-secret': 'anything' },
    });
    await mod.default(req, res);
    expect(res.status).not.toHaveBeenCalledWith(401);
  });

  // BUG: reset=true is destructive without additional safeguard
  it('reset=true clears all expiry_notified_at flags', async () => {
    const { req, res } = createMockReqRes({
      query: { secret: 'test-cron-secret', reset: 'true' },
      headers: {},
    });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('Reset'),
    }));
  });
});
