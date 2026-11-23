import { redirect } from 'next/navigation';

/** A website is created by listing its property, under Hotels & Properties. */
export default function NewWebsitePage({ searchParams }: { searchParams: { hotel?: string } }) {
  redirect(searchParams.hotel ? `/admin/hotels/new?hotel=${encodeURIComponent(searchParams.hotel)}` : '/admin/hotels/new');
}
