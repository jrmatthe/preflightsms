import { describe, it, expect } from 'vitest';

// ── Section 2: Subscription Status and Read-Only Mode ──
// Tests for subscription status logic extracted from pages/index.js.

// Extracted logic from pages/index.js:
// isReadOnly = status in ['canceled', 'past_due']
// isSuspended = status === 'suspended'
// isTrialExpired = status === 'trial' && daysSinceCreation > 14

function getSubscriptionState(status, orgCreatedAt) {
  const isSuspended = status === 'suspended';
  const isReadOnly = status === 'canceled' || status === 'past_due';
  const isFree = status === 'free';
  const isActive = status === 'active';
  const isTrial = status === 'trial';

  let isTrialExpired = false;
  let trialDaysRemaining = 0;
  if (isTrial && orgCreatedAt) {
    const createdDate = new Date(orgCreatedAt);
    const now = new Date();
    const daysSince = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));
    isTrialExpired = daysSince > 14;
    trialDaysRemaining = Math.max(0, 14 - daysSince);
  }

  return { isSuspended, isReadOnly, isFree, isActive, isTrial, isTrialExpired, trialDaysRemaining };
}

// ── 2.1: Subscription Status Display ──

describe('Subscription state derivation', () => {
  // 2.1.1 Active subscription
  it('active status: isReadOnly=false, isSuspended=false', () => {
    const state = getSubscriptionState('active');
    expect(state.isActive).toBe(true);
    expect(state.isReadOnly).toBe(false);
    expect(state.isSuspended).toBe(false);
  });

  // 2.1.2 Trial within period
  it('trial with recent creation: isTrial=true, isTrialExpired=false', () => {
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 5); // 5 days ago
    const state = getSubscriptionState('trial', recentDate.toISOString());
    expect(state.isTrial).toBe(true);
    expect(state.isTrialExpired).toBe(false);
    expect(state.trialDaysRemaining).toBeGreaterThan(0);
  });

  // 2.1.3 Free tier
  it('free status: isFree=true, isReadOnly=false', () => {
    const state = getSubscriptionState('free');
    expect(state.isFree).toBe(true);
    expect(state.isReadOnly).toBe(false);
  });
});

// ── 2.2: Read-Only Mode ──

describe('Read-only mode', () => {
  // 2.2.1 Canceled → read-only
  it('canceled status: isReadOnly=true', () => {
    const state = getSubscriptionState('canceled');
    expect(state.isReadOnly).toBe(true);
    expect(state.isSuspended).toBe(false);
  });

  // 2.2.5 Past due → read-only
  it('past_due status: isReadOnly=true', () => {
    const state = getSubscriptionState('past_due');
    expect(state.isReadOnly).toBe(true);
  });

  // Active should NOT be read-only
  it('active status: isReadOnly=false', () => {
    const state = getSubscriptionState('active');
    expect(state.isReadOnly).toBe(false);
  });
});

// ── 2.3: Suspended State ──

describe('Suspended state', () => {
  // 2.3.1 Suspended
  it('suspended status: isSuspended=true', () => {
    const state = getSubscriptionState('suspended');
    expect(state.isSuspended).toBe(true);
  });

  // Other statuses not suspended
  it('canceled is not suspended', () => {
    const state = getSubscriptionState('canceled');
    expect(state.isSuspended).toBe(false);
  });
});

// ── 2.4: Trial Expiration ──

describe('Trial expiration', () => {
  // 2.4.1 Trial expired (> 14 days)
  it('trial created 15+ days ago: isTrialExpired=true', () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 16);
    const state = getSubscriptionState('trial', oldDate.toISOString());
    expect(state.isTrialExpired).toBe(true);
    expect(state.trialDaysRemaining).toBe(0);
  });

  // Trial on day 14
  it('trial created 14 days ago: isTrialExpired=false', () => {
    const borderDate = new Date();
    borderDate.setDate(borderDate.getDate() - 14);
    const state = getSubscriptionState('trial', borderDate.toISOString());
    expect(state.isTrialExpired).toBe(false);
  });

  // Trial just created
  it('trial created today: 14 days remaining', () => {
    const today = new Date();
    const state = getSubscriptionState('trial', today.toISOString());
    expect(state.isTrialExpired).toBe(false);
    expect(state.trialDaysRemaining).toBe(14);
  });

  // Non-trial ignores expiry
  it('active subscription ignores trial expiration', () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 100);
    const state = getSubscriptionState('active', oldDate.toISOString());
    expect(state.isTrialExpired).toBe(false);
  });
});

// ── roGuard behavior ──

describe('roGuard (read-only guard)', () => {
  // Simulates the roGuard function from pages/index.js
  function roGuard(isReadOnly, action) {
    if (isReadOnly) {
      return { blocked: true, message: 'Read-only mode -- subscription canceled' };
    }
    return { blocked: false };
  }

  // 2.2.2 FRAT submission blocked
  it('blocks mutations in read-only mode', () => {
    const result = roGuard(true, 'submitFRAT');
    expect(result.blocked).toBe(true);
    expect(result.message).toMatch(/Read-only mode/);
  });

  // Mutations pass when not read-only
  it('allows mutations in active mode', () => {
    const result = roGuard(false, 'submitFRAT');
    expect(result.blocked).toBe(false);
  });
});

// ── Trial expired view logic ──

describe('Trial expired view logic', () => {
  // 2.4.1 Non-admin sees full block
  function trialExpiredBehavior(role, isTrialExpired) {
    if (!isTrialExpired) return 'normal';
    if (role === 'pilot') return 'full_block';
    // Admin-group roles get admin-only access
    return 'admin_only';
  }

  // 2.4.1 Pilot → full block
  it('pilot gets full block on trial expiry', () => {
    expect(trialExpiredBehavior('pilot', true)).toBe('full_block');
  });

  // 2.4.2 Admin → admin-only access
  it('admin gets admin-only access on trial expiry', () => {
    expect(trialExpiredBehavior('admin', true)).toBe('admin_only');
  });

  it('safety_manager gets admin-only access on trial expiry', () => {
    expect(trialExpiredBehavior('safety_manager', true)).toBe('admin_only');
  });

  it('active trial shows normal behavior', () => {
    expect(trialExpiredBehavior('pilot', false)).toBe('normal');
  });
});
