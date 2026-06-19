use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Serialize)]
pub struct Entry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
}

#[derive(Serialize)]
pub struct SettingsFile {
    pub path: String,
    pub contents: String,
}

pub fn read_entries(path: &str) -> Result<Vec<Entry>, String> {
    let mut entries: Vec<Entry> = fs::read_dir(path)
        .map_err(|e| e.to_string())?
        .filter_map(Result::ok)
        .map(|entry| {
            let is_dir = entry.file_type().map(|kind| kind.is_dir()).unwrap_or(false);
            Entry {
                name: entry.file_name().to_string_lossy().into_owned(),
                path: entry.path().to_string_lossy().into_owned(),
                is_dir,
            }
        })
        .collect();

    entries.sort_by(|a, b| {
        b.is_dir
            .cmp(&a.is_dir)
            .then(a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });
    Ok(entries)
}

const WALK_CAP: usize = 5000;

pub fn should_skip(name: &str) -> bool {
    name == ".git" || name == "node_modules" || name.starts_with('.')
}

pub fn walk_files(dir: &Path, root: &Path, out: &mut Vec<String>) {
    if out.len() >= WALK_CAP {
        return;
    }
    let read = match fs::read_dir(dir) {
        Ok(read) => read,
        Err(_) => return,
    };
    let mut items: Vec<_> = read.filter_map(Result::ok).collect();
    items.sort_by_key(|entry| entry.file_name());
    for entry in items {
        if out.len() >= WALK_CAP {
            return;
        }
        let name = entry.file_name().to_string_lossy().into_owned();
        if should_skip(&name) {
            continue;
        }
        let path = entry.path();
        let is_dir = entry.file_type().map(|kind| kind.is_dir()).unwrap_or(false);
        if is_dir {
            walk_files(&path, root, out);
        } else if let Ok(relative) = path.strip_prefix(root) {
            out.push(relative.to_string_lossy().into_owned());
        }
    }
}

#[tauri::command]
pub fn list_dir(path: String) -> Result<Vec<Entry>, String> {
    read_entries(&path)
}

#[tauri::command]
pub fn list_files_recursive(folder: String) -> Vec<String> {
    let root = Path::new(&folder);
    let mut out = Vec::new();
    walk_files(root, root, &mut out);
    out
}

#[tauri::command]
pub fn get_settings(
    app: tauri::AppHandle,
    default: String,
) -> Result<SettingsFile, String> {
    use tauri::Manager;

    let dir: PathBuf = app.path().app_config_dir().map_err(|error| error.to_string())?;
    fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    let file = dir.join("settings.json");
    if !file.exists() {
        fs::write(&file, &default).map_err(|error| error.to_string())?;
    }
    let contents = fs::read_to_string(&file).map_err(|error| error.to_string())?;
    Ok(SettingsFile {
        path: file.to_string_lossy().into_owned(),
        contents,
    })
}

#[tauri::command]
pub fn get_ai_settings(
    app: tauri::AppHandle,
    default: String,
) -> Result<SettingsFile, String> {
    use tauri::Manager;

    let dir: PathBuf = app.path().app_config_dir().map_err(|error| error.to_string())?;
    fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    let file = dir.join("ai.json");
    if !file.exists() {
        fs::write(&file, &default).map_err(|error| error.to_string())?;
    }
    let contents = fs::read_to_string(&file).map_err(|error| error.to_string())?;
    Ok(SettingsFile {
        path: file.to_string_lossy().into_owned(),
        contents,
    })
}

pub fn count_words(text: &str) -> usize {
    text.split_whitespace().count()
}

pub fn create_file_at(path: &str) -> Result<(), String> {
    if Path::new(path).exists() {
        return Err("A file or folder with that name already exists.".into());
    }
    fs::write(path, "").map_err(|error| error.to_string())
}

pub fn create_dir_at(path: &str) -> Result<(), String> {
    if Path::new(path).exists() {
        return Err("A file or folder with that name already exists.".into());
    }
    fs::create_dir(path).map_err(|error| error.to_string())
}

pub fn rename_at(from: &str, to: &str) -> Result<(), String> {
    if Path::new(to).exists() {
        return Err("A file or folder with that name already exists.".into());
    }
    fs::rename(from, to).map_err(|error| error.to_string())
}

pub fn duplicate_target(dir: &str, stem: &str, ext: &str, exists: &dyn Fn(&str) -> bool) -> String {
    let suffix = if ext.is_empty() {
        String::new()
    } else {
        format!(".{ext}")
    };

    let candidate = Path::new(dir).join(format!("{stem} copy{suffix}"));
    let candidate = candidate.to_string_lossy().into_owned();
    if !exists(&candidate) {
        return candidate;
    }

    let mut index = 2;
    loop {
        let candidate = Path::new(dir).join(format!("{stem} copy {index}{suffix}"));
        let candidate = candidate.to_string_lossy().into_owned();
        if !exists(&candidate) {
            return candidate;
        }
        index += 1;
    }
}

fn copy_dir_recursive(from: &Path, to: &Path) -> std::io::Result<()> {
    fs::create_dir_all(to)?;
    for entry in fs::read_dir(from)? {
        let entry = entry?;
        let destination = to.join(entry.file_name());
        if entry.file_type()?.is_dir() {
            copy_dir_recursive(&entry.path(), &destination)?;
        } else {
            fs::copy(entry.path(), destination)?;
        }
    }
    Ok(())
}

#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn read_file_bytes(path: String) -> Result<Vec<u8>, String> {
    fs::read(&path).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn save_file(path: String, contents: String) -> Result<(), String> {
    fs::write(&path, contents).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_bytes(path: String, bytes: Vec<u8>) -> Result<(), String> {
    fs::write(&path, bytes).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn get_initial_file() -> Option<String> {
    std::env::args().nth(1).filter(|p| Path::new(p).is_file())
}

#[tauri::command]
pub fn word_count(text: String) -> usize {
    count_words(&text)
}

#[tauri::command]
pub fn create_file(path: String) -> Result<(), String> {
    create_file_at(&path)
}

#[tauri::command]
pub fn create_dir(path: String) -> Result<(), String> {
    create_dir_at(&path)
}

#[tauri::command]
pub fn rename_path(from: String, to: String) -> Result<(), String> {
    rename_at(&from, &to)
}

#[tauri::command]
pub fn delete_to_trash(path: String) -> Result<(), String> {
    trash::delete(&path).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn duplicate_path(path: String) -> Result<String, String> {
    let source = Path::new(&path);
    let directory = source
        .parent()
        .and_then(Path::to_str)
        .ok_or("Invalid path")?;
    let is_directory = source.is_dir();
    let stem = if is_directory {
        source.file_name()
    } else {
        source.file_stem()
    }
    .and_then(|value| value.to_str())
    .unwrap_or("copy");
    let extension = if is_directory {
        ""
    } else {
        source
            .extension()
            .and_then(|value| value.to_str())
            .unwrap_or("")
    };
    let target = duplicate_target(directory, stem, extension, &|candidate| {
        Path::new(candidate).exists()
    });

    if is_directory {
        copy_dir_recursive(source, Path::new(&target)).map_err(|error| error.to_string())?;
    } else {
        fs::copy(source, &target).map_err(|error| error.to_string())?;
    }
    Ok(target)
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

#[cfg(test)]
mod list_dir_tests {
    use super::{read_entries, Entry};
    use std::fs;

    #[test]
    fn lists_dirs_first_then_files_sorted() {
        let tmp = std::env::temp_dir().join("mdflow_listdir_test");
        let _ = fs::remove_dir_all(&tmp);
        fs::create_dir_all(tmp.join("zeta")).unwrap();
        fs::create_dir_all(tmp.join("alpha")).unwrap();
        fs::write(tmp.join("b.md"), "x").unwrap();
        fs::write(tmp.join("A.txt"), "x").unwrap();

        let got: Vec<(String, bool)> = read_entries(tmp.to_str().unwrap())
            .unwrap()
            .into_iter()
            .map(|e: Entry| (e.name, e.is_dir))
            .collect();

        assert_eq!(
            got,
            vec![
                ("alpha".into(), true),
                ("zeta".into(), true),
                ("A.txt".into(), false),
                ("b.md".into(), false),
            ]
        );
        let _ = fs::remove_dir_all(&tmp);
    }
}

#[cfg(test)]
mod crud_tests {
    use super::{create_dir_at, create_file_at, rename_at};
    use std::fs;

    #[test]
    fn create_and_rename_reject_existing() {
        let tmp = std::env::temp_dir().join("mdflow_crud_test");
        let _ = fs::remove_dir_all(&tmp);
        fs::create_dir_all(&tmp).unwrap();
        let file = tmp.join("a.md");
        let file_str = file.to_str().unwrap();

        create_file_at(file_str).unwrap();
        assert!(file.exists());
        assert!(create_file_at(file_str).is_err());

        let directory = tmp.join("sub");
        create_dir_at(directory.to_str().unwrap()).unwrap();
        assert!(directory.is_dir());

        let renamed = tmp.join("b.md");
        rename_at(file_str, renamed.to_str().unwrap()).unwrap();
        assert!(renamed.exists() && !file.exists());
        assert!(rename_at(renamed.to_str().unwrap(), directory.to_str().unwrap()).is_err());

        let _ = fs::remove_dir_all(&tmp);
    }
}

#[cfg(test)]
mod duplicate_tests {
    use super::{duplicate_path, duplicate_target};
    use std::collections::HashSet;
    use std::fs;
    use std::path::Path;

    #[test]
    fn picks_first_free_copy_name() {
        let mut taken: HashSet<String> = HashSet::new();

        assert_eq!(
            duplicate_target("/d", "a", "md", &|path| taken.contains(path)),
            "/d/a copy.md"
        );

        taken.insert("/d/a copy.md".into());
        assert_eq!(
            duplicate_target("/d", "a", "md", &|path| taken.contains(path)),
            "/d/a copy 2.md"
        );

        taken.insert("/d/a copy 2.md".into());
        assert_eq!(
            duplicate_target("/d", "a", "md", &|path| taken.contains(path)),
            "/d/a copy 3.md"
        );

        assert_eq!(
            duplicate_target("/d", "notes", "", &|path| taken.contains(path)),
            "/d/notes copy"
        );
    }

    #[test]
    fn duplicates_files_and_dotted_directories() {
        let tmp = std::env::temp_dir().join("mdflow_duplicate_test");
        let _ = fs::remove_dir_all(&tmp);
        fs::create_dir_all(&tmp).unwrap();

        let file = tmp.join("note.md");
        fs::write(&file, "hello").unwrap();
        let file_copy = duplicate_path(file.to_string_lossy().into_owned()).unwrap();
        assert!(file_copy.ends_with("note copy.md"));
        assert_eq!(fs::read_to_string(file_copy).unwrap(), "hello");

        let directory = tmp.join("docs.v1");
        fs::create_dir_all(&directory).unwrap();
        fs::write(directory.join("inside.txt"), "inside").unwrap();
        let directory_copy = duplicate_path(directory.to_string_lossy().into_owned()).unwrap();
        assert!(directory_copy.ends_with("docs.v1 copy"));
        assert_eq!(
            fs::read_to_string(Path::new(&directory_copy).join("inside.txt")).unwrap(),
            "inside"
        );

        let _ = fs::remove_dir_all(&tmp);
    }
}

#[cfg(test)]
mod walk_tests {
    use super::{should_skip, walk_files};
    use std::fs;

    #[test]
    fn should_skip_hidden_and_known_dirs() {
        assert!(should_skip(".git"));
        assert!(should_skip("node_modules"));
        assert!(should_skip(".DS_Store"));
        assert!(!should_skip("notes.md"));
        assert!(!should_skip("src"));
    }

    #[test]
    fn walk_returns_relative_files_skipping_noise() {
        let tmp = std::env::temp_dir().join("mdflow_walk_test");
        let _ = fs::remove_dir_all(&tmp);
        fs::create_dir_all(tmp.join("src")).unwrap();
        fs::create_dir_all(tmp.join(".git")).unwrap();
        fs::create_dir_all(tmp.join("node_modules/pkg")).unwrap();
        fs::write(tmp.join("readme.md"), "x").unwrap();
        fs::write(tmp.join("src/main.ts"), "x").unwrap();
        fs::write(tmp.join(".hidden"), "x").unwrap();
        fs::write(tmp.join(".git/config"), "x").unwrap();
        fs::write(tmp.join("node_modules/pkg/index.js"), "x").unwrap();

        let mut out: Vec<String> = Vec::new();
        walk_files(&tmp, &tmp, &mut out);
        out.sort();

        assert_eq!(
            out,
            vec!["readme.md".to_string(), "src/main.ts".to_string()]
        );
        let _ = fs::remove_dir_all(&tmp);
    }
}
