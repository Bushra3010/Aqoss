import { isDemoMode } from '@/lib/env';
import { demoFiles } from '@/lib/demo/files';

export const dynamic = 'force-dynamic';

/** Serves files uploaded while the app runs on demo data. */
export async function GET(_request: Request, { params }: { params: { path: string[] } }) {
  if (!isDemoMode) return new Response('Not found', { status: 404 });

  const file = demoFiles().get(params.path.join('/'));
  if (!file) return new Response('Not found', { status: 404 });

  return new Response(file.bytes, {
    headers: {
      'Content-Type': file.contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
