'use client';

export default function GlobalError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
        <div className="text-sm font-semibold text-rose-950">Something went wrong</div>
        <div className="mt-2 text-sm text-rose-900">{props.error.message}</div>
        <button
          onClick={() => props.reset()}
          className="mt-4 inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
