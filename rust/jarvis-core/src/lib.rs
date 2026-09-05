// ============================================================================
// JARVIS CORE — written in Rust, compiled to WebAssembly.
// This module is the "brain" of the assistant: intent recognition, a small
// arithmetic engine, memory (notes / user name) and reply generation.
// The browser only supplies raw clock strings and the microphone/speech
// output — every decision about *what to say* is made here, in Rust.
// ============================================================================

use wasm_bindgen::prelude::*;

// ---------------------------------------------------------------------------
// Tiny deterministic PRNG (xorshift) so we don't need extra wasm-only crates
// just to pick a random joke / phrase.
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Minimal JSON string escaping (no serde needed for such a small surface).
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// A tiny recursive-descent arithmetic parser: + - * / % ^ ( ) unary minus.
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// The engine — kept alive as a JS-side object so it can remember things
// between calls (user's name, notes, joke rotation, dialogue counter).
// ---------------------------------------------------------------------------
#[wasm_bindgen]
pub struct JarvisEngine {
    user_name: Option<String>,
    notes: Vec<String>,
    call_count: u64,
    last_intent: String,
}

const JOKES: [&str; 10] = [
    "Программист приходит домой, а жена говорит: «Сходи в магазин, купи хлеба, если будут яйца — возьми десяток». Он вернулся с десятью буханками хлеба.",
    "Почему Rust-разработчики никогда не проигрывают спор? Потому что они всегда правы насчёт владения.",
    "— Доктор, у меня раздвоение личности. — Тогда будем брать оплату с обоих.",
    "Есть 10 типов людей: те, кто понимает двоичный код, и те, кто нет.",
    "Мой код работает. Я не знаю почему. Мой код не работает. Я тоже не знаю почему.",
    "Искусственный интеллект никогда не заменит человеческую глупость — конкуренция слишком велика.",
    "— Как зовут вашего ассистента? — Джарвис. — А почему не Alexa? — Она бы не выдержала моего чувства юмора.",
    "Заходит null в бар и заказывает пиво. Бармен говорит: «У нас нет null».",
    "Самое страшное для программиста — работающий код, причину работы которого он не понимает.",
    "Rust так настолько безопасен, что даже борщ в нём не выкипит без владельца кастрюли.",
];

const STATUS_REPLIES: [&str; 6] = [
    "Все системы работают в штатном режиме, сэр.",
    "Отлично! Ядро на Rust гудит без единой утечки памяти.",
    "Бодр, скомпилирован и готов помогать.",
    "Как всегда — быстр, безопасен и без сборщика мусора.",
    "Полёт нормальный. Проверяю показатели... всё в зелёной зоне.",
    "Прекрасно, спасибо, что спросили!",
];

const GREETING_REPLIES: [&str; 4] = [
    "Здравствуйте! Джарвис на связи.",
    "Приветствую! Чем могу быть полезен?",
    "Добрый день! Я готов к работе.",
    "Привет! Rust-ядро загружено и ждёт ваших команд.",
];

#[wasm_bindgen]
impl JarvisEngine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> JarvisEngine {
        JarvisEngine { user_name: None, notes: Vec::new(), call_count: 0, last_intent: String::from("boot") }
    }

    /// Main entry point. `time_str` / `date_str` are locale-formatted strings
    /// produced by JS `Date` (Rust/WASM has no OS clock of its own), everything
    /// else — understanding the request and composing the answer — happens here.
    pub fn process(&mut self, input: &str, time_str: &str, date_str: &str) -> String {
        self.call_count += 1;
        let raw = input.trim();
        let text = lower(raw);
        let seed = self.call_count.wrapping_mul(2654435761).wrapping_add(time_str.len() as u64);
        let mut rng = Rng::new(seed);

        let (intent, reply, mood) = self.route(&text, raw, time_str, date_str, &mut rng);
        self.last_intent = intent.clone();

        format!(
            "{{\"reply\":\"{}\",\"intent\":\"{}\",\"mood\":\"{}\",\"turn\":{}}}",
            json_escape(&reply),
            json_escape(&intent),
            json_escape(&mood),
            self.call_count
        )
    }

    pub fn reset(&mut self) {
        self.user_name = None;
        self.notes.clear();
        self.call_count = 0;
        self.last_intent = String::from("boot");
    }

    fn route(
        &mut self,
        text: &str,
        raw: &str,
        time_str: &str,
        date_str: &str,
        rng: &mut Rng,
    ) -> (String, String, String) {
        if text.is_empty() {
            return (
                "empty".into(),
                "Я слушаю. Скажите что-нибудь, например «который час» или «пошути».".into(),
                "neutral".into(),
            );
        }

        // ---- identity / creator -------------------------------------------------
        if contains_any(text, &["как тебя зовут", "твое имя", "твоё имя", "кто ты"]) {
            return (
                "identity".into(),
                "Меня зовут Джарвис. Моё логическое ядро написано на Rust и работает прямо у вас в браузере через WebAssembly.".into(),
                "proud".into(),
            );
        }
        if contains_any(text, &["кто тебя создал", "кто твой создатель", "кто разработчик"]) {
            return (
                "creator".into(),
                "Меня создал мой пользователь: логика — на Rust, интерфейс — на Next.js. Rust отвечает за принятие решений, а веб — за голос и картинку.".into(),
                "proud".into(),
            );
        }

        // ---- name memory ----------------------------------------------------------
        if let Some(name) = extract_name(text, raw) {
            self.user_name = Some(name.clone());
            return (
                "set_name".into(),
                format!("Приятно познакомиться, {}! Я запомню это в своей Rust-памяти на время сессии.", name),
                "happy".into(),
            );
        }
        if contains_any(text, &["как меня зовут", "помнишь мое имя", "помнишь моё имя"]) {
            return match &self.user_name {
                Some(n) => (
                    "get_name".into(),
                    format!("Вас зовут {}, я помню это.", n),
                    "happy".into(),
                ),
                None => (
                    "get_name".into(),
                    "Пока не знаю. Скажите: «меня зовут ...», и я запомню.".into(),
                    "neutral".into(),
                ),
            };
        }

        // ---- greetings / farewell / thanks -----------------------------------------
        if contains_any(text, &["привет", "здравств", "добрый день", "доброе утро", "добрый вечер", "хай джарвис", "ку"]) {
            let idx = rng.pick(GREETING_REPLIES.len());
            let mut reply = GREETING_REPLIES[idx].to_string();
            if let Some(n) = &self.user_name {
                reply = format!("{} Рад снова видеть вас, {}!", reply, n);
            }
            return ("greeting".into(), reply, "happy".into());
        }
        if contains_any(text, &["пока", "до свидания", "выключись", "отключись", "спокойной ночи"]) {
            return (
                "farewell".into(),
                "До связи! Ядро переходит в режим ожидания.".into(),
                "neutral".into(),
            );
        }
        if contains_any(text, &["спасибо", "благодар"]) {
            return (
                "thanks".into(),
                "Всегда рад помочь!".into(),
                "happy".into(),
            );
        }
        if contains_any(text, &["молодец", "ты крут", "ты лучший", "хорошая работа"]) {
            return (
                "compliment".into(),
                "Приятно слышать! Продолжаю стараться на все 100% CPU.".into(),
                "happy".into(),
            );
        }

        // ---- how are you ------------------------------------------------------------
        if contains_any(text, &["как дела", "как ты", "как самочувствие"]) {
            let idx = rng.pick(STATUS_REPLIES.len());
            return ("status".into(), STATUS_REPLIES[idx].to_string(), "happy".into());
        }

        // ---- time / date --------------------------------------------------------------
        if contains_any(text, &["который час", "сколько времени", "сколько время", "текущее время"]) {
            return (
                "time".into(),
                format!("Сейчас {}.", time_str),
                "neutral".into(),
            );
        }
        if contains_any(text, &["какое число", "какая дата", "сегодняшняя дата", "какой сегодня день"]) {
            return (
                "date".into(),
                format!("Сегодня {}.", date_str),
                "neutral".into(),
            );
        }

        // ---- jokes ----------------------------------------------------------------------
        if contains_any(text, &["шутка", "анекдот", "пошути", "рассмеши", "шутку"]) {
            let idx = rng.pick(JOKES.len());
            return ("joke".into(), JOKES[idx].to_string(), "funny".into());
        }

        // ---- weather stub -----------------------------------------------------------------
        if contains_any(text, &["погода", "температура на улице", "дождь будет"]) {
            return (
                "weather".into(),
                "Модуль погоды пока не подключён к внешнему API — добавьте ключ погодного сервиса, и я расскажу актуальный прогноз.".into(),
                "neutral".into(),
            );
        }

        // ---- notes ----------------------------------------------------------------------
        if let Some(note) = strip_prefix_any(text, raw, &["запомни ", "заметка ", "добавь заметку ", "сохрани "]) {
            self.notes.push(note.clone());
            return (
                "note_add".into(),
                format!("Записал: «{}». Всего заметок: {}.", note, self.notes.len()),
                "neutral".into(),
            );
        }
        if contains_any(text, &["покажи заметки", "мои заметки", "список заметок", "что ты запомнил"]) {
            if self.notes.is_empty() {
                return (
                    "note_list".into(),
                    "Заметок пока нет. Скажите «запомни ...», чтобы я что-то сохранил.".into(),
                    "neutral".into(),
                );
            }
            let joined = self
                .notes
                .iter()
                .enumerate()
                .map(|(i, n)| format!("{}. {}", i + 1, n))
                .collect::<Vec<_>>()
                .join("; ");
            return ("note_list".into(), format!("Вот что я помню: {}.", joined), "neutral".into());
        }
        if contains_any(text, &["очисти заметки", "забудь все", "забудь всё", "удали заметки"]) {
            self.notes.clear();
            return ("note_clear".into(), "Память заметок очищена.".into(), "neutral".into());
        }

        // ---- math -------------------------------------------------------------------------
        let math_candidate = strip_prefix_any(
            text,
            raw,
            &["посчитай ", "вычисли ", "сколько будет ", "реши ", "посчитать "],
        );
        if let Some(expr) = math_candidate {
            match try_eval_math(&expr) {
                Some(v) => {
                    return (
                        "math".into(),
                        format!("{} = {}", expr.trim(), fmt_num(v)),
                        "proud".into(),
                    )
                }
                None => {
                    return (
                        "math".into(),
                        "Не смог разобрать выражение. Попробуйте, например: «посчитай (12 + 8) * 2».".into(),
                        "confused".into(),
                    )
                }
            }
        }
        if let Some(v) = try_eval_math(raw) {
            return ("math".into(), format!("{} = {}", raw.trim(), fmt_num(v)), "proud".into());
        }

        // ---- help ---------------------------------------------------------------------------
        if contains_any(text, &["помощь", "что ты умеешь", "команды", "help", "справка"]) {
            return (
                "help".into(),
                "Я умею: здороваться, называть время и дату, шутить, считать примеры («посчитай 12*7»), запоминать заметки («запомни купить молоко»), запоминать ваше имя и просто болтать. Спросите «как дела» или «расскажи анекдот».".into(),
                "neutral".into(),
            );
        }

        // ---- fallback -------------------------------------------------------------------------
        (
            "unknown".into(),
            format!(
                "Пока не уверен, как на это ответить. Я работаю на Rust-ядре версии 0.1 — скажите «помощь», чтобы узнать список команд. Вы сказали: «{}».",
                raw
            ),
            "confused".into(),
        )
    }
}

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

/// Version string exposed to the UI so we can prove this really is Rust code.
#[wasm_bindgen]
pub fn engine_version() -> String {
    "jarvis-core v0.1.0 (Rust -> WebAssembly)".to_string()
}

/// Standalone helper kept for convenience / potential future CLI reuse.
#[wasm_bindgen]
pub fn evaluate_math(expr: &str) -> Option<f64> {
    try_eval_math(expr)
}
