import { Component, type ReactNode } from 'react';

interface Props {
  moduleName: string;
  children: ReactNode;
}

interface State {
  error: Error | null;
  info: string;
}

/** Frontera de error por módulo: muestra el fallo exacto en vez de negro,
 *  con botón para copiarlo y volver al inicio. */
export class ModuleBoundary extends Component<Props, State> {
  state: State = { error: null, info: '' };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    this.setState({ info: info.componentStack ?? '' });
    console.error(`[forge:${this.props.moduleName}]`, error);
  }

  render() {
    if (this.state.error) {
      const text = `${this.state.error.message}\n${this.state.info}`.slice(0, 2000);
      return (
        <div className="p-4">
          <p className="mb-1 font-bold text-forge-err">El módulo «{this.props.moduleName}» falló al pintarse.</p>
          <pre className="mono mb-2 max-h-60 overflow-auto whitespace-pre-wrap rounded border border-forge-err bg-forge-panel p-2 text-[11px]">{text || '(sin mensaje)'}</pre>
          <div className="flex gap-2">
            <button
              onClick={() => navigator.clipboard?.writeText(text).catch(() => {})}
              className="rounded border border-forge-border px-2 py-1 text-[12px]"
            >
              Copiar error
            </button>
            <button onClick={() => this.setState({ error: null, info: '' })} className="rounded border border-forge-accent-dim px-2 py-1 text-[12px] text-forge-accent">
              Reintentar
            </button>
          </div>
          <p className="mt-2 text-[12px] text-forge-muted">Pega ese texto al informar del fallo: contiene la causa exacta.</p>
        </div>
      );
    }
    return this.props.children;
  }
}
