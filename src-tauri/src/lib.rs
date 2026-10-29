// Vellichor native backend module declarations
pub mod cache;
pub mod discovery;
pub mod files;
pub mod input;
pub mod node_server;
pub mod settings;
pub mod system;
pub mod types;
pub mod paths;
pub mod device_id;
pub mod screen_capture;

// Re-exports for clean library access
pub use cache::*;
pub use discovery::*;
pub use files::*;
pub use input::*;
pub use node_server::*;
pub use settings::*;
pub use system::*;
pub use types::*;
// pub mod device_id::*;

// App imports
use std::sync::Mutex;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
// Cross-platform imports — used on desktop, Android, and iOS
use tauri::{AppHandle, Manager, Runtime, WindowEvent};
use crate::screen_capture::CaptureState;

// Desktop-only imports — tray, menu, and global shortcuts
#[cfg(desktop)]
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
};

#[cfg(desktop)]
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

/// Cross-platform: the frontend may query it even on mobile.
struct AppState {
     #[allow(dead_code)]
    is_quitting: AtomicBool,
}

/// Desktop-only in practice (tray/window icons), but the struct itself
/// is cheap to keep on all platforms so `manage()` doesn't need a guard.
struct IconState {
    #[allow(dead_code)]
    path: std::sync::Mutex<PathBuf>,
}

#[tauri::command]
fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
fn get_dev_status() -> bool {
    cfg!(debug_assertions)
}

/*
 * Resolves the on-disk path to the current app icon. Cross-platform because it only touches the filesystem — no tray/window APIs.
 */
fn resolve_icon_path<R: Runtime>(app: &AppHandle<R>, _dark: bool) -> PathBuf {
    let filename = "vellichor.png";

    if cfg!(debug_assertions) {
        std::env::current_dir()
        .unwrap_or_default()
        .join("../assets")
        .join(filename)
    } else {
        app.path()
        .resource_dir()
        .unwrap_or_default()
        .join("assets")
        .join(filename)
    }
}

/*
 * Desktop-only: `TrayIconBuilder`, `Menu`, `MenuItem`, `TrayIconEvent` are all gated behind `#[cfg(all(desktop, feature = "tray-icon"))]`.
 */
#[cfg(desktop)]
fn build_tray<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    let show_i = MenuItem::with_id(app, "show", "Show", true, None::<&str>)?;
    let sep = PredefinedMenuItem::separator(app)?;
    let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&show_i, &sep, &quit_i])?;

    let icon = tauri::image::Image::from_path(resolve_icon_path(app, false))?;

    let _tray = TrayIconBuilder::with_id("main-tray")
    .icon(icon)
    .tooltip("OpenReel")
    .menu(&menu)
    .show_menu_on_left_click(false)
    .on_menu_event(|app, event| match event.id.as_ref() {
        "show" => {
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.show();
                let _ = win.set_focus();
            }
        }
        "quit" => {
            app.state::<AppState>()
            .is_quitting
            .store(true, Ordering::SeqCst);
            app.exit(0);
        }
        _ => {}
    })
    .on_tray_icon_event(|tray, event| {
        // Double-click → show main window (Electron's `tray.on('double-click')`)
        if let TrayIconEvent::DoubleClick {
            button: MouseButton::Left,
            ..
        } = event
        {
            let app = tray.app_handle();
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.show();
                let _ = win.set_focus();
            }
        }
        // Also handle single left-click show (common UX).
        if let TrayIconEvent::Click {
            button: MouseButton::Left,
            button_state: MouseButtonState::Up,
            ..
        } = event
        {
            let app = tray.app_handle();
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.show();
            }
        }
    })
    .build(app)?;

    Ok(())
}

/*
 * Desktop-only: `tauri_plugin_global_shortcut` is compiled only on non-mobile targets (see `Cargo.toml`'s target-specific dependency block).
 */
#[cfg(desktop)]
fn register_shortcuts<R: Runtime>(app: &AppHandle<R>) -> Result<(), Box<dyn std::error::Error>> {
    // F12 — toggle devtools
    let f12 = Shortcut::new(None, Code::F12);
    app.global_shortcut().on_shortcut(f12, |app, _sc, ev| {
        #[cfg(debug_assertions)]
        if ev.state == ShortcutState::Pressed {
            if let Some(win) = app.get_webview_window("main") {
                {
                    if win.is_devtools_open() {
                        win.close_devtools();
                    } else {
                        win.open_devtools();
                    }
                }
            }
        }
    })?;

    // Reload — Cmd+R on macOS, Ctrl+R on Windows/Linux
    #[cfg(target_os = "macos")]
    let reload = Shortcut::new(Some(Modifiers::META), Code::KeyR);
    #[cfg(not(target_os = "macos"))]
    let reload = Shortcut::new(Some(Modifiers::CONTROL), Code::KeyR);

    app.global_shortcut().on_shortcut(reload, |app, _sc, ev| {
        if ev.state == ShortcutState::Pressed {
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.eval("window.location.reload()");
            }
        }
    })?;

    // Force reload — Cmd+Shift+R on macOS, Ctrl+Shift+R on Windows/Linux
    #[cfg(target_os = "macos")]
    let force_reload = Shortcut::new(Some(Modifiers::META | Modifiers::SHIFT), Code::KeyR);
    #[cfg(not(target_os = "macos"))]
    let force_reload = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyR);

    app.global_shortcut()
    .on_shortcut(force_reload, |app, _sc, ev| {
        if ev.state == ShortcutState::Pressed {
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.eval("window.location.reload()");
            }
        }
    })?;

    // F11 — toggle fullscreen
    let f11 = Shortcut::new(None, Code::F11);
    app.global_shortcut().on_shortcut(f11, |app, _sc, ev| {
        if ev.state == ShortcutState::Pressed {
            if let Some(win) = app.get_webview_window("main") {
                if let Ok(is_fs) = win.is_fullscreen() {
                    let _ = win.set_fullscreen(!is_fs);
                }
            }
        }
    })?;

    Ok(())
}

/*
 * This function only handles the "show after load" logic and the close-to-tray interception.
 *
 * Desktop-only: the close-to-tray interception relies on the tray existing;
 * on mobile, closing the window should just close it.
 */
#[cfg(desktop)]
fn wire_main_window<R: Runtime>(app: &AppHandle<R>) {
    let Some(main) = app.get_webview_window("main") else {
        return;
    };

    // Close main window → hide to tray unless `is_quitting` is set.
    let main_clone = main.clone();
    main.on_window_event(move |event| {
        if let WindowEvent::CloseRequested { api, .. } = event {
            let state = main_clone.app_handle().state::<AppState>();
            if !state.is_quitting.load(Ordering::SeqCst) {
                api.prevent_close();
                let _ = main_clone.hide();
            }
        }
    });
}

/*
 * Builds the Tauri app with plugins appropriate for the current platform.
 * The `#[cfg(desktop)]` shadowing pattern is intentional: on mobile,
 * the second `let builder = ...` line is simply not compiled,
 * so the original `builder` value flows through unchanged.
 */
fn build_app() -> tauri::Builder<tauri::Wry> {
    let mut builder = tauri::Builder::default();
    // Core application logging plugin
    // .plugin(tauri_plugin_log::Builder::default().build())
    // MUST be first. Before other plugins, before .manage().
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|_app, _argv, _cwd| {}));
    }
    builder = builder
    .plugin(
        tauri_plugin_log::Builder::new()
        .level(log::LevelFilter::Debug)
        .targets([
            tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::LogDir {
                file_name: Some("openreel".into()),
            }),
            // tauri_plugin_log::Target::new(
            //     tauri_plugin_log::TargetKind::Folder {
            //         path: make_log_dir(),
            //         file_name: Some("openreel".into()),
            //     },
            // ),
            tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stdout),
                 tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Webview),
        ])
        .max_file_size(5 * 1024 * 1024)  // 5 MB per file
        .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepAll)
        .build(),
    )
    .plugin(tauri_plugin_fs::init());
    #[cfg(target_os = "android")]
    let builder = builder.plugin(tauri_plugin_android_fs::init());
    #[cfg(desktop)]
    let builder = builder.plugin(tauri_plugin_global_shortcut::Builder::new().build());
    builder
}

// Main entry point for desktop and mobile application runtime
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    build_app()
        .manage(AppState {
            is_quitting: AtomicBool::new(false),
        })
        .manage(IconState {
            path: std::sync::Mutex::new(PathBuf::new()),
        })
        .manage(files::DownloadRegistry::new())
        .manage(screen_capture::CaptureState::new())
        .register_uri_scheme_protocol("stream", |ctx, request| {
            screen_capture::stream_uri_handler(ctx, request)
        })
        // Tauri IPC command handlers registration
        .invoke_handler(tauri::generate_handler![
            get_dev_status,
            get_app_version,
            // System and hardware telemetry commands
            system::get_system_info,
            // LAN and UDP peer network discovery commands
            discovery::scan_network,
            // Storage cache interrogation and clearance commands
            cache::get_cache_size,
            cache::clear_cache,
            // Input synthesis and desktop automation commands
            input::simulate_input,
            // Persistent settings storage commands
            settings::get_stored_settings,
            settings::save_stored_settings,
            // Native file transfer and chunked filesystem commands
            paths::get_download_directory,
            files::read_file_chunk,
            files::get_file_info,
            files::begin_download,
            files::write_file_chunk,
            files::finalize_download,
            files::cleanup_download,
            // Decentralized P2P node server signaling commands
            node_server::send_peer_signal,
            node_server::get_node_status,
            screen_capture::list_monitors,
            screen_capture::start_screen_stream,
            screen_capture::stop_screen_stream,
            screen_capture::get_frame_meta,
            #[cfg(target_os = "android")]
            screen_capture::start_android_screen_stream,
        ])
        .setup(|app| {
            let handle = app.handle().clone();

            // Start embedded P2P peer node server on port 42426
            node_server::start_node_server(handle.clone());

            if let Err(e) = paths::ensure_data_files(&handle) {
                // eprintln!("failed to prepare data directory: {e}");
                log::error!("Failed to prepare data files: {}", e)
            }

            let _ = device_id::set_device_id_dir(paths::deviceid_dir(&handle));

            let state: tauri::State<'_, CaptureState> = app.state();
            state.frame_sink.set_app_handle(app.handle().clone());

            #[cfg(target_os = "android")]
            {
                let _ = screen_capture::ANDROID_FRAME_SINK.set(state.frame_sink.clone());
            }

            /* Desktop-only setup. Everything below touches APIs that are
             * `#[cfg(desktop)]`-gated inside Tauri itself (tray, window icons, global shortcuts, menu).
             **/
            #[cfg(desktop)]
            {
                // Register global shortcuts (was `setShortcuts()`).
                if let Err(e) = register_shortcuts(&handle) {
                    eprintln!("shortcut registration failed: {e}");
                }

                // Build tray.
                build_tray(&handle)?;

                // Wire main-window close → hide-to-tray.
                wire_main_window(&handle);
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running vellichor application");
}
