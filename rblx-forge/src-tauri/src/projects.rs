// RBLX Forge — gestión de proyectos y sistema de archivos con garantías.
// Todo acceso a disco pasa por `resolve_in_root`: canonicaliza y exige que el
// destino final viva dentro del directorio del proyecto (anti path traversal,
// resuelve `..` y symlinks y rechaza escapes).

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Component, Path, PathBuf};

// ---------------------------------------------------------------------------
// Validación de nombres
// ---------------------------------------------------------------------------

pub fn validate_project_name(name: &str) -> Result<(), String> {
    let t = name.trim();
    if t.is_empty() {
        return Err("El nombre está vacío".to_string());
    }
    if name != t || name.ends_with('.') {
        return Err("Sin espacios al inicio/fin ni punto final (Windows)".to_string());
    }
    if !(1..=64).contains(&name.chars().count()) {
        return Err("Longitud 1–64 caracteres".to_string());
    }
    if !name
        .chars()
        .all(|c| c.is_alphanumeric() || matches!(c, ' ' | '-' | '_' | '.'))
    {
        return Err("Solo letras, números, espacio, - _ .".to_string());
    }
    const RESERVED: [&str; 22] = [
        "CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7",
        "COM8", "COM9", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
    ];
    if RESERVED.contains(&t.to_uppercase().as_str()) {
        return Err("Nombre reservado de Windows".to_string());
    }
    Ok(())
}

// ---------------------------------------------------------------------------
// Resolución segura dentro de una raíz
// ---------------------------------------------------------------------------

pub fn canonical_root(dir: &str) -> Result<PathBuf, String> {
    let p = Path::new(dir);
    if !p.is_dir() {
        return Err(format!("No es un directorio: {}", dir));
    }
    p.canonicalize().map_err(|e| format!("canonicalize: {}", e))
}

/// Resuelve `rel` dentro de `root` (ya canonicalizada). Acepta rutas nuevas
/// (mkdir/write) canonicalizando el ancestro existente más cercano y
/// re-anexando el resto; rechaza escapes, absolutos y prefijos de unidad.
pub fn resolve_in_root(root: &Path, rel: &str) -> Result<PathBuf, String> {
    // Canonicalizar la raíz: en Windows produce forma verbatim (`\\?\C:\…`)
    // y solo así `starts_with` es fiable frente a `..` y symlinks.
    let root = root.canonicalize().map_err(|e| format!("canonicalize: {}", e))?;
    let rel_path = Path::new(rel);
    if rel_path.is_absolute() {
        return Err("Ruta absoluta no permitida".to_string());
    }
    if rel_path.components().any(|c| matches!(c, Component::Prefix(_))) {
        return Err("Prefijo de unidad no permitido".to_string());
    }
    if rel.is_empty() || rel == "." {
        return Ok(root);
    }
    let joined = root.join(rel_path);
    // Ancestro existente más cercano.
    let mut anc = joined.clone();
    let mut tail: Vec<std::ffi::OsString> = Vec::new();
    loop {
        if anc.exists() {
            break;
        }
        match anc.file_name() {
            Some(f) => {
                tail.push(f.to_os_string());
                if !anc.pop() {
                    return Err("Sin ancestro existente".to_string());
                }
            }
            None => return Err("Ruta inválida".to_string()),
        }
    }
    let mut canon = anc.canonicalize().map_err(|e| format!("canonicalize: {}", e))?;
    tail.reverse();
    for c in tail {
        canon.push(c);
    }
    if !canon.starts_with(root) {
        return Err("Fuera del directorio del proyecto (path traversal)".to_string());
    }
    Ok(canon)
}

// ---------------------------------------------------------------------------
// Descriptor de proyecto
// ---------------------------------------------------------------------------

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ForgeProjectFile {
    pub name: String,
    pub template: String,
    pub created_at: String,
    pub app: String,
}

#[derive(Serialize, Clone, Debug)]
pub struct ProjectInfo {
    pub name: String,
    pub path: String,
    pub modified: String,
    pub has_forge_file: bool,
    pub has_rojo: bool,
    pub has_git: bool,
    pub favorite: bool,
}

/// En Windows `canonicalize` devuelve rutas verbatim (`\\?\C:\…`); para
/// mostrar/almacenar se recorta el prefijo. Toda clave de proyecto usa esta
/// forma para mantener la coherencia.
pub fn pretty_path(p: &Path) -> String {
    let s = p.to_string_lossy();
    if let Some(rest) = s.strip_prefix(r"\\?\UNC\") {
        return format!(r"\\{}", rest);
    }
    if let Some(rest) = s.strip_prefix(r"\\?\") {
        return rest.to_string();
    }
    s.to_string()
}

pub fn project_info(dir: &Path, favorite: bool) -> Result<ProjectInfo, String> {
    let meta = fs::metadata(dir).map_err(|e| e.to_string())?;
    let modified: String = meta
        .modified()
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| format!("{}", d.as_secs()))
        .unwrap_or_default();
    let forge_file = dir.join("forge.project.json");
    let name = if forge_file.is_file() {
        fs::read_to_string(&forge_file)
            .ok()
            .and_then(|raw| serde_json::from_str::<ForgeProjectFile>(&raw).ok())
            .map(|f| f.name)
            .unwrap_or_else(|| dir_name(dir))
    } else {
        dir_name(dir)
    };
    Ok(ProjectInfo {
        name,
        path: pretty_path(dir),
        modified,
        has_forge_file: forge_file.is_file(),
        has_rojo: dir.join("default.project.json").is_file(),
        has_git: dir.join(".git").is_dir(),
        favorite,
    })
}

fn dir_name(dir: &Path) -> String {
    dir.file_name()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| "?".to_string())
}

// ---------------------------------------------------------------------------
// Plantillas reales (documentadas en docs/PROJECTS.md)
// ---------------------------------------------------------------------------

pub fn scaffold_files(template: &str, name: &str) -> Result<Vec<(String, String)>, String> {
    let created = "2026-11-01";
    let forge = serde_json::to_string_pretty(&ForgeProjectFile {
        name: name.to_string(),
        template: template.to_string(),
        created_at: created.to_string(),
        app: "rblx-forge@0.1.0".to_string(),
    })
    .unwrap();
    let minimal_rojo = serde_json::to_string_pretty(&serde_json::json!({
        "name": name,
        "servePort": 34872,
        "tree": {
            "$className": "DataModel",
            "ReplicatedStorage": { "$className": "ReplicatedStorage", "Shared": { "$path": "src/shared" } },
            "ServerScriptService": { "$className": "ServerScriptService", "Server": { "$path": "src/server" } },
            "StarterPlayer": { "$className": "StarterPlayer",
                "StarterPlayerScripts": { "$className": "StarterPlayerScripts", "Client": { "$path": "src/client" } } }
        }
    }))
    .unwrap();
    let stylua = "column_width = 120\nline_endings = \"Unix\"\nindent_type = \"Tabs\"\nquote_style = \"AutoPreferDouble\"\n";
    let selene = "std = \"roblox\"\n";
    match template {
        "vacio" => Ok(vec![
            ("forge.project.json".into(), forge),
            ("default.project.json".into(), minimal_rojo),
            (
                "README.md".into(),
                format!("# {}\n\nProyecto Rojo mínimo (plantilla `vacio`).\n", name),
            ),
        ]),
        "base-rojo" => Ok(vec![
            ("forge.project.json".into(), forge),
            ("default.project.json".into(), minimal_rojo),
            ("stylua.toml".into(), stylua.into()),
            ("selene.toml".into(), selene.into()),
            (
                "src/shared/Config.luau".into(),
                "--!strict\n-- Configuración compartida (solo datos; la autoridad vive en el servidor).\nlocal Config = {\n\tGAME_NAME = \"\",\n}\n\nreturn Config\n".into(),
            ),
            (
                "src/server/Main.server.luau".into(),
                "-- Arranque del servidor. Un bootstrap por juego; sin auto-runners sueltos.\nlocal ReplicatedStorage = game:GetService(\"ReplicatedStorage\")\n\nlocal function main(): ()\n\tprint(\"Servidor iniciado\")\nend\n\nmain()\n".into(),
            ),
            (
                "src/client/Main.client.luau".into(),
                "-- Arranque del cliente. Solo cosmética y entrada; nunca autoridad.\nlocal Players = game:GetService(\"Players\")\nlocal player = Players.LocalPlayer\n\nprint(\"Cliente listo para\", player.Name)\n".into(),
            ),
            (
                "tests/Example.spec.luau".into(),
                "-- Humo TestEZ: se ejecuta en Studio (no aquí).\nreturn function()\n\tdescribe(\"humo\", function()\n\t\tit(\"1 + 1 es 2\", function()\n\t\t\tassert(1 + 1 == 2)\n\t\tend)\n\tend)\nend\n".into(),
            ),
            (
                "README.md".into(),
                format!("# {}\n\nPlantilla `base-rojo`: bootstrap servidor/cliente, config compartida, spec TestEZ de humo.\n", name),
            ),
        ]),
        other => Err(format!("Plantilla desconocida: {}", other)),
    }
}

// ---------------------------------------------------------------------------
// Rojo: parse + validación real
// ---------------------------------------------------------------------------

#[derive(Serialize, Clone, Debug, Default)]
pub struct RojoStatus {
    pub has_file: bool,
    pub valid: bool,
    pub name: Option<String>,
    pub error: Option<String>,
    pub missing_paths: Vec<String>,
    pub binary: Option<BinaryInfo>,
}

#[derive(Serialize, Clone, Debug)]
pub struct BinaryInfo {
    pub path: String,
    pub version: String,
}

fn collect_paths(v: &serde_json::Value, out: &mut Vec<String>) {
    match v {
        serde_json::Value::Object(m) => {
            for (k, val) in m {
                if k == "$path" {
                    if let Some(s) = val.as_str() {
                        out.push(s.to_string());
                    }
                } else {
                    collect_paths(val, out);
                }
            }
        }
        serde_json::Value::Array(a) => a.iter().for_each(|x| collect_paths(x, out)),
        _ => {}
    }
}

pub fn parse_rojo_project(raw: &str) -> Result<(String, Vec<String>), String> {
    let v: serde_json::Value = serde_json::from_str(raw).map_err(|e| format!("JSON inválido: {}", e))?;
    let obj = v.as_object().ok_or("La raíz debe ser un objeto")?;
    let name = obj
        .get("name")
        .and_then(|n| n.as_str())
        .ok_or("Falta `name` (string)")?
        .to_string();
    obj.get("tree")
        .and_then(|t| t.as_object())
        .ok_or("Falta `tree` (objeto)")?;
    let mut paths = Vec::new();
    collect_paths(&v, &mut paths);
    Ok((name, paths))
}

pub fn find_tool_binary(name: &str, extra: Option<&str>) -> Option<BinaryInfo> {
    let mut cands: Vec<String> = Vec::new();
    if let Some(e) = extra {
        if !e.is_empty() {
            cands.push(e.to_string());
        }
    }
    // PATH
    let probe = if cfg!(windows) { "where" } else { "which" };
    if let Ok(out) = std::process::Command::new(probe).arg(name).output() {
        if out.status.success() {
            if let Some(first) = String::from_utf8_lossy(&out.stdout).lines().next() {
                let p = first.trim();
                if !p.is_empty() {
                    cands.push(p.to_string());
                }
            }
        }
    }
    let mut cands: Vec<String> = Vec::new();
    if let Some(e) = extra {
        if !e.is_empty() {
            cands.push(e.to_string());
        }
    }
    // PATH
    let probe = if cfg!(windows) { "where" } else { "which" };
    if let Ok(out) = std::process::Command::new(probe).arg(name).output() {
        if out.status.success() {
            if let Some(first) = String::from_utf8_lossy(&out.stdout).lines().next() {
                let p = first.trim();
                if !p.is_empty() {
                    cands.push(p.to_string());
                }
            }
        }
    }
    for c in cands {
        if let Ok(out) = std::process::Command::new(&c).arg("--version").output() {
            if out.status.success() {
                return Some(BinaryInfo {
                    path: c,
                    version: String::from_utf8_lossy(&out.stdout).trim().to_string(),
                });
            }
        }
    }
    None
}

// ---------------------------------------------------------------------------
// Entradas de directorio / búsqueda
// ---------------------------------------------------------------------------

#[derive(Serialize, Clone, Debug)]
pub struct FsEntry {
    pub name: String,
    pub rel: String,
    pub kind: String,
    pub size: Option<u64>,
    pub modified: Option<u64>,
}

pub fn list_dir(dir: &Path, root: &Path) -> Result<Vec<FsEntry>, String> {
    let mut out = Vec::new();
    for e in fs::read_dir(dir).map_err(|e| e.to_string())? {
        let e = e.map_err(|e| e.to_string())?;
        let p = e.path();
        let rel = p
            .strip_prefix(root)
            .map_err(|_| "fuera de raíz".to_string())?
            .to_string_lossy()
            .replace('\\', "/");
        let md = e.metadata().map_err(|e| e.to_string())?;
        out.push(FsEntry {
            name: e.file_name().to_string_lossy().to_string(),
            rel,
            kind: if md.is_dir() { "dir".into() } else { "file".into() },
            size: if md.is_file() { Some(md.len()) } else { None },
            modified: md
                .modified()
                .ok()
                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|d| d.as_secs()),
        });
    }
    out.sort_by(|a, b| (a.kind.clone(), a.name.clone()).cmp(&(b.kind.clone(), b.name.clone())));
    Ok(out)
}

const SKIP_DIRS: [&str; 6] = [".git", "target", "node_modules", "dist", "Packages", ".vscode"];

#[derive(Serialize, Clone, Debug)]
pub struct SearchHit {
    pub rel: String,
    pub line: u64,
    pub snippet: String,
}

pub fn search_tree(root: &Path, query: &str) -> Result<Vec<SearchHit>, String> {
    if query.len() < 2 || query.len() > 120 {
        return Err("Búsqueda de 2–120 caracteres".to_string());
    }
    let mut hits = Vec::new();
    let mut stack = vec![root.to_path_buf()];
    let mut files_seen = 0usize;
    while let Some(dir) = stack.pop() {
        let entries = match fs::read_dir(&dir) {
            Ok(e) => e,
            Err(_) => continue,
        };
        for e in entries.map_while(Result::ok) {
            let p = e.path();
            if p.is_dir() {
                if let Some(n) = p.file_name().and_then(|s| s.to_str()) {
                    if SKIP_DIRS.contains(&n) {
                        continue;
                    }
                }
                stack.push(p);
                continue;
            }
            let ext_ok = p
                .extension()
                .and_then(|s| s.to_str())
                .map(|x| matches!(x, "luau" | "lua" | "json" | "md" | "toml"))
                .unwrap_or(false);
            if !ext_ok {
                continue;
            }
            files_seen += 1;
            if files_seen > 2000 {
                return Ok(hits);
            }
            let md = match e.metadata() {
                Ok(m) => m,
                Err(_) => continue,
            };
            if md.len() > 1_000_000 {
                continue;
            }
            let content = match fs::read_to_string(&p) {
                Ok(c) => c,
                Err(_) => continue,
            };
            for (i, line) in content.lines().enumerate() {
                if line.contains(query) {
                    hits.push(SearchHit {
                        rel: p
                            .strip_prefix(root)
                            .map(|x| x.to_string_lossy().replace('\\', "/"))
                            .unwrap_or_default(),
                        line: (i + 1) as u64,
                        snippet: line.trim().chars().take(200).collect(),
                    });
                    if hits.len() >= 100 {
                        return Ok(hits);
                    }
                    break;
                }
            }
        }
    }
    Ok(hits)
}

// ---------------------------------------------------------------------------
// Núcleo puro de proyectos (sin AppHandle: testeable de forma aislada)
// ---------------------------------------------------------------------------

/// Crea la estructura del proyecto en `parent/name`. Devuelve la ruta final.
pub fn create_project_files(
    parent: &Path,
    name: &str,
    template: &str,
    init_git: bool,
) -> Result<PathBuf, String> {
    validate_project_name(name)?;
    if !parent.is_dir() {
        return Err("El directorio padre no existe".to_string());
    }
    let target = parent.join(name);
    if target.exists() {
        return Err("Ya existe esa carpeta".to_string());
    }
    for (rel, content) in scaffold_files(template, name)? {
        let dest = target.join(&rel);
        // `target` deriva de un nombre validado sin separadores y rels fijos de
        // plantilla: no puede escapar. Verificación defensiva de todos modos.
        if dest.parent().is_none() {
            return Err("Ruta de plantilla inválida".to_string());
        }
        if let Some(par) = dest.parent() {
            std::fs::create_dir_all(par).map_err(|e| e.to_string())?;
        }
        std::fs::write(&dest, content).map_err(|e| e.to_string())?;
    }
    if init_git {
        let out = std::process::Command::new("git")
            .args(["init", "--quiet"])
            .current_dir(&target)
            .output()
            .map_err(|_| "git no disponible en PATH".to_string())?;
        if !out.status.success() {
            return Err("git init falló".to_string());
        }
    }
    Ok(target)
}

/// Borrado con doble salvaguarda: confirmación + `forge.project.json` presente.
pub fn delete_project_guarded(root: &Path, confirm: bool) -> Result<(), String> {
    if !confirm {
        return Err("Confirmación requerida".to_string());
    }
    if !root.is_dir() {
        return Err("No existe".to_string());
    }
    if !root.join("forge.project.json").is_file() {
        return Err("Solo se eliminan proyectos con forge.project.json (protección)".to_string());
    }
    std::fs::remove_dir_all(root).map_err(|e| e.to_string())
}

pub fn recents_add(recents: &mut Vec<RecentEntry>, path: &Path, name: &str) {
    let ps = pretty_path(path);
    if let Some(r) = recents.iter_mut().find(|r| r.path == ps) {
        r.last_opened = now_secs();
        if r.name != name {
            r.name = name.to_string();
        }
    } else {
        recents.push(RecentEntry {
            path: ps,
            name: name.to_string(),
            last_opened: now_secs(),
            favorite: false,
        });
    }
    recents.sort_by(|a, b| b.last_opened.cmp(&a.last_opened));
    recents.truncate(20);
}

/// Detección Rojo pura: el binario se resuelve fuera (settings/PATH).
pub fn detect_rojo(root: &Path, binary: Option<BinaryInfo>) -> RojoStatus {
    let fp = root.join("default.project.json");
    if !fp.is_file() {
        return RojoStatus {
            has_file: false,
            valid: false,
            name: None,
            error: Some("Sin default.project.json".to_string()),
            missing_paths: vec![],
            binary,
        };
    }
    let raw = match std::fs::read_to_string(&fp) {
        Ok(r) => r,
        Err(e) => {
            return RojoStatus {
                has_file: true,
                valid: false,
                name: None,
                error: Some(e.to_string()),
                missing_paths: vec![],
                binary,
            }
        }
    };
    match parse_rojo_project(&raw) {
        Ok((name, paths)) => {
            let missing: Vec<String> = paths.iter().filter(|p| !root.join(p).exists()).cloned().collect();
            RojoStatus {
                has_file: true,
                valid: missing.is_empty(),
                name: Some(name),
                error: if missing.is_empty() { None } else { Some(format!("{} rutas ausentes en disco", missing.len())) },
                missing_paths: missing,
                binary,
            }
        }
        Err(e) => RojoStatus {
            has_file: true,
            valid: false,
            name: None,
            error: Some(e),
            missing_paths: vec![],
            binary,
        },
    }
}

pub fn write_file(root: &Path, rel: &str, content: &str) -> Result<u64, String> {
    if content.len() > 2_000_000 {
        return Err("Contenido > 2 MB".to_string());
    }
    let f = resolve_in_root(root, rel)?;
    if let Some(par) = f.parent() {
        std::fs::create_dir_all(par).map_err(|e| e.to_string())?;
    }
    std::fs::write(&f, content.as_bytes()).map_err(|e| e.to_string())?;
    Ok(content.len() as u64)
}

pub fn read_file_capped(root: &Path, rel: &str) -> Result<String, String> {
    let f = resolve_in_root(root, rel)?;
    let md = std::fs::metadata(&f).map_err(|e| e.to_string())?;
    if !md.is_file() {
        return Err("No es un archivo".to_string());
    }
    if md.len() > 2_000_000 {
        return Err("Archivo > 2 MB: no se abre en el visor".to_string());
    }
    std::fs::read_to_string(&f).map_err(|e| e.to_string())
}

pub fn make_dir(root: &Path, rel: &str) -> Result<(), String> {
    let d = resolve_in_root(root, rel)?;
    std::fs::create_dir_all(&d).map_err(|e| e.to_string())
}

pub fn rename_entry(root: &Path, from: &str, to: &str) -> Result<(), String> {
    let a = resolve_in_root(root, from)?;
    let b = resolve_in_root(root, to)?;
    if b.exists() {
        return Err("El destino ya existe".to_string());
    }
    std::fs::rename(&a, &b).map_err(|e| e.to_string())
}

pub fn delete_entry(root: &Path, rel: &str, confirm: bool) -> Result<(), String> {
    if !confirm {
        return Err("Confirmación requerida".to_string());
    }
    let p = resolve_in_root(root, rel)?;
    if p == root {
        return Err("No se puede eliminar la raíz del proyecto".to_string());
    }
    if p.is_dir() {
        std::fs::remove_dir_all(&p).map_err(|e| e.to_string())
    } else {
        std::fs::remove_file(&p).map_err(|e| e.to_string())
    }
}

// ---------------------------------------------------------------------------
// Recientes (JSON en app-data)
// ---------------------------------------------------------------------------

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct RecentEntry {
    pub path: String,
    pub name: String,
    pub last_opened: u64,
    pub favorite: bool,
}

pub fn now_secs() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn names() {
        assert!(validate_project_name("Mi Juego 1").is_ok());
        assert!(validate_project_name("").is_err());
        assert!(validate_project_name("a/b").is_err());
        assert!(validate_project_name("CON").is_err());
        assert!(validate_project_name("fin.").is_err());
        assert!(validate_project_name(" bien").is_err());
    }

    #[test]
    fn traversal_blocked() {
        let base = std::env::temp_dir().join("forge-test-root");
        let _ = fs::create_dir_all(base.join("sub"));
        let root = base.canonicalize().unwrap();
        assert!(resolve_in_root(&root, "sub").is_ok());
        assert!(resolve_in_root(&root, "../fuera").is_err());
        assert!(resolve_in_root(&root, "sub/../../fuera").is_err());
        assert!(resolve_in_root(&root, "C:/Windows").is_err());
        assert!(resolve_in_root(&root, "").is_ok());
        let _ = fs::remove_dir_all(&base);
    }

    #[test]
    fn rojo_parse() {
        let ok = parse_rojo_project(r#"{"name":"x","tree":{"$className":"DataModel"}}"#);
        assert!(ok.is_ok());
        assert!(parse_rojo_project("no json").is_err());
        assert!(parse_rojo_project(r#"{"tree":{}}"#).is_err());
        assert!(parse_rojo_project(r#"{"name":"x"}"#).is_err());
    }

    #[test]
    fn scaffolds_documented() {
        for t in ["vacio", "base-rojo"] {
            let files = scaffold_files(t, "Demo").unwrap();
            assert!(files.iter().any(|(p, _)| p == "forge.project.json"));
            assert!(files.iter().any(|(p, _)| p == "default.project.json"));
            for (p, c) in &files {
                assert!(!c.is_empty(), "vacío: {}", p);
            }
        }
        assert!(scaffold_files("inexistente", "Demo").is_err());
    }

    fn tmp_base(tag: &str) -> std::path::PathBuf {
        let b = std::env::temp_dir().join(format!("forge-fase2-{}-{}", std::process::id(), tag));
        let _ = fs::remove_dir_all(&b);
        fs::create_dir_all(&b).unwrap();
        b
    }

    #[test]
    fn crud_proyecto_y_fs_reales() {
        let b = tmp_base("crud");
        // Crear (plantilla base-rojo, sin git para hermetismo).
        let target = create_project_files(&b, "Mi Juego", "base-rojo", false).unwrap();
        assert!(target.join("src/server/Main.server.luau").is_file());
        assert!(target.join("tests/Example.spec.luau").is_file());
        assert!(create_project_files(&b, "Mi Juego", "base-rojo", false).is_err()); // duplicado
        assert!(create_project_files(&b, "Otro", "nope", false).is_err()); // plantilla mala

        // Rojo detecta y valida (las $path generadas existen).
        let det = detect_rojo(&target, None);
        assert!(det.has_file && det.valid, "rojo: {:?}", det.error);
        assert!(det.missing_paths.is_empty());
        let no_rojo = detect_rojo(&b, None);
        assert!(!no_rojo.has_file);

        // FS real: write/read/list/rename/search/mkdir/delete.
        write_file(&target, "notas/hola.md", "Hola #mundo\n").unwrap();
        assert_eq!(read_file_capped(&target, "notas/hola.md").unwrap(), "Hola #mundo\n");
        let entries = list_dir(&target, &target).unwrap();
        assert!(entries.iter().any(|e| e.name == "src" && e.kind == "dir"));
        rename_entry(&target, "notas/hola.md", "notas/adios.md").unwrap();
        assert!(target.join("notas/adios.md").is_file());
        let hits = search_tree(&target, "mundo").unwrap();
        assert_eq!(hits.len(), 1);
        assert!(hits[0].rel.ends_with("notas/adios.md"));
        make_dir(&target, "vacia").unwrap();
        assert!(delete_entry(&target, "notas/adios.md", false).is_err()); // sin confirm
        delete_entry(&target, "notas/adios.md", true).unwrap();
        assert!(!target.join("notas/adios.md").exists());

        // Traversal bloqueado en núcleo puro.
        assert!(read_file_capped(&target, "../../evil.txt").is_err());
        assert!(write_file(&target, "C:/Windows/x.txt", "x").is_err());
        assert!(resolve_in_root(&target, "sub/../../fuera").is_err());

        // Recientes: alta, orden y tope.
        let mut recents = Vec::new();
        recents_add(&mut recents, &target, "Mi Juego");
        recents_add(&mut recents, &b, "raiz");
        assert_eq!(recents.len(), 2);

        // Borrado con salvaguardas.
        assert!(delete_project_guarded(&target, false).is_err());
        assert!(delete_project_guarded(&b, true).is_err()); // b no es proyecto
        delete_project_guarded(&target, true).unwrap();
        assert!(!target.exists());

        let _ = fs::remove_dir_all(&b);
    }
}
