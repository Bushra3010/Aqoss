'use client';

import { useTransition } from 'react';
import { setWebsiteStatus } from '@/app/admin/actions';

/** Publish / unpublish a hotel website (PRD §22, §23). */
export function WebsiteStatusButtons({
  websiteId,
  status,
}: {
  websiteId: string;
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}) {
  const [pending, start] = useTransition();
  const live = status === 'ACTIVE';

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => void setWebsiteStatus(websiteId, live ? 'INACTIVE' : 'ACTIVE'))}
      className="text-sm font-medium disabled:opacity-50"
      style={{ color: live ? '#e11d48' : '#0f766e' }}
    >
      {pending ? '…' : live ? 'Unpublish' : 'Publish'}
    </button>
  );
}
