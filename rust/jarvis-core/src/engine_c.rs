fn route_impl(
    engine: &mut JarvisEngine,
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

    if let Some(name) = extract_name(text, raw) {
        engine.user_name = Some(name.clone());
        return (
            "set_name".into(),
            format!("Приятно познакомиться, {}! Я запомню это в своей Rust-памяти на время сессии.", name),
            "happy".into(),
        );
    }
    if contains_any(text, &["как меня зовут", "помнишь мое имя", "помнишь моё имя"]) {
        return match &engine.user_name {
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

    if contains_any(text, &["привет", "здравств", "добрый день", "доброе утро", "добрый вечер", "хай джарвис", "ку"]) {
        let idx = rng.pick(GREETING_REPLIES.len());
        let mut reply = GREETING_REPLIES[idx].to_string();
        if let Some(n) = &engine.user_name {
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

    if contains_any(text, &["как дела", "как ты", "как самочувствие"]) {
        let idx = rng.pick(STATUS_REPLIES.len());
        return ("status".into(), STATUS_REPLIES[idx].to_string(), "happy".into());
    }

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

    if contains_any(text, &["шутка", "анекдот", "пошути", "рассмеши", "шутку"]) {
        let idx = rng.pick(JOKES.len());
        return ("joke".into(), JOKES[idx].to_string(), "funny".into());
    }

    if contains_any(text, &["погода", "температура на улице", "дождь будет"]) {
        return (
            "weather".into(),
            "Модуль погоды пока не подключён к внешнему API — добавьте ключ погодного сервиса, и я расскажу актуальный прогноз.".into(),
            "neutral".into(),
        );
    }

    if let Some(note) = strip_prefix_any(text, raw, &["запомни ", "заметка ", "добавь заметку ", "сохрани "]) {
        engine.notes.push(note.clone());
        return (
            "note_add".into(),
            format!("Записал: «{}». Всего заметок: {}.", note, engine.notes.len()),
            "neutral".into(),
        );
    }
    if contains_any(text, &["покажи заметки", "мои заметки", "список заметок", "что ты запомнил"]) {
        if engine.notes.is_empty() {
            return (
                "note_list".into(),
                "Заметок пока нет. Скажите «запомни ...», чтобы я что-то сохранил.".into(),
                "neutral".into(),
            );
        }
        let joined = engine
            .notes
            .iter()
            .enumerate()
            .map(|(i, n)| format!("{}. {}", i + 1, n))
            .collect::<Vec<_>>()
            .join("; ");
        return ("note_list".into(), format!("Вот что я помню: {}.", joined), "neutral".into());
    }
    if contains_any(text, &["очисти заметки", "забудь все", "забудь всё", "удали заметки"]) {
        engine.notes.clear();
        return ("note_clear".into(), "Память заметок очищена.".into(), "neutral".into());
    }

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

    if contains_any(text, &["помощь", "что ты умеешь", "команды", "help", "справка"]) {
        return (
            "help".into(),
            "Я умею: здороваться, называть время и дату, шутить, считать примеры («посчитай 12*7»), запоминать заметки («запомни купить молоко»), запоминать ваше имя и просто болтать. Спросите «как дела» или «расскажи анекдот».".into(),
            "neutral".into(),
        );
    }

    if contains_any(text, &[
        "рынок", "market", "сигнал", "signal", "тренд", "trend",
        "портфел", "pnl", "волатил", "risk", "риск", "сентимент",
        "sentiment", "scout", "позиция", "бот торг",
    ]) {
        let bullish = contains_any(text, &["рост", "long", "buy", "покуп", "bull", "+"]);
        let bearish = contains_any(text, &["пад", "short", "sell", "прода", "bear", "-"]);
        let reply = if bullish {
            "Скаут: импульс вверх. Объём поддерживает движение, но фиксируйте частичную прибыль на локальных хаях.".to_string()
        } else if bearish {
            "Риск-агент: давление продавцов. Снизьте размер позиции и следите за пробоем поддержки.".to_string()
        } else {
            let idx = rng.pick(4);
            [
                "Сентимент смешанный: диапазонная торговля. Ждите подтверждения объёмом.",
                "Рынок в консолидации. Сетка/mean-reversion уместны, momentum — с узким стопом.",
                "Краткосрочно шум высокий. Сохраняйте риск на сделку <=1-2% депозита.",
                "Сигнал нейтральный. Следите за BTC как за лидером риска по альткоинам.",
            ][idx]
            .to_string()
        };
        return ("market".into(), reply, if bullish { "proud" } else if bearish { "confused" } else { "neutral" }.into());
    }

    (
        "unknown".into(),
        format!(
            "Пока не уверен, как на это ответить. Я работаю на Rust-ядре версии 0.1 — скажите «помощь», чтобы узнать список команд. Вы сказали: «{}».",
            raw
        ),
        "confused".into(),
    )
}
