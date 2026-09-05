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

        let (intent, reply, mood) = route_impl(self, &text, raw, time_str, date_str, &mut rng);
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

}
