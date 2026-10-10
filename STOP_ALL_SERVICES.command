#!/bin/bash
echo "========================================================"
echo "       VOC BILLIARD - SHUTDOWN / CLEANUP TOOL"
echo "========================================================"
echo "Mematikan semua service Node, PM2, dan membebaskan Port..."
echo "Gunakan script ini jika ingin pindah ke mode DEV atau "
echo "mereset aplikasi jika terjadi port nyangkut / bentrok."
echo "========================================================"
echo ""

echo "[1/3] Mematikan PM2 dan Proses Node.js..."
pm2 kill 2>/dev/null || true
pkill -f node 2>/dev/null || true
pkill -f PM2 2>/dev/null || true

rm -f ~/.pm2/rpc.sock 2>/dev/null || true
rm -f ~/.pm2/pub.sock 2>/dev/null || true
sleep 2

echo "[2/3] Mematikan MQTT Broker (Mosquitto)..."
pkill -f mosquitto 2>/dev/null || true

echo "[3/3] Memastikan Port (3000, 4000, 1883, 8083) dibebaskan..."
lsof -i tcp:3000 | awk 'NR!=1 {print $2}' | xargs kill -9 2>/dev/null || true
lsof -i tcp:4000 | awk 'NR!=1 {print $2}' | xargs kill -9 2>/dev/null || true
lsof -i tcp:1883 | awk 'NR!=1 {print $2}' | xargs kill -9 2>/dev/null || true
lsof -i tcp:8083 | awk 'NR!=1 {print $2}' | xargs kill -9 2>/dev/null || true

echo ""
echo "========================================================"
echo "[SELESAI] Semua proses telah dimatikan dan port sudah bersih!"
echo "Anda sekarang bisa aman menjalankan Mode DEV atau Deploy ulang."
echo "========================================================"
echo ""
