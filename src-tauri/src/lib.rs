mod file_export;

fn updater_builder() -> tauri_plugin_updater::Builder {
  let builder = tauri_plugin_updater::Builder::new();

  #[cfg(target_os = "windows")]
  let builder = {
    use tauri::utils::{config::BundleType, platform::{bundle_type, current_exe}};

    if matches!(bundle_type(), Some(BundleType::Nsis)) {
      // NSIS otherwise restores its destination from the registry, which may
      // refer to another copy. /D must be the final argument and unquoted,
      // including when the path contains spaces (NSIS command-line syntax).
      let executable = current_exe().expect("failed to locate the running MOROX executable");
      let directory = executable.parent().expect("MOROX executable has no parent directory");
      let mut destination = std::ffi::OsString::from("/D=");
      destination.push(directory);
      builder.installer_arg(destination)
    } else {
      builder
    }
  };

  builder
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![file_export::save_export_file, file_export::open_export_file])
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_opener::init())
    .plugin(updater_builder().build())
    .plugin(tauri_plugin_process::init())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
