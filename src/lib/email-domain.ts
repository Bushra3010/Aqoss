import 'server-only';
import { Resolver } from 'node:dns/promises';

/**
 * Whether an address's domain can receive mail at all: it has MX records, or
 * (the RFC 5321 fallback) an A/AAAA record. This catches typos such as
 * `gmial.com` and made-up domains; it cannot tell whether the mailbox itself
 * exists — only the confirmation email proves that.
 *
 * Returns false only when DNS says the domain does not exist or takes no
 * mail. A lookup that fails for any other reason (no network, a timeout)
 * returns true, so an outage never blocks sign-ups.
 */
export async function emailDomainAcceptsMail(email: string): Promise<boolean> {
  const domain = email.split('@').pop()?.trim().toLowerCase();
  if (!domain) return false;

  const resolver = new Resolver({ timeout: 3000, tries: 2 });

  try {
    const mx = await resolver.resolveMx(domain);
    // A "null MX" (RFC 7505: a single record with an empty exchange) means "no mail here".
    return mx.some((record) => record.exchange !== '' && record.exchange !== '.');
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOTFOUND') return false;
    if (code !== 'ENODATA') return true;
  }

  // The domain exists but has no MX: mail goes to its address record, if any.
  const hasAddress = async (lookup: Promise<string[]>) =>
    lookup.then((records) => records.length > 0).catch(() => false);
  return (await hasAddress(resolver.resolve4(domain))) || (await hasAddress(resolver.resolve6(domain)));
}
