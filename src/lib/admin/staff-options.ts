import 'server-only';

import type { AdminSession } from '@/lib/auth/session';
import { listPanelHotels } from '@/lib/admin/hotel-panel';
import { canGrant, listRoles } from '@/services/staff.service';

/** What the staff form may offer this admin: roles they can grant, their hotels. */
export async function staffFormOptions(session: AdminSession) {
  const [roles, hotels] = await Promise.all([listRoles(), listPanelHotels(session)]);
  return {
    roles: roles
      .filter((r) => canGrant(session, r.permissions))
      .map(({ id, name, description }) => ({ id, name, description })),
    hotels: hotels.map(({ id, name, city }) => ({ id, name, city })),
    allowAllHotels: session.hotelScope.length === 0,
  };
}
