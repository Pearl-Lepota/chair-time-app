'use server';

import { revalidatePath } from 'next/cache';
import { requireSalon } from '@/lib/get-salon';

export async function updateSalonInfo(formData) {
  const { supabase, salon } = await requireSalon();
  const address = formData.get('address')?.toString().trim() || null;
  const phone = formData.get('phone')?.toString().trim() || null;
  const hoursText = formData.get('hours_text')?.toString().trim() || null;

  await supabase.from('salons')
    .update({ address, phone, hours_text: hoursText })
    .eq('id', salon.id);

  revalidatePath('/dashboard/settings');
  revalidatePath(`/book/${salon.slug}`);
}

// Called after the client has already uploaded the file directly to
// Supabase Storage — this just saves the resulting public URL onto the
// salon record. Keeping the upload itself client-side avoids routing
// large file bytes through a server action.
export async function savePhotoUrl(formData) {
  const { supabase, salon } = await requireSalon();
  const field = formData.get('field')?.toString(); // 'hero_photo_url' | 'location_photo_url'
  const url = formData.get('url')?.toString();

  if (field !== 'hero_photo_url' && field !== 'location_photo_url') return;
  if (!url) return;

  await supabase.from('salons').update({ [field]: url }).eq('id', salon.id);

  revalidatePath('/dashboard/settings');
  revalidatePath(`/book/${salon.slug}`);
}
