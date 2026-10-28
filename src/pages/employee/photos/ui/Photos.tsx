import React, { useCallback, useEffect, useState } from 'react';
import { Building, Camera, CheckCircle2, LoaderCircle, Trash2, UploadCloud } from 'lucide-react';
import type { Lead } from '@/entities/lead';
import type { LeadStoredFile } from '@/shared/api/crm-repository';
import { crmRepo } from '@/shared/api/crm-repository';
import { isLeadAttachmentsEnabled, resizeImageForUpload } from '@/features/lead-files';

interface EmployeePhotosPageProps { leads: Lead[]; }

export const EmployeePhotosPage: React.FC<EmployeePhotosPageProps> = ({ leads = [] }) => {
  const attachmentsEnabled = isLeadAttachmentsEnabled(import.meta.env);
  const [files, setFiles] = useState<LeadStoredFile[]>([]);
  const [activeLeadId, setActiveLeadId] = useState(leads[0]?.id || '');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const activeLead = leads.find((lead) => lead.id === activeLeadId) || leads[0];

  useEffect(() => {
    if (!activeLeadId && leads[0]?.id) setActiveLeadId(leads[0].id);
  }, [activeLeadId, leads]);

  const loadFiles = useCallback(async () => {
    if (!attachmentsEnabled) return;
    if (!activeLead?.organization_id) { setFiles([]); return; }
    setLoading(true); setError('');
    try { setFiles(await crmRepo.getLeadFiles(activeLead.organization_id, activeLead.id)); }
    catch (loadError) { setFiles([]); setError(loadError instanceof Error ? loadError.message : 'Fotky se nepodařilo načíst.'); }
    finally { setLoading(false); }
  }, [activeLead?.id, activeLead?.organization_id, attachmentsEnabled]);

  useEffect(() => { if (attachmentsEnabled) void loadFiles(); }, [attachmentsEnabled, loadFiles]);

  const handleUploadPhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0]; event.target.value = '';
    if (!selected || !attachmentsEnabled || !activeLead?.organization_id) return;
    setUploading(true); setError(''); setSuccess('');
    try {
      const resized = await resizeImageForUpload(selected, 1600);
      await crmRepo.uploadLeadFile(activeLead.organization_id, activeLead.id, resized);
      await loadFiles();
      setSuccess('Fotografie byla zmenšena a uložena u zakázky.');
    } catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : 'Fotografii se nepodařilo uložit.'); }
    finally { setUploading(false); }
  };

  const deletePhoto = async (file: LeadStoredFile) => {
    if (!attachmentsEnabled) return;
    if (!activeLead?.organization_id) return;
    setUploading(true); setError(''); setSuccess('');
    try { await crmRepo.deleteLeadFile(activeLead.organization_id, file); await loadFiles(); }
    catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : 'Fotografii se nepodařilo smazat.'); }
    finally { setUploading(false); }
  };

  const photos = files.filter((file) => file.mimeType.startsWith('image/'));
  if (!attachmentsEnabled) return <div className="workspace-page pb-12">
    <header className="workspace-page-header">
      <div><p className="workspace-kicker">Terénní dokumentace</p><h1 className="workspace-title">Fotky ze stavby</h1><p role="status" className="workspace-subtitle">Přílohy budou brzy k dispozici.</p></div>
    </header>
  </div>;

  return <div className="workspace-page pb-12">
    <header className="workspace-page-header">
      <div><p className="workspace-kicker">Terénní dokumentace</p><h1 className="workspace-title">Fotky ze stavby</h1><p className="workspace-subtitle">Fotky se ukládají do soukromého prostoru firmy a majitel je ihned uvidí u zakázky.</p></div>
      <label className="workspace-primary-action inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 px-4 text-sm font-semibold"><UploadCloud className="h-4 w-4" />{uploading ? 'Nahrávám…' : 'Vyfotit / nahrát'}<input type="file" accept="image/jpeg,image/png,image/webp,image/heic" capture="environment" className="sr-only" disabled={uploading || !activeLead} onChange={handleUploadPhoto} /></label>
    </header>
    {leads.length > 0 && <label className="workspace-panel flex items-center gap-3 p-4 text-sm font-semibold text-slate-700"><Building className="h-4 w-4 text-blue-600" /><span className="sr-only">Zakázka</span><select value={activeLead?.id || ''} onChange={(event) => setActiveLeadId(event.target.value)} className="min-w-0 flex-1 bg-transparent outline-none">{leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.title || lead.customerName}</option>)}</select></label>}
    {success && <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"><CheckCircle2 className="h-4 w-4" />{success}</div>}
    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>}
    {loading ? <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500"><LoaderCircle className="h-5 w-5 animate-spin" />Načítám fotky…</div> : photos.length ? <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Uložené fotografie">{photos.map((photo) => <article key={photo.id} className="workspace-panel overflow-hidden"><a href={photo.previewUrl} target="_blank" rel="noreferrer"><img src={photo.previewUrl} alt={photo.fileName} className="h-52 w-full bg-slate-100 object-cover" /></a><div className="flex items-center justify-between gap-3 p-4"><span className="min-w-0"><strong className="block truncate text-sm text-slate-900">{photo.fileName}</strong><small className="text-xs text-slate-400">{new Intl.DateTimeFormat('cs-CZ', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(photo.createdAt))}</small></span><button type="button" disabled={uploading} onClick={() => deletePhoto(photo)} aria-label="Smazat fotografii" className="rounded-xl p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button></div></article>)}</section> : <div className="workspace-empty-state px-6 py-14 text-center"><Camera className="mx-auto h-8 w-8 text-slate-300" /><h2 className="mt-3 text-base font-semibold text-slate-950">U této zakázky zatím nejsou fotky</h2><p className="mt-1 text-sm text-slate-500">První nahraná fotografie se zde zobrazí až po potvrzeném uložení.</p></div>}
  </div>;
};
