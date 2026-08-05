import { requireSalon } from '@/lib/get-salon';
import { CATEGORY_LIST, CATEGORY_COLORS, rand, centsToRand } from '@/lib/booking-logic';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default async function AnalyticsPage() {
  const { supabase, salon } = await requireSalon();
  const { data: bookings } = await supabase
    .from('bookings')
    .select('date, status, services(name, category, price_cents)')
    .eq('salon_id', salon.id);

  const all = bookings || [];
  const confirmed = all.filter((b) => b.status === 'confirmed');
  const cancelled = all.filter((b) => b.status === 'cancelled');

  const totalRevenue = confirmed.reduce((s, b) => s + centsToRand(b.services?.price_cents || 0), 0);
  const avgValue = confirmed.length ? Math.round(totalRevenue / confirmed.length) : 0;
  const cancellationRate = all.length ? Math.round((cancelled.length / all.length) * 100) : 0;

  const catMap = {};
  confirmed.forEach((b) => {
    const cat = b.services?.category || 'Other';
    catMap[cat] = (catMap[cat] || 0) + centsToRand(b.services?.price_cents || 0);
  });
  const byCategory = CATEGORY_LIST
    .map((c) => ({ cat: c, total: catMap[c] || 0 }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);
  const maxCategory = Math.max(...byCategory.map((c) => c.total), 1);

  const dowCounts = [0, 0, 0, 0, 0, 0, 0];
  confirmed.forEach((b) => {
    const d = new Date(b.date + 'T00:00:00');
    dowCounts[d.getDay()] += 1;
  });
  const maxDow = Math.max(...dowCounts, 1);

  const svcMap = {};
  confirmed.forEach((b) => {
    const name = b.services?.name || 'Removed service';
    if (!svcMap[name]) svcMap[name] = { count: 0, revenue: 0 };
    svcMap[name].count += 1;
    svcMap[name].revenue += centsToRand(b.services?.price_cents || 0);
  });
  const topServices = Object.entries(svcMap)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
  const maxServiceRevenue = Math.max(...topServices.map((s) => s.revenue), 1);

  return (
    <div>
      <div className="font-mono text-xs uppercase tracking-wider text-brass font-semibold mb-1">Analytics</div>
      <h1 className="font-display text-3xl font-semibold mb-6">How the business is doing</h1>

      <div className="flex gap-3 mb-8 flex-wrap">
        <Stat num={confirmed.length} label="Total bookings" />
        <Stat num={rand(totalRevenue)} label="Total revenue" />
        <Stat num={rand(avgValue)} label="Avg. booking value" />
        <Stat num={`${cancellationRate}%`} label="Cancellation rate" />
      </div>

      <Section title="Revenue by category">
        {byCategory.length === 0 && <Empty />}
        {byCategory.map((c) => (
          <Bar key={c.cat} label={c.cat} amount={rand(c.total)} pct={(c.total / maxCategory) * 100} color={CATEGORY_COLORS[c.cat]} />
        ))}
      </Section>

      <Section title="Busiest day of the week">
        {DAY_NAMES.map((name, i) => (
          <Bar key={name} label={name} amount={`${dowCounts[i]} booking${dowCounts[i] !== 1 ? 's' : ''}`} pct={(dowCounts[i] / maxDow) * 100} color="#2F4A3C" />
        ))}
      </Section>

      <Section title="Top 5 services by revenue">
        {topServices.length === 0 && <Empty />}
        {topServices.map((s) => (
          <Bar key={s.name} label={`${s.name} (${s.count})`} amount={rand(s.revenue)} pct={(s.revenue / maxServiceRevenue) * 100} color="#B8863B" />
        ))}
      </Section>

      <p className="text-xs text-ink60 mt-4">
        Figures cover all-time confirmed bookings. Cancelled bookings count toward the cancellation rate but are excluded from revenue.
      </p>
    </div>
  );
}

function Stat({ num, label }) {
  return (
    <div className="bg-white border border-line rounded-xl px-5 py-3.5">
      <div className="font-display text-2xl font-semibold text-green-dark">{num}</div>
      <div className="font-mono text-[11px] uppercase text-ink60">{label}</div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-9">
      <div className="font-display font-semibold text-base mb-3">{title}</div>
      {children}
    </div>
  );
}

function Bar({ label, amount, pct, color }) {
  return (
    <div className="mb-3">
      <div className="flex justify-between text-sm mb-1.5">
        <span className="font-semibold">{label}</span>
        <span className="font-mono text-brass font-semibold">{amount}</span>
      </div>
      <div className="h-2 bg-paper2 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function Empty() {
  return <p className="text-ink60 text-sm">Not enough data yet.</p>;
}
