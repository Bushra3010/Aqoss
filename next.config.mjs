/** @type {import('next').NextConfig} */
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig = {
  reactStrictMode: true,
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
