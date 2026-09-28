/** How a payment arrived, in words staff use. Safe in client components. */

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  upi: 'UPI',
  card: 'Card',
  bank_transfer: 'Bank transfer',
  netbanking: 'Net banking',
};

export function paymentMethodLabel(p: { provider: string; method: string | null }): string {
  if (p.provider === 'manual') return `${METHOD_LABELS[p.method ?? ''] ?? 'Other'} · at the hotel`;
  const via = p.provider === 'mock' ? 'Online (test gateway)' : `Online · ${p.provider}`;
  return p.method ? `${via} · ${METHOD_LABELS[p.method] ?? p.method}` : via;
}
