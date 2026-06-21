use std::path::Path;
use std::process::Command;

fn shell_quote(value: &str) -> String {
    format!("'{}'", value.replace('\'', "'\\''"))
}

fn login_command(command: &str) -> Vec<String> {
    vec!["zsh".into(), "-lic".into(), command.into()]
}

fn run_checked(command: &mut Command, missing: &str) -> Result<(), String> {
    let status = command.status().map_err(|error| {
        if error.kind() == std::io::ErrorKind::NotFound {
            missing.to_string()
        } else {
            error.to_string()
        }
    })?;
    status
        .success()
        .then_some(())
        .ok_or_else(|| "The terminal application could not be launched.".into())
}

#[tauri::command]
pub fn launch_external_terminal(
    app_name: String,
    command: String,
    cwd: Option<String>,
) -> Result<(), String> {
    let cwd = cwd.filter(|value| !value.trim().is_empty());
    match app_name.as_str() {
        "terminal" => {
            let full = match cwd {
                Some(dir) => format!(
                    "cd -- {} && exec zsh -lic {}",
                    shell_quote(&dir),
                    shell_quote(&command)
                ),
                None => format!("exec zsh -lic {}", shell_quote(&command)),
            };
            let script = format!(
                "tell application \"Terminal\"\nactivate\ndo script \"{}\"\nend tell",
                full.replace('\\', "\\\\").replace('"', "\\\"")
            );
            run_checked(
                Command::new("osascript").args(["-e", &script]),
                "Apple Terminal is unavailable.",
            )
        }
        "ghostty" => {
            let mut launch = Command::new("open");
            launch.args(["-na", "Ghostty.app", "--args"]);
            if let Some(dir) = cwd {
                launch.arg(format!("--working-directory={dir}"));
            }
            launch.arg("-e").args(login_command(&command));
            run_checked(&mut launch, "Ghostty is not installed.")
        }
        "cmux" => {
            let candidates = [
                "/Applications/cmux.app/Contents/Resources/bin/cmux",
                "/usr/local/bin/cmux",
                "/opt/homebrew/bin/cmux",
            ];
            let binary = candidates
                .iter()
                .find(|candidate| Path::new(candidate).exists())
                .ok_or("cmux is not installed or its CLI is unavailable.")?;
            let mut launch = Command::new(binary);
            launch.arg("new-workspace");
            if let Some(dir) = cwd {
                launch.args(["--cwd", &dir]);
            }
            launch.args(["--command", &command, "--focus", "true"]);
            run_checked(&mut launch, "cmux is not installed.")
        }
        _ => Err("Unknown terminal application.".into()),
    }
}

#[cfg(test)]
mod tests {
    use super::shell_quote;

    #[test]
    fn shell_quote_handles_spaces_and_apostrophes() {
        assert_eq!(shell_quote("/tmp/a b"), "'/tmp/a b'");
        assert_eq!(shell_quote("it's"), "'it'\\''s'");
    }
}
