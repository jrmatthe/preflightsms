import { describe, it, expect } from 'vitest';
import { isFreeTier } from '../../lib/tiers.js';

// ── Section 27: Onboarding Wizard ──
// Tests for onboarding logic extracted from pages/index.js.
// The onboarding wizard is defined inline in the Home component.

// Onboarding step definitions (from pages/index.js lines 58-128)
const ONBOARDING_STEPS = {
  setup: [
    { id: 'welcome', adminOnly: false },
    { id: 'fleet', adminOnly: true, skipIf: (org, fleet) => fleet && fleet.length > 0 },
    { id: 'invite', adminOnly: true, skipIf: (org) => isFreeTier(org) },
  ],
  overview: [
    { id: 'dashboard', adminOnly: false, feature: 'dashboard_basic' },
    { id: 'frat', adminOnly: false, feature: 'frat' },
    { id: 'flights', adminOnly: false, feature: 'flight_following' },
    { id: 'reports', adminOnly: false, feature: 'safety_reporting' },
    { id: 'hazards', adminOnly: false, feature: 'hazard_register' },
    { id: 'actions', adminOnly: false, feature: 'corrective_actions' },
    { id: 'cbt', adminOnly: false, feature: 'cbt_modules' },
    { id: 'policy', adminOnly: false, feature: 'policy_library' },
    { id: 'audits', adminOnly: true, feature: 'audit_program' },
    { id: 'admin', adminOnly: true },
  ],
};

function filterSetupSteps(role, org, fleet) {
  const isAdmin = ['admin', 'safety_manager', 'chief_pilot', 'accountable_exec'].includes(role);
  return ONBOARDING_STEPS.setup.filter(step => {
    if (step.adminOnly && !isAdmin) return false;
    if (step.skipIf && step.skipIf(org, fleet)) return false;
    return true;
  });
}

function filterOverviewSteps(role, org) {
  const isAdmin = ['admin', 'safety_manager', 'chief_pilot', 'accountable_exec'].includes(role);
  const { hasFeature } = require('../../lib/tiers.js');
  return ONBOARDING_STEPS.overview.filter(step => {
    if (step.adminOnly && !isAdmin) return false;
    if (step.feature && !hasFeature(org, step.feature)) return false;
    return true;
  });
}

// ── 27.2: Setup Phase ──

describe('Onboarding setup phase', () => {
  // 27.2.1 Admin with no fleet sees Welcome + Fleet + Invite
  it('admin with no fleet sees Welcome, Fleet, and Invite steps', () => {
    const steps = filterSetupSteps('admin', { tier: 'starter' }, []);
    expect(steps.map(s => s.id)).toEqual(['welcome', 'fleet', 'invite']);
  });

  // 27.2.2 Pilot sees Welcome only
  it('pilot sees only Welcome step', () => {
    const steps = filterSetupSteps('pilot', { tier: 'starter' }, []);
    expect(steps.map(s => s.id)).toEqual(['welcome']);
  });

  // 27.2.4 Fleet step skipped if fleet already has aircraft
  it('fleet step is skipped when fleet has aircraft', () => {
    const fleet = [{ id: 'a1', type: 'PC-12' }];
    const steps = filterSetupSteps('admin', { tier: 'starter' }, fleet);
    expect(steps.map(s => s.id)).not.toContain('fleet');
  });

  // 27.2.6 Invite step skipped on Free tier
  it('invite step is skipped on free tier', () => {
    const steps = filterSetupSteps('admin', { tier: 'free' }, []);
    expect(steps.map(s => s.id)).not.toContain('invite');
  });

  // Admin with fleet and free tier
  it('free tier admin with fleet sees only Welcome', () => {
    const fleet = [{ id: 'a1', type: 'C172' }];
    const steps = filterSetupSteps('admin', { tier: 'free' }, fleet);
    expect(steps.map(s => s.id)).toEqual(['welcome']);
  });

  // Safety manager sees admin steps
  it('safety_manager sees all admin steps', () => {
    const steps = filterSetupSteps('safety_manager', { tier: 'professional' }, []);
    expect(steps.map(s => s.id)).toEqual(['welcome', 'fleet', 'invite']);
  });
});

// ── 27.3: Overview Phase ──

describe('Onboarding overview phase', () => {
  // 27.3.2 Gated features skipped for free tier
  it('free tier skips gated overview steps', () => {
    const steps = filterOverviewSteps('admin', { tier: 'free' });
    const ids = steps.map(s => s.id);
    expect(ids).toContain('dashboard');
    expect(ids).toContain('frat');
    expect(ids).toContain('reports');
    expect(ids).not.toContain('flights');  // flight_following is false
    expect(ids).not.toContain('cbt');      // cbt_modules is false
    expect(ids).not.toContain('audits');   // audit_program is false
  });

  // Starter tier includes more features
  it('starter tier includes flights and cbt but not audits', () => {
    const steps = filterOverviewSteps('admin', { tier: 'starter' });
    const ids = steps.map(s => s.id);
    expect(ids).toContain('flights');
    expect(ids).toContain('cbt');
    expect(ids).not.toContain('audits'); // audit_program is false on starter
  });

  // Professional tier includes audits
  it('professional tier includes audits', () => {
    const steps = filterOverviewSteps('admin', { tier: 'professional' });
    const ids = steps.map(s => s.id);
    expect(ids).toContain('audits');
  });

  // 27.3.3 Non-admin skips admin-only overview steps
  it('pilot skips admin-only overview steps', () => {
    const steps = filterOverviewSteps('pilot', { tier: 'professional' });
    const ids = steps.map(s => s.id);
    expect(ids).not.toContain('audits'); // adminOnly
    expect(ids).not.toContain('admin');  // adminOnly
    expect(ids).toContain('dashboard');
    expect(ids).toContain('frat');
  });

  // Enterprise shows everything for admin
  it('enterprise admin sees all overview steps', () => {
    const steps = filterOverviewSteps('admin', { tier: 'enterprise' });
    const ids = steps.map(s => s.id);
    expect(ids).toContain('dashboard');
    expect(ids).toContain('frat');
    expect(ids).toContain('flights');
    expect(ids).toContain('reports');
    expect(ids).toContain('cbt');
    expect(ids).toContain('audits');
    expect(ids).toContain('admin');
  });
});

// ── 27.1: Trigger Conditions ──

describe('Onboarding trigger conditions', () => {
  function shouldShowOnboarding(org, profile) {
    if (!org || !profile) return false;
    if (org.onboarding_completed) return false;
    return true;
  }

  // 27.1.1 New user triggers onboarding
  it('new admin triggers onboarding', () => {
    expect(shouldShowOnboarding({ tier: 'starter' }, { role: 'admin' })).toBe(true);
  });

  // 27.1.2 Completed onboarding does not show
  it('completed onboarding does not show wizard', () => {
    expect(shouldShowOnboarding({ tier: 'starter', onboarding_completed: true }, { role: 'admin' })).toBe(false);
  });

  it('null org does not show wizard', () => {
    expect(shouldShowOnboarding(null, { role: 'admin' })).toBe(false);
  });
});
