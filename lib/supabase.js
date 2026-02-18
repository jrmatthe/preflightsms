import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase env vars not set — running in offline/localStorage mode');
}

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// ── AUTH HELPERS ───────────────────────────────────────────────
export async function signUp(email, password, fullName, orgId) {
  if (!supabase) return { error: { message: 'Supabase not configured' } };
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { error };
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
    num_crew: entry.numCrew || '',
    num_pax: entry.numPax || '',
    score: entry.score,
    risk_level: entry.riskLevel,
    factors: entry.factors || [],
    wx_briefing: entry.wxBriefing || '',
    remarks: entry.remarks || '',
    attachments: entry.attachments || [],
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
export async function createFlight(orgId, fratId, entry) {
  if (!supabase) return { error: { message: 'Supabase not configured' } };
  const { data, error } = await supabase.from('flights').insert({
    org_id: orgId,
    frat_id: fratId,
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
    fuel_lbs: entry.fuelLbs || '',
    num_crew: entry.numCrew || '',
    num_pax: entry.numPax || '',
    score: entry.score,
    risk_level: entry.riskLevel,
    status: 'ACTIVE',
  }).select().single();
  return { data, error };
}

export async function fetchFlights(orgId) {
  if (!supabase) return { data: [], error: null };
  const { data, error } = await supabase
    .from('flights')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}

export async function updateFlightStatus(flightId, status) {
  if (!supabase) return { error: null };
  const updates = { status };
  if (status === 'ARRIVED' || status === 'CANCELLED') {
    updates.arrived_at = new Date().toISOString();
  }
  return supabase.from('flights').update(updates).eq('id', flightId);
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
  }).select().single();
  return { data, error };
}

export async function fetchReports(orgId) {
  if (!supabase) return { data: [], error: null };
  const { data, error } = await supabase
    .from('safety_reports')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}

export async function updateReport(reportId, updates) {
  if (!supabase) return { error: null };
  return supabase.from('safety_reports').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', reportId);
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
    initial_likelihood: hazard.initialLikelihood,
    initial_severity: hazard.initialSeverity,
    mitigations: hazard.mitigations || '',
    residual_likelihood: hazard.residualLikelihood || null,
    residual_severity: hazard.residualSeverity || null,
    status: hazard.status || 'identified',
    review_date: hazard.reviewDate || null,
    responsible_person: hazard.responsiblePerson || '',
    related_report_id: hazard.relatedReportId || null,
  }).select().single();
  return { data, error };
}

export async function fetchHazards(orgId) {
  if (!supabase) return { data: [], error: null };
  const { data, error } = await supabase
    .from('hazard_register')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}

export async function updateHazard(hazardId, updates) {
  if (!supabase) return { error: null };
  return supabase.from('hazard_register').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', hazardId);
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
    assigned_to_name: action.assignedToName || '',
    due_date: action.dueDate || null,
    priority: action.priority || 'medium',
  }).select().single();
  return { data, error };
}

export async function fetchActions(orgId) {
  if (!supabase) return { data: [], error: null };
  const { data, error } = await supabase
    .from('corrective_actions')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });
  return { data: data || [], error };
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
    .select('id, full_name, role, email, created_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: true });
  return { data: data || [], error };
}

export async function updateProfileRole(profileId, role) {
  if (!supabase) return { error: null };
  return supabase.from('profiles').update({ role }).eq('id', profileId);
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
    effective_date: policy.effectiveDate || null,
    review_date: policy.reviewDate || null,
    status: policy.status || 'active',
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

export async function updatePolicy(policyId, updates) {
  if (!supabase) return { error: null };
  return supabase.from('policy_documents').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', policyId);
}

export async function acknowledgePolicy(orgId, policyId, userId) {
  if (!supabase) return { error: null };
  return supabase.from('policy_acknowledgments').upsert({
    org_id: orgId, policy_id: policyId, user_id: userId,
  }, { onConflict: 'policy_id,user_id' });
}

// ── TRAINING ──────────────────────────────────────────────────
export async function createTrainingRequirement(orgId, req) {
  if (!supabase) return { error: { message: 'Supabase not configured' } };
  const { data, error } = await supabase.from('training_requirements').insert({
    org_id: orgId,
    title: req.title,
    description: req.description || '',
    category: req.category || 'sms',
    required_for: req.requiredFor || ['pilot'],
    frequency_months: req.frequencyMonths || 12,
  }).select().single();
  return { data, error };
}

export async function fetchTrainingRequirements(orgId) {
  if (!supabase) return { data: [], error: null };
  const { data, error } = await supabase
    .from('training_requirements')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}

export async function createTrainingRecord(orgId, userId, record) {
  if (!supabase) return { error: { message: 'Supabase not configured' } };
  const { data, error } = await supabase.from('training_records').insert({
    org_id: orgId,
    user_id: userId,
    requirement_id: record.requirementId || null,
    title: record.title,
    completed_date: record.completedDate,
    expiry_date: record.expiryDate || null,
    instructor: record.instructor || '',
    notes: record.notes || '',
  }).select().single();
  return { data, error };
}

export async function fetchTrainingRecords(orgId) {
  if (!supabase) return { data: [], error: null };
  const { data, error } = await supabase
    .from('training_records')
    .select('*, user:profiles!training_records_user_id_fkey(full_name)')
    .eq('org_id', orgId)
    .order('completed_date', { ascending: false });
  if (error) {
    // Fallback without join if foreign key name doesn't match
    const fallback = await supabase
      .from('training_records')
      .select('*')
      .eq('org_id', orgId)
      .order('completed_date', { ascending: false });
    return { data: fallback.data || [], error: null };
  }
  return { data: data || [], error };
}

// ── Org Logo ──────────────────────────────────────────────
export async function uploadOrgLogo(orgId, file) {
  if (!supabase) return { url: null, error: 'Not connected' };
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
    .single();
  return { data, error };
}

export async function upsertFratTemplate(orgId, template) {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
  
  // Check if active template exists
  const { data: existing } = await supabase
    .from('frat_templates')
    .select('id')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .single();
  
  if (existing) {
    // Update existing
    const { data, error } = await supabase
      .from('frat_templates')
      .update({
        name: template.name || 'Default FRAT',
        categories: template.categories,
        aircraft_types: template.aircraft_types,
        risk_thresholds: template.risk_thresholds,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();
    return { data, error };
  } else {
    // Insert new
    const { data, error } = await supabase
      .from('frat_templates')
      .insert({
        org_id: orgId,
        name: template.name || 'Default FRAT',
        is_active: true,
        categories: template.categories,
        aircraft_types: template.aircraft_types,
        risk_thresholds: template.risk_thresholds,
      })
      .select()
      .single();
    return { data, error };
  }
}

// ── FRAT ATTACHMENTS ────────────────────────────────────────
export async function uploadFratAttachment(orgId, fratCode, file) {
  if (!supabase) return { url: null, error: { message: 'Supabase not configured' } };
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

// ── NOTIFICATION CONTACTS ───────────────────────────────────
export async function fetchNotificationContacts(orgId) {
  if (!supabase) return { data: [], error: null };
  const { data, error } = await supabase
    .from('notification_contacts')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: true });
  return { data: data || [], error };
}

export async function createNotificationContact(orgId, contact) {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
  const { data, error } = await supabase
    .from('notification_contacts')
    .insert({ org_id: orgId, ...contact })
    .select().single();
  return { data, error };
}

export async function updateNotificationContact(id, updates) {
  if (!supabase) return { error: null };
  return supabase.from('notification_contacts').update(updates).eq('id', id);
}

export async function deleteNotificationContact(id) {
  if (!supabase) return { error: null };
  return supabase.from('notification_contacts').delete().eq('id', id);
}
