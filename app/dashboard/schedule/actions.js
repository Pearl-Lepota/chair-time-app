'use server';

import { revalidatePath } from 'next/cache';
import { requireSalon } from '@/lib/get-salon';

export async function cancelBooking(formData) {
  const { supabase, salon } = await requireSalon();
  const id = formData.get('id');
  await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id).eq('salon_id', salon.id);
  revalidatePath('/dashboard/schedule');
}
