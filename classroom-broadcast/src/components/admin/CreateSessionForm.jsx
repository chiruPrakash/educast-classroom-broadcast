import { useState } from 'react';
import { PlusCircle, Loader2 } from 'lucide-react';

export default function CreateSessionForm({ onSubmit, loading }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({ title: title.trim(), description: description.trim() });
    setTitle('');
    setDescription('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Session Title *</label>
        <input
          type="text"
          className="input-field"
          placeholder="e.g. Introduction to Machine Learning"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
          maxLength={80}
        />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea
          className="input-field resize-none"
          rows={3}
          placeholder="Brief overview of the session topics…"
          value={description}
          onChange={e => setDescription(e.target.value)}
          maxLength={300}
        />
      </div>
      <button type="submit" disabled={loading || !title.trim()} className="btn-primary flex items-center gap-2">
        {loading
          ? <><Loader2 size={15} className="animate-spin" />Creating…</>
          : <><PlusCircle size={15} />Create Session</>
        }
      </button>
    </form>
  );
}
