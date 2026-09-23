'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Mail, Phone } from 'lucide-react';
import { Alert, Badge, EmptyState, StatusBadge } from '@/components/ui';
import { saveLead, type PanelActionState } from '@/app/admin/h/actions';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Lead } from '@/services/lead.service';

/** Abandoned bookings with a follow-up form each. */
export function LeadsBoard({
  leads,
  canWrite,
  bookingHref,
}: {
  leads: Lead[];
  canWrite: boolean;
  bookingHref: Record<string, string>;
}) {
  if (!leads.length) {
    return (
      <EmptyState
        title="No leads here"
        description="A lead appears when a guest enters their details on the website but does not finish paying."
      />
    );
  }

  return (
    <div className="space-y-4">
      {leads.map((lead) => (
        <LeadCard key={lead.bookingId} lead={lead} canWrite={canWrite} href={bookingHref[lead.bookingId]} />
      ))}
    </div>
  );
}

function LeadCard({ lead, canWrite, href }: { lead: Lead; canWrite: boolean; href: string }) {
  const [state, action] = useFormState<PanelActionState, FormData>(saveLead, {});
  const [open, setOpen] = useState(false);
  const guests = `${lead.adults} adult${lead.adults > 1 ? 's' : ''}${
    lead.children ? `, ${lead.children} child${lead.children > 1 ? 'ren' : ''}` : ''
  }`;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-slate-900">{lead.guestName}</p>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <a href={`tel:${lead.guestPhone}`} className="inline-flex items-center gap-1.5 text-blue-600 hover:underline">
              <Phone className="h-3.5 w-3.5" aria-hidden="true" />
              {lead.guestPhone}
            </a>
            <a href={`mailto:${lead.guestEmail}`} className="inline-flex items-center gap-1.5 text-blue-600 hover:underline">
              <Mail className="h-3.5 w-3.5" aria-hidden="true" />
              {lead.guestEmail}
            </a>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lead.stale && lead.status !== 'CONVERTED' ? <Badge tone="slate">stay date passed</Badge> : null}
          <StatusBadge status={lead.status} />
        </div>
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
        <Item label="Stay" value={`${formatDate(lead.checkIn)} → ${formatDate(lead.checkOut)}`} />
        <Item label="Guests" value={`${guests} · ${lead.rooms} room${lead.rooms > 1 ? 's' : ''}`} />
        <Item label="Value" value={formatCurrency(lead.totalAmount, lead.currency)} />
        <Item label="Started" value={new Date(lead.startedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} />
      </dl>

      {lead.notes && !open ? (
        <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
          <span className="font-medium text-slate-900">Notes: </span>
          {lead.notes}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4 text-sm">
        <Link href={href} className="font-medium text-slate-600 hover:text-slate-900">
          Booking {lead.reference} →
        </Link>
        {lead.lastContactedAt ? (
          <span className="text-slate-400">
            Last contacted {new Date(lead.lastContactedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
          </span>
        ) : null}
        {canWrite && lead.status !== 'CONVERTED' ? (
          <button type="button" className="btn-outline ml-auto" onClick={() => setOpen(!open)}>
            {open ? 'Close' : 'Log follow-up'}
          </button>
        ) : null}
      </div>

      {open ? (
        <form action={action} className="mt-4 space-y-3">
          <input type="hidden" name="booking_id" value={lead.bookingId} />
          {state.error ? <Alert>{state.error}</Alert> : null}
          {state.success ? <Alert tone="success">{state.success}</Alert> : null}

          <fieldset>
            <legend className="label">Status</legend>
            <div className="flex flex-wrap gap-2">
              {(['NEW', 'CONTACTED', 'LOST'] as const).map((s) => (
                <label key={s} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50">
                  <input type="radio" name="status" value={s} defaultChecked={lead.status === s} />
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label className="label" htmlFor={`notes-${lead.bookingId}`}>Notes</label>
            <textarea
              id={`notes-${lead.bookingId}`}
              name="notes"
              className="input min-h-20"
              defaultValue={lead.notes ?? ''}
              placeholder="Called at 4pm, wants a sea-view room — will pay tonight"
              maxLength={2000}
            />
          </div>

          <SaveButton />
        </form>
      ) : null}
    </article>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Saving…' : 'Save follow-up'}
    </button>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 font-medium text-slate-900">{value}</dd>
    </div>
  );
}
