# ================================================================
#  VOC Billiard - Launcher (Jalankan ini jika INSTALL.bat tidak mau buka)
#  Cara: Klik kanan file ini -> "Run with PowerShell"
# ================================================================

# --- Auto elevate ke Admin ---
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "  Meminta hak Administrator..." -ForegroundColor Yellow
    Start-Process PowerShell -ArgumentList "-ExecutionPolicy Bypass -NoProfile -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

# --- Unblock semua file (hapus Zone Identifier dari AnyDesk transfer) ---
Write-Host ""
Write-Host "  ============================================================" -ForegroundColor Cyan
Write-Host "    VOC BILLIARD - Launcher" -ForegroundColor Cyan
Write-Host "  ============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  [..] Membersihkan blokir keamanan Windows..." -ForegroundColor Yellow

$folder = Split-Path -Parent $MyInvocation.MyCommand.Path
Get-ChildItem -Path $folder -ErrorAction SilentlyContinue | Unblock-File -ErrorAction SilentlyContinue
Write-Host "  [OK] Blokir keamanan berhasil dihapus." -ForegroundColor Green

# --- Set ExecutionPolicy agar PS script bisa jalan ---
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force

# --- Jalankan INSTALL.bat ---
$installBat = Join-Path $folder "INSTALL.bat"
if (-Not (Test-Path $installBat)) {
    Write-Host ""
    Write-Host "  [ERROR] File INSTALL.bat tidak ditemukan di: $folder" -ForegroundColor Red
    Write-Host "  Pastikan file MULAI.ps1 berada di folder yang sama dengan INSTALL.bat" -ForegroundColor Red
    Read-Host "  Tekan Enter untuk keluar"
    exit 1
}

Write-Host "  [..] Menjalankan INSTALL.bat..." -ForegroundColor Yellow
Write-Host ""

# Jalankan INSTALL.bat di CMD window yang sudah elevated
# Gunakan /k agar window tidak langsung tutup jika ada error
cmd.exe /k "`"$installBat`""
