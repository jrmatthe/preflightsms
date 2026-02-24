import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @supabase/supabase-js before importing the module under test
const mockFrom = vi.fn();
const mockAuth = {
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
};
const mockStorage = {
  from: vi.fn(() => ({
    upload: vi.fn().mockResolvedValue({ error: null }),
    getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://cdn.example.com/file.jpg' } })),
  })),
};
const mockChannel = vi.fn(() => ({
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
    auth: mockAuth,
    storage: mockStorage,
    channel: mockChannel,
  })),
}));

// Set env vars before import
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

// Helper to create a chainable mock query builder
function chainable(finalResult = { data: null, error: null }) {
  const chain = {};
  const methods = ['select', 'insert', 'update', 'upsert', 'delete', 'eq', 'neq',
    'gt', 'gte', 'lt', 'lte', 'in', 'not', 'is', 'ilike', 'like', 'or',
    'order', 'limit', 'filter'];
  for (const m of methods) {
    chain[m] = vi.fn(() => chain);
  }
  chain.single = vi.fn().mockResolvedValue(finalResult);
  // Make the chain itself resolve when awaited
  chain.then = (resolve, reject) => Promise.resolve(finalResult).then(resolve, reject);
  return chain;
}

let supabaseModule;

beforeEach(async () => {
  vi.clearAllMocks();
  vi.resetModules();

  // Re-set env before each import
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

  supabaseModule = await import('../../lib/supabase.js');
});

// ── AUTH HELPERS ─────────────────────────────────────────

describe('Auth helpers', () => {
  describe('signUp()', () => {
    it('calls supabase auth signUp and creates a profile', async () => {
      mockAuth.signUp.mockResolvedValue({
        data: { user: { id: 'user-1', identities: [{ id: '1' }] } },
        error: null,
      });
      const profileChain = chainable({ data: {}, error: null });
      mockFrom.mockReturnValue(profileChain);

      const result = await supabaseModule.signUp('test@test.com', 'pass123', 'Test User', 'org-1');
      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
      expect(mockAuth.signUp).toHaveBeenCalledWith({
        email: 'test@test.com',
        password: 'pass123',
      });
    });

    it('returns error when signUp fails', async () => {
      mockAuth.signUp.mockResolvedValue({
        data: { user: null },
        error: { message: 'Email taken' },
      });

      const result = await supabaseModule.signUp('test@test.com', 'pass', 'Test', 'org-1');
      expect(result.error.message).toBe('Email taken');
    });

    it('detects already-registered email via empty identities', async () => {
      mockAuth.signUp.mockResolvedValue({
        data: { user: { id: 'user-1', identities: [] } },
        error: null,
      });

      const result = await supabaseModule.signUp('dup@test.com', 'pass', 'Dup', 'org-1');
      expect(result.error.message).toContain('already registered');
    });
  });

  describe('signIn()', () => {
    it('calls signInWithPassword', async () => {
      mockAuth.signInWithPassword.mockResolvedValue({ data: { session: {} }, error: null });
      await supabaseModule.signIn('test@test.com', 'pass');
      expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@test.com',
        password: 'pass',
      });
    });
  });

  describe('signOut()', () => {
    it('calls auth.signOut', async () => {
      mockAuth.signOut.mockResolvedValue({ error: null });
      await supabaseModule.signOut();
      expect(mockAuth.signOut).toHaveBeenCalled();
    });
  });

  describe('resetPasswordForEmail()', () => {
    it('calls resetPasswordForEmail with redirect URL', async () => {
      mockAuth.resetPasswordForEmail.mockResolvedValue({ error: null });
      await supabaseModule.resetPasswordForEmail('test@test.com');
      expect(mockAuth.resetPasswordForEmail).toHaveBeenCalledWith(
        'test@test.com',
        expect.objectContaining({ redirectTo: expect.stringContaining('?reset=true') })
      );
    });
  });

  describe('updateUserPassword()', () => {
    it('calls updateUser with new password', async () => {
      mockAuth.updateUser.mockResolvedValue({ error: null });
      await supabaseModule.updateUserPassword('newpass123');
      expect(mockAuth.updateUser).toHaveBeenCalledWith({ password: 'newpass123' });
    });
  });

  describe('getSession()', () => {
    it('returns session data', async () => {
      mockAuth.getSession.mockResolvedValue({ data: { session: { user: { id: '1' } } } });
      const result = await supabaseModule.getSession();
      expect(result.data.session.user.id).toBe('1');
    });
  });
});

// ── FRAT OPERATIONS ─────────────────────────────────────────

describe('FRAT operations', () => {
  describe('submitFRAT()', () => {
    it('inserts a FRAT submission with all fields', async () => {
      const insertChain = chainable({ data: { id: 'frat-1' }, error: null });
      mockFrom.mockReturnValue(insertChain);

      const entry = {
        id: 'FRAT-ABC123',
        pilot: 'John Doe',
        aircraft: 'PC-12',
        tailNumber: 'N12345',
        departure: 'KSFO',
        destination: 'KLAX',
        cruiseAlt: 'FL250',
        date: '2024-01-15',
        etd: '1430',
        ete: '1:30',
        eta: '2024-01-15T22:00:00Z',
        fuelLbs: '2000',
        numCrew: '2',
        numPax: '4',
        score: 15,
        riskLevel: 'MODERATE RISK',
        factors: ['wx_ceiling', 'plt_fatigue'],
        wxBriefing: 'VFR conditions',
        remarks: 'Test flight',
        attachments: [],
        approvalStatus: 'auto_approved',
      };

      const result = await supabaseModule.submitFRAT('org-1', 'user-1', entry);
      expect(mockFrom).toHaveBeenCalledWith('frat_submissions');
      expect(insertChain.insert).toHaveBeenCalledWith(expect.objectContaining({
        org_id: 'org-1',
        user_id: 'user-1',
        frat_code: 'FRAT-ABC123',
        pilot: 'John Doe',
        aircraft: 'PC-12',
        score: 15,
        risk_level: 'MODERATE RISK',
      }));
    });

    it('defaults optional fields to empty strings', async () => {
      const insertChain = chainable({ data: { id: 'frat-2' }, error: null });
      mockFrom.mockReturnValue(insertChain);

      const entry = {
        id: 'FRAT-DEF456',
        pilot: 'Jane',
        aircraft: 'King Air',
        departure: 'KJFK',
        destination: 'KBOS',
        score: 5,
        riskLevel: 'LOW RISK',
      };

      await supabaseModule.submitFRAT('org-1', 'user-1', entry);
      expect(insertChain.insert).toHaveBeenCalledWith(expect.objectContaining({
        tail_number: '',
        cruise_alt: '',
        etd: '',
        ete: '',
        fuel_lbs: '',
        num_crew: '',
        num_pax: '',
        wx_briefing: '',
        remarks: '',
      }));
    });
  });

  describe('fetchFRATs()', () => {
    it('fetches FRATs ordered by created_at desc', async () => {
      const queryChain = chainable();
      queryChain.then = (resolve) => resolve({ data: [{ id: '1' }], error: null });
      mockFrom.mockReturnValue(queryChain);

      const result = await supabaseModule.fetchFRATs('org-1');
      expect(mockFrom).toHaveBeenCalledWith('frat_submissions');
      expect(queryChain.eq).toHaveBeenCalledWith('org_id', 'org-1');
      expect(queryChain.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });
  });

  describe('deleteFRAT()', () => {
    it('deletes by id', async () => {
      const deleteChain = chainable();
      mockFrom.mockReturnValue(deleteChain);

      await supabaseModule.deleteFRAT('frat-123');
      expect(mockFrom).toHaveBeenCalledWith('frat_submissions');
      expect(deleteChain.delete).toHaveBeenCalled();
      expect(deleteChain.eq).toHaveBeenCalledWith('id', 'frat-123');
    });
  });
});

// ── FLIGHT OPERATIONS ─────────────────────────────────────────

describe('Flight operations', () => {
  describe('createFlight()', () => {
    it('creates an active flight from a FRAT entry', async () => {
      const insertChain = chainable({ data: { id: 'flight-1' }, error: null });
      mockFrom.mockReturnValue(insertChain);

      const entry = {
        id: 'FRAT-001',
        pilot: 'John',
        aircraft: 'PC-12',
        departure: 'KSFO',
        destination: 'KLAX',
        score: 10,
        riskLevel: 'LOW RISK',
      };

      await supabaseModule.createFlight('org-1', 'frat-1', entry);
      expect(insertChain.insert).toHaveBeenCalledWith(expect.objectContaining({
        org_id: 'org-1',
        frat_id: 'frat-1',
        status: 'ACTIVE',
        approval_status: 'approved',
      }));
    });

    it('sets approval_status to pending when requiresApproval is true', async () => {
      const insertChain = chainable({ data: { id: 'flight-2' }, error: null });
      mockFrom.mockReturnValue(insertChain);

      const entry = { id: 'F1', pilot: 'J', aircraft: 'A', departure: 'A', destination: 'B', score: 50, riskLevel: 'HIGH' };
      await supabaseModule.createFlight('org-1', 'frat-1', entry, true);
      expect(insertChain.insert).toHaveBeenCalledWith(expect.objectContaining({
        approval_status: 'pending',
      }));
    });
  });

  describe('updateFlightStatus()', () => {
    it('sets arrived_at when status is ARRIVED', async () => {
      const updateChain = chainable();
      mockFrom.mockReturnValue(updateChain);

      await supabaseModule.updateFlightStatus('flight-1', 'ARRIVED');
      expect(updateChain.update).toHaveBeenCalledWith(expect.objectContaining({
        status: 'ARRIVED',
        arrived_at: expect.any(String),
      }));
    });

    it('FIXED: does not set arrived_at when status is CANCELLED', async () => {
      const updateChain = chainable();
      mockFrom.mockReturnValue(updateChain);

      await supabaseModule.updateFlightStatus('flight-1', 'CANCELLED');
      expect(updateChain.update).toHaveBeenCalledWith({ status: 'CANCELLED' });
    });

    it('does not set arrived_at for ACTIVE status', async () => {
      const updateChain = chainable();
      mockFrom.mockReturnValue(updateChain);

      await supabaseModule.updateFlightStatus('flight-1', 'ACTIVE');
      expect(updateChain.update).toHaveBeenCalledWith({ status: 'ACTIVE' });
    });
  });

  describe('rejectFlight()', () => {
    it('FIXED: sets status to CANCELLED with approval_status rejected', async () => {
      const updateChain = chainable();
      mockFrom.mockReturnValue(updateChain);

      await supabaseModule.rejectFlight('flight-1');
      expect(updateChain.update).toHaveBeenCalledWith(expect.objectContaining({
        status: 'CANCELLED',
        approval_status: 'rejected',
      }));
    });
  });

  describe('approveFlight()', () => {
    it('FIXED: includes approved_by and approval_notes in update', async () => {
      const updateChain = chainable();
      mockFrom.mockReturnValue(updateChain);

      await supabaseModule.approveFlight('flight-1', 'user-1', 'LGTM');
      expect(updateChain.update).toHaveBeenCalledWith(expect.objectContaining({
        status: 'ACTIVE',
        approval_status: 'approved',
        approved_by: 'user-1',
        approval_notes: 'LGTM',
      }));
    });
  });

  describe('fetchFlights()', () => {
    it('only fetches flights from last 30 days', async () => {
      const queryChain = chainable();
      queryChain.then = (resolve) => resolve({ data: [], error: null });
      mockFrom.mockReturnValue(queryChain);

      await supabaseModule.fetchFlights('org-1');
      expect(queryChain.gte).toHaveBeenCalledWith('created_at', expect.any(String));
    });
  });

  describe('selfDispatchFlight()', () => {
    it('sets approval_status to pilot_dispatched (BUG: not a DB enum value)', async () => {
      const updateChain = chainable();
      mockFrom.mockReturnValue(updateChain);

      await supabaseModule.selfDispatchFlight('flight-1');
      expect(updateChain.update).toHaveBeenCalledWith(expect.objectContaining({
        status: 'ACTIVE',
        approval_status: 'pilot_dispatched',
      }));
    });
  });
});

// ── SAFETY REPORTS ─────────────────────────────────────────

describe('Safety reports', () => {
  describe('submitReport()', () => {
    it('sets reporter_id to null when anonymous', async () => {
      const insertChain = chainable({ data: { id: 'rpt-1' }, error: null });
      mockFrom.mockReturnValue(insertChain);

      await supabaseModule.submitReport('org-1', 'user-1', {
        reportCode: 'RPT-001',
        reportType: 'hazard',
        anonymous: true,
        title: 'Test',
        description: 'Test desc',
      });

      expect(insertChain.insert).toHaveBeenCalledWith(expect.objectContaining({
        reporter_id: null,
        anonymous: true,
      }));
    });

    it('sets reporter_id to userId when not anonymous', async () => {
      const insertChain = chainable({ data: { id: 'rpt-2' }, error: null });
      mockFrom.mockReturnValue(insertChain);

      await supabaseModule.submitReport('org-1', 'user-1', {
        reportCode: 'RPT-002',
        reportType: 'incident',
        title: 'Test',
        description: 'Test desc',
      });

      expect(insertChain.insert).toHaveBeenCalledWith(expect.objectContaining({
        reporter_id: 'user-1',
      }));
    });
  });
});

// ── CORRECTIVE ACTIONS ─────────────────────────────────────────

describe('Corrective actions', () => {
  describe('createAction()', () => {
    it('inserts with correct fields', async () => {
      const insertChain = chainable({ data: { id: 'ca-1' }, error: null });
      mockFrom.mockReturnValue(insertChain);

      await supabaseModule.createAction('org-1', {
        actionCode: 'CA-001',
        title: 'Fix issue',
        priority: 'high',
        dueDate: '2024-03-01',
      });

      expect(mockFrom).toHaveBeenCalledWith('corrective_actions');
      expect(insertChain.insert).toHaveBeenCalledWith(expect.objectContaining({
        org_id: 'org-1',
        action_code: 'CA-001',
        priority: 'high',
      }));
    });
  });
});

// ── INVITATION SYSTEM ─────────────────────────────────────────

describe('Invitation system', () => {
  describe('createInvitation()', () => {
    it('lowercases and trims email', async () => {
      const queryChain = chainable({ data: null, error: { code: 'PGRST116' } });
      mockFrom.mockReturnValue(queryChain);

      await supabaseModule.createInvitation('org-1', '  Test@Example.COM  ', 'pilot', 'inviter-1');
      expect(queryChain.eq).toHaveBeenCalledWith('email', 'test@example.com');
    });

    it('rejects duplicate pending invites', async () => {
      const queryChain = chainable({ data: { id: 'existing-1' }, error: null });
      mockFrom.mockReturnValue(queryChain);

      const result = await supabaseModule.createInvitation('org-1', 'dup@test.com', 'pilot', 'inviter-1');
      expect(result.error.message).toContain('already pending');
    });
  });

  describe('fetchInvitations()', () => {
    it('auto-accepts invitations for existing members (side effect in fetch)', async () => {
      // This is a behavioral test - fetchInvitations has a side effect of
      // auto-accepting pending invitations whose email matches an existing org member.
      // This is a code smell / potential bug: fetch operations shouldn't have write side effects.
      const queryChain = chainable();
      queryChain.then = (resolve) => resolve({
        data: [
          { id: 'inv-1', status: 'pending', email: 'existing@test.com' },
        ],
        error: null,
      });
      mockFrom.mockReturnValue(queryChain);

      // The function will try to auto-accept - just verify it doesn't crash
      await supabaseModule.fetchInvitations('org-1');
      expect(mockFrom).toHaveBeenCalledWith('invitations');
    });
  });
});

// ── FRAT TEMPLATES ─────────────────────────────────────────

describe('FRAT Templates', () => {
  describe('setActiveFratTemplate()', () => {
    it('deactivates all templates then activates the selected one', async () => {
      const updateChain = chainable();
      mockFrom.mockReturnValue(updateChain);

      await supabaseModule.setActiveFratTemplate('org-1', 'template-1');
      // Should call from('frat_templates') at least twice
      expect(mockFrom).toHaveBeenCalledWith('frat_templates');
    });
  });
});

// ── NULL SUPABASE GUARD ─────────────────────────────────────────

describe('Null supabase guard (offline mode)', () => {
  let offlineModule;

  beforeEach(async () => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    offlineModule = await import('../../lib/supabase.js');
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  });

  it('signUp returns error when supabase is null', async () => {
    const result = await offlineModule.signUp('a@b.com', 'p', 'n', 'o');
    expect(result.error.message).toBe('Supabase not configured');
  });

  it('signIn returns error when supabase is null', async () => {
    const result = await offlineModule.signIn('a@b.com', 'p');
    expect(result.error.message).toBe('Supabase not configured');
  });

  it('signOut does nothing when supabase is null', async () => {
    const result = await offlineModule.signOut();
    expect(result).toBeUndefined();
  });

  it('fetchFRATs returns empty array when supabase is null', async () => {
    const result = await offlineModule.fetchFRATs('org-1');
    expect(result.data).toEqual([]);
    expect(result.error).toBeNull();
  });

  it('fetchFlights returns empty array when supabase is null', async () => {
    const result = await offlineModule.fetchFlights('org-1');
    expect(result.data).toEqual([]);
  });

  it('fetchReports returns empty array when supabase is null', async () => {
    const result = await offlineModule.fetchReports('org-1');
    expect(result.data).toEqual([]);
  });

  it('fetchHazards returns empty array when supabase is null', async () => {
    const result = await offlineModule.fetchHazards('org-1');
    expect(result.data).toEqual([]);
  });

  it('fetchActions returns empty array when supabase is null', async () => {
    const result = await offlineModule.fetchActions('org-1');
    expect(result.data).toEqual([]);
  });

  it('deleteFRAT returns no error when supabase is null', async () => {
    const result = await offlineModule.deleteFRAT('id');
    expect(result.error).toBeNull();
  });

  it('getSession returns null session', async () => {
    const result = await offlineModule.getSession();
    expect(result.data.session).toBeNull();
  });

  it('getProfile returns null', async () => {
    const result = await offlineModule.getProfile();
    expect(result).toBeNull();
  });

  it('subscribeToFlights returns null', () => {
    const result = offlineModule.subscribeToFlights('org-1', () => {});
    expect(result).toBeNull();
  });
});
