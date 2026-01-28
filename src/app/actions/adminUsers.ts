'use server';

import { z } from 'zod';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { ProfileRow, UserRole } from '@/lib/supabase/types';
import { requireAdmin } from '@/lib/auth/requireAdmin';

export async function adminListUsers(): Promise<ProfileRow[]> {
  await requireAdmin();
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as ProfileRow[];
}

const updateUserSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(['admin', 'internal', 'client', 'manufacturing'] as const),
  license_status: z.enum(['active', 'revoked', 'expired'] as const),
  company_name: z.string().max(200).optional().nullable(),
  full_name: z.string().max(200).optional().nullable(),
});

export async function adminUpdateUser(input: unknown) {
  await requireAdmin();
  const parsed = updateUserSchema.parse(input);

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from('profiles')
    .update({
      role: parsed.role,
      license_status: parsed.license_status,
      company_name: parsed.company_name ?? null,
      full_name: parsed.full_name ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', parsed.id);

  if (error) throw new Error(error.message);
  return { success: true };
}

const createUserSchema = z.object({
  email: z.string().email(),
  full_name: z.string().max(200).optional().nullable(),
  company_name: z.string().max(200).optional().nullable(),
  role: z.enum(['admin', 'internal', 'client', 'manufacturing'] as const).default('client'),
  // If omitted, we send an invite email. If provided, we create with password.
  password: z.string().min(8).max(72).optional().nullable(),
});

export async function adminCreateUser(input: unknown) {
  await requireAdmin();
  const parsed = createUserSchema.parse(input);

  const admin = createSupabaseAdminClient();

  // 1) Create/invite auth user
  if (parsed.password) {
    const { data, error } = await admin.auth.admin.createUser({
      email: parsed.email,
      password: parsed.password,
      email_confirm: true,
      user_metadata: {
        full_name: parsed.full_name ?? null,
      },
    });
    if (error) throw new Error(error.message);
    const userId = data.user?.id;
    if (!userId) throw new Error('Failed to create user');

    // 2) Ensure profile exists and set role/license
    const { error: upsertError } = await admin
      .from('profiles')
      .upsert({
        id: userId,
        email: parsed.email,
        full_name: parsed.full_name ?? null,
        company_name: parsed.company_name ?? null,
        role: parsed.role as UserRole,
        license_status: 'active',
        updated_at: new Date().toISOString(),
      });
    if (upsertError) throw new Error(upsertError.message);

    return { success: true, created: true, invited: false };
  }

  // Invite flow
  const { data, error } = await admin.auth.admin.inviteUserByEmail(parsed.email, {
    data: { full_name: parsed.full_name ?? null },
  });
  if (error) throw new Error(error.message);

  const invitedUserId = data.user?.id;
  if (invitedUserId) {
    const { error: upsertError } = await admin
      .from('profiles')
      .upsert({
        id: invitedUserId,
        email: parsed.email,
        full_name: parsed.full_name ?? null,
        company_name: parsed.company_name ?? null,
        role: parsed.role as UserRole,
        license_status: 'active',
        updated_at: new Date().toISOString(),
      });
    if (upsertError) throw new Error(upsertError.message);
  }

  return { success: true, created: false, invited: true };
}
