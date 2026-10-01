/** @type {import('next').NextConfig} */
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

// The main domain decides which requests get the AQOSS website and which are
// a hotel's subdomain, so it must be known at build time (middleware has it
// inlined). Explicit settings win; otherwise Netlify's own `URL` build variable
// — the site's primary address — is used, so a Netlify deploy works unconfigured.
const hostedUrl = process.env.URL;
const appUrl = process.env.NEXT_PUBLIC_APP_URL || hostedUrl || 'http://localhost:3000';
const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || new URL(appUrl).host;

const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_APP_URL: appUrl,
    NEXT_PUBLIC_ROOT_DOMAIN: rootDomain,
  },
  // Lets a second dev server run beside the first without the two overwriting
  // each other's build output: NEXT_DIST_DIR=.next-alt next dev -p 3001
  distDir: process.env.NEXT_DIST_DIR || '.next',
  experimental: {
    // Photo uploads go through a server action, one file per call; the image
    // service caps each file at 10 MB, and multipart overhead needs the rest.
    serverActions: { bodySizeLimit: '11mb' },
  },
  images: {
    remotePatterns: [
      ...(supabaseHost ? [{ protocol: 'https', hostname: supabaseHost }] : []),
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
    ],
  },
};

export default nextConfig;
