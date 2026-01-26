'use client';

export type PhotoField = {
  photoType: string;
  label: string;
  required: boolean;
  hint?: string;
};

export function PhotoInputs(props: {
  title: string;
  fields: PhotoField[];
  note?: string;
  existingPhotos?: Record<string, string>; // photoType -> publicUrl
}) {
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
        {props.fields.map((f) => {
          const existingUrl = props.existingPhotos?.[f.photoType];
          const isRequired = f.required && !existingUrl;

          return (
            <div key={f.photoType}>
              <label className="text-xs font-semibold text-slate-600">
                {f.label}
                {isRequired ? ' *' : ''}
              </label>
              {existingUrl && (
                <div className="mb-2 mt-1">
                  <a
                    href={existingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    View existing photo
                  </a>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                name={`p_${f.photoType}`}
                required={isRequired}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
              />
              {f.hint ? <div className="mt-1 text-xs text-slate-500">{f.hint}</div> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
