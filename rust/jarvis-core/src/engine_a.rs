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

fn lower(s: &str) -> String {
    s.to_lowercase()
}

fn contains_any(haystack: &str, needles: &[&str]) -> bool {
    needles.iter().any(|n| haystack.contains(n))
}

struct ExprParser<'a> {
    chars: Vec<char>,
    pos: usize,
    _src: &'a str,
}

impl<'a> ExprParser<'a> {
    fn new(src: &'a str) -> Self {
        ExprParser { chars: src.chars().collect(), pos: 0, _src: src }
    }
    fn peek(&self) -> Option<char> {
        self.chars.get(self.pos).copied()
    }
    fn skip_ws(&mut self) {
        while matches!(self.peek(), Some(c) if c.is_whitespace()) {
            self.pos += 1;
        }
    }
    fn parse(&mut self) -> Result<f64, ()> {
        self.skip_ws();
        let v = self.parse_expr()?;
        self.skip_ws();
        if self.pos != self.chars.len() {
            return Err(());
        }
        Ok(v)
    }
    fn parse_expr(&mut self) -> Result<f64, ()> {
        let mut val = self.parse_term()?;
        loop {
            self.skip_ws();
            match self.peek() {
                Some('+') => {
                    self.pos += 1;
                    val += self.parse_term()?;
                }
                Some('-') => {
                    self.pos += 1;
                    val -= self.parse_term()?;
                }
                _ => break,
            }
        }
        Ok(val)
    }
    fn parse_term(&mut self) -> Result<f64, ()> {
        let mut val = self.parse_pow()?;
        loop {
            self.skip_ws();
            match self.peek() {
                Some('*') => {
                    self.pos += 1;
                    val *= self.parse_pow()?;
                }
                Some('/') => {
                    self.pos += 1;
                    let d = self.parse_pow()?;
                    if d == 0.0 {
                        return Err(());
                    }
                    val /= d;
                }
                Some('%') => {
                    self.pos += 1;
                    let d = self.parse_pow()?;
                    if d == 0.0 {
                        return Err(());
                    }
                    val %= d;
                }
                _ => break,
            }
        }
        Ok(val)
    }
    fn parse_pow(&mut self) -> Result<f64, ()> {
        let base = self.parse_unary()?;
        self.skip_ws();
        if self.peek() == Some('^') {
            self.pos += 1;
            let exp = self.parse_pow()?;
            return Ok(base.powf(exp));
        }
        Ok(base)
    }
    fn parse_unary(&mut self) -> Result<f64, ()> {
        self.skip_ws();
        if self.peek() == Some('-') {
            self.pos += 1;
            return Ok(-self.parse_unary()?);
        }
        if self.peek() == Some('+') {
            self.pos += 1;
            return self.parse_unary();
        }
        self.parse_atom()
    }
    fn parse_atom(&mut self) -> Result<f64, ()> {
        self.skip_ws();
        if self.peek() == Some('(') {
            self.pos += 1;
            let v = self.parse_expr()?;
            self.skip_ws();
            if self.peek() != Some(')') {
                return Err(());
            }
            self.pos += 1;
            return Ok(v);
        }
        let start = self.pos;
        while matches!(self.peek(), Some(c) if c.is_ascii_digit() || c == '.') {
            self.pos += 1;
        }
        if self.pos == start {
            return Err(());
        }
        let s: String = self.chars[start..self.pos].iter().collect();
        s.parse::<f64>().map_err(|_| ())
    }
}

fn try_eval_math(raw: &str) -> Option<f64> {
    let cleaned: String = raw
        .replace(',', ".")
        .chars()
        .filter(|c| !c.is_whitespace() || *c == ' ')
        .collect();
    if cleaned.is_empty() {
        return None;
    }
    let allowed = cleaned
        .chars()
        .all(|c| c.is_ascii_digit() || "+-*/%^(). ".contains(c));
    if !allowed {
        return None;
    }
    let has_digit = cleaned.chars().any(|c| c.is_ascii_digit());
    if !has_digit {
        return None;
    }
    ExprParser::new(&cleaned).parse().ok()
}

fn fmt_num(n: f64) -> String {
    if (n - n.round()).abs() < 1e-9 {
        format!("{}", n.round() as i64)
    } else {
        let s = format!("{:.4}", n);
        s.trim_end_matches('0').trim_end_matches('.').to_string()
    }
}

#[wasm_bindgen]
pub struct JarvisEngine {
    user_name: Option<String>,
    notes: Vec<String>,
    call_count: u64,
    last_intent: String,
}

const JOKES: [&str; 10] = [
    "Programmer joke placeholder RU1",
    "Rust ownership joke RU2",
    "Doctor joke RU3",
    "Binary joke RU4",
    "Code works joke RU5",
    "AI joke RU6",
    "Jarvis joke RU7",
    "null bar joke RU8",
    "Scary code joke RU9",
    "Borscht joke RU10",
];

const STATUS_REPLIES: [&str; 6] = [
    "All systems nominal.",
    "Rust core humming.",
    "Ready to help.",
    "Fast and safe.",
    "Green zone.",
    "Thanks for asking!",
];

const GREETING_REPLIES: [&str; 4] = [
    "Hello! Jarvis online.",
    "Greetings! How can I help?",
    "Good day! Ready.",
    "Hi! Rust core loaded.",
];
