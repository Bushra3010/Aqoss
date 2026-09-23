import Link from 'next/link';
import type { Metadata } from 'next';
import { getAdminSession, can } from '@/lib/auth/session';
import { listCustomers } from '@/services/customer.service';
import { PageHeader, Table, Td, NoAccess } from '@/components/admin/shared';
import { formatCurrency, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Customers · AQOSS CRM' };

/** Customer CRM (PRD §25). */
export default async function CustomersPage({ searchParams }: { searchParams: { q?: string } }) {
  const session = await getAdminSession();
  if (!can(session, 'customers.read')) return <NoAccess />;

  const customers = await listCustomers({ search: searchParams.q, limit: 100 });

  return (
    <>
      <PageHeader title="Customers" description="Every registered guest and their history." />

      <form className="mb-4 flex gap-2">
        <input name="q" className="input max-w-sm" placeholder="Name, email or mobile" defaultValue={searchParams.q ?? ''} />
        <button type="submit" className="btn-outline">Search</button>
      </form>

      <Table
        headers={[
          'Customer',
          'Contact',
          'Joined',
          { label: 'Bookings', align: 'right' },
          { label: 'Total spend', align: 'right' },
        ]}
        empty="No customers found."
      >
        {customers.map((c) => (
          <tr key={c.id}>
            <Td>
              <Link href={`/admin/customers/${c.id}`} className="font-medium text-slate-900 hover:underline">
                {c.full_name ?? 'Unnamed guest'}
              </Link>
              {c.city ? <p className="text-xs text-slate-400">{c.city}</p> : null}
            </Td>
            <Td>
              {c.email}
              {c.mobile ? <p className="text-xs text-slate-400">{c.mobile}</p> : null}
            </Td>
            <Td>{formatDate(new Date(c.created_at))}</Td>
            <Td align="right">{c.totalBookings}</Td>
            <Td align="right">{formatCurrency(c.totalSpend)}</Td>
          </tr>
        ))}
      </Table>
    </>
  );
}
