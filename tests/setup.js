import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = String(value); }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((i) => Object.keys(store)[i] || null),
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

// Mock navigator — keep userAgent so react-dom doesn't throw, add onLine
Object.defineProperty(globalThis, 'navigator', {
  value: { onLine: true, userAgent: '' },
  writable: true,
  configurable: true,
});

// Mock fetch globally
globalThis.fetch = vi.fn();

// Mock console methods to reduce noise
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});
