import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 bg-slate-950/80 rounded-2xl border border-red-500/20 text-center">
          <div className="max-w-md space-y-4">
            <div className="w-14 h-14 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto text-red-400 shadow-lg">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-base font-bold text-slate-100">
                {this.props.title || 'Ocurrió un error al cargar este componente'}
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                {this.state.error?.message || 'Se produjo una excepción inesperada durante el renderizado.'}
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reintentar
              </button>

              <button
                type="button"
                onClick={() => window.location.href = '/'}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold text-xs rounded-xl border border-slate-750 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
              >
                <Home className="w-3.5 h-3.5" />
                Inicio
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
