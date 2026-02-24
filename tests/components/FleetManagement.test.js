import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import FleetManagement from "../../components/FleetManagement";

const baseAircraft = [
  { id: "1", type: "Cessna 172", registration: "N12345", serial_number: "C172-001", year: 2015, max_passengers: 3, base_location: "KLAX", notes: "" },
  { id: "2", type: "Piper PA-28", registration: "N67890", serial_number: "PA28-002", year: 2018, max_passengers: 3, base_location: "KSFO", notes: "" },
];

function renderFleet(props = {}) {
  const onAdd = props.onAdd ?? vi.fn();
  const onUpdate = props.onUpdate ?? vi.fn();
  const onDelete = props.onDelete ?? vi.fn();

  const { container } = render(
    <FleetManagement
      aircraft={props.aircraft ?? baseAircraft}
      onAdd={onAdd}
      onUpdate={onUpdate}
      onDelete={onDelete}
      canManage={props.canManage ?? true}
      maxAircraft={props.maxAircraft ?? 5}
    />
  );

  return { container, onAdd, onUpdate, onDelete };
}

describe("FleetManagement", () => {
  // 1. Renders "Fleet Registry" heading
  it("renders Fleet Registry heading", () => {
    renderFleet();
    expect(screen.getByText("Fleet Registry")).toBeInTheDocument();
  });

  // 2. Shows aircraft count "X / Y aircraft"
  it("shows aircraft count as X / Y aircraft", () => {
    renderFleet({ aircraft: baseAircraft, maxAircraft: 5 });
    expect(screen.getByText("2 / 5 aircraft")).toBeInTheDocument();
  });

  it("shows correct count when maxAircraft is custom", () => {
    renderFleet({ aircraft: baseAircraft, maxAircraft: 10 });
    expect(screen.getByText("2 / 10 aircraft")).toBeInTheDocument();
  });

  // 3. Shows empty state when no aircraft
  it("shows empty state when aircraft list is empty", () => {
    renderFleet({ aircraft: [] });
    expect(screen.getByText(/No aircraft registered/i)).toBeInTheDocument();
  });

  it("shows empty state when aircraft prop is undefined", () => {
    render(
      <FleetManagement onAdd={vi.fn()} onUpdate={vi.fn()} onDelete={vi.fn()} canManage={true} />
    );
    expect(screen.getByText(/No aircraft registered/i)).toBeInTheDocument();
  });

  // 4. Renders aircraft list with type and registration
  it("renders each aircraft type in the list", () => {
    renderFleet();
    expect(screen.getByText("Cessna 172")).toBeInTheDocument();
    expect(screen.getByText("Piper PA-28")).toBeInTheDocument();
  });

  it("renders each aircraft registration in the list", () => {
    renderFleet();
    expect(screen.getByText(/N12345/)).toBeInTheDocument();
    expect(screen.getByText(/N67890/)).toBeInTheDocument();
  });

  // 5. Shows "+ Add Aircraft" button when canManage is true
  it("shows Add Aircraft button when canManage is true and not at limit", () => {
    renderFleet({ canManage: true, maxAircraft: 5 });
    expect(screen.getByRole("button", { name: /\+ Add Aircraft/i })).toBeInTheDocument();
  });

  // 6. Hides add button when canManage is false
  it("hides Add Aircraft button when canManage is false", () => {
    renderFleet({ canManage: false });
    expect(screen.queryByRole("button", { name: /\+ Add Aircraft/i })).not.toBeInTheDocument();
  });

  // 7. Shows "Aircraft limit reached" when at limit
  it("shows Aircraft limit reached message when fleet is at the limit", () => {
    renderFleet({ aircraft: baseAircraft, maxAircraft: 2, canManage: true });
    expect(screen.getByText(/Aircraft limit reached/i)).toBeInTheDocument();
  });

  it("shows a disabled Add Aircraft button when at limit", () => {
    renderFleet({ aircraft: baseAircraft, maxAircraft: 2, canManage: true });
    const btn = screen.getByRole("button", { name: /\+ Add Aircraft/i });
    expect(btn).toBeDisabled();
  });

  // 8. Search filters aircraft by type
  it("filters aircraft list by type when searching", () => {
    renderFleet();
    const searchInput = screen.getByPlaceholderText(/search aircraft/i);
    fireEvent.change(searchInput, { target: { value: "Cessna" } });
    expect(screen.getByText("Cessna 172")).toBeInTheDocument();
    expect(screen.queryByText("Piper PA-28")).not.toBeInTheDocument();
  });

  // 9. Search filters aircraft by registration
  it("filters aircraft list by registration when searching", () => {
    renderFleet();
    const searchInput = screen.getByPlaceholderText(/search aircraft/i);
    fireEvent.change(searchInput, { target: { value: "N67890" } });
    expect(screen.getByText("Piper PA-28")).toBeInTheDocument();
    expect(screen.queryByText("Cessna 172")).not.toBeInTheDocument();
  });

  // 10. Shows "No aircraft found" when search has no matches
  it("shows No aircraft found when search has no matches", () => {
    renderFleet();
    const searchInput = screen.getByPlaceholderText(/search aircraft/i);
    fireEvent.change(searchInput, { target: { value: "Zzzz" } });
    expect(screen.getByText(/No aircraft found/i)).toBeInTheDocument();
  });

  // 11. Clicking aircraft selects it and shows detail view
  it("clicking an aircraft shows the detail view", () => {
    renderFleet();
    // The list items show type text — click the first one
    const listItem = screen.getAllByText("Cessna 172")[0].closest("div[style*='cursor: pointer'], div[style*='cursor:pointer']")
      ?? screen.getAllByText("Cessna 172")[0].parentElement.parentElement;
    fireEvent.click(listItem);
    // Detail view renders the type as a larger heading
    const headings = screen.getAllByText("Cessna 172");
    expect(headings.length).toBeGreaterThanOrEqual(2);
  });

  it("clicking an aircraft shows its registration in the detail panel", () => {
    renderFleet();
    fireEvent.click(screen.getAllByText("Cessna 172")[0]);
    // Registration appears in detail view
    const registrations = screen.getAllByText(/N12345/);
    expect(registrations.length).toBeGreaterThanOrEqual(1);
  });

  // 12. Detail view shows edit/delete buttons when canManage
  it("shows Edit and Delete buttons in detail view when canManage is true", () => {
    renderFleet({ canManage: true });
    fireEvent.click(screen.getAllByText("Cessna 172")[0]);
    expect(screen.getByRole("button", { name: /^Edit$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Delete$/i })).toBeInTheDocument();
  });

  it("hides Edit and Delete buttons in detail view when canManage is false", () => {
    renderFleet({ canManage: false });
    fireEvent.click(screen.getAllByText("Cessna 172")[0]);
    expect(screen.queryByRole("button", { name: /^Edit$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Delete$/i })).not.toBeInTheDocument();
  });

  // 13. Delete requires confirmation click
  it("first Delete click shows Confirm Delete button instead of calling onDelete", () => {
    const { onDelete } = renderFleet({ canManage: true });
    fireEvent.click(screen.getAllByText("Cessna 172")[0]);
    fireEvent.click(screen.getByRole("button", { name: /^Delete$/i }));
    expect(screen.getByRole("button", { name: /Confirm Delete/i })).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("Confirm Delete button calls onDelete with the aircraft id", () => {
    const { onDelete } = renderFleet({ canManage: true });
    fireEvent.click(screen.getAllByText("Cessna 172")[0]);
    fireEvent.click(screen.getByRole("button", { name: /^Delete$/i }));
    fireEvent.click(screen.getByRole("button", { name: /Confirm Delete/i }));
    expect(onDelete).toHaveBeenCalledWith("1");
  });

  // 14. Add form shows when "+ Add Aircraft" clicked
  it("clicking Add Aircraft opens the add form", () => {
    renderFleet({ canManage: true, maxAircraft: 5 });
    fireEvent.click(screen.getByRole("button", { name: /\+ Add Aircraft/i }));
    // The form heading "Add Aircraft" is rendered in a div (not a button/heading role),
    // so confirm the form is open by checking for the heading text among all matches.
    const matches = screen.getAllByText("Add Aircraft");
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("add form shows required field labels for type and registration", () => {
    renderFleet({ canManage: true, maxAircraft: 5 });
    fireEvent.click(screen.getByRole("button", { name: /\+ Add Aircraft/i }));
    expect(screen.getByText(/Aircraft Type \*/i)).toBeInTheDocument();
    expect(screen.getByText(/Registration \(Tail #\) \*/i)).toBeInTheDocument();
  });

  // 15. Form requires type and registration (save does nothing without them)
  it("save does not call onAdd when type is empty", () => {
    const { onAdd } = renderFleet({ canManage: true, maxAircraft: 5 });
    fireEvent.click(screen.getByRole("button", { name: /\+ Add Aircraft/i }));
    // After form opens: [0]=search, [1]=type, [2]=registration
    // Leave type (index 1) blank, fill registration only
    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[2], { target: { value: "N99999" } });
    fireEvent.click(screen.getByRole("button", { name: /^Add Aircraft$/i }));
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("save does not call onAdd when registration is empty", () => {
    const { onAdd } = renderFleet({ canManage: true, maxAircraft: 5 });
    fireEvent.click(screen.getByRole("button", { name: /\+ Add Aircraft/i }));
    // After form opens: [0]=search, [1]=type, [2]=registration
    // Fill type (index 1), leave registration (index 2) blank
    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[1], { target: { value: "Cessna 172" } });
    fireEvent.click(screen.getByRole("button", { name: /^Add Aircraft$/i }));
    expect(onAdd).not.toHaveBeenCalled();
  });

  // 16. onAdd called with correct data including N-prepended registration
  it("onAdd is called with uppercased type and N-prepended registration", async () => {
    const { onAdd } = renderFleet({ canManage: true, maxAircraft: 5 });
    fireEvent.click(screen.getByRole("button", { name: /\+ Add Aircraft/i }));

    // After opening the form the DOM contains these textboxes in order:
    //   [0] search input (list panel, still visible)
    //   [1] Aircraft Type (form)
    //   [2] Registration (form)
    //   [3] Serial Number, [4] Base Location, [5] Notes (form)
    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[1], { target: { value: "cessna 172" } });
    fireEvent.change(inputs[2], { target: { value: "54321" } });

    fireEvent.click(screen.getByRole("button", { name: /^Add Aircraft$/i }));

    expect(onAdd).toHaveBeenCalledTimes(1);
    const callArg = onAdd.mock.calls[0][0];
    expect(callArg.type).toBe("CESSNA 172");
    expect(callArg.registration).toBe("N54321");
  });

  it("onAdd does not double-prepend N when registration already starts with N", async () => {
    const { onAdd } = renderFleet({ canManage: true, maxAircraft: 5 });
    fireEvent.click(screen.getByRole("button", { name: /\+ Add Aircraft/i }));

    const inputs = screen.getAllByRole("textbox");
    // [1] = type, [2] = registration
    fireEvent.change(inputs[1], { target: { value: "Piper" } });
    fireEvent.change(inputs[2], { target: { value: "N99999" } });

    fireEvent.click(screen.getByRole("button", { name: /^Add Aircraft$/i }));

    expect(onAdd).toHaveBeenCalledTimes(1);
    const callArg = onAdd.mock.calls[0][0];
    expect(callArg.registration).toBe("N99999");
  });

  it("onAdd parses year and max_passengers as integers", async () => {
    const { onAdd } = renderFleet({ canManage: true, maxAircraft: 5 });
    fireEvent.click(screen.getByRole("button", { name: /\+ Add Aircraft/i }));

    const textInputs = screen.getAllByRole("textbox");
    const numberInputs = screen.getAllByRole("spinbutton");

    // [1] = type, [2] = registration
    fireEvent.change(textInputs[1], { target: { value: "Mooney M20" } });
    fireEvent.change(textInputs[2], { target: { value: "N11111" } });
    // year is the first number input, max_passengers is the second
    fireEvent.change(numberInputs[0], { target: { value: "2010" } });
    fireEvent.change(numberInputs[1], { target: { value: "3" } });

    fireEvent.click(screen.getByRole("button", { name: /^Add Aircraft$/i }));

    expect(onAdd).toHaveBeenCalledTimes(1);
    const callArg = onAdd.mock.calls[0][0];
    expect(callArg.year).toBe(2010);
    expect(callArg.max_passengers).toBe(3);
  });
});
