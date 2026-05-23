package com.antygraviti.tvclient

import android.animation.ObjectAnimator
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.net.ConnectivityManager
import android.net.wifi.WifiManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.WindowManager
import android.widget.TextView
import androidx.core.app.NotificationCompat
import java.net.NetworkInterface
import java.util.Collections

class OverlayService : Service() {

    private lateinit var windowManager: WindowManager
    
    // Separate view references to avoid conflicts
    private var lockView: View? = null
    private var toastView: View? = null
    private var wakeupView: View? = null

    private val handler = Handler(Looper.getMainLooper())
    
    private var wakeLock: PowerManager.WakeLock? = null
    private var wifiLock: WifiManager.WifiLock? = null
    
    private val dismissToastRunnable = Runnable {
        animateOut(toastView) { removeToastView() }
    }
    
    private val dismissWakeupRunnable = Runnable {
        animateOut(wakeupView) { removeWakeupView() }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        
        // Run as a Foreground Service to prevent suspend/kill in Doze Mode
        startForegroundService()

        // Keep CPU awake
        try {
            val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
            wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "TVClient::WakeLock").apply {
                acquire()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }

        // Keep Wi-Fi awake & in high performance mode
        try {
            val wifiManager = applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
            wifiLock = wifiManager.createWifiLock(WifiManager.WIFI_MODE_FULL_HIGH_PERF, "TVClient::WifiLock").apply {
                acquire()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun startForegroundService() {
        val channelId = "tv_client_overlay_channel"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "TV Client Background Service",
                NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }

        val notification = NotificationCompat.Builder(this, channelId)
            .setContentTitle("TV Client Aktif")
            .setContentText("Menerima pesan billing PlayStation")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()

        startForeground(1, notification)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val command = intent?.getStringExtra("COMMAND")
        val message = intent?.getStringExtra("MESSAGE")
        val title = intent?.getStringExtra("TITLE")
        val duration = intent?.getStringExtra("DURATION")

        when (command) {
            "TEXT" -> showToastOverlay(message ?: "")
            "SLEEP" -> {
                val invoiceNumber = intent.getStringExtra("INVOICE_NUMBER") ?: ""
                val customerName = intent.getStringExtra("CUSTOMER_NAME") ?: ""
                val tableName = intent.getStringExtra("TABLE_NAME") ?: ""
                val playDuration = intent.getStringExtra("PLAY_DURATION") ?: ""
                val billiardTotal = intent.getStringExtra("BILLIARD_TOTAL") ?: ""
                val cafeTotal = intent.getStringExtra("CAFE_TOTAL") ?: ""
                val grandTotal = intent.getStringExtra("GRAND_TOTAL") ?: ""
                val orders = intent.getStringExtra("ORDERS") ?: ""
                showLockOverlay(invoiceNumber, customerName, tableName, playDuration, billiardTotal, cafeTotal, grandTotal, orders)
            }
            "WAKEUP" -> handleWakeup(title, duration)
        }

        return START_STICKY
    }

    /**
     * KIOSK MODE FULLSCREEN — True kiosk overlay that covers EVERYTHING.
     *
     * The trick to cover the Android status bar with TYPE_APPLICATION_OVERLAY:
     * 1. FLAG_LAYOUT_NO_LIMITS allows the window to exceed the screen bounds
     * 2. We set height to screenHeight + 300px (covers status bar + nav bar + notch)
     * 3. We set Y offset to -(statusBarHeight + extra) to shift UP into the status bar
     * 4. FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS + OPAQUE pixel format = solid black behind bars
     * This is the same technique used by banking/kiosk apps on Android.
     */
    @Suppress("DEPRECATION")
    private fun buildFullscreenParams(): WindowManager.LayoutParams {
        val displayMetrics = resources.displayMetrics
        val screenWidth  = displayMetrics.widthPixels
        val screenHeight = displayMetrics.heightPixels

        // Extra pixels to bleed beyond both edges (covers notch, rounded corners, etc.)
        val bleed = (200 * displayMetrics.density).toInt()

        val flags = (
                  WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
                or WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS
                or WindowManager.LayoutParams.FLAG_FULLSCREEN
                or WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS
                or WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS
                or WindowManager.LayoutParams.FLAG_TRANSLUCENT_NAVIGATION
                or WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
        )

        val params = WindowManager.LayoutParams(
            screenWidth  + bleed,         // wider than screen → no side gaps
            screenHeight + bleed,         // taller than screen → covers status + nav bar
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            flags,
            PixelFormat.OPAQUE
        )
        params.gravity = Gravity.TOP or Gravity.START
        // Shift UP and LEFT by half-bleed so overflow is equal on all sides
        params.x = -(bleed / 2)
        params.y = -(bleed / 2)
        return params
    }

    /**
     * Build LayoutParams for floating notification banners (Toast / Wakeup).
     * These sit at the TOP CENTER, below the status bar.
     */
    private fun buildFloatingParams(): WindowManager.LayoutParams {
        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                    or WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
                    or WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        )
        params.gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
        params.y = 40 // Below status bar ~40dp from top
        return params
    }

    private fun animateIn(view: View) {
        view.alpha = 0f
        ObjectAnimator.ofFloat(view, "alpha", 0f, 1f).apply {
            duration = 250
            start()
        }
    }

    private fun animateOut(view: View?, onEnd: () -> Unit) {
        if (view == null) { onEnd(); return }
        ObjectAnimator.ofFloat(view, "alpha", 1f, 0f).apply {
            duration = 200
            addListener(object : android.animation.AnimatorListenerAdapter() {
                override fun onAnimationEnd(animation: android.animation.Animator) {
                    onEnd()
                }
            })
            start()
        }
    }

    private fun showToastOverlay(message: String) {
        removeToastView()
        handler.removeCallbacks(dismissToastRunnable)

        try {
            val inflater = LayoutInflater.from(this)
            val view = inflater.inflate(R.layout.toast_overlay, null)

            val tvMsg   = view.findViewById<TextView>(R.id.tvToastMessage)
            val tvLabel = view.findViewById<TextView>(R.id.tvToastLabel)
            val tvIcon  = view.findViewById<TextView>(R.id.toastIcon)
            val iconBg  = view.findViewById<android.widget.FrameLayout>(R.id.toastIconContainer)
            val btnClose = view.findViewById<TextView>(R.id.toastClose)
            
            btnClose?.setOnClickListener {
                removeToastView()
                handler.removeCallbacks(dismissToastRunnable)
            }

            val root = view.findViewById<View>(R.id.toastRoot)
            
            if (root != null) {
                // Skala 1.0f konstan untuk semua orientasi agar ukuran selalu proporsional dan tidak terpotong
                root.scaleX = 1.0f
                root.scaleY = 1.0f
            }

            // Determine urgency from message content
            val msgLower = message.lowercase()
            val isUrgent = msgLower.contains("🚨") || msgLower.contains("1 menit") || msgLower.contains("hampir habis")
            val isWarning = msgLower.contains("⏰") || msgLower.contains("⚠️") || msgLower.contains("menit") || msgLower.contains("habis")

            when {
                isUrgent -> {
                    iconBg.backgroundTintList = android.content.res.ColorStateList.valueOf(android.graphics.Color.parseColor("#EF4444"))
                    tvIcon.text = "✕"
                    tvIcon.setTextColor(android.graphics.Color.WHITE)
                    tvLabel.text = "WAKTU HAMPIR HABIS!"
                    tvLabel.setTextColor(android.graphics.Color.parseColor("#EF4444"))
                    tvLabel.visibility = View.VISIBLE
                }
                isWarning -> {
                    iconBg.backgroundTintList = android.content.res.ColorStateList.valueOf(android.graphics.Color.parseColor("#F59E0B"))
                    tvIcon.text = "!"
                    tvIcon.setTextColor(android.graphics.Color.WHITE)
                    tvLabel.text = "PERINGATAN WAKTU"
                    tvLabel.setTextColor(android.graphics.Color.parseColor("#F59E0B"))
                    tvLabel.visibility = View.VISIBLE
                }
                else -> {
                    iconBg.backgroundTintList = android.content.res.ColorStateList.valueOf(android.graphics.Color.WHITE)
                    tvIcon.text = "✓"
                    tvIcon.setTextColor(android.graphics.Color.parseColor("#10B981"))
                    tvLabel.visibility = View.GONE // Hilangkan label kasir agar lebih minimalis (seperti gambar 3)
                }
            }

            tvMsg.text = message

            toastView = view
            // Tampilkan di TENGAH layar (bukan atas) untuk pesan kritis
            val params = if (isUrgent) buildCenterFloatingParams() else buildFloatingParams()
            windowManager.addView(toastView, params)
            animateIn(view)

            // Urgent: tampil 12 detik, Warning: 10 detik, biasa: 8 detik
            val duration = when {
                isUrgent  -> 12000L
                isWarning -> 10000L
                else      ->  8000L
            }
            handler.postDelayed(dismissToastRunnable, duration)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    /** Floating params di tengah layar (untuk pesan kritis urgent) */
    private fun buildCenterFloatingParams(): WindowManager.LayoutParams {
        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                    or WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            android.graphics.PixelFormat.TRANSLUCENT
        )
        params.gravity = android.view.Gravity.CENTER
        return params
    }


    @Suppress("DEPRECATION", "MissingPermission")
    private fun showLockOverlay(
        invoiceNumber: String = "",
        customerName: String = "",
        tableName: String = "",
        playDuration: String = "",
        billiardTotal: String = "",
        cafeTotal: String = "",
        grandTotal: String = "",
        orders: String = ""
    ) {
        removeLockView()

        try {
            val inflater = LayoutInflater.from(this)
            val view = inflater.inflate(R.layout.lock_overlay, null)

            // Force true immersive sticky fullscreen (hide status bar + nav bar)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                // Android 11+ (API 30+): WindowInsetsController approach
                view.post {
                    val controller = view.windowInsetsController
                    controller?.hide(android.view.WindowInsets.Type.statusBars() or android.view.WindowInsets.Type.navigationBars())
                    controller?.systemBarsBehavior = android.view.WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                }
            } else {
                // Android 10 and below: Legacy flags
                @Suppress("DEPRECATION")
                view.systemUiVisibility = (
                    View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                    or View.SYSTEM_UI_FLAG_FULLSCREEN
                    or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                    or View.SYSTEM_UI_FLAG_LOW_PROFILE
                )
            }

            // Block Back button by consuming key events
            view.isFocusable = true
            view.isFocusableInTouchMode = true
            view.setOnKeyListener { _, keyCode, _ ->
                // Consume ALL key events while locked (Back, Volume, etc.)
                keyCode == android.view.KeyEvent.KEYCODE_BACK ||
                keyCode == android.view.KeyEvent.KEYCODE_HOME ||
                keyCode == android.view.KeyEvent.KEYCODE_VOLUME_UP ||
                keyCode == android.view.KeyEvent.KEYCODE_VOLUME_DOWN
            }
            view.requestFocus()

            val displayMetrics = resources.displayMetrics
            val isPortrait = displayMetrics.heightPixels > displayMetrics.widthPixels

            // 1. Constrain ScrollView to physical screen dimensions to avoid bleed clipping
            val lockScrollView = view.findViewById<android.widget.ScrollView>(R.id.lockScrollView)
            if (lockScrollView != null) {
                val scrollParams = lockScrollView.layoutParams as android.widget.FrameLayout.LayoutParams
                scrollParams.width = displayMetrics.widthPixels
                scrollParams.height = displayMetrics.heightPixels
                scrollParams.gravity = Gravity.CENTER
                lockScrollView.layoutParams = scrollParams
            }


            // 2. Adjust padding dynamically for safe margins and modern whitespace
            val innerContainer = view.findViewById<android.widget.LinearLayout>(R.id.innerContainer)
            if (innerContainer != null) {
                if (isPortrait) {
                    innerContainer.setPadding(16.dpToPx(), 24.dpToPx(), 16.dpToPx(), 24.dpToPx())
                } else {
                    innerContainer.setPadding(32.dpToPx(), 16.dpToPx(), 32.dpToPx(), 16.dpToPx())
                }
            }

            val cardLockIcon = view.findViewById<android.view.View>(R.id.cardLockIcon)
            if (cardLockIcon != null) {
                val lockParams = cardLockIcon.layoutParams
                if (isPortrait) {
                    lockParams.width = 70.dpToPx()
                    lockParams.height = 70.dpToPx()
                } else {
                    lockParams.width = 56.dpToPx()
                    lockParams.height = 56.dpToPx()
                }
                cardLockIcon.layoutParams = lockParams
            }

            val layoutLockColumns = view.findViewById<android.widget.LinearLayout>(R.id.layoutLockColumns)
            val leftPanel = view.findViewById<android.widget.LinearLayout>(R.id.leftPanel)
            val cardInvoice = view.findViewById<android.widget.LinearLayout>(R.id.cardInvoice)

            // 3. Apply responsive orientations based on screen layout
            if (layoutLockColumns != null && leftPanel != null && cardInvoice != null) {
                val colParams = layoutLockColumns.layoutParams as android.widget.LinearLayout.LayoutParams
                
                if (isPortrait) { // Stacked layout for Portrait screens
                    layoutLockColumns.orientation = android.widget.LinearLayout.VERTICAL
                    colParams.width = android.widget.LinearLayout.LayoutParams.MATCH_PARENT
                    layoutLockColumns.layoutParams = colParams
                    
                    cardInvoice.setPadding(16.dpToPx(), 16.dpToPx(), 16.dpToPx(), 16.dpToPx())
                    
                    val leftParams = leftPanel.layoutParams as android.widget.LinearLayout.LayoutParams
                    leftParams.width = android.widget.LinearLayout.LayoutParams.MATCH_PARENT
                    leftParams.height = android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                    leftParams.weight = 0f
                    leftParams.setMargins(0, 0, 0, 16.dpToPx())
                    leftPanel.layoutParams = leftParams
                    
                    val rightParams = cardInvoice.layoutParams as android.widget.LinearLayout.LayoutParams
                    rightParams.width = android.widget.LinearLayout.LayoutParams.MATCH_PARENT
                    rightParams.height = android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                    rightParams.weight = 0f
                    rightParams.setMargins(0, 0, 0, 0)
                    cardInvoice.layoutParams = rightParams
                } else { // Landscape TV / Tablet (side-by-side layout)
                    layoutLockColumns.orientation = android.widget.LinearLayout.HORIZONTAL
                    cardInvoice.setPadding(16.dpToPx(), 12.dpToPx(), 16.dpToPx(), 12.dpToPx())
                    
                    if (invoiceNumber.isEmpty()) {
                        // Center single column
                        colParams.width = 420.dpToPx()
                        layoutLockColumns.layoutParams = colParams
                        
                        val leftParams = leftPanel.layoutParams as android.widget.LinearLayout.LayoutParams
                        leftParams.width = android.widget.LinearLayout.LayoutParams.MATCH_PARENT
                        leftParams.height = android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                        leftParams.weight = 0f
                        leftParams.setMargins(0, 0, 0, 0)
                        leftPanel.layoutParams = leftParams
                    } else {
                        // Side-by-side columns
                        colParams.width = Math.min(displayMetrics.widthPixels - 64.dpToPx(), 900.dpToPx())
                        layoutLockColumns.layoutParams = colParams
                        
                        val leftParams = leftPanel.layoutParams as android.widget.LinearLayout.LayoutParams
                        leftParams.width = 0
                        leftParams.height = android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                        leftParams.weight = 1f
                        leftParams.setMargins(0, 0, 24.dpToPx(), 0)
                        leftPanel.layoutParams = leftParams
                        
                        val rightParams = cardInvoice.layoutParams as android.widget.LinearLayout.LayoutParams
                        rightParams.width = 0
                        rightParams.height = android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                        rightParams.weight = 1.25f
                        rightParams.setMargins(24.dpToPx(), 0, 0, 0)
                        cardInvoice.layoutParams = rightParams
                    }
                }
            }

            // 4. Bind Invoice Data (if available)
            if (cardInvoice != null) {
                if (invoiceNumber.isEmpty()) {
                    cardInvoice.visibility = View.GONE
                } else {
                    cardInvoice.visibility = View.VISIBLE
                    
                    val tvInvTable = view.findViewById<TextView>(R.id.tvInvTable)
                    val tvInvCustomer = view.findViewById<TextView>(R.id.tvInvCustomer)
                    val tvInvDuration = view.findViewById<TextView>(R.id.tvInvDuration)
                    val tvInvNumber = view.findViewById<TextView>(R.id.tvInvNumber)
                    val tvInvGrandTotal = view.findViewById<TextView>(R.id.tvInvGrandTotal)
                    val layoutInvoiceItems = view.findViewById<android.widget.LinearLayout>(R.id.layoutInvoiceItems)
                    
                    val tvInvBilliardTotal = view.findViewById<TextView>(R.id.tvInvBilliardTotal)
                    val tvInvCafeTotal = view.findViewById<TextView>(R.id.tvInvCafeTotal)
                    val layoutBilliardTotalRow = view.findViewById<android.widget.LinearLayout>(R.id.layoutBilliardTotalRow)
                    val layoutCafeTotalRow = view.findViewById<android.widget.LinearLayout>(R.id.layoutCafeTotalRow)
                    
                    tvInvTable?.text = tableName.ifEmpty { "Stasiun PlayStation" }
                    tvInvCustomer?.text = customerName.ifEmpty { "Pelanggan" }
                    tvInvDuration?.text = playDuration.ifEmpty { "—" }
                    tvInvNumber?.text = if (invoiceNumber.startsWith("#")) invoiceNumber else "#$invoiceNumber"
                    
                    val grandVal = grandTotal.toDoubleOrNull() ?: 0.0
                    tvInvGrandTotal?.text = "Rp ${formatRupiah(grandVal)}"
                    
                    // Show breakdown rows if values exist
                    val billVal = billiardTotal.toDoubleOrNull() ?: 0.0
                    if (billVal > 0 && tvInvBilliardTotal != null && layoutBilliardTotalRow != null) {
                        tvInvBilliardTotal.text = "Rp ${formatRupiah(billVal)}"
                        layoutBilliardTotalRow.visibility = View.VISIBLE
                    } else {
                        layoutBilliardTotalRow?.visibility = View.GONE
                    }
                    
                    val cafeVal = cafeTotal.toDoubleOrNull() ?: 0.0
                    if (cafeVal > 0 && tvInvCafeTotal != null && layoutCafeTotalRow != null) {
                        tvInvCafeTotal.text = "Rp ${formatRupiah(cafeVal)}"
                        layoutCafeTotalRow.visibility = View.VISIBLE
                    } else {
                        layoutCafeTotalRow?.visibility = View.GONE
                    }
                    
                    // Gather all items
                    val itemsList = mutableListOf<Pair<String, Double>>()
                    if (billVal > 0) {
                        itemsList.add(Pair("Billing PlayStation ($playDuration)", billVal))
                    }
                    if (orders.isNotEmpty() && orders != "[]") {
                        try {
                            val jsonArray = org.json.JSONArray(orders)
                            for (i in 0 until jsonArray.length()) {
                                val itemObj = jsonArray.getJSONObject(i)
                                val name = itemObj.optString("name", "Item")
                                val qty = itemObj.optInt("qty", 1)
                                val subtotal = itemObj.optDouble("subtotal", 0.0)
                                itemsList.add(Pair("$qty x $name", subtotal))
                            }
                        } catch (e: Exception) {
                            e.printStackTrace()
                        }
                    }
                    
                    if (layoutInvoiceItems != null) {
                        populateInvoiceItems(layoutInvoiceItems, itemsList, isPortrait)
                    }
                }
            }

            // Set network metadata
            val tvIp = view.findViewById<TextView>(R.id.tvLockIp)
            val tvWifi = view.findViewById<TextView>(R.id.tvLockWifi)

            try {
                val wifiManager = applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
                val connectivityManager = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
                val wifiInfo = wifiManager.connectionInfo

                val activeNetwork = connectivityManager.activeNetworkInfo
                val ssidName = if (activeNetwork != null && activeNetwork.isConnected) {
                    activeNetwork.extraInfo ?: wifiInfo.ssid ?: "WiFi"
                } else {
                    "Offline"
                }

                val ipAddressInt = wifiInfo.ipAddress
                val ipAddress = String.format(
                    "%d.%d.%d.%d",
                    (ipAddressInt and 0xff),
                    (ipAddressInt shr 8 and 0xff),
                    (ipAddressInt shr 16 and 0xff),
                    (ipAddressInt shr 24 and 0xff)
                )

                tvIp.text = "IP Address: $ipAddress"
                tvWifi.text = "Connected to: $ssidName"
            } catch (e: Exception) {
                tvIp.text = "IP Address: —"
                tvWifi.text = "Connected to: —"
            }

            lockView = view
            windowManager.addView(lockView, buildFullscreenParams())
            animateIn(view)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun populateInvoiceItems(
        parent: android.widget.LinearLayout,
        items: List<Pair<String, Double>>,
        isPortrait: Boolean
    ) {
        parent.removeAllViews()
        if (items.isEmpty()) return

        // If landscape and items count > 4, we use 2 columns to save space
        val useTwoColumns = !isPortrait && items.size > 4

        if (useTwoColumns) {
            for (i in items.indices step 2) {
                val item1 = items[i]
                val item2 = if (i + 1 < items.size) items[i + 1] else null

                val row = android.widget.LinearLayout(parent.context).apply {
                    orientation = android.widget.LinearLayout.HORIZONTAL
                    layoutParams = android.widget.LinearLayout.LayoutParams(
                        android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                        android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                    ).apply {
                        setMargins(0, 2.dpToPx(), 0, 2.dpToPx())
                    }
                }

                // Column 1
                val col1 = createItemColumn(parent.context, item1.first, item1.second)
                val col1Params = android.widget.LinearLayout.LayoutParams(
                    0,
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT,
                    1.0f
                )
                col1.layoutParams = col1Params
                row.addView(col1)

                // Divider space between columns
                val spacer = View(parent.context).apply {
                    layoutParams = android.widget.LinearLayout.LayoutParams(
                        12.dpToPx(),
                        android.widget.LinearLayout.LayoutParams.MATCH_PARENT
                    )
                }
                row.addView(spacer)

                // Column 2
                val col2 = if (item2 != null) {
                    createItemColumn(parent.context, item2.first, item2.second)
                } else {
                    View(parent.context) // empty placeholder
                }
                val col2Params = android.widget.LinearLayout.LayoutParams(
                    0,
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT,
                    1.0f
                )
                col2.layoutParams = col2Params
                row.addView(col2)

                parent.addView(row)
            }
        } else {
            // Single column layout
            for (item in items) {
                val row = android.widget.LinearLayout(parent.context).apply {
                    orientation = android.widget.LinearLayout.HORIZONTAL
                    layoutParams = android.widget.LinearLayout.LayoutParams(
                        android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                        android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                    ).apply {
                        setMargins(0, 3.dpToPx(), 0, 3.dpToPx())
                    }
                }

                // Smaller text sizes if we have many items
                val dynamicTextSize = if (items.size > 5) 11f else 12f

                val tvLabel = TextView(parent.context).apply {
                    text = item.first
                    setTextColor(androidx.core.content.ContextCompat.getColor(context, R.color.text_secondary))
                    textSize = dynamicTextSize
                    layoutParams = android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
                }

                val tvAmount = TextView(parent.context).apply {
                    text = "Rp ${formatRupiah(item.second)}"
                    setTextColor(androidx.core.content.ContextCompat.getColor(context, R.color.text_primary))
                    textSize = dynamicTextSize
                    gravity = Gravity.END
                    layoutParams = android.widget.LinearLayout.LayoutParams(
                        android.widget.LinearLayout.LayoutParams.WRAP_CONTENT,
                        android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                    )
                }

                row.addView(tvLabel)
                row.addView(tvAmount)
                parent.addView(row)
            }
        }
    }

    private fun createItemColumn(context: Context, label: String, amount: Double): View {
        val container = android.widget.LinearLayout(context).apply {
            orientation = android.widget.LinearLayout.HORIZONTAL
        }

        val tvLabel = TextView(context).apply {
            text = label
            setTextColor(androidx.core.content.ContextCompat.getColor(context, R.color.text_secondary))
            textSize = 10f
            maxLines = 1
            ellipsize = android.text.TextUtils.TruncateAt.END
            layoutParams = android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
        }

        val tvAmount = TextView(context).apply {
            text = "Rp ${formatRupiah(amount)}"
            setTextColor(androidx.core.content.ContextCompat.getColor(context, R.color.text_primary))
            textSize = 10f
            gravity = Gravity.END
            layoutParams = android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.WRAP_CONTENT,
                android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
            )
        }

        container.addView(tvLabel)
        container.addView(tvAmount)
        return container
    }

    private fun Int.dpToPx(): Int {
        val density = resources.displayMetrics.density
        return (this * density).toInt()
    }

    private fun formatRupiah(amount: Double): String {
        return try {
            val formatter = java.text.NumberFormat.getIntegerInstance(java.util.Locale("in", "ID"))
            formatter.format(amount.toLong())
        } catch (e: Exception) {
            String.format("%,.0f", amount)
        }
    }

    private fun handleWakeup(title: String?, duration: String?) {
        // 1. Remove the black screen lock overlay
        removeLockView()
        
        // 2. If a title is provided (meaning a session just started or was extended), show the temporary wakeup info overlay
        if (!title.isNullOrEmpty()) {
            showWakeupOverlay(title, duration ?: "")
        }
    }

    private fun showWakeupOverlay(title: String, duration: String) {
        removeWakeupView()
        handler.removeCallbacks(dismissWakeupRunnable)

        try {
            val inflater = LayoutInflater.from(this)
            val view = inflater.inflate(R.layout.wakeup_overlay, null)
            
            val tvBadge = view.findViewById<TextView>(R.id.tvWakeupBadge)
            val tvTitle = view.findViewById<TextView>(R.id.tvWakeupTitle)
            val tvDuration = view.findViewById<TextView>(R.id.tvWakeupDuration)
            
            if (title.equals("Tambahan waktu", ignoreCase = true)) {
                tvBadge.text = "TIME ADDED"
                tvBadge.setBackgroundResource(R.drawable.card_background)
                tvBadge.backgroundTintList = android.content.res.ColorStateList.valueOf(
                    android.graphics.Color.parseColor("#F59E0B"))
            } else {
                tvBadge.text = "SESSION ACTIVE"
                tvBadge.setBackgroundResource(R.drawable.card_background)
                tvBadge.backgroundTintList = android.content.res.ColorStateList.valueOf(
                    android.graphics.Color.parseColor("#6366F1"))
            }
            
            tvTitle.text = title
            tvDuration.text = if (duration.startsWith("Waktu")) duration else "Waktu $duration"
            
            wakeupView = view
            windowManager.addView(wakeupView, buildFloatingParams())
            animateIn(view)
            
            // Auto hide after 7 seconds
            handler.postDelayed(dismissWakeupRunnable, 7000)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun removeLockView() {
        lockView?.let {
            try {
                windowManager.removeView(it)
            } catch (e: Exception) {
                e.printStackTrace()
            }
            lockView = null
        }
    }

    private fun removeToastView() {
        toastView?.let {
            try {
                windowManager.removeView(it)
            } catch (e: Exception) {
                e.printStackTrace()
            }
            toastView = null
        }
    }

    private fun removeWakeupView() {
        wakeupView?.let {
            try {
                windowManager.removeView(it)
            } catch (e: Exception) {
                e.printStackTrace()
            }
            wakeupView = null
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        handler.removeCallbacks(dismissToastRunnable)
        handler.removeCallbacks(dismissWakeupRunnable)
        
        try {
            if (wakeLock?.isHeld == true) wakeLock?.release()
            if (wifiLock?.isHeld == true) wifiLock?.release()
        } catch (e: Exception) {
            e.printStackTrace()
        }

        removeLockView()
        removeToastView()
        removeWakeupView()
    }
}
