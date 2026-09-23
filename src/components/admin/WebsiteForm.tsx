'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { Alert, Field } from '@/components/ui';
import { saveWebsite, type ActionState } from '@/app/admin/actions';

const initial: ActionState = {};

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Saving…' : 'Save website'}
    </button>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function WebsiteForm({
  website,
  hotels,
  templates,
  defaultHotelId,
}: {
  website?: any;
  hotels: { id: string; name: string }[];
  templates: { key: string; name: string }[];
  defaultHotelId?: string;
}) {
  const [state, action] = useFormState(saveWebsite, initial);

  const domains = (website?.website_domains ?? [])
    .map((d: any) => d.hostname)
    .join('\n');

  const templateKey = Array.isArray(website?.website_templates)
    ? website.website_templates[0]?.key
    : website?.website_templates?.key;

  return (
    <form action={action} className="card space-y-6 p-6">
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}

      {website?.id ? <input type="hidden" name="id" value={website.id} /> : null}

      <section>
        <h2 className="text-sm font-semibold text-slate-900">Assignment</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <Field label="Hotel" htmlFor="hotel_id">
            <select
              id="hotel_id"
              name="hotel_id"
              className="input"
              defaultValue={website?.hotel_id ?? defaultHotelId ?? ''}
              required
            >
              <option value="" disabled>Select a hotel</option>
              {hotels.map((h) => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          </Field>

          <Field label="Template" htmlFor="template_key">
            <select id="template_key" name="template_key" className="input" defaultValue={templateKey ?? 'classic'}>
              {templates.map((t) => (
                <option key={t.key} value={t.key}>{t.name}</option>
              ))}
            </select>
          </Field>

          <Field label="Website name" htmlFor="name">
            <input id="name" name="name" className="input" defaultValue={website?.name ?? ''} required />
          </Field>

          <Field
            label="Slug"
            htmlFor="slug"
            hint="Also the dev subdomain: <slug>.localhost:3000"
          >
            <input
              id="slug"
              name="slug"
              className="input"
              pattern="[a-z0-9\-]+"
              defaultValue={website?.slug ?? ''}
              required
            />
          </Field>

          <Field label="Status" htmlFor="status">
            <select id="status" name="status" className="input" defaultValue={website?.status ?? 'DRAFT'}>
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active (published)</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </Field>
        </div>
      </section>

      <section className="border-t border-slate-200 pt-6">
        <h2 className="text-sm font-semibold text-slate-900">Branding</h2>
        <p className="mt-1 text-xs text-slate-500">
          These colours drive the template&apos;s palette at render time.
        </p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <Field label="Primary colour" htmlFor="primary_color">
            <input
              id="primary_color"
              name="primary_color"
              type="color"
              className="input h-11 p-1"
              defaultValue={website?.primary_color ?? '#0B4FD0'}
            />
          </Field>
          <Field label="Accent colour" htmlFor="accent_color">
            <input
              id="accent_color"
              name="accent_color"
              type="color"
              className="input h-11 p-1"
              defaultValue={website?.accent_color ?? '#15803D'}
            />
          </Field>
        </div>
      </section>

      <section className="border-t border-slate-200 pt-6">
        <h2 className="text-sm font-semibold text-slate-900">Domains</h2>
        <p className="mt-1 text-xs text-slate-500">
          One per line. The first is the primary. In development use
          <code className="mx-1 rounded bg-slate-100 px-1">slug.localhost</code>.
        </p>
        <div className="mt-3">
          <Field label="Hostnames" htmlFor="domains">
            <textarea
              id="domains"
              name="domains"
              className="input min-h-24 font-mono text-xs"
              defaultValue={domains}
              placeholder={'www.hotela.com\nhotela.com\nhotel-a.localhost'}
            />
          </Field>
        </div>
      </section>

      <section className="border-t border-slate-200 pt-6">
        <h2 className="text-sm font-semibold text-slate-900">SEO</h2>
        <div className="mt-3 grid gap-4">
          <Field label="Title" htmlFor="seo_title">
            <input id="seo_title" name="seo_title" className="input" maxLength={160} defaultValue={website?.seo_title ?? ''} />
          </Field>
          <Field label="Meta description" htmlFor="seo_description">
            <textarea
              id="seo_description"
              name="seo_description"
              className="input min-h-20"
              maxLength={320}
              defaultValue={website?.seo_description ?? ''}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="robots_indexable"
              className="h-4 w-4 rounded border-slate-300"
              defaultChecked={website?.robots_indexable ?? true}
            />
            Allow search engines to index this website
          </label>
        </div>
      </section>

      <div className="border-t border-slate-200 pt-6">
        <Submit />
      </div>
    </form>
  );
}
