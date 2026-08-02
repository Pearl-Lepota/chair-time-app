import { requireSalon } from '@/lib/get-salon';
import { CATEGORY_LIST, CATEGORY_COLORS, rand, centsToRand } from '@/lib/booking-logic';
import { addService, removeService } from './actions';

export default async function ServicesPage() {
  const { supabase, salon } = await requireSalon();
  const { data: services } = await supabase
    .from('services')
    .select('*')
    .eq('salon_id', salon.id)
    .order('category');

  const byCategory = CATEGORY_LIST.map((cat) => ({
    cat,
    items: (services || []).filter((s) => s.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <div>
      <div className="font-mono text-xs uppercase tracking-wider text-brass font-semibold mb-1">Services</div>
      <h1 className="font-display text-3xl font-semibold mb-6">What you offer</h1>

      <form action={addService} className="bg-paper2 border border-dashed border-ink40 rounded-xl p-5 mb-8">
        <div className="font-mono text-xs uppercase tracking-wider text-ink60 font-semibold mb-3">Add a service</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <div>
            <label className="field-label">Name</label>
            <input name="name" required className="field-input" placeholder="Deep Conditioning" />
          </div>
          <div>
            <label className="field-label">Category</label>
            <select name="category" required className="field-input">
              {CATEGORY_LIST.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">Duration (min)</label>
            <input name="duration" type="number" min="5" step="5" required className="field-input" placeholder="30" />
          </div>
          <div>
            <label className="field-label">Price (R)</label>
            <input name="price" type="number" min="0" step="10" required className="field-input" placeholder="250" />
          </div>
        </div>
        <button className="btn-primary">+ Add service</button>
      </form>

      {byCategory.length === 0 && (
        <p className="text-ink60 text-sm">No services yet — add your first one above.</p>
      )}

      {byCategory.map(({ cat, items }) => (
        <div key={cat} className="mb-7">
          <div className="font-display font-semibold text-base mb-2" style={{ color: CATEGORY_COLORS[cat] }}>{cat}</div>
          {items.map((svc) => (
            <div key={svc.id} className="flex items-center justify-between bg-white border border-line rounded-xl px-4 py-3.5 mb-2">
              <div>
                <div className="font-display font-semibold text-sm">{svc.name}</div>
                <div className="text-xs text-ink60">{svc.duration_minutes} min · {rand(centsToRand(svc.price_cents))}</div>
              </div>
              <form action={removeService}>
                <input type="hidden" name="id" value={svc.id} />
                <button className="text-rose text-xs font-semibold border border-rose-soft rounded-lg px-3 py-1.5 hover:bg-rose-soft">Remove</button>
              </form>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
