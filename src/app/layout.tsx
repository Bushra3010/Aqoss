import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'AQOSS Hotels',
    template: '%s · AQOSS Hotels',
  },
  description: 'Hotel booking powered by the AQOSS platform.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
