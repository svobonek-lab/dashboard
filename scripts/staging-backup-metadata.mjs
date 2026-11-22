const projectRef = 'xwzweltjvreqhjpbjrxa';
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) throw new Error('Existing staging metadata credential is unavailable');
const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/backups`, {
  headers: { Authorization: `Bearer ${token}` },
  signal: AbortSignal.timeout(15_000),
});
if (!response.ok) {
  console.log(JSON.stringify({ projectRef, backupCatalogHttp: response.status }));
  process.exitCode = 1;
} else {
  const data = await response.json();
  console.log(JSON.stringify({ projectRef, backupCatalogHttp: response.status,
    pitrEnabled: data.pitr_enabled ?? null, backupCount: Array.isArray(data.backups) ? data.backups.length : null,
    physicalWindow: data.physical_backup_data ? {
      earliest: data.physical_backup_data.earliest_physical_backup_date_unix ?? null,
      latest: data.physical_backup_data.latest_physical_backup_date_unix ?? null,
    } : null }));
}
