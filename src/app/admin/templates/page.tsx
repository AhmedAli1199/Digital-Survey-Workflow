import Link from 'next/link';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { AssetTypeConfigRow } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export default async function TemplateAdminIndex() {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from('asset_type_configs')
    .select('*')
    .order('display_name', { ascending: true });

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-950">
        Failed to load templates: {error.message}
      </div>
    );
  }

  const configs = (data ?? []) as AssetTypeConfigRow[];

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Template admin</h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage asset types, Level 2 diagrams, and dimension steps (D1/D2...).
          </p>
        </div>
        <Link
          href="/surveys"
          className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
        >
          Back to surveys
        </Link>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        No authentication is enabled yet. Treat this page as internal-only.
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="grid grid-cols-12 gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-600">
          <div className="col-span-4">Asset type</div>
          <div className="col-span-2">Min complexity</div>
          <div className="col-span-2">Level 2 steps</div>
          <div className="col-span-3">Diagram</div>
          <div className="col-span-1 text-right">Edit</div>
        </div>

        {configs.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-slate-600">No templates found.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {configs.map((c) => {
              const steps = Array.isArray((c as any).level2_template?.steps)
                ? (c as any).level2_template.steps
                : [];
              const drawingUrl = (c as any).level2_template?.drawing_url as string | undefined;

              return (
                <div key={c.asset_type} className="grid grid-cols-12 items-center gap-2 px-4 py-3 text-sm">
                  <div className="col-span-4">
                    <div className="font-medium text-slate-900">{c.display_name}</div>
                    <div className="text-xs text-slate-500">{c.asset_type}</div>
                  </div>
                  <div className="col-span-2">L{c.min_complexity_level}</div>
                  <div className="col-span-2">{steps.length}</div>
                  <div className="col-span-3">
                    {drawingUrl ? (
                      <a
                        href={drawingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-slate-900 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-900"
                      >
                        View PDF
                      </a>
                    ) : (
                      <span className="text-xs text-slate-500">—</span>
                    )}
                  </div>
                  <div className="col-span-1 text-right">
                    <Link
                      href={`/admin/templates/${c.asset_type}`}
                      className="text-sm font-medium text-slate-900 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-900"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
