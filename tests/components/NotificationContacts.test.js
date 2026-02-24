import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import NotificationContacts from "../../components/NotificationContacts";

const baseContacts = [
  { id: "c1", name: "Alice Smith", email: "alice@example.com", phone: "+15095551234", role: "Chief Pilot", active: true },
  { id: "c2", name: "Bob Jones", email: "bob@example.com", phone: "", role: "", active: false },
];

function renderComponent(contactsOverride = [], handlers = {}) {
  const contacts = contactsOverride;
  const onAdd = handlers.onAdd ?? vi.fn().mockResolvedValue(undefined);
  const onUpdate = handlers.onUpdate ?? vi.fn();
  const onDelete = handlers.onDelete ?? vi.fn();

  render(
    <NotificationContacts
      contacts={contacts}
      onAdd={onAdd}
      onUpdate={onUpdate}
      onDelete={onDelete}
    />
  );

  return { onAdd, onUpdate, onDelete };
}

describe("NotificationContacts", () => {
  // 1. Renders "Overdue Flight Notifications" heading
  it("renders the 'Overdue Flight Notifications' heading", () => {
    renderComponent([]);
    expect(screen.getByText("Overdue Flight Notifications")).toBeInTheDocument();
  });

  // 2. Shows empty state when contacts is empty
  it("shows empty state message when contacts array is empty", () => {
    renderComponent([]);
    expect(screen.getByText("No notification contacts configured")).toBeInTheDocument();
  });

  // 3. Renders contact list with names and emails
  it("renders contact names and emails when contacts are provided", () => {
    renderComponent(baseContacts);
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    expect(screen.getByText(/alice@example\.com/)).toBeInTheDocument();
    expect(screen.getByText("Bob Jones")).toBeInTheDocument();
    expect(screen.getByText(/bob@example\.com/)).toBeInTheDocument();
  });

  // 4. Shows role badge for contacts with roles
  it("shows the role badge for contacts that have a role", () => {
    renderComponent(baseContacts);
    expect(screen.getByText("Chief Pilot")).toBeInTheDocument();
  });

  // 5. Shows "Paused" badge for inactive contacts
  it("shows a 'Paused' badge for inactive contacts", () => {
    renderComponent(baseContacts);
    expect(screen.getByText("Paused")).toBeInTheDocument();
  });

  // 6. Shows "+ Add Contact" button
  it("shows the '+ Add Contact' button", () => {
    renderComponent([]);
    expect(screen.getByRole("button", { name: /\+ Add Contact/i })).toBeInTheDocument();
  });

  // 7. Toggles form visibility when button clicked
  it("toggles the add form when the '+ Add Contact' button is clicked", () => {
    renderComponent([]);
    const toggleBtn = screen.getByRole("button", { name: /\+ Add Contact/i });

    // Form should not be visible initially
    expect(screen.queryByPlaceholderText("e.g. John Smith")).not.toBeInTheDocument();

    // Click to open
    fireEvent.click(toggleBtn);
    expect(screen.getByPlaceholderText("e.g. John Smith")).toBeInTheDocument();

    // Button now reads "Cancel"
    expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument();

    // Click to close
    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));
    expect(screen.queryByPlaceholderText("e.g. John Smith")).not.toBeInTheDocument();
  });

  // 8. Form fields: name, email, phone, role
  it("renders name, email, phone, and role fields in the add form", () => {
    renderComponent([]);
    fireEvent.click(screen.getByRole("button", { name: /\+ Add Contact/i }));

    expect(screen.getByPlaceholderText("e.g. John Smith")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("john@pvtair.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("(509) 555-1234")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("e.g. Chief Pilot")).toBeInTheDocument();
  });

  // 9. Add button disabled when name or email is empty
  it("keeps the 'Add Contact' button disabled when name or email is empty", () => {
    renderComponent([]);
    fireEvent.click(screen.getByRole("button", { name: /\+ Add Contact/i }));

    const addBtn = screen.getByRole("button", { name: /Add Contact/i });

    // Both empty — disabled
    expect(addBtn).toBeDisabled();

    // Name filled, email still empty — disabled
    fireEvent.change(screen.getByPlaceholderText("e.g. John Smith"), { target: { value: "Jane Doe" } });
    expect(addBtn).toBeDisabled();

    // Both filled — enabled
    fireEvent.change(screen.getByPlaceholderText("john@pvtair.com"), { target: { value: "jane@example.com" } });
    expect(addBtn).not.toBeDisabled();
  });

  // 10. Calls onAdd with correct data when form submitted
  it("calls onAdd with the correct payload when the form is submitted", async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    renderComponent([], { onAdd });

    fireEvent.click(screen.getByRole("button", { name: /\+ Add Contact/i }));

    fireEvent.change(screen.getByPlaceholderText("e.g. John Smith"), { target: { value: "Jane Doe" } });
    fireEvent.change(screen.getByPlaceholderText("john@pvtair.com"), { target: { value: "jane@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("e.g. Chief Pilot"), { target: { value: "Dispatcher" } });

    fireEvent.click(screen.getByRole("button", { name: /Add Contact/i }));

    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledTimes(1);
      expect(onAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Jane Doe",
          email: "jane@example.com",
          role: "Dispatcher",
          notify_overdue: true,
          active: true,
        })
      );
    });
  });

  // 11. Phone is converted to E.164 format in onAdd
  it("converts the phone number to E.164 format before calling onAdd", async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    renderComponent([], { onAdd });

    fireEvent.click(screen.getByRole("button", { name: /\+ Add Contact/i }));

    fireEvent.change(screen.getByPlaceholderText("e.g. John Smith"), { target: { value: "Jane Doe" } });
    fireEvent.change(screen.getByPlaceholderText("john@pvtair.com"), { target: { value: "jane@example.com" } });
    // Simulate user typing a 10-digit phone number (component formats it as it is typed)
    fireEvent.change(screen.getByPlaceholderText("(509) 555-1234"), { target: { value: "5095551234" } });

    fireEvent.click(screen.getByRole("button", { name: /Add Contact/i }));

    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: "+15095551234",
        })
      );
    });
  });

  // 12. Form resets after successful add
  it("resets the form and hides it after a successful add", async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    renderComponent([], { onAdd });

    fireEvent.click(screen.getByRole("button", { name: /\+ Add Contact/i }));

    const nameInput = screen.getByPlaceholderText("e.g. John Smith");
    const emailInput = screen.getByPlaceholderText("john@pvtair.com");

    fireEvent.change(nameInput, { target: { value: "Jane Doe" } });
    fireEvent.change(emailInput, { target: { value: "jane@example.com" } });

    fireEvent.click(screen.getByRole("button", { name: /Add Contact/i }));

    // Form should disappear and the toggle button should revert to "+ Add Contact"
    await waitFor(() => {
      expect(screen.queryByPlaceholderText("e.g. John Smith")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: /\+ Add Contact/i })).toBeInTheDocument();
    });
  });

  // 13. Pause/Enable toggle calls onUpdate
  it("calls onUpdate with toggled active state when Pause/Enable is clicked", () => {
    const onUpdate = vi.fn();
    renderComponent(baseContacts, { onUpdate });

    // Alice is active — her button reads "Pause"
    const pauseBtn = screen.getByRole("button", { name: /^Pause$/i });
    fireEvent.click(pauseBtn);
    expect(onUpdate).toHaveBeenCalledWith("c1", { active: false });

    // Bob is inactive — his button reads "Enable"
    const enableBtn = screen.getByRole("button", { name: /^Enable$/i });
    fireEvent.click(enableBtn);
    expect(onUpdate).toHaveBeenCalledWith("c2", { active: true });
  });

  // 14. Delete button calls onDelete (mock window.confirm)
  it("calls onDelete with the contact id when delete is confirmed", () => {
    const onDelete = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(true);

    renderComponent(baseContacts, { onDelete });

    // Two delete buttons (×) — click the first one (Alice)
    const deleteButtons = screen.getAllByRole("button", { name: /×/i });
    fireEvent.click(deleteButtons[0]);

    expect(window.confirm).toHaveBeenCalledWith("Remove Alice Smith?");
    expect(onDelete).toHaveBeenCalledWith("c1");

    window.confirm.mockRestore();
  });

  it("does NOT call onDelete when the confirm dialog is cancelled", () => {
    const onDelete = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(false);

    renderComponent(baseContacts, { onDelete });

    const deleteButtons = screen.getAllByRole("button", { name: /×/i });
    fireEvent.click(deleteButtons[0]);

    expect(window.confirm).toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();

    window.confirm.mockRestore();
  });
});
