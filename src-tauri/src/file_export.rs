use std::path::{Path, PathBuf};
use serde::Serialize;
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_opener::OpenerExt;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SavedExport {
    path: String,
    open_error: Option<String>,
}

fn extension(path: &Path) -> Result<String, String> {
    let ext = path.extension().and_then(|s| s.to_str()).unwrap_or("").to_ascii_lowercase();
    match ext.as_str() {
        "pdf" | "docx" | "xlsx" => Ok(ext),
        _ => Err("Unterstützt werden PDF-, Word- und Excel-Dateien.".into()),
    }
}

fn open_file(app: &tauri::AppHandle, path: &Path) -> Result<(), String> {
    let ext = extension(path)?;
    let canonical = path.canonicalize().map_err(|e| e.to_string())?;
    // Office/browser launch arguments should use normal drive/UNC paths,
    // rather than the Windows extended-length prefix from canonicalize().
    let path = dunce::simplified(&canonical);
    if !path.is_file() {
        return Err("Die Datei wurde nicht gefunden.".into());
    }
    if ext == "pdf" {
        // A file association may point to Acrobat/Preview. Resolve the default
        // web browser explicitly and use a properly encoded local file URL.
        let url = url::Url::from_file_path(&path).map_err(|_| "Ungültiger Dateipfad")?;
        return webbrowser::open(url.as_str()).map_err(|e| e.to_string());
    }
    let path = path.to_string_lossy().into_owned();
    if ext == "docx" {
        #[cfg(target_os = "windows")]
        let word = Some("WINWORD.EXE");
        #[cfg(target_os = "macos")]
        let word = Some("Microsoft Word");
        #[cfg(not(any(target_os = "windows", target_os = "macos")))]
        let word: Option<&str> = None;
        if let Some(word) = word {
            #[cfg(target_os = "windows")]
            let argument = format!("\"{path}\"");
            #[cfg(not(target_os = "windows"))]
            let argument = path.clone();
            if app.opener().open_path(argument, Some(word)).is_ok() {
                return Ok(());
            }
        }
    }
    // If Word is unavailable, use the installed default document application.
    app.opener().open_path(path, None::<&str>).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_export_file(
    app: tauri::AppHandle,
    filename: String,
    bytes: Vec<u8>,
) -> Result<Option<SavedExport>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let ext = extension(Path::new(&filename))?;
        let label = match ext.as_str() { "pdf" => "PDF-Dokument", "docx" => "Word-Dokument", _ => "Excel-Arbeitsmappe" };
        let picked = app.dialog().file()
            .set_title("Datei speichern unter")
            .set_file_name(&filename)
            .add_filter(label, &[ext.as_str()])
            .blocking_save_file();
        let Some(picked) = picked else { return Ok(None) };
        let mut path = picked.into_path().map_err(|e| e.to_string())?;
        if path.extension().is_none() {
            path.set_extension(&ext);
            // The dialog confirmed the extensionless name, not this existing
            // file. Require selecting its full name to get OS overwrite consent.
            if path.exists() {
                return Err("Datei existiert bereits. Bitte den vollständigen Dateinamen im Speicherdialog auswählen.".into());
            }
        }
        if extension(&path)? != ext {
            return Err(format!("Bitte die Dateiendung .{ext} verwenden."));
        }
        std::fs::write(&path, bytes).map_err(|e| format!("Datei konnte nicht gespeichert werden: {e}"))?;
        let open_error = open_file(&app, &path).err();
        Ok(Some(SavedExport { path: path.to_string_lossy().into_owned(), open_error }))
    }).await.map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn open_export_file(app: tauri::AppHandle, path: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || open_file(&app, &PathBuf::from(path)))
        .await.map_err(|e| e.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_documents_can_be_opened() {
        assert_eq!(extension(Path::new("Muster.PDF")).unwrap(), "pdf");
        assert_eq!(extension(Path::new("Vertrag.docx")).unwrap(), "docx");
        assert!(extension(Path::new("programm.exe")).is_err());
        assert!(extension(Path::new("Vertrag.docx.exe")).is_err());
    }
}
