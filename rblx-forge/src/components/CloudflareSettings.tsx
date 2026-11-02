// Ajustes de Cloudflare para el modo Imágenes (Configuración → Imágenes).
// El token viaja solo en memoria y se guarda en el archivo local de ajustes
// (`cloudflare.apiToken`); no se registra en logs ni se envía a ningún sitio
// salvo api.cloudflare.com. No lo compartas ni lo subas a git.
import { useEffect, useState } from 'react';
import { getSetting, setSetting } from '../lib/paths';

export const KEY_CF_ACCOUNT = 'cloudflare.accountId';
export const KEY_CF_TOKEN = 'cloudflare.apiToken';

export async function getCloudflareAccount(): Promise<string> {
  try {
    const v = await getSetting(KEY_CF_ACCOUNT);
    return v;
  } catch {
    return '';
  }
}

export async function getCloudflareToken(): Promise<string> {
  try {
    return await getSetting(KEY_CF_TOKEN);
  } catch {
    return '';
  }
}

export function CloudflareSettings() {
  const [account, setAccount] = useState('');
  const [token, setToken] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    getCloudflareAccount().then(setAccount).catch(() => {});
    getCloudflareToken().then(setToken).catch(() => {});
  }, []);

  const save = async () => {
    setErr(null);
    setMsg(null);
    if (!account.trim()) {
      setErr('Falta el Account ID.');
      return;
    }
    if (!token.trim()) {
      setErr('Falta el API token.');
      return;
    }
    setBusy(true);
    try {
      await setSetting(KEY_CF_ACCOUNT, account);
      await setSetting(KEY_CF_TOKEN, token);
      setMsg(`Guardado a las ${new Date().toLocaleTimeString()} (verificado por relectura).`);
    } catch (e) {
      setErr(String(e).slice(0, 300));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl p-3">
      <p className="mb-1 text-[12px] font-bold">Imágenes · Cloudflare Workers AI (FLUX.1 schnell)</p>
      <p className="mb-2 text-[11px] text-forge-muted">
        Cuenta gratuita de Cloudflare + token con permisos Workers AI (10.000 Neurons/día gratis).
        Cómo conseguirlo: panel de Cloudflare → Workers AI → «Usar API REST» → crear token y copiar el Account ID.
      </p>
      <label className="mb-2 block">
        <span className="mb-0.5 block text-[12px] text-forge-muted">Account ID</span>
        <input value={account} onChange={(e) => setAccount(e.target.value)} placeholder="p. ej. 0f1e…" autoComplete="off" spellCheck={false} className="input mono w-full !text-[12px]" />
      </label>
      <label className="mb-2 block">
        <span className="mb-0.5 block text-[12px] text-forge-muted">API token</span>
        <div className="flex gap-2">
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            type={show ? 'text' : 'password'}
            placeholder="••••••"
            autoComplete="off"
            spellCheck={false}
            className="input mono min-w-0 flex-1 !text-[12px]"
          />
          <button onClick={() => setShow((v) => !v)} className="btn btn-ghost shrink-0">
            {show ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>
      </label>
      {err && <p className="mb-1 text-[12px] text-forge-err">{err}</p>}
      {msg && <p className="mono mb-1 text-[11px] text-forge-ok">{msg}</p>}
      <div className="flex items-center gap-2">
        <button onClick={save} disabled={busy} className="btn btn-primary">
          Guardar credenciales
        </button>
        <span className={`mono text-[11px] ${token.trim() && account.trim() ? 'text-forge-ok' : 'text-forge-faint'}`}>
          {token.trim() && account.trim() ? 'Configurado' : 'Sin configurar'}
        </span>
      </div>
      <p className="mt-1 text-[11px] text-forge-faint">
        El token se guarda en local (carpeta de datos de la app) y solo se usa contra api.cloudflare.com.
      </p>
    </div>
  );
}
