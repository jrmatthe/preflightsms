export const ONBOARDING_FLOWS = {
  fleet: {
    id: "fleet",
    title: "Add Your First Aircraft",
    description: "Register an aircraft to enable flight tracking and FRAT submissions",
    tab: "admin",
    adminTab: "fleet",
    steps: [
      {
        id: "enter_type",
        target: "[data-onboarding='fleet-type-input']",
        title: "Aircraft Type",
        description: "Enter your aircraft type — for example, C172 or R44.",
        advanceOn: "continue",
      },
      {
        id: "enter_reg",
        target: "[data-onboarding='fleet-reg-input']",
        title: "Tail Number",
        description: "Enter the registration / tail number. We'll auto-add the N prefix.",
        advanceOn: "continue",
      },
      {
        id: "complete_form",
        target: "[data-onboarding='fleet-form']",
        title: "Complete the Details",
        description: "Fill in any remaining fields, then click Add Aircraft to save.",
        advanceOn: "save",
      },
      {
        id: "congrats",
        target: null,
        title: "Aircraft Added!",
        description: "Your fleet is started. You're ready to track flights and submit risk assessments.",
        advanceOn: "dismiss",
      },
    ],
  },
  frat: {
    id: "frat",
    title: "Submit Your First FRAT",
    description: "Walk through a Flight Risk Assessment to learn how risk scoring works",
    tab: "submit",
    steps: [
      { id: "frat_pilot", target: "[data-onboarding='frat-pilot']", title: "Pilot in Command", description: "Enter the pilot's name for this flight.", advanceOn: "continue" },
      { id: "frat_aircraft", target: "[data-onboarding='frat-aircraft']", title: "Aircraft", description: "Select the aircraft type from your fleet.", advanceOn: "continue" },
      { id: "frat_departure", target: "[data-onboarding='frat-departure']", title: "Departure Airport", description: "Enter the ICAO code for your departure airport (e.g. KSFF).", advanceOn: "continue" },
      { id: "frat_destination", target: "[data-onboarding='frat-destination']", title: "Destination Airport", description: "Enter the ICAO code for your destination (e.g. KBOI).", advanceOn: "continue" },
      { id: "frat_remaining", target: "[data-onboarding='frat-flight-info']", title: "Complete Flight Details", description: "Fill in the remaining fields — altitude, date, times, fuel, crew, and passengers.", advanceOn: "continue" },
      { id: "frat_photos", target: "[data-onboarding='frat-photos']", title: "Attachments", description: "Attach photos of HAZMAT PIC notifications or other documents. This step is optional — skip if not needed.", advanceOn: "continue" },
      { id: "frat_ai", target: "[data-onboarding='frat-ai-panel']", title: "AI Risk Suggestions", description: "Try AI-powered risk analysis. AI suggests risk categories based on historical FRATs, your planned flight, current weather, and terrain data.", advanceOn: "continue" },
      { id: "frat_wx", target: "[data-onboarding='frat-cat-weather']", title: "Weather Factors", description: "Review and select any weather hazards that apply to this flight.", advanceOn: "continue" },
      { id: "frat_pilot_cat", target: "[data-onboarding='frat-cat-pilot']", title: "Pilot / Crew Factors", description: "Select any pilot or crew risk factors that apply.", advanceOn: "continue" },
      { id: "frat_aircraft_cat", target: "[data-onboarding='frat-cat-aircraft']", title: "Aircraft Factors", description: "Select any aircraft-related risk factors.", advanceOn: "continue" },
      { id: "frat_env", target: "[data-onboarding='frat-cat-environment']", title: "Environment Factors", description: "Select any environmental risk factors for this flight.", advanceOn: "continue" },
      { id: "frat_ops", target: "[data-onboarding='frat-cat-operational']", title: "Operational Factors", description: "Select any operational risk factors.", advanceOn: "continue" },
      { id: "frat_submit", target: "[data-onboarding='frat-score-panel']", title: "Review & Submit", description: "Review your risk score and submit the FRAT. High and critical risk FRATs can be configured by admin to require authorization before dispatch.", advanceOn: "continue" },
      { id: "congrats", target: null, title: "FRAT Submitted!", description: "You've completed your first risk assessment. FRATs are the foundation of proactive safety management.", advanceOn: "dismiss" },
    ],
  },
};

export const FLOW_ORDER = ["fleet", "frat"];
