import { describe, it, expect } from 'vitest';

// ── Section 5: Role-Based Access Control ──
// Tests for RBAC logic extracted from pages/index.js.

// canManage check from index.js:
// const isAdminRole = ['admin', 'safety_manager', 'chief_pilot', 'accountable_exec'].includes(profile.role);
const ADMIN_ROLES = ['admin', 'safety_manager', 'chief_pilot', 'accountable_exec'];

function isAdminRole(role) {
  return ADMIN_ROLES.includes(role);
}

function canManage(profile) {
  if (!profile) return false;
  return isAdminRole(profile.role);
}

function canApprove(profile) {
  if (!profile) return false;
  if (isAdminRole(profile.role)) return true;
  if (profile.permissions && profile.permissions.includes('approver')) return true;
  return false;
}

function getDefaultView(role) {
  if (role === 'pilot') return 'frat';
  return 'dashboard';
}

// ── 5.1: Admin Group Check (canManage) ──

describe('canManage (Admin Group)', () => {
  // 5.1.1 Admin
  it('admin has manage access', () => {
    expect(canManage({ role: 'admin' })).toBe(true);
  });

  // 5.1.2 Safety Manager
  it('safety_manager has manage access', () => {
    expect(canManage({ role: 'safety_manager' })).toBe(true);
  });

  // 5.1.3 Chief Pilot
  it('chief_pilot has manage access', () => {
    expect(canManage({ role: 'chief_pilot' })).toBe(true);
  });

  // 5.1.4 Accountable Executive
  it('accountable_exec has manage access', () => {
    expect(canManage({ role: 'accountable_exec' })).toBe(true);
  });

  // 5.1.5 Pilot
  it('pilot does NOT have manage access', () => {
    expect(canManage({ role: 'pilot' })).toBe(false);
  });

  // Edge cases
  it('null profile returns false', () => {
    expect(canManage(null)).toBe(false);
  });

  it('undefined role returns false', () => {
    expect(canManage({ role: undefined })).toBe(false);
  });

  it('unknown role returns false', () => {
    expect(canManage({ role: 'dispatcher' })).toBe(false);
  });
});

// ── 5.2: FRAT Approval Permissions ──

describe('FRAT approval permissions', () => {
  // 5.2.1 Safety manager can approve
  it('safety_manager can approve FRATs', () => {
    expect(canApprove({ role: 'safety_manager' })).toBe(true);
  });

  // 5.2.2 Pilot without approver permission cannot approve
  it('pilot without approver permission cannot approve FRATs', () => {
    expect(canApprove({ role: 'pilot', permissions: [] })).toBe(false);
  });

  // 5.2.3 Pilot with approver permission can approve
  it('pilot with approver permission CAN approve FRATs', () => {
    expect(canApprove({ role: 'pilot', permissions: ['approver'] })).toBe(true);
  });

  // Admin can always approve
  it('admin can always approve FRATs', () => {
    expect(canApprove({ role: 'admin' })).toBe(true);
  });

  // Chief pilot can approve
  it('chief_pilot can approve FRATs', () => {
    expect(canApprove({ role: 'chief_pilot' })).toBe(true);
  });

  // Pilot with empty permissions
  it('pilot with no permissions array cannot approve', () => {
    expect(canApprove({ role: 'pilot' })).toBe(false);
  });
});

// ── 5.3: Pilot-Specific View Restrictions ──

describe('Pilot-specific view restrictions', () => {
  // 5.3.1 Pilot default view
  it('pilot starts on FRAT view', () => {
    expect(getDefaultView('pilot')).toBe('frat');
  });

  it('admin starts on dashboard', () => {
    expect(getDefaultView('admin')).toBe('dashboard');
  });

  it('safety_manager starts on dashboard', () => {
    expect(getDefaultView('safety_manager')).toBe('dashboard');
  });
});

// ── 5.1.5/5.1.6: Admin nav visibility ──

describe('Admin nav item visibility logic', () => {
  function isAdminNavVisible(role) {
    return isAdminRole(role);
  }

  // 5.1.5 Pilot: Admin hidden
  it('pilot cannot see Admin nav item', () => {
    expect(isAdminNavVisible('pilot')).toBe(false);
  });

  // 5.1.6 Safety Manager: Admin visible
  it('safety_manager can see Admin nav item', () => {
    expect(isAdminNavVisible('safety_manager')).toBe(true);
  });

  it('admin can see Admin nav item', () => {
    expect(isAdminNavVisible('admin')).toBe(true);
  });

  it('chief_pilot can see Admin nav item', () => {
    expect(isAdminNavVisible('chief_pilot')).toBe(true);
  });

  it('accountable_exec can see Admin nav item', () => {
    expect(isAdminNavVisible('accountable_exec')).toBe(true);
  });
});

// ── 5.4: Onboarding Wizard Role Filtering ──

describe('Onboarding wizard role filtering', () => {
  function filterOnboardingSteps(steps, role, org) {
    return steps.filter(step => {
      if (step.adminOnly && !isAdminRole(role)) return false;
      return true;
    });
  }

  const allSteps = [
    { id: 'welcome', adminOnly: false },
    { id: 'fleet', adminOnly: true },
    { id: 'invite', adminOnly: true },
    { id: 'overview-dashboard', adminOnly: false },
    { id: 'overview-reports', adminOnly: false },
    { id: 'overview-admin', adminOnly: true },
  ];

  // 5.4.1 Admin sees all steps
  it('admin sees all onboarding steps', () => {
    const filtered = filterOnboardingSteps(allSteps, 'admin', {});
    expect(filtered).toHaveLength(6);
  });

  // 5.4.2 Pilot skips admin-only steps
  it('pilot skips admin-only onboarding steps', () => {
    const filtered = filterOnboardingSteps(allSteps, 'pilot', {});
    expect(filtered).toHaveLength(3);
    expect(filtered.map(s => s.id)).toEqual(['welcome', 'overview-dashboard', 'overview-reports']);
  });
});

// ── Investigation view access by role ──

describe('Investigation access by role', () => {
  function canEditInvestigation(role) {
    return isAdminRole(role);
  }

  // 9.1.2 Admin can create/edit
  it('admin can edit investigations', () => {
    expect(canEditInvestigation('admin')).toBe(true);
  });

  // 9.1.3 Pilot is view-only
  it('pilot cannot edit investigations', () => {
    expect(canEditInvestigation('pilot')).toBe(false);
  });

  it('safety_manager can edit investigations', () => {
    expect(canEditInvestigation('safety_manager')).toBe(true);
  });
});

// ── User permission types ──

describe('User permissions', () => {
  function getUserPermissions(profile) {
    return profile?.permissions || [];
  }

  it('returns empty array when no permissions', () => {
    expect(getUserPermissions({ role: 'pilot' })).toEqual([]);
  });

  it('returns permissions array', () => {
    expect(getUserPermissions({ role: 'pilot', permissions: ['approver', 'flight_follower'] }))
      .toEqual(['approver', 'flight_follower']);
  });

  it('handles null profile', () => {
    expect(getUserPermissions(null)).toEqual([]);
  });
});
