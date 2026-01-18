'use client';

import { getMeasurementDefinition } from '@/lib/domain/measurementCatalog';

export function MeasurementInputs(props: {
  measurementKeys: string[];
  title: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="text-sm font-semibold tracking-tight">{props.title}</div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {props.measurementKeys.map((key) => {
          const def = getMeasurementDefinition(key);
          return (
            <div key={key}>
              <label className="text-xs font-semibold text-slate-600">{def.label} *</label>
              <input
                name={`m_${key}`}
                inputMode="decimal"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                placeholder={def.placeholder ?? ''}
                required
              />
            </div>
          );
        })}
      </div>
      <div className="mt-3 text-xs text-slate-500">
        Measurements are captured as entered and stored normalized for CAD/export.
      </div>
    </div>
  );
}
