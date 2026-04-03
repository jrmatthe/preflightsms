import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase env vars not set — running in offline/localStorage mode');
}

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB
function checkFileSize(file) {
  const size = file?.size || file?.length;
  if (size && size > MAX_UPLOAD_BYTES) return { error: { message: `File too large (${(size / 1024 / 1024).toFixed(1)} MB). Maximum is 10 MB.` } };
  return null;
}

// ── AUTH HELPERS ───────────────────────────────────────────────
export async function signUp(email, password, fullName, orgId) {
  if (!supabase) return { error: { message: 'Supabase not configured' } };
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
  if (error) return { error };
  // If identities is empty, the email is already registered
  if (data.user && (!data.user.identities || data.user.identities.length === 0)) {
    return { error: { message: 'This email is already registered. Try logging in instead.' } };
  }
  // Create profile
  if (data.user) {
    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      org_id: orgId,
      full_name: fullName,
      email,
      role: 'pilot',
    });
    if (profileError) return { error: profileError };
  }
  return { data };
}

export async function signIn(email, password) {
  if (!supabase) return { error: { message: 'Supabase not configured' } };
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  if (!supabase) return;
  return supabase.auth.signOut();
}

export async function resetPasswordForEmail(email) {
  if (!supabase) return { error: { message: 'Supabase not configured' } };
  const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/?reset=true` : undefined;
  return supabase.auth.resetPasswordForEmail(email, { redirectTo });
}

export async function updateUserPassword(newPassword) {
  if (!supabase) return { error: { message: 'Supabase not configured' } };
  return supabase.auth.updateUser({ password: newPassword });
}

export async function getSession() {
  if (!supabase) return { data: { session: null } };
  return supabase.auth.getSession();
}

export async function getProfile() {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const { data } = await supabase.from('profiles').select('*, organizations(*)').eq('id', session.user.id).single();
  return data;
}

// ── FRAT OPERATIONS ───────────────────────────────────────────
export async function submitFRAT(orgId, userId, entry) {
  if (!supabase) return { error: { message: 'Supabase not configured' } };
  const { data, error } = await supabase.from('frat_submissions').insert({
    org_id: orgId,
    user_id: userId,
    frat_code: entry.id,
    pilot: entry.pilot,
    aircraft: entry.aircraft,
    tail_number: entry.tailNumber || '',
    departure: entry.departure,
    destination: entry.destination,
    cruise_alt: entry.cruiseAlt || '',
    flight_date: entry.date || null,
    etd: entry.etd || '',
    ete: entry.ete || '',
    eta: entry.eta || null,
    fuel_lbs: entry.fuelLbs || '',
    fuel_unit: entry.fuelUnit || 'hrs',
    num_crew: entry.numCrew || '',
    num_pax: entry.numPax || '',
    score: entry.score,
    risk_level: entry.riskLevel,
    factors: entry.factors || [],
    wx_briefing: entry.wxBriefing || '',
    remarks: entry.remarks || '',
    attachments: entry.attachments || [],
    approval_status: entry.approvalStatus || 'auto_approved',
    fatigue_score: entry.fatigueScore ?? null,
    fatigue_risk_level: entry.fatigueRiskLevel || null,
  }).select().single();
  return { data, error };
}

export async function fetchFRATs(orgId) {
  if (!supabase) return { data: [], error: null };
  const { data, error } = await supabase
    .from('frat_submissions')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}

export async function deleteFRAT(id) {
  if (!supabase) return { error: null };
  return supabase.from('frat_submissions').delete().eq('id', id);
}

// ── FLIGHT OPERATIONS ─────────────────────────────────────────
export async function createFlight(orgId, fratId, entry, requiresApproval = false, userId = null) {
  if (!supabase) return { error: { message: 'Supabase not configured' } };
  const { data, error } = await supabase.from('flights').insert({
    org_id: orgId,
    frat_id: fratId,
    user_id: userId,
    frat_code: entry.id,
    pilot: entry.pilot,
    aircraft: entry.aircraft,
    tail_number: entry.tailNumber || '',
    departure: entry.departure,
    destination: entry.destination,
    cruise_alt: entry.cruiseAlt || '',
    etd: entry.etd || '',
    ete: entry.ete || '',
    eta: entry.eta || null,
    dep_tz: entry.depTz || null,
    dest_tz: entry.destTz || null,
    fuel_lbs: entry.fuelLbs || '',
    fuel_unit: entry.fuelUnit || 'hrs',
    num_crew: entry.numCrew || '',
    num_pax: entry.numPax || '',
    score: entry.score,
    risk_level: entry.riskLevel,
    attachments: entry.attachments || [],
    status: 'ACTIVE',
    approval_status: requiresApproval ? 'pending' : 'approved',
  }).select().single();
  return { data, error };
}

// Reconcile stale pending FRATs: if a flight is approved/arrived but the linked FRAT is still pending, fix it
export async function reconcileStaleFratApprovals(orgId) {
  if (!supabase) return;
  // Find all pending/review FRATs
  const { data: staleFrats } = await supabase.from('frat_submissions')
    .select('id')
    .eq('org_id', orgId)
    .in('approval_status', ['pending', 'review']);
  if (!staleFrats?.length) return;
  // Find flights that reference these FRATs and are approved/arrived
  const fratIds = staleFrats.map(f => f.id);
  const { data: resolvedFlights } = await supabase.from('flights')
    .select('frat_id, approval_status, status')
    .eq('org_id', orgId)
    .in('frat_id', fratIds);
  if (!resolvedFlights?.length) return;
  for (const flight of resolvedFlights) {
    if (!flight.frat_id) continue;
    const newStatus = flight.status === 'ARRIVED' || flight.approval_status === 'approved' ? 'approved'
      : flight.approval_status === 'rejected' ? 'rejected'
      : flight.approval_status === 'pilot_dispatched' ? 'pilot_dispatched'
      : null;
    if (newStatus) {
      await supabase.from('frat_submissions').update({
        approval_status: newStatus,
        approved_at: new Date().toISOString(),
      }).eq('id', flight.frat_id);
    }
  }
}

// Helper: sync approval status from flight to its linked FRAT record
async function syncFratApproval(flightId, status, userId) {
  if (!supabase) return;
  const { data: flight } = await supabase.from('flights').select('frat_id').eq('id', flightId).single();
  if (flight?.frat_id) {
    await supabase.from('frat_submissions').update({
      approval_status: status,
      approved_by: userId || null,
      approved_at: new Date().toISOString(),
    }).eq('id', flight.frat_id);
  }
}

export async function approveFlight(flightId, userId, notes) {
  if (!supabase) return { error: null };
  const result = await supabase.from('flights').update({
    status: 'ACTIVE',
    approval_status: 'approved',
  }).eq('id', flightId);
  syncFratApproval(flightId, 'approved', userId);
  return result;
}

export async function approveRejectFRAT(fratId, userId, status, notes) {
  if (!supabase) return { error: null };
  return supabase.from('frat_submissions').update({
    approval_status: status,
    approved_by: userId,
    approved_at: new Date().toISOString(),
    approval_notes: notes || '',
  }).eq('id', fratId);
}

export async function rejectFlight(flightId) {
  if (!supabase) return { error: null };
  const result = await supabase.from('flights').update({
    status: 'CANCELLED',
    approval_status: 'rejected',
  }).eq('id', flightId);
  syncFratApproval(flightId, 'rejected', null);
  return result;
}

// Valid approval_status values: auto_approved, pending, approved, rejected, pilot_dispatched
export async function selfDispatchFlight(flightId) {
  if (!supabase) return { error: null };
  const result = await supabase.from('flights').update({
    status: 'ACTIVE',
    approval_status: 'pilot_dispatched',
  }).eq('id', flightId);
  syncFratApproval(flightId, 'pilot_dispatched', null);
  return result;
}

export async function deleteFlight(flightId) {
  if (!supabase) return { error: null };
  return supabase.from('flights').delete().eq('id', flightId);
}

export async function fetchFlights(orgId) {
  if (!supabase) return { data: [], error: null };
  const cutoff = new Date(Date.now() - 30 * 24 * 3600000).toISOString();
  const { data, error } = await supabase
    .from('flights')
    .select('*')
    .eq('org_id', orgId)
    .gte('created_at', cutoff)
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}

export async function updateFlightStatus(flightId, status, extra = {}) {
  if (!supabase) return { error: null };
  const updates = { status };
  if (status === 'ARRIVED') {
    updates.arrived_at = new Date().toISOString();
    if (extra.parkingSpot) updates.parking_spot = extra.parkingSpot;
    if (extra.fuelRemaining) { updates.fuel_remaining = extra.fuelRemaining; updates.fuel_unit = extra.fuelUnit || 'lbs'; }
    if (extra.fuelLeft) updates.fuel_remaining_left = extra.fuelLeft;
    if (extra.fuelRight) updates.fuel_remaining_right = extra.fuelRight;
  }
  const result = await supabase.from('flights').update(updates).eq('id', flightId);
  // When flight arrives, ensure linked FRAT is marked approved (covers pending FRATs that were never explicitly approved)
  if (!result.error && status === 'ARRIVED') {
    syncFratApproval(flightId, 'approved', null);
  }
  // Also update aircraft record with latest status
  if (!result.error && status === 'ARRIVED') {
    const { data: flight } = await supabase.from('flights').select('tail_number, destination, org_id').eq('id', flightId).single();
    if (flight && flight.tail_number) {
      const acUpdates = {
        last_location: flight.destination || '',
        status_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (extra.parkingSpot) acUpdates.parking_spot = extra.parkingSpot;
      if (extra.fuelRemaining) { acUpdates.fuel_remaining = extra.fuelRemaining; acUpdates.fuel_unit = extra.fuelUnit || 'lbs'; }
      if (extra.fuelLeft) acUpdates.fuel_remaining_left = extra.fuelLeft;
      if (extra.fuelRight) acUpdates.fuel_remaining_right = extra.fuelRight;
      if (extra.customFieldValues && Object.keys(extra.customFieldValues).length > 0) {
        acUpdates.status_field_values = extra.customFieldValues;
      }
      await supabase.from('aircraft').update(acUpdates).eq('org_id', flight.org_id).eq('registration', flight.tail_number);
    }
  }
  return result;
}

export async function updateAircraftStatus(id, statusFields) {
  if (!supabase) return { error: null };
  return supabase.from('aircraft').update({
    ...statusFields,
    status_updated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', id);
}

export async function updateAircraftMel(id, melItems) {
  if (!supabase) return { error: null };
  return supabase.from('aircraft').update({
    mel_items: melItems,
    updated_at: new Date().toISOString(),
  }).eq('id', id);
}

// ── MEL AUDIT LOG ─────────────────────────────────────────────
export async function createMelAuditEntry(orgId, entry) {
  if (!supabase) return { data: null, error: null };
  const { data, error } = await supabase
    .from('mel_audit_log')
    .insert({ org_id: orgId, ...entry })
    .select()
    .single();
  return { data, error };
}

export async function fetchMelAuditLog(orgId, aircraftId) {
  if (!supabase) return { data: [], error: null };
  const { data, error } = await supabase
    .from('mel_audit_log')
    .select('*')
    .eq('org_id', orgId)
    .eq('aircraft_id', aircraftId)
    .order('created_at', { ascending: false })
    .limit(100);
  return { data: data || [], error };
}

// ── REALTIME SUBSCRIPTION ─────────────────────────────────────
export function subscribeToFlights(orgId, callback) {
  if (!supabase) return null;
  return supabase
    .channel(`flights-${orgId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'flights',
      filter: `org_id=eq.${orgId}`,
    }, callback)
    .subscribe();
}

export function subscribeToNotifications(orgId, callback) {
  if (!supabase) return null;
  return supabase
    .channel(`notifications-${orgId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `org_id=eq.${orgId}`,
    }, callback)
    .subscribe();
}

// ── SAFETY REPORTS ────────────────────────────────────────────
export async function submitReport(orgId, userId, report) {
  if (!supabase) return { error: { message: 'Supabase not configured' } };
  const { data, error } = await supabase.from('safety_reports').insert({
    org_id: orgId,
    reporter_id: report.anonymous ? null : userId,
    report_code: report.reportCode,
    report_type: report.reportType,
    confidential: report.confidential || false,
    anonymous: report.anonymous || false,
    title: report.title,
    description: report.description,
    date_occurred: report.dateOccurred || null,
    location: report.location || '',
    category: report.category || 'other',
    severity: report.severity || 'low',
    flight_phase: report.flightPhase || '',
    tail_number: report.tailNumber || '',
    aircraft_type: report.aircraftType || '',
    ai_suggested_category: report.aiSuggestedCategory || null,
    ai_suggested_severity: report.aiSuggestedSeverity || null,
  }).select().single();
  return { data, error };
}

export async function fetchReports(orgId, { page = 0, pageSize = 500, search = '' } = {}) {
  if (!supabase) return { data: [], count: 0, error: null };
  const from = page * pageSize;
  const to = from + pageSize - 1;
  let query = supabase
    .from('safety_reports')
    .select('*', { count: 'exact' })
    .eq('org_id', orgId);
  if (search) {
    const q = `%${search}%`;
    query = query.or(`title.ilike.${q},description.ilike.${q},location.ilike.${q},category.ilike.${q},report_code.ilike.${q}`);
  }
  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);
  return { data: data || [], count: count || 0, error };
}

export async function updateReport(reportId, updates) {
  if (!supabase) return { error: null };
  return supabase.from('safety_reports').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', reportId);
}

export async function deleteReport(reportId) {
  if (!supabase) return { error: null };
  return supabase.from('safety_reports').delete().eq('id', reportId);
}

// ── HAZARD REGISTER ───────────────────────────────────────────
export async function createHazard(orgId, userId, hazard) {
  if (!supabase) return { error: { message: 'Supabase not configured' } };
  const { data, error } = await supabase.from('hazard_register').insert({
    org_id: orgId,
    created_by: userId,
    hazard_code: hazard.hazardCode,
    title: hazard.title,
    description: hazard.description,
    source: hazard.source || '',
    category: hazard.category || 'other',
    responsible_person: hazard.responsiblePerson || '',
    related_report_id: hazard.relatedReportId || null,
    status: 'identified',
  }).select().single();
  return { data, error };
}

export async function fetchHazards(orgId, { page = 0, pageSize = 500, search = '' } = {}) {
  if (!supabase) return { data: [], count: 0, error: null };
  const from = page * pageSize;
  const to = from + pageSize - 1;
  let query = supabase
    .from('hazard_register')
    .select('*', { count: 'exact' })
    .eq('org_id', orgId);
  if (search) {
    const q = `%${search}%`;
    query = query.or(`title.ilike.${q},hazard_code.ilike.${q},category.ilike.${q},description.ilike.${q}`);
  }
  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);
  return { data: data || [], count: count || 0, error };
}

export async function updateHazard(hazardId, updates, expectedUpdatedAt) {
  if (!supabase) return { error: null };
  let query = supabase.from('hazard_register').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', hazardId);
  if (expectedUpdatedAt) query = query.eq('updated_at', expectedUpdatedAt);
  const result = await query.select();
  if (expectedUpdatedAt && result.data && result.data.length === 0 && !result.error) {
    return { data: null, error: { message: 'Conflict — this record was modified by another user. Please refresh and try again.' } };
  }
  return result;
}

// ── CORRECTIVE ACTIONS ────────────────────────────────────────
export async function createAction(orgId, action) {
  if (!supabase) return { error: { message: 'Supabase not configured' } };
  const { data, error } = await supabase.from('corrective_actions').insert({
    org_id: orgId,
    action_code: action.actionCode,
    title: action.title,
    description: action.description || '',
    report_id: action.reportId || null,
    hazard_id: action.hazardId || null,
    assigned_to: action.assignedTo || null,
    assigned_to_name: action.assignedToName || '',
    due_date: action.dueDate || null,
    priority: action.priority || 'medium',
  }).select().single();
  return { data, error };
}

export async function fetchActions(orgId, { page = 0, pageSize = 500, search = '' } = {}) {
  if (!supabase) return { data: [], count: 0, error: null };
  const from = page * pageSize;
  const to = from + pageSize - 1;
  let query = supabase
    .from('corrective_actions')
    .select('*', { count: 'exact' })
    .eq('org_id', orgId);
  if (search) {
    const q = `%${search}%`;
    query = query.or(`title.ilike.${q},description.ilike.${q},action_code.ilike.${q},assigned_to_name.ilike.${q}`);
  }
  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);
  return { data: data || [], count: count || 0, error };
}

export async function updateAction(actionId, updates) {
  if (!supabase) return { error: null };
  return supabase.from('corrective_actions').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', actionId);
}

// ── ORG PROFILES ──────────────────────────────────────────────
export async function fetchOrgProfiles(orgId) {
  if (!supabase) return { data: [], error: null };
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, email, permissions, created_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: true });
  return { data: data || [], error };
}

export async function updateProfileRole(profileId, role) {
  if (!supabase) return { error: null };
  return supabase.from('profiles').update({ role }).eq('id', profileId);
}

export async function updateProfilePermissions(profileId, permissions) {
  if (!supabase) return { error: null };
  return supabase.from('profiles').update({ permissions }).eq('id', profileId);
}

export async function updateProfileEmail(profileId, email) {
  if (!supabase) return { error: null };
  return supabase.from('profiles').update({ email }).eq('id', profileId);
}

export async function updateProfileName(profileId, full_name) {
  if (!supabase) return { error: null };
  return supabase.from('profiles').update({ full_name }).eq('id', profileId);
}

export async function updateNotificationPreferences(profileId, preferences) {
  if (!supabase) return { error: null };
  return supabase.from('profiles').update({ notification_preferences: preferences }).eq('id', profileId);
}

// ── POLICY DOCUMENTS ──────────────────────────────────────────
export async function createPolicy(orgId, userId, policy) {
  if (!supabase) return { error: { message: 'Supabase not configured' } };
  const { data, error } = await supabase.from('policy_documents').insert({
    org_id: orgId,
    uploaded_by: userId,
    title: policy.title,
    description: policy.description || '',
    category: policy.category || 'safety_policy',
    version: policy.version || '1.0',
    content: policy.content || '',
    file_url: policy.fileUrl || null,
    effective_date: policy.effectiveDate || null,
    review_date: policy.reviewDate || null,
    status: policy.status || 'active',
    part5_tags: policy.part5Tags || [],
  }).select().single();
  return { data, error };
}

export async function fetchPolicies(orgId) {
  if (!supabase) return { data: [], error: null };
  const { data, error } = await supabase
    .from('policy_documents')
    .select('*, acknowledgments:policy_acknowledgments(user_id)')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}

export async function updatePolicy(policyId, updates, expectedUpdatedAt) {
  if (!supabase) return { error: null };
  let query = supabase.from('policy_documents').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', policyId);
  if (expectedUpdatedAt) query = query.eq('updated_at', expectedUpdatedAt);
  const result = await query.select();
  if (expectedUpdatedAt && result.data && result.data.length === 0 && !result.error) {
    return { data: null, error: { message: 'Conflict — this record was modified by another user. Please refresh and try again.' } };
  }
  return result;
}

export async function uploadPolicyFile(orgId, file) {
  if (!supabase) return { url: null, error: { message: 'Supabase not configured' } };
  const sizeErr = checkFileSize(file);
  if (sizeErr) return { url: null, ...sizeErr };
  const ext = file.name?.split('.').pop() || 'pdf';
  const ts = Date.now();
  const filePath = `${orgId}/${ts}.${ext}`;
  const { error: uploadErr } = await supabase.storage
    .from('policy-files')
    .upload(filePath, file, { contentType: file.type, upsert: false });
  if (uploadErr) return { url: null, error: uploadErr };
  const { data: urlData } = supabase.storage.from('policy-files').getPublicUrl(filePath);
  return { url: urlData?.publicUrl || null, error: null };
}

export async function acknowledgePolicy(orgId, policyId, userId) {
  if (!supabase) return { error: null };
  return supabase.from('policy_acknowledgments').upsert({
    org_id: orgId, policy_id: policyId, user_id: userId,
  }, { onConflict: 'policy_id,user_id' });
}

// ── MANUAL → POLICY PUBLISHING ──────────────────────────────────

export async function publishManualToPolicy(orgId, userId, manual) {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' }, wasUpdate: false };

  // Assemble all sections into a single content string
  const content = (manual.sections || [])
    .map(s => `## ${s.title}${s.cfr_ref ? `\n*${s.cfr_ref}*` : ''}\n\n${s.content || '(No content yet)'}`)
    .join('\n\n---\n\n');

  // Check if a policy already exists for this manual_key
  const { data: existing } = await supabase
    .from('policy_documents')
    .select('id, version')
    .eq('org_id', orgId)
    .eq('source_manual_key', manual.manual_key)
    .single();

  if (existing) {
    const { data, error } = await supabase
      .from('policy_documents')
      .update({
        title: manual.title,
        description: manual.description || '',
        content,
        version: existing.version,
        status: 'active',
        part5_tags: [manual.manual_key],
        effective_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();
    return { data, error, wasUpdate: true };
  } else {
    const { data, error } = await supabase
      .from('policy_documents')
      .insert({
        org_id: orgId,
        uploaded_by: userId,
        title: manual.title,
        description: manual.description || '',
        category: 'sms_manual',
        version: '1.0',
        content,
        effective_date: new Date().toISOString().split('T')[0],
        status: 'active',
        part5_tags: [manual.manual_key],
        source_manual_key: manual.manual_key,
      })
      .select()
      .single();
    return { data, error, wasUpdate: false };
  }
}

export async function clearPolicyAcknowledgments(policyId) {
  if (!supabase) return { error: null };
  return supabase.from('policy_acknowledgments').delete().eq('policy_id', policyId);
}

export async function deletePolicy(policyId) {
  if (!supabase) return { error: { message: 'Supabase not configured' } };
  await supabase.from('policy_acknowledgments').delete().eq('policy_id', policyId);
  return supabase.from('policy_documents').delete().eq('id', policyId);
}

// ── TRAINING COMPLETIONS ──────────────────────────────────────
export async function createCompletion(orgId, completion) {
  if (!supabase) return { error: { message: 'Supabase not configured' } };
  // Fetch the course to auto-compute expires_at
  let expiresAt = null;
  if (completion.courseId) {
    const { data: course } = await supabase.from('cbt_courses').select('schedule_type, frequency_months').eq('id', completion.courseId).single();
    if (course && course.schedule_type === 'recurring' && course.frequency_months > 0) {
      const d = new Date(completion.completedDate);
      d.setMonth(d.getMonth() + course.frequency_months);
      expiresAt = d.toISOString().slice(0, 10);
    }
  }
  const { data, error } = await supabase.from('training_completions').insert({
    org_id: orgId,
    course_id: completion.courseId,
    user_id: completion.userId,
    completed_date: completion.completedDate,
    expires_at: expiresAt,
    instructor: completion.instructor || '',
    notes: completion.notes || '',
  }).select().single();
  return { data, error };
}

export async function fetchCompletions(orgId, { page = 0, pageSize = 500 } = {}) {
  if (!supabase) return { data: [], count: 0, error: null };
  const from = page * pageSize;
  const to = from + pageSize - 1;
  const { data: simple, error: simpleErr, count } = await supabase
    .from('training_completions')
    .select('*', { count: 'exact' })
    .eq('org_id', orgId)
    .order('completed_date', { ascending: false })
    .range(from, to);
  if (simpleErr || !simple?.length) return { data: simple || [], count: count || 0, error: null };
  // Enrich with course title and user name via separate lookups
  const courseIds = [...new Set(simple.map(r => r.course_id).filter(Boolean))];
  const userIds = [...new Set(simple.map(r => r.user_id).filter(Boolean))];
  const courseMap = {};
  const userMap = {};
  if (courseIds.length) {
    const { data: courses } = await supabase.from('cbt_courses').select('id, title, category, frequency_months, schedule_type').in('id', courseIds);
    (courses || []).forEach(c => { courseMap[c.id] = c; });
  }
  if (userIds.length) {
    const { data: users } = await supabase.from('profiles').select('id, full_name').in('id', userIds);
    (users || []).forEach(u => { userMap[u.id] = u; });
  }
  const enriched = simple.map(r => ({ ...r, course: courseMap[r.course_id] || null, user: userMap[r.user_id] || null }));
  return { data: enriched, count: count || 0, error: null };
}

export async function deleteCompletion(id) {
  if (!supabase) return { error: null };
  return supabase.from('training_completions').delete().eq('id', id);
}

// Legacy aliases — old code still references these
export async function createTraining() { return { data: null, error: null }; }
export async function fetchTrainings() { return { data: [], error: null }; }
export async function updateTraining() { return { data: null, error: null }; }
export async function deleteTraining() { return { error: null }; }
export async function createTrainingRequirement() { return { data: null, error: null }; }
export async function fetchTrainingRequirements() { return { data: [], error: null }; }
export async function deleteTrainingRequirement() { return { error: null }; }
export async function createTrainingRecord(orgId, userId, record) {
  return createCompletion(orgId, { courseId: record.courseId || record.requirementId, userId, completedDate: record.completedDate, instructor: record.instructor, notes: record.notes });
}
export const fetchTrainingRecords = fetchCompletions;
export const deleteTrainingRecord = deleteCompletion;

// ── Org Logo ──────────────────────────────────────────────
export async function updateOrg(orgId, updates) {
  if (!supabase) return { error: null };
  return supabase.from('organizations').update(updates).eq('id', orgId);
}

// Platform admin functions (requires service key or admin RLS)
export async function fetchAllOrgs() {
  if (!supabase) return { data: [] };
  const { data, error } = await supabase.from('organizations').select('*').order('created_at', { ascending: false });
  return { data: data || [], error };
}

export async function fetchOrgUsers(orgId) {
  if (!supabase) return { data: [] };
  const { data, error } = await supabase.from('profiles').select('*').eq('org_id', orgId).order('created_at', { ascending: false });
  return { data: data || [], error };
}

export async function fetchOrgStats(orgId) {
  if (!supabase) return { data: {} };
  const [frats, flights, reports, hazards, actions] = await Promise.all([
    supabase.from('frat_submissions').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
    supabase.from('flights').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
    supabase.from('safety_reports').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
    supabase.from('hazard_register').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
    supabase.from('corrective_actions').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
  ]);
  return { data: { frats: frats.count || 0, flights: flights.count || 0, reports: reports.count || 0, hazards: hazards.count || 0, actions: actions.count || 0 } };
}

export async function uploadOrgLogo(orgId, file) {
  if (!supabase) return { url: null, error: { message: 'Not connected' } };
  const sizeErr = checkFileSize(file);
  if (sizeErr) return { url: null, ...sizeErr };
  const ext = file.name.split('.').pop();
  const filePath = `${orgId}/logo.${ext}`;
  const { error: uploadErr } = await supabase.storage
    .from('org-logos')
    .upload(filePath, file, { upsert: true, contentType: file.type });
  if (uploadErr) return { url: null, error: uploadErr };
  const { data: urlData } = supabase.storage.from('org-logos').getPublicUrl(filePath);
  const url = urlData?.publicUrl;
  if (url) {
    await supabase.from('organizations').update({ logo_url: url }).eq('id', orgId);
  }
  return { url, error: null };
}

// ── FRAT TEMPLATES ──────────────────────────────────────────
export async function fetchFratTemplate(orgId) {
  if (!supabase) return { data: null, error: null };
  const { data, error } = await supabase
    .from('frat_templates')
    .select('*')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .maybeSingle();
  return { data: data || null, error };
}

export async function fetchAllFratTemplates(orgId) {
  if (!supabase) return { data: [], error: null };
  const { data, error } = await supabase
    .from('frat_templates')
    .select('*')
    .eq('org_id', orgId)
    .order('is_active', { ascending: false })
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}

export async function upsertFratTemplate(orgId, template) {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
  
  // If template has an ID, update that specific template
  const targetId = template.id;
  
  if (targetId) {
    const { data, error } = await supabase
      .from('frat_templates')
      .update({
        name: template.name || 'Default FRAT',
        categories: template.categories,
        aircraft_types: template.aircraft_types,
        risk_thresholds: template.risk_thresholds,
        assigned_aircraft: template.assigned_aircraft || [],
        include_fatigue: template.include_fatigue ?? false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetId)
      .select()
      .single();
    return { data, error };
  }

  // Legacy: check if active template exists
  const { data: existing } = await supabase
    .from('frat_templates')
    .select('id')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .single();

  if (existing) {
    const { data, error } = await supabase
      .from('frat_templates')
      .update({
        name: template.name || 'Default FRAT',
        categories: template.categories,
        aircraft_types: template.aircraft_types,
        risk_thresholds: template.risk_thresholds,
        assigned_aircraft: template.assigned_aircraft || [],
        include_fatigue: template.include_fatigue ?? false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();
    return { data, error };
  } else {
    const { data, error } = await supabase
      .from('frat_templates')
      .insert({
        org_id: orgId,
        name: template.name || 'Default FRAT',
        is_active: true,
        categories: template.categories,
        aircraft_types: template.aircraft_types,
        risk_thresholds: template.risk_thresholds,
        assigned_aircraft: template.assigned_aircraft || [],
        include_fatigue: template.include_fatigue ?? false,
      })
      .select()
      .single();
    return { data, error };
  }
}

export async function createFratTemplate(orgId, template) {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
  const { data, error } = await supabase.from('frat_templates').insert({
    org_id: orgId,
    name: template.name || 'New Template',
    is_active: false,
    categories: template.categories || [],
    aircraft_types: template.aircraft_types || [],
    risk_thresholds: template.risk_thresholds || [],
    assigned_aircraft: template.assigned_aircraft || [],
    include_fatigue: template.include_fatigue ?? false,
  }).select().single();
  return { data, error };
}

export async function deleteFratTemplate(templateId) {
  if (!supabase) return { error: null };
  return supabase.from('frat_templates').delete().eq('id', templateId);
}

export async function setActiveFratTemplate(orgId, templateId) {
  if (!supabase) return { error: null };
  // Deactivate all templates for this org
  await supabase.from('frat_templates').update({ is_active: false }).eq('org_id', orgId);
  // Activate the selected one
  return supabase.from('frat_templates').update({ is_active: true, updated_at: new Date().toISOString() }).eq('id', templateId);
}

// ── FRAT ATTACHMENTS ────────────────────────────────────────
export async function uploadFratAttachment(orgId, fratCode, file) {
  if (!supabase) return { url: null, error: { message: 'Supabase not configured' } };
  const sizeErr = checkFileSize(file);
  if (sizeErr) return { url: null, ...sizeErr };
  const ext = file.name?.split('.').pop() || 'jpg';
  const ts = Date.now();
  const filePath = `${orgId}/${fratCode}/${ts}.${ext}`;
  const { error: uploadErr } = await supabase.storage
    .from('frat-attachments')
    .upload(filePath, file, { contentType: file.type, upsert: false });
  if (uploadErr) return { url: null, error: uploadErr };
  const { data: urlData } = supabase.storage.from('frat-attachments').getPublicUrl(filePath);
  return { url: urlData?.publicUrl || null, error: null };
}

// ── AIRCRAFT / FLEET ────────────────────────────────────────
export async function fetchAircraft(orgId) {
  if (!supabase) return { data: [], error: null };
  const { data, error } = await supabase
    .from('aircraft')
    .select('*')
    .eq('org_id', orgId)
    .order('type', { ascending: true });
  return { data: data || [], error };
}

export async function createAircraft(orgId, aircraft) {
  if (!supabase) return { data: null, error: { message: 'Not configured' } };
  const { data, error } = await supabase
    .from('aircraft')
    .insert({ org_id: orgId, ...aircraft })
    .select().single();
  return { data, error };
}

export async function updateAircraft(id, updates) {
  if (!supabase) return { error: null };
  return supabase.from('aircraft').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
}

export async function deleteAircraft(id) {
  if (!supabase) return { error: null };
  return supabase.from('aircraft').delete().eq('id', id);
}

// ── CBT MODULES ──────────────────────────────────────────────

export async function fetchCbtCourses(orgId) {
  if (!supabase) return { data: [], error: null };
  const { data, error } = await supabase
    .from('cbt_courses')
    .select('*, lessons:cbt_lessons(id, title, sort_order, quiz_questions)')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}

export async function createCbtCourse(orgId, userId, course) {
  if (!supabase) return { error: { message: 'Supabase not configured' } };
  const { data, error } = await supabase.from('cbt_courses').insert({
    org_id: orgId,
    title: course.title,
    description: course.description || '',
    category: course.category || 'sms',
    required_for: course.requiredFor || ['pilot'],
    passing_score: course.passingScore || 80,
    estimated_minutes: course.estimatedMinutes || 30,
    schedule_type: course.scheduleType || 'one_time',
    frequency_months: course.scheduleType === 'recurring' ? (course.frequencyMonths || 12) : 0,
    enrolled_users: course.enrolledUsers || [],
    status: course.status || 'draft',
    created_by: userId,
  }).select().single();
  return { data, error };
}

export async function updateCbtCourse(courseId, updates) {
  if (!supabase) return { error: null };
  return supabase.from('cbt_courses').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', courseId);
}

export async function deleteCbtCourse(courseId) {
  if (!supabase) return { error: null };
  return supabase.from('cbt_courses').delete().eq('id', courseId);
}

export async function fetchCbtLessons(courseId) {
  if (!supabase) return { data: [], error: null };
  const { data, error } = await supabase
    .from('cbt_lessons')
    .select('*')
    .eq('course_id', courseId)
    .order('sort_order', { ascending: true });
  return { data: data || [], error };
}

export async function upsertCbtLesson(orgId, courseId, lesson) {
  if (!supabase) return { error: { message: 'Supabase not configured' } };
  const payload = {
    org_id: orgId,
    course_id: courseId,
    title: lesson.title,
    sort_order: lesson.sortOrder ?? 0,
    content_blocks: lesson.contentBlocks || [],
    quiz_questions: lesson.quizQuestions || [],
    updated_at: new Date().toISOString(),
  };
  if (lesson.id) {
    return supabase.from('cbt_lessons').update(payload).eq('id', lesson.id).select().single();
  }
  return supabase.from('cbt_lessons').insert(payload).select().single();
}

export async function deleteCbtLesson(lessonId) {
  if (!supabase) return { error: null };
  return supabase.from('cbt_lessons').delete().eq('id', lessonId);
}

export async function fetchCbtProgress(orgId, userId) {
  if (!supabase) return { data: [], error: null };
  const query = supabase.from('cbt_progress').select('*').eq('org_id', orgId);
  if (userId) query.eq('user_id', userId);
  const { data, error } = await query;
  return { data: data || [], error };
}

export async function upsertCbtProgress(orgId, courseId, lessonId, userId, progress) {
  if (!supabase) return { error: { message: 'Supabase not configured' } };
  return supabase.from('cbt_progress').upsert({
    org_id: orgId,
    course_id: courseId,
    lesson_id: lessonId,
    user_id: userId,
    status: progress.status,
    quiz_score: progress.quizScore ?? null,
    quiz_answers: progress.quizAnswers ?? null,
    started_at: progress.startedAt || new Date().toISOString(),
    completed_at: progress.completedAt || null,
  }, { onConflict: 'lesson_id,user_id' });
}

export async function fetchCbtEnrollments(orgId, userId) {
  if (!supabase) return { data: [], error: null };
  const query = supabase.from('cbt_enrollments').select('*').eq('org_id', orgId);
  if (userId) query.eq('user_id', userId);
  const { data, error } = await query;
  return { data: data || [], error };
}

export async function upsertCbtEnrollment(orgId, courseId, userId, enrollment) {
  if (!supabase) return { error: { message: 'Supabase not configured' } };
  return supabase.from('cbt_enrollments').upsert({
    org_id: orgId,
    course_id: courseId,
    user_id: userId,
    status: enrollment.status || 'enrolled',
    completed_at: enrollment.completedAt || null,
    certificate_number: enrollment.certificateNumber || null,
  }, { onConflict: 'course_id,user_id' });
}

// ── INVITATIONS ─────────────────────────────────────────────

export async function fetchInvitations(orgId) {
  if (!supabase) return { data: [], error: null };
  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}

// Auto-accept pending invitations whose email matches an existing org member.
// Call this explicitly (e.g. after a member joins) rather than as a read side-effect.
export async function reconcileInvitations(orgId) {
  if (!supabase) return;
  const { data } = await supabase
    .from('invitations')
    .select('id, email, status')
    .eq('org_id', orgId)
    .eq('status', 'pending');
  const pending = data || [];
  if (!pending.length) return;
  const { data: members } = await supabase
    .from('profiles')
    .select('email')
    .eq('org_id', orgId);
  const memberEmails = new Set((members || []).map(m => (m.email || '').toLowerCase()));
  for (const inv of pending) {
    if (memberEmails.has((inv.email || '').toLowerCase())) {
      await supabase.from('invitations').update({ status: 'accepted', accepted_at: new Date().toISOString() }).eq('id', inv.id);
    }
  }
}

export async function createInvitation(orgId, email, role, invitedBy) {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
  // Check if pending invite already exists
  const { data: existing } = await supabase
    .from('invitations')
    .select('id')
    .eq('org_id', orgId)
    .eq('email', email.toLowerCase().trim())
    .eq('status', 'pending')
    .single();
  if (existing) return { data: null, error: { message: 'An invitation is already pending for this email' } };
  // Check if user already in org
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('org_id', orgId)
    .eq('email', email.toLowerCase().trim())
    .single();
  if (existingProfile) return { data: null, error: { message: 'This user is already a member of your organization' } };
  const { data, error } = await supabase
    .from('invitations')
    .insert({
      org_id: orgId,
      email: email.toLowerCase().trim(),
      role,
      invited_by: invitedBy,
    })
    .select()
    .single();
  return { data, error };
}

export async function revokeInvitation(invitationId) {
  if (!supabase) return { error: null };
  return supabase.from('invitations').update({ status: 'revoked' }).eq('id', invitationId);
}

export async function resendInvitation(invitationId) {
  if (!supabase) return { data: null, error: null };
  // Reset expiry and return the invitation data for re-sending
  const { data, error } = await supabase
    .from('invitations')
    .update({ expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() })
    .eq('id', invitationId)
    .select()
    .single();
  return { data, error };
}

export async function getInvitationByToken(token) {
  if (!supabase) return { data: null, error: null };
  const { data, error } = await supabase
    .from('invitations')
    .select('*, organizations(name, slug)')
    .eq('token', token)
    .eq('status', 'pending')
    .single();
  return { data, error };
}

export async function acceptInvitation(token, userId) {
  if (!supabase) return { data: null, error: null };
  const { data, error } = await supabase
    .from('invitations')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('token', token)
    .eq('status', 'pending')
    .select()
    .single();
  return { data, error };
}

export async function removeUserFromOrg(userId) {
  if (!supabase) return { error: null };
  return supabase.from('profiles').delete().eq('id', userId);
}

// ── SMS MANUALS ──────────────────────────────────────────────

export async function fetchSmsManuals(orgId) {
  if (!supabase) return { data: [], error: null };
  const { data, error } = await supabase
    .from('sms_manuals')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: true });
  return { data: data || [], error };
}

export async function upsertSmsManual(orgId, manual, expectedUpdatedAt) {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
  if (manual.id) {
    let query = supabase
      .from('sms_manuals')
      .update({
        title: manual.title,
        description: manual.description || '',
        sections: manual.sections,
        status: manual.status || 'draft',
        version: manual.version || '1.0',
        last_edited_by: manual.lastEditedBy || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', manual.id);
    if (expectedUpdatedAt) query = query.eq('updated_at', expectedUpdatedAt);
    const { data, error } = await query.select().single();
    if (expectedUpdatedAt && !data && !error) {
      return { data: null, error: { message: 'Conflict — this manual was modified by another user. Please refresh and try again.' } };
    }
    return { data, error };
  }
  const { data, error } = await supabase
    .from('sms_manuals')
    .upsert({
      org_id: orgId,
      manual_key: manual.manualKey,
      title: manual.title,
      description: manual.description || '',
      cfr_references: manual.cfrReferences || [],
      sections: manual.sections,
      status: manual.status || 'draft',
      version: manual.version || '1.0',
      last_edited_by: manual.lastEditedBy || null,
    }, { onConflict: 'org_id,manual_key' })
    .select()
    .single();
  return { data, error };
}

export async function updateSmsManualSections(manualId, sections, userId) {
  if (!supabase) return { error: null };
  return supabase.from('sms_manuals').update({
    sections,
    last_edited_by: userId,
    updated_at: new Date().toISOString(),
  }).eq('id', manualId);
}

export async function deleteSmsManual(manualId) {
  if (!supabase) return { error: null };
  return supabase.from('sms_manuals').delete().eq('id', manualId);
}

// ── SMS Template Variables & Signatures ──────────────────
export async function saveSmsTemplateVariables(orgId, variables) {
  if (!supabase) return { error: { message: 'Supabase not configured' } };
  const { data: current } = await supabase.from('organizations').select('settings').eq('id', orgId).single();
  const settings = { ...(current?.settings || {}), sms_template_variables: variables };
  return supabase.from('organizations').update({ settings }).eq('id', orgId);
}

export async function saveOnboardingStatus(orgId, status) {
  if (!supabase) return { error: { message: 'Supabase not configured' } };
  const { data: current } = await supabase.from('organizations').select('settings').eq('id', orgId).single();
  const settings = { ...(current?.settings || {}), ...status };
  return supabase.from('organizations').update({ settings }).eq('id', orgId);
}

export async function saveTourState(profileId, tourState) {
  if (!supabase) return { error: { message: 'Supabase not configured' } };
  return supabase.from('profiles').update({ onboarding_tour: tourState }).eq('id', profileId);
}

export async function saveSmsSignatures(orgId, signatures) {
  if (!supabase) return { error: { message: 'Supabase not configured' } };
  const { data: current } = await supabase.from('organizations').select('settings').eq('id', orgId).single();
  const settings = { ...(current?.settings || {}), sms_signatures: signatures };
  return supabase.from('organizations').update({ settings }).eq('id', orgId);
}

// ── IN-APP NOTIFICATIONS ────────────────────────────────────

export async function fetchNotifications(orgId) {
  if (!supabase) return { data: [], error: null };
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(50);
  return { data: data || [], error };
}

export async function createNotification(orgId, notification) {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
  const { data, error } = await supabase
    .from('notifications')
    .insert({ org_id: orgId, ...notification })
    .select()
    .single();
  return { data, error };
}

export async function deleteNotificationByLinkId(orgId, linkId) {
  if (!supabase) return { error: null };
  return supabase.from('notifications').delete().eq('org_id', orgId).eq('link_id', linkId);
}

export async function fetchNotificationReads(userId) {
  if (!supabase) return { data: [], error: null };
  const { data, error } = await supabase
    .from('notification_reads')
    .select('notification_id')
    .eq('user_id', userId);
  return { data: data || [], error };
}

export async function markNotificationRead(notificationId, userId) {
  if (!supabase) return { data: null, error: null };
  const { data, error } = await supabase
    .from('notification_reads')
    .upsert({ notification_id: notificationId, user_id: userId }, { onConflict: 'notification_id,user_id' })
    .select()
    .single();
  return { data, error };
}

// ── NUDGE RESPONSES ──────────────────────────────────────────
export async function createNudgeResponse(orgId, userId, nudge) {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
  const { data, error } = await supabase.from('nudge_responses').insert({
    org_id: orgId,
    user_id: userId,
    flight_id: nudge.flightId,
    response: nudge.response,
    report_id: nudge.reportId || null,
    remind_at: nudge.remindAt || null,
  }).select().single();
  return { data, error };
}

export async function fetchNudgeResponsesForUser(userId) {
  if (!supabase) return { data: [], error: null };
  const { data, error } = await supabase
    .from('nudge_responses')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}

// ── FOREFLIGHT INTEGRATION ──────────────────────────────────

export async function fetchForeflightConfig(orgId) {
  if (!supabase) return { data: null, error: null };
  const { data, error } = await supabase
    .from('foreflight_config')
    .select('*')
    .eq('org_id', orgId)
    .maybeSingle();
  return { data, error };
}

export async function upsertForeflightConfig(orgId, config) {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
  const { data, error } = await supabase
    .from('foreflight_config')
    .upsert({
      org_id: orgId,
      api_key: config.api_key,
      api_secret: config.api_secret,
      enabled: config.enabled ?? false,
      sync_interval_minutes: config.sync_interval_minutes ?? 5,
      auto_create_frats: config.auto_create_frats ?? false,
      notify_pilots_on_sync: config.notify_pilots_on_sync ?? true,
      push_frat_enabled: config.push_frat_enabled ?? true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'org_id' })
    .select()
    .single();
  return { data, error };
}

export async function fetchForeflightFlights(orgId) {
  if (!supabase) return { data: [], error: null };
  const { data, error } = await supabase
    .from('foreflight_flights')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(100);
  return { data: data || [], error };
}

export async function fetchPendingForeflightFlights(orgId) {
  if (!supabase) return { data: [], error: null };
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  const { data, error } = await supabase
    .from('foreflight_flights')
    .select('*')
    .eq('org_id', orgId)
    .eq('status', 'pending')
    .is('frat_id', null)
    .is('flight_id', null)
    .gte('updated_at', twoDaysAgo.toISOString())
    .order('etd', { ascending: true, nullsFirst: false })
    .limit(20);
  return { data: data || [], error };
}

export async function updateForeflightFlight(id, updates) {
  if (!supabase) return { error: null };
  return supabase
    .from('foreflight_flights')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
}

export async function unlinkForeflightFlightsByFlightId(flightDbId) {
  if (!supabase) return { error: null };
  return supabase
    .from('foreflight_flights')
    .update({ status: 'pending', frat_id: null, flight_id: null, updated_at: new Date().toISOString() })
    .eq('flight_id', flightDbId);
}

// ── SCHEDAERO INTEGRATION ──────────────────────────────────

export async function fetchSchedaeroConfig(orgId) {
  if (!supabase) return { data: null, error: null };
  const { data, error } = await supabase
    .from('schedaero_config')
    .select('*')
    .eq('org_id', orgId)
    .maybeSingle();
  return { data, error };
}

export async function upsertSchedaeroConfig(orgId, config) {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
  const { data, error } = await supabase
    .from('schedaero_config')
    .upsert({
      org_id: orgId,
      api_key: config.api_key,
      enabled: config.enabled ?? false,
      sync_interval_minutes: config.sync_interval_minutes ?? 5,
      sync_window_hours: config.sync_window_hours ?? 24,
      auto_create_frats: config.auto_create_frats ?? false,
      notify_pilots_on_sync: config.notify_pilots_on_sync ?? true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'org_id' })
    .select()
    .single();
  return { data, error };
}

export async function fetchSchedaeroTrips(orgId) {
  if (!supabase) return { data: [], error: null };
  const { data, error } = await supabase
    .from('schedaero_trips')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(100);
  return { data: data || [], error };
}

export async function fetchPendingSchedaeroTrips(orgId) {
  if (!supabase) return { data: [], error: null };
  const { data, error } = await supabase
    .from('schedaero_trips')
    .select('*')
    .eq('org_id', orgId)
    .eq('status', 'pending')
    .is('frat_id', null)
    .is('flight_id', null)
    .order('etd', { ascending: true });
  return { data: data || [], error };
}

export async function updateSchedaeroTrip(id, updates) {
  if (!supabase) return { error: null };
  return supabase
    .from('schedaero_trips')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
}

export async function unlinkSchedaeroTripsByFlightId(flightDbId) {
  if (!supabase) return { error: null };
  return supabase
    .from('schedaero_trips')
    .update({ status: 'pending', frat_id: null, flight_id: null, updated_at: new Date().toISOString() })
    .eq('flight_id', flightDbId);
}

// ── ERP (Emergency Response Plans) ────────────────────────────
export async function fetchErpPlans(orgId) {
  if (!supabase) return { data: [], error: null };
  const { data, error } = await supabase
    .from('erp_plans')
    .select('*, acknowledgments:erp_acknowledgments(user_id, acknowledged_at, plan_version)')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}

export async function createErpPlan(orgId, plan) {
  if (!supabase) return { data: null, error: null };
  const { data, error } = await supabase
    .from('erp_plans')
    .insert({ org_id: orgId, ...plan })
    .select()
    .single();
  return { data, error };
}

export async function updateErpPlan(planId, updates) {
  if (!supabase) return { data: null, error: null };
  const { data, error } = await supabase
    .from('erp_plans')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', planId)
    .select()
    .single();
  return { data, error };
}

export async function deleteErpPlan(planId) {
  if (!supabase) return { error: null };
  return supabase.from('erp_plans').delete().eq('id', planId);
}

export async function fetchErpChecklistItems(planId) {
  if (!supabase) return { data: [], error: null };
  const { data, error } = await supabase
    .from('erp_checklist_items')
    .select('*')
    .eq('erp_plan_id', planId)
    .order('sort_order', { ascending: true });
  return { data: data || [], error };
}

export async function upsertErpChecklistItems(planId, items) {
  if (!supabase) return { error: null };
  await supabase.from('erp_checklist_items').delete().eq('erp_plan_id', planId);
  if (!items || items.length === 0) return { error: null };
  const rows = items.map((item, i) => ({
    erp_plan_id: planId,
    sort_order: i,
    action_text: item.action_text,
    responsible_role: item.responsible_role || '',
    time_target: item.time_target || '',
    notes: item.notes || '',
    is_critical: item.is_critical || false,
  }));
  return supabase.from('erp_checklist_items').insert(rows);
}

export async function fetchErpCallTree(planId) {
  if (!supabase) return { data: [], error: null };
  const { data, error } = await supabase
    .from('erp_call_tree')
    .select('*')
    .eq('erp_plan_id', planId)
    .order('sort_order', { ascending: true });
  return { data: data || [], error };
}

export async function upsertErpCallTree(planId, contacts) {
  if (!supabase) return { error: null };
  await supabase.from('erp_call_tree').delete().eq('erp_plan_id', planId);
  if (!contacts || contacts.length === 0) return { error: null };
  const rows = contacts.map((c, i) => ({
    erp_plan_id: planId,
    sort_order: i,
    contact_name: c.contact_name,
    contact_role: c.contact_role || '',
    phone_primary: c.phone_primary || '',
    phone_secondary: c.phone_secondary || '',
    email: c.email || '',
    notes: c.notes || '',
    is_external: c.is_external || false,
  }));
  return supabase.from('erp_call_tree').insert(rows);
}

export async function fetchErpDrills(orgId) {
  if (!supabase) return { data: [], error: null };
  const { data, error } = await supabase
    .from('erp_drills')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}

export async function createErpDrill(orgId, drill) {
  if (!supabase) return { data: null, error: null };
  const { data, error } = await supabase
    .from('erp_drills')
    .insert({ org_id: orgId, ...drill })
    .select()
    .single();
  return { data, error };
}

export async function updateErpDrill(drillId, updates) {
  if (!supabase) return { data: null, error: null };
  const { data, error } = await supabase
    .from('erp_drills')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', drillId)
    .select()
    .single();
  return { data, error };
}

export async function deleteErpDrill(drillId) {
  if (!supabase) return { error: null };
  return supabase.from('erp_drills').delete().eq('id', drillId);
}

// ── ERP Acknowledgments ──────────────────────────────────────
export async function acknowledgeErpPlan(orgId, erpPlanId, userId, planVersion) {
  if (!supabase) return { error: null };
  return supabase.from('erp_acknowledgments').upsert({
    org_id: orgId,
    erp_plan_id: erpPlanId,
    user_id: userId,
    plan_version: planVersion || 1,
    acknowledged_at: new Date().toISOString(),
  }, { onConflict: 'erp_plan_id,user_id' });
}

export async function clearErpAcknowledgments(erpPlanId) {
  if (!supabase) return { error: null };
  return supabase.from('erp_acknowledgments').delete().eq('erp_plan_id', erpPlanId);
}

// ── SPI (Safety Performance Indicators) ───────────────────────
export async function fetchSpis(orgId) {
  if (!supabase) return { data: [], error: null };
  const { data, error } = await supabase
    .from('safety_performance_indicators')
    .select('*')
    .eq('org_id', orgId)
    .order('sort_order', { ascending: true });
  return { data: data || [], error };
}

export async function createSpi(orgId, spi) {
  if (!supabase) return { data: null, error: null };
  const { data, error } = await supabase
    .from('safety_performance_indicators')
    .insert({ org_id: orgId, ...spi })
    .select()
    .single();
  return { data, error };
}

export async function updateSpi(spiId, updates) {
  if (!supabase) return { data: null, error: null };
  const { data, error } = await supabase
    .from('safety_performance_indicators')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', spiId)
    .select()
    .single();
  return { data, error };
}

export async function deleteSpi(spiId) {
  if (!supabase) return { error: null };
  return supabase.from('safety_performance_indicators').delete().eq('id', spiId);
}

export async function fetchSpiTargets(spiId) {
  if (!supabase) return { data: [], error: null };
  const { data, error } = await supabase
    .from('safety_performance_targets')
    .select('*')
    .eq('spi_id', spiId)
    .order('effective_date', { ascending: false });
  return { data: data || [], error };
}

export async function createSpiTarget(target) {
  if (!supabase) return { data: null, error: null };
  const { data, error } = await supabase
    .from('safety_performance_targets')
    .insert(target)
    .select()
    .single();
  return { data, error };
}

export async function updateSpiTarget(targetId, updates) {
  if (!supabase) return { data: null, error: null };
  const { data, error } = await supabase
    .from('safety_performance_targets')
    .update(updates)
    .eq('id', targetId)
    .select()
    .single();
  return { data, error };
}

export async function deleteSpiTarget(targetId) {
  if (!supabase) return { error: null };
  return supabase.from('safety_performance_targets').delete().eq('id', targetId);
}

export async function fetchSpiMeasurements(spiId) {
  if (!supabase) return { data: [], error: null };
  const { data, error } = await supabase
    .from('spi_measurements')
    .select('*')
    .eq('spi_id', spiId)
    .order('period_start', { ascending: true });
  return { data: data || [], error };
}

export async function fetchAllSpiMeasurements(orgId) {
  if (!supabase) return { data: [], error: null };
  const { data, error } = await supabase
    .from('spi_measurements')
    .select('*, safety_performance_indicators!inner(org_id)')
    .eq('safety_performance_indicators.org_id', orgId)
    .order('period_start', { ascending: false });
  return { data: data || [], error };
}

export async function createSpiMeasurement(measurement) {
  if (!supabase) return { data: null, error: null };
  const { data, error } = await supabase
    .from('spi_measurements')
    .insert(measurement)
    .select()
    .single();
  return { data, error };
}

// ── IEP / AUDIT TEMPLATES ────────────────────────────────────
export async function fetchAuditTemplates(orgId) {
  if (!supabase) return { data: [], error: null };
  const { data, error } = await supabase
    .from('audit_templates')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}

export async function createAuditTemplate(orgId, template) {
  if (!supabase) return { data: null, error: null };
  const { data, error } = await supabase
    .from('audit_templates')
    .insert({ org_id: orgId, ...template })
    .select()
    .single();
  return { data, error };
}

export async function updateAuditTemplate(templateId, updates) {
  if (!supabase) return { data: null, error: null };
  const { data, error } = await supabase
    .from('audit_templates')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', templateId)
    .select()
    .single();
  return { data, error };
}

export async function deleteAuditTemplate(templateId) {
  if (!supabase) return { error: null };
  return supabase.from('audit_templates').delete().eq('id', templateId);
}

// ── IEP / AUDITS ─────────────────────────────────────────────
export async function fetchAudits(orgId) {
  if (!supabase) return { data: [], error: null };
  const { data, error } = await supabase
    .from('audits')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}

export async function createAudit(orgId, audit) {
  if (!supabase) return { data: null, error: null };
  const { data, error } = await supabase
    .from('audits')
    .insert({ org_id: orgId, ...audit })
    .select()
    .single();
  return { data, error };
}

export async function updateAudit(auditId, updates) {
  if (!supabase) return { data: null, error: null };
  const { data, error } = await supabase
    .from('audits')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', auditId)
    .select()
    .single();
  return { data, error };
}

export async function deleteAudit(auditId) {
  if (!supabase) return { error: null };
  await supabase.from('audit_responses').delete().eq('audit_id', auditId);
  const { error } = await supabase.from('audits').delete().eq('id', auditId);
  return { error };
}

// ── IEP / AUDIT RESPONSES ───────────────────────────────────
export async function fetchAuditResponses(auditId) {
  if (!supabase) return { data: [], error: null };
  const { data, error } = await supabase
    .from('audit_responses')
    .select('*')
    .eq('audit_id', auditId)
    .order('sort_order', { ascending: true });
  return { data: data || [], error };
}

export async function upsertAuditResponse(response) {
  if (!supabase) return { data: null, error: null };
  const { data, error } = await supabase
    .from('audit_responses')
    .upsert({ ...response, updated_at: new Date().toISOString() }, { onConflict: 'id' })
    .select()
    .single();
  return { data, error };
}

export async function upsertAuditResponses(auditId, responses) {
  if (!supabase) return { error: null };
  await supabase.from('audit_responses').delete().eq('audit_id', auditId);
  if (!responses || responses.length === 0) return { error: null };
  const rows = responses.map((r, i) => ({
    audit_id: auditId,
    section_title: r.section_title,
    question_text: r.question_text,
    response: r.response || null,
    finding_text: r.finding_text || '',
    evidence: r.evidence || '',
    severity: r.severity || null,
    corrective_action_id: r.corrective_action_id || null,
    sort_order: i,
  }));
  return supabase.from('audit_responses').insert(rows);
}

// ── IEP / AUDIT SCHEDULES ───────────────────────────────────
export async function fetchAuditSchedules(orgId) {
  if (!supabase) return { data: [], error: null };
  const { data, error } = await supabase
    .from('audit_schedules')
    .select('*')
    .eq('org_id', orgId)
    .order('next_due_date', { ascending: true });
  return { data: data || [], error };
}

export async function createAuditSchedule(orgId, schedule) {
  if (!supabase) return { data: null, error: null };
  const { data, error } = await supabase
    .from('audit_schedules')
    .insert({ org_id: orgId, ...schedule })
    .select()
    .single();
  return { data, error };
}

export async function updateAuditSchedule(scheduleId, updates) {
  if (!supabase) return { data: null, error: null };
  const { data, error } = await supabase
    .from('audit_schedules')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', scheduleId)
    .select()
    .single();
  return { data, error };
}

export async function deleteAuditSchedule(scheduleId) {
  if (!supabase) return { error: null };
  return supabase.from('audit_schedules').delete().eq('id', scheduleId);
}

// ── AI INTELLIGENCE ──────────────────────────────────────────
export async function fetchTrendAlerts(orgId) {
  if (!supabase) return { data: [], error: null };
  const { data, error } = await supabase
    .from('trend_alerts')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(50);
  return { data: data || [], error };
}

export async function acknowledgeTrendAlert(alertId, userId) {
  if (!supabase) return { error: null };
  return supabase.from('trend_alerts').update({
    acknowledged_by: userId,
    acknowledged_at: new Date().toISOString(),
  }).eq('id', alertId);
}

export async function createAiSuggestionFeedback(orgId, feedback) {
  if (!supabase) return { data: null, error: null };
  const { data, error } = await supabase
    .from('ai_suggestions')
    .insert({ org_id: orgId, ...feedback })
    .select()
    .single();
  return { data, error };
}

export async function updateAiSuggestionFeedback(id, updates) {
  if (!supabase) return { error: null };
  return supabase.from('ai_suggestions').update(updates).eq('id', id);
}

// ── DECLARATIONS ─────────────────────────────────────────────
export async function fetchDeclarations(orgId) {
  if (!supabase) return { data: [], error: null };
  const { data, error } = await supabase
    .from('declarations')
    .select('*')
    .eq('org_id', orgId)
    .order('version', { ascending: false });
  return { data: data || [], error };
}

export async function createDeclaration(orgId, declaration) {
  if (!supabase) return { data: null, error: null };
  const { data, error } = await supabase
    .from('declarations')
    .insert({ org_id: orgId, ...declaration })
    .select()
    .single();
  return { data, error };
}

export async function updateDeclaration(id, updates) {
  if (!supabase) return { error: null };
  return supabase.from('declarations').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
}

export async function uploadDeclarationPdf(orgId, declarationId, pdfBlob) {
  if (!supabase) return { data: null, error: null };
  const sizeErr = checkFileSize(pdfBlob);
  if (sizeErr) return { data: null, ...sizeErr };
  const path = `${orgId}/${declarationId}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from('declarations')
    .upload(path, pdfBlob, { upsert: true, contentType: 'application/pdf' });
  if (uploadError) return { data: null, error: uploadError };
  const { data: urlData } = supabase.storage.from('declarations').getPublicUrl(path);
  return { data: urlData?.publicUrl || path, error: null };
}

// ── MANAGEMENT OF CHANGE ─────────────────────────────────────
export async function fetchMocItems(orgId) {
  if (!supabase) return { data: [], error: null };
  const { data, error } = await supabase
    .from('management_of_change')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}

export async function createMocItem(orgId, item) {
  if (!supabase) return { data: null, error: null };
  const { data, error } = await supabase
    .from('management_of_change')
    .insert({ org_id: orgId, ...item })
    .select()
    .single();
  return { data, error };
}

export async function updateMocItem(id, updates) {
  if (!supabase) return { error: null };
  return supabase.from('management_of_change').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
}

export async function deleteMocItem(id) {
  if (!supabase) return { error: null };
  return supabase.from('management_of_change').delete().eq('id', id);
}

export async function fetchMocAttachments(mocId) {
  if (!supabase) return { data: [], error: null };
  const { data, error } = await supabase
    .from('moc_attachments')
    .select('*')
    .eq('moc_id', mocId)
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}

export async function createMocAttachment(mocId, attachment) {
  if (!supabase) return { data: null, error: null };
  const { data, error } = await supabase
    .from('moc_attachments')
    .insert({ moc_id: mocId, ...attachment })
    .select()
    .single();
  return { data, error };
}

export async function deleteMocAttachment(id) {
  if (!supabase) return { error: null };
  return supabase.from('moc_attachments').delete().eq('id', id);
}

export async function uploadMocFile(orgId, mocId, file) {
  if (!supabase) return { url: null, error: { message: 'Supabase not configured' } };
  const sizeErr = checkFileSize(file);
  if (sizeErr) return { url: null, ...sizeErr };
  const ext = file.name?.split('.').pop() || 'bin';
  const ts = Date.now();
  const filePath = `${orgId}/${mocId}/${ts}.${ext}`;
  const { error: uploadErr } = await supabase.storage
    .from('moc-attachments')
    .upload(filePath, file, { contentType: file.type, upsert: false });
  if (uploadErr) return { url: null, error: uploadErr };
  const { data: urlData } = supabase.storage.from('moc-attachments').getPublicUrl(filePath);
  return { url: urlData?.publicUrl || null, error: null };
}

// ── SAFETY CULTURE SURVEYS ───────────────────────────────────
export async function fetchCultureSurveys(orgId) {
  if (!supabase) return { data: [], error: null };
  const { data, error } = await supabase
    .from('culture_surveys')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}

export async function createCultureSurvey(orgId, survey) {
  if (!supabase) return { data: null, error: null };
  const { data, error } = await supabase
    .from('culture_surveys')
    .insert({ org_id: orgId, ...survey })
    .select()
    .single();
  return { data, error };
}

export async function updateCultureSurvey(id, updates) {
  if (!supabase) return { error: null };
  return supabase.from('culture_surveys').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
}

export async function deleteCultureSurvey(id) {
  if (!supabase) return { error: null };
  return supabase.from('culture_surveys').delete().eq('id', id);
}

export async function fetchCultureSurveyResponses(surveyId) {
  if (!supabase) return { data: [], error: null };
  // Use the safe view that strips respondent_id for anonymous surveys
  const { data, error } = await supabase
    .from('culture_survey_responses_safe')
    .select('*')
    .eq('survey_id', surveyId);
  return { data: data || [], error };
}

export async function submitCultureSurveyResponse(response) {
  if (!supabase) return { data: null, error: null };
  const { data, error } = await supabase
    .from('culture_survey_responses')
    .insert(response)
    .select()
    .single();
  return { data, error };
}

export async function fetchCultureSurveyResults(surveyId) {
  if (!supabase) return { data: null, error: null };
  const { data, error } = await supabase
    .from('culture_survey_results')
    .select('*')
    .eq('survey_id', surveyId)
    .order('calculated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return { data, error };
}

export async function upsertCultureSurveyResults(surveyId, results) {
  if (!supabase) return { data: null, error: null };
  // Check if results exist for this survey
  const { data: existing } = await supabase
    .from('culture_survey_results')
    .select('id')
    .eq('survey_id', surveyId)
    .maybeSingle();
  if (existing) {
    const { data, error } = await supabase
      .from('culture_survey_results')
      .update({ ...results, calculated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single();
    return { data, error };
  }
  const { data, error } = await supabase
    .from('culture_survey_results')
    .insert({ survey_id: surveyId, ...results })
    .select()
    .single();
  return { data, error };
}

export async function checkUserSurveyResponse(surveyId, userId) {
  if (!supabase) return { data: null, error: null };
  const { data, error } = await supabase
    .from('culture_survey_responses')
    .select('id')
    .eq('survey_id', surveyId)
    .eq('respondent_id', userId)
    .maybeSingle();
  return { data, error };
}

export async function fetchUserSurveyResponseIds(userId) {
  if (!supabase) return { data: [], error: null };
  const { data, error } = await supabase
    .from('culture_survey_responses')
    .select('survey_id')
    .eq('respondent_id', userId);
  return { data: (data || []).map(r => r.survey_id), error };
}

// ── FATIGUE ASSESSMENTS ──────────────────────────────────────
export async function createFatigueAssessment(orgId, assessment) {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
  const { data, error } = await supabase.from('fatigue_assessments').insert({
    org_id: orgId,
    frat_id: assessment.frat_id,
    pilot_id: assessment.pilot_id,
    sleep_hours_24: assessment.sleep_hours_24,
    hours_awake: assessment.hours_awake,
    duty_start_time: assessment.duty_start_time || null,
    timezone_crossings: assessment.timezone_crossings || 0,
    commute_minutes: assessment.commute_minutes || null,
    subjective_fatigue: assessment.subjective_fatigue,
    calculated_fatigue_score: assessment.calculated_fatigue_score,
    fatigue_risk_level: assessment.fatigue_risk_level,
    mitigations: assessment.mitigations || '',
  }).select().single();
  return { data, error };
}

export async function fetchFatigueAssessments(orgId) {
  if (!supabase) return { data: [], error: null };
  const { data, error } = await supabase
    .from('fatigue_assessments')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}

// ── API Keys & Webhooks ─────────────────────────────────────

export async function fetchApiKeys(orgId) {
  if (!supabase) return { data: [], error: null };
  const { data, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}

export async function createApiKey(orgId, keyData) {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
  const { data, error } = await supabase
    .from('api_keys')
    .insert({ org_id: orgId, ...keyData })
    .select()
    .single();
  return { data, error };
}

export async function updateApiKey(keyId, updates) {
  if (!supabase) return { data: null, error: null };
  const { data, error } = await supabase
    .from('api_keys')
    .update(updates)
    .eq('id', keyId)
    .select()
    .single();
  return { data, error };
}

export async function deleteApiKey(keyId) {
  if (!supabase) return { error: null };
  return supabase.from('api_keys').delete().eq('id', keyId);
}

export async function fetchWebhooks(orgId) {
  if (!supabase) return { data: [], error: null };
  const { data, error } = await supabase
    .from('webhooks')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}

export async function createWebhook(orgId, webhookData) {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
  const { data, error } = await supabase
    .from('webhooks')
    .insert({ org_id: orgId, ...webhookData })
    .select()
    .single();
  return { data, error };
}

export async function updateWebhook(webhookId, updates) {
  if (!supabase) return { data: null, error: null };
  const { data, error } = await supabase
    .from('webhooks')
    .update(updates)
    .eq('id', webhookId)
    .select()
    .single();
  return { data, error };
}

export async function deleteWebhook(webhookId) {
  if (!supabase) return { error: null };
  return supabase.from('webhooks').delete().eq('id', webhookId);
}

// ── ASAP PROGRAM ──────────────────────────────────────────────

export async function fetchAsapConfig(orgId) {
  if (!supabase) return { data: null, error: null };
  const { data, error } = await supabase
    .from('asap_config')
    .select('*')
    .eq('org_id', orgId)
    .maybeSingle();
  return { data, error };
}

export async function upsertAsapConfig(orgId, config) {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
  const { data, error } = await supabase
    .from('asap_config')
    .upsert({ org_id: orgId, ...config, updated_at: new Date().toISOString() }, { onConflict: 'org_id' })
    .select()
    .single();
  return { data, error };
}

export async function fetchAsapReports(orgId, { page = 0, pageSize = 500, search = '' } = {}) {
  if (!supabase) return { data: [], count: 0, error: null };
  const from = page * pageSize;
  const to = from + pageSize - 1;
  let query = supabase
    .from('asap_reports')
    .select('*', { count: 'exact' })
    .eq('org_id', orgId);
  if (search) {
    const q = `%${search}%`;
    query = query.or(`report_number.ilike.${q},event_type.ilike.${q},narrative.ilike.${q},reporter_name.ilike.${q}`);
  }
  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);
  return { data: data || [], count: count || 0, error };
}

export async function fetchAsapReport(reportId) {
  if (!supabase) return { data: null, error: null };
  const { data, error } = await supabase
    .from('asap_reports')
    .select('*')
    .eq('id', reportId)
    .single();
  return { data, error };
}

export async function createAsapReport(orgId, report) {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
  const { data, error } = await supabase
    .from('asap_reports')
    .insert({ org_id: orgId, ...report })
    .select()
    .single();
  return { data, error };
}

export async function updateAsapReport(reportId, updates) {
  if (!supabase) return { data: null, error: null };
  const { data, error } = await supabase
    .from('asap_reports')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', reportId)
    .select()
    .single();
  return { data, error };
}

export async function deleteAsapReport(reportId) {
  if (!supabase) return { error: null };
  return supabase.from('asap_reports').delete().eq('id', reportId);
}

export async function fetchAsapReportCount(orgId) {
  if (!supabase) return { count: 0, error: null };
  const { count, error } = await supabase
    .from('asap_reports')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId);
  return { count, error };
}

export async function fetchAsapErcReviews(reportId) {
  if (!supabase) return { data: [], error: null };
  const { data, error } = await supabase
    .from('asap_erc_reviews')
    .select('*')
    .eq('report_id', reportId)
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}

export async function createAsapErcReview(review) {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
  const { data, error } = await supabase
    .from('asap_erc_reviews')
    .insert(review)
    .select()
    .single();
  return { data, error };
}

export async function updateAsapErcReview(reviewId, updates) {
  if (!supabase) return { data: null, error: null };
  const { data, error } = await supabase
    .from('asap_erc_reviews')
    .update(updates)
    .eq('id', reviewId)
    .select()
    .single();
  return { data, error };
}

export async function fetchAsapCorrectiveActions(orgId) {
  if (!supabase) return { data: [], error: null };
  const { data, error } = await supabase
    .from('asap_corrective_actions')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}

export async function fetchAsapCorrectiveActionsForReport(reportId) {
  if (!supabase) return { data: [], error: null };
  const { data, error } = await supabase
    .from('asap_corrective_actions')
    .select('*')
    .eq('report_id', reportId)
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}

export async function createAsapCorrectiveAction(orgId, action) {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
  const { data, error } = await supabase
    .from('asap_corrective_actions')
    .insert({ org_id: orgId, ...action })
    .select()
    .single();
  return { data, error };
}

export async function updateAsapCorrectiveAction(actionId, updates) {
  if (!supabase) return { data: null, error: null };
  const { data, error } = await supabase
    .from('asap_corrective_actions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', actionId)
    .select()
    .single();
  return { data, error };
}

export async function deleteAsapCorrectiveAction(actionId) {
  if (!supabase) return { error: null };
  return supabase.from('asap_corrective_actions').delete().eq('id', actionId);
}

export async function fetchAsapMeetings(orgId) {
  if (!supabase) return { data: [], error: null };
  const { data, error } = await supabase
    .from('asap_meetings')
    .select('*')
    .eq('org_id', orgId)
    .order('meeting_date', { ascending: false });
  return { data: data || [], error };
}

export async function createAsapMeeting(orgId, meeting) {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
  const { data, error } = await supabase
    .from('asap_meetings')
    .insert({ org_id: orgId, ...meeting })
    .select()
    .single();
  return { data, error };
}

export async function updateAsapMeeting(meetingId, updates) {
  if (!supabase) return { data: null, error: null };
  const { data, error } = await supabase
    .from('asap_meetings')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', meetingId)
    .select()
    .single();
  return { data, error };
}

export async function deleteAsapMeeting(meetingId) {
  if (!supabase) return { error: null };
  return supabase.from('asap_meetings').delete().eq('id', meetingId);
}

// ── INTERNATIONAL COMPLIANCE ──────────────────────────────────

export async function fetchComplianceFrameworks(orgId) {
  if (!supabase) return { data: [], error: null };
  const { data, error } = await supabase
    .from('compliance_frameworks')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: true });
  return { data: data || [], error };
}

export async function upsertComplianceFramework(orgId, framework) {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
  const { data, error } = await supabase
    .from('compliance_frameworks')
    .upsert({ org_id: orgId, ...framework, updated_at: new Date().toISOString() }, { onConflict: 'org_id,framework' })
    .select()
    .single();
  return { data, error };
}

export async function deleteComplianceFramework(frameworkId) {
  if (!supabase) return { error: null };
  return supabase.from('compliance_frameworks').delete().eq('id', frameworkId);
}

export async function fetchComplianceChecklistItems(framework) {
  if (!supabase) return { data: [], error: null };
  const { data, error } = await supabase
    .from('compliance_checklist_items')
    .select('*')
    .eq('framework', framework)
    .order('sort_order', { ascending: true });
  return { data: data || [], error };
}

export async function fetchAllComplianceChecklistItems() {
  if (!supabase) return { data: [], error: null };
  const { data, error } = await supabase
    .from('compliance_checklist_items')
    .select('*')
    .order('sort_order', { ascending: true });
  return { data: data || [], error };
}

export async function fetchComplianceStatus(orgId) {
  if (!supabase) return { data: [], error: null };
  const { data, error } = await supabase
    .from('compliance_status')
    .select('*')
    .eq('org_id', orgId);
  return { data: data || [], error };
}

export async function upsertComplianceStatus(orgId, status) {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
  const { data, error } = await supabase
    .from('compliance_status')
    .upsert({ org_id: orgId, ...status, updated_at: new Date().toISOString() }, { onConflict: 'org_id,checklist_item_id' })
    .select()
    .single();
  return { data, error };
}

export async function fetchComplianceCrosswalk() {
  if (!supabase) return { data: [], error: null };
  const { data, error } = await supabase
    .from('compliance_crosswalk')
    .select('*')
    .order('source_section', { ascending: true });
  return { data: data || [], error };
}

// ── INSURANCE DATA EXPORT & SAFETY SCORECARD ─────────────────
export async function fetchInsuranceExports(orgId) {
  if (!supabase) return { data: [], error: null };
  const { data, error } = await supabase
    .from('insurance_exports')
    .select('*')
    .eq('org_id', orgId)
    .order('generated_at', { ascending: false });
  return { data: data || [], error };
}

export async function createInsuranceExport(orgId, exportData) {
  if (!supabase) return { data: null, error: null };
  const { data, error } = await supabase
    .from('insurance_exports')
    .insert({ org_id: orgId, ...exportData })
    .select()
    .single();
  return { data, error };
}

export async function fetchSafetyDigests(orgId) {
  if (!supabase) return { data: [], error: null };
  const { data, error } = await supabase
    .from('safety_digests')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(20);
  return { data: data || [], error };
}

export async function deleteInsuranceExport(exportId) {
  if (!supabase) return { error: null };
  return supabase.from('insurance_exports').delete().eq('id', exportId);
}

export async function uploadInsuranceExportPdf(orgId, exportId, pdfBlob) {
  if (!supabase) return { data: null, error: null };
  const sizeErr = checkFileSize(pdfBlob);
  if (sizeErr) return { data: null, ...sizeErr };
  const path = `${orgId}/${exportId}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from('insurance-exports')
    .upload(path, pdfBlob, { upsert: true, contentType: 'application/pdf' });
  if (uploadError) return { data: null, error: uploadError };
  const { data: urlData } = supabase.storage.from('insurance-exports').getPublicUrl(path);
  return { data: urlData?.publicUrl || path, error: null };
}
