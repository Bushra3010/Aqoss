import Link from 'next/link';
import type { Metadata } from 'next';
import { LegalPage } from '@/components/platform/LegalPage';
import { CONTACT_EMAIL } from '@/components/platform/nav';

export const metadata: Metadata = {
  title: { absolute: 'Contact AQOSS' },
  description: 'How to reach AQOSS about a demo, your hotel account, privacy or anything else.',
};

export default function ContactPage() {
  return (
    <LegalPage title="Contact">
      <p>
        Email us at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> about anything — a demo, your hotel
        account, privacy, or a problem with the website.
      </p>

      <h2>See AQOSS for your hotel</h2>
      <p>
        <Link href="/#book-demo">Book a demo</Link> and we will get back to you, or{' '}
        <Link href="/admin/register">register your hotel</Link> to get started.
      </p>

      <h2>Booked a stay?</h2>
      <p>
        If you booked a room on a hotel&apos;s website, please contact that hotel about your booking — its phone number
        and email are on the hotel&apos;s website. The hotel manages its own bookings, changes and refunds.
      </p>
    </LegalPage>
  );
}
