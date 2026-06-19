use serde::Serialize;
use std::fs;
use std::path::Path;

#[derive(Serialize)]
pub struct Entry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
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

#[tauri::command]
pub fn list_dir(path: String) -> Result<Vec<Entry>, String> {
    read_entries(&path)
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
    use super::duplicate_target;
    use std::collections::HashSet;

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
}
