// ── Offline Sync Queue ───────────────────────────────────────
// Queues failed Supabase operations and retries them when connectivity returns.
// Uses in-memory queue backed by a simple storage mechanism.
// Critical for flight following: FRAT submissions and ARRIVED status updates
// MUST eventually reach the server.

const QUEUE_KEY = "preflightsms_offline_queue";
let queue = [];
let retryInterval = null;
let onSyncCallback = null;

// Load queue from storage on init
export function initOfflineQueue(onSync) {
  onSyncCallback = onSync;
  try {
    const stored = localStorage.getItem(QUEUE_KEY);
    if (stored) queue = JSON.parse(stored);
  } catch (e) {}
  startRetryLoop();
  // Also retry when browser comes back online
  if (typeof window !== "undefined") {
    window.addEventListener("online", () => {
      console.log("[OfflineSync] Back online — flushing queue");
      flushQueue();
    });
  }
}

function persist() {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {}
}

// Add a failed operation to the queue
export function enqueue(operation) {
  // operation: { type: 'frat_submit' | 'flight_status' | 'safety_report', payload: {...}, timestamp: ISO }
  queue.push({ ...operation, id: Date.now() + Math.random().toString(36).slice(2), retries: 0, timestamp: new Date().toISOString() });
  persist();
  console.log(`[OfflineSync] Queued ${operation.type} — ${queue.length} pending`);
}

// Get current queue for UI display
export function getQueue() {
  return [...queue];
}

export function getQueueCount() {
  return queue.length;
}

// Try to flush all queued operations
export async function flushQueue() {
  if (queue.length === 0) return;
  if (!navigator.onLine) return;

  const { supabase } = await import("./supabase");
  if (!supabase) return;

  // Test connectivity with a lightweight call
  try {
    const { error } = await supabase.from("organizations").select("id").limit(1);
    if (error) return; // Still no connection
  } catch (e) {
    return;
  }

  console.log(`[OfflineSync] Flushing ${queue.length} queued operations`);
  const failed = [];

  for (const op of queue) {
    try {
      let success = false;
      if (op.type === "frat_submit") {
        const { submitFRAT, createFlight } = await import("./supabase");
        const { data, error } = await submitFRAT(op.payload.orgId, op.payload.userId, op.payload.entry);
        if (!error && data) {
          await createFlight(op.payload.orgId, data.id, op.payload.entry);
          success = true;
        }
      } else if (op.type === "flight_status") {
        const { updateFlightStatus } = await import("./supabase");
        const { error } = await updateFlightStatus(op.payload.flightDbId, op.payload.status);
        if (!error) success = true;
      } else if (op.type === "safety_report") {
        const { submitReport } = await import("./supabase");
        const { error } = await submitReport(op.payload.orgId, op.payload.userId, op.payload.report);
        if (!error) success = true;
      }

      if (!success) {
        op.retries++;
        failed.push(op);
      } else {
        console.log(`[OfflineSync] Synced ${op.type} (${op.id})`);
      }
    } catch (e) {
      op.retries++;
      failed.push(op);
    }
  }

  queue = failed;
  persist();

  // Notify the app to refresh data if anything was synced
  if (failed.length < queue.length + failed.length && onSyncCallback) {
    onSyncCallback();
  }
}

// Retry loop - check every 15 seconds
function startRetryLoop() {
  if (retryInterval) return;
  retryInterval = setInterval(() => {
    if (queue.length > 0 && navigator.onLine) {
      flushQueue();
    }
  }, 15000);
}

export function stopRetryLoop() {
  if (retryInterval) {
    clearInterval(retryInterval);
    retryInterval = null;
  }
}
