import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { deleteOrganization } from '../../lib/deleteOrg';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const JWT_SECRET = process.env.PLATFORM_ADMIN_SECRET;

// In-memory rate limiter for login/setup (per-process; resets on cold start)
const rateLimits = new Map();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(ip) {
  const now = Date.now();
  let entry = rateLimits.get(ip);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    entry = { windowStart: now, count: 0 };
    rateLimits.set(ip, entry);
  }
  entry.count++;
  return entry.count > MAX_ATTEMPTS;
}

function getServiceClient() {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey);
}

function signToken(admin) {
  if (!JWT_SECRET) return null;
  return jwt.sign(
    { id: admin.id, email: admin.email, name: admin.name },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

function verifyToken(token) {
  if (!JWT_SECRET) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const sb = getServiceClient();
  if (!sb) return res.status(500).json({ error: 'Server not configured' });

  const { action, email, password, name, token } = req.body;

  // Rate limit login and setup actions
  if (action === 'login' || action === 'setup') {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
    if (checkRateLimit(ip)) {
      return res.status(429).json({ error: 'Too many attempts. Try again later.' });
    }
  }

  // ── SETUP: Create first admin (only works if no admins exist) ──
  if (action === 'setup') {
    if (!email || !password || !name) return res.status(400).json({ error: 'Email, password, and name required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const { data: existing } = await sb.from('platform_admins').select('id').limit(1);
    if (existing && existing.length > 0) {
      return res.status(403).json({ error: 'Setup already completed. Use login instead.' });
    }

    const hash = await bcrypt.hash(password, 12);
    const { data, error } = await sb.from('platform_admins').insert({
      email: email.toLowerCase().trim(),
      password_hash: hash,
      name: name.trim(),
    }).select().single();

    if (error) return res.status(400).json({ error: error.message });

    const jwt_token = signToken(data);
    return res.status(200).json({ token: jwt_token, admin: { id: data.id, email: data.email, name: data.name } });
  }

  // ── LOGIN ──
  if (action === 'login') {
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const { data: admin, error } = await sb.from('platform_admins')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .eq('is_active', true)
      .single();

    if (error || !admin) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    // Update last login
    await sb.from('platform_admins').update({ last_login_at: new Date().toISOString() }).eq('id', admin.id);

    const jwt_token = signToken(admin);
    return res.status(200).json({ token: jwt_token, admin: { id: admin.id, email: admin.email, name: admin.name } });
  }

  // ── VERIFY SESSION ──
  if (action === 'verify') {
    const claims = verifyToken(token);
    if (!claims) return res.status(401).json({ error: 'Invalid or expired session' });
    return res.status(200).json({ admin: claims });
  }

  // ── CHECK IF SETUP NEEDED ──
  // Rate-limited: only returns a boolean, no sensitive data.
  if (action === 'check_setup') {
    const { count } = await sb.from('platform_admins').select('id', { count: 'exact', head: true });
    return res.status(200).json({ needs_setup: (count || 0) === 0 });
  }

  // ── LIST ADMINS ──
  if (action === 'list_admins') {
    const claims = verifyToken(token);
    if (!claims) return res.status(401).json({ error: 'Unauthorized' });
    const { data } = await sb.from('platform_admins').select('id, email, name, created_at, last_login_at, is_active').order('created_at');
    return res.status(200).json({ admins: data || [] });
  }

  // ── ADD ADMIN ──
  if (action === 'add_admin') {
    const claims = verifyToken(token);
    if (!claims) return res.status(401).json({ error: 'Unauthorized' });
    if (!email || !password || !name) return res.status(400).json({ error: 'Email, password, and name required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const hash = await bcrypt.hash(password, 12);
    const { data, error } = await sb.from('platform_admins').insert({
      email: email.toLowerCase().trim(),
      password_hash: hash,
      name: name.trim(),
    }).select('id, email, name, created_at, is_active').single();

    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ admin: data });
  }

  // ── REMOVE ADMIN ──
  if (action === 'remove_admin') {
    const claims = verifyToken(token);
    if (!claims) return res.status(401).json({ error: 'Unauthorized' });
    const { admin_id } = req.body;
    if (admin_id === claims.id) return res.status(400).json({ error: "Can't remove yourself" });
    const { count } = await sb.from('platform_admins').select('id', { count: 'exact', head: true }).eq('is_active', true).neq('id', admin_id);
    if ((count || 0) < 1) return res.status(400).json({ error: "Can't deactivate — this is the last active admin" });
    await sb.from('platform_admins').update({ is_active: false }).eq('id', admin_id);
    return res.status(200).json({ success: true });
  }

  // ── FETCH ALL ORGS (for platform admin) ──
  if (action === 'fetch_orgs') {
    const claims = verifyToken(token);
    if (!claims) return res.status(401).json({ error: 'Unauthorized' });
    const { data } = await sb.from('organizations').select('*').order('created_at', { ascending: false });
    return res.status(200).json({ orgs: data || [] });
  }

  // ── FETCH ORG USERS ──
  if (action === 'fetch_org_users') {
    const claims = verifyToken(token);
    if (!claims) return res.status(401).json({ error: 'Unauthorized' });
    const { org_id } = req.body;
    const { data } = await sb.from('profiles').select('*').eq('org_id', org_id).order('created_at', { ascending: false });
    return res.status(200).json({ users: data || [] });
  }

  // ── FETCH ORG STATS ──
  if (action === 'fetch_org_stats') {
    const claims = verifyToken(token);
    if (!claims) return res.status(401).json({ error: 'Unauthorized' });
    const { org_id } = req.body;
    const [frats, flights, reports, hazards, actions] = await Promise.all([
      sb.from('frat_submissions').select('id', { count: 'exact', head: true }).eq('org_id', org_id),
      sb.from('flights').select('id', { count: 'exact', head: true }).eq('org_id', org_id),
      sb.from('safety_reports').select('id', { count: 'exact', head: true }).eq('org_id', org_id),
      sb.from('hazard_register').select('id', { count: 'exact', head: true }).eq('org_id', org_id),
      sb.from('corrective_actions').select('id', { count: 'exact', head: true }).eq('org_id', org_id),
    ]);
    return res.status(200).json({ stats: { frats: frats.count || 0, flights: flights.count || 0, reports: reports.count || 0, hazards: hazards.count || 0, actions: actions.count || 0 } });
  }

  // ── FETCH ORG DETAILS (API keys, AI usage, integrations) ──
  if (action === 'fetch_org_details') {
    const claims = verifyToken(token);
    if (!claims) return res.status(401).json({ error: 'Unauthorized' });
    const { org_id } = req.body;
    if (!org_id) return res.status(400).json({ error: 'org_id required' });
    const [apiKeysRes, aiUsageRes, ffRes, scRes] = await Promise.all([
      sb.from('api_keys').select('*', { count: 'exact', head: true }).eq('org_id', org_id),
      sb.from('ai_usage_log').select('feature, tokens_used').eq('org_id', org_id),
      sb.from('foreflight_config').select('enabled, last_synced_at').eq('org_id', org_id).maybeSingle(),
      sb.from('schedaero_config').select('enabled, last_synced_at').eq('org_id', org_id).maybeSingle(),
    ]);
    const aiUsage = aiUsageRes.data || [];
    const totalTokens = aiUsage.reduce((sum, r) => sum + (r.tokens_used || 0), 0);
    const aiFeatures = [...new Set(aiUsage.map(r => r.feature))];
    return res.status(200).json({
      apiKeyCount: apiKeysRes.count || 0,
      aiUsage: { totalTokens, features: aiFeatures },
      foreflight: ffRes.data,
      schedaero: scRes.data,
    });
  }

  // ── UPDATE ORG ──
  if (action === 'update_org') {
    const claims = verifyToken(token);
    if (!claims) return res.status(401).json({ error: 'Unauthorized' });
    const { org_id, updates } = req.body;
    if (!org_id) return res.status(400).json({ error: 'org_id required' });
    // Only send columns that exist — filter out nulls/undefined
    const cleanUpdates = {};
    if (updates.feature_flags !== undefined) cleanUpdates.feature_flags = updates.feature_flags;
    if (updates.subscription_status !== undefined) cleanUpdates.subscription_status = updates.subscription_status;
    if (updates.max_aircraft !== undefined) cleanUpdates.max_aircraft = updates.max_aircraft;
    const { error } = await sb.from('organizations').update(cleanUpdates).eq('id', org_id);
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  // ── DELETE ORG (and all associated data + auth users) ──
  if (action === 'delete_org') {
    const claims = verifyToken(token);
    if (!claims) return res.status(401).json({ error: 'Unauthorized' });
    const { org_id } = req.body;
    if (!org_id) return res.status(400).json({ error: 'org_id required' });

    const result = await deleteOrganization(sb, org_id);
    return res.status(200).json({ success: true, deleted_users: result.deleted_users });
  }

  // ── FETCH GROWTH DATA (aggregated growth intelligence) ──
  if (action === 'fetch_growth_data') {
    const claims = verifyToken(token);
    if (!claims) return res.status(401).json({ error: 'Unauthorized' });

    const now = new Date();
    const d7 = new Date(now - 7 * 86400000).toISOString();
    const d30 = new Date(now - 30 * 86400000).toISOString();

    const [orgsRes, profilesRes, frats7, flights7, reports7, frats30, flights30, reports30, recentProfilesRes] = await Promise.all([
      sb.from('organizations').select('id, name, slug, tier, subscription_status, trial_ends_at, created_at'),
      sb.from('profiles').select('id, org_id'),
      sb.from('frat_submissions').select('id, org_id').gte('created_at', d7),
      sb.from('flights').select('id, org_id').gte('created_at', d7),
      sb.from('safety_reports').select('id, org_id').gte('created_at', d7),
      sb.from('frat_submissions').select('id, org_id').gte('created_at', d30),
      sb.from('flights').select('id, org_id').gte('created_at', d30),
      sb.from('safety_reports').select('id, org_id').gte('created_at', d30),
      sb.from('profiles').select('id, org_id, created_at').gte('created_at', d30),
    ]);

    const allOrgs = orgsRes.data || [];
    const allProfiles = profilesRes.data || [];

    // User counts per org
    const usersByOrg = {};
    allProfiles.forEach(p => { usersByOrg[p.org_id] = (usersByOrg[p.org_id] || 0) + 1; });

    // Activity counts per org (7d and 30d)
    const activity7 = {}, activity30 = {};
    [frats7, flights7, reports7].forEach(r => (r.data || []).forEach(row => { activity7[row.org_id] = (activity7[row.org_id] || 0) + 1; }));
    [frats30, flights30, reports30].forEach(r => (r.data || []).forEach(row => { activity30[row.org_id] = (activity30[row.org_id] || 0) + 1; }));

    // MRR pricing
    const TIER_PRICE = { free: 0, starter: 149, professional: 349, enterprise: 0 };

    // KPIs
    const tierBreakdown = {}, statusBreakdown = {};
    let mrr = 0, churnCount = 0;
    allOrgs.forEach(o => {
      const t = o.tier || 'starter';
      const s = o.subscription_status || 'trial';
      tierBreakdown[t] = (tierBreakdown[t] || 0) + 1;
      statusBreakdown[s] = (statusBreakdown[s] || 0) + 1;
      if (s === 'active') mrr += TIER_PRICE[t] || 0;
      if (s === 'canceled') churnCount++;
    });

    const trialOrgs = allOrgs.filter(o => (o.subscription_status || 'trial') === 'trial');
    const activeOrgs = allOrgs.filter(o => (o.subscription_status || 'trial') === 'active');
    const conversionRate = allOrgs.length > 0 ? Math.round((activeOrgs.length / allOrgs.length) * 100) : 0;

    // Trial pipeline (sorted by days remaining asc)
    const trialPipeline = trialOrgs.map(o => {
      const trialEnd = o.trial_ends_at ? new Date(o.trial_ends_at) : null;
      const daysRemaining = trialEnd ? Math.ceil((trialEnd - now) / 86400000) : null;
      return {
        name: o.name || o.slug || 'Unnamed',
        days_remaining: daysRemaining,
        users: usersByOrg[o.id] || 0,
        activity_7d: activity7[o.id] || 0,
        created_at: o.created_at,
      };
    }).sort((a, b) => (a.days_remaining ?? 999) - (b.days_remaining ?? 999));

    // Engagement ranking (sorted by 30d activity desc)
    const engagementRanking = allOrgs.map(o => {
      const act = activity30[o.id] || 0;
      const level = act >= 20 ? 'high' : act >= 5 ? 'medium' : act >= 1 ? 'low' : 'inactive';
      // Find last active date from 30d data
      let lastActive = null;
      [frats30, flights30, reports30].forEach(r => {
        (r.data || []).filter(row => row.org_id === o.id).forEach(() => {
          if (!lastActive) lastActive = d30; // approximate — we know they were active in the window
        });
      });
      return {
        name: o.name || o.slug || 'Unnamed',
        tier: o.tier || 'starter',
        users: usersByOrg[o.id] || 0,
        activity_30d: act,
        last_active: act > 0 ? 'Within 30d' : 'Over 30d ago',
        engagement_level: level,
      };
    }).sort((a, b) => b.activity_30d - a.activity_30d);

    // Revenue breakdown
    const mrrByTier = {};
    allOrgs.forEach(o => {
      const t = o.tier || 'starter';
      const s = o.subscription_status || 'trial';
      if (s === 'active') mrrByTier[t] = (mrrByTier[t] || 0) + (TIER_PRICE[t] || 0);
    });
    const potentialTrialRevenue = trialOrgs.length * 149;
    const activeStarterCount = allOrgs.filter(o => (o.tier || 'starter') === 'starter' && (o.subscription_status || 'trial') === 'active').length;
    const potentialUpsellRevenue = activeStarterCount * (349 - 149);

    // Recent signups (last 30 days)
    const recentSignups = allOrgs
      .filter(o => new Date(o.created_at) >= new Date(d30))
      .map(o => ({
        name: o.name || o.slug || 'Unnamed',
        tier: o.tier || 'starter',
        users: usersByOrg[o.id] || 0,
        has_activity: (activity30[o.id] || 0) > 0,
        created_at: o.created_at,
      }))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return res.status(200).json({
      kpis: { mrr, total_orgs: allOrgs.length, total_users: allProfiles.length, conversion_rate: conversionRate, churn_count: churnCount, tier_breakdown: tierBreakdown, status_breakdown: statusBreakdown },
      trial_pipeline: trialPipeline,
      engagement_ranking: engagementRanking,
      revenue: { mrr_by_tier: mrrByTier, potential_trial_revenue: potentialTrialRevenue, potential_upsell_revenue: potentialUpsellRevenue },
      recent_signups: recentSignups,
    });
  }

  return res.status(400).json({ error: 'Unknown action' });
}
