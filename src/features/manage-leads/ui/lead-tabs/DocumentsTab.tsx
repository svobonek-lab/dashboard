import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, FileText, LoaderCircle, MessageSquareText, Paperclip, Trash2, Upload } from 'lucide-react';
import type { Lead } from '../../../../entities/lead';
import { useOrganization } from '../../../../entities/session';
import type { LeadNote, LeadStoredFile } from '../../../../shared/api/crm-repository';
import { crmRepo } from '../../../../shared/api/crm-repository';
import { canDeleteLeadAttachment, isLeadAttachmentsEnabled, loadLeadAttachmentLists, mergeScopedRows, resizeImageForUpload, visibleScopedRows } from '../../../lead-files';

interface DocumentsTabProps { lead: Lead; onNotice?: (message: string) => void; }

const formatDate = (value: string) => new Intl.DateTimeFormat('cs-CZ', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
const formatSize = (bytes: number) => bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} kB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export const DocumentsTab: React.FC<DocumentsTabProps> = ({ lead, onNotice = () => {} }) => {
  const { dbUser } = useOrganization();
  const attachmentsEnabled = isLeadAttachmentsEnabled(import.meta.env);
  const companyId = lead.organization_id || '';
  const scope = `${companyId}/${lead.id}`;
  const [noteState, setNoteState] = useState({ scope, rows: [] as LeadNote[] });
  const [fileState, setFileState] = useState({ scope, rows: [] as LeadStoredFile[] });
  const notes = visibleScopedRows(noteState, scope);
  const files = visibleScopedRows(fileState, scope);
  const loadSequence = useRef(0);
  const [noteBody, setNoteBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [now, setNow] = useState(() => new Date());

  const loadAttachments = useCallback(async () => {
    if (!attachmentsEnabled) return;
    const sequence = ++loadSequence.current;
    setLoading(true); setError('');
    const loaded = await loadLeadAttachmentLists(
      () => crmRepo.getLeadNotes(companyId, lead.id),
      () => crmRepo.getLeadFiles(companyId, lead.id),
    );
    if (sequence !== loadSequence.current) return false;
    setNoteState(previous => mergeScopedRows(previous, scope, loaded.notes));
    setFileState(previous => mergeScopedRows(previous, scope, loaded.files));
    setError(loaded.error);
    setLoading(false);
    return !loaded.error;
  }, [attachmentsEnabled, companyId, lead.id, scope]);

  useEffect(() => { if (attachmentsEnabled) void loadAttachments(); }, [attachmentsEnabled, loadAttachments]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const addNote = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    if (!attachmentsEnabled) { setBusy(false); return; }
    try {
      await crmRepo.addLeadNote(companyId, lead.id, noteBody);
      setNoteBody(''); if (await loadAttachments()) onNotice('Poznámka byla uložena.');
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'Poznámku se nepodařilo uložit.'); }
    finally { setBusy(false); }
  };

  const uploadFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0]; event.target.value = '';
    if (!selected || !attachmentsEnabled) return;
    setBusy(true); setError('');
    try {
      const prepared = selected.type.startsWith('image/') ? await resizeImageForUpload(selected) : selected;
      const stored = await crmRepo.uploadLeadFile(companyId, lead.id, prepared);
      if (await loadAttachments()) onNotice(stored.previewUrl ? 'Soubor byl bezpečně uložen.' : 'Soubor byl uložen, ale náhled není dostupný.');
    } catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : 'Soubor se nepodařilo uložit.'); }
    finally { setBusy(false); }
  };

  const removeNote = async (note: LeadNote) => {
    if (!attachmentsEnabled) return;
    setBusy(true); setError('');
    try { await crmRepo.deleteLeadNote(companyId, note.id); await loadAttachments(); }
    catch (removeError) { setError(removeError instanceof Error ? removeError.message : 'Poznámku se nepodařilo smazat.'); }
    finally { setBusy(false); }
  };

  const removeFile = async (file: LeadStoredFile) => {
    if (!attachmentsEnabled) return;
    setBusy(true); setError('');
    try { await crmRepo.deleteLeadFile(companyId, file); await loadAttachments(); }
    catch (removeError) { await loadAttachments(); setError(removeError instanceof Error ? removeError.message : 'Soubor se nepodařilo smazat.'); }
    finally { setBusy(false); }
  };

  if (!attachmentsEnabled) return <section className="workspace-panel p-5 sm:p-7" aria-labelledby="lead-attachments-title">
    <p className="workspace-kicker">Dokumentace zakázky</p>
    <h2 id="lead-attachments-title" className="mt-1 text-base font-semibold text-slate-950">Poznámky a soubory</h2>
    <p role="status" className="mt-2 text-sm text-slate-600">Poznámky a soubory nejsou v tomto prostředí zapnuté.</p>
  </section>;

  return <section className="workspace-panel p-5 sm:p-7" aria-labelledby="lead-attachments-title">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div><p className="workspace-kicker">Sdílený stavební deník</p><h2 id="lead-attachments-title" className="text-base font-semibold text-slate-950">Poznámky a soubory</h2><p className="mt-1 text-sm text-slate-500">Záznamy uložené u této zakázky vidí majitel i přiřazený zaměstnanec.</p></div>
      <label className="workspace-primary-action inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 px-4 text-sm font-semibold aria-disabled:cursor-wait aria-disabled:opacity-60" aria-disabled={busy}><Upload className="h-4 w-4" />Nahrát soubor<input type="file" className="sr-only" accept="image/jpeg,image/png,image/webp,image/heic,application/pdf" disabled={busy} onChange={uploadFile} /></label>
    </div>
    {error && <div role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>}
    {loading && <div className="mt-5 flex items-center gap-2 text-sm text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" />Načítám uložené záznamy…</div>}
    <form onSubmit={addNote} className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <label className="text-xs font-semibold text-slate-700" htmlFor="lead-note">Nová poznámka</label>
      <textarea id="lead-note" value={noteBody} onChange={(event) => setNoteBody(event.target.value)} maxLength={4000} rows={3} placeholder="Co se na zakázce změnilo nebo co má tým vědět?" className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
      <div className="mt-2 flex items-center justify-between gap-3"><span className="text-xs text-slate-400">{noteBody.length}/4000</span><button type="submit" disabled={busy || !noteBody.trim()} className="inline-flex min-h-9 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-50"><MessageSquareText className="h-4 w-4" />Uložit poznámku</button></div>
    </form>
    {!loading && <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <div><h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><MessageSquareText className="h-4 w-4 text-blue-600" />Poznámky ({notes.length})</h3><div className="mt-3 space-y-2">
        {notes.map((note) => <article key={note.id} className="rounded-xl border border-slate-200 bg-white p-4"><p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{note.body}</p><div className="mt-3 flex items-center justify-between gap-2"><time className="text-xs text-slate-400">{formatDate(note.createdAt)}</time>{canDeleteLeadAttachment(dbUser?.role, dbUser?.id, note.authorId, note.createdAt, now) && <button type="button" disabled={busy} onClick={() => removeNote(note)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Smazat poznámku"><Trash2 className="h-4 w-4" /></button>}</div></article>)}
        {!notes.length && <p className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">Zatím bez poznámek.</p>}
      </div></div>
      <div><h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Paperclip className="h-4 w-4 text-blue-600" />Soubory ({files.length})</h3><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {files.map((file) => <article key={file.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">{file.previewUrl ? (file.mimeType.startsWith('image/') ? <a href={file.previewUrl} target="_blank" rel="noreferrer"><img src={file.previewUrl} alt={file.fileName} className="h-36 w-full bg-slate-100 object-cover" /></a> : <a href={file.previewUrl} target="_blank" rel="noreferrer" className="flex h-36 items-center justify-center bg-slate-50"><FileText className="h-10 w-10 text-slate-300" /></a>) : <div className="flex h-36 items-center justify-center bg-slate-50 px-3 text-center text-xs text-slate-500">Náhled není dostupný. Zkuste stránku obnovit.</div>}<div className="flex items-start justify-between gap-2 p-3"><span className="min-w-0"><strong className="block truncate text-xs font-semibold text-slate-800">{file.fileName}</strong><small className="text-[11px] text-slate-400">{formatSize(file.sizeBytes)}, {formatDate(file.createdAt)}</small></span>{canDeleteLeadAttachment(dbUser?.role, dbUser?.id, file.authorId, file.createdAt, now) && <button type="button" disabled={busy} onClick={() => removeFile(file)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Smazat soubor"><Trash2 className="h-4 w-4" /></button>}</div></article>)}
        {!files.length && <div className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500 sm:col-span-2 lg:col-span-1 xl:col-span-2"><Camera className="mx-auto mb-2 h-6 w-6 text-slate-300" />Zatím bez fotografií a dokumentů.</div>}
      </div></div>
    </div>}
  </section>;
};
