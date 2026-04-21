import LegalPage from "./LegalPage.jsx";

const sections = [
  {
    heading: "Educational Purpose Only",
    body: "ProCalc Elite is a financial analysis tool intended for educational and informational purposes only. It does not constitute financial, legal, or investment advice.",
  },
  {
    heading: "No Guarantees",
    body: "We make no guarantees regarding the accuracy, completeness, or outcomes of the calculations provided.",
  },
  {
    heading: "User Responsibility",
    body: "You are solely responsible for any decisions made based on the information provided by this tool.",
  },
  {
    heading: "No Liability",
    body: "ProCalc Elite and its operators shall not be held liable for any financial losses, damages, or decisions made based on the use of this application.",
  },
  {
    heading: "Affiliate Disclosure",
    body: "This application may contain affiliate links. We may earn a commission if you engage with third-party services through these links.",
  },
  {
    heading: "External Links",
    body: "We are not responsible for the content, services, or policies of third-party websites.",
  },
  {
    heading: "Modifications",
    body: "We reserve the right to update or modify these terms at any time without prior notice.",
  },
  {
    heading: "Acceptance",
    body: "By continuing to use this application, you acknowledge and accept these terms.",
  },
  {
    heading: "Contact",
    body: (
      <>
        For inquiries, contact:{" "}
        <a
          href="mailto:mobixatech@protonmail.com"
          style={{ color: "#818CF8", textDecoration: "underline", textUnderlineOffset: 3 }}
        >
          mobixatech@protonmail.com
        </a>
      </>
    ),
  },
];

export default function TermsOfService() {
  return (
    <LegalPage
      title="Terms of Service"
      effectiveDate="2026"
      intro="By using ProCalc Elite, you agree to the following terms:"
      sections={sections}
    />
  );
}
