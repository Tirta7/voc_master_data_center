@echo off
:: ================================================================
::  VOC Billiard - MULAI (Klik 2x file ini jika INSTALL.bat tidak mau buka)
:: ================================================================
title VOC Billiard - Launcher

:: Buka CMD baru sebagai Admin dengan perintah unblock + jalankan installer
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Start-Process cmd -ArgumentList '/c cd /d ""%~dp0"" && powershell -NoProfile -ExecutionPolicy Bypass -Command Get-ChildItem . -Recurse ^| Unblock-File && INSTALL.bat' -Verb RunAs"
