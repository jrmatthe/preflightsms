import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import NotificationCenter from "../../components/NotificationCenter";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE_PROFILE = { id: "user-1", role: "pilot" };

function makeNotification(overrides = {}) {
  return {
    id: `notif-${Math.random().toString(36).slice(2)}`,
    type: "report_submitted",
    title: "Test Notification",
    body: "Test body text",
    created_at: new Date().toISOString(),
    target_user_id: null,
    target_roles: [],
    link_tab: null,
    link_id: null,
    ...overrides,
  };
}

function renderCenter(props = {}) {
  const defaults = {
    notifications: [],
    reads: [],
    onMarkRead: vi.fn(),
    onMarkAllRead: vi.fn(),
    profile: BASE_PROFILE,
    onNavigate: vi.fn(),
  };
  const merged = { ...defaults, ...props };
  const { container } = render(<NotificationCenter {...merged} />);
  return { container, ...merged };
}

/** Click the bell to open the dropdown. */
function openDropdown() {
  fireEvent.click(screen.getByTitle("Notifications"));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("NotificationCenter", () => {
  // 1. Renders bell button
  it("renders the bell button", () => {
    renderCenter();
    expect(screen.getByTitle("Notifications")).toBeInTheDocument();
  });

  // 2. Shows unread count badge when there are unread notifications
  it("shows the unread count badge when notifications are unread", () => {
    const n1 = makeNotification({ id: "n1", title: "First" });
    const n2 = makeNotification({ id: "n2", title: "Second" });
    renderCenter({ notifications: [n1, n2], reads: [] });
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  // 3. Does NOT show badge when all are read
  it("does not show a badge when all notifications are read", () => {
    const n = makeNotification({ id: "n1" });
    renderCenter({ notifications: [n], reads: ["n1"] });
    // The badge span only renders when unreadCount > 0, so querying by text
    // "1" should find nothing related to a badge (the notification title may
    // differ, so we look for the specific badge text that would be "1").
    expect(screen.queryByText("1")).not.toBeInTheDocument();
  });

  // 4. Caps badge at "99+" for > 99 unread
  it("caps the badge at '99+' when there are more than 99 unread notifications", () => {
    const notifications = Array.from({ length: 100 }, (_, i) =>
      makeNotification({ id: `n${i}`, title: `Notif ${i}` })
    );
    renderCenter({ notifications, reads: [] });
    expect(screen.getByText("99+")).toBeInTheDocument();
  });

  // 5. Opens dropdown when bell is clicked
  it("opens the dropdown when the bell is clicked", () => {
    renderCenter();
    expect(screen.queryByText("Notifications")).not.toBeInTheDocument();
    openDropdown();
    // The dropdown header contains the text "Notifications"
    expect(screen.getByText("Notifications")).toBeInTheDocument();
  });

  // 6. Shows "No notifications yet" when notification list is empty
  it("shows 'No notifications yet' empty state when there are no notifications", () => {
    renderCenter({ notifications: [] });
    openDropdown();
    expect(screen.getByText("No notifications yet")).toBeInTheDocument();
  });

  // 7. Shows notification title and body
  it("shows the notification title and body in the dropdown", () => {
    const n = makeNotification({ id: "n1", title: "Action Overdue", body: "Your action is past due." });
    renderCenter({ notifications: [n] });
    openDropdown();
    expect(screen.getByText("Action Overdue")).toBeInTheDocument();
    expect(screen.getByText("Your action is past due.")).toBeInTheDocument();
  });

  // 8. Filters out notifications targeted at other users
  it("does not show notifications targeted at a different user", () => {
    const n = makeNotification({
      id: "n1",
      title: "Only for someone else",
      target_user_id: "other-user-99",
    });
    renderCenter({ notifications: [n], profile: { id: "user-1", role: "pilot" } });
    openDropdown();
    expect(screen.queryByText("Only for someone else")).not.toBeInTheDocument();
    expect(screen.getByText("No notifications yet")).toBeInTheDocument();
  });

  // 9. Filters out notifications targeted at other roles
  it("does not show notifications targeted at a role the current user does not have", () => {
    const n = makeNotification({
      id: "n1",
      title: "Admins only",
      target_roles: ["admin"],
    });
    renderCenter({ notifications: [n], profile: { id: "user-1", role: "pilot" } });
    openDropdown();
    expect(screen.queryByText("Admins only")).not.toBeInTheDocument();
    expect(screen.getByText("No notifications yet")).toBeInTheDocument();
  });

  // 10. Shows notification targeted at current user even if role doesn't match
  it("shows a notification targeted at the current user even when the role does not match", () => {
    const n = makeNotification({
      id: "n1",
      title: "Direct to you",
      target_user_id: "user-1",
      target_roles: ["admin"], // pilot doesn't have this role
    });
    renderCenter({ notifications: [n], profile: { id: "user-1", role: "pilot" } });
    openDropdown();
    expect(screen.getByText("Direct to you")).toBeInTheDocument();
  });

  // 11. Calls onMarkRead and onNavigate when notification is clicked
  it("calls onMarkRead and onNavigate when a notification is clicked", () => {
    const n = makeNotification({
      id: "n1",
      title: "Click me",
      link_tab: "reports",
      link_id: "report-42",
    });
    const onMarkRead = vi.fn();
    const onNavigate = vi.fn();
    renderCenter({ notifications: [n], reads: [], onMarkRead, onNavigate });
    openDropdown();
    fireEvent.click(screen.getByText("Click me"));
    expect(onMarkRead).toHaveBeenCalledWith("n1");
    expect(onNavigate).toHaveBeenCalledWith("reports", "report-42");
  });

  // 11b. Does not call onMarkRead again when the notification is already read
  it("does not call onMarkRead when clicking an already-read notification", () => {
    const n = makeNotification({ id: "n1", title: "Already read", link_tab: "reports", link_id: null });
    const onMarkRead = vi.fn();
    const onNavigate = vi.fn();
    renderCenter({ notifications: [n], reads: ["n1"], onMarkRead, onNavigate });
    openDropdown();
    fireEvent.click(screen.getByText("Already read"));
    expect(onMarkRead).not.toHaveBeenCalled();
    expect(onNavigate).toHaveBeenCalledWith("reports", null);
  });

  // 12. Shows "Mark all read" button when there are unread items
  it("shows the 'Mark all read' button in the dropdown when there are unread notifications", () => {
    const n = makeNotification({ id: "n1" });
    renderCenter({ notifications: [n], reads: [] });
    openDropdown();
    expect(screen.getByRole("button", { name: /mark all read/i })).toBeInTheDocument();
  });

  // 12b. Does NOT show "Mark all read" when everything is read
  it("does not show the 'Mark all read' button when all notifications are read", () => {
    const n = makeNotification({ id: "n1" });
    renderCenter({ notifications: [n], reads: ["n1"] });
    openDropdown();
    expect(screen.queryByRole("button", { name: /mark all read/i })).not.toBeInTheDocument();
  });

  // 13. Calls onMarkAllRead when "Mark all read" is clicked
  it("calls onMarkAllRead when the 'Mark all read' button is clicked", () => {
    const n = makeNotification({ id: "n1" });
    const onMarkAllRead = vi.fn();
    renderCenter({ notifications: [n], reads: [], onMarkAllRead });
    openDropdown();
    fireEvent.click(screen.getByRole("button", { name: /mark all read/i }));
    expect(onMarkAllRead).toHaveBeenCalledTimes(1);
  });

  // 14. Closes dropdown after clicking a notification
  it("closes the dropdown after a notification is clicked", () => {
    const n = makeNotification({ id: "n1", title: "Close me", link_tab: null });
    renderCenter({ notifications: [n] });
    openDropdown();
    // Dropdown is open — header is visible
    expect(screen.getByText("Notifications")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Close me"));
    // Dropdown header "Notifications" should no longer be in the document
    expect(screen.queryByText("Notifications")).not.toBeInTheDocument();
  });
});
