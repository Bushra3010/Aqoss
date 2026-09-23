import { formatTime } from '@/lib/utils';
import type { HotelSiteData } from '@/types';

/** Property rules (PRD §18) — all configured from the CRM. */
export function PropertyRulesSection({ site }: { site: HotelSiteData }) {
  const { hotel, policies } = site;

  return (
    <section
      id="property-rules"
      className="scroll-mt-28 rounded-xl border border-slate-200 bg-white p-5"
    >
      <h2 className="text-xl font-bold text-slate-900">Property rules</h2>
      <p className="mt-1 text-sm text-slate-500">
        Please read these before you book. They apply to every stay at {hotel.name}.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg bg-[var(--brand-50)] p-4">
          <p className="text-sm font-semibold text-slate-900">Check-in</p>
          <p className="mt-0.5 text-sm text-slate-600">From {formatTime(hotel.check_in_time)}</p>
        </div>
        <div className="rounded-lg bg-[var(--brand-50)] p-4">
          <p className="text-sm font-semibold text-slate-900">Check-out</p>
          <p className="mt-0.5 text-sm text-slate-600">By {formatTime(hotel.check_out_time)}</p>
        </div>
      </div>

      {policies.length ? (
        <dl className="mt-5 divide-y divide-slate-100">
          {policies.map((policy) => (
            <div key={policy.id} className="py-3.5 sm:flex sm:gap-6">
              <dt className="w-52 shrink-0 text-sm font-semibold text-slate-900">{policy.title}</dt>
              <dd className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-600 sm:mt-0">
                {policy.content}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-5 text-sm text-slate-500">Property rules have not been published yet.</p>
      )}
    </section>
  );
}
