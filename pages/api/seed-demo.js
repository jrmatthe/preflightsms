// /api/seed-demo — Creates and seeds a demo organization with realistic data
// POST with Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
// Re-runnable: clears and re-seeds each time

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_KEY;

// ── Helpers ──────────────────────────────────────────────────
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}
function dateOnly(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}
function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
}
function dateFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function uid() { return crypto.randomUUID(); }

// ── Constants ────────────────────────────────────────────────
const DEMO_ORG_SLUG = "cascade-charter-demo";
const DEMO_PASSWORD = "PreflightDemo2026!";

const DEMO_USERS = [
  { email: "admin@demo.preflightsms.com", name: "James Mitchell", role: "admin" },
  { email: "sarah.chen@demo.preflightsms.com", name: "Sarah Chen", role: "chief_pilot" },
  { email: "mike.rodriguez@demo.preflightsms.com", name: "Mike Rodriguez", role: "pilot" },
  { email: "david.park@demo.preflightsms.com", name: "David Park", role: "pilot" },
  { email: "lisa.thompson@demo.preflightsms.com", name: "Lisa Thompson", role: "safety_manager" },
];

const AIRCRAFT = [
  { type: "PILATUS PC-12/47E", registration: "N512PC", serial_number: "PC12-1847", year: 2021, max_passengers: 9, base_location: "KSEA", dual_fuel_tanks: false },
  { type: "CESSNA CITATION CJ3+", registration: "N525CJ", serial_number: "525B-0742", year: 2019, max_passengers: 7, base_location: "KSEA", dual_fuel_tanks: true },
  { type: "BEECHCRAFT KING AIR 200", registration: "N200KA", serial_number: "BB-1635", year: 2017, max_passengers: 7, base_location: "KSEA", dual_fuel_tanks: true },
  { type: "PILATUS PC-12/47E", registration: "N947PC", serial_number: "PC12-2103", year: 2023, max_passengers: 9, base_location: "KBFI", dual_fuel_tanks: false },
];

const ROUTES = [
  { dep: "KSEA", dest: "KBOI" }, { dep: "KSEA", dest: "KPDX" }, { dep: "KSEA", dest: "KGEG" },
  { dep: "KBFI", dest: "KSFF" }, { dep: "KSEA", dest: "KYKM" }, { dep: "KPDX", dest: "KSEA" },
  { dep: "KBOI", dest: "KSEA" }, { dep: "KGEG", dest: "KBFI" }, { dep: "KSFF", dest: "KSEA" },
  { dep: "KSEA", dest: "KPSC" }, { dep: "KBFI", dest: "KOLM" }, { dep: "KOLM", dest: "KBFI" },
  { dep: "KSEA", dest: "KBLI" }, { dep: "KPSC", dest: "KSEA" }, { dep: "KBLI", dest: "KSEA" },
];

const RISK_FACTORS = [
  "wx_marginal_vfr", "wx_ifr", "wx_convective", "wx_icing", "wx_winds",
  "pilot_unfamiliar_airport", "pilot_fatigue", "pilot_low_recent",
  "ac_mel", "ac_unfamiliar_type",
  "ops_night", "ops_mountainous", "ops_high_density",
  "pax_special", "env_wildlife",
];

const REPORT_TEMPLATES = [
  { title: "Bird strike on final approach", type: "incident", category: "wildlife", severity: "medium", phase: "approach", desc: "Single bird strike on the left wing during final approach to runway 16R. No damage observed during post-flight inspection but dent found on leading edge." },
  { title: "Runway incursion during taxi", type: "near_miss", category: "ground_ops", severity: "high", phase: "taxi", desc: "Ground vehicle crossed runway 28L while aircraft was on short final. Tower issued go-around instruction. Vehicle driver was maintenance crew." },
  { title: "Fuel gauge discrepancy noted", type: "hazard", category: "mechanical", severity: "medium", phase: "preflight", desc: "Left fuel gauge reading 15 gallons lower than expected based on fueling records. Maintenance notified. Dip stick confirmed actual fuel level matched fueling records." },
  { title: "Communication breakdown with ATC", type: "concern", category: "communication", severity: "low", phase: "cruise", desc: "Frequency congestion on Seattle Approach led to missed clearance. Pilot requested repeat and received amended clearance. No deviation occurred." },
  { title: "Hydraulic fluid leak during preflight", type: "hazard", category: "maintenance", severity: "high", phase: "preflight", desc: "Small puddle of hydraulic fluid observed under the nose gear during preflight walk-around. Aircraft grounded pending maintenance inspection." },
  { title: "Unstable approach at KBOI", type: "near_miss", category: "procedures", severity: "medium", phase: "approach", desc: "Aircraft was 20 knots fast and 500ft high on 3-mile final. Pilot executed go-around per SOP. Second approach was stable and uneventful." },
  { title: "Passenger medical emergency", type: "incident", category: "cabin_safety", severity: "medium", phase: "cruise", desc: "Passenger reported chest pain at FL095. Pilot diverted to nearest suitable airport (KGEG). Passenger transported to hospital via ambulance." },
  { title: "Fatigue-related checklist skip", type: "concern", category: "fatigue", severity: "low", phase: "preflight", desc: "Pilot self-reported skipping two items on the preflight checklist due to early morning fatigue. Items were completed upon realization. No impact to flight safety." },
  { title: "Near mid-air collision in traffic pattern", type: "near_miss", category: "airspace", severity: "critical", phase: "approach", desc: "Unidentified VFR traffic passed within 200ft on left downwind at KBFI. No TCAS alert. Reported to tower." },
  { title: "Tire damage found during post-flight", type: "hazard", category: "maintenance", severity: "low", phase: "post_flight", desc: "Small cut found on main gear right tire during post-flight inspection. Within serviceable limits but documented for tracking." },
  { title: "Weather deterioration during flight", type: "incident", category: "weather", severity: "medium", phase: "cruise", desc: "Unexpected rapid weather deterioration en route to KPDX. Ceilings dropped from 3000 to 800 AGL. Diverted to KOLM as alternate." },
  { title: "Engine roughness during climb", type: "incident", category: "mechanical", severity: "high", phase: "climb", desc: "Intermittent engine roughness noted passing through 4000ft MSL. Returned to KSEA. Maintenance found fouled spark plug on cylinder 3." },
];

const TRAINING_REQS = [
  { title: "SMS Initial Training", category: "sms", frequency_months: 0, required_for: ["pilot", "safety_manager", "chief_pilot", "admin"] },
  { title: "SMS Recurrent Training", category: "recurrent", frequency_months: 12, required_for: ["pilot", "safety_manager", "chief_pilot", "admin"] },
  { title: "CRM / Human Factors", category: "crew_resource", frequency_months: 12, required_for: ["pilot", "chief_pilot"] },
  { title: "Emergency Procedures Review", category: "emergency", frequency_months: 12, required_for: ["pilot", "chief_pilot"] },
  { title: "Hazmat Awareness", category: "hazmat", frequency_months: 24, required_for: ["pilot", "chief_pilot"] },
  { title: "Aircraft-Specific Checkout — PC-12", category: "aircraft_specific", frequency_months: 12, required_for: ["pilot"] },
  { title: "Aircraft-Specific Checkout — CJ3+", category: "aircraft_specific", frequency_months: 12, required_for: ["pilot"] },
  { title: "Security Awareness Training", category: "security", frequency_months: 12, required_for: ["pilot", "safety_manager", "chief_pilot", "admin"] },
];

const POLICIES = [
  { title: "Safety Policy Statement", category: "safety_policy", desc: "Organization safety policy outlining commitment to SMS and safety culture.", version: "2.1" },
  { title: "Standard Operating Procedures", category: "sop", desc: "Comprehensive SOPs for all flight operations including preflight, in-flight, and post-flight procedures.", version: "3.0" },
  { title: "Emergency Response Procedures", category: "emergency_procedures", desc: "Procedures for handling various emergency scenarios including engine failure, medical emergencies, and weather diversions.", version: "1.5" },
  { title: "Fatigue Risk Management Policy", category: "safety_policy", desc: "Policy governing pilot rest requirements, fatigue reporting, and mitigation strategies.", version: "1.0" },
];

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  // Auth: require service role key
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token || token !== SERVICE_ROLE_KEY) {
    return res.status(401).json({ error: "Unauthorized — provide service role key as Bearer token" });
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: "Missing SUPABASE_URL or SERVICE_ROLE_KEY" });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const log = [];
  const errors = [];

  try {
    // ── 1. Create or find demo org ──────────────────────────────
    let orgId;
    const { data: existingOrg } = await supabase.from("organizations").select("id").eq("slug", DEMO_ORG_SLUG).single();

    if (existingOrg) {
      orgId = existingOrg.id;
      log.push("Found existing demo org: " + orgId);

      // Clear all existing data
      const tables = [
        // Delete in FK-safe order: children before parents
        "nudge_responses",                           // FK → flights (no cascade)
        "foreflight_flights", "foreflight_config",   // FK → frat_submissions, flights
        "schedaero_trips", "schedaero_config",       // FK → frat_submissions, flights
        "fatigue_assessments",                       // FK → frat_submissions
        "cbt_progress", "cbt_enrollments", "cbt_lessons", "cbt_courses", // FK chain: progress/enrollments → lessons → courses
        "notifications", "policy_acknowledgments", "training_records",
        "training_requirements", "corrective_actions", "hazard_register", "safety_reports",
        "flights", "frat_submissions", "policy_documents",
        "erp_acknowledgments", "erp_drills", "erp_call_tree", "erp_checklist_items", "erp_plans",
        "aircraft", "spi_measurements",
        "safety_performance_targets", "safety_performance_indicators", "trend_alerts",
        "ai_suggestions", "ai_usage_log", "audits", "audit_templates", "culture_survey_results",
        "culture_survey_responses", "culture_surveys", "management_of_change",
        "sms_manuals", "compliance_status", "declarations", "mel_audit_log",
      ];
      for (const t of tables) {
        const { error } = await supabase.from(t).delete().eq("org_id", orgId);
        if (error && !error.message.includes("does not exist")) {
          log.push(`Warning clearing ${t}: ${error.message}`);
        }
      }
      // Ensure org settings are correct
      await supabase.from("organizations").update({
        tier: "professional",
        subscription_status: "active",
        trial_ends_at: daysFromNow(365),
        max_aircraft: 20,
        fleet_status_enabled: true,
      }).eq("id", orgId);
      log.push("Cleared existing demo data");
    } else {
      const { data: newOrg, error: orgErr } = await supabase.from("organizations").insert({
        name: "Cascade Charter Aviation",
        slug: DEMO_ORG_SLUG,
        certificate_number: "C135A-2024-0847",
        tier: "professional",
        max_aircraft: 20,
        subscription_status: "active",
        trial_ends_at: daysFromNow(365),
        fleet_status_enabled: true,
        gamification_enabled: false,
        settings: {},
      }).select().single();
      if (orgErr) throw new Error("Failed to create org: " + orgErr.message);
      orgId = newOrg.id;
      log.push("Created demo org: " + orgId);
    }

    // ── 2. Create demo users ────────────────────────────────────
    const userIds = {};
    for (const u of DEMO_USERS) {
      // Check if user exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existing = existingUsers?.users?.find(x => x.email === u.email);

      let userId;
      if (existing) {
        userId = existing.id;
        // Update password
        await supabase.auth.admin.updateUserById(userId, { password: DEMO_PASSWORD });
        log.push(`Found existing user: ${u.email}`);
      } else {
        const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
          email: u.email,
          password: DEMO_PASSWORD,
          email_confirm: true,
          user_metadata: { full_name: u.name },
        });
        if (authErr) throw new Error(`Failed to create user ${u.email}: ${authErr.message}`);
        userId = authUser.user.id;
        log.push(`Created user: ${u.email} (${userId})`);
      }
      userIds[u.email] = userId;

      // Upsert profile
      await supabase.from("profiles").upsert({
        id: userId,
        org_id: orgId,
        full_name: u.name,
        email: u.email,
        role: u.role,
      }, { onConflict: "id" });
    }

    const adminId = userIds[DEMO_USERS[0].email];
    const pilots = DEMO_USERS.filter(u => ["pilot", "chief_pilot"].includes(u.role));
    const pilotIds = pilots.map(u => userIds[u.email]);
    const allUserIds = Object.values(userIds);
    const safetyMgrId = userIds[DEMO_USERS[4].email];

    // ── 3. Create aircraft ──────────────────────────────────────
    const aircraftIds = {};
    for (const ac of AIRCRAFT) {
      const { data, error } = await supabase.from("aircraft").insert({
        org_id: orgId,
        ...ac,
        status_field_defs: [{ name: "Oil Level" }],
      }).select().single();
      if (error) throw new Error(`Failed to create aircraft ${ac.registration}: ${error.message}`);
      aircraftIds[ac.registration] = data.id;
      log.push(`Created aircraft: ${ac.registration}`);
    }

    // Add MEL items to the King Air
    const melItems = [
      {
        id: uid(), description: "Autopilot yaw damper inoperative", mel_reference: "MEL 22-10",
        category: "C", status: "open", notes: "Yaw damper STC'd — manual rudder coordination required. Flight in known icing prohibited.",
        deferred_date: dateOnly(18), expiration_date: dateFromNow(72),
        deferred_by: pilotIds[0], deferred_by_name: pilots[0].name,
      },
      {
        id: uid(), description: "Left landing light inoperative", mel_reference: "MEL 33-40",
        category: "C", status: "open", notes: "Right landing light and taxi light operational. Day operations preferred.",
        deferred_date: dateOnly(5), expiration_date: dateFromNow(85),
        deferred_by: pilotIds[1], deferred_by_name: pilots[1].name,
      },
      {
        id: uid(), description: "Pitot heat replaced", mel_reference: "MEL 34-10",
        category: "B", status: "closed", notes: "New pitot heater element installed and tested.",
        deferred_date: dateOnly(60), expiration_date: dateOnly(27),
        closed_date: dateOnly(45), rectified_by: adminId, rectified_by_name: "Lisa Thompson",
        work_performed: "Replaced pitot heater element P/N 101-384007-3. Ground and flight tested. Operational.",
      },
    ];
    await supabase.from("aircraft").update({
      mel_items: melItems,
      last_location: "KSEA",
      parking_spot: "Hangar 4",
      fuel_remaining: "280",
      fuel_unit: "lbs",
      status_updated_at: daysAgo(1),
    }).eq("id", aircraftIds["N200KA"]);

    // Update other aircraft with status
    await supabase.from("aircraft").update({ last_location: "KBOI", parking_spot: "FBO Ramp", fuel_remaining: "1820", fuel_unit: "lbs", status_updated_at: daysAgo(2) }).eq("id", aircraftIds["N512PC"]);
    await supabase.from("aircraft").update({ last_location: "KSEA", parking_spot: "Hangar 2", fuel_remaining: "2400", fuel_unit: "lbs", status_updated_at: daysAgo(0) }).eq("id", aircraftIds["N525CJ"]);
    await supabase.from("aircraft").update({ last_location: "KGEG", parking_spot: "Atlantic FBO", fuel_remaining: "1650", fuel_unit: "lbs", status_updated_at: daysAgo(3) }).eq("id", aircraftIds["N947PC"]);
    // Set dual tank fuel for the Citation and King Air
    await supabase.from("aircraft").update({ fuel_remaining_left: "1200", fuel_remaining_right: "1200" }).eq("id", aircraftIds["N525CJ"]);
    await supabase.from("aircraft").update({ fuel_remaining_left: "140", fuel_remaining_right: "140" }).eq("id", aircraftIds["N200KA"]);

    log.push("Created 4 aircraft with MEL items and status");

    // ── 4. Create FRATs + Flights ───────────────────────────────
    const fratIds = [];
    const flightIds = [];

    for (let i = 0; i < 55; i++) {
      const dAgo = randInt(0, 140);
      const pilot = pick(pilots);
      const pilotId = userIds[pilot.email];
      const ac = pick(AIRCRAFT);
      const route = pick(ROUTES);
      const score = randInt(3, 45);
      const riskLevel = score <= 15 ? "LOW RISK" : score <= 30 ? "MODERATE RISK" : score <= 40 ? "HIGH RISK" : "CRITICAL";
      const numFactors = score <= 15 ? randInt(1, 3) : score <= 30 ? randInt(2, 5) : randInt(4, 7);
      const factors = [];
      const available = [...RISK_FACTORS];
      for (let f = 0; f < Math.min(numFactors, available.length); f++) {
        const idx = randInt(0, available.length - 1);
        factors.push(available.splice(idx, 1)[0]);
      }

      const fratCode = `FRAT-${String(100 + i).padStart(4, "0")}`;
      const fratId = uid();
      const flightId = uid();

      const isArrived = dAgo > 0;
      const isCancelled = !isArrived && Math.random() < 0.05;
      const status = isCancelled ? "CANCELLED" : isArrived ? "ARRIVED" : "ACTIVE";

      const { error: fratErr } = await supabase.from("frat_submissions").insert({
        id: fratId, org_id: orgId, user_id: pilotId,
        frat_code: fratCode, pilot: pilot.name, aircraft: ac.type, tail_number: ac.registration,
        departure: route.dep, destination: route.dest, cruise_alt: String(randInt(35, 120) * 100),
        flight_date: dateOnly(dAgo), etd: `${String(randInt(6, 20)).padStart(2, "0")}:${pick(["00", "15", "30", "45"])}`,
        ete: `${randInt(1, 3)}:${pick(["00", "15", "30", "45"])}`,
        fuel_lbs: String(randInt(30, 120)), fuel_unit: "gal",
        num_crew: "1", num_pax: String(randInt(0, ac.max_passengers)),
        score, risk_level: riskLevel, factors,
        created_at: daysAgo(dAgo),
        fatigue_score: Math.random() < 0.3 ? randInt(10, 70) : null,
        fatigue_risk_level: null,
      });
      if (fratErr) { errors.push(`FRAT ${fratCode}: ${fratErr.message}`); continue; }
      fratIds.push(fratId);

      const { error: flightErr } = await supabase.from("flights").insert({
        id: flightId, org_id: orgId, user_id: pilotId, frat_id: fratId, frat_code: fratCode,
        pilot: pilot.name, aircraft: ac.type, tail_number: ac.registration,
        departure: route.dep, destination: route.dest,
        etd: `${String(randInt(6, 20)).padStart(2, "0")}:${pick(["00", "15", "30", "45"])}`,
        ete: `${randInt(1, 3)}:${pick(["00", "15", "30", "45"])}`,
        fuel_lbs: String(randInt(30, 120)), num_crew: "1", num_pax: String(randInt(0, ac.max_passengers)),
        score, risk_level: riskLevel,
        status,
        created_at: daysAgo(dAgo),
        arrived_at: isArrived ? daysAgo(dAgo) : null,
        parking_spot: isArrived ? pick(["A1", "A3", "B2", "C4", "FBO Main", "Ramp 2", "Hangar 3"]) : "",
        fuel_remaining: isArrived ? String(randInt(15, 60)) : "",
        fuel_unit: isArrived ? "gal" : "",
      });
      if (flightErr) { errors.push(`Flight ${fratCode}: ${flightErr.message}`); continue; }
      flightIds.push(flightId);
    }
    log.push(`Created ${fratIds.length} FRATs and flights`);

    // ── 4b. ForeFlight Dispatch Integration ──────────────────────
    // Create foreflight config (looks like a connected ForeFlight Dispatch account)
    await supabase.from("foreflight_config").insert({
      org_id: orgId,
      api_key: "ff_demo_cascade_api_key",
      api_secret: "ff_demo_cascade_secret",
      enabled: true,
      sync_interval_minutes: 5,
      auto_create_frats: false,
      notify_pilots_on_sync: true,
      push_frat_enabled: true,
      last_synced_at: daysAgo(0),
      last_sync_error: null,
    });

    // Create ForeFlight flights — mix of pending (upcoming) and already-linked-to-FRATs
    const ffRoutes = [
      { dep: "KSEA", dest: "KPDX", type: "PILATUS PC-12/47E", tail: "N512PC", pax: 6, fuel: 1850, alt: "FL210", route: "SEA V23 BTG PDX", ete: 35 },
      { dep: "KBFI", dest: "KGEG", type: "PILATUS PC-12/47E", tail: "N947PC", pax: 7, fuel: 2100, alt: "FL250", route: "BFI V2 ELN GEG", ete: 65 },
      { dep: "KSEA", dest: "KBOI", type: "CESSNA CITATION CJ3+", tail: "N525CJ", pax: 5, fuel: 3200, alt: "FL370", route: "SEA J1 BOI", ete: 55 },
      { dep: "KPDX", dest: "KSEA", type: "BEECHCRAFT KING AIR 200", tail: "N200KA", pax: 4, fuel: 2800, alt: "FL230", route: "PDX V23 SEA", ete: 30 },
      { dep: "KSEA", dest: "KYKM", type: "PILATUS PC-12/47E", tail: "N512PC", pax: 3, fuel: 1400, alt: "FL190", route: "SEA V287 YKM", ete: 40 },
      { dep: "KGEG", dest: "KBFI", type: "CESSNA CITATION CJ3+", tail: "N525CJ", pax: 6, fuel: 2900, alt: "FL350", route: "GEG J12 ELN BFI", ete: 50 },
    ];

    // Pending flights (today + tomorrow) — these show on home page "My Flights Today"
    const now = new Date();
    const adminUser = DEMO_USERS[0]; // James Mitchell — admin account used for demos
    const pendingFfFlights = [
      { ...ffRoutes[0], pilot: adminUser, hoursFromNow: 2, notes: "Client pickup — 6 passengers to Portland meeting" },
      { ...ffRoutes[2], pilot: adminUser, hoursFromNow: 5, notes: "Charter to Boise — 5 pax corporate group" },
      { ...ffRoutes[1], pilot: pilots[1], hoursFromNow: 4, notes: "Charter to Spokane — return same day" },
      { ...ffRoutes[4], pilot: adminUser, hoursFromNow: 26, notes: "Yakima medevac positioning flight" },
      { ...ffRoutes[5], pilot: pilots[0], hoursFromNow: 28, notes: "Repositioning flight" },
    ];

    for (const pf of pendingFfFlights) {
      const etd = new Date(now.getTime() + pf.hoursFromNow * 60 * 60 * 1000);
      const eta = new Date(etd.getTime() + pf.ete * 60 * 1000);
      await supabase.from("foreflight_flights").insert({
        id: uid(), org_id: orgId,
        foreflight_id: `FF-${uid().slice(0, 8).toUpperCase()}`,
        departure_icao: pf.dep, destination_icao: pf.dest,
        tail_number: pf.tail, aircraft_type: pf.type,
        pilot_name: pf.pilot.name, pilot_email: pf.pilot.email,
        etd: etd.toISOString(), eta: eta.toISOString(),
        status: "pending", frat_id: null, flight_id: null,
        frat_push_status: "none",
        matched_pilot_id: userIds[pf.pilot.email],
        passenger_count: pf.pax, crew_count: 1,
        fuel_lbs: pf.fuel, cruise_alt: pf.alt,
        route: pf.route, ete_minutes: pf.ete,
        dispatcher_notes: pf.notes,
        raw_data: { releaseStatus: "released", flightType: "charter" },
      });
    }

    // Already-completed flights linked to recent FRATs (shows ForeFlight integration history)
    const recentFratIndices = fratIds.length > 8 ? [0, 1, 2, 3, 4, 5, 6, 7] : [];
    for (let i = 0; i < Math.min(recentFratIndices.length, ffRoutes.length); i++) {
      const idx = recentFratIndices[i];
      const r = ffRoutes[i % ffRoutes.length];
      const dAgo = randInt(1, 14);
      const etd = new Date(now.getTime() - dAgo * 24 * 60 * 60 * 1000 + randInt(6, 18) * 60 * 60 * 1000);
      const eta = new Date(etd.getTime() + r.ete * 60 * 1000);
      const pilotForFlight = pick(pilots);
      await supabase.from("foreflight_flights").insert({
        id: uid(), org_id: orgId,
        foreflight_id: `FF-${uid().slice(0, 8).toUpperCase()}`,
        departure_icao: r.dep, destination_icao: r.dest,
        tail_number: r.tail, aircraft_type: r.type,
        pilot_name: pilotForFlight.name, pilot_email: pilotForFlight.email,
        etd: etd.toISOString(), eta: eta.toISOString(),
        status: "frat_created",
        frat_id: fratIds[idx], flight_id: flightIds[idx],
        frat_push_status: "pushed",
        matched_pilot_id: userIds[pilotForFlight.email],
        passenger_count: r.pax, crew_count: 1,
        fuel_lbs: r.fuel, cruise_alt: r.alt,
        route: r.route, ete_minutes: r.ete,
        dispatcher_notes: "Dispatch released",
        raw_data: { releaseStatus: "released", flightType: "charter" },
      });
    }
    log.push("Created ForeFlight config and dispatch flights (5 pending, 8 linked)");

    // ── 5. Create Safety Reports ────────────────────────────────
    const reportIds = [];
    for (let i = 0; i < REPORT_TEMPLATES.length; i++) {
      const tpl = REPORT_TEMPLATES[i];
      const dAgo = randInt(5, 130);
      const reporterId = pick(allUserIds);
      const isClosed = i < 4;
      const isInvestigating = !isClosed && i < 8;
      const status = isClosed ? "closed" : isInvestigating ? "investigation" : "open";
      const reportId = uid();

      await supabase.from("safety_reports").insert({
        id: reportId, org_id: orgId, reporter_id: reporterId,
        report_code: `SR-${String(200 + i).padStart(4, "0")}`,
        report_type: tpl.type, title: tpl.title, description: tpl.desc,
        date_occurred: dateOnly(dAgo), location: pick(["KSEA", "KBOI", "KPDX", "KGEG", "KBFI"]),
        category: tpl.category, severity: tpl.severity, flight_phase: tpl.phase,
        tail_number: pick(AIRCRAFT).registration, aircraft_type: pick(AIRCRAFT).type,
        status,
        assigned_to: isInvestigating || isClosed ? safetyMgrId : null,
        investigation_notes: isClosed ? "Investigation complete. Root cause identified and corrective actions assigned." : isInvestigating ? "Under review by safety team." : "",
        root_cause: isClosed ? "Procedural gap identified. Training and SOP update required." : "",
        created_at: daysAgo(dAgo),
        closed_at: isClosed ? daysAgo(dAgo - randInt(5, 20)) : null,
      });
      reportIds.push(reportId);
    }
    log.push(`Created ${reportIds.length} safety reports`);

    // ── 6. Create Hazards / Investigations ──────────────────────
    const hazardIds = [];
    const hazardTemplates = [
      { title: "Bird strike risk at KBFI", desc: "Multiple bird strike incidents reported at KBFI in the last 90 days. Pattern suggests seasonal migration path crosses approach corridors.", cat: "wildlife", status: "unacceptable", il: 3, is: 3, rl: null, rs: null },
      { title: "Fuel contamination procedures gap", desc: "Review found fuel sampling procedures not consistently followed across all pilots. Training gap identified.", cat: "maintenance", status: "acceptable", il: 2, is: 4, rl: null, rs: null,
        ll: {
          summary: "Investigation revealed that fuel sampling procedures were not being consistently performed across all pilots, particularly during high-tempo operations and early morning departures. The root cause was a combination of inadequate initial training on contamination risks and the absence of a standardized checklist step requiring documented fuel sampling before each flight.\n\nThe corrective actions implemented include a revised fuel sampling SOP with mandatory photo documentation, integration of a fuel sample verification step into the FRAT preflight checklist, and a company-wide training session on fuel contamination identification. Since implementation, compliance has reached 100% across all pilots.",
          takeaways: [
            "Fuel contamination can occur at any fuel source — visual inspection before every flight is non-negotiable",
            "Procedures that rely solely on pilot memory without checklist integration have significantly lower compliance rates",
            "Photo documentation of fuel samples creates accountability and provides evidence for quality assurance audits"
          ],
          training_topics: ["Fuel Contamination Identification", "Fuel Sampling SOP", "Preflight Procedures"],
          prevention_tips: [
            "Always sample fuel from each sump point, not just the main drain — contamination can settle in different locations",
            "Use a clear container and check for water, particulates, and correct fuel color under adequate lighting",
            "If contamination is found, do NOT fly — ground the aircraft and notify maintenance immediately"
          ]
        }
      },
      { title: "Runway incursion risk at towered fields", desc: "Two near-miss ground incursion events in 60 days at KSEA. Contributing factor: complex taxi instructions during peak traffic.", cat: "ground_ops", status: "unacceptable", il: 3, is: 4, rl: null, rs: null },
      { title: "Pilot fatigue — early morning flights", desc: "Pattern of elevated fatigue scores on flights departing before 0700 local. Three self-reports of fatigue-related errors.", cat: "fatigue", status: "monitoring", il: 3, is: 3, rl: 2, rs: 2 },
      { title: "Engine maintenance tracking gap", desc: "Discrepancy found between maintenance logs and actual engine hours on N200KA. 12 hours unaccounted for.", cat: "maintenance", status: "assessed", il: 2, is: 3, rl: null, rs: null },
      { title: "ATC communication congestion", desc: "Repeated frequency congestion events on Seattle Approach. Risk of missed clearances during high workload periods.", cat: "communication", status: "identified", il: null, is: null, rl: null, rs: null },
    ];

    for (let i = 0; i < hazardTemplates.length; i++) {
      const h = hazardTemplates[i];
      const dAgo = randInt(10, 120);
      const hazardId = uid();
      await supabase.from("hazard_register").insert({
        id: hazardId, org_id: orgId, created_by: safetyMgrId,
        hazard_code: `HAZ-${String(300 + i).padStart(4, "0")}`,
        title: h.title, description: h.desc, category: h.cat, status: h.status,
        initial_likelihood: h.il || null, initial_severity: h.is || null,
        residual_likelihood: h.rl || null, residual_severity: h.rs || null,
        mitigations: h.status === "mitigated" || h.status === "monitoring" ? "Updated SOPs and conducted refresher training for all pilots." : "",
        lessons_learned: h.ll || null,
        related_report_id: reportIds[i] || null,
        review_date: dateFromNow(randInt(15, 90)),
        responsible_person: pick(["Sarah Chen", "Lisa Thompson", "James Mitchell"]),
        created_at: daysAgo(dAgo),
      });
      hazardIds.push(hazardId);
    }
    log.push(`Created ${hazardIds.length} hazards`);

    // ── 7. Create Corrective Actions ────────────────────────────
    // hazardIds index mapping:
    //   0 = Fuel contamination, 1 = Icing conditions, 2 = Runway incursion,
    //   3 = Pilot fatigue, 4 = Engine maintenance, 5 = ATC communication
    const actionTemplates = [
      { title: "Update fuel sampling SOP", desc: "Revise fuel sampling procedures to include mandatory documentation.", priority: "high", status: "completed", dDue: -10, hIdx: 0 },
      { title: "Install fuel quality testing kit", desc: "Procure and deploy portable fuel quality testers for each aircraft.", priority: "medium", status: "in_progress", dDue: 14, hIdx: 0 },
      { title: "Winter ops icing checklist update", desc: "Revise winter operations checklist to include enhanced icing risk assessment.", priority: "high", status: "completed", dDue: -20, hIdx: 1 },
      { title: "De-icing equipment inspection", desc: "Inspect and certify all de-icing equipment before winter season.", priority: "medium", status: "in_progress", dDue: 21, hIdx: 1 },
      { title: "Review taxi procedures SOP", desc: "Update taxi procedures to include readback requirements for complex clearances at towered fields.", priority: "high", status: "completed", dDue: -5, hIdx: 2 },
      { title: "Ground incursion awareness training", desc: "Conduct ground incursion prevention training for all pilots operating at KSEA.", priority: "high", status: "in_progress", dDue: 14, hIdx: 2 },
      { title: "Implement fatigue reporting tool", desc: "Deploy fatigue self-assessment in FRAT submission flow.", priority: "medium", status: "completed", dDue: -30, hIdx: 3 },
      { title: "Early morning duty schedule review", desc: "Review and adjust scheduling for flights departing before 0700 to ensure adequate crew rest.", priority: "high", status: "in_progress", dDue: 21, hIdx: 3 },
      { title: "Engine hour tracking audit", desc: "Reconcile all aircraft engine hours with maintenance logs.", priority: "critical", status: "in_progress", dDue: 7, hIdx: 4 },
      { title: "Establish approach frequency backup procedures", desc: "Develop backup communication procedure for high congestion periods on Seattle Approach.", priority: "medium", status: "open", dDue: 30, hIdx: 5 },
    ];

    for (let i = 0; i < actionTemplates.length; i++) {
      const a = actionTemplates[i];
      const dAgo = randInt(20, 100);
      await supabase.from("corrective_actions").insert({
        org_id: orgId,
        action_code: `CA-${String(400 + i).padStart(4, "0")}`,
        title: a.title, description: a.desc,
        hazard_id: hazardIds[a.hIdx] || null,
        report_id: reportIds[a.hIdx] || null,
        assigned_to: pick([safetyMgrId, ...pilotIds]),
        assigned_to_name: pick(["Sarah Chen", "Lisa Thompson", "Mike Rodriguez"]),
        due_date: dateFromNow(a.dDue),
        priority: a.priority,
        status: a.status,
        completion_notes: a.status === "completed" ? "Completed as planned. Verified effective." : "",
        completed_at: a.status === "completed" ? daysAgo(Math.abs(a.dDue) + randInt(1, 5)) : null,
        created_at: daysAgo(dAgo),
      });
    }
    log.push(`Created ${actionTemplates.length} corrective actions`);

    // ── 8. Create Training Requirements + Records ───────────────
    const reqIds = {};
    for (const req of TRAINING_REQS) {
      const { data, error } = await supabase.from("training_requirements").insert({
        org_id: orgId, title: req.title, category: req.category,
        frequency_months: req.frequency_months, required_for: req.required_for,
        description: `Required training: ${req.title}`,
      }).select().single();
      if (error) { errors.push(`Training req ${req.title}: ${error.message}`); continue; }
      reqIds[req.title] = data.id;
    }

    // Create records — all current except 2 (one overdue, one expiring soon)
    // Overdue: "Hazmat Awareness" for Mike Rodriguez
    // Expiring soon: "Emergency Procedures Review" for David Park
    const overdueReq = "Hazmat Awareness";
    const overdueUser = "mike.rodriguez@demo.preflightsms.com";
    const expiringReq = "Emergency Procedures Review";
    const expiringUser = "david.park@demo.preflightsms.com";

    for (const pilot of [...pilots, DEMO_USERS[0], DEMO_USERS[4]]) { // pilots + admin + safety manager
      const userId = userIds[pilot.email];
      for (const req of TRAINING_REQS) {
        if (!req.required_for.includes(pilot.role)) continue;
        const reqId = reqIds[req.title];
        if (!reqId) continue;

        let completedAgo, expiryDate;
        const expiryMonths = req.frequency_months || 12;

        if (req.title === overdueReq && pilot.email === overdueUser) {
          // Overdue — completed 14 months ago, expired 2 months ago
          completedAgo = 14 * 30;
          expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() - 60);
        } else if (req.title === expiringReq && pilot.email === expiringUser) {
          // Expiring soon — completed 11 months ago, expires in 12 days
          completedAgo = 11 * 30;
          expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + 12);
        } else {
          // Current — completed 1-4 months ago, well within expiry
          completedAgo = randInt(30, 120);
          expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() - completedAgo);
          expiryDate.setMonth(expiryDate.getMonth() + expiryMonths);
        }

        await supabase.from("training_records").insert({
          org_id: orgId, user_id: userId, requirement_id: reqId,
          title: req.title,
          completed_date: dateOnly(completedAgo),
          expiry_date: expiryDate.toISOString().split("T")[0],
          instructor: pick(["Capt. Williams", "Safety Dept.", "External Provider", "Online CBT"]),
          notes: "Completed successfully.",
        });
      }
    }
    log.push("Created training requirements and records (2 non-current)");

    // ── 9. Create Policies + Acknowledgments ────────────────────
    const policyIds = [];
    for (const p of POLICIES) {
      const dAgo = randInt(60, 200);
      const { data, error } = await supabase.from("policy_documents").insert({
        org_id: orgId, uploaded_by: adminId,
        title: p.title, description: p.desc, category: p.category,
        version: p.version, status: "active",
        effective_date: dateOnly(dAgo),
        review_date: dateFromNow(randInt(30, 180)),
        created_at: daysAgo(dAgo),
      }).select().single();
      if (error) { errors.push(`Policy ${p.title}: ${error.message}`); continue; }
      policyIds.push(data.id);

      // Create acknowledgments for most users
      for (const uid of allUserIds) {
        if (Math.random() < 0.85) {
          await supabase.from("policy_acknowledgments").insert({
            org_id: orgId, policy_id: data.id, user_id: uid,
            acknowledged_at: daysAgo(dAgo - randInt(1, 30)),
          });
        }
      }
    }
    log.push(`Created ${policyIds.length} policies with acknowledgments`);

    // ── 10. Create ERP Plans + Drills (all 6 industry templates) ─
    const { ERP_TEMPLATES, DEFAULT_CALL_TREE } = await import("../../components/EmergencyResponsePlan");

    // Customized call tree with demo org contacts + standard external contacts
    const demoCallTree = [
      { contact_name: "NTSB", contact_role: "Aviation Safety", phone_primary: "844-373-9922", is_external: true, notes: "24-hour hotline" },
      { contact_name: "Seattle FSDO", contact_role: "FAA Flight Standards", phone_primary: "(206) 231-4199", is_external: true, notes: "Local FSDO" },
      { contact_name: "Local EMS", contact_role: "Emergency Services", phone_primary: "911", is_external: true },
      { contact_name: "Cascade Insurance", contact_role: "Insurance", phone_primary: "(206) 555-0190", is_external: true },
      { contact_name: "James Mitchell", contact_role: "Accountable Executive", phone_primary: "(206) 555-0101", email: "admin@demo.preflightsms.com", is_external: false },
      { contact_name: "Lisa Thompson", contact_role: "Safety Manager", phone_primary: "(206) 555-0103", email: "lisa.thompson@demo.preflightsms.com", is_external: false },
      { contact_name: "Sarah Chen", contact_role: "Chief Pilot", phone_primary: "(206) 555-0102", email: "sarah.chen@demo.preflightsms.com", is_external: false },
    ];

    const erpPlanIds = [];
    for (const tmpl of ERP_TEMPLATES) {
      const planId = uid();
      erpPlanIds.push(planId);
      await supabase.from("erp_plans").insert({
        id: planId, org_id: orgId,
        name: tmpl.name, category: tmpl.category,
        description: tmpl.description,
        is_active: true, version: 1,
        last_reviewed_at: daysAgo(45),
        reviewed_by: adminId,
      });

      // Checklist items from template
      for (let i = 0; i < tmpl.checklist.length; i++) {
        const c = tmpl.checklist[i];
        await supabase.from("erp_checklist_items").insert({
          erp_plan_id: planId, sort_order: i,
          action_text: c.action_text, responsible_role: c.responsible_role,
          time_target: c.time_target, is_critical: c.is_critical,
        });
      }

      // Call tree for each plan
      for (let i = 0; i < demoCallTree.length; i++) {
        const c = demoCallTree[i];
        await supabase.from("erp_call_tree").insert({
          erp_plan_id: planId, sort_order: i,
          contact_name: c.contact_name, contact_role: c.contact_role,
          phone_primary: c.phone_primary, email: c.email || "",
          is_external: c.is_external, notes: c.notes || "",
        });
      }
    }

    // Drills (attach to first plan — Aircraft Accident)
    const accidentPlanId = erpPlanIds[0];
    await supabase.from("erp_drills").insert({
      org_id: orgId, erp_plan_id: accidentPlanId,
      drill_type: "tabletop", scheduled_date: dateOnly(90), completed_date: dateOnly(88),
      status: "completed", participants: ["James Mitchell", "Sarah Chen", "Lisa Thompson", "Mike Rodriguez"],
      lessons_learned: "Call tree activation was slow. Updated contact order and added backup numbers.",
      findings: "Communication delays identified. Recommend quarterly drills.",
      conducted_by: safetyMgrId,
    });
    await supabase.from("erp_drills").insert({
      org_id: orgId, erp_plan_id: accidentPlanId,
      drill_type: "tabletop", scheduled_date: dateFromNow(15),
      status: "scheduled",
    });
    // Acknowledge all ERPs except the last one (Missing/Overdue Aircraft)
    const plansToAck = erpPlanIds.slice(0, -1); // first 5 plans
    for (const planId of plansToAck) {
      for (const userId of allUserIds) {
        await supabase.from("erp_acknowledgments").insert({
          org_id: orgId,
          erp_plan_id: planId,
          user_id: userId,
          plan_version: 1,
          acknowledged_at: daysAgo(randInt(5, 30)),
        });
      }
    }
    log.push("Created 6 ERP templates with checklists, call trees, drills, and acknowledgments");

    // ── 11. Create Trend Alerts ─────────────────────────────────
    await supabase.from("trend_alerts").insert([
      {
        org_id: orgId, alert_type: "trend", metric_name: "High-Risk FRATs",
        current_value: 8, baseline_value: 4, change_percentage: 100,
        period_start: dateOnly(30), period_end: dateOnly(0), severity: "warning",
        narrative: { summary: "High-risk FRAT submissions doubled this month compared to the 90-day baseline.", focus_areas: ["Weather-related risk factors", "Mountainous terrain operations"], risk_outlook: "Monitor closely — seasonal weather patterns may be contributing." },
      },
      {
        org_id: orgId, alert_type: "trend", metric_name: "Safety Report Volume",
        current_value: 6, baseline_value: 3, change_percentage: 100,
        period_start: dateOnly(30), period_end: dateOnly(0), severity: "info",
        narrative: { summary: "Safety report submissions increased, indicating healthy reporting culture.", focus_areas: ["Maintenance-related reports trending up"], risk_outlook: "Positive trend — increased reporting visibility." },
      },
    ]);
    log.push("Created trend alerts");

    // ── 12. Create SPIs ─────────────────────────────────────────
    const spiDefs = [
      { name: "FRAT Completion Rate", cat: "proactive", source: "frat_submissions", calc: "percentage", unit: "%", target: 95, threshold: 85 },
      { name: "Safety Report Rate (per 100 flights)", cat: "reactive", source: "safety_reports", calc: "rate_per_100", unit: "per 100", target: 8, threshold: 5 },
      { name: "Overdue Corrective Actions", cat: "reactive", source: "corrective_actions", calc: "count", unit: "items", target: 0, threshold: 2 },
    ];
    for (const spi of spiDefs) {
      const { data: spiRow } = await supabase.from("safety_performance_indicators").insert({
        org_id: orgId, name: spi.name, description: `Tracks ${spi.name.toLowerCase()}`,
        category: spi.cat, data_source: spi.source, calculation_method: spi.calc,
        unit: spi.unit, measurement_period: "monthly", is_active: true,
      }).select().single();
      if (!spiRow) continue;

      await supabase.from("safety_performance_targets").insert({
        spi_id: spiRow.id, target_type: spi.unit === "items" ? "maximum" : "minimum",
        target_value: spi.target, alert_threshold: spi.threshold,
        effective_date: dateOnly(180),
      });

      // Add 4 months of measurements
      for (let m = 4; m >= 0; m--) {
        const pEnd = new Date(); pEnd.setMonth(pEnd.getMonth() - m);
        const pStart = new Date(pEnd); pStart.setMonth(pStart.getMonth() - 1);
        const variance = (Math.random() - 0.5) * 20;
        let val = spi.target + variance;
        if (spi.unit === "items") val = Math.max(0, Math.round(val));
        else val = Math.round(val * 10) / 10;
        const status = spi.unit === "items"
          ? (val <= spi.target ? "on_target" : val <= spi.threshold ? "approaching_threshold" : "breached")
          : (val >= spi.target ? "on_target" : val >= spi.threshold ? "approaching_threshold" : "breached");
        await supabase.from("spi_measurements").insert({
          spi_id: spiRow.id,
          period_start: pStart.toISOString().split("T")[0],
          period_end: pEnd.toISOString().split("T")[0],
          measured_value: val, target_value: spi.target, status,
        });
      }
    }
    log.push("Created SPIs with measurements");

    // ── 13. Create SMS Manuals ──────────────────────────────────
    await supabase.from("sms_manuals").upsert({
      org_id: orgId, manual_key: "safety_policy",
      title: "Safety Policy & Objectives",
      description: "Management commitment to safety and organizational safety objectives.",
      cfr_references: ["5.21(a)", "5.21(b)"],
      status: "active", version: "2.0",
      sections: [
        { title: "Safety Policy Statement", content: "Cascade Charter Aviation is committed to developing, implementing, maintaining, and constantly improving strategies and processes to ensure that all aviation activities take place under a balanced allocation of organizational resources, aimed at achieving the highest level of safety performance." },
        { title: "Safety Objectives", content: "1. Maintain zero accidents and serious incidents.\n2. Achieve 95% FRAT completion rate.\n3. Close all corrective actions within 30 days.\n4. Conduct quarterly safety stand-downs." },
      ],
      last_edited_by: adminId,
    }, { onConflict: "org_id,manual_key" });
    log.push("Created SMS manual");

    // ── Done ────────────────────────────────────────────────────
    return res.status(200).json({
      success: true,
      orgId,
      orgSlug: DEMO_ORG_SLUG,
      users: DEMO_USERS.map(u => ({ email: u.email, name: u.name, role: u.role, password: DEMO_PASSWORD })),
      log,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (err) {
    console.error("Seed demo error:", err);
    return res.status(500).json({ error: err.message, log, errors });
  }
}
