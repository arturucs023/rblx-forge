import { useState } from 'react';
import { useSessions } from '../stores/sessions';
import { shortPath } from '../lib/activity';

const KIND_ICON: Record<string, string> = {
  mensaje: '💬', herramienta: '🔧', archivo: '📄', comando: '⌨', permiso: '🔐',
  paso: '⏭', uso: '📊', error: '⛔', sistema: '⚙',
};

export function Activity() {
  const { feed, calls, activeId, usage, clearFeed } = useSessions();
  const [filter, setFilter] = useState<'todo' | 'herramientas' | 'archivos' | 'errores'>('todo');
  const items = feed.filter((f) => {
    if (activeId && f.sessionId && f.sessionId !== activeId) return false;
    if (filter === 'herramientas') return f.kind === 'herramienta' || f.kind === 'paso';
    if (filter === 'archivos') return f.kind === 'archivo';
    if (filter === 'errores') return f.kind === 'error';
    return true;
  });
  const sessCalls = activeId ? (calls[activeId] ?? []) : [];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b border-forge-border-soft p-1.5">
        {(['todo', 'herramientas', 'archivos', 'errores'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-md px-2 py-0.5 text-[11px] font-semibold capitalize transition-colors ${filter === f ? 'bg-forge-panel3 text-forge-accent' : 'text-forge-faint hover:text-forge-text'}`}>
            {f}
          </button>
        ))}
        <button onClick={() => clearFeed()} className="ml-auto text-[11px] text-forge-faint hover:text-forge-text">Limpiar</button>
      </div>
      {usage && (
        <div className="mono border-b border-forge-border-soft px-2 py-1 text-[11px] text-forge-muted">
          tokens in={usage.input ?? '?'} out={usage.output ?? '?'} · coste={usage.cost ?? '?'}
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-1.5">
        {items.length === 0 && <p className="px-1 py-3 text-center text-[12px] text-forge-faint">Sin actividad en esta sesión.<br />Los eventos reales de OpenCode aparecerán aquí.</p>}
        {[...items].reverse().map((f) => (
          <div key={f.id} className="anim-fade mb-1 rounded-lg border border-forge-border-soft bg-forge-panel px-2 py-1.5 text-[12px]">
            <span className="mr-1.5">{KIND_ICON[f.kind] ?? '•'}</span>
            <span className="font-semibold">{f.title}</span>
            {f.detail && <div className="mono mt-0.5 whitespace-pre-wrap break-words text-[11px] text-forge-muted">{f.detail.slice(0, 400)}</div>}
            <div className="mono mt-0.5 text-[10px] text-forge-faint">{new Date(f.ts).toLocaleTimeString()}</div>
          </div>
        ))}
      </div>
      {sessCalls.length > 0 && (
        <div className="max-h-40 overflow-y-auto border-t border-forge-border p-1.5">
          <p className="mb-1 text-[11px] font-bold text-forge-muted">HERRAMIENTAS ({sessCalls.length})</p>
          {sessCalls.map((c) => (
            <div key={c.callId} className="mono mb-1 break-words text-[11px]">
              <span className={c.status === 'error' ? 'text-forge-err' : c.status === 'ok' ? 'text-forge-ok' : 'text-forge-accent'}>
                [{c.status}]
              </span>{' '}
              {c.name}
              {c.files.map((fl, i) => (
                <span key={i} className="ml-1 text-forge-muted">
                  {fl.kind === 'modificado' ? '✎' : '👁'}{shortPath(fl.rel)}
                </span>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
