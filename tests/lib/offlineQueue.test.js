import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We need to test the module fresh each time since it has module-level state
let offlineQueue;

beforeEach(async () => {
  vi.useFakeTimers();
  localStorage.clear();
  vi.restoreAllMocks();
  // Re-spy console after restoreAllMocks
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});

  // Dynamically import to get fresh module state
  vi.resetModules();
  offlineQueue = await import('../../lib/offlineQueue.js');
});

afterEach(() => {
  offlineQueue.stopRetryLoop();
  vi.useRealTimers();
});

describe('enqueue()', () => {
  it('adds an operation to the queue', () => {
    offlineQueue.enqueue({ type: 'frat_submit', payload: { orgId: 'org1' } });
    expect(offlineQueue.getQueueCount()).toBe(1);
  });

  it('assigns a unique id to each operation', () => {
    offlineQueue.enqueue({ type: 'frat_submit', payload: {} });
    offlineQueue.enqueue({ type: 'flight_status', payload: {} });
    const queue = offlineQueue.getQueue();
    expect(queue[0].id).not.toBe(queue[1].id);
  });

  it('sets retries to 0', () => {
    offlineQueue.enqueue({ type: 'frat_submit', payload: {} });
    expect(offlineQueue.getQueue()[0].retries).toBe(0);
  });

  it('adds a timestamp', () => {
    offlineQueue.enqueue({ type: 'frat_submit', payload: {} });
    const item = offlineQueue.getQueue()[0];
    expect(item.timestamp).toBeDefined();
    expect(new Date(item.timestamp).getTime()).not.toBeNaN();
  });

  it('persists to localStorage', () => {
    offlineQueue.enqueue({ type: 'frat_submit', payload: {} });
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'preflightsms_offline_queue',
      expect.any(String)
    );
  });

  it('accumulates multiple operations', () => {
    offlineQueue.enqueue({ type: 'frat_submit', payload: {} });
    offlineQueue.enqueue({ type: 'flight_status', payload: {} });
    offlineQueue.enqueue({ type: 'safety_report', payload: {} });
    expect(offlineQueue.getQueueCount()).toBe(3);
  });
});

describe('getQueue()', () => {
  it('returns empty array when no items queued', () => {
    expect(offlineQueue.getQueue()).toEqual([]);
  });

  it('returns a copy (not a reference)', () => {
    offlineQueue.enqueue({ type: 'frat_submit', payload: {} });
    const q1 = offlineQueue.getQueue();
    const q2 = offlineQueue.getQueue();
    expect(q1).not.toBe(q2);
    expect(q1).toEqual(q2);
  });
});

describe('getQueueCount()', () => {
  it('returns 0 for empty queue', () => {
    expect(offlineQueue.getQueueCount()).toBe(0);
  });

  it('returns correct count', () => {
    offlineQueue.enqueue({ type: 'frat_submit', payload: {} });
    offlineQueue.enqueue({ type: 'flight_status', payload: {} });
    expect(offlineQueue.getQueueCount()).toBe(2);
  });
});

describe('initOfflineQueue()', () => {
  it('loads saved queue from localStorage', async () => {
    const saved = JSON.stringify([
      { id: 'test1', type: 'frat_submit', payload: {}, retries: 0, timestamp: new Date().toISOString() },
    ]);
    localStorage.getItem.mockReturnValueOnce(saved);

    vi.resetModules();
    const freshModule = await import('../../lib/offlineQueue.js');
    freshModule.initOfflineQueue(() => {});
    expect(freshModule.getQueueCount()).toBe(1);
    freshModule.stopRetryLoop();
  });

  it('handles corrupt localStorage gracefully', async () => {
    localStorage.getItem.mockReturnValueOnce('{{invalid json');

    vi.resetModules();
    const freshModule = await import('../../lib/offlineQueue.js');
    freshModule.initOfflineQueue(() => {});
    // Should not throw, queue remains empty
    expect(freshModule.getQueueCount()).toBe(0);
    freshModule.stopRetryLoop();
  });

  it('handles missing localStorage gracefully', async () => {
    localStorage.getItem.mockReturnValueOnce(null);

    vi.resetModules();
    const freshModule = await import('../../lib/offlineQueue.js');
    freshModule.initOfflineQueue(() => {});
    expect(freshModule.getQueueCount()).toBe(0);
    freshModule.stopRetryLoop();
  });
});

describe('flushQueue()', () => {
  it('does nothing when queue is empty', async () => {
    await offlineQueue.flushQueue();
    expect(offlineQueue.getQueueCount()).toBe(0);
  });

  it('does nothing when offline', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    offlineQueue.enqueue({ type: 'frat_submit', payload: {} });
    await offlineQueue.flushQueue();
    expect(offlineQueue.getQueueCount()).toBe(1);
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  });
});

describe('flushQueue() sync callback', () => {
  it('FIXED: calls onSyncCallback when at least one operation succeeds', async () => {
    // This tests the fix for BUG-025: the comparison now uses originalLength
    // instead of the broken queue.length + failed.length
    const syncCallback = vi.fn();
    offlineQueue.initOfflineQueue(syncCallback);

    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

    // Enqueue an operation that will succeed
    offlineQueue.enqueue({ type: 'flight_status', payload: { flightDbId: 'f1', status: 'ARRIVED' } });

    // Mock the dynamic imports inside flushQueue
    // We need to mock the supabase module that flushQueue imports
    vi.doMock('../../lib/supabase', () => ({
      supabase: {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          then: (resolve) => resolve({ error: null }),
        })),
      },
      updateFlightStatus: vi.fn().mockResolvedValue({ error: null }),
    }));

    await offlineQueue.flushQueue();

    // With the fix, failed.length (0) < originalLength (1) triggers callback
    expect(syncCallback).toHaveBeenCalled();
  });
});

describe('stopRetryLoop()', () => {
  it('stops the retry interval', () => {
    offlineQueue.initOfflineQueue(() => {});
    offlineQueue.stopRetryLoop();
    // No error — just verifying it doesn't throw
  });

  it('can be called multiple times safely', () => {
    offlineQueue.stopRetryLoop();
    offlineQueue.stopRetryLoop();
    // No error
  });
});
