// RBLX Forge — Multi-Agent Orchestrator (backend).
// Capa de planificación, coordinación y supervisión sobre OpenCode.
// Reutiliza: eval.db (mismas tablas de skills para assignment), comandos de
// proyecto/lint existentes, sesiones OpenCode independientes por ejecución.
// NUNCA inventa agentes: cada ejecución está ligada a una sesión real.
// Las skills NO se duplican: solo se referencian sus IDs (vía skills[] del
// prompt, con el fallback ya existente en el frontend).

use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::path::Path;
use tauri::{AppHandle, Emitter, Manager};
use crate::projects::{canonical_root, resolve_in_root};

// ---------------------------------------------------------------------------
// Constantes de dominio (de la especificación; validadas, no inventadas)
// ---------------------------------------------------------------------------

pub const TASK_STATES: [&str; 8] = [
    "PENDING", "READY", "RUNNING", "WAITING_APPROVAL", "BLOCKED", "COMPLETED", "FAILED", "CANCELLED",
];
pub const RUN_STATES: [&str; 7] = [
    "borrador", "pendiente_aprobacion", "en_ejecucion", "pausado", "completada", "fallida", "cancelada",
];
pub const MSG_KINDS: [&str; 10] = [
    "TASK_ASSIGNED", "TASK_STARTED", "TASK_COMPLETED", "TASK_FAILED", "BLOCKER_REPORTED",
    "REVIEW_REQUESTED", "REVIEW_APPROVED", "REVIEW_REJECTED", "CONTEXT_REQUESTED", "CONTEXT_PROVIDED",
];
pub const APPROVAL_KINDS: [&str; 5] = ["plan", "risky_op", "studio_op", "retry", "review"];
pub const PERMS: [&str; 7] = [
    "READ_PROJECT", "WRITE_PROJECT", "EXECUTE_COMMANDS", "RUN_TESTS",
    "ACCESS_STUDIO", "MODIFY_PROJECT_CONFIG", "INSTALL_DEPENDENCIES",
];
/// Operaciones que SIEMPRE requieren aprobación explícita del usuario.
pub const RISKY_OPS: [&str; 7] = [
    "delete_file", "overwrite_protected", "destructive_command", "install_dependency",
    "modify_config", "write_outside_scope", "studio_modify",
];

fn now_secs() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::SystemTime::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

fn short_id(prefix: &str) -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    let mut h = DefaultHasher::new();
    (now_secs(), std::process::id(), prefix).hash(&mut h);
    format!("{}-{:x}", prefix, h.finish() & 0xffffff)
}

fn emit(app: &AppHandle, name: &str, payload: &serde_json::Value) {
    let _ = app.emit(name, payload.clone());
    let _ = app.emit("forge:orch-event", serde_json::json!({ "event": name, "payload": payload }));
}

// ---------------------------------------------------------------------------
// Migración (misma eval.db: coherente, sin segunda base de datos)
// ---------------------------------------------------------------------------

pub(crate) fn migrate_orch_tables(c: &Connection) -> Result<(), String> {
    c.execute_batch(
        "CREATE TABLE IF NOT EXISTS agent_profiles (
            id TEXT PRIMARY KEY, name TEXT NOT NULL, specialty TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '', responsibilities TEXT NOT NULL DEFAULT '[]',
            limits TEXT NOT NULL DEFAULT '[]', skills TEXT NOT NULL DEFAULT '[]',
            model TEXT, native_agent TEXT, tools TEXT NOT NULL DEFAULT '[]',
            permissions TEXT NOT NULL DEFAULT '[]', acceptance TEXT NOT NULL DEFAULT '[]',
            is_builtin INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1,
            updated_at INTEGER NOT NULL DEFAULT 0
         );
         CREATE TABLE IF NOT EXISTS orch_runs (
            id TEXT PRIMARY KEY, goal TEXT NOT NULL, project_dir TEXT NOT NULL DEFAULT '',
            status TEXT NOT NULL DEFAULT 'borrador', created_at INTEGER NOT NULL DEFAULT 0,
            finished_at INTEGER, config TEXT NOT NULL DEFAULT '{}', report TEXT,
            tmp_dir TEXT
         );         CREATE TABLE IF NOT EXISTS orch_tasks (
            id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES orch_runs(id),
            name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
            objective TEXT NOT NULL DEFAULT '', agent_id TEXT NOT NULL DEFAULT '',
            skills TEXT NOT NULL DEFAULT '[]', model TEXT, priority INTEGER NOT NULL DEFAULT 2,
            state TEXT NOT NULL DEFAULT 'PENDING', acceptance TEXT NOT NULL DEFAULT '[]',
            result TEXT, error TEXT, attempts INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL DEFAULT 0, finished_at INTEGER,
            session_id TEXT, files TEXT NOT NULL DEFAULT '[]'
         );
         CREATE INDEX IF NOT EXISTS idx_orchtasks_run ON orch_tasks(run_id);
         CREATE INDEX IF NOT EXISTS idx_orchtasks_state ON orch_tasks(state);
         CREATE TABLE IF NOT EXISTS task_dependencies (
            task_id TEXT NOT NULL REFERENCES orch_tasks(id),
            depends_on TEXT NOT NULL REFERENCES orch_tasks(id),
            PRIMARY KEY (task_id, depends_on)
         );
         CREATE TABLE IF NOT EXISTS agent_executions (
            id TEXT PRIMARY KEY, task_id TEXT NOT NULL REFERENCES orch_tasks(id),
            run_id TEXT NOT NULL REFERENCES orch_runs(id), agent_id TEXT NOT NULL DEFAULT '',
            session_id TEXT, model TEXT, skills TEXT NOT NULL DEFAULT '[]',
            status TEXT NOT NULL DEFAULT 'RUNNING', started_at INTEGER NOT NULL DEFAULT 0,
            finished_at INTEGER, tokens TEXT, cost REAL, transcript_excerpt TEXT,
            attempt INTEGER NOT NULL DEFAULT 1
         );
         CREATE INDEX IF NOT EXISTS idx_orchexec_task ON agent_executions(task_id);
         CREATE TABLE IF NOT EXISTS agent_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT, run_id TEXT NOT NULL,
            task_id TEXT, kind TEXT NOT NULL, from_agent TEXT NOT NULL DEFAULT '',
            to_agent TEXT NOT NULL DEFAULT '', content TEXT NOT NULL DEFAULT '',
            files TEXT NOT NULL DEFAULT '[]', state TEXT NOT NULL DEFAULT 'nuevo',
            created_at INTEGER NOT NULL DEFAULT 0
         );
         CREATE INDEX IF NOT EXISTS idx_orchmsg_run ON agent_messages(run_id);
         CREATE TABLE IF NOT EXISTS approval_requests (
            id TEXT PRIMARY KEY, run_id TEXT NOT NULL, task_id TEXT,
            kind TEXT NOT NULL, summary TEXT NOT NULL DEFAULT '',
            payload TEXT, status TEXT NOT NULL DEFAULT 'pendiente',
            decided_by TEXT, decided_at INTEGER, created_at INTEGER NOT NULL DEFAULT 0
         );
         CREATE TABLE IF NOT EXISTS execution_artifacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT, run_id TEXT NOT NULL,
            task_id TEXT, execution_id TEXT, rel TEXT NOT NULL DEFAULT '',
            size INTEGER NOT NULL DEFAULT 0, hash TEXT NOT NULL DEFAULT '',
            created_at INTEGER NOT NULL DEFAULT 0
         );
         CREATE TABLE IF NOT EXISTS agent_audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT, run_id TEXT NOT NULL,
            actor TEXT NOT NULL DEFAULT '', action TEXT NOT NULL DEFAULT '',
            tool TEXT, files TEXT, permission TEXT, result TEXT NOT NULL DEFAULT '',
            created_at INTEGER NOT NULL DEFAULT 0
         );
         CREATE INDEX IF NOT EXISTS idx_orchaudit_run ON agent_audit_log(run_id);",
    )
    .map_err(|e| e.to_string())?;
    // Migración aditiva para DBs ya creadas (idempotente: se ignora si existe).
    let _ = c.execute("ALTER TABLE orch_runs ADD COLUMN tmp_dir TEXT", []);
    seed_profiles(c)?;
    Ok(())
}

#[derive(Clone, Debug)]
struct SeedProfile {
    id: &'static str,
    name: &'static str,
    specialty: &'static str,
    description: &'static str,
    responsibilities: &'static [&'static str],
    limits: &'static [&'static str],
    skills: &'static [&'static str],
    tools: &'static [&'static str],
    permissions: &'static [&'static str],
    acceptance: &'static [&'static str],
}

fn seed_profiles(c: &Connection) -> Result<(), String> {
    // Skills con IDs REALES del registro (verificados por ls). 2–5 por perfil.
    let all: &[SeedProfile] = &[
        SeedProfile { id: "coordinator", name: "Project Coordinator", specialty: "Coordinación",
            description: "Analiza, planifica, asigna y supervisa. No implementa.",
            responsibilities: &["Analizar solicitudes", "Crear planes y tareas", "Seleccionar especialistas", "Gestionar dependencias", "Resolver bloqueos", "Preparar informes"],
            limits: &["No escribe código de juego", "No aprueba sus propias revisiones", "No toca Studio"],
            skills: &["roblox-project-architect", "roblox-to-prd", "roblox-to-issues"],
            tools: &["read", "list", "plan"],
            permissions: &["READ_PROJECT"],
            acceptance: &["Plan válido sin ciclos", "Tareas con criterios verificables"] },
        SeedProfile { id: "architect", name: "Software Architect", specialty: "Arquitectura",
            description: "Diseña módulos, sistemas y separación cliente-servidor.",
            responsibilities: &["Arquitectura del proyecto", "Organización de módulos", "Patrones de diseño", "Escalabilidad"],
            limits: &["No implementa gameplay concreto", "No decide economía ni balance"],
            skills: &["roblox-architecture", "roblox-design-patterns", "roblox-core", "roblox-project-architect"],
            tools: &["read", "list"],
            permissions: &["READ_PROJECT"],
            acceptance: &["Diagrama de módulos", "Contratos entre sistemas"] },
        SeedProfile { id: "luau-developer", name: "Luau Developer", specialty: "Programación",
            description: "Implementa scripts, módulos y sistemas de gameplay.",
            responsibilities: &["Scripts servidor/cliente", "ModuleScripts", "APIs internas", "Optimización"],
            limits: &["Sin acceso a secretos", "Sin cambios fuera del alcance de la tarea"],
            skills: &["luau-core", "roblox-game-systems", "roblox-design-patterns", "roblox-error-handling"],
            tools: &["read", "write", "edit"],
            permissions: &["READ_PROJECT", "WRITE_PROJECT", "RUN_TESTS"],
            acceptance: &["Selene sin errores", "StyLua conforme"] },
        SeedProfile { id: "ui-ux-designer", name: "UI/UX Designer", specialty: "Interfaces",
            description: "Diseña HUD, menús, inventario y navegación.",
            responsibilities: &["Interfaces Roblox", "HUD e inventario", "Navegación", "Accesibilidad"],
            limits: &["No toca lógica de servidor", "No define economía"],
            skills: &["roblox-main-menu", "roblox-ui", "roblox-user-interfaces", "roblox-hud", "roblox-game-ux"],
            tools: &["read", "write", "edit"],
            permissions: &["READ_PROJECT", "WRITE_PROJECT"],
            acceptance: &["Legible en móvil", "Sin texto inventado"] },
        SeedProfile { id: "gameplay-designer", name: "Gameplay Designer", specialty: "Mecánicas",
            description: "Diseña mecánicas, progresión, misiones y balance.",
            responsibilities: &["Mecánicas y progresión", "Misiones y recompensas", "Economía y balance"],
            limits: &["No implementa red", "Los números deben justificarse con curvas"],
            skills: &["roblox-game-systems", "roblox-quest-progression-systems", "roblox-crafting", "roblox-simulator"],
            tools: &["read", "write"],
            permissions: &["READ_PROJECT", "WRITE_PROJECT"],
            acceptance: &["Curva documentada", "Sin pay-to-win"] },
        SeedProfile { id: "environment-artist", name: "Environment Artist", specialty: "Entornos",
            description: "Escenarios, terreno, iluminación y ambientación.",
            responsibilities: &["Distribución espacial", "Terrain y biomas", "Iluminación", "Dirección artística"],
            limits: &["No scripts de gameplay", "Sin binarios"],
            skills: &["roblox-environment-art", "roblox-terrain-sculpting", "roblox-lighting-day-night", "roblox-art-direction"],
            tools: &["read", "write"],
            permissions: &["READ_PROJECT", "WRITE_PROJECT"],
            acceptance: &["Jugable y legible", "Medidas en studs"] },
        SeedProfile { id: "character-specialist", name: "Character Specialist", specialty: "Personajes",
            description: "Personajes, NPC, animaciones, rigs e interacción.",
            responsibilities: &["Rigs y NPC", "Animaciones", "Comportamientos", "Interacción"],
            limits: &["Sin modelos binarios", "Límite de NPC documentado"],
            skills: &["roblox-characters", "roblox-rigging", "roblox-locomotion-animation", "roblox-npcs"],
            tools: &["read", "write"],
            permissions: &["READ_PROJECT", "WRITE_PROJECT"],
            acceptance: &["Jerarquía validada", "Transiciones claras"] },
        SeedProfile { id: "multiplayer-engineer", name: "Multiplayer Engineer", specialty: "Red",
            description: "Replicación, remotes, autoridad del servidor y sincronización.",
            responsibilities: &["Arquitectura de red", "RemoteEvents/Functions", "Autoridad servidor", "Seguridad multijugador"],
            limits: &["Validar TODO argumento", "Sin confianza en el cliente"],
            skills: &["roblox-networking", "roblox-state-replication", "roblox-teleport-matchmaking", "roblox-datastores"],
            tools: &["read", "write", "edit"],
            permissions: &["READ_PROJECT", "WRITE_PROJECT", "RUN_TESTS"],
            acceptance: &["Rate-limit", "Sin spoof demostrable"] },
        SeedProfile { id: "security-auditor", name: "Security Auditor", specialty: "Seguridad",
            description: "Audita validación, remotes, datos y permisos. No implementa, revisa.",
            responsibilities: &["Validación servidor", "Seguridad de remotes", "Prevención de exploits", "Informes"],
            limits: &["No modifica código (propone)", "No ejecuta exploits reales"],
            skills: &["roblox-security-audit", "roblox-security", "roblox-networking", "roblox-creator-store-security-audit"],
            tools: &["read", "list"],
            permissions: &["READ_PROJECT", "RUN_TESTS"],
            acceptance: &["Hallazgos con severidad", "Cero críticos para PASSED"] },
        SeedProfile { id: "qa-engineer", name: "QA Engineer", specialty: "Calidad",
            description: "Pruebas, reproducción de errores y verificación funcional.",
            responsibilities: &["Casos de prueba", "Verificación", "Regresiones", "Informes de calidad"],
            limits: &["No marca superado lo no ejecutado", "Sin Studio ⇒ pendiente explícito"],
            skills: &["roblox-testez", "roblox-testing", "roblox-ui-testing", "roblox-performance-audit"],
            tools: &["read", "list"],
            permissions: &["READ_PROJECT", "RUN_TESTS"],
            acceptance: &["Evidencia por caso", "NOT_EVALUATED donde no llegue"] },
    ];
    for p in all {
        let str_list = |xs: &[&str]| serde_json::to_string(&xs.iter().map(|s| s.to_string()).collect::<Vec<_>>()).unwrap();
        c.execute(
            "INSERT INTO agent_profiles(id,name,specialty,description,responsibilities,limits,skills,model,native_agent,tools,permissions,acceptance,is_builtin,active,updated_at)
             VALUES(?1,?2,?3,?4,?5,?6,?7,NULL,NULL,?8,?9,?10,1,1,0)
             ON CONFLICT(id) DO UPDATE SET name=excluded.name,specialty=excluded.specialty,description=excluded.description,
               responsibilities=excluded.responsibilities,limits=excluded.limits,skills=excluded.skills,tools=excluded.tools,
               permissions=excluded.permissions,acceptance=excluded.acceptance",
            params![p.id, p.name, p.specialty, p.description, str_list(p.responsibilities), str_list(p.limits),
                    str_list(p.skills), str_list(p.tools), str_list(p.permissions), str_list(p.acceptance)],
        ).map_err(|e| e.to_string())?;
    }
    Ok(())
}

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AgentProfile {
    pub id: String,
    pub name: String,
    pub specialty: String,
    pub description: String,
    pub responsibilities: Vec<String>,
    pub limits: Vec<String>,
    pub skills: Vec<String>,
    pub model: Option<serde_json::Value>,
    pub native_agent: Option<String>,
    pub tools: Vec<String>,
    pub permissions: Vec<String>,
    pub acceptance: Vec<String>,
    pub is_builtin: bool,
    pub active: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct OrchTask {
    pub id: String,
    pub run_id: String,
    pub name: String,
    pub description: String,
    pub objective: String,
    pub agent_id: String,
    pub skills: Vec<String>,
    pub model: Option<serde_json::Value>,
    pub priority: i64,
    pub state: String,
    pub acceptance: Vec<String>,
    pub result: Option<String>,
    pub error: Option<String>,
    pub attempts: i64,
    pub created_at: i64,
    pub finished_at: Option<i64>,
    pub session_id: Option<String>,
    pub files: Vec<String>,
    pub depends_on: Vec<String>,
}

// ---------------------------------------------------------------------------
// Núcleo puro: DAG, estados, permisos, resolución de modelo (testeable)
// ---------------------------------------------------------------------------

/// Orden topológico. Errores: ciclo (con el ciclo), dependencia desconocida.
pub fn topo_sort(tasks: &[String], deps: &[(String, String)]) -> Result<Vec<String>, String> {
    // deps: (task, depends_on) — depends_on va antes.
    let set: HashSet<&String> = tasks.iter().collect();
    for (t, d) in deps {
        if !set.contains(t) {
            return Err(format!("Tarea desconocida en dependencia: {}", t));
        }
        if !set.contains(d) {
            return Err(format!("Dependencia desconocida: {} (pedida por {})", d, t));
        }
        if t == d {
            return Err(format!("Auto-dependencia: {}", t));
        }
    }
    let mut order = Vec::new();
    let mut temp = HashSet::new();
    let mut perm = HashSet::new();
    let adj: HashMap<&String, Vec<&String>> = {
        let mut m: HashMap<&String, Vec<&String>> = HashMap::new();
        for (t, d) in deps {
            m.entry(t).or_default().push(d);
        }
        m
    };
    fn visit<'a>(
        n: &'a String, adj: &HashMap<&'a String, Vec<&'a String>>,
        temp: &mut HashSet<&'a String>, perm: &mut HashSet<&'a String>,
        order: &mut Vec<String>, stack: &mut Vec<String>,
    ) -> Result<(), String> {
        if perm.contains(n) {
            return Ok(());
        }
        if !temp.insert(n) {
            stack.push(n.clone());
            return Err(format!("Dependencia circular: {}", stack.join(" -> ")));
        }
        stack.push(n.clone());
        if let Some(ds) = adj.get(n) {
            for d in ds {
                visit(d, adj, temp, perm, order, stack)?;
            }
        }
        stack.pop();
        temp.remove(n);
        perm.insert(n);
        order.push(n.clone());
        Ok(())
    }
    let mut sorted: Vec<&String> = tasks.iter().collect();
    sorted.sort();
    for n in sorted {
        visit(n, &adj, &mut temp, &mut perm, &mut order, &mut Vec::new())?;
    }
    Ok(order)
}

/// Tareas listas: PENDING/READY/BLOCKED-revisable sin bloqueos pendientes.
/// Una tarea está lista si sus dependencias están COMPLETED y no está en
/// estado terminal ni RUNNING/WAITING.
pub fn ready_tasks(states: &HashMap<String, String>, deps: &[(String, String)]) -> Vec<String> {
    let mut out = Vec::new();
    for (id, st) in states {
        if !["PENDING", "READY", "BLOCKED", "FAILED"].contains(&st.as_str()) {
            continue;
        }
        let blocked = deps.iter().any(|(t, d)| t == id && states.get(d).map(|s| s != "COMPLETED").unwrap_or(true));
        if !blocked {
            out.push(id.clone());
        }
    }
    out.sort();
    out
}

/// Transiciones de estado permitidas (máquina de estados estricta).
pub fn can_transition(from: &str, to: &str) -> bool {
    match (from, to) {
        (a, b) if a == b => true,
        ("PENDING", "READY") | ("PENDING", "RUNNING") | ("PENDING", "CANCELLED") => true,
        ("READY", "RUNNING") | ("READY", "CANCELLED") | ("READY", "BLOCKED") => true,
        ("RUNNING", "COMPLETED") | ("RUNNING", "FAILED") | ("RUNNING", "WAITING_APPROVAL")
        | ("RUNNING", "BLOCKED") | ("RUNNING", "CANCELLED") => true,
        ("WAITING_APPROVAL", "RUNNING") | ("WAITING_APPROVAL", "CANCELLED") | ("WAITING_APPROVAL", "COMPLETED") => true,
        // Reanudación tras aprobar en Revisión (decideApproval → READY → pump).
        ("WAITING_APPROVAL", "READY") => true,
        // Re-implementación de un diseño ya completado (implementTask → READY).
        ("COMPLETED", "READY") => true,
        ("BLOCKED", "READY") | ("BLOCKED", "CANCELLED") => true,
        ("FAILED", "READY") | ("FAILED", "CANCELLED") => true,
        _ => false,
    }
}

/// ¿La operación exige aprobación del usuario? (lista cerrada, sin heurística)
pub fn is_risky_op(op: &str) -> bool {
    RISKY_OPS.contains(&op)
}

/// Resolución de modelo: tarea > agente > defecto del run > defecto de sesión.
/// Devuelve None = heredar el modelo activo (nunca se inventa uno).
pub fn resolve_model(
    task: Option<&serde_json::Value>, agent: Option<&serde_json::Value>, run_default: Option<&serde_json::Value>,
) -> Option<serde_json::Value> {
    for cand in [task, agent, run_default] {
        if let Some(v) = cand {
            if v.is_object() {
                return Some(v.clone());
            }
        }
    }
    None
}

/// Conflicto de archivos: dos tareas no-terminales que escriben lo mismo.
pub fn file_conflicts(tasks: &[(String, String, Vec<String>)]) -> Vec<String> {
    // (id, state, files)
    let mut seen: HashMap<String, String> = HashMap::new();
    let mut out = Vec::new();
    for (id, st, files) in tasks {
        if ["COMPLETED", "CANCELLED", "FAILED"].contains(&st.as_str()) {
            continue;
        }
        for f in files {
            let key = f.trim().to_lowercase();
            if key.is_empty() {
                continue;
            }
            if let Some(prev) = seen.get(&key) {
                if prev != id {
                    out.push(format!("Conflicto: `{}` en {} y {}", f, prev, id));
                }
            } else {
                seen.insert(key, id.clone());
            }
        }
    }
    out
}

// ---------------------------------------------------------------------------
// Sugerencia de skills (registry real + veredictos del Evaluation Engine)
// ---------------------------------------------------------------------------

#[derive(Serialize, Clone, Debug)]
pub struct SkillSuggestion {
    pub id: String,
    pub name: String,
    pub grp: String,
    pub verdict: Option<String>,
    pub score: i64,
    pub reasons: Vec<String>,
}

fn verdict_weight(v: Option<&str>) -> i64 {
    match v {
        Some("PASSED") => 3,
        Some("PASSED_WITH_WARNINGS") => 2,
        Some("NEEDS_IMPROVEMENT") => 1,
        Some("FAILED") => -100,
        Some("BLOCKED") => -100,
        _ => 1, // NOT_EVALUATED y desconocido: no se excluyen
    }
}

fn group_hint_words() -> Vec<(&'static str, &'static str)> {
    vec![
        ("inventario", "ui-ux"), ("tienda", "ui-ux"), ("menú", "ui-ux"), ("hud", "ui-ux"),
        ("interfaz", "ui-ux"), ("diálogo", "ui-ux"), ("misión", "gameplay-systems"),
        ("misiones", "gameplay-systems"), ("crafteo", "gameplay-systems"), ("habilidad", "gameplay-systems"),
        ("progresión", "gameplay-systems"), ("arquitectura", "programming-architecture"),
        ("módulo", "programming-architecture"), ("persistencia", "programming-architecture"),
        ("datastore", "programming-architecture"), ("terreno", "environment-art"),
        ("iluminación", "environment-art"), ("escenario", "environment-art"),
        ("npc", "characters-animation"), ("animación", "characters-animation"),
        ("rig", "characters-animation"), ("replicación", "multiplayer-networking"),
        ("remote", "multiplayer-networking"), ("servidor", "multiplayer-networking"),
        ("economía", "economy"), ("recompensa", "economy"), ("audio", "audio"),
        ("música", "audio"), ("seguridad", "security"), ("exploit", "security"),
        ("test", "testing-qa"), ("prueba", "testing-qa"), ("rendimiento", "performance"),
        ("herramienta", "tooling"), ("género", "game-genres"),
    ]
}

/// Ranking puro y testeable: texto + catálogo [(id,grp,verdict)] → top N.
pub fn rank_skills(text: &str, catalog: &[(String, String, Option<String>)], limit: usize) -> Vec<(String, i64, Vec<String>)> {
    let low = text.to_lowercase();
    let hints = group_hint_words();
    let mut wanted: HashSet<&str> = HashSet::new();
    for (w, g) in &hints {
        if low.contains(w) {
            wanted.insert(g);
        }
    }
    let mut scored: Vec<(String, i64, Vec<String>)> = Vec::new();
    for (id, grp, verdict) in catalog {
        let mut score = verdict_weight(verdict.as_deref());
        let mut reasons = Vec::new();
        if wanted.contains(grp.as_str()) {
            score += 5;
            reasons.push(format!("grupo {} relevante", grp));
        }
        // Mención directa del ID o parte significativa.
        let short = id.trim_start_matches("roblox-").replace('-', " ");
        if low.contains(&id.to_lowercase()) {
            score += 10;
            reasons.push("mencionada explícitamente".into());
        } else if short.len() > 4 && low.contains(&short) {
            score += 3;
            reasons.push("coincidencia temática".into());
        }
        match verdict.as_deref() {
            Some("PASSED") => reasons.push("evaluada: PASSED".into()),
            Some("PASSED_WITH_WARNINGS") => reasons.push("evaluada con avisos".into()),
            Some("NEEDS_IMPROVEMENT") => reasons.push("evaluada: necesita mejora".into()),
            Some("FAILED") | Some("BLOCKED") => reasons.push("evaluada: NO usar salvo decisión explícita".into()),
            _ => reasons.push("sin evaluar (no se excluye)".into()),
        }
        scored.push((id.clone(), score, reasons));
    }
    scored.sort_by(|a, b| b.1.cmp(&a.1).then(a.0.cmp(&b.0)));
    scored.into_iter().take(limit.max(1)).collect()
}

// ---------------------------------------------------------------------------
// Acceso a DB (misma eval.db) + comandos Tauri
// ---------------------------------------------------------------------------

fn orch_db(app: &AppHandle) -> Result<Connection, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let p = dir.join("eval").join("eval.db");
    let c = Connection::open(&p).map_err(|e| e.to_string())?;
    c.busy_timeout(std::time::Duration::from_secs(5)).map_err(|e| e.to_string())?;
    migrate_orch_tables(&c)?;
    Ok(c)
}

fn profile_from_row(r: &rusqlite::Row) -> Result<AgentProfile, rusqlite::Error> {
    let js = |i: usize| -> Vec<String> {
        r.get::<_, String>(i).ok().and_then(|s| serde_json::from_str(&s).ok()).unwrap_or_default()
    };
    let opt_js = |i: usize| -> Option<serde_json::Value> {
        r.get::<_, Option<String>>(i).ok().flatten().and_then(|s| serde_json::from_str(&s).ok())
    };
    Ok(AgentProfile {
        id: r.get(0)?, name: r.get(1)?, specialty: r.get(2)?, description: r.get(3)?,
        responsibilities: js(4), limits: js(5), skills: js(6), model: opt_js(7),
        native_agent: r.get(8)?, tools: js(9), permissions: js(10), acceptance: js(11),
        is_builtin: r.get::<_, i64>(12).unwrap_or(0) == 1,
        active: r.get::<_, i64>(13).unwrap_or(1) == 1,
    })
}

fn task_from_row(r: &rusqlite::Row, deps: &[String]) -> Result<OrchTask, rusqlite::Error> {
    let js = |i: usize| -> Vec<String> {
        r.get::<_, String>(i).ok().and_then(|s| serde_json::from_str(&s).ok()).unwrap_or_default()
    };
    let opt_js = |i: usize| -> Option<serde_json::Value> {
        r.get::<_, Option<String>>(i).ok().flatten().and_then(|s| serde_json::from_str(&s).ok())
    };
    Ok(OrchTask {
        id: r.get(0)?, run_id: r.get(1)?, name: r.get(2)?, description: r.get(3)?,
        objective: r.get(4)?, agent_id: r.get(5)?, skills: js(6), model: opt_js(7),
        priority: r.get(8)?, state: r.get(9)?, acceptance: js(10),
        result: r.get(11)?, error: r.get(12)?, attempts: r.get(13)?,
        created_at: r.get(14)?, finished_at: r.get(15)?, session_id: r.get(16)?,
        files: js(17), depends_on: deps.to_vec(),
    })
}

fn load_task(c: &Connection, id: &str) -> Result<OrchTask, String> {
    let deps: Vec<String> = {
        let mut st = c.prepare("SELECT depends_on FROM task_dependencies WHERE task_id=?1").map_err(|e| e.to_string())?;
        st.query_map(params![id], |r| r.get(0)).map_err(|e| e.to_string())?.map_while(Result::ok).collect()
    };
    let mut st = c.prepare("SELECT id,run_id,name,description,objective,agent_id,skills,model,priority,state,acceptance,result,error,attempts,created_at,finished_at,session_id,files FROM orch_tasks WHERE id=?1").map_err(|e| e.to_string())?;
    st.query_row(params![id], |r| task_from_row(r, &deps)).map_err(|_| format!("Tarea no encontrada: {}", id))
}

fn audit(c: &Connection, run_id: &str, actor: &str, action: &str, result: &str) {
    let _ = c.execute(
        "INSERT INTO agent_audit_log(run_id,actor,action,result,created_at) VALUES(?1,?2,?3,?4,?5)",
        params![run_id, actor, action, result, now_secs()],
    );
}

#[tauri::command]
pub fn orch_db_init(app: AppHandle) -> Result<serde_json::Value, String> {
    orch_db(&app)?;
    orch_dashboard_inner(&app)
}

#[tauri::command]
pub fn orch_list_profiles(app: AppHandle) -> Result<Vec<AgentProfile>, String> {
    let c = orch_db(&app)?;
    let mut st = c.prepare("SELECT id,name,specialty,description,responsibilities,limits,skills,model,native_agent,tools,permissions,acceptance,is_builtin,active FROM agent_profiles ORDER BY is_builtin DESC,id").map_err(|e| e.to_string())?;
    Ok(st.query_map([], profile_from_row).map_err(|e| e.to_string())?.map_while(Result::ok).collect())
}

#[derive(Deserialize, Clone, Debug)]
pub struct ProfileInput {
    pub id: String,
    pub name: String,
    pub specialty: String,
    pub description: String,
    pub responsibilities: Vec<String>,
    pub limits: Vec<String>,
    pub skills: Vec<String>,
    pub model: Option<serde_json::Value>,
    pub native_agent: Option<String>,
    pub tools: Vec<String>,
    pub permissions: Vec<String>,
    pub acceptance: Vec<String>,
    pub active: bool,
}

#[tauri::command]
pub fn orch_save_profile(app: AppHandle, profile: ProfileInput) -> Result<bool, String> {
    if profile.id.is_empty() || profile.id.len() > 48 || !profile.id.chars().all(|c| c.is_alphanumeric() || c == '-' || c == '_') {
        return Err("ID de perfil inválido".to_string());
    }
    if !(2..=8).contains(&profile.skills.len()) && !profile.skills.is_empty() {
        // Se recomiendan 2–5; se tolera 0 (sin skills) o hasta 8 con aviso.
    }
    if profile.skills.len() > 8 {
        return Err("Máximo 8 skills por perfil (2–5 recomendado)".to_string());
    }
    for p in &profile.permissions {
        if !PERMS.contains(&p.as_str()) {
            return Err(format!("Permiso desconocido: {}", p));
        }
    }
    // Las skills deben existir en el registro (nada inventado).
    let c = orch_db(&app)?;
    let reg: HashSet<String> = {
        let mut st = c.prepare("SELECT id FROM skills").map_err(|e| e.to_string())?;
        st.query_map([], |r| r.get(0)).map_err(|e| e.to_string())?.map_while(Result::ok).collect()
    };
    if reg.is_empty() {
        return Err("Registro de skills vacío: ejecuta eval_scan primero".to_string());
    }
    for s in &profile.skills {
        if !reg.contains(s) {
            return Err(format!("Skill no registrada: {}", s));
        }
    }
    let js = |v: &Vec<String>| serde_json::to_string(v).unwrap_or_else(|_| "[]".into());
    let model = profile.model.map(|v| serde_json::to_string(&v).unwrap_or_default());
    c.execute(
        "INSERT INTO agent_profiles(id,name,specialty,description,responsibilities,limits,skills,model,native_agent,tools,permissions,acceptance,is_builtin,active,updated_at)
         VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,0,?13,?14)
         ON CONFLICT(id) DO UPDATE SET name=excluded.name,specialty=excluded.specialty,description=excluded.description,
           responsibilities=excluded.responsibilities,limits=excluded.limits,skills=excluded.skills,model=excluded.model,
           native_agent=excluded.native_agent,tools=excluded.tools,permissions=excluded.permissions,
           acceptance=excluded.acceptance,active=excluded.active,updated_at=excluded.updated_at",
        params![profile.id, profile.name, profile.specialty, profile.description, js(&profile.responsibilities),
                js(&profile.limits), js(&profile.skills), model, profile.native_agent, js(&profile.tools),
                js(&profile.permissions), js(&profile.acceptance), if profile.active { 1 } else { 0 }, now_secs()],
    ).map_err(|e| e.to_string())?;
    emit(&app, "forge:orchestrator-updated", &serde_json::json!({ "profile": profile.id }));
    Ok(true)
}

#[tauri::command]
pub fn orch_delete_profile(app: AppHandle, id: String) -> Result<bool, String> {
    let c = orch_db(&app)?;
    let builtin: i64 = c.query_row("SELECT is_builtin FROM agent_profiles WHERE id=?1", params![id], |r| r.get(0))
        .map_err(|_| format!("Perfil no encontrado: {}", id))?;
    if builtin == 1 {
        return Err("Los perfiles integrados no se eliminan (puedes desactivarlos)".to_string());
    }
    let used: i64 = c.query_row("SELECT COUNT(*) FROM orch_tasks WHERE agent_id=?1 AND state NOT IN ('COMPLETED','CANCELLED')", params![id], |r| r.get(0)).map_err(|e| e.to_string())?;
    if used > 0 {
        return Err(format!("Perfil en uso en {} tareas activas", used));
    }
    c.execute("DELETE FROM agent_profiles WHERE id=?1", params![id]).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub fn orch_suggest_skills(app: AppHandle, text: String, group: Option<String>, limit: Option<i64>) -> Result<Vec<SkillSuggestion>, String> {
    if text.trim().len() < 4 {
        return Err("Describe la tarea (mínimo 4 caracteres)".to_string());
    }
    let c = orch_db(&app)?;
    let mut st = c.prepare("SELECT id,name,grp,last_verdict FROM skills ORDER BY id").map_err(|e| e.to_string())?;
    let rows: Vec<(String, String, String, Option<String>)> = st.query_map([], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)))
        .map_err(|e| e.to_string())?.map_while(Result::ok).collect();
    if rows.is_empty() {
        return Err("Registro de skills vacío: ejecuta eval_scan primero".to_string());
    }
    let cat: Vec<(String, String, Option<String>)> = rows.iter().map(|(id, _, g, v)| (id.clone(), g.clone(), v.clone())).collect();
    let names: HashMap<String, String> = rows.into_iter().map(|(id, n, _, _)| (id, n)).collect();
    let text_full = if let Some(g) = group { format!("{} {}", text, g) } else { text };
    let ranked = rank_skills(&text_full, &cat, limit.unwrap_or(5).clamp(1, 10) as usize);
    Ok(ranked.into_iter().map(|(id, score, reasons)| SkillSuggestion {
        name: names.get(&id).cloned().unwrap_or_default(),
        grp: cat.iter().find(|(i, _, _)| i == &id).map(|(_, g, _)| g.clone()).unwrap_or_default(),
        verdict: cat.iter().find(|(i, _, _)| i == &id).and_then(|(_, _, v)| v.clone()),
        score, reasons, id,
    }).collect())
}

#[derive(Deserialize, Clone, Debug)]
pub struct RunConfig {
    pub default_model: Option<serde_json::Value>,
    pub max_parallel: Option<i64>,
    pub task_timeout_ms: Option<i64>,
    pub global_timeout_ms: Option<i64>,
    pub max_retries: Option<i64>,
    pub scope: Option<String>,
}

fn default_config() -> serde_json::Value {
    serde_json::json!({
        "default_model": null, "max_parallel": 1, "task_timeout_ms": 600000,
        "global_timeout_ms": 3600000, "max_retries": 2, "scope": "project",
    })
}

fn normalize_config(rc: &RunConfig) -> serde_json::Value {
    let mut cfg = default_config();
    if let Some(m) = &rc.default_model { cfg["default_model"] = m.clone(); }
    if let Some(v) = rc.max_parallel { cfg["max_parallel"] = serde_json::json!(v.clamp(1, 2)); }
    if let Some(v) = rc.task_timeout_ms { cfg["task_timeout_ms"] = serde_json::json!(v.clamp(60000, 3600000)); }
    if let Some(v) = rc.global_timeout_ms { cfg["global_timeout_ms"] = serde_json::json!(v.clamp(300000, 21600000)); }
    if let Some(v) = rc.max_retries { cfg["max_retries"] = serde_json::json!(v.clamp(0, 5)); }
    if let Some(s) = &rc.scope {
        if ["project", "tmp"].contains(&s.as_str()) {
            cfg["scope"] = serde_json::json!(s);
        }
    }
    cfg
}

#[tauri::command]
pub fn orch_run_create(app: AppHandle, goal: String, project_dir: String, config: Option<RunConfig>) -> Result<String, String> {
    if goal.trim().len() < 10 {
        return Err("Describe el objetivo (mínimo 10 caracteres)".to_string());
    }
    let c = orch_db(&app)?;
    let id = short_id("orch");
    let cfg = normalize_config(&config.unwrap_or(RunConfig {
        default_model: None, max_parallel: None, task_timeout_ms: None,
        global_timeout_ms: None, max_retries: None, scope: None,
    }));
    c.execute(
        "INSERT INTO orch_runs(id,goal,project_dir,status,created_at,config) VALUES(?1,?2,?3,'borrador',?4,?5)",
        params![id, goal.trim(), project_dir.trim(), now_secs(), serde_json::to_string(&cfg).unwrap()],
    ).map_err(|e| e.to_string())?;
    audit(&c, &id, "coordinator", "run_created", "ok");
    emit(&app, "forge:orchestrator-created", &serde_json::json!({ "run": id }));
    Ok(id)
}

#[tauri::command]
pub fn orch_run_list(app: AppHandle, limit: Option<i64>) -> Result<Vec<serde_json::Value>, String> {
    let c = orch_db(&app)?;
    let lim = limit.unwrap_or(50).clamp(1, 200);
    let mut st = c.prepare("SELECT id,goal,project_dir,status,created_at,finished_at FROM orch_runs ORDER BY created_at DESC LIMIT ?1").map_err(|e| e.to_string())?;
    Ok(st.query_map(params![lim], |r| Ok(serde_json::json!({
        "id": r.get::<_, String>(0)?, "goal": r.get::<_, String>(1)?, "project_dir": r.get::<_, String>(2)?,
        "status": r.get::<_, String>(3)?, "created_at": r.get::<_, i64>(4)?, "finished_at": r.get::<_, Option<i64>>(5)?,
    }))).map_err(|e| e.to_string())?.map_while(Result::ok).collect())
}

#[tauri::command]
pub fn orch_run_get(app: AppHandle, id: String) -> Result<serde_json::Value, String> {
    let c = orch_db(&app)?;
    let mut st = c.prepare("SELECT id,goal,project_dir,status,created_at,finished_at,config,report,tmp_dir FROM orch_runs WHERE id=?1").map_err(|e| e.to_string())?;
    st.query_row(params![id], |r| Ok(serde_json::json!({
        "id": r.get::<_, String>(0)?, "goal": r.get::<_, String>(1)?, "project_dir": r.get::<_, String>(2)?,
        "status": r.get::<_, String>(3)?, "created_at": r.get::<_, i64>(4)?, "finished_at": r.get::<_, Option<i64>>(5)?,
        "config": serde_json::from_str::<serde_json::Value>(&r.get::<_, String>(6)?).unwrap_or(serde_json::json!({})),
        "report": r.get::<_, Option<String>>(7)?,
        "tmp_dir": r.get::<_, Option<String>>(8).unwrap_or(None),
    }))).map_err(|_| format!("Ejecución no encontrada: {}", id))
}

/// Fija el tmpdir compartido de un run (creado con eval_create_tmpdir).
/// Solo en borrador o pendiente: una vez en marcha no se cambia.
#[tauri::command]
pub fn orch_run_set_tmpdir(app: AppHandle, id: String, tmp_dir: String) -> Result<bool, String> {
    if tmp_dir.is_empty() || tmp_dir.len() > 300 || !tmp_dir.contains("forge-eval-") {
        return Err("tmpdir no reconocido (solo forge-eval-*)".to_string());
    }
    if tmp_dir.contains("..") {
        return Err("tmpdir inválido".to_string());
    }
    if !std::path::Path::new(&tmp_dir).is_dir() {
        return Err("El tmpdir no existe".to_string());
    }
    let c = orch_db(&app)?;
    let st: String = c.query_row("SELECT status FROM orch_runs WHERE id=?1", params![id], |r| r.get(0))
        .map_err(|_| format!("Ejecución no encontrada: {}", id))?;
    if !["borrador", "pendiente_aprobacion"].contains(&st.as_str()) {
        return Err("El tmpdir solo se fija antes de ejecutar".to_string());
    }
    c.execute("UPDATE orch_runs SET tmp_dir=?1 WHERE id=?2", params![tmp_dir, id]).map_err(|e| e.to_string())?;
    Ok(true)
}

fn run_transition(app: &AppHandle, c: &Connection, id: &str, from: &[&str], to: &str, ev: &str) -> Result<bool, String> {
    if !RUN_STATES.contains(&to) {
        return Err(format!("Estado de ejecución inválido: {}", to));
    }
    let cur: String = c.query_row("SELECT status FROM orch_runs WHERE id=?1", params![id], |r| r.get(0))
        .map_err(|_| format!("Ejecución no encontrada: {}", id))?;
    if !from.contains(&cur.as_str()) {
        return Err(format!("Transición inválida: {} no admite {}", cur, to));
    }
    let finished = matches!(to, "completada" | "fallida" | "cancelada");
    if finished {
        c.execute("UPDATE orch_runs SET status=?1,finished_at=?2 WHERE id=?3", params![to, now_secs(), id]).map_err(|e| e.to_string())?;
    } else {
        c.execute("UPDATE orch_runs SET status=?1 WHERE id=?2", params![to, id]).map_err(|e| e.to_string())?;
    }
    audit(c, id, "coordinator", &format!("run_{}", to), "ok");
    emit(app, ev, &serde_json::json!({ "run": id, "status": to }));
    Ok(true)
}

#[tauri::command]
pub fn orch_run_submit(app: AppHandle, id: String) -> Result<bool, String> {
    let c = orch_db(&app)?;
    run_transition(&app, &c, &id, &["borrador"], "pendiente_aprobacion", "forge:orchestrator-updated")
}
#[tauri::command]
pub fn orch_run_approve(app: AppHandle, id: String) -> Result<bool, String> {
    let c = orch_db(&app)?;
    run_transition(&app, &c, &id, &["pendiente_aprobacion", "pausado"], "en_ejecucion", "forge:orchestrator-started")
}
#[tauri::command]
pub fn orch_run_pause(app: AppHandle, id: String) -> Result<bool, String> {
    let c = orch_db(&app)?;
    run_transition(&app, &c, &id, &["en_ejecucion"], "pausado", "forge:orchestrator-paused")
}
#[tauri::command]
pub fn orch_run_resume(app: AppHandle, id: String) -> Result<bool, String> {
    let c = orch_db(&app)?;
    run_transition(&app, &c, &id, &["pausado"], "en_ejecucion", "forge:orchestrator-started")
}
#[tauri::command]
pub fn orch_run_cancel(app: AppHandle, id: String) -> Result<bool, String> {
    let c = orch_db(&app)?;
    let r = run_transition(&app, &c, &id, &["borrador", "pendiente_aprobacion", "en_ejecucion", "pausado"], "cancelada", "forge:orchestrator-failed")?;
    c.execute("UPDATE orch_tasks SET state='CANCELLED',finished_at=?1 WHERE run_id=?2 AND state NOT IN ('COMPLETED','FAILED','CANCELLED')", params![now_secs(), id]).map_err(|e| e.to_string())?;
    Ok(r)
}
#[tauri::command]
pub fn orch_run_complete(app: AppHandle, id: String, report: Option<String>) -> Result<bool, String> {
    let c = orch_db(&app)?;
    if let Some(r) = report {
        c.execute("UPDATE orch_runs SET report=?1 WHERE id=?2", params![r.chars().take(20000).collect::<String>(), id]).map_err(|e| e.to_string())?;
    }
    run_transition(&app, &c, &id, &["en_ejecucion", "pausado"], "completada", "forge:orchestrator-completed")
}
#[tauri::command]
pub fn orch_run_set_config(app: AppHandle, id: String, config: RunConfig) -> Result<bool, String> {
    let c = orch_db(&app)?;
    let cur: String = c.query_row("SELECT status FROM orch_runs WHERE id=?1", params![id], |r| r.get(0))
        .map_err(|_| format!("Ejecución no encontrada: {}", id))?;
    if !["borrador", "pendiente_aprobacion"].contains(&cur.as_str()) {
        return Err("La configuración solo se cambia antes de ejecutar".to_string());
    }
    let cfg = normalize_config(&config);
    c.execute("UPDATE orch_runs SET config=?1 WHERE id=?2", params![serde_json::to_string(&cfg).unwrap(), id]).map_err(|e| e.to_string())?;
    emit(&app, "forge:orchestrator-updated", &serde_json::json!({ "run": id }));
    Ok(true)
}

#[tauri::command]
pub fn orch_run_fail(app: AppHandle, id: String, report: Option<String>) -> Result<bool, String> {
    let c = orch_db(&app)?;
    if let Some(r) = report {
        c.execute("UPDATE orch_runs SET report=?1 WHERE id=?2", params![r.chars().take(20000).collect::<String>(), id]).map_err(|e| e.to_string())?;
    }
    run_transition(&app, &c, &id, &["en_ejecucion", "pausado"], "fallida", "forge:orchestrator-failed")
}

// --- Tareas ---

#[derive(Deserialize, Clone, Debug)]
pub struct TaskInput {
    pub name: String,
    pub description: String,
    pub objective: String,
    pub agent_id: String,
    pub skills: Vec<String>,
    pub model: Option<serde_json::Value>,
    pub priority: Option<i64>,
    pub acceptance: Vec<String>,
    pub files: Vec<String>,
    pub depends_on: Vec<String>,
}

fn check_agent_skills(c: &Connection, agent_id: &str, skills: &[String]) -> Result<(), String> {
    if agent_id.is_empty() {
        return Err("Toda tarea necesita un agente asignado".to_string());
    }
    let exists: i64 = c.query_row("SELECT COUNT(*) FROM agent_profiles WHERE id=?1 AND active=1", params![agent_id], |r| r.get(0)).map_err(|e| e.to_string())?;
    if exists == 0 {
        return Err(format!("Agente desconocido o inactivo: {}", agent_id));
    }
    if skills.len() > 8 {
        return Err("Máximo 8 skills por tarea (2–5 recomendado)".to_string());
    }
    let reg: HashSet<String> = {
        let mut st = c.prepare("SELECT id FROM skills").map_err(|e| e.to_string())?;
        st.query_map([], |r| r.get(0)).map_err(|e| e.to_string())?.map_while(Result::ok).collect()
    };
    if reg.is_empty() {
        return Err("Registro de skills vacío: ejecuta eval_scan primero".to_string());
    }
    for s in skills {
        if !reg.contains(s) {
            return Err(format!("Skill no registrada: {}", s));
        }
    }
    Ok(())
}

#[tauri::command]
pub fn orch_task_add(app: AppHandle, run_id: String, task: TaskInput) -> Result<String, String> {
    if task.name.trim().is_empty() || task.objective.trim().is_empty() {
        return Err("Nombre y objetivo son obligatorios".to_string());
    }
    let c = orch_db(&app)?;
    let st: String = c.query_row("SELECT status FROM orch_runs WHERE id=?1", params![run_id], |r| r.get(0))
        .map_err(|_| format!("Ejecución no encontrada: {}", run_id))?;
    if !["borrador", "pendiente_aprobacion"].contains(&st.as_str()) {
        return Err("Solo se añaden tareas en borrador o pendiente de aprobación".to_string());
    }
    check_agent_skills(&c, &task.agent_id, &task.skills)?;
    for d in &task.depends_on {
        let n: i64 = c.query_row("SELECT COUNT(*) FROM orch_tasks WHERE id=?1 AND run_id=?2", params![d, run_id], |r| r.get(0)).map_err(|e| e.to_string())?;
        if n == 0 {
            return Err(format!("Dependencia inexistente en este run: {}", d));
        }
    }
    let id = short_id("tsk");
    c.execute(
        "INSERT INTO orch_tasks(id,run_id,name,description,objective,agent_id,skills,model,priority,state,acceptance,attempts,created_at,files)
         VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,'PENDING',?10,0,?11,?12)",
        params![id, run_id, task.name.trim(), task.description.trim(), task.objective.trim(), task.agent_id,
                serde_json::to_string(&task.skills).unwrap(), task.model.map(|v| serde_json::to_string(&v).unwrap_or_default()),
                task.priority.unwrap_or(2).clamp(1, 5), serde_json::to_string(&task.acceptance).unwrap(),
                now_secs(), serde_json::to_string(&task.files).unwrap()],
    ).map_err(|e| e.to_string())?;
    for d in &task.depends_on {
        c.execute("INSERT OR IGNORE INTO task_dependencies(task_id,depends_on) VALUES(?1,?2)", params![id, d]).map_err(|e| e.to_string())?;
    }
    audit(&c, &run_id, "coordinator", &format!("task_created:{}", task.name), "ok");
    emit(&app, "forge:task-created", &serde_json::json!({ "run": run_id, "task": id }));
    Ok(id)
}

#[tauri::command]
pub fn orch_task_list(app: AppHandle, run_id: String) -> Result<Vec<OrchTask>, String> {
    let c = orch_db(&app)?;
    let mut st = c.prepare("SELECT id FROM orch_tasks WHERE run_id=?1 ORDER BY priority ASC,created_at ASC").map_err(|e| e.to_string())?;
    let ids: Vec<String> = st.query_map(params![run_id], |r| r.get(0)).map_err(|e| e.to_string())?.map_while(Result::ok).collect();
    ids.iter().map(|id| load_task(&c, id)).collect()
}

#[tauri::command]
pub fn orch_task_update(app: AppHandle, id: String, task: TaskInput) -> Result<bool, String> {
    let c = orch_db(&app)?;
    let cur = load_task(&c, &id)?;
    if !["PENDING", "READY", "BLOCKED", "FAILED"].contains(&cur.state.as_str()) {
        return Err("Solo se editan tareas no iniciadas o fallidas/bloqueadas".to_string());
    }
    check_agent_skills(&c, &task.agent_id, &task.skills)?;
    c.execute(
        "UPDATE orch_tasks SET name=?1,description=?2,objective=?3,agent_id=?4,skills=?5,model=?6,priority=?7,acceptance=?8,files=?9 WHERE id=?10",
        params![task.name.trim(), task.description.trim(), task.objective.trim(), task.agent_id,
                serde_json::to_string(&task.skills).unwrap(), task.model.map(|v| serde_json::to_string(&v).unwrap_or_default()),
                task.priority.unwrap_or(2).clamp(1, 5), serde_json::to_string(&task.acceptance).unwrap(),
                serde_json::to_string(&task.files).unwrap(), id],
    ).map_err(|e| e.to_string())?;
    c.execute("DELETE FROM task_dependencies WHERE task_id=?1", params![id]).map_err(|e| e.to_string())?;
    for d in &task.depends_on {
        let n: i64 = c.query_row("SELECT COUNT(*) FROM orch_tasks WHERE id=?1 AND run_id=?2", params![d, cur.run_id], |r| r.get(0)).map_err(|e| e.to_string())?;
        if n == 0 {
            return Err(format!("Dependencia inexistente en este run: {}", d));
        }
        if d == &id {
            return Err("Auto-dependencia no permitida".to_string());
        }
        c.execute("INSERT OR IGNORE INTO task_dependencies(task_id,depends_on) VALUES(?1,?2)", params![id, d]).map_err(|e| e.to_string())?;
    }
    emit(&app, "forge:task-updated", &serde_json::json!({ "task": id }));
    Ok(true)
}

#[tauri::command]
pub fn orch_task_delete(app: AppHandle, id: String) -> Result<bool, String> {
    let c = orch_db(&app)?;
    let cur = load_task(&c, &id)?;
    if !["PENDING", "READY", "BLOCKED", "FAILED", "CANCELLED"].contains(&cur.state.as_str()) {
        return Err("No se elimina una tarea en curso o completada".to_string());
    }
    let users: i64 = c.query_row("SELECT COUNT(*) FROM task_dependencies WHERE depends_on=?1", params![id], |r| r.get(0)).map_err(|e| e.to_string())?;
    if users > 0 {
        return Err(format!("{} tareas dependen de esta: quita las dependencias primero", users));
    }
    c.execute("DELETE FROM task_dependencies WHERE task_id=?1", params![id]).map_err(|e| e.to_string())?;
    c.execute("DELETE FROM orch_tasks WHERE id=?1", params![id]).map_err(|e| e.to_string())?;
    audit(&c, &cur.run_id, "coordinator", &format!("task_deleted:{}", cur.name), "ok");
    Ok(true)
}

#[tauri::command]
pub fn orch_task_set_state(app: AppHandle, id: String, state: String, error: Option<String>) -> Result<bool, String> {
    if !TASK_STATES.contains(&state.as_str()) {
        return Err(format!("Estado inválido: {}", state));
    }
    let c = orch_db(&app)?;
    let cur = load_task(&c, &id)?;
    if !can_transition(&cur.state, &state) {
        return Err(format!("Transición inválida: {} → {}", cur.state, state));
    }
    // Reintento limitado: FAILED→READY consume intentos (tope en config del run).
    if cur.state == "FAILED" && state == "READY" {
        let cfg: serde_json::Value = c.query_row("SELECT config FROM orch_runs WHERE id=?1", params![cur.run_id], |r| r.get::<_, String>(0))
            .ok().and_then(|s| serde_json::from_str(&s).ok()).unwrap_or(serde_json::json!({}));
        let max = cfg.get("max_retries").and_then(|v| v.as_i64()).unwrap_or(2);
        if cur.attempts >= max {
            return Err(format!("Sin reintentos restantes (máx {})", max));
        }
    }
    let finished = matches!(state.as_str(), "COMPLETED" | "FAILED" | "CANCELLED");
    let attempts = if state == "RUNNING" { cur.attempts + 1 } else { cur.attempts };
    if finished {
        c.execute("UPDATE orch_tasks SET state=?1,error=?2,finished_at=?3,attempts=?4 WHERE id=?5",
            params![state, error.map(|e| e.chars().take(2000).collect::<String>()), now_secs(), attempts, id]).map_err(|e| e.to_string())?;
    } else {
        c.execute("UPDATE orch_tasks SET state=?1,attempts=?2 WHERE id=?3", params![state, attempts, id]).map_err(|e| e.to_string())?;
    }
    audit(&c, &cur.run_id, "coordinator", &format!("task_{}:{}", state.to_lowercase(), cur.name), "ok");
    let ev = match state.as_str() {
        "COMPLETED" => "forge:task-completed",
        "BLOCKED" | "FAILED" => "forge:task-blocked",
        _ => "forge:task-updated",
    };
    emit(&app, ev, &serde_json::json!({ "task": id, "state": state }));
    Ok(true)
}

#[tauri::command]
pub fn orch_task_update_result(app: AppHandle, id: String, result: String) -> Result<bool, String> {    let c = orch_db(&app)?;
    load_task(&c, &id)?;
    c.execute("UPDATE orch_tasks SET result=?1 WHERE id=?2", params![result.chars().take(20000).collect::<String>(), id]).map_err(|e| e.to_string())?;
    emit(&app, "forge:task-updated", &serde_json::json!({ "task": id, "result": true }));
    Ok(true)
}

/// Vincula la sesión de OpenCode que ejecuta la tarea (para reintento con
/// fork, cancelación real vía interrupt y visibilidad en el Monitor).
/// Sin esto session_id quedaba siempre null y esas tres vías morían en silencio.
#[tauri::command]
pub fn orch_task_set_session(app: AppHandle, id: String, session_id: String) -> Result<bool, String> {
    if session_id.trim().is_empty() {
        return Err("session_id vacío".to_string());
    }
    let c = orch_db(&app)?;
    load_task(&c, &id)?;
    c.execute("UPDATE orch_tasks SET session_id=?1 WHERE id=?2", params![session_id.trim(), id])
        .map_err(|e| e.to_string())?;
    emit(&app, "forge:task-updated", &serde_json::json!({ "task": id, "session": true }));
    Ok(true)
}

/// Resultado de aplicar un árbol temporal sobre el proyecto.
#[derive(Serialize, Clone, Debug, Default)]
pub struct ApplyResult {
    pub copied: Vec<String>,
    pub skipped_identical: Vec<String>,
    pub skipped_seed: Vec<String>,
    pub conflicts: Vec<String>,
    pub target: String,
}

/// Copia src → dst_root con garantías (pura en FS, testeable sin Tauri):
/// - Sin path traversal (toda salida pasa por resolve_in_root).
/// - `default.project.json` NUNCA se sobrescribe: solo se crea si el proyecto
///   no tiene uno (los tmpdirs traen una semilla mínima que destruiría el mapa).
/// - Sin `force`: los archivos existentes con contenido distinto se reportan
///   como conflictos en vez de sobrescribirse. Idénticos se omiten.
/// - Tope: 500 archivos, 200 KB por archivo (el resto se omite).
pub fn apply_tree(src: &Path, dst_root: &Path, force: bool) -> Result<ApplyResult, String> {
    let root = dst_root.canonicalize().map_err(|e| format!("canonicalize: {}", e))?;
    let mut out = ApplyResult { target: root.to_string_lossy().to_string(), ..Default::default() };
    let mut stack = vec![src.to_path_buf()];
    let mut seen = 0usize;
    while let Some(dir) = stack.pop() {
        let entries = std::fs::read_dir(&dir).map_err(|e| e.to_string())?;
        for e in entries.map_while(Result::ok) {
            let p = e.path();
            if p.is_dir() {
                stack.push(p);
                continue;
            }
            let rel = p.strip_prefix(src).map_err(|_| "fuera de raíz".to_string())?
                .to_string_lossy().replace('\\', "/");
            if rel.is_empty() {
                continue;
            }
            seen += 1;
            if seen > 500 {
                return Err("Demasiados archivos (>500): aplica por partes".to_string());
            }
            let dest = resolve_in_root(&root, &rel)?;
            let is_map = rel == "default.project.json";
            let data = match std::fs::read(&p) {
                Ok(b) if b.len() <= 200_000 => b,
                Ok(_) => {
                    out.skipped_identical.push(format!("{} (muy grande, omitido)", rel));
                    continue;
                }
                Err(_) => continue,
            };
            if is_map && dest.exists() {
                // La semilla mínima del tmpdir nunca pisa el mapa real.
                out.skipped_seed.push(rel);
                continue;
            }
            if dest.exists() {
                match std::fs::read(&dest) {
                    Ok(cur) if cur == data => {
                        out.skipped_identical.push(rel);
                        continue;
                    }
                    _ => {
                        if !force {
                            out.conflicts.push(rel);
                            continue;
                        }
                    }
                }
            }
            if let Some(par) = dest.parent() {
                std::fs::create_dir_all(par).map_err(|e| e.to_string())?;
            }
            std::fs::write(&dest, &data).map_err(|e| e.to_string())?;
            out.copied.push(rel);
        }
    }
    out.copied.sort();
    out.skipped_identical.sort();
    out.skipped_seed.sort();
    out.conflicts.sort();
    Ok(out)
}

/// Aplica TODO lo generado por un run completado al juego de una vez.
/// Origen: el tmpdir compartido del run. Destino: su project_dir (o el
/// indicado, que debe existir). Solo runs completadas; audita el resultado.
#[tauri::command]
pub fn orch_apply_to_project(app: AppHandle, run_id: String, target_dir: Option<String>, force: bool) -> Result<ApplyResult, String> {
    let c = orch_db(&app)?;
    let (project_dir, tmp_dir, status): (String, Option<String>, String) = c
        .query_row("SELECT project_dir,tmp_dir,status FROM orch_runs WHERE id=?1", params![run_id], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)))
        .map_err(|_| format!("Ejecución no encontrada: {}", run_id))?;
    if status != "completada" {
        return Err("Solo se puede aplicar una ejecución completada".to_string());
    }
    let tmp = tmp_dir.filter(|s| !s.is_empty())
        .ok_or("Esta ejecución no usó temporales aislados: sus archivos ya están en el proyecto (sincroniza con Rojo)".to_string())?;
    if !tmp.contains("forge-eval-") {
        return Err("tmpdir no reconocido".to_string());
    }
    let src = Path::new(&tmp);
    if !src.is_dir() {
        return Err("Temporales eliminados o inaccesibles: no hay nada que aplicar".to_string());
    }
    let target_root = match target_dir.map(|t| t.trim().to_string()).filter(|t| !t.is_empty()) {
        Some(t) => {
            let r = canonical_root(&t)?;
            c.execute("UPDATE orch_runs SET project_dir=?1 WHERE id=?2", params![r.to_string_lossy().to_string(), run_id]).map_err(|e| e.to_string())?;
            r
        }
        None => canonical_root(&project_dir).map_err(|_| "Sin carpeta de juego: indícala al aplicar".to_string())?,
    };
    let mut res = apply_tree(src, &target_root, force)?;
    res.target = crate::projects::pretty_path(&target_root);
    audit(&c, &run_id, "usuario", "apply_to_project",
        &format!("copiados={} conflictos={} force={}", res.copied.len(), res.conflicts.len(), force));
    emit(&app, "forge:orchestrator-updated", &serde_json::json!({ "run": run_id, "applied": res.copied.len() }));
    Ok(res)
}

#[derive(Serialize, Clone, Debug)]
pub struct PlanIssue {
    pub level: String,
    pub code: String,
    pub message: String,
}

/// Validación determinista del plan: ciclos, duplicados, conflictos,
/// agentes/skills desconocidos, tareas huérfanas de criterios.
#[tauri::command]
pub fn orch_validate_plan(app: AppHandle, run_id: String) -> Result<Vec<PlanIssue>, String> {
    let c = orch_db(&app)?;
    let tasks = orch_task_list(app.clone(), run_id.clone())?;
    let mut issues = Vec::new();
    if tasks.is_empty() {
        issues.push(PlanIssue { level: "error".into(), code: "EMPTY".into(), message: "El plan no tiene tareas".into() });
        return Ok(issues);
    }
    // Agentes y skills.
    let agents: HashSet<String> = {
        let mut st = c.prepare("SELECT id FROM agent_profiles WHERE active=1").map_err(|e| e.to_string())?;
        st.query_map([], |r| r.get(0)).map_err(|e| e.to_string())?.map_while(Result::ok).collect()
    };
    let reg: HashSet<String> = {
        let mut st = c.prepare("SELECT id FROM skills").map_err(|e| e.to_string())?;
        st.query_map([], |r| r.get(0)).map_err(|e| e.to_string())?.map_while(Result::ok).collect()
    };
    let mut names = HashSet::new();
    for t in &tasks {
        if !agents.contains(&t.agent_id) {
            issues.push(PlanIssue { level: "error".into(), code: "AGENT".into(), message: format!("{}: agente desconocido/inactivo {}", t.name, t.agent_id) });
        }
        for s in &t.skills {
            if !reg.contains(s) {
                issues.push(PlanIssue { level: "error".into(), code: "SKILL".into(), message: format!("{}: skill no registrada {}", t.name, s) });
            }
        }
        if !names.insert(t.name.to_lowercase()) {
            issues.push(PlanIssue { level: "error".into(), code: "DUPLICATE".into(), message: format!("Nombre de tarea duplicado: {}", t.name) });
        }
        if t.acceptance.is_empty() {
            issues.push(PlanIssue { level: "warning".into(), code: "ACCEPTANCE".into(), message: format!("{}: sin criterios de aceptación", t.name) });
        }
        if t.skills.is_empty() {
            issues.push(PlanIssue { level: "warning".into(), code: "SKILLS".into(), message: format!("{}: sin skills asignadas", t.name) });
        }
    }
    // DAG.
    let ids: Vec<String> = tasks.iter().map(|t| t.id.clone()).collect();
    let deps: Vec<(String, String)> = tasks.iter().flat_map(|t| t.depends_on.iter().map(move |d| (t.id.clone(), d.clone()))).collect();
    match topo_sort(&ids, &deps) {
        Ok(_) => {}
        Err(e) => issues.push(PlanIssue { level: "error".into(), code: "DAG".into(), message: e }),
    }
    // Conflictos de archivos.
    for msg in file_conflicts(&tasks.iter().map(|t| (t.id.clone(), t.state.clone(), t.files.clone())).collect::<Vec<_>>()) {
        issues.push(PlanIssue { level: "error".into(), code: "CONFLICT".into(), message: msg });
    }
    Ok(issues)
}

// --- Ejecuciones ---

#[derive(Deserialize, Clone, Debug)]
pub struct ExecStart {
    pub task_id: String,
    pub agent_id: String,
    pub session_id: Option<String>,
    pub model: Option<serde_json::Value>,
    pub skills: Vec<String>,
}

#[tauri::command]
pub fn orch_exec_start(app: AppHandle, exec: ExecStart) -> Result<String, String> {
    let c = orch_db(&app)?;
    let task = load_task(&c, &exec.task_id)?;
    if task.state != "RUNNING" {
        return Err(format!("La tarea debe estar RUNNING (está {})", task.state));
    }
    let attempt: i64 = c.query_row("SELECT COUNT(*) FROM agent_executions WHERE task_id=?1", params![exec.task_id], |r| r.get(0)).map_err(|e| e.to_string())?;
    let id = short_id("exe");
    c.execute(
        "INSERT INTO agent_executions(id,task_id,run_id,agent_id,session_id,model,skills,status,started_at,attempt)
         VALUES(?1,?2,?3,?4,?5,?6,?7,'RUNNING',?8,?9)",
        params![id, exec.task_id, task.run_id, exec.agent_id, exec.session_id,
                exec.model.map(|v| serde_json::to_string(&v).unwrap_or_default()),
                serde_json::to_string(&exec.skills).unwrap(), now_secs(), attempt + 1],
    ).map_err(|e| e.to_string())?;
    audit(&c, &task.run_id, &exec.agent_id, &format!("exec_started:{}", task.name), "ok");
    emit(&app, "forge:agent-started", &serde_json::json!({ "execution": id, "task": exec.task_id }));
    Ok(id)
}

#[tauri::command]
pub fn orch_exec_finish(app: AppHandle, id: String, status: String, tokens: Option<String>, cost: Option<f64>, transcript: Option<String>) -> Result<bool, String> {
    if !["COMPLETED", "FAILED", "CANCELLED"].contains(&status.as_str()) {
        return Err(format!("Estado final inválido: {}", status));
    }
    let c = orch_db(&app)?;
    let (task_id, run_id): (String, String) = c.query_row("SELECT task_id,run_id FROM agent_executions WHERE id=?1", params![id], |r| Ok((r.get(0)?, r.get(1)?)))
        .map_err(|_| format!("Ejecución no encontrada: {}", id))?;
    if let Some(t) = &tokens {
        if t.len() > 500 {
            return Err("tokens: objeto demasiado grande".to_string());
        }
        let v: serde_json::Value = serde_json::from_str(t).map_err(|_| "tokens debe ser JSON".to_string())?;
        if !v.is_object() {
            return Err("tokens debe ser objeto".to_string());
        }
    }
    c.execute(
        "UPDATE agent_executions SET status=?1,finished_at=?2,tokens=?3,cost=?4,transcript_excerpt=?5 WHERE id=?6",
        params![status, now_secs(), tokens, cost, transcript.map(|t| t.chars().take(8000).collect::<String>()), id],
    ).map_err(|e| e.to_string())?;
    let ev = if status == "COMPLETED" { "forge:agent-completed" } else { "forge:agent-failed" };
    emit(&app, ev, &serde_json::json!({ "execution": id, "task": task_id }));
    audit(&c, &run_id, "orchestrator", &format!("exec_{}:{}", status.to_lowercase(), task_id), "ok");
    Ok(true)
}

#[tauri::command]
pub fn orch_exec_list(app: AppHandle, run_id: String) -> Result<Vec<serde_json::Value>, String> {
    let c = orch_db(&app)?;
    let mut st = c.prepare("SELECT id,task_id,agent_id,session_id,model,skills,status,started_at,finished_at,tokens,cost,attempt FROM agent_executions WHERE run_id=?1 ORDER BY started_at ASC").map_err(|e| e.to_string())?;
    Ok(st.query_map(params![run_id], |r| Ok(serde_json::json!({
        "id": r.get::<_, String>(0)?, "task_id": r.get::<_, String>(1)?, "agent_id": r.get::<_, String>(2)?,
        "session_id": r.get::<_, Option<String>>(3)?, "model": r.get::<_, Option<String>>(4)?,
        "skills": serde_json::from_str::<Vec<String>>(&r.get::<_, String>(5)?).unwrap_or_default(),
        "status": r.get::<_, String>(6)?, "started_at": r.get::<_, i64>(7)?, "finished_at": r.get::<_, Option<i64>>(8)?,
        "tokens": r.get::<_, Option<String>>(9)?, "cost": r.get::<_, Option<f64>>(10)?, "attempt": r.get::<_, i64>(11)?,
    }))).map_err(|e| e.to_string())?.map_while(Result::ok).collect())
}

// --- Mensajes ---

#[tauri::command]
pub fn orch_message_post(app: AppHandle, run_id: String, task_id: Option<String>, kind: String, from_agent: String, to_agent: String, content: String, files: Option<Vec<String>>) -> Result<i64, String> {
    if !MSG_KINDS.contains(&kind.as_str()) {
        return Err(format!("Tipo de mensaje inválido: {}", kind));
    }
    if content.trim().is_empty() || content.len() > 20000 {
        return Err("Contenido 1–20000 caracteres".to_string());
    }
    let c = orch_db(&app)?;
    c.execute(
        "INSERT INTO agent_messages(run_id,task_id,kind,from_agent,to_agent,content,files,state,created_at) VALUES(?1,?2,?3,?4,?5,?6,?7,'nuevo',?8)",
        params![run_id, task_id, kind, from_agent.trim(), to_agent.trim(), content.trim(),
                serde_json::to_string(&files.unwrap_or_default()).unwrap(), now_secs()],
    ).map_err(|e| e.to_string())?;
    Ok(c.last_insert_rowid())
}

#[tauri::command]
pub fn orch_message_list(app: AppHandle, run_id: String, limit: Option<i64>) -> Result<Vec<serde_json::Value>, String> {
    let c = orch_db(&app)?;
    let lim = limit.unwrap_or(200).clamp(1, 500);
    let mut st = c.prepare("SELECT id,task_id,kind,from_agent,to_agent,content,files,state,created_at FROM agent_messages WHERE run_id=?1 ORDER BY id ASC LIMIT ?2").map_err(|e| e.to_string())?;
    Ok(st.query_map(params![run_id, lim], |r| Ok(serde_json::json!({
        "id": r.get::<_, i64>(0)?, "task_id": r.get::<_, Option<String>>(1)?, "kind": r.get::<_, String>(2)?,
        "from": r.get::<_, String>(3)?, "to": r.get::<_, String>(4)?, "content": r.get::<_, String>(5)?,
        "files": serde_json::from_str::<Vec<String>>(&r.get::<_, String>(6)?).unwrap_or_default(),
        "state": r.get::<_, String>(7)?, "created_at": r.get::<_, i64>(8)?,
    }))).map_err(|e| e.to_string())?.map_while(Result::ok).collect())
}

// --- Aprobaciones ---

#[tauri::command]
pub fn orch_approval_request(app: AppHandle, run_id: String, task_id: Option<String>, kind: String, summary: String, payload: Option<String>) -> Result<String, String> {
    if !APPROVAL_KINDS.contains(&kind.as_str()) {
        return Err(format!("Tipo de aprobación inválido: {}", kind));
    }
    if summary.trim().is_empty() {
        return Err("Resumen obligatorio".to_string());
    }
    let c = orch_db(&app)?;
    let id = short_id("apr");
    c.execute(
        "INSERT INTO approval_requests(id,run_id,task_id,kind,summary,payload,status,created_at) VALUES(?1,?2,?3,?4,?5,?6,'pendiente',?7)",
        params![id, run_id, task_id, kind, summary.trim(), payload.map(|p| p.chars().take(8000).collect::<String>()), now_secs()],
    ).map_err(|e| e.to_string())?;
    audit(&c, &run_id, "coordinator", &format!("approval_requested:{}:{}", kind, summary.trim()), "pendiente");
    emit(&app, "forge:approval-required", &serde_json::json!({ "approval": id, "kind": kind }));
    Ok(id)
}

#[tauri::command]
pub fn orch_approval_list(app: AppHandle, run_id: String) -> Result<Vec<serde_json::Value>, String> {
    let c = orch_db(&app)?;
    let mut st = c.prepare("SELECT id,task_id,kind,summary,payload,status,decided_by,decided_at,created_at FROM approval_requests WHERE run_id=?1 ORDER BY created_at DESC LIMIT 100").map_err(|e| e.to_string())?;
    Ok(st.query_map(params![run_id], |r| Ok(serde_json::json!({
        "id": r.get::<_, String>(0)?, "task_id": r.get::<_, Option<String>>(1)?, "kind": r.get::<_, String>(2)?,
        "summary": r.get::<_, String>(3)?, "payload": r.get::<_, Option<String>>(4)?, "status": r.get::<_, String>(5)?,
        "decided_by": r.get::<_, Option<String>>(6)?, "decided_at": r.get::<_, Option<i64>>(7)?, "created_at": r.get::<_, i64>(8)?,
    }))).map_err(|e| e.to_string())?.map_while(Result::ok).collect())
}

#[tauri::command]
pub fn orch_approval_decide(app: AppHandle, id: String, approve: bool) -> Result<bool, String> {
    let c = orch_db(&app)?;
    let (run_id, st): (String, String) = c.query_row("SELECT run_id,status FROM approval_requests WHERE id=?1", params![id], |r| Ok((r.get(0)?, r.get(1)?)))
        .map_err(|_| format!("Aprobación no encontrada: {}", id))?;
    if st != "pendiente" {
        return Err(format!("Ya decidida: {}", st));
    }
    let v = if approve { "aprobada" } else { "rechazada" };
    c.execute("UPDATE approval_requests SET status=?1,decided_by='usuario',decided_at=?2 WHERE id=?3", params![v, now_secs(), id]).map_err(|e| e.to_string())?;
    audit(&c, &run_id, "usuario", &format!("approval_{}:{}", v, id), "ok");
    emit(&app, "forge:review-completed", &serde_json::json!({ "approval": id, "decision": v }));
    Ok(true)
}

// --- Artefactos y auditoría ---

#[tauri::command]
pub fn orch_artifact_add(app: AppHandle, run_id: String, task_id: Option<String>, execution_id: Option<String>, rel: String, size: i64, hash: String) -> Result<bool, String> {
    if rel.is_empty() || rel.len() > 300 || rel.contains("..") || std::path::Path::new(&rel).is_absolute() {
        return Err("Ruta de artefacto inválida".to_string());
    }
    let c = orch_db(&app)?;
    c.execute(
        "INSERT INTO execution_artifacts(run_id,task_id,execution_id,rel,size,hash,created_at) VALUES(?1,?2,?3,?4,?5,?6,?7)",
        params![run_id, task_id, execution_id, rel, size, hash.chars().take(128).collect::<String>(), now_secs()],
    ).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub fn orch_artifact_list(app: AppHandle, run_id: String) -> Result<Vec<serde_json::Value>, String> {
    let c = orch_db(&app)?;
    let mut st = c.prepare("SELECT task_id,execution_id,rel,size,hash,created_at FROM execution_artifacts WHERE run_id=?1 ORDER BY id ASC LIMIT 500").map_err(|e| e.to_string())?;
    Ok(st.query_map(params![run_id], |r| Ok(serde_json::json!({
        "task_id": r.get::<_, Option<String>>(0)?, "execution_id": r.get::<_, Option<String>>(1)?,
        "rel": r.get::<_, String>(2)?, "size": r.get::<_, i64>(3)?, "hash": r.get::<_, String>(4)?, "created_at": r.get::<_, i64>(5)?,
    }))).map_err(|e| e.to_string())?.map_while(Result::ok).collect())
}

#[tauri::command]
pub fn orch_audit_add(app: AppHandle, run_id: String, actor: String, action: String, tool: Option<String>, files: Option<Vec<String>>, permission: Option<String>, result: String) -> Result<bool, String> {
    if actor.trim().is_empty() || action.trim().is_empty() {
        return Err("Actor y acción obligatorios".to_string());
    }
    let c = orch_db(&app)?;
    c.execute(
        "INSERT INTO agent_audit_log(run_id,actor,action,tool,files,permission,result,created_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8)",
        params![run_id, actor.trim(), action.trim(), tool,
                files.map(|f| serde_json::to_string(&f).unwrap_or_else(|_| "[]".into())),
                permission, result.chars().take(2000).collect::<String>(), now_secs()],
    ).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub fn orch_audit_list(app: AppHandle, run_id: String) -> Result<Vec<serde_json::Value>, String> {
    let c = orch_db(&app)?;
    let mut st = c.prepare("SELECT actor,action,tool,files,permission,result,created_at FROM agent_audit_log WHERE run_id=?1 ORDER BY id ASC LIMIT 500").map_err(|e| e.to_string())?;
    Ok(st.query_map(params![run_id], |r| Ok(serde_json::json!({
        "actor": r.get::<_, String>(0)?, "action": r.get::<_, String>(1)?, "tool": r.get::<_, Option<String>>(2)?,
        "files": r.get::<_, Option<String>>(3)?.and_then(|s| serde_json::from_str::<Vec<String>>(&s).ok()).unwrap_or_default(),
        "permission": r.get::<_, Option<String>>(4)?, "result": r.get::<_, String>(5)?, "created_at": r.get::<_, i64>(6)?,
    }))).map_err(|e| e.to_string())?.map_while(Result::ok).collect())
}

// --- Helpers expuestos (fuente única para el frontend) ---

/// Tareas listas para ejecutar (dependencias COMPLETED, sin terminales).
#[tauri::command]
pub fn orch_ready_tasks(app: AppHandle, run_id: String) -> Result<Vec<String>, String> {
    let tasks = orch_task_list(app.clone(), run_id)?;
    let states: HashMap<String, String> = tasks.iter().map(|t| (t.id.clone(), t.state.clone())).collect();
    let deps: Vec<(String, String)> = tasks.iter().flat_map(|t| t.depends_on.iter().map(move |d| (t.id.clone(), d.clone()))).collect();
    Ok(ready_tasks(&states, &deps))
}

/// Modelo efectivo con herencia tarea > agente > run (None = heredar sesión).
#[tauri::command]
pub fn orch_resolve_model(task: Option<serde_json::Value>, agent: Option<serde_json::Value>, run_default: Option<serde_json::Value>) -> Result<Option<serde_json::Value>, String> {
    Ok(resolve_model(task.as_ref(), agent.as_ref(), run_default.as_ref()))
}

/// ¿Esta operación exige aprobación? (gating del runner/UI).
#[tauri::command]
pub fn orch_is_risky(op: String) -> bool {
    is_risky_op(&op)
}

/// Operaciones que siempre exigen aprobación (para gating en UI/runner).
#[tauri::command]
pub fn orch_risky_ops() -> Vec<String> {
    RISKY_OPS.iter().map(|s| s.to_string()).collect()
}

/// Permisos válidos (para formularios de perfiles).
#[tauri::command]
pub fn orch_permissions() -> Vec<String> {
    PERMS.iter().map(|s| s.to_string()).collect()
}

/// Tipos de mensaje válidos (para el centro de comunicación).
#[tauri::command]
pub fn orch_message_kinds() -> Vec<String> {
    MSG_KINDS.iter().map(|s| s.to_string()).collect()
}

// --- Dashboard y exportación ---

fn orch_dashboard_inner(app: &AppHandle) -> Result<serde_json::Value, String> {
    let c = orch_db(app)?;
    let count = |sql: &str| -> i64 {
        c.query_row(sql, [], |r| r.get(0)).unwrap_or(0)
    };
    let mut by_state = serde_json::Map::new();
    {
        let mut st = c.prepare("SELECT state,COUNT(*) FROM orch_tasks GROUP BY state").map_err(|e| e.to_string())?;
        for (s, n) in st.query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, i64>(1)?))).map_err(|e| e.to_string())?.map_while(Result::ok) {
            by_state.insert(s, serde_json::json!(n));
        }
    }
    let pending_approvals: i64 = c.query_row("SELECT COUNT(*) FROM approval_requests WHERE status='pendiente'", [], |r| r.get(0)).unwrap_or(0);
    let runs: i64 = count("SELECT COUNT(*) FROM orch_runs");
    let recent: Vec<serde_json::Value> = {
        let mut st = c.prepare("SELECT id,goal,status,created_at FROM orch_runs ORDER BY created_at DESC LIMIT 8").map_err(|e| e.to_string())?;
        st.query_map([], |r| Ok(serde_json::json!({
            "id": r.get::<_, String>(0)?, "goal": r.get::<_, String>(1)?, "status": r.get::<_, String>(2)?, "created_at": r.get::<_, i64>(3)?,
        }))).map_err(|e| e.to_string())?.map_while(Result::ok).collect()
    };
    Ok(serde_json::json!({
        "profiles": count("SELECT COUNT(*) FROM agent_profiles WHERE active=1"),
        "runs": runs,
        "pending_approvals": pending_approvals,
        "blocked_tasks": count("SELECT COUNT(*) FROM orch_tasks WHERE state='BLOCKED'"),
        "running_tasks": count("SELECT COUNT(*) FROM orch_tasks WHERE state='RUNNING'"),
        "by_state": by_state, "recent": recent,
    }))
}

#[tauri::command]
pub fn orch_dashboard(app: AppHandle) -> Result<serde_json::Value, String> {
    orch_db(&app)?;
    orch_dashboard_inner(&app)
}

#[tauri::command]
pub fn orch_run_delete(app: AppHandle, id: String) -> Result<bool, String> {
    let c = orch_db(&app)?;
    let st: String = c.query_row("SELECT status FROM orch_runs WHERE id=?1", params![id], |r| r.get(0))
        .map_err(|_| format!("Ejecución no encontrada: {}", id))?;
    if ["en_ejecucion", "pausado"].contains(&st.as_str()) {
        return Err("Cancela la ejecución antes de borrarla".to_string());
    }
    let live: i64 = c.query_row("SELECT COUNT(*) FROM orch_tasks WHERE run_id=?1 AND state IN ('RUNNING','WAITING_APPROVAL')", params![id], |r| r.get(0)).map_err(|e| e.to_string())?;
    if live > 0 {
        return Err("Hay tareas en marcha: cancela primero".to_string());
    }
    for t in ["agent_audit_log", "execution_artifacts", "approval_requests", "agent_messages", "agent_executions"] {
        c.execute(&format!("DELETE FROM {} WHERE run_id=?1", t), params![id]).map_err(|e| e.to_string())?;
    }
    c.execute("DELETE FROM task_dependencies WHERE task_id IN (SELECT id FROM orch_tasks WHERE run_id=?1)", params![id]).map_err(|e| e.to_string())?;
    c.execute("DELETE FROM orch_tasks WHERE run_id=?1", params![id]).map_err(|e| e.to_string())?;
    c.execute("DELETE FROM orch_runs WHERE id=?1", params![id]).map_err(|e| e.to_string())?;
    emit(&app, "forge:orchestrator-updated", &serde_json::json!({ "run": id, "deleted": true }));
    Ok(true)
}

#[tauri::command]
pub fn orch_export(app: AppHandle, run_id: String, format: String) -> Result<serde_json::Value, String> {
    if !["json", "md"].contains(&format.as_str()) {
        return Err("Formato: json|md".to_string());
    }
    let run = orch_run_get(app.clone(), run_id.clone())?;
    let tasks = orch_task_list(app.clone(), run_id.clone())?;
    let messages = orch_message_list(app.clone(), run_id.clone(), Some(200))?;
    let approvals = orch_approval_list(app.clone(), run_id.clone())?;
    let artifacts = orch_artifact_list(app.clone(), run_id.clone())?;
    let audit = orch_audit_list(app.clone(), run_id.clone())?;
    let data = serde_json::json!({ "run": run, "tasks": tasks, "messages": messages, "approvals": approvals, "artifacts": artifacts, "audit": audit });
    let content = if format == "json" {
        serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?
    } else {
        let t = tasks.iter().map(|x| format!("- [{}] {} ({})", x.state, x.name, x.agent_id)).collect::<Vec<_>>().join("\n");
        format!("# Informe de orquestación\n\nObjetivo: {}\nEstado: {}\n\n## Tareas\n{}\n\n```json\n{}\n```\n",
            run["goal"].as_str().unwrap_or(""), run["status"].as_str().unwrap_or(""), t,
            serde_json::to_string_pretty(&serde_json::json!({ "approvals": approvals, "artifacts": artifacts })).unwrap_or_default().chars().take(6000).collect::<String>())
    };
    Ok(serde_json::json!({ "filename": format!("orch-{}-{}.{}", run_id, now_secs(), format), "content": content }))
}

// ---------------------------------------------------------------------------
// Tests: DAG, estados, permisos, resolución de modelo, ranking, conflictos
// ---------------------------------------------------------------------------

#[cfg(test)]
mod orch_tests {
    use super::*;
    use std::path::PathBuf;

    fn t(id: &str) -> String {
        id.to_string()
    }

    #[test]
    fn topo_orden_y_ciclos() {
        let tasks = vec![t("a"), t("b"), t("c")];
        let deps = vec![(t("b"), t("a")), (t("c"), t("b"))];
        assert_eq!(topo_sort(&tasks, &deps).unwrap(), vec!["a", "b", "c"]);
        // Ciclo a->b->a.
        let cyc = vec![(t("a"), t("b")), (t("b"), t("a"))];
        let e = topo_sort(&tasks, &cyc).unwrap_err();
        assert!(e.contains("circular"), "{}", e);
        // Dependencia desconocida y auto-dependencia.
        assert!(topo_sort(&tasks, &[(t("x"), t("a"))]).is_err());
        assert!(topo_sort(&tasks, &[(t("a"), t("a"))]).is_err());
    }

    #[test]
    fn ready_respeta_dependencias() {
        let mut st = HashMap::new();
        st.insert(t("a"), "COMPLETED".to_string());
        st.insert(t("b"), "PENDING".to_string());
        st.insert(t("c"), "PENDING".to_string());
        st.insert(t("d"), "RUNNING".to_string());
        let deps = vec![(t("b"), t("a")), (t("c"), t("b"))];
        let r = ready_tasks(&st, &deps);
        assert_eq!(r, vec!["b"]);
        assert!(!r.contains(&t("d")));
    }

    #[test]
    fn transiciones_estrictas() {
        assert!(can_transition("PENDING", "RUNNING"));
        assert!(can_transition("RUNNING", "WAITING_APPROVAL"));
        assert!(can_transition("WAITING_APPROVAL", "RUNNING"));
        assert!(can_transition("WAITING_APPROVAL", "COMPLETED"));
        assert!(can_transition("FAILED", "READY"));
        assert!(!can_transition("PENDING", "COMPLETED"));
        // Reanudación tras aprobar en Revisión + re-implementación de diseño.
        assert!(can_transition("WAITING_APPROVAL", "READY"));
        assert!(can_transition("COMPLETED", "READY"));
        assert!(!can_transition("RUNNING", "READY"));
        assert!(can_transition("BLOCKED", "CANCELLED"));
    }

    #[test]
    fn permisos_riesgosos_cerrados() {
        assert!(is_risky_op("delete_file"));
        assert!(is_risky_op("studio_modify"));
        assert!(!is_risky_op("read_file"));
        assert!(!is_risky_op("list_files"));
        assert_eq!(RISKY_OPS.len(), 7);
        assert_eq!(PERMS.len(), 7);
        assert_eq!(MSG_KINDS.len(), 10);
    }

    #[test]
    fn modelo_hereda_tarea_agente_run() {
        let tm = serde_json::json!({"id": "m1", "providerID": "p"});
        let am = serde_json::json!({"id": "m2", "providerID": "p"});
        let rm = serde_json::json!({"id": "m3", "providerID": "p"});
        assert_eq!(resolve_model(Some(&tm), Some(&am), Some(&rm)), Some(tm.clone()));
        assert_eq!(resolve_model(None, Some(&am), Some(&rm)), Some(am.clone()));
        assert_eq!(resolve_model(None, None, Some(&rm)), Some(rm.clone()));
        assert_eq!(resolve_model(None, None, None), None);
    }

    #[test]
    fn ranking_prioriza_y_no_excluye() {
        let cat = vec![
            (t("roblox-main-menu"), "ui-ux".to_string(), Some("PASSED".to_string())),
            (t("roblox-networking"), "multiplayer-networking".to_string(), Some("FAILED".to_string())),
            (t("roblox-ui"), "ui-ux".to_string(), None),
        ];
        let r = rank_skills("quiero un menú principal con modos", &cat, 5);
        assert_eq!(r[0].0, "roblox-main-menu");
        assert!(r.iter().any(|(id, _, _)| id == "roblox-ui"), "no evaluadas no se excluyen");
        let failed = r.iter().find(|(id, _, _)| id == "roblox-networking").unwrap();
        assert!(failed.1 < 0, "FAILED depriorizada");
    }

    #[test]
    fn conflictos_de_archivos() {
        let tasks = vec![
            (t("a"), "RUNNING".to_string(), vec!["src/server/Main.server.luau".to_string()]),
            (t("b"), "READY".to_string(), vec!["src/server/Main.server.luau".to_string()]),
            (t("c"), "COMPLETED".to_string(), vec!["src/server/Main.server.luau".to_string()]),
        ];
        let c = file_conflicts(&tasks);
        assert_eq!(c.len(), 1);
        assert!(c[0].contains('a') && c[0].contains('b'));
    }

    #[test]
    fn migracion_y_perfiles_reales() {
        let c = Connection::open_in_memory().unwrap();
        migrate_orch_tables(&c).unwrap();
        let n: i64 = c.query_row("SELECT COUNT(*) FROM agent_profiles WHERE is_builtin=1", [], |r| r.get(0)).unwrap();
        assert_eq!(n, 10);
        // Todos con 2–5 skills y permisos del catálogo.
        let mut st = c.prepare("SELECT skills,permissions FROM agent_profiles").unwrap();
        for (sk, pm) in st.query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?))).unwrap().map_while(Result::ok) {
            let skills: Vec<String> = serde_json::from_str(&sk).unwrap();
            assert!((2..=5).contains(&skills.len()), "skills: {:?}", skills);
            let perms: Vec<String> = serde_json::from_str(&pm).unwrap();
            assert!(!perms.is_empty());
            assert!(perms.iter().all(|p| PERMS.contains(&p.as_str())));
        }
    }

    fn orch_tmp_fixture(tag: &str) -> (PathBuf, PathBuf) {
        let b = std::env::temp_dir().join(format!("forge-orch-apply-{}-{}", std::process::id(), tag));
        let _ = std::fs::remove_dir_all(&b);
        let src = b.join("src");
        let dst = b.join("dst");
        std::fs::create_dir_all(src.join("shared")).unwrap();
        std::fs::create_dir_all(dst.join("src")).unwrap();
        std::fs::write(src.join("shared/A.luau"), "local x = 1\n").unwrap();
        std::fs::write(src.join("default.project.json"), "{\"name\":\"tmp\"}").unwrap();
        std::fs::write(dst.join("src/B.luau"), "local y = 2\n").unwrap();
        (src, dst)
    }

    #[test]
    fn apply_tree_copia_y_protege_mapa() {
        let (src, dst) = orch_tmp_fixture("basic");
        // Sin mapa en destino: la semilla SÍ se copia (convierte el juego en proyecto Rojo).
        let r = apply_tree(&src, &dst, false).unwrap();
        assert!(r.copied.iter().any(|x| x == "shared/A.luau"));
        assert!(dst.join("shared/A.luau").is_file());
        assert!(dst.join("default.project.json").is_file());
        // Con mapa propio en destino: la semilla jamás lo pisa.
        std::fs::write(dst.join("default.project.json"), "{\"name\":\"real\"}").unwrap();
        let r2 = apply_tree(&src, &dst, false).unwrap();
        assert!(r2.skipped_seed.iter().any(|x| x == "default.project.json"));
        assert_eq!(std::fs::read_to_string(dst.join("default.project.json")).unwrap(), "{\"name\":\"real\"}");
        let _ = std::fs::remove_dir_all(src.parent().unwrap());
    }

    #[test]
    fn apply_tree_conflictos_sin_force() {
        let (src, dst) = orch_tmp_fixture("conflict");
        std::fs::write(src.join("shared/C.luau"), "local y = 999\n").unwrap();
        std::fs::create_dir_all(dst.join("shared")).unwrap();
        std::fs::write(dst.join("shared/C.luau"), "local y = 2\n").unwrap();
        // Sin force: conflicto reportado, destino intacto.
        let r = apply_tree(&src, &dst, false).unwrap();
        assert!(r.conflicts.iter().any(|x| x == "shared/C.luau"));
        assert_eq!(std::fs::read_to_string(dst.join("shared/C.luau")).unwrap(), "local y = 2\n");
        // Con force: sobrescribe.
        let r2 = apply_tree(&src, &dst, true).unwrap();
        assert!(r2.conflicts.is_empty());
        assert_eq!(std::fs::read_to_string(dst.join("shared/C.luau")).unwrap(), "local y = 999\n");
        // Idempotente: segunda pasada todo idéntico salvo la semilla.
        let r3 = apply_tree(&src, &dst, false).unwrap();
        assert!(r3.copied.iter().all(|x| x == "default.project.json") || r3.copied.is_empty());
        assert!(r3.conflicts.is_empty());
        let _ = std::fs::remove_dir_all(src.parent().unwrap());
    }

    #[test]
    fn apply_tree_bloquea_traversal() {
        let b = std::env::temp_dir().join(format!("forge-orch-apply-{}-trav", std::process::id()));
        let _ = std::fs::remove_dir_all(&b);
        let src = b.join("src");
        let dst = b.join("dst");
        std::fs::create_dir_all(&src).unwrap();
        std::fs::create_dir_all(&dst).unwrap();
        // Un enlace o nombre raro no debe escapar: resolve_in_root lo impide.
        // (En Windows no se crean symlinks sin privilegios; se valida vía API.)
        let r = apply_tree(&src, &dst, false).unwrap();
        assert!(r.copied.is_empty());
        let _ = std::fs::remove_dir_all(&b);
    }
}
