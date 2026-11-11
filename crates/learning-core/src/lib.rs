use rusqlite::{Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use unicode_normalization::UnicodeNormalization;
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Review {
    pub interval: f64,
    pub ease: f64,
    pub due: f64,
    pub reps: u32,
    pub lapses: u32,
}
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Rating {
    Again,
    Hard,
    Good,
    Easy,
}
pub fn schedule(old: Review, rating: Rating, now: f64) -> Result<Review, String> {
    if !now.is_finite()
        || now < 0.
        || !old.interval.is_finite()
        || !(0.0..=3650.0).contains(&old.interval)
        || !old.ease.is_finite()
        || !(1.3..=3.0).contains(&old.ease)
    {
        return Err("Invalid review state".into());
    }
    let mut r = old.clone();
    r.reps = r.reps.checked_add(1).ok_or("Review count overflow")?;
    if matches!(rating, Rating::Again) {
        r.interval = 0.;
        r.ease = (r.ease - 0.2).max(1.3);
        r.lapses = r.lapses.checked_add(1).ok_or("Lapse count overflow")?;
        r.due = now + 600000.;
        return Ok(r);
    }
    r.interval = match rating {
        Rating::Hard => (old.interval * 1.2).round().max(1.),
        Rating::Easy => (old.interval * old.ease * 1.3).round().max(4.),
        _ => {
            if old.interval == 0. {
                1.
            } else if old.interval == 1. {
                3.
            } else {
                (old.interval * old.ease).round()
            }
        }
    }
    .min(3650.);
    r.ease = (r.ease
        + match rating {
            Rating::Hard => -0.15,
            Rating::Easy => 0.15,
            _ => 0.,
        })
    .clamp(1.3, 3.0);
    r.due = now + r.interval * 86400000.;
    Ok(r)
}
pub fn normalize(s: &str) -> String {
    s.nfc()
        .collect::<String>()
        .to_lowercase()
        .chars()
        .filter(|c| !"¿?¡!.,;:”“\"'".contains(*c))
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}
pub fn grade(answer: &str, accepted: &[String]) -> bool {
    accepted.iter().any(|s| normalize(s) == normalize(answer))
}
pub fn migrate(db: &Connection) -> Result<(), String> {
    let version: i64 = db
        .pragma_query_value(None, "user_version", |r| r.get(0))
        .map_err(|e| e.to_string())?;
    if version > 1 {
        return Err("Database created by a newer application; update before opening it.".into());
    }
    if version == 0 {
        db.execute_batch("BEGIN IMMEDIATE; CREATE TABLE IF NOT EXISTS learner_state (id INTEGER PRIMARY KEY CHECK(id=1), json TEXT NOT NULL); CREATE TABLE IF NOT EXISTS recovery (id INTEGER PRIMARY KEY CHECK(id=1), json TEXT NOT NULL); PRAGMA user_version=1; COMMIT;").map_err(|e|e.to_string())?;
    }
    Ok(())
}
pub fn validate_state(json: &str) -> Result<(), String> {
    if json.len() > 100_000_000 {
        return Err("Backup exceeds 100 MB".into());
    }
    let v: serde_json::Value = serde_json::from_str(json).map_err(|e| e.to_string())?;
    if v["version"] != 1 {
        return Err("Unsupported backup version".into());
    }
    for key in [
        "completed",
        "history",
        "attempts",
        "logs",
        "recordings",
        "customCards",
    ] {
        if !v[key].is_array() {
            return Err(format!("Missing array: {key}"));
        }
    }
    for key in ["reviews", "homework"] {
        if !v[key].is_object() {
            return Err(format!("Missing object: {key}"));
        }
    }
    let limit = v["dailyLimit"].as_u64().ok_or("Invalid daily limit")?;
    if !(1..=200).contains(&limit) {
        return Err("Invalid daily limit".into());
    }
    let scale = v["textScale"].as_f64().ok_or("Invalid text scale")?;
    if !(1.0..=1.5).contains(&scale) {
        return Err("Invalid text scale".into());
    }
    Ok(())
}
pub fn load(db: &Connection) -> Result<Option<String>, String> {
    db.query_row("SELECT json FROM learner_state WHERE id=1", [], |r| {
        r.get(0)
    })
    .optional()
    .map_err(|e| e.to_string())
}
pub fn save(db: &mut Connection, json: &str) -> Result<(), String> {
    validate_state(json)?;
    let tx = db.transaction().map_err(|e| e.to_string())?;
    tx.execute(
        "INSERT OR REPLACE INTO recovery SELECT id,json FROM learner_state WHERE id=1",
        [],
    )
    .map_err(|e| e.to_string())?;
    tx.execute("INSERT INTO learner_state(id,json) VALUES(1,?1) ON CONFLICT(id) DO UPDATE SET json=excluded.json",[json]).map_err(|e|e.to_string())?;
    tx.commit().map_err(|e| e.to_string())
}
pub fn validate_content(json: &str) -> Result<(), String> {
    let v: serde_json::Value = serde_json::from_str(json).map_err(|e| e.to_string())?;
    for (key, min) in [
        ("lectures", 2),
        ("cards", 15),
        ("quiz", 12),
        ("worked", 6),
        ("homework", 3),
    ] {
        if v[key].as_array().map_or(0, |a| a.len()) < min {
            return Err(format!("Incomplete {key}"));
        }
    }
    let mut ids = std::collections::HashSet::new();
    for q in v["quiz"].as_array().unwrap() {
        let id = q["id"].as_str().ok_or("Missing question id")?;
        if !ids.insert(id) {
            return Err("Duplicate question ID".into());
        }
        if q["answers"].as_array().map_or(true, |a| a.is_empty())
            || q["explanation"].as_str().unwrap_or("").len() < 25
        {
            return Err("Question lacks answer or explanation".into());
        }
    }
    Ok(())
}
#[cfg(test)]
mod tests {
    use super::*;
    fn fresh() -> Review {
        Review {
            interval: 0.,
            ease: 2.5,
            due: 0.,
            reps: 0,
            lapses: 0,
        }
    }
    fn state() -> String {
        r#"{"version":1,"completed":[],"reviews":{},"history":[],"attempts":[],"homework":{},"logs":[],"recordings":[],"customCards":[],"dailyLimit":20,"textScale":1}"#.into()
    }
    #[test]
    fn scheduling() {
        let r = schedule(fresh(), Rating::Good, 0.).unwrap();
        assert_eq!(r.interval, 1.);
        assert_eq!(schedule(r, Rating::Good, 0.).unwrap().interval, 3.);
        assert_eq!(schedule(fresh(), Rating::Again, 100.).unwrap().due, 600100.);
        assert_eq!(schedule(fresh(), Rating::Easy, 0.).unwrap().interval, 4.);
    }
    #[test]
    fn bounds() {
        let mut r = fresh();
        for _ in 0..500 {
            r = schedule(r, Rating::Easy, 0.).unwrap()
        }
        assert_eq!(r.interval, 3650.);
        assert_eq!(r.ease, 3.);
        for _ in 0..100 {
            r = schedule(r, Rating::Again, 0.).unwrap()
        }
        assert_eq!(r.ease, 1.3);
        assert!(schedule(fresh(), Rating::Good, -1.).is_err());
    }
    #[test]
    fn accents() {
        assert!(grade(" ¿ SÍ ! ", &["sí".into()]));
        assert!(!grade("si", &["sí".into()]));
        assert!(!grade("el", &["él".into()]));
        assert_eq!(normalize("si\u{301}"), "sí");
    }
    #[test]
    fn migrations_and_atomic_restore() {
        let mut db = Connection::open_in_memory().unwrap();
        migrate(&db).unwrap();
        save(&mut db, &state()).unwrap();
        migrate(&db).unwrap();
        assert_eq!(load(&db).unwrap(), Some(state()));
        assert!(save(&mut db, "{}").is_err());
        assert_eq!(load(&db).unwrap(), Some(state()));
        db.pragma_update(None, "user_version", 2).unwrap();
        assert!(migrate(&db).is_err());
    }
    #[test]
    fn persistence_after_reopen() {
        let path = std::env::temp_dir().join(format!("spanish321-{}.db", std::process::id()));
        {
            let mut db = Connection::open(&path).unwrap();
            migrate(&db).unwrap();
            save(&mut db, &state()).unwrap();
        }
        {
            let db = Connection::open(&path).unwrap();
            migrate(&db).unwrap();
            assert_eq!(load(&db).unwrap(), Some(state()));
        }
        std::fs::remove_file(path).unwrap();
    }
    #[test]
    fn content() {
        validate_content(include_str!("../../../content/units/c1-u01.json")).unwrap();
        assert!(validate_content("{}").is_err());
    }
}
