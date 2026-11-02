import { hotelPanelPath } from '@/lib/admin/hotel-panel';
import { LinkTabs } from '@/components/admin/LinkTabs';

/** Payouts to property | Guest payments, in a hotel panel's Payments. */
export function PaymentsTabs({ slug, active }: { slug: string; active: 'settlement' | 'guest' }) {
  return (
    <LinkTabs
      label="Payments"
      active={active}
      tabs={[
        { key: 'settlement', label: 'Payouts to property', href: hotelPanelPath(slug, 'payments') },
        { key: 'guest', label: 'Guest payments', href: hotelPanelPath(slug, 'payments/received') },
      ]}
    />
  );
}
