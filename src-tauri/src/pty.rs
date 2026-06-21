use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::Mutex;
use tauri::{Emitter, Manager};

struct PtyHandle {
    writer: Box<dyn Write + Send>,
    master: Box<dyn MasterPty + Send>,
}

#[derive(Default)]
pub struct PtyState(Mutex<HashMap<String, PtyHandle>>);

#[derive(Clone, serde::Serialize)]
struct PtyData {
    id: String,
    data: String,
}

#[derive(Clone, serde::Serialize)]
struct PtyExit {
    id: String,
}

#[tauri::command]
pub fn pty_open(app: tauri::AppHandle, id: String, cmd: String) -> Result<(), String> {
    let pair = native_pty_system()
        .openpty(PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|error| error.to_string())?;
    // Use the user's login + interactive shell so the PTY inherits their real
    // PATH (and aliases) from their profile; a bare `sh -c` has a minimal PATH
    // and can't find tools like `claude` installed under ~/.local/bin, npm, brew.
    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".into());
    let mut builder = CommandBuilder::new(shell);
    builder.arg("-lic");
    builder.arg(&cmd);
    if let Some(home) = std::env::var_os("HOME") {
        builder.cwd(home);
    }
    let mut child = pair
        .slave
        .spawn_command(builder)
        .map_err(|error| error.to_string())?;
    drop(pair.slave);

    let mut reader = pair
        .master
        .try_clone_reader()
        .map_err(|error| error.to_string())?;
    let writer = pair
        .master
        .take_writer()
        .map_err(|error| error.to_string())?;
    app.state::<PtyState>()
        .0
        .lock()
        .map_err(|_| "PTY state lock poisoned".to_string())?
        .insert(
            id.clone(),
            PtyHandle {
                writer,
                master: pair.master,
            },
        );

    let stream_app = app.clone();
    std::thread::spawn(move || {
        let mut buffer = [0_u8; 4096];
        loop {
            match reader.read(&mut buffer) {
                Ok(0) | Err(_) => break,
                Ok(length) => {
                    let _ = stream_app.emit(
                        "pty-data",
                        PtyData {
                            id: id.clone(),
                            data: String::from_utf8_lossy(&buffer[..length]).to_string(),
                        },
                    );
                }
            }
        }
        let _ = child.wait();
        let _ = stream_app.emit(
            "pty-data",
            PtyData {
                id: id.clone(),
                data: "\r\n[process exited]\r\n".into(),
            },
        );
        let _ = stream_app.emit("pty-exit", PtyExit { id: id.clone() });
        if let Ok(mut handles) = stream_app.state::<PtyState>().0.lock() {
            handles.remove(&id);
        }
    });
    Ok(())
}

#[tauri::command]
pub fn pty_write(app: tauri::AppHandle, id: String, data: String) -> Result<(), String> {
    let state = app.state::<PtyState>();
    let mut handles = state
        .0
        .lock()
        .map_err(|_| "PTY state lock poisoned".to_string())?;
    if let Some(handle) = handles.get_mut(&id) {
        handle
            .writer
            .write_all(data.as_bytes())
            .map_err(|error| error.to_string())?;
        handle.writer.flush().map_err(|error| error.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn pty_resize(app: tauri::AppHandle, id: String, rows: u16, cols: u16) -> Result<(), String> {
    let state = app.state::<PtyState>();
    let handles = state
        .0
        .lock()
        .map_err(|_| "PTY state lock poisoned".to_string())?;
    if let Some(handle) = handles.get(&id) {
        handle
            .master
            .resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|error| error.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn pty_kill(app: tauri::AppHandle, id: String) -> Result<(), String> {
    app.state::<PtyState>()
        .0
        .lock()
        .map_err(|_| "PTY state lock poisoned".to_string())?
        .remove(&id);
    Ok(())
}
