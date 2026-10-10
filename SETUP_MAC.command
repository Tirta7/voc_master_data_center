#!/bin/bash
echo "========================================================"
echo "      VOC BILLIARD - MAC OS INITIAL SETUP SCRIPT"
echo "========================================================"
echo "Script ini akan menginstal komponen yang dibutuhkan (Homebrew, Redis, Mosquitto)."
echo "Anda mungkin akan diminta memasukkan password Macbook Anda."
echo ""

# Periksa apakah Homebrew sudah terinstal
if ! command -v brew &> /dev/null && [ ! -f /opt/homebrew/bin/brew ]; then
    echo "[!] Homebrew belum terinstal. Memulai instalasi Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
else
    echo "[OK] Homebrew sudah terinstal."
fi

# Tambahkan Homebrew ke PATH (untuk Apple Silicon dan Intel)
if [ -f /opt/homebrew/bin/brew ]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
elif [ -f /usr/local/bin/brew ]; then
    eval "$(/usr/local/bin/brew shellenv)"
fi

echo ""
echo "[i] Menginstal Redis dan Mosquitto..."
brew install redis mosquitto

echo ""
echo "[i] Menjalankan service Redis dan Mosquitto..."
brew services start redis
brew services start mosquitto

echo ""
echo "========================================================"
echo "[SELESAI] Semua komponen berhasil diinstal dan dijalankan!"
echo "Sekarang Anda dapat menjalankan DEV_MODE.command"
echo "========================================================"
echo ""
