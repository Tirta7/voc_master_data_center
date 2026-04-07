# ═══════════════════════════════════════════════════════════════
# VOC BILLIARD SYSTEM — Windows Installer (PowerShell)
# Jalankan: klik kanan → "Run with PowerShell as Administrator"
# ═══════════════════════════════════════════════════════════════

param(
    [string]$InstallDir = "C:\voc_billiard",
    [switch]$SkipDockerCheck
)

# ── Fungsi warna ─────────────────────────────────────────────
function Write-Header {
    Clear-Host
    Write-Host ""
    Write-Host "  ██╗   ██╗ ██████╗  ██████╗     ██████╗ ██╗██╗     ██╗      █████╗ ██████╗ ██████╗ " -ForegroundColor Cyan
    Write-Host "  ╚██╗ ██╔╝██╔═══██╗██╔════╝     ██╔══██╗██║██║     ██║     ██╔══██╗██╔══██╗██╔══██╗" -ForegroundColor Cyan
    Write-Host "   ╚████╔╝ ██║   ██║██║          ██████╔╝██║██║     ██║     ███████║██████╔╝██║  ██║" -ForegroundColor Cyan
    Write-Host "    ╚██╔╝  ██║   ██║██║          ██╔══██╗██║██║     ██║     ██╔══██║██╔══██╗██║  ██║" -ForegroundColor Cyan
    Write-Host "     ██║   ╚██████╔╝╚██████╗     ██████╔╝██║███████╗███████╗██║  ██║██║  ██║██████╔╝" -ForegroundColor Cyan
    Write-Host "     ╚═╝    ╚═════╝  ╚═════╝     ╚═════╝ ╚═╝╚══════╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Billiard Management System — Windows Installer" -ForegroundColor White
    Write-Host "  ─────────────────────────────────────────────────────" -ForegroundColor DarkGray
    Write-Host ""
}

function Write-Step([int]$num, [int]$total, [string]$msg) {
    Write-Host "  [$num/$total] " -ForegroundColor Yellow -NoNewline
    Write-Host $msg -ForegroundColor White
}

function Write-OK([string]$msg) {
    Write-Host "        ✔ $msg" -ForegroundColor Green
}

function Write-Info([string]$msg) {
    Write-Host "        💡 $msg" -ForegroundColor Cyan
}

function Write-Warn([string]$msg) {
    Write-Host "        ⚠️  $msg" -ForegroundColor Yellow
}

function Write-Fail([string]$msg) {
    Write-Host "        ❌ $msg" -ForegroundColor Red
}

# ═══════════════════════════════════════════════════════════════
# CEK: Harus dijalankan sebagai Administrator
# ═══════════════════════════════════════════════════════════════
Write-Header

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Fail "Script harus dijalankan sebagai Administrator!"
    Write-Host ""
    Write-Host "  Caranya:" -ForegroundColor White
    Write-Host "  1. Klik kanan file deploy-windows.ps1" -ForegroundColor Gray
    Write-Host "  2. Pilih 'Run with PowerShell as Administrator'" -ForegroundColor Gray
    Write-Host ""
    Pause
    exit 1
}

# ═══════════════════════════════════════════════════════════════
# STEP 1: Cek & Install WSL2 (diperlukan Docker Desktop)
# ═══════════════════════════════════════════════════════════════
Write-Step 1 6 "Mengecek WSL2..."

$wslStatus = wsl --status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Warn "WSL2 belum aktif. Mengaktifkan WSL2..."
    
    # Enable fitur Windows
    dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart | Out-Null
    dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart | Out-Null
    
    # Install WSL2 kernel update
    Write-Info "Mendownload WSL2 kernel update..."
    $wslInstaller = "$env:TEMP\wsl_update.msi"
    Invoke-WebRequest -Uri "https://wslstorestorage.blob.core.windows.net/wslblob/wsl_update_x64.msi" -OutFile $wslInstaller -UseBasicParsing
    Start-Process msiexec.exe -Args "/i $wslInstaller /quiet" -Wait
    
    wsl --set-default-version 2

    Write-OK "WSL2 berhasil diaktifkan. Komputer perlu RESTART."
    Write-Host ""
    Write-Host "  ⚠️  Harap RESTART komputer, lalu jalankan script ini lagi!" -ForegroundColor Red
    Pause
    exit 0
} else {
    Write-OK "WSL2 sudah aktif."
}

# ═══════════════════════════════════════════════════════════════
# STEP 2: Cek & Install Docker Desktop
# ═══════════════════════════════════════════════════════════════
Write-Step 2 6 "Mengecek Docker Desktop..."

$dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
if (-not $dockerCmd) {
    Write-Warn "Docker belum terinstall. Mendownload Docker Desktop..."
    Write-Info "Ukuran file: ~600MB, harap tunggu..."
    
    $dockerInstaller = "$env:TEMP\DockerDesktopInstaller.exe"
    Invoke-WebRequest -Uri "https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe" -OutFile $dockerInstaller -UseBasicParsing
    
    Write-Info "Menginstall Docker Desktop (proses ini memakan waktu 5-10 menit)..."
    Start-Process -Wait -FilePath $dockerInstaller -ArgumentList "install --quiet --accept-license"
    
    Write-OK "Docker Desktop berhasil diinstall!"
    Write-Host ""
    Write-Host "  ⚠️  Docker Desktop perlu RESTART untuk pertama kali." -ForegroundColor Yellow
    Write-Host "  Setelah restart, jalankan Docker Desktop, lalu jalankan script ini lagi." -ForegroundColor Yellow
    Write-Host ""
    Pause
    exit 0
} else {
    # Cek apakah Docker daemon sudah berjalan
    $dockerRunning = docker info 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Warn "Docker Desktop belum berjalan. Mencoba memulai..."
        Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
        
        Write-Info "Menunggu Docker siap (maks 60 detik)..."
        $timeout = 60
        $elapsed = 0
        while ($elapsed -lt $timeout) {
            Start-Sleep -Seconds 3
            $elapsed += 3
            $check = docker info 2>&1
            if ($LASTEXITCODE -eq 0) { break }
            Write-Host "      . " -NoNewline -ForegroundColor DarkGray
        }
        Write-Host ""
        
        if ($LASTEXITCODE -ne 0) {
            Write-Fail "Docker tidak bisa distart otomatis."
            Write-Info "Buka Docker Desktop secara manual, tunggu icon whale muncul di tray, lalu jalankan script ini lagi."
            Pause
            exit 1
        }
    }
    Write-OK "Docker Desktop berjalan: $(docker --version)"
}

# ═══════════════════════════════════════════════════════════════
# STEP 3: Clone / Update repository
# ═══════════════════════════════════════════════════════════════
Write-Step 3 6 "Clone / Update repository dari GitHub..."

$gitCmd = Get-Command git -ErrorAction SilentlyContinue
if (-not $gitCmd) {
    Write-Warn "Git belum terinstall. Mendownload Git for Windows..."
    $gitInstaller = "$env:TEMP\git_installer.exe"
    Invoke-WebRequest -Uri "https://github.com/git-for-windows/git/releases/download/v2.47.1.windows.2/Git-2.47.1.2-64-bit.exe" -OutFile $gitInstaller -UseBasicParsing
    Start-Process -Wait -FilePath $gitInstaller -ArgumentList "/SILENT /NORESTART"
    
    # Refresh PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    Write-OK "Git berhasil diinstall."
}

if (Test-Path "$InstallDir\.git") {
    Write-Info "Repo sudah ada, melakukan update..."
    Set-Location $InstallDir
    git pull origin main 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { git pull origin master 2>&1 | Out-Null }
} else {
    Write-Info "Cloning dari GitHub ke: $InstallDir"
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
    git clone https://github.com/Tirta7/voc_master_data_center.git $InstallDir
    Set-Location $InstallDir
}

Write-OK "Repository siap di: $InstallDir"

# ═══════════════════════════════════════════════════════════════
# STEP 4: Setup file .env
# ═══════════════════════════════════════════════════════════════
Write-Step 4 6 "Setup Environment (.env)..."
Set-Location $InstallDir

if (Test-Path ".env") {
    Write-OK "File .env sudah ada, dilewati."
} else {
    # Deteksi IP lokal
    $localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { 
        $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.*" -and $_.PrefixOrigin -ne "WellKnown"
    } | Select-Object -First 1).IPAddress

    if (-not $localIP) { $localIP = "localhost" }

    Write-Info "IP yang terdeteksi: $localIP"
    
    # Tanya apakah mau ganti IP
    $userIP = Read-Host "  Tekan Enter untuk pakai IP [$localIP] atau ketik IP lain"
    if ($userIP.Trim() -ne "") { $localIP = $userIP.Trim() }

    # Tanya password
    $dbPass = Read-Host "  Password PostgreSQL (Enter = 'Billiard2025!')" -AsSecureString
    $dbPassPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPass)
    )
    if ($dbPassPlain.Trim() -eq "") { $dbPassPlain = "Billiard2025!" }
    
    # Buat .env dari template
    $envContent = Get-Content ".env.docker" -Raw
    $envContent = $envContent -replace "192\.168\.1\.100", $localIP
    $envContent = $envContent -replace "GantiDenganPasswordKuat123!", $dbPassPlain
    $envContent | Set-Content ".env" -Encoding UTF8

    Write-OK "File .env dibuat dengan IP: $localIP"
    Write-Info "Edit manual jika diperlukan: notepad $InstallDir\.env"
}

# ═══════════════════════════════════════════════════════════════
# STEP 5: Build dan jalankan semua container
# ═══════════════════════════════════════════════════════════════
Write-Step 5 6 "Build Docker images (pertama kali bisa 10-20 menit)..."
Set-Location $InstallDir

# Pull image-image eksternal dulu
Write-Info "Mendownload base images (postgres, redis, mosquitto)..."
docker compose pull postgres redis mosquitto

# Build backend dan frontend
Write-Info "Membangun image backend dan frontend..."
docker compose build --no-cache

Write-Step 5 6 "Menjalankan semua container..."
docker compose up -d

Write-Info "Menunggu services siap (30 detik)..."
Start-Sleep -Seconds 30

Write-OK "Semua container berhasil dijalankan!"

# ═══════════════════════════════════════════════════════════════
# STEP 6: Buat shortcut di Desktop
# ═══════════════════════════════════════════════════════════════
Write-Step 6 6 "Membuat shortcut dan helper scripts..."

# Buat script batch START
$startScript = @"
@echo off
echo Memulai VOC Billiard System...
cd /d "$InstallDir"
docker compose up -d
echo.
echo Berhasil! Buka browser ke:
echo   Frontend : http://localhost:3000
echo   Backend  : http://localhost:4000
echo.
pause
"@
$startScript | Set-Content "$InstallDir\START_VOC.bat" -Encoding ASCII

# Buat script batch STOP
$stopScript = @"
@echo off
echo Menghentikan VOC Billiard System...
cd /d "$InstallDir"
docker compose down
echo Semua container dihentikan.
pause
"@
$stopScript | Set-Content "$InstallDir\STOP_VOC.bat" -Encoding ASCII

# Buat script batch STATUS
$statusScript = @"
@echo off
cd /d "$InstallDir"
echo.
echo === STATUS VOC BILLIARD SYSTEM ===
echo.
docker compose ps
echo.
echo === AKSES APLIKASI ===
echo   Frontend  : http://localhost:3000
echo   Backend   : http://localhost:4000
echo   MQTT TCP  : localhost:1883
echo   MQTT WS   : ws://localhost:8083
echo.
pause
"@
$statusScript | Set-Content "$InstallDir\STATUS_VOC.bat" -Encoding ASCII

# Buat script UPDATE
$updateScript = @"
@echo off
echo Mengupdate VOC Billiard System dari GitHub...
cd /d "$InstallDir"
git pull
docker compose up -d --build
echo Update selesai!
pause
"@
$updateScript | Set-Content "$InstallDir\UPDATE_VOC.bat" -Encoding ASCII

# Buat shortcut di Desktop
$desktopPath = [Environment]::GetFolderPath("Desktop")
$WshShell = New-Object -comObject WScript.Shell

$startShortcut = $WshShell.CreateShortcut("$desktopPath\▶ VOC Billiard START.lnk")
$startShortcut.TargetPath = "$InstallDir\START_VOC.bat"
$startShortcut.WorkingDirectory = $InstallDir
$startShortcut.Save()

$stopShortcut = $WshShell.CreateShortcut("$desktopPath\■ VOC Billiard STOP.lnk")
$stopShortcut.TargetPath = "$InstallDir\STOP_VOC.bat"
$stopShortcut.WorkingDirectory = $InstallDir
$stopShortcut.Save()

Write-OK "Shortcut 'VOC Billiard START/STOP' dibuat di Desktop!"

# ═══════════════════════════════════════════════════════════════
# RINGKASAN AKHIR
# ═══════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "  ═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  ✅ VOC BILLIARD SYSTEM BERHASIL DIINSTALL!" -ForegroundColor Green
Write-Host "  ═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "  🌐 Akses Aplikasi:" -ForegroundColor White
Write-Host "     Frontend  : " -ForegroundColor Gray -NoNewline
Write-Host "http://localhost:3000" -ForegroundColor Green
Write-Host "     Backend   : " -ForegroundColor Gray -NoNewline
Write-Host "http://localhost:4000" -ForegroundColor Green
Write-Host ""
Write-Host "  📁 Lokasi File Install: $InstallDir" -ForegroundColor White
Write-Host ""
Write-Host "  🖥️  Shortcut di Desktop:" -ForegroundColor White
Write-Host "     ▶ VOC Billiard START — untuk menjalankan" -ForegroundColor Gray
Write-Host "     ■ VOC Billiard STOP  — untuk menghentikan" -ForegroundColor Gray
Write-Host ""
Write-Host "  🔧 Helper Scripts di $InstallDir :" -ForegroundColor White
Write-Host "     START_VOC.bat   — Jalankan semua container" -ForegroundColor Gray
Write-Host "     STOP_VOC.bat    — Hentikan semua container" -ForegroundColor Gray
Write-Host "     STATUS_VOC.bat  — Cek status container" -ForegroundColor Gray
Write-Host "     UPDATE_VOC.bat  — Update dari GitHub" -ForegroundColor Gray
Write-Host ""
Write-Host "  ⚠️  Pastikan Docker Desktop selalu berjalan sebelum klik START" -ForegroundColor Yellow
Write-Host ""

# Buka browser ke aplikasi
Start-Sleep -Seconds 5
Write-Host "  Membuka browser..." -ForegroundColor Cyan
Start-Process "http://localhost:3000"

Write-Host ""
Pause
