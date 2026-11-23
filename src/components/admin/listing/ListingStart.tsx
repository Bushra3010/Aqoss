'use client';

import { useRef, useState } from 'react';
import { BasicInfoForm } from './BasicInfoForm';
import { ListingSteps } from './parts';
import { PropertyTypePicker } from './PropertyTypePicker';
import { scrollPaneToTop } from './ScrollTop';

/**
 * The start of a listing in the CRM: choose the kind of property, then fill in
 * Basic Info. Nothing is saved until Basic Info is — that creates the hotel and
 * its draft website, and the remaining steps continue on the listing's page.
 */
export function ListingStart() {
  const [type, setType] = useState<string | null>(null);
  const [phase, setPhase] = useState<'type' | 'basic'>('type');
  const top = useRef<HTMLDivElement>(null);

  function go(next: 'type' | 'basic') {
    setPhase(next);
    scrollPaneToTop(top.current);
  }

  return (
    <div ref={top}>
      {phase === 'basic' && type ? (
        <div className="rounded-2xl border border-slate-200 bg-white">
          <ListingSteps current="basic-info" />
          <BasicInfoForm propertyTypeKey={type} onBack={() => go('type')} />
        </div>
      ) : (
        <PropertyTypePicker value={type} onChange={setType} onContinue={() => go('basic')} cancelHref="/admin/hotels" />
      )}
    </div>
  );
}
