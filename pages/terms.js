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
            <p style={{ fontSize: 12, color: MUTED, margin: "0 0 32px" }}>Last updated: April 2, 2026</p>

            <Section title="1. Acceptance of Terms">
              By creating an account or using PreflightSMS ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you are using the Service on behalf of an organization, you represent that you have the authority to bind that organization to these Terms.
            </Section>

            <Section title="2. Description of Service">
              PreflightSMS is a cloud-based Safety Management System (SMS) designed for Part 135 and other aviation operators. The Service includes:
              <br /><br />
              <strong style={{ color: WHITE }}>Core SMS Features:</strong> Flight risk assessment tools (FRAT), flight following and tracking, safety reporting, hazard investigation and tracking, corrective action management, management of change (MOC), internal evaluation program (audits), safety performance indicators (SPIs), emergency response planning, safety culture surveys, and compliance tracking.
              <br /><br />
              <strong style={{ color: WHITE }}>Documentation Features:</strong> SMS manual authoring with templates, safety policy management, training and competency-based training (CBT) records, and document management.
              <br /><br />
              <strong style={{ color: WHITE }}>Integration Features:</strong> ForeFlight and SchedAero dispatch integration, real-time ADS-B flight tracking, insurance safety scorecard generation, and API access.
              <br /><br />
              <strong style={{ color: WHITE }}>AI-Powered Features:</strong> Optional AI assistance for risk analysis, hazard identification, investigation analysis, lessons learned generation, audit checklist generation, policy drafting, safety report categorization, and natural-language safety search. AI features are powered by Anthropic's Claude and are subject to Section 8a below.
              <br /><br />
              PreflightSMS is a supplementary tool and does not replace regulatory requirements, approved SMS programs, or the judgment of qualified aviation professionals.
            </Section>

            <Section title="3. Accounts and Registration">
              You must provide accurate, complete information when creating an account. You are responsible for maintaining the confidentiality of your login credentials and for all activity under your account. You must notify us immediately of any unauthorized use. One individual may not maintain more than one account without prior written consent.
            </Section>

            <Section title="4. Free Trial">
              New organizations receive a 14-day free trial with full access to all features of their selected plan. No credit card is required during the trial. At the end of the trial period, you must subscribe to a paid plan to continue using the Service. If you do not subscribe, your account will be placed in read-only mode. Your data will be retained for 90 days after trial expiration, after which it may be permanently deleted.
            </Section>

            <Section title="5. Subscriptions and Payment">
              Paid subscriptions are billed monthly or annually in advance. By subscribing, you authorize PreflightSMS to charge your payment method on a recurring basis at the agreed-upon rate until you cancel. All fees are non-refundable except as required by law. We reserve the right to change pricing with 30 days' notice. Failure to pay may result in suspension or termination of your account.
              <br /><br />
              <strong style={{ color: WHITE }}>Acknowledgment of Service:</strong> By subscribing and continuing to use the Service, you acknowledge that the Service is functioning as described and that you have had the opportunity to evaluate the Service during any applicable trial period or through product demonstrations. You agree that continued use of the Service beyond 30 days constitutes acceptance that the Service substantially meets its described functionality. Disputes regarding the nature or quality of the Service must be raised within 30 days of the start of your subscription or the date you first become aware of the issue, whichever is later, by contacting support@preflightsms.com.
              <br /><br />
              <strong style={{ color: WHITE }}>Chargebacks and Disputes:</strong> You agree to contact us at support@preflightsms.com to resolve any billing disputes before initiating a chargeback or payment dispute with your bank or credit card company. Filing a chargeback without first attempting to resolve the issue directly with PreflightSMS may result in immediate termination of your account and all associated data. We retain the right to contest any chargeback we believe to be fraudulent or filed in bad faith and to recover costs associated with disputed transactions.
              <br /><br />
              <strong style={{ color: WHITE }}>Direct Checkout:</strong> If you subscribe to a paid plan at the time of account creation (bypassing the free trial), you acknowledge that billing begins immediately upon completion of checkout and that you are authorizing recurring charges at the selected plan rate. Promotional pricing, if applied, is valid for the duration specified in the promotion and will revert to standard pricing at the end of the promotional period.
            </Section>

            <Section title="5a. Beta Testing Program">
              If you subscribe using a beta testing promotional code, the following additional terms apply:
              <br /><br />
              <strong style={{ color: WHITE }}>Monthly Check-Ins:</strong> You agree to participate in one (1) monthly check-in session of approximately 30 minutes with the PreflightSMS team to discuss application functionality, usability, and any issues encountered. These sessions may be conducted via video call, phone, or other agreed-upon method. Failure to participate in check-ins for two consecutive months may result in revocation of beta pricing.
              <br /><br />
              <strong style={{ color: WHITE }}>Marketing Reference:</strong> You agree to serve as a reference for PreflightSMS marketing purposes. This may include providing a testimonial, participating in a case study, or being listed as a customer reference (with your organization's name only — no confidential operational data will be disclosed without separate written consent). You may withdraw your reference participation at any time by contacting support@preflightsms.com, but withdrawal may result in revocation of beta pricing.
              <br /><br />
              <strong style={{ color: WHITE }}>Promotional Pricing:</strong> Beta testing promotional pricing is valid for the duration specified at the time of enrollment. At the end of the promotional period, your subscription will automatically renew at the standard rate for your selected plan unless you cancel or downgrade before the promotional period expires.
            </Section>

            <Section title="6. Your Data">
              You retain ownership of all data you submit to the Service ("Your Data"). You grant PreflightSMS a limited license to store, process, and display Your Data solely to provide and improve the Service. We will not sell, share, or distribute Your Data to third parties except as described in our Privacy Policy or as required by law.
              <br /><br />
              When you use AI-powered features, relevant portions of Your Data (such as hazard descriptions, report details, and safety context) are sent to our AI provider (Anthropic) for processing. See Section 8a for details. Your Data is not used to train AI models.
            </Section>

            <Section title="7. Acceptable Use">
              You agree not to: (a) use the Service for any unlawful purpose; (b) attempt to gain unauthorized access to any part of the Service; (c) interfere with or disrupt the Service; (d) upload malicious code; (e) impersonate any person or entity; (f) use the Service in any manner that could damage, disable, or impair the Service; or (g) use the API or webhooks in a manner that exceeds reasonable usage or places undue burden on the Service.
            </Section>

            <Section title="8. Aviation Disclaimer">
              PreflightSMS is a decision-support and recordkeeping tool. It does not provide operational control, dispatch authority, or regulatory compliance certification. All flight risk assessments, go/no-go decisions, and safety determinations remain the sole responsibility of the pilot-in-command and the certificate holder. PreflightSMS does not guarantee the accuracy, completeness, or timeliness of any risk assessment, weather data, flight tracking data, or safety information presented through the Service.
              <br /><br />
              Flight tracking features use publicly available ADS-B data and estimated positions based on departure times and flight plans. Position data may be delayed, inaccurate, or unavailable. Flight tracking is provided for situational awareness only and must not be relied upon for operational decisions, search and rescue, or air traffic control purposes.
            </Section>

            <Section title="8a. AI Features Disclaimer">
              AI-powered features in PreflightSMS are provided as decision-support tools only. AI-generated content — including risk assessments, hazard analyses, investigation findings, lessons learned, audit checklists, policy drafts, and safety recommendations — is generated by artificial intelligence and has not been reviewed or verified by a qualified aviation safety professional.
              <br /><br />
              <strong style={{ color: WHITE }}>You must review, verify, and approve all AI-generated content before acting on it or incorporating it into your safety management system.</strong> AI suggestions may be incomplete, inaccurate, or inappropriate for your specific operational context. The certificate holder and their qualified personnel bear full responsibility for all safety decisions, regardless of whether AI assistance was used.
              <br /><br />
              AI features are rate-limited (30 requests per hour per user). AI-generated content is not stored by our AI provider (Anthropic) for training purposes. See our Privacy Policy for details on what data is processed.
            </Section>

            <Section title="8b. User-Generated and Uploaded Content">
              You are solely responsible for the accuracy, completeness, and regulatory compliance of all documents you upload to or create within the Service, including but not limited to safety policies, standard operating procedures, SMS manuals, training materials, audit templates, emergency response plans, and any content generated from templates or AI assistance. PreflightSMS provides templates and tools as starting points but does not review, verify, or certify the compliance of any user content. There is no guarantee that documents — whether created from templates, generated by AI, manually entered, or uploaded — meet FAA, 14 CFR Part 5, or any other regulatory requirements. The certificate holder bears full responsibility for ensuring that all SMS documentation meets applicable regulations and is suitable for operational use.
            </Section>

            <Section title="8c. Third-Party Integrations">
              PreflightSMS integrates with third-party services including ForeFlight, SchedAero, Stripe, and publicly available ADS-B data sources. These integrations are provided on an "as-is" basis. We are not responsible for the availability, accuracy, or reliability of data from third-party services. Changes to third-party APIs or services may temporarily affect integration functionality. Your use of third-party services is subject to those services' own terms and privacy policies.
            </Section>

            <Section title="9. Limitation of Liability">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, PREFLIGHTSMS AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR GOODWILL, ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE, INCLUDING BUT NOT LIMITED TO RELIANCE ON AI-GENERATED CONTENT, FLIGHT TRACKING DATA, OR THIRD-PARTY INTEGRATION DATA. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID TO US IN THE TWELVE MONTHS PRECEDING THE CLAIM.
            </Section>

            <Section title="10. Indemnification">
              You agree to indemnify and hold harmless PreflightSMS from any claims, damages, losses, or expenses arising from your use of the Service, your violation of these Terms, your reliance on AI-generated content, or your violation of any rights of a third party.
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
