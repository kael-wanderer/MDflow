mod files;
mod menu;

use tauri::Emitter;

#[tauri::command]
fn set_soft_wrap(app: tauri::AppHandle, on: bool) {
    if let Some(item) = menu::soft_wrap_item(&app) {
        let _ = item.set_checked(on);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_opener::init())
        // Updater plugin is installed (dependency + capability) but dormant in M1.
        // M2 registers `tauri_plugin_updater` here and adds the `plugins.updater`
        // config (endpoints + pubkey).
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let m = menu::build(app.handle())?;
            app.set_menu(m)?;
            Ok(())
        })
        .on_menu_event(|app, event| {
            let id = event.id().0.as_str();
            if id == "view.softwrap" {
                if let Some(item) = menu::soft_wrap_item(app) {
                    let cur = item.is_checked().unwrap_or(true);
                    let _ = item.set_checked(!cur);
                }
            }
            let _ = app.emit("menu", id);
        })
        .invoke_handler(tauri::generate_handler![
            files::read_file,
            files::save_file,
            files::get_initial_file,
            files::word_count,
            files::list_dir,
            files::create_file,
            files::create_dir,
            files::rename_path,
            files::delete_to_trash,
            files::duplicate_path,
            files::list_files_recursive,
            files::get_settings,
            set_soft_wrap,
        ])
        .run(tauri::generate_context!())
        .expect("error while running MDflow");
}
