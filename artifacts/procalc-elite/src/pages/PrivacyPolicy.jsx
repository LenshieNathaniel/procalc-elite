import LegalPage from "./LegalPage.jsx";

const sections = [
  {
    heading: "No Data Collection",
    body: "We do not collect, store, or transmit any personal or financial information. All calculations are performed locally within your browser.",
  },
  {
    heading: "Local Processing",
    body: "All mortgage calculations and financial analysis are executed entirely on your device. Your data never leaves your browser.",
  },
  {
    heading: "No Cookies or Tracking",
    body: "We do not use cookies, analytics trackers, or third-party tracking technologies.",
  },
  {
    heading: "Affiliate Links",
    body: "Some links within the application may be affiliate links. If you choose to engage with these links, third-party websites may collect data in accordance with their own privacy policies.",
  },
  {
    heading: "Third-Party Responsibility",
    body: "We are not responsible for the privacy practices of external websites linked from this application.",
  },
  {
    heading: "Security",
    body: "Because no user data is collected or stored, there is no risk of data exposure from this application.",
  },
  {
    heading: "Changes to This Policy",
    body: "We may update this Privacy Policy periodically. Continued use of the application constitutes acceptance of any updates.",
  },
  {
    heading: "Contact",
    body: (
      <>
        For inquiries, contact:{" "}
        <a
          href="mailto:mobixatech@proton.me"
          style={{ color: "#818CF8", textDecoration: "underline", textUnderlineOffset: 3 }}
        >
          mobixatech@proton.me
        </a>
      </>
    ),
  },
];

export default function PrivacyPolicy() {
  return (
    <LegalPage
      title="Privacy Policy"
      effectiveDate="2026"
      intro={<>ProCalc Elite (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;the application&rdquo;) is committed to protecting your privacy.</>}
      sections={sections}
    />
  );
}
