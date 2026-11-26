import React, { useState } from 'react';
import { MessageSquareText, Paperclip, Trash2 } from 'lucide-react';
import { DEMO_NOTE_MAX_LENGTH, type DemoNote } from '@/features/public-demo';

interface DemoNotesProps {
  notes: DemoNote[];
  onAdd: (body: string) => void;
  onRemove: (noteId: string) => void;
}

const formatDate = (value: string) => new Intl.DateTimeFormat('cs-CZ', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

/**
 * Local-only twin of the notes section of a real job. It looks and reads the same, but the
 * notes live in the demo's memory and are never sent anywhere.
 */
export const DemoNotes: React.FC<DemoNotesProps> = ({ notes, onAdd, onRemove }) => {
  const [body, setBody] = useState('');

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!body.trim()) return;
    onAdd(body);
    setBody('');
  };

  return (
    <section className="workspace-panel p-5 sm:p-7" aria-labelledby="demo-notes-title">
      <div>
        <p className="workspace-kicker">Sdílený stavební deník</p>
        <h2 id="demo-notes-title" className="text-base font-semibold text-slate-950">Poznámky</h2>
        <p className="mt-1 text-sm text-slate-500">Záznamy u zakázky vidí majitel i přiřazený zaměstnanec. V demu zůstávají jen v tomto okně.</p>
      </div>

      <form onSubmit={submit} className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <label className="text-xs font-semibold text-slate-700" htmlFor="demo-note">Nová poznámka</label>
        <textarea
          id="demo-note"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={DEMO_NOTE_MAX_LENGTH}
          rows={3}
          placeholder="Co se na zakázce změnilo nebo co má tým vědět?"
          className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-400">{body.length}/{DEMO_NOTE_MAX_LENGTH}</span>
          <button type="submit" disabled={!body.trim()} className="inline-flex min-h-9 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-50">
            <MessageSquareText className="h-4 w-4" />Uložit poznámku
          </button>
        </div>
      </form>

      <div className="mt-6">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <MessageSquareText className="h-4 w-4 text-blue-600" />Poznámky ({notes.length})
        </h3>
        <div className="mt-3 space-y-2">
          {notes.map((note) => (
            <article key={note.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{note.body}</p>
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-xs text-slate-400"><time dateTime={note.createdAt}>{formatDate(note.createdAt)}</time> · {note.author}</span>
                <button type="button" onClick={() => onRemove(note.id)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Smazat poznámku">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}
          {!notes.length && <p className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">Zatím bez poznámek.</p>}
        </div>
      </div>

      <p className="mt-5 flex items-center gap-2 text-xs text-slate-400">
        <Paperclip className="h-3.5 w-3.5" />Nahrávání fotek a souborů je součástí plné verze, ve veřejném demu není.
      </p>
    </section>
  );
};
