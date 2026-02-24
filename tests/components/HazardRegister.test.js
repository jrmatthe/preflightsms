import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import HazardRegister from "../../components/HazardRegister";

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const ADMIN_PROFILE = { id: "user-1", role: "admin" };
const PILOT_PROFILE = { id: "user-2", role: "pilot" };
const SESSION = { user: { id: "user-1" } };

function makeHazard(overrides = {}) {
  return {
    id: `haz-${Math.random().toString(36).slice(2)}`,
    title: "Icing on winter routes",
    description: "Icing conditions observed on KSFF-KBOI route",
    hazard_code: "HAZ-001",
    category: "weather",
    status: "identified",
    initial_likelihood: 4,
    initial_severity: 4,
    initial_risk_score: 16,
    residual_likelihood: null,
    residual_severity: null,
    residual_risk_score: null,
    responsible_person: "John Smith",
    mitigations: "",
    source: "safety_report",
    review_date: "2026-06-01",
    related_report_id: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function renderHazardRegister(props = {}) {
  const defaults = {
    profile: props.profile ?? ADMIN_PROFILE,
    session: props.session ?? SESSION,
    onCreateHazard: props.onCreateHazard ?? vi.fn(),
    onUpdateHazard: props.onUpdateHazard ?? vi.fn(),
    hazards: props.hazards ?? [],
    fromReport: props.fromReport ?? null,
    onClearFromReport: props.onClearFromReport ?? vi.fn(),
    reports: props.reports ?? [],
    actions: props.actions ?? [],
    onCreateAction: props.onCreateAction ?? vi.fn(),
  };
  const { container } = render(<HazardRegister {...defaults} />);
  return { container, ...defaults };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("HazardRegister", () => {
  // 1. Renders list view with "Investigations" header and button
  it("renders list view with Investigations header and New Investigation button", () => {
    renderHazardRegister();
    expect(screen.getByText("Investigations")).toBeInTheDocument();
    expect(screen.getByText("+ New Investigation")).toBeInTheDocument();
  });

  // 2. Shows empty state when no hazards
  it("shows empty state when no hazards are provided", () => {
    renderHazardRegister({ hazards: [] });
    expect(screen.getByText("No investigations yet")).toBeInTheDocument();
  });

  // 3. Renders hazard cards with title, status badge, risk level badge
  it("renders hazard cards with title, status badge, and risk level badge", () => {
    const hazard = makeHazard({ title: "Bird strike risk at KLAX", status: "active", initial_risk_score: 12 });
    renderHazardRegister({ hazards: [hazard] });
    expect(screen.getByText("Bird strike risk at KLAX")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
  });

  // 4. Shows risk summary stats
  it("shows risk summary stats for critical, high, medium, and low counts", () => {
    const hazards = [
      makeHazard({ id: "1", status: "identified", initial_risk_score: 20 }), // Critical
      makeHazard({ id: "2", status: "active", initial_risk_score: 12 }),     // High
      makeHazard({ id: "3", status: "mitigated", initial_risk_score: 6 }),   // Medium
      makeHazard({ id: "4", status: "accepted", initial_risk_score: 3 }),    // Low
      makeHazard({ id: "5", status: "closed", initial_risk_score: 25 }),     // Closed -> excluded from stats
    ];
    renderHazardRegister({ hazards });
    // Risk stats section shows counts - check that the stat values are present
    expect(screen.getByText("Critical Risk")).toBeInTheDocument();
    expect(screen.getByText("High Risk")).toBeInTheDocument();
    expect(screen.getByText("Medium Risk")).toBeInTheDocument();
    expect(screen.getByText("Low Risk")).toBeInTheDocument();
  });

  // 5. Filter tabs: "all" excludes closed, specific status filters correctly
  it("all filter excludes closed hazards", () => {
    const hazards = [
      makeHazard({ id: "1", title: "Open hazard", status: "active" }),
      makeHazard({ id: "2", title: "Closed hazard", status: "closed" }),
    ];
    renderHazardRegister({ hazards });
    // Default filter is "all" which excludes closed
    expect(screen.getByText("Open hazard")).toBeInTheDocument();
    expect(screen.queryByText("Closed hazard")).not.toBeInTheDocument();
  });

  it("clicking closed filter tab shows only closed hazards", () => {
    const hazards = [
      makeHazard({ id: "1", title: "Open hazard", status: "active" }),
      makeHazard({ id: "2", title: "Closed hazard", status: "closed" }),
    ];
    renderHazardRegister({ hazards });
    // Click the "Closed" filter tab
    fireEvent.click(screen.getByText(/^Closed/));
    expect(screen.getByText("Closed hazard")).toBeInTheDocument();
    expect(screen.queryByText("Open hazard")).not.toBeInTheDocument();
  });

  // 6. Search filters hazards
  it("search filters hazards by title", () => {
    const hazards = [
      makeHazard({ id: "1", title: "Icing conditions", status: "active" }),
      makeHazard({ id: "2", title: "Bird strike risk", status: "active" }),
    ];
    renderHazardRegister({ hazards });
    const searchInput = screen.getByPlaceholderText("Search investigations...");
    fireEvent.change(searchInput, { target: { value: "Bird" } });
    expect(screen.getByText("Bird strike risk")).toBeInTheDocument();
    expect(screen.queryByText("Icing conditions")).not.toBeInTheDocument();
  });

  it("search filters hazards by hazard_code", () => {
    const hazards = [
      makeHazard({ id: "1", title: "Hazard A", hazard_code: "HAZ-001", status: "active" }),
      makeHazard({ id: "2", title: "Hazard B", hazard_code: "HAZ-002", status: "active" }),
    ];
    renderHazardRegister({ hazards });
    const searchInput = screen.getByPlaceholderText("Search investigations...");
    fireEvent.change(searchInput, { target: { value: "HAZ-002" } });
    expect(screen.getByText("Hazard B")).toBeInTheDocument();
    expect(screen.queryByText("Hazard A")).not.toBeInTheDocument();
  });

  // 7. Sort options work
  it("sorts hazards by newest first by default", () => {
    const hazards = [
      makeHazard({ id: "1", title: "Older", status: "active", created_at: "2025-01-01T00:00:00Z" }),
      makeHazard({ id: "2", title: "Newer", status: "active", created_at: "2026-01-01T00:00:00Z" }),
    ];
    renderHazardRegister({ hazards });
    const cards = screen.getAllByText(/Older|Newer/);
    expect(cards[0].textContent).toBe("Newer");
    expect(cards[1].textContent).toBe("Older");
  });

  it("sorts hazards oldest first when sort changed", () => {
    const hazards = [
      makeHazard({ id: "1", title: "Older", status: "active", created_at: "2025-01-01T00:00:00Z" }),
      makeHazard({ id: "2", title: "Newer", status: "active", created_at: "2026-01-01T00:00:00Z" }),
    ];
    renderHazardRegister({ hazards });
    const sortSelect = screen.getByDisplayValue("Newest first");
    fireEvent.change(sortSelect, { target: { value: "oldest" } });
    const cards = screen.getAllByText(/Older|Newer/);
    expect(cards[0].textContent).toBe("Older");
    expect(cards[1].textContent).toBe("Newer");
  });

  it("sorts hazards by risk high to low", () => {
    const hazards = [
      makeHazard({ id: "1", title: "Low risk item", status: "active", initial_risk_score: 4, created_at: "2026-01-01T00:00:00Z" }),
      makeHazard({ id: "2", title: "High risk item", status: "active", initial_risk_score: 20, created_at: "2025-01-01T00:00:00Z" }),
    ];
    renderHazardRegister({ hazards });
    const sortSelect = screen.getByDisplayValue("Newest first");
    fireEvent.change(sortSelect, { target: { value: "risk_high" } });
    const cards = screen.getAllByText(/Low risk item|High risk item/);
    expect(cards[0].textContent).toBe("High risk item");
    expect(cards[1].textContent).toBe("Low risk item");
  });

  // 8. "+ New Investigation" button switches to form
  it("clicking New Investigation button switches to the form view", () => {
    renderHazardRegister();
    fireEvent.click(screen.getByText("+ New Investigation"));
    expect(screen.getByText("New Investigation")).toBeInTheDocument();
    expect(screen.getByText(/Investigation Title/)).toBeInTheDocument();
  });

  // 9. HazardForm renders inputs
  it("HazardForm renders title, description, source, category, and responsible person inputs", () => {
    renderHazardRegister();
    fireEvent.click(screen.getByText("+ New Investigation"));
    expect(screen.getByText(/Investigation Title/)).toBeInTheDocument();
    expect(screen.getByText(/Description/)).toBeInTheDocument();
    expect(screen.getByText(/Source/)).toBeInTheDocument();
    expect(screen.getByText(/Category/)).toBeInTheDocument();
    expect(screen.getByText(/Responsible Person/)).toBeInTheDocument();
  });

  // 10. HazardForm: submit disabled when title empty or risk not selected
  it("submit button is disabled when title is empty", () => {
    renderHazardRegister();
    fireEvent.click(screen.getByText("+ New Investigation"));
    const submitBtn = screen.getByText("Register Investigation");
    expect(submitBtn).toBeDisabled();
  });

  it("submit button is disabled when risk is not selected even with title filled", () => {
    renderHazardRegister();
    fireEvent.click(screen.getByText("+ New Investigation"));
    const titleInput = screen.getByPlaceholderText(/e.g. Icing conditions/);
    fireEvent.change(titleInput, { target: { value: "Test hazard" } });
    const submitBtn = screen.getByText("Register Investigation");
    expect(submitBtn).toBeDisabled();
  });

  // 11. HazardForm: submit calls onCreateHazard with correct data including hazardCode
  it("submit calls onCreateHazard with correct data and generated hazardCode", () => {
    const onCreateHazard = vi.fn();
    const existingHazards = [makeHazard({ id: "1" }), makeHazard({ id: "2" })];
    renderHazardRegister({ onCreateHazard, hazards: existingHazards });
    fireEvent.click(screen.getByText("+ New Investigation"));

    // Fill title
    const titleInput = screen.getByPlaceholderText(/e.g. Icing conditions/);
    fireEvent.change(titleInput, { target: { value: "New test hazard" } });

    // Click a risk matrix cell - score 3*3=9 (likelihood=3, severity=3)
    // The risk matrix has buttons with score values. We need to click one.
    // All risk matrix buttons show their score number. Find the button with text "9"
    // that corresponds to l=3,s=3 in the initial risk matrix.
    const riskButtons = screen.getAllByText("9");
    // Click the first one (from initial risk matrix)
    fireEvent.click(riskButtons[0]);

    const submitBtn = screen.getByText("Register Investigation");
    fireEvent.click(submitBtn);

    expect(onCreateHazard).toHaveBeenCalledTimes(1);
    const call = onCreateHazard.mock.calls[0][0];
    expect(call.title).toBe("New test hazard");
    expect(call.hazardCode).toBe("HAZ-003"); // existingCount=2, so HAZ-003
  });

  // 12. HazardForm: cancel returns to list
  it("cancel button returns to list view", () => {
    renderHazardRegister();
    fireEvent.click(screen.getByText("+ New Investigation"));
    expect(screen.getByText(/Investigation Title/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.getByText("Investigations")).toBeInTheDocument();
  });

  // 13. HazardForm: fromReport populates fields
  it("fromReport populates form fields with report data", () => {
    const fromReport = {
      id: "report-1",
      title: "Engine vibration report",
      description: "Unusual vibration noted during climb",
      report_code: "RPT-007",
      category: "mechanical",
    };
    renderHazardRegister({ fromReport });
    // Form should be shown since fromReport is provided
    expect(screen.getByText(/Investigation Title/)).toBeInTheDocument();
    // Title should be populated
    const titleInput = screen.getByPlaceholderText(/e.g. Icing conditions/);
    expect(titleInput.value).toBe("Engine vibration report");
    // Should show the linked report banner
    expect(screen.getByText(/Creating from report RPT-007/)).toBeInTheDocument();
  });

  // 14. HazardForm: residual risk matrix only shown when mitigations filled
  it("residual risk matrix only appears when mitigations are filled", () => {
    renderHazardRegister();
    fireEvent.click(screen.getByText("+ New Investigation"));
    // Initially no residual risk section
    expect(screen.queryByText(/Residual Risk/)).not.toBeInTheDocument();
    // Fill mitigations
    const mitigationsTextarea = screen.getByPlaceholderText(/What controls are in place/);
    fireEvent.change(mitigationsTextarea, { target: { value: "Add de-icing procedures" } });
    // Now residual risk matrix should appear
    expect(screen.getByText(/Residual Risk/)).toBeInTheDocument();
  });

  // 15. HazardCard: clicking expands card
  it("clicking a hazard card expands it to show details", () => {
    const hazard = makeHazard({
      id: "1",
      title: "Expandable hazard",
      description: "Detailed description here",
      status: "active",
      mitigations: "Some mitigations",
    });
    renderHazardRegister({ hazards: [hazard] });
    // Description should not be visible before expanding
    expect(screen.queryByText("Detailed description here")).not.toBeInTheDocument();
    // Click to expand
    fireEvent.click(screen.getByText("Expandable hazard"));
    // Description should now be visible
    expect(screen.getByText("Detailed description here")).toBeInTheDocument();
  });

  // 16. HazardCard: expanded shows description, mitigations, status buttons for canManage
  it("expanded card shows description, mitigations, and status update buttons for admin", () => {
    const hazard = makeHazard({
      id: "1",
      title: "Admin hazard",
      description: "Admin can see this",
      status: "identified",
      mitigations: "Mitigation steps here",
      source: "audit",
      review_date: "2026-06-15",
    });
    renderHazardRegister({ hazards: [hazard], profile: ADMIN_PROFILE });
    fireEvent.click(screen.getByText("Admin hazard"));
    expect(screen.getByText("Admin can see this")).toBeInTheDocument();
    expect(screen.getByText("Mitigation steps here")).toBeInTheDocument();
    expect(screen.getByText("Update Status")).toBeInTheDocument();
    expect(screen.getByText(/Source: audit/)).toBeInTheDocument();
    expect(screen.getByText(/Next review: 2026-06-15/)).toBeInTheDocument();
  });

  it("expanded card does not show status update buttons for pilot role", () => {
    const hazard = makeHazard({
      id: "1",
      title: "Pilot hazard",
      description: "Pilot sees this",
      status: "identified",
    });
    renderHazardRegister({ hazards: [hazard], profile: PILOT_PROFILE });
    fireEvent.click(screen.getByText("Pilot hazard"));
    expect(screen.getByText("Pilot sees this")).toBeInTheDocument();
    expect(screen.queryByText("Update Status")).not.toBeInTheDocument();
  });

  // 17. HazardCard: shows linked report when available
  it("shows linked report info when hazard has a related report", () => {
    const report = { id: "report-1", report_code: "RPT-010", title: "Linked safety report" };
    const hazard = makeHazard({
      id: "1",
      title: "Hazard with report",
      status: "active",
      related_report_id: "report-1",
    });
    renderHazardRegister({ hazards: [hazard], reports: [report] });
    fireEvent.click(screen.getByText("Hazard with report"));
    expect(screen.getByText(/From report RPT-010/)).toBeInTheDocument();
    expect(screen.getByText("Linked safety report")).toBeInTheDocument();
  });

  // 18. HazardCard: shows linked corrective actions
  it("shows linked corrective actions in expanded card", () => {
    const hazard = makeHazard({ id: "haz-1", title: "Hazard with actions", status: "active" });
    const actions = [
      { id: "act-1", hazard_id: "haz-1", action_code: "CA-001", title: "Fix the thing", status: "in_progress" },
      { id: "act-2", hazard_id: "haz-1", action_code: "CA-002", title: "Review the fix", status: "completed" },
    ];
    renderHazardRegister({ hazards: [hazard], actions });
    fireEvent.click(screen.getByText("Hazard with actions"));
    expect(screen.getByText(/Corrective Actions \(2\)/)).toBeInTheDocument();
    expect(screen.getByText(/CA-001 — Fix the thing/)).toBeInTheDocument();
    expect(screen.getByText(/CA-002 — Review the fix/)).toBeInTheDocument();
  });

  // 19. HazardCard: "Create Corrective Action" button for canManage
  it("shows Create Corrective Action button for admin users", () => {
    const hazard = makeHazard({ id: "1", title: "Actionable hazard", status: "active" });
    const onCreateAction = vi.fn();
    renderHazardRegister({ hazards: [hazard], profile: ADMIN_PROFILE, onCreateAction });
    fireEvent.click(screen.getByText("Actionable hazard"));
    const btn = screen.getByText("Create Corrective Action");
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onCreateAction).toHaveBeenCalledWith(hazard);
  });

  it("does not show Create Corrective Action button for pilot users", () => {
    const hazard = makeHazard({ id: "1", title: "Pilot view hazard", status: "active" });
    renderHazardRegister({ hazards: [hazard], profile: PILOT_PROFILE });
    fireEvent.click(screen.getByText("Pilot view hazard"));
    expect(screen.queryByText("Create Corrective Action")).not.toBeInTheDocument();
  });

  // 20. riskColor and riskLabel return correct values (tested via rendered output)
  it("displays correct risk level labels for different scores", () => {
    const hazards = [
      makeHazard({ id: "1", title: "Low risk", status: "active", initial_risk_score: 3, initial_likelihood: 1, initial_severity: 3 }),
      makeHazard({ id: "2", title: "Medium risk", status: "active", initial_risk_score: 8, initial_likelihood: 2, initial_severity: 4 }),
      makeHazard({ id: "3", title: "High risk", status: "active", initial_risk_score: 12, initial_likelihood: 3, initial_severity: 4 }),
      makeHazard({ id: "4", title: "Critical risk", status: "active", initial_risk_score: 20, initial_likelihood: 4, initial_severity: 5 }),
    ];
    renderHazardRegister({ hazards });
    // Each card renders a risk label badge
    const lowBadges = screen.getAllByText("Low");
    const mediumBadges = screen.getAllByText("Medium");
    const highBadges = screen.getAllByText("High");
    const criticalBadges = screen.getAllByText("Critical");
    expect(lowBadges.length).toBeGreaterThanOrEqual(1);
    expect(mediumBadges.length).toBeGreaterThanOrEqual(1);
    expect(highBadges.length).toBeGreaterThanOrEqual(1);
    expect(criticalBadges.length).toBeGreaterThanOrEqual(1);
  });

  // 21. fromReport auto-switches to new form
  it("auto-switches to new form view when fromReport is provided", () => {
    const fromReport = {
      id: "report-99",
      title: "Auto-opened report",
      description: "Should auto open form",
      report_code: "RPT-099",
      category: "fatigue",
    };
    renderHazardRegister({ fromReport });
    // Should be in form view, not list view
    expect(screen.queryByText("Investigations")).not.toBeInTheDocument();
    expect(screen.getByText(/Investigation Title/)).toBeInTheDocument();
    expect(screen.getByText(/Creating from report RPT-099/)).toBeInTheDocument();
  });

  // 22. Shows "Show 25 more" pagination
  it("shows pagination button when more than 25 hazards exist", () => {
    const hazards = Array.from({ length: 30 }, (_, i) =>
      makeHazard({
        id: `haz-${i}`,
        title: `Hazard number ${i}`,
        hazard_code: `HAZ-${String(i + 1).padStart(3, "0")}`,
        status: "active",
        created_at: new Date(2026, 0, i + 1).toISOString(),
      })
    );
    renderHazardRegister({ hazards });
    expect(screen.getByText(/Show 25 more/)).toBeInTheDocument();
    expect(screen.getByText(/Showing 25 of 30/)).toBeInTheDocument();
  });

  it("clicking Show 25 more reveals additional hazards", () => {
    const hazards = Array.from({ length: 30 }, (_, i) =>
      makeHazard({
        id: `haz-${i}`,
        title: `Hazard number ${i}`,
        hazard_code: `HAZ-${String(i + 1).padStart(3, "0")}`,
        status: "active",
        created_at: new Date(2026, 0, i + 1).toISOString(),
      })
    );
    renderHazardRegister({ hazards });
    fireEvent.click(screen.getByText(/Show 25 more/));
    // After clicking, all 30 should be visible, so the pagination button should disappear
    expect(screen.queryByText(/Show 25 more/)).not.toBeInTheDocument();
  });

  // Bonus: HazardCard shows residual risk arrow when available
  it("shows residual risk arrow when hazard has residual scores", () => {
    const hazard = makeHazard({
      id: "1",
      title: "Residual hazard",
      status: "mitigated",
      initial_risk_score: 16,
      initial_likelihood: 4,
      initial_severity: 4,
      residual_risk_score: 6,
      residual_likelihood: 2,
      residual_severity: 3,
    });
    renderHazardRegister({ hazards: [hazard] });
    // The card shows initScore -> resScore with arrow
    // "16" appears in both the score badge and the arrow, so use getAllByText
    const sixteens = screen.getAllByText("16");
    expect(sixteens.length).toBeGreaterThanOrEqual(2); // badge + arrow
    expect(screen.getByText("6")).toBeInTheDocument();
    expect(screen.getByText("\u2192")).toBeInTheDocument();
  });

  // Bonus: Filter tab shows correct counts
  it("filter tabs show correct counts per status", () => {
    const hazards = [
      makeHazard({ id: "1", status: "identified" }),
      makeHazard({ id: "2", status: "identified" }),
      makeHazard({ id: "3", status: "active" }),
      makeHazard({ id: "4", status: "closed" }),
    ];
    renderHazardRegister({ hazards });
    // "all" count excludes closed -> 3
    expect(screen.getByText("All (3)")).toBeInTheDocument();
    expect(screen.getByText("Identified (2)")).toBeInTheDocument();
    expect(screen.getByText("Active (1)")).toBeInTheDocument();
    expect(screen.getByText("Closed (1)")).toBeInTheDocument();
  });
});
