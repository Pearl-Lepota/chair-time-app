// Ported directly from the salon-booking.html prototype so the business
// rules stay identical between the demo and the real app.

export const CATEGORY_LIST = [
  'Nails', 'Hair', 'Braids', 'Lashes', 'Brows & Skin', 'Makeup', 'Bridal',
];

export const CATEGORY_COLORS = {
  'Nails': '#B4485F', 'Hair': '#B8863B', 'Braids': '#2F4A3C', 'Lashes': '#6B7A8F',
  'Brows & Skin': '#3E7C8C', 'Makeup': '#7A5C99', 'Bridal': '#A6763D',
};

export const CATEGORY_META = {
  'Nails': '💅', 'Hair': '✂️', 'Braids': '🪢', 'Lashes': '👁️',
  'Brows & Skin': '🖌️', 'Makeup': '💄', 'Bridal': '👰',
};

// Prices are stored in cents in the database — these helpers work in Rand.
export function rand(n) {
  return 'R' + Math.round(n).toLocaleString('en-ZA');
}

export function centsToRand(cents) {
  return Math.round(cents / 100);
}

// Deposit rule from the prototype: 30% of the service price, rounded to
// the nearest R10.
export function depositFor(priceRand) {
  return Math.round((priceRand * 0.3) / 10) * 10;
}

export function timeStrToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTimeStr(mins) {
  const h = Math.floor(mins / 60).toString().padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

export function minutesToLabel(mins) {
  let h = Math.floor(mins / 60), m = mins % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  let h12 = h % 12; if (h12 === 0) h12 = 12;
  return {
    full: `${h12}:${m.toString().padStart(2, '0')} ${ampm}`,
    hm: `${h12}:${m.toString().padStart(2, '0')}`,
    ampm,
  };
}

// Default salon hours until per-staff working hours (staff_hours table) are
// wired into the UI — Phase 1 assumes every staff member works 09:00–18:00,
// closed Sundays. Swap this out once staff_hours has an editor.
const OPEN_MIN = 9 * 60;
const CLOSE_MIN = 18 * 60;
const STEP = 30;

export function isClosed(dateIso) {
  const d = new Date(dateIso + 'T00:00:00');
  return d.getDay() === 0;
}

// takenSlots: array of { start_minutes, duration_minutes } for a given
// staff member and date, as returned by the get_taken_slots() RPC.
export function generateAvailableSlots(dateIso, durationMinutes, takenSlots, todayIso, nowMinutes) {
  if (isClosed(dateIso)) return [];
  const slots = [];
  const isToday = dateIso === todayIso;
  for (let t = OPEN_MIN; t + durationMinutes <= CLOSE_MIN; t += STEP) {
    if (isToday && t <= nowMinutes) continue;
    const overlaps = takenSlots.some(
      (b) => t < b.start_minutes + b.duration_minutes && t + durationMinutes > b.start_minutes
    );
    if (!overlaps) slots.push(t);
  }
  return slots;
}

export function genConfirmationCode() {
  return 'CT-' + Math.floor(1000 + Math.random() * 9000);
}
