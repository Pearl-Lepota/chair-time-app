'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function slugify(name) {
  return name.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCreate(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Please sign in first.'); setLoading(false); return; }

    const slug = slugify(name) || 'my-salon';
    const { error } = await supabase.from('salons').insert({
      name,
      slug,
      owner_id: user.id,
    });

    setLoading(false);
    if (error) {
      // Most likely cause: slug already taken (unique constraint).
      setError(error.message.includes('duplicate') ? 'That salon name is already taken — try a slight variation.' : error.message);
      return;
    }
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <form onSubmit={handleCreate} className="w-full max-w-sm bg-white border border-line rounded-2xl p-8">
        <div className="font-display italic text-xl text-green-dark mb-1">Chair·Time</div>
        <h1 className="font-display text-2xl font-semibold mb-2">Set up your salon</h1>
        <p className="text-sm text-ink60 mb-6">You can add services and staff right after this.</p>

        <label className="field-label">Salon name</label>
        <input className="field-input mb-2" required value={name}
          onChange={(e) => setName(e.target.value)} placeholder="Luxe Hair Studio" />
        {name && (
          <p className="text-xs text-ink60 mb-6 font-mono">
            Your booking page: chairtime.app/{slugify(name) || 'my-salon'}
          </p>
        )}

        {error && <p className="text-rose text-sm mb-4">{error}</p>}

        <button className="btn-primary w-full" disabled={loading}>
          {loading ? 'Creating…' : 'Create salon'}
        </button>
      </form>
    </main>
  );
}
