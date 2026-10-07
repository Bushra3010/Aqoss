import type { Metadata } from 'next';
import { PlayCircle } from 'lucide-react';
import { ComingSoon } from '@/components/platform/ComingSoon';

export const metadata: Metadata = {
  title: { absolute: 'Training videos — AQOSS' },
  description: 'Short videos that walk your team through AQOSS — coming soon.',
};

export default function TrainingPage() {
  return (
    <ComingSoon
      icon={PlayCircle}
      title="Training videos"
      text="Short videos that walk your team through AQOSS — setting up rooms and prices, taking desk bookings, running offers and replying to reviews. We are recording them now."
    />
  );
}
