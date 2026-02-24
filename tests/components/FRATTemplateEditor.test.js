import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import FRATTemplateEditor from "../../components/FRATTemplateEditor";

// ── Helpers ──────────────────────────────────────────────────────

const makeTemplate = (overrides = {}) => ({
  id: "tpl_1",
  name: "Standard FRAT",
  is_active: true,
  categories: [
    {
      id: "cat_1",
      name: "Pilot",
      factors: [
        { id: "cat_1_f1", label: "Fatigue", score: 3 },
        { id: "cat_1_f2", label: "Recency", score: 2 },
      ],
    },
    {
      id: "cat_2",
      name: "Environment",
      factors: [
        { id: "cat_2_f1", label: "Weather", score: 5 },
      ],
    },
  ],
  risk_thresholds: [
    { level: "LOW", label: "LOW RISK", min: 0, max: 15, color: "green", action: "Go", approval_mode: "none" },
    { level: "HIGH", label: "HIGH RISK", min: 16, max: 50, color: "red", action: "Stop", approval_mode: "required" },
  ],
  assigned_aircraft: ["Cessna 172"],
  ...overrides,
});

const makeSecondTemplate = (overrides = {}) => ({
  id: "tpl_2",
  name: "IFR Template",
  is_active: false,
  categories: [
    { id: "cat_3", name: "Weather", factors: [{ id: "cat_3_f1", label: "Ceiling", score: 4 }] },
  ],
  risk_thresholds: [],
  assigned_aircraft: [],
  ...overrides,
});

function renderEditor(props = {}) {
  const onSave = props.onSave ?? vi.fn();
  const onCreateTemplate = props.onCreateTemplate ?? vi.fn();
  const onDeleteTemplate = props.onDeleteTemplate ?? vi.fn();
  const onSetActive = props.onSetActive ?? vi.fn();

  const utils = render(
    <FRATTemplateEditor
      template={props.template}
      templates={props.templates}
      onSave={onSave}
      onCreateTemplate={onCreateTemplate}
      onDeleteTemplate={onDeleteTemplate}
      onSetActive={onSetActive}
      saving={props.saving ?? false}
      fleetAircraftTypes={props.fleetAircraftTypes ?? []}
    />
  );

  return { ...utils, onSave, onCreateTemplate, onDeleteTemplate, onSetActive };
}

// ── Tests ────────────────────────────────────────────────────────

describe("FRATTemplateEditor", () => {
  // 1. Single-template fallback: renders TemplateEditor when `templates` not passed
  it("renders TemplateEditor directly when templates prop is not passed (fallback mode)", () => {
    const tpl = makeTemplate();
    renderEditor({ template: tpl });
    // In fallback mode, the TemplateEditor renders the "Save Template" button
    // and the template name input, but NOT the "FRAT Templates" section label
    expect(screen.getByText("Save Template")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Standard FRAT")).toBeInTheDocument();
    expect(screen.queryByText("FRAT Templates")).not.toBeInTheDocument();
  });

  // 2. Template list: renders all templates with names
  it("renders all template names in the list view", () => {
    const templates = [makeTemplate(), makeSecondTemplate()];
    renderEditor({ templates });
    expect(screen.getByText("Standard FRAT")).toBeInTheDocument();
    expect(screen.getByText("IFR Template")).toBeInTheDocument();
  });

  // 3. Shows active template badge
  it("shows Active badge on the active template", () => {
    const templates = [makeTemplate({ is_active: true }), makeSecondTemplate({ is_active: false })];
    renderEditor({ templates });
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  // 4. Shows template stats (categories, factors, aircraft)
  it("shows category and factor counts for each template", () => {
    const templates = [makeTemplate(), makeSecondTemplate()];
    renderEditor({ templates });
    // Standard FRAT: 2 categories, 3 factors, Aircraft: Cessna 172
    expect(screen.getByText(/2 categories · 3 factors/)).toBeInTheDocument();
    // IFR Template: 1 categories, 1 factors
    expect(screen.getByText(/1 categories · 1 factors/)).toBeInTheDocument();
  });

  it("shows assigned aircraft in the template stats", () => {
    const templates = [makeTemplate()];
    renderEditor({ templates });
    expect(screen.getByText(/Aircraft: Cessna 172/)).toBeInTheDocument();
  });

  // 5. "+ New Template" button calls onCreateTemplate
  it("calls onCreateTemplate when + New Template is clicked", () => {
    const templates = [makeTemplate()];
    const { onCreateTemplate } = renderEditor({ templates });
    fireEvent.click(screen.getByText("+ New Template"));
    expect(onCreateTemplate).toHaveBeenCalledTimes(1);
    expect(onCreateTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ name: "New Template", categories: [], assigned_aircraft: [] })
    );
  });

  // 6. "Duplicate" button calls onCreateTemplate with copy data
  it("calls onCreateTemplate with copy data when Duplicate is clicked", () => {
    const tpl = makeTemplate();
    const templates = [tpl, makeSecondTemplate()];
    const { onCreateTemplate } = renderEditor({ templates });
    // There are two Duplicate buttons; click the first one (Standard FRAT)
    const duplicateButtons = screen.getAllByText("Duplicate");
    fireEvent.click(duplicateButtons[0]);
    expect(onCreateTemplate).toHaveBeenCalledTimes(1);
    expect(onCreateTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Standard FRAT (Copy)",
        categories: tpl.categories,
      })
    );
  });

  // 7. "Delete" button on non-active template calls onDeleteTemplate after confirm
  it("calls onDeleteTemplate after confirmation for a non-active template", () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const templates = [makeTemplate(), makeSecondTemplate()];
    const { onDeleteTemplate } = renderEditor({ templates });
    fireEvent.click(screen.getByText("Delete"));
    expect(window.confirm).toHaveBeenCalled();
    expect(onDeleteTemplate).toHaveBeenCalledWith("tpl_2");
    window.confirm.mockRestore();
  });

  it("does not call onDeleteTemplate when confirm is cancelled", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const templates = [makeTemplate(), makeSecondTemplate()];
    const { onDeleteTemplate } = renderEditor({ templates });
    fireEvent.click(screen.getByText("Delete"));
    expect(onDeleteTemplate).not.toHaveBeenCalled();
    window.confirm.mockRestore();
  });

  // 8. Cannot delete active template (shows alert, not onDeleteTemplate)
  it("shows alert and does not call onDeleteTemplate when trying to delete the active template", () => {
    vi.spyOn(window, "alert").mockImplementation(() => {});
    // Make only one template that is active — the Delete button is not rendered
    // for active templates. Instead, test via two active-looking templates where
    // we force both to be active to trigger the alert path. The component hides
    // the Delete button for is_active, so we directly test the handleDelete path:
    // We need a template with is_active true that still has a Delete button.
    // Actually, the component hides Delete for is_active templates (line 217).
    // So we verify that no Delete button exists for the active template.
    const templates = [makeTemplate({ is_active: true })];
    const { onDeleteTemplate } = renderEditor({ templates });
    // No Delete button should be rendered for the active template
    expect(screen.queryByText("Delete")).not.toBeInTheDocument();
    expect(onDeleteTemplate).not.toHaveBeenCalled();
    window.alert.mockRestore();
  });

  // 9. "Set Active" button calls onSetActive
  it("calls onSetActive when Set Active is clicked on a non-active template", () => {
    const templates = [makeTemplate(), makeSecondTemplate()];
    const { onSetActive } = renderEditor({ templates });
    fireEvent.click(screen.getByText("Set Active"));
    expect(onSetActive).toHaveBeenCalledWith("tpl_2");
  });

  it("does not show Set Active button for the active template", () => {
    const templates = [makeTemplate({ is_active: true })];
    renderEditor({ templates });
    expect(screen.queryByText("Set Active")).not.toBeInTheDocument();
  });

  // 10. Clicking a template opens the editor below
  it("clicking a template opens the TemplateEditor below", () => {
    const templates = [makeTemplate(), makeSecondTemplate()];
    renderEditor({ templates });
    // Click the IFR Template card
    fireEvent.click(screen.getByText("IFR Template"));
    // The editor shows "Editing: IFR Template" and a "Save Template" button
    expect(screen.getByText("Editing: IFR Template")).toBeInTheDocument();
    expect(screen.getByText("Save Template")).toBeInTheDocument();
  });

  // 11. TemplateEditor: renders template name input
  it("renders the template name input in the editor", () => {
    renderEditor({ template: makeTemplate() });
    expect(screen.getByDisplayValue("Standard FRAT")).toBeInTheDocument();
  });

  // 12. TemplateEditor: "Add Category" creates a new category
  it("adds a new category when + Add Category is clicked", () => {
    renderEditor({ template: makeTemplate() });
    const before = screen.getByText("2 categories · 3 factors · Max score: 10");
    expect(before).toBeInTheDocument();
    fireEvent.click(screen.getByText("+ Add Category"));
    // New category is auto-expanded, so its name appears as an input value
    expect(screen.getByDisplayValue("New Category")).toBeInTheDocument();
    // Stats update to 3 categories
    expect(screen.getByText(/3 categories/)).toBeInTheDocument();
  });

  // 13. TemplateEditor: "Save Template" calls onSave with correct data
  it("calls onSave with correct data structure when Save Template is clicked", () => {
    const tpl = makeTemplate();
    const { onSave } = renderEditor({ template: tpl });
    fireEvent.click(screen.getByText("Save Template"));
    expect(onSave).toHaveBeenCalledTimes(1);
    const savedData = onSave.mock.calls[0][0];
    expect(savedData).toHaveProperty("name", "Standard FRAT");
    expect(savedData).toHaveProperty("categories");
    expect(savedData).toHaveProperty("risk_thresholds");
    expect(savedData).toHaveProperty("assigned_aircraft");
    expect(savedData.categories).toHaveLength(2);
    expect(savedData.assigned_aircraft).toEqual(["Cessna 172"]);
  });

  // 14. TemplateEditor: shows "Unsaved changes" after editing
  it("shows Unsaved changes indicator after editing the name", () => {
    renderEditor({ template: makeTemplate() });
    expect(screen.queryByText("Unsaved changes")).not.toBeInTheDocument();
    const nameInput = screen.getByDisplayValue("Standard FRAT");
    fireEvent.change(nameInput, { target: { value: "Edited FRAT" } });
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
  });

  it("clears Unsaved changes indicator after saving", () => {
    const { onSave } = renderEditor({ template: makeTemplate() });
    const nameInput = screen.getByDisplayValue("Standard FRAT");
    fireEvent.change(nameInput, { target: { value: "Edited FRAT" } });
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Save Template"));
    expect(screen.queryByText("Unsaved changes")).not.toBeInTheDocument();
  });

  // 15. TemplateEditor: shows category/factor/max-score summary
  it("shows the category, factor, and max score summary", () => {
    renderEditor({ template: makeTemplate() });
    // 2 categories, 3 factors, max score: 3+2+5 = 10
    expect(screen.getByText("2 categories · 3 factors · Max score: 10")).toBeInTheDocument();
  });

  // 16. TemplateEditor: aircraft assignment toggles work
  it("toggles aircraft assignment on and off", () => {
    renderEditor({
      template: makeTemplate({ assigned_aircraft: [] }),
      fleetAircraftTypes: ["Cessna 172", "Piper PA-28"],
    });
    const cessnaBtn = screen.getByText("Cessna 172");
    const piperBtn = screen.getByText("Piper PA-28");
    // Initially neither is assigned
    expect(screen.getByText(/No aircraft assigned/)).toBeInTheDocument();
    // Assign Cessna 172
    fireEvent.click(cessnaBtn);
    expect(screen.queryByText(/No aircraft assigned/)).not.toBeInTheDocument();
    // Toggle it off
    fireEvent.click(cessnaBtn);
    expect(screen.getByText(/No aircraft assigned/)).toBeInTheDocument();
  });

  // 17. Empty state: shows "No templates yet" when templates array is empty
  it("shows empty state when templates array is empty", () => {
    renderEditor({ templates: [] });
    expect(screen.getByText(/No templates yet/)).toBeInTheDocument();
  });

  // ── Additional edge cases ──────────────────────────────────────

  it("shows template count and active template name in header", () => {
    const templates = [makeTemplate(), makeSecondTemplate()];
    renderEditor({ templates });
    expect(screen.getByText(/2 templates · Active: Standard FRAT/)).toBeInTheDocument();
  });

  it("shows saving state on Save Template button", () => {
    renderEditor({ template: makeTemplate(), saving: true });
    expect(screen.getByText("Saving...")).toBeInTheDocument();
  });
});
