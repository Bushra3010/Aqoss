/* eslint-disable @typescript-eslint/no-explicit-any -- query rows are untyped until `npm run db:types` is run */
import type { Metadata } from 'next';
import { getUser } from '@/lib/auth/session';
import { getCustomerProfile } from '@/services/customer.service';
import { StatusBadge, EmptyState } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Payments & invoices' };

/** Payment history (PRD §12). */
export default async function PaymentsPage() {
  const user = await getUser();
  const data = await getCustomerProfile(user!.id);

  return (
    <div>
      <h1 className="section-title">Payments &amp; invoices</h1>

      {data.payments.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="No payments yet" description="Your receipts will appear here." />
        </div>
      ) : (
        <div className="card mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium text-slate-600">Date</th>
                <th scope="col" className="px-4 py-3 font-medium text-slate-600">Method</th>
                <th scope="col" className="px-4 py-3 font-medium text-slate-600">Status</th>
                <th scope="col" className="px-4 py-3 text-right font-medium text-slate-600">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data.payments.map((p: any) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 text-slate-700">
                    {p.paid_at ? formatDate(new Date(p.paid_at)) : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.method ?? p.provider}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900">
                    {formatCurrency(Number(p.amount))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
