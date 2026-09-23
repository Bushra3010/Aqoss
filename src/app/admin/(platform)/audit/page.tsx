/* eslint-disable @typescript-eslint/no-explicit-any -- query rows are untyped until `npm run db:types` is run */
import type { Metadata } from 'next';
import { getAdminSession, can } from '@/lib/auth/session';
import { listAuditLogs } from '@/services/audit.service';
import { PageHeader, Table, Td, NoAccess } from '@/components/admin/shared';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Audit log · AQOSS CRM' };

/** Audit trail (PRD §48). */
export default async function AuditPage({ searchParams }: { searchParams: { entity?: string } }) {
  const session = await getAdminSession();
  if (!can(session, 'audit.read')) return <NoAccess />;

  const logs = await listAuditLogs({ entity: searchParams.entity, limit: 200 });

  return (
    <>
      <PageHeader title="Audit log" description="Who changed what, and when." />

      <form className="mb-4 flex gap-2">
        <select name="entity" className="input max-w-xs" defaultValue={searchParams.entity ?? ''}>
          <option value="">All entities</option>
          {['hotels', 'websites', 'bookings', 'payments', 'reviews', 'room_inventory'].map((e) => (
            <option key={e} value={e}>{e.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <button type="submit" className="btn-outline">Filter</button>
      </form>

      <Table headers={['When', 'Actor', 'Action', 'Entity', 'Details']} empty="No audit entries.">
        {logs.map((log: any) => {
          const actor = Array.isArray(log.profiles) ? log.profiles[0] : log.profiles;
          return (
            <tr key={log.id}>
              <Td className="whitespace-nowrap">
                {new Date(log.created_at).toLocaleString('en-IN')}
              </Td>
              <Td>{actor?.full_name ?? actor?.email ?? log.actor_name ?? 'System'}</Td>
              <Td><code className="text-xs">{log.action}</code></Td>
              <Td>{log.entity}</Td>
              <Td className="max-w-md">
                <span className="block truncate text-xs text-slate-500">
                  {log.new_value ? JSON.stringify(log.new_value) : '—'}
                </span>
              </Td>
            </tr>
          );
        })}
      </Table>
    </>
  );
}
