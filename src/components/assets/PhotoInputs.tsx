'use client';

export type PhotoField = {
  photoType: string;
  label: string;
  required: boolean;
  hint?: string;
};

export function PhotoInputs(props: { title: string; fields: PhotoField[]; note?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold tracking-tight">{props.title}</div>
          {props.note ? <div className="mt-1 text-xs text-slate-500">{props.note}</div> : null}
        </div>
        <div className="text-xs text-slate-500">Images</div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {props.fields.map((f) => (
          <div key={f.photoType}>
            <label className="text-xs font-semibold text-slate-600">
              {f.label}
              {f.required ? ' *' : ''}
            </label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              name={`p_${f.photoType}`}
              required={f.required}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
            />
            {f.hint ? <div className="mt-1 text-xs text-slate-500">{f.hint}</div> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
