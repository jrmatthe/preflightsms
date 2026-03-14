// Role-based onboarding tours for non-admin users (pilot, maintenance, dispatcher)
// These are lightweight walkthroughs — no demo data, all "continue" steps

export const PILOT_TOUR_FLOWS = {
  submit_frat: {
    id: "submit_frat",
    title: "Submit a FRAT",
    description: "Learn how to complete a Flight Risk Assessment before your flight",
    tab: "submit",
    steps: [
      { id: "frat_intro", target: null, title: "Flight Risk Assessment", description: "Before every flight, you'll submit a FRAT to assess risk. It takes about 2 minutes and covers weather, pilot fitness, aircraft status, and operational factors. Let's walk through each section.", advanceOn: "continue" },
      { id: "frat_flight_info", target: "[data-onboarding='frat-flight-info']", title: "Flight Details", description: "Start by entering your flight info — pilot name, aircraft, departure, destination, altitude, date, and times. If your org uses ForeFlight Dispatch or SchedAero, most of this autofills.", advanceOn: "continue" },
      { id: "frat_wx", target: "[data-onboarding='frat-weather-briefing']", title: "Weather Briefing", description: "Once you enter departure and destination airports, a weather briefing loads automatically with METARs, TAFs, and flight rules. Weather-related risk factors are auto-selected based on conditions.", advanceOn: "continue" },
      { id: "frat_categories", target: "[data-onboarding='frat-cat-weather']", title: "Risk Factors", description: "Check any risk factors that apply to your flight across all categories — weather, pilot/crew, aircraft, environment, and operational. Factors with an AUTO badge are selected automatically from weather data and MEL deferrals.", advanceOn: "continue" },
      { id: "frat_score", target: "[data-onboarding='frat-score-panel']", title: "Score & Submit", description: "Your risk score updates as you select factors. Green means low risk, yellow is moderate, red is high. Submit when you're ready — high-risk FRATs may require manager approval depending on your org's settings.", advanceOn: "dismiss" },
    ],
  },
  log_flight: {
    id: "log_flight",
    title: "Track Your Flights",
    description: "See how flights are tracked from dispatch to arrival",
    tab: "flights",
    steps: [
      { id: "ff_intro", target: null, title: "Flight Following", description: "After submitting a FRAT, your flight appears here. You and your operations team can track its status in real time.", advanceOn: "continue" },
      { id: "ff_map", target: "[data-onboarding='ff-map']", title: "Flight Map", description: "Active flights are plotted on the map between departure and destination. If ADS-B tracking is enabled, you'll see live aircraft positions.", advanceOn: "continue" },
      { id: "ff_card", target: "[data-onboarding='ff-flight-card']", title: "Flight Cards", description: "Each flight card shows the route, aircraft, PIC, and status. When you land, click Mark Arrived to log the arrival. If no one marks a flight arrived within 30 minutes of ETA, flight followers are notified.", advanceOn: "dismiss" },
    ],
  },
  file_report: {
    id: "file_report",
    title: "File a Safety Report",
    description: "Learn how to report hazards, incidents, and concerns",
    tab: "reports",
    steps: [
      { id: "sr_intro", target: null, title: "Safety Reporting", description: "Safety reporting is the backbone of your SMS. Report hazards before they cause incidents, document incidents when they occur, and flag concerns anytime. Reports can be confidential. We've pre-filled a sample report so you can see how it works.", advanceOn: "continue" },
      { id: "sr_type", target: "[data-onboarding='sr-type']", title: "Report Type", description: "Choose the type of report. Hazards identify potential dangers, incidents document events that occurred, near misses capture close calls, and concerns flag general safety issues.", advanceOn: "continue" },
      { id: "sr_title", target: "[data-onboarding='sr-title']", title: "Title & Description", description: "Give the report a brief, descriptive title and describe what happened. Be specific — good detail helps your safety team investigate and prevent recurrence.", advanceOn: "continue" },
      { id: "sr_details", target: "[data-onboarding='sr-details']", title: "Additional Details", description: "Add the date, location, severity, flight phase, category, and aircraft. These fields power analytics and trend detection across your organization.", advanceOn: "continue" },
      { id: "sr_submit", target: "[data-onboarding='sr-submit-btn']", title: "Submit", description: "When you're ready, click Submit. Your report goes to your safety manager for review. You can also mark it confidential or anonymous using the options above.", advanceOn: "dismiss" },
    ],
  },
  check_training: {
    id: "check_training",
    title: "Training & Courses",
    description: "View your training requirements and complete online courses",
    tab: "cbt",
    steps: [
      { id: "tr_intro", target: null, title: "Your Training", description: "This is your training hub. Complete online courses, track your training records, and see what's coming due. Your safety team sets the requirements — you just need to stay current.", advanceOn: "continue" },
      { id: "tr_courses", target: "[data-onboarding='cbt-course-list']", title: "Available Courses", description: "These are your assigned courses. Each has lessons with content and quiz questions. Complete all lessons in a course to earn your certificate. Green means complete, blue means in progress.", advanceOn: "continue" },
      { id: "tr_records", target: "[data-onboarding='cbt-records-tab']", title: "Training Records", description: "The Training Records tab shows all your training — both online courses and external training logged by your safety team. Green means current, yellow means expiring soon, red means expired. You'll get email reminders before training expires.", advanceOn: "dismiss" },
    ],
  },
  review_policies: {
    id: "review_policies",
    title: "Review Policies",
    description: "Read and acknowledge your organization's policies and SOPs",
    tab: "policy",
    steps: [
      { id: "pol_intro", target: null, title: "Policies & Documents", description: "Your organization publishes policies, SOPs, and manuals here. When new documents are published or updated, you'll need to acknowledge that you've read them.", advanceOn: "continue" },
      { id: "pol_library", target: "[data-onboarding='policy-library-tab']", title: "Policy Library", description: "Browse all published documents here. Each one shows its category, effective date, and whether you've acknowledged it. Click any document to read the full content.", advanceOn: "continue" },
      { id: "pol_ack", target: "[data-onboarding='policy-ack-stats']", title: "Acknowledgment", description: "Documents with an Acknowledge button need your signature. Click it after reading to confirm you've reviewed the document. Your safety team tracks acknowledgment rates for compliance.", advanceOn: "dismiss" },
    ],
  },
};

export const PILOT_TOUR_ORDER = ["submit_frat", "log_flight", "file_report", "check_training", "review_policies"];

export const MAINTENANCE_TOUR_FLOWS = {
  view_fleet: {
    id: "view_fleet",
    title: "Manage Fleet",
    description: "View aircraft details and manage your fleet",
    tab: "submit",
    subtab: "fleet",
    steps: [
      { id: "fleet_intro", target: null, title: "Fleet Management", description: "This is where you manage your fleet. View aircraft details, track MEL deferrals, and keep maintenance records up to date.", advanceOn: "continue" },
      { id: "fleet_cards", target: "[data-onboarding='fleet-aircraft-card']", title: "Aircraft Cards", description: "Each card shows the aircraft type, tail number, and current MEL status. Click an aircraft to view its full details, MEL items, and maintenance history.", advanceOn: "continue" },
      { id: "fleet_mel", target: "[data-tour='tour-fleet-mel']", title: "MEL Deferrals", description: "Active MEL items are listed below each aircraft. You can defer new items, track expiration dates by category (A/B/C/D), and rectify items when maintenance is complete. Active MEL items are automatically flagged in pilot FRATs.", advanceOn: "dismiss" },
    ],
  },
  file_report: {
    id: "file_report",
    title: "File a Safety Report",
    description: "Report hazards, incidents, and maintenance concerns",
    tab: "reports",
    steps: [
      { id: "sr_intro", target: null, title: "Safety Reporting", description: "Use safety reports to document hazards, incidents, near misses, and maintenance concerns. Reports go to your safety manager for review and investigation. We've pre-filled a sample so you can see how it works.", advanceOn: "continue" },
      { id: "sr_type", target: "[data-onboarding='sr-type']", title: "Report Type", description: "Choose a report type — hazard, incident, near miss, or concern. Add a title, description, and details.", advanceOn: "continue" },
      { id: "sr_details", target: "[data-onboarding='sr-details']", title: "Report Details", description: "Add the date, location, severity, flight phase, category, and aircraft involved. These fields help your safety team investigate and track trends.", advanceOn: "continue" },
      { id: "sr_submit", target: "[data-onboarding='sr-submit-btn']", title: "Submit", description: "Submit your report. You'll be notified of any follow-up. Consistent reporting helps your organization identify and fix problems before they become incidents.", advanceOn: "dismiss" },
    ],
  },
};

export const MAINTENANCE_TOUR_ORDER = ["view_fleet", "file_report"];

export function getTourFlowsForRole(role) {
  if (role === "maintenance") return { flows: MAINTENANCE_TOUR_FLOWS, order: MAINTENANCE_TOUR_ORDER };
  // pilot, dispatcher, and any other non-admin role gets pilot tour
  return { flows: PILOT_TOUR_FLOWS, order: PILOT_TOUR_ORDER };
}
