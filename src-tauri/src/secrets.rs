use keyring::{Entry, Error};

const SERVICE: &str = "com.kael.mdflow";

fn entry(id: &str) -> Result<Entry, String> {
    Entry::new(SERVICE, id).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn set_secret(id: String, secret: String) -> Result<(), String> {
    entry(&id)?
        .set_password(&secret)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn get_secret(id: String) -> Option<String> {
    entry(&id).ok()?.get_password().ok()
}

#[tauri::command]
pub fn delete_secret(id: String) -> Result<(), String> {
    match entry(&id)?.delete_credential() {
        Ok(()) | Err(Error::NoEntry) => Ok(()),
        Err(error) => Err(error.to_string()),
    }
}

#[tauri::command]
pub fn has_secret(id: String) -> bool {
    get_secret(id).is_some()
}
