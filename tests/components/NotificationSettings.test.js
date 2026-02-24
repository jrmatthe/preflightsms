import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import NotificationSettings from "../../components/NotificationSettings";
import {
  fetchNotificationContacts,
  createNotificationContact,
  updateNotificationContact,
  deleteNotificationContact,
  fetchOverdueNotifications,
  updateOrgNotificationSettings,
} from "../../lib/supabase";

// ---------------------------------------------------------------------------
// Mock supabase lib
// ---------------------------------------------------------------------------
vi.mock("../../lib/supabase", () => ({
  fetchNotificationContacts: vi.fn(),
  createNotificationContact: vi.fn(),
  updateNotificationContact: vi.fn(),
  deleteNotificationContact: vi.fn(),
  fetchOverdueNotifications: vi.fn(),
  updateOrgNotificationSettings: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------
const ORG_ID = "org-1";

const baseContacts = [
  { id: "c1", name: "Alice Smith", phone: "+15095551234", role: "Chief Pilot", active: true },
  { id: "c2", name: "Bob Jones", phone: "+15095559999", role: "", active: false },
];

const baseNotifications = [
  {
    id: "n1",
    phone: "+15091112222",
    message: "Overdue flight: N12345\nPilot: Alice Smith",
    status: "sent",
    sent_at: "2026-02-20T14:30:00Z",
  },
  {
    id: "n2",
    phone: "+15093334444",
    message: "Overdue flight: N67890\nPilot: Bob Jones",
    status: "failed",
    sent_at: "2026-02-19T10:00:00Z",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Set up mock return values and render the component. */
async function renderLoaded(props = {}, options = {}) {
  const {
    contacts = baseContacts,
    notifications = [],
  } = options;

  fetchNotificationContacts.mockResolvedValue({ data: contacts });
  fetchOverdueNotifications.mockResolvedValue({ data: notifications });

  let result;
  await act(async () => {
    result = render(
      <NotificationSettings
        orgId={ORG_ID}
        notificationSettings={{ enabled: true, grace_minutes: 15 }}
        {...props}
      />
    );
  });

  return result;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("NotificationSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default happy-path returns
    fetchNotificationContacts.mockResolvedValue({ data: baseContacts });
    fetchOverdueNotifications.mockResolvedValue({ data: [] });
    createNotificationContact.mockResolvedValue({ data: null, error: null });
    updateNotificationContact.mockResolvedValue({});
    deleteNotificationContact.mockResolvedValue({});
    updateOrgNotificationSettings.mockResolvedValue({});
  });

  // -------------------------------------------------------------------------
  // 1. Loading state
  // -------------------------------------------------------------------------
  it("shows loading state initially before data resolves", () => {
    // Use a promise that never resolves to keep the loading state visible
    fetchNotificationContacts.mockReturnValue(new Promise(() => {}));
    fetchOverdueNotifications.mockReturnValue(new Promise(() => {}));

    render(<NotificationSettings orgId={ORG_ID} notificationSettings={{}} />);
    expect(screen.getByText("Loading notification settings...")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 2. Renders settings section after data loads
  // -------------------------------------------------------------------------
  it("renders the Overdue Flight Alerts settings section after loading", async () => {
    await renderLoaded();
    expect(screen.getByText("Overdue Flight Alerts")).toBeInTheDocument();
    expect(screen.getByText("Enable SMS notifications")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 3. Shows contacts after loading
  // -------------------------------------------------------------------------
  it("shows contacts after loading completes", async () => {
    await renderLoaded();
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    expect(screen.getByText("Bob Jones")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 4. Shows empty state when no contacts
  // -------------------------------------------------------------------------
  it("shows empty state when there are no contacts", async () => {
    await renderLoaded({}, { contacts: [] });
    expect(
      screen.getByText(/No notification contacts configured/)
    ).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 5. Shows role badge for contacts that have a role
  // -------------------------------------------------------------------------
  it("shows a role badge for contacts with a role", async () => {
    await renderLoaded();
    expect(screen.getByText("Chief Pilot")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 6. Grace period select changes value
  // -------------------------------------------------------------------------
  it("changes the grace period when a different option is selected", async () => {
    await renderLoaded();
    const select = screen.getByDisplayValue("15 min");
    fireEvent.change(select, { target: { value: "30" } });
    expect(select.value).toBe("30");
  });

  // -------------------------------------------------------------------------
  // 7. Save button calls updateOrgNotificationSettings
  // -------------------------------------------------------------------------
  it("calls updateOrgNotificationSettings when Save is clicked", async () => {
    await renderLoaded();
    const saveBtn = screen.getByRole("button", { name: "Save" });
    await act(async () => {
      fireEvent.click(saveBtn);
    });

    expect(updateOrgNotificationSettings).toHaveBeenCalledWith(ORG_ID, {
      grace_minutes: 15,
      enabled: true,
    });
  });

  // -------------------------------------------------------------------------
  // 8. Save sends updated grace period value
  // -------------------------------------------------------------------------
  it("sends the updated grace period value when Save is clicked", async () => {
    await renderLoaded();
    const select = screen.getByDisplayValue("15 min");
    fireEvent.change(select, { target: { value: "45" } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
    });

    expect(updateOrgNotificationSettings).toHaveBeenCalledWith(ORG_ID, {
      grace_minutes: 45,
      enabled: true,
    });
  });

  // -------------------------------------------------------------------------
  // 9. "+ Add Contact" shows the form
  // -------------------------------------------------------------------------
  it("shows the add contact form when '+ Add Contact' is clicked", async () => {
    await renderLoaded();
    expect(screen.queryByPlaceholderText("John Smith")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /\+ Add Contact/i }));
    expect(screen.getByPlaceholderText("John Smith")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("(509) 555-1234")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 10. Add form has name, phone, and role fields
  // -------------------------------------------------------------------------
  it("renders name, phone, and role fields in the add form", async () => {
    await renderLoaded();
    fireEvent.click(screen.getByRole("button", { name: /\+ Add Contact/i }));

    expect(screen.getByPlaceholderText("John Smith")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("(509) 555-1234")).toBeInTheDocument();
    // Role select with options
    expect(screen.getByText("Select...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Contact" })).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 11. Cancel hides the add form
  // -------------------------------------------------------------------------
  it("hides the add form when Cancel is clicked", async () => {
    await renderLoaded();
    fireEvent.click(screen.getByRole("button", { name: /\+ Add Contact/i }));
    expect(screen.getByPlaceholderText("John Smith")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));
    expect(screen.queryByPlaceholderText("John Smith")).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 12. Submit with valid data calls createNotificationContact
  // -------------------------------------------------------------------------
  it("calls createNotificationContact with valid data when form is submitted", async () => {
    const newContactData = {
      id: "c3",
      name: "Charlie Brown",
      phone: "+15095550000",
      role: "Dispatch",
      active: true,
    };
    createNotificationContact.mockResolvedValue({ data: newContactData, error: null });

    await renderLoaded();
    fireEvent.click(screen.getByRole("button", { name: /\+ Add Contact/i }));

    fireEvent.change(screen.getByPlaceholderText("John Smith"), {
      target: { value: "Charlie Brown" },
    });
    fireEvent.change(screen.getByPlaceholderText("(509) 555-1234"), {
      target: { value: "5095550000" },
    });

    // Select a role
    const roleSelect = screen.getByDisplayValue("Select...");
    fireEvent.change(roleSelect, { target: { value: "Dispatch" } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Add Contact" }));
    });

    expect(createNotificationContact).toHaveBeenCalledWith(ORG_ID, {
      name: "Charlie Brown",
      phone: "+15095550000",
      role: "Dispatch",
    });
  });

  // -------------------------------------------------------------------------
  // 13. Form hides and contact appears after successful add
  // -------------------------------------------------------------------------
  it("hides the form and shows the new contact after a successful add", async () => {
    const newContactData = {
      id: "c3",
      name: "Charlie Brown",
      phone: "+15095550000",
      role: "Dispatch",
      active: true,
    };
    createNotificationContact.mockResolvedValue({ data: newContactData, error: null });

    await renderLoaded();
    fireEvent.click(screen.getByRole("button", { name: /\+ Add Contact/i }));

    fireEvent.change(screen.getByPlaceholderText("John Smith"), {
      target: { value: "Charlie Brown" },
    });
    fireEvent.change(screen.getByPlaceholderText("(509) 555-1234"), {
      target: { value: "5095550000" },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Add Contact" }));
    });

    // Form should be hidden
    expect(screen.queryByPlaceholderText("John Smith")).not.toBeInTheDocument();
    // New contact should appear
    expect(screen.getByText("Charlie Brown")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 14. handleAdd does nothing when name is empty
  // -------------------------------------------------------------------------
  it("does not call createNotificationContact when name is empty", async () => {
    await renderLoaded();
    fireEvent.click(screen.getByRole("button", { name: /\+ Add Contact/i }));

    // Only fill phone, leave name empty
    fireEvent.change(screen.getByPlaceholderText("(509) 555-1234"), {
      target: { value: "5095550000" },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Add Contact" }));
    });

    expect(createNotificationContact).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 15. Contact active toggle calls updateNotificationContact
  // -------------------------------------------------------------------------
  it("calls updateNotificationContact when a contact's active toggle is clicked", async () => {
    await renderLoaded();

    // The toggle divs have onClick handlers. Find the contact toggle for Alice (active: true).
    // Each contact row has a toggle div. We can find them by their title attribute "Overdue alerts".
    const toggleLabels = screen.getAllByTitle("Overdue alerts");
    // Click the toggle inside the first label (Alice - active: true -> false)
    const aliceToggle = toggleLabels[0].querySelector("div");
    await act(async () => {
      fireEvent.click(aliceToggle);
    });

    expect(updateNotificationContact).toHaveBeenCalledWith("c1", { active: false });
  });

  // -------------------------------------------------------------------------
  // 16. Delete contact calls deleteNotificationContact after confirm
  // -------------------------------------------------------------------------
  it("calls deleteNotificationContact when delete is confirmed", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);

    await renderLoaded();

    // Find delete buttons (the x buttons)
    const deleteButtons = screen.getAllByRole("button", { name: /\u00d7/ });
    await act(async () => {
      fireEvent.click(deleteButtons[0]);
    });

    expect(window.confirm).toHaveBeenCalledWith("Remove this contact?");
    expect(deleteNotificationContact).toHaveBeenCalledWith("c1");

    window.confirm.mockRestore();
  });

  // -------------------------------------------------------------------------
  // 17. Delete contact does NOT proceed when confirm is cancelled
  // -------------------------------------------------------------------------
  it("does NOT call deleteNotificationContact when confirm is cancelled", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);

    await renderLoaded();

    const deleteButtons = screen.getAllByRole("button", { name: /\u00d7/ });
    await act(async () => {
      fireEvent.click(deleteButtons[0]);
    });

    expect(window.confirm).toHaveBeenCalled();
    expect(deleteNotificationContact).not.toHaveBeenCalled();

    window.confirm.mockRestore();
  });

  // -------------------------------------------------------------------------
  // 18. Contact removed from list after delete
  // -------------------------------------------------------------------------
  it("removes the contact from the list after successful delete", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);

    await renderLoaded();
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();

    const deleteButtons = screen.getAllByRole("button", { name: /\u00d7/ });
    await act(async () => {
      fireEvent.click(deleteButtons[0]);
    });

    expect(screen.queryByText("Alice Smith")).not.toBeInTheDocument();

    window.confirm.mockRestore();
  });

  // -------------------------------------------------------------------------
  // 19. Shows recent notifications when present
  // -------------------------------------------------------------------------
  it("shows the Recent Notifications section when notifications exist", async () => {
    await renderLoaded({}, { notifications: baseNotifications });

    expect(screen.getByText("Recent Notifications")).toBeInTheDocument();
    expect(screen.getByText("+15091112222")).toBeInTheDocument();
    expect(screen.getByText("+15093334444")).toBeInTheDocument();
    // First line of the message is shown as preview
    expect(screen.getByText("Overdue flight: N12345")).toBeInTheDocument();
    expect(screen.getByText("Overdue flight: N67890")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 20. Hides recent notifications when none exist
  // -------------------------------------------------------------------------
  it("does not show the Recent Notifications section when there are none", async () => {
    await renderLoaded({}, { notifications: [] });
    expect(screen.queryByText("Recent Notifications")).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 21. formatPhone formats phone input as user types
  // -------------------------------------------------------------------------
  it("formats phone input as the user types", async () => {
    await renderLoaded();
    fireEvent.click(screen.getByRole("button", { name: /\+ Add Contact/i }));

    const phoneInput = screen.getByPlaceholderText("(509) 555-1234");

    fireEvent.change(phoneInput, { target: { value: "509" } });
    // formatPhone("509") => "(509"
    // But the component passes formatPhone(e.target.value) so the result is stored
    expect(phoneInput.value).toBe("(509");

    fireEvent.change(phoneInput, { target: { value: "509555" } });
    expect(phoneInput.value).toBe("(509) 555");

    fireEvent.change(phoneInput, { target: { value: "5095551234" } });
    expect(phoneInput.value).toBe("(509) 555-1234");
  });

  // -------------------------------------------------------------------------
  // 22. Phone validation: rejects short numbers
  // -------------------------------------------------------------------------
  it("alerts when phone number is too short on submit", async () => {
    vi.spyOn(window, "alert").mockImplementation(() => {});

    await renderLoaded();
    fireEvent.click(screen.getByRole("button", { name: /\+ Add Contact/i }));

    fireEvent.change(screen.getByPlaceholderText("John Smith"), {
      target: { value: "Test User" },
    });
    // Enter a short phone number (only 5 digits)
    fireEvent.change(screen.getByPlaceholderText("(509) 555-1234"), {
      target: { value: "50955" },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Add Contact" }));
    });

    expect(window.alert).toHaveBeenCalledWith("Please enter a valid 10-digit phone number");
    expect(createNotificationContact).not.toHaveBeenCalled();

    window.alert.mockRestore();
  });

  // -------------------------------------------------------------------------
  // 23. notificationSettings.enabled = false renders toggle off
  // -------------------------------------------------------------------------
  it("initializes the enable toggle to off when notificationSettings.enabled is false", async () => {
    await renderLoaded({ notificationSettings: { enabled: false, grace_minutes: 20 } });

    // After clicking Save with enabled: false, it should pass enabled: false
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
    });

    expect(updateOrgNotificationSettings).toHaveBeenCalledWith(ORG_ID, {
      grace_minutes: 20,
      enabled: false,
    });
  });

  // -------------------------------------------------------------------------
  // 24. notificationSettings.grace_minutes defaults to 15
  // -------------------------------------------------------------------------
  it("defaults the grace period to 15 minutes when not specified", async () => {
    await renderLoaded({ notificationSettings: {} });
    const select = screen.getByDisplayValue("15 min");
    expect(select.value).toBe("15");
  });

  // -------------------------------------------------------------------------
  // 25. Does not fetch when orgId is missing
  // -------------------------------------------------------------------------
  it("stays in loading state when orgId is not provided", () => {
    render(<NotificationSettings orgId={null} notificationSettings={{}} />);
    expect(screen.getByText("Loading notification settings...")).toBeInTheDocument();
    expect(fetchNotificationContacts).not.toHaveBeenCalled();
    expect(fetchOverdueNotifications).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 26. Enable toggle changes state and is reflected in Save
  // -------------------------------------------------------------------------
  it("toggles enabled state and sends it when Save is clicked", async () => {
    await renderLoaded();

    // Toggle the enable switch off (currently on)
    const toggleDiv = screen.getByText("Enable SMS notifications").previousSibling;
    fireEvent.click(toggleDiv);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
    });

    expect(updateOrgNotificationSettings).toHaveBeenCalledWith(ORG_ID, {
      grace_minutes: 15,
      enabled: false,
    });
  });
});
