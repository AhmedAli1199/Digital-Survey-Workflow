import Link from 'next/link';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { AssetTypeConfigRow } from '@/lib/supabase/types';
import { autoCategorizeAssetVariants, createAssetVariant } from '@/app/actions/templates';

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

  const categories = Array.from(
    new Set(
      configs
        .map((c) => ((c as any).asset_category ?? 'uncategorized') as string)
        .map((c) => c.trim())
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b));

  const grouped = categories.map((cat) => ({
    category: cat,
    items: configs
      .filter((c) => String((c as any).asset_category ?? 'uncategorized') === cat)
      .sort((a, b) => a.display_name.localeCompare(b.display_name)),
  }));

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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-slate-600">
          Tip: if your existing variants are still under <span className="font-mono">uncategorized</span>, run auto-categorize and then tweak any outliers.
        </div>
        <form action={autoCategorizeAssetVariants}>
          <button
            type="submit"
            className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
          >
            Auto-categorize uncategorized
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold tracking-tight">Add a new variant</div>
            <div className="mt-1 text-xs text-slate-500">
              Create a new variant under a broad category (e.g., “Check valve” → “CV - 2\" Class 150”).
            </div>
          </div>
        </div>

        <form action={createAssetVariant} className="mt-4 grid gap-4 md:grid-cols-4">
          <div className="md:col-span-1">
            <label className="text-xs font-semibold text-slate-600">Category *</label>
            <input
              name="asset_category"
              list="asset-category-list"
              required
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              placeholder="e.g., Check valve"
            />
            <datalist id="asset-category-list">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          <div className="md:col-span-1">
            <label className="text-xs font-semibold text-slate-600">Variant key (asset_type) *</label>
            <input
              name="asset_type"
              required
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              placeholder="e.g., check_valve_2in_cl150"
            />
            <div className="mt-1 text-[11px] text-slate-500">Letters/numbers/underscore/dash only.</div>
          </div>

          <div className="md:col-span-1">
            <label className="text-xs font-semibold text-slate-600">Display name *</label>
            <input
              name="display_name"
              required
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              placeholder='e.g., CV - 2" Class 150'
            />
          </div>

          <div className="md:col-span-1">
            <label className="text-xs font-semibold text-slate-600">Min complexity *</label>
            <select
              name="min_complexity_level"
              defaultValue="1"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
            >
              <option value="1">Level 1</option>
              <option value="2">Level 2</option>
            </select>
          </div>

          <div className="md:col-span-4">
            <button
              type="submit"
              className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Create variant
            </button>
          </div>
        </form>
      </div>

      {configs.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-600">
          No templates found.
        </div>
      ) : (
        <div className="grid gap-6">
          {grouped.map((g) => (
            <div key={g.category} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-sm font-semibold text-slate-900">{g.category}</div>
                <div className="text-xs text-slate-500">{g.items.length} variants</div>
              </div>

              <div className="grid grid-cols-12 gap-2 border-b border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-600">
                <div className="col-span-4">Variant</div>
                <div className="col-span-2">Min complexity</div>
                <div className="col-span-2">Level 2 steps</div>
                <div className="col-span-3">Diagram</div>
                <div className="col-span-1 text-right">Edit</div>
              </div>

              <div className="divide-y divide-slate-100">
                {g.items.map((c) => {
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
