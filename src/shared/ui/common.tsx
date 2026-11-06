import React from 'react';

// Design System Constants
// Spacing scale: p-4 (16px), p-6 (24px)
// Radius: rounded-app (12px)
// Shadow: shadow-app

// AppButton
export interface AppButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const AppButton: React.FC<AppButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}) => {
  const sizeClasses = {
    sm: 'min-h-10 px-3 py-2 text-sm rounded-control font-semibold',
    md: 'min-h-11 px-4 py-2.5 text-sm rounded-control font-semibold',
    lg: 'min-h-12 px-6 py-3 text-base rounded-control font-bold'
  }[size];

  const variantClasses = {
    primary: 'bg-brand-primary text-white hover:opacity-90 transition-colors cursor-pointer',
    secondary: 'bg-brand-primary-soft text-brand-primary hover:opacity-90 transition-opacity cursor-pointer',
    outline: 'bg-surface border border-border text-text hover:bg-surface-secondary transition-colors cursor-pointer',
    ghost: 'bg-transparent text-muted hover:bg-surface-secondary hover:text-text transition-colors cursor-pointer',
    danger: 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors cursor-pointer'
  }[variant];

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 font-sans focus:outline-none focus:ring-2 focus:ring-brand-primary/20 ${sizeClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

// AppCard
export interface AppCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hoverEffect?: boolean;
}

export const AppCard: React.FC<AppCardProps> = ({
  children,
  className = '',
  hoverEffect = false,
  ...props
}) => {
  return (
    <div
      className={`bg-surface border border-border rounded-panel p-5 sm:p-6 ${
        hoverEffect ? 'hover:border-slate-300 transition-colors' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

// AppInput
export interface AppInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const AppInput: React.FC<AppInputProps> = ({
  label,
  error,
  icon,
  className = '',
  ...props
}) => {
  return (
    <div className="space-y-1.5 w-full font-sans">
      {label && (
        <label className="text-sm font-semibold text-muted block">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3.5 top-3.5 text-muted pointer-events-none">
            {icon}
          </div>
        )}
        <input
          className={`w-full min-h-11 bg-surface-secondary border border-border rounded-control ${icon ? 'pl-11' : 'px-4'} pr-4 py-2.5 text-sm font-medium text-text focus:bg-surface transition-colors ${
            error ? 'border-red-400 focus:ring-red-100' : 'focus:border-brand-primary'
          } ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-xs font-semibold text-red-600 mt-1">{error}</p>}
    </div>
  );
};

// AppSelect
export interface AppSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options?: { value: string; label: string }[];
  children?: React.ReactNode;
}

export const AppSelect: React.FC<AppSelectProps> = ({
  label,
  error,
  options,
  children,
  className = '',
  ...props
}) => {
  return (
    <div className="space-y-1.5 w-full font-sans">
      {label && (
        <label className="text-sm font-semibold text-muted block">
          {label}
        </label>
      )}
      <select
        className={`w-full min-h-11 bg-surface-secondary border border-border rounded-control px-4 py-2.5 text-sm font-medium text-text focus:bg-surface transition-colors cursor-pointer ${
          error ? 'border-red-400 focus:ring-red-100' : 'focus:border-brand-primary'
        } ${className}`}
        {...props}
      >
        {options ? options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        )) : children}
      </select>
      {error && <p className="text-xs font-semibold text-red-600 mt-1">{error}</p>}
    </div>
  );
};

// AppBadge
export interface AppBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  children: React.ReactNode;
}

export const AppBadge: React.FC<AppBadgeProps> = ({
  variant = 'primary',
  children,
  className = '',
  ...props
}) => {
  const variantClasses = {
    primary: 'bg-brand-primary-soft text-brand-primary border border-brand-primary-soft/30',
    secondary: 'bg-surface-tertiary text-muted border border-border',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-150',
    warning: 'bg-amber-50 text-amber-700 border border-amber-150',
    danger: 'bg-red-50 text-red-700 border border-red-150'
  }[variant];

  return (
    <span
      className={`inline-flex min-h-7 items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold ${variantClasses} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};

// AppModal
export interface AppModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export const AppModal: React.FC<AppModalProps> = ({
  isOpen,
  onClose,
  title,
  children
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal Card */}
      <div className="relative bg-surface border border-border rounded-dialog w-full max-w-xl shadow-app z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {title && (
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h3 className="text-base font-bold text-text">{title}</h3>
            <button 
              onClick={onClose}
              className="text-muted hover:text-text cursor-pointer p-1 rounded-app hover:bg-surface-secondary"
            >
              <span className="text-lg leading-none">&times;</span>
            </button>
          </div>
        )}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

// Keep aliases for backward compatibility so we don't break existing files that import without "App" prefix
export { 
  AppButton as Button, 
  AppCard as Card, 
  AppInput as Input, 
  AppSelect as Select, 
  AppBadge as Badge,
  AppModal as Modal
};
