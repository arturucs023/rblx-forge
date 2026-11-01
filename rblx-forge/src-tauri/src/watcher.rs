// RBLX Forge — vigilancia del directorio del proyecto (notify).
// Emite `forge:fs-changed {rel, kind}`; el frontend filtra con debounce y
// refresca el explorador. Solo lectura: nunca modifica archivos.

use notify::{Config, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter};

pub struct WatchState {
    pub watcher: Mutex<Option<RecommendedWatcher>>,
    pub root: Mutex<Option<PathBuf>>,
}

impl Default for WatchState {
    fn default() -> Self {
        Self { watcher: Mutex::new(None), root: Mutex::new(None) }
    }
}

fn kind_of(k: &EventKind) -> &'static str {
    match k {
        EventKind::Create(_) => "create",
        EventKind::Modify(_) => "modify",
        EventKind::Remove(_) => "remove",
        _ => "other",
    }
}

#[tauri::command]
pub fn fs_watch_start(app: AppHandle, state: tauri::State<WatchState>, project_dir: String) -> Result<bool, String> {
    let root = std::path::Path::new(&project_dir)
        .canonicalize()
        .map_err(|e| format!("canonicalize: {}", e))?;
    if !root.is_dir() {
        return Err("No es un directorio".to_string());
    }
    // Cerrar el anterior si lo hay.
    *state.watcher.lock().unwrap() = None;

    let h = app.clone();
    let root_clone = root.clone();
    let mut watcher = RecommendedWatcher::new(
        move |res: Result<notify::Event, notify::Error>| {
            let Ok(ev) = res else { return };
            let kind = kind_of(&ev.kind);
            if kind == "other" {
                return;
            }
            for p in ev.paths {
                let rel = p.strip_prefix(&root_clone).map(|x| x.to_string_lossy().replace('\\', "/")).unwrap_or_default();
                // Ignorar ruido interno.
                if rel.split('/').next().is_some_and(|d| matches!(d, ".git" | "target" | "node_modules" | "dist" | ".vscode")) {
                    continue;
                }
                let _ = h.emit("forge:fs-changed", serde_json::json!({ "rel": rel, "kind": kind }));
            }
        },
        Config::default(),
    )
    .map_err(|e| format!("watcher: {}", e))?;
    watcher.watch(&root, RecursiveMode::Recursive).map_err(|e| format!("watch: {}", e))?;
    *state.watcher.lock().unwrap() = Some(watcher);
    *state.root.lock().unwrap() = Some(root);
    Ok(true)
}

#[tauri::command]
pub fn fs_watch_stop(state: tauri::State<WatchState>) -> Result<bool, String> {
    let had = state.watcher.lock().unwrap().take().is_some();
    *state.root.lock().unwrap() = None;
    Ok(had)
}

#[cfg(test)]
mod watcher_tests {
    use super::*;
    use std::sync::mpsc;

    #[test]
    fn notify_detecta_escritura_real() {
        let dir = std::env::temp_dir().join(format!("forge-watch-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        let (tx, rx) = mpsc::channel();
        let mut w = RecommendedWatcher::new(
            move |res: Result<notify::Event, notify::Error>| {
                if let Ok(ev) = res {
                    let _ = tx.send(format!("{:?}", ev.kind));
                }
            },
            Config::default(),
        )
        .unwrap();
        w.watch(&dir, RecursiveMode::Recursive).unwrap();
        std::thread::sleep(std::time::Duration::from_millis(300));
        std::fs::write(dir.join("nuevo.txt"), "hola").unwrap();
        let mut got = Vec::new();
        let start = std::time::Instant::now();
        while start.elapsed() < std::time::Duration::from_secs(5) {
            if let Ok(k) = rx.recv_timeout(std::time::Duration::from_millis(500)) {
                got.push(k);
                if got.iter().any(|k| k.contains("Create")) {
                    break;
                }
            }
        }
        let _ = std::fs::remove_dir_all(&dir);
        assert!(got.iter().any(|k| k.contains("Create")), "eventos: {:?}", got);
    }
}
