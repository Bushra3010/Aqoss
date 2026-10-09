import type { Metadata } from 'next';
import { Accelerator } from '@/components/platform/Accelerator';
import { Solutions } from '@/components/platform/Solutions';
import { AboutDemo } from '@/components/platform/AboutDemo';

export const metadata: Metadata = {
  title: { absolute: 'AQOSS — AI software that accelerates your hotel' },
  description:
    'AQOSS gives hotels an AI-powered website, marketing, sales, booking engine and reputation management — run from one place.',
};

/**
 * The AQOSS website on the main domain (aqoss.com). Hotel websites live on its
 * subdomains; middleware sends the main domain's home page here.
 */
export default function PlatformHome() {
  return (
    <>
      {/* ---- Hero: Hotel Productivity Accelerator ---------------------- */}
      <Accelerator />

      {/* ---- The five solutions --------------------------------------- */}
      <Solutions />

      {/* ---- About + Book demo ---------------------------------------- */}
      <AboutDemo />
    </>
  );
}
