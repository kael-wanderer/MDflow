mod ai;
mod defaults;
mod export;
mod files;
mod menu;
mod pty;

use std::sync::Mutex;
use tauri::{Emitter, Manager};

#[derive(Default)]
struct OpenPathState {
    inner: Mutex<OpenPathQueue>,
}

#[derive(Default)]
struct OpenPathQueue {
    frontend_ready: bool,
    pending: Vec<String>,
}

#[tauri::command]
fn take_open_paths(state: tauri::State<'_, OpenPathState>) -> Vec<String> {
    let mut queue = state.inner.lock().expect("open-path state poisoned");
    queue.frontend_ready = true;
    std::mem::take(&mut queue.pending)
}

fn dispatch_open_path(app: &tauri::AppHandle, path: String) {
    let state = app.state::<OpenPathState>();
    let mut queue = state.inner.lock().expect("open-path state poisoned");
    if queue.frontend_ready {
        drop(queue);
        let _ = app.emit("open-path", path);
    } else {
        queue.pending.push(path);
    }
}

#[tauri::command]
fn sync_view_menu(
    app: tauri::AppHandle,
    wrap: String,
    theme: String,
    font: String,
    size: u32,
    explorer_size: u32,
) {
    let set = |id: String, on: bool| {
        if let Some(item) = menu::find_check_item(&app, &id) {
            let _ = item.set_checked(on);
        }
    };
    for mode in ["off", "window", "guide"] {
        set(format!("view.wrap.{mode}"), mode == wrap);
    }
    for (_, value) in menu::THEME_OPTIONS {
        set(format!("view.theme.{value}"), *value == theme);
    }
    for (_, value) in menu::FONT_OPTIONS {
        set(format!("view.font.{value}"), *value == font);
    }
    for n in menu::SIZE_OPTIONS {
        set(format!("view.size.{n}"), *n == size);
    }
    for n in menu::SIZE_OPTIONS {
        set(format!("view.explorer_size.{n}"), *n == explorer_size);
    }
}

#[tauri::command]
fn window_fullscreen_toggle(window: tauri::Window) {
    let current = window.is_fullscreen().unwrap_or(false);
    let _ = window.set_fullscreen(!current);
}

#[tauri::command]
fn window_tile(window: tauri::Window, side: String) {
    let Ok(Some(monitor)) = window.current_monitor() else {
        return;
    };
    let pos = monitor.position();
    let size = monitor.size();
    let half_w = size.width / 2;
    let x = if side == "right" {
        pos.x + half_w as i32
    } else {
        pos.x
    };
    let _ = window.set_fullscreen(false);
    let _ = window.set_position(tauri::PhysicalPosition::new(x, pos.y));
    let _ = window.set_size(tauri::PhysicalSize::new(half_w, size.height));
}

#[tauri::command]
fn restart_app(app: tauri::AppHandle) {
    app.restart();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(pty::PtyState::default())
        .manage(OpenPathState::default())
        .setup(|app| {
            #[cfg(desktop)]
            app.handle()
                .plugin(tauri_plugin_updater::Builder::new().build())?;
            let m = menu::build(app.handle())?;
            app.set_menu(m)?;
            Ok(())
        })
        .on_menu_event(|app, event| {
            let _ = app.emit("menu", event.id().0.as_str());
        })
        .invoke_handler(tauri::generate_handler![
            ai::ai_run,
            export::export_pdf,
            export::export_docx,
            export::export_pdf_html,
            export::export_docx_html,
            export::export_html,
            defaults::set_default_handler,
            defaults::open_default_apps_settings,
            files::read_file,
            files::read_file_bytes,
            files::save_file,
            files::save_bytes,
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
            files::get_ai_settings,
            pty::pty_open,
            pty::pty_write,
            pty::pty_resize,
            pty::pty_kill,
            take_open_paths,
            sync_view_menu,
            window_fullscreen_toggle,
            window_tile,
            restart_app,
        ])
        .build(tauri::generate_context!())
        .expect("error while building MDflow")
        .run(|app, event| {
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Opened { urls } = event {
                for url in urls {
                    if let Ok(path) = url.to_file_path() {
                        dispatch_open_path(app, path.to_string_lossy().into_owned());
                    }
                }
            }
        });
}
