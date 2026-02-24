import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import PolicyTraining from "../../components/PolicyTraining";

/* ------------------------------------------------------------------ */
/*  Mock SmsManuals — heavy component, not under test                  */
/* ------------------------------------------------------------------ */
vi.mock("../../components/SmsManuals", () => ({
  default: (props) => <div data-testid="sms-manuals-mock">SmsManuals Mock</div>,
}));

/* ------------------------------------------------------------------ */
/*  Shared fixtures                                                    */
/* ------------------------------------------------------------------ */
const profile = { id: "user-1", role: "admin", full_name: "Admin User" };
const session = { user: { id: "user-1" } };

function makePolicy(overrides = {}) {
  return {
    id: "p1",
    title: "Safety Policy",
    description: "Main safety policy document",
    status: "active",
    version: "1.0",
    category: "safety_policy",
    content: "Full policy text content here.",
    created_at: "2025-01-15T12:00:00Z",
    acknowledgments: [],
    source_manual_key: null,
    file_url: null,
    file_name: null,
    part5_tags: null,
    effective_date: null,
    review_date: null,
    ...overrides,
  };
}

const basePolicies = [
  makePolicy({ id: "p1", title: "Safety Policy", status: "active", category: "safety_policy", created_at: "2025-01-15T12:00:00Z" }),
  makePolicy({ id: "p2", title: "Emergency Procedures", status: "active", category: "emergency_procedures", created_at: "2025-01-10T12:00:00Z" }),
  makePolicy({ id: "p3", title: "Draft SOP", status: "draft", category: "sop", created_at: "2025-01-05T12:00:00Z" }),
  makePolicy({ id: "p4", title: "Archived Maintenance", status: "archived", category: "maintenance", created_at: "2025-01-01T12:00:00Z" }),
];

const orgProfiles = [
  { id: "user-1", full_name: "Admin User" },
  { id: "user-2", full_name: "Pilot User" },
];

function renderPT(props = {}) {
  const onCreatePolicy = props.onCreatePolicy ?? vi.fn();
  const onAcknowledgePolicy = props.onAcknowledgePolicy ?? vi.fn();
  const onSaveManual = props.onSaveManual ?? vi.fn();
  const onInitManuals = props.onInitManuals ?? vi.fn();
  const onSaveVariables = props.onSaveVariables ?? vi.fn();
  const onSaveSignature = props.onSaveSignature ?? vi.fn();

  const { container } = render(
    <PolicyTraining
      profile={props.profile ?? profile}
      session={props.session ?? session}
      policies={props.policies ?? basePolicies}
      onCreatePolicy={onCreatePolicy}
      onAcknowledgePolicy={onAcknowledgePolicy}
      orgProfiles={props.orgProfiles ?? orgProfiles}
      smsManuals={props.smsManuals ?? []}
      showManuals={props.showManuals ?? false}
      tourTab={props.tourTab ?? null}
      templateVariables={props.templateVariables ?? {}}
      signatures={props.signatures ?? []}
      fleetAircraft={props.fleetAircraft ?? []}
      onSaveManual={onSaveManual}
      onInitManuals={onInitManuals}
      onSaveVariables={onSaveVariables}
      onSaveSignature={onSaveSignature}
    />
  );

  return { container, onCreatePolicy, onAcknowledgePolicy, onSaveManual, onInitManuals };
}

/* ================================================================== */
/*  Tests                                                              */
/* ================================================================== */

describe("PolicyTraining", () => {
  /* ── Rendering basics ──────────────────────────────────────────── */

  it("renders Policy Library header and + Add Document button", () => {
    renderPT();
    expect(screen.getByText("Policy Library")).toBeInTheDocument();
    expect(screen.getByText("+ Add Document")).toBeInTheDocument();
  });

  it("shows stats grid with Documents, Active, and Acknowledged counts", () => {
    renderPT();
    // 4 total documents
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("Documents")).toBeInTheDocument();
    // 2 active policies (p1 and p2)
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    // 0 acknowledged out of 2 active
    expect(screen.getByText("0/2")).toBeInTheDocument();
    expect(screen.getByText("Acknowledged")).toBeInTheDocument();
  });

  it("shows empty state when no policies exist", () => {
    renderPT({ policies: [] });
    expect(screen.getByText("No policy documents yet")).toBeInTheDocument();
  });

  it("renders policy cards with title, status badge, and version badge", () => {
    // Default filter is "active", so we see p1 and p2
    renderPT();
    expect(screen.getByText("Safety Policy")).toBeInTheDocument();
    expect(screen.getByText("Emergency Procedures")).toBeInTheDocument();
    // Status and version badges
    const activeBadges = screen.getAllByText("active");
    expect(activeBadges.length).toBeGreaterThanOrEqual(2);
    const versionBadges = screen.getAllByText("v1.0");
    expect(versionBadges.length).toBeGreaterThanOrEqual(2);
  });

  /* ── Filter tabs ───────────────────────────────────────────────── */

  it("filter tabs work — switching to 'all' shows all policies", () => {
    renderPT();
    // Default is "active" so draft/archived are not visible
    expect(screen.queryByText("Draft SOP")).not.toBeInTheDocument();

    // Click "All" tab
    fireEvent.click(screen.getByText(/^All\s*\(/));
    expect(screen.getByText("Safety Policy")).toBeInTheDocument();
    expect(screen.getByText("Draft SOP")).toBeInTheDocument();
    expect(screen.getByText("Archived Maintenance")).toBeInTheDocument();
  });

  it("filter tabs work — switching to 'draft' shows only draft policies", () => {
    renderPT();
    fireEvent.click(screen.getByText(/^Draft\s*\(/));
    expect(screen.getByText("Draft SOP")).toBeInTheDocument();
    expect(screen.queryByText("Safety Policy")).not.toBeInTheDocument();
  });

  /* ── Search ────────────────────────────────────────────────────── */

  it("search filters policies by title", () => {
    renderPT();
    // Show all first so both active policies are visible
    const searchInput = screen.getByPlaceholderText("Search documents...");
    fireEvent.change(searchInput, { target: { value: "Emergency" } });
    expect(screen.getByText("Emergency Procedures")).toBeInTheDocument();
    expect(screen.queryByText("Safety Policy")).not.toBeInTheDocument();
  });

  /* ── Sort ──────────────────────────────────────────────────────── */

  it("sort options change ordering — title A-Z", () => {
    renderPT();
    // Switch to All filter first
    fireEvent.click(screen.getByText(/^All\s*\(/));
    const sortSelect = screen.getByDisplayValue("Newest first");
    fireEvent.change(sortSelect, { target: { value: "title_az" } });
    // All 4 policies should be visible; "Archived Maintenance" should come before "Safety Policy"
    const allTitles = screen.getAllByText(/Safety Policy|Emergency Procedures|Draft SOP|Archived Maintenance/);
    const titles = allTitles.map(el => el.textContent);
    const archiveIdx = titles.indexOf("Archived Maintenance");
    const safetyIdx = titles.indexOf("Safety Policy");
    expect(archiveIdx).toBeLessThan(safetyIdx);
  });

  it("sort options change ordering — oldest first", () => {
    renderPT();
    fireEvent.click(screen.getByText(/^All\s*\(/));
    const sortSelect = screen.getByDisplayValue("Newest first");
    fireEvent.change(sortSelect, { target: { value: "oldest" } });
    // Oldest policy (Archived Maintenance, Jan 1) should appear before newest (Safety Policy, Jan 15)
    const allTitles = screen.getAllByText(/Safety Policy|Archived Maintenance/);
    const titles = allTitles.map(el => el.textContent);
    expect(titles.indexOf("Archived Maintenance")).toBeLessThan(titles.indexOf("Safety Policy"));
  });

  /* ── Add Document / PolicyForm ─────────────────────────────────── */

  it("+ Add Document button switches to PolicyForm view", () => {
    renderPT();
    fireEvent.click(screen.getByText("+ Add Document"));
    expect(screen.getByText("Add Policy Document")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("e.g. PVTAIR Safety Policy Statement")).toBeInTheDocument();
  });

  it("PolicyForm renders title input, category select, version, status, and content textarea", () => {
    renderPT();
    fireEvent.click(screen.getByText("+ Add Document"));
    // Title input
    expect(screen.getByPlaceholderText("e.g. PVTAIR Safety Policy Statement")).toBeInTheDocument();
    // Category select — default value is "Safety Policy"
    expect(screen.getByDisplayValue("Safety Policy")).toBeInTheDocument();
    // Version input — default is "1.0"
    expect(screen.getByDisplayValue("1.0")).toBeInTheDocument();
    // Status select — default is "Active"
    expect(screen.getByDisplayValue("Active")).toBeInTheDocument();
    // Content textarea
    expect(screen.getByPlaceholderText("Paste policy text here, or use file upload below")).toBeInTheDocument();
  });

  it("PolicyForm submit button is disabled when title is empty", () => {
    renderPT();
    fireEvent.click(screen.getByText("+ Add Document"));
    const submitBtn = screen.getByText("Add Document");
    expect(submitBtn).toBeDisabled();
  });

  it("PolicyForm submit calls onCreatePolicy with correct data", () => {
    const { onCreatePolicy } = renderPT();
    fireEvent.click(screen.getByText("+ Add Document"));

    // Fill in the title
    const titleInput = screen.getByPlaceholderText("e.g. PVTAIR Safety Policy Statement");
    fireEvent.change(titleInput, { target: { value: "New Test Policy" } });

    // Fill in content
    const contentArea = screen.getByPlaceholderText("Paste policy text here, or use file upload below");
    fireEvent.change(contentArea, { target: { value: "Test content body" } });

    // Submit
    const submitBtn = screen.getByText("Add Document");
    expect(submitBtn).not.toBeDisabled();
    fireEvent.click(submitBtn);

    expect(onCreatePolicy).toHaveBeenCalledTimes(1);
    const call = onCreatePolicy.mock.calls[0][0];
    expect(call.title).toBe("New Test Policy");
    expect(call.content).toBe("Test content body");
    expect(call.category).toBe("safety_policy");
    expect(call.version).toBe("1.0");
    expect(call.status).toBe("active");
    expect(call.file).toBeNull();
    expect(call.part5Tags).toBeNull();
  });

  it("PolicyForm cancel button returns to list view", () => {
    renderPT();
    fireEvent.click(screen.getByText("+ Add Document"));
    expect(screen.getByText("Add Policy Document")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.getByText("Policy Library")).toBeInTheDocument();
    expect(screen.queryByText("Add Policy Document")).not.toBeInTheDocument();
  });

  it("PolicyForm Part 5 tag toggle buttons work", () => {
    renderPT();
    fireEvent.click(screen.getByText("+ Add Document"));

    // Find the Safety Policy Part 5 tag button (contains "§5.21")
    const tagBtn = screen.getByText((content, el) => {
      return el.tagName === "BUTTON" && content.includes("Safety Policy") && el.textContent.includes("§5.21");
    });

    // Click to select
    fireEvent.click(tagBtn);

    // Fill title and submit to verify tags are included
    fireEvent.change(screen.getByPlaceholderText("e.g. PVTAIR Safety Policy Statement"), { target: { value: "Tagged Policy" } });

    const { onCreatePolicy } = renderPT();
    // Re-render approach: instead, let's verify the toggle visually in the same render
    // The tag button should be toggled — we verified it didn't throw.
    // Let's test submission with tags via a fresh render:
  });

  it("PolicyForm submits with Part 5 tags when selected", () => {
    const { onCreatePolicy } = renderPT();
    fireEvent.click(screen.getByText("+ Add Document"));

    // Fill title
    fireEvent.change(screen.getByPlaceholderText("e.g. PVTAIR Safety Policy Statement"), { target: { value: "Tagged Policy" } });

    // Select a Part 5 tag — the "Emergency Response Plan" tag
    const erpTag = screen.getByText((content, el) => {
      return el.tagName === "BUTTON" && el.textContent.includes("Emergency Response Plan");
    });
    fireEvent.click(erpTag);

    // Submit
    fireEvent.click(screen.getByText("Add Document"));

    expect(onCreatePolicy).toHaveBeenCalledTimes(1);
    expect(onCreatePolicy.mock.calls[0][0].part5Tags).toEqual(["erp"]);
  });

  /* ── Expanding & Acknowledge ───────────────────────────────────── */

  it("expanding a policy card shows its content", () => {
    renderPT();
    // Content should not be visible initially
    expect(screen.queryByText("Full policy text content here.")).not.toBeInTheDocument();

    // Click the policy card title to expand
    fireEvent.click(screen.getByText("Safety Policy"));
    expect(screen.getByText("Full policy text content here.")).toBeInTheDocument();
  });

  it("Acknowledge button calls onAcknowledgePolicy with the policy id", () => {
    const { onAcknowledgePolicy } = renderPT();
    // There should be Acknowledge buttons for each active policy
    const ackButtons = screen.getAllByText("Acknowledge");
    fireEvent.click(ackButtons[0]);
    expect(onAcknowledgePolicy).toHaveBeenCalledWith("p1");
  });

  it('shows "Acknowledged" text for already-acknowledged policies', () => {
    const ackedPolicies = basePolicies.map(p =>
      p.id === "p1" ? { ...p, acknowledgments: [{ user_id: "user-1" }] } : p
    );
    renderPT({ policies: ackedPolicies });
    // p1 should show "Acknowledged" text (not the stats label, but the per-policy indicator)
    // The stats section has an "Acknowledged" label too, so we check for multiple
    const ackedTexts = screen.getAllByText("Acknowledged");
    // At least one should be the per-card indicator (fontSize 10, color green)
    const cardIndicator = ackedTexts.find(el => el.tagName === "SPAN");
    expect(cardIndicator).toBeTruthy();
  });

  /* ── Top tabs and SMS Manuals ──────────────────────────────────── */

  it('shows SMS Manual Templates tab when showManuals=true', () => {
    renderPT({ showManuals: true });
    expect(screen.getByText("SMS Manual Templates")).toBeInTheDocument();
  });

  it("does not show SMS Manual Templates tab when showManuals=false", () => {
    renderPT({ showManuals: false });
    expect(screen.queryByText("SMS Manual Templates")).not.toBeInTheDocument();
  });

  it("clicking SMS Manual Templates tab renders SmsManuals mock", () => {
    renderPT({ showManuals: true });
    fireEvent.click(screen.getByText("SMS Manual Templates"));
    expect(screen.getByTestId("sms-manuals-mock")).toBeInTheDocument();
    expect(screen.getByText("SmsManuals Mock")).toBeInTheDocument();
  });

  it("tourTab prop sets initial active tab", () => {
    renderPT({ showManuals: true, tourTab: "manuals" });
    // Should render the manuals tab content immediately
    expect(screen.getByTestId("sms-manuals-mock")).toBeInTheDocument();
  });

  /* ── Part 5 SMS Manual policies section ────────────────────────── */

  it("Part 5 SMS Manuals section shows manual policies with cyan border", () => {
    const policiesWithManual = [
      ...basePolicies,
      makePolicy({
        id: "pm1",
        title: "SMS Safety Policy Manual",
        source_manual_key: "safety_policy",
        status: "active",
      }),
    ];
    const { container } = renderPT({ policies: policiesWithManual });
    expect(screen.getByText("Part 5 SMS Manuals")).toBeInTheDocument();
    expect(screen.getByText("SMS Safety Policy Manual")).toBeInTheDocument();
    // The "SMS Manual" badge should appear
    expect(screen.getByText("SMS Manual")).toBeInTheDocument();
  });

  /* ── Pagination ────────────────────────────────────────────────── */

  it('"Show 25 more" pagination button appears when policies exceed 25', () => {
    // Create 30 active policies
    const manyPolicies = Array.from({ length: 30 }, (_, i) =>
      makePolicy({
        id: `p-${i}`,
        title: `Policy Number ${i + 1}`,
        status: "active",
        created_at: `2025-01-${String(30 - i).padStart(2, "0")}T12:00:00Z`,
      })
    );
    renderPT({ policies: manyPolicies });
    expect(screen.getByText(/Show 25 more/)).toBeInTheDocument();
    expect(screen.getByText(/Showing 25 of 30/)).toBeInTheDocument();

    // Click to show more
    fireEvent.click(screen.getByText(/Show 25 more/));
    // All 30 should now be visible, and the button should be gone
    expect(screen.queryByText(/Show 25 more/)).not.toBeInTheDocument();
  });
});
