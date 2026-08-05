'use server';

import { revalidatePath } from 'next/cache';
import { requireSalon } from '@/lib/get-salon';

export async function addStaff(formData) {
  const { supabase, salon } = await requireSalon();
  const name = formData.get('name')?.toString().trim();
  const specialty = formData.get('specialty')?.toString().trim();
  const color = formData.get('color')?.toString() || '#2F4A3C';
  const skills = formData.getAll('skills');
  const commissionRate = parseFloat(formData.get('commission_rate')) || 0;

  if (!name || skills.length === 0) return;

  await supabase.from('staff').insert({
    salon_id: salon.id,
    name,
    specialty,
    color,
    skills,
    commission_rate: commissionRate,
  });

  revalidatePath('/dashboard/staff');
  revalidatePath('/dashboard/commissions');
}

export async function removeStaff(formData) {
  const { supabase, salon } = await requireSalon();
  const id = formData.get('id');
  await supabase.from('staff').delete().eq('id', id).eq('salon_id', salon.id);
  revalidatePath('/dashboard/staff');
  revalidatePath('/dashboard/commissions');
}

export async function updateCommission(formData) {
  const { supabase, salon } = await requireSalon();
  const id = formData.get('id');
  const commissionRate = parseFloat(formData.get('commission_rate')) || 0;
  await supabase.from('staff').update({ commission_rate: commissionRate }).eq('id', id).eq('salon_id', salon.id);
  revalidatePath('/dashboard/staff');
  revalidatePath('/dashboard/commissions');
}
