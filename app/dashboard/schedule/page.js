import { requireSalon } from '@/lib/get-salon';
import { rand, centsToRand, minutesToLabel, timeStrToMinutes } from '@/lib/booking-logic';
import { cancelBooking } from './actions';

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}
function addDays(iso, n) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function labelFor(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export default async function SchedulePage({ searchParams }) {
  const { supabase, salon } = await requireSalon();
  const params = await searchParams;
  const date = params?.date || isoToday();

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, services(name, price_cents), staff(name, color)')
    .eq('salon_id', salon.id)
    .eq('date', date)
    .eq('status', 'confirmed')
    .order('time');

  const revenue = (bookings || []).reduce((sum, b) => sum + centsToRand(b.services?.price_cents || 0), 0);

  return (
    <div>
      <div className="font-mono text-xs uppercase tracking-wider text-brass font-semibold mb-1">Schedule</div>
      <h1 className="font-display text-3xl font-semibold mb-6">{salon.name}</h1>

      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="bg-white border border-line rounded-xl px-5 py-3.5">
          <div className="font-display text-2xl font-semibold text-green-dark">{(bookings || []).length}</div>
          <div className="font-mono text-[11px] uppercase text-ink60">Appointments</div>
        </div>
        <div className="bg-white border border-line rounded-xl px-5 py-3.5">
          <div className="font-display text-2xl font-semibold text-green-dark">{rand(revenue)}</div>
          <div className="font-mono text-[11px] uppercase text-ink60">Expected revenue</div>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <a href={`?date=${addDays(date, -1)}`} className="w-8 h-8 flex items-center justify-center bg-white border border-line rounded-lg">‹</a>
        <div className="font-display font-semibold text-lg min-w-[190px] text-center">{labelFor(date)}</div>
        <a href={`?date=${addDays(date, 1)}`} className="w-8 h-8 flex items-center justify-center bg-white border border-line rounded-lg">›</a>
        <a href="?" className="btn-ghost text-xs px-3 py-1.5">Today</a>
      </div>

      {(!bookings || bookings.length === 0) && (
        <div className="text-center py-16 text-ink60">
          <div className="font-display text-lg text-ink mb-1">Nothing on the books yet</div>
          <div className="text-sm">Bookings made for this day will show up here.</div>
        </div>
      )}

      {(bookings || []).map((b) => {
        const lbl = minutesToLabel(timeStrToMinutes(b.time.slice(0, 5)));
        return (
          <div key={b.id} className="flex bg-white border border-line rounded-2xl overflow-hidden mb-3 shadow-sm">
            <div className="w-24 flex flex-col items-center justify-center text-white p-3" style={{ background: b.staff?.color || '#999' }}>
              <div className="font-mono font-semibold text-base">{lbl.hm}</div>
              <div className="font-mono text-[10px] opacity-75">{lbl.ampm}</div>
              <div className="font-mono text-[9px] opacity-65 mt-2">{b.confirmation_code}</div>
            </div>
            <div className="flex-1 p-4 flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="font-display font-semibold text-base">{b.services?.name || 'Service removed'}</div>
                <div className="text-xs text-ink60">{b.customer_name} · {b.customer_phone}</div>
                <div className="text-xs text-ink60 mt-1">{b.staff?.name || 'Unassigned'}</div>
                <span className={`inline-block mt-2 font-mono text-[11px] font-semibold rounded-full px-2.5 py-1 ${b.deposit_paid ? 'bg-green-soft text-green-dark' : 'bg-brass-soft text-[#7A5A22]'}`}>
                  {b.deposit_paid ? `Deposit paid · ${rand(centsToRand(b.deposit_amount_cents))}` : `Pay at salon · ${rand(centsToRand(b.balance_due_cents))}`}
                </span>
              </div>
              <form action={cancelBooking}>
                <input type="hidden" name="id" value={b.id} />
                <button className="text-rose text-xs font-semibold border border-rose-soft rounded-lg px-3 py-1.5 hover:bg-rose-soft">Cancel</button>
              </form>
            </div>
          </div>
        );
      })}
    </div>
  );
}
