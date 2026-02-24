import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import FaaAuditLog from "../../components/FaaAuditLog";

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const defaultProps = {
  frats: [{ timestamp: new Date().toISOString(), score: 10 }],
  flights: [{ timestamp: new Date().toISOString(), status: "ACTIVE" }],
  reports: [{ created_at: new Date().toISOString(), status: "new", category: "weather" }],
  hazards: [{ status: "open", risk_score: 5 }],
  actions: [{ status: "open", due_date: "2025-12-01" }],
  policies: [{ id: "p1", title: "Safety Policy", status: "active", acknowledged_by: ["u1"], part5_tags: ["safety_policy"] }],
  profiles: [{ id: "u1", role: "admin" }, { id: "u2", role: "safety_manager" }],
  trainingRecords: [{ id: "tr1" }],
  org: { name: "Test Org" },
  smsManuals: [],
};

function renderAuditLog(overrides = {}) {
  const props = { ...defaultProps, ...overrides };
  return render(<FaaAuditLog {...props} />);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Click a subpart header to expand/collapse it.
 * Targets the <span> that holds the "Subpart X:" text.
 */
function clickSubpart(letter) {
  const span = screen.getByText(new RegExp(`^Subpart ${letter}:`));
  // The clickable div is the parent row — fire the click on the span's
  // nearest ancestor that has cursor:pointer (the subpart header div).
  fireEvent.click(span.closest("[style*='cursor']") || span);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("FaaAuditLog", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  // 1. Renders header
  it("renders the FAA Part 5 Audit Log header", () => {
    renderAuditLog();
    expect(screen.getByText("FAA Part 5 Audit Log")).toBeInTheDocument();
    expect(screen.getByText(/14 CFR Part 5 SMS Compliance/)).toBeInTheDocument();
  });

  // 2. Summary cards with correct counts (50 total requirements)
  it("shows summary cards with correct counts", () => {
    renderAuditLog();
    expect(screen.getByText("50")).toBeInTheDocument();
    expect(screen.getByText("Total Requirements")).toBeInTheDocument();
    // The other three summary labels should be present
    const allCompliant = screen.getAllByText("Compliant");
    expect(allCompliant.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Needs Attention").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Manual Review").length).toBeGreaterThanOrEqual(1);
  });

  // 3. Compliance percentage bar
  it("shows the overall compliance percentage bar", () => {
    renderAuditLog();
    expect(screen.getByText("Overall Compliance")).toBeInTheDocument();
    // The percentage is rendered as "{number}%" inside a span — use a
    // function matcher since React may split text nodes.
    expect(screen.getByText((_t, el) => el?.tagName === "SPAN" && /\d+%/.test(el.textContent))).toBeInTheDocument();
  });

  // 4. SMS Manual Documentation Status section
  it("shows SMS Manual Documentation Status section with 7 manual templates", () => {
    renderAuditLog();
    expect(screen.getByText("SMS Manual Documentation Status")).toBeInTheDocument();
    expect(screen.getByText("Safety Accountability & Authority")).toBeInTheDocument();
    expect(screen.getByText("Emergency Response Plan")).toBeInTheDocument();
    expect(screen.getByText("Safety Risk Management")).toBeInTheDocument();
    expect(screen.getByText("Safety Assurance")).toBeInTheDocument();
    expect(screen.getByText("Safety Promotion")).toBeInTheDocument();
    expect(screen.getByText("Org. System Description")).toBeInTheDocument();
  });

  // 5. Filter buttons: clicking "Compliant" filters requirements
  it("filters requirements when Compliant filter button is clicked", () => {
    renderAuditLog();
    // Find the "Compliant" filter button (not the summary card label)
    const compliantBtn = screen.getAllByRole("button").find(
      (btn) => btn.textContent === "Compliant"
    );
    fireEvent.click(compliantBtn);

    // In the expanded subpart (B), only Compliant badges should appear on
    // requirement rows. "Needs Attention" and "Manual Review" badges should
    // NOT appear as requirement-level status labels.
    // The only "Needs Attention" text remaining should be on the filter
    // button and the summary card.
    const needsAttentionEls = screen.queryAllByText("Needs Attention");
    needsAttentionEls.forEach((el) => {
      const isButton = el.tagName === "BUTTON";
      const isInSummary = !!el.closest("[data-tour='tour-audit-stats']");
      expect(isButton || isInSummary).toBe(true);
    });
  });

  // 6. Subpart groups render with names
  it("renders subpart groups with correct names", () => {
    renderAuditLog();
    expect(screen.getByText(/^Subpart A: General/)).toBeInTheDocument();
    expect(screen.getByText(/^Subpart B: Safety Policy/)).toBeInTheDocument();
    expect(screen.getByText(/^Subpart C: Safety Risk Management/)).toBeInTheDocument();
    expect(screen.getByText(/^Subpart D: Safety Assurance/)).toBeInTheDocument();
    expect(screen.getByText(/^Subpart E: Safety Promotion/)).toBeInTheDocument();
    expect(screen.getByText(/^Subpart F: Documentation & Recordkeeping/)).toBeInTheDocument();
  });

  // 7. Clicking a subpart expands/collapses it
  it("expands and collapses subpart groups on click", () => {
    renderAuditLog();
    // Subpart B is expanded by default — its requirements should be visible
    expect(screen.getByText(/§ 5\.21\(a\)\(1\)/)).toBeInTheDocument();

    // Collapse Subpart B by clicking it
    clickSubpart("B");
    expect(screen.queryByText(/§ 5\.21\(a\)\(1\)/)).not.toBeInTheDocument();

    // Expand Subpart C
    clickSubpart("C");
    expect(screen.getByText(/§ 5\.51/)).toBeInTheDocument();
  });

  // 8. Expanding a requirement shows details
  it("shows requirement details when a requirement row is expanded", () => {
    renderAuditLog();
    // Subpart B is expanded. Click on a requirement row to expand its details.
    const reqRow = screen.getByText(/§ 5\.21\(a\)\(1\) — Safety Objectives/);
    fireEvent.click(reqRow);

    // The requirement text and evidence section should now appear
    expect(
      screen.getByText(/Safety policy must include the organization's safety objectives/)
    ).toBeInTheDocument();
    expect(screen.getByText("Evidence in PreflightSMS")).toBeInTheDocument();
  });

  // 9. Auto-check passes when data exists
  it("marks requirements as compliant when auto-check data is present", () => {
    // § 5.25(c) autoCheck: profiles.some(p => p.role === "safety_manager")
    // We have a safety_manager profile so it should be compliant
    renderAuditLog();
    // Subpart B is expanded. Find the row for § 5.25(c)
    const row = screen.getByText(/§ 5\.25\(c\) — Management Personnel Designation/);
    // Walk up to the clickable row container
    const container = row.closest("[style*='cursor']") || row.closest("div");
    expect(container.textContent).toContain("Compliant");
  });

  // 10. Needs attention when data is missing
  it("marks requirements as needs_attention when auto-check data is missing", () => {
    // § 5.25(a) autoCheck: profiles.some(p => p.role === "accountable_exec")
    // With no accountable_exec role, it should fail
    renderAuditLog({ profiles: [{ id: "u1", role: "pilot" }] });
    // Subpart B is expanded. Find § 5.25(a)
    const row = screen.getByText(/§ 5\.25\(a\) — Accountable Executive Designation/);
    const container = row.closest("[style*='cursor']") || row.closest("div");
    expect(container.textContent).toContain("Needs Attention");
  });

  // 11. Manual review for requirements without autoCheck
  it("marks requirements as manual_review when no autoCheck exists", () => {
    // § 5.9 has autoCheck: null AND is in Subpart A AND not covered by any SMS manual
    renderAuditLog();
    // Collapse B, expand A
    clickSubpart("B");
    clickSubpart("A");

    const row = screen.getByText(/§ 5\.9 — Part 135 Requirements/);
    const container = row.closest("[style*='cursor']") || row.closest("div");
    expect(container.textContent).toContain("Manual Review");
  });

  // 12. SMS manual template satisfies requirements when complete
  it("marks requirement as compliant when SMS manual template is complete", () => {
    // § 5.21(a)(3) autoCheck checks manualComplete("safety_policy")
    // Provide a complete safety_policy manual
    const smsManuals = [
      {
        manual_key: "safety_policy",
        sections: [
          { id: "s1", title: "Objectives", completed: true },
          { id: "s2", title: "Resources", completed: true },
        ],
      },
    ];
    // Use no policies so the only way to satisfy is via the manual
    renderAuditLog({ smsManuals, policies: [] });

    // Subpart B is expanded. § 5.21(a)(3) — Resource Provision
    const row = screen.getByText(/§ 5\.21\(a\)\(3\) — Resource Provision/);
    const container = row.closest("[style*='cursor']") || row.closest("div");
    expect(container.textContent).toContain("Compliant");
  });

  // 13. Manual override: clicking "Compliant" overrides status
  it("overrides a requirement to compliant when Compliant override button is clicked", () => {
    // Use § 5.9 which is manual_review (autoCheck: null, not covered by manual map)
    renderAuditLog();
    // Collapse B, expand A
    clickSubpart("B");
    clickSubpart("A");

    // Verify initial state is Manual Review
    const reqRow = screen.getByText(/§ 5\.9 — Part 135 Requirements/);
    expect(reqRow.closest("[style*='cursor']").textContent).toContain("Manual Review");

    // Expand the requirement details
    fireEvent.click(reqRow);

    // Find the override "Compliant" button (near the "Override:" label)
    const overrideSection = screen.getByText("Override:").parentElement;
    const overrideCompliantBtn = within(overrideSection).getAllByRole("button").find(
      (btn) => btn.textContent === "Compliant"
    );
    fireEvent.click(overrideCompliantBtn);

    // The requirement badge should now say "Compliant"
    const updatedRow = screen.getByText(/§ 5\.9 — Part 135 Requirements/);
    expect(updatedRow.closest("[style*='cursor']").textContent).toContain("Compliant");
  });

  // 14. Manual override: toggling same button removes the override
  it("removes override when clicking the same override button again", () => {
    renderAuditLog();
    clickSubpart("B");
    clickSubpart("A");

    const reqRow = screen.getByText(/§ 5\.9 — Part 135 Requirements/);
    fireEvent.click(reqRow);

    const overrideSection = screen.getByText("Override:").parentElement;
    const overrideCompliantBtn = within(overrideSection).getAllByRole("button").find(
      (btn) => btn.textContent === "Compliant"
    );
    // Click once to set override
    fireEvent.click(overrideCompliantBtn);
    expect(
      screen.getByText(/§ 5\.9 — Part 135 Requirements/).closest("[style*='cursor']").textContent
    ).toContain("Compliant");

    // Click again to remove it
    fireEvent.click(overrideCompliantBtn);
    expect(
      screen.getByText(/§ 5\.9 — Part 135 Requirements/).closest("[style*='cursor']").textContent
    ).toContain("Manual Review");
  });

  // 15. Override saves to localStorage
  it("saves overrides to localStorage", () => {
    renderAuditLog();
    clickSubpart("B");
    clickSubpart("A");

    const reqRow = screen.getByText(/§ 5\.9 — Part 135 Requirements/);
    fireEvent.click(reqRow);

    const overrideSection = screen.getByText("Override:").parentElement;
    const overrideCompliantBtn = within(overrideSection).getAllByRole("button").find(
      (btn) => btn.textContent === "Compliant"
    );
    fireEvent.click(overrideCompliantBtn);

    expect(localStorage.setItem).toHaveBeenCalledWith(
      "audit_overrides",
      expect.stringContaining('"5.9":"compliant"')
    );
  });

  // 16. Summary updates when overrides change
  it("updates summary card counts when a manual override changes status", () => {
    renderAuditLog();

    // Find the Manual Review summary card count
    const summaryGrid = screen.getByTestId
      ? document.querySelector("[data-tour='tour-audit-stats']")
      : screen.getByText("Total Requirements").closest("[data-tour]");

    const getManualReviewCount = () => {
      const mrLabel = within(summaryGrid).getAllByText("Manual Review")[0];
      const cardDiv = mrLabel.closest("[style*='cursor']") || mrLabel.closest("[style*='text-align']");
      const countDiv = cardDiv.querySelector("div");
      return parseInt(countDiv.textContent);
    };

    const initialCount = getManualReviewCount();
    expect(initialCount).toBe(2); // 5.9 and 5.19 are manual_review with defaultProps

    // Collapse B, expand A, override 5.9 to compliant
    clickSubpart("B");
    clickSubpart("A");

    const reqRow = screen.getByText(/§ 5\.9 — Part 135 Requirements/);
    fireEvent.click(reqRow);

    const overrideSection = screen.getByText("Override:").parentElement;
    const overrideCompliantBtn = within(overrideSection).getAllByRole("button").find(
      (btn) => btn.textContent === "Compliant"
    );
    fireEvent.click(overrideCompliantBtn);

    expect(getManualReviewCount()).toBe(1);
  });

  // 17. Data count badges for system-evidence requirements
  it("shows data count badges for system-evidence requirements", () => {
    renderAuditLog({
      frats: [{ timestamp: new Date().toISOString(), score: 10 }, { timestamp: new Date().toISOString(), score: 8 }],
      hazards: [{ status: "open", risk_score: 5 }, { status: "open", risk_score: 3 }],
    });

    // Expand Subpart C, then expand § 5.53(c) which shows hazard count
    clickSubpart("B"); // collapse B
    clickSubpart("C");

    const row = screen.getByText(/§ 5\.53\(c\) — Hazard Identification/);
    fireEvent.click(row);

    // Should show "2 Hazards" badge
    expect(screen.getByText("2 Hazards")).toBeInTheDocument();
  });

  // 18. SMS Manual or Policy Doc badge when satisfied by manual/policy
  it("shows Policy Doc badge when requirement is satisfied by uploaded policy", () => {
    renderAuditLog({
      policies: [{ id: "p1", title: "My Safety Policy", status: "active", acknowledged_by: ["u1"], part5_tags: ["safety_policy"] }],
      smsManuals: [],
    });

    // Subpart B is expanded. Requirements mapped to safety_policy
    // (e.g. 5.21a1) should show "Policy Doc" badge
    expect(screen.getAllByText("Policy Doc").length).toBeGreaterThan(0);
  });

  // 19. Handles empty data gracefully
  it("handles empty data without crashing", () => {
    const emptyProps = {
      frats: [],
      flights: [],
      reports: [],
      hazards: [],
      actions: [],
      policies: [],
      profiles: [],
      trainingRecords: [],
      org: {},
      smsManuals: [],
    };
    const { container } = render(<FaaAuditLog {...emptyProps} />);
    expect(container).toBeTruthy();
    expect(screen.getByText("FAA Part 5 Audit Log")).toBeInTheDocument();
    expect(screen.getByText("50")).toBeInTheDocument();
  });

  // 20. Filter by clicking summary cards
  it("filters requirements by clicking summary cards", () => {
    renderAuditLog();
    // Click the "Manual Review" summary card
    const summaryGrid = screen.getByText("Total Requirements").closest("[data-tour]");
    const manualReviewLabel = within(summaryGrid).getAllByText("Manual Review")[0];
    const cardEl = manualReviewLabel.closest("[style*='cursor']") || manualReviewLabel.parentElement.parentElement;
    fireEvent.click(cardEl);

    // After clicking, only manual_review items should appear in expanded subparts.
    // No "Compliant" requirement-level badges should be visible
    // (the Compliant filter button and summary card label are still present).
    const compliantEls = screen.queryAllByText("Compliant");
    compliantEls.forEach((el) => {
      const isButton = el.tagName === "BUTTON";
      const isInSummary = !!el.closest("[data-tour='tour-audit-stats']");
      const isInManualDocSection = !!el.closest("[style*='letter-spacing: 0.5px']");
      expect(isButton || isInSummary || isInManualDocSection).toBe(true);
    });
  });
});
