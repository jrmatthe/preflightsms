// Simple circuit breaker for external API calls (ForeFlight, Resend, NOAA, etc.)
// States: CLOSED (normal) → OPEN (failing, reject immediately) → HALF_OPEN (try one request)
// After `threshold` failures within `windowMs`, circuit opens for `cooldownMs`.

const circuits = {};

export function callWithBreaker(name, fn, options = {}) {
  const { threshold = 5, cooldownMs = 60000, windowMs = 120000 } = options;

  if (!circuits[name]) {
    circuits[name] = { state: 'CLOSED', failures: [], openedAt: null };
  }
  const circuit = circuits[name];

  // Clean old failures outside window
  const now = Date.now();
  circuit.failures = circuit.failures.filter(t => now - t < windowMs);

  // If OPEN, check if cooldown has passed
  if (circuit.state === 'OPEN') {
    if (now - circuit.openedAt > cooldownMs) {
      circuit.state = 'HALF_OPEN';
    } else {
      return Promise.reject(new Error(`Circuit breaker OPEN for ${name} — try again later`));
    }
  }

  return fn().then(result => {
    if (circuit.state === 'HALF_OPEN') circuit.state = 'CLOSED';
    circuit.failures = [];
    return result;
  }).catch(err => {
    circuit.failures.push(now);
    if (circuit.failures.length >= threshold || circuit.state === 'HALF_OPEN') {
      circuit.state = 'OPEN';
      circuit.openedAt = now;
    }
    throw err;
  });
}

export function getCircuitState(name) {
  return circuits[name]?.state || 'CLOSED';
}
