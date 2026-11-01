// Rutas configurables de RBLX Forge (fuente única).
// - `workspace.dir`: carpeta del ENTORNO (skills, referencias, herramientas).
// - `projects.parent`: carpeta donde se CREAN los juegos (puede ser otra).
// Nada hardcodeado: todo sale de estos ajustes, con selector de carpetas.
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';

export const KEY_WORKSPACE = 'workspace.dir';
export const KEY_PARENT = 'projects.parent';

export async function getSetting(key: string): Promise<string> {
  try {
    const v = await invoke<string | null>('settings_get', { key });
    if (typeof v === 'string' && v.trim()) return v.trim();
  } catch { /* sin configurar o backend antiguo */ }
  return '';
}

export async function setSetting(key: string, value: string): Promise<void> {
  const v = value.trim();
  if (!v) throw new Error('La ruta está vacía');
  await invoke('settings_set', { key, value: v });
  // Verificación de lectura: si el backend no persiste, se nota aquí mismo.
  const back = await getSetting(key);
  if (back !== v) throw new Error('El ajuste no quedó guardado (relee distinto)');
}

export async function getWorkspaceDir(): Promise<string> {
  return getSetting(KEY_WORKSPACE);
}

export async function getProjectsParent(): Promise<string> {
  return getSetting(KEY_PARENT);
}

/** Diálogo nativo de selección de carpeta. null = cancelado por el usuario. */
export async function pickDirectory(title: string): Promise<string | null> {
  try {
    const sel = await open({ directory: true, multiple: false, title });
    if (typeof sel === 'string' && sel.trim()) return sel.trim();
    return null;
  } catch (e) {
    throw new Error(`No se pudo abrir el selector: ${String(e).slice(0, 200)}`);
  }
}
