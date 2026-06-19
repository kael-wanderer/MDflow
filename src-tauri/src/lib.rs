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
        .plugin(tauri_plugin_updater::Builder::new().build())
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
            set_soft_wrap,
        ])
        .run(tauri::generate_context!())
        .expect("error while running MDflow");
}
