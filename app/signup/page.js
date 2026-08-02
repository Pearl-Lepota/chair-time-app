'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignup(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setSent(true);
  }

  if (sent) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-sm text-center">
          <h1 className="font-display text-2xl font-semibold mb-3">Check your email</h1>
          <p className="text-ink60 text-sm">
            We sent a confirmation link to {email}. Click it to activate your account, then come back and sign in.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <form onSubmit={handleSignup} className="w-full max-w-sm bg-white border border-line rounded-2xl p-8">
        <div className="font-display italic text-xl text-green-dark mb-1">Chair·Time</div>
        <h1 className="font-display text-2xl font-semibold mb-6">Create your account</h1>

        <label className="field-label">Email</label>
        <input className="field-input mb-4" type="email" required value={email}
          onChange={(e) => setEmail(e.target.value)} placeholder="you@yoursalon.co.za" />

        <label className="field-label">Password</label>
        <input className="field-input mb-6" type="password" required minLength={6} value={password}
          onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />

        {error && <p className="text-rose text-sm mb-4">{error}</p>}

        <button className="btn-primary w-full" disabled={loading}>
          {loading ? 'Creating account…' : 'Create account'}
        </button>
        <p className="text-xs text-ink60 mt-4 text-center">
          Already have an account? <a href="/login" className="underline">Sign in</a>
        </p>
      </form>
    </main>
  );
}
