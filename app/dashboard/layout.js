import { requireSalon } from '@/lib/get-salon';
import SignOutButton from './sign-out-button';

export default async function DashboardLayout({ children }) {
  const { salon } = await requireSalon();

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-paper sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            <span className="font-display italic text-lg text-green-dark">Chair·Time</span>
            <span className="font-mono text-xs font-semibold text-ink60 bg-white border border-line rounded-full px-3 py-1">
              {salon.name}
            </span>
          </div>
          <nav className="flex items-center gap-1 bg-white border border-line rounded-full p-1">
            <a href="/dashboard/schedule" className="text-sm font-semibold text-ink60 hover:text-ink px-4 py-2 rounded-full">Schedule</a>
            <a href="/dashboard/services" className="text-sm font-semibold text-ink60 hover:text-ink px-4 py-2 rounded-full">Services</a>
            <a href="/dashboard/staff" className="text-sm font-semibold text-ink60 hover:text-ink px-4 py-2 rounded-full">Staff</a>
          </nav>
          <SignOutButton />
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-5 py-8">{children}</main>
      <footer className="text-center text-xs font-mono text-ink40 py-8">
        Booking page for clients: <a className="underline" href={`/book/${salon.slug}`} target="_blank" rel="noreferrer">chairtime.app/{salon.slug}</a>
      </footer>
    </div>
  );
}
