'use client';

import { useFormState } from 'react-dom';
import { savePoliciesStep, type ListingActionState } from '@/app/admin/listing-actions';
import { CANCELLATION_OPTIONS, SMOKING_OPTIONS, type PolicyAnswers } from '@/lib/listing';
import { FormRow, FormSection, StepBody, YesNo } from './parts';
import { StepFooter } from './StepFooter';
import { ErrorBanner } from './ScrollTop';

/**
 * House rules as questions. Saving writes them out as the "Property rules"
 * text the website shows, and keeps the answers so this form opens filled in.
 */
export function PoliciesForm({
  hotelId,
  answers,
  checkIn,
  checkOut,
  backHref,
}: {
  hotelId: string;
  answers: PolicyAnswers;
  checkIn: string;
  checkOut: string;
  backHref: string;
}) {
  const [state, action] = useFormState<ListingActionState, FormData>(savePoliciesStep, {});
  const err = (name: string) => state?.fieldErrors?.[name];

  return (
    <form action={action}>
      <input type="hidden" name="hotel_id" value={hotelId} />

      <StepBody title="Policies" description="The rules guests agree to when they book. They appear under Property rules on the website.">
        <ErrorBanner state={state} />

        <FormSection title="Check-in & check-out">
          <FormRow label="Check-in from" htmlFor="check_in_time" error={err('check_in_time')} required>
            <input id="check_in_time" name="check_in_time" type="time" className="input max-w-[12rem]" defaultValue={checkIn.slice(0, 5)} required />
          </FormRow>
          <FormRow label="Check-out by" htmlFor="check_out_time" error={err('check_out_time')} required>
            <input id="check_out_time" name="check_out_time" type="time" className="input max-w-[12rem]" defaultValue={checkOut.slice(0, 5)} required />
          </FormRow>
        </FormSection>

        <FormSection title="Cancellation">
          <FormRow label="Cancellation policy" hint="What guests are told before they pay" htmlFor="cancellation" error={err('cancellation')} required>
            <select id="cancellation" name="cancellation" className="input" defaultValue={answers.cancellation}>
              {CANCELLATION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </FormRow>
        </FormSection>

        <FormSection title="Guest rules">
          <FormRow label="Are unmarried couples allowed?" error={err('couples')} required>
            <YesNo name="couples" value={answers.couples} />
          </FormRow>
          <FormRow label="Are guests with a local ID allowed?" hint="An ID from the same city as the property" error={err('local_id')} required>
            <YesNo name="local_id" value={answers.local_id} />
          </FormRow>
          <FormRow label="Children stay free under the age of" hint="When sharing the existing bedding" htmlFor="child_free_age" error={err('child_free_age')} required>
            <select id="child_free_age" name="child_free_age" className="input max-w-[12rem]" defaultValue={answers.child_free_age}>
              <option value={0}>No free stay</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((age) => (
                <option key={age} value={age}>
                  {age} years
                </option>
              ))}
            </select>
          </FormRow>
          <FormRow label="Is an extra bed available?" error={err('extra_bed')} required>
            <YesNo name="extra_bed" value={answers.extra_bed} />
          </FormRow>
          <FormRow label="Are pets allowed?" error={err('pets')} required>
            <YesNo name="pets" value={answers.pets} />
          </FormRow>
          <FormRow label="Smoking" htmlFor="smoking" error={err('smoking')} required>
            <select id="smoking" name="smoking" className="input" defaultValue={answers.smoking}>
              {SMOKING_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </FormRow>
          <FormRow label="Other rules" hint="Anything else guests should know, e.g. quiet hours, visitors, alcohol" htmlFor="other" error={err('other')}>
            <textarea id="other" name="other" className="input min-h-24" defaultValue={answers.other} maxLength={2000} />
          </FormRow>
        </FormSection>
      </StepBody>

      <StepFooter backHref={backHref} />
    </form>
  );
}
