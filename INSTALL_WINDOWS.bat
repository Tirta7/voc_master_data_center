@echo off
:: ═══════════════════════════════════════════════════════════════
:: VOC BILLIARD — Launcher untuk deploy-windows.ps1
:: Klik dua kali file ini untuk memulai instalasi
:: ═══════════════════════════════════════════════════════════════

:: Cek apakah berjalan sebagai Administrator
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Meminta izin Administrator...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

:: Jalankan PowerShell script dengan bypass execution policy
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy-windows.ps1"
