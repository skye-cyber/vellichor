package com.skye.vellichor
import androidx.activity.enableEdgeToEdge
import android.app.Activity
import android.content.Intent
import android.content.Context
import android.media.projection.MediaProjectionManager
import android.os.Bundle
import android.util.Log

class MainActivity : TauriActivity() {
  companion object {
    private const val TAG = "MainActivity"
    private const val REQ_SCREEN_CAPTURE = 1001
    
    // Cached Activity instance, set in onCreate.
    var instance: MainActivity? = null
    private set
    
    @JvmStatic
    fun requestScreenCapture() {
      val activity = instance ?: run {
        Log.e(TAG, "requestScreenCapture: MainActivity.instance is null")
        return
      }
      Log.d(TAG, "Screen capture consent requested")
      val manager = activity.getSystemService(MediaProjectionManager::class.java)
      val intent = manager.createScreenCaptureIntent()
      activity.startActivityForResult(intent, REQ_SCREEN_CAPTURE)
    }
  }
  
  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
    instance = this
  }
  
  override fun onDestroy() {
    if (instance === this) instance = null
      super.onDestroy()
  }
  
  override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
    Log.d(TAG, "onActivityResult req=$requestCode result=$resultCode data=${data != null}")
    super.onActivityResult(requestCode, resultCode, data)
    if (requestCode == REQ_SCREEN_CAPTURE) {
      if (resultCode == Activity.RESULT_OK && data != null) {
        Log.d(TAG, "Consent granted")
        val serviceIntent = Intent(this, ScreenCaptureService::class.java).apply {
          putExtra("resultCode", resultCode)
          putExtra("data", data)
        }
        startForegroundService(serviceIntent)
      } else {
        Log.w(TAG, "Consent denied or cancelled")
      }
    }
  }
}