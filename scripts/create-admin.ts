/**
 * Create the first CRM login on a real Supabase project.
 *
 *   npm run admin:create -- --email=you@example.com --name="Your Name"
 *
 * Makes a Super Admin with access to every hotel and a strong random password,
 * printed once to this terminal — change it under My account after signing in.
 * Everyone else is then added from Users & Roles in the CRM.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local.
 */
import { randomInt } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });
config({ path: '.env' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local.');
  process.exit(1);
}

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const email = arg('email')?.trim().toLowerCase();
const name = arg('name')?.trim() || 'Super Admin';
if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error('Usage: npm run admin:create -- --email=you@example.com --name="Your Name"');
  process.exit(1);
}

function strongPassword(): string {
  const letters = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ';
  const digits = '23456789';
  const all = `${letters}${digits}!@#$%`;
  const chars = [letters[randomInt(letters.length)], digits[randomInt(digits.length)]];
  while (chars.length < 16) chars.push(all[randomInt(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

async function main() {
  const db = createClient(url!, key!, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data: role, error: roleError } = await db.from('roles').select('id').eq('key', 'super_admin').maybeSingle();
  if (roleError || !role) {
    throw new Error('The super_admin role is missing — run the migrations first (supabase/migrations).');
  }

  const { data: existing } = await db.from('profiles').select('id').ilike('email', email!).maybeSingle();
  if (existing) throw new Error(`${email} already has an account. Use another email, or manage it from Users & Roles.`);

  const password = strongPassword();
  const { data: created, error } = await db.auth.admin.createUser({
    email: email!,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
  });
  if (error || !created.user) throw new Error(error?.message ?? 'Could not create the account.');

  await db.from('profiles').update({ full_name: name, is_admin: true }).eq('id', created.user.id);
  const { error: adminError } = await db
    .from('admin_users')
    .insert({ profile_id: created.user.id, role_id: role.id, hotel_scope: [], is_active: true });
  if (adminError) throw new Error(`admin_users: ${adminError.message}`);

  console.log('\nSuper Admin created.');
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${password}`);
  console.log('\nSign in at /admin/login, then change the password under My account.');
}

main().catch((err) => {
  console.error(`\nCould not create the admin: ${err.message}`);
  process.exit(1);
});
