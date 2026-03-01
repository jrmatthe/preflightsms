import { describe, it, expect } from 'vitest';
import { FREE_TIER_LIMITS, TIERS, hasFeature, isFreeTier } from '../../lib/tiers.js';

// ── Section 3: Free Tier Limits and Feature Gating ──

// ── 3.1: Free Tier Quantity Limits ──

describe('Free tier quantity limits', () => {
  // 3.1.1 Aircraft limit
  it('free tier limits to 1 aircraft', () => {
    expect(FREE_TIER_LIMITS.maxAircraft).toBe(1);
    expect(TIERS.free.maxAircraft).toBe(1);
  });

  // 3.1.2 User limit
  it('free tier limits to 1 user', () => {
    expect(FREE_TIER_LIMITS.maxUsers).toBe(1);
  });

  // 3.1.3 Corrective action limit
  it('free tier limits to 5 open corrective actions', () => {
    expect(FREE_TIER_LIMITS.maxOpenActions).toBe(5);
  });

  // 3.1.4 Policy limit
  it('free tier limits to 3 policies', () => {
    expect(FREE_TIER_LIMITS.maxPolicies).toBe(3);
  });

  // 3.1.5 ERP plan limit
  it('free tier limits to 1 ERP plan', () => {
    expect(FREE_TIER_LIMITS.maxErpPlans).toBe(1);
  });

  // 3.1.6 PDF watermark
  it('free tier has PDF watermark enabled', () => {
    expect(FREE_TIER_LIMITS.pdfWatermark).toBe(true);
  });
});

// ── freeGuard behavior (Section 3.3) ──

describe('freeGuard logic', () => {
  function freeGuard(org, resource, currentCount) {
    if (!isFreeTier(org)) return { blocked: false };

    const limits = {
      aircraft: FREE_TIER_LIMITS.maxAircraft,
      users: FREE_TIER_LIMITS.maxUsers,
      openActions: FREE_TIER_LIMITS.maxOpenActions,
      policies: FREE_TIER_LIMITS.maxPolicies,
      erpPlans: FREE_TIER_LIMITS.maxErpPlans,
    };

    const limit = limits[resource];
    if (limit !== undefined && currentCount >= limit) {
      return { blocked: true, message: `${resource} limit reached` };
    }
    return { blocked: false };
  }

  // 3.3.1 Blocked when limit met
  it('blocks aircraft creation when free tier limit reached', () => {
    const org = { tier: 'free' };
    const result = freeGuard(org, 'aircraft', 1);
    expect(result.blocked).toBe(true);
    expect(result.message).toMatch(/aircraft limit reached/i);
  });

  // 3.3.2 Passes when under limit
  it('allows aircraft creation when under limit', () => {
    const org = { tier: 'free' };
    const result = freeGuard(org, 'aircraft', 0);
    expect(result.blocked).toBe(false);
  });

  it('blocks user invitation when free tier limit reached', () => {
    const org = { tier: 'free' };
    const result = freeGuard(org, 'users', 1);
    expect(result.blocked).toBe(true);
  });

  it('blocks corrective action when 5 open', () => {
    const org = { tier: 'free' };
    const result = freeGuard(org, 'openActions', 5);
    expect(result.blocked).toBe(true);
  });

  // 10.2.2 Close one then create
  it('allows corrective action when under limit', () => {
    const org = { tier: 'free' };
    const result = freeGuard(org, 'openActions', 4);
    expect(result.blocked).toBe(false);
  });

  it('blocks policy creation when 3 exist', () => {
    const org = { tier: 'free' };
    const result = freeGuard(org, 'policies', 3);
    expect(result.blocked).toBe(true);
  });

  it('blocks ERP plan when 1 exists', () => {
    const org = { tier: 'free' };
    const result = freeGuard(org, 'erpPlans', 1);
    expect(result.blocked).toBe(true);
  });

  // Non-free tiers pass through
  it('never blocks on starter tier', () => {
    const org = { tier: 'starter' };
    expect(freeGuard(org, 'aircraft', 100).blocked).toBe(false);
    expect(freeGuard(org, 'users', 100).blocked).toBe(false);
  });

  it('never blocks on professional tier', () => {
    const org = { tier: 'professional' };
    expect(freeGuard(org, 'openActions', 999).blocked).toBe(false);
  });

  it('never blocks on enterprise tier', () => {
    const org = { tier: 'enterprise' };
    expect(freeGuard(org, 'policies', 999).blocked).toBe(false);
  });
});

// ── 3.2: Free Tier Feature Restrictions ──

describe('Free tier feature restrictions', () => {
  const freeOrg = { tier: 'free' };

  // 3.2.1 Flight Following gated
  it('flight_following is false on free tier', () => {
    expect(hasFeature(freeOrg, 'flight_following')).toBe(false);
  });

  // 3.2.2 CBT gated
  it('cbt_modules is false on free tier', () => {
    expect(hasFeature(freeOrg, 'cbt_modules')).toBe(false);
  });

  // 3.2.3 Investigations view-only
  it('hazard_register is view_only on free tier', () => {
    expect(hasFeature(freeOrg, 'hazard_register')).toBe('view_only');
  });

  // 3.2.4 SMS Manuals read-only
  it('sms_manuals is read_only on free tier', () => {
    expect(hasFeature(freeOrg, 'sms_manuals')).toBe('read_only');
  });

  // 3.2.5 Dashboard basic only
  it('dashboard_analytics is false on free tier', () => {
    expect(hasFeature(freeOrg, 'dashboard_analytics')).toBe(false);
  });

  // 3.2.6 Audit, ASAP, MOC locked
  it('audit_program is false on free tier', () => {
    expect(hasFeature(freeOrg, 'audit_program')).toBe(false);
  });

  it('asap_program is false on free tier', () => {
    expect(hasFeature(freeOrg, 'asap_program')).toBe(false);
  });

  it('management_of_change is false on free tier', () => {
    expect(hasFeature(freeOrg, 'management_of_change')).toBe(false);
  });

  // Basic features available
  it('frat is true on free tier', () => {
    expect(hasFeature(freeOrg, 'frat')).toBe(true);
  });

  it('safety_reporting is true on free tier', () => {
    expect(hasFeature(freeOrg, 'safety_reporting')).toBe(true);
  });

  it('corrective_actions is true on free tier', () => {
    expect(hasFeature(freeOrg, 'corrective_actions')).toBe(true);
  });

  it('policy_library is true on free tier', () => {
    expect(hasFeature(freeOrg, 'policy_library')).toBe(true);
  });

  it('dashboard_basic is true on free tier', () => {
    expect(hasFeature(freeOrg, 'dashboard_basic')).toBe(true);
  });
});

// ── FREE_TIER_LIMITS boolean flags ──

describe('Free tier boolean flags', () => {
  it('investigationsViewOnly is true', () => {
    expect(FREE_TIER_LIMITS.investigationsViewOnly).toBe(true);
  });

  it('smsManualReadOnly is true', () => {
    expect(FREE_TIER_LIMITS.smsManualReadOnly).toBe(true);
  });

  it('dashboardBasicOnly is true', () => {
    expect(FREE_TIER_LIMITS.dashboardBasicOnly).toBe(true);
  });

  it('pdfWatermark is true', () => {
    expect(FREE_TIER_LIMITS.pdfWatermark).toBe(true);
  });
});

// ── Starter tier limits ──

describe('Starter tier limits', () => {
  it('starter supports 5 aircraft', () => {
    expect(TIERS.starter.maxAircraft).toBe(5);
  });

  it('starter has flight_following enabled', () => {
    expect(TIERS.starter.features.flight_following).toBe(true);
  });

  it('starter has cbt_modules enabled', () => {
    expect(TIERS.starter.features.cbt_modules).toBe(true);
  });

  it('starter lacks audit_program', () => {
    expect(TIERS.starter.features.audit_program).toBe(false);
  });

  it('starter lacks management_of_change', () => {
    expect(TIERS.starter.features.management_of_change).toBe(false);
  });

  it('starter lacks asap_program', () => {
    expect(TIERS.starter.features.asap_program).toBe(false);
  });
});
