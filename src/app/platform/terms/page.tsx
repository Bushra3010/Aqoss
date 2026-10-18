import Link from 'next/link';
import type { Metadata } from 'next';
import { LegalPage } from '@/components/platform/LegalPage';
import { CONTACT_EMAIL } from '@/components/platform/nav';

export const metadata: Metadata = {
  title: { absolute: 'Terms of Service — AQOSS' },
  description: 'The terms that apply to the AQOSS website and the AQOSS hotel platform.',
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="19 October 2026">
      <p>
        These terms apply to this website and to the AQOSS hotel platform (&ldquo;the service&rdquo;), run by AQOSS
        (&ldquo;we&rdquo;, &ldquo;us&rdquo;). By using the service you agree to them. A hotel&apos;s own subscription
        may come with a separate agreement; where the two differ, that agreement applies.
      </p>

      <h2>The service</h2>
      <p>
        AQOSS provides software for hotels: a hotel website with a booking engine, an admin panel for bookings,
        rooms, rates, payments, offers and reviews, and related tools. Features may change as the service develops.
      </p>

      <h2>Hotel accounts</h2>
      <ul>
        <li>A hotel account is opened by AQOSS after a registration is approved.</li>
        <li>
          The hotel is responsible for the accuracy of what it publishes — rooms, photos, prices, availability, house
          rules and offers — and for the staff it gives access to.
        </li>
        <li>Keep sign-in details private. Tell us straight away if you think an account has been misused.</li>
      </ul>

      <h2>Guests booking on a hotel website</h2>
      <p>
        When you book a stay on a hotel&apos;s website powered by AQOSS, your contract is with that hotel, not with
        AQOSS. The hotel sets its own prices, cancellation rules and house rules, which are shown before you pay.
        Questions about a stay, a change or a refund should go to the hotel.
      </p>

      <h2>Acceptable use</h2>
      <p>You must not:</p>
      <ul>
        <li>use the service for anything unlawful, fraudulent or misleading;</li>
        <li>try to reach data or accounts you have not been given access to;</li>
        <li>interfere with the service, overload it, or probe it for weaknesses without our permission;</li>
        <li>publish content you do not have the right to use.</li>
      </ul>
      <p>We may suspend access that breaks these rules.</p>

      <h2>Content and data</h2>
      <p>
        Hotels keep ownership of the content and data they put into the service, and give us permission to store and
        display it to run the service. How we handle personal information is described in our{' '}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>

      <h2>Availability and liability</h2>
      <p>
        We work to keep the service available and secure but cannot promise it will be uninterrupted or error-free.
        To the extent the law allows, AQOSS is not liable for indirect or consequential loss, such as lost bookings or
        profits, arising from use of the service.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms. The date at the top shows the latest version, and hotel accounts will be told by
        email about material changes.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalPage>
  );
}
