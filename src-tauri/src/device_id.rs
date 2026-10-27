use std::fs;
use std::time::{SystemTime,UNIX_EPOCH};
use std::{io, path::PathBuf, sync::OnceLock};

static DEVICE_ID_DIR: OnceLock<PathBuf> = OnceLock::new();

pub fn set_device_id_dir(dir: PathBuf) -> Result<(), PathBuf> {
    DEVICE_ID_DIR.set(dir)
}


/// Retrieves or generates a persistent unique device identifier stored on disk.
///
/// The id file lives under `paths::deviceid_cache_dir()`, which resolves to a
/// writable, app-scoped directory on every platform (including Android, where
/// `$HOME` is typically unset and the old `env::var("HOME")` fallback wrote to
/// a non-persistent CWD).
pub fn get_or_create_device_id() -> String {
    let config_dir = DEVICE_ID_DIR
    .get()
    .expect("DEVICE_ID_DIR not initialized — call init_device_id_dir() in setup() first");

    if let Err(e) = fs::create_dir_all(config_dir) {
        log::error!("[ID] failed to create {}: {}", config_dir.display(), e);
    }

    let id_file = config_dir.join("device_id");
    let existed = id_file.exists();

    if let Ok(id) = fs::read_to_string(&id_file) {
        let trimmed = id.trim().to_string();
        if !trimmed.is_empty() {
            log::info!(
                "[ID] reusing value={} path={} existed={}",
                trimmed,
                id_file.display(),
                existed
            );
            return trimmed;
        }
    }

    let new_id = format!(
        "device_{}",
        SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(12345)
    );

    match fs::write(&id_file, &new_id) {
        Ok(_) => log::info!(
            "[ID] created value={} path={} existed={}",
            new_id,
            id_file.display(),
            existed
        ),
        Err(e) => log::error!(
            "[ID] FAILED to persist value={} path={} existed={} err={} — id will regenerate on next call",
            new_id,
            id_file.display(),
            existed,
            e
        ),
    }

    new_id
}
