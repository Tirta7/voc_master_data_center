package com.antygraviti.tvclient

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.location.LocationManager
import android.net.ConnectivityManager
import android.net.Uri
import android.net.wifi.WifiManager
import android.os.Bundle
import android.provider.Settings
import android.view.View
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import java.net.NetworkInterface
import java.util.Collections

@Suppress("DEPRECATION", "OPT_IN_USAGE")
class MainActivity : AppCompatActivity() {

    private lateinit var server: ApplicationEngine

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        
        // Keep screen awake
        window.addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        
        applyResponsiveLayout()
        updateWifiStats()

        // Request Location Permission so that SSID is not '<unknown ssid>'
        if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, arrayOf(android.Manifest.permission.ACCESS_FINE_LOCATION), 101)
        }

        // Request Overlay Permission for Lock/Toast display
        if (!Settings.canDrawOverlays(this)) {
            val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:$packageName"))
            startActivityForResult(intent, 1234)
        }

        // Request Battery Optimization Exemption
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
            val pm = getSystemService(Context.POWER_SERVICE) as android.os.PowerManager
            if (!pm.isIgnoringBatteryOptimizations(packageName)) {
                val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                    data = Uri.parse("package:$packageName")
                }
                startActivity(intent)
            }
        }

        // Start Ktor Server
        startHttpServer()
    }

    override fun onResume() {
        super.onResume()
        updateWifiStats()
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == 101) {
            updateWifiStats()
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == 1234) {
            updateWifiStats()
        }
    }

    private fun updateWifiStats() {
        val tvDeviceIp = findViewById<TextView>(R.id.tvDeviceIp)
        val tvWifiStateVal = findViewById<TextView>(R.id.tvWifiStateVal)
        val tvNetworkStateVal = findViewById<TextView>(R.id.tvNetworkStateVal)
        val tvSsidVal = findViewById<TextView>(R.id.tvSsidVal)
        val tvBssidVal = findViewById<TextView>(R.id.tvBssidVal)
        val tvRssiVal = findViewById<TextView>(R.id.tvRssiVal)
        val tvMacVal = findViewById<TextView>(R.id.tvMacVal)
        val tvLinkSpeedVal = findViewById<TextView>(R.id.tvLinkSpeedVal)
        val tvNetworkIdVal = findViewById<TextView>(R.id.tvNetworkIdVal)
        val tvScanResults = findViewById<TextView>(R.id.tvScanResults)
        
        val tvOverlayPermission = findViewById<TextView>(R.id.tvOverlayPermission)
        val tvLocationPermission = findViewById<TextView>(R.id.tvLocationPermission)
        val layoutLocationWarning = findViewById<LinearLayout>(R.id.layoutLocationWarning)
        
        val wifiManager = applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
        val connectivityManager = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        
        val wifiInfo = wifiManager.connectionInfo
        
        // 1. WiFi State
        val wifiState = when (wifiManager.wifiState) {
            WifiManager.WIFI_STATE_DISABLED -> "Disabled"
            WifiManager.WIFI_STATE_DISABLING -> "Disabling"
            WifiManager.WIFI_STATE_ENABLED -> "Enabled"
            WifiManager.WIFI_STATE_ENABLING -> "Enabling"
            else -> "Unknown"
        }
        tvWifiStateVal.text = wifiState

        // 2. Network Connected State
        val activeNetwork = connectivityManager.activeNetworkInfo
        val isConnected = activeNetwork != null && activeNetwork.isConnected
        val networkState = if (activeNetwork != null && isConnected) {
            val typeName = activeNetwork.typeName
            "Terhubung via $typeName"
        } else {
            "Tidak Terhubung"
        }
        tvNetworkStateVal.text = networkState

        // 3. IP Address
        val ipAddressInt = wifiInfo.ipAddress
        val ipAddress = String.format(
            "%d.%d.%d.%d",
            (ipAddressInt and 0xff),
            (ipAddressInt shr 8 and 0xff),
            (ipAddressInt shr 16 and 0xff),
            (ipAddressInt shr 24 and 0xff)
        )
        tvDeviceIp.text = if (ipAddress == "0.0.0.0") "Belum Terhubung" else ipAddress

        // 4. MAC Address (Robust lookup)
        val macAddress = getMacAddress()
        tvMacVal.text = macAddress

        // 5. SSID, BSSID, RSSI, NetworkID
        val rawSsid = wifiInfo.ssid ?: "<unknown ssid>"
        // Remove quotes if present
        val cleanSsid = if (rawSsid.startsWith("\"") && rawSsid.endsWith("\"")) {
            rawSsid.substring(1, rawSsid.length - 1)
        } else {
            rawSsid
        }
        tvSsidVal.text = cleanSsid
        
        val bssid = wifiInfo.bssid ?: "02:00:00:00:00:00"
        tvBssidVal.text = bssid
        
        val rssi = wifiInfo.rssi
        tvRssiVal.text = "$rssi dBm"
        
        val networkId = wifiInfo.networkId
        tvNetworkIdVal.text = networkId.toString()

        // 6. Link Speeds
        val transmitLinkSpeed = "${wifiInfo.linkSpeed} Mbps"
        val receiveLinkSpeed = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
            "${wifiInfo.rxLinkSpeedMbps} Mbps"
        } else {
            "N/A"
        }
        tvLinkSpeedVal.text = "$transmitLinkSpeed / $receiveLinkSpeed"

        // 7. Scan Results
        val scanResultsSB = java.lang.StringBuilder()
        try {
            val results = wifiManager.scanResults
            if (results != null && results.isNotEmpty()) {
                for (res in results.take(8)) { // Limit to 8 items to fit nicely
                    scanResultsSB.append("SSID: \"${res.SSID}\" | Freq: ${res.frequency}MHz | Signal: ${res.level}dBm\n")
                }
            } else {
                scanResultsSB.append("Tidak ada jaringan yang dipindai (Scan results kosong)")
            }
        } catch (e: Exception) {
            scanResultsSB.append("Gagal memindai: ${e.message}")
        }
        tvScanResults.text = scanResultsSB.toString().trim()

        // 8. Permissions UI
        val hasOverlay = Settings.canDrawOverlays(this)
        tvOverlayPermission.text = if (hasOverlay) "• Display Over Other Apps: DIAKTIFKAN" else "• Display Over Other Apps: BELUM DIAKTIFKAN ⚠️"
        tvOverlayPermission.setTextColor(if (hasOverlay) ContextCompat.getColor(this, R.color.success) else ContextCompat.getColor(this, R.color.error))

        val hasLocation = ContextCompat.checkSelfPermission(this, android.Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        tvLocationPermission.text = if (hasLocation) "• Fine Location: DIIZINKAN" else "• Fine Location: BELUM DIIZINKAN ⚠️"
        tvLocationPermission.setTextColor(if (hasLocation) ContextCompat.getColor(this, R.color.success) else ContextCompat.getColor(this, R.color.error))

        // Check if GPS is enabled
        var isGpsEnabled = false
        try {
            val lm = getSystemService(Context.LOCATION_SERVICE) as LocationManager
            isGpsEnabled = lm.isProviderEnabled(LocationManager.GPS_PROVIDER)
        } catch (e: Exception) {
            e.printStackTrace()
        }

        // Show warning if SSID is unknown or GPS is off or permission is missing
        if (!hasLocation || !isGpsEnabled || cleanSsid == "<unknown ssid>" || bssid == "02:00:00:00:00:00") {
            layoutLocationWarning.visibility = View.VISIBLE
            val warningText = StringBuilder()
            warningText.append("⚠️ Peringatan: ")
            if (!hasLocation) {
                warningText.append("Izin Lokasi belum disetujui. ")
            }
            if (!isGpsEnabled) {
                warningText.append("Layanan Lokasi (GPS) mati. ")
            }
            if (cleanSsid == "<unknown ssid>" || bssid == "02:00:00:00:00:00") {
                warningText.append("SSID/BSSID disembunyikan oleh sistem Android. ")
            }
            warningText.append("Silakan berikan izin lokasi dan aktifkan GPS di Pengaturan HP/TV Anda agar spesifikasi jaringan terbaca.")
            
            val tvWarning = layoutLocationWarning.getChildAt(1) as? TextView
            tvWarning?.text = warningText.toString()
        } else {
            layoutLocationWarning.visibility = View.GONE
        }
    }

    private fun getMacAddress(): String {
        try {
            val interfaces = Collections.list(NetworkInterface.getNetworkInterfaces())
            for (intf in interfaces) {
                val name = intf.name.lowercase()
                if (!name.contains("wlan") && !name.contains("eth")) continue
                val mac = intf.hardwareAddress ?: continue
                val buf = java.lang.StringBuilder()
                for (b in mac) {
                    buf.append(String.format("%02X:", b))
                }
                if (buf.length > 0) {
                    buf.deleteCharAt(buf.length - 1)
                }
                return buf.toString().lowercase()
            }
        } catch (ex: Exception) {
            ex.printStackTrace()
        }
        return "N/A"
    }

    private fun startHttpServer() {
        GlobalScope.launch(Dispatchers.IO) {
            server = embeddedServer(Netty, port = 1717) {
                routing {
                    get("/ping") {
                        call.respondText("{\"status\":\"ok\"}")
                    }
                    get("/text") {
                        val message = call.request.queryParameters["text"] ?: "Waktu Habis!"
                        showOverlayMessage(message)
                        call.respondText("Message displayed: $message")
                    }
                    get("/sleep") {
                        val invoiceNumber = call.request.queryParameters["invoiceNumber"] ?: ""
                        val customerName = call.request.queryParameters["customerName"] ?: ""
                        val tableName = call.request.queryParameters["tableName"] ?: ""
                        val playDuration = call.request.queryParameters["playDuration"] ?: ""
                        val billiardTotal = call.request.queryParameters["billiardTotal"] ?: ""
                        val cafeTotal = call.request.queryParameters["cafeTotal"] ?: ""
                        val grandTotal = call.request.queryParameters["grandTotal"] ?: ""
                        val orders = call.request.queryParameters["orders"] ?: ""
                        
                        showBlackScreenOverlay(invoiceNumber, customerName, tableName, playDuration, billiardTotal, cafeTotal, grandTotal, orders)
                        call.respondText("Sleep activated")
                    }
                    get("/wakeup") {
                        val title = call.request.queryParameters["title"]
                        val duration = call.request.queryParameters["duration"]
                        removeOverlays(title, duration)
                        call.respondText("Wakeup activated")
                    }
                }
            }.start(wait = true)
        }
    }

    private fun showOverlayMessage(message: String) {
        val intent = Intent(this, OverlayService::class.java)
        intent.putExtra("COMMAND", "TEXT")
        intent.putExtra("MESSAGE", message)
        androidx.core.content.ContextCompat.startForegroundService(this, intent)
    }

    private fun showBlackScreenOverlay(
        invoiceNumber: String = "",
        customerName: String = "",
        tableName: String = "",
        playDuration: String = "",
        billiardTotal: String = "",
        cafeTotal: String = "",
        grandTotal: String = "",
        orders: String = ""
    ) {
        val intent = Intent(this, OverlayService::class.java).apply {
            putExtra("COMMAND", "SLEEP")
            putExtra("INVOICE_NUMBER", invoiceNumber)
            putExtra("CUSTOMER_NAME", customerName)
            putExtra("TABLE_NAME", tableName)
            putExtra("PLAY_DURATION", playDuration)
            putExtra("BILLIARD_TOTAL", billiardTotal)
            putExtra("CAFE_TOTAL", cafeTotal)
            putExtra("GRAND_TOTAL", grandTotal)
            putExtra("ORDERS", orders)
        }
        androidx.core.content.ContextCompat.startForegroundService(this, intent)
    }

    private fun removeOverlays(title: String?, duration: String?) {
        val intent = Intent(this, OverlayService::class.java)
        intent.putExtra("COMMAND", "WAKEUP")
        intent.putExtra("TITLE", title)
        intent.putExtra("DURATION", duration)
        androidx.core.content.ContextCompat.startForegroundService(this, intent)
    }

    override fun onDestroy() {
        super.onDestroy()
        server.stop(1000, 1000)
    }

    private fun applyResponsiveLayout() {
        val layoutDashboardColumns = findViewById<LinearLayout>(R.id.layoutDashboardColumns)
        val layoutServerInfo = findViewById<LinearLayout>(R.id.layoutServerInfo)
        val layoutNetworkInfo = findViewById<LinearLayout>(R.id.layoutNetworkInfo)

        if (layoutDashboardColumns == null || layoutServerInfo == null || layoutNetworkInfo == null) return

        val metrics = resources.displayMetrics
        val widthDp = metrics.widthPixels / metrics.density

        if (widthDp < 600) { // Portrait Mobile
            layoutDashboardColumns.orientation = LinearLayout.VERTICAL

            val serverParams = layoutServerInfo.layoutParams as LinearLayout.LayoutParams
            serverParams.width = LinearLayout.LayoutParams.MATCH_PARENT
            serverParams.height = LinearLayout.LayoutParams.WRAP_CONTENT
            serverParams.weight = 0f
            serverParams.setMargins(0, 0, 0, (20 * metrics.density).toInt())
            layoutServerInfo.layoutParams = serverParams

            val networkParams = layoutNetworkInfo.layoutParams as LinearLayout.LayoutParams
            networkParams.width = LinearLayout.LayoutParams.MATCH_PARENT
            networkParams.height = LinearLayout.LayoutParams.WRAP_CONTENT
            networkParams.weight = 0f
            networkParams.setMargins(0, 0, 0, 0)
            layoutNetworkInfo.layoutParams = networkParams
        } else { // Landscape TV / Tablet
            layoutDashboardColumns.orientation = LinearLayout.HORIZONTAL

            val serverParams = layoutServerInfo.layoutParams as LinearLayout.LayoutParams
            serverParams.width = 0
            serverParams.height = LinearLayout.LayoutParams.MATCH_PARENT
            serverParams.weight = 1f
            serverParams.setMargins(0, 0, (12 * metrics.density).toInt(), 0)
            layoutServerInfo.layoutParams = serverParams

            val networkParams = layoutNetworkInfo.layoutParams as LinearLayout.LayoutParams
            networkParams.width = 0
            networkParams.height = LinearLayout.LayoutParams.WRAP_CONTENT
            networkParams.weight = 1.2f
            networkParams.setMargins((12 * metrics.density).toInt(), 0, 0, 0)
            layoutNetworkInfo.layoutParams = networkParams
        }
    }
}
