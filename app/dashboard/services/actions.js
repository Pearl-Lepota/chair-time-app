'use server';

import { revalidatePath } from 'next/cache';
import { requireSalon } from '@/lib/get-salon';

export async function addService(formData) {
  const { supabase, salon } = await requireSalon();
  const name = formData.get('name')?.toString().trim();
  const category = formData.get('category')?.toString();
  const duration = parseInt(formData.get('duration'), 10);
  const priceRand = parseInt(formData.get('price'), 10);

  if (!name || !category || !duration || isNaN(priceRand)) return;

  await supabase.from('services').insert({
    salon_id: salon.id,
    name,
    category,
    duration_minutes: duration,
    price_cents: priceRand * 100,
  });

  revalidatePath('/dashboard/services');
}

export async function removeService(formData) {
  const { supabase, salon } = await requireSalon();
  const id = formData.get('id');
  await supabase.from('services').delete().eq('id', id).eq('salon_id', salon.id);
  revalidatePath('/dashboard/services');
}
