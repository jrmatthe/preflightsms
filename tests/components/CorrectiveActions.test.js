import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import CorrectiveActions from "../../components/CorrectiveActions";

/* ── Helpers ─────────────────────────────────────────────────────── */

const now = new Date();
const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);   // 7 days ago
const future = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);  // 7 days from now

const makeAction = (overrides = {}) => ({
  id: "a1",
  title: "Fix engine mount",
  description: "Replace cracked mount bracket",
  action_code: "CA-001",
  status: "open",
  priority: "medium",
  assigned_to_name: "Alice",
  due_date: future,
  created_at: now.toISOString(),
  hazard_id: null,
  report_id: null,
  ...overrides,
});

const sampleActions = [
  makeAction({ id: "a1", title: "Fix engine mount", status: "open", priority: "medium", created_at: "2025-06-01T00:00:00Z" }),
  makeAction({ id: "a2", title: "Update checklist", status: "in_progress", priority: "high", action_code: "CA-002", created_at: "2025-06-02T00:00:00Z" }),
  makeAction({ id: "a3", title: "Replace extinguisher", status: "completed", priority: "low", action_code: "CA-003", created_at: "2025-06-03T00:00:00Z" }),
  makeAction({ id: "a4", title: "Inspect fuel line", status: "open", priority: "critical", action_code: "CA-004", due_date: past, created_at: "2025-06-04T00:00:00Z" }),
  makeAction({ id: "a5", title: "Calibrate altimeter", status: "cancelled", priority: "low", action_code: "CA-005", created_at: "2025-06-05T00:00:00Z" }),
];

const orgProfiles = [
  { id: "u1", full_name: "Alice Smith" },
  { id: "u2", full_name: "Bob Jones" },
];

function renderCA(props = {}) {
  const onCreateAction = props.onCreateAction ?? vi.fn();
  const onUpdateAction = props.onUpdateAction ?? vi.fn();
  const onClearFromInvestigation = props.onClearFromInvestigation ?? vi.fn();

  const utils = render(
    <CorrectiveActions
      actions={props.actions ?? sampleActions}
      onCreateAction={onCreateAction}
      onUpdateAction={onUpdateAction}
      fromInvestigation={props.fromInvestigation ?? null}
      hazards={props.hazards ?? []}
      onClearFromInvestigation={onClearFromInvestigation}
      orgProfiles={props.orgProfiles ?? orgProfiles}
    />
  );

  return { ...utils, onCreateAction, onUpdateAction, onClearFromInvestigation };
}

/* ── Tests ───────────────────────────────────────────────────────── */

describe("CorrectiveActions", () => {
  // 1. Renders list view with header and button
  it("renders list view with 'Corrective Actions' heading and '+ New Action' button", () => {
    renderCA();
    expect(screen.getByText("Corrective Actions")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /\+ New Action/i })).toBeInTheDocument();
  });

  // 2. Shows empty state when no actions match
  it("shows empty state when no actions are provided", () => {
    renderCA({ actions: [] });
    expect(screen.getByText("No corrective actions")).toBeInTheDocument();
  });

  // 3. Renders action cards with title, priority badge, status badge
  it("renders action cards with title, priority badge, and status badge", () => {
    // Use a single open action with future due date so it does NOT become overdue
    const actions = [makeAction({ id: "a1", title: "Fix engine mount", status: "open", priority: "medium" })];
    renderCA({ actions });
    expect(screen.getByText("Fix engine mount")).toBeInTheDocument();
    // "Medium" only appears as a badge (priority select is not rendered in list view)
    expect(screen.getByText("Medium")).toBeInTheDocument();
    // "Open" appears in stats grid label, filter tab, and action badge — just verify at least one badge span
    const openElements = screen.getAllByText("Open");
    const openBadge = openElements.find(el => el.tagName === "SPAN");
    expect(openBadge).toBeTruthy();
  });

  // 4. Shows stats grid with correct counts
  it("shows stats grid with correct counts for open, in_progress, overdue, completed", () => {
    // sampleActions: 1 open (future due), 1 in_progress, 1 completed, 1 open+past due -> overdue, 1 cancelled
    renderCA();
    const statGrid = document.querySelector("[data-tour='tour-actions-stats']");
    const statCards = statGrid.children;
    // Order: Open, In Progress, Overdue, Completed — each card has a value div then a label div
    expect(statCards[0].querySelector("div").textContent).toBe("1");  // Open
    expect(statCards[1].querySelector("div").textContent).toBe("1");  // In Progress
    expect(statCards[2].querySelector("div").textContent).toBe("1");  // Overdue
    expect(statCards[3].querySelector("div").textContent).toBe("1");  // Completed
  });

  // 5. Overdue detection: open action with past due_date shows as overdue
  it("marks open actions with past due_date as overdue", () => {
    const overdueAction = makeAction({ id: "a1", title: "Overdue task", status: "open", due_date: past });
    // Default filter is "open" — switch to "all" to find overdue items
    renderCA({ actions: [overdueAction] });
    // The action should have been re-classified as overdue, so it won't show under the default "open" filter
    fireEvent.click(screen.getByText(/^All/));
    expect(screen.getByText("Overdue task")).toBeInTheDocument();
    // "Overdue" text appears in stats label, filter tab, and badge — verify badge span exists
    const overdueElements = screen.getAllByText("Overdue");
    const overdueBadge = overdueElements.find(el => el.tagName === "SPAN");
    expect(overdueBadge).toBeTruthy();
  });

  // 6. Filter tabs work
  it("filter tabs show only matching actions", () => {
    renderCA();
    // Default filter is "open" — should show a1 (open) but not a3 (completed)
    expect(screen.getByText("Fix engine mount")).toBeInTheDocument();
    expect(screen.queryByText("Replace extinguisher")).not.toBeInTheDocument();

    // Click "Completed" filter tab button — it has text like "Completed (1)"
    const completedBtn = screen.getByRole("button", { name: /Completed \(/ });
    fireEvent.click(completedBtn);
    expect(screen.getByText("Replace extinguisher")).toBeInTheDocument();
    expect(screen.queryByText("Fix engine mount")).not.toBeInTheDocument();
  });

  // 7. Search filters actions by title
  it("search filters actions by title", () => {
    renderCA();
    // Switch to "all" so all actions are visible
    fireEvent.click(screen.getByText(/All/));
    const searchInput = screen.getByPlaceholderText("Search actions...");
    fireEvent.change(searchInput, { target: { value: "checklist" } });
    expect(screen.getByText("Update checklist")).toBeInTheDocument();
    expect(screen.queryByText("Fix engine mount")).not.toBeInTheDocument();
  });

  // 8. Sort options: newest, oldest, due_date, priority
  it("sorts actions by priority (highest first)", () => {
    renderCA();
    // Switch to all so we see everything
    fireEvent.click(screen.getByText(/All/));
    // Change sort to priority
    const sortSelect = screen.getByDisplayValue("Newest first");
    fireEvent.change(sortSelect, { target: { value: "priority" } });
    // Critical (a4) should appear before Medium (a1) — check order in DOM
    const titles = screen.getAllByText(/Fix engine mount|Update checklist|Replace extinguisher|Inspect fuel line|Calibrate altimeter/);
    const titleTexts = titles.map(el => el.textContent);
    const criticalIdx = titleTexts.indexOf("Inspect fuel line");
    const mediumIdx = titleTexts.indexOf("Fix engine mount");
    expect(criticalIdx).toBeLessThan(mediumIdx);
  });

  // 9. "+ New Action" button switches to form view
  it("'+ New Action' button switches to form view", () => {
    renderCA();
    fireEvent.click(screen.getByRole("button", { name: /\+ New Action/i }));
    expect(screen.getByText("New Corrective Action")).toBeInTheDocument();
    // List header should no longer be visible
    expect(screen.queryByText("Corrective Actions")).not.toBeInTheDocument();
  });

  // 10. ActionForm renders with title input, description textarea, priority select
  it("ActionForm renders with title input, description textarea, and priority select", () => {
    renderCA();
    fireEvent.click(screen.getByRole("button", { name: /\+ New Action/i }));
    expect(screen.getByPlaceholderText("What needs to be done?")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Additional context, steps, acceptance criteria")).toBeInTheDocument();
    expect(screen.getByText("Action Required *")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Medium")).toBeInTheDocument();
  });

  // 11. ActionForm: submit disabled when title is empty
  it("ActionForm submit button is disabled when title is empty", () => {
    renderCA();
    fireEvent.click(screen.getByRole("button", { name: /\+ New Action/i }));
    const createBtn = screen.getByRole("button", { name: /Create Action/i });
    expect(createBtn).toBeDisabled();
  });

  // 12. ActionForm: submit calls onCreateAction with correct data
  it("ActionForm submit calls onCreateAction with correct data including generated actionCode", () => {
    const { onCreateAction } = renderCA();
    fireEvent.click(screen.getByRole("button", { name: /\+ New Action/i }));

    // Fill out the title
    const titleInput = screen.getByPlaceholderText("What needs to be done?");
    fireEvent.change(titleInput, { target: { value: "New safety action" } });

    // Submit
    fireEvent.click(screen.getByRole("button", { name: /Create Action/i }));

    expect(onCreateAction).toHaveBeenCalledTimes(1);
    const arg = onCreateAction.mock.calls[0][0];
    expect(arg.title).toBe("New safety action");
    expect(arg.priority).toBe("medium");
    // sampleActions has 5 items, so actionCode should be CA-006
    expect(arg.actionCode).toBe("CA-006");
  });

  // 13. ActionForm: cancel button returns to list
  it("ActionForm cancel button returns to list view", () => {
    const { onClearFromInvestigation } = renderCA();
    fireEvent.click(screen.getByRole("button", { name: /\+ New Action/i }));
    expect(screen.getByText("New Corrective Action")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));
    expect(screen.getByText("Corrective Actions")).toBeInTheDocument();
  });

  // 14. ActionForm: fromInvestigation populates title and description
  it("ActionForm populates title and description from investigation", () => {
    const investigation = {
      id: "h1",
      title: "Bird strike incident",
      hazard_code: "HZ-001",
      description: "Bird strike on approach",
      related_report_id: null,
    };
    renderCA({ fromInvestigation: investigation });
    // Should auto-open form view
    expect(screen.getByText("New Corrective Action")).toBeInTheDocument();
    // Title field should be pre-populated
    const titleInput = screen.getByPlaceholderText("What needs to be done?");
    expect(titleInput.value).toBe("Action for: Bird strike incident");
    // Description field should be pre-populated
    const descTextarea = screen.getByPlaceholderText("Additional context, steps, acceptance criteria");
    expect(descTextarea.value).toContain("Source investigation: HZ-001");
    expect(descTextarea.value).toContain("Bird strike on approach");
    // Banner should be visible
    expect(screen.getByText(/From investigation HZ-001/)).toBeInTheDocument();
  });

  // 15. ActionCard: clicking expands to show status update buttons
  it("ActionCard expands on click to show status update buttons", () => {
    renderCA();
    // a1 is open — visible on default "open" filter
    const actionTitle = screen.getByText("Fix engine mount");
    fireEvent.click(actionTitle);
    // "Update Status" label should now be visible
    expect(screen.getByText("Update Status")).toBeInTheDocument();
  });

  // 16. ActionCard: status buttons visible (excluding overdue)
  it("ActionCard shows status buttons excluding Overdue when expanded", () => {
    renderCA();
    fireEvent.click(screen.getByText("Fix engine mount"));
    // Should have Open, In Progress, Completed, Cancelled buttons — but NOT Overdue
    const buttons = screen.getAllByRole("button");
    const buttonTexts = buttons.map(b => b.textContent);
    expect(buttonTexts).toContain("Open");
    expect(buttonTexts).toContain("In Progress");
    expect(buttonTexts).toContain("Completed");
    expect(buttonTexts).toContain("Cancelled");
    // Overdue appears in the filter tabs but NOT in status update buttons
    // Count occurrences to make sure there is no Overdue button among status-update buttons
    const updateSection = screen.getByText("Update Status").parentElement;
    const updateButtons = updateSection.querySelectorAll("button");
    const updateLabels = Array.from(updateButtons).map(b => b.textContent);
    expect(updateLabels).not.toContain("Overdue");
  });

  // 17. Shows "Show 25 more" when more than 25 items
  it("shows 'Show 25 more' pagination when more than 25 items", () => {
    const manyActions = Array.from({ length: 30 }, (_, i) =>
      makeAction({ id: `a${i}`, title: `Action ${i}`, action_code: `CA-${String(i).padStart(3, "0")}`, status: "open" })
    );
    renderCA({ actions: manyActions });
    expect(screen.getByText(/Show 25 more/)).toBeInTheDocument();
    expect(screen.getByText(/Showing 25 of 30/)).toBeInTheDocument();
  });

  // 18. Auto-switches to new form when fromInvestigation changes
  it("auto-switches to new form view when fromInvestigation changes", () => {
    const investigation1 = { id: "h1", title: "First", hazard_code: "HZ-001", description: "", related_report_id: null };
    const investigation2 = { id: "h2", title: "Second", hazard_code: "HZ-002", description: "", related_report_id: null };

    const { rerender, onCreateAction, onUpdateAction, onClearFromInvestigation } = renderCA({ fromInvestigation: investigation1 });
    // First render puts us in "new" view
    expect(screen.getByText("New Corrective Action")).toBeInTheDocument();

    // Cancel back to list view
    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));
    expect(screen.getByText("Corrective Actions")).toBeInTheDocument();

    // Re-render with a different investigation — should auto-switch back to form
    rerender(
      <CorrectiveActions
        actions={sampleActions}
        onCreateAction={onCreateAction}
        onUpdateAction={onUpdateAction}
        fromInvestigation={investigation2}
        hazards={[]}
        onClearFromInvestigation={onClearFromInvestigation}
        orgProfiles={orgProfiles}
      />
    );

    expect(screen.getByText("New Corrective Action")).toBeInTheDocument();
    expect(screen.getByText(/From investigation HZ-002/)).toBeInTheDocument();
  });

  // 19. ActionCard status button calls onUpdateAction
  it("clicking a status button on an expanded ActionCard calls onUpdateAction", () => {
    const { onUpdateAction } = renderCA();
    // Expand the first open action
    fireEvent.click(screen.getByText("Fix engine mount"));
    // Click "In Progress" status button
    const updateSection = screen.getByText("Update Status").parentElement;
    const inProgressBtn = Array.from(updateSection.querySelectorAll("button")).find(b => b.textContent === "In Progress");
    fireEvent.click(inProgressBtn);
    expect(onUpdateAction).toHaveBeenCalledWith("a1", { status: "in_progress" });
  });

  // 20. ActionForm confirm dialog fires for linked reports
  it("ActionForm shows confirm dialog when submitting with a linked report", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const investigation = {
      id: "h1",
      title: "Linked incident",
      hazard_code: "HZ-010",
      description: "Desc",
      related_report_id: "r1",
    };
    const { onCreateAction } = renderCA({ fromInvestigation: investigation });
    // Form is auto-opened, title is pre-filled, so submit button should be enabled
    fireEvent.click(screen.getByRole("button", { name: /Create Action/i }));
    expect(confirmSpy).toHaveBeenCalledWith("This will update the linked report and notify the report submitter. Continue?");
    expect(onCreateAction).toHaveBeenCalledTimes(1);
    confirmSpy.mockRestore();
  });
});
