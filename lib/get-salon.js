import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// Call this at the top of any dashboard server component/page.
// Redirects to /login if not authenticated, or /onboarding if the user
// hasn't created a salon yet. Otherwise returns { supabase, user, salon }.
export async function requireSalon() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: membership } = await supabase
    .from('salon_members')
    .select('salon_id, role, salons(*)')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) redirect('/onboarding');

  return { supabase, user, salon: membership.salons, role: membership.role };
}
