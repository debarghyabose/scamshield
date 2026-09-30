import LegalLayout from '../components/LegalLayout'

const CONTACT = 'privacy@scamshield.example'

const sections = [
  {
    id: 'summary',
    title: 'The short version',
    body: (
      <ul>
        <li>You can scan without an account. Anonymous scans are analysed and returned to you, not stored.</li>
        <li>If you sign in, your scans and reports are saved to your private account so you can see your history. Only you can access them.</li>
        <li>We never sell your data or use it for advertising.</li>
        <li>ScamShield will never ask for your OTP, UPI PIN, card number or passwords.</li>
      </ul>
    ),
  },
  {
    id: 'what-we-collect',
    title: 'Information we process',
    body: (
      <>
        <p>
          <strong>Account details.</strong> Your name, email address and, if you add one, a profile picture. If you sign in with Google we receive
          your name, email and profile photo from Google. Passwords are handled by our authentication provider (Supabase) and are never visible to
          us.
        </p>
        <p>
          <strong>Content you choose to scan.</strong> The text of a message, a URL, or the payment details you type in (amount, payee type, time,
          frequency and any warning signs you tick), plus the result.
        </p>
        <p>
          <strong>Reports you submit.</strong> The scam type, message content, phone number, link and any description you add.
        </p>
        <p>
          <strong>Preferences.</strong> Theme, notification and language choices, saved to your profile and in your browser’s local storage.
        </p>
      </>
    ),
  },
  {
    id: 'storage-of-scans',
    title: 'How scans are processed and stored',
    body: (
      <>
        <p>
          Scans are sent over an encrypted (HTTPS) connection to the ScamShield server, which analyses them with transparent, rule-based checks.
          Links are analysed as text and are never opened.
        </p>
        <p>
          <strong>Signed out:</strong> the result is returned to you and nothing is stored. <strong>Signed in:</strong> the scan and its result are
          saved to your private history unless you untick “Save this result to my private scan history”. You can delete any saved scan from its
          result page.
        </p>
        <p>
          Your history is protected by database row-level security: each account can only read its own scans, reports and profile.
        </p>
      </>
    ),
  },
  {
    id: 'how-we-use',
    title: 'How we use information',
    body: (
      <ul>
        <li>To analyse the content you submit and show you a result.</li>
        <li>To show your scan history, dashboard statistics and reports when you’re signed in.</li>
        <li>For reports: to help identify scam patterns, numbers and links that affect other people.</li>
        <li>To keep the service secure and prevent abuse (for example, rate limiting).</li>
      </ul>
    ),
  },
  {
    id: 'reports',
    title: 'Scam reports',
    body: (
      <>
        <p>
          Reports are stored with your account. They are <strong>not</strong> published publicly and are not automatically shared with any bank or
          authority. If you lost money, please also report to 1930 or cybercrime.gov.in.
        </p>
        <p>Please don’t include your own personal details, OTPs or account numbers in a report.</p>
      </>
    ),
  },
  {
    id: 'sharing',
    title: 'Sharing',
    body: (
      <>
        <p>We do not sell, rent or trade personal data. We may share information only:</p>
        <ul>
          <li>with service providers who host or secure ScamShield (such as Supabase for authentication and storage), under contracts that limit their use of it;</li>
          <li>when required by law, or to respond to a valid request from a government or law-enforcement authority;</li>
          <li>in aggregated form that can’t identify you, for example the number of prize scams reported this month.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'retention',
    title: 'Retention and security',
    body: (
      <>
        <p>
          Saved scans and reports are kept until you delete them or delete your account. We use encryption in transit, access controls, row-level
          security and minimal data collection. No system is completely secure, so avoid submitting information you don’t need to.
        </p>
      </>
    ),
  },
  {
    id: 'rights',
    title: 'Your rights',
    body: (
      <>
        <p>
          We aim to handle personal data in line with applicable Indian law, including the Digital Personal Data Protection Act, 2023. Depending on
          the law that applies to you, you may be able to:
        </p>
        <ul>
          <li>ask what personal data we hold about you and how it’s used;</li>
          <li>ask us to correct, update or erase it (you can edit your profile and delete scans yourself in the app);</li>
          <li>withdraw consent where we rely on it;</li>
          <li>raise a grievance with us, and escalate it to the relevant authority if it isn’t resolved.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'children',
    title: 'Children',
    body: <p>ScamShield is intended for people aged 18 and over. We don’t knowingly process personal data of children.</p>,
  },
  {
    id: 'storage',
    title: 'Cookies and local storage',
    body: (
      <p>
        We don’t use advertising or tracking cookies. Your browser’s local storage keeps your sign-in session (so you stay signed in after a
        reload), your theme and whether the sidebar is collapsed. Signing out removes the session.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    body: <p>If we make material changes, we’ll update the date at the top of this page and highlight the change in the app before it takes effect.</p>,
  },
  {
    id: 'contact',
    title: 'Contact and grievances',
    body: (
      <p>
        Questions, requests or complaints about privacy: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. We aim to acknowledge requests within 72 hours.
      </p>
    ),
  },
]

export default function PrivacyPolicy() {
  return (
    <LegalLayout
      eyebrow="Legal"
      title="Privacy policy"
      updated="26 September 2026"
      intro="This policy explains what ScamShield does with the information you give it. We’ve written it to be read, not skimmed past — it’s short, and the most important parts are at the top."
      sections={sections}
      other={{ to: '/terms', label: 'Terms & conditions' }}
    />
  )
}
