import { describe, it, expect } from 'vitest';
import { TIERS, FEATURE_LABELS, hasFeature, getTierFeatures, NAV_FEATURE_MAP } from '../../lib/tiers.js';

// ── TIER DEFINITIONS ─────────────────────────────────────────

describe('TIERS', () => {
  it('defines exactly three tiers', () => {
    const tierNames = Object.keys(TIERS);
    expect(tierNames).toEqual(['starter', 'professional', 'enterprise']);
  });

  it('each tier has required fields', () => {
    for (const [name, tier] of Object.entries(TIERS)) {
      expect(tier).toHaveProperty('name');
      expect(tier).toHaveProperty('maxAircraft');
      expect(tier).toHaveProperty('features');
      expect(typeof tier.name).toBe('string');
      expect(typeof tier.maxAircraft).toBe('number');
      expect(typeof tier.features).toBe('object');
    }
  });

  it('tiers have ascending maxAircraft limits', () => {
    expect(TIERS.starter.maxAircraft).toBeLessThan(TIERS.professional.maxAircraft);
    expect(TIERS.professional.maxAircraft).toBeLessThan(TIERS.enterprise.maxAircraft);
  });

  it('starter costs $149', () => {
    expect(TIERS.starter.price).toBe(149);
  });

  it('professional costs $299', () => {
    expect(TIERS.professional.price).toBe(299);
  });

  it('enterprise has null (custom) pricing', () => {
    expect(TIERS.enterprise.price).toBeNull();
  });

  it('starter maxAircraft is 5', () => {
    expect(TIERS.starter.maxAircraft).toBe(5);
  });

  it('professional maxAircraft is 15', () => {
    expect(TIERS.professional.maxAircraft).toBe(15);
  });

  it('enterprise maxAircraft is 999', () => {
    expect(TIERS.enterprise.maxAircraft).toBe(999);
  });
});

// ── FEATURE FLAGS PER TIER ─────────────────────────────────────

describe('Tier feature flags', () => {
  const allFeatureKeys = Object.keys(TIERS.enterprise.features);

  it('all tiers have the same set of feature keys', () => {
    for (const tier of Object.values(TIERS)) {
      expect(Object.keys(tier.features).sort()).toEqual(allFeatureKeys.sort());
    }
  });

  it('all feature values are boolean', () => {
    for (const tier of Object.values(TIERS)) {
      for (const [key, val] of Object.entries(tier.features)) {
        expect(typeof val).toBe('boolean');
      }
    }
  });

  it('enterprise has all features enabled', () => {
    for (const [key, val] of Object.entries(TIERS.enterprise.features)) {
      expect(val).toBe(true);
    }
  });

  it('starter has core features but not advanced features', () => {
    // Core features (enabled)
    expect(TIERS.starter.features.frat).toBe(true);
    expect(TIERS.starter.features.fleet).toBe(true);
    expect(TIERS.starter.features.flight_following).toBe(true);
    expect(TIERS.starter.features.safety_reporting).toBe(true);
    expect(TIERS.starter.features.hazard_register).toBe(true);
    expect(TIERS.starter.features.corrective_actions).toBe(true);
    expect(TIERS.starter.features.policy_library).toBe(true);
    expect(TIERS.starter.features.training_records).toBe(true);
    expect(TIERS.starter.features.dashboard_basic).toBe(true);

    // Advanced features (disabled)
    expect(TIERS.starter.features.dashboard_analytics).toBe(false);
    expect(TIERS.starter.features.custom_frat_template).toBe(false);
    expect(TIERS.starter.features.cbt_modules).toBe(false);
    expect(TIERS.starter.features.role_permissions).toBe(false);
    expect(TIERS.starter.features.approval_workflow).toBe(false);
    expect(TIERS.starter.features.sms_manuals).toBe(false);
    expect(TIERS.starter.features.api_access).toBe(false);
  });

  it('professional enables most features but not api_access, multi_base, custom_integrations', () => {
    expect(TIERS.professional.features.dashboard_analytics).toBe(true);
    expect(TIERS.professional.features.cbt_modules).toBe(true);
    expect(TIERS.professional.features.sms_manuals).toBe(true);
    expect(TIERS.professional.features.approval_workflow).toBe(true);
    expect(TIERS.professional.features.priority_support).toBe(true);

    expect(TIERS.professional.features.api_access).toBe(false);
    expect(TIERS.professional.features.multi_base).toBe(false);
    expect(TIERS.professional.features.custom_integrations).toBe(false);
  });

  it('higher tiers are strict supersets of lower tiers', () => {
    // Everything enabled in starter should be enabled in professional
    for (const [key, val] of Object.entries(TIERS.starter.features)) {
      if (val === true) {
        expect(TIERS.professional.features[key]).toBe(true);
      }
    }
    // Everything enabled in professional should be enabled in enterprise
    for (const [key, val] of Object.entries(TIERS.professional.features)) {
      if (val === true) {
        expect(TIERS.enterprise.features[key]).toBe(true);
      }
    }
  });
});

// ── FEATURE_LABELS ─────────────────────────────────────────

describe('FEATURE_LABELS', () => {
  it('has a label for every feature key in tiers', () => {
    const allFeatureKeys = Object.keys(TIERS.enterprise.features);
    for (const key of allFeatureKeys) {
      expect(FEATURE_LABELS).toHaveProperty(key);
      expect(typeof FEATURE_LABELS[key]).toBe('string');
      expect(FEATURE_LABELS[key].length).toBeGreaterThan(0);
    }
  });

  it('has no extra labels beyond what tiers define', () => {
    const allFeatureKeys = Object.keys(TIERS.enterprise.features);
    for (const key of Object.keys(FEATURE_LABELS)) {
      expect(allFeatureKeys).toContain(key);
    }
  });
});

// ── hasFeature() ─────────────────────────────────────────

describe('hasFeature()', () => {
  it('returns false for null org', () => {
    expect(hasFeature(null, 'frat')).toBe(false);
  });

  it('returns false for undefined org', () => {
    expect(hasFeature(undefined, 'frat')).toBe(false);
  });

  it('returns tier default for org without feature_flags', () => {
    const org = { tier: 'starter' };
    expect(hasFeature(org, 'frat')).toBe(true);
    expect(hasFeature(org, 'cbt_modules')).toBe(false);
  });

  it('defaults to starter tier when org.tier is missing', () => {
    const org = {};
    expect(hasFeature(org, 'frat')).toBe(true);
    expect(hasFeature(org, 'cbt_modules')).toBe(false);
  });

  it('uses professional tier features', () => {
    const org = { tier: 'professional' };
    expect(hasFeature(org, 'cbt_modules')).toBe(true);
    expect(hasFeature(org, 'api_access')).toBe(false);
  });

  it('uses enterprise tier features', () => {
    const org = { tier: 'enterprise' };
    expect(hasFeature(org, 'api_access')).toBe(true);
    expect(hasFeature(org, 'custom_integrations')).toBe(true);
  });

  it('feature_flags override tier defaults (enable)', () => {
    const org = { tier: 'starter', feature_flags: { cbt_modules: true } };
    expect(hasFeature(org, 'cbt_modules')).toBe(true);
  });

  it('feature_flags override tier defaults (disable)', () => {
    const org = { tier: 'enterprise', feature_flags: { api_access: false } };
    expect(hasFeature(org, 'api_access')).toBe(false);
  });

  it('falls through to tier default for flags not in feature_flags', () => {
    const org = { tier: 'professional', feature_flags: { cbt_modules: true } };
    expect(hasFeature(org, 'frat')).toBe(true);
    expect(hasFeature(org, 'api_access')).toBe(false);
  });

  it('returns false for unknown feature key', () => {
    const org = { tier: 'enterprise' };
    expect(hasFeature(org, 'nonexistent_feature')).toBe(false);
  });

  it('handles non-object feature_flags gracefully', () => {
    const org = { tier: 'starter', feature_flags: 'invalid' };
    expect(hasFeature(org, 'frat')).toBe(true);
  });

  it('handles unknown tier by returning false', () => {
    const org = { tier: 'nonexistent' };
    expect(hasFeature(org, 'frat')).toBe(false);
  });
});

// ── getTierFeatures() ─────────────────────────────────────────

describe('getTierFeatures()', () => {
  it('returns features for valid tier', () => {
    const features = getTierFeatures('professional');
    expect(features).toEqual(TIERS.professional.features);
  });

  it('falls back to starter for unknown tier', () => {
    const features = getTierFeatures('nonexistent');
    expect(features).toEqual(TIERS.starter.features);
  });

  it('falls back to starter for undefined', () => {
    const features = getTierFeatures(undefined);
    expect(features).toEqual(TIERS.starter.features);
  });

  it('falls back to starter for null', () => {
    const features = getTierFeatures(null);
    expect(features).toEqual(TIERS.starter.features);
  });

  it('returns the exact feature object (reference equality)', () => {
    expect(getTierFeatures('enterprise')).toBe(TIERS.enterprise.features);
  });
});

// ── NAV_FEATURE_MAP ─────────────────────────────────────────

describe('NAV_FEATURE_MAP', () => {
  it('maps nav items to feature keys', () => {
    expect(NAV_FEATURE_MAP.fleet).toBe('fleet');
    expect(NAV_FEATURE_MAP.submit).toBe('frat');
    expect(NAV_FEATURE_MAP.flights).toBe('flight_following');
    expect(NAV_FEATURE_MAP.reports).toBe('safety_reporting');
    expect(NAV_FEATURE_MAP.hazards).toBe('hazard_register');
    expect(NAV_FEATURE_MAP.actions).toBe('corrective_actions');
    expect(NAV_FEATURE_MAP.policy).toBe('policy_library');
    expect(NAV_FEATURE_MAP.cbt).toBe('cbt_modules');
    expect(NAV_FEATURE_MAP.audit).toBe('faa_audit_log');
    expect(NAV_FEATURE_MAP.manuals).toBe('sms_manuals');
    expect(NAV_FEATURE_MAP.dashboard).toBe('dashboard_basic');
  });

  it('admin tab is always available (null feature)', () => {
    expect(NAV_FEATURE_MAP.admin).toBeNull();
  });

  it('all mapped features exist in tier definitions', () => {
    const allFeatures = Object.keys(TIERS.enterprise.features);
    for (const [nav, feature] of Object.entries(NAV_FEATURE_MAP)) {
      if (feature !== null) {
        expect(allFeatures).toContain(feature);
      }
    }
  });
});
