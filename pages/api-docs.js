// API Documentation page — static reference for public API endpoints

import Head from "next/head";

const BLACK = "#000000", NEAR_BLACK = "#0A0A0A", DARK = "#111111", CARD = "#161616";
const BORDER = "#232323", WHITE = "#FFFFFF", OFF_WHITE = "#D4D4D4", MUTED = "#666666";
const GREEN = "#4ADE80", CYAN = "#22D3EE", YELLOW = "#FACC15", RED = "#EF4444";

const card = { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "20px 24px", marginBottom: 16 };
const code = { background: BLACK, border: `1px solid ${BORDER}`, borderRadius: 6, padding: "12px 16px", fontSize: 12, fontFamily: "monospace", color: OFF_WHITE, whiteSpace: "pre-wrap", overflowX: "auto", lineHeight: 1.6 };
const tag = (color) => ({ display: "inline-block", fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 4, color: BLACK, background: color, marginRight: 8 });

const ENDPOINTS = [
  {
    method: "GET", path: "/api/v1/frats", permission: "frats:read",
    desc: "List flight risk assessments with optional filters.",
    params: "?status=completed&pilot=John&aircraft=N12345&from=2026-01-01&to=2026-12-31&limit=50&offset=0",
    response: `{
  "data": [{
    "id": "uuid",
    "frat_code": "FRAT-001",
    "pilot": "John Smith",
    "aircraft": "King Air 350",
    "departure": "KJFK",
    "destination": "KBOS",
    "score": 22,
    "risk_level": "MODERATE",
    "approval_status": "approved",
    "created_at": "2026-02-24T12:00:00Z"
  }],
  "total": 1,
  "limit": 50,
  "offset": 0
}`
  },
  {
    method: "GET", path: "/api/v1/frats/:id", permission: "frats:read",
    desc: "Get a single FRAT by ID with full details including risk factors.",
    response: `{
  "data": {
    "id": "uuid",
    "frat_code": "FRAT-001",
    "pilot": "John Smith",
    "factors": [{"category": "weather", "label": "IFR conditions", "score": 5}],
    "wx_briefing": { "departure": {...}, "destination": {...} },
    ...
  }
}`
  },
  {
    method: "POST", path: "/api/v1/frats", permission: "frats:write", enterprise: true,
    desc: "Create a new draft FRAT. Requires Enterprise plan.",
    body: `{
  "pilot": "John Smith",
  "aircraft": "King Air 350",
  "tail_number": "N12345",
  "departure": "KJFK",
  "destination": "KBOS",
  "flight_date": "2026-03-01",
  "etd": "14:00",
  "ete": "1:30",
  "factors": [{"category": "weather", "label": "IFR", "score": 5}]
}`,
    response: `{ "data": { "id": "uuid", "frat_code": "FRAT-042", ... } }`
  },
  {
    method: "GET", path: "/api/v1/reports", permission: "reports:read",
    desc: "List safety reports with optional filters.",
    params: "?status=open&category=hazard&from=2026-01-01&to=2026-12-31&limit=50&offset=0",
    response: `{
  "data": [{
    "id": "uuid",
    "title": "Runway incursion near-miss",
    "category": "hazard",
    "status": "open",
    "severity": "high",
    "created_at": "2026-02-20T09:00:00Z"
  }],
  "total": 1, "limit": 50, "offset": 0
}`
  },
  {
    method: "GET", path: "/api/v1/reports/:id", permission: "reports:read",
    desc: "Get a single safety report by ID.",
    response: `{ "data": { "id": "uuid", "title": "...", "description": "...", ... } }`
  },
  {
    method: "POST", path: "/api/v1/reports", permission: "reports:write", enterprise: true,
    desc: "Create a new safety report. Requires Enterprise plan.",
    body: `{
  "title": "Fuel quantity discrepancy",
  "category": "hazard",
  "description": "Fuel gauges showed 200lbs more than actual...",
  "severity": "medium"
}`,
    response: `{ "data": { "id": "uuid", "title": "Fuel quantity discrepancy", ... } }`
  },
  {
    method: "GET", path: "/api/v1/fleet", permission: "fleet:read",
    desc: "List all aircraft in your fleet.",
    response: `{
  "data": [{
    "id": "uuid",
    "type": "King Air 350",
    "registration": "N12345",
    "tail_number": "N12345",
    "status": "active",
    "created_at": "2026-01-15T10:00:00Z"
  }]
}`
  },
  {
    method: "GET", path: "/api/v1/users", permission: "users:read",
    desc: "List users with roles. No passwords or tokens are exposed.",
    response: `{
  "data": [{
    "id": "uuid",
    "full_name": "John Smith",
    "email": "john@example.com",
    "role": "pilot",
    "permissions": ["flight_follower"],
    "created_at": "2026-01-10T08:00:00Z"
  }]
}`
  },
  {
    method: "GET", path: "/api/v1/training/compliance", permission: "training:read",
    desc: "Training compliance summary per user with requirement status.",
    response: `{
  "data": [{
    "user_id": "uuid",
    "full_name": "John Smith",
    "role": "pilot",
    "total_requirements": 5,
    "completed": 4,
    "compliance_pct": 80,
    "requirements": [{
      "requirement_id": "uuid",
      "requirement_name": "CRM Training",
      "current": true,
      "last_completed": "2026-01-15T00:00:00Z"
    }]
  }]
}`
  },
];

const WEBHOOK_EVENTS = [
  { id: "frat.completed", desc: "Fired when a FRAT is submitted" },
  { id: "report.submitted", desc: "Fired when a safety report is filed" },
  { id: "flight.overdue", desc: "Fired when a flight passes its ETA without arrival" },
  { id: "action.overdue", desc: "Fired when a corrective action passes its due date" },
  { id: "test.ping", desc: "Sent when you click Test in the admin panel" },
];

export default function ApiDocs() {
  return (
    <>
      <Head>
        <title>API Documentation | PreflightSMS</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div style={{ minHeight: "100vh", background: BLACK, color: OFF_WHITE, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
        <div style={{ maxWidth: 820, margin: "0 auto", padding: "40px 20px" }}>
          {/* Header */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <img src="/logo.png" alt="PreflightSMS" style={{ height: 28 }} />
              <span style={{ fontSize: 20, fontWeight: 800, color: WHITE }}>API Documentation</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: BLACK, background: CYAN, padding: "2px 8px", borderRadius: 3 }}>v1</span>
            </div>
            <div style={{ fontSize: 12, color: MUTED }}>REST API for integrating PreflightSMS data with external systems.</div>
          </div>

          {/* Authentication */}
          <div style={card}>
            <div style={{ fontSize: 14, fontWeight: 700, color: WHITE, marginBottom: 10 }}>Authentication</div>
            <div style={{ fontSize: 12, color: OFF_WHITE, marginBottom: 12 }}>
              All API requests must include a valid API key in the <code style={{ color: CYAN, background: `${CYAN}15`, padding: "1px 6px", borderRadius: 3, fontSize: 11 }}>Authorization</code> header.
            </div>
            <div style={code}>
              Authorization: Bearer pflt_your_api_key_here
            </div>
            <div style={{ fontSize: 11, color: MUTED, marginTop: 10 }}>
              API keys are created in Admin &rarr; API &amp; Webhooks. The full key is only shown once at creation. Store it securely.
            </div>
          </div>

          {/* Rate Limits */}
          <div style={card}>
            <div style={{ fontSize: 14, fontWeight: 700, color: WHITE, marginBottom: 10 }}>Rate Limits</div>
            <div style={{ fontSize: 12, color: OFF_WHITE, marginBottom: 8 }}>
              All endpoints are rate-limited to <strong style={{ color: WHITE }}>100 requests per minute</strong> per API key.
            </div>
            <div style={{ fontSize: 11, color: MUTED }}>
              Response headers include rate limit status:
            </div>
            <div style={{ ...code, marginTop: 8 }}>
{`X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95`}
            </div>
            <div style={{ fontSize: 11, color: MUTED, marginTop: 10 }}>
              When the limit is exceeded, the API returns <code style={{ color: RED, fontSize: 11 }}>429 Too Many Requests</code>.
            </div>
          </div>

          {/* Tier Access */}
          <div style={card}>
            <div style={{ fontSize: 14, fontWeight: 700, color: WHITE, marginBottom: 10 }}>Plan Access</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {[
                { tier: "Starter", access: "No API access", color: MUTED },
                { tier: "Professional", access: "Read-only (GET)", color: YELLOW },
                { tier: "Enterprise", access: "Full read/write", color: GREEN },
              ].map(t => (
                <div key={t.tier} style={{ padding: "12px 14px", borderRadius: 6, border: `1px solid ${BORDER}`, textAlign: "center" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: t.color, marginBottom: 4 }}>{t.tier}</div>
                  <div style={{ fontSize: 10, color: MUTED }}>{t.access}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Endpoints */}
          <div style={{ fontSize: 14, fontWeight: 700, color: WHITE, marginBottom: 12, marginTop: 32 }}>Endpoints</div>
          {ENDPOINTS.map((ep, i) => (
            <div key={i} style={card}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                <span style={tag(ep.method === "GET" ? GREEN : CYAN)}>{ep.method}</span>
                <code style={{ fontSize: 13, fontWeight: 600, color: WHITE, fontFamily: "monospace" }}>{ep.path}</code>
                <span style={{ fontSize: 9, color: MUTED, background: `${MUTED}22`, padding: "2px 8px", borderRadius: 4, fontFamily: "monospace" }}>{ep.permission}</span>
                {ep.enterprise && <span style={{ fontSize: 8, fontWeight: 700, color: BLACK, background: CYAN, padding: "2px 6px", borderRadius: 3 }}>ENTERPRISE</span>}
              </div>
              <div style={{ fontSize: 11, color: OFF_WHITE, marginBottom: 10 }}>{ep.desc}</div>
              {ep.params && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Query Parameters</div>
                  <div style={{ ...code, fontSize: 11, color: MUTED }}>{ep.params}</div>
                </div>
              )}
              {ep.body && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Request Body</div>
                  <div style={code}>{ep.body}</div>
                </div>
              )}
              <div>
                <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Response</div>
                <div style={code}>{ep.response}</div>
              </div>
            </div>
          ))}

          {/* Errors */}
          <div style={card}>
            <div style={{ fontSize: 14, fontWeight: 700, color: WHITE, marginBottom: 10 }}>Error Responses</div>
            <div style={{ fontSize: 12, color: OFF_WHITE, marginBottom: 10 }}>All errors return a JSON object with an <code style={{ color: RED, fontSize: 11 }}>error</code> field.</div>
            <div style={code}>
{`{ "error": "Missing permission: frats:read" }`}
            </div>
            <div style={{ marginTop: 12, fontSize: 11 }}>
              {[
                { code: "401", desc: "Invalid, expired, or missing API key", color: RED },
                { code: "403", desc: "Missing required permission", color: YELLOW },
                { code: "404", desc: "Resource not found", color: MUTED },
                { code: "405", desc: "Method not allowed", color: MUTED },
                { code: "429", desc: "Rate limit exceeded", color: YELLOW },
                { code: "500", desc: "Internal server error", color: RED },
              ].map(e => (
                <div key={e.code} style={{ display: "flex", gap: 12, padding: "4px 0" }}>
                  <code style={{ fontSize: 11, color: e.color, fontFamily: "monospace", width: 30 }}>{e.code}</code>
                  <span style={{ color: MUTED }}>{e.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Webhooks */}
          <div style={{ fontSize: 14, fontWeight: 700, color: WHITE, marginBottom: 12, marginTop: 32 }}>Webhooks</div>

          <div style={card}>
            <div style={{ fontSize: 14, fontWeight: 700, color: WHITE, marginBottom: 10 }}>Webhook Payload</div>
            <div style={{ fontSize: 12, color: OFF_WHITE, marginBottom: 10 }}>
              Webhooks deliver event notifications to your URL via HTTP POST with a JSON payload.
            </div>
            <div style={code}>
{`POST https://your-app.com/webhooks/preflight
Content-Type: application/json
X-Signature-256: sha256=abcdef1234567890...
X-Webhook-Event: frat.completed
User-Agent: PreflightSMS-Webhook/1.0

{
  "event": "frat.completed",
  "timestamp": "2026-02-24T15:30:00.000Z",
  "data": {
    "id": "uuid",
    "frat_code": "FRAT-042",
    "pilot": "John Smith",
    "score": 28,
    "risk_level": "MODERATE",
    ...
  }
}`}
            </div>
          </div>

          <div style={card}>
            <div style={{ fontSize: 14, fontWeight: 700, color: WHITE, marginBottom: 10 }}>Signature Verification</div>
            <div style={{ fontSize: 12, color: OFF_WHITE, marginBottom: 10 }}>
              Every webhook includes an HMAC-SHA256 signature in the <code style={{ color: CYAN, fontSize: 11 }}>X-Signature-256</code> header. Verify it using your webhook secret.
            </div>
            <div style={code}>
{`// Node.js signature verification
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

// In your webhook handler:
const isValid = verifyWebhook(
  req.body,           // raw request body string
  req.headers['x-signature-256'],
  YOUR_WEBHOOK_SECRET
);`}
            </div>
          </div>

          <div style={card}>
            <div style={{ fontSize: 14, fontWeight: 700, color: WHITE, marginBottom: 10 }}>Webhook Events</div>
            {WEBHOOK_EVENTS.map(ev => (
              <div key={ev.id} style={{ display: "flex", gap: 12, padding: "6px 0", borderBottom: `1px solid ${BORDER}` }}>
                <code style={{ fontSize: 11, color: CYAN, fontFamily: "monospace", width: 160, flexShrink: 0 }}>{ev.id}</code>
                <span style={{ fontSize: 11, color: MUTED }}>{ev.desc}</span>
              </div>
            ))}
          </div>

          <div style={card}>
            <div style={{ fontSize: 14, fontWeight: 700, color: WHITE, marginBottom: 10 }}>Failure Handling</div>
            <div style={{ fontSize: 12, color: OFF_WHITE, lineHeight: 1.8 }}>
              Webhooks have a <strong style={{ color: WHITE }}>10-second timeout</strong> per delivery attempt.<br />
              Non-2xx responses or timeouts increment a failure counter.<br />
              After <strong style={{ color: RED }}>10 consecutive failures</strong>, the webhook is automatically disabled.<br />
              Disabled webhooks can be reactivated from the Admin panel.
            </div>
          </div>

          {/* Footer */}
          <div style={{ textAlign: "center", padding: "32px 0 16px", color: MUTED, fontSize: 10, borderTop: `1px solid ${BORDER}`, marginTop: 16 }}>
            PreflightSMS API v1 · {new Date().getFullYear()}
          </div>
        </div>
      </div>
    </>
  );
}
