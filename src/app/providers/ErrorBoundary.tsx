import React, { ErrorInfo, ReactNode } from 'react';
import * as Sentry from '@sentry/react';
import { AlertTriangle, RefreshCw, Trash2, Copy, Check } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  copied: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      copied: false,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, copied: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary zachytil pád komponenty:', error, errorInfo);
    try {
      Sentry.captureException(error);
    } catch {
      // Ignore sentry report failures
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetCache = () => {
    try {
      localStorage.clear();
      window.location.reload();
    } catch {
      window.location.reload();
    }
  };

  private handleCopyDiagnostic = () => {
    const report = {
      message: this.state.error?.message,
      stack: this.state.error?.stack,
      time: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };
    navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 2500);
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-white text-slate-900 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-800 border border-slate-300 rounded-xl p-6 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Chyba zobrazení aplikace</h2>
                <p className="text-xs text-slate-500">Nastala neočekávaná chyba při vykreslování rozhraní.</p>
              </div>
            </div>

            <div role="alert" className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 text-sm text-slate-700">
              Zkuste stránku obnovit. Pokud potíž přetrvá, zkopírujte diagnostiku a pošlete ji podpoře.
            </div>

            <div className="space-y-2">
              <button
                onClick={this.handleReload}
                className="w-full py-2.5 px-4 rounded-lg bg-brand-primary hover:bg-brand-primary text-slate-900 font-medium text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <RefreshCw className="w-4 h-4" /> Obnovit stránku
              </button>
              
              <div className="flex gap-2">
                <button
                  onClick={this.handleCopyDiagnostic}
                  className="flex-1 py-2 px-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-800 text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  {this.state.copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {this.state.copied ? 'Zkopírováno' : 'Kopírovat diagnostiku'}
                </button>

                <button
                  onClick={this.handleResetCache}
                  className="py-2 px-3 rounded-lg bg-slate-700 hover:bg-rose-900/40 text-slate-800 hover:text-rose-300 text-xs flex items-center justify-center gap-1.5 transition-colors"
                  title="Vymaže mezipaměť a obnoví tovární stav"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Reset mezipaměti
                </button>
              </div>
            </div>

          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
