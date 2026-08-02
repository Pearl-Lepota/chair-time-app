'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <form onSubmit={handleLogin} className="w-full max-w-sm bg-white border border-line rounded-2xl p-8">
        <div className="font-display italic text-xl text-green-dark mb-1">Chair·Time</div>
        <h1 className="font-display text-2xl font-semibold mb-6">Sign in</h1>

        <label className="field-label">Email</label>
        <input className="field-input mb-4" type="email" required value={email}
          onChange={(e) => setEmail(e.target.value)} />

        <label className="field-label">Password</label>
        <input className="field-input mb-6" type="password" required value={password}
          onChange={(e) => setPassword(e.target.value)} />

        {error && <p className="text-rose text-sm mb-4">{error}</p>}

        <button className="btn-primary w-full" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="text-xs text-ink60 mt-4 text-center">
          New here? <a href="/signup" className="underline">Create an account</a>
        </p>
      </form>
    </main>
  );
}
