// Selector de modelo + variante compartido (Asistente y Orquestador).
// Los modelos y variantes salen del servidor (getVariants); nada inventado.
import { useState } from 'react';
import { useSessions } from '../stores/sessions';
import type { ModelInfo } from '../lib/opencode';
import { getVariants } from '../lib/model-variants';

export interface ModelValue {
  providerID: string;
  id: string;
  variant?: string;
}

function costLabel(m: ModelInfo): string {
  const c = m.cost?.[0];
  if (!c) return 'coste n/d';
  const inp = typeof c.input === 'number' ? c.input : null;
  const out = typeof c.output === 'number' ? c.output : null;
  if (inp === 0 && out === 0) return 'gratis';
  const f = (v: number | null) => (v === null ? '?' : `$${v}`);
  return `${f(inp)}/${f(out)} por 1M tokens`;
}

export function ModelPicker({ value, allowInherit, inheritLabel, onChange, disabled }: {
  value: ModelValue | null;
  allowInherit?: boolean;
  inheritLabel?: string;
  onChange: (v: ModelValue | null) => void;
  disabled?: boolean;
}) {
  const models = useSessions((s) => s.models);
  const [open, setOpen] = useState(false);
  const current = value ? models.find((m) => m.id === value.id && m.providerID === value.providerID) : null;
  const variants = getVariants(current);
  const byProvider = new Map<string, ModelInfo[]>();
  for (const m of models) {
    const arr = byProvider.get(m.providerID) ?? [];
    arr.push(m);
    byProvider.set(m.providerID, arr);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="mono text-[12px] font-bold text-forge-accent">
          {value ? `${value.providerID}/${value.id}` : (allowInherit ? (inheritLabel ?? 'Heredado') : '(sin modelo)')}
        </span>
        {value?.variant && <span className="pill pill-ok">{value.variant}</span>}
        {current && <span className="mono text-[11px] text-forge-muted">{costLabel(current)}</span>}
        <button onClick={() => setOpen((v) => !v)} disabled={disabled || models.length === 0} className="btn btn-ghost ml-auto !py-0.5 !text-[11px] disabled:opacity-50">
          {value ? 'Cambiar ▾' : allowInherit ? 'Fijar ▾' : 'Elegir ▾'}
        </button>
      </div>
      {open && (
        <>
          <select
            className="input mt-1 w-full"
            value={value ? `${value.providerID}\n${value.id}` : ''}
            disabled={disabled}
            onChange={(e) => {
              if (e.target.value === '' && allowInherit) {
                onChange(null);
              } else {
                const [providerID, id] = e.target.value.split('\n');
                if (providerID && id) onChange({ providerID, id });
              }
              setOpen(false);
            }}
          >
            {allowInherit && <option value="">{inheritLabel ?? 'Heredar'} ({models.length} disponibles)</option>}
            {!allowInherit && <option value="">Elegir modelo… ({models.length} disponibles)</option>}
            {[...byProvider.entries()].map(([prov, list]) => (
              <optgroup key={prov} label={prov}>
                {list.map((m) => {
                  const n = getVariants(m).length;
                  return (
                    <option key={`${prov}\n${m.id}`} value={`${prov}\n${m.id}`}>
                      {m.name || m.id} · {costLabel(m)}{n ? ` · ${n} variantes` : ''}
                    </option>
                  );
                })}
              </optgroup>
            ))}
          </select>
          {variants.length > 0 && value && (
            <select
              className="input mt-1 w-full"
              value={value.variant ?? ''}
              disabled={disabled}
              onChange={(e) => onChange({ ...value, variant: e.target.value || undefined })}
              title="Variante del modelo (la define el proveedor). Vacío = por defecto del servidor."
            >
              <option value="">Variante: por defecto del servidor</option>
              {variants.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          )}
        </>
      )}
    </div>
  );
}
