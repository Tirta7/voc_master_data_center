package com.voc.fulldisplay

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.view.WindowManager
import android.webkit.*
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import android.net.http.SslError
import android.webkit.SslErrorHandler
import android.animation.ObjectAnimator
import android.view.animation.DecelerateInterpolator
import android.widget.ImageView
import android.widget.TextView
import com.google.android.material.card.MaterialCardView
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.speech.tts.TextToSpeech
import java.util.Locale

class MainActivity : AppCompatActivity() {

    /**
     * Interface ini di-inject ke JavaScript sebagai window.AndroidBridge
     * Fungsi: Memberi tahu frontend bahwa dia berjalan di dalam WebView native,
     * sehingga frontend bisa bypass pengecekan HTTPS untuk akses kamera.
     */
    inner class WebAppInterface {
        @JavascriptInterface
        fun isNativeApp(): Boolean = true

        @JavascriptInterface
        fun getPlatform(): String = "android-webview"

        /**
         * Mengizinkan frontend memanggil notifikasi premium langsung dari JS
         * Contoh dari JS: window.AndroidBridge.showNotification("Orderan Masuk", "Meja 4 memesan...", "order")
         */
        @JavascriptInterface
        fun showNotification(title: String, message: String, type: String) {
            runOnUiThread {
                showPremiumNotificationBanner(title, message, type)
            }
        }

        @JavascriptInterface
        fun speakText(text: String, isDanger: Boolean) {
            val pitch = if (isDanger) 1.4f else 1.1f
            val rate = if (isDanger) 1.1f else 0.9f
            tts?.setPitch(pitch)
            tts?.setSpeechRate(rate)
            tts?.speak(text, TextToSpeech.QUEUE_ADD, null, null)
        }

        @JavascriptInterface
        fun stopSpeech() {
            tts?.stop()
        }
    }

    private lateinit var webView: WebView
    private var tapCount = 0
    private var lastTapTime: Long = 0
    private var tts: TextToSpeech? = null

    // Launcher untuk mendeteksi hasil dari halaman pengaturan
    private val settingsLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            loadSavedUrl()
        }
    }

    // Peminta Izin Kamera Runtime Android
    private val requestCameraPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            loadSavedUrl()
        } else {
            Toast.makeText(this, getString(R.string.camera_permission_denied), Toast.LENGTH_LONG).show()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // Initialize Native TTS
        tts = TextToSpeech(this) { status ->
            if (status == TextToSpeech.SUCCESS) {
                tts?.language = Locale("id", "ID")
            }
        }

        // 1. Keep Screen Awake (Mencegah Layar Mati Selama Operasional CFD / Waiter)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        // 1b. Pastikan konten memenuhi seluruh layar termasuk area notch/cutout
        window.addFlags(WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS)
        window.addFlags(WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN)

        // 2. Terapkan Kiosk Immersive Fullscreen Mode
        enableKioskMode()

        webView = findViewById(R.id.webView)
        val settingsTrigger = findViewById<View>(R.id.settingsTrigger)

        // 3. Optimasi Kinerja Tinggi & Pengaturan WebView
        setupWebView()

        // 4. Deteksi Izin Kamera Runtime
        checkAndRequestPermissions()

        // 5. Anti-Tamper Hidden Settings Trigger (Diketuk 5x Cepat pada sudut kanan atas)
        settingsTrigger.setOnClickListener {
            val currentTime = System.currentTimeMillis()
            if (currentTime - lastTapTime < 2000) { // Rentang waktu ketukan beruntun max 2 detik
                tapCount++
                if (tapCount >= 5) {
                    tapCount = 0
                    val intent = Intent(this, SettingsActivity::class.java)
                    settingsLauncher.launch(intent)
                }
            } else {
                tapCount = 1 // Reset ketukan jika sudah terlalu lama
            }
            lastTapTime = currentTime
        }
    }

    private fun setupWebView() {
        val settings = webView.settings
        
        // Mengaktifkan JavaScript & DOM Storage (Krusial untuk SPA Next.js/Vite)
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        
        // Aktifkan dukungan zoom (diperlukan untuk initialScale)
        // Zoom controls disembunyikan agar UX tetap bersih seperti aplikasi native
        settings.setSupportZoom(true)
        settings.builtInZoomControls = true
        settings.displayZoomControls = false

        // Memperbolehkan akses file media & autoplay
        settings.allowFileAccess = true
        settings.mediaPlaybackRequiresUserGesture = false

        // Mixed content & Geolocation
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        }

        // Klien WebView Utama
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                return false // Jaga navigasi tetap di dalam WebView aplikasi VFD
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                super.onReceivedError(view, request, error)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    if (request?.isForMainFrame == true) {
                        Toast.makeText(
                            this@MainActivity,
                            "Gagal terhubung ke Server: ${error?.description}",
                            Toast.LENGTH_LONG
                        ).show()
                    }
                }
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                // ═══════════════════════════════════════════════════════════
                // JITU CAMERA FIX: Inject script setelah halaman dimuat
                // Tujuan: Override window.isSecureContext = true agar
                // navigator.mediaDevices & getUserMedia tersedia di HTTP lokal
                // ═══════════════════════════════════════════════════════════
                val cameraBypassScript = """
                    (function() {
                        try {
                            // [1] Override isSecureContext agar mediaDevices tersedia di HTTP
                            Object.defineProperty(window, 'isSecureContext', {
                                get: function() { return true; },
                                configurable: true
                            });

                            // [2] Pastikan window.AndroidBridge tersedia sebagai fallback
                            if (typeof window.AndroidBridge === 'undefined') {
                                window.AndroidBridge = {
                                    isNativeApp: function() { return true; },
                                    getPlatform: function() { return 'android-webview'; }
                                };
                            }

                            console.log('[VFD] Camera bypass script injected successfully');
                        } catch(e) {
                            console.warn('[VFD] Camera bypass failed:', e);
                        }
                    })();
                """.trimIndent()

                view?.evaluateJavascript(cameraBypassScript, null)
            }

            override fun onReceivedSslError(
                view: WebView?,
                handler: SslErrorHandler?,
                error: SslError?
            ) {
                // KRUSIAL: Mengizinkan bypass SSL lokal agar bisa menggunakan HTTPS
                // sehingga Secure Context (Camera WebRTC) berfungsi sepenuhnya!
                handler?.proceed()
            }
        }

        // Klien WebChrome: Bypass Keamanan WebRTC over HTTP Lokal
        webView.webChromeClient = object : WebChromeClient() {
            // [1] Izinkan akses kamera & mikrofon dari WebView (bypass HTTPS requirement)
            override fun onPermissionRequest(request: PermissionRequest) {
                runOnUiThread {
                    request.grant(request.resources)
                }
            }

            // [2] Izinkan geolocation jika diperlukan frontend
            override fun onGeolocationPermissionsShowPrompt(
                origin: String?,
                callback: GeolocationPermissions.Callback?
            ) {
                callback?.invoke(origin, true, false)
            }
        }

        // [3] Daftarkan bridge ke JS: window.AndroidBridge.isNativeApp() => true
        webView.addJavascriptInterface(WebAppInterface(), "AndroidBridge")

        // [4] KAMERA FIX JITU: Inject SEBELUM page JS apapun berjalan
        // WebViewCompat.addDocumentStartJavaScript menjamin eksekusi sebelum React/Next.js
        // sehingga navigator.mediaDevices tersedia saat komponen QRScanner di-mount
        val cameraEarlyScript = """
            (function() {
                // Patch 1: Override isSecureContext = true
                // Tanpa ini, Chromium menyembunyikan navigator.mediaDevices di HTTP
                try {
                    Object.defineProperty(window, 'isSecureContext', {
                        get: function() { return true; },
                        configurable: true
                    });
                } catch(e) {}

                // Patch 2: Jika mediaDevices belum ada, buat polyfill minimal
                // agar frontend tidak throw error saat cek null/undefined
                if (!navigator.mediaDevices) {
                    Object.defineProperty(navigator, 'mediaDevices', {
                        get: function() {
                            return {
                                getUserMedia: function(constraints) {
                                    if (navigator.getUserMedia) {
                                        return new Promise(function(resolve, reject) {
                                            navigator.getUserMedia(constraints, resolve, reject);
                                        });
                                    }
                                    return Promise.reject(new Error('getUserMedia not available'));
                                },
                                enumerateDevices: function() {
                                    return Promise.resolve([]);
                                }
                            };
                        },
                        configurable: true
                    });
                }

                // Patch 3: AndroidBridge fallback jika addJavascriptInterface belum siap
                if (!window.AndroidBridge) {
                    window.AndroidBridge = {
                        isNativeApp: function() { return true; },
                        getPlatform: function() { return 'android-webview'; }
                    };
                }
            })();
        """.trimIndent()

        if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
            WebViewCompat.addDocumentStartJavaScript(webView, cameraEarlyScript, setOf("*"))
        }
    }

    private fun loadSavedUrl() {
        val sharedPref = getSharedPreferences("VFD_PREFS", Context.MODE_PRIVATE)
        val url = sharedPref.getString("SERVER_URL", "http://192.168.1.19:3000") ?: "http://192.168.1.19:3000"
        val zoomScale = sharedPref.getInt("ZOOM_SCALE", 100)

        // Terapkan zoom scale awal (100 = normal, 75 = zoom out, 150 = zoom in)
        webView.setInitialScale(zoomScale)
        webView.loadUrl(url)
    }

    private fun checkAndRequestPermissions() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            requestCameraPermissionLauncher.launch(Manifest.permission.CAMERA)
        } else {
            loadSavedUrl()
        }
    }

    private fun enableKioskMode() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            // Android 11+: gunakan WindowInsetsController modern
            window.setDecorFitsSystemWindows(false)
            window.insetsController?.let { controller ->
                controller.hide(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
                controller.systemBarsBehavior = WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            }
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = (
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_FULLSCREEN
            )
        }

        // Android P (9) ke atas: Paksa konten masuk ke area notch/cutout
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            val lp = window.attributes
            lp.layoutInDisplayCutoutMode =
                android.view.WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
            window.attributes = lp
        }
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        // Memastikan status bar tidak muncul kembali saat layar difokuskan ulang
        if (hasFocus) {
            enableKioskMode()
        }
    }

    override fun onDestroy() {
        tts?.stop()
        tts?.shutdown()
        super.onDestroy()
    }

    override fun onBackPressed() {
        // Blokir tombol Back bawaan handphone agar kasir/waiter tidak keluar secara tidak sengaja
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            // Abaikan agar tetap terkunci di mode Kiosk
            Toast.makeText(this, "Gunakan area tersembunyi admin untuk keluar/setelan.", Toast.LENGTH_SHORT).show()
        }
    }

    /**
     * Menampilkan banner notifikasi melayang (Slide Down) premium dengan style dinamis.
     * @param type: "order" (Orderan baru), "license" (Lisensi/peringatan), atau "success"
     */
    private fun showPremiumNotificationBanner(title: String, message: String, type: String) {
        val notificationCard = findViewById<MaterialCardView>(R.id.notificationCard) ?: return
        val notificationIcon = findViewById<ImageView>(R.id.notificationIcon)
        val notificationTitle = findViewById<TextView>(R.id.notificationTitle)
        val notificationMessage = findViewById<TextView>(R.id.notificationMessage)

        // Set konten
        notificationTitle.text = title
        notificationMessage.text = message

        // Desain warna dinamis & ikon premium berdasarkan jenis
        val bgDrawable = GradientDrawable()
        bgDrawable.shape = GradientDrawable.OVAL

        when (type.lowercase()) {
            "license", "warning" -> {
                // Tema Kuning/Orange (Peringatan Lisensi)
                notificationCard.setStrokeColor(Color.parseColor("#F59E0B")) // Amber border
                bgDrawable.setColor(Color.parseColor("#78350F")) // Amber background untuk icon
                notificationIcon.setImageResource(android.R.drawable.stat_sys_warning)
            }
            "success" -> {
                // Tema Hijau (Sukses)
                notificationCard.setStrokeColor(Color.parseColor("#10B981")) // Emerald border
                bgDrawable.setColor(Color.parseColor("#064E3B")) // Emerald background untuk icon
                notificationIcon.setImageResource(android.R.drawable.checkbox_on_background)
            }
            else -> {
                // Tema Ungu/Indigo (Order Baru - Default)
                notificationCard.setStrokeColor(Color.parseColor("#4F46E5")) // Indigo border
                bgDrawable.setColor(Color.parseColor("#312E81")) // Indigo background untuk icon
                notificationIcon.setImageResource(android.R.drawable.ic_dialog_info)
            }
        }

        notificationIcon.background = bgDrawable

        // Reset state & jadikan terlihat
        notificationCard.visibility = View.VISIBLE
        notificationCard.translationY = -300f // Mulai dari atas layar

        // Animasi Slide Down (Masuk)
        ObjectAnimator.ofFloat(notificationCard, "translationY", 0f).apply {
            duration = 500
            interpolator = DecelerateInterpolator()
            start()
        }

        // Animasi Slide Up (Keluar) setelah 5 detik
        notificationCard.postDelayed({
            ObjectAnimator.ofFloat(notificationCard, "translationY", -300f).apply {
                duration = 500
                interpolator = DecelerateInterpolator()
                start()
            }
        }, 5000)
    }
}
