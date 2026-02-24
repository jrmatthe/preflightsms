import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockReqRes } from '../mocks/supabase.js';

// Mock @supabase/supabase-js
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockSingle = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: (...args) => { mockInsert(...args); return { select: (...a) => { mockSelect(...a); return { single: mockSingle }; } }; },
    })),
  })),
}));

let handler;

beforeEach(async () => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
  vi.resetModules();
  const mod = await import('../../pages/api/create-org.js');
  handler = mod.default;
});

describe('POST /api/create-org', () => {
  it('rejects non-POST methods', async () => {
    const { req, res } = createMockReqRes({ method: 'GET' });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('returns 500 when Supabase not configured', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    vi.resetModules();
    const mod = await import('../../pages/api/create-org.js');
    const { req, res } = createMockReqRes({ body: { name: 'Test', slug: 'test' } });
    await mod.default(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('validates name and slug are required', async () => {
    const { req, res } = createMockReqRes({ body: { name: '' } });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('validates slug is required', async () => {
    const { req, res } = createMockReqRes({ body: { name: 'Test Org' } });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('creates org with defaults for missing optional fields', async () => {
    mockSingle.mockResolvedValue({ data: { id: 'org-1', name: 'Test', slug: 'test' }, error: null });
    const { req, res } = createMockReqRes({
      body: { name: 'Test Org', slug: 'test-org' },
    });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Test Org',
      slug: 'test-org',
      tier: 'starter',
      subscription_status: 'trial',
      max_aircraft: 5,
    }));
  });

  it('passes custom tier and feature_flags', async () => {
    mockSingle.mockResolvedValue({ data: { id: 'org-2' }, error: null });
    const { req, res } = createMockReqRes({
      body: {
        name: 'Pro Org', slug: 'pro-org',
        tier: 'professional', feature_flags: { cbt_modules: true },
        subscription_status: 'active', max_aircraft: 15,
      },
    });
    await handler(req, res);
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
      tier: 'professional',
      feature_flags: { cbt_modules: true },
      subscription_status: 'active',
      max_aircraft: 15,
    }));
  });

  it('returns 400 on database error', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'duplicate slug' } });
    const { req, res } = createMockReqRes({
      body: { name: 'Dup', slug: 'existing-slug' },
    });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  // BUG: No authentication check — anyone can create an org without being logged in
  it('BUG: allows unauthenticated org creation', async () => {
    mockSingle.mockResolvedValue({ data: { id: 'org-3' }, error: null });
    const { req, res } = createMockReqRes({
      body: { name: 'Unauth Org', slug: 'unauth' },
      headers: {}, // No auth headers
    });
    await handler(req, res);
    // This succeeds despite no authentication
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
