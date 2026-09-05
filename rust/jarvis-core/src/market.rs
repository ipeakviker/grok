// Market simulation frame data for JARVIS TERMINAL charts (Rust -> WASM).
use wasm_bindgen::prelude::*;

struct Rng(u64);
impl Rng {
    fn new(seed: u64) -> Self {
        Rng(seed ^ 0x9E3779B97F4A7C15)
    }
    fn next(&mut self) -> u64 {
        let mut x = self.0;
        x ^= x << 13;
        x ^= x >> 7;
        x ^= x << 17;
        self.0 = x;
        x
    }
    fn pick(&mut self, len: usize) -> usize {
        if len == 0 {
            return 0;
        }
        (self.next() % (len as u64)) as usize
    }
}

fn json_escape(s: &str) -> String {
    let mut out = String::with_capacity(s.len() + 8);
    for c in s.chars() {
        match c {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            c if (c as u32) < 0x20 => out.push_str(&format!("\\u{:04x}", c as u32)),
            c => out.push(c),
        }
    }
    out
}

fn hash_u32(seed: u32) -> u64 {
    let mut x = (seed as u64).wrapping_mul(0x9E3779B97F4A7C15);
    x ^= x >> 30;
    x = x.wrapping_mul(0xBF58476D1CE4E5B9);
    x ^= x >> 27;
    x
}

fn noise01(seed: u32, i: u32, t: f64) -> f64 {
    let mut rng = Rng::new(
        hash_u32(seed ^ i.wrapping_mul(0x85ebca6b)).wrapping_add((t * 1000.0) as u64),
    );
    (rng.next() as f64) / (u64::MAX as f64)
}

fn smooth_noise(seed: u32, x: f64, t: f64) -> f64 {
    let i = x.floor() as u32;
    let f = x.fract();
    let a = noise01(seed, i, t);
    let b = noise01(seed, i.wrapping_add(1), t);
    let u = f * f * (3.0 - 2.0 * f);
    a * (1.0 - u) + b * u
}

#[wasm_bindgen]
pub fn tick_market(seed: u32, t: f64) -> String {
    let base = 100.0 + (seed % 50) as f64;
    let wave = (t * 0.7).sin() * 3.2 + (t * 1.3 + seed as f64 * 0.01).cos() * 1.8;
    let n = (smooth_noise(seed, t * 2.0, t) - 0.5) * 4.0;
    let price = (base + wave + n).max(0.01);
    let prev = (base
        + (t * 0.7 - 0.05).sin() * 3.2
        + (t * 1.3 + seed as f64 * 0.01 - 0.05).cos() * 1.8
        + (smooth_noise(seed, (t - 0.05) * 2.0, t) - 0.5) * 4.0)
        .max(0.01);
    let change_pct = ((price - prev) / prev) * 100.0;
    let volume = 800.0 + noise01(seed, 9, t) * 4200.0 + (t * 2.1).sin().abs() * 900.0;
    let pnl = (smooth_noise(seed ^ 0xABCDu32, t * 0.4, t) - 0.42) * 28.0;
    let unrealized = (smooth_noise(seed ^ 0x1111u32, t * 0.55, t) - 0.48) * 16.0;
    format!(
        "{{\"price\":{:.4},\"prev\":{:.4},\"changePct\":{:.4},\"volume\":{:.2},\"pnl\":{:.4},\"unrealized\":{:.4},\"t\":{:.4}}}",
        price, prev, change_pct, volume, pnl, unrealized, t
    )
}

#[wasm_bindgen]
pub fn generate_sparkline(seed: u32, n: u32, t: f64) -> String {
    let count = n.clamp(8, 256);
    let mut out = String::from("[");
    for i in 0..count {
        let x = i as f64 / (count as f64 - 1.0).max(1.0);
        let v = 0.5
            + 0.28 * ((t * 1.7 + x * 8.0 + seed as f64 * 0.02).sin())
            + 0.18 * ((t * 0.9 + x * 14.0).cos())
            + 0.22 * (smooth_noise(seed, x * 12.0 + t * 3.0, t) - 0.5);
        if i > 0 {
            out.push(',');
        }
        out.push_str(&format!("{:.5}", v.clamp(0.0, 1.0)));
    }
    out.push(']');
    out
}

#[wasm_bindgen]
pub fn generate_waveform(seed: u32, n: u32, t: f64, mode: &str) -> String {
    let count = n.clamp(16, 512);
    let mut out = String::from("[");
    for i in 0..count {
        let x = i as f64 / (count as f64 - 1.0).max(1.0);
        let phase = t * 1.25 + x * std::f64::consts::TAU;
        let v = match mode {
            "volume" => {
                0.35
                    + 0.35 * (phase * 2.0).sin().abs()
                    + 0.2 * smooth_noise(seed ^ 7, x * 20.0 + t * 4.0, t)
            }
            "pnl" => {
                0.5
                    + 0.22 * (phase * 0.6).sin()
                    + 0.18 * (phase * 1.4 + 1.0).cos()
                    + 0.15 * (smooth_noise(seed ^ 99, x * 8.0 + t, t) - 0.5)
            }
            _ => {
                0.5
                    + 0.25 * phase.sin()
                    + 0.12 * (phase * 2.3).sin()
                    + 0.1 * (phase * 0.4 + seed as f64).cos()
                    + 0.18 * (smooth_noise(seed, x * 16.0 + t * 2.5, t) - 0.5)
            }
        };
        if i > 0 {
            out.push(',');
        }
        out.push_str(&format!("{:.5}", v.clamp(0.0, 1.0)));
    }
    out.push(']');
    out
}

#[wasm_bindgen]
pub fn pulse_meter(seed: u32, t: f64) -> f64 {
    let a = (t * 3.2 + seed as f64 * 0.1).sin() * 0.5 + 0.5;
    let b = smooth_noise(seed, t * 5.0, t);
    (0.55 * a + 0.45 * b).clamp(0.0, 1.0)
}

#[wasm_bindgen]
pub fn bot_signal(seed: u32, strategy: &str, t: f64) -> String {
    let tick = tick_market(seed, t);
    let bullish = if let Some(idx) = tick.find("\"changePct\":") {
        let rest = &tick[idx + 12..];
        let num: String = rest
            .chars()
            .take_while(|c| c.is_ascii_digit() || *c == '-' || *c == '.')
            .collect();
        num.parse::<f64>().unwrap_or(0.0) >= 0.0
    } else {
        true
    };
    let side = match strategy {
        "mean-reversion" => {
            if bullish {
                "sell"
            } else {
                "buy"
            }
        }
        "momentum" => {
            if bullish {
                "buy"
            } else {
                "sell"
            }
        }
        "grid" => {
            let mut rng = Rng::new(hash_u32(seed).wrapping_add((t * 10.0) as u64));
            if rng.pick(2) == 0 {
                "buy"
            } else {
                "sell"
            }
        }
        _ => {
            if bullish {
                "buy"
            } else {
                "sell"
            }
        }
    };
    let conf = pulse_meter(seed ^ 0x55, t);
    format!(
        "{{\"side\":\"{}\",\"confidence\":{:.4},\"strategy\":\"{}\",\"tick\":{}}}",
        side,
        conf,
        json_escape(strategy),
        tick
    )
}
