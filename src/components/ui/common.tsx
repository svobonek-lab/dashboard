import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs rounded-xl font-bold',
    md: 'px-4 py-2.5 text-xs rounded-xl font-bold',
    lg: 'px-6 py-3.5 text-sm rounded-2xl font-black'
  }[size];

  const variantClasses = {
    primary: 'bg-brand text-slate-950 hover:opacity-95 shadow-md hover-lift button-press',
    secondary: 'bg-slate-100 text-slate-800 hover:bg-slate-200 button-press',
    outline: 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 button-press',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 button-press',
    danger: 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 button-press'
  }[variant];

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 transition-all ${sizeClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hoverEffect?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hoverEffect = true,
  ...props
}) => {
  return (
    <div
      className={`bg-white border border-slate-200/90 rounded-[24px] p-6 shadow-2xs ${
        hoverEffect ? 'hover:shadow-md hover-lift transition-all' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  className = '',
  ...props
}) => {
  return (
    <div className="space-y-1.5 w-full font-sans">
      {label && (
        <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
          {label}
        </label>
      )}
      <input
        className={`w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:bg-white transition-all ${
          error
            ? 'border-rose-400 focus:ring-rose-200'
            : 'border-slate-200 focus:border-slate-400 focus:ring-slate-100'
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs font-semibold text-rose-600 mt-1">{error}</p>}
    </div>
  );
};

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options?: { value: string; label: string }[];
  children?: React.ReactNode;
}

export const Select: React.FC<SelectProps> = ({
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
        <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
          {label}
        </label>
      )}
      <select
        className={`w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:bg-white transition-all cursor-pointer ${
          error
            ? 'border-rose-400 focus:ring-rose-200'
            : 'border-slate-200 focus:border-slate-400 focus:ring-slate-100'
        } ${className}`}
        {...props}
      >
        {options ? options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        )) : children}
      </select>
      {error && <p className="text-xs font-semibold text-rose-600 mt-1">{error}</p>}
    </div>
  );
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'primary',
  children,
  className = '',
  ...props
}) => {
  const variantClasses = {
    primary: 'bg-brand-light text-slate-900 border border-brand-subtle',
    secondary: 'bg-slate-100 text-slate-700 border border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border border-rose-200'
  }[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold tracking-wider ${variantClasses} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
