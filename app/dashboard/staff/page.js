import { requireSalon } from '@/lib/get-salon';
import { CATEGORY_LIST, CATEGORY_COLORS } from '@/lib/booking-logic';
import { addStaff, removeStaff } from './actions';

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

      <form action={addStaff} className="bg-paper2 border border-dashed border-ink40 rounded-xl p-5 mb-8">
        <div className="font-mono text-xs uppercase tracking-wider text-ink60 font-semibold mb-3">Add a team member</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <div>
            <label className="field-label">Name</label>
            <input name="name" required className="field-input" placeholder="Devon Marsh" />
          </div>
          <div>
            <label className="field-label">Specialty</label>
            <input name="specialty" className="field-input" placeholder="Extensions" />
          </div>
          <div>
            <label className="field-label">Tag color</label>
            <input name="color" type="color" defaultValue="#2F4A3C" className="field-input h-[42px]" />
          </div>
        </div>
        <label className="field-label">Books for which categories?</label>
        <div className="flex flex-wrap gap-2 mb-4">
          {CATEGORY_LIST.map((cat) => (
            <label key={cat} className="flex items-center gap-1.5 text-xs font-semibold bg-white border border-line rounded-full px-3 py-1.5 cursor-pointer"
              style={{ borderColor: CATEGORY_COLORS[cat] }}>
              <input type="checkbox" name="skills" value={cat} className="accent-current" />
              {cat}
            </label>
          ))}
        </div>
        <button className="btn-primary">+ Add team member</button>
      </form>

      {(!staff || staff.length === 0) && <p className="text-ink60 text-sm">No team members yet.</p>}

      {(staff || []).map((person) => (
        <div key={person.id} className="flex items-center justify-between bg-white border border-line rounded-xl px-4 py-3.5 mb-2">
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
          <form action={removeStaff}>
            <input type="hidden" name="id" value={person.id} />
            <button className="text-rose text-xs font-semibold border border-rose-soft rounded-lg px-3 py-1.5 hover:bg-rose-soft">Remove</button>
          </form>
        </div>
      ))}
    </div>
  );
}
