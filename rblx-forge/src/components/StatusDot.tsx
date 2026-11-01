export function StatusPill({ state, label, title }: { state: string; label: string; title?: string }) {
  const cls =
    state === 'conectado'
      ? 'pill pill-ok'
      : state === 'error' || state === 'no-encontrado'
        ? 'pill pill-err'
        : state === 'iniciando' || state === 'detectando'
          ? 'pill pill-warn'
          : 'pill pill-neutral';
  return (
    <span className={cls} title={title ?? label}>
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${state === 'conectado' ? 'bg-forge-ok' : state === 'iniciando' || state === 'detectando' ? 'dot-live bg-forge-warn' : state === 'error' || state === 'no-encontrado' ? 'bg-forge-err' : 'bg-forge-faint'}`} />
      {label}
    </span>
  );
}

export function ConnBadge() {
  return null;
}
