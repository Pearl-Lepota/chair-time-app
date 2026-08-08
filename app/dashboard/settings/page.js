import { requireSalon } from '@/lib/get-salon';
import { updateSalonInfo } from './actions';
import PhotoUpload from './PhotoUpload';

export default async function SettingsPage() {
  const { salon } = await requireSalon();

  return (
    <div>
      <div className="font-mono text-xs uppercase tracking-wider text-brass font-semibold mb-1">Settings</div>
      <h1 className="font-display text-3xl font-semibold mb-6">Your salon's public page</h1>

      <div className="grid md:grid-cols-2 gap-6 mb-10">
        <PhotoUpload salonId={salon.id} field="hero_photo_url" label="Hero photo" currentUrl={salon.hero_photo_url} />
        <PhotoUpload salonId={salon.id} field="location_photo_url" label="Location / storefront photo" currentUrl={salon.location_photo_url} />
      </div>

      <form action={updateSalonInfo} className="bg-white border border-line rounded-2xl p-6 max-w-lg">
        <div className="font-mono text-xs uppercase tracking-wider text-ink60 font-semibold mb-4">Contact &amp; hours</div>
        <div className="mb-4">
          <label className="field-label">Address</label>
          <input name="address" defaultValue={salon.address || ''} className="field-input" placeholder="12 Church Street, Pretoria" />
        </div>
        <div className="mb-4">
          <label className="field-label">Phone</label>
          <input name="phone" defaultValue={salon.phone || ''} className="field-input" placeholder="082 555 0100" />
        </div>
        <div className="mb-5">
          <label className="field-label">Hours</label>
          <input name="hours_text" defaultValue={salon.hours_text || ''} className="field-input" placeholder="Mon–Sat 9am–6pm, closed Sundays" />
        </div>
        <button className="btn-primary">Save</button>
      </form>

      <p className="text-xs text-ink60 mt-6 max-w-lg">
        These show up on your public booking page. Preview it any time at{' '}
        <a className="underline" href={`/book/${salon.slug}`} target="_blank" rel="noreferrer">chairtime.app/{salon.slug}</a>.
      </p>
    </div>
  );
}
