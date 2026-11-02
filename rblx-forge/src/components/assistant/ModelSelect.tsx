// Selector de modelo + variante para el Asistente.
// Se abre HACIA ARRIBA (el composer está abajo: abrir hacia abajo obligaba a
// hacer scroll de la app). Proveedores como desplegables (acordeón) y
// variantes al pasar el ratón sobre la flecha › de cada modelo (flyout),
// con fijado por clic para táctil. Todo sale de /api/model: nada inventado.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSessions } from '../../stores/sessions';
import type { ModelInfo } from '../../lib/opencode';
import { costLabel, filterModels, groupModelsByProvider, isFreeModel, variantCount } from '../../lib/chat/models';
import { getVariants } from '../../lib/model-variants';
import type { ModelValue } from '../ModelPicker';

function modelKey(m: { providerID: string; id: string }): string {
  return `${m.providerID}\n${m.id}`;
}

export function ModelSelect({
  value,
  onChange,
  disabled,
}: {
  value: ModelValue | null;
  onChange: (v: ModelValue | null) => void;
  disabled?: boolean;
}) {
  const models = useSessions((s) => s.models);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [pinnedKey, setPinnedKey] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const current = value ? models.find((m) => m.id === value.id && m.providerID === value.providerID) : null;
  const groups = useMemo(() => groupModelsByProvider(filterModels(models, query)), [models, query]);

  // Al abrir: con búsqueda todo expandido; sin búsqueda, solo el proveedor
  // actual (si hay uno elegido). Con 1-2 proveedores y sin elección, expandir
  // el primero para no mostrar un panel vacío.
  useEffect(() => {
    if (!open) return;
    if (query.trim()) {
      setExpanded(Object.fromEntries(groups.map((g) => [g.provider, true])));
      return;
    }
    setExpanded((prev) => {
      if (Object.keys(prev).length > 0) return prev;
      const init: Record<string, boolean> = {};
      for (const g of groups) init[g.provider] = false;
      if (value) init[value.providerID] = true;
      else if (groups.length >= 1 && groups.length <= 2) init[groups[0].provider] = true;
      return init;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, query]);

  // Cerrar con clic fuera o Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open ]);

  const toggleProvider = (provider: string) =>
    setExpanded((prev) => ({ ...prev, [provider]: !(prev[provider] ?? false) }));

  const pick = (m: ModelInfo) => {
    const same = value && value.id === m.id && value.providerID === m.providerID;
    onChange({ providerID: m.providerID, id: m.id, variant: same ? value?.variant : undefined });
    setOpen(false);
  };

  const pickVariant = (m: ModelInfo, variant: string | undefined) => {
    onChange({ providerID: m.providerID, id: m.id, variant });
    setOpen(false);
  };

  const activeFlyout = pinnedKey ?? hoverKey;

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={disabled || models.length === 0}
        title="Cambiar modelo y variante"
        className="flex max-w-full items-center gap-1.5 rounded-lg border border-forge-border bg-forge-panel px-2 py-1 text-left transition-colors hover:border-forge-accent-dim disabled:opacity-50"
      >
        <span className="mono min-w-0 flex-1 truncate text-[12px] font-bold text-forge-accent">
          {value ? `${value.providerID}/${value.id}` : '(sin modelo)'}
        </span>
        {value?.variant && <span className="pill pill-ok shrink-0 !text-[10px]">{value.variant}</span>}
        {!value?.variant && current && variantCount(current) > 0 && (
          <span className="mono shrink-0 text-[10px] text-forge-faint" title="Este modelo declara variantes">+var</span>
        )}
        <span className="shrink-0 text-[11px] text-forge-faint">{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div className="anim-enter absolute bottom-full left-0 z-50 mb-1 flex max-h-[60vh] w-80 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border border-forge-border bg-forge-panel shadow-2xl">
          <div className="border-b border-forge-border-soft p-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Buscar entre ${models.length} modelos…`}
              className="input w-full !text-[12px]"
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
            {models.length === 0 && <p className="p-2 text-[12px] text-forge-faint">Sin modelos. Conecta OpenCode para cargarlos.</p>}
            {groups.map((g) => {
              const isOpen = query.trim() ? true : (expanded[g.provider] ?? false);
              const selHere = !!value && value.providerID === g.provider;
              const freeCount = g.items.filter(isFreeModel).length;
              return (
                <div key={g.provider} className="mb-1 overflow-visible rounded-lg border border-forge-border-soft">
                  <button
                    onClick={() => toggleProvider(g.provider)}
                    title={isOpen ? `Contraer ${g.provider}` : `Desplegar ${g.provider} (${g.items.length} modelos)`}
                    className="flex w-full items-center gap-2 px-2 py-1.5 text-left transition-colors hover:bg-forge-panel2"
                  >
                    <span className="w-4 shrink-0 text-center text-[11px] text-forge-faint">{isOpen ? '▾' : '▸'}</span>
                    <span className="mono min-w-0 flex-1 truncate text-[11px] font-bold uppercase tracking-wide text-forge-text">
                      {g.provider}
                    </span>
                    {selHere && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-forge-accent" title="Proveedor del modelo actual" />}
                    <span className="mono shrink-0 text-[10px] text-forge-faint">
                      {g.items.length}{freeCount > 0 ? ` · ${freeCount} gratis` : ''}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="border-t border-forge-border-soft p-1">
                      {g.items.map((m) => {
                        const key = modelKey(m);
                        const sel = !!value && value.id === m.id && value.providerID === m.providerID;
                        const free = isFreeModel(m);
                        const variants = getVariants(m);
                        const showFlyout = activeFlyout === key && variants.length > 0;
                        return (
                          <div
                            key={key}
                            className="relative overflow-visible"
                            onMouseEnter={() => setHoverKey(key)}
                            onMouseLeave={() => setHoverKey((prev) => (prev === key ? null : prev))}
                          >
                            <div
                              className={`flex w-full items-center gap-1.5 rounded-lg px-1.5 py-1 transition-colors ${sel ? 'bg-forge-accent-soft' : 'hover:bg-forge-panel2'}`}
                            >
                              <button
                                onClick={() => pick(m)}
                                title={m.name || m.id}
                                className="flex min-w-0 flex-1 items-center gap-2 text-left"
                              >
                                <span className={`w-4 shrink-0 text-center text-[12px] ${sel ? 'text-forge-accent' : 'text-transparent'}`}>✓</span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-[12.5px] font-semibold text-forge-text">{m.name || m.id}</span>
                                  <span className="mono block truncate text-[10px] text-forge-faint">
                                    <span className={free ? 'text-forge-ok' : 'text-forge-muted'}>{costLabel(m)}</span>
                                    {variants.length > 0 && <span> · {variants.length} variantes</span>}
                                  </span>
                                </span>
                              </button>
                              {variants.length > 0 && (
                                <button
                                  onClick={() => setPinnedKey((prev) => (prev === key ? null : key))}
                                  title={pinnedKey === key ? 'Ocultar variantes' : 'Ver variantes (o pasa el ratón por encima)'}
                                  className={`shrink-0 rounded-md px-1.5 py-0.5 text-[13px] transition-colors ${showFlyout ? 'bg-forge-accent-soft text-forge-accent' : 'text-forge-faint hover:bg-forge-panel3 hover:text-forge-text'}`}
                                >
                                  ›
                                </button>
                              )}
                            </div>
                            {showFlyout && (
                              <div
                                className="absolute left-full top-0 z-[60] ml-1 w-44 rounded-xl border border-forge-border bg-forge-panel2 p-1.5 shadow-2xl"
                                onMouseEnter={() => setHoverKey(key)}
                              >
                                <p className="mono px-1 pb-1 text-[10px] uppercase tracking-wide text-forge-faint">
                                  Variante · {m.id.slice(0, 18)}
                                </p>
                                <button
                                  onClick={() => pickVariant(m, undefined)}
                                  className={`block w-full rounded-lg px-2 py-1 text-left text-[12px] transition-colors ${!value || value.id !== m.id || !value.variant ? '' : ''} ${sel && !value?.variant ? 'bg-forge-accent-soft font-bold' : 'hover:bg-forge-panel3'}`}
                                  title="La variante por defecto que defina el proveedor"
                                >
                                  Por defecto
                                </button>
                                {variants.map((v) => {
                                  const active = sel && value?.variant === v;
                                  return (
                                    <button
                                      key={v}
                                      onClick={() => pickVariant(m, v)}
                                      className={`block w-full rounded-lg px-2 py-1 text-left text-[12px] transition-colors ${active ? 'bg-forge-accent-soft font-bold text-forge-accent' : 'hover:bg-forge-panel3'}`}
                                    >
                                      {active ? '✓ ' : ''}{v}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            {groups.length === 0 && models.length > 0 && (
              <p className="p-2 text-[12px] text-forge-faint">Sin coincidencias para «{query}».</p>
            )}
          </div>
          <div className="border-t border-forge-border-soft px-2 py-1">
            <p className="mono text-center text-[10px] text-forge-faint">
              Se abre hacia arriba · › muestra variantes al pasar el ratón · Esc cierra
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
