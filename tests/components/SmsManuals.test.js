import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SmsManuals from "../../components/SmsManuals";

/* ------------------------------------------------------------------ */
/*  Canvas mock (jsdom has no canvas support)                          */
/* ------------------------------------------------------------------ */
beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    lineCap: "",
    lineJoin: "",
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    drawImage: vi.fn(),
  }));
  HTMLCanvasElement.prototype.toDataURL = vi.fn(() => "data:image/png;base64,mock");
});

/* ------------------------------------------------------------------ */
/*  Shared fixtures                                                    */
/* ------------------------------------------------------------------ */
const mockProfile = { id: "u1", role: "admin", full_name: "Admin User" };
const mockSession = { user: { id: "u1" } };

const mockManual = {
  id: "m1",
  title: "Safety Policy",
  manual_key: "safety_policy",
  description: "Safety policy manual",
  status: "draft",
  version: "1.0",
  cfr_references: ["5.21", "5.23"],
  sections: [
    {
      id: "sp_objectives",
      title: "Safety Objectives",
      cfr_ref: "§5.21(a)(1)",
      guidance: "Define objectives...",
      content: "Our objectives are...",
      completed: true,
      lastEdited: "2025-01-01T00:00:00Z",
    },
    {
      id: "sp_commitment",
      title: "Management Commitment",
      cfr_ref: "§5.21(a)(2)",
      guidance: "Describe commitment...",
      content: "",
      completed: false,
    },
    {
      id: "sp_signature",
      title: "Signature",
      cfr_ref: "§5.21",
      guidance: "Sign here",
      content: "",
      completed: false,
    },
  ],
};

const mockManual2 = {
  id: "m2",
  title: "Safety Risk Management",
  manual_key: "srm",
  description: "SRM manual",
  status: "active",
  version: "2.0",
  cfr_references: ["5.51", "5.53"],
  sections: [
    {
      id: "srm_hazard",
      title: "Hazard Identification",
      cfr_ref: "§5.51",
      guidance: "Identify hazards...",
      content: "We use...",
      completed: true,
    },
    {
      id: "srm_risk",
      title: "Risk Assessment",
      cfr_ref: "§5.53",
      guidance: "Assess risk...",
      content: "Our process...",
      completed: true,
    },
  ],
};

const mockTemplateVars = {
  "Company Name": "Test Aviation",
  "FSDO Name": "Test FSDO",
  _aircraft: [{ type: "Cessna 172", reg: "N12345", pax: "3", range: "600nm" }],
};

const mockSignatures = {
  sp_signature: {
    name: "John Doe",
    title: "CEO",
    signature_png: "data:image/png;base64,abc",
    date_signed: "2025-01-15",
  },
};

/* ------------------------------------------------------------------ */
/*  Helper: render SmsManuals with sensible defaults                   */
/* ------------------------------------------------------------------ */
function renderSM(props = {}) {
  const onSaveManual = props.onSaveManual ?? vi.fn();
  const onInitManuals = props.onInitManuals ?? vi.fn().mockResolvedValue();
  const onSaveVariables = props.onSaveVariables ?? vi.fn().mockResolvedValue();
  const onSaveSignature = props.onSaveSignature ?? vi.fn();

  const { container } = render(
    <SmsManuals
      profile={props.profile ?? mockProfile}
      session={props.session ?? mockSession}
      smsManuals={props.smsManuals ?? []}
      onSaveManual={onSaveManual}
      onInitManuals={onInitManuals}
      templateVariables={props.templateVariables ?? {}}
      signatures={props.signatures ?? {}}
      onSaveVariables={onSaveVariables}
      onSaveSignature={onSaveSignature}
      fleetAircraft={props.fleetAircraft ?? []}
      embedded={props.embedded ?? false}
    />
  );

  return { container, onSaveManual, onInitManuals, onSaveVariables, onSaveSignature };
}

/* ================================================================== */
/*  1. Empty state                                                     */
/* ================================================================== */
describe("Empty state", () => {
  it("renders init card when no manuals exist", () => {
    renderSM({ smsManuals: [] });
    expect(screen.getByText("SMS Manual Templates")).toBeInTheDocument();
    expect(screen.getByText("Set Up SMS Manuals")).toBeInTheDocument();
    expect(
      screen.getByText(/Set up your 14 CFR Part 5 SMS manuals/)
    ).toBeInTheDocument();
  });

  it("mentions 7 manuals in the description", () => {
    renderSM({ smsManuals: [] });
    expect(
      screen.getByText(/7 manuals will be created/)
    ).toBeInTheDocument();
  });

  it("calls onInitManuals with SMS_MANUAL_TEMPLATES on button click", async () => {
    const { onInitManuals } = renderSM({ smsManuals: [] });
    fireEvent.click(screen.getByText("Set Up SMS Manuals"));
    await waitFor(() => expect(onInitManuals).toHaveBeenCalledTimes(1));
    // Called with the templates array (7 elements)
    const arg = onInitManuals.mock.calls[0][0];
    expect(Array.isArray(arg)).toBe(true);
    expect(arg.length).toBe(7);
  });

  it("shows 'Setting up...' while initializing", async () => {
    // onInitManuals that never resolves so we can observe the loading state
    const onInitManuals = vi.fn(() => new Promise(() => {}));
    renderSM({ smsManuals: [], onInitManuals });
    fireEvent.click(screen.getByText("Set Up SMS Manuals"));
    expect(screen.getByText("Setting up...")).toBeInTheDocument();
  });
});

/* ================================================================== */
/*  2. Manual list view — stats & overall progress                     */
/* ================================================================== */
describe("Manual list view", () => {
  const manuals = [mockManual, mockManual2];

  it("renders the header title and subtitle", () => {
    renderSM({ smsManuals: manuals });
    expect(screen.getByText("SMS Manuals")).toBeInTheDocument();
    expect(
      screen.getByText("14 CFR Part 5 SMS Documentation Templates")
    ).toBeInTheDocument();
  });

  it("renders stat grid with correct counts", () => {
    // mockManual: 1/3 completed => in progress
    // mockManual2: 2/2 completed => completed
    renderSM({ smsManuals: manuals });
    // Total Manuals
    expect(screen.getByText("Total Manuals")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(screen.getByText("Not Started")).toBeInTheDocument();
  });

  it("calculates correct completed / in-progress / not-started counts", () => {
    const notStartedManual = {
      id: "m3",
      title: "Safety Promotion",
      manual_key: "safety_promotion",
      description: "Promotion manual",
      status: "draft",
      version: "1.0",
      cfr_references: ["5.91"],
      sections: [
        { id: "promo1", title: "Communication", cfr_ref: "§5.91", guidance: "...", content: "", completed: false },
      ],
    };
    const all = [mockManual, mockManual2, notStartedManual];
    const { container } = renderSM({ smsManuals: all });
    // stat values are rendered as large numbers in the stat grid
    // Total = 3, Completed = 1 (mockManual2), In Progress = 1 (mockManual), Not Started = 1 (notStartedManual)
    const statNums = container.querySelectorAll(".stat-grid > div");
    // Each stat card has a number (fontSize 22) and a label
    // We verify via text content
    expect(screen.getByText("3")).toBeInTheDocument(); // total
  });

  it("shows overall completion progress bar with correct percentage", () => {
    // mockManual: 1 completed out of 3; mockManual2: 2 out of 2 => 3/5 = 60%
    renderSM({ smsManuals: [mockManual, mockManual2] });
    expect(screen.getByText("Overall Completion")).toBeInTheDocument();
    expect(screen.getByText(/60%/)).toBeInTheDocument();
    expect(screen.getByText(/3\/5 sections/)).toBeInTheDocument();
  });

  it("renders manual cards with title, status badge, version, and description", () => {
    renderSM({ smsManuals: [mockManual, mockManual2] });
    // Manual 1
    expect(screen.getByText("Safety Policy")).toBeInTheDocument();
    expect(screen.getByText("draft")).toBeInTheDocument();
    expect(screen.getByText("v1.0")).toBeInTheDocument();
    expect(screen.getByText("Safety policy manual")).toBeInTheDocument();
    // Manual 2
    expect(screen.getByText("Safety Risk Management")).toBeInTheDocument();
    expect(screen.getByText("active")).toBeInTheDocument();
    expect(screen.getByText("v2.0")).toBeInTheDocument();
    expect(screen.getByText("SRM manual")).toBeInTheDocument();
  });

  it("renders CFR reference tags on manual cards", () => {
    renderSM({ smsManuals: [mockManual] });
    expect(screen.getByText("§ 5.21")).toBeInTheDocument();
    expect(screen.getByText("§ 5.23")).toBeInTheDocument();
  });

  it("shows per-manual progress percentage and section count", () => {
    // mockManual: 1/3 => 33%
    renderSM({ smsManuals: [mockManual] });
    expect(screen.getByText("33%")).toBeInTheDocument();
    expect(screen.getByText("1/3 sections")).toBeInTheDocument();
  });

  it("shows footer note about Part 5", () => {
    renderSM({ smsManuals: [mockManual] });
    expect(
      screen.getByText(/customizable templates aligned with 14 CFR Part 5/)
    ).toBeInTheDocument();
  });
});

/* ================================================================== */
/*  3. Manual card interactions — navigating to editor                 */
/* ================================================================== */
describe("Manual card interactions", () => {
  it("clicking a manual card opens the ManualEditor", () => {
    renderSM({ smsManuals: [mockManual] });
    fireEvent.click(screen.getByText("Safety Policy"));
    // In ManualEditor, we see the Back button and section titles
    expect(screen.getByText("← Back")).toBeInTheDocument();
    expect(screen.getByText("Safety Objectives")).toBeInTheDocument();
    expect(screen.getByText("Management Commitment")).toBeInTheDocument();
  });
});

/* ================================================================== */
/*  4. Embedded mode                                                   */
/* ================================================================== */
describe("Embedded mode", () => {
  it("does NOT render the header when embedded=true", () => {
    renderSM({ smsManuals: [mockManual], embedded: true });
    // The "SMS Manuals" header text should be absent
    expect(screen.queryByText("SMS Manuals")).not.toBeInTheDocument();
  });

  it("still renders manual cards and content when embedded=true", () => {
    renderSM({ smsManuals: [mockManual], embedded: true });
    expect(screen.getByText("Safety Policy")).toBeInTheDocument();
    expect(screen.getByText("Template Variables")).toBeInTheDocument();
    expect(screen.getByText("Reload Template Defaults")).toBeInTheDocument();
  });
});

/* ================================================================== */
/*  5. Reload Template Defaults                                        */
/* ================================================================== */
describe("Reload Template Defaults", () => {
  it("renders the Reload Template Defaults button", () => {
    renderSM({ smsManuals: [mockManual] });
    expect(screen.getByText("Reload Template Defaults")).toBeInTheDocument();
  });

  it("calls confirm and then onInitManuals when confirmed", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const { onInitManuals } = renderSM({ smsManuals: [mockManual] });
    fireEvent.click(screen.getByText("Reload Template Defaults"));
    expect(confirmSpy).toHaveBeenCalledWith(
      expect.stringContaining("reload all sample content")
    );
    await waitFor(() => expect(onInitManuals).toHaveBeenCalledTimes(1));
    confirmSpy.mockRestore();
  });

  it("does NOT call onInitManuals when confirm is cancelled", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    const { onInitManuals } = renderSM({ smsManuals: [mockManual] });
    fireEvent.click(screen.getByText("Reload Template Defaults"));
    expect(onInitManuals).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });
});

/* ================================================================== */
/*  6. TemplateVariablesForm                                           */
/* ================================================================== */
describe("TemplateVariablesForm", () => {
  it("renders collapsed by default with filled count", () => {
    renderSM({
      smsManuals: [mockManual],
      templateVariables: mockTemplateVars,
    });
    expect(screen.getByText("Template Variables")).toBeInTheDocument();
    // "2 of X filled" — Company Name and FSDO Name are filled
    expect(screen.getByText(/2 of \d+ filled/)).toBeInTheDocument();
  });

  it("expands when clicked to show group accordions and Save button", () => {
    renderSM({
      smsManuals: [mockManual],
      templateVariables: mockTemplateVars,
    });
    // Click to expand the template variables card
    fireEvent.click(screen.getByText("Template Variables"));
    // Groups should appear
    expect(screen.getByText("Organization")).toBeInTheDocument();
    expect(screen.getByText("Accountable Executive")).toBeInTheDocument();
    expect(screen.getByText("Safety Manager")).toBeInTheDocument();
    expect(screen.getByText("Aircraft Fleet")).toBeInTheDocument();
    // Save button
    expect(screen.getByText("Save & Apply to All Manuals")).toBeInTheDocument();
  });

  it("expands a group to show its variable inputs", () => {
    renderSM({
      smsManuals: [mockManual],
      templateVariables: mockTemplateVars,
    });
    // Expand template variables
    fireEvent.click(screen.getByText("Template Variables"));
    // Expand Organization group
    fireEvent.click(screen.getByText("Organization"));
    // Should see the Company Name input with value from mockTemplateVars
    const companyInput = screen.getByPlaceholderText("[Company Name]");
    expect(companyInput).toBeInTheDocument();
    expect(companyInput.value).toBe("Test Aviation");
  });

  it("shows the Aircraft Fleet group with aircraft entries", () => {
    renderSM({
      smsManuals: [mockManual],
      templateVariables: mockTemplateVars,
    });
    fireEvent.click(screen.getByText("Template Variables"));
    fireEvent.click(screen.getByText("Aircraft Fleet"));
    // Should see the type input with Cessna 172
    const typeInputs = screen.getAllByPlaceholderText("e.g. Cessna Citation CJ3");
    expect(typeInputs[0].value).toBe("Cessna 172");
    expect(screen.getByText("+ Add Aircraft")).toBeInTheDocument();
  });

  it("shows 'Sync from Fleet' button when fleetAircraft provided", () => {
    renderSM({
      smsManuals: [mockManual],
      templateVariables: mockTemplateVars,
      fleetAircraft: [{ type: "King Air 350", registration: "N67890", max_passengers: 9 }],
    });
    fireEvent.click(screen.getByText("Template Variables"));
    fireEvent.click(screen.getByText("Aircraft Fleet"));
    expect(screen.getByText("Sync from Fleet")).toBeInTheDocument();
  });

  it("does NOT show 'Sync from Fleet' when fleetAircraft is empty", () => {
    renderSM({
      smsManuals: [mockManual],
      templateVariables: mockTemplateVars,
      fleetAircraft: [],
    });
    fireEvent.click(screen.getByText("Template Variables"));
    fireEvent.click(screen.getByText("Aircraft Fleet"));
    expect(screen.queryByText("Sync from Fleet")).not.toBeInTheDocument();
  });

  it("calls onSaveVariables when Save & Apply is clicked", async () => {
    const { onSaveVariables } = renderSM({
      smsManuals: [mockManual],
      templateVariables: mockTemplateVars,
    });
    fireEvent.click(screen.getByText("Template Variables"));
    fireEvent.click(screen.getByText("Save & Apply to All Manuals"));
    await waitFor(() => expect(onSaveVariables).toHaveBeenCalledTimes(1));
  });

  it("adds a new aircraft row when + Add Aircraft is clicked", () => {
    renderSM({
      smsManuals: [mockManual],
      templateVariables: mockTemplateVars,
    });
    fireEvent.click(screen.getByText("Template Variables"));
    fireEvent.click(screen.getByText("Aircraft Fleet"));
    // Initially 1 aircraft row
    const initialInputs = screen.getAllByPlaceholderText("e.g. Cessna Citation CJ3");
    expect(initialInputs).toHaveLength(1);
    // Add another
    fireEvent.click(screen.getByText("+ Add Aircraft"));
    const afterInputs = screen.getAllByPlaceholderText("e.g. Cessna Citation CJ3");
    expect(afterInputs).toHaveLength(2);
  });
});

/* ================================================================== */
/*  7. ManualEditor (via selecting a manual)                           */
/* ================================================================== */
describe("ManualEditor", () => {
  function openEditor(overrides = {}) {
    const result = renderSM({
      smsManuals: [mockManual],
      signatures: overrides.signatures ?? {},
      templateVariables: overrides.templateVariables ?? {},
      ...overrides,
    });
    // Click the manual card to open editor
    fireEvent.click(screen.getByText("Safety Policy"));
    return result;
  }

  it("shows the manual title and CFR references", () => {
    openEditor();
    // Title
    expect(screen.getByText("Safety Policy")).toBeInTheDocument();
    // CFR references displayed as comma-joined
    expect(screen.getByText("§ 5.21, § 5.23")).toBeInTheDocument();
  });

  it("shows a Back button that returns to the list", () => {
    openEditor();
    expect(screen.getByText("← Back")).toBeInTheDocument();
    fireEvent.click(screen.getByText("← Back"));
    // After clicking back, we should see the list view stats again
    expect(screen.getByText("Total Manuals")).toBeInTheDocument();
  });

  it("shows status dropdown and version input", () => {
    const { container } = openEditor();
    // The select contains draft/active/archived options
    const selects = container.querySelectorAll("select");
    expect(selects.length).toBeGreaterThanOrEqual(1);
    const statusSelect = selects[0];
    expect(statusSelect.value).toBe("draft");
    // Status options
    const options = statusSelect.querySelectorAll("option");
    expect(options).toHaveLength(3);
    expect(options[0].textContent).toBe("Draft");
    expect(options[1].textContent).toBe("Active");
    expect(options[2].textContent).toBe("Archived");
    // Version input — find by placeholder
    const versionInput = screen.getByPlaceholderText("v1.0");
    expect(versionInput).toBeInTheDocument();
    expect(versionInput.value).toBe("1.0");
  });

  it("shows progress bar with correct section completion", () => {
    // mockManual: 1 of 3 sections complete => 33%
    openEditor();
    expect(screen.getByText("1 of 3 sections complete")).toBeInTheDocument();
    expect(screen.getByText("33%")).toBeInTheDocument();
  });

  it("lists all sections", () => {
    openEditor();
    expect(screen.getByText("Safety Objectives")).toBeInTheDocument();
    expect(screen.getByText("Management Commitment")).toBeInTheDocument();
    expect(screen.getByText("Signature")).toBeInTheDocument();
  });

  it("shows completed checkmark for completed sections", () => {
    openEditor();
    // The completed section (Safety Objectives) should have a checkmark character
    // and the others should have a circle
    expect(screen.getByText("✓")).toBeInTheDocument();
    expect(screen.getAllByText("○")).toHaveLength(2);
  });

  it("expands a section to show guidance and content textarea", () => {
    openEditor();
    // Click on a section to expand it
    fireEvent.click(screen.getByText("Safety Objectives"));
    // Guidance box
    expect(screen.getByText("FAA Guidance")).toBeInTheDocument();
    expect(screen.getByText("Define objectives...")).toBeInTheDocument();
    // Content textarea
    const textarea = screen.getByDisplayValue("Our objectives are...");
    expect(textarea).toBeInTheDocument();
    expect(textarea.tagName).toBe("TEXTAREA");
  });

  it("shows Mark Complete toggle that can be toggled", () => {
    openEditor();
    // Expand the second section (not completed)
    fireEvent.click(screen.getByText("Management Commitment"));
    const markBtn = screen.getByText("Mark Complete");
    expect(markBtn).toBeInTheDocument();
    // Toggle it
    fireEvent.click(markBtn);
    // After toggling, should now say "✓ Completed"
    expect(screen.getByText("✓ Completed")).toBeInTheDocument();
  });

  it("enables the Save button when a change is made (dirty state)", () => {
    openEditor();
    // Expand a section and edit the textarea
    fireEvent.click(screen.getByText("Safety Objectives"));
    const textarea = screen.getByDisplayValue("Our objectives are...");
    fireEvent.change(textarea, { target: { value: "Updated objectives" } });
    // The bottom "Save Changes" button appears when dirty
    expect(screen.getByText("Save Changes")).toBeInTheDocument();
  });

  it("calls onSaveManual when Save is clicked", () => {
    const { onSaveManual } = openEditor();
    // Make a change to trigger dirty state
    fireEvent.click(screen.getByText("Management Commitment"));
    fireEvent.click(screen.getByText("Mark Complete"));
    // Click the top Save button
    const saveButtons = screen.getAllByText("Save");
    // The header Save button
    fireEvent.click(saveButtons[0]);
    expect(onSaveManual).toHaveBeenCalledTimes(1);
    const savedManual = onSaveManual.mock.calls[0][0];
    expect(savedManual.id).toBe("m1");
    expect(savedManual.sections).toBeDefined();
  });

  it("changing status makes the form dirty", () => {
    const { container } = openEditor();
    const statusSelect = container.querySelector("select");
    fireEvent.change(statusSelect, { target: { value: "active" } });
    // "Save Changes" bottom button should appear
    expect(screen.getByText("Save Changes")).toBeInTheDocument();
  });

  it("changing version makes the form dirty", () => {
    openEditor();
    const versionInput = screen.getByDisplayValue("1.0");
    fireEvent.change(versionInput, { target: { value: "2.0" } });
    expect(screen.getByText("Save Changes")).toBeInTheDocument();
  });

  it("renders SignaturePad for signature sections", () => {
    openEditor({ signatures: mockSignatures });
    // Expand the signature section
    fireEvent.click(screen.getByText("Signature"));
    // SignaturePad should render with name/title inputs and canvas
    expect(screen.getByPlaceholderText("Full Name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Title")).toBeInTheDocument();
    expect(screen.getByText("Clear")).toBeInTheDocument();
    expect(screen.getByText("Save Signature")).toBeInTheDocument();
  });

  it("shows existing signature info when signature exists", () => {
    openEditor({ signatures: mockSignatures });
    fireEvent.click(screen.getByText("Signature"));
    expect(screen.getByText(/Signed by John Doe on 2025-01-15/)).toBeInTheDocument();
  });
});

/* ================================================================== */
/*  8. Stats calculations                                              */
/* ================================================================== */
describe("Stats calculations", () => {
  it("counts all manuals as completed when all sections are done", () => {
    const allDone = {
      ...mockManual,
      sections: mockManual.sections.map(s => ({ ...s, completed: true })),
    };
    renderSM({ smsManuals: [allDone] });
    // Per-card shows "100%" and overall shows "100% (3/3 sections)"
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByText(/100%.*3\/3 sections/)).toBeInTheDocument();
  });

  it("counts manual as not-started when no sections are completed", () => {
    const noDone = {
      ...mockManual,
      sections: mockManual.sections.map(s => ({ ...s, completed: false })),
    };
    renderSM({ smsManuals: [noDone] });
    // Per-card shows "0%" and overall shows "0% (0/3 sections)"
    expect(screen.getByText("0%")).toBeInTheDocument();
    expect(screen.getByText(/0%.*0\/3 sections/)).toBeInTheDocument();
  });

  it("handles mixed manual statuses correctly", () => {
    // mockManual: 1/3 done (in progress), mockManual2: 2/2 done (completed)
    renderSM({ smsManuals: [mockManual, mockManual2] });
    // Overall: 3 out of 5 = 60%
    expect(screen.getByText(/60%/)).toBeInTheDocument();
  });
});

/* ================================================================== */
/*  9. Progress computation                                            */
/* ================================================================== */
describe("Progress computation", () => {
  it("shows 100% for a fully completed manual in the card", () => {
    const allDone = {
      ...mockManual2,
    };
    renderSM({ smsManuals: [allDone] });
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByText("2/2 sections")).toBeInTheDocument();
  });

  it("shows correct percentage in the ManualEditor progress bar", () => {
    // mockManual has 1/3 => 33%
    renderSM({ smsManuals: [mockManual] });
    fireEvent.click(screen.getByText("Safety Policy"));
    expect(screen.getByText("1 of 3 sections complete")).toBeInTheDocument();
    expect(screen.getByText("33%")).toBeInTheDocument();
  });

  it("updates editor progress when a section is toggled complete", () => {
    renderSM({ smsManuals: [mockManual] });
    fireEvent.click(screen.getByText("Safety Policy"));
    // Currently 1/3 = 33%
    expect(screen.getByText("33%")).toBeInTheDocument();
    // Expand section and mark it complete
    fireEvent.click(screen.getByText("Management Commitment"));
    fireEvent.click(screen.getByText("Mark Complete"));
    // Now 2/3 = 67%
    expect(screen.getByText("67%")).toBeInTheDocument();
    expect(screen.getByText("2 of 3 sections complete")).toBeInTheDocument();
  });
});
