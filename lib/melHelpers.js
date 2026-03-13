// MEL (Minimum Equipment List) deferral helpers — pure utility, no Supabase dependency

export const CATEGORY_LIMITS = {
  A: { label: "Category A — As specified in MEL", days: null },
  B: { label: "Category B — 3 calendar days", days: 3 },
  C: { label: "Category C — 10 calendar days", days: 10 },
  D: { label: "Category D — 120 calendar days", days: 120 },
};

export function generateMelId() {
  return `mel-${Date.now().toString(36)}`;
}

export function calculateExpiration(category, deferredDate) {
  const days = CATEGORY_LIMITS[category]?.days;
  if (!days || !deferredDate) return null;
  const d = new Date(deferredDate + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function getActiveMelItems(melItems) {
  if (!Array.isArray(melItems)) return [];
  return melItems.filter(item => item.status === "open");
}

export function getMelExpirationStatus(item) {
  if (!item.expiration_date) return "ok";
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const exp = new Date(item.expiration_date + "T00:00:00");
  if (exp < now) return "expired";
  const diffDays = (exp - now) / (1000 * 60 * 60 * 24);
  if (diffDays <= 2) return "warning";
  return "ok";
}

export function getCategoryLabel(category) {
  return CATEGORY_LIMITS[category]?.label || category;
}

export function getDaysOpen(deferredDate) {
  if (!deferredDate) return 0;
  const start = new Date(deferredDate + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((now - start) / (1000 * 60 * 60 * 24)));
}
