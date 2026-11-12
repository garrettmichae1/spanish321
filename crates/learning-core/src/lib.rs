use rusqlite::{Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::sync::LazyLock;
use unicode_normalization::UnicodeNormalization;
static STATE_VALIDATOR: LazyLock<jsonschema::Validator> = LazyLock::new(|| {
    jsonschema::validator_for(
        &serde_json::from_str(include_str!("../../../content/backup.schema.json"))
            .expect("Bundled backup schema"),
    )
    .expect("Valid backup schema")
});
static UNIT_VALIDATOR: LazyLock<jsonschema::Validator> = LazyLock::new(|| {
    jsonschema::validator_for(
        &serde_json::from_str(include_str!("../../../content/unit.schema.json"))
            .expect("Bundled unit schema"),
    )
    .expect("Valid unit schema")
});
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
    if version > 2 {
        return Err("Database created by a newer application; update before opening it.".into());
    }
    if version == 0 {
        db.execute_batch("BEGIN IMMEDIATE; CREATE TABLE IF NOT EXISTS learner_state (id INTEGER PRIMARY KEY CHECK(id=1), json TEXT NOT NULL); CREATE TABLE IF NOT EXISTS recovery (id INTEGER PRIMARY KEY CHECK(id=1), json TEXT NOT NULL); PRAGMA user_version=1; COMMIT;").map_err(|e|e.to_string())?;
    }
    if version < 2 {
        db.execute_batch("BEGIN IMMEDIATE; CREATE TABLE IF NOT EXISTS content_manifest (id TEXT PRIMARY KEY, revision TEXT NOT NULL); PRAGMA user_version=2; COMMIT;").map_err(|e| e.to_string())?;
    }
    Ok(())
}
pub fn sync_content(db: &Connection, json: &str) -> Result<(), String> {
    let manifest: std::collections::BTreeMap<String, String> =
        serde_json::from_str(json).map_err(|e| e.to_string())?;
    let tx = db.unchecked_transaction().map_err(|e| e.to_string())?;
    for (id, revision) in manifest {
        tx.execute("INSERT INTO content_manifest(id,revision) VALUES(?1,?2) ON CONFLICT(id) DO UPDATE SET revision=excluded.revision", [&id,&revision]).map_err(|e|e.to_string())?;
    }
    // Learner records and retired IDs are intentionally untouched by content updates.
    tx.commit().map_err(|e| e.to_string())
}
pub fn validate_state(json: &str) -> Result<(), String> {
    if json.len() > 100_000_000 {
        return Err("Backup exceeds 100 MB".into());
    }
    let v: serde_json::Value = serde_json::from_str(json).map_err(|e| e.to_string())?;
    STATE_VALIDATOR
        .validate(&v)
        .map_err(|e| format!("Invalid learner data: {e}"))?;
    for a in v["attempts"].as_array().unwrap() {
        if a["score"].as_u64() > a["total"].as_u64() {
            return Err("Score exceeds question count".into());
        }
    }
    let mut ids = std::collections::HashSet::new();
    for c in v["customCards"].as_array().unwrap() {
        if !ids.insert(c["id"].as_str().unwrap()) {
            return Err("Duplicate custom card ID".into());
        }
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
    UNIT_VALIDATOR
        .validate(&v)
        .map_err(|e| format!("Invalid curriculum: {e}"))?;
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
        db.pragma_update(None, "user_version", 3).unwrap();
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
        for file in
            std::fs::read_dir(concat!(env!("CARGO_MANIFEST_DIR"), "/../../content/units")).unwrap()
        {
            let file = file.unwrap();
            if file.path().extension().is_some_and(|e| e == "json") {
                let json = std::fs::read_to_string(file.path()).unwrap();
                validate_content(&json)
                    .unwrap_or_else(|e| panic!("{}: {e}", file.path().display()));
            }
        }
        assert!(validate_content("{}").is_err());
    }
    #[test]
    fn nested_validation_and_upgrade_preserve_data() {
        let mut db = Connection::open_in_memory().unwrap();
        db.execute_batch("CREATE TABLE learner_state(id INTEGER PRIMARY KEY,json TEXT NOT NULL); CREATE TABLE recovery(id INTEGER PRIMARY KEY,json TEXT NOT NULL); PRAGMA user_version=1;").unwrap();
        let mut v: serde_json::Value = serde_json::from_str(&state()).unwrap();
        v["completed"] = serde_json::json!(["retired-unit"]);
        save(&mut db, &v.to_string()).unwrap();
        migrate(&db).unwrap();
        sync_content(&db, r#"{"new-unit":"revision-1"}"#).unwrap();
        sync_content(&db, r#"{"new-unit":"revision-2"}"#).unwrap();
        assert_eq!(load(&db).unwrap(), Some(v.to_string()));
        v["reviews"] =
            serde_json::json!({"bad":{"interval":-1,"ease":2.5,"due":0,"reps":0,"lapses":0}});
        assert!(save(&mut db, &v.to_string()).is_err());
        assert!(!load(&db).unwrap().unwrap().contains("bad"));
        let mut u: serde_json::Value =
            serde_json::from_str(include_str!("../../../content/units/c2-u01.json")).unwrap();
        u["cards"][0]["kind"] = serde_json::json!("unsupported");
        assert!(validate_content(&u.to_string()).is_err());
    }
}
