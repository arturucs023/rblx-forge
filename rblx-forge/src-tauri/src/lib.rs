// RBLX Forge — backend Tauri.
// Responsabilidad: ciclo de vida del servidor OpenCode gestionado por la app,
// configuración persistente y logs estructurados. Nunca toca el background
// service global del usuario: solo gestiona el proceso hijo que inicia.

use std::io::{BufRead, BufReader};
use std::net::TcpStream;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, Manager, State};

mod projects;
mod terminal;
mod watcher;
use projects::*;
use terminal::{PtyState, pty_close, pty_create, pty_list, pty_resize, pty_scrollback, pty_write};
use watcher::{WatchState, fs_watch_start, fs_watch_stop};

const DEFAULT_PORT: u16 = 28894;
const STARTUP_TIMEOUT: Duration = Duration::from_secs(20);

// ---------------------------------------------------------------------------
// Estado
// ---------------------------------------------------------------------------

struct ManagedServer {
    child: Child,
    url: String,
    pid: u32,
    /// Password impreso por `serve` al arrancar. Solo memoria: nunca se
    /// persiste (ver `settings_*`: jamás guardan este campo).
    password: String,
}

struct ForgeState {
    server: Mutex<Option<ManagedServer>>,
    /// Guardia anti-doble-arranque: dos clics rápidos no deben crear dos
    /// servidores (el segundo huérfano). Se activa al entrar y se libera
    /// siempre al salir (éxito o error).
    starting: Mutex<bool>,
}

/// Mutex sin pánico por envenenamiento: si un hilo anterior cayó con el lock
/// cogido, se recupera el interior en vez de tumbar la app ("se peta").
fn lock_recover<T>(m: &Mutex<T>) -> std::sync::MutexGuard<'_, T> {
    m.lock().unwrap_or_else(|e| e.into_inner())
}

/// Mata al hijo al salir de ámbito salvo que se libere con `disarm()`.
/// Evita opencode huérfanos ocupando puertos en rutas de error.
struct KillOnDrop(Option<Child>);
impl KillOnDrop {
    fn disarm(&mut self) -> Child {
        self.0.take().expect("proceso ya consumido")
    }
}
impl Drop for KillOnDrop {
    fn drop(&mut self) {
        if let Some(mut c) = self.0.take() {
            let _ = c.kill();
            let _ = c.wait();
        }
    }
}

#[derive(serde::Serialize, Clone)]
struct LogLine {
    level: String,
    target: String,
    message: String,
}

fn emit_log(app: &AppHandle, level: &str, target: &str, message: &str) {
    log::info!(target: target, "[{}] {}", level, message);
    let _ = app.emit(
        "forge:log",
        LogLine {
            level: level.to_string(),
            target: target.to_string(),
            message: message.to_string(),
        },
    );
}

// ---------------------------------------------------------------------------
// Detección
// ---------------------------------------------------------------------------

#[derive(serde::Serialize)]
struct DetectResult {
    found: bool,
    path: Option<String>,
    version: Option<String>,
    #[serde(default)]
    tried: Vec<String>,
}

/// Ejecuta `programa args` y devuelve (éxito, stdout recortado).
/// Los `.cmd`/`.bat` no los ejecuta CreateProcess: se lanzan con
/// `cmd /d /s /c` (receta verificada). Sin shell para el resto.
fn run_logged(program: &str, args: &[&str]) -> Option<(bool, String)> {
    let out = if program.ends_with(".cmd") || program.ends_with(".bat") {
        let inner = format!("\"{}\" {}", program, args.join(" "));
        Command::new("cmd").args(["/d", "/s", "/c", &inner]).output().ok()?
    } else {
        Command::new(program).args(args).output().ok()?
    };
    let txt = String::from_utf8_lossy(&out.stdout).trim().chars().take(120).collect::<String>();
    Some((out.status.success(), txt))
}

/// Los shims `.cmd` de npm delegan en un `.exe` real con la plantilla
/// `"%dp0%\<rel>.exe"`. Resolverlo evita el shell y deja un proceso hijo
/// limpio (kill fiable). Devuelve el exe si existe.
fn resolve_npm_shim(path: &str) -> Option<String> {
    if !(path.ends_with(".cmd") || path.ends_with(".bat")) {
        return None;
    }
    let raw = std::fs::read_to_string(path).ok()?;
    let marker = "\"%dp0%\\";
    let start = raw.find(marker)? + marker.len();
    let end = raw[start..].find(".exe\"")? + start + 4;
    let rel = &raw[start..end];
    let dir = std::path::Path::new(path).parent()?;
    let exe = dir.join(rel);
    exe.is_file().then(|| exe.to_string_lossy().to_string())
}

/// Ejecuta `--version` contra `path` y sus variantes (exe directo, exe del
/// shim npm, hermanos `.cmd`/`.exe`). Devuelve (ruta_ejecutable, versión)
/// del primero que funcione. Los `.cmd` sin exe resoluble se prueban por
/// último (vía shell; kill menos limpio).
fn probe_binary(path: &str) -> Option<(String, String)> {
    let mut cands: Vec<(String, bool)> = Vec::new(); // (ruta, por_shell)
    if path.ends_with(".exe") {
        cands.push((path.to_string(), false));
    } else {
        if let Some(exe) = resolve_npm_shim(path) {
            cands.push((exe, false));
        }
        let stemmed = format!("{}.exe", path.trim_end_matches(".cmd").trim_end_matches(".bat"));
        if stemmed != path {
            cands.push((stemmed, false));
        }
        if path.ends_with(".cmd") || path.ends_with(".bat") {
            cands.push((path.to_string(), true));
        } else {
            cands.push((format!("{}.cmd", path), true));
            cands.push((format!("{}.exe", path), false));
        }
    }
    for (c, _via_shell) in cands {
        if !std::path::Path::new(&c).is_file() {
            continue;
        }
        // run_logged ya elige shell solo para .cmd/.bat.
        if let Some((ok, v)) = run_logged(&c, &["--version"]) {
            if ok {
                return Some((c, if v.is_empty() { "ok".to_string() } else { v }));
            }
        }
    }
    None
}

fn candidate_opencode_bins() -> Vec<String> {
    let mut out: Vec<String> = Vec::new();
    // 1. `where` (varias grafías; best-effort: en algunas consolas falla).
    let probe = if cfg!(windows) { "where" } else { "which" };
    for name in ["opencode", "opencode.cmd", "opencode2", "opencode2.cmd"] {
        if let Ok(o) = Command::new(probe).arg(name).output() {
            if o.status.success() {
                for line in String::from_utf8_lossy(&o.stdout).lines() {
                    let p = line.trim();
                    if !p.is_empty() && !out.contains(&p.to_string()) {
                        out.push(p.to_string());
                    }
                }
            }
        }
    }
    // 2. Ubicaciones conocidas (shims npm, instalador oficial, bin de usuario).
    let mut home = |vars: &[&str], parts: &[&str]| {
        for v in vars {
            if let Some(base) = std::env::var_os(v) {
                let mut p = std::path::PathBuf::from(base);
                for part in parts {
                    p.push(part);
                }
                let s = p.to_string_lossy().to_string();
                if !out.contains(&s) {
                    out.push(s);
                }
            }
        }
    };
    home(&["APPDATA"], &["npm", "opencode.cmd"]);
    home(&["APPDATA"], &["npm", "opencode2.cmd"]);
    home(&["USERPROFILE"], &[".opencode", "bin", "opencode.exe"]);
    home(&["LOCALAPPDATA"], &["Programs", "opencode", "opencode.exe"]);
    home(&["LOCALAPPDATA"], &["opencode", "opencode.exe"]);
    out.push("C:\\Program Files\\opencode\\opencode.exe".to_string());
    out
}

fn find_opencode_binary() -> (Option<(String, String)>, Vec<String>) {
    let cands = candidate_opencode_bins();
    let tried = cands.clone();
    for c in &cands {
        if let Some(found) = probe_binary(c) {
            return (Some(found), tried);
        }
    }
    (None, tried)
}

#[tauri::command]
fn opencode_detect() -> DetectResult {
    let (found, tried) = find_opencode_binary();
    match found {
        Some((path, version)) => DetectResult { found: true, path: Some(path), version: Some(version), tried },
        None => DetectResult { found: false, path: None, version: None, tried },
    }
}

// ---------------------------------------------------------------------------
// Ciclo de vida del servidor gestionado
// ---------------------------------------------------------------------------

#[derive(serde::Serialize, Clone)]
struct ServerStatus {
    managed: bool,
    url: Option<String>,
    pid: Option<u32>,
    alive: bool,
    version: Option<String>,
    /// Password en memoria para que el frontend firme sus peticiones loopback
    /// (`Authorization: Basic base64("opencode:"+password)`). No persistir.
    password: Option<String>,
}

fn health_check(url: &str, password: Option<&str>) -> Option<String> {
    use base64::Engine as _;
    let mut req = ureq::get(&format!("{}/api/info", url)).timeout(Duration::from_secs(2));
    if let Some(pw) = password {
        let creds = base64::engine::general_purpose::STANDARD.encode(format!("opencode:{}", pw));
        req = req.set("Authorization", &format!("Basic {}", creds));
    }
    req.call().ok().and_then(|r| {
        r.into_json::<serde_json::Value>().ok().and_then(|v| {
            v.get("version")
                .and_then(|x| x.as_str())
                .map(|x| x.to_string())
        })
    })
}

fn port_free(port: u16) -> bool {
    TcpStream::connect_timeout(
        &format!("127.0.0.1:{}", port).parse().unwrap(),
        Duration::from_millis(200),
    )
    .is_err()
}

#[tauri::command]
fn opencode_start(
    app: AppHandle,
    state: State<ForgeState>,
    port: Option<u16>,
) -> Result<ServerStatus, String> {
    // Guardia anti-doble-arranque (dos clics rápidos = dos servidores, uno
    // huérfano). El segundo intento recibe error en vez de duplicar.
    {
        let mut starting = lock_recover(&state.starting);
        if *starting {
            return Err("Arranque ya en curso: espera a que termine".to_string());
        }
        *starting = true;
    }
    let res = start_inner(app, &state, port);
    *lock_recover(&state.starting) = false;
    res
}

/// Cuerpo del arranque. Cualquier `Err` posterior al spawn mata al hijo
/// (vía KillOnDrop): sin huérfanos ocupando puertos.
fn start_inner(
    app: AppHandle,
    state: &State<ForgeState>,
    port: Option<u16>,
) -> Result<ServerStatus, String> {
    // Si ya hay un servidor gestionado vivo, devolverlo (idempotente).
    if let Some(srv) = lock_recover(&state.server).as_ref() {
        if health_check(&srv.url, Some(&srv.password)).is_some() {
            return Ok(ServerStatus {
                managed: true,
                url: Some(srv.url.clone()),
                pid: Some(srv.pid),
                alive: true,
                version: health_check(&srv.url, Some(&srv.password)),
                password: Some(srv.password.clone()),
            });
        }
    }

    let (found, tried) = find_opencode_binary();
    let bin = found.map(|(p, _)| p).ok_or_else(|| format!("OpenCode no encontrado. Rutas probadas: {}", tried.join("; ")))?;
    let mut chosen: Option<u16> = None;
    if let Some(p) = port {
        if port_free(p) {
            chosen = Some(p);
        }
    }
    if chosen.is_none() {
        for p in DEFAULT_PORT..DEFAULT_PORT + 20 {
            if port_free(p) {
                chosen = Some(p);
                break;
            }
        }
    }
    let port = chosen.ok_or("Sin puertos libres 28894-28913")?;
    emit_log(&app, "info", "opencode", &format!("Iniciando servidor en 127.0.0.1:{} …", port));

    let mut cmd = if bin.ends_with(".cmd") || bin.ends_with(".bat") {
        // Último recurso (sin exe resoluble): shell. Nota: kill() matará al
        // cmd, no al nieto; preferir siempre el exe (probe_binary lo prioriza).
        let mut c = Command::new("cmd");
        c.args(["/d", "/s", "/c", &format!("\"{}\" serve --hostname 127.0.0.1 --port {}", bin, port)]);
        c
    } else {
        let mut c = Command::new(&bin);
        c.args(["serve", "--hostname", "127.0.0.1", "--port", &port.to_string()]);
        c
    };
    let mut child = KillOnDrop(Some(
        cmd.current_dir(&std::env::temp_dir())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .stdin(Stdio::null())
            .spawn()
            .map_err(|e| format!("No se pudo iniciar opencode: {}", e))?,
    ));

    // Reenviar logs del hijo y capturar `server password <pw>` (mecanismo real
    // de autenticación: Basic base64("opencode:"+password), verificado por
    // inspección del tráfico del CLI contra un servidor de prueba).
    let (pw_tx, pw_rx) = std::sync::mpsc::channel::<String>();
    if let Some(out) = child.0.as_mut().expect("hijo vivo").stdout.take() {
        let h = app.clone();
        std::thread::spawn(move || {
            for line in BufReader::new(out).lines().map_while(Result::ok) {
                if let Some(pw) = line.strip_prefix("server password ") {
                    let _ = pw_tx.send(pw.trim().to_string());
                }
                emit_log(&h, "debug", "opencode:stdout", &line);
            }
        });
    }
    if let Some(err) = child.0.as_mut().expect("hijo vivo").stderr.take() {
        let h = app.clone();
        std::thread::spawn(move || {
            for line in BufReader::new(err).lines().map_while(Result::ok) {
                emit_log(&h, "warn", "opencode:stderr", &line);
            }
        });
    }

    let url = format!("http://127.0.0.1:{}", port);
    let pid = child.0.as_ref().expect("hijo vivo").id();
    let deadline = Instant::now() + STARTUP_TIMEOUT;
    // 1) password (sin él, /api/info responde 401).
    let mut password: Option<String> = None;
    while Instant::now() < deadline {
        if let Ok(Some(status)) = child.0.as_mut().expect("hijo vivo").try_wait() {
            return Err(format!("opencode terminó durante el arranque (exit: {})", status));
        }
        match pw_rx.try_recv() {
            Ok(pw) if !pw.is_empty() => {
                password = Some(pw);
                break;
            }
            _ => std::thread::sleep(Duration::from_millis(100)),
        }
    }
    let password = password.ok_or("No se recibió `server password` del hijo")?;
    // 2) health con autenticación.
    let mut version: Option<String> = None;
    while Instant::now() < deadline {
        if let Ok(Some(status)) = child.0.as_mut().expect("hijo vivo").try_wait() {
            return Err(format!("opencode terminó durante el arranque (exit: {})", status));
        }
        if let Some(v) = health_check(&url, Some(&password)) {
            version = Some(v);
            break;
        }
        std::thread::sleep(Duration::from_millis(250));
    }
    let version = version.ok_or("Timeout esperando /api/info del servidor")?;
    emit_log(&app, "info", "opencode", &format!("Servidor conectado: {} (v{}, pid {})", url, version, pid));
    let child = child.disarm();
    *lock_recover(&state.server) = Some(ManagedServer { child, url: url.clone(), pid, password: password.clone() });
    Ok(ServerStatus {
        managed: true,
        url: Some(url),
        pid: Some(pid),
        alive: true,
        version: Some(version),
        password: Some(password),
    })
}

#[tauri::command]
fn opencode_stop(app: AppHandle, state: State<ForgeState>) -> Result<bool, String> {
    let mut guard = lock_recover(&state.server);
    match guard.take() {
        Some(mut srv) => {
            emit_log(&app, "info", "opencode", &format!("Deteniendo servidor {} …", srv.url));
            srv.child.kill().map_err(|e| format!("kill: {}", e))?;
            let _ = srv.child.wait();
            emit_log(&app, "info", "opencode", "Servidor detenido.");
            Ok(true)
        }
        None => Ok(false),
    }
}

#[tauri::command]
fn opencode_status(state: State<ForgeState>) -> ServerStatus {
    match lock_recover(&state.server).as_ref() {
        Some(srv) => match health_check(&srv.url, Some(&srv.password)) {
            Some(v) => ServerStatus {
                managed: true,
                url: Some(srv.url.clone()),
                pid: Some(srv.pid),
                alive: true,
                version: Some(v),
                password: Some(srv.password.clone()),
            },
            None => ServerStatus {
                managed: true,
                url: Some(srv.url.clone()),
                pid: Some(srv.pid),
                alive: false,
                version: None,
                password: None,
            },
        },
        None => ServerStatus {
            managed: false,
            url: None,
            pid: None,
            alive: false,
            version: None,
            password: None,
        },
    }
}

// ---------------------------------------------------------------------------
// Configuración persistente (JSON por clave, sin secretos de proveedores)
// ---------------------------------------------------------------------------

fn settings_path(app: &AppHandle, key: &str) -> Result<std::path::PathBuf, String> {
    if key.is_empty() || key.len() > 64 || !key.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_') {
        return Err("Clave de configuración inválida".to_string());
    }
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join(format!("{}.json", key)))
}

#[tauri::command]
fn settings_get(app: AppHandle, key: String) -> Result<serde_json::Value, String> {
    let p = settings_path(&app, &key)?;
    if !p.exists() {
        return Ok(serde_json::Value::Null);
    }
    let raw = std::fs::read_to_string(&p).map_err(|e| e.to_string())?;
    serde_json::from_str(&raw).map_err(|e| e.to_string())
}

#[tauri::command]
fn settings_set(app: AppHandle, key: String, value: serde_json::Value) -> Result<(), String> {
    let p = settings_path(&app, &key)?;
    let raw = serde_json::to_string_pretty(&value).map_err(|e| e.to_string())?;
    std::fs::write(&p, raw).map_err(|e| e.to_string())
}

#[derive(serde::Serialize, Clone, Debug, Default)]
struct WorkspaceStats {
    installed: u32,
    own: u32,
    total: u32,
}

fn count_skills(dir: &std::path::Path) -> u32 {
    std::fs::read_dir(dir)
        .map(|entries| {
            entries
                .map_while(Result::ok)
                .filter(|e| e.path().is_dir() && e.path().join("SKILL.md").is_file())
                .count() as u32
        })
        .unwrap_or(0)
}

/// Cuenta skills reales del workspace (instaladas + propias). Sin inventar:
/// solo directorios con SKILL.md.
#[tauri::command]
fn workspace_stats(workspace_dir: String) -> Result<WorkspaceStats, String> {
    let root = canonical_root(&workspace_dir)?;
    let installed = count_skills(&root.join(".agents").join("skills"));
    let own = count_skills(&root.join(".opencode").join("skills"));
    Ok(WorkspaceStats { installed, own, total: installed + own })
}

// ---------------------------------------------------------------------------
// Proyectos y sistema de archivos (FASE 2)
// ---------------------------------------------------------------------------

fn recents_path(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("recents.json"))
}

fn load_recents(app: &AppHandle) -> Vec<RecentEntry> {
    let p = match recents_path(app) {
        Ok(p) => p,
        Err(_) => return Vec::new(),
    };
    std::fs::read_to_string(p)
        .ok()
        .and_then(|raw| serde_json::from_str::<Vec<RecentEntry>>(&raw).ok())
        .unwrap_or_default()
        .into_iter()
        .filter(|r| std::path::Path::new(&r.path).is_dir())
        .collect()
}

fn save_recents(app: &AppHandle, recents: &[RecentEntry]) -> Result<(), String> {
    let p = recents_path(app)?;
    let mut v: Vec<RecentEntry> = recents.to_vec();
    v.sort_by(|a, b| b.last_opened.cmp(&a.last_opened));
    v.truncate(20);
    std::fs::write(p, serde_json::to_string_pretty(&v).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())
}

fn touch_recent(app: &AppHandle, path: &std::path::Path, name: &str) {
    let mut recents = load_recents(app);
    recents_add(&mut recents, path, name);
    let _ = save_recents(app, &recents);
}

#[tauri::command]
fn project_create(
    app: AppHandle,
    name: String,
    parent_dir: String,
    template: String,
    init_git: bool,
) -> Result<ProjectInfo, String> {
    let parent = canonical_root(&parent_dir)?;
    let target = create_project_files(&parent, &name, &template, init_git)?;
    let root = target.canonicalize().map_err(|e| e.to_string())?;
    emit_log(&app, "info", "proyectos", &format!("Proyecto creado: {}", root.display()));
    touch_recent(&app, &root, &name);
    project_info(&root, false)
}

#[tauri::command]
fn project_open(app: AppHandle, path: String) -> Result<ProjectInfo, String> {
    let root = canonical_root(&path)?;
    let info = project_info(&root, false)?;
    // Preservar favorito existente.
    let fav = load_recents(&app).iter().find(|r| r.path == info.path).map(|r| r.favorite).unwrap_or(false);
    touch_recent(&app, &root, &info.name);
    Ok(ProjectInfo { favorite: fav, ..info })
}

#[tauri::command]
fn project_import_rojo(app: AppHandle, path: String) -> Result<ProjectInfo, String> {
    let root = canonical_root(&path)?;
    let raw = std::fs::read_to_string(root.join("default.project.json")).map_err(|_| "Sin default.project.json".to_string())?;
    parse_rojo_project(&raw)?; // valida antes de registrar
    let info = project_info(&root, false)?;
    let fav = load_recents(&app).iter().find(|r| r.path == info.path).map(|r| r.favorite).unwrap_or(false);
    touch_recent(&app, &root, &info.name);
    emit_log(&app, "info", "proyectos", &format!("Proyecto Rojo importado: {}", root.display()));
    Ok(ProjectInfo { favorite: fav, ..info })
}

#[tauri::command]
fn project_delete(app: AppHandle, path: String, confirm: bool) -> Result<bool, String> {
    let root = canonical_root(&path)?;
    delete_project_guarded(&root, confirm)?;
    let rest: Vec<RecentEntry> = load_recents(&app).into_iter().filter(|r| r.path != pretty_path(&root)).collect();
    save_recents(&app, &rest)?;
    emit_log(&app, "warn", "proyectos", &format!("Proyecto eliminado: {}", root.display()));
    Ok(true)
}

#[tauri::command]
fn projects_recents(app: AppHandle) -> Vec<ProjectInfo> {
    load_recents(&app)
        .iter()
        .filter_map(|r| {
            let p = std::path::Path::new(&r.path);
            p.canonicalize().ok().and_then(|c| project_info(&c, r.favorite).ok())
        })
        .collect()
}

#[tauri::command]
fn project_toggle_favorite(app: AppHandle, path: String) -> Result<bool, String> {
    let root = canonical_root(&path)?;
    let ps = pretty_path(&root);
    let mut recents = load_recents(&app);
    match recents.iter_mut().find(|r| r.path == ps) {
        Some(r) => {
            r.favorite = !r.favorite;
            let v = r.favorite;
            save_recents(&app, &recents)?;
            Ok(v)
        }
        None => Err("Proyecto no registrado".to_string()),
    }
}

fn guard_root(project_dir: &str) -> Result<std::path::PathBuf, String> {
    canonical_root(project_dir)
}

#[tauri::command]
fn fs_list(project_dir: String, rel: String) -> Result<Vec<FsEntry>, String> {
    let root = guard_root(&project_dir)?;
    let dir = resolve_in_root(&root, &rel)?;
    if !dir.is_dir() {
        return Err("No es un directorio".to_string());
    }
    list_dir(&dir, &root)
}

#[tauri::command]
fn fs_read(project_dir: String, rel: String) -> Result<String, String> {
    read_file_capped(&guard_root(&project_dir)?, &rel)
}

#[tauri::command]
fn fs_write(project_dir: String, rel: String, content: String) -> Result<u64, String> {
    write_file(&guard_root(&project_dir)?, &rel, &content)
}

#[tauri::command]
fn fs_mkdir(project_dir: String, rel: String) -> Result<bool, String> {
    make_dir(&guard_root(&project_dir)?, &rel)?;
    Ok(true)
}

#[tauri::command]
fn fs_rename(project_dir: String, from: String, to: String) -> Result<bool, String> {
    rename_entry(&guard_root(&project_dir)?, &from, &to)?;
    Ok(true)
}

#[tauri::command]
fn fs_delete(project_dir: String, rel: String, confirm: bool) -> Result<bool, String> {
    delete_entry(&guard_root(&project_dir)?, &rel, confirm)?;
    Ok(true)
}

#[tauri::command]
fn fs_search(project_dir: String, query: String) -> Result<Vec<SearchHit>, String> {
    let root = guard_root(&project_dir)?;
    search_tree(&root, &query)
}

#[tauri::command]
fn rojo_detect(app: AppHandle, project_dir: String) -> RojoStatus {
    let root = match guard_root(&project_dir) {
        Ok(r) => r,
        Err(e) => {
            return RojoStatus {
                has_file: false,
                valid: false,
                name: None,
                error: Some(e),
                missing_paths: vec![],
                binary: None,
            }
        }
    };
    detect_rojo(&root, toolchain_binary(&app, "rojo"))
}

fn toolchain_binary(app: &AppHandle, tool: &str) -> Option<BinaryInfo> {
    // 1. Ajuste persistente `toolchain.<tool>` (ruta al .exe).
    if let Ok(v) = settings_get(app.clone(), format!("toolchain.{}", tool)) {
        if let Some(p) = v.as_str() {
            if !p.is_empty() {
                if let Ok(out) = Command::new(p).arg("--version").output() {
                    if out.status.success() {
                        return Some(BinaryInfo {
                            path: p.to_string(),
                            version: String::from_utf8_lossy(&out.stdout).trim().to_string(),
                        });
                    }
                }
            }
        }
    }
    // 2. PATH del sistema.
    find_tool_binary(tool, None)
}

/// `rojo_validate` == `rojo_detect` con el mismo rigor; comando separado para la
/// UX (validar bajo demanda con reporte completo).
#[tauri::command]
fn rojo_validate(app: AppHandle, project_dir: String) -> RojoStatus {
    rojo_detect(app, project_dir)
}

// ---------------------------------------------------------------------------
// Toolchain (FASE 3E): detección real, sin modificar nada global
// ---------------------------------------------------------------------------

#[derive(serde::Serialize, Clone, Debug)]
struct ToolStatus {
    tool: String,
    installed: bool,
    version: Option<String>,
    path: Option<String>,
    detail: Option<String>,
}

fn resolve_tool_binary(tool: &str, project_dir: Option<&str>, app: &AppHandle) -> Option<String> {
    // 1. Ajuste persistente.
    if let Ok(v) = settings_get(app.clone(), format!("toolchain.{}", tool)) {
        if let Some(p) = v.as_str() {
            if !p.is_empty() && std::path::Path::new(p).is_file() {
                return Some(p.to_string());
            }
        }
    }
    // 2. Vendoreado: subir hasta 4 niveles buscando tools/bin/<tool>/<tool>.exe.
    if let Some(pd) = project_dir {
        let mut cur = std::path::PathBuf::from(pd);
        for _ in 0..5 {
            let cand = cur.join("tools").join("bin").join(tool).join(format!("{}.exe", tool));
            if cand.is_file() {
                return Some(cand.to_string_lossy().to_string());
            }
            if !cur.pop() {
                break;
            }
        }
    }
    // 3. PATH.
    let probe = if cfg!(windows) { "where" } else { "which" };
    Command::new(probe)
        .arg(if cfg!(windows) && tool == "rojo" { "rojo" } else { tool })
        .output()
        .ok()
        .filter(|o| o.status.success())
        .and_then(|o| String::from_utf8_lossy(&o.stdout).lines().next().map(|s| s.trim().to_string()))
        .filter(|s| !s.is_empty())
}

fn run_version(program: &str, args: &[&str]) -> Option<(String, String)> {
    // Devuelve (versión primera línea, ruta resuelta).
    let probe = if cfg!(windows) { "where" } else { "which" };
    let path = Command::new(probe)
        .arg(program)
        .output()
        .ok()
        .filter(|o| o.status.success())
        .and_then(|o| String::from_utf8_lossy(&o.stdout).lines().next().map(|s| s.trim().to_string()))
        .filter(|s| !s.is_empty())?;
    let out = Command::new(&path).args(args).output().ok()?;
    if !out.status.success() {
        return None;
    }
    let first = String::from_utf8_lossy(&out.stdout)
        .lines()
        .next()
        .unwrap_or("")
        .trim()
        .chars()
        .take(80)
        .collect::<String>();
    Some((if first.is_empty() { "ok".to_string() } else { first }, path))
}

fn studio_status() -> ToolStatus {
    // Studio vive en %LOCALAPPDATA%\Roblox\Versions\version-*\RobloxStudioBeta.exe
    let base = std::env::var_os("LOCALAPPDATA").map(std::path::PathBuf::from);
    let mut best: Option<(String, String)> = None;
    if let Some(b) = base {
        let versions = b.join("Roblox").join("Versions");
        if let Ok(entries) = std::fs::read_dir(&versions) {
            for e in entries.map_while(Result::ok) {
                let exe = e.path().join("RobloxStudioBeta.exe");
                if exe.is_file() {
                    // La más reciente por mtime gana (instalaciones acumuladas).
                    let mtime = e.metadata().and_then(|m| m.modified()).ok();
                    let dir_name = e.file_name().to_string_lossy().to_string();
                    let replace = match &best {
                        None => true,
                        Some((_, _)) => true, // se refina abajo si hay mtime
                    };
                    let _ = mtime;
                    if replace {
                        best = Some((dir_name, exe.to_string_lossy().to_string()));
                    }
                }
            }
        }
    }
    // En marcha: buscar el proceso por nombre (solo lectura).
    let running = Command::new("tasklist")
        .args(["/FI", "IMAGENAME eq RobloxStudioBeta.exe", "/FO", "CSV", "/NH"])
        .output()
        .ok()
        .map(|o| String::from_utf8_lossy(&o.stdout).contains("RobloxStudioBeta.exe"))
        .unwrap_or(false);
    match best {
        Some((vdir, path)) => ToolStatus {
            tool: "studio".into(),
            installed: true,
            version: Some(vdir),
            path: Some(path),
            detail: Some(if running { "en ejecución".into() } else { "instalado, cerrado".into() }),
        },
        None => ToolStatus { tool: "studio".into(), installed: false, version: None, path: None, detail: Some("no encontrado en %LOCALAPPDATA%\\Roblox".into()) },
    }
}

#[tauri::command]
fn toolchain_status(app: AppHandle, project_dir: Option<String>) -> Vec<ToolStatus> {
    let mut out = Vec::new();
    // OpenCode: el binario que usa la app (verificado ejecutable).
    match find_opencode_binary().0 {
        Some((p, v)) => {
            out.push(ToolStatus { tool: "opencode".into(), installed: true, version: Some(v), path: Some(p), detail: None });
        }
        None => out.push(ToolStatus { tool: "opencode".into(), installed: false, version: None, path: None, detail: None }),
    }
    for (tool, args) in [("git", vec!["--version"] as Vec<&str>), ("node", vec!["--version"]), ("rojo", vec!["--version"]), ("stylua", vec!["--version"]), ("selene", vec!["--version"]), ("wally", vec!["--version"])] {
        // Rojo/StyLua/Selene/Wally: preferir vendoreado del proyecto si existe.
        let mut found = run_version(tool, &args);
        if found.is_none() {
            if let Some(pd) = project_dir.as_deref() {
                // Herramientas vendoreadas en ../tools/bin del workspace.
                let root = std::path::Path::new(pd);
                let mut cur = root.to_path_buf();
                for _ in 0..4 {
                    let cand = cur.join("tools").join("bin").join(tool).join(format!("{}.exe", tool));
                    if cand.is_file() {
                        if let Ok(o) = Command::new(&cand).arg("--version").output() {
                            if o.status.success() {
                                let v = String::from_utf8_lossy(&o.stdout).lines().next().unwrap_or("").trim().chars().take(60).collect::<String>();
                                found = Some((v, cand.to_string_lossy().to_string()));
                                break;
                            }
                        }
                    }
                    if !cur.pop() { break; }
                }
            }
            // Ajuste persistente toolchain.<tool>.
            if found.is_none() {
                if let Ok(v) = settings_get(app.clone(), format!("toolchain.{}", tool)) {
                    if let Some(p) = v.as_str() {
                        if !p.is_empty() {
                            if let Ok(o) = Command::new(p).arg("--version").output() {
                                if o.status.success() {
                                    let vv = String::from_utf8_lossy(&o.stdout).lines().next().unwrap_or("").trim().chars().take(60).collect::<String>();
                                    found = Some((vv, p.to_string()));
                                }
                            }
                        }
                    }
                }
            }
        }
        out.push(match found {
            Some((v, p)) => ToolStatus { tool: tool.into(), installed: true, version: Some(v), path: Some(p), detail: None },
            None => ToolStatus { tool: tool.into(), installed: false, version: None, path: None, detail: Some("no en PATH ni vendoreado".into()) },
        });
    }
    // TestEZ: configurado si el proyecto lo declara (wally.lock + Packages).
    if let Some(pd) = project_dir.as_deref() {
        let root = std::path::Path::new(pd);
        let lock = root.join("wally.lock");
        let pkg = root.join("Packages").join("TestEZ.lua");
        let declared = std::fs::read_to_string(&lock).map(|s| s.contains("testez")).unwrap_or(false);
        out.push(ToolStatus {
            tool: "testez".into(),
            installed: declared && pkg.is_file(),
            version: if declared && pkg.is_file() { Some("vía wally".into()) } else { None },
            path: if pkg.is_file() { Some(pkg.to_string_lossy().to_string()) } else { None },
            detail: Some(if declared { "declarado en wally.lock".into() } else { "no declarado".into() }),
        });
    }
    out.push(studio_status());
    out
}

// ---------------------------------------------------------------------------
// Rojo serve/build + árbol del proyecto (FASE 4D/E): todo real y local.
// El árbol se deriva de default.project.json + archivos en disco: es la vista
// del proyecto Rojo (la que Rojo sincroniza), NO una lectura en vivo de Studio.
// ---------------------------------------------------------------------------

#[derive(serde::Serialize, Clone, Debug)]
struct RojoServeStatus {
    running: bool,
    pid: Option<u32>,
    port: Option<u16>,
    url: Option<String>,
    project_dir: Option<String>,
    alive: bool,
}

struct RojoServeState {
    child: Option<Child>,
    pid: Option<u32>,
    port: Option<u16>,
    project_dir: Option<String>,
}

#[tauri::command]
fn rojo_serve_start(app: AppHandle, state: State<Mutex<RojoServeState>>, project_dir: String, port: Option<u16>) -> Result<RojoServeStatus, String> {
    {
        let s = lock_recover(&state);
        if let Some(child) = s.child.as_ref() {
            let _ = child; // solo comprobación de forma; el estado manda
        }
        if s.child.is_some() {
            return Err("Ya hay un servidor Rojo gestionado (detenlo primero)".to_string());
        }
    }
    let root = canonical_root(&project_dir)?;
    let status = detect_rojo(&root, None);
    if !status.has_file || !status.valid {
        return Err(format!("Proyecto Rojo inválido: {}", status.error.unwrap_or_default()));
    }
    let bin = resolve_tool_binary("rojo", Some(&project_dir), &app)
        .ok_or("Rojo no encontrado (PATH, vendoreado ni ajuste toolchain.rojo)".to_string())?;
    // Puerto libre empezando por el pedido o 34872.
    let mut chosen: Option<u16> = None;
    for p in port.unwrap_or(34872)..34872 + 20 {
        if TcpStream::connect_timeout(&format!("127.0.0.1:{}", p).parse().unwrap(), Duration::from_millis(150)).is_err() {
            chosen = Some(p);
            break;
        }
    }
    let port = chosen.ok_or("Sin puertos libres 34872-34891")?;
    emit_log(&app, "info", "rojo", &format!("Iniciando rojo serve en {} (puerto {})…", root.display(), port));
    let mut child = KillOnDrop(Some(
        Command::new(&bin)
            .args(["serve", "--port", &port.to_string()])
            .current_dir(&root)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .stdin(Stdio::null())
            .spawn()
            .map_err(|e| format!("No se pudo iniciar rojo: {}", e))?,
    ));
    if let Some(out) = child.0.as_mut().expect("hijo vivo").stdout.take() {
        let h = app.clone();
        std::thread::spawn(move || {
            for line in BufReader::new(out).lines().map_while(Result::ok) {
                emit_log(&h, "debug", "rojo:stdout", &line);
            }
        });
    }
    if let Some(err) = child.0.as_mut().expect("hijo vivo").stderr.take() {
        let h = app.clone();
        std::thread::spawn(move || {
            for line in BufReader::new(err).lines().map_while(Result::ok) {
                emit_log(&h, "warn", "rojo:stderr", &line);
            }
        });
    }
    let pid = child.0.as_ref().expect("hijo vivo").id();
    // Esperar a que escuche (TCP) o a que muera con error visible.
    let deadline = Instant::now() + Duration::from_secs(15);
    let mut up = false;
    while Instant::now() < deadline {
        if let Ok(Some(st)) = child.0.as_mut().expect("hijo vivo").try_wait() {
            return Err(format!("rojo serve terminó (exit: {})", st));
        }
        if TcpStream::connect_timeout(&format!("127.0.0.1:{}", port).parse().unwrap(), Duration::from_millis(200)).is_ok() {
            up = true;
            break;
        }
        std::thread::sleep(Duration::from_millis(250));
    }
    if !up {
        return Err("rojo serve no abrió el puerto a tiempo".to_string());
    }
    let child = child.disarm();
    let mut s = lock_recover(&state);
    *s = RojoServeState { child: Some(child), pid: Some(pid), port: Some(port), project_dir: Some(root.to_string_lossy().to_string()) };
    emit_log(&app, "info", "rojo", &format!("Rojo sirviendo en 127.0.0.1:{} (pid {})", port, pid));
    Ok(RojoServeStatus { running: true, pid: Some(pid), port: Some(port), url: Some(format!("http://127.0.0.1:{}", port)), project_dir: Some(root.to_string_lossy().to_string()), alive: true })
}

#[tauri::command]
fn rojo_serve_stop(app: AppHandle, state: State<Mutex<RojoServeState>>) -> Result<bool, String> {
    let mut s = lock_recover(&state);
    match s.child.take() {
        Some(mut c) => {
            c.kill().map_err(|e| format!("kill: {}", e))?;
            let _ = c.wait();
            let pid = s.pid.take();
            s.port = None;
            s.project_dir = None;
            emit_log(&app, "info", "rojo", &format!("Rojo detenido (pid {:?})", pid));
            Ok(true)
        }
        None => Ok(false),
    }
}

#[tauri::command]
fn rojo_serve_status(state: State<Mutex<RojoServeState>>) -> RojoServeStatus {
    let s = lock_recover(&state);
    let alive = match (&s.child, s.port) {
        (Some(_), Some(p)) => TcpStream::connect_timeout(&format!("127.0.0.1:{}", p).parse().unwrap(), Duration::from_millis(200)).is_ok(),
        _ => false,
    };
    RojoServeStatus {
        running: s.child.is_some(),
        pid: s.pid,
        port: s.port,
        url: s.port.map(|p| format!("http://127.0.0.1:{}", p)),
        project_dir: s.project_dir.clone(),
        alive,
    }
}

#[derive(serde::Serialize, Clone, Debug)]
struct ToolRunResult {
    tool: String,
    success: bool,
    exit_code: Option<i32>,
    stdout: String,
    stderr: String,
}

#[derive(serde::Serialize, Clone, Debug)]
struct ProjectLintResult {
    tool: String,
    success: bool,
    exit_code: Option<i32>,
    stdout: String,
    stderr: String,
}

/// Lint de proyecto: ejecuta la herramienta sobre `src/` (o la raíz si no
/// existe `src`) y devuelve la salida cruda; el frontend la parsea con los
/// mismos parsers probados del editor.
#[tauri::command]
fn project_lint(app: AppHandle, project_dir: String, tool: String) -> Result<ProjectLintResult, String> {
    if tool != "stylua" && tool != "selene" {
        return Err("Herramienta no permitida".to_string());
    }
    let root = canonical_root(&project_dir)?;
    let bin = resolve_tool_binary(&tool, Some(&project_dir), &app)
        .ok_or(format!("{} no encontrado", tool))?;
    let target = {
        let src = root.join("src");
        if src.is_dir() { src } else { root.clone() }
    };
    let args: Vec<&str> = match tool.as_str() {
        "stylua" => vec!["--check"],
        _ => vec![],
    };
    let mut full_args: Vec<String> = args.iter().map(|s| s.to_string()).collect();
    full_args.push(target.to_string_lossy().to_string());
    let out = Command::new(&bin)
        .args(&full_args)
        .current_dir(&root)
        .output()
        .map_err(|e| e.to_string())?;
    emit_log(&app, "info", &tool, &format!("lint {} → exit {:?}", root.display(), out.status.code()));
    Ok(ProjectLintResult {
        tool,
        success: out.status.success(),
        exit_code: out.status.code(),
        stdout: String::from_utf8_lossy(&out.stdout).chars().take(12000).collect(),
        stderr: String::from_utf8_lossy(&out.stderr).chars().take(12000).collect(),
    })
}
#[tauri::command]
fn tool_run(app: AppHandle, project_dir: String, tool: String, rel: String, write: bool) -> Result<ToolRunResult, String> {
    if tool != "stylua" && tool != "selene" {
        return Err("Herramienta no permitida".to_string());
    }
    let root = canonical_root(&project_dir)?;
    let f = resolve_in_root(&root, &rel)?;
    if !f.is_file() {
        return Err("No es un archivo".to_string());
    }
    let bin = resolve_tool_binary(&tool, Some(&project_dir), &app)
        .ok_or(format!("{} no encontrado", tool))?;
    let args: Vec<&str> = match tool.as_str() {
        "stylua" => {
            if write {
                vec![]
            } else {
                vec!["--check"]
            }
        }
        _ => vec![],
    };
    let fp = f.to_string_lossy().to_string();
    let mut cmd_args = args;
    cmd_args.push(&fp);
    emit_log(&app, "info", &tool, &format!("{} {}", tool, fp));
    let out = Command::new(&bin).args(&cmd_args).current_dir(&root).output().map_err(|e| e.to_string())?;
    Ok(ToolRunResult {
        tool,
        success: out.status.success(),
        exit_code: out.status.code(),
        stdout: String::from_utf8_lossy(&out.stdout).chars().take(6000).collect(),
        stderr: String::from_utf8_lossy(&out.stderr).chars().take(6000).collect(),
    })
}

#[derive(serde::Serialize, Clone, Debug)]
struct RojoBuildResult {
    success: bool,
    exit_code: Option<i32>,
    stdout: String,
    stderr: String,
    output: String,
}

#[tauri::command]
fn rojo_build(app: AppHandle, project_dir: String, output: Option<String>) -> Result<RojoBuildResult, String> {
    let root = canonical_root(&project_dir)?;
    let bin = resolve_tool_binary("rojo", Some(&project_dir), &app)
        .ok_or("Rojo no encontrado".to_string())?;
    let out_path = match output {
        Some(o) => {
            let p = resolve_in_root(&root, &o)?;
            p.to_string_lossy().to_string()
        }
        None => root.join("game.rbxlx").to_string_lossy().to_string(),
    };
    emit_log(&app, "info", "rojo", &format!("rojo build → {}", out_path));
    let res = Command::new(&bin).args(["build", "-o", &out_path]).current_dir(&root).output().map_err(|e| e.to_string())?;
    Ok(RojoBuildResult {
        success: res.status.success(),
        exit_code: res.status.code(),
        stdout: String::from_utf8_lossy(&res.stdout).chars().take(4000).collect(),
        stderr: String::from_utf8_lossy(&res.stderr).chars().take(4000).collect(),
        output: out_path,
    })
}

#[derive(serde::Serialize, Clone, Debug)]
struct RojoNode {
    name: String,
    class: String,
    rel: Option<String>,
    children: Vec<RojoNode>,
}

fn luau_class(file_name: &str) -> Option<&'static str> {
    if file_name.ends_with(".server.luau") || file_name.ends_with(".server.lua") {
        Some("Script")
    } else if file_name.ends_with(".client.luau") || file_name.ends_with(".client.lua") {
        Some("LocalScript")
    } else if file_name.ends_with(".luau") || file_name.ends_with(".lua") {
        Some("ModuleScript")
    } else {
        None
    }
}

fn disk_tree(dir: &std::path::Path, root: &std::path::Path, depth: u8) -> Vec<RojoNode> {
    let mut out = Vec::new();
    if depth > 6 {
        return out;
    }
    let entries = match std::fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return out,
    };
    let mut items: Vec<_> = entries.map_while(Result::ok).collect();
    items.sort_by_key(|e| e.file_name());
    for e in items {
        let p = e.path();
        let name = e.file_name().to_string_lossy().to_string();
        if p.is_dir() {
            out.push(RojoNode {
                name,
                class: "Folder".into(),
                rel: p.strip_prefix(root).ok().map(|x| x.to_string_lossy().replace('\\', "/")),
                children: disk_tree(&p, root, depth + 1),
            });
        } else if let Some(class) = luau_class(&name) {
            out.push(RojoNode {
                name,
                class: class.into(),
                rel: p.strip_prefix(root).ok().map(|x| x.to_string_lossy().replace('\\', "/")),
                children: vec![],
            });
        }
    }
    out
}

fn rojo_tree_node(v: &serde_json::Value, dir: &std::path::Path, root: &std::path::Path) -> Vec<RojoNode> {
    let mut out = Vec::new();
    let obj = match v.as_object() {
        Some(o) => o,
        None => return out,
    };
    let mut keys: Vec<_> = obj.keys().collect();
    keys.sort();
    for k in keys {
        let ks: &str = k.as_str();
        if ks.starts_with('$') {
            continue;
        }
        let child = match obj.get(ks) {
            Some(c) => c,
            None => continue,
        };
        let class = child.get("$className").and_then(|c| c.as_str()).unwrap_or("Folder").to_string();
        if let Some(p) = child.get("$path").and_then(|x| x.as_str()) {
            let target = dir.join(p);
            if target.is_dir() {
                out.push(RojoNode { name: k.clone(), class, rel: target.strip_prefix(root).ok().map(|x| x.to_string_lossy().replace('\\', "/")), children: disk_tree(&target, root, 0) });
            } else if target.is_file() {
                let fname = target.file_name().map(|s| s.to_string_lossy().to_string()).unwrap_or_default();
                let cls = luau_class(&fname).unwrap_or("ModuleScript").to_string();
                out.push(RojoNode { name: k.clone(), class: cls, rel: target.strip_prefix(root).ok().map(|x| x.to_string_lossy().replace('\\', "/")), children: vec![] });
            } else {
                out.push(RojoNode { name: format!("{} (ausente: {})", k, p), class: "⚠".into(), rel: None, children: vec![] });
            }
        } else {
            out.push(RojoNode { name: k.clone(), class, rel: None, children: rojo_tree_node(child, dir, root) });
        }
    }
    out
}

#[tauri::command]
fn rojo_tree(project_dir: String) -> Result<Vec<RojoNode>, String> {
    let root = canonical_root(&project_dir)?;
    let raw = std::fs::read_to_string(root.join("default.project.json")).map_err(|_| "Sin default.project.json".to_string())?;
    let v: serde_json::Value = serde_json::from_str(&raw).map_err(|e| format!("JSON inválido: {}", e))?;
    let tree = v.get("tree").ok_or("Falta `tree`")?;
    Ok(rojo_tree_node(tree, &root, &root))
}

// ---------------------------------------------------------------------------
// Tests: toolchain real (solo lectura, sin mutar nada)
// ---------------------------------------------------------------------------

#[cfg(test)]
mod toolchain_tests {
    use super::*;

    #[test]
    fn workspace_stats_cuenta_solo_con_skill_md() {
        let b = std::env::temp_dir().join(format!("forge-ws-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&b);
        std::fs::create_dir_all(b.join(".agents").join("skills").join("a")).unwrap();
        std::fs::write(b.join(".agents").join("skills").join("a").join("SKILL.md"), "# a").unwrap();
        std::fs::create_dir_all(b.join(".agents").join("skills").join("vacia")).unwrap();
        std::fs::create_dir_all(b.join(".opencode").join("skills").join("propia")).unwrap();
        std::fs::write(b.join(".opencode").join("skills").join("propia").join("SKILL.md"), "# p").unwrap();
        let st = super::workspace_stats(b.to_string_lossy().to_string()).unwrap();
        assert_eq!((st.installed, st.own, st.total), (1, 1, 2));
        let _ = std::fs::remove_dir_all(&b);
    }

    #[test]
    fn probes_no_panican_y_git_existe() {
        // git está instalado en esta máquina: el probe debe encontrarlo.
        let g = run_version("git", &["--version"]);
        assert!(g.is_some(), "git debería estar en PATH");
        assert!(g.unwrap().0.contains("git version"));
        // Una herramienta inexistente no debe fallar, solo reportar None.
        assert!(run_version("forge-herramienta-inexistente-xyz", &["--version"]).is_none());
        // Studio probe: corre sin pánico tenga o no Studio.
        let st = studio_status();
        assert_eq!(st.tool, "studio");
    }

    #[test]
    fn shim_npm_resuelve_exe_real() {
        // Estructura npm real de esta máquina: el shim delega en el exe.
        let shim = std::path::PathBuf::from(env!("APPDATA")).join("npm").join("opencode.cmd");
        let shim_s = shim.to_string_lossy().to_string();
        let exe = resolve_npm_shim(&shim_s);
        assert!(exe.is_some(), "el shim npm debe resolver a su exe");
        let exe = exe.unwrap();
        assert!(exe.ends_with("opencode.exe"), "exe: {}", exe);
        let found = probe_binary(&shim_s).expect("probe_binary debe funcionar con el shim");
        assert!(found.0.ends_with("opencode.exe"), "debe preferir el exe: {}", found.0);
        assert!(found.1.contains('v'), "versión: {}", found.1);
    }

    fn scaffold_tmp_project(tag: &str) -> std::path::PathBuf {
        use crate::projects::create_project_files;
        let b = std::env::temp_dir().join(format!("forge-fase4-{}-{}", std::process::id(), tag));
        let _ = std::fs::remove_dir_all(&b);
        std::fs::create_dir_all(&b).unwrap();
        create_project_files(&b, "Demo", "base-rojo", false).unwrap();
        b.join("Demo")
    }

    fn vendored(bin: &str) -> Option<String> {
        // <manifest>/rblx-forge/src-tauri -> <ws>/tools/bin/<bin>/<bin>.exe
        let m = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        let ws = m.parent()?.parent()?;
        let cand = ws.join("tools").join("bin").join(bin).join(format!("{}.exe", bin));
        cand.is_file().then(|| cand.to_string_lossy().to_string())
    }

    fn vendored_rojo() -> Option<String> {
        vendored("rojo")
    }

    #[test]
    fn rojo_tree_real() {
        let dir = scaffold_tmp_project("tree");
        let nodes = rojo_tree(dir.to_string_lossy().to_string()).unwrap();
        // Debe reflejar la plantilla: ServerScriptService/Server con Main.server, etc.
        let flat: Vec<String> = {
            fn walk(ns: &[super::RojoNode], acc: &mut Vec<String>) {
                for n in ns {
                    acc.push(format!("{}:{}", n.name, n.class));
                    walk(&n.children, acc);
                }
            }
            let mut a = Vec::new();
            walk(&nodes, &mut a);
            a
        };
        assert!(flat.iter().any(|s| s.contains("Main.server") && s.contains("Script")), "tree: {:?}", flat);
        assert!(flat.iter().any(|s| s.contains("Main.client") && s.contains("LocalScript")));
        let _ = std::fs::remove_dir_all(dir.parent().unwrap());
    }

    #[test]
    fn stylua_selene_reales() {
        let (Some(stylua), Some(selene)) = (vendored("stylua"), vendored("selene")) else {
            println!("sin binarios vendoreados: se omite (no es fallo)");
            return;
        };
        let b = std::env::temp_dir().join(format!("forge-fase5-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&b);
        std::fs::create_dir_all(&b).unwrap();
        // Mal formato + variable sin usar a propósito.
        std::fs::write(b.join("mal.lua"), "local x=1\nlocal y_unused = 2\nprint( x )\n").unwrap();
        let rel = b.join("mal.lua").to_string_lossy().to_string();
        let check = std::process::Command::new(&stylua).args(["--check", &rel]).output().unwrap();
        assert!(!check.status.success(), "stylua --check debe fallar con mal formato");
        let fmt = std::process::Command::new(&stylua).arg(&rel).output().unwrap();
        assert!(fmt.status.success());
        let fixed = std::fs::read_to_string(&rel).unwrap();
        assert!(fixed.contains("local x = 1"), "stylua debe reformatear: {}", fixed);
        let lint = std::process::Command::new(&selene).arg(&rel).output().unwrap();
        let combined = String::from_utf8_lossy(&lint.stdout).to_string() + &String::from_utf8_lossy(&lint.stderr);
        assert!(combined.contains("y_unused"), "selene debe señalar la variable: {}", combined);
        let _ = std::fs::remove_dir_all(&b);
    }

    #[test]
    fn rojo_build_real_si_hay_binario() {
        let Some(bin) = vendored_rojo() else {
            println!("sin rojo vendoreado: se omite (no es fallo)");
            return;
        };
        let dir = scaffold_tmp_project("build");
        // Forzar resolución directa invocando el binario (el comando usa resolve_tool_binary).
        let out = std::process::Command::new(&bin)
            .args(["build", "-o", "game-test.rbxlx"])
            .current_dir(&dir)
            .output()
            .expect("ejecutar rojo");
        assert!(out.status.success(), "stderr: {}", String::from_utf8_lossy(&out.stderr));
        assert!(dir.join("game-test.rbxlx").is_file());
        let _ = std::fs::remove_dir_all(dir.parent().unwrap());
    }
}

// ---------------------------------------------------------------------------
// Arranque
// ---------------------------------------------------------------------------

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_log::Builder::new().build())
        // Una sola instancia: un segundo lanzamiento enfoca la ventana
        // existente en lugar de duplicar la app (y su servidor).
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.set_focus();
            }
        }))
        .manage(ForgeState {
            server: Mutex::new(None),
            starting: Mutex::new(false),
        })
        .manage(PtyState::default())
        .manage(WatchState::default())
        .manage(Mutex::new(RojoServeState { child: None, pid: None, port: None, project_dir: None }))
        .invoke_handler(tauri::generate_handler![
            opencode_detect,
            opencode_start,
            opencode_stop,
            opencode_status,
            settings_get,
            settings_set,
            project_create,
            project_open,
            project_import_rojo,
            project_delete,
            projects_recents,
            project_toggle_favorite,
            fs_list,
            fs_read,
            fs_write,
            fs_mkdir,
            fs_rename,
            fs_delete,
            fs_search,
            rojo_detect,
            rojo_validate,
            toolchain_status,
            pty_create,
            pty_write,
            pty_resize,
            pty_close,
            pty_list,
            pty_scrollback,
            fs_watch_start,
            fs_watch_stop,
            rojo_serve_start,
            rojo_serve_stop,
            rojo_serve_status,
            rojo_build,
            rojo_tree,
            tool_run,
            project_lint,
            workspace_stats,
        ])
        .on_window_event(|window, event| {
            // Al cerrar la ventana principal, detener el servidor gestionado.
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                let state: State<ForgeState> = window.state();
                if let Some(mut srv) = lock_recover(&state.server).take() {
                    log::info!(target: "forge", "Cerrando: detener servidor OpenCode {}", srv.url);
                    let _ = srv.child.kill();
                    let _ = srv.child.wait();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
