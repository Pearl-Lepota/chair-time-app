'use client';

import { useState } from 'react';
import { CATEGORY_LIST, CATEGORY_COLORS } from '@/lib/booking-logic';

export default function StaffForm({ addStaff }) {
  const [error, setError] = useState('');

  function handleSubmit(e) {
    const form = e.currentTarget;
    const name = form.elements['name']?.value.trim();
    const checked = form.querySelectorAll('input[name="skills"]:checked');

    if (!name) {
      e.preventDefault();
      setError('Enter a name for this team member.');
      return;
    }
    if (checked.length === 0) {
      e.preventDefault();
      setError('Select at least one category — otherwise this person will never show up as bookable, and clients will get stuck with no available times.');
      return;
    }
    setError('');
  }

  return (
    <form action={addStaff} onSubmit={handleSubmit} className="bg-paper2 border border-dashed border-ink40 rounded-xl p-5 mb-8">
      <div className="font-mono text-xs uppercase tracking-wider text-ink60 font-semibold mb-3">Add a team member</div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
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
        <div>
          <label className="field-label">Commission %</label>
          <input name="commission_rate" type="number" min="0" max="100" step="1" defaultValue="40" className="field-input" />
        </div>
      </div>
      <label className="field-label">Books for which categories? <span className="text-rose">*required</span></label>
      <div className="flex flex-wrap gap-2 mb-2">
        {CATEGORY_LIST.map((cat) => (
          <label key={cat} className="flex items-center gap-1.5 text-xs font-semibold bg-white border border-line rounded-full px-3 py-1.5 cursor-pointer"
            style={{ borderColor: CATEGORY_COLORS[cat] }}>
            <input type="checkbox" name="skills" value={cat} className="accent-current" />
            {cat}
          </label>
        ))}
      </div>
      {error && (
        <p className="text-rose text-xs font-semibold mb-3 max-w-md">{error}</p>
      )}
      <button className="btn-primary">+ Add team member</button>
    </form>
  );
}
