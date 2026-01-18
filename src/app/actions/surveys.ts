'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const createSurveySchema = z.object({
  client_name: z.string().min(1),
  site_name: z.string().min(1),
  site_address: z.string().optional(),
  survey_date: z.string().min(1),
  surveyor_name: z.string().min(1),
  project_reference: z.string().optional(),
  general_notes: z.string().optional(),
});

export async function createSurvey(formData: FormData) {
  const parsed = createSurveySchema.safeParse({
    client_name: String(formData.get('client_name') ?? ''),
    site_name: String(formData.get('site_name') ?? ''),
    site_address: String(formData.get('site_address') ?? ''),
    survey_date: String(formData.get('survey_date') ?? ''),
    surveyor_name: String(formData.get('surveyor_name') ?? ''),
    project_reference: String(formData.get('project_reference') ?? ''),
    general_notes: String(formData.get('general_notes') ?? ''),
  });

  if (!parsed.success) {
    throw new Error('Invalid survey input');
  }

  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from('surveys')
    .insert({
      client_name: parsed.data.client_name,
      site_name: parsed.data.site_name,
      site_address: parsed.data.site_address || null,
      survey_date: parsed.data.survey_date,
      surveyor_name: parsed.data.surveyor_name,
      project_reference: parsed.data.project_reference || null,
      general_notes: parsed.data.general_notes || null,
      status: 'in_progress',
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);

  redirect(`/surveys/${data.id}`);
}
