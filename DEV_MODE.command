#!/bin/bash
echo "========================================================"
echo "         VOC BILLIARD - DEVELOPER MODE STARTUP"
echo "========================================================"
echo "Mempersiapkan port untuk menghindari EADDRINUSE..."
echo ""

BACKEND_PORT=4000
FRONTEND_PORT=3000

echo "[1/2] Memastikan Port $BACKEND_PORT (Backend) bebas..."
lsof -i tcp:$BACKEND_PORT | awk 'NR!=1 {print $2}' | xargs kill -9 2>/dev/null || true

echo "[2/2] Memastikan Port $FRONTEND_PORT (Frontend) bebas..."
lsof -i tcp:$FRONTEND_PORT | awk 'NR!=1 {print $2}' | xargs kill -9 2>/dev/null || true

echo ""
echo "[i] Mematikan PM2 (jika sedang berjalan) agar tidak bentrok..."
pm2 stop all 2>/dev/null || true

echo ""
echo "[SUCCESS] Port sudah dilepaskan. Memulai Developer Mode..."
echo ""

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

echo "[i] Memulai Backend (Terminal Baru): npm run start:dev"
osascript -e "tell app \"Terminal\" to do script \"cd '$DIR/backend' && npm run start:dev\""

sleep 2

echo "[i] Memulai Frontend (Terminal Baru): npm run dev"
osascript -e "tell app \"Terminal\" to do script \"cd '$DIR/frontend' && npm run dev\""

echo ""
echo "========================================================"
echo "   DEVELOPER MODE SEDANG BERJALAN!"
echo "   ----------------------------------------------------"
echo "   Backend  : http://localhost:4000"
echo "   Frontend : http://localhost:3000 (atau http://localhost:3001)"
echo "========================================================"
echo "Biarkan jendela ini atau tutup saja."
