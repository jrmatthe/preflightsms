// Reusable Supabase client mock for testing
import { vi } from 'vitest';

// Build a chainable query builder mock
export function createMockQueryBuilder(resolvedValue = { data: null, error: null }) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(resolvedValue),
    maybeSingle: vi.fn().mockResolvedValue(resolvedValue),
    then: vi.fn((resolve) => resolve(resolvedValue)),
  };
  // Make the builder itself a thenable so `await builder.eq(...)` works
  builder[Symbol.for('vitest:thenable')] = true;
  // Ensure the final call in a chain resolves
  Object.keys(builder).forEach(key => {
    if (typeof builder[key] === 'function' && key !== 'single' && key !== 'then') {
      const original = builder[key];
      builder[key] = vi.fn((...args) => {
        original(...args);
        return builder;
      });
    }
  });
  return builder;
}

export function createMockSupabaseClient() {
  const defaultBuilder = createMockQueryBuilder();

  const client = {
    from: vi.fn(() => defaultBuilder),
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      admin: {
        listUsers: vi.fn(),
        updateUserById: vi.fn(),
        deleteUser: vi.fn(),
      },
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://example.com/file.jpg' } })),
      })),
    },
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    _builder: defaultBuilder,
  };

  return client;
}

// Create mock Next.js API req/res
export function createMockReqRes(options = {}) {
  const req = {
    method: options.method || 'POST',
    body: options.body || {},
    query: options.query || {},
    headers: options.headers || {},
  };

  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
    _getStatus: () => res.status.mock.calls[0]?.[0],
    _getJson: () => res.json.mock.calls[0]?.[0],
  };

  return { req, res };
}
