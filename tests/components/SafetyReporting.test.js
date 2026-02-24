import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import SafetyReporting from "../../components/SafetyReporting";

/* ------------------------------------------------------------------ */
/*  Shared fixtures                                                    */
/* ------------------------------------------------------------------ */

const adminProfile = { id: "u1", role: "admin", full_name: "Admin User" };
const pilotProfile = { id: "u2", role: "pilot", full_name: "Pilot User" };
const safetyMgrProfile = { id: "u3", role: "safety_manager", full_name: "Safety Mgr" };

const session = { user: { id: "u1" } };

function makeReport(overrides = {}) {
  return {
    id: "r1",
    title: "Bird Strike on Ramp",
    description: "A large bird struck the left wing during taxi.",
    report_type: "hazard",
    category: "wildlife",
    severity: "medium",
    status: "open",
    location: "KSFF",
    created_at: "2025-06-15T12:00:00Z",
    reporter_id: "u2",
    tail_number: "N12345",
    aircraft_type: "Cessna 172",
    flight_phase: "taxi",
    date_occurred: "2025-06-15",
    confidential: false,
    anonymous: false,
    investigation_notes: "",
    root_cause: "",
    ...overrides,
  };
}

const baseReports = [
  makeReport({ id: "r1", title: "Bird Strike on Ramp", status: "open", severity: "medium", report_type: "hazard", created_at: "2025-06-15T12:00:00Z" }),
  makeReport({ id: "r2", title: "Engine Roughness", status: "under_review", severity: "high", report_type: "incident", created_at: "2025-06-14T12:00:00Z", description: "Engine ran rough on climb out." }),
  makeReport({ id: "r3", title: "Near Miss on Runway", status: "investigation", severity: "critical", report_type: "near_miss", created_at: "2025-06-13T12:00:00Z" }),
  makeReport({ id: "r4", title: "Loose Panel", status: "closed", severity: "low", report_type: "concern", created_at: "2025-06-12T12:00:00Z" }),
];

const orgProfiles = [
  { id: "u1", full_name: "Admin User" },
  { id: "u2", full_name: "Pilot User" },
];

const fleetAircraft = [
  { id: "a1", registration: "N12345", type: "Cessna 172" },
  { id: "a2", registration: "N67890", type: "Piper PA-28" },
];

function renderSR(props = {}) {
  const onSubmitReport = props.onSubmitReport ?? vi.fn();
  const onStatusChange = props.onStatusChange ?? vi.fn();
  const onCreateHazardFromReport = props.onCreateHazardFromReport ?? vi.fn();
  const onClearPrefill = props.onClearPrefill ?? vi.fn();

  const { container } = render(
    <SafetyReporting
      profile={props.profile ?? adminProfile}
      session={props.session ?? session}
      onSubmitReport={onSubmitReport}
      reports={props.reports ?? baseReports}
      onStatusChange={onStatusChange}
      hazards={props.hazards ?? []}
      onCreateHazardFromReport={onCreateHazardFromReport}
      fleetAircraft={props.fleetAircraft ?? fleetAircraft}
      orgProfiles={props.orgProfiles ?? orgProfiles}
      reportPrefill={props.reportPrefill ?? null}
      onClearPrefill={onClearPrefill}
    />
  );

  return { container, onSubmitReport, onStatusChange, onCreateHazardFromReport, onClearPrefill };
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe("SafetyReporting", () => {

  // 1. Renders list view with header and button
  it("renders list view with 'Safety Reports' header and '+ New Report' button", () => {
    renderSR();
    expect(screen.getByText("Safety Reports")).toBeInTheDocument();
    expect(screen.getByText("+ New Report")).toBeInTheDocument();
  });

  // 2. Shows empty state when no reports
  it("shows empty state when no reports exist", () => {
    renderSR({ reports: [] });
    expect(screen.getByText("No safety reports yet")).toBeInTheDocument();
    expect(screen.getByText(/Submit a report to start building your safety data/)).toBeInTheDocument();
  });

  // 3. Renders report cards with title, type badge, severity badge, status badge
  it("renders report cards with title, type badge, severity badge, and status badge", () => {
    renderSR();
    // Default filter is "open", so only the open report appears initially
    expect(screen.getByText("Bird Strike on Ramp")).toBeInTheDocument();
    expect(screen.getByText("Hazard")).toBeInTheDocument();
    expect(screen.getByText("Medium")).toBeInTheDocument();
    // "Open" appears in both the stats grid label and the status badge
    const openElements = screen.getAllByText("Open");
    expect(openElements.length).toBeGreaterThanOrEqual(2);
  });

  // 4. Shows stats grid with correct counts
  it("shows stats grid with correct counts", () => {
    renderSR();
    // Total Reports = 4, Open = 1, Under Review = (under_review 1 + investigation 1) = 2, Closed = 1
    const statValues = screen.getAllByText(/^[0-4]$/);
    // Find by the label text to verify the associated values
    expect(screen.getByText("Total Reports")).toBeInTheDocument();
    expect(screen.getByText("Under Review")).toBeInTheDocument();
    // Verify numerical values: 4, 1, 2, 1
    const fourEl = screen.getByText("Total Reports").parentElement.querySelector("div");
    expect(fourEl.textContent).toBe("4");
    // The stats section has exactly these values
    const statsContainer = screen.getByText("Total Reports").closest("[data-tour='tour-reports-stats']");
    const valueTexts = Array.from(statsContainer.querySelectorAll("div")).filter(d => /^[0-9]+$/.test(d.textContent.trim()) && d.children.length === 0).map(d => d.textContent.trim());
    expect(valueTexts).toEqual(["4", "1", "2", "1"]);
  });

  // 5. Filter tabs work correctly
  it("filter tabs switch the displayed reports", () => {
    renderSR();
    // Default filter is "open" — only r1 (open) appears
    expect(screen.getByText("Bird Strike on Ramp")).toBeInTheDocument();
    expect(screen.queryByText("Loose Panel")).not.toBeInTheDocument();

    // Click "All" tab
    fireEvent.click(screen.getByText(/^All \(/));
    expect(screen.getByText("Bird Strike on Ramp")).toBeInTheDocument();
    expect(screen.getByText("Engine Roughness")).toBeInTheDocument();
    expect(screen.getByText("Near Miss on Runway")).toBeInTheDocument();
    expect(screen.getByText("Loose Panel")).toBeInTheDocument();

    // Click "Closed" tab
    fireEvent.click(screen.getByText(/^Closed \(/));
    expect(screen.queryByText("Bird Strike on Ramp")).not.toBeInTheDocument();
    expect(screen.getByText("Loose Panel")).toBeInTheDocument();
  });

  // 6. Search filters reports by title/description/location/category
  it("search filters reports by title, description, location, and category", () => {
    renderSR();
    // Switch to "All" so all 4 reports show
    fireEvent.click(screen.getByText(/^All \(/));
    expect(screen.getByText("Bird Strike on Ramp")).toBeInTheDocument();
    expect(screen.getByText("Engine Roughness")).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText("Search reports...");

    // Filter by title
    fireEvent.change(searchInput, { target: { value: "Engine" } });
    expect(screen.getByText("Engine Roughness")).toBeInTheDocument();
    expect(screen.queryByText("Bird Strike on Ramp")).not.toBeInTheDocument();

    // Filter by location
    fireEvent.change(searchInput, { target: { value: "KSFF" } });
    expect(screen.getByText("Bird Strike on Ramp")).toBeInTheDocument();

    // Filter by category
    fireEvent.change(searchInput, { target: { value: "wildlife" } });
    expect(screen.getByText("Bird Strike on Ramp")).toBeInTheDocument();
  });

  // 7. Sort options: newest (default), oldest
  it("sorts reports newest first by default and oldest when selected", () => {
    renderSR();
    // Show all reports
    fireEvent.click(screen.getByText(/^All \(/));

    // Get all report titles in DOM order
    const getTitles = () => screen.getAllByText(/Bird Strike on Ramp|Engine Roughness|Near Miss on Runway|Loose Panel/).map(el => el.textContent);

    const newestFirst = getTitles();
    expect(newestFirst[0]).toBe("Bird Strike on Ramp");   // June 15
    expect(newestFirst[3]).toBe("Loose Panel");            // June 12

    // Switch to oldest
    fireEvent.change(screen.getByDisplayValue("Newest first"), { target: { value: "oldest" } });
    const oldestFirst = getTitles();
    expect(oldestFirst[0]).toBe("Loose Panel");            // June 12
    expect(oldestFirst[3]).toBe("Bird Strike on Ramp");    // June 15
  });

  // 8. "+ New Report" button switches to form
  it("'+ New Report' button switches to the report form", () => {
    renderSR();
    fireEvent.click(screen.getByText("+ New Report"));
    expect(screen.getByText("Submit Safety Report")).toBeInTheDocument();
    expect(screen.queryByText("Safety Reports")).not.toBeInTheDocument();
  });

  // 9. ReportForm renders with type selection, title, description inputs
  it("ReportForm renders type selection cards, title input, and description textarea", () => {
    renderSR();
    fireEvent.click(screen.getByText("+ New Report"));

    // Type selection cards
    expect(screen.getByText("Hazard")).toBeInTheDocument();
    expect(screen.getByText("Incident")).toBeInTheDocument();
    expect(screen.getByText("Near Miss")).toBeInTheDocument();
    expect(screen.getByText("Safety Concern")).toBeInTheDocument();

    // Title and description inputs
    expect(screen.getByPlaceholderText("Brief summary of the hazard or event")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/What happened/)).toBeInTheDocument();
  });

  // 10. ReportForm: title and description both required (submit disabled when empty)
  it("submit button is disabled when title and description are empty", () => {
    renderSR();
    fireEvent.click(screen.getByText("+ New Report"));
    const submitBtn = screen.getByText("Submit Report");
    expect(submitBtn).toBeDisabled();
  });

  it("submit button is disabled when only title is filled", () => {
    renderSR();
    fireEvent.click(screen.getByText("+ New Report"));
    const titleInput = screen.getByPlaceholderText("Brief summary of the hazard or event");
    fireEvent.change(titleInput, { target: { value: "Some title" } });
    expect(screen.getByText("Submit Report")).toBeDisabled();
  });

  it("submit button is enabled when title and description are both filled", () => {
    renderSR();
    fireEvent.click(screen.getByText("+ New Report"));
    fireEvent.change(screen.getByPlaceholderText("Brief summary of the hazard or event"), { target: { value: "Title" } });
    fireEvent.change(screen.getByPlaceholderText(/What happened/), { target: { value: "Details" } });
    expect(screen.getByText("Submit Report")).not.toBeDisabled();
  });

  // 11. ReportForm: type selection buttons change report type
  it("clicking a type card changes the selected report type", () => {
    renderSR();
    fireEvent.click(screen.getByText("+ New Report"));

    // Hazard is default — its border should include the yellow color
    const incidentBtn = screen.getByText("Incident").closest("button");
    fireEvent.click(incidentBtn);
    // After clicking Incident, the Incident button should be visually selected (border color changes)
    // We verify by checking border style contains the red color for incident (#EF4444)
    expect(incidentBtn.style.border).toContain("rgb(239, 68, 68)");
  });

  // 12. ReportForm: confidential and anonymous are mutually exclusive
  it("confidential and anonymous checkboxes are mutually exclusive", () => {
    renderSR();
    fireEvent.click(screen.getByText("+ New Report"));

    const checkboxes = screen.getAllByRole("checkbox");
    const confidentialCb = checkboxes[0];
    const anonymousCb = checkboxes[1];

    // Check confidential
    fireEvent.click(confidentialCb);
    expect(confidentialCb.checked).toBe(true);
    expect(anonymousCb.checked).toBe(false);

    // Check anonymous — should uncheck confidential
    fireEvent.click(anonymousCb);
    expect(anonymousCb.checked).toBe(true);
    expect(confidentialCb.checked).toBe(false);

    // Check confidential again — should uncheck anonymous
    fireEvent.click(confidentialCb);
    expect(confidentialCb.checked).toBe(true);
    expect(anonymousCb.checked).toBe(false);
  });

  // 13. ReportForm: submit calls onSubmitReport with correct data
  it("submit calls onSubmitReport with correct data and returns to list", () => {
    const { onSubmitReport } = renderSR();
    fireEvent.click(screen.getByText("+ New Report"));

    // Fill required fields
    fireEvent.change(screen.getByPlaceholderText("Brief summary of the hazard or event"), { target: { value: "Test Title" } });
    fireEvent.change(screen.getByPlaceholderText(/What happened/), { target: { value: "Test description" } });

    // Select incident type
    fireEvent.click(screen.getByText("Incident").closest("button"));

    // Submit
    fireEvent.click(screen.getByText("Submit Report"));

    expect(onSubmitReport).toHaveBeenCalledTimes(1);
    const arg = onSubmitReport.mock.calls[0][0];
    expect(arg.title).toBe("Test Title");
    expect(arg.description).toBe("Test description");
    expect(arg.reportType).toBe("incident");
    expect(arg.reportCode).toMatch(/^RPT-/);

    // Returns to list view
    expect(screen.getByText("Safety Reports")).toBeInTheDocument();
  });

  // 14. ReportForm: cancel returns to list
  it("cancel button returns to the list view", () => {
    renderSR();
    fireEvent.click(screen.getByText("+ New Report"));
    expect(screen.getByText("Submit Safety Report")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.getByText("Safety Reports")).toBeInTheDocument();
    expect(screen.queryByText("Submit Safety Report")).not.toBeInTheDocument();
  });

  // 15. ReportCard: clicking expands the card
  it("clicking a report card expands it", () => {
    renderSR();
    // r1 is open and visible by default
    const title = screen.getByText("Bird Strike on Ramp");
    // Initially collapsed — description not shown
    expect(screen.queryByText("A large bird struck the left wing during taxi.")).not.toBeInTheDocument();

    // Click to expand
    fireEvent.click(title);
    expect(screen.getByText("A large bird struck the left wing during taxi.")).toBeInTheDocument();
  });

  // 16. ReportCard: expanded shows description and details
  it("expanded report card shows description, aircraft, flight phase, and date occurred", () => {
    renderSR();
    fireEvent.click(screen.getByText("Bird Strike on Ramp"));

    expect(screen.getByText("A large bird struck the left wing during taxi.")).toBeInTheDocument();
    expect(screen.getByText(/Aircraft: N12345/)).toBeInTheDocument();
    expect(screen.getByText(/Phase: taxi/)).toBeInTheDocument();
    expect(screen.getByText(/Date occurred: 2025-06-15/)).toBeInTheDocument();
  });

  // 17. ReportCard: status change buttons shown only for canManage roles
  it("status change buttons are shown for admin profile", () => {
    renderSR({ profile: adminProfile });
    fireEvent.click(screen.getByText("Bird Strike on Ramp"));

    // Status buttons inside expanded card
    const buttons = screen.getAllByRole("button");
    const statusLabels = ["Under Review", "Investigation", "Corrective Action", "Closed"];
    statusLabels.forEach(label => {
      // Multiple elements may match (badge + button), verify at least 2 for the button
      const matches = screen.getAllByText(label);
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("status change buttons are NOT shown for pilot profile", () => {
    renderSR({ profile: pilotProfile });
    fireEvent.click(screen.getByText("Bird Strike on Ramp"));

    // The "Corrective Action" text should not appear as a button since pilot can't manage
    // In the expanded card, there should be no status change buttons
    // Corrective Action only appears as a status button (not badge), so it should be absent
    expect(screen.queryByText("Corrective Action")).not.toBeInTheDocument();
  });

  // 18. ReportCard: "Open Investigation" button shown for canManage without linked hazard
  it("'Open Investigation' button shown for canManage without linked hazard", () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const { onCreateHazardFromReport } = renderSR({ profile: adminProfile, hazards: [] });
    fireEvent.click(screen.getByText("Bird Strike on Ramp"));

    const investigateBtn = screen.getByText("Open Investigation");
    expect(investigateBtn).toBeInTheDocument();

    fireEvent.click(investigateBtn);
    expect(onCreateHazardFromReport).toHaveBeenCalledTimes(1);
    window.confirm.mockRestore();
  });

  it("'Open Investigation' button NOT shown for pilot profile", () => {
    renderSR({ profile: pilotProfile });
    fireEvent.click(screen.getByText("Bird Strike on Ramp"));
    expect(screen.queryByText("Open Investigation")).not.toBeInTheDocument();
  });

  // 19. ReportCard: shows linked hazard when one exists
  it("shows linked hazard info when a hazard is linked to the report", () => {
    const linkedHazard = { id: "h1", hazard_code: "HAZ-001", title: "Bird Strike Hazard", status: "open", related_report_id: "r1" };
    renderSR({ profile: adminProfile, hazards: [linkedHazard] });
    fireEvent.click(screen.getByText("Bird Strike on Ramp"));

    expect(screen.getByText(/Linked to HAZ-001/)).toBeInTheDocument();
    expect(screen.getByText("Bird Strike Hazard")).toBeInTheDocument();
  });

  // 20. Shows "Show 25 more" pagination when >25 reports
  it("shows pagination button when more than 25 reports", () => {
    const manyReports = Array.from({ length: 30 }, (_, i) =>
      makeReport({ id: `r${i}`, title: `Report ${i}`, status: "open", created_at: `2025-06-${String(i + 1).padStart(2, "0")}T12:00:00Z` })
    );
    renderSR({ reports: manyReports });

    expect(screen.getByText(/Showing 25 of 30/)).toBeInTheDocument();
    expect(screen.getByText(/Show 25 more/)).toBeInTheDocument();

    // Click to show more
    fireEvent.click(screen.getByText(/Show 25 more/));
    // After clicking, all 30 should be visible (no more pagination)
    expect(screen.queryByText(/Show 25 more/)).not.toBeInTheDocument();
  });

  // 21. reportPrefill auto-switches to new form
  it("reportPrefill automatically opens the report form", () => {
    renderSR({ reportPrefill: { location: "KLAX", flightPhase: "takeoff" } });
    expect(screen.getByText("Submit Safety Report")).toBeInTheDocument();
    expect(screen.queryByText("Safety Reports")).not.toBeInTheDocument();
  });

  // 22. Fleet aircraft dropdown with "__other" option shows custom input
  it("fleet aircraft dropdown with '__other' option shows custom tail number input", () => {
    renderSR();
    fireEvent.click(screen.getByText("+ New Report"));

    // Select "Other" from the aircraft dropdown
    const selects = screen.getAllByRole("combobox");
    // Find the aircraft select — it has "Select aircraft" as first option
    const aircraftSelect = selects.find(s => s.querySelector("option[value='']")?.textContent === "Select aircraft");
    expect(aircraftSelect).toBeTruthy();

    fireEvent.change(aircraftSelect, { target: { value: "__other" } });

    // A custom input should now appear
    const customInput = screen.getByPlaceholderText("N12345");
    expect(customInput).toBeInTheDocument();
  });

});
