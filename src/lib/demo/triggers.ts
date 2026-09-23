/**
 * Parity with the database triggers.
 *
 * The schema logs every booking status change from a trigger, so services just
 * UPDATE the row and the history takes care of itself. The demo layer has no
 * triggers, so the same effects are applied here — otherwise the CRM's status
 * timeline would only ever show what the RPCs wrote.
 */

import { randomUUID } from 'node:crypto';
import type { Row, Tables } from './dataset';

export function afterUpdate(tables: Tables, table: string, before: Row, after: Row): void {
  if (table !== 'bookings') return;
  if (before.status === after.status) return;

  tables.booking_status_history.push({
    id: randomUUID(),
    booking_id: after.id,
    from_status: before.status,
    to_status: after.status,
    note: null,
    changed_by: null,
    created_at: new Date().toISOString(),
  });
}
