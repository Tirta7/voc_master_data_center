#!/bin/bash
# ╔══════════════════════════════════════════════════════════════╗
# ║         VOC BILLIARD SYSTEM — LINUX INSTALLER v1.0          ║
# ║         Ubuntu / Debian / Raspberry Pi OS                   ║
# ╚══════════════════════════════════════════════════════════════╝
# Jalankan: chmod +x install.sh && sudo ./install.sh

set -e  # Stop jika ada error

# ─────────────────────────────────────────────────────────────
# WARNA OUTPUT
# ─────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

OK()   { echo -e "${GREEN}[OK]${NC} $1"; }
INFO() { echo -e "${BLUE}[>>]${NC} $1"; }
WARN() { echo -e "${YELLOW}[!!]${NC} $1"; }
ERR()  { echo -e "${RED}[ERROR]${NC} $1"; }
STEP() { echo -e "\n${CYAN}${BOLD}══ $1 ══${NC}"; }

# ─────────────────────────────────────────────────────────────
# INTRO
# ─────────────────────────────────────────────────────────────
clear
echo -e "${CYAN}${BOLD}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║         VOC BILLIARD SYSTEM — LINUX INSTALLER               ║"
echo "║         Hybrid IoT Billiard Management Platform             ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo "  Yang akan diinstall:"
echo "   [1] Node.js LTS       [4] Mosquitto MQTT"
echo "   [2] PostgreSQL        [5] PM2 Process Manager"
echo "   [3] Redis             [6] Build & Setup Aplikasi"
echo ""
echo "  Butuh internet. Estimasi waktu: 10-20 menit."
echo ""
read -p "  Lanjutkan? (y/n): " CONFIRM
if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo "  Dibatalkan."
    exit 0
fi

# ─────────────────────────────────────────────────────────────
# CEK ROOT
# ─────────────────────────────────────────────────────────────
if [ "$EUID" -ne 0 ]; then
    ERR "Jalankan sebagai root: sudo ./install.sh"
    exit 1
fi

# Dapatkan user asli (bukan root) untuk jalankan npm
REAL_USER=${SUDO_USER:-$(whoami)}
REAL_HOME=$(eval echo ~$REAL_USER)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

OK "Berjalan sebagai root. User aktif: $REAL_USER"
INFO "Direktori project: $SCRIPT_DIR"

# ─────────────────────────────────────────────────────────────
# UPDATE PACKAGE LIST
# ─────────────────────────────────────────────────────────────
STEP "Update Package List"
apt-get update -qq
OK "Package list diperbarui."

# ─────────────────────────────────────────────────────────────
# STEP 1 — NODE.JS
# ─────────────────────────────────────────────────────────────
STEP "STEP 1/6: Node.js LTS"
if command -v node &>/dev/null; then
    NODE_VER=$(node --version)
    OK "Node.js sudah ada: $NODE_VER"
else
    INFO "Menginstall Node.js LTS via NodeSource..."
    curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
    apt-get install -y nodejs
    NODE_VER=$(node --version)
    OK "Node.js $NODE_VER berhasil diinstall."
fi

# ─────────────────────────────────────────────────────────────
# STEP 2 — POSTGRESQL
# ─────────────────────────────────────────────────────────────
STEP "STEP 2/6: PostgreSQL"
if command -v psql &>/dev/null; then
    PSQL_VER=$(psql --version | awk '{print $3}')
    OK "PostgreSQL sudah ada: v$PSQL_VER"
else
    INFO "Menginstall PostgreSQL..."
    apt-get install -y postgresql postgresql-contrib
    systemctl enable postgresql
    systemctl start postgresql
    OK "PostgreSQL berhasil diinstall."
fi

# Konfigurasi PostgreSQL: buat user & database
INFO "Setup PostgreSQL user & database..."

# Baca DB config dari .env jika ada
DB_PORT=4538
DB_PASSWORD=1
DB_NAME=billiard_db

if [ -f "$SCRIPT_DIR/backend/.env" ]; then
    _PORT=$(grep "^DB_PORT=" "$SCRIPT_DIR/backend/.env" | cut -d'=' -f2)
    _PASS=$(grep "^DB_PASSWORD=" "$SCRIPT_DIR/backend/.env" | cut -d'=' -f2)
    _NAME=$(grep "^DB_DATABASE=" "$SCRIPT_DIR/backend/.env" | cut -d'=' -f2)
    [ -n "$_PORT" ] && DB_PORT=$_PORT
    [ -n "$_PASS" ] && DB_PASSWORD=$_PASS
    [ -n "$_NAME" ] && DB_NAME=$_NAME
fi

INFO "DB Port: $DB_PORT | DB Name: $DB_NAME"

# Set password postgres & port jika belum
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null || true

# Buat database
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME ENCODING 'UTF8';" 2>/dev/null && \
    OK "Database '$DB_NAME' berhasil dibuat." || \
    OK "Database '$DB_NAME' sudah ada."

# Konfigurasi port PostgreSQL
PG_CONF=$(sudo -u postgres psql -c "SHOW config_file;" -t 2>/dev/null | xargs)
if [ -n "$PG_CONF" ] && [ "$DB_PORT" != "5432" ]; then
    INFO "Mengatur PostgreSQL port ke $DB_PORT..."
    sed -i "s/^#*port = .*/port = $DB_PORT/" "$PG_CONF" 2>/dev/null || true
    systemctl restart postgresql 2>/dev/null || true
    OK "PostgreSQL port diset ke $DB_PORT."
fi

# ─────────────────────────────────────────────────────────────
# STEP 3 — REDIS
# ─────────────────────────────────────────────────────────────
STEP "STEP 3/6: Redis"
if command -v redis-server &>/dev/null; then
    OK "Redis sudah ada."
else
    INFO "Menginstall Redis..."
    apt-get install -y redis-server
    systemctl enable redis-server
    systemctl start redis-server
    OK "Redis berhasil diinstall."
fi

# ─────────────────────────────────────────────────────────────
# STEP 4 — MOSQUITTO
# ─────────────────────────────────────────────────────────────
STEP "STEP 4/6: Mosquitto MQTT Broker"
if command -v mosquitto &>/dev/null; then
    OK "Mosquitto sudah ada."
else
    INFO "Menginstall Mosquitto..."
    apt-get install -y mosquitto mosquitto-clients
    OK "Mosquitto berhasil diinstall."
fi

# Salin konfigurasi Mosquitto
if [ -f "$SCRIPT_DIR/mosquitto.conf" ]; then
    cp "$SCRIPT_DIR/mosquitto.conf" /etc/mosquitto/conf.d/voc-billiard.conf
    OK "Konfigurasi Mosquitto disalin."
else
    # Buat konfigurasi default jika tidak ada
    cat > /etc/mosquitto/conf.d/voc-billiard.conf << 'EOF'
listener 1883 0.0.0.0
allow_anonymous true
persistence true
persistence_location /var/lib/mosquitto/
log_type error
log_type warning
log_type notice
EOF
    OK "Konfigurasi Mosquitto default dibuat."
fi

systemctl enable mosquitto
systemctl restart mosquitto
OK "Mosquitto berjalan di port 1883."

# ─────────────────────────────────────────────────────────────
# STEP 5 — PM2
# ─────────────────────────────────────────────────────────────
STEP "STEP 5/6: PM2 Process Manager"
if command -v pm2 &>/dev/null; then
    OK "PM2 sudah ada: $(pm2 --version)"
else
    INFO "Menginstall PM2..."
    npm install -g pm2
    OK "PM2 berhasil diinstall."
fi

# Setup PM2 startup otomatis
INFO "Setup PM2 startup saat boot..."
pm2 startup systemd -u $REAL_USER --hp $REAL_HOME 2>/dev/null || true
OK "PM2 startup dikonfigurasi."

# ─────────────────────────────────────────────────────────────
# STEP 6 — SETUP .ENV
# ─────────────────────────────────────────────────────────────
STEP "STEP 6/6: Konfigurasi .env & Build"

# Backend .env
if [ ! -f "$SCRIPT_DIR/backend/.env" ]; then
    if [ -f "$SCRIPT_DIR/backend/.env.example" ]; then
        cp "$SCRIPT_DIR/backend/.env.example" "$SCRIPT_DIR/backend/.env"
        OK "backend/.env dibuat dari template."
        WARN "Edit backend/.env sesuai konfigurasi Anda!"
    fi
else
    OK "backend/.env sudah ada."
fi

# Frontend .env.local
if [ ! -f "$SCRIPT_DIR/frontend/.env.local" ]; then
    if [ -f "$SCRIPT_DIR/frontend/.env.example" ]; then
        cp "$SCRIPT_DIR/frontend/.env.example" "$SCRIPT_DIR/frontend/.env.local"
        OK "frontend/.env.local dibuat dari template."
    fi
else
    OK "frontend/.env.local sudah ada."
fi

# Update IP otomatis
INFO "Mendeteksi IP server..."
SERVER_IP=$(hostname -I | awk '{print $1}')
if [ -n "$SERVER_IP" ]; then
    INFO "IP Server: $SERVER_IP"
    # Update APP_URL di backend/.env
    if [ -f "$SCRIPT_DIR/backend/.env" ]; then
        sed -i "s|APP_URL=.*|APP_URL=http://$SERVER_IP:4000|" "$SCRIPT_DIR/backend/.env"
        OK "APP_URL diupdate ke http://$SERVER_IP:4000"
    fi
    # Jalankan update_ip.js jika ada
    if [ -f "$SCRIPT_DIR/update_ip.js" ]; then
        sudo -u $REAL_USER node "$SCRIPT_DIR/update_ip.js" 2>/dev/null || true
        OK "IP firmware diupdate."
    fi
fi

# NPM Install & Build Backend
INFO "Backend: npm install..."
cd "$SCRIPT_DIR/backend"
sudo -u $REAL_USER npm install --prefer-offline 2>/dev/null || sudo -u $REAL_USER npm install
INFO "Backend: npm run build..."
sudo -u $REAL_USER npm run build
OK "Backend siap."

# NPM Install & Build Frontend
INFO "Frontend: npm install..."
cd "$SCRIPT_DIR/frontend"
sudo -u $REAL_USER npm install --prefer-offline 2>/dev/null || sudo -u $REAL_USER npm install
INFO "Frontend: npm run build (mohon tunggu ~5 menit)..."
sudo -u $REAL_USER npm run build
OK "Frontend siap."

# ─────────────────────────────────────────────────────────────
# BUAT deploy.sh (linux equivalent of DEPLOY.bat)
# ─────────────────────────────────────────────────────────────
cat > "$SCRIPT_DIR/deploy.sh" << DEPLOYEOF
#!/bin/bash
# VOC Billiard System — Deploy Script (Linux)
set -e
SCRIPT_DIR="\$(cd "\$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
SERVER_IP=\$(hostname -I | awk '{print \$1}')

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║         VOC BILLIARD SYSTEM — DEPLOY                        ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "[>>] Server IP: \$SERVER_IP"

# Update IP
node "\$SCRIPT_DIR/update_ip.js" 2>/dev/null || true

# Start Services
echo "[>>] Memastikan services berjalan..."
sudo systemctl start postgresql 2>/dev/null || true
sudo systemctl start redis-server 2>/dev/null || true
sudo systemctl start mosquitto 2>/dev/null || true

# Stop PM2 proses lama
pm2 delete VOC-Backend VOC-Frontend 2>/dev/null || true

# Start Backend
echo "[>>] Starting Backend..."
cd "\$SCRIPT_DIR/backend"
pm2 start dist/main.js --name VOC-Backend \
    --max-memory-restart 400M \
    --restart-delay 3000 \
    --log "\$SCRIPT_DIR/logs/backend.log"

# Start Frontend
echo "[>>] Starting Frontend..."
cd "\$SCRIPT_DIR/frontend"
pm2 start npm --name VOC-Frontend -- start \
    --max-memory-restart 400M \
    --restart-delay 3000 \
    --log "\$SCRIPT_DIR/logs/frontend.log"

pm2 save

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                 APLIKASI BERJALAN! ✓                        ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Akses dari PC ini : http://localhost:3000                  ║"
echo "║  Akses dari HP/LAN : http://\$SERVER_IP:3000               ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
pm2 list
DEPLOYEOF

chmod +x "$SCRIPT_DIR/deploy.sh"
OK "deploy.sh dibuat."

# Buat factory_reset.sh
cat > "$SCRIPT_DIR/factory_reset.sh" << RESETEOF
#!/bin/bash
# VOC Billiard System — Factory Reset (Linux)
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║            ⚠  VOC BILLIARD — FACTORY RESET  ⚠              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
read -p "  Ketik HAPUS untuk konfirmasi: " C1
[[ "\$C1" != "HAPUS" ]] && echo "Dibatalkan." && exit 0
read -p "  Apakah YAKIN? Ketik YA: " C2
[[ "\$C2" != "YA" ]] && echo "Dibatalkan." && exit 0

SCRIPT_DIR="\$(cd "\$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
DB_PORT=\$(grep "^DB_PORT=" "\$SCRIPT_DIR/backend/.env" | cut -d'=' -f2)
DB_PORT=\${DB_PORT:-4538}
TIMESTAMP=\$(date +%Y%m%d_%H%M%S)

echo "[>>] Stop PM2..."
pm2 stop all 2>/dev/null; pm2 delete all 2>/dev/null

echo "[>>] Backup database..."
sudo -u postgres pg_dump -p \$DB_PORT billiard_db > "\$SCRIPT_DIR/backup_before_reset_\$TIMESTAMP.sql" 2>/dev/null && \
    echo "[OK] Backup: backup_before_reset_\$TIMESTAMP.sql" || echo "[!] Backup gagal, lanjut."

echo "[>>] Drop & recreate database..."
sudo -u postgres psql -p \$DB_PORT -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='billiard_db';" 2>/dev/null
sudo -u postgres psql -p \$DB_PORT -c "DROP DATABASE IF EXISTS billiard_db;" && \
sudo -u postgres psql -p \$DB_PORT -c "CREATE DATABASE billiard_db ENCODING 'UTF8';"

echo "[>>] Flush Redis..."
redis-cli FLUSHALL 2>/dev/null || true

echo "[>>] Hapus sesi WhatsApp..."
rm -rf "\$SCRIPT_DIR/backend/auth_info_baileys"/*

echo "[>>] Restart aplikasi..."
bash "\$SCRIPT_DIR/deploy.sh"

echo ""
echo "  Factory Reset selesai! Login: admin / 123"
RESETEOF

chmod +x "$SCRIPT_DIR/factory_reset.sh"
OK "factory_reset.sh dibuat."

# Fix permissions
chown -R $REAL_USER:$REAL_USER "$SCRIPT_DIR/backend/node_modules" 2>/dev/null || true
chown -R $REAL_USER:$REAL_USER "$SCRIPT_DIR/frontend/node_modules" 2>/dev/null || true
chown -R $REAL_USER:$REAL_USER "$SCRIPT_DIR/backend/dist" 2>/dev/null || true
chown -R $REAL_USER:$REAL_USER "$SCRIPT_DIR/frontend/.next" 2>/dev/null || true

mkdir -p "$SCRIPT_DIR/logs"
chown $REAL_USER:$REAL_USER "$SCRIPT_DIR/logs"

# ─────────────────────────────────────────────────────────────
# SELESAI
# ─────────────────────────────────────────────────────────────
cd "$SCRIPT_DIR"
echo ""
echo -e "${GREEN}${BOLD}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                  INSTALASI SELESAI! ✓                       ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║                                                              ║"
echo "║  SEBELUM menjalankan, edit file:                            ║"
echo "║    backend/.env  → isi DB_PASSWORD, FONNTE_TOKEN            ║"
echo "║                                                              ║"
echo "║  Cara menjalankan aplikasi:                                 ║"
echo "║    ./deploy.sh                                              ║"
echo "║                                                              ║"
echo "║  Cara factory reset:                                        ║"
echo "║    ./factory_reset.sh                                       ║"
echo "║                                                              ║"
echo "║  Akses: http://$(hostname -I | awk '{print $1}'):3000                       ║"
echo "║  Login: admin / 123                                         ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
read -p "  Jalankan aplikasi sekarang? (y/n): " RUN_NOW
if [[ "$RUN_NOW" =~ ^[Yy]$ ]]; then
    sudo -u $REAL_USER bash "$SCRIPT_DIR/deploy.sh"
fi
