import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ── Section 31: Responsive Design and Cross-Browser ──

// We need to dynamically import to get fresh module each time
let useIsMobile, setDesktopPreference;

beforeEach(async () => {
  vi.useFakeTimers();
  localStorage.clear();
  vi.resetModules();
  const mod = await import('../../lib/useIsMobile.js');
  useIsMobile = mod.default;
  setDesktopPreference = mod.setDesktopPreference;
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useIsMobile hook', () => {
  // 31.2.1 Mobile at 768px
  it('returns true when window width <= 768px', () => {
    Object.defineProperty(window, 'innerWidth', { value: 768, configurable: true });
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  // 31.1.1 Desktop at wide width
  it('returns false when window width > 768px', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true });
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it('returns true at 375px (typical mobile)', () => {
    Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true });
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it('returns false at 769px', () => {
    Object.defineProperty(window, 'innerWidth', { value: 769, configurable: true });
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it('returns false at 1920px', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1920, configurable: true });
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });
});

// ── 31.3: "Prefer Desktop" Override ──

describe('"Prefer Desktop" localStorage override', () => {
  // 31.3.1 Prefer Desktop overrides mobile detection
  it('returns false when preferDesktop is set even at mobile width', () => {
    Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true });
    localStorage.setItem('preferDesktop', 'true');

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  // 31.3.2 Clearing preference restores mobile
  it('returns true after clearing preferDesktop at mobile width', () => {
    Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true });
    // No preference set
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });
});

// ── setDesktopPreference ──

describe('setDesktopPreference()', () => {
  it('sets localStorage key when prefer=true', () => {
    setDesktopPreference(true);
    expect(localStorage.setItem).toHaveBeenCalledWith('preferDesktop', 'true');
  });

  it('removes localStorage key when prefer=false', () => {
    setDesktopPreference(false);
    expect(localStorage.removeItem).toHaveBeenCalledWith('preferDesktop');
  });
});

// ── 31.2.2 Debounce behavior ──

describe('Resize debounce', () => {
  it('responds to resize events with 150ms debounce', async () => {
    Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true });
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    // Simulate resize to mobile
    Object.defineProperty(window, 'innerWidth', { value: 600, configurable: true });
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });

    // Before debounce completes
    expect(result.current).toBe(false);

    // After debounce
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current).toBe(true);
  });
});
