// Autoconfiguración del MCP de Roblox Studio para un proyecto.
// Escribe `<proyecto>/.opencode/opencode.json` fusionando la entrada
// `roblox-studio` (puente Chrrxs, comando recomendado verificado en las
// release notes: `npx -y @chrrxs/robloxstudio-mcp@latest --auto-install-plugin`)
// sin tocar el resto del archivo. Nunca se sobrescribe a ciegas: si el JSON
// existe y no parsea, se devuelve error en vez de destruirlo.
// El plugin de Studio (MCPPlugin.rbxmx desde
// https://github.com/Chrrxs/robloxstudio-mcp/releases, Plugins → carpeta de
// plugins) y su activación siguen siendo manuales: la app lo indica.
use std::path::PathBuf;
use tauri::AppHandle;

pub const MCP_SERVER_NAME: &str = "roblox-studio";
pub const MCP_SERVER_COMMAND: &str = "npx -y @chrrxs/robloxstudio-mcp@latest --auto-install-plugin";
pub const MCP_RELEASES_URL: &str = "https://github.com/Chrrxs/robloxstudio-mcp/releases";

#[derive(serde::Serialize, Clone, Debug)]
pub struct McpEnsureResult {
    pub configured: bool,
    pub created_file: bool,
    pub detail: String,
}

/// Fusiona la entrada MCP en el JSON existente (o vacío). Pura y testeada.
pub fn merge_mcp_entry(existing: &str, name: &str, command: &[&str]) -> Result<String, String> {
    let mut v: serde_json::Value = if existing.trim().is_empty() {
        serde_json::json!({})
    } else {
        serde_json::from_str(existing).map_err(|e| format!("El opencode.json existente no es JSON válido ({e}): corrígelo a mano, no lo toco."))?
    };
    if !v.is_object() {
        return Err("El opencode.json existente no es un objeto: corrígelo a mano, no lo toco.".to_string());
    }
    if let Some(m) = v.get("mcp") {
        if !m.is_object() {
            return Err("La sección `mcp` de tu opencode.json no es un objeto: corrígela a mano, no la toco.".to_string());
        }
    } else {
        v["mcp"] = serde_json::json!({});
    }
    let mcp = v.get_mut("mcp").and_then(|m| m.as_object_mut()).ok_or_else(|| "No se pudo crear la sección mcp.".to_string())?;
    if let Some(cur) = mcp.get(name) {
        let cur_cmd = cur.get("command").and_then(|c| c.as_array()).map(|a| {
            a.iter().filter_map(|x| x.as_str().map(|s| s.to_string())).collect::<Vec<_>>()
        });
        let want: Vec<String> = command.iter().map(|s| s.to_string()).collect();
        if cur_cmd.as_deref() == Some(want.as_slice()) {
            return Ok(serde_json::to_string_pretty(&v).map_err(|e| e.to_string())?);
        }
    }
    mcp.insert(
        name.to_string(),
        serde_json::json!({
            "type": "local",
            "command": command,
            "enabled": true,
        }),
    );
    serde_json::to_string_pretty(&v).map_err(|e| e.to_string())
}

fn opencode_json_path(project_dir: &str) -> Result<PathBuf, String> {
    let root = std::path::Path::new(project_dir);
    if !root.is_dir() {
        return Err("La carpeta del proyecto no existe.".to_string());
    }
    Ok(root.join(".opencode").join("opencode.json"))
}

/// Comprueba Node/npx (el puente Chrrxs se ejecuta con npx). Rápido y honesto.
fn npx_available() -> bool {
    std::process::Command::new("cmd")
        .args(["/C", "npx", "--version"])
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

#[tauri::command]
pub fn mcp_ensure_roblox(_app: AppHandle, project_dir: String) -> Result<McpEnsureResult, String> {
    let path = opencode_json_path(&project_dir)?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("No se pudo crear .opencode: {e}"))?;
    }
    let existed = path.is_file();
    let existing = if existed {
        std::fs::read_to_string(&path).map_err(|e| format!("No se pudo leer opencode.json: {e}"))?
    } else {
        String::new()
    };
    let already = existed
        && serde_json::from_str::<serde_json::Value>(&existing)
            .ok()
            .and_then(|v| v.get("mcp")?.get(MCP_SERVER_NAME)?.get("command")?.as_array().cloned())
            .map(|a| a.iter().filter_map(|x| x.as_str()).collect::<Vec<_>>().join(" "))
            .is_some_and(|s| s == MCP_SERVER_COMMAND);
    if !already {
        let merged = merge_mcp_entry(
            &existing,
            MCP_SERVER_NAME,
            &["npx", "-y", "@chrrxs/robloxstudio-mcp@latest", "--auto-install-plugin"],
        )?;
        std::fs::write(&path, merged).map_err(|e| format!("No se pudo escribir opencode.json: {e}"))?;
    }
    let npx = npx_available();
    let mut detail = if already {
        "El proyecto ya tenía `roblox-studio` configurado en .opencode/opencode.json.".to_string()
    } else if existed {
        "Añadido `roblox-studio` a tu .opencode/opencode.json (resto intacto).".to_string()
    } else {
        "Creado .opencode/opencode.json con `roblox-studio`.".to_string()
    };
    if !npx {
        detail.push_str(" AVISO: no se encontró `npx` (instala Node.js LTS) o tardó demasiado: el MCP fallará hasta tenerlo.");
    }
    detail.push_str(" Pasos que siguen siendo manuales: 1) descarga MCPPlugin.rbxmx de la última release (https://github.com/Chrrxs/robloxstudio-mcp/releases); 2) en Studio ve a Plugins → carpeta de plugins y pégalo ahí; 3) cierra y reabre Studio del todo; 4) crea una sesión nueva del proyecto para que OpenCode cargue el MCP.");
    Ok(McpEnsureResult { configured: true, created_file: !existed, detail })
}

#[cfg(test)]
mod mcp_tests {
    use super::*;

    #[test]
    fn fusiona_sin_romper_lo_existente() {
        let base = r#"{"model": "x", "mcp": {"otro": {"type": "local", "command": ["a"]}}}"#;
        let out = merge_mcp_entry(base, MCP_SERVER_NAME, &["npx", "-y", "pkg"]).unwrap();
        let v: serde_json::Value = serde_json::from_str(&out).unwrap();
        assert_eq!(v["model"], "x");
        assert_eq!(v["mcp"]["otro"]["command"], serde_json::json!(["a"]));
        assert_eq!(v["mcp"][MCP_SERVER_NAME]["command"], serde_json::json!(["npx", "-y", "pkg"]));
    }

    #[test]
    fn crea_desde_vacio_y_es_idempotente() {
        let once = merge_mcp_entry("", MCP_SERVER_NAME, &["npx"]).unwrap();
        let twice = merge_mcp_entry(&once, MCP_SERVER_NAME, &["npx"]).unwrap();
        assert_eq!(once, twice);
    }

    #[test]
    fn json_roto_no_se_toca() {
        assert!(merge_mcp_entry("{no json", MCP_SERVER_NAME, &["npx"]).is_err());
        assert!(merge_mcp_entry("[1,2]", MCP_SERVER_NAME, &["npx"]).is_err());
    }
}
