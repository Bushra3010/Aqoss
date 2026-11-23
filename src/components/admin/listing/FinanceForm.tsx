'use client';

import { useFormState } from 'react-dom';
import { Lock } from 'lucide-react';
import { saveFinanceStep, type ListingActionState } from '@/app/admin/listing-actions';
import { OWNERSHIP_TYPES } from '@/lib/listing';
import { FormRow, FormSection, StepBody } from './parts';
import { StepFooter } from './StepFooter';
import { ErrorBanner } from './ScrollTop';

/** Who owns the property and where AQOSS pays the hotel's share of bookings. */
export function FinanceForm({
  hotelId,
  values,
  backHref,
  skipHref,
}: {
  hotelId: string;
  values: Record<string, string | null> | null;
  backHref: string;
  skipHref: string;
}) {
  const [state, action] = useFormState<ListingActionState, FormData>(saveFinanceStep, {});
  const err = (name: string) => state?.fieldErrors?.[name];
  const v = (name: string) => values?.[name] ?? '';

  return (
    <form action={action} noValidate>
      <input type="hidden" name="hotel_id" value={hotelId} />

      <StepBody
        title="Finance & Legal"
        description="Needed before AQOSS can pay out bookings. The website can go live without it, and you can add it later."
      >
        <ErrorBanner state={state} />
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
          Visible only to AQOSS staff and this property&apos;s admins — never on the website.
        </p>

        <FormSection title="Ownership" description="As on the property's registration documents">
          <FormRow label="Registered name" hint="The owner, firm or company the property is registered to" htmlFor="legal_name" error={err('legal_name')} required>
            <input id="legal_name" name="legal_name" className="input" defaultValue={v('legal_name')} maxLength={160} />
          </FormRow>
          <FormRow label="Type of ownership" htmlFor="ownership_type" error={err('ownership_type')} required>
            <select id="ownership_type" name="ownership_type" className="input" defaultValue={v('ownership_type')}>
              <option value="" disabled>
                Select
              </option>
              {OWNERSHIP_TYPES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </FormRow>
          <FormRow label="PAN" hint="Of the registered owner, firm or company" htmlFor="pan" error={err('pan')} required>
            <input id="pan" name="pan" className="input uppercase" placeholder="ABCDE1234F" defaultValue={v('pan')} maxLength={10} autoComplete="off" />
          </FormRow>
          <FormRow label="GSTIN" hint="Leave blank if the property is not registered for GST" htmlFor="gstin" error={err('gstin')}>
            <input id="gstin" name="gstin" className="input uppercase" placeholder="22ABCDE1234F1Z5" defaultValue={v('gstin')} maxLength={15} autoComplete="off" />
          </FormRow>
        </FormSection>

        <FormSection title="Bank account" description="Where payouts for bookings are sent">
          <FormRow label="Account holder name" htmlFor="bank_account_name" error={err('bank_account_name')} required>
            <input id="bank_account_name" name="bank_account_name" className="input" defaultValue={v('bank_account_name')} maxLength={160} autoComplete="off" />
          </FormRow>
          <FormRow label="Account number" htmlFor="bank_account_number" error={err('bank_account_number')} required>
            <input id="bank_account_number" name="bank_account_number" className="input" inputMode="numeric" defaultValue={v('bank_account_number')} maxLength={22} autoComplete="off" />
          </FormRow>
          <FormRow label="IFSC" htmlFor="bank_ifsc" error={err('bank_ifsc')} required>
            <input id="bank_ifsc" name="bank_ifsc" className="input uppercase" placeholder="HDFC0001234" defaultValue={v('bank_ifsc')} maxLength={11} autoComplete="off" />
          </FormRow>
          <FormRow label="Bank name" htmlFor="bank_name" error={err('bank_name')}>
            <input id="bank_name" name="bank_name" className="input" defaultValue={v('bank_name')} maxLength={120} autoComplete="off" />
          </FormRow>
        </FormSection>
      </StepBody>

      <StepFooter backHref={backHref} skipHref={skipHref} />
    </form>
  );
}
