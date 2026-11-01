import { useState } from 'react';

interface Shot {
  url: string;
  name: string;
  size: number;
  width: number;
  height: number;
}

function useShot() {
  const [shot, setShot] = useState<Shot | null>(null);
  const load = (f: File | undefined) => {
    if (!f) return;
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      setShot((old) => {
        if (old) URL.revokeObjectURL(old.url);
        return null;
      });
      setShot({ url, name: f.name, size: f.size, width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = url;
  };
  return [shot, load] as const;
}

function Slot({ title, shot, load }: { title: string; shot: Shot | null; load: (f: File | undefined) => void }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="mb-1 flex items-center gap-2 text-[12px]">
        <span className="font-bold">{title}</span>
        <label className="cursor-pointer rounded border border-forge-border px-2 py-0.5 hover:text-forge-accent">
          Cargar imagen…
          <input type="file" accept="image/*" className="hidden" onChange={(e) => load(e.target.files?.[0])} />
        </label>
        {shot && <span className="mono text-[11px] text-forge-muted">{shot.name} · {shot.width}×{shot.height} · {(shot.size / 1024).toFixed(0)} KB</span>}
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto rounded border border-forge-border bg-forge-bg p-2">
        {shot ? <img src={shot.url} alt={shot.name} className="max-h-full max-w-full object-contain" /> : <p className="text-forge-muted">Sin imagen.</p>}
      </div>
    </div>
  );
}

// Comparador honesto de capturas aportadas por el usuario (antes/después
// manuales). No es un viewport 3D ni una vista en vivo de Studio: ver
// docs/VIEWPORT.md para las opciones investigadas y sus veredictos.
export function Viewport() {
  const [a, loadA] = useShot();
  const [b, loadB] = useShot();
  return (
    <div className="flex h-full flex-col p-2">
      <p className="mb-1 text-[12px] text-forge-muted">
        Comparador de capturas (archivos locales). No es una vista en vivo: consulta <span className="mono">docs/VIEWPORT.md</span>.
      </p>
      <div className="flex min-h-0 flex-1 gap-2">
        <Slot title="Antes / A" shot={a} load={loadA} />
        <Slot title="Después / B" shot={b} load={loadB} />
      </div>
    </div>
  );
}
