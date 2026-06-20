use std::io::{BufRead, BufReader, Read};
use std::process::{Command, Stdio};
use tauri::Emitter;

#[derive(Clone, serde::Serialize)]
struct Chunk {
    #[serde(rename = "requestId")]
    request_id: String,
    chunk: String,
}

#[derive(Clone, serde::Serialize)]
struct Done {
    #[serde(rename = "requestId")]
    request_id: String,
}

#[derive(Clone, serde::Serialize)]
struct ErrorMsg {
    #[serde(rename = "requestId")]
    request_id: String,
    message: String,
}

#[tauri::command]
pub fn ai_run(
    app: tauri::AppHandle,
    request_id: String,
    args: Vec<String>,
) -> Result<(), String> {
    if args.is_empty() {
        return Err("Empty command".into());
    }

    let mut command = Command::new(&args[0]);
    command
        .args(&args[1..])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    let mut child = command.spawn().map_err(|error| {
        let message = format!("Failed to start: {error}");
        let _ = app.emit(
            "ai-error",
            ErrorMsg {
                request_id: request_id.clone(),
                message: message.clone(),
            },
        );
        message
    })?;
    let stdout = child.stdout.take().ok_or("Command stdout unavailable")?;
    let stderr = child.stderr.take().ok_or("Command stderr unavailable")?;
    let stream_app = app.clone();
    let stream_id = request_id.clone();

    std::thread::spawn(move || {
        let stderr_thread = std::thread::spawn(move || {
            let mut reader = BufReader::new(stderr);
            let mut message = String::new();
            let _ = reader.read_to_string(&mut message);
            message
        });

        for line in BufReader::new(stdout).lines().map_while(Result::ok) {
            let _ = stream_app.emit(
                "ai-chunk",
                Chunk {
                    request_id: stream_id.clone(),
                    chunk: format!("{line}\n"),
                },
            );
        }

        match child.wait() {
            Ok(status) if status.success() => {
                let _ = stream_app.emit(
                    "ai-done",
                    Done {
                        request_id: stream_id,
                    },
                );
            }
            Ok(status) => {
                let stderr = stderr_thread.join().unwrap_or_default();
                let message = if stderr.trim().is_empty() {
                    format!("Command exited with {status}")
                } else {
                    stderr.trim().to_string()
                };
                let _ = stream_app.emit(
                    "ai-error",
                    ErrorMsg {
                        request_id: stream_id,
                        message,
                    },
                );
                return;
            }
            Err(error) => {
                let _ = stream_app.emit(
                    "ai-error",
                    ErrorMsg {
                        request_id: stream_id,
                        message: error.to_string(),
                    },
                );
                return;
            }
        }

        let _ = stderr_thread.join();
    });
    Ok(())
}
