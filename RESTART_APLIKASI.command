#!/bin/bash
echo "==================================================="
echo "Merestart Aplikasi Docker untuk Terapkan Pengaturan"
echo "==================================================="
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$DIR"
docker compose up -d
echo ""
echo "Restart selesai! Silakan refresh browser Anda."
