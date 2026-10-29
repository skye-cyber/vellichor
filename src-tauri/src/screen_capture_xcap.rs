use std::io::Cursor;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;

use image::{ImageFormat, RgbaImage};
use tauri::ipc::{Channel, InvokeResponseBody};
use tauri::{AppHandle, Manager, State};
use xcap::{Monitor, Window};

// ---------------------------------------------------------------------------
// Capture source info
// ---------------------------------------------------------------------------

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MonitorInfo {
    pub id: u32,
    pub name: String,
    pub width: u32,
    pub height: u32,
    pub is_primary: bool,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WindowInfo {
    pub id: u32,
    pub title: String,
    pub app_name: String,
    pub width: u32,
    pub height: u32,
    pub is_minimized: bool,
}

#[tauri::command]
pub fn list_monitors() -> Result<Vec<MonitorInfo>, String> {
    let sources = pinray::enumerate_sources().map_err(|e| e.to_string())?;
    let mut result = Vec::new();
    for source in sources {
        if let pinray::CaptureSource::Display(d) = source {
            result.push(MonitorInfo {
                id: d.id.0.clone(),
                        name: name: if d.name.is_empty() { "Display".to_string() } else { d.name },,              // already a String
                        width: d.width,            // already a u32
                        height: d.height,          // already a u32
                        is_primary: false,         // pinray doesn't expose this
            });
        }
    }
    Ok(result)
}

#[tauri::command]
pub fn list_windows() -> Result<Vec<WindowInfo>, String> {
    let windows = Window::all().map_err(|e| e.to_string())?;
    Ok(windows
    .into_iter()
    .filter_map(|w| {
        let id = w.id().ok()?;
        let title = w.title().unwrap_or_default();
        // Skip windows with empty titles — they're typically hidden
        // system windows and not useful to the user.
        if title.trim().is_empty() {
            return None;
        }
        Some(WindowInfo {
            id,
            title,
            app_name: w.app_name().unwrap_or_default(),
             width: w.width().unwrap_or(0),
             height: w.height().unwrap_or(0),
             is_minimized: w.is_minimized().unwrap_or(false),
        })
    })
    .collect())
}

// ---------------------------------------------------------------------------
// Stream state — one active stream at a time
// ---------------------------------------------------------------------------

pub struct CaptureState {
    pub stop_flag: Arc<AtomicBool>,
}

impl CaptureState {
    pub fn new() -> Self {
        Self { stop_flag: Arc::new(AtomicBool::new(false)) }
    }
}

// ---------------------------------------------------------------------------
// Start stream
// ---------------------------------------------------------------------------

/// `source` is "monitor" or "window"; `id` is the monitor or window id from
/// `list_monitors` / `list_windows`.
///
/// Frames are JPEG-encoded at `quality` (1-100) before being sent. This
/// reduces the IPC payload from ~8 MB (1080p RGBA) to ~150-400 KB per
/// frame, which is what makes interactive framerates possible.
#[tauri::command]
pub async fn start_xcap_stream(
    state: State<'_, CaptureState>,
    on_frame: Channel<InvokeResponseBody>,
    source: String,
    id: u32,
    fps: u64,
    quality: u8,
) -> Result<(), String> {
    // Reset the stop flag from any prior stream.
    state.stop_flag.store(false, Ordering::SeqCst);
    let stop = state.stop_flag.clone();

    // Resolve the capture target once, outside the loop.
    // `Monitor` and `Window` are not Send across await points in some
    // xcap versions; re-resolve each iteration if the compiler complains.
    let source_kind = source.clone();
    let q = quality.clamp(1, 100);

    tauri::async_runtime::spawn(async move {
        let frame_duration = Duration::from_millis(1000 / fps.max(1));
        let mut jpeg_buf: Vec<u8> = Vec::with_capacity(256 * 1024);

        loop {
            if stop.load(Ordering::SeqCst) {
                eprintln!("[XCAP] stop requested, exiting loop");
                break;
            }

            // Capture one frame as RgbaImage.
            let captured: Result<RgbaImage, String> = match source_kind.as_str() {
                "monitor" => Monitor::all()
                .map_err(|e| e.to_string())
                .and_then(|all| {
                    all.into_iter()
                    .find(|m| m.id().ok() == Some(id))
                    .ok_or_else(|| format!("monitor {} not found", id))
                })
                .and_then(|m| m.capture_image().map_err(|e| e.to_string())),
                                "window" => Window::all()
                                .map_err(|e| e.to_string())
                                .and_then(|all| {
                                    all.into_iter()
                                    .find(|w| w.id().ok() == Some(id))
                                    .ok_or_else(|| format!("window {} not found", id))
                                })
                                .and_then(|w| w.capture_image().map_err(|e| e.to_string())),
                                other => Err(format!("unknown source: {}", other)),
            };

            match captured {
                Ok(image) => {
                    // Encode to JPEG in-place into a reusable buffer.
                    jpeg_buf.clear();
                    {
                        let mut cursor = Cursor::new(&mut jpeg_buf);
                        if let Err(e) = encode_jpeg(&image, &mut cursor, q) {
                            eprintln!("[XCAP] jpeg encode error: {}", e);
                            break;
                        }
                    }

                    // Send the compressed frame. Frontend receives
                    // ArrayBuffer of JPEG bytes and renders via <img>.
                    if on_frame
                        .send(InvokeResponseBody::Raw(std::mem::take(&mut jpeg_buf)))
                        .is_err()
                        {
                            eprintln!("[XCAP] channel closed by frontend");
                            break;
                        }
                }
                Err(e) => {
                    eprintln!("[XCAP] capture error: {}", e);
                    break;
                }
            }

            tokio::time::sleep(frame_duration).await;
        }

        eprintln!("[XCAP] stream loop exited");
    });

    Ok(())
}

fn encode_jpeg(image: &RgbaImage, out: &mut Cursor<&mut Vec<u8>>, quality: u8) -> image::ImageResult<()> {
    // image crate's JPEG encoder takes quality 1-100.
    let mut encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(out, quality);
    encoder.encode_image(image)
}

// ---------------------------------------------------------------------------
// Stop stream
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn stop_xcap_stream(state: State<'_, CaptureState>) -> Result<(), String> {
    state.stop_flag.store(true, Ordering::SeqCst);
    Ok(())
}
