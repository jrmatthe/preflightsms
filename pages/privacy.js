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
            <style>{`@media(max-width:480px){.privacy-card{padding:24px 18px !important}}`}</style>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: WHITE, fontFamily: "Georgia, serif", margin: "0 0 4px" }}>Privacy Policy</h1>
            <p style={{ fontSize: 12, color: MUTED, margin: "0 0 32px" }}>Last updated: March 18, 2026</p>

            <Section title="1. Information We Collect">
              <strong style={{ color: WHITE }}>Account Information:</strong> Name, email address, organization name, and role when you create an account.
              <br /><br />
              <strong style={{ color: WHITE }}>Aviation Operational Data:</strong> Flight risk assessments (FRATs), flight plans, flight following data, safety reports, hazard investigations, corrective actions, management of change records, internal audit and evaluation data, emergency response plans, safety performance indicators, crew records, training records, SMS manual content, safety policies, and related operational data you enter into the Service.
              <br /><br />
              <strong style={{ color: WHITE }}>Flight Integration Data:</strong> If you connect third-party dispatch or flight planning services (such as ForeFlight or SchedAero), we receive flight data including routes, aircraft assignments, departure/arrival times, passenger counts, fuel loads, and crew assignments from those services. This data is used solely to populate your flight risk assessments and flight following features.
              <br /><br />
              <strong style={{ color: WHITE }}>Flight Tracking Data:</strong> When flight following is active, we may query publicly available ADS-B data sources to obtain real-time aircraft position, altitude, speed, and heading information for aircraft in your fleet. This data is used solely to provide live flight tracking within the Service.
              <br /><br />
              <strong style={{ color: WHITE }}>Survey Responses:</strong> If your organization conducts safety culture surveys through the Service, individual responses are stored anonymously and are not linked to your user identity. Only aggregate results are visible to administrators.
              <br /><br />
              <strong style={{ color: WHITE }}>Usage Data:</strong> Log data including IP address, browser type, pages visited, and timestamps. We use this to maintain and improve the Service.
              <br /><br />
              <strong style={{ color: WHITE }}>Payment Information:</strong> When you subscribe to a paid plan, payment processing is handled by Stripe. We do not store your credit card number directly.
            </Section>

            <Section title="2. How We Use Your Information">
              We use your information to: (a) provide and operate the Service; (b) process payments; (c) send transactional emails (account confirmations, password resets, trial notifications, billing updates); (d) deliver in-app notifications including safety bulletins, audit findings, and corrective action assignments; (e) respond to support requests; (f) generate insurance safety scorecards and compliance reports at your request; (g) improve the Service; and (h) comply with legal obligations. We do not use your aviation operational data for any purpose other than providing the Service to you.
            </Section>

            <Section title="3. AI-Powered Features and Data Processing">
              PreflightSMS includes optional AI-powered features that use Anthropic's Claude API to assist with safety analysis. These features include: flight risk suggestions, safety report categorization, hazard identification, investigation analysis, lessons learned generation, risk assessments, audit checklist generation, policy drafting, and natural-language safety search.
              <br /><br />
              <strong style={{ color: WHITE }}>What data is sent:</strong> When you use an AI feature, relevant contextual data (such as hazard descriptions, report details, existing mitigations, and organizational safety data) is sent to Anthropic's API for processing. We do not send personally identifiable information (names, emails, or account credentials) to the AI provider. Data sent includes operational context such as hazard titles, descriptions, categories, corrective action summaries, and anonymized organizational data.
              <br /><br />
              <strong style={{ color: WHITE }}>How AI data is handled:</strong> Anthropic processes this data solely to generate a response and does not use it to train their models. Anthropic's data retention and processing practices are governed by their own privacy policy and API terms of service.
              <br /><br />
              <strong style={{ color: WHITE }}>AI usage logging:</strong> We log AI feature usage (feature type, token count, and estimated cost) per user for rate limiting and billing purposes. We do not log the content of AI prompts or responses.
              <br /><br />
              AI features are optional. You may use all core SMS features without invoking any AI functionality.
            </Section>

            <Section title="4. Data Sharing">
              We do not sell your personal information. We share data only with:
              <br /><br />
              (a) <strong style={{ color: WHITE }}>Infrastructure providers</strong> who assist in operating the Service (Supabase/AWS for hosting and database, Vercel for application delivery, Stripe for payment processing) under strict confidentiality agreements;
              <br /><br />
              (b) <strong style={{ color: WHITE }}>Anthropic</strong> (Claude AI) when you use AI-powered features, as described in Section 3;
              <br /><br />
              (c) <strong style={{ color: WHITE }}>Third-party integrations you authorize</strong> — if you connect ForeFlight, SchedAero, or other dispatch services, data flows between those services and PreflightSMS as necessary to provide the integration;
              <br /><br />
              (d) <strong style={{ color: WHITE }}>ADS-B data providers</strong> — we query publicly available ADS-B data using your aircraft tail numbers to provide live flight tracking;
              <br /><br />
              (e) Law enforcement when required by valid legal process; and
              <br /><br />
              (f) In connection with a merger, acquisition, or sale of assets, with prior notice.
            </Section>

            <Section title="5. Data Storage and Security">
              Your data is stored on servers provided by Supabase (backed by AWS) in the United States. We implement industry-standard security measures including encryption in transit (TLS) and at rest, row-level security policies, role-based access controls, and organization-level data isolation. However, no method of transmission or storage is 100% secure, and we cannot guarantee absolute security.
            </Section>

            <Section title="6. Data Retention">
              We retain your data for as long as your account is active. If you cancel your subscription, we retain your data for 90 days to allow for reactivation. After 90 days, your data may be permanently deleted. You may request earlier deletion by contacting us. AI usage logs are retained for billing and rate-limiting purposes and are deleted when your account data is deleted.
            </Section>

            <Section title="7. Your Rights">
              You have the right to: (a) access your personal data; (b) correct inaccurate data; (c) request deletion of your data; (d) export your data in a portable format, including safety reports, hazard registers, corrective actions, training records, and audit data; and (e) withdraw consent for optional data processing, including AI features. To exercise these rights, contact <a href="mailto:support@preflightsms.com" style={{ color: CYAN }}>support@preflightsms.com</a>.
            </Section>

            <Section title="8. Cookies">
              We use essential cookies required for authentication and session management. We do not use advertising or tracking cookies. No third-party analytics or advertising scripts are loaded.
            </Section>

            <Section title="9. Children's Privacy">
              The Service is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from children.
            </Section>

            <Section title="10. California Residents (CCPA)">
              If you are a California resident, you have the right to: know what personal information we collect, request deletion, and opt out of the sale of personal information. We do not sell personal information. To make a request, contact <a href="mailto:support@preflightsms.com" style={{ color: CYAN }}>support@preflightsms.com</a>.
            </Section>

            <Section title="11. International Users">
              If you access the Service from outside the United States, your data will be transferred to and processed in the United States. By using the Service, you consent to this transfer.
            </Section>

            <Section title="12. Changes to This Policy">
              We may update this Privacy Policy from time to time. We will notify you of material changes via email or in-app notification at least 14 days before they take effect.
            </Section>

            <Section title="13. Contact">
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
