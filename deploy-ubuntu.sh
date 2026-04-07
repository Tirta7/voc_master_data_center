#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# VOC BILLIARD SYSTEM — Ubuntu Auto-Install + Deploy Script
# Jalankan: chmod +x deploy-ubuntu.sh && sudo ./deploy-ubuntu.sh
# ═══════════════════════════════════════════════════════════════

set -e  # Hentikan script jika ada error

# ── Warna terminal ───────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# ── Banner ───────────────────────────────────────────────────
echo -e "${CYAN}${BOLD}"
echo "  ██╗   ██╗ ██████╗  ██████╗     ██████╗ ██╗██╗     ██╗      █████╗ ██████╗ ██████╗ "
echo "  ██║   ██║██╔═══██╗██╔════╝     ██╔══██╗██║██║     ██║     ██╔══██╗██╔══██╗██╔══██╗"
echo "  ██║   ██║██║   ██║██║          ██████╔╝██║██║     ██║     ███████║██████╔╝██║  ██║"
echo "  ╚██╗ ██╔╝██║   ██║██║          ██╔══██╗██║██║     ██║     ██╔══██║██╔══██╗██║  ██║"
echo "   ╚████╔╝ ╚██████╔╝╚██████╗     ██████╔╝██║███████╗███████╗██║  ██║██║  ██║██████╔╝"
echo "    ╚═══╝   ╚═════╝  ╚═════╝     ╚═════╝ ╚═╝╚══════╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ "
echo -e "${NC}"
echo -e "${BOLD}  Billiard Management System — Ubuntu Installer${NC}"
echo -e "  ─────────────────────────────────────────────────────"
echo ""

# ── Deteksi user yang menjalankan ────────────────────────────
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}❌ Harap jalankan dengan sudo: sudo ./deploy-ubuntu.sh${NC}"
  exit 1
fi

REAL_USER="${SUDO_USER:-$(whoami)}"
HOME_DIR=$(getent passwd "$REAL_USER" | cut -d: -f6)
APP_DIR="$HOME_DIR/voc_billiard"

echo -e "${BLUE}📋 Konfigurasi:${NC}"
echo -e "   User      : ${REAL_USER}"
echo -e "   Install ke: ${APP_DIR}"
echo ""

# ═══════════════════════════════════════════════════════════════
# STEP 1: Install Docker Engine
# ═══════════════════════════════════════════════════════════════
install_docker() {
  echo -e "${YELLOW}[1/6] 🐳 Menginstall Docker Engine...${NC}"

  if command -v docker &> /dev/null; then
    echo -e "${GREEN}      ✔ Docker sudah terinstall: $(docker --version)${NC}"
    return
  fi

  # Hapus versi lama jika ada
  apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

  # Install prerequisites
  apt-get update -qq
  apt-get install -y -qq \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

  # Tambah Docker GPG key
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg

  # Tambah Docker repository
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
    | tee /etc/apt/sources.list.d/docker.list > /dev/null

  # Install Docker
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

  # Jalankan Docker service
  systemctl enable docker
  systemctl start docker

  # Tambah user ke group docker (tidak perlu sudo tiap kali)
  usermod -aG docker "$REAL_USER"

  echo -e "${GREEN}      ✔ Docker berhasil diinstall: $(docker --version)${NC}"
}

# ═══════════════════════════════════════════════════════════════
# STEP 2: Clone / Update repository dari GitHub
# ═══════════════════════════════════════════════════════════════
setup_repo() {
  echo -e "${YELLOW}[2/6] 📥 Clone / Update repository...${NC}"

  if [ -d "$APP_DIR/.git" ]; then
    echo -e "      Repo sudah ada, melakukan git pull..."
    cd "$APP_DIR"
    sudo -u "$REAL_USER" git pull origin main || sudo -u "$REAL_USER" git pull origin master
  else
    echo -e "      Cloning dari GitHub..."
    sudo -u "$REAL_USER" git clone https://github.com/Tirta7/voc_master_data_center.git "$APP_DIR"
    cd "$APP_DIR"
  fi

  echo -e "${GREEN}      ✔ Repository siap di: ${APP_DIR}${NC}"
}

# ═══════════════════════════════════════════════════════════════
# STEP 3: Setup file .env
# ═══════════════════════════════════════════════════════════════
setup_env() {
  echo -e "${YELLOW}[3/6] ⚙️  Setup Environment (.env)...${NC}"
  cd "$APP_DIR"

  if [ -f ".env" ]; then
    echo -e "${GREEN}      ✔ File .env sudah ada, dilewati.${NC}"
    return
  fi

  # Deteksi IP lokal otomatis
  LOCAL_IP=$(hostname -I | awk '{print $1}')

  # Salin template
  cp .env.docker .env

  # Ganti SERVER_IP dengan IP yang terdeteksi
  sed -i "s/192.168.1.100/${LOCAL_IP}/g" .env

  # Tanya password DB
  echo ""
  echo -e "${CYAN}  🔐 Masukkan password untuk PostgreSQL (tekan Enter untuk default 'Billiard2025!'):${NC}"
  read -r -s DB_PASS
  DB_PASS="${DB_PASS:-Billiard2025!}"
  sed -i "s/GantiDenganPasswordKuat123!/${DB_PASS}/g" .env

  chown "$REAL_USER":"$REAL_USER" .env
  chmod 600 .env

  echo ""
  echo -e "${GREEN}      ✔ File .env dibuat dengan IP: ${LOCAL_IP}${NC}"
  echo -e "${BLUE}      💡 Edit manual jika diperlukan: nano ${APP_DIR}/.env${NC}"
}

# ═══════════════════════════════════════════════════════════════
# STEP 4: Build dan jalankan semua container
# ═══════════════════════════════════════════════════════════════
deploy_containers() {
  echo -e "${YELLOW}[4/6] 🏗️  Build Docker images (ini bisa 5-15 menit)...${NC}"
  cd "$APP_DIR"

  # Pull image-image yang sudah ada (postgres, redis, mosquitto)
  docker compose pull postgres redis mosquitto

  # Build backend dan frontend
  docker compose build --no-cache

  echo ""
  echo -e "${YELLOW}[5/6] 🚀 Menjalankan semua container...${NC}"
  docker compose up -d

  # Tunggu semua service sehat
  echo -e "      Menunggu services siap..."
  sleep 15

  echo -e "${GREEN}      ✔ Semua container dijalankan!${NC}"
}

# ═══════════════════════════════════════════════════════════════
# STEP 5: Setup auto-start saat Ubuntu reboot
# ═══════════════════════════════════════════════════════════════
setup_autostart() {
  echo -e "${YELLOW}[6/6] 🔄 Setup auto-start saat reboot...${NC}"

  # Buat systemd service
  cat > /etc/systemd/system/voc-billiard.service << EOF
[Unit]
Description=VOC Billiard Management System
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=${APP_DIR}
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=300
User=root

[Install]
WantedBy=multi-user.target
EOF

  systemctl daemon-reload
  systemctl enable voc-billiard.service

  echo -e "${GREEN}      ✔ Auto-start aktif. Aplikasi akan otomatis jalan saat Ubuntu hidup.${NC}"
}

# ═══════════════════════════════════════════════════════════════
# STEP 6: Tampilkan status dan informasi akses
# ═══════════════════════════════════════════════════════════════
show_status() {
  cd "$APP_DIR"
  LOCAL_IP=$(hostname -I | awk '{print $1}')

  echo ""
  echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════${NC}"
  echo -e "${GREEN}${BOLD}  ✅ VOC BILLIARD SYSTEM BERHASIL DIDEPLOY!${NC}"
  echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════${NC}"
  echo ""
  echo -e "${BOLD}  🌐 Akses Aplikasi:${NC}"
  echo -e "     Frontend  : ${GREEN}http://${LOCAL_IP}:3000${NC}"
  echo -e "     Backend   : ${GREEN}http://${LOCAL_IP}:4000${NC}"
  echo -e "     MQTT TCP  : ${GREEN}${LOCAL_IP}:1883${NC}  (untuk ESP32)"
  echo -e "     MQTT WS   : ${GREEN}ws://${LOCAL_IP}:8083${NC} (untuk browser)"
  echo ""
  echo -e "${BOLD}  🔧 Perintah penting:${NC}"
  echo -e "     Lihat status  : ${YELLOW}docker compose -f ${APP_DIR}/docker-compose.yml ps${NC}"
  echo -e "     Lihat log     : ${YELLOW}docker compose -f ${APP_DIR}/docker-compose.yml logs -f${NC}"
  echo -e "     Restart semua : ${YELLOW}docker compose -f ${APP_DIR}/docker-compose.yml restart${NC}"
  echo -e "     Stop semua    : ${YELLOW}docker compose -f ${APP_DIR}/docker-compose.yml down${NC}"
  echo -e "     Update app    : ${YELLOW}cd ${APP_DIR} && git pull && docker compose up -d --build${NC}"
  echo ""
  echo -e "${BOLD}  📊 Status Container:${NC}"
  docker compose ps
  echo ""
  echo -e "${BLUE}  💡 Log out dan login ulang Ubuntu agar perintah 'docker' bisa dipakai tanpa sudo${NC}"
  echo ""
}

# ═══════════════════════════════════════════════════════════════
# MAIN — Jalankan semua step
# ═══════════════════════════════════════════════════════════════
main() {
  install_docker
  setup_repo
  setup_env
  deploy_containers
  setup_autostart
  show_status
}

main "$@"
