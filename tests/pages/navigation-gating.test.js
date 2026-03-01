import { describe, it, expect } from 'vitest';
import { NAV_FEATURE_MAP, hasFeature, TIERS } from '../../lib/tiers.js';

// ── Section 4: Navigation and Feature Gating by Tier ──

// ── 4.4: Feature Gating Behavior per Tier (NAV_FEATURE_MAP) ──

const tiers = ['free', 'starter', 'professional', 'enterprise'];

// Expected nav feature availability per tier from the test plan table
const NAV_EXPECTATIONS = {
  fleet:     { free: true,       starter: true,  professional: true, enterprise: true },
  submit:    { free: true,       starter: true,  professional: true, enterprise: true },
  flights:   { free: false,      starter: true,  professional: true, enterprise: true },
  reports:   { free: true,       starter: true,  professional: true, enterprise: true },
  hazards:   { free: 'view_only', starter: true, professional: true, enterprise: true },
  actions:   { free: true,       starter: true,  professional: true, enterprise: true },
  policy:    { free: true,       starter: true,  professional: true, enterprise: true },
  cbt:       { free: false,      starter: true,  professional: true, enterprise: true },
  audits:    { free: false,      starter: false, professional: true, enterprise: true },
  moc:       { free: false,      starter: false, professional: true, enterprise: true },
  asap:      { free: false,      starter: false, professional: false, enterprise: true },
  dashboard: { free: true,       starter: true,  professional: true, enterprise: true },
  admin:     { free: true,       starter: true,  professional: true, enterprise: true },
};

describe('NAV_FEATURE_MAP gating per tier', () => {
  for (const [navItem, expectations] of Object.entries(NAV_EXPECTATIONS)) {
    describe(`nav item: ${navItem}`, () => {
      for (const tier of tiers) {
        const expected = expectations[tier];
        const featureKey = NAV_FEATURE_MAP[navItem];

        if (featureKey === null) {
          // Admin tab - always available
          it(`${tier}: always available (null feature key)`, () => {
            expect(NAV_FEATURE_MAP[navItem]).toBeNull();
          });
        } else {
          it(`${tier}: ${expected === false ? 'GATED' : expected === 'view_only' ? 'VIEW ONLY' : 'accessible'}`, () => {
            const org = { tier };
            const result = hasFeature(org, featureKey);
            if (expected === true) {
              expect(result).toBeTruthy();
              if (tier !== 'free') {
                // Non-free tiers should return exactly true (not 'view_only' or 'read_only')
                expect(result).toBe(true);
              }
            } else if (expected === false) {
              expect(result).toBe(false);
            } else {
              // 'view_only' or 'read_only'
              expect(result).toBe(expected);
            }
          });
        }
      }
    });
  }
});

// ── 4.1: Desktop Navigation Sidebar Visibility ──

describe('Sidebar section visibility', () => {
  // 4.1.2 Starter: Compliance gated
  it('Starter tier: audit_program is false', () => {
    expect(TIERS.starter.features.audit_program).toBe(false);
  });

  // 4.1.3 Professional: Compliance accessible
  it('Professional tier: audit_program is true', () => {
    expect(TIERS.professional.features.audit_program).toBe(true);
  });

  // 4.1.4 Enterprise: all unlocked
  it('Enterprise tier: all features are true', () => {
    const features = TIERS.enterprise.features;
    for (const [key, val] of Object.entries(features)) {
      expect(val).toBe(true);
    }
  });
});

// ── URL-based navigation gating (Section 4.3) ──

describe('URL-based navigation tab resolution', () => {
  function resolveTab(tab, org) {
    const featureKey = NAV_FEATURE_MAP[tab];
    if (featureKey === null || featureKey === undefined) return { allowed: true, tab };
    const access = hasFeature(org, featureKey);
    if (access === false) return { allowed: false, redirect: 'dashboard' };
    return { allowed: true, tab, viewOnly: access === 'view_only' || access === 'read_only' };
  }

  // 4.3.1 Valid tab
  it('resolves valid tab on appropriate tier', () => {
    const result = resolveTab('reports', { tier: 'starter' });
    expect(result.allowed).toBe(true);
    expect(result.tab).toBe('reports');
  });

  // 4.3.2 Gated tab redirects
  it('redirects gated tab to dashboard', () => {
    const result = resolveTab('audits', { tier: 'free' });
    expect(result.allowed).toBe(false);
    expect(result.redirect).toBe('dashboard');
  });

  it('admin tab is always allowed', () => {
    const result = resolveTab('admin', { tier: 'free' });
    expect(result.allowed).toBe(true);
  });

  it('view_only feature returns viewOnly flag', () => {
    const result = resolveTab('hazards', { tier: 'free' });
    expect(result.allowed).toBe(true);
    expect(result.viewOnly).toBe(true);
  });
});
