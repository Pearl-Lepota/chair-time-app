import { requireSalon } from '@/lib/get-salon';
import { rand, centsToRand } from '@/lib/booking-logic';

function monthPrefix() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default async function CommissionsPage() {
  const { supabase, salon } = await requireSalon();
  const { data: bookings } = await supabase
    .from('bookings')
    .select('date, services(price_cents), staff(id, name, color, commission_rate)')
    .eq('salon_id', salon.id)
    .eq('status', 'confirmed');

  const rows = (bookings || []).filter((b) => b.staff);
  const thisMonth = rows.filter((b) => b.date.startsWith(monthPrefix()));

  function summarize(list) {
    const map = {};
    list.forEach((b) => {
      const id = b.staff.id;
      if (!map[id]) {
        map[id] = { id, name: b.staff.name, color: b.staff.color, rate: b.staff.commission_rate ?? 0, count: 0, revenue: 0 };
      }
      map[id].count += 1;
      map[id].revenue += centsToRand(b.services?.price_cents || 0);
    });
    return Object.values(map)
      .map((s) => ({ ...s, commission: Math.round(s.revenue * (s.rate / 100)) }))
      .sort((a, b) => b.commission - a.commission);
  }

  const monthSummary = summarize(thisMonth);
  const allTimeSummary = summarize(rows);

  return (
    <div>
      <div className="font-mono text-xs uppercase tracking-wider text-brass font-semibold mb-1">Commissions</div>
      <h1 className="font-display text-3xl font-semibold mb-6">What your team has earned</h1>

      <Section title="This month" data={monthSummary} />
      <Section title="All time" data={allTimeSummary} />

      <p className="text-xs text-ink60 mt-4">
        Commission rates are set per staff member on the Staff page. This reflects confirmed bookings — cancelled appointments are excluded.
      </p>
    </div>
  );
}

function Section({ title, data }) {
  const total = data.reduce((sum, d) => sum + d.commission, 0);
  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-3">
        <div className="font-display font-semibold text-lg">{title}</div>
        <div className="font-mono text-sm text-brass font-semibold">{rand(total)} total</div>
      </div>
      {data.length === 0 && <p className="text-ink60 text-sm">No confirmed bookings in this period yet.</p>}
      {data.map((s) => (
        <div key={s.id} className="flex items-center justify-between bg-white border border-line rounded-xl px-4 py-3.5 mb-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-display font-semibold text-sm" style={{ background: s.color }}>
              {s.name.split(' ').map((w) => w[0]).join('')}
            </div>
            <div>
              <div className="font-display font-semibold text-sm">{s.name}</div>
              <div className="text-xs text-ink60">{s.count} booking{s.count !== 1 ? 's' : ''} · {rand(s.revenue)} revenue · {s.rate}% rate</div>
            </div>
          </div>
          <div className="font-mono font-semibold text-green-dark">{rand(s.commission)}</div>
        </div>
      ))}
    </div>
  );
}
