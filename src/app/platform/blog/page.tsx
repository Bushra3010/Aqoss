import type { Metadata } from 'next';
import { Newspaper } from 'lucide-react';
import { ComingSoon } from '@/components/platform/ComingSoon';

export const metadata: Metadata = {
  title: { absolute: 'Blog — AQOSS' },
  description: 'Guides and ideas for hotels on direct bookings, marketing and running the front desk — coming soon from AQOSS.',
};

export default function BlogPage() {
  return (
    <ComingSoon
      icon={Newspaper}
      title="Blog"
      text="Practical guides for hoteliers — winning direct bookings, pricing through the seasons, marketing on a budget and getting more 5-star reviews. The first articles are on their way."
    />
  );
}
