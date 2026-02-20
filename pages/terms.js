import Head from "next/head";

const DARK = "#000000", CARD = "#161616", WHITE = "#FFFFFF", MUTED = "#888888", OFF_WHITE = "#E5E5E5", BORDER = "#232323", CYAN = "#22D3EE";
const LOGO_URL = "/logo.png";

export default function TermsOfService() {
  return (
    <>
      <Head><title>Terms of Service – PreflightSMS</title></Head>
      <div style={{ minHeight: "100vh", background: DARK, fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif", padding: "40px 20px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <a href="/"><img src={LOGO_URL} alt="PreflightSMS" style={{ height: 60, objectFit: "contain" }} /></a>
          </div>
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "40px 36px" }}>
            <style>{`@media(max-width:480px){.tos-card{padding:24px 18px !important}}`}</style>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: WHITE, fontFamily: "Georgia, serif", margin: "0 0 4px" }}>Terms of Service</h1>
            <p style={{ fontSize: 12, color: MUTED, margin: "0 0 32px" }}>Last updated: February 19, 2026</p>

            <Section title="1. Acceptance of Terms">
              By creating an account or using PreflightSMS ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you are using the Service on behalf of an organization, you represent that you have the authority to bind that organization to these Terms.
            </Section>

            <Section title="2. Description of Service">
              PreflightSMS is a cloud-based Safety Management System (SMS) designed for Part 135 and other aviation operators. The Service includes flight risk assessment tools, flight following, safety reporting, hazard tracking, crew management, training records, and related features. PreflightSMS is a supplementary tool and does not replace regulatory requirements, approved SMS programs, or the judgment of qualified aviation professionals.
            </Section>

            <Section title="3. Accounts and Registration">
              You must provide accurate, complete information when creating an account. You are responsible for maintaining the confidentiality of your login credentials and for all activity under your account. You must notify us immediately of any unauthorized use. One individual may not maintain more than one account without prior written consent.
            </Section>

            <Section title="4. Free Trial">
              New organizations receive a 14-day free trial with full access to all features of their selected plan. No credit card is required during the trial. At the end of the trial period, you must subscribe to a paid plan to continue using the Service. If you do not subscribe, your account will be placed in read-only mode. Your data will be retained for 90 days after trial expiration, after which it may be permanently deleted.
            </Section>

            <Section title="5. Subscriptions and Payment">
              Paid subscriptions are billed monthly in advance. All fees are non-refundable except as required by law. We reserve the right to change pricing with 30 days' notice. Failure to pay may result in suspension or termination of your account.
            </Section>

            <Section title="6. Your Data">
              You retain ownership of all data you submit to the Service ("Your Data"). You grant PreflightSMS a limited license to store, process, and display Your Data solely to provide and improve the Service. We will not sell, share, or distribute Your Data to third parties except as described in our Privacy Policy or as required by law.
            </Section>

            <Section title="7. Acceptable Use">
              You agree not to: (a) use the Service for any unlawful purpose; (b) attempt to gain unauthorized access to any part of the Service; (c) interfere with or disrupt the Service; (d) upload malicious code; (e) impersonate any person or entity; or (f) use the Service in any manner that could damage, disable, or impair the Service.
            </Section>

            <Section title="8. Aviation Disclaimer">
              PreflightSMS is a decision-support and recordkeeping tool. It does not provide operational control, dispatch authority, or regulatory compliance certification. All flight risk assessments, go/no-go decisions, and safety determinations remain the sole responsibility of the pilot-in-command and the certificate holder. PreflightSMS does not guarantee the accuracy, completeness, or timeliness of any risk assessment, weather data, or safety information presented through the Service.
            </Section>

            <Section title="9. Limitation of Liability">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, PREFLIGHTSMS AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR GOODWILL, ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID TO US IN THE TWELVE MONTHS PRECEDING THE CLAIM.
            </Section>

            <Section title="10. Indemnification">
              You agree to indemnify and hold harmless PreflightSMS from any claims, damages, losses, or expenses arising from your use of the Service, your violation of these Terms, or your violation of any rights of a third party.
            </Section>

            <Section title="11. Termination">
              Either party may terminate at any time. You may cancel your subscription through the admin panel or by contacting support. We may suspend or terminate your account for violation of these Terms with reasonable notice. Upon termination, your right to use the Service ceases immediately. We will make Your Data available for export for 30 days after termination.
            </Section>

            <Section title="12. Changes to Terms">
              We may update these Terms from time to time. We will notify you of material changes via email or in-app notification at least 14 days before they take effect. Continued use of the Service after changes take effect constitutes acceptance of the revised Terms.
            </Section>

            <Section title="13. Governing Law">
              These Terms are governed by the laws of the State of Washington, without regard to conflict of law provisions. Any disputes shall be resolved in the courts located in Spokane County, Washington.
            </Section>

            <Section title="14. Contact">
              Questions about these Terms? Contact us at <a href="mailto:support@preflightsms.com" style={{ color: CYAN }}>support@preflightsms.com</a>.
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
