// Primeros pasos: checklist con estado REAL (nada decorativo).
// Cada paso muestra si está hecho y lleva a la acción que lo completa.
import { useEffect, useState } from 'react';
import { useApp } from '../stores/app';
import { useProjects } from '../stores/projects';
import { getWorkspaceDir, getProjectsParent } from '../lib/paths';
import type { ModuleId } from './Sidebar';

export function FirstRun({ onGo }: { onGo: (m: ModuleId) => void }) {
  const conn = useApp((s) => s.conn);
  const detect = useApp((s) => s.detect);
  const detectOpencode = useApp((s) => s.detectOpencode);
  const startServer = useApp((s) => s.startServer);
  const active = useProjects((s) => s.active);
  const [ws, setWs] = useState<string | null>(null);
  const [parent, setParent] = useState<string | null>(null);

  useEffect(() => {
    getWorkspaceDir().then((d) => setWs(d || null)).catch(() => setWs(null));
    getProjectsParent().then((d) => setParent(d || null)).catch(() => setParent(null));
  }, [conn]);

  const steps = [
    {
      done: conn === 'conectado',
      title: 'Conecta OpenCode',
      hint: detect?.found === false
        ? 'No se encontró el binario: instálalo con npm i -g @opencode/cli y pulsa Detectar.'
        : 'El motor IA que hace todo el trabajo. Sin esto, el Asistente y el Orquestador esperan.',
      action: conn === 'conectado'
        ? null
        : (
          <span className="flex gap-1">
            <button onClick={() => detectOpencode()} className="btn btn-ghost !py-0.5 !text-[11px]">Detectar</button>
            <button onClick={() => startServer()} className="btn btn-primary !py-0.5 !text-[11px]">Iniciar y conectar</button>
          </span>
        ),
    },
    {
      done: !!ws && !!parent,
      title: 'Configura tus dos carpetas',
      hint: !ws
        ? 'Falta la carpeta del entorno (skills y herramientas).'
        : !parent
          ? 'Falta la carpeta donde se crean los juegos.'
          : `Entorno ✓ · Juegos ✓`,
      action: !ws || !parent
        ? <button onClick={() => onGo('configuracion')} className="btn btn-ghost !py-0.5 !text-[11px]">Ir a Configuración →</button>
        : null,
    },
    {
      done: !!active,
      title: 'Abre o crea un proyecto',
      hint: active ? `Trabajando en ${active.name}.` : 'Los proyectos vinculan sesiones, Rojo y Studio.',
      action: !active
        ? <button onClick={() => onGo('proyectos')} className="btn btn-ghost !py-0.5 !text-[11px]">Ir a Proyectos →</button>
        : null,
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  if (doneCount === steps.length) {
    return (
      <div className="card anim-enter mb-3 flex items-center gap-2 border-forge-ok/30 p-2.5">
        <span className="text-forge-ok">✓</span>
        <p className="text-[12px]"><span className="font-bold">Entorno listo.</span> <span className="text-forge-muted">Asistente, Evaluación y Orquestador operativos.</span></p>
      </div>
    );
  }

  return (
    <div className="card anim-enter mb-3 p-3">
      <p className="section-label mb-2">Primeros pasos ({doneCount}/{steps.length})</p>
      {steps.map((s, i) => (
        <div key={s.title} className="mb-1.5 flex items-center gap-2.5 last:mb-0">
          <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${s.done ? 'bg-forge-ok-soft text-forge-ok' : 'bg-forge-panel3 text-forge-accent'}`}>
            {s.done ? '✓' : i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className={`text-[12.5px] font-semibold ${s.done ? 'text-forge-muted line-through' : ''}`}>{s.title}</p>
            <p className="truncate text-[11px] text-forge-faint" title={s.hint}>{s.hint}</p>
          </div>
          {s.action}
        </div>
      ))}
    </div>
  );
}
