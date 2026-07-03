#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::{
  fs,
  path::{Path, PathBuf},
};

#[derive(Debug, Clone, Serialize, Deserialize)]
struct TreeNode {
  name: String,
  path: String,
  rel_path: String,
  kind: NodeKind,
  children: Option<Vec<TreeNode>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
enum NodeKind {
  File,
  Directory,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
struct HistoryEntry {
  kind: String,
  path: String,
  name: String,
  last_opened_at: String,
  last_viewed_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
struct AppHistory {
  recent: Vec<HistoryEntry>,
}

#[tauri::command]
fn read_text_file(file_path: String) -> Result<String, String> {
  fs::read_to_string(&file_path).map_err(|err| format!("读取文件失败: {err}"))
}

#[tauri::command]
fn write_text_file(file_path: String, content: String) -> Result<(), String> {
  fs::write(&file_path, content).map_err(|err| format!("保存文件失败: {err}"))
}

#[tauri::command]
fn load_history() -> Result<AppHistory, String> {
  let path = history_path()?;
  if !path.exists() {
    return Ok(AppHistory::default());
  }

  let data = fs::read_to_string(path).map_err(|err| format!("读取历史失败: {err}"))?;
  serde_json::from_str(&data).map_err(|err| format!("解析历史失败: {err}"))
}

#[tauri::command]
fn save_history(history: AppHistory) -> Result<(), String> {
  let path = history_path()?;
  if let Some(parent) = path.parent() {
    fs::create_dir_all(parent).map_err(|err| format!("创建历史目录失败: {err}"))?;
  }
  let data = serde_json::to_string_pretty(&history).map_err(|err| format!("序列化历史失败: {err}"))?;
  fs::write(path, data).map_err(|err| format!("保存历史失败: {err}"))
}

#[tauri::command]
fn scan_project(root_path: String) -> Result<Vec<TreeNode>, String> {
  let root = PathBuf::from(&root_path);
  if !root.exists() {
    return Err(format!("目录不存在: {root_path}"));
  }

  build_tree(&root, &root).map_err(|err| format!("扫描项目失败: {err}"))
}

fn build_tree(root: &Path, current: &Path) -> Result<Vec<TreeNode>, String> {
  let mut dirs = Vec::new();
  let mut files = Vec::new();

  for entry in fs::read_dir(current).map_err(|err| format!("读取目录失败: {err}"))? {
    let entry = entry.map_err(|err| format!("读取目录项失败: {err}"))?;
    let path = entry.path();
    let name = entry.file_name().to_string_lossy().to_string();

    if should_skip(&path, &name) {
      continue;
    }

    if path.is_dir() {
      let children = build_tree(root, &path)?;
      dirs.push(TreeNode {
        name,
        path: path.to_string_lossy().to_string(),
        rel_path: relative_path(root, &path),
        kind: NodeKind::Directory,
        children: Some(children),
      });
    } else if is_markdown_file(&path) {
      files.push(TreeNode {
        name,
        path: path.to_string_lossy().to_string(),
        rel_path: relative_path(root, &path),
        kind: NodeKind::File,
        children: None,
      });
    }
  }

  dirs.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
  files.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

  let mut out = dirs;
  out.extend(files);
  Ok(out)
}

fn should_skip(path: &Path, name: &str) -> bool {
  if name.starts_with('.') && path.is_dir() {
    return true;
  }

  matches!(
    name,
    "node_modules" | "dist" | "build" | ".git" | ".idea" | ".vscode" | "target"
  )
}

fn is_markdown_file(path: &Path) -> bool {
  path
    .extension()
    .and_then(|ext| ext.to_str())
    .map(|ext| matches!(ext.to_ascii_lowercase().as_str(), "md" | "markdown" | "mdown" | "mkdn" | "txt"))
    .unwrap_or(false)
}

fn relative_path(root: &Path, path: &Path) -> String {
  path
    .strip_prefix(root)
    .unwrap_or(path)
    .to_string_lossy()
    .replace('\\', "/")
}

fn history_path() -> Result<PathBuf, String> {
  let dir = dirs::data_local_dir().ok_or_else(|| String::from("找不到本地数据目录"))?;
  Ok(dir.join("com.liro.markdown-reader").join("history.json"))
}

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
      read_text_file,
      write_text_file,
      load_history,
      save_history,
      scan_project
    ])
    .setup(|app| {
      let handle = app.handle();
      let _ = handle.path_resolver();
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
