import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// Mock next/dynamic so dynamically-imported components render synchronously
vi.mock("next/dynamic", () => ({
  default: (importFn) => {
    const src = importFn.toString();
    if (src.includes("FRATTemplateEditor"))
      return function MockFRATEditor(props) {
        return <div data-testid="frat-editor-mock">FRAT Editor</div>;
      };
    if (src.includes("FleetManagement"))
      return function MockFleetMgmt(props) {
        return <div data-testid="fleet-mock">Fleet Management</div>;
      };
    return function MockDynamic(props) {
      return <div>Dynamic Mock</div>;
    };
  },
}));

import AdminPanel from "../../components/AdminPanel";

// ── Helpers ────────────────────────────────────────────────────

const baseProfile = { id: "user-1", role: "admin" };

const baseOrgProfiles = [
  { id: "user-1", full_name: "Alice Admin", email: "alice@example.com", role: "admin", created_at: "2024-01-15T00:00:00Z", permissions: [] },
  { id: "user-2", full_name: "Bob Pilot", email: "bob@example.com", role: "pilot", created_at: "2024-03-01T00:00:00Z", permissions: ["flight_follower"] },
  { id: "user-3", full_name: "Carol SM", email: "carol@example.com", role: "safety_manager", created_at: "2024-06-10T00:00:00Z", permissions: [] },
];

const baseOrgData = {
  tier: "professional",
  subscription_status: "active",
  stripe_subscription_id: "sub_123",
  trial_ends_at: null,
  feature_flags: {
    frat: true,
    flight_following: true,
    safety_reporting: true,
    hazard_register: true,
    corrective_actions: false,
    policy_library: true,
    training_records: true,
    dashboard_analytics: true,
    custom_frat_template: true,
    cbt_modules: false,
    role_permissions: true,
    approval_workflow: true,
    document_library: false,
    api_access: false,
    multi_base: false,
    custom_integrations: false,
    priority_support: false,
  },
};

const basePendingInvitations = [
  { id: "inv-1", email: "dave@example.com", role: "pilot", status: "pending", created_at: "2024-06-01T00:00:00Z", expires_at: "2099-12-31T00:00:00Z" },
];

function renderAdmin(overrides = {}) {
  const props = {
    profile: overrides.profile ?? baseProfile,
    orgProfiles: overrides.orgProfiles ?? baseOrgProfiles,
    onUpdateRole: overrides.onUpdateRole ?? vi.fn(),
    onUpdatePermissions: overrides.onUpdatePermissions ?? vi.fn(),
    onRemoveUser: overrides.onRemoveUser ?? vi.fn(),
    orgName: overrides.orgName ?? "Acme Aviation",
    orgSlug: overrides.orgSlug ?? "acme-aviation",
    orgLogo: overrides.orgLogo ?? null,
    onUploadLogo: overrides.onUploadLogo ?? vi.fn(),
    fratTemplate: overrides.fratTemplate ?? null,
    fratTemplates: overrides.fratTemplates ?? [],
    onSaveTemplate: overrides.onSaveTemplate ?? vi.fn(),
    onCreateTemplate: overrides.onCreateTemplate ?? vi.fn(),
    onDeleteTemplate: overrides.onDeleteTemplate ?? vi.fn(),
    onSetActiveTemplate: overrides.onSetActiveTemplate ?? vi.fn(),
    notificationContacts: overrides.notificationContacts ?? [],
    onAddContact: overrides.onAddContact ?? vi.fn(),
    onUpdateContact: overrides.onUpdateContact ?? vi.fn(),
    onDeleteContact: overrides.onDeleteContact ?? vi.fn(),
    orgData: overrides.orgData ?? baseOrgData,
    onUpdateOrg: overrides.onUpdateOrg ?? vi.fn(),
    onCheckout: overrides.onCheckout ?? vi.fn(),
    onBillingPortal: overrides.onBillingPortal ?? vi.fn(),
    invitations: overrides.invitations ?? basePendingInvitations,
    onInviteUser: overrides.onInviteUser ?? vi.fn(),
    onRevokeInvitation: overrides.onRevokeInvitation ?? vi.fn(),
    onResendInvitation: overrides.onResendInvitation ?? vi.fn(),
    initialTab: overrides.initialTab ?? undefined,
    tourTab: overrides.tourTab ?? undefined,
    fleetAircraft: overrides.fleetAircraft ?? [],
    maxAircraft: overrides.maxAircraft ?? 5,
    onAddAircraft: overrides.onAddAircraft ?? vi.fn(),
    onUpdateAircraft: overrides.onUpdateAircraft ?? vi.fn(),
    onDeleteAircraft: overrides.onDeleteAircraft ?? vi.fn(),
  };

  const utils = render(<AdminPanel {...props} />);
  return { ...utils, props };
}

// ── Tests ──────────────────────────────────────────────────────

describe("AdminPanel", () => {
  // 1. Tab bar rendering
  it("renders tab bar with Organization, Fleet, FRAT Template, Users & Roles, Subscription", () => {
    renderAdmin();
    // "Organization" appears in both the tab button and the org section heading,
    // so use the admin-tabs container to verify tab buttons specifically
    const tabBar = document.querySelector(".admin-tabs");
    expect(tabBar).toBeTruthy();
    const tabButtons = tabBar.querySelectorAll("button");
    const tabLabels = Array.from(tabButtons).map((b) => b.textContent);
    expect(tabLabels).toContain("Organization");
    expect(tabLabels).toContain("Fleet");
    expect(tabLabels).toContain("FRAT Template");
    expect(tabLabels).toContain("Users & Roles");
    expect(tabLabels).toContain("Subscription");
  });

  // 2. Organization tab shows org name and join code
  it("Organization tab shows org name and join code", () => {
    renderAdmin();
    expect(screen.getByText("Acme Aviation")).toBeInTheDocument();
    expect(screen.getByText("acme-aviation")).toBeInTheDocument();
  });

  // 3. Switching to Users tab shows team members
  it("switching to Users & Roles tab shows team members", () => {
    renderAdmin();
    // Click the tab button in the tab bar to avoid ambiguity
    const tabBar = document.querySelector(".admin-tabs");
    const usersTab = Array.from(tabBar.querySelectorAll("button")).find((b) => b.textContent === "Users & Roles");
    fireEvent.click(usersTab);
    expect(screen.getByText(/^Team Members \(/)).toBeInTheDocument();
    expect(screen.getByText("Alice Admin")).toBeInTheDocument();
    expect(screen.getByText("Bob Pilot")).toBeInTheDocument();
    expect(screen.getByText("Carol SM")).toBeInTheDocument();
  });

  // 4. UserRow shows user name, email, role
  it("UserRow shows user name, email, and role label", () => {
    renderAdmin();
    fireEvent.click(screen.getByText("Users & Roles"));
    expect(screen.getByText("Bob Pilot")).toBeInTheDocument();
    expect(screen.getByText(/bob@example\.com/)).toBeInTheDocument();
    // "Admin" appears in multiple places (role span for Alice, option values in dropdowns,
    // and in the Roles reference section), so just verify at least one is present
    const adminTexts = screen.getAllByText("Admin");
    expect(adminTexts.length).toBeGreaterThanOrEqual(1);
  });

  // 5. UserRow shows "You" badge for current user
  it('UserRow shows "You" badge for the current user', () => {
    renderAdmin();
    fireEvent.click(screen.getByText("Users & Roles"));
    expect(screen.getByText("You")).toBeInTheDocument();
  });

  // 6. UserRow role dropdown for non-self canManage user
  it("UserRow shows role dropdown for non-self user and calls onUpdateRole on change", () => {
    const onUpdateRole = vi.fn();
    renderAdmin({ onUpdateRole });
    fireEvent.click(screen.getByText("Users & Roles"));

    // Non-self users (Bob, Carol) should have select dropdowns
    const selects = screen.getAllByRole("combobox");
    // Find the select for Bob (value = "pilot")
    const bobSelect = selects.find((s) => s.value === "pilot");
    expect(bobSelect).toBeTruthy();

    fireEvent.change(bobSelect, { target: { value: "dispatcher" } });
    expect(onUpdateRole).toHaveBeenCalledWith("user-2", "dispatcher");
  });

  // 7. UserRow expand shows permissions, toggling calls onUpdatePermissions
  it("expanding a UserRow shows permission toggles, clicking calls onUpdatePermissions", () => {
    const onUpdatePermissions = vi.fn();
    renderAdmin({ onUpdatePermissions });
    fireEvent.click(screen.getByText("Users & Roles"));

    // Click on Bob's name text directly — the click handler is on the parent row div
    // which uses event bubbling, so clicking the name element triggers expansion
    fireEvent.click(screen.getByText("Bob Pilot"));

    // "Additional Permissions" appears both in the expanded row and in the reference section,
    // so verify at least 2 instances exist (one from expansion + one from reference)
    const additionalPermsHeadings = screen.getAllByText("Additional Permissions");
    expect(additionalPermsHeadings.length).toBe(2);

    // The permission toggle buttons are only in the expanded row
    // Bob already has "flight_follower", so the button text includes the checkmark prefix
    const ffButton = screen.getByRole("button", { name: /Flight Follower/ });
    expect(ffButton).toBeInTheDocument();
    const approverButton = screen.getByRole("button", { name: /FRAT Approver/ });
    expect(approverButton).toBeInTheDocument();

    // Clicking flight_follower should remove it (Bob has it, so toggling produces [])
    fireEvent.click(ffButton);
    expect(onUpdatePermissions).toHaveBeenCalledWith("user-2", []);
  });

  // 8. Remove user with confirmation calls onRemoveUser
  it("remove user requires confirmation then calls onRemoveUser", () => {
    const onRemoveUser = vi.fn();
    renderAdmin({ onRemoveUser });
    fireEvent.click(screen.getByText("Users & Roles"));

    // Expand Bob's row
    fireEvent.click(screen.getByText("Bob Pilot"));

    // Click "Remove User" button
    const removeBtn = screen.getByRole("button", { name: /Remove User/ });
    fireEvent.click(removeBtn);

    // Confirmation should appear
    expect(screen.getByText(/Remove Bob Pilot\?/)).toBeInTheDocument();

    // Click "Yes, Remove"
    fireEvent.click(screen.getByRole("button", { name: /Yes, Remove/ }));
    expect(onRemoveUser).toHaveBeenCalledWith("user-2");
  });

  // 9. InviteSection shows "+ Invite User" button for canManage
  it('InviteSection shows "+ Invite User" button for canManage roles', () => {
    renderAdmin();
    fireEvent.click(screen.getByText("Users & Roles"));
    expect(screen.getByRole("button", { name: /\+ Invite User/ })).toBeInTheDocument();
  });

  // 10. InviteSection returns nothing for non-canManage role
  it("InviteSection does not render for non-canManage roles", () => {
    renderAdmin({ profile: { id: "user-2", role: "pilot" } });
    fireEvent.click(screen.getByText("Users & Roles"));
    expect(screen.queryByRole("button", { name: /\+ Invite User/ })).not.toBeInTheDocument();
    expect(screen.queryByText("Invite Team Members")).not.toBeInTheDocument();
  });

  // 11. InviteSection validates email
  it("InviteSection shows error for invalid email", () => {
    renderAdmin();
    fireEvent.click(screen.getByText("Users & Roles"));
    fireEvent.click(screen.getByRole("button", { name: /\+ Invite User/ }));

    // Type an invalid email
    const emailInput = screen.getByPlaceholderText("pilot@company.com");
    fireEvent.change(emailInput, { target: { value: "notanemail" } });
    fireEvent.click(screen.getByRole("button", { name: /Send Invitation/ }));

    expect(screen.getByText("Invalid email address")).toBeInTheDocument();
  });

  it("InviteSection shows error for empty email", () => {
    renderAdmin();
    fireEvent.click(screen.getByText("Users & Roles"));
    fireEvent.click(screen.getByRole("button", { name: /\+ Invite User/ }));

    fireEvent.click(screen.getByRole("button", { name: /Send Invitation/ }));
    expect(screen.getByText("Enter an email address")).toBeInTheDocument();
  });

  // 12. Successful invite calls onInviteUser
  it("successful invite calls onInviteUser with email and role", async () => {
    const onInviteUser = vi.fn().mockResolvedValue({});
    renderAdmin({ onInviteUser });
    fireEvent.click(screen.getByText("Users & Roles"));
    fireEvent.click(screen.getByRole("button", { name: /\+ Invite User/ }));

    const emailInput = screen.getByPlaceholderText("pilot@company.com");
    fireEvent.change(emailInput, { target: { value: "new@example.com" } });

    fireEvent.click(screen.getByRole("button", { name: /Send Invitation/ }));

    await waitFor(() => {
      expect(onInviteUser).toHaveBeenCalledWith("new@example.com", "pilot");
    });
  });

  // 13. Shows pending invitations with Resend/Revoke
  it("shows pending invitations with Resend and Revoke buttons", () => {
    renderAdmin();
    fireEvent.click(screen.getByText("Users & Roles"));

    expect(screen.getByText("dave@example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Resend/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Revoke/ })).toBeInTheDocument();
  });

  it("clicking Resend calls onResendInvitation with invitation id", () => {
    const onResendInvitation = vi.fn();
    renderAdmin({ onResendInvitation });
    fireEvent.click(screen.getByText("Users & Roles"));

    fireEvent.click(screen.getByRole("button", { name: /Resend/ }));
    expect(onResendInvitation).toHaveBeenCalledWith("inv-1");
  });

  it("clicking Revoke calls onRevokeInvitation with invitation id", () => {
    const onRevokeInvitation = vi.fn();
    renderAdmin({ onRevokeInvitation });
    fireEvent.click(screen.getByText("Users & Roles"));

    fireEvent.click(screen.getByRole("button", { name: /Revoke/ }));
    expect(onRevokeInvitation).toHaveBeenCalledWith("inv-1");
  });

  // 14. Subscription tab shows current plan
  it("Subscription tab shows current plan name and tier info", () => {
    renderAdmin();
    fireEvent.click(screen.getByText("Subscription"));
    expect(screen.getByText("Professional")).toBeInTheDocument();
    expect(screen.getByText("Current Plan")).toBeInTheDocument();
    expect(screen.getByText(/\$299\/mo/)).toBeInTheDocument();
  });

  // 15. Subscription tab shows status badge
  it("Subscription tab shows ACTIVE status badge", () => {
    renderAdmin();
    fireEvent.click(screen.getByText("Subscription"));
    expect(screen.getByText("active")).toBeInTheDocument();
  });

  it("Subscription tab shows TRIAL status badge for trial subscriptions", () => {
    renderAdmin({
      orgData: { ...baseOrgData, subscription_status: "trial", stripe_subscription_id: null, trial_ends_at: "2025-01-01T00:00:00Z" },
    });
    fireEvent.click(screen.getByText("Subscription"));
    expect(screen.getByText("trial")).toBeInTheDocument();
  });

  // 16. Subscribe buttons for trial users
  it("Subscription tab shows subscribe buttons for trial users", () => {
    renderAdmin({
      orgData: { ...baseOrgData, subscription_status: "trial", stripe_subscription_id: null },
    });
    fireEvent.click(screen.getByText("Subscription"));
    expect(screen.getByText(/Subscribe to Continue After Trial/)).toBeInTheDocument();
    // Two subscribe buttons (one per plan card)
    const subscribeButtons = screen.getAllByRole("button", { name: /Subscribe/ });
    // Filter to just the plan card subscribe buttons (exclude the tab button)
    const planSubscribeButtons = subscribeButtons.filter((btn) => btn.textContent === "Subscribe");
    expect(planSubscribeButtons.length).toBe(2);
  });

  // 17. Plan features checklist
  it("Subscription tab shows plan features checklist", () => {
    renderAdmin();
    fireEvent.click(screen.getByText("Subscription"));
    expect(screen.getByText("Plan Features")).toBeInTheDocument();
    expect(screen.getByText("Flight Risk Assessment (FRAT)")).toBeInTheDocument();
    expect(screen.getByText("Flight Following")).toBeInTheDocument();
    expect(screen.getByText("Safety Reporting")).toBeInTheDocument();
  });

  // 18. initialTab prop sets active tab
  it("initialTab prop sets the active tab on mount", () => {
    renderAdmin({ initialTab: "users" });
    // Users tab content should be visible without clicking
    expect(screen.getByText(/^Team Members \(/)).toBeInTheDocument();
    // Org tab content should NOT be visible
    expect(screen.queryByText("Acme Aviation")).not.toBeInTheDocument();
  });

  // 19. tourTab prop overrides active tab
  it("tourTab prop overrides active tab", () => {
    const { rerender } = render(
      <AdminPanel
        profile={baseProfile}
        orgProfiles={baseOrgProfiles}
        onUpdateRole={vi.fn()}
        onUpdatePermissions={vi.fn()}
        onRemoveUser={vi.fn()}
        orgName="Acme Aviation"
        orgSlug="acme-aviation"
        orgLogo={null}
        onUploadLogo={vi.fn()}
        fratTemplate={null}
        fratTemplates={[]}
        onSaveTemplate={vi.fn()}
        onCreateTemplate={vi.fn()}
        onDeleteTemplate={vi.fn()}
        onSetActiveTemplate={vi.fn()}
        notificationContacts={[]}
        onAddContact={vi.fn()}
        onUpdateContact={vi.fn()}
        onDeleteContact={vi.fn()}
        orgData={baseOrgData}
        onUpdateOrg={vi.fn()}
        onCheckout={vi.fn()}
        onBillingPortal={vi.fn()}
        invitations={[]}
        onInviteUser={vi.fn()}
        onRevokeInvitation={vi.fn()}
        onResendInvitation={vi.fn()}
        fleetAircraft={[]}
        maxAircraft={5}
        onAddAircraft={vi.fn()}
        onUpdateAircraft={vi.fn()}
        onDeleteAircraft={vi.fn()}
        initialTab="org"
        tourTab={undefined}
      />
    );

    // Initially on org tab
    expect(screen.getByText("Acme Aviation")).toBeInTheDocument();

    // Rerender with tourTab to override
    rerender(
      <AdminPanel
        profile={baseProfile}
        orgProfiles={baseOrgProfiles}
        onUpdateRole={vi.fn()}
        onUpdatePermissions={vi.fn()}
        onRemoveUser={vi.fn()}
        orgName="Acme Aviation"
        orgSlug="acme-aviation"
        orgLogo={null}
        onUploadLogo={vi.fn()}
        fratTemplate={null}
        fratTemplates={[]}
        onSaveTemplate={vi.fn()}
        onCreateTemplate={vi.fn()}
        onDeleteTemplate={vi.fn()}
        onSetActiveTemplate={vi.fn()}
        notificationContacts={[]}
        onAddContact={vi.fn()}
        onUpdateContact={vi.fn()}
        onDeleteContact={vi.fn()}
        orgData={baseOrgData}
        onUpdateOrg={vi.fn()}
        onCheckout={vi.fn()}
        onBillingPortal={vi.fn()}
        invitations={[]}
        onInviteUser={vi.fn()}
        onRevokeInvitation={vi.fn()}
        onResendInvitation={vi.fn()}
        fleetAircraft={[]}
        maxAircraft={5}
        onAddAircraft={vi.fn()}
        onUpdateAircraft={vi.fn()}
        onDeleteAircraft={vi.fn()}
        initialTab="org"
        tourTab="subscription"
      />
    );

    // Should now be on subscription tab
    expect(screen.getByText("Current Plan")).toBeInTheDocument();
  });

  // 20. Logo upload section visible for canManage
  it("logo upload section is visible for canManage roles", () => {
    renderAdmin();
    expect(screen.getByText("Organization Logo")).toBeInTheDocument();
    expect(screen.getByText("Upload Logo")).toBeInTheDocument();
  });

  it("logo upload section is hidden for non-canManage roles", () => {
    renderAdmin({ profile: { id: "user-2", role: "pilot" } });
    expect(screen.queryByText("Organization Logo")).not.toBeInTheDocument();
  });

  // 21. FRAT Template tab hidden when feature flag is false
  it("FRAT Template tab is hidden when custom_frat_template feature flag is false", () => {
    renderAdmin({
      orgData: {
        ...baseOrgData,
        feature_flags: { ...baseOrgData.feature_flags, custom_frat_template: false },
      },
    });
    expect(screen.queryByText("FRAT Template")).not.toBeInTheDocument();
    // Other tabs should still be present (use tab bar to avoid duplicates with section headings)
    const tabBar = document.querySelector(".admin-tabs");
    const tabLabels = Array.from(tabBar.querySelectorAll("button")).map((b) => b.textContent);
    expect(tabLabels).toContain("Organization");
    expect(tabLabels).toContain("Fleet");
    expect(tabLabels).not.toContain("FRAT Template");
  });

  // Fleet tab renders mocked FleetManagement
  it("Fleet tab renders FleetManagement component", () => {
    renderAdmin();
    fireEvent.click(screen.getByText("Fleet"));
    expect(screen.getByTestId("fleet-mock")).toBeInTheDocument();
  });

  // FRAT Template tab renders mocked FRATTemplateEditor for canManage
  it("FRAT Template tab renders FRATTemplateEditor for canManage roles", () => {
    renderAdmin();
    fireEvent.click(screen.getByText("FRAT Template"));
    expect(screen.getByTestId("frat-editor-mock")).toBeInTheDocument();
  });

  // Manage Subscription button visible for active users with Stripe
  it("shows Manage Subscription button for active users with Stripe subscription", () => {
    renderAdmin();
    fireEvent.click(screen.getByText("Subscription"));
    expect(screen.getByRole("button", { name: /Manage Subscription/ })).toBeInTheDocument();
  });
});
