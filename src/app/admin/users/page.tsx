import { adminCreateUser, adminListUsers, adminUpdateUser } from '@/app/actions/adminUsers';
import { requireAdmin } from '@/lib/auth/requireAdmin';

export const dynamic = 'force-dynamic';

function badgeClass(value: string) {
  switch (value) {
    case 'admin':
      return 'bg-slate-900 text-white';
    case 'internal':
      return 'bg-emerald-600 text-white';
    case 'client':
      return 'bg-indigo-600 text-white';
    case 'manufacturing':
      return 'bg-amber-600 text-white';
    case 'revoked':
      return 'bg-rose-600 text-white';
    case 'expired':
      return 'bg-slate-500 text-white';
    case 'active':
      return 'bg-emerald-700 text-white';
    default:
      return 'bg-slate-200 text-slate-900';
  }
}

async function createUserAction(formData: FormData) {
  'use server';
  const email = String(formData.get('email') || '').trim();
  const full_name = String(formData.get('full_name') || '').trim() || null;
  const company_name = String(formData.get('company_name') || '').trim() || null;
  const role = String(formData.get('role') || 'client');
  const passwordRaw = String(formData.get('password') || '').trim();
  const password = passwordRaw ? passwordRaw : null;

  await adminCreateUser({ email, full_name, company_name, role, password });
}

async function updateUserAction(formData: FormData) {
  'use server';
  const id = String(formData.get('id') || '').trim();
  const role = String(formData.get('role') || 'client');
  const license_status = String(formData.get('license_status') || 'active');
  const company_name = String(formData.get('company_name') || '').trim() || null;
  const full_name = String(formData.get('full_name') || '').trim() || null;

  await adminUpdateUser({ id, role, license_status, company_name, full_name });
}

export default async function AdminUsersPage() {
  await requireAdmin();
  const users = await adminListUsers();

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin: Users</h1>
        <p className="mt-1 text-sm text-slate-600">
          Create users, set roles, and revoke licenses. Only <span className="font-mono">role=admin</span> can access this page.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="text-sm font-semibold tracking-tight">Add user</div>
        <p className="mt-1 text-xs text-slate-500">
          Leave password empty to send an invite email. Set password to create an immediate login.
        </p>

        <form action={createUserAction} className="mt-4 grid gap-4 md:grid-cols-5">
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-slate-600">Email *</label>
            <input
              name="email"
              type="email"
              required
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              placeholder="user@company.com"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Full name</label>
            <input
              name="full_name"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              placeholder="Jane Doe"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Company</label>
            <input
              name="company_name"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              placeholder="TES"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Role</label>
            <select
              name="role"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              defaultValue="client"
            >
              <option value="client">client</option>
              <option value="manufacturing">manufacturing</option>
              <option value="internal">internal</option>
              <option value="admin">admin</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-slate-600">Password (optional)</label>
            <input
              name="password"
              type="password"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              placeholder="(invite if empty)"
            />
          </div>
          <div className="md:col-span-3 flex items-end">
            <button
              type="submit"
              className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Create / Invite user
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="text-sm font-semibold tracking-tight">Existing users</div>
          <div className="mt-1 text-xs text-slate-500">Updates apply immediately.</div>
        </div>

        <div className="divide-y divide-slate-200">
          {users.map((u) => (
            <form
              key={u.id}
              action={updateUserAction}
              className="grid gap-3 px-6 py-4 md:grid-cols-12 md:items-end"
            >
              <input type="hidden" name="id" value={u.id} />
              <div className="md:col-span-3">
                <div className="text-xs font-semibold text-slate-600">Email</div>
                <div className="mt-1 text-sm text-slate-900">{u.email}</div>
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-slate-600">Full name</label>
                <input
                  name="full_name"
                  defaultValue={u.full_name ?? ''}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-slate-600">Company</label>
                <input
                  name="company_name"
                  defaultValue={u.company_name ?? ''}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-slate-600">Role</label>
                <select
                  name="role"
                  defaultValue={u.role}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="client">client</option>
                  <option value="manufacturing">manufacturing</option>
                  <option value="internal">internal</option>
                  <option value="admin">admin</option>
                </select>
                <div className="mt-2">
                  <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${badgeClass(u.role)}`}>
                    {u.role}
                  </span>
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-slate-600">License</label>
                <select
                  name="license_status"
                  defaultValue={u.license_status}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="active">active</option>
                  <option value="revoked">revoked</option>
                  <option value="expired">expired</option>
                </select>
                <div className="mt-2">
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${badgeClass(u.license_status)}`}
                  >
                    {u.license_status}
                  </span>
                </div>
              </div>
              <div className="md:col-span-1">
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                >
                  Save
                </button>
              </div>
            </form>
          ))}
        </div>
      </div>
    </div>
  );
}
