package com.voc.fulldisplay

import android.app.Activity
import android.content.Context
import android.os.Bundle
import android.widget.Button
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.textfield.TextInputEditText

class SettingsActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_settings)

        val editServerUrl = findViewById<TextInputEditText>(R.id.editServerUrl)
        val editZoomScale = findViewById<TextInputEditText>(R.id.editZoomScale)
        val btnSave = findViewById<Button>(R.id.btnSave)

        // Ambil nilai tersimpan dari SharedPreferences
        val sharedPref = getSharedPreferences("VFD_PREFS", Context.MODE_PRIVATE)
        val currentUrl = sharedPref.getString("SERVER_URL", "http://192.168.1.19:3000")
        val currentZoom = sharedPref.getInt("ZOOM_SCALE", 100)

        editServerUrl.setText(currentUrl)
        editZoomScale.setText(currentZoom.toString())

        btnSave.setOnClickListener {
            var urlInput = editServerUrl.text.toString().trim()
            val zoomInput = editZoomScale.text.toString().trim()

            if (urlInput.isEmpty()) {
                Toast.makeText(this, "Alamat IP/URL tidak boleh kosong!", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            // Tambahkan http:// secara otomatis jika user lupa mengetiknya
            if (!urlInput.startsWith("http://") && !urlInput.startsWith("https://")) {
                urlInput = "http://$urlInput"
            }

            // Validasi dan parsing nilai zoom scale
            val zoomScale = zoomInput.toIntOrNull()
            if (zoomScale == null || zoomScale < 25 || zoomScale > 300) {
                Toast.makeText(this, "Zoom Scale harus antara 25 - 300 (%)", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            // Simpan ke SharedPreferences
            sharedPref.edit()
                .putString("SERVER_URL", urlInput)
                .putInt("ZOOM_SCALE", zoomScale)
                .apply()

            Toast.makeText(this, "Pengaturan berhasil disimpan!", Toast.LENGTH_SHORT).show()
            setResult(Activity.RESULT_OK)
            finish()
        }
    }
}
