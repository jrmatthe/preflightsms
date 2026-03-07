// Subscribe the browser to Web Push notifications
// Called after pilot clicks "Remind Me Later" — the perfect moment for the permission prompt

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export async function subscribeToPush(registration, authToken) {
  if (!('PushManager' in window)) return null;

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) {
    console.warn('[Push] NEXT_PUBLIC_VAPID_PUBLIC_KEY not set');
    return null;
  }

  try {
    // Check existing subscription first
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
    }

    const subJson = subscription.toJSON();

    // Save to backend
    await fetch('/api/subscribe-push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        endpoint: subJson.endpoint,
        p256dh: subJson.keys.p256dh,
        auth: subJson.keys.auth,
      }),
    });

    return subscription;
  } catch (err) {
    // Permission denied or other error — not fatal, client-side polling still works
    console.warn('[Push] Subscription failed:', err.message);
    return null;
  }
}
