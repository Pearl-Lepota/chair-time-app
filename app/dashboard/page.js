import { requireSalon } from '@/lib/get-salon';
import { CATEGORY_COLORS } from '@/lib/booking-logic';
import { addStaff, removeStaff, updateCommission } from './actions';
import StaffForm from './StaffForm';

export default async function StaffPage() {
  const { supabase, salon } = await requireSalon();
  const { data: staff } = await supabase
    .from('staff')
    .select('*')
    .eq('salon_id', salon.id)
    .order('created_at');

  return (
    <div>
      <div className="font-mono text-xs uppercase tracking-wider text-brass font-semibold mb-1">Staff</div>
      <h1 className="font-display text-3xl font-semibold mb-6">Your team</h1>

      <StaffForm addStaff={addStaff} />

      {(!staff || staff.length === 0) && (
        <p className="text-rose text-sm font-semibold bg-rose-soft border border-rose rounded-xl px-4 py-3 mb-2">
          No team members yet — clients won't be able to book anything until at least one is added above.
        </p>
      )}

      {(staff || []).map((person) => (
        <div key={person.id} className="flex items-center justify-between bg-white border border-line rounded-xl px-4 py-3.5 mb-2 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-display font-semibold text-sm"
              style={{ background: person.color }}>
              {person.name.split(' ').map((w) => w[0]).join('')}
            </div>
            <div>
              <div className="font-display font-semibold text-sm">{person.name}</div>
              <div className="text-xs text-ink60">{person.specialty}</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {(person.skills || []).map((s) => (
                  <span key={s} className="font-mono text-[10px] rounded-full border px-2 py-0.5"
                    style={{ color: CATEGORY_COLORS[s], borderColor: CATEGORY_COLORS[s] }}>{s}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <form action={updateCommission} className="flex items-center gap-1.5">
              <input type="hidden" name="id" value={person.id} />
              <label className="text-xs text-ink60 font-mono">Commission</label>
              <input name="commission_rate" type="number" min="0" max="100" step="1" defaultValue={person.commission_rate ?? 40}
                className="w-16 text-sm font-mono border border-line rounded-lg px-2 py-1.5" />
              <span className="text-xs text-ink60">%</span>
              <button className="text-xs font-semibold text-green-dark underline">Save</button>
            </form>
            <form action={removeStaff}>
              <input type="hidden" name="id" value={person.id} />
              <button className="text-rose text-xs font-semibold border border-rose-soft rounded-lg px-3 py-1.5 hover:bg-rose-soft">Remove</button>
            </form>
          </div>
        </div>
      ))}
    </div>
  );
}
