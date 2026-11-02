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

/// Especificación por modelo de imagen de Cloudflare (esquemas de entrada
/// verificados en docs oficiales; URLs `.../models/<slug>/schema-input.json`).
/// Modelos multipart-only (flux-2-dev, flux-2-klein-4b/9b) o con máscara
/// obligatoria (sd-v1-5-inpainting): NO soportados (se documenta el motivo).
pub struct CfImageSpec {
    pub id: &'static str,
    pub label: &'static str,
    pub max_steps: u8,
    pub default_steps: u8,
    /// Nombre del campo de pasos en el payload (`steps` o `num_steps`).
    pub steps_field: &'static str,
    pub supports_negative: bool,
    /// Estimación de Neurons/imagen con `steps` (None = sin tarifa publicada).
    pub estimate: fn(u8) -> Option<f64>,
    /// De dónde sale la estimación (visible en UI, sin letra pequeña).
    pub estimate_note: &'static str,
}

fn est_schnell(steps: u8) -> Option<f64> {
    Some(4.0 * 4.80 + steps as f64 * 9.60)
}
fn est_lucid(steps: u8) -> Option<f64> {
    // 1120² por defecto → ceil(1120/512)² = 9 tiles × 636 + pasos × 12.
    Some(9.0 * 636.0 + steps as f64 * 12.0)
}
fn est_phoenix(steps: u8) -> Option<f64> {
    // 1024² por defecto → 4 tiles × 530 + pasos × 10.
    Some(4.0 * 530.0 + steps as f64 * 10.0)
}
fn est_none(_steps: u8) -> Option<f64> {
    None
}

pub const CF_IMAGE_MODELS: &[CfImageSpec] = &[
    CfImageSpec { id: "@cf/black-forest-labs/flux-1-schnell", label: "FLUX.1 schnell", max_steps: 8, default_steps: 4, steps_field: "steps", supports_negative: false, estimate: est_schnell, estimate_note: "4 tiles 512² × 4,80 + pasos × 9,60 (suponiendo salida 1024²)" },
    CfImageSpec { id: "@cf/stabilityai/stable-diffusion-xl-base-1.0", label: "SDXL Base 1.0", max_steps: 20, default_steps: 20, steps_field: "num_steps", supports_negative: true, estimate: est_none, estimate_note: "Cloudflare no publica tarifa por imagen" },
    CfImageSpec { id: "@cf/bytedance/stable-diffusion-xl-lightning", label: "SDXL Lightning", max_steps: 20, default_steps: 20, steps_field: "num_steps", supports_negative: true, estimate: est_none, estimate_note: "Cloudflare no publica tarifa por imagen" },
    CfImageSpec { id: "@cf/lykon/dreamshaper-8-lcm", label: "Dreamshaper 8 LCM", max_steps: 20, default_steps: 20, steps_field: "num_steps", supports_negative: true, estimate: est_none, estimate_note: "Cloudflare no publica tarifa por imagen" },
    CfImageSpec { id: "@cf/leonardo/lucid-origin", label: "Lucid Origin", max_steps: 40, default_steps: 20, steps_field: "num_steps", supports_negative: false, estimate: est_lucid, estimate_note: "9 tiles × 636 + pasos × 12 (suponiendo 1120²)" },
    CfImageSpec { id: "@cf/leonardo/phoenix-1.0", label: "Phoenix 1.0", max_steps: 50, default_steps: 25, steps_field: "num_steps", supports_negative: true, estimate: est_phoenix, estimate_note: "4 tiles × 530 + pasos × 10 (suponiendo 1024²)" },
];

pub fn cf_spec_for(model: &str) -> Option<&'static CfImageSpec> {
    CF_IMAGE_MODELS.iter().find(|s| s.id == model.trim())
}

/// Modelos de imagen soportados (contratos verificados en docs oficiales).
/// Cloudflare: precios en Neurons (pricing 2026-10-20). Google: $/imagen.
pub const GOOGLE_MODEL_21: &str = "gemini-nano-banana-2.1";
pub const GOOGLE_MODEL_25: &str = "gemini-2.5-flash-image";
/// Tope de prompt para Google (límite de la app, no del modelo).
pub const GOOGLE_MAX_PROMPT_CHARS: usize = 8000;

/// Estimación honesta de FLUX.1 schnell: 4,80 Neurons por tile 512² más
/// 9,60 por paso (pricing oficial). La API no admite tamaño: se supone salida
/// 1024² (4 tiles). Con otros tamaños reales la cifra varía.
pub fn cf_schnell_estimate_neurons(steps: u8) -> f64 {
    4.0 * 4.80 + steps as f64 * 9.60
}

/// Coste aprox. por imagen de Google (pricing oficial ai.google.dev):
/// 2.1 → $0,0336 (1K); 2.5 → $0,039. Sin capa gratuita para imágenes.
pub fn google_cost_per_image(model: &str) -> Option<f64> {
    match model {
        m if m == GOOGLE_MODEL_21 => Some(0.0336),
        m if m == GOOGLE_MODEL_25 => Some(0.039),
        m if m == GOOGLE_MODEL_LITE => Some(0.0336),
        _ => None,
    }
}

pub fn validate_google_model(model: &str) -> Result<String, String> {
    let m = model.trim().to_string();
    if m == GOOGLE_MODEL_21 || m == GOOGLE_MODEL_25 || m == GOOGLE_MODEL_LITE {
        Ok(m)
    } else {
        Err("Modelo de Google no soportado (usa Nano Banana 2.1, 2.5 o Lite).".to_string())
    }
}

pub fn validate_google_prompt(prompt: &str) -> Result<String, String> {
    let p = prompt.trim().to_string();
    if p.is_empty() {
        return Err("El prompt está vacío: describe la imagen que quieres generar.".to_string());
    }
    if p.chars().count() > GOOGLE_MAX_PROMPT_CHARS {
        return Err(format!(
            "El prompt supera los {GOOGLE_MAX_PROMPT_CHARS} caracteres (límite de la app)."
        ));
    }
    Ok(p)
}

/// Extrae la imagen base64 de la respuesta de la Interactions API de Google
/// (`interaction.output_image.data`, contrato documentado). Si el formato
/// cambia, se buscan `inlineData.data` como respaldo; si no hay nada, error
/// con un extracto real en vez de inventar.
pub fn parse_google_image_response(body: &str) -> Result<(Vec<u8>, String), String> {
    let v: serde_json::Value =
        serde_json::from_str(body).map_err(|e| format!("Respuesta no JSON de Google: {e}"))?;
    if let Some(data) = v
        .get("interaction")
        .and_then(|i| i.get("output_image"))
        .and_then(|o| o.get("data"))
        .and_then(|d| d.as_str())
    {
        let mime = v
            .get("interaction")
            .and_then(|i| i.get("output_image"))
            .and_then(|o| o.get("mime_type"))
            .and_then(|m| m.as_str())
            .unwrap_or("image/png")
            .to_string();
        return decode_b64_image(data).map(|b| (b, mime));
    }
    // Respaldo: primer inlineData.data encontrado (formato generateContent).
    if let Some((data, mime)) = find_inline_data(&v) {
        return decode_b64_image(&data).map(|b| (b, mime));
    }
    let err = v
        .get("error")
        .and_then(|e| e.get("message"))
        .and_then(|m| m.as_str())
        .unwrap_or("");
    if !err.is_empty() {
        return Err(format!("Google devolvió un error: {}", err.chars().take(400).collect::<String>()));
    }
    Err(format!(
        "Respuesta sin imagen (formato inesperado): {}",
        body.chars().take(300).collect::<String>()
    ))
}

fn decode_b64_image(data: &str) -> Result<Vec<u8>, String> {
    use base64::Engine as _;
    let clean = match data.find(";base64,") {
        Some(i) => &data[i + 8..],
        None => data,
    };
    base64::engine::general_purpose::STANDARD
        .decode(clean.trim())
        .map_err(|e| format!("La imagen base64 no se pudo decodificar: {e}"))
}

fn find_inline_data(v: &serde_json::Value) -> Option<(String, String)> {
    if let Some(o) = v.as_object() {
        if let Some(inline) = o.get("inlineData").or_else(|| o.get("inline_data")) {
            if let (Some(data), mime) = (
                inline.get("data").and_then(|d| d.as_str()),
                inline
                    .get("mimeType")
                    .or_else(|| inline.get("mime_type"))
                    .and_then(|m| m.as_str())
                    .unwrap_or("image/png"),
            ) {
                return Some((data.to_string(), mime.to_string()));
            }
        }
        for child in o.values() {
            if let Some(hit) = find_inline_data(child) {
                return Some(hit);
            }
        }
    } else if let Some(arr) = v.as_array() {
        for child in arr {
            if let Some(hit) = find_inline_data(child) {
                return Some(hit);
            }
        }
    }
    None
}

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

/// Tope de prompt para Cloudflare (límite de la app, documentado en UI).
pub const CF_MAX_PROMPT_CHARS: usize = 2048;
pub const GOOGLE_MODEL_LITE: &str = "gemini-3.1-flash-lite-image";

/// Steps recortados al rango del modelo (rangos de los esquemas oficiales).
pub fn clamp_steps(steps: Option<i64>, max_steps: u8, default_steps: u8) -> u8 {
    match steps {
        None => default_steps,
        Some(s) if s < 1 => 1,
        Some(s) if s > max_steps as i64 => max_steps,
        Some(s) => s as u8,
    }
}

/// Prompt válido: 1..=CF_MAX_PROMPT_CHARS tras recortar (límite de la app).
pub fn validate_prompt(prompt: &str) -> Result<String, String> {
    let p = prompt.trim().to_string();
    if p.is_empty() {
        return Err("El prompt está vacío: describe la imagen que quieres generar.".to_string());
    }
    if p.chars().count() > CF_MAX_PROMPT_CHARS {
        return Err(format!(
            "El prompt supera los {} caracteres (límite de la app, tiene {}).",
            CF_MAX_PROMPT_CHARS,
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
/// Genera con Google (Nano Banana) vía Interactions API y guarda en
/// `save_dir/generated-images/`. La clave viaja solo en memoria.
/// Coste: de pago SIEMPRE (sin capa gratuita para imágenes): 2.1 ≈ $0,0336,
/// 2.5 ≈ $0,039 por imagen 1K (pricing oficial ai.google.dev).
#[tauri::command]
pub fn google_images_generate(
    _app: AppHandle,
    api_key: String,
    model: String,
    prompt: String,
    save_dir: String,
) -> Result<GeneratedImage, String> {
    if api_key.trim().is_empty() {
        return Err("Falta la API key de Google (Configuración → Imágenes).".to_string());
    }
    let model = validate_google_model(&model)?;
    let prompt = validate_google_prompt(&prompt)?;

    let t0 = std::time::Instant::now();
    let payload = serde_json::json!({
        "model": model,
        "input": [{ "type": "text", "text": prompt }],
    });
    let resp = ureq::post("https://generativelanguage.googleapis.com/v1beta/interactions")
        .set("x-goog-api-key", api_key.trim())
        .set("Content-Type", "application/json")
        .set("Api-Revision", "2026-05-20")
        .timeout(std::time::Duration::from_secs(180))
        .send_json(payload)
        .map_err(|e| match e {
            ureq::Error::Status(code, r) => {
                let body = r
                    .into_string()
                    .unwrap_or_default()
                    .chars()
                    .take(400)
                    .collect::<String>();
                format!("Google HTTP {code}: {body}")
            }
            other => transport_message(&other),
        })?;
    let body = resp
        .into_string()
        .map_err(|e| format!("No se pudo leer la respuesta: {e}"))?;
    let (bytes, mime) = parse_google_image_response(&body)?;
    if bytes.is_empty() {
        return Err("Google devolvió una imagen vacía.".to_string());
    }
    let elapsed_ms = t0.elapsed().as_millis() as u64;
    let ext = match mime.as_str() {
        m if m.contains("jpeg") || m.contains("jpg") => "jpg",
        m if m.contains("webp") => "webp",
        m if m.contains("gif") => "gif",
        _ => sniff_extension(&bytes),
    };
    let dir = std::path::Path::new(&save_dir).join("generated-images");
    std::fs::create_dir_all(&dir).map_err(|e| format!("No se pudo crear la carpeta: {e}"))?;
    let stamp = chrono_stamp();
    let file = dir.join(format!("nano-{stamp}.{ext}"));
    std::fs::write(&file, &bytes).map_err(|e| format!("No se pudo guardar la imagen: {e}"))?;
    Ok(GeneratedImage {
        file: file.to_string_lossy().to_string(),
        size: bytes.len() as u64,
        usage: google_cost_per_image(&model).map(|c| format!("≈ ${c:.4} por imagen (pricing oficial)")),
        elapsed_ms,
    })
}

/// Verifica la API key de Google sin gastar (lista modelos, llamada gratuita).
#[tauri::command]
pub fn google_check_key(api_key: String) -> Result<CloudflareCheck, String> {
    if api_key.trim().is_empty() {
        return Err("Falta la API key de Google (Configuración → Imágenes).".to_string());
    }
    let resp = ureq::get("https://generativelanguage.googleapis.com/v1beta/models")
        .set("x-goog-api-key", api_key.trim())
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
                format!("Google HTTP {code} al verificar la clave: {body}")
            }
            other => transport_message(&other),
        })?;
    let body = resp
        .into_string()
        .map_err(|e| format!("No se pudo leer la respuesta: {e}"))?;
    let v: serde_json::Value =
        serde_json::from_str(&body).map_err(|e| format!("Respuesta no JSON: {e}"))?;
    let ok = v.get("models").and_then(|m| m.as_array()).is_some();
    Ok(CloudflareCheck {
        reachable: true,
        valid: ok,
        status: None,
        detail: if ok {
            "Clave válida: Google responde con la lista de modelos.".to_string()
        } else {
            "Respuesta sin lista de modelos (formato inesperado).".to_string()
        },
    })
}

/// Genera con cualquier modelo de imagen de Cloudflare soportado (ver
/// CF_IMAGE_MODELS) y guarda en `save_dir/generated-images/`.
/// El token viaja solo en memoria (parámetro, jamás a disco ni logs).
#[tauri::command]
pub fn cf_images_generate(
    _app: AppHandle,
    account_id: String,
    api_token: String,
    model: String,
    prompt: String,
    steps: Option<i64>,
    seed: Option<i64>,
    negative_prompt: Option<String>,
    save_dir: String,
) -> Result<GeneratedImage, String> {
    let account_id = account_id.trim().to_string();
    if account_id.is_empty() {
        return Err("Falta el Account ID de Cloudflare (Configuración → Imágenes).".to_string());
    }
    if api_token.trim().is_empty() {
        return Err("Falta el API token de Cloudflare (Configuración → Imágenes).".to_string());
    }
    let spec = cf_spec_for(&model).ok_or_else(|| {
        "Modelo de Cloudflare no soportado (la app solo lista los text-to-image con contrato JSON verificado).".to_string()
    })?;
    let prompt = validate_prompt(&prompt)?;
    let steps = clamp_steps(steps, spec.max_steps, spec.default_steps);

    let url = format!(
        "https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run/{model}",
        model = spec.id
    );
    let mut payload = serde_json::json!({ "prompt": prompt, spec.steps_field: steps });
    if let Some(s) = seed {
        payload["seed"] = serde_json::json!(s);
    }
    if spec.supports_negative {
        if let Some(np) = negative_prompt {
            if !np.trim().is_empty() {
                payload["negative_prompt"] = serde_json::json!(np.trim());
            }
        }
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
    let prefix = spec.id.rsplit('/').next().unwrap_or("img");
    let file = dir.join(format!("{prefix}-{stamp}.{ext}"));
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
        assert_eq!(clamp_steps(None, 8, 4), 4);
        assert_eq!(clamp_steps(Some(0), 8, 4), 1);
        assert_eq!(clamp_steps(Some(-5), 8, 4), 1);
        assert_eq!(clamp_steps(Some(8), 8, 4), 8);
        assert_eq!(clamp_steps(Some(99), 8, 4), 8);
        assert_eq!(clamp_steps(None, 50, 25), 25);
        assert_eq!(clamp_steps(Some(99), 50, 25), 50);
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

    #[test]
    fn estimaciones_y_modelos_google() {
        // schnell: 4 tiles x 4,80 + pasos x 9,60.
        assert!((cf_schnell_estimate_neurons(4) - 57.6).abs() < 0.01);
        assert!((cf_schnell_estimate_neurons(8) - 96.0).abs() < 0.01);
        assert_eq!(google_cost_per_image(GOOGLE_MODEL_21), Some(0.0336));
        assert_eq!(google_cost_per_image(GOOGLE_MODEL_25), Some(0.039));
        assert!(google_cost_per_image("otro").is_none());
        assert_eq!(validate_google_model(GOOGLE_MODEL_21).is_ok(), true);
        assert_eq!(validate_google_model(GOOGLE_MODEL_LITE).is_ok(), true);
        assert!(validate_google_model("gpt-x").is_err());
        assert_eq!(google_cost_per_image(GOOGLE_MODEL_LITE), Some(0.0336));
        assert!(validate_google_prompt("  ").is_err());
        assert!(validate_google_prompt("un dragón").is_ok());
    }

    #[test]
    fn catalogo_cf_cubre_todo_text_to_image() {
        // Los 6 text-to-image con contrato JSON verificado (los multipart-only
        // —flux-2-dev, klein— y el inpainting con máscara quedan fuera).
        assert_eq!(CF_IMAGE_MODELS.len(), 6);
        for id in [
            "@cf/black-forest-labs/flux-1-schnell",
            "@cf/stabilityai/stable-diffusion-xl-base-1.0",
            "@cf/bytedance/stable-diffusion-xl-lightning",
            "@cf/lykon/dreamshaper-8-lcm",
            "@cf/leonardo/lucid-origin",
            "@cf/leonardo/phoenix-1.0",
        ] {
            assert!(cf_spec_for(id).is_some(), "falta {id}");
        }
        assert!(cf_spec_for("@cf/otro/inventado").is_none());
        let sdxl = cf_spec_for("@cf/stabilityai/stable-diffusion-xl-base-1.0").unwrap();
        assert_eq!(sdxl.max_steps, 20);
        assert!(sdxl.supports_negative);
    }

    #[test]
    fn parseo_google_interactions() {
        let ok = r#"{"interaction":{"id":"abc","output_image":{"data":"aGk=","mime_type":"image/png"}}}"#;
        let (b, m) = parse_google_image_response(ok).unwrap();
        assert_eq!(b, b"hi");
        assert_eq!(m, "image/png");
        let fb = r#"{"candidates":[{"content":{"parts":[{"inlineData":{"mimeType":"image/jpeg","data":"aGk="}}]}}]}"#;
        assert!(parse_google_image_response(fb).is_ok());
        let err = r#"{"error":{"message":"API key not valid"}}"#;
        assert!(parse_google_image_response(err).unwrap_err().contains("Google"));
        assert!(parse_google_image_response("{}").is_err());
    }
}
