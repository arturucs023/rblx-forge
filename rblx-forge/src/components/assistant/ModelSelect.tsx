// Selector de modelo + variante para el Asistente.
// Búsqueda, agrupación por proveedor, coste real del servidor y variantes
// declaradas por cada modelo. Sin inventar nada: todo sale de /api/model.
import { useMemo, useState } from 'react';
import { useSessions } from '../../stores/sessions';
import type { ModelInfo } from '../../lib/opencode';
import { costLabel, filterModels, groupModelsByProvider, isFreeModel, variantCount } from '../../lib/chat/models';
import { getVariants } from '../../lib/model-variants';
import type { ModelValue } from '../ModelPicker';

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
  const current = value ? models.find((m) => m.id === value.id && m.providerID === value.providerID) : null;
  const variants = getVariants(current);
  const groups = useMemo(() => groupModelsByProvider(filterModels(models, query)), [models, query]);

  const pick = (m: ModelInfo) => {
    const same = value && value.id === m.id && value.providerID === m.providerID;
    onChange({ providerID: m.providerID, id: m.id, variant: same ? value?.variant : undefined });
  };

  return (
    <div className="relative">
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
        <span className="shrink-0 text-[11px] text-forge-faint">{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className="anim-enter absolute left-0 top-full z-50 mt-1 flex max-h-80 w-80 flex-col overflow-hidden rounded-xl border border-forge-border bg-forge-panel shadow-2xl">
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
            {groups.map((g) => (
              <div key={g.provider} className="mb-1">
                <p className="mono px-1.5 pb-0.5 pt-1 text-[10px] uppercase tracking-wide text-forge-faint">{g.provider}</p>
                {g.items.map((m) => {
                  const sel = !!value && value.id === m.id && value.providerID === m.providerID;
                  const free = isFreeModel(m);
                  const nv = variantCount(m);
                  return (
                    <button
                      key={`${m.providerID}\n${m.id}`}
                      onClick={() => pick(m)}
                      title={m.name || m.id}
                      className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors ${sel ? 'bg-forge-accent-soft' : 'hover:bg-forge-panel2'}`}
                    >
                      <span className={`w-4 shrink-0 text-center text-[12px] ${sel ? 'text-forge-accent' : 'text-transparent'}`}>✓</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-semibold text-forge-text">{m.name || m.id}</span>
                        <span className="mono block truncate text-[10px] text-forge-faint">
                          <span className={free ? 'text-forge-ok' : 'text-forge-muted'}>{costLabel(m)}</span>
                          {nv > 0 && <span> · {nv} variantes</span>}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
            {groups.length === 0 && models.length > 0 && (
              <p className="p-2 text-[12px] text-forge-faint">Sin coincidencias para «{query}».</p>
            )}
          </div>
          {value && variants.length > 0 && (
            <div className="border-t border-forge-border-soft p-2">
              <p className="section-label mb-1">Variante de {value.id}</p>
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => onChange({ ...value, variant: undefined })}
                  className={`btn !px-2 !py-0.5 !text-[11px] ${!value.variant ? 'btn-primary' : 'btn-ghost'}`}
                  title="La variante por defecto que defina el proveedor"
                >
                  Por defecto
                </button>
                {variants.map((v) => (
                  <button
                    key={v}
                    onClick={() => onChange({ ...value, variant: v })}
                    className={`btn !px-2 !py-0.5 !text-[11px] ${value.variant === v ? 'btn-primary' : 'btn-ghost'}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="border-t border-forge-border-soft px-2 py-1">
            <button onClick={() => setOpen(false)} className="w-full py-0.5 text-center text-[11px] text-forge-faint hover:text-forge-text">
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
