'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { Alert } from '@/components/ui';
import { updateSetting, type ActionState } from '@/app/admin/actions';

const initial: ActionState = {};

function Save() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-outline shrink-0" disabled={pending}>
      {pending ? 'Saving…' : 'Save'}
    </button>
  );
}

export function SettingsForm({
  settings,
}: {
  settings: { key: string; value: unknown; category: string }[];
}) {
  const [state, action] = useFormState(updateSetting, initial);

  const grouped = settings.reduce<Record<string, typeof settings>>((acc, s) => {
    (acc[s.category] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}

      {Object.entries(grouped).map(([category, rows]) => (
        <section key={category} className="card p-5">
          <h2 className="text-sm font-semibold capitalize text-slate-900">{category}</h2>

          <ul className="mt-3 space-y-3">
            {rows.map((setting) => (
              <li key={setting.key}>
                <form action={action} className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="key" value={setting.key} />
                  <div className="min-w-0 flex-1">
                    <label className="label" htmlFor={`setting-${setting.key}`}>
                      <code className="text-xs">{setting.key}</code>
                    </label>
                    <input
                      id={`setting-${setting.key}`}
                      name="value"
                      className="input font-mono text-xs"
                      defaultValue={JSON.stringify(setting.value)}
                    />
                  </div>
                  <Save />
                </form>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {settings.length === 0 ? (
        <p className="text-sm text-slate-500">No editable settings.</p>
      ) : null}
    </div>
  );
}
