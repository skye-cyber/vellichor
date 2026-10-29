use std::io::Cursor;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use image::RgbaImage;
use pinray::{CaptureEvent, CaptureSession, SourceId, VideoCaptureTarget};
use tauri::ipc::{Channel, InvokeResponseBody}; // kept for compat where needed
use tauri::http::Response;
use tauri::{AppHandle, Manager, State, UriSchemeContext};
#[cfg(target_os = "android")]
use jni::jni_str;
#[cfg(target_os = "android")]
use jni::jni_sig;
#[cfg(target_os = "android")]
use jni::objects::ReleaseMode;
#[cfg(target_os = "android")]
use std::sync::OnceLock;

// ---------------------------------------------------------------------------
// Frame sink: one shared slot for the latest JPEG frame.
// Both the stream:// handler and the fan-out task read from this.
// ---------------------------------------------------------------------------

#[derive(Default)]
pub struct FrameSink {
    pub latest: Mutex<Option<Vec<u8>>>,
    pub dimensions: Mutex<(u32, u32)>,
    pub counter: AtomicU64,
}
#[cfg(target_os = "android")]
pub static ANDROID_FRAME_SINK: OnceLock<Arc<FrameSink>> = OnceLock::new();

impl FrameSink {
    pub fn publish(&self, jpeg: Vec<u8>, width: u32, height: u32) {
        *self.latest.lock().unwrap() = Some(jpeg);
        *self.dimensions.lock().unwrap() = (width, height);
        self.counter.fetch_add(1, Ordering::SeqCst);
    }

    pub fn read(&self) -> Option<(Vec<u8>, u32, u32)> {
        let jpeg = self.latest.lock().unwrap().clone()?;
        let (w, h) = *self.dimensions.lock().unwrap();
        Some((jpeg, w, h))
    }

    pub fn clear(&self) {
        *self.latest.lock().unwrap() = None;
        self.counter.fetch_add(1, Ordering::SeqCst);
    }
}

pub struct CaptureState {
    pub stop_flag: Arc<AtomicBool>,
    pub frame_sink: Arc<FrameSink>,
    pub active: Arc<AtomicBool>,
}

impl CaptureState {
    pub fn new() -> Self {
        Self {
            stop_flag: Arc::new(AtomicBool::new(false)),
            frame_sink: Arc::new(FrameSink::default()),
            active: Arc::new(AtomicBool::new(false)),
        }
    }
}

// ---------------------------------------------------------------------------
// Source discovery
// ---------------------------------------------------------------------------

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MonitorInfo {
    pub id: String,
    pub name: String,
    pub width: u32,
    pub height: u32,
    pub is_primary: bool,
}

#[tauri::command]
pub fn list_monitors() -> Result<Vec<MonitorInfo>, String> {
    let sources = pinray::enumerate_sources().map_err(|e| e.to_string())?;
    let mut result = Vec::new();
    for source in sources {
        if let pinray::CaptureSource::Display(d) = source {
            result.push(MonitorInfo {
                id: d.id.0.clone(),
                        name: d.name,
                        width: d.width,
                        height: d.height,
                        is_primary: false,
            });
        }
    }
    Ok(result)
}

// ---------------------------------------------------------------------------
// Capture loop
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn start_screen_stream(
    state: State<'_, CaptureState>,
    id: String,
    fps: u64,
    quality: u8,
) -> Result<(), String> {
    if state.active.swap(true, Ordering::SeqCst) {
        return Err("a capture session is already active".into());
    }

    state.stop_flag.store(false, Ordering::SeqCst);
    state.frame_sink.clear();

    let stop = state.stop_flag.clone();
    let sink = state.frame_sink.clone();
    let active = state.active.clone();
    let q = quality.clamp(1, 100);
    let fps_cap = fps.max(1);

    tauri::async_runtime::spawn(async move {
        let target = if id == "auto" {
            VideoCaptureTarget::Display(SourceId::new("auto"))
        } else {
            VideoCaptureTarget::Display(SourceId::new(&id))
        };

        let mut session = match CaptureSession::builder().video_target(target).build() {
            Ok(s) => s,
                                Err(e) => {
                                    eprintln!("[STREAM] build failed: {}", e);
                                    active.store(false, Ordering::SeqCst);
                                    return;
                                }
        };

        if let Err(e) = session.start() {
            eprintln!("[STREAM] start failed: {}", e);
            active.store(false, Ordering::SeqCst);
            return;
        }

        let frame_interval = Duration::from_millis(1000 / fps_cap);
        let mut jpeg_buf: Vec<u8> = Vec::with_capacity(256 * 1024);

        loop {
            if stop.load(Ordering::SeqCst) {
                break;
            }

            // 2s timeout to absorb Wayland's sparse-frame behaviour.
            match session.next_event(Some(Duration::from_millis(15000))) {
                Ok(CaptureEvent::Video(frame)) => {
                    let raw_bytes = match &frame.data {
                        pinray::FrameData::Host(bytes) => bytes.clone(),
                                _ => continue,
                    };

                    // BGRA -> RGBA swizzle
                    let mut rgba = Vec::with_capacity(raw_bytes.len());
                    for chunk in raw_bytes.chunks_exact(4) {
                        rgba.push(chunk[2]);
                        rgba.push(chunk[1]);
                        rgba.push(chunk[0]);
                        rgba.push(chunk[3]);
                    }

                    let img = match RgbaImage::from_raw(frame.width, frame.height, rgba) {
                        Some(i) => i,
                                None => continue,
                    };

                    jpeg_buf.clear();
                    {
                        let mut cursor = Cursor::new(&mut jpeg_buf);
                        if encode_jpeg(&img, &mut cursor, q).is_err() {
                            break;
                        }
                    }

                    sink.publish(jpeg_buf.clone(), frame.width, frame.height);

                    std::thread::sleep(frame_interval);
                }
                Ok(CaptureEvent::Gap(gap)) => {
                    eprintln!("[STREAM] frame gap: {:?}", gap);
                }
                Ok(_) => {}
                Err(e) => {
                    eprintln!("[STREAM] capture error: {}", e);
                    break;
                }
            }
        }

        let _ = session.stop();
        active.store(false, Ordering::SeqCst);
        eprintln!("[STREAM] capture loop exited");
    });

    Ok(())
}

fn encode_jpeg(image: &RgbaImage, out: &mut Cursor<&mut Vec<u8>>, quality: u8) -> image::ImageResult<()> {
    let mut encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(out, quality);
    encoder.encode_image(image)
}

#[tauri::command]
pub fn stop_screen_stream(state: State<'_, CaptureState>) -> Result<(), String> {
    state.stop_flag.store(true, Ordering::SeqCst);
    state.frame_sink.clear();
    Ok(())
}

// ---------------------------------------------------------------------------
// stream:// protocol handler
// Registers as stream://localhost/frame.jpg on Linux/Windows and
// http://stream.localhost/frame.jpg on Android (Wry rewrites both directions).
// ---------------------------------------------------------------------------

pub fn stream_uri_handler<R: tauri::Runtime>(
    ctx: UriSchemeContext<'_, R>,
) -> Response<Vec<u8>> {
    let app = ctx.app_handle();
    let state: State<CaptureState> = app.state();

    match state.frame_sink.read() {
        Some((jpeg, _w, _h)) => Response::builder()
        .header("Content-Type", "image/jpeg")
        .header("Cache-Control", "no-store, max-age=0")
        .body(jpeg)
        .unwrap(),
        None => Response::builder()
        .status(204)
        .header("Cache-Control", "no-store")
        .body(Vec::new())
        .unwrap(),
    }
}

// ---------------------------------------------------------------------------
// Frame metadata query (optional but useful for canvas sizing)
// ---------------------------------------------------------------------------

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FrameMeta {
    pub counter: u64,
    pub width: u32,
    pub height: u32,
    pub active: bool,
}

#[tauri::command]
pub fn get_frame_meta(state: State<'_, CaptureState>) -> FrameMeta {
    let (w, h) = *state.frame_sink.dimensions.lock().unwrap();
    FrameMeta {
        counter: state.frame_sink.counter.load(Ordering::SeqCst),
        width: w,
        height: h,
        active: state.active.load(Ordering::SeqCst),
    }
}

// Android streaming
#[cfg(target_os = "android")]
#[unsafe(no_mangle)]
pub extern "system" fn Java_com_skye_vellichor_ScreenCaptureService_nativePushFrame<'caller>(
    mut unowned_env: jni::EnvUnowned<'caller>,
    _class: jni::objects::JClass<'caller>,
    jpeg_bytes: jni::objects::JByteArray<'caller>,
    width: jni::sys::jint,
    height: jni::sys::jint,
) {
    unowned_env
    .with_env(|env| -> jni::errors::Result<()> {
        // Get length via the array's len() method (jni 0.22)
        let len = jpeg_bytes.len(env)? as usize;

        // Acquire elements as AutoElements. CopyBack is the default;
        // NoCopyBack is fine here since we only read.
        let elements = unsafe {
            env.get_array_elements(&jpeg_bytes, ReleaseMode::NoCopyBack)?
        };

        // Deref to &[i8], then map to Vec<u8>
        let bytes: Vec<u8> = elements.iter().map(|&b| b as u8).collect();

        if let Some(sink) = crate::screen_capture::ANDROID_FRAME_SINK.get() {
            sink.publish(bytes, width as u32, height as u32);
            eprintln!(
                "[JNI] published frame counter={}",
                sink.counter.load(std::sync::atomic::Ordering::SeqCst)
            );
        } else {
            eprintln!("[JNI] ANDROID_FRAME_SINK not initialized — dropping frame");
        }
        Ok(())
    })
    .resolve::<jni::errors::ThrowRuntimeExAndDefault>();
}

#[cfg(target_os = "android")]
#[tauri::command]
pub fn start_android_screen_stream(state: State<'_, CaptureState>) -> Result<(), String> {
    state.stop_flag.store(false, Ordering::SeqCst);
    state.frame_sink.clear();
    state.active.store(true, Ordering::SeqCst);

    let ctx = ndk_context::android_context();
    let vm = unsafe { jni::JavaVM::from_raw(ctx.vm().cast()) };

    vm.attach_current_thread(|env| -> jni::errors::Result<()> {
        let activity = unsafe { jni::objects::JObject::from_raw(env, ctx.context().cast()) };
        let class = env.find_class(jni_str!("com/skye/vellichor/MainActivity"))?;
        env.call_static_method(
            class,
            jni_str!("requestScreenCapture"),
                               jni_sig!("()V"),                          // no parameters
                               &[],
        )?;
        Ok(())
    }).map_err(|e| e.to_string())?;

    Ok(())
}
