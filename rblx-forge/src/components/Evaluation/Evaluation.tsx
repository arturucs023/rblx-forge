// Sección Skill Evaluation Engine: herramienta profesional, no demo.
// Todas las cifras vienen de eval.db vía el store; sin datos → estados vacíos.
import { useEffect, useRef, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useEval } from '../../stores/eval';
import { Overview } from './Overview';
import { Skills } from './Skills';
import { SkillDetailView } from './SkillDetail';
import { Benchmarks } from './Benchmarks';
import { Runs } from './Runs';
import { Compare } from './Compare';
import { Reports } from './Reports';

type Tab = 'resumen' | 'skills' | 'benchmarks' | 'runs' | 'comparar' | 'informes';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'skills', label: 'Skills' },
  { id: 'benchmarks', label: 'Benchmarks' },
  { id: 'runs', label: 'Runs' },
  { id: 'comparar', label: 'Comparar' },
  { id: 'informes', label: 'Informes' },
];

export function Evaluation() {
  const [tab, setTab] = useState<Tab>('resumen');
  const ready = useEval((s) => s.ready);
  const busy = useEval((s) => s.busy);
  const error = useEval((s) => s.error);
  const lastEvent = useEval((s) => s.lastEvent);
  const refreshAll = useEval((s) => s.refreshAll);
  const scan = useEval((s) => s.scan);
  const [scanMsg, setScanMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) refreshAll().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reutiliza el watcher EXISTENTE (forge:fs-changed, raíz = proyecto activo):
  // si el cambio toca las skills, re-escanea con debounce. Sin watcher propio.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    let off: (() => void) | null = null;
    listen<{ rel: string; kind: string }>('forge:fs-changed', (e) => {
      const rel = (e.payload?.rel ?? '').replace(/\\/g, '/');
      if (rel.startsWith('.agents/skills/') || rel.startsWith('.opencode/skills/')) {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          useEval.getState().scan().catch(() => {});
        }, 1500);
      }
    }).then((u) => { off = u; }).catch(() => {});
    return () => {
      if (timer.current) clearTimeout(timer.current);
      if (off) off();
    };
  }, []);

  const doScan = async () => {
    setScanMsg(null);
    try {
      await scan();
      setScanMsg('Registro actualizado.');
    } catch (e) {
      setScanMsg(String(e));
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-forge-border-soft px-3 py-2">
        <p className="font-bold">Skill Evaluation Engine</p>
        <span className="mono text-[11px] text-forge-faint">validación · benchmarks reales · regresión</span>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={doScan} disabled={busy} className="btn btn-ghost">Re-escanear</button>
          <button onClick={() => refreshAll()} disabled={busy} className="btn btn-ghost">{busy ? 'Cargando…' : 'Actualizar'}</button>
        </div>
      </div>
      {error && <p className="border-b border-forge-err/30 bg-forge-err-soft px-3 py-1 text-[12px] text-forge-err">{String(error).slice(0, 500)}</p>}
      {scanMsg && <p className="border-b border-forge-border-soft px-3 py-1 text-[12px] text-forge-muted">{scanMsg}</p>}
      <div className="flex gap-1 border-b border-forge-border-soft px-3 pt-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-t-md px-3 py-1.5 text-[12px] font-semibold ${tab === t.id ? 'bg-forge-panel3 text-forge-accent' : 'text-forge-muted hover:text-forge-text'}`}
          >
            {t.label}
          </button>
        ))}
        <span className="mono ml-auto hidden self-center text-[10px] text-forge-faint xl:block" title="Último evento Tauri del motor">{lastEvent ?? 'sin eventos'}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {tab === 'resumen' && <Overview />}
        {tab === 'skills' && <Skills onOpenSkill={() => {}} />}
        {tab === 'benchmarks' && <Benchmarks />}
        {tab === 'runs' && <Runs />}
        {tab === 'comparar' && <Compare />}
        {tab === 'informes' && <Reports />}
      </div>
      {/* Detalle de skill como panel superpuesto dentro de la pestaña Skills */}
      <SkillDetailView onBack={() => setTab('skills')} visible={tab === 'skills'} />
    </div>
  );
}
