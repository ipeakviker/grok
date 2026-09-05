impl Default for JarvisEngine {
    fn default() -> Self {
        Self::new()
    }
}

fn strip_prefix_any(text_lower: &str, raw: &str, prefixes: &[&str]) -> Option<String> {
    for p in prefixes {
        if let Some(pos) = text_lower.find(p) {
            if pos == 0 || text_lower[..pos].trim().is_empty() {
                let start = pos + p.len();
                if start <= raw.len() {
                    let rest = raw.get(start..).unwrap_or("").trim();
                    if !rest.is_empty() {
                        return Some(rest.to_string());
                    }
                }
            }
        }
    }
    None
}

fn extract_name(text_lower: &str, raw: &str) -> Option<String> {
    for marker in ["меня зовут ", "мое имя ", "моё имя "] {
        if let Some(pos) = text_lower.find(marker) {
            let start = pos + marker.len();
            let rest = raw.get(start..).unwrap_or("").trim();
            if !rest.is_empty() {
                let name: String = rest
                    .split_whitespace()
                    .next()
                    .unwrap_or("")
                    .chars()
                    .filter(|c| c.is_alphabetic() || *c == '-')
                    .collect();
                if !name.is_empty() {
                    let mut chars = name.chars();
                    let cap = match chars.next() {
                        Some(f) => f.to_uppercase().collect::<String>() + chars.as_str(),
                        None => name.clone(),
                    };
                    return Some(cap);
                }
            }
        }
    }
    None
}

#[wasm_bindgen]
pub fn engine_version() -> String {
    "jarvis-core v0.2.0 (Rust -> WebAssembly + MarketSim)".to_string()
}

#[wasm_bindgen]
pub fn evaluate_math(expr: &str) -> Option<f64> {
    try_eval_math(expr)
}
