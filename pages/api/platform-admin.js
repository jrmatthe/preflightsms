import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const JWT_SECRET = process.env.PLATFORM_ADMIN_SECRET || 'pflt-admin-' + (supabaseServiceKey || '').slice(0, 16);

function getServiceClient() {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey);
}

function signToken(admin) {
  return jwt.sign(
    { id: admin.id, email: admin.email, name: admin.name },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

function verifyToken(token) {
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

  // ── SETUP: Create first admin (only works if no admins exist) ──
  if (action === 'setup') {
    if (!email || !password || !name) return res.status(400).json({ error: 'Email, password, and name required' });

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
  if (action === 'check_setup') {
    const { data } = await sb.from('platform_admins').select('id').limit(1);
    return res.status(200).json({ needs_setup: !data || data.length === 0 });
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
    const [frats, flights, reports, hazards, actions, crew] = await Promise.all([
      sb.from('frat_submissions').select('id', { count: 'exact', head: true }).eq('org_id', org_id),
      sb.from('flights').select('id', { count: 'exact', head: true }).eq('org_id', org_id),
      sb.from('safety_reports').select('id', { count: 'exact', head: true }).eq('org_id', org_id),
      sb.from('hazard_register').select('id', { count: 'exact', head: true }).eq('org_id', org_id),
      sb.from('corrective_actions').select('id', { count: 'exact', head: true }).eq('org_id', org_id),
      sb.from('crew_members').select('id', { count: 'exact', head: true }).eq('org_id', org_id),
    ]);
    return res.status(200).json({ stats: { frats: frats.count || 0, flights: flights.count || 0, reports: reports.count || 0, hazards: hazards.count || 0, actions: actions.count || 0, crew: crew.count || 0 } });
  }

  // ── UPDATE ORG ──
  if (action === 'update_org') {
    const claims = verifyToken(token);
    if (!claims) return res.status(401).json({ error: 'Unauthorized' });
    const { org_id, updates } = req.body;
    if (!org_id) return res.status(400).json({ error: 'org_id required' });
    // Only send columns that exist — filter out nulls/undefined
    const cleanUpdates = {};
    if (updates.tier !== undefined) cleanUpdates.tier = updates.tier;
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

    // Get all user profiles in this org so we can delete their auth accounts
    const { data: profiles } = await sb.from('profiles').select('id').eq('org_id', org_id);
    const userIds = (profiles || []).map(p => p.id);

    // Delete org data (order matters for foreign keys)
    await sb.from('cbt_progress').delete().eq('org_id', org_id);
    await sb.from('cbt_enrollments').delete().eq('org_id', org_id);
    await sb.from('cbt_lessons').delete().in('course_id',
      (await sb.from('cbt_courses').select('id').eq('org_id', org_id)).data?.map(c => c.id) || []
    );
    await sb.from('cbt_courses').delete().eq('org_id', org_id);
    await sb.from('policy_acknowledgments').delete().in('user_id', userIds);
    await sb.from('flights').delete().eq('org_id', org_id);
    await sb.from('frat_submissions').delete().eq('org_id', org_id);
    await sb.from('safety_reports').delete().eq('org_id', org_id);
    await sb.from('hazard_register').delete().eq('org_id', org_id);
    await sb.from('corrective_actions').delete().eq('org_id', org_id);
    await sb.from('policy_documents').delete().eq('org_id', org_id);
    await sb.from('training_requirements').delete().eq('org_id', org_id);
    await sb.from('training_records').delete().eq('org_id', org_id);
    await sb.from('crew_members').delete().eq('org_id', org_id);
    await sb.from('notification_contacts').delete().eq('org_id', org_id);
    await sb.from('frat_templates').delete().eq('org_id', org_id);
    await sb.from('sms_manuals').delete().eq('org_id', org_id);
    await sb.from('invitations').delete().eq('org_id', org_id);
    await sb.from('profiles').delete().eq('org_id', org_id);
    await sb.from('organizations').delete().eq('id', org_id);

    // Delete auth users
    for (const uid of userIds) {
      await sb.auth.admin.deleteUser(uid);
    }

    return res.status(200).json({ success: true, deleted_users: userIds.length });
  }

  return res.status(400).json({ error: 'Unknown action' });
}
