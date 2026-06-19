use std::fs;
use std::path::Path;

pub fn count_words(text: &str) -> usize {
    text.split_whitespace().count()
}

#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_file(path: String, contents: String) -> Result<(), String> {
    fs::write(&path, contents).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_initial_file() -> Option<String> {
    std::env::args().nth(1).filter(|p| Path::new(p).is_file())
}

#[tauri::command]
pub fn word_count(text: String) -> usize {
    count_words(&text)
}

#[cfg(test)]
mod tests {
    use super::count_words;

    #[test]
    fn counts_whitespace_separated_words() {
        assert_eq!(count_words("hello world"), 2);
        assert_eq!(count_words("  one   two\tthree\n"), 3);
        assert_eq!(count_words(""), 0);
        assert_eq!(count_words("   "), 0);
    }
}
