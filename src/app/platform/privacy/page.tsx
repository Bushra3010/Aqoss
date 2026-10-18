import type { Metadata } from 'next';
import { LegalPage } from '@/components/platform/LegalPage';
import { CONTACT_EMAIL } from '@/components/platform/nav';

export const metadata: Metadata = {
  title: { absolute: 'Privacy Policy — AQOSS' },
  description: 'What personal information AQOSS collects, why, who it is shared with and how to reach us about it.',
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="19 October 2026">
      <p>
        This policy explains what personal information AQOSS (&ldquo;we&rdquo;, &ldquo;us&rdquo;) collects through this
        website and the AQOSS hotel platform, why we collect it and what we do with it.
      </p>

      <h2>Who this covers</h2>
      <ul>
        <li>
          <strong>Hotels and their staff</strong> who request a demo, register a hotel or sign in to the AQOSS admin
          panel. For this information AQOSS decides how it is used.
        </li>
        <li>
          <strong>Guests</strong> who book on a hotel&apos;s website powered by AQOSS. That booking is with the hotel:
          the hotel decides how guest information is used, and AQOSS stores and processes it on the hotel&apos;s behalf.
          Questions about a stay or a booking should go to the hotel first.
        </li>
      </ul>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Demo requests and hotel registrations:</strong> your name, hotel name, email, phone number, city,
          number of rooms and anything you write in the form.
        </li>
        <li>
          <strong>Accounts:</strong> name, email address, a password (stored only as a secure hash) and the role and
          hotels a staff member is given.
        </li>
        <li>
          <strong>Bookings on hotel websites:</strong> the guest&apos;s name, email, phone number, stay dates, party size,
          special requests and payment status. Card details are entered with the payment provider and never reach or
          are stored by AQOSS.
        </li>
        <li>
          <strong>Reviews</strong> a guest writes after a stay, and the hotel&apos;s replies.
        </li>
        <li>
          <strong>Technical information:</strong> IP address and browser details in server logs, used to keep the
          service secure and to limit abuse of public forms.
        </li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To reply to demo requests and registrations and to set up hotels on the platform.</li>
        <li>To run the service: sign-in, bookings, payments, confirmation and reminder emails, and reviews.</li>
        <li>To keep the platform secure, including an audit trail of changes made in the admin panel.</li>
        <li>To meet legal, tax and accounting obligations.</li>
      </ul>
      <p>We do not sell personal information, and we do not use it for advertising.</p>

      <h2>Cookies</h2>
      <p>
        We use only the cookies the service needs to work: keeping you signed in, holding the rooms you are booking
        while you check out, and remembering which hotel website you are viewing. We do not use advertising or
        third-party tracking cookies.
      </p>

      <h2>Who we share it with</h2>
      <ul>
        <li>The hotel you book with, or the hotel you work for.</li>
        <li>
          Service providers that run parts of the platform for us — hosting, database, email delivery and payment
          processing — only for that purpose.
        </li>
        <li>Authorities, where the law requires it.</li>
      </ul>

      <h2>How long we keep it</h2>
      <p>
        Account information is kept while the account is active. Booking and payment records are kept for as long as
        the hotel needs them and the law requires for tax and accounting. Demo requests and registrations are kept
        while we are in touch with you and deleted on request.
      </p>

      <h2>Your choices</h2>
      <p>
        You can ask to see, correct or delete the personal information we hold about you by writing to{' '}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. If the information came from a booking, we may pass
        your request to the hotel concerned.
      </p>

      <h2>Changes</h2>
      <p>
        If we change this policy we will update this page and the date at the top. Material changes will also be sent
        to hotel accounts by email.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about privacy: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalPage>
  );
}
