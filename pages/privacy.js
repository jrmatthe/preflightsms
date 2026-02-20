import Head from "next/head";

const DARK = "#000000", CARD = "#161616", WHITE = "#FFFFFF", MUTED = "#888888", OFF_WHITE = "#E5E5E5", BORDER = "#232323", CYAN = "#22D3EE";
const LOGO_URL = "/logo.png";

export default function PrivacyPolicy() {
  return (
    <>
      <Head><title>Privacy Policy – PreflightSMS</title></Head>
      <div style={{ minHeight: "100vh", background: DARK, fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif", padding: "40px 20px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <a href="/"><img src={LOGO_URL} alt="PreflightSMS" style={{ height: 60, objectFit: "contain" }} /></a>
          </div>
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "40px 36px" }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: WHITE, fontFamily: "Georgia, serif", margin: "0 0 4px" }}>Privacy Policy</h1>
            <p style={{ fontSize: 12, color: MUTED, margin: "0 0 32px" }}>Last updated: February 19, 2026</p>

            <Section title="1. Information We Collect">
              <strong style={{ color: WHITE }}>Account Information:</strong> Name, email address, organization name, and role when you create an account.
              <br /><br />
              <strong style={{ color: WHITE }}>Aviation Data:</strong> Flight risk assessments, flight plans, safety reports, hazard reports, corrective actions, crew records, training records, and related operational data you enter into the Service.
              <br /><br />
              <strong style={{ color: WHITE }}>Usage Data:</strong> Log data including IP address, browser type, pages visited, and timestamps. We use this to maintain and improve the Service.
              <br /><br />
              <strong style={{ color: WHITE }}>Payment Information:</strong> When you subscribe to a paid plan, payment processing is handled by Stripe. We do not store your credit card number directly.
            </Section>

            <Section title="2. How We Use Your Information">
              We use your information to: (a) provide and operate the Service; (b) process payments; (c) send transactional emails (account confirmations, password resets, trial notifications, billing updates); (d) respond to support requests; (e) improve the Service; and (f) comply with legal obligations. We do not use your aviation operational data for any purpose other than providing the Service to you.
            </Section>

            <Section title="3. Data Sharing">
              We do not sell your personal information. We share data only with: (a) service providers who assist in operating the Service (hosting, email delivery, payment processing) under strict confidentiality agreements; (b) law enforcement when required by valid legal process; and (c) in connection with a merger, acquisition, or sale of assets, with prior notice.
            </Section>

            <Section title="4. Data Storage and Security">
              Your data is stored on servers provided by Supabase (backed by AWS) in the United States. We implement industry-standard security measures including encryption in transit (TLS) and at rest, row-level security policies, and access controls. However, no method of transmission or storage is 100% secure, and we cannot guarantee absolute security.
            </Section>

            <Section title="5. Data Retention">
              We retain your data for as long as your account is active. If you cancel your subscription, we retain your data for 90 days to allow for reactivation. After 90 days, your data may be permanently deleted. You may request earlier deletion by contacting us.
            </Section>

            <Section title="6. Your Rights">
              You have the right to: (a) access your personal data; (b) correct inaccurate data; (c) request deletion of your data; (d) export your data in a portable format; and (e) withdraw consent for optional data processing. To exercise these rights, contact <a href="mailto:support@preflightsms.com" style={{ color: CYAN }}>support@preflightsms.com</a>.
            </Section>

            <Section title="7. Cookies">
              We use essential cookies required for authentication and session management. We do not use advertising or tracking cookies. No third-party analytics or advertising scripts are loaded.
            </Section>

            <Section title="8. Children's Privacy">
              The Service is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from children.
            </Section>

            <Section title="9. California Residents (CCPA)">
              If you are a California resident, you have the right to: know what personal information we collect, request deletion, and opt out of the sale of personal information. We do not sell personal information. To make a request, contact <a href="mailto:support@preflightsms.com" style={{ color: CYAN }}>support@preflightsms.com</a>.
            </Section>

            <Section title="10. International Users">
              If you access the Service from outside the United States, your data will be transferred to and processed in the United States. By using the Service, you consent to this transfer.
            </Section>

            <Section title="11. Changes to This Policy">
              We may update this Privacy Policy from time to time. We will notify you of material changes via email or in-app notification at least 14 days before they take effect.
            </Section>

            <Section title="12. Contact">
              Questions about this Privacy Policy? Contact us at <a href="mailto:support@preflightsms.com" style={{ color: CYAN }}>support@preflightsms.com</a>.
            </Section>
          </div>
          <div style={{ textAlign: "center", padding: "24px 0", fontSize: 10, color: MUTED }}>© 2026 PreflightSMS. All rights reserved.</div>
        </div>
      </div>
    </>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, color: "#FFFFFF", margin: "0 0 8px" }}>{title}</h2>
      <p style={{ fontSize: 13, color: "#CCCCCC", lineHeight: 1.7, margin: 0 }}>{children}</p>
    </div>
  );
}
