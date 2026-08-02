import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) redirect('/dashboard');

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="font-display italic text-3xl text-green-dark mb-3">Chair·Time</div>
      <h1 className="font-display text-4xl font-semibold max-w-xl mb-4">
        Booking software built for salons.
      </h1>
      <p className="text-ink60 max-w-md mb-8">
        Nails, hair, braids, lashes, brows, makeup, bridal — one booking page
        for your clients, one dashboard for your team.
      </p>
      <div className="flex gap-3">
        <a href="/signup" className="btn-primary">Get started</a>
        <a href="/login" className="btn-ghost">Sign in</a>
      </div>
    </main>
  );
}
