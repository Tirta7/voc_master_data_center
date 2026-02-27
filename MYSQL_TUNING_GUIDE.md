# MySQL Configuration Tuning Guide
## Untuk Local Server Billiard App — Windows

### Langkah Setup

1. Buka file `my.ini` di lokasi MySQL Anda:
   - Default: `C:\ProgramData\MySQL\MySQL Server 8.0\my.ini`
   - Atau: `C:\Program Files\MySQL\MySQL Server 8.0\my.ini`

2. Tambahkan/edit bagian `[mysqld]` berikut:

```ini
[mysqld]

# ─── MEMORY ───────────────────────────────────────────────
# Gunakan 25-30% dari total RAM server
# Contoh jika RAM 4 GB → 1G, RAM 8 GB → 2G
innodb_buffer_pool_size = 512M

# Untuk server dengan lebih banyak RAM, aktifkan multiple pool instances
# innodb_buffer_pool_instances = 2

# ─── QUERY CACHE ──────────────────────────────────────────
# Cache hasil query yang sama (read-heavy workload)
query_cache_type = 1
query_cache_size = 64M
query_cache_limit = 2M

# ─── CONNECTIONS ──────────────────────────────────────────
# Maksimum koneksi bersamaan (sesuaikan dengan kebutuhan)
max_connections = 50

# Timeout koneksi idle (detik)
wait_timeout = 600
interactive_timeout = 600

# ─── LOG KINERJA (OPSIONAL tapi direkomendasikan) ─────────
# Log query yang lambat (> 2 detik) untuk debugging
slow_query_log = 1
slow_query_log_file = C:/ProgramData/MySQL/slow-queries.log
long_query_time = 2

# ─── BINARY LOG ───────────────────────────────────────────
# Hapus binary log otomatis setelah 7 hari (hemat disk)
expire_logs_days = 7

# ─── INNODB SETTINGS ──────────────────────────────────────
# Flush ke disk setiap commit (aman, tapi sedikit lebih lambat)
innodb_flush_log_at_trx_commit = 1

# File per tabel (easier maintenance)
innodb_file_per_table = 1
```

3. **Restart MySQL service** setelah mengubah config:
   - Buka **Services** (Win+R → `services.msc`)
   - Cari **MySQL80** → klik kanan → **Restart**

### Cara Setup Backup Otomatis di Windows Task Scheduler

1. Buka **Task Scheduler** (Win+R → `taskschd.msc`)
2. Klik **Create Basic Task**
3. Isi nama: `Billiard DB Backup`
4. Trigger: **Daily** → jam **02:00 AM**
5. Action: **Start a program**
   - Program: `D:\Billiard_APPS\backup_db.bat`
6. Aktifkan: **Run whether user is logged on or not**
7. Centang: **Run with highest privileges**

### Verifikasi Setup

Test script manual pertama kali:
```
D:\Billiard_APPS\backup_db.bat
```

Cek log:
```
D:\Billiard_APPS\backups\backup_log.txt
```
