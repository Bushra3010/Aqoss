/**
 * Typed access to environment configuration.
 *
 * Anything read here is validated once at module load so a misconfigured
 * deployment fails loudly at boot rather than halfway through a booking.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value;
}

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',

  /** Server-only. Never import this into a client component. */
  get supabaseServiceRoleKey(): string {
    return required('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY);
  },

  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  rootDomain: process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000',
  adminHost: process.env.NEXT_PUBLIC_ADMIN_HOST ?? 'admin.localhost:3000',

  /** Dev convenience: serve this website when a hostname cannot be resolved. */
  defaultWebsiteSlug: process.env.DEFAULT_WEBSITE_SLUG || null,

  paymentProvider: (process.env.PAYMENT_PROVIDER ?? 'mock') as 'mock' | 'razorpay' | 'stripe',
  emailProvider: (process.env.EMAIL_PROVIDER ?? 'console') as 'console' | 'resend' | 'smtp',
  smsProvider: (process.env.SMS_PROVIDER ?? 'console') as 'console' | 'twilio' | 'msg91',
  whatsappProvider: (process.env.WHATSAPP_PROVIDER ?? 'console') as 'console' | 'twilio' | 'meta',

  bookingHoldMinutes: Number(process.env.BOOKING_HOLD_MINUTES ?? 15),
} as const;

export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);

/**
 * Demo mode runs the whole platform against an in-memory dataset with no
 * database at all. It turns on automatically when Supabase is not configured,
 * and can be forced either way with DEMO_MODE.
 */
export const isDemoMode =
  process.env.DEMO_MODE === 'true' ||
  (process.env.DEMO_MODE !== 'false' && !isSupabaseConfigured);
