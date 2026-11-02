// Generación de imágenes con Cloudflare Workers AI (FLUX.1 schnell).
// Contrato real (developers.cloudflare.com/workers-ai):
//   POST https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/run/@cf/black-forest-labs/flux-1-schnell
//   Auth: `Authorization: Bearer {API_TOKEN}` (cuenta gratuita + token con
//   permisos Workers AI; 10.000 Neurons/día gratis en todos los planes).
//   Body: {prompt: 1..=2048 chars, steps: 1..=8 (defecto 4), seed?: entero}.
//   Respuesta: {result:{image: base64 jpeg}, success, errors:[{message}]}.
// Sin mocks: la red solo se toca en `cf_images_generate`; validación, parseo
// y sniff de formato son puros y testeados.
use tauri::AppHandle;

pub const FLUX_MODEL: &str = "@cf/black-forest-labs/flux-1-schnell";
pub const FLUX_DEFAULT_STEPS: u8 = 4;
pub const FLUX_MAX_STEPS: u8 = 8;
pub const FLUX_MAX_PROMPT_CHARS: usize = 2048;

#[derive(serde::Serialize, Clone, Debug)]
pub struct GeneratedImage {
    pub file: String,
    pub size: u64,
    /// Nota de coste/uso tal cual la reporte la API (si la reporta).
    pub usage: Option<String>,
    /// Duración de la llamada en ms (medida en el backend).
    pub elapsed_ms: u64,
}

/// Nota de coste/uso oportunista: Cloudflare no documenta campos de coste
/// para este modelo; si la respuesta incluye `usage`/`cost`/`meta` se muestra
/// tal cual, sin inventar nada.
pub fn extract_usage_note(v: &serde_json::Value) -> Option<String> {
    for key in ["usage", "cost", "meta"] {
        if let Some(u) = v.get(key) {
            if u.is_null() {
                continue;
            }
            let s = serde_json::to_string(u).unwrap_or_default();
            if !s.is_empty() && s != "null" && s != "{}" {
                return Some(s.chars().take(300).collect());
            }
        }
    }
    None
}

/// Extensión permitida para pegados del portapapeles (allowlist estricta).
pub fn validate_upload_ext(ext: &str) -> Result<String, String> {
    let e = ext.trim().trim_start_matches('.').to_lowercase();
    match e.as_str() {
        "png" | "jpg" | "jpeg" | "webp" | "gif" => Ok(if e == "jpeg" { "jpg".to_string() } else { e }),
        _ => Err("Formato de imagen no soportado (png/jpg/webp/gif).".to_string()),
    }
}

pub const CLIP_MAX_BYTES: usize = 15 * 1024 * 1024;

/// Guarda una imagen del portapapeles (base64) en el temporal de la app y
/// devuelve su ruta absoluta. Límite 15 MB.
#[tauri::command]
pub fn images_save_upload(base64_data: String, ext: String) -> Result<String, String> {
    let ext = validate_upload_ext(&ext)?;
    let clean = match base64_data.find(";base64,") {
        Some(i) => &base64_data[i + 8..],
        None => base64_data.as_str(),
    };
    use base64::Engine as _;
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(clean.trim())
        .map_err(|_| "La imagen pegada no se pudo decodificar.".to_string())?;
    if bytes.is_empty() {
        return Err("La imagen pegada está vacía.".to_string());
    }
    if bytes.len() > CLIP_MAX_BYTES {
        return Err("La imagen supera los 15 MB.".to_string());
    }
    let dir = std::env::temp_dir().join("rblx-forge-clip");
    std::fs::create_dir_all(&dir).map_err(|e| format!("No se pudo crear el temporal: {e}"))?;
    let stamp = chrono_stamp();
    let file = dir.join(format!("paste-{stamp}.{ext}"));
    std::fs::write(&file, &bytes).map_err(|e| format!("No se pudo guardar la imagen pegada: {e}"))?;
    Ok(file.to_string_lossy().to_string())
}

/// Steps: defecto 4, recorte honesto a 1..=8 (documentado por Cloudflare).
pub fn clamp_steps(steps: Option<i64>) -> u8 {
    match steps {
        None => FLUX_DEFAULT_STEPS,
        Some(s) if s < 1 => 1,
        Some(s) if s > FLUX_MAX_STEPS as i64 => FLUX_MAX_STEPS,
        Some(s) => s as u8,
    }
}

/// Prompt válido: 1..=2048 caracteres tras recortar (límite del modelo).
pub fn validate_prompt(prompt: &str) -> Result<String, String> {
    let p = prompt.trim().to_string();
    if p.is_empty() {
        return Err("El prompt está vacío: describe la imagen que quieres generar.".to_string());
    }
    if p.chars().count() > FLUX_MAX_PROMPT_CHARS {
        return Err(format!(
            "El prompt supera los {} caracteres del modelo (tiene {}).",
            FLUX_MAX_PROMPT_CHARS,
            p.chars().count()
        ));
    }
    Ok(p)
}

/// Extensión por bytes mágicos (lo que devuelve el modelo es JPEG, pero no se
/// confía en ello: se detecta, nunca se inventa).
pub fn sniff_extension(bytes: &[u8]) -> &'static str {
    if bytes.len() >= 3 && bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF {
        "jpg"
    } else if bytes.len() >= 8
        && bytes[0] == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47
    {
        "png"
    } else if bytes.len() >= 12
        && &bytes[0..4] == b"RIFF"
        && &bytes[8..12] == b"WEBP"
    {
        "webp"
    } else if bytes.len() >= 3 && &bytes[0..3] == b"GIF" {
        "gif"
    } else {
        "bin"
    }
}

/// Extrae y decodifica `result.image` del envelope de Cloudflare.
/// Errores honestos de la propia API (401 token, límites, etc.).
pub fn parse_image_response(body: &str) -> Result<Vec<u8>, String> {
    let v: serde_json::Value =
        serde_json::from_str(body).map_err(|e| format!("Respuesta no JSON de Cloudflare: {e}"))?;
    let success = v.get("success").and_then(|s| s.as_bool()).unwrap_or(false);
    if !success {
        let msgs: Vec<String> = v
            .get("errors")
            .and_then(|e| e.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|e| {
                        e.get("message")
                            .and_then(|m| m.as_str())
                            .map(|m| m.to_string())
                    })
                    .collect()
            })
            .unwrap_or_default();
        let detail = if msgs.is_empty() {
            body.chars().take(300).collect::<String>()
        } else {
            msgs.join(" | ").chars().take(500).collect()
        };
        if detail.contains("401") || detail.to_lowercase().contains("auth") {
            return Err(format!("Cloudflare rechazó la petición (auth): {detail}"));
        }
        return Err(format!("Cloudflare devolvió un error: {detail}"));
    }
    let b64 = v
        .get("result")
        .and_then(|r| r.get("image"))
        .and_then(|i| i.as_str())
        .ok_or_else(|| "La respuesta no trae `result.image` (formato inesperado).".to_string())?;
    // La API a veces devuelve data-URI; aceptar ambas formas.
    let clean = b64.trim_start_matches(|c: char| c == '"' || c == '\'');
    let clean = match clean.find(";base64,") {
        Some(i) => &clean[i + 8..],
        None => clean,
    };
    use base64::Engine as _;
    base64::engine::general_purpose::STANDARD
        .decode(clean.trim())
        .map_err(|e| format!("La imagen base64 no se pudo decodificar: {e}"))
}

/// Clasifica un fallo de transporte en un mensaje accionable (sin tecnicismos).
fn transport_message(e: &ureq::Error) -> String {
    match e {
        ureq::Error::Transport(t) => {
            let kind = format!("{:?}", t.kind()).to_lowercase();
            if kind.contains("timeout") || kind.contains("timedout") {
                format!("Se agotó el tiempo de espera conectando con Cloudflare (timeout): {e}")
            } else if kind.contains("dns") {
                format!("No se pudo resolver api.cloudflare.com (DNS): {e}")
            } else if kind.contains("tls") || kind.contains("certificate") {
                format!("Falló el canal seguro (TLS) con Cloudflare: {e}")
            } else if kind.contains("connection") || kind.contains("connect") {
                format!("Conexión rechazada o bloqueada hacia api.cloudflare.com (puede ser el firewall/antivirus de Windows bloqueando a la app): {e}")
            } else {
                format!("Fallo de red hacia api.cloudflare.com ({kind}): {e}")
            }
        }
        _ => format!("No se pudo contactar con Cloudflare: {e}"),
    }
}

/// Estado de la verificación del token (sin gastar Neurons).
#[derive(serde::Serialize, Clone, Debug)]
pub struct CloudflareCheck {
    pub reachable: bool,
    pub valid: bool,
    pub status: Option<String>,
    pub detail: String,
}

/// Prueba conexión + validez del token SIN generar nada (no gasta Neurons).
/// Usa `GET /client/v4/user/tokens/verify` (contrato documentado).
#[tauri::command]
pub fn cf_cloudflare_check(api_token: String) -> Result<CloudflareCheck, String> {
    if api_token.trim().is_empty() {
        return Err("Falta el API token de Cloudflare (Configuración → Imágenes).".to_string());
    }
    let resp = ureq::get("https://api.cloudflare.com/client/v4/user/tokens/verify")
        .set("Authorization", &format!("Bearer {}", api_token.trim()))
        .timeout(std::time::Duration::from_secs(20))
        .call()
        .map_err(|e| match e {
            ureq::Error::Status(code, r) => {
                let body = r
                    .into_string()
                    .unwrap_or_default()
                    .chars()
                    .take(300)
                    .collect::<String>();
                format!("Cloudflare HTTP {code} al verificar el token: {body}")
            }
            other => transport_message(&other),
        })?;
    let body = resp
        .into_string()
        .map_err(|e| format!("No se pudo leer la respuesta: {e}"))?;
    let v: serde_json::Value =
        serde_json::from_str(&body).map_err(|e| format!("Respuesta no JSON: {e}"))?;
    let success = v.get("success").and_then(|s| s.as_bool()).unwrap_or(false);
    let status = v
        .get("result")
        .and_then(|r| r.get("status"))
        .and_then(|s| s.as_str())
        .map(|s| s.to_string());
    if success {
        let valid = status.as_deref() == Some("active");
        let detail = match status.as_deref() {
            Some("active") => "Token válido y activo. La red funciona.".to_string(),
            Some(other) => format!("El token responde pero su estado es `{other}` (no sirve para generar)."),
            None => "Respuesta sin estado de token (formato inesperado).".to_string(),
        };
        Ok(CloudflareCheck { reachable: true, valid, status, detail })
    } else {
        let msgs: Vec<String> = v
            .get("errors")
            .and_then(|e| e.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|e| {
                        e.get("message")
                            .and_then(|m| m.as_str())
                            .map(|m| m.to_string())
                    })
                    .collect()
            })
            .unwrap_or_default();
        Ok(CloudflareCheck {
            reachable: true,
            valid: false,
            status,
            detail: format!(
                "El token no es válido: {}.",
                if msgs.is_empty() { "sin detalle".to_string() } else { msgs.join(" | ") }
            )
            .chars()
            .take(400)
            .collect(),
        })
    }
}
/// Genera la imagen y la guarda en `save_dir/generated-images/`.
/// El token viaja solo en memoria (parámetro, jamás a disco ni logs).
#[tauri::command]
pub fn cf_images_generate(
    _app: AppHandle,
    account_id: String,
    api_token: String,
    prompt: String,
    steps: Option<i64>,
    seed: Option<i64>,
    save_dir: String,
) -> Result<GeneratedImage, String> {
    let account_id = account_id.trim().to_string();
    if account_id.is_empty() {
        return Err("Falta el Account ID de Cloudflare (Configuración → Imágenes).".to_string());
    }
    if api_token.trim().is_empty() {
        return Err("Falta el API token de Cloudflare (Configuración → Imágenes).".to_string());
    }
    let prompt = validate_prompt(&prompt)?;
    let steps = clamp_steps(steps);

    let url = format!(
        "https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run/{FLUX_MODEL}"
    );
    let mut payload = serde_json::json!({ "prompt": prompt, "steps": steps });
    if let Some(s) = seed {
        payload["seed"] = serde_json::json!(s);
    }
    let t0 = std::time::Instant::now();
    let resp = ureq::post(&url)
        .set("Authorization", &format!("Bearer {}", api_token.trim()))
        .set("Content-Type", "application/json")
        .timeout(std::time::Duration::from_secs(120))
        .send_json(payload)
        .map_err(|e| match e {
            // ureq convierte los HTTP no-2xx en Error::Status: no es un fallo
            // de red, es la API respondiendo (token, cuenta, cuota…).
            ureq::Error::Status(code, r) => {
                let body = r
                    .into_string()
                    .unwrap_or_default()
                    .chars()
                    .take(400)
                    .collect::<String>();
                format!("Cloudflare HTTP {code}: {body}")
            }
            other => transport_message(&other),
        })?;
    let status = resp.status();
    let body = resp
        .into_string()
        .map_err(|e| format!("No se pudo leer la respuesta: {e}"))?;
    if !(200..300).contains(&status) {
        return Err(format!("Cloudflare HTTP {status}: {}", body.chars().take(400).collect::<String>()));
    }
    let bytes = parse_image_response(&body)?;
    if bytes.is_empty() {
        return Err("Cloudflare devolvió una imagen vacía.".to_string());
    }
    let elapsed_ms = t0.elapsed().as_millis() as u64;
    // Nota de coste: solo lo que la propia API incluya en la respuesta.
    let usage = serde_json::from_str::<serde_json::Value>(&body)
        .ok()
        .and_then(|v| extract_usage_note(&v));
    let ext = sniff_extension(&bytes);
    let dir = std::path::Path::new(&save_dir).join("generated-images");
    std::fs::create_dir_all(&dir).map_err(|e| format!("No se pudo crear la carpeta: {e}"))?;
    let stamp = chrono_stamp();
    let file = dir.join(format!("flux-{stamp}.{ext}"));
    std::fs::write(&file, &bytes).map_err(|e| format!("No se pudo guardar la imagen: {e}"))?;
    let size = bytes.len() as u64;
    Ok(GeneratedImage {
        file: file.to_string_lossy().to_string(),
        size,
        usage,
        elapsed_ms,
    })
}

fn chrono_stamp() -> String {
    // Sin dependencia chrono: segundos desde epoch + pid para unicidad.
    let secs = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    format!("{secs}-{}", std::process::id())
}

#[cfg(test)]
mod images_tests {
    use super::*;

    #[test]
    fn steps_por_defecto_y_recorte() {
        assert_eq!(clamp_steps(None), 4);
        assert_eq!(clamp_steps(Some(0)), 1);
        assert_eq!(clamp_steps(Some(-5)), 1);
        assert_eq!(clamp_steps(Some(8)), 8);
        assert_eq!(clamp_steps(Some(99)), 8);
    }

    #[test]
    fn prompt_vacio_y_largo_fallan() {
        assert!(validate_prompt("   ").is_err());
        assert!(validate_prompt("un castillo").is_ok());
        let largo = "x".repeat(2049);
        assert!(validate_prompt(&largo).is_err());
        assert!(validate_prompt(&"x".repeat(2048)).is_ok());
    }

    #[test]
    fn sniff_detecta_formatos() {
        assert_eq!(sniff_extension(&[0xFF, 0xD8, 0xFF, 0x00]), "jpg");
        assert_eq!(
            sniff_extension(&[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
            "png"
        );
        let mut webp = b"RIFFxxxxWEBP".to_vec();
        assert_eq!(sniff_extension(&webp), "webp");
        let _ = webp.pop();
        assert_eq!(sniff_extension(b"GIF89a"), "gif");
        assert_eq!(sniff_extension(b"hola"), "bin");
    }

    #[test]
    fn parseo_envelope_ok_y_error() {
        let ok = r#"{"result":{"image":"aGk="},"success":true,"errors":[],"messages":[]}"#;
        assert_eq!(parse_image_response(ok).unwrap(), b"hi");
        let fail = r#"{"result":null,"success":false,"errors":[{"message":"auth error 401"}],"messages":[]}"#;
        assert!(parse_image_response(fail).unwrap_err().contains("auth"));
        assert!(parse_image_response("no json").is_err());
    }

    #[test]
    fn extract_usage_note_solo_si_existe() {
        assert!(extract_usage_note(&serde_json::json!({"result": {"image": "x"}})).is_none());
        let v = serde_json::json!({"result": {"image": "x"}, "usage": {"neurons": 120}});
        assert_eq!(
            extract_usage_note(&v).as_deref(),
            Some("{\"neurons\":120}")
        );
    }

    #[test]
    fn upload_solo_formatos_permitidos() {
        assert_eq!(validate_upload_ext("png").as_deref(), Ok("png"));
        assert_eq!(validate_upload_ext(".JPEG").as_deref(), Ok("jpg"));
        assert!(validate_upload_ext("svg").is_err());
        assert!(validate_upload_ext("").is_err());
    }
}
