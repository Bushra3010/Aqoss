/* eslint-disable @typescript-eslint/no-explicit-any -- in-memory rows are untyped by design; see src/lib/demo/README */
/**
 * Demo authentication.
 *
 * Mirrors the slice of the Supabase Auth API this app uses. Sessions are a
 * signed-free cookie holding a profile id — fine for a local demo, and
 * deliberately not something that could be mistaken for production auth.
 */

import { randomBytes, randomUUID } from 'node:crypto';
import { getTables, DEMO_PASSWORD } from './store';
import { DEMO_SESSION_COOKIE } from './constants';

export { DEMO_SESSION_COOKIE };

export interface CookieStore {
  get(name: string): string | undefined;
  set(name: string, value: string): void;
  remove(name: string): void;
}

export const NOOP_COOKIES: CookieStore = {
  get: () => undefined,
  set: () => {},
  remove: () => {},
};

interface AuthUser {
  id: string;
  email: string | null;
  phone: string | null;
  user_metadata: Record<string, unknown>;
}

/**
 * Password-recovery codes, standing in for the link Supabase would email.
 * On `globalThis` like the store, so the action that issues a code and the
 * callback route that redeems it (separate bundles) share one map.
 */
const RECOVERY_KEY = Symbol.for('aqoss.demo.recoveryCodes');
const RECOVERY_TTL_MS = 60 * 60 * 1000;
type GlobalWithRecovery = typeof globalThis & {
  [RECOVERY_KEY]?: Map<string, { profileId: string; expiresAt: number }>;
};

function recoveryCodes() {
  return ((globalThis as GlobalWithRecovery)[RECOVERY_KEY] ??= new Map());
}

function toAuthUser(profile: Record<string, any>): AuthUser {
  return {
    id: profile.id,
    email: profile.email,
    phone: profile.mobile,
    user_metadata: { full_name: profile.full_name, mobile: profile.mobile },
  };
}

export function createDemoAuth(cookies: CookieStore) {
  const tables = getTables();

  function currentUser(): AuthUser | null {
    const id = cookies.get(DEMO_SESSION_COOKIE);
    if (!id) return null;
    const profile = tables.profiles.find((p) => p.id === id && p.is_active);
    return profile ? toAuthUser(profile) : null;
  }

  return {
    async getUser() {
      const user = currentUser();
      return { data: { user }, error: user ? null : { message: 'Not authenticated' } };
    },

    async getSession() {
      const user = currentUser();
      return { data: { session: user ? { user } : null }, error: null };
    },

    async signInWithPassword({ email, password }: { email: string; password: string }) {
      const profile = tables.profiles.find(
        (p) => String(p.email).toLowerCase() === email.trim().toLowerCase(),
      );

      // Demo accounts carry their own password; accounts registered during the
      // session accept the shared demo password.
      const expected = profile?.metadata?.demo_password ?? DEMO_PASSWORD;

      if (!profile || password !== expected) {
        return { data: { user: null, session: null }, error: { message: 'Invalid login credentials' } };
      }

      cookies.set(DEMO_SESSION_COOKIE, profile.id);
      const user = toAuthUser(profile);
      return { data: { user, session: { user } }, error: null };
    },

    async signUp({
      email,
      password,
      options,
    }: {
      email: string;
      password: string;
      options?: { data?: Record<string, unknown> };
    }) {
      const existing = tables.profiles.find(
        (p) => String(p.email).toLowerCase() === email.trim().toLowerCase(),
      );

      if (existing) {
        return { data: { user: null, session: null }, error: { message: 'An account with this email already exists.' } };
      }

      const nowIso = new Date().toISOString();
      const profile = {
        id: randomUUID(),
        full_name: (options?.data?.full_name as string) ?? null,
        email: email.trim().toLowerCase(),
        mobile: (options?.data?.mobile as string) ?? null,
        profile_photo: null,
        address_line1: null, address_line2: null,
        city: null, state: null, country: 'India', postal_code: null,
        date_of_birth: null, id_type: null, id_number: null,
        is_admin: false, is_active: true, marketing_optin: false,
        metadata: { demo_password: password },
        created_at: nowIso, updated_at: nowIso,
      };

      tables.profiles.push(profile);
      cookies.set(DEMO_SESSION_COOKIE, profile.id);

      const user = toAuthUser(profile);
      // Signing in immediately keeps the demo free of an email round trip.
      return { data: { user, session: { user } }, error: null };
    },

    async signOut() {
      cookies.remove(DEMO_SESSION_COOKIE);
      return { error: null };
    },

    async updateUser({ password }: { password?: string }) {
      const user = currentUser();
      if (!user) return { data: { user: null }, error: { message: 'Not authenticated' } };

      const profile = tables.profiles.find((p) => p.id === user.id);
      if (profile && password) profile.metadata = { ...profile.metadata, demo_password: password };

      return { data: { user }, error: null };
    },

    /**
     * The service-role slice of Supabase Auth (`auth.admin`) that staff
     * management uses. Blocking an account (`ban_duration`) is modelled as
     * the profile's `is_active`, which `getUser` already honours.
     */
    admin: {
      async createUser({
        email,
        password,
        user_metadata,
      }: {
        email: string;
        password: string;
        email_confirm?: boolean;
        user_metadata?: Record<string, unknown>;
      }) {
        const normalised = email.trim().toLowerCase();
        if (tables.profiles.some((p) => String(p.email).toLowerCase() === normalised)) {
          return { data: { user: null }, error: { message: 'A user with this email address has already been registered' } };
        }
        const nowIso = new Date().toISOString();
        const profile = {
          id: randomUUID(),
          full_name: (user_metadata?.full_name as string) ?? null,
          email: normalised,
          mobile: (user_metadata?.mobile as string) ?? null,
          profile_photo: null,
          address_line1: null, address_line2: null,
          city: null, state: null, country: 'India', postal_code: null,
          date_of_birth: null, id_type: null, id_number: null,
          is_admin: false, is_active: true, marketing_optin: false,
          metadata: { demo_password: password },
          created_at: nowIso, updated_at: nowIso,
        };
        tables.profiles.push(profile);
        return { data: { user: toAuthUser(profile) }, error: null };
      },

      async updateUserById(
        id: string,
        attrs: { password?: string; email?: string; user_metadata?: Record<string, unknown>; ban_duration?: string },
      ) {
        const profile = tables.profiles.find((p) => p.id === id);
        if (!profile) return { data: { user: null }, error: { message: 'User not found' } };
        if (attrs.email) {
          const normalised = attrs.email.trim().toLowerCase();
          if (tables.profiles.some((p) => p.id !== id && String(p.email).toLowerCase() === normalised)) {
            return { data: { user: null }, error: { message: 'A user with this email address has already been registered' } };
          }
          profile.email = normalised;
        }
        if (attrs.password) profile.metadata = { ...profile.metadata, demo_password: attrs.password };
        if (attrs.user_metadata?.full_name !== undefined) profile.full_name = attrs.user_metadata.full_name;
        if (attrs.ban_duration) profile.is_active = attrs.ban_duration === 'none';
        profile.updated_at = new Date().toISOString();
        return { data: { user: toAuthUser(profile) }, error: null };
      },
    },

    /**
     * Nothing is emailed in demo mode. Instead the link Supabase would have
     * sent comes back as `demoLink` (not part of the real API), so the form can
     * show it on screen. Only for an active account, like the real thing.
     */
    async resetPasswordForEmail(email: string, options?: { redirectTo?: string }) {
      const profile = tables.profiles.find(
        (p) => p.is_active && String(p.email).toLowerCase() === email.trim().toLowerCase(),
      );
      if (!profile || !options?.redirectTo) return { data: {}, error: null };

      const code = randomBytes(24).toString('hex');
      recoveryCodes().set(code, { profileId: profile.id, expiresAt: Date.now() + RECOVERY_TTL_MS });

      const link = new URL(options.redirectTo);
      link.searchParams.set('code', code);
      return { data: { demoLink: link.toString() }, error: null };
    },

    /** Redeems a recovery code once, signing its account in. */
    async exchangeCodeForSession(code: string) {
      const entry = recoveryCodes().get(code);
      recoveryCodes().delete(code);
      const profile =
        entry && entry.expiresAt > Date.now()
          ? tables.profiles.find((p) => p.id === entry.profileId && p.is_active)
          : undefined;

      if (!profile) return { data: { user: null, session: null }, error: { message: 'Invalid code' } };

      cookies.set(DEMO_SESSION_COOKIE, profile.id);
      const user = toAuthUser(profile);
      return { data: { user, session: { user } }, error: null };
    },
  };
}
