'use client';

import { useState } from 'react';
import { Bot, Mail, Phone, X } from 'lucide-react';

/**
 * The floating help bubble.
 *
 * There is no chatbot behind this yet, so rather than opening a dead chat
 * window it offers the property's own contact details. Swap the panel for a
 * conversation when an assistant exists.
 */
export function HelpWidget({ phone, email }: { phone: string | null; email: string | null }) {
  const [open, setOpen] = useState(false);

  if (!phone && !email) return null;

  return (
    <div className="fixed bottom-5 right-5 z-40 print:hidden">
      {open ? (
        <div className="mb-3 w-[calc(100vw-2.5rem)] max-w-xs rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-bold text-slate-900">Talk to the property</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="-mr-1 -mt-1 rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="mt-1 text-xs text-slate-500">
            The front desk can help with rooms, rates and early check-in.
          </p>

          <div className="mt-3 space-y-2">
            {phone ? (
              <a
                href={`tel:${phone}`}
                className="flex items-center gap-2.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <Phone className="h-4 w-4 shrink-0 text-slate-400" />
                <span className="truncate">{phone}</span>
              </a>
            ) : null}

            {email ? (
              <a
                href={`mailto:${email}`}
                className="flex items-center gap-2.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                <span className="truncate">{email}</span>
              </a>
            ) : null}
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-3 rounded-full border border-slate-200 bg-white p-2 shadow-lg transition hover:shadow-xl sm:pr-5"
      >
        <span
          className="flex h-11 w-11 items-center justify-center rounded-full"
          style={{ backgroundColor: 'var(--brand-50)' }}
          aria-hidden="true"
        >
          <Bot className="h-6 w-6" style={{ color: 'var(--brand-700)' }} />
        </span>
        <span
          className="hidden text-base font-semibold sm:inline"
          style={{ color: 'var(--brand-700)' }}
        >
          Ask me anything!
        </span>
      </button>
    </div>
  );
}
