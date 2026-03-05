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
};

export const FLOW_ORDER = ["fleet"];
