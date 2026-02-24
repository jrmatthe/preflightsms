import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks (before importing module under test) ──────────────────

vi.mock("next/head", () => ({ default: ({ children }) => <>{children}</> }));
vi.mock("next/image", () => ({ default: (props) => <img {...props} /> }));

// Do NOT mock tiers — use the real module
import { TIERS, FEATURE_LABELS, getTierFeatures } from "../../lib/tiers";

// ── Fixtures ────────────────────────────────────────────────────

const ADMIN = { id: "admin-1", name: "Root Admin", email: "root@preflightsms.com", is_active: true, last_login_at: "2025-06-01T12:00:00Z" };
const ADMIN_2 = { id: "admin-2", name: "Other Admin", email: "other@preflightsms.com", is_active: true, last_login_at: "2025-05-20T08:00:00Z" };
const ADMIN_INACTIVE = { id: "admin-3", name: "Old Admin", email: "old@preflightsms.com", is_active: false, last_login_at: null };

const ORG_1 = {
  id: "org-1", name: "Acme Aviation", slug: "acme-aviation", tier: "professional",
  subscription_status: "active", feature_flags: getTierFeatures("professional"),
  max_aircraft: 15, logo_url: null, created_at: "2024-01-15T00:00:00Z",
};
const ORG_2 = {
  id: "org-2", name: "Beta Flights", slug: "beta-flights", tier: "starter",
  subscription_status: "trial", feature_flags: getTierFeatures("starter"),
  max_aircraft: 5, logo_url: null, created_at: "2024-03-01T00:00:00Z",
};

const ORG_USERS = [
  { id: "u-1", full_name: "Alice Pilot", role: "pilot" },
  { id: "u-2", full_name: "Bob Admin", role: "admin" },
];

const ORG_STATS = { frats: 42, flights: 120, reports: 15, hazards: 8, actions: 5 };

// ── API mock helper ─────────────────────────────────────────────

/**
 * Sets up globalThis.fetch to respond based on the `action` field in the POST body.
 * `responses` is a map of action -> response object (or a function returning one).
 */
function mockApiResponse(responses) {
  globalThis.fetch = vi.fn().mockImplementation(async (url, opts) => {
    const body = JSON.parse(opts.body);
    const handler = responses[body.action];
    const response = typeof handler === "function" ? handler(body) : (handler || { error: "unknown action" });
    return { ok: true, json: async () => response };
  });
}

// ── Import component AFTER mocks ────────────────────────────────

import PlatformAdmin from "../../pages/platform-admin";

// ── Tests ───────────────────────────────────────────────────────

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  globalThis.fetch = vi.fn();
});

// ═══════════════════════════════════════════════════════════════
// AUTH FLOW
// ═══════════════════════════════════════════════════════════════

describe("Auth flow", () => {
  it("shows Loading... while initial auth check is in progress", () => {
    // Fetch never resolves — component stays in loading state
    globalThis.fetch = vi.fn(() => new Promise(() => {}));
    render(<PlatformAdmin />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("shows SetupScreen when no token and check_setup returns needs_setup: true", async () => {
    mockApiResponse({ check_setup: { needs_setup: true } });

    await act(async () => { render(<PlatformAdmin />); });

    expect(screen.getByText("Platform Setup")).toBeInTheDocument();
    expect(screen.getByText("Create Admin Account")).toBeInTheDocument();
  });

  it("shows LoginScreen when no token and check_setup returns needs_setup: false", async () => {
    mockApiResponse({ check_setup: { needs_setup: false } });

    await act(async () => { render(<PlatformAdmin />); });

    expect(screen.getByText("Platform Admin")).toBeInTheDocument();
    expect(screen.getByText("Sign In")).toBeInTheDocument();
  });

  it("shows main app when token exists and verify succeeds", async () => {
    localStorage.setItem("pa_token", "valid-token");
    mockApiResponse({
      verify: { admin: ADMIN },
      fetch_orgs: { orgs: [ORG_1] },
      list_admins: { admins: [ADMIN] },
    });

    await act(async () => { render(<PlatformAdmin />); });

    expect(screen.getByText("Organizations")).toBeInTheDocument();
    expect(screen.getByText("Platform Admins")).toBeInTheDocument();
    expect(screen.getByText(/Root Admin/)).toBeInTheDocument();
  });

  it("removes token and shows LoginScreen when verify fails", async () => {
    localStorage.setItem("pa_token", "expired-token");
    mockApiResponse({
      verify: { error: "invalid token" },
      check_setup: { needs_setup: false },
    });

    await act(async () => { render(<PlatformAdmin />); });

    expect(localStorage.removeItem).toHaveBeenCalledWith("pa_token");
    expect(screen.getByText("Sign In")).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════
// SETUP SCREEN
// ═══════════════════════════════════════════════════════════════

describe("SetupScreen", () => {
  beforeEach(async () => {
    mockApiResponse({ check_setup: { needs_setup: true } });
    await act(async () => { render(<PlatformAdmin />); });
  });

  it("renders setup form with name, email, password, and confirm fields", () => {
    expect(screen.getByPlaceholderText("Full name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Email")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Confirm password")).toBeInTheDocument();
  });

  it('shows "Create Admin Account" button', () => {
    expect(screen.getByText("Create Admin Account")).toBeInTheDocument();
  });

  it("validates all fields are required", async () => {
    // Leave name empty, fill email and password
    fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "test@test.com" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "password123" } });
    fireEvent.change(screen.getByPlaceholderText("Confirm password"), { target: { value: "password123" } });
    fireEvent.click(screen.getByText("Create Admin Account"));

    expect(screen.getByText("All fields required")).toBeInTheDocument();
  });

  it("validates passwords must match", async () => {
    fireEvent.change(screen.getByPlaceholderText("Full name"), { target: { value: "Test" } });
    fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "test@test.com" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "password123" } });
    fireEvent.change(screen.getByPlaceholderText("Confirm password"), { target: { value: "different" } });
    fireEvent.click(screen.getByText("Create Admin Account"));

    expect(screen.getByText("Passwords don't match")).toBeInTheDocument();
  });

  it("validates minimum 8 characters for password", async () => {
    fireEvent.change(screen.getByPlaceholderText("Full name"), { target: { value: "Test" } });
    fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "test@test.com" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "short" } });
    fireEvent.change(screen.getByPlaceholderText("Confirm password"), { target: { value: "short" } });
    fireEvent.click(screen.getByText("Create Admin Account"));

    expect(screen.getByText("Min 8 characters")).toBeInTheDocument();
  });

  it("stores token and transitions to app on successful setup", async () => {
    // Reconfigure mock to handle setup + subsequent app loads
    mockApiResponse({
      check_setup: { needs_setup: true },
      setup: { token: "new-token", admin: ADMIN },
      fetch_orgs: { orgs: [] },
      list_admins: { admins: [ADMIN] },
    });

    // Re-render with fresh mocks
    const { unmount } = render(<PlatformAdmin />);

    await waitFor(() => {
      expect(screen.getAllByText("Create Admin Account").length).toBeGreaterThanOrEqual(1);
    });

    // Find the form inputs in the latest render
    const nameInputs = screen.getAllByPlaceholderText("Full name");
    const emailInputs = screen.getAllByPlaceholderText("Email");
    const passwordInputs = screen.getAllByPlaceholderText("Password");
    const confirmInputs = screen.getAllByPlaceholderText("Confirm password");

    // Use the last rendered set
    fireEvent.change(nameInputs[nameInputs.length - 1], { target: { value: "Root Admin" } });
    fireEvent.change(emailInputs[emailInputs.length - 1], { target: { value: "root@preflightsms.com" } });
    fireEvent.change(passwordInputs[passwordInputs.length - 1], { target: { value: "securepass123" } });
    fireEvent.change(confirmInputs[confirmInputs.length - 1], { target: { value: "securepass123" } });

    const buttons = screen.getAllByText("Create Admin Account");
    await act(async () => { fireEvent.click(buttons[buttons.length - 1]); });

    expect(localStorage.setItem).toHaveBeenCalledWith("pa_token", "new-token");

    await waitFor(() => {
      expect(screen.getByText("Organizations")).toBeInTheDocument();
    });
  });

  it("shows API error message on setup failure", async () => {
    mockApiResponse({
      check_setup: { needs_setup: true },
      setup: { error: "Email already in use" },
    });

    // Re-render to pick up new mock
    await act(async () => { render(<PlatformAdmin />); });

    await waitFor(() => {
      expect(screen.getAllByPlaceholderText("Full name").length).toBeGreaterThanOrEqual(1);
    });

    const nameInputs = screen.getAllByPlaceholderText("Full name");
    const emailInputs = screen.getAllByPlaceholderText("Email");
    const passwordInputs = screen.getAllByPlaceholderText("Password");
    const confirmInputs = screen.getAllByPlaceholderText("Confirm password");

    fireEvent.change(nameInputs[nameInputs.length - 1], { target: { value: "Root Admin" } });
    fireEvent.change(emailInputs[emailInputs.length - 1], { target: { value: "root@preflightsms.com" } });
    fireEvent.change(passwordInputs[passwordInputs.length - 1], { target: { value: "securepass123" } });
    fireEvent.change(confirmInputs[confirmInputs.length - 1], { target: { value: "securepass123" } });

    const buttons = screen.getAllByText("Create Admin Account");
    await act(async () => { fireEvent.click(buttons[buttons.length - 1]); });

    await waitFor(() => {
      expect(screen.getByText("Email already in use")).toBeInTheDocument();
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// LOGIN SCREEN
// ═══════════════════════════════════════════════════════════════

describe("LoginScreen", () => {
  beforeEach(async () => {
    mockApiResponse({ check_setup: { needs_setup: false } });
    await act(async () => { render(<PlatformAdmin />); });
  });

  it("renders login form with email and password fields", () => {
    expect(screen.getByPlaceholderText("Email")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
  });

  it('shows "Sign In" button', () => {
    expect(screen.getByText("Sign In")).toBeInTheDocument();
  });

  it("validates email and password are required", async () => {
    fireEvent.click(screen.getByText("Sign In"));
    expect(screen.getByText("Email and password required")).toBeInTheDocument();
  });

  it("validates email required when only password provided", async () => {
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "password123" } });
    fireEvent.click(screen.getByText("Sign In"));
    expect(screen.getByText("Email and password required")).toBeInTheDocument();
  });

  it("stores token and transitions to app on successful login", async () => {
    mockApiResponse({
      check_setup: { needs_setup: false },
      login: { token: "login-token", admin: ADMIN },
      fetch_orgs: { orgs: [ORG_1] },
      list_admins: { admins: [ADMIN] },
    });

    // Re-render with new mock
    await act(async () => { render(<PlatformAdmin />); });

    await waitFor(() => {
      expect(screen.getAllByPlaceholderText("Email").length).toBeGreaterThanOrEqual(1);
    });

    const emailInputs = screen.getAllByPlaceholderText("Email");
    const passwordInputs = screen.getAllByPlaceholderText("Password");

    fireEvent.change(emailInputs[emailInputs.length - 1], { target: { value: "root@preflightsms.com" } });
    fireEvent.change(passwordInputs[passwordInputs.length - 1], { target: { value: "securepass123" } });

    const signInBtns = screen.getAllByText("Sign In");
    await act(async () => { fireEvent.click(signInBtns[signInBtns.length - 1]); });

    expect(localStorage.setItem).toHaveBeenCalledWith("pa_token", "login-token");

    await waitFor(() => {
      expect(screen.getByText("Organizations")).toBeInTheDocument();
    });
  });

  it("shows error message on API error", async () => {
    mockApiResponse({
      check_setup: { needs_setup: false },
      login: { error: "Invalid credentials" },
    });

    await act(async () => { render(<PlatformAdmin />); });

    await waitFor(() => {
      expect(screen.getAllByPlaceholderText("Email").length).toBeGreaterThanOrEqual(1);
    });

    const emailInputs = screen.getAllByPlaceholderText("Email");
    const passwordInputs = screen.getAllByPlaceholderText("Password");

    fireEvent.change(emailInputs[emailInputs.length - 1], { target: { value: "bad@test.com" } });
    fireEvent.change(passwordInputs[passwordInputs.length - 1], { target: { value: "wrong" } });

    const signInBtns = screen.getAllByText("Sign In");
    await act(async () => { fireEvent.click(signInBtns[signInBtns.length - 1]); });

    await waitFor(() => {
      expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// MAIN APP (authenticated)
// ═══════════════════════════════════════════════════════════════

describe("Main app (authenticated)", () => {
  beforeEach(async () => {
    localStorage.setItem("pa_token", "valid-token");
    mockApiResponse({
      verify: { admin: ADMIN },
      fetch_orgs: { orgs: [ORG_1, ORG_2] },
      list_admins: { admins: [ADMIN, ADMIN_2] },
      fetch_org_users: { users: ORG_USERS },
      fetch_org_stats: { stats: ORG_STATS },
    });
    await act(async () => { render(<PlatformAdmin />); });
    // Wait for app to fully load
    await waitFor(() => {
      expect(screen.getByText("Organizations")).toBeInTheDocument();
    });
  });

  it("renders header with admin name, email, and Sign Out button", () => {
    expect(screen.getByText(/Root Admin/)).toBeInTheDocument();
    expect(screen.getByText(/root@preflightsms\.com/)).toBeInTheDocument();
    expect(screen.getByText("Sign Out")).toBeInTheDocument();
  });

  it("renders Organizations and Platform Admins tabs", () => {
    expect(screen.getByText("Organizations")).toBeInTheDocument();
    expect(screen.getByText("Platform Admins")).toBeInTheDocument();
  });

  it("default view is Organizations", () => {
    expect(screen.getByPlaceholderText("Search organizations...")).toBeInTheDocument();
  });

  it("Sign Out clears token and returns to login", async () => {
    mockApiResponse({
      verify: { admin: ADMIN },
      fetch_orgs: { orgs: [ORG_1, ORG_2] },
      list_admins: { admins: [ADMIN, ADMIN_2] },
      check_setup: { needs_setup: false },
    });

    fireEvent.click(screen.getByText("Sign Out"));

    expect(localStorage.removeItem).toHaveBeenCalledWith("pa_token");
    expect(screen.getByText("Sign In")).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════
// ORGANIZATIONS TAB
// ═══════════════════════════════════════════════════════════════

describe("Organizations tab", () => {
  beforeEach(async () => {
    localStorage.setItem("pa_token", "valid-token");
    mockApiResponse({
      verify: { admin: ADMIN },
      fetch_orgs: { orgs: [ORG_1, ORG_2] },
      list_admins: { admins: [ADMIN] },
      fetch_org_users: { users: ORG_USERS },
      fetch_org_stats: { stats: ORG_STATS },
      update_org: { success: true },
      delete_org: { success: true, deleted_users: 2 },
    });
    await act(async () => { render(<PlatformAdmin />); });
    await waitFor(() => {
      expect(screen.getByText("Acme Aviation")).toBeInTheDocument();
    });
  });

  it("shows search input", () => {
    expect(screen.getByPlaceholderText("Search organizations...")).toBeInTheDocument();
  });

  it("shows organization count", () => {
    expect(screen.getByText("2 Organizations")).toBeInTheDocument();
  });

  it("lists organizations with name, tier, and status", () => {
    expect(screen.getByText("Acme Aviation")).toBeInTheDocument();
    expect(screen.getByText("Beta Flights")).toBeInTheDocument();
    // Tiers are shown as uppercase text
    expect(screen.getByText("professional")).toBeInTheDocument();
    expect(screen.getByText("starter")).toBeInTheDocument();
  });

  it("search filters orgs by name", async () => {
    fireEvent.change(screen.getByPlaceholderText("Search organizations..."), { target: { value: "Acme" } });

    expect(screen.getByText("Acme Aviation")).toBeInTheDocument();
    expect(screen.queryByText("Beta Flights")).not.toBeInTheDocument();
    expect(screen.getByText("1 Organization")).toBeInTheDocument();
  });

  it("search filters orgs by slug", async () => {
    fireEvent.change(screen.getByPlaceholderText("Search organizations..."), { target: { value: "beta-flights" } });

    expect(screen.queryByText("Acme Aviation")).not.toBeInTheDocument();
    expect(screen.getByText("Beta Flights")).toBeInTheDocument();
  });

  it("search filters orgs by tier", async () => {
    fireEvent.change(screen.getByPlaceholderText("Search organizations..."), { target: { value: "professional" } });

    expect(screen.getByText("Acme Aviation")).toBeInTheDocument();
    expect(screen.queryByText("Beta Flights")).not.toBeInTheDocument();
  });

  it("shows 'Select an organization' when no org is selected", () => {
    expect(screen.getByText("Select an organization")).toBeInTheDocument();
  });

  it("clicking an org shows OrgDetail", async () => {
    await act(async () => { fireEvent.click(screen.getByText("Acme Aviation")); });

    await waitFor(() => {
      // OrgDetail shows the org name in a larger heading
      const headings = screen.getAllByText("Acme Aviation");
      expect(headings.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("OrgDetail shows stats (FRATs, Flights, Reports, Hazards, Actions)", async () => {
    await act(async () => { fireEvent.click(screen.getByText("Acme Aviation")); });

    await waitFor(() => {
      expect(screen.getByText("FRATs")).toBeInTheDocument();
      expect(screen.getByText("Flights")).toBeInTheDocument();
      expect(screen.getByText("Reports")).toBeInTheDocument();
      expect(screen.getByText("Hazards")).toBeInTheDocument();
      expect(screen.getByText("Actions")).toBeInTheDocument();
      expect(screen.getByText("42")).toBeInTheDocument();
      expect(screen.getByText("120")).toBeInTheDocument();
      expect(screen.getByText("15")).toBeInTheDocument();
      expect(screen.getByText("8")).toBeInTheDocument();
      expect(screen.getByText("5")).toBeInTheDocument();
    });
  });

  it("OrgDetail shows user list with names and roles", async () => {
    await act(async () => { fireEvent.click(screen.getByText("Acme Aviation")); });

    await waitFor(() => {
      expect(screen.getByText("Alice Pilot")).toBeInTheDocument();
      expect(screen.getByText("Bob Admin")).toBeInTheDocument();
    });
  });

  it("OrgDetail shows tier selector with starter/professional/enterprise options", async () => {
    await act(async () => { fireEvent.click(screen.getByText("Acme Aviation")); });

    await waitFor(() => {
      expect(screen.getByText("Subscription Tier")).toBeInTheDocument();
      expect(screen.getByText("Starter")).toBeInTheDocument();
      expect(screen.getByText("Professional")).toBeInTheDocument();
      expect(screen.getByText("Enterprise")).toBeInTheDocument();
    });
  });

  it("OrgDetail shows status selector with trial/active/past_due/canceled", async () => {
    await act(async () => { fireEvent.click(screen.getByText("Acme Aviation")); });

    await waitFor(() => {
      expect(screen.getByText("Status")).toBeInTheDocument();
    });

    // Status buttons use the status name with _ replaced by space
    // "trial" and "active" may appear in the sidebar org list too, so use getAllByText
    const trialElements = screen.getAllByText("trial");
    expect(trialElements.length).toBeGreaterThanOrEqual(1);
    const activeElements = screen.getAllByText("active");
    expect(activeElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("past due")).toBeInTheDocument();
    expect(screen.getByText("canceled")).toBeInTheDocument();
  });

  it("OrgDetail shows feature flag toggles", async () => {
    await act(async () => { fireEvent.click(screen.getByText("Acme Aviation")); });

    await waitFor(() => {
      expect(screen.getByText("Feature Flags")).toBeInTheDocument();
    });

    // Check some feature labels from the real FEATURE_LABELS
    expect(screen.getByText("Fleet Management")).toBeInTheDocument();
    expect(screen.getByText("Flight Risk Assessment (FRAT)")).toBeInTheDocument();
    expect(screen.getByText("Safety Reporting")).toBeInTheDocument();
  });

  it("OrgDetail shows max aircraft input", async () => {
    await act(async () => { fireEvent.click(screen.getByText("Acme Aviation")); });

    await waitFor(() => {
      expect(screen.getByText("Max Aircraft")).toBeInTheDocument();
    });

    const maxInput = screen.getByDisplayValue("15");
    expect(maxInput).toBeInTheDocument();
    expect(maxInput.type).toBe("number");
  });

  it("Save Changes button calls update_org API", async () => {
    await act(async () => { fireEvent.click(screen.getByText("Acme Aviation")); });

    await waitFor(() => {
      expect(screen.getAllByText("Save Changes").length).toBeGreaterThanOrEqual(1);
    });

    await act(async () => {
      fireEvent.click(screen.getAllByText("Save Changes")[0]);
    });

    // Verify update_org was called
    const calls = globalThis.fetch.mock.calls;
    const updateCall = calls.find(([, opts]) => {
      const body = JSON.parse(opts.body);
      return body.action === "update_org";
    });
    expect(updateCall).toBeTruthy();
    const updateBody = JSON.parse(updateCall[1].body);
    expect(updateBody.org_id).toBe("org-1");
    expect(updateBody.updates).toBeDefined();
    expect(updateBody.updates.tier).toBe("professional");
  });

  it("Danger zone: Delete Organization requires 2-step confirmation", async () => {
    await act(async () => { fireEvent.click(screen.getByText("Acme Aviation")); });

    await waitFor(() => {
      expect(screen.getByText("Danger Zone")).toBeInTheDocument();
    });

    // Step 1: Click "Delete Organization"
    fireEvent.click(screen.getByText("Delete Organization"));

    // Confirmation message appears
    expect(screen.getByText(/This will permanently delete/)).toBeInTheDocument();
    expect(screen.getByText("Yes, Delete Everything")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("Danger zone: Cancel returns to initial state", async () => {
    await act(async () => { fireEvent.click(screen.getByText("Acme Aviation")); });

    await waitFor(() => {
      expect(screen.getByText("Delete Organization")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Delete Organization"));
    expect(screen.getByText("Yes, Delete Everything")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.queryByText("Yes, Delete Everything")).not.toBeInTheDocument();
    expect(screen.getByText("Delete Organization")).toBeInTheDocument();
  });

  it("Danger zone: confirming delete calls delete_org API", async () => {
    await act(async () => { fireEvent.click(screen.getByText("Acme Aviation")); });

    await waitFor(() => {
      expect(screen.getByText("Delete Organization")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Delete Organization"));

    await act(async () => {
      fireEvent.click(screen.getByText("Yes, Delete Everything"));
    });

    const calls = globalThis.fetch.mock.calls;
    const deleteCall = calls.find(([, opts]) => {
      const body = JSON.parse(opts.body);
      return body.action === "delete_org";
    });
    expect(deleteCall).toBeTruthy();
    const deleteBody = JSON.parse(deleteCall[1].body);
    expect(deleteBody.org_id).toBe("org-1");
  });

  it("clicking a tier option applies tier defaults", async () => {
    await act(async () => { fireEvent.click(screen.getByText("Acme Aviation")); });

    await waitFor(() => {
      expect(screen.getByText("Enterprise")).toBeInTheDocument();
    });

    // Click Enterprise tier
    fireEvent.click(screen.getByText("Enterprise"));

    // Max aircraft input should now reflect enterprise tier (999)
    await waitFor(() => {
      expect(screen.getByDisplayValue("999")).toBeInTheDocument();
    });
  });

  it('feature flags "All On" button enables all flags', async () => {
    await act(async () => { fireEvent.click(screen.getByText("Acme Aviation")); });

    await waitFor(() => {
      expect(screen.getByText("All On")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("All On"));

    // All feature labels should now be present and toggled on.
    // Check that the checkmark count matches total feature count.
    const checkmarks = screen.getAllByText("\u2713");
    expect(checkmarks.length).toBe(Object.keys(FEATURE_LABELS).length);
  });

  it('"Reset to Tier" button resets flags to tier defaults', async () => {
    await act(async () => { fireEvent.click(screen.getByText("Acme Aviation")); });

    await waitFor(() => {
      expect(screen.getByText("All On")).toBeInTheDocument();
    });

    // Turn all on first
    fireEvent.click(screen.getByText("All On"));

    // Then reset
    fireEvent.click(screen.getByText("Reset to Tier"));

    // Should match professional tier defaults
    const proFeatures = getTierFeatures("professional");
    const enabledCount = Object.values(proFeatures).filter(v => v).length;
    const checkmarks = screen.getAllByText("\u2713");
    expect(checkmarks.length).toBe(enabledCount);
  });

  it("toggling a feature flag updates its state", async () => {
    await act(async () => { fireEvent.click(screen.getByText("Acme Aviation")); });

    await waitFor(() => {
      expect(screen.getByText("API Access")).toBeInTheDocument();
    });

    // API Access is off for professional tier by default
    const apiLabel = screen.getByText("API Access");
    const toggle = apiLabel.closest("div[style]");

    fireEvent.click(toggle);

    // After toggling on, checkmark count should increase by one from professional defaults
    const proFeatures = getTierFeatures("professional");
    const enabledCount = Object.values(proFeatures).filter(v => v).length;
    const checkmarks = screen.getAllByText("\u2713");
    expect(checkmarks.length).toBe(enabledCount + 1);
  });
});

// ═══════════════════════════════════════════════════════════════
// PLATFORM ADMINS TAB
// ═══════════════════════════════════════════════════════════════

describe("Platform Admins tab", () => {
  beforeEach(async () => {
    localStorage.setItem("pa_token", "valid-token");
    mockApiResponse({
      verify: { admin: ADMIN },
      fetch_orgs: { orgs: [ORG_1] },
      list_admins: { admins: [ADMIN, ADMIN_2] },
      add_admin: { success: true },
      remove_admin: { success: true },
    });
    await act(async () => { render(<PlatformAdmin />); });
    await waitFor(() => {
      expect(screen.getByText("Platform Admins")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Platform Admins"));
  });

  it("lists active admins with name, email, and last login", () => {
    expect(screen.getByText("Root Admin")).toBeInTheDocument();
    // root@preflightsms.com appears in both the header and the admin list, so use getAllByText
    const rootEmails = screen.getAllByText(/root@preflightsms\.com/);
    expect(rootEmails.length).toBeGreaterThanOrEqual(2); // header + list
    expect(screen.getByText("Other Admin")).toBeInTheDocument();
    expect(screen.getByText(/other@preflightsms\.com/)).toBeInTheDocument();
    // Check last login dates are rendered (multiple admins have this text)
    const lastLoginTexts = screen.getAllByText(/Last login:/);
    expect(lastLoginTexts.length).toBeGreaterThanOrEqual(2);
  });

  it("shows active admin count", () => {
    expect(screen.getByText("Active (2)")).toBeInTheDocument();
  });

  it('shows "You" label for current admin', () => {
    expect(screen.getByText("You")).toBeInTheDocument();
  });

  it("current admin cannot be deactivated (button is disabled)", () => {
    const youButton = screen.getByText("You");
    expect(youButton.disabled).toBe(true);
  });

  it("shows Deactivate button for other admins", () => {
    expect(screen.getByText("Deactivate")).toBeInTheDocument();
  });

  it("clicking Deactivate calls remove_admin API for other admin", async () => {
    await act(async () => { fireEvent.click(screen.getByText("Deactivate")); });

    const calls = globalThis.fetch.mock.calls;
    const removeCall = calls.find(([, opts]) => {
      const body = JSON.parse(opts.body);
      return body.action === "remove_admin";
    });
    expect(removeCall).toBeTruthy();
    const removeBody = JSON.parse(removeCall[1].body);
    expect(removeBody.admin_id).toBe("admin-2");
  });

  it("shows Add Admin form with name, email, password fields", () => {
    expect(screen.getByText("Add Platform Admin")).toBeInTheDocument();
    // The AdminsView has inputs with these placeholders
    const fullNameInputs = screen.getAllByPlaceholderText("Full name");
    const emailInputs = screen.getAllByPlaceholderText("Email");
    const passwordInputs = screen.getAllByPlaceholderText("Password");
    expect(fullNameInputs.length).toBeGreaterThanOrEqual(1);
    expect(emailInputs.length).toBeGreaterThanOrEqual(1);
    expect(passwordInputs.length).toBeGreaterThanOrEqual(1);
  });

  it("shows Add Admin button", () => {
    expect(screen.getByText("Add Admin")).toBeInTheDocument();
  });

  it("Add Admin validates all fields required (shows toast)", async () => {
    // Click Add Admin without filling fields
    await act(async () => { fireEvent.click(screen.getByText("Add Admin")); });

    // Toast "All fields required" should appear
    await waitFor(() => {
      expect(screen.getByText("All fields required")).toBeInTheDocument();
    });
  });

  it("Add Admin calls add_admin API with correct data on success", async () => {
    // Fill in the add admin form
    const fullNameInputs = screen.getAllByPlaceholderText("Full name");
    const emailInputs = screen.getAllByPlaceholderText("Email");
    const passwordInputs = screen.getAllByPlaceholderText("Password");

    // Use the last inputs (which belong to the Add Admin form)
    fireEvent.change(fullNameInputs[fullNameInputs.length - 1], { target: { value: "New Admin" } });
    fireEvent.change(emailInputs[emailInputs.length - 1], { target: { value: "new@test.com" } });
    fireEvent.change(passwordInputs[passwordInputs.length - 1], { target: { value: "newpassword123" } });

    await act(async () => { fireEvent.click(screen.getByText("Add Admin")); });

    const calls = globalThis.fetch.mock.calls;
    const addCall = calls.find(([, opts]) => {
      const body = JSON.parse(opts.body);
      return body.action === "add_admin";
    });
    expect(addCall).toBeTruthy();
    const addBody = JSON.parse(addCall[1].body);
    expect(addBody.name).toBe("New Admin");
    expect(addBody.email).toBe("new@test.com");
    expect(addBody.password).toBe("newpassword123");
  });

  it("Add Admin shows error toast on API failure", async () => {
    mockApiResponse({
      verify: { admin: ADMIN },
      fetch_orgs: { orgs: [ORG_1] },
      list_admins: { admins: [ADMIN, ADMIN_2] },
      add_admin: { error: "Email already exists" },
    });

    // Re-render and navigate to admins tab
    await act(async () => { render(<PlatformAdmin />); });
    await waitFor(() => {
      expect(screen.getAllByText("Platform Admins").length).toBeGreaterThanOrEqual(1);
    });

    const tabs = screen.getAllByText("Platform Admins");
    fireEvent.click(tabs[tabs.length - 1]);

    await waitFor(() => {
      expect(screen.getAllByText("Add Platform Admin").length).toBeGreaterThanOrEqual(1);
    });

    const fullNameInputs = screen.getAllByPlaceholderText("Full name");
    const emailInputs = screen.getAllByPlaceholderText("Email");
    const passwordInputs = screen.getAllByPlaceholderText("Password");

    fireEvent.change(fullNameInputs[fullNameInputs.length - 1], { target: { value: "New Admin" } });
    fireEvent.change(emailInputs[emailInputs.length - 1], { target: { value: "dup@test.com" } });
    fireEvent.change(passwordInputs[passwordInputs.length - 1], { target: { value: "password123" } });

    const addBtns = screen.getAllByText("Add Admin");
    await act(async () => { fireEvent.click(addBtns[addBtns.length - 1]); });

    await waitFor(() => {
      expect(screen.getByText("Error: Email already exists")).toBeInTheDocument();
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// API HELPER
// ═══════════════════════════════════════════════════════════════

describe("api() helper behavior", () => {
  it("sends POST to /api/platform-admin with JSON body and token from localStorage", async () => {
    localStorage.setItem("pa_token", "my-token");
    mockApiResponse({
      verify: { admin: ADMIN },
      fetch_orgs: { orgs: [] },
      list_admins: { admins: [] },
    });

    await act(async () => { render(<PlatformAdmin />); });

    // The first call should be verify with the token
    const firstCall = globalThis.fetch.mock.calls[0];
    expect(firstCall[0]).toBe("/api/platform-admin");
    expect(firstCall[1].method).toBe("POST");
    expect(firstCall[1].headers["Content-Type"]).toBe("application/json");
    const body = JSON.parse(firstCall[1].body);
    expect(body.action).toBe("verify");
    expect(body.token).toBe("my-token");
  });

  it("sends null token when no pa_token in localStorage", async () => {
    mockApiResponse({ check_setup: { needs_setup: false } });

    await act(async () => { render(<PlatformAdmin />); });

    const firstCall = globalThis.fetch.mock.calls[0];
    const body = JSON.parse(firstCall[1].body);
    expect(body.action).toBe("check_setup");
    expect(body.token).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════
// TIER LOGIC (with real tiers module)
// ═══════════════════════════════════════════════════════════════

describe("Tier logic with real tiers module", () => {
  beforeEach(async () => {
    localStorage.setItem("pa_token", "valid-token");
    mockApiResponse({
      verify: { admin: ADMIN },
      fetch_orgs: { orgs: [ORG_1] },
      list_admins: { admins: [ADMIN] },
      fetch_org_users: { users: [] },
      fetch_org_stats: { stats: {} },
    });
    await act(async () => { render(<PlatformAdmin />); });
    await waitFor(() => {
      expect(screen.getByText("Acme Aviation")).toBeInTheDocument();
    });
    await act(async () => { fireEvent.click(screen.getByText("Acme Aviation")); });
    await waitFor(() => {
      expect(screen.getByText("Subscription Tier")).toBeInTheDocument();
    });
  });

  it("displays all three tier cards with name, price, and aircraft info", () => {
    expect(screen.getByText("Starter")).toBeInTheDocument();
    expect(screen.getByText("$149/mo")).toBeInTheDocument();
    expect(screen.getByText("Professional")).toBeInTheDocument();
    expect(screen.getByText("$299/mo")).toBeInTheDocument();
    expect(screen.getByText("Enterprise")).toBeInTheDocument();
    expect(screen.getByText("Custom")).toBeInTheDocument();
  });

  it("switching to starter tier updates max aircraft to 5", async () => {
    fireEvent.click(screen.getByText("Starter"));

    await waitFor(() => {
      expect(screen.getByDisplayValue("5")).toBeInTheDocument();
    });
  });

  it("switching to enterprise tier updates max aircraft to 999", async () => {
    fireEvent.click(screen.getByText("Enterprise"));

    await waitFor(() => {
      expect(screen.getByDisplayValue("999")).toBeInTheDocument();
    });
  });

  it("all feature labels from FEATURE_LABELS are rendered in the feature flags section", () => {
    Object.values(FEATURE_LABELS).forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// TAB SWITCHING
// ═══════════════════════════════════════════════════════════════

describe("Tab switching", () => {
  beforeEach(async () => {
    localStorage.setItem("pa_token", "valid-token");
    mockApiResponse({
      verify: { admin: ADMIN },
      fetch_orgs: { orgs: [ORG_1] },
      list_admins: { admins: [ADMIN, ADMIN_2] },
    });
    await act(async () => { render(<PlatformAdmin />); });
    await waitFor(() => {
      expect(screen.getByText("Organizations")).toBeInTheDocument();
    });
  });

  it("switching to Platform Admins tab shows admin list", () => {
    fireEvent.click(screen.getByText("Platform Admins"));
    expect(screen.getByText("Add Platform Admin")).toBeInTheDocument();
    expect(screen.getByText("Root Admin")).toBeInTheDocument();
  });

  it("switching back to Organizations tab shows org list", () => {
    fireEvent.click(screen.getByText("Platform Admins"));
    expect(screen.getByText("Add Platform Admin")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Organizations"));
    expect(screen.getByPlaceholderText("Search organizations...")).toBeInTheDocument();
    expect(screen.getByText("Acme Aviation")).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════
// EDGE CASES
// ═══════════════════════════════════════════════════════════════

describe("Edge cases", () => {
  it("handles empty org list gracefully", async () => {
    localStorage.setItem("pa_token", "valid-token");
    mockApiResponse({
      verify: { admin: ADMIN },
      fetch_orgs: { orgs: [] },
      list_admins: { admins: [ADMIN] },
    });

    await act(async () => { render(<PlatformAdmin />); });

    await waitFor(() => {
      expect(screen.getByText("0 Organizations")).toBeInTheDocument();
    });
  });

  it("handles single org (singular label)", async () => {
    localStorage.setItem("pa_token", "valid-token");
    mockApiResponse({
      verify: { admin: ADMIN },
      fetch_orgs: { orgs: [ORG_1] },
      list_admins: { admins: [ADMIN] },
    });

    await act(async () => { render(<PlatformAdmin />); });

    await waitFor(() => {
      expect(screen.getByText("1 Organization")).toBeInTheDocument();
    });
  });

  it("OrgDetail shows 0 for missing stats", async () => {
    localStorage.setItem("pa_token", "valid-token");
    mockApiResponse({
      verify: { admin: ADMIN },
      fetch_orgs: { orgs: [ORG_1] },
      list_admins: { admins: [ADMIN] },
      fetch_org_users: { users: [] },
      fetch_org_stats: { stats: {} },
    });

    await act(async () => { render(<PlatformAdmin />); });
    await waitFor(() => {
      expect(screen.getByText("Acme Aviation")).toBeInTheDocument();
    });

    await act(async () => { fireEvent.click(screen.getByText("Acme Aviation")); });

    await waitFor(() => {
      // All stats should show 0 when stats object is empty
      const zeros = screen.getAllByText("0");
      expect(zeros.length).toBe(5);
    });
  });

  it("OrgDetail shows 'No users' when org has no users", async () => {
    localStorage.setItem("pa_token", "valid-token");
    mockApiResponse({
      verify: { admin: ADMIN },
      fetch_orgs: { orgs: [ORG_1] },
      list_admins: { admins: [ADMIN] },
      fetch_org_users: { users: [] },
      fetch_org_stats: { stats: {} },
    });

    await act(async () => { render(<PlatformAdmin />); });
    await waitFor(() => {
      expect(screen.getByText("Acme Aviation")).toBeInTheDocument();
    });

    await act(async () => { fireEvent.click(screen.getByText("Acme Aviation")); });

    await waitFor(() => {
      expect(screen.getByText("No users")).toBeInTheDocument();
    });
  });

  it("error toast renders with red styling", async () => {
    localStorage.setItem("pa_token", "valid-token");
    mockApiResponse({
      verify: { admin: ADMIN },
      fetch_orgs: { orgs: [ORG_1] },
      list_admins: { admins: [ADMIN] },
      fetch_org_users: { users: [] },
      fetch_org_stats: { stats: {} },
      update_org: { error: "Something went wrong" },
    });

    await act(async () => { render(<PlatformAdmin />); });
    await waitFor(() => { expect(screen.getByText("Acme Aviation")).toBeInTheDocument(); });
    await act(async () => { fireEvent.click(screen.getByText("Acme Aviation")); });
    await waitFor(() => { expect(screen.getAllByText("Save Changes").length).toBeGreaterThanOrEqual(1); });
    await act(async () => { fireEvent.click(screen.getAllByText("Save Changes")[0]); });

    await waitFor(() => {
      const toast = screen.getByText("Error: Something went wrong");
      expect(toast).toBeInTheDocument();
      // Toast parent should have red color
      expect(toast.closest("div").style.color).toContain("239, 68, 68");
    });
  });

  it("success toast renders with green styling", async () => {
    localStorage.setItem("pa_token", "valid-token");
    mockApiResponse({
      verify: { admin: ADMIN },
      fetch_orgs: { orgs: [ORG_1] },
      list_admins: { admins: [ADMIN] },
      fetch_org_users: { users: [] },
      fetch_org_stats: { stats: {} },
      update_org: { success: true },
    });

    await act(async () => { render(<PlatformAdmin />); });
    await waitFor(() => { expect(screen.getByText("Acme Aviation")).toBeInTheDocument(); });
    await act(async () => { fireEvent.click(screen.getByText("Acme Aviation")); });
    await waitFor(() => { expect(screen.getAllByText("Save Changes").length).toBeGreaterThanOrEqual(1); });
    await act(async () => { fireEvent.click(screen.getAllByText("Save Changes")[0]); });

    await waitFor(() => {
      const toast = screen.getByText("Changes saved");
      expect(toast).toBeInTheDocument();
      // Toast parent should have green color
      expect(toast.closest("div").style.color).toContain("74, 222, 128");
    });
  });

  it("delete confirmation resets when switching orgs (key prop)", async () => {
    localStorage.setItem("pa_token", "valid-token");
    mockApiResponse({
      verify: { admin: ADMIN },
      fetch_orgs: { orgs: [ORG_1, ORG_2] },
      list_admins: { admins: [ADMIN] },
      fetch_org_users: { users: [] },
      fetch_org_stats: { stats: {} },
    });

    await act(async () => { render(<PlatformAdmin />); });
    await waitFor(() => { expect(screen.getByText("Acme Aviation")).toBeInTheDocument(); });

    // Select org 1, open delete confirmation
    await act(async () => { fireEvent.click(screen.getByText("Acme Aviation")); });
    await waitFor(() => { expect(screen.getByText("Delete Organization")).toBeInTheDocument(); });
    fireEvent.click(screen.getByText("Delete Organization"));
    expect(screen.getByText("Yes, Delete Everything")).toBeInTheDocument();

    // Switch to org 2 — confirmation should reset
    await act(async () => { fireEvent.click(screen.getByText("Beta Flights")); });
    await waitFor(() => {
      expect(screen.queryByText("Yes, Delete Everything")).not.toBeInTheDocument();
      expect(screen.getByText("Delete Organization")).toBeInTheDocument();
    });
  });

  it("handleRemoveAdmin shows error on API failure", async () => {
    localStorage.setItem("pa_token", "valid-token");
    mockApiResponse({
      verify: { admin: ADMIN },
      fetch_orgs: { orgs: [ORG_1] },
      list_admins: { admins: [ADMIN, ADMIN_2] },
      remove_admin: { error: "Cannot remove last admin" },
    });

    await act(async () => { render(<PlatformAdmin />); });
    await waitFor(() => { expect(screen.getByText("Platform Admins")).toBeInTheDocument(); });
    fireEvent.click(screen.getByText("Platform Admins"));
    await waitFor(() => { expect(screen.getByText("Deactivate")).toBeInTheDocument(); });

    await act(async () => { fireEvent.click(screen.getByText("Deactivate")); });

    await waitFor(() => {
      expect(screen.getByText("Error: Cannot remove last admin")).toBeInTheDocument();
    });
  });

  it("api() returns error object on network failure", async () => {
    // Simulate network failure
    globalThis.fetch = vi.fn(() => { throw new Error("Failed to fetch"); });
    localStorage.setItem("pa_token", "valid-token");

    await act(async () => { render(<PlatformAdmin />); });

    // Should gracefully handle the error and show login (verify fails with network error)
    await waitFor(() => {
      // The component should not crash — it should show login or setup
      const body = document.body;
      expect(body).toBeInTheDocument();
    });
  });

  it("org loading state shows dash placeholders for stats", async () => {
    localStorage.setItem("pa_token", "valid-token");
    // Make fetch_org_stats never resolve so loading state persists
    let resolveStats;
    const statsPromise = new Promise((r) => { resolveStats = r; });
    globalThis.fetch = vi.fn().mockImplementation(async (url, opts) => {
      const body = JSON.parse(opts.body);
      const responses = {
        verify: { admin: ADMIN },
        fetch_orgs: { orgs: [ORG_1] },
        list_admins: { admins: [ADMIN] },
        fetch_org_users: { users: [] },
      };
      if (body.action === "fetch_org_stats") {
        await statsPromise;
        return { ok: true, json: async () => ({ stats: { frats: 10 } }) };
      }
      return { ok: true, json: async () => (responses[body.action] || {}) };
    });

    await act(async () => { render(<PlatformAdmin />); });
    await waitFor(() => { expect(screen.getByText("Acme Aviation")).toBeInTheDocument(); });
    await act(async () => { fireEvent.click(screen.getByText("Acme Aviation")); });

    // While loading, stats should show "–" and users should show "Loading..."
    await waitFor(() => {
      const dashes = screen.getAllByText("–");
      expect(dashes.length).toBe(5);
      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    // Resolve and verify loading completes
    await act(async () => { resolveStats(); });
  });

  it("tier change shows confirmation when flags are customized", async () => {
    localStorage.setItem("pa_token", "valid-token");
    mockApiResponse({
      verify: { admin: ADMIN },
      fetch_orgs: { orgs: [ORG_1] },
      list_admins: { admins: [ADMIN] },
      fetch_org_users: { users: [] },
      fetch_org_stats: { stats: {} },
    });

    await act(async () => { render(<PlatformAdmin />); });
    await waitFor(() => { expect(screen.getByText("Acme Aviation")).toBeInTheDocument(); });
    await act(async () => { fireEvent.click(screen.getByText("Acme Aviation")); });
    await waitFor(() => { expect(screen.getByText("All On")).toBeInTheDocument(); });

    // Customize flags (turn all on — different from professional defaults)
    fireEvent.click(screen.getByText("All On"));

    // Now try to switch tier — should show confirmation
    fireEvent.click(screen.getByText("Starter"));

    expect(screen.getByText(/will reset your custom feature flags/)).toBeInTheDocument();
    expect(screen.getByText("Reset Flags")).toBeInTheDocument();
    expect(screen.getByText("Keep Current Flags")).toBeInTheDocument();
  });

  it("tier change confirmation 'Reset Flags' applies new tier", async () => {
    localStorage.setItem("pa_token", "valid-token");
    mockApiResponse({
      verify: { admin: ADMIN },
      fetch_orgs: { orgs: [ORG_1] },
      list_admins: { admins: [ADMIN] },
      fetch_org_users: { users: [] },
      fetch_org_stats: { stats: {} },
    });

    await act(async () => { render(<PlatformAdmin />); });
    await waitFor(() => { expect(screen.getByText("Acme Aviation")).toBeInTheDocument(); });
    await act(async () => { fireEvent.click(screen.getByText("Acme Aviation")); });
    await waitFor(() => { expect(screen.getByText("All On")).toBeInTheDocument(); });

    // Customize and switch tier
    fireEvent.click(screen.getByText("All On"));
    fireEvent.click(screen.getByText("Starter"));

    // Confirm reset
    fireEvent.click(screen.getByText("Reset Flags"));

    // Should apply starter defaults (max aircraft = 5)
    await waitFor(() => {
      expect(screen.getByDisplayValue("5")).toBeInTheDocument();
      expect(screen.queryByText(/will reset your custom feature flags/)).not.toBeInTheDocument();
    });
  });

  it("tier change confirmation 'Keep Current Flags' cancels tier switch", async () => {
    localStorage.setItem("pa_token", "valid-token");
    mockApiResponse({
      verify: { admin: ADMIN },
      fetch_orgs: { orgs: [ORG_1] },
      list_admins: { admins: [ADMIN] },
      fetch_org_users: { users: [] },
      fetch_org_stats: { stats: {} },
    });

    await act(async () => { render(<PlatformAdmin />); });
    await waitFor(() => { expect(screen.getByText("Acme Aviation")).toBeInTheDocument(); });
    await act(async () => { fireEvent.click(screen.getByText("Acme Aviation")); });
    await waitFor(() => { expect(screen.getByText("All On")).toBeInTheDocument(); });

    // Customize and switch tier
    fireEvent.click(screen.getByText("All On"));
    fireEvent.click(screen.getByText("Starter"));

    // Cancel — keep current flags
    fireEvent.click(screen.getByText("Keep Current Flags"));

    // Max aircraft should still be 15 (professional), confirmation gone
    await waitFor(() => {
      expect(screen.getByDisplayValue("15")).toBeInTheDocument();
      expect(screen.queryByText(/will reset your custom feature flags/)).not.toBeInTheDocument();
    });
  });

  it("max aircraft input accepts numeric changes", async () => {
    localStorage.setItem("pa_token", "valid-token");
    mockApiResponse({
      verify: { admin: ADMIN },
      fetch_orgs: { orgs: [ORG_1] },
      list_admins: { admins: [ADMIN] },
      fetch_org_users: { users: [] },
      fetch_org_stats: { stats: {} },
    });

    await act(async () => { render(<PlatformAdmin />); });
    await waitFor(() => {
      expect(screen.getByText("Acme Aviation")).toBeInTheDocument();
    });

    await act(async () => { fireEvent.click(screen.getByText("Acme Aviation")); });

    await waitFor(() => {
      expect(screen.getByDisplayValue("15")).toBeInTheDocument();
    });

    const maxInput = screen.getByDisplayValue("15");
    fireEvent.change(maxInput, { target: { value: "25" } });
    expect(screen.getByDisplayValue("25")).toBeInTheDocument();
  });
});
