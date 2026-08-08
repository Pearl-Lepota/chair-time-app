'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { savePhotoUrl } from './actions';

export default function PhotoUpload({ salonId, field, label, currentUrl }) {
  const [preview, setPreview] = useState(currentUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please choose an image file.'); return; }
    if (file.size > 8 * 1024 * 1024) { setError('Image is too large — please choose one under 8MB.'); return; }

    setUploading(true);
    setError('');
    const supabase = createClient();
    const ext = file.name.split('.').pop();
    const path = `${salonId}/${field}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('salon-photos')
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setUploading(false);
      setError('Upload failed: ' + uploadError.message);
      return;
    }

    const { data } = supabase.storage.from('salon-photos').getPublicUrl(path);
    // Cache-bust so the new photo shows immediately instead of a stale cached copy.
    const url = `${data.publicUrl}?t=${Date.now()}`;

    const fd = new FormData();
    fd.set('field', field);
    fd.set('url', url);
    await savePhotoUrl(fd);

    setPreview(url);
    setUploading(false);
  }

  return (
    <div>
      <label className="field-label">{label}</label>
      <div className="aspect-video rounded-2xl border border-line bg-paper2 overflow-hidden mb-3 flex items-center justify-center">
        {preview ? (
          <img src={preview} alt={label} className="w-full h-full object-cover" />
        ) : (
          <span className="font-mono text-xs uppercase text-ink60">No photo uploaded yet</span>
        )}
      </div>
      <label className="btn-ghost inline-block cursor-pointer">
        {uploading ? 'Uploading…' : preview ? 'Replace photo' : 'Upload photo'}
        <input type="file" accept="image/*" onChange={handleFile} disabled={uploading} className="hidden" />
      </label>
      {error && <p className="text-rose text-xs font-semibold mt-2">{error}</p>}
    </div>
  );
}
