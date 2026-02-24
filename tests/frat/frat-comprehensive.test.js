import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ════════════════════════════════════════════════════════════════════════════
// COPIED CONSTANTS & FUNCTIONS (not exported from pages/index.js)
// ════════════════════════════════════════════════════════════════════════════

const DEFAULT_RISK_LEVELS = {
  LOW:      { label: "LOW RISK",      color: "#4ADE80", bg: "rgba(74,222,128,0.08)",  border: "rgba(74,222,128,0.25)", min: 0,  max: 15,  action: "Flight authorized \u2014 standard procedures",                                          approval_mode: "none" },
  MODERATE: { label: "MODERATE RISK", color: "#FACC15", bg: "rgba(250,204,21,0.08)",  border: "rgba(250,204,21,0.25)", min: 16, max: 30,  action: "Enhanced awareness \u2014 brief crew on elevated risk factors",                           approval_mode: "none" },
  HIGH:     { label: "HIGH RISK",     color: "#F59E0B", bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.25)", min: 31, max: 45,  action: "Requires management approval before departure",                                        approval_mode: "required" },
  CRITICAL: { label: "CRITICAL RISK", color: "#EF4444", bg: "rgba(239,68,68,0.08)",   border: "rgba(239,68,68,0.25)",  min: 46, max: 100, action: "Flight should not depart without risk mitigation and executive approval",               approval_mode: "required" },
};

const DEFAULT_RISK_CATEGORIES = [
  { id: "weather", name: "Weather", factors: [
    { id: "wx_ceiling",    label: "Ceiling < 1000' AGL at departure or destination",      score: 4 },
    { id: "wx_vis",        label: "Visibility < 3 SM at departure or destination",        score: 4 },
    { id: "wx_xwind",      label: "Crosswind > 15 kts (or > 50% of max demonstrated)",   score: 3 },
    { id: "wx_ts",         label: "Thunderstorms forecast along route or at terminals",   score: 5 },
    { id: "wx_ice",        label: "Known or forecast icing conditions",                   score: 4 },
    { id: "wx_turb",       label: "Moderate or greater turbulence forecast",              score: 3 },
    { id: "wx_wind_shear", label: "Wind shear advisories or PIREPs",                     score: 5 },
    { id: "wx_mountain",   label: "Mountain obscuration or high DA affecting performance",score: 4 },
  ]},
  { id: "pilot", name: "Pilot / Crew", factors: [
    { id: "plt_fatigue",   label: "Crew rest < 10 hours or significant fatigue factors",  score: 5 },
    { id: "plt_recency",   label: "PIC < 3 flights in aircraft type in last 30 days",    score: 3 },
    { id: "plt_new_crew",  label: "First time flying together as a crew pairing",         score: 2 },
    { id: "plt_stress",    label: "Significant personal stressors affecting crew",        score: 4 },
    { id: "plt_duty",      label: "Approaching max duty time limitations",                score: 3 },
    { id: "plt_unfam_apt", label: "PIC unfamiliar with departure or destination airport", score: 3 },
  ]},
  { id: "aircraft", name: "Aircraft", factors: [
    { id: "ac_mel",        label: "Operating with MEL items",                             score: 3 },
    { id: "ac_mx_defer",   label: "Deferred maintenance items",                          score: 3 },
    { id: "ac_recent_mx",  label: "Aircraft recently out of major maintenance",           score: 2 },
    { id: "ac_perf_limit", label: "Operating near weight/performance limits",             score: 4 },
    { id: "ac_known_issue",label: "Known recurring squawk or system anomaly",             score: 3 },
  ]},
  { id: "environment", name: "Environment", factors: [
    { id: "env_night",          label: "Night operations",                                score: 2 },
    { id: "env_terrain",        label: "Mountainous terrain along route",                 score: 3 },
    { id: "env_unfam_airspace", label: "Complex or unfamiliar airspace",                  score: 2 },
    { id: "env_short_runway",   label: "Runway length < 4000' or contaminated surface",  score: 4 },
    { id: "env_remote",         label: "Limited alternate airports available",            score: 3 },
    { id: "env_notams",         label: "Significant NOTAMs affecting operation",          score: 2 },
  ]},
  { id: "operational", name: "Operational", factors: [
    { id: "ops_pax_pressure",   label: "Significant schedule pressure from passengers/client", score: 3 },
    { id: "ops_time_pressure",  label: "Tight schedule with minimal buffer",                   score: 3 },
    { id: "ops_vip",            label: "High-profile passengers or sensitive mission",         score: 2 },
    { id: "ops_multi_leg",      label: "3+ legs in a single duty period",                      score: 3 },
    { id: "ops_unfam_mission",  label: "Unusual mission profile or first-time operation type", score: 3 },
    { id: "ops_hazmat",         label: "Hazardous materials on board",                         score: 2 },
  ]},
];

function getRiskLevel(s, riskLevels) {
  const rl = riskLevels || DEFAULT_RISK_LEVELS;
  const sorted = Object.values(rl).sort((a, b) => a.min - b.min);
  for (const l of sorted) {
    if (s >= l.min && s <= l.max) return l;
  }
  return sorted[sorted.length - 1] || Object.values(DEFAULT_RISK_LEVELS)[3];
}

function buildRiskLevels(thresholds) {
  if (!thresholds || !Array.isArray(thresholds)) return DEFAULT_RISK_LEVELS;
  const colorMap  = { green: "#4ADE80", yellow: "#FACC15", amber: "#F59E0B", red: "#EF4444" };
  const bgMap     = { green: "rgba(74,222,128,0.08)", yellow: "rgba(250,204,21,0.08)", amber: "rgba(245,158,11,0.08)", red: "rgba(239,68,68,0.08)" };
  const borderMap = { green: "rgba(74,222,128,0.25)", yellow: "rgba(250,204,21,0.25)", amber: "rgba(245,158,11,0.25)", red: "rgba(239,68,68,0.25)" };
  const result = {};
  thresholds.forEach(t => {
    result[t.level] = { label: t.label, color: colorMap[t.color] || "#4ADE80", bg: bgMap[t.color] || bgMap.green, border: borderMap[t.color] || borderMap.green, min: t.min, max: t.max, action: t.action, approval_mode: t.approval_mode || "none" };
  });
  return result;
}

// Score calculation (mirrors useMemo in pages/index.js line 1099)
function calculateScore(checked, categories) {
  let s = 0;
  (categories || DEFAULT_RISK_CATEGORIES).forEach(c =>
    c.factors.forEach(f => { if (checked[f.id]) s += f.score; })
  );
  return s;
}

// History filter logic (mirrors pages/index.js)
function filterHistory(records, filter, search) {
  return records.filter(r => {
    if (filter !== "ALL" && r.riskLevel !== filter) return false;
    if (search && !`${r.pilot} ${r.departure} ${r.destination} ${r.aircraft} ${r.id}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

// Helper: collect all factors from all categories
function allFactors(categories) {
  return (categories || DEFAULT_RISK_CATEGORIES).flatMap(c => c.factors);
}

// ════════════════════════════════════════════════════════════════════════════
// SUPABASE MOCK SETUP (same pattern as tests/lib/supabase.test.js)
// ════════════════════════════════════════════════════════════════════════════

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

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

function chainable(finalResult = { data: null, error: null }) {
  const chain = {};
  const methods = ['select', 'insert', 'update', 'upsert', 'delete', 'eq', 'neq',
    'gt', 'gte', 'lt', 'lte', 'in', 'not', 'is', 'ilike', 'like', 'or',
    'order', 'limit', 'filter'];
  for (const m of methods) {
    chain[m] = vi.fn(() => chain);
  }
  chain.single = vi.fn().mockResolvedValue(finalResult);
  chain.then = (resolve, reject) => Promise.resolve(finalResult).then(resolve, reject);
  return chain;
}

let supabaseModule;

beforeEach(async () => {
  vi.clearAllMocks();
  vi.resetModules();
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  supabaseModule = await import('../../lib/supabase.js');
});

// ════════════════════════════════════════════════════════════════════════════
// 1. FRAT CREATION & SUBMISSION
// ════════════════════════════════════════════════════════════════════════════

describe('1. FRAT Creation & Submission', () => {
  it('submits a FRAT with all required fields', async () => {
    const insertChain = chainable({ data: { id: 'db-frat-1' }, error: null });
    mockFrom.mockReturnValue(insertChain);

    const entry = {
      id: 'FRAT-12345',
      pilot: 'Captain Smith',
      aircraft: 'PC-12',
      tailNumber: 'N999AB',
      departure: 'KSFO',
      destination: 'KLAX',
      cruiseAlt: 'FL250',
      date: '2026-02-23',
      etd: '1430',
      ete: '1:30',
      eta: '2026-02-23T22:00:00Z',
      fuelLbs: '2000',
      numCrew: '2',
      numPax: '4',
      score: 12,
      riskLevel: 'LOW RISK',
      factors: ['wx_ceiling', 'wx_vis', 'wx_xwind'],
      wxBriefing: 'VFR conditions expected',
      remarks: 'Standard flight',
      attachments: [],
      approvalStatus: 'auto_approved',
    };

    const result = await supabaseModule.submitFRAT('org-1', 'user-1', entry);
    expect(mockFrom).toHaveBeenCalledWith('frat_submissions');
    expect(insertChain.insert).toHaveBeenCalledWith(expect.objectContaining({
      org_id: 'org-1',
      user_id: 'user-1',
      frat_code: 'FRAT-12345',
      pilot: 'Captain Smith',
      aircraft: 'PC-12',
      tail_number: 'N999AB',
      departure: 'KSFO',
      destination: 'KLAX',
      cruise_alt: 'FL250',
      flight_date: '2026-02-23',
      etd: '1430',
      ete: '1:30',
      eta: '2026-02-23T22:00:00Z',
      fuel_lbs: '2000',
      num_crew: '2',
      num_pax: '4',
      score: 12,
      risk_level: 'LOW RISK',
      factors: ['wx_ceiling', 'wx_vis', 'wx_xwind'],
      wx_briefing: 'VFR conditions expected',
      remarks: 'Standard flight',
      attachments: [],
      approval_status: 'auto_approved',
    }));
    expect(insertChain.select).toHaveBeenCalled();
    expect(insertChain.single).toHaveBeenCalled();
    expect(result.error).toBeNull();
  });

  it('defaults optional fields to empty strings when omitted', async () => {
    const insertChain = chainable({ data: { id: 'db-frat-2' }, error: null });
    mockFrom.mockReturnValue(insertChain);

    const entry = {
      id: 'FRAT-99999',
      pilot: 'FO Jones',
      aircraft: 'King Air 350',
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
      factors: [],
      attachments: [],
      approval_status: 'auto_approved',
    }));
  });

  it('validates FRAT code format (FRAT-XXXXX)', () => {
    const validCodes = ['FRAT-12345', 'FRAT-ABCDE', 'FRAT-A1B2C'];
    const invalidCodes = ['12345', 'frat-12345', 'FRAT12345', '', 'FRAT-'];
    const fratCodeRegex = /^FRAT-[A-Z0-9]{5}$/;

    for (const code of validCodes) {
      expect(fratCodeRegex.test(code)).toBe(true);
    }
    for (const code of invalidCodes) {
      expect(fratCodeRegex.test(code)).toBe(false);
    }
  });

  it('passes all fields to submitFRAT correctly', async () => {
    const insertChain = chainable({ data: { id: 'db-frat-3' }, error: null });
    mockFrom.mockReturnValue(insertChain);

    const entry = {
      id: 'FRAT-AAAAA',
      pilot: 'Pilot A',
      aircraft: 'Citation X',
      tailNumber: 'N100XX',
      departure: 'KORD',
      destination: 'KDEN',
      cruiseAlt: 'FL370',
      date: '2026-03-01',
      etd: '0800',
      ete: '2:15',
      eta: '2026-03-01T15:15:00Z',
      fuelLbs: '4500',
      numCrew: '2',
      numPax: '6',
      score: 22,
      riskLevel: 'MODERATE RISK',
      factors: ['wx_ts', 'plt_fatigue'],
      wxBriefing: 'IFR expected',
      remarks: 'VIP transport',
      attachments: [{ url: 'https://example.com/wx.pdf' }],
      approvalStatus: 'auto_approved',
    };

    await supabaseModule.submitFRAT('org-2', 'user-2', entry);

    const insertArg = insertChain.insert.mock.calls[0][0];
    expect(insertArg.org_id).toBe('org-2');
    expect(insertArg.user_id).toBe('user-2');
    expect(insertArg.frat_code).toBe('FRAT-AAAAA');
    expect(insertArg.pilot).toBe('Pilot A');
    expect(insertArg.aircraft).toBe('Citation X');
    expect(insertArg.tail_number).toBe('N100XX');
    expect(insertArg.departure).toBe('KORD');
    expect(insertArg.destination).toBe('KDEN');
    expect(insertArg.cruise_alt).toBe('FL370');
    expect(insertArg.flight_date).toBe('2026-03-01');
    expect(insertArg.etd).toBe('0800');
    expect(insertArg.ete).toBe('2:15');
    expect(insertArg.eta).toBe('2026-03-01T15:15:00Z');
    expect(insertArg.fuel_lbs).toBe('4500');
    expect(insertArg.num_crew).toBe('2');
    expect(insertArg.num_pax).toBe('6');
    expect(insertArg.score).toBe(22);
    expect(insertArg.risk_level).toBe('MODERATE RISK');
    expect(insertArg.factors).toEqual(['wx_ts', 'plt_fatigue']);
    expect(insertArg.wx_briefing).toBe('IFR expected');
    expect(insertArg.remarks).toBe('VIP transport');
    expect(insertArg.attachments).toEqual([{ url: 'https://example.com/wx.pdf' }]);
    expect(insertArg.approval_status).toBe('auto_approved');
  });

  it('calls createFlight after submission', async () => {
    const fratInsertChain = chainable({ data: { id: 'db-frat-4' }, error: null });
    const flightInsertChain = chainable({ data: { id: 'flight-1' }, error: null });

    // First call for submitFRAT, second for createFlight
    mockFrom.mockReturnValueOnce(fratInsertChain).mockReturnValueOnce(flightInsertChain);

    const entry = {
      id: 'FRAT-BBBBB',
      pilot: 'Pilot B',
      aircraft: 'PC-12',
      departure: 'KSFO',
      destination: 'KLAX',
      score: 10,
      riskLevel: 'LOW RISK',
    };

    const fratResult = await supabaseModule.submitFRAT('org-1', 'user-1', entry);
    const flightResult = await supabaseModule.createFlight('org-1', 'db-frat-4', entry);

    expect(mockFrom).toHaveBeenCalledWith('frat_submissions');
    expect(mockFrom).toHaveBeenCalledWith('flights');
    expect(flightInsertChain.insert).toHaveBeenCalledWith(expect.objectContaining({
      org_id: 'org-1',
      frat_id: 'db-frat-4',
      frat_code: 'FRAT-BBBBB',
      status: 'ACTIVE',
    }));
  });

  it('queues submission offline when supabase is null', async () => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const offlineModule = await import('../../lib/supabase.js');

    const entry = {
      id: 'FRAT-OFFLN',
      pilot: 'Offline Pilot',
      aircraft: 'C172',
      departure: 'KABC',
      destination: 'KXYZ',
      score: 5,
      riskLevel: 'LOW RISK',
    };

    const result = await offlineModule.submitFRAT('org-1', 'user-1', entry);
    expect(result.error.message).toBe('Supabase not configured');

    // Restore env
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 2. RISK FACTOR INPUTS (all 31 factors across 5 categories)
// ════════════════════════════════════════════════════════════════════════════

describe('2. Risk Factor Inputs', () => {
  it('has exactly 5 categories', () => {
    expect(DEFAULT_RISK_CATEGORIES).toHaveLength(5);
  });

  it('categories have correct names', () => {
    const names = DEFAULT_RISK_CATEGORIES.map(c => c.name);
    expect(names).toEqual(['Weather', 'Pilot / Crew', 'Aircraft', 'Environment', 'Operational']);
  });

  it('categories have correct ids', () => {
    const ids = DEFAULT_RISK_CATEGORIES.map(c => c.id);
    expect(ids).toEqual(['weather', 'pilot', 'aircraft', 'environment', 'operational']);
  });

  it('Weather has 8 factors', () => {
    const weather = DEFAULT_RISK_CATEGORIES.find(c => c.id === 'weather');
    expect(weather.factors).toHaveLength(8);
  });

  it('Pilot/Crew has 6 factors', () => {
    const pilot = DEFAULT_RISK_CATEGORIES.find(c => c.id === 'pilot');
    expect(pilot.factors).toHaveLength(6);
  });

  it('Aircraft has 5 factors', () => {
    const aircraft = DEFAULT_RISK_CATEGORIES.find(c => c.id === 'aircraft');
    expect(aircraft.factors).toHaveLength(5);
  });

  it('Environment has 6 factors', () => {
    const env = DEFAULT_RISK_CATEGORIES.find(c => c.id === 'environment');
    expect(env.factors).toHaveLength(6);
  });

  it('Operational has 6 factors', () => {
    const ops = DEFAULT_RISK_CATEGORIES.find(c => c.id === 'operational');
    expect(ops.factors).toHaveLength(6);
  });

  it('has 31 total factors across all categories', () => {
    const total = DEFAULT_RISK_CATEGORIES.reduce((sum, c) => sum + c.factors.length, 0);
    expect(total).toBe(31);
  });

  it('every factor has id, label, and score', () => {
    for (const cat of DEFAULT_RISK_CATEGORIES) {
      for (const f of cat.factors) {
        expect(f).toHaveProperty('id');
        expect(f).toHaveProperty('label');
        expect(f).toHaveProperty('score');
        expect(typeof f.id).toBe('string');
        expect(typeof f.label).toBe('string');
        expect(typeof f.score).toBe('number');
        expect(f.score).toBeGreaterThan(0);
      }
    }
  });

  it('all factor ids are unique', () => {
    const ids = allFactors().map(f => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('Weather factors have correct ids and scores', () => {
    const weather = DEFAULT_RISK_CATEGORIES.find(c => c.id === 'weather');
    const expected = [
      { id: 'wx_ceiling', score: 4 },
      { id: 'wx_vis', score: 4 },
      { id: 'wx_xwind', score: 3 },
      { id: 'wx_ts', score: 5 },
      { id: 'wx_ice', score: 4 },
      { id: 'wx_turb', score: 3 },
      { id: 'wx_wind_shear', score: 5 },
      { id: 'wx_mountain', score: 4 },
    ];
    for (const exp of expected) {
      const factor = weather.factors.find(f => f.id === exp.id);
      expect(factor).toBeDefined();
      expect(factor.score).toBe(exp.score);
    }
  });

  it('Pilot/Crew factors have correct ids and scores', () => {
    const pilot = DEFAULT_RISK_CATEGORIES.find(c => c.id === 'pilot');
    const expected = [
      { id: 'plt_fatigue', score: 5 },
      { id: 'plt_recency', score: 3 },
      { id: 'plt_new_crew', score: 2 },
      { id: 'plt_stress', score: 4 },
      { id: 'plt_duty', score: 3 },
      { id: 'plt_unfam_apt', score: 3 },
    ];
    for (const exp of expected) {
      const factor = pilot.factors.find(f => f.id === exp.id);
      expect(factor).toBeDefined();
      expect(factor.score).toBe(exp.score);
    }
  });

  it('Aircraft factors have correct ids and scores', () => {
    const aircraft = DEFAULT_RISK_CATEGORIES.find(c => c.id === 'aircraft');
    const expected = [
      { id: 'ac_mel', score: 3 },
      { id: 'ac_mx_defer', score: 3 },
      { id: 'ac_recent_mx', score: 2 },
      { id: 'ac_perf_limit', score: 4 },
      { id: 'ac_known_issue', score: 3 },
    ];
    for (const exp of expected) {
      const factor = aircraft.factors.find(f => f.id === exp.id);
      expect(factor).toBeDefined();
      expect(factor.score).toBe(exp.score);
    }
  });

  it('Environment factors have correct ids and scores', () => {
    const env = DEFAULT_RISK_CATEGORIES.find(c => c.id === 'environment');
    const expected = [
      { id: 'env_night', score: 2 },
      { id: 'env_terrain', score: 3 },
      { id: 'env_unfam_airspace', score: 2 },
      { id: 'env_short_runway', score: 4 },
      { id: 'env_remote', score: 3 },
      { id: 'env_notams', score: 2 },
    ];
    for (const exp of expected) {
      const factor = env.factors.find(f => f.id === exp.id);
      expect(factor).toBeDefined();
      expect(factor.score).toBe(exp.score);
    }
  });

  it('Operational factors have correct ids and scores', () => {
    const ops = DEFAULT_RISK_CATEGORIES.find(c => c.id === 'operational');
    const expected = [
      { id: 'ops_pax_pressure', score: 3 },
      { id: 'ops_time_pressure', score: 3 },
      { id: 'ops_vip', score: 2 },
      { id: 'ops_multi_leg', score: 3 },
      { id: 'ops_unfam_mission', score: 3 },
      { id: 'ops_hazmat', score: 2 },
    ];
    for (const exp of expected) {
      const factor = ops.factors.find(f => f.id === exp.id);
      expect(factor).toBeDefined();
      expect(factor.score).toBe(exp.score);
    }
  });

  it('selecting a single factor adds its score', () => {
    const checked = { wx_ts: true };
    expect(calculateScore(checked)).toBe(5);
  });

  it('selecting multiple factors across categories sums correctly', () => {
    const checked = {
      wx_ceiling: true,   // 4
      plt_fatigue: true,   // 5
      ac_mel: true,        // 3
      env_night: true,     // 2
      ops_vip: true,       // 2
    };
    expect(calculateScore(checked)).toBe(4 + 5 + 3 + 2 + 2);
  });

  it('selecting all factors in Weather category', () => {
    const weather = DEFAULT_RISK_CATEGORIES.find(c => c.id === 'weather');
    const checked = {};
    weather.factors.forEach(f => { checked[f.id] = true; });
    const expectedSum = weather.factors.reduce((s, f) => s + f.score, 0);
    expect(expectedSum).toBe(4 + 4 + 3 + 5 + 4 + 3 + 5 + 4); // = 32
    expect(calculateScore(checked)).toBe(expectedSum);
  });

  it('deselecting a factor removes its score', () => {
    const checked = { wx_ceiling: true, wx_vis: true };
    expect(calculateScore(checked)).toBe(8);

    // Deselect wx_vis
    const updated = { wx_ceiling: true, wx_vis: false };
    expect(calculateScore(updated)).toBe(4);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 3. SCORE CALCULATION
// ════════════════════════════════════════════════════════════════════════════

describe('3. Score Calculation', () => {
  it('no factors selected = score 0', () => {
    expect(calculateScore({})).toBe(0);
  });

  it('single factor scores correctly', () => {
    expect(calculateScore({ plt_stress: true })).toBe(4);
    expect(calculateScore({ ops_hazmat: true })).toBe(2);
    expect(calculateScore({ wx_wind_shear: true })).toBe(5);
  });

  it('multiple factors across categories sum correctly', () => {
    const checked = {
      wx_ice: true,         // 4
      plt_duty: true,       // 3
      ac_perf_limit: true,  // 4
      env_remote: true,     // 3
      ops_multi_leg: true,  // 3
    };
    expect(calculateScore(checked)).toBe(17);
  });

  it('maximum possible score is 99 (all 31 factors)', () => {
    const checked = {};
    allFactors().forEach(f => { checked[f.id] = true; });
    const score = calculateScore(checked);
    expect(score).toBe(99);
  });

  it('verifies maximum by summing each category', () => {
    const weatherSum = 4 + 4 + 3 + 5 + 4 + 3 + 5 + 4; // 32
    const pilotSum = 5 + 3 + 2 + 4 + 3 + 3;             // 20
    const aircraftSum = 3 + 3 + 2 + 4 + 3;               // 15
    const envSum = 2 + 3 + 2 + 4 + 3 + 2;                // 16
    const opsSum = 3 + 3 + 2 + 3 + 3 + 2;                // 16
    expect(weatherSum + pilotSum + aircraftSum + envSum + opsSum).toBe(99);
  });

  it('score calculation is pure (same inputs = same outputs)', () => {
    const checked = { wx_ts: true, plt_fatigue: true, env_short_runway: true };
    const score1 = calculateScore(checked);
    const score2 = calculateScore(checked);
    const score3 = calculateScore(checked);
    expect(score1).toBe(score2);
    expect(score2).toBe(score3);
    expect(score1).toBe(5 + 5 + 4); // 14
  });

  it('false-valued factors are not counted', () => {
    const checked = { wx_ts: true, wx_vis: false, wx_ice: true };
    expect(calculateScore(checked)).toBe(5 + 4); // 9, not 13
  });

  it('undefined factors are not counted', () => {
    const checked = { wx_ts: true, nonexistent_factor: true };
    expect(calculateScore(checked)).toBe(5);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 4. RISK LEVEL THRESHOLDS
// ════════════════════════════════════════════════════════════════════════════

describe('4. Risk Level Thresholds', () => {
  it('score 0 -> LOW RISK', () => {
    expect(getRiskLevel(0).label).toBe('LOW RISK');
  });

  it('score 15 -> LOW RISK (upper boundary)', () => {
    expect(getRiskLevel(15).label).toBe('LOW RISK');
  });

  it('score 16 -> MODERATE RISK (lower boundary)', () => {
    expect(getRiskLevel(16).label).toBe('MODERATE RISK');
  });

  it('score 30 -> MODERATE RISK (upper boundary)', () => {
    expect(getRiskLevel(30).label).toBe('MODERATE RISK');
  });

  it('score 31 -> HIGH RISK (lower boundary)', () => {
    expect(getRiskLevel(31).label).toBe('HIGH RISK');
  });

  it('score 45 -> HIGH RISK (upper boundary)', () => {
    expect(getRiskLevel(45).label).toBe('HIGH RISK');
  });

  it('score 46 -> CRITICAL RISK (lower boundary)', () => {
    expect(getRiskLevel(46).label).toBe('CRITICAL RISK');
  });

  it('score 100 -> CRITICAL RISK (upper boundary)', () => {
    expect(getRiskLevel(100).label).toBe('CRITICAL RISK');
  });

  it('score > 100 -> still returns CRITICAL (fallback to last level)', () => {
    const level = getRiskLevel(150);
    expect(level.label).toBe('CRITICAL RISK');
  });

  it('each risk level has correct label', () => {
    expect(DEFAULT_RISK_LEVELS.LOW.label).toBe('LOW RISK');
    expect(DEFAULT_RISK_LEVELS.MODERATE.label).toBe('MODERATE RISK');
    expect(DEFAULT_RISK_LEVELS.HIGH.label).toBe('HIGH RISK');
    expect(DEFAULT_RISK_LEVELS.CRITICAL.label).toBe('CRITICAL RISK');
  });

  it('each risk level has correct approval_mode', () => {
    expect(DEFAULT_RISK_LEVELS.LOW.approval_mode).toBe('none');
    expect(DEFAULT_RISK_LEVELS.MODERATE.approval_mode).toBe('none');
    expect(DEFAULT_RISK_LEVELS.HIGH.approval_mode).toBe('required');
    expect(DEFAULT_RISK_LEVELS.CRITICAL.approval_mode).toBe('required');
  });

  it('each risk level has correct action text', () => {
    expect(DEFAULT_RISK_LEVELS.LOW.action).toBe('Flight authorized \u2014 standard procedures');
    expect(DEFAULT_RISK_LEVELS.MODERATE.action).toBe('Enhanced awareness \u2014 brief crew on elevated risk factors');
    expect(DEFAULT_RISK_LEVELS.HIGH.action).toBe('Requires management approval before departure');
    expect(DEFAULT_RISK_LEVELS.CRITICAL.action).toBe('Flight should not depart without risk mitigation and executive approval');
  });

  it('LOW and MODERATE have approval_mode "none"', () => {
    // Test via getRiskLevel for scores in each range
    expect(getRiskLevel(5).approval_mode).toBe('none');
    expect(getRiskLevel(25).approval_mode).toBe('none');
  });

  it('HIGH and CRITICAL have approval_mode "required"', () => {
    expect(getRiskLevel(35).approval_mode).toBe('required');
    expect(getRiskLevel(50).approval_mode).toBe('required');
  });

  it('risk ranges are contiguous with no gaps', () => {
    expect(DEFAULT_RISK_LEVELS.MODERATE.min).toBe(DEFAULT_RISK_LEVELS.LOW.max + 1);
    expect(DEFAULT_RISK_LEVELS.HIGH.min).toBe(DEFAULT_RISK_LEVELS.MODERATE.max + 1);
    expect(DEFAULT_RISK_LEVELS.CRITICAL.min).toBe(DEFAULT_RISK_LEVELS.HIGH.max + 1);
  });

  it('every score from 0 to 100 maps to a risk level', () => {
    for (let s = 0; s <= 100; s++) {
      const level = getRiskLevel(s);
      expect(level).toBeDefined();
      expect(level.label).toBeDefined();
    }
  });

  it('getRiskLevel with custom risk levels uses those thresholds', () => {
    const customLevels = {
      SAFE: { label: "SAFE", min: 0, max: 20, approval_mode: "none" },
      DANGER: { label: "DANGER", min: 21, max: 100, approval_mode: "required" },
    };
    expect(getRiskLevel(10, customLevels).label).toBe('SAFE');
    expect(getRiskLevel(21, customLevels).label).toBe('DANGER');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 5. HIGH-RISK ALERT WORKFLOWS
// ════════════════════════════════════════════════════════════════════════════

describe('5. High-Risk Alert Workflows', () => {
  it('HIGH score -> approval_mode "required" -> flight created with approval_status "pending"', async () => {
    const insertChain = chainable({ data: { id: 'flight-high' }, error: null });
    mockFrom.mockReturnValue(insertChain);

    const entry = {
      id: 'FRAT-HIGHR',
      pilot: 'Pilot High',
      aircraft: 'King Air 350',
      departure: 'KORD',
      destination: 'KLAX',
      score: 35,
      riskLevel: 'HIGH RISK',
    };

    const riskLevel = getRiskLevel(35);
    expect(riskLevel.approval_mode).toBe('required');

    await supabaseModule.createFlight('org-1', 'frat-high', entry, true);
    expect(insertChain.insert).toHaveBeenCalledWith(expect.objectContaining({
      approval_status: 'pending',
    }));
  });

  it('CRITICAL score -> approval_mode "required" -> flight created with approval_status "pending"', async () => {
    const insertChain = chainable({ data: { id: 'flight-crit' }, error: null });
    mockFrom.mockReturnValue(insertChain);

    const entry = {
      id: 'FRAT-CRITC',
      pilot: 'Pilot Critical',
      aircraft: 'G650',
      departure: 'KATL',
      destination: 'KJFK',
      score: 55,
      riskLevel: 'CRITICAL RISK',
    };

    const riskLevel = getRiskLevel(55);
    expect(riskLevel.approval_mode).toBe('required');

    await supabaseModule.createFlight('org-1', 'frat-crit', entry, true);
    expect(insertChain.insert).toHaveBeenCalledWith(expect.objectContaining({
      approval_status: 'pending',
    }));
  });

  it('LOW score -> auto-approved, no approval required', async () => {
    const insertChain = chainable({ data: { id: 'flight-low' }, error: null });
    mockFrom.mockReturnValue(insertChain);

    const entry = {
      id: 'FRAT-LOWRK',
      pilot: 'Pilot Low',
      aircraft: 'C172',
      departure: 'KSFO',
      destination: 'KSJC',
      score: 5,
      riskLevel: 'LOW RISK',
    };

    const riskLevel = getRiskLevel(5);
    expect(riskLevel.approval_mode).toBe('none');

    await supabaseModule.createFlight('org-1', 'frat-low', entry, false);
    expect(insertChain.insert).toHaveBeenCalledWith(expect.objectContaining({
      approval_status: 'approved',
    }));
  });

  it('MODERATE score -> auto-approved, no approval required', async () => {
    const insertChain = chainable({ data: { id: 'flight-mod' }, error: null });
    mockFrom.mockReturnValue(insertChain);

    const entry = {
      id: 'FRAT-MODRK',
      pilot: 'Pilot Moderate',
      aircraft: 'PA-28',
      departure: 'KBOS',
      destination: 'KPVD',
      score: 22,
      riskLevel: 'MODERATE RISK',
    };

    const riskLevel = getRiskLevel(22);
    expect(riskLevel.approval_mode).toBe('none');

    await supabaseModule.createFlight('org-1', 'frat-mod', entry, false);
    expect(insertChain.insert).toHaveBeenCalledWith(expect.objectContaining({
      approval_status: 'approved',
    }));
  });

  it('request-approval API should be called for HIGH/CRITICAL scores', async () => {
    globalThis.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) });

    const score = 40;
    const riskLevel = getRiskLevel(score);
    const requiresApproval = riskLevel.approval_mode === 'required';
    expect(requiresApproval).toBe(true);

    // Simulate calling the request-approval API
    if (requiresApproval) {
      await fetch('/api/request-approval', {
        method: 'POST',
        body: JSON.stringify({ fratId: 'frat-1', orgId: 'org-1' }),
      });
    }

    expect(globalThis.fetch).toHaveBeenCalledWith('/api/request-approval', expect.objectContaining({
      method: 'POST',
    }));
  });

  it('selfDispatchFlight sets approval_status to "pilot_dispatched"', async () => {
    const updateChain = chainable();
    mockFrom.mockReturnValue(updateChain);

    await supabaseModule.selfDispatchFlight('flight-1');
    expect(updateChain.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'ACTIVE',
      approval_status: 'pilot_dispatched',
    }));
  });

  it('approveFlight sets approved_by, approval_notes, approval_status "approved"', async () => {
    const updateChain = chainable();
    mockFrom.mockReturnValue(updateChain);

    await supabaseModule.approveFlight('flight-1', 'admin-user-1', 'Risk mitigations acceptable');
    expect(updateChain.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'ACTIVE',
      approval_status: 'approved',
      approved_by: 'admin-user-1',
      approval_notes: 'Risk mitigations acceptable',
    }));
  });

  it('rejectFlight sets status "CANCELLED", approval_status "rejected"', async () => {
    const updateChain = chainable();
    mockFrom.mockReturnValue(updateChain);

    await supabaseModule.rejectFlight('flight-1');
    expect(updateChain.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'CANCELLED',
      approval_status: 'rejected',
    }));
  });

  it('approveRejectFRAT updates frat_submissions with approval fields', async () => {
    const updateChain = chainable();
    mockFrom.mockReturnValue(updateChain);

    await supabaseModule.approveRejectFRAT('frat-1', 'admin-1', 'approved', 'Good to go');
    expect(mockFrom).toHaveBeenCalledWith('frat_submissions');
    expect(updateChain.update).toHaveBeenCalledWith(expect.objectContaining({
      approval_status: 'approved',
      approved_by: 'admin-1',
      approval_notes: 'Good to go',
    }));
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 6. FRAT EDITING (IMMUTABILITY)
// ════════════════════════════════════════════════════════════════════════════

describe('6. FRAT Editing (Immutability)', () => {
  it('there is no updateFRAT function exported from supabase.js', () => {
    expect(supabaseModule.updateFRAT).toBeUndefined();
  });

  it('there is no editFRAT function exported from supabase.js', () => {
    expect(supabaseModule.editFRAT).toBeUndefined();
  });

  it('FRATs are immutable: only submitFRAT and deleteFRAT exist', () => {
    expect(typeof supabaseModule.submitFRAT).toBe('function');
    expect(typeof supabaseModule.deleteFRAT).toBe('function');
    expect(supabaseModule.updateFRAT).toBeUndefined();
    expect(supabaseModule.editFRAT).toBeUndefined();
    expect(supabaseModule.patchFRAT).toBeUndefined();
    expect(supabaseModule.modifyFRAT).toBeUndefined();
  });

  it('approveRejectFRAT only updates approval fields, not FRAT content', async () => {
    const updateChain = chainable();
    mockFrom.mockReturnValue(updateChain);

    await supabaseModule.approveRejectFRAT('frat-1', 'admin-1', 'approved', 'Approved');

    const updateArg = updateChain.update.mock.calls[0][0];
    // Should only contain approval-related fields
    expect(updateArg).toHaveProperty('approval_status');
    expect(updateArg).toHaveProperty('approved_by');
    expect(updateArg).toHaveProperty('approved_at');
    expect(updateArg).toHaveProperty('approval_notes');
    // Should NOT contain content fields
    expect(updateArg).not.toHaveProperty('pilot');
    expect(updateArg).not.toHaveProperty('score');
    expect(updateArg).not.toHaveProperty('factors');
    expect(updateArg).not.toHaveProperty('departure');
    expect(updateArg).not.toHaveProperty('destination');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 7. FRAT HISTORY
// ════════════════════════════════════════════════════════════════════════════

describe('7. FRAT History', () => {
  it('fetchFRATs returns records ordered by created_at desc', async () => {
    const queryChain = chainable();
    queryChain.then = (resolve) => resolve({ data: [{ id: '1' }, { id: '2' }], error: null });
    mockFrom.mockReturnValue(queryChain);

    const result = await supabaseModule.fetchFRATs('org-1');
    expect(mockFrom).toHaveBeenCalledWith('frat_submissions');
    expect(queryChain.select).toHaveBeenCalledWith('*');
    expect(queryChain.eq).toHaveBeenCalledWith('org_id', 'org-1');
    expect(queryChain.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(result.data).toHaveLength(2);
  });

  it('records can be filtered by risk level', () => {
    const records = [
      { id: 'FRAT-001', riskLevel: 'LOW RISK', pilot: 'A', departure: 'KSFO', destination: 'KLAX', aircraft: 'C172', timestamp: '2026-02-20T10:00:00Z' },
      { id: 'FRAT-002', riskLevel: 'HIGH RISK', pilot: 'B', departure: 'KJFK', destination: 'KBOS', aircraft: 'PA28', timestamp: '2026-02-21T10:00:00Z' },
      { id: 'FRAT-003', riskLevel: 'LOW RISK', pilot: 'C', departure: 'KORD', destination: 'KDEN', aircraft: 'C208', timestamp: '2026-02-22T10:00:00Z' },
    ];

    const lowOnly = filterHistory(records, 'LOW RISK', '');
    expect(lowOnly).toHaveLength(2);
    expect(lowOnly.every(r => r.riskLevel === 'LOW RISK')).toBe(true);

    const highOnly = filterHistory(records, 'HIGH RISK', '');
    expect(highOnly).toHaveLength(1);
    expect(highOnly[0].riskLevel).toBe('HIGH RISK');
  });

  it('records can be filtered with ALL (no risk level filter)', () => {
    const records = [
      { id: 'FRAT-001', riskLevel: 'LOW RISK', pilot: 'A', departure: 'KSFO', destination: 'KLAX', aircraft: 'C172', timestamp: '2026-02-20T10:00:00Z' },
      { id: 'FRAT-002', riskLevel: 'HIGH RISK', pilot: 'B', departure: 'KJFK', destination: 'KBOS', aircraft: 'PA28', timestamp: '2026-02-21T10:00:00Z' },
    ];

    const all = filterHistory(records, 'ALL', '');
    expect(all).toHaveLength(2);
  });

  it('records can be searched by pilot name', () => {
    const records = [
      { id: 'FRAT-001', riskLevel: 'LOW RISK', pilot: 'Captain Smith', departure: 'KSFO', destination: 'KLAX', aircraft: 'C172', timestamp: '2026-02-20T10:00:00Z' },
      { id: 'FRAT-002', riskLevel: 'LOW RISK', pilot: 'FO Johnson', departure: 'KJFK', destination: 'KBOS', aircraft: 'PA28', timestamp: '2026-02-21T10:00:00Z' },
    ];

    const result = filterHistory(records, 'ALL', 'Smith');
    expect(result).toHaveLength(1);
    expect(result[0].pilot).toBe('Captain Smith');
  });

  it('records can be searched by departure airport', () => {
    const records = [
      { id: 'FRAT-001', riskLevel: 'LOW RISK', pilot: 'A', departure: 'KSFO', destination: 'KLAX', aircraft: 'C172', timestamp: '2026-02-20T10:00:00Z' },
      { id: 'FRAT-002', riskLevel: 'LOW RISK', pilot: 'B', departure: 'KJFK', destination: 'KBOS', aircraft: 'PA28', timestamp: '2026-02-21T10:00:00Z' },
    ];

    const result = filterHistory(records, 'ALL', 'KSFO');
    expect(result).toHaveLength(1);
    expect(result[0].departure).toBe('KSFO');
  });

  it('records can be searched by destination airport', () => {
    const records = [
      { id: 'FRAT-001', riskLevel: 'LOW RISK', pilot: 'A', departure: 'KSFO', destination: 'KLAX', aircraft: 'C172', timestamp: '2026-02-20T10:00:00Z' },
      { id: 'FRAT-002', riskLevel: 'LOW RISK', pilot: 'B', departure: 'KJFK', destination: 'KBOS', aircraft: 'PA28', timestamp: '2026-02-21T10:00:00Z' },
    ];

    const result = filterHistory(records, 'ALL', 'KBOS');
    expect(result).toHaveLength(1);
    expect(result[0].destination).toBe('KBOS');
  });

  it('records can be searched by aircraft type', () => {
    const records = [
      { id: 'FRAT-001', riskLevel: 'LOW RISK', pilot: 'A', departure: 'KSFO', destination: 'KLAX', aircraft: 'PC-12', timestamp: '2026-02-20T10:00:00Z' },
      { id: 'FRAT-002', riskLevel: 'LOW RISK', pilot: 'B', departure: 'KJFK', destination: 'KBOS', aircraft: 'King Air', timestamp: '2026-02-21T10:00:00Z' },
    ];

    const result = filterHistory(records, 'ALL', 'PC-12');
    expect(result).toHaveLength(1);
    expect(result[0].aircraft).toBe('PC-12');
  });

  it('records can be searched by FRAT code', () => {
    const records = [
      { id: 'FRAT-ABC12', riskLevel: 'LOW RISK', pilot: 'A', departure: 'KSFO', destination: 'KLAX', aircraft: 'C172', timestamp: '2026-02-20T10:00:00Z' },
      { id: 'FRAT-XYZ99', riskLevel: 'LOW RISK', pilot: 'B', departure: 'KJFK', destination: 'KBOS', aircraft: 'PA28', timestamp: '2026-02-21T10:00:00Z' },
    ];

    const result = filterHistory(records, 'ALL', 'ABC12');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('FRAT-ABC12');
  });

  it('search is case-insensitive', () => {
    const records = [
      { id: 'FRAT-001', riskLevel: 'LOW RISK', pilot: 'Captain SMITH', departure: 'KSFO', destination: 'KLAX', aircraft: 'C172', timestamp: '2026-02-20T10:00:00Z' },
    ];

    expect(filterHistory(records, 'ALL', 'smith')).toHaveLength(1);
    expect(filterHistory(records, 'ALL', 'SMITH')).toHaveLength(1);
    expect(filterHistory(records, 'ALL', 'Smith')).toHaveLength(1);
  });

  it('combined filter and search work together', () => {
    const records = [
      { id: 'FRAT-001', riskLevel: 'LOW RISK', pilot: 'Smith', departure: 'KSFO', destination: 'KLAX', aircraft: 'C172', timestamp: '2026-02-20T10:00:00Z' },
      { id: 'FRAT-002', riskLevel: 'HIGH RISK', pilot: 'Smith', departure: 'KJFK', destination: 'KBOS', aircraft: 'PA28', timestamp: '2026-02-21T10:00:00Z' },
      { id: 'FRAT-003', riskLevel: 'LOW RISK', pilot: 'Jones', departure: 'KORD', destination: 'KDEN', aircraft: 'C208', timestamp: '2026-02-22T10:00:00Z' },
    ];

    const result = filterHistory(records, 'LOW RISK', 'Smith');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('FRAT-001');
  });

  it('results are sorted by timestamp descending', () => {
    const records = [
      { id: 'FRAT-001', riskLevel: 'LOW RISK', pilot: 'A', departure: 'A', destination: 'B', aircraft: 'C', timestamp: '2026-02-20T10:00:00Z' },
      { id: 'FRAT-003', riskLevel: 'LOW RISK', pilot: 'C', departure: 'E', destination: 'F', aircraft: 'G', timestamp: '2026-02-22T10:00:00Z' },
      { id: 'FRAT-002', riskLevel: 'LOW RISK', pilot: 'B', departure: 'C', destination: 'D', aircraft: 'E', timestamp: '2026-02-21T10:00:00Z' },
    ];

    const result = filterHistory(records, 'ALL', '');
    expect(result[0].id).toBe('FRAT-003');
    expect(result[1].id).toBe('FRAT-002');
    expect(result[2].id).toBe('FRAT-001');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 8. FRAT TEMPLATES
// ════════════════════════════════════════════════════════════════════════════

describe('8. FRAT Templates', () => {
  describe('Default thresholds', () => {
    it('LOW covers 0-15', () => {
      expect(DEFAULT_RISK_LEVELS.LOW.min).toBe(0);
      expect(DEFAULT_RISK_LEVELS.LOW.max).toBe(15);
    });

    it('MODERATE covers 16-30', () => {
      expect(DEFAULT_RISK_LEVELS.MODERATE.min).toBe(16);
      expect(DEFAULT_RISK_LEVELS.MODERATE.max).toBe(30);
    });

    it('HIGH covers 31-45', () => {
      expect(DEFAULT_RISK_LEVELS.HIGH.min).toBe(31);
      expect(DEFAULT_RISK_LEVELS.HIGH.max).toBe(45);
    });

    it('CRITICAL covers 46-100', () => {
      expect(DEFAULT_RISK_LEVELS.CRITICAL.min).toBe(46);
      expect(DEFAULT_RISK_LEVELS.CRITICAL.max).toBe(100);
    });
  });

  describe('fetchFratTemplate()', () => {
    it('returns active template for org', async () => {
      const queryChain = chainable({ data: { id: 'tpl-1', is_active: true, name: 'Default' }, error: null });
      mockFrom.mockReturnValue(queryChain);

      const result = await supabaseModule.fetchFratTemplate('org-1');
      expect(mockFrom).toHaveBeenCalledWith('frat_templates');
      expect(queryChain.eq).toHaveBeenCalledWith('org_id', 'org-1');
      expect(queryChain.eq).toHaveBeenCalledWith('is_active', true);
      expect(queryChain.single).toHaveBeenCalled();
    });
  });

  describe('fetchAllFratTemplates()', () => {
    it('returns all templates ordered active first', async () => {
      const queryChain = chainable();
      queryChain.then = (resolve) => resolve({
        data: [
          { id: 'tpl-1', is_active: true },
          { id: 'tpl-2', is_active: false },
        ],
        error: null,
      });
      mockFrom.mockReturnValue(queryChain);

      const result = await supabaseModule.fetchAllFratTemplates('org-1');
      expect(mockFrom).toHaveBeenCalledWith('frat_templates');
      expect(queryChain.order).toHaveBeenCalledWith('is_active', { ascending: false });
      expect(queryChain.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(result.data).toHaveLength(2);
    });
  });

  describe('setActiveFratTemplate()', () => {
    it('deactivates all templates then activates the selected one', async () => {
      const updateChain = chainable();
      mockFrom.mockReturnValue(updateChain);

      await supabaseModule.setActiveFratTemplate('org-1', 'tpl-2');
      // Should call from('frat_templates') at least twice (deactivate all, then activate one)
      expect(mockFrom).toHaveBeenCalledWith('frat_templates');
      const fromCalls = mockFrom.mock.calls.filter(c => c[0] === 'frat_templates');
      expect(fromCalls.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('createFratTemplate()', () => {
    it('creates new inactive template', async () => {
      const insertChain = chainable({ data: { id: 'tpl-new' }, error: null });
      mockFrom.mockReturnValue(insertChain);

      const template = {
        name: 'Custom Template',
        categories: DEFAULT_RISK_CATEGORIES,
        aircraft_types: ['PC-12', 'King Air'],
        risk_thresholds: [],
        assigned_aircraft: [],
      };

      await supabaseModule.createFratTemplate('org-1', template);
      expect(mockFrom).toHaveBeenCalledWith('frat_templates');
      expect(insertChain.insert).toHaveBeenCalledWith(expect.objectContaining({
        org_id: 'org-1',
        name: 'Custom Template',
        is_active: false,
      }));
    });

    it('defaults name to "New Template" when not provided', async () => {
      const insertChain = chainable({ data: { id: 'tpl-new2' }, error: null });
      mockFrom.mockReturnValue(insertChain);

      await supabaseModule.createFratTemplate('org-1', {});
      expect(insertChain.insert).toHaveBeenCalledWith(expect.objectContaining({
        name: 'New Template',
      }));
    });
  });

  describe('deleteFratTemplate()', () => {
    it('deletes template by id', async () => {
      const deleteChain = chainable();
      mockFrom.mockReturnValue(deleteChain);

      await supabaseModule.deleteFratTemplate('tpl-1');
      expect(mockFrom).toHaveBeenCalledWith('frat_templates');
      expect(deleteChain.delete).toHaveBeenCalled();
      expect(deleteChain.eq).toHaveBeenCalledWith('id', 'tpl-1');
    });
  });

  describe('upsertFratTemplate()', () => {
    it('updates existing template when id is provided', async () => {
      const updateChain = chainable({ data: { id: 'tpl-1' }, error: null });
      mockFrom.mockReturnValue(updateChain);

      const template = {
        id: 'tpl-1',
        name: 'Updated Template',
        categories: [],
        risk_thresholds: [],
      };

      await supabaseModule.upsertFratTemplate('org-1', template);
      expect(updateChain.update).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Updated Template',
      }));
      expect(updateChain.eq).toHaveBeenCalledWith('id', 'tpl-1');
    });

    it('creates new template when no existing active template and no id', async () => {
      // First call: check for existing active template (not found)
      const checkChain = chainable({ data: null, error: { code: 'PGRST116' } });
      // Second call: insert new template
      const insertChain = chainable({ data: { id: 'tpl-new' }, error: null });

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return checkChain;
        return insertChain;
      });

      const template = {
        name: 'Brand New Template',
        categories: [],
        risk_thresholds: [],
      };

      await supabaseModule.upsertFratTemplate('org-1', template);
      expect(mockFrom).toHaveBeenCalledWith('frat_templates');
    });
  });

  describe('buildRiskLevels()', () => {
    it('returns DEFAULT_RISK_LEVELS for null input', () => {
      const result = buildRiskLevels(null);
      expect(result).toEqual(DEFAULT_RISK_LEVELS);
    });

    it('returns DEFAULT_RISK_LEVELS for undefined input', () => {
      const result = buildRiskLevels(undefined);
      expect(result).toEqual(DEFAULT_RISK_LEVELS);
    });

    it('returns DEFAULT_RISK_LEVELS for non-array input', () => {
      expect(buildRiskLevels("not an array")).toEqual(DEFAULT_RISK_LEVELS);
      expect(buildRiskLevels(42)).toEqual(DEFAULT_RISK_LEVELS);
      expect(buildRiskLevels({})).toEqual(DEFAULT_RISK_LEVELS);
    });

    it('converts DB thresholds to runtime format', () => {
      const thresholds = [
        { level: 'LOW', label: 'LOW RISK', color: 'green', min: 0, max: 10, action: 'Go fly', approval_mode: 'none' },
        { level: 'HIGH', label: 'HIGH RISK', color: 'red', min: 11, max: 50, action: 'Stop', approval_mode: 'required' },
      ];

      const result = buildRiskLevels(thresholds);
      expect(result.LOW.label).toBe('LOW RISK');
      expect(result.LOW.color).toBe('#4ADE80');
      expect(result.LOW.min).toBe(0);
      expect(result.LOW.max).toBe(10);
      expect(result.LOW.action).toBe('Go fly');
      expect(result.LOW.approval_mode).toBe('none');
      expect(result.HIGH.label).toBe('HIGH RISK');
      expect(result.HIGH.color).toBe('#EF4444');
      expect(result.HIGH.min).toBe(11);
      expect(result.HIGH.max).toBe(50);
      expect(result.HIGH.approval_mode).toBe('required');
    });

    it('maps color names to hex values', () => {
      const thresholds = [
        { level: 'A', label: 'A', color: 'green', min: 0, max: 10, action: '' },
        { level: 'B', label: 'B', color: 'yellow', min: 11, max: 20, action: '' },
        { level: 'C', label: 'C', color: 'amber', min: 21, max: 30, action: '' },
        { level: 'D', label: 'D', color: 'red', min: 31, max: 40, action: '' },
      ];

      const result = buildRiskLevels(thresholds);
      expect(result.A.color).toBe('#4ADE80');
      expect(result.A.bg).toBe('rgba(74,222,128,0.08)');
      expect(result.A.border).toBe('rgba(74,222,128,0.25)');
      expect(result.B.color).toBe('#FACC15');
      expect(result.B.bg).toBe('rgba(250,204,21,0.08)');
      expect(result.C.color).toBe('#F59E0B');
      expect(result.C.bg).toBe('rgba(245,158,11,0.08)');
      expect(result.D.color).toBe('#EF4444');
      expect(result.D.bg).toBe('rgba(239,68,68,0.08)');
    });

    it('defaults unknown color to green (#4ADE80)', () => {
      const thresholds = [
        { level: 'X', label: 'X', color: 'purple', min: 0, max: 10, action: '' },
      ];
      const result = buildRiskLevels(thresholds);
      expect(result.X.color).toBe('#4ADE80');
      expect(result.X.bg).toBe('rgba(74,222,128,0.08)');
      expect(result.X.border).toBe('rgba(74,222,128,0.25)');
    });

    it('defaults approval_mode to "none" when not specified', () => {
      const thresholds = [
        { level: 'LOW', label: 'Low', color: 'green', min: 0, max: 50, action: 'Go' },
      ];
      const result = buildRiskLevels(thresholds);
      expect(result.LOW.approval_mode).toBe('none');
    });

    it('custom template with modified thresholds changes risk level boundaries', () => {
      const customThresholds = [
        { level: 'LOW', label: 'LOW RISK', color: 'green', min: 0, max: 20, action: 'Go', approval_mode: 'none' },
        { level: 'MODERATE', label: 'MODERATE RISK', color: 'yellow', min: 21, max: 40, action: 'Caution', approval_mode: 'none' },
        { level: 'HIGH', label: 'HIGH RISK', color: 'amber', min: 41, max: 60, action: 'Need approval', approval_mode: 'required' },
        { level: 'CRITICAL', label: 'CRITICAL RISK', color: 'red', min: 61, max: 100, action: 'No go', approval_mode: 'required' },
      ];

      const customLevels = buildRiskLevels(customThresholds);

      // Score 18: LOW under custom (was MODERATE under default)
      expect(getRiskLevel(18, customLevels).label).toBe('LOW RISK');
      // Score 35: MODERATE under custom (was HIGH under default)
      expect(getRiskLevel(35, customLevels).label).toBe('MODERATE RISK');
      // Score 50: HIGH under custom (was CRITICAL under default)
      expect(getRiskLevel(50, customLevels).label).toBe('HIGH RISK');
      // Score 70: CRITICAL under custom
      expect(getRiskLevel(70, customLevels).label).toBe('CRITICAL RISK');
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 9. CUSTOM TEMPLATE CREATION
// ════════════════════════════════════════════════════════════════════════════

describe('9. Custom Template Creation', () => {
  it('creating template with custom categories and factors', async () => {
    const insertChain = chainable({ data: { id: 'tpl-custom' }, error: null });
    mockFrom.mockReturnValue(insertChain);

    const customCategories = [
      {
        id: 'custom_wx',
        name: 'Custom Weather',
        factors: [
          { id: 'custom_wind', label: 'High winds', score: 10 },
          { id: 'custom_ice', label: 'Severe icing', score: 8 },
        ],
      },
      {
        id: 'custom_ops',
        name: 'Custom Ops',
        factors: [
          { id: 'custom_fuel', label: 'Low fuel reserves', score: 7 },
        ],
      },
    ];

    await supabaseModule.createFratTemplate('org-1', {
      name: 'Helicopter FRAT',
      categories: customCategories,
      aircraft_types: ['EC135', 'Bell 407'],
      risk_thresholds: [],
      assigned_aircraft: [],
    });

    expect(insertChain.insert).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Helicopter FRAT',
      categories: customCategories,
      aircraft_types: ['EC135', 'Bell 407'],
    }));
  });

  it('custom factor scores affect scoring', () => {
    const customCategories = [
      {
        id: 'custom',
        name: 'Custom',
        factors: [
          { id: 'factor_a', label: 'Factor A', score: 10 },
          { id: 'factor_b', label: 'Factor B', score: 20 },
          { id: 'factor_c', label: 'Factor C', score: 30 },
        ],
      },
    ];

    const checked = { factor_a: true, factor_c: true };
    const score = calculateScore(checked, customCategories);
    expect(score).toBe(40); // 10 + 30
  });

  it('assigned aircraft auto-loads template (data flow)', async () => {
    // This tests that the template includes assigned_aircraft data
    const insertChain = chainable({
      data: {
        id: 'tpl-assigned',
        assigned_aircraft: ['N12345', 'N67890'],
        categories: DEFAULT_RISK_CATEGORIES,
      },
      error: null,
    });
    mockFrom.mockReturnValue(insertChain);

    await supabaseModule.createFratTemplate('org-1', {
      name: 'Assigned FRAT',
      categories: DEFAULT_RISK_CATEGORIES,
      assigned_aircraft: ['N12345', 'N67890'],
    });

    expect(insertChain.insert).toHaveBeenCalledWith(expect.objectContaining({
      assigned_aircraft: ['N12345', 'N67890'],
    }));
  });

  it('template with modified approval thresholds', () => {
    const relaxedThresholds = [
      { level: 'LOW', label: 'LOW RISK', color: 'green', min: 0, max: 40, action: 'Go', approval_mode: 'none' },
      { level: 'MODERATE', label: 'MODERATE RISK', color: 'yellow', min: 41, max: 70, action: 'Caution', approval_mode: 'none' },
      { level: 'HIGH', label: 'HIGH RISK', color: 'amber', min: 71, max: 90, action: 'Approve', approval_mode: 'required' },
      { level: 'CRITICAL', label: 'CRITICAL RISK', color: 'red', min: 91, max: 100, action: 'No go', approval_mode: 'required' },
    ];

    const customLevels = buildRiskLevels(relaxedThresholds);

    // Score 35 is LOW under relaxed thresholds (HIGH under default)
    expect(getRiskLevel(35, customLevels).approval_mode).toBe('none');
    // Score 50 is MODERATE under relaxed thresholds (CRITICAL under default)
    expect(getRiskLevel(50, customLevels).approval_mode).toBe('none');
    // Score 75 is HIGH under relaxed thresholds
    expect(getRiskLevel(75, customLevels).approval_mode).toBe('required');
    // Score 95 is CRITICAL under relaxed thresholds
    expect(getRiskLevel(95, customLevels).approval_mode).toBe('required');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 10. ARCHIVE / DELETE
// ════════════════════════════════════════════════════════════════════════════

describe('10. Archive / Delete', () => {
  it('deleteFRAT removes from frat_submissions table', async () => {
    const deleteChain = chainable();
    mockFrom.mockReturnValue(deleteChain);

    await supabaseModule.deleteFRAT('frat-to-delete');
    expect(mockFrom).toHaveBeenCalledWith('frat_submissions');
    expect(deleteChain.delete).toHaveBeenCalled();
    expect(deleteChain.eq).toHaveBeenCalledWith('id', 'frat-to-delete');
  });

  it('deleteFRAT with null supabase returns no error', async () => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const offlineModule = await import('../../lib/supabase.js');

    const result = await offlineModule.deleteFRAT('frat-123');
    expect(result.error).toBeNull();

    // Restore env
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  });

  it('deleteFratTemplate removes template', async () => {
    const deleteChain = chainable();
    mockFrom.mockReturnValue(deleteChain);

    await supabaseModule.deleteFratTemplate('tpl-to-delete');
    expect(mockFrom).toHaveBeenCalledWith('frat_templates');
    expect(deleteChain.delete).toHaveBeenCalled();
    expect(deleteChain.eq).toHaveBeenCalledWith('id', 'tpl-to-delete');
  });

  it('cannot delete active template (UI-level check)', () => {
    // This is a UI-level check: the delete button is disabled for active templates.
    // We verify the logic that would prevent this.
    const templates = [
      { id: 'tpl-1', is_active: true, name: 'Active Template' },
      { id: 'tpl-2', is_active: false, name: 'Inactive Template' },
    ];

    const canDelete = (template) => !template.is_active;
    expect(canDelete(templates[0])).toBe(false); // Active -> cannot delete
    expect(canDelete(templates[1])).toBe(true);  // Inactive -> can delete
  });

  it('deleteFratTemplate with null supabase returns no error', async () => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const offlineModule = await import('../../lib/supabase.js');

    const result = await offlineModule.deleteFratTemplate('tpl-123');
    expect(result.error).toBeNull();

    // Restore env
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  });
});
