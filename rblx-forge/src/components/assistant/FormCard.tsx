// Tarjeta de formulario interactivo: el modelo propone, el usuario elige.
// Sin cambios de comportamiento respecto a la versión anterior del Asistente.
import { useEffect, useState } from 'react';
import { useSessions } from '../../stores/sessions';
import type { FormDetail } from '../../lib/opencode';
import { defaultValues, isSingleChoice, validateAnswer, type FieldValues } from '../../lib/forms';
import { openUrl } from '@tauri-apps/plugin-opener';

export function FormCard({ form }: { form: FormDetail }) {
  const st = useSessions.getState();
  const busy = useSessions((s) => s.busy);
  const [values, setValues] = useState<FieldValues>(() => defaultValues(form.fields));
  const [errs, setErrs] = useState<string[]>([]);
  useEffect(() => {
    setValues(defaultValues(form.fields));
    setErrs([]);
  }, [form.id]);
  const pending = form.state?.status === 'pending';

  if (!pending) {
    return (
      <div className="anim-fade mb-2 rounded-xl border border-forge-border-soft px-3 py-1.5 text-[12px] text-forge-faint">
        ☑ {form.title} — {form.state?.status === 'answered' ? 'respondido' : 'omitido'}
      </div>
    );
  }

  const set = (key: string, v: string | number | boolean | string[]) =>
    setValues((prev) => ({ ...prev, [key]: v }));

  const submit = async () => {
    const problems = validateAnswer(form.fields, values);
    setErrs(problems);
    if (problems.length) return;
    const answer: Record<string, unknown> = {};
    for (const f of form.fields) {
      if (f.hidden) continue;
      if (values[f.key] !== undefined) answer[f.key] = values[f.key];
    }
    await st.replyForm(form.id, answer);
  };

  return (
    <div className="anim-enter mb-2 rounded-xl border border-forge-accent-dim bg-forge-accent-soft px-3 py-2.5">
      <p className="mb-0.5 text-[13px] font-bold">❓ {form.title}</p>
      <p className="mb-2 text-[11px] text-forge-muted">El modelo te pide elegir para continuar.</p>
      {(form.fields ?? []).filter((f) => !f.hidden).map((f) => (
        <div key={f.key} className="mb-2">
          {(f.title || f.description) && (
            <p className="mb-1 text-[12px] font-semibold">
              {f.title || f.key}
              {f.required && <span className="text-forge-err"> *</span>}
              {f.description && <span className="ml-1 font-normal text-forge-muted">{f.description}</span>}
            </p>
          )}
          {f.type === 'multiselect' && isSingleChoice(f) && (
            <div className="flex flex-col gap-1">
              {(f.options ?? []).map((o) => {
                const sel = values[f.key] === o.value || (Array.isArray(values[f.key]) && (values[f.key] as string[])[0] === o.value);
                return (
                  <button
                    key={o.value}
                    onClick={() => set(f.key, o.value)}
                    className={`rounded-lg border px-2.5 py-1.5 text-left text-[12px] transition-colors ${sel ? 'border-forge-accent bg-forge-panel3 font-bold text-forge-accent' : 'border-forge-border hover:border-forge-accent-dim'}`}
                    title={o.description}
                  >
                    {o.label}
                    {o.description && <span className="block text-[11px] font-normal text-forge-muted">{o.description}</span>}
                  </button>
                );
              })}
            </div>
          )}
          {f.type === 'multiselect' && !isSingleChoice(f) && (
            <div className="flex flex-col gap-1">
              {(f.options ?? []).map((o) => {
                const arr = Array.isArray(values[f.key]) ? (values[f.key] as string[]) : [];
                const sel = arr.includes(o.value);
                return (
                  <button
                    key={o.value}
                    onClick={() => set(f.key, sel ? arr.filter((v) => v !== o.value) : [...arr, o.value])}
                    className={`rounded-lg border px-2.5 py-1.5 text-left text-[12px] transition-colors ${sel ? 'border-forge-accent bg-forge-panel3 font-bold text-forge-accent' : 'border-forge-border hover:border-forge-accent-dim'}`}
                    title={o.description}
                  >
                    {sel ? '☑ ' : '☐ '}{o.label}
                    {o.description && <span className="block text-[11px] font-normal text-forge-muted">{o.description}</span>}
                  </button>
                );
              })}
            </div>
          )}
          {f.type === 'boolean' && (
            <div className="flex gap-1">
              {[{ v: true, l: 'Sí' }, { v: false, l: 'No' }].map(({ v, l }) => (
                <button
                  key={l}
                  onClick={() => set(f.key, v)}
                  className={`btn ${values[f.key] === v ? 'btn-primary' : 'btn-ghost'}`}
                >
                  {l}
                </button>
              ))}
            </div>
          )}
          {(f.type === 'string' || f.type === 'number' || f.type === 'integer' || !f.type) && (
            <input
              value={typeof values[f.key] === 'string' || typeof values[f.key] === 'number' ? String(values[f.key]) : ''}
              onChange={(e) => {
                const raw = e.target.value;
                set(f.key, f.type === 'number' || f.type === 'integer' ? (raw.trim() === '' ? '' : Number(raw)) : raw);
              }}
              type={f.type === 'number' || f.type === 'integer' ? 'number' : 'text'}
              placeholder={f.title || f.key}
              className="input w-full"
            />
          )}
          {f.type === 'external' && (
            <button onClick={() => f.url && openUrl(f.url).catch(() => {})} className="btn btn-ghost" title={f.url}>
              Abrir recurso externo ↗
            </button>
          )}
        </div>
      ))}
      {errs.length > 0 && (
        <div className="mb-2 text-[12px] text-forge-err">
          {errs.map((e) => <p key={e}>· {e}</p>)}
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={submit} disabled={busy} className="btn btn-primary disabled:opacity-50">
          Enviar elección
        </button>
        <button onClick={() => st.cancelForm(form.id)} disabled={busy} className="btn btn-ghost disabled:opacity-50">
          Omitir
        </button>
      </div>
    </div>
  );
}
