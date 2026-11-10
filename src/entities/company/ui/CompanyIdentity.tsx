export interface CompanyIdentityProps {
  name: string;
  logoUrl?: string;
  primaryColor: string;
  subtitle?: string;
}

export function CompanyIdentity({ name, logoUrl, primaryColor, subtitle }: CompanyIdentityProps) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      {logoUrl ? (
        <img src={logoUrl} alt="" className="h-10 w-10 shrink-0 rounded-xl border border-slate-200 bg-white object-contain p-1" />
      ) : (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: primaryColor }}>{(name || 'SF').slice(0, 2).toUpperCase()}</span>
      )}
      <span className="min-w-0"><strong className="block truncate text-sm font-semibold">{name}</strong>{subtitle && <small className="block truncate text-xs text-slate-500">{subtitle}</small>}</span>
    </span>
  );
}
