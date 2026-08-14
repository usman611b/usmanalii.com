import { useState } from 'react';
import { PrivateRecordDirectory } from './PrivateRecordDirectory';
export function ArtifactManager() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  async function upload(event: React.FormEvent) {
    event.preventDefault();
    if (!file) return;
    const data = new FormData();
    data.set('file', file);
    if (title) data.set('title', title);
    if (description) data.set('description', description);
    data.set('visibility', 'private');
    setStatus('Uploading securely to R2…');
    const response = await fetch('/api/v1/private/artifacts/upload', {
      method: 'POST',
      credentials: 'include',
      body: data,
    });
    const body = (await response.json().catch(() => ({}))) as { message?: string };
    if (!response.ok) {
      setStatus(body.message || `Upload failed (${response.status}).`);
      return;
    }
    setStatus('Artifact uploaded.');
    setFile(null);
    setTitle('');
    setDescription('');
    setReloadKey((value) => value + 1);
  }
  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-xl font-bold text-white">Artifact Management</h1>
        <p className="mt-1 text-xs text-[#9CAAC1]">Private-by-default R2 files with D1 metadata.</p>
      </header>
      <form
        onSubmit={(e) => void upload(e)}
        className="glass-panel grid gap-4 rounded-xl border border-dashed border-[#45F3FF]/40 p-6 md:grid-cols-2"
      >
        <label className="text-xs font-bold uppercase text-white">
          File
          <input
            required
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="mt-2 block w-full text-sm text-[#9CAAC1]"
          />
        </label>
        <label className="text-xs font-bold uppercase text-white">
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-2 w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-white"
          />
        </label>
        <label className="text-xs font-bold uppercase text-white md:col-span-2">
          Description
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-2 w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-white"
          />
        </label>
        <div className="md:col-span-2">
          <button className="rounded bg-[#45F3FF] px-4 py-2 text-xs font-bold text-[#05060A]">
            Upload private artifact
          </button>
        </div>
      </form>
      <p role="status" className="text-xs text-[#45F3FF]">
        {status}
      </p>
      <PrivateRecordDirectory key={reloadKey} kind="artifacts" />
    </section>
  );
}
