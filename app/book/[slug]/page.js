'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  CATEGORY_LIST, CATEGORY_COLORS, CATEGORY_META, rand, centsToRand,
  depositFor, timeStrToMinutes, minutesToTimeStr, minutesToLabel,
  generateAvailableSlots, genConfirmationCode, isClosed,
} from '@/lib/booking-logic';

function isoToday() { return new Date().toISOString().slice(0, 10); }

export default function BookingPage() {
  const { slug } = useParams();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [salon, setSalon] = useState(null);
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);

  const [step, setStep] = useState(1);
  const [category, setCategory] = useState(null);
  const [serviceId, setServiceId] = useState(null);
  const [staffId, setStaffId] = useState(null);
  const [date, setDate] = useState(null);
  const [time, setTime] = useState(null);
  const [slots, setSlots] = useState([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [confirmed, setConfirmed] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showLanding, setShowLanding] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: salonRow } = await supabase.from('salons').select('*').eq('slug', slug).maybeSingle();
      if (!salonRow) { setNotFound(true); setLoading(false); return; }
      setSalon(salonRow);
      const [{ data: svc }, { data: stf }] = await Promise.all([
        supabase.from('services').select('*').eq('salon_id', salonRow.id).eq('active', true),
        supabase.from('staff').select('*').eq('salon_id', salonRow.id),
      ]);
      setServices(svc || []);
      setStaff(stf || []);
      setLoading(false);
    }
    if (slug) load();
  }, [slug]);

  const service = services.find((s) => s.id === serviceId);
  const eligibleStaff = service ? staff.filter((p) => (p.skills || []).includes(service.category)) : [];
  const staffPool = eligibleStaff.length ? eligibleStaff : staff;

  const loadSlots = useCallback(async (d, staffChoice) => {
    if (!service || !d) { setSlots([]); return; }
    if (isClosed(d)) { setSlots([]); return; }
    const pool = staffChoice === 'any' ? staffPool : staffPool.filter((p) => p.id === staffChoice);
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    const results = await Promise.all(
      pool.map((p) => supabase.rpc('get_taken_slots', { p_staff_id: p.id, p_date: d }))
    );
    const combinedTaken = pool.map((p, i) => ({
      staffId: p.id,
      taken: results[i].data || [],
    }));

    const set = new Set();
    combinedTaken.forEach(({ taken }) => {
      generateAvailableSlots(d, service.duration_minutes, taken, isoToday(), nowMinutes).forEach((m) => set.add(m));
    });
    setSlots(Array.from(set).sort((a, b) => a - b));
  }, [service, staffPool]);

  useEffect(() => {
    if (step === 3 && date) loadSlots(date, staffId);
  }, [step, date, staffId, loadSlots]);

  async function handleConfirm() {
    setSubmitting(true);
    let finalStaffId = staffId;

    if (staffId === 'any') {
      // Ask each eligible staff member's taken slots again to pick a free one for this exact time.
      for (const p of staffPool) {
        const { data: taken } = await supabase.rpc('get_taken_slots', { p_staff_id: p.id, p_date: date });
        const startMin = timeStrToMinutes(time);
        const overlaps = (taken || []).some(
          (b) => startMin < b.start_minutes + b.duration_minutes && startMin + service.duration_minutes > b.start_minutes
        );
        if (!overlaps) { finalStaffId = p.id; break; }
      }
      if (finalStaffId === 'any') finalStaffId = staffPool[0]?.id;
    }

    const priceRand = centsToRand(service.price_cents);
    const isCash = paymentMethod === 'cash';
    const deposit = isCash ? 0 : depositFor(priceRand);
    const code = genConfirmationCode();

    const booking = {
      salon_id: salon.id,
      service_id: service.id,
      staff_id: finalStaffId,
      date,
      time,
      duration_minutes: service.duration_minutes,
      customer_name: name,
      customer_phone: phone,
      payment_method: paymentMethod,
      deposit_amount_cents: deposit * 100,
      deposit_paid: !isCash,
      balance_due_cents: (isCash ? priceRand : priceRand - deposit) * 100,
      confirmation_code: code,
    };

    const { error } = await supabase.from('bookings').insert(booking);
    setSubmitting(false);
    if (error) { alert('Something went wrong booking that slot — it may have just been taken. Please try another time.'); return; }

    const finalStaffName = staff.find((p) => p.id === finalStaffId)?.name;

    // Best-effort email — never blocks the booking itself if it fails.
    if (phone.includes('@')) {
      fetch('/api/send-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: phone,
          customerName: name,
          salonName: salon.name,
          serviceName: service.name,
          date,
          time: minutesToLabel(timeStrToMinutes(time)).full,
          staffName: finalStaffName,
          confirmationCode: code,
          depositAmount: rand(deposit),
          balanceDue: rand(isCash ? priceRand : priceRand - deposit),
          depositPaid: !isCash,
        }),
      }).catch(() => {});
    }

    setConfirmed({ ...booking, staffName: finalStaffName, serviceName: service.name, priceRand });
  }

  if (loading) return <Center>Loading…</Center>;
  if (notFound) return <Center>We couldn't find that salon.</Center>;

  return (
    <main className="min-h-screen px-5 pb-16">
      <div className={showLanding && !confirmed ? "max-w-4xl mx-auto pt-8" : "max-w-2xl mx-auto pt-8"}>
        <div className="font-display italic text-xl text-ink mb-1">{salon.name}</div>
        {confirmed ? (
          <Confirmation booking={confirmed} onBookAnother={() => {
            setConfirmed(null); setStep(1); setCategory(null); setServiceId(null);
            setStaffId(null); setDate(null); setTime(null); setName(''); setPhone('');
            setShowLanding(true);
          }} />
        ) : showLanding ? (
          <Landing salon={salon} services={services} onBook={() => setShowLanding(false)} />
        ) : (
          <>
            <button onClick={() => setShowLanding(true)} className="btn-ghost text-xs px-3 py-1.5 mb-5">← Back to {salon.name}</button>
            <h1 className="font-display text-3xl font-semibold mb-1">Reserve your spot</h1>
            <p className="text-ink60 text-sm mb-6">A few quick steps and you're on the books.</p>
            <StepDots step={step} />
            {step === 1 && !category && (
              <CategoryGrid services={services} onPick={(c) => setCategory(c)} />
            )}
            {step === 1 && category && (
              <ServiceGrid
                category={category} services={services} serviceId={serviceId}
                onBack={() => setCategory(null)}
                onPick={(id) => setServiceId(id)}
                onNext={() => setStep(2)}
              />
            )}
            {step === 2 && (
              <StaffStep
                service={service} staffPool={staffPool} staffId={staffId}
                onPick={setStaffId}
                onBack={() => setStep(1)}
                onNext={() => setStep(3)}
              />
            )}
            {step === 3 && (
              <DateTimeStep
                date={date} time={time} slots={slots}
                onDate={(d) => { setDate(d); setTime(null); }}
                onTime={setTime}
                onBack={() => setStep(2)}
                onNext={() => setStep(4)}
              />
            )}
            {step === 4 && (
              <DetailsStep
                name={name} phone={phone}
                onName={setName} onPhone={setPhone}
                onBack={() => setStep(3)}
                onNext={() => setStep(5)}
              />
            )}
            {step === 5 && service && (
              <PaymentStep
                service={service} paymentMethod={paymentMethod} onMethod={setPaymentMethod}
                submitting={submitting}
                onBack={() => setStep(4)}
                onConfirm={handleConfirm}
              />
            )}
          </>
        )}
      </div>
    </main>
  );
}

function Center({ children }) {
  return <div className="min-h-screen flex items-center justify-center text-ink60">{children}</div>;
}

function Landing({ salon, services, onBook }) {
  const byCategory = CATEGORY_LIST
    .map((cat) => ({ cat, items: services.filter((s) => s.category === cat) }))
    .filter((g) => g.items.length > 0);

  return (
    <div>
      {/* Hero */}
      <div className="grid md:grid-cols-2 gap-10 items-center py-10">
        <div>
          <div className="font-mono text-xs uppercase tracking-wider text-brass font-semibold mb-3">Welcome</div>
          <h1 className="font-display text-4xl font-semibold mb-4">Your chair, always on schedule.</h1>
          <p className="text-ink60 text-base mb-8 max-w-md">
            Book your next appointment at {salon.name} in a couple of taps — pick a service, a stylist, a time, and you're on the books.
          </p>
          <button onClick={onBook} className="btn-primary">Book an appointment</button>
        </div>
        <div className="aspect-[4/5] rounded-3xl bg-rose-soft flex items-center justify-center border border-line">
          <span className="font-mono text-xs uppercase text-ink60 px-6 text-center">Your salon's hero photo goes here</span>
        </div>
      </div>

      {/* Services gallery */}
      <div className="py-10">
        <div className="font-mono text-xs uppercase tracking-wider text-brass font-semibold mb-1">What we offer</div>
        <h2 className="font-display text-2xl font-semibold mb-6">Every chair, every service.</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {byCategory.map(({ cat, items }) => (
            <button key={cat} onClick={onBook} className="text-left">
              <div className="h-36 rounded-2xl bg-brass-soft flex items-center justify-center border border-line mb-3">
                <span className="text-2xl">{CATEGORY_META[cat]}</span>
              </div>
              <div className="font-display font-semibold text-sm">{cat}</div>
              <div className="font-mono text-[11px] text-ink60">{items.length} option{items.length !== 1 ? 's' : ''}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Testimonials */}
      <div className="py-10 bg-paper2 rounded-3xl border border-line px-8">
        <div className="font-mono text-xs uppercase tracking-wider text-brass font-semibold mb-1">From clients</div>
        <h2 className="font-display text-2xl font-semibold mb-6">Booked, seen, done well.</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Testimonial quote="Booked my appointment on my phone in under two minutes. Got a reminder the morning of." who="A recent client" />
          <Testimonial quote="Loved that I could see exactly which stylist was free before picking a time." who="A recent client" />
        </div>
      </div>

      {/* Location */}
      <div className="py-10">
        <div className="font-mono text-xs uppercase tracking-wider text-brass font-semibold mb-1">Find us</div>
        <h2 className="font-display text-2xl font-semibold mb-6">{salon.name}</h2>
        <div className="grid md:grid-cols-2 rounded-3xl overflow-hidden border border-line">
          <div className="h-56 md:h-auto bg-rose-soft flex items-center justify-center">
            <span className="font-mono text-xs uppercase text-ink60 px-6 text-center">Map / storefront photo</span>
          </div>
          <div className="bg-white p-8">
            <p className="text-sm text-ink60 mb-3"><strong className="text-ink block">Address</strong> Add your salon's address in Settings</p>
            <p className="text-sm text-ink60"><strong className="text-ink block">Hours</strong> Mon–Sat 9am–6pm, closed Sundays</p>
          </div>
        </div>
      </div>

      <div className="text-center pb-2">
        <button onClick={onBook} className="btn-primary">Book an appointment</button>
      </div>
    </div>
  );
}

function Testimonial({ quote, who }) {
  return (
    <div className="border border-line rounded-2xl p-5 bg-white">
      <div className="text-brass text-sm mb-2">★★★★★</div>
      <p className="text-sm text-ink mb-3">"{quote}"</p>
      <div className="font-display font-semibold text-sm">{who}</div>
    </div>
  );
}

function StepDots({ step }) {
  const names = ['Service', 'Stylist', 'Date & time', 'Your details', 'Deposit'];
  return (
    <div className="flex items-center gap-2 mb-8">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className={`h-2 rounded-full transition-all ${i < step ? 'w-2 bg-brass' : i === step ? 'w-6 bg-green' : 'w-2 bg-line'}`} />
      ))}
      <span className="font-mono text-xs text-ink60 ml-1">Step {step} of 5 — {names[step - 1]}</span>
    </div>
  );
}

function CategoryGrid({ services, onPick }) {
  return (
    <div className="grid grid-cols-2 gap-3.5">
      {CATEGORY_LIST.map((cat) => {
        const items = services.filter((s) => s.category === cat);
        if (items.length === 0) return null;
        const minPrice = Math.min(...items.map((s) => centsToRand(s.price_cents)));
        return (
          <button key={cat} onClick={() => onPick(cat)}
            className="text-left bg-white border border-line rounded-2xl p-5 hover:-translate-y-0.5 transition"
            style={{ borderTopWidth: 3, borderTopColor: CATEGORY_COLORS[cat] }}>
            <div className="text-2xl mb-2">{CATEGORY_META[cat]}</div>
            <div className="font-display font-semibold text-lg">{cat}</div>
            <div className="font-mono text-xs text-ink60">{items.length} options · from {rand(minPrice)}</div>
          </button>
        );
      })}
    </div>
  );
}

function ServiceGrid({ category, services, serviceId, onBack, onPick, onNext }) {
  const items = services.filter((s) => s.category === category);
  return (
    <div>
      <button onClick={onBack} className="btn-ghost text-xs px-3 py-1.5 mb-4">← All categories</button>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">{CATEGORY_META[category]}</span>
        <span className="font-display font-semibold text-lg" style={{ color: CATEGORY_COLORS[category] }}>{category}</span>
      </div>
      <div className="grid grid-cols-2 gap-3.5 mb-8">
        {items.map((svc) => (
          <button key={svc.id} onClick={() => onPick(svc.id)}
            className={`text-left border rounded-2xl p-4.5 p-4 ${serviceId === svc.id ? 'border-green bg-green-soft' : 'border-line bg-white'}`}>
            <div className="font-display font-semibold text-base">{svc.name}</div>
            <div className="text-xs text-ink60">{svc.duration_minutes} min</div>
            <div className="font-mono text-sm text-brass font-semibold mt-2">{rand(centsToRand(svc.price_cents))}</div>
          </button>
        ))}
      </div>
      <button disabled={!serviceId} onClick={onNext} className="btn-primary">Continue →</button>
    </div>
  );
}

function StaffStep({ service, staffPool, staffId, onPick, onBack, onNext }) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-3.5 mb-8">
        {staffPool.map((p) => (
          <button key={p.id} onClick={() => onPick(p.id)}
            className={`text-left border rounded-2xl p-4 ${staffId === p.id ? 'border-green bg-green-soft' : 'border-line bg-white'}`}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-display font-semibold text-sm mb-2"
              style={{ background: p.color }}>{p.name.split(' ').map((w) => w[0]).join('')}</div>
            <div className="font-display font-semibold text-base">{p.name}</div>
            <div className="text-xs text-ink60">{p.specialty}</div>
          </button>
        ))}
        <button onClick={() => onPick('any')}
          className={`text-left border rounded-2xl p-4 ${staffId === 'any' ? 'border-green bg-green-soft' : 'border-line bg-white'}`}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-display font-semibold text-sm mb-2 bg-ink40">★</div>
          <div className="font-display font-semibold text-base">Any available</div>
          <div className="text-xs text-ink60">First {service?.category?.toLowerCase()} specialist who's free</div>
        </button>
      </div>
      <div className="flex justify-between">
        <button onClick={onBack} className="btn-ghost">Back</button>
        <button disabled={!staffId} onClick={onNext} className="btn-primary">Continue →</button>
      </div>
    </div>
  );
}

function DateTimeStep({ date, time, slots, onDate, onTime, onBack, onNext }) {
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
  return (
    <div>
      <div className="flex gap-2.5 overflow-x-auto pb-4 mb-2">
        {days.map((d) => {
          const dObj = new Date(d + 'T00:00:00');
          const closed = dObj.getDay() === 0;
          return (
            <button key={d} disabled={closed} onClick={() => onDate(d)}
              className={`flex-shrink-0 w-16 py-3 rounded-xl border text-center ${closed ? 'opacity-30' : ''} ${date === d ? 'bg-green border-green text-white' : 'bg-white border-line'}`}>
              <div className="text-[11px] uppercase">{dObj.toLocaleDateString('en-US', { weekday: 'short' })}</div>
              <div className="font-display font-semibold text-lg">{dObj.getDate()}</div>
            </button>
          );
        })}
      </div>
      {!date && <p className="italic text-sm text-ink60 py-5">Pick a date above to see open times.</p>}
      {date && slots.length === 0 && <p className="italic text-sm text-ink60 py-5">No open times that day — try another date.</p>}
      {date && slots.length > 0 && (
        <div className="grid grid-cols-3 md:grid-cols-4 gap-2.5 mb-6">
          {slots.map((m) => {
            const t = minutesToTimeStr(m);
            const lbl = minutesToLabel(m);
            return (
              <button key={m} onClick={() => onTime(t)}
                className={`font-mono text-sm text-center py-2.5 rounded-lg border ${time === t ? 'bg-green border-green text-white font-semibold' : 'bg-white border-line'}`}>
                {lbl.full}
              </button>
            );
          })}
        </div>
      )}
      <div className="flex justify-between mt-6">
        <button onClick={onBack} className="btn-ghost">Back</button>
        <button disabled={!date || !time} onClick={onNext} className="btn-primary">Continue →</button>
      </div>
    </div>
  );
}

function DetailsStep({ name, phone, onName, onPhone, onBack, onNext }) {
  return (
    <div>
      <div className="max-w-sm mb-8">
        <label className="field-label">Your name</label>
        <input className="field-input mb-4" value={name} onChange={(e) => onName(e.target.value)} placeholder="Jordan Ellis" />
        <label className="field-label">Phone or email</label>
        <input className="field-input" value={phone} onChange={(e) => onPhone(e.target.value)} placeholder="082 555 0110" />
      </div>
      <div className="flex justify-between">
        <button onClick={onBack} className="btn-ghost">Back</button>
        <button disabled={!name || !phone} onClick={onNext} className="btn-primary">Continue to deposit →</button>
      </div>
    </div>
  );
}

function PaymentStep({ service, paymentMethod, onMethod, submitting, onBack, onConfirm }) {
  const priceRand = centsToRand(service.price_cents);
  const deposit = depositFor(priceRand);
  const balance = priceRand - deposit;
  const methods = [
    { id: 'card', label: 'Card', sub: 'Visa, Mastercard' },
    { id: 'eft', label: 'Instant EFT', sub: 'Pay from your bank app' },
    { id: 'cash', label: 'Pay at salon', sub: 'Cash or card on the day' },
  ];
  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-5">
        {methods.map((m) => (
          <button key={m.id} onClick={() => onMethod(m.id)}
            className={`text-left border rounded-2xl p-3.5 ${paymentMethod === m.id ? 'border-green bg-green-soft' : 'border-line bg-white'}`}>
            <div className="font-display font-semibold text-sm">{m.label}</div>
            <div className="text-xs text-ink60">{m.sub}</div>
          </button>
        ))}
      </div>
      <div className="bg-white border border-line rounded-2xl p-5 mb-2">
        {paymentMethod === 'cash' ? (
          <>
            <div className="flex justify-between items-center">
              <span className="text-sm text-ink60">Due at appointment</span>
              <span className="font-display text-xl font-semibold">{rand(priceRand)}</span>
            </div>
            <div className="text-xs text-ink60 mt-1.5">No deposit needed — pay when you arrive.</div>
          </>
        ) : (
          <>
            <div className="flex justify-between items-center">
              <span className="text-sm text-ink60">Deposit due now</span>
              <span className="font-display text-xl font-semibold text-brass">{rand(deposit)}</span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-ink60">Balance due at appointment</span>
              <span className="font-mono text-xs text-ink60">{rand(balance)}</span>
            </div>
          </>
        )}
      </div>
      <p className="font-mono text-[11px] text-ink40 mb-6">🔒 Secure checkout — demo mode, no card is actually charged</p>
      <div className="flex justify-between">
        <button onClick={onBack} className="btn-ghost">Back</button>
        <button disabled={submitting} onClick={onConfirm} className="btn-primary">
          {submitting ? 'Booking…' : paymentMethod === 'cash' ? 'Confirm booking →' : `Pay ${rand(deposit)} & confirm →`}
        </button>
      </div>
    </div>
  );
}

function Confirmation({ booking, onBookAnother }) {
  const lbl = minutesToLabel(timeStrToMinutes(booking.time));
  return (
    <div className="max-w-md mt-4">
      <div className="font-mono text-xs uppercase tracking-wider text-brass font-semibold mb-1">Booked</div>
      <h1 className="font-display text-2xl font-semibold mb-2">You're all set, {booking.customer_name.split(' ')[0]}</h1>
      <p className="text-sm text-ink60 mb-5">Save this ticket. We'll see you soon.</p>
      <div className="bg-white border border-line rounded-2xl p-5 mb-3">
        <div className="font-display font-semibold text-base">{booking.serviceName}</div>
        <div className="text-xs text-ink60 mt-1">{booking.date} · {lbl.full}</div>
        <div className="text-xs text-ink60 mt-1">{booking.staffName}</div>
        <div className="font-mono text-[11px] text-ink40 mt-2">{booking.confirmation_code}</div>
      </div>
      <div className="bg-white border border-line rounded-2xl p-5 mb-6">
        {booking.deposit_paid ? (
          <>
            <div className="flex justify-between"><span className="text-sm text-ink60">Deposit paid</span><span className="font-mono font-semibold text-green">{rand(booking.deposit_amount_cents / 100)} ✓</span></div>
            <div className="flex justify-between mt-2"><span className="text-xs text-ink60">Balance due at appointment</span><span className="font-mono text-xs text-ink60">{rand(booking.balance_due_cents / 100)}</span></div>
          </>
        ) : (
          <div className="flex justify-between"><span className="text-sm text-ink60">Due at appointment</span><span className="font-mono font-semibold">{rand(booking.balance_due_cents / 100)}</span></div>
        )}
      </div>
      <button onClick={onBookAnother} className="btn-primary">Book another appointment</button>
    </div>
  );
}
