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
    num_crew: entry.numCrew || '',
    num_pax: entry.numPax || '',
    score: entry.score,
    risk_level: entry.riskLevel,
    factors: entry.factors || [],
    wx_briefing: entry.wxBriefing || '',
    remarks: entry.remarks || '',
    attachments: entry.attachments || [],
    approval_status: entry.approvalStatus || 'auto_approved',
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
export async function createFlight(orgId, fratId, entry, requiresApproval = false) {
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
    status: requiresApproval ? 'PENDING_APPROVAL' : 'ACTIVE',
    approval_status: requiresApproval ? 'pending' : 'approved',
  }).select().single();
  return { data, error };
}

export async function approveFlight(flightId, userId, notes) {
  if (!supabase) return { error: null };
  return supabase.from('flights').update({
    status: 'ACTIVE',
    approval_status: 'approved',
  }).eq('id', flightId);
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
  return supabase.from('flights').update({
    status: 'REJECTED',
    approval_status: 'rejected',
  }).eq('id', flightId);
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

export async function updateProfilePermissions(profileId, permissions) {
  if (!supabase) return { error: null };
  return supabase.from('profiles').update({ permissions }).eq('id', profileId);
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
        version: manual.version || existing.version,
        status: manual.status === 'active' ? 'active' : 'draft',
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
        version: manual.version || '1.0',
        content,
        effective_date: new Date().toISOString().split('T')[0],
        status: manual.status === 'active' ? 'active' : 'draft',
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

// ── CREW ROSTER ──────────────────────────────────────────────
export async function fetchCrewRecords(orgId) {
  if (!supabase) return { data: [], error: null };
  const { data, error } = await supabase
    .from('crew_records')
    .select('*')
    .eq('org_id', orgId)
    .order('full_name', { ascending: true });
  return { data: data || [], error };
}

export async function createCrewRecord(orgId, record) {
  if (!supabase) return { data: null, error: { message: 'Not configured' } };
  const { data, error } = await supabase
    .from('crew_records')
    .insert({ org_id: orgId, ...record })
    .select().single();
  return { data, error };
}

export async function updateCrewRecord(id, updates) {
  if (!supabase) return { error: null };
  return supabase.from('crew_records').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
}

export async function deleteCrewRecord(id) {
  if (!supabase) return { error: null };
  return supabase.from('crew_records').delete().eq('id', id);
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

export async function upsertSmsManual(orgId, manual) {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
  if (manual.id) {
    const { data, error } = await supabase
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
      .eq('id', manual.id)
      .select()
      .single();
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

export async function saveSmsSignatures(orgId, signatures) {
  if (!supabase) return { error: { message: 'Supabase not configured' } };
  const { data: current } = await supabase.from('organizations').select('settings').eq('id', orgId).single();
  const settings = { ...(current?.settings || {}), sms_signatures: signatures };
  return supabase.from('organizations').update({ settings }).eq('id', orgId);
}
