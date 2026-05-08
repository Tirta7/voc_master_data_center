"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "AttendanceService", {
    enumerable: true,
    get: function() {
        return AttendanceService;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _typeorm1 = require("typeorm");
const _attendanceentity = require("./entities/attendance.entity");
const _employeeshiftscheduleentity = require("./entities/employee-shift-schedule.entity");
const _userentity = require("../user/entities/user.entity");
const _settingsservice = require("../settings/settings.service");
const _eventsgateway = require("../socket/events.gateway");
const _schedule = require("@nestjs/schedule");
const _holidayentity = require("../settings/entities/holiday.entity");
const _violationentity = require("../user/entities/violation.entity");
const _payrollconfigentity = require("../user/entities/payroll-config.entity");
const _mqttservice = require("../mqtt/mqtt.service");
const _userservice = require("../user/user.service");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
function _ts_param(paramIndex, decorator) {
    return function(target, key) {
        decorator(target, key, paramIndex);
    };
}
let AttendanceService = class AttendanceService {
    onModuleInit() {
        this.logger.log('--- RFID Attendance Listener Registered ---');
        // ─── ATTENDANCE LIST REQUEST HANDLER (HIGH PRIORITY) ───
        this.mqttService.subscribe('billiard/attendance/request_list', async (topic, payload)=>{
            try {
                const msg = payload.toString().trim();
                this.logger.log(`[LIST] Request received: "${msg}"`);
                if (!msg.includes('GET_LIST')) return;
                const logicalDate = await this.getLogicalDateString();
                this.logger.log(`[LIST] Fetching attendance for operational date: ${logicalDate}`);
                const logs = await this.attendanceRepository.createQueryBuilder('log').leftJoinAndSelect('log.user', 'user').where('log.date = :logicalDate', {
                    logicalDate
                }).select([
                    'log.id',
                    'log.checkInTime',
                    'log.checkOutTime',
                    'log.shiftName',
                    'log.status',
                    'log.workDurationMinutes',
                    'log.overtimeMinutes',
                    'log.date',
                    'user.id',
                    'user.name'
                ]).orderBy('log.checkInTime', 'DESC').take(10) // Show up to 10 for more info
                .getMany();
                let highlightedIndex = -1;
                const listData = logs.map((log, index)=>{
                    if (log.user.id === this.lastIdentifiedUserId) {
                        highlightedIndex = index;
                    }
                    const formatTime = (date)=>date ? new Date(date).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                        }) : '-';
                    // Mapping Shift sesuai Pengaturan Sistem (SHIFT 1, SHIFT 2, OVERTIME)
                    let shiftDisplay = '-';
                    const sName = (log.shiftName || '').toUpperCase();
                    if (sName.includes('SHIFT 1')) shiftDisplay = '1';
                    else if (sName.includes('SHIFT 2')) shiftDisplay = '2';
                    else if (sName.includes('OVERTIME')) shiftDisplay = '3';
                    else if (log.shiftName) shiftDisplay = log.shiftName.substring(0, 1);
                    // Formatting Durasi (DUR)
                    let durDisplay = '-';
                    if (log.workDurationMinutes) {
                        const h = Math.floor(log.workDurationMinutes / 60);
                        const m = log.workDurationMinutes % 60;
                        durDisplay = h > 0 ? `${h}h${m > 0 ? m + 'm' : ''}` : `${m}m`;
                    }
                    // Formatting Lembur (OVT)
                    let ovtDisplay = '-';
                    if (log.overtimeMinutes && log.overtimeMinutes > 0) {
                        const oh = Math.floor(log.overtimeMinutes / 60);
                        const om = log.overtimeMinutes % 60;
                        ovtDisplay = oh > 0 ? `${oh}h${om > 0 ? om + 'm' : ''}` : `${om}m`;
                    }
                    return {
                        date: log.date.split('-').slice(1).join('/'),
                        name: log.user.name.split(' ')[0].toUpperCase(),
                        shift: shiftDisplay,
                        in: formatTime(log.checkInTime),
                        out: log.checkOutTime ? formatTime(log.checkOutTime) : 'DUTY',
                        dur: durDisplay,
                        ovt: ovtDisplay,
                        status: log.status
                    };
                });
                const listPayload = {
                    type: 'LIST_DATA',
                    list: listData,
                    highlight: highlightedIndex
                };
                // JANGAN kirim list jika sedang registrasi (agar layar TFT tidak tertutup)
                if (this.isRegistrationActive) {
                    this.logger.log(`[LIST] Skipping list update because registration is active.`);
                } else {
                    this.mqttService.publish('billiard/attendance/feedback', listPayload);
                    this.logger.log(`[LIST] Sent ${listData.length} records with highlight index: ${highlightedIndex}`);
                }
            } catch (e) {
                this.logger.error(`[LIST REQUEST] Failed: ${e.message}`);
            }
        });
        this.mqttService.subscribe('billiard/attendance/scan', async (topic, payload)=>{
            if (topic === 'billiard/attendance/scan') {
                try {
                    const rawStr = payload.toString();
                    this.logger.log(`[RFID] Raw data: ${rawStr}`);
                    const data = JSON.parse(rawStr);
                    const uid = data.uid?.trim()?.toUpperCase();
                    const uidNoColons = uid?.replace(/:/g, '');
                    if (!uid) {
                        this.logger.warn(`[RFID] UID tidak ditemukan dalam payload.`);
                        return;
                    }
                    this.logger.log(`[RFID] Sinyal masuk: ${uid} (Stripped: ${uidNoColons})`);
                    this.eventsGateway.attendanceUpdated({
                        type: 'RFID_ATTEMPT',
                        data: {
                            uid
                        }
                    });
                    // ─── SPECIAL MODE: REGISTRASI ───
                    if (data.mode === 'REGISTRASI') {
                        this.logger.log(`[RFID] Registration Mode Triggered for UID: ${uid}`);
                        this.eventsGateway.attendanceUpdated({
                            type: 'RFID_REGISTRATION_MODE',
                            data: {
                                uid
                            }
                        });
                        this.mqttService.publish('billiard/attendance/feedback', {
                            name: "REGISTRASI",
                            status: "UID: " + uid,
                            msg: "READY"
                        });
                        return;
                    }
                    // ─── USER IDENTIFICATION ───
                    let user = null;
                    const isFingerprint = uid.startsWith('FINGER_');
                    if (isFingerprint) {
                        this.logger.log(`[BIOMETRIC] Identification attempt for Finger: ${uid}`);
                        const fingerIdOnly = uid.replace('FINGER_', '').trim();
                        user = await this.userRepository.createQueryBuilder('user').leftJoinAndSelect('user.role', 'role').where('user.fingerprintData = :id', {
                            id: fingerIdOnly
                        }).orWhere('user.fingerprintData LIKE :start', {
                            start: `${fingerIdOnly},%`
                        }).orWhere('user.fingerprintData LIKE :mid', {
                            mid: `%,${fingerIdOnly},%`
                        }).orWhere('user.fingerprintData LIKE :end', {
                            end: `%,${fingerIdOnly}`
                        }).getOne();
                    } else {
                        // Coba cari dengan format asli ATAU format tanpa titik dua di kolom PIN atau RFID
                        user = await this.userRepository.createQueryBuilder('user').leftJoinAndSelect('user.role', 'role').where('TRIM(UPPER(user.pin)) = :uid OR TRIM(UPPER(user.pin)) = :uidNoColons', {
                            uid,
                            uidNoColons
                        }).orWhere('TRIM(UPPER(user.rfid)) = :uid OR TRIM(UPPER(user.rfid)) = :uidNoColons', {
                            uid,
                            uidNoColons
                        }).getOne();
                    }
                    if (!user) {
                        const ident = isFingerprint ? `FINGER: ${uid.replace('FINGER_', '')}` : `UID: ${uid}`;
                        this.logger.warn(`[ATTENDANCE] User with ${ident} not found.`);
                        this.mqttService.publish('billiard/attendance/feedback', {
                            name: isFingerprint ? 'JARI BARU' : 'KARTU BARU',
                            status: 'BELUM TERDAFTAR',
                            msg: 'REGISTER NOW'
                        });
                        this.eventsGateway.attendanceUpdated({
                            type: isFingerprint ? 'FINGERPRINT_NOT_FOUND' : 'RFID_NOT_FOUND',
                            data: {
                                uid
                            }
                        });
                        return;
                    }
                    if (user.isVerified === false) {
                        this.logger.warn(`[ATTENDANCE] User ${user.name} rejected: Account is UNVERIFIED`);
                        this.mqttService.publish('billiard/attendance/feedback', {
                            name: user.name.substring(0, 16),
                            status: 'UNVERIFIED',
                            msg: 'REJECTED'
                        });
                        return;
                    }
                    // ─── SECURITY MODE ENFORCEMENT ───
                    if (user.securityMode === 'RFID_ONLY' && isFingerprint) {
                        this.logger.warn(`[ATTENDANCE] User ${user.name} rejected: Policy is RFID_ONLY`);
                        this.mqttService.publish('billiard/attendance/feedback', {
                            name: user.name.substring(0, 16),
                            status: 'RFID ONLY',
                            msg: 'REJECTED'
                        });
                        return;
                    }
                    if (user.securityMode === 'FINGERPRINT_ONLY' && !isFingerprint) {
                        this.logger.warn(`[ATTENDANCE] User ${user.name} rejected: Policy is FINGERPRINT_ONLY`);
                        this.mqttService.publish('billiard/attendance/feedback', {
                            name: user.name.substring(0, 16),
                            status: 'SIDIK JARI ONLY',
                            msg: 'REJECTED'
                        });
                        return;
                    }
                    // ─── DUAL SECURITY ENFORCEMENT ───
                    const now = Date.now();
                    const currentFactor = isFingerprint ? 'FINGER' : 'RFID';
                    // 1. Check if we are in the middle of a DUAL session (from anyone)
                    if (this.activeDualSession && now - this.activeDualSession.timestamp < 30000) {
                        const session = this.activeDualSession;
                        if (session.userId === user.id && session.type !== currentFactor) {
                            // SUCCESS: Mismatch resolved (Card + Finger match for same user)
                            this.logger.log(`[ATTENDANCE] Dual Factor Authenticated for ${user.name}`);
                            this.activeDualSession = null;
                        } else if (session.userId === user.id && session.type === currentFactor) {
                            // Same factor scanned twice - ignore or prompt
                            return;
                        } else {
                            // MISMATCH: The second factor belongs to a different user OR factor type is wrong
                            this.logger.warn(`[ATTENDANCE] Dual Mismatch: Session for ${session.userId}, but ${currentFactor} belongs to ${user.name}`);
                            // Log Violation
                            await this.userRepository.query(`INSERT INTO violation (userId, type, description, penaltyAmount, createdAt, updatedAt) 
                 VALUES (?, 'SECURITY_VIOLATION', ?, 10000, NOW(), NOW())`, [
                                session.userId,
                                `Percobaan Dual Security Gagal: ${isFingerprint ? 'JARI' : 'KARTU'} TIDAK COCOK.`
                            ]).catch((err)=>this.logger.error(`Violation Log Error: ${err.message}`));
                            this.mqttService.publish('billiard/attendance/feedback', {
                                name: user.name.substring(0, 16).toUpperCase(),
                                status: isFingerprint ? 'JARI TIDAK COCOK' : 'KARTU TIDAK COCOK',
                                msg: 'REJECTED'
                            });
                            this.activeDualSession = null; // Clear session on failure
                            return;
                        }
                    } else if (user.securityMode === 'DUAL') {
                        // 2. Start a new DUAL session if user requires it
                        this.activeDualSession = {
                            userId: user.id,
                            type: currentFactor,
                            timestamp: now
                        };
                        const needed = isFingerprint ? 'TAP KARTU' : 'SCAN JARI';
                        const welcomeMsg = `HALO ${user.name.split(' ')[0].toUpperCase()}`;
                        this.logger.log(`[ATTENDANCE] User ${user.name} provided ${currentFactor}, waiting for ${needed}`);
                        this.mqttService.publish('billiard/attendance/feedback', {
                            name: welcomeMsg,
                            status: needed + '...',
                            msg: 'DUAL MODE'
                        });
                        return;
                    }
                    this.mqttService.publish('billiard/attendance/feedback', {
                        name: user.name.substring(0, 16).toUpperCase(),
                        status: isFingerprint ? `COCOK (${user.name.toUpperCase()})` : 'TERDETEKSI',
                        msg: user.role?.name || 'Staff'
                    });
                    this.lastIdentifiedUserId = user.id;
                    this.eventsGateway.attendanceUpdated({
                        type: 'USER_IDENTIFIED',
                        data: {
                            name: user.name,
                            uid,
                            userId: user.id,
                            photo: user.photo || null,
                            role: user.role?.name || 'Staff'
                        }
                    });
                    // ─── PROCESS ATTENDANCE (Auto-Mode Detection or Manual Override) ───
                    const today = await this.getLogicalDateString();
                    const existing = await this.attendanceRepository.findOne({
                        where: {
                            userId: user.id,
                            date: today
                        }
                    });
                    // Determine Action: respect hardware mode or auto-detect if IDLE
                    let action = 'CHECKIN';
                    if (data.mode === 'CHECKIN') action = 'CHECKIN';
                    else if (data.mode === 'CHECKOUT') action = 'CHECKOUT';
                    else {
                        // Auto-Mode (Tap & Go)
                        if (!existing || !existing.checkInTime) action = 'CHECKIN';
                        else if (!existing.checkOutTime) action = 'CHECKOUT';
                        else action = 'ALREADY_FINISHED';
                    }
                    if (action === 'CHECKIN') {
                        this.logger.log(`[ATTENDANCE] Processing CHECK-IN for ${user.name} (${data.mode === 'IDLE' ? 'AUTO' : 'MANUAL'})`);
                        await this.checkIn(user.id).catch((err)=>{
                            this.logger.error(`[ATTENDANCE] Check-in Fail: ${err.message}`);
                            const timeMatch = err.message.match(/\d{2}[:.]\d{2}/);
                            const timeStr = timeMatch ? timeMatch[0] : "";
                            this.mqttService.publish('billiard/attendance/feedback', {
                                name: user.name.substring(0, 16).toUpperCase(),
                                status: timeStr ? `DONE IN ${timeStr}` : 'GAGAL CHECK-IN',
                                msg: 'REJECTED'
                            });
                        });
                    } else if (action === 'CHECKOUT') {
                        this.logger.log(`[ATTENDANCE] Processing CHECK-OUT for ${user.name} (${data.mode === 'IDLE' ? 'AUTO' : 'MANUAL'})`);
                        await this.checkOut(user.id).catch((err)=>{
                            this.logger.error(`[ATTENDANCE] Check-out Fail: ${err.message}`);
                            const timeMatch = err.message.match(/\d{2}[:.]\d{2}/);
                            const timeStr = timeMatch ? timeMatch[0] : "";
                            this.mqttService.publish('billiard/attendance/feedback', {
                                name: user.name.substring(0, 16).toUpperCase(),
                                status: timeStr ? `DONE OUT ${timeStr}` : 'GAGAL CHECK-OUT',
                                msg: 'REJECTED'
                            });
                        });
                    } else if (action === 'ALREADY_FINISHED') {
                        this.logger.log(`[ATTENDANCE] ${user.name} already finished for today.`);
                        this.mqttService.publish('billiard/attendance/feedback', {
                            name: user.name.substring(0, 16).toUpperCase(),
                            status: 'SUDAH SELESAI',
                            msg: 'SAMPAI JUMPA'
                        });
                    }
                } catch (e) {
                    this.logger.error(`[RFID] Internal Error: ${e.message}`);
                    this.mqttService.publish('billiard/attendance/feedback', {
                        name: 'ERROR SYSTEM',
                        status: 'REJECTED'
                    });
                }
            }
        });
        // ─── BIOMETRIC STATUS BRIDGE ───
        this.mqttService.subscribe('billiard/attendance/status', async (topic, payload)=>{
            try {
                const data = JSON.parse(payload.toString());
                this.logger.log(`[BIOMETRIC] Status received: ${JSON.stringify(data)}`);
                // Handle successful data upload from hardware
                if (data.type === 'FINGERPRINT_DATA_UPLOAD' && data.uid) {
                    // Extract numeric ID from "FINGER_35" -> 35
                    const hardwareId = data.uid.includes('_') ? data.uid.split('_')[1] : data.uid;
                    this.logger.log(`[BIOMETRIC] Saving Hardware Slot: ${hardwareId}`);
                // We look for the user who is currently in registration mode
                // (In a real system, you'd track this via state, here we'll assume the last active user or pass userId in payload)
                // For now, let's just emit and let frontend handle the "Commit" logic
                }
                this.eventsGateway.server.emit('biometric_data', data);
            } catch (e) {
                this.logger.error(`[BIOMETRIC] Error parsing status: ${e.message}`);
            }
        });
    }
    async processCommand(userId, type, data) {
        this.logger.log(`[COMMAND] Executing ${type} for User: ${userId}`);
        if (type === 'CAPTURE_FINGERPRINT' || type === 'START_FINGERPRINT_BATCH') {
            this.mqttService.publish('billiard/attendance/feedback', {
                type: type === 'START_FINGERPRINT_BATCH' ? 'START_FINGERPRINT_BATCH' : 'CAPTURE_FINGERPRINT',
                userId,
                // Removed: id: data?.id || parseInt(userId) || 0,
                ...data
            });
            return {
                success: true,
                message: 'Biometric command sent to hardware'
            };
        }
        if (type === 'START_RFID_REGISTRATION') {
            // Aktifkan Lock Registrasi di backend
            await this.sendLcdPrompt('REGISTRATION');
            this.mqttService.publish('billiard/attendance/feedback', {
                type: 'REGISTRATION_MODE',
                userId
            });
            return {
                status: 'COMMAND_SENT'
            };
        }
        if (type === 'RESET_DEVICE') {
            // Lepas Lock Registrasi
            await this.sendLcdPrompt('RESET');
            this.mqttService.publish('billiard/attendance/feedback', {
                name: 'RESET',
                status: 'RESET'
            });
            return {
                success: true
            };
        }
        if (type === 'CLEAR_ALL_BIOMETRICS') {
            this.logger.warn(`[COMMAND] SYSTEM-WIDE BIOMETRIC CLEAR TRIGGERED - PERFORMING OPTIMIZED WIPE`);
            // 1. Clear database for all users
            await this.userRepository.createQueryBuilder().update(_userentity.User).set({
                fingerprintData: null
            }).where("1 = 1").execute();
            // 2. Perform sequential wipe of slots 1-50
            const topic = 'billiard/attendance/feedback';
            for(let i = 1; i <= 50; i++){
                this.mqttService.publish(topic, {
                    type: 'DELETE_ID',
                    id: i,
                    command: 'DELETE',
                    name: 'SYSTEM WIPE',
                    msg: `ID ${i}`,
                    status: `CLEANING ${i}/50`
                });
            }
            // 3. Send final RESET to stop the display loop
            setTimeout(()=>{
                this.mqttService.publish(topic, {
                    type: 'RESET',
                    name: 'SYSTEM READY',
                    status: 'IDLE',
                    msg: 'READY TO SCAN'
                });
            }, 1500);
            return {
                success: true,
                message: 'Optimized sequential wipe broadcasted'
            };
        }
        throw new _common.BadRequestException(`Unknown command type: ${type}`);
    }
    // ─────────────────────────────────────────────────────────────────────────────
    // HELPERS: Logical Date & Shift Definitions
    // ─────────────────────────────────────────────────────────────────────────────
    /**
   * Determine the "Operational Date" (Logical Date) based on businessDayOffset.
   * If current time is before the offset (e.g., 03:00 AM while offset is 10:00 AM),
   * it counts as the previous calendar day's operational period.
   */ async getLogicalDateString(now) {
        const settings = await this.settingsService.getSettings();
        const offset = settings?.businessDayOffset || '10:00';
        const [h, m] = offset.split(':').map(Number);
        const target = now || new Date();
        const logical = new Date(target);
        const cutoff = new Date(target);
        cutoff.setHours(h, m, 0, 0);
        if (target < cutoff) {
            logical.setDate(logical.getDate() - 1);
        }
        const year = logical.getFullYear();
        const month = String(logical.getMonth() + 1).padStart(2, '0');
        const day = String(logical.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    /**
   * Parse available shifts from settings and determine if a shift crosses midnight.
   */ async getAvailableShiftDefs() {
        const settings = await this.settingsService.getSettings();
        const raw = settings?.availableShifts || [];
        return raw.map((s)=>{
            const [sh, sm] = s.startTime.split(':').map(Number);
            const [eh, em] = s.endTime.split(':').map(Number);
            const startMins = sh * 60 + sm;
            const endMins = eh * 60 + em;
            return {
                name: s.name,
                startTime: s.startTime,
                endTime: s.endTime,
                crossesMidnight: endMins < startMins
            };
        });
    }
    /**
   * Get the shift definition assigned to an employee for a specific logical date.
   * Priority: employee_shift_schedules → user.baseShift fallback → null
   */ async getShiftForEmployee(userId, logicalDate) {
        const shiftDefs = await this.getAvailableShiftDefs();
        // 1. Check explicit schedule for this date
        const schedule = await this.scheduleRepository.findOne({
            where: {
                userId,
                date: logicalDate
            }
        });
        let shiftName = null;
        if (schedule) {
            shiftName = schedule.shiftName;
        } else {
            // 2. Fallback to user's baseShift (stored as shift name, e.g. "SHIFT1")
            const user = await this.userRepository.findOne({
                where: {
                    id: userId
                }
            });
            if (user?.baseShift) {
                // baseShift could be "SHIFT1" or old format "10:00 - 17:00"
                if (user.baseShift.includes(' - ')) {
                    // Old format: parse inline
                    const [startTime, endTime] = user.baseShift.split(' - ');
                    const [sh, sm] = startTime.split(':').map(Number);
                    const [eh, em] = endTime.split(':').map(Number);
                    const startMins = sh * 60 + sm;
                    const endMins = eh * 60 + em;
                    return {
                        name: 'DEFAULT',
                        startTime,
                        endTime,
                        crossesMidnight: endMins < startMins
                    };
                }
                shiftName = user.baseShift; // New format: "SHIFT1"
            }
        }
        if (!shiftName) return null;
        // Find shift definition by name (case-insensitive)
        const found = shiftDefs.find((s)=>s.name.toUpperCase() === shiftName.toUpperCase());
        return found || null;
    }
    // ─────────────────────────────────────────────────────────────────────────────
    // STATUS DETERMINATION (Cross-midnight aware)
    // ─────────────────────────────────────────────────────────────────────────────
    /**
   * Determine PRESENT or LATE status, fully aware of cross-midnight shifts.
   * For shift SHIFT2 (17:00-02:00): check-in at 01:50 on D+1 calendar
   * should be compared against 17:00 on D (logical date).
   */ determineStatus(checkInTime, shift, lateGraceMinutes = 15) {
        if (!shift) return _attendanceentity.AttendanceStatus.PRESENT;
        // Get check-in time in WIB minutes-of-day (0-1439)
        const wibHour = (checkInTime.getUTCHours() + 7) % 24;
        const wibMinute = checkInTime.getUTCMinutes();
        let checkInMins = wibHour * 60 + wibMinute;
        const [sh, sm] = shift.startTime.split(':').map(Number);
        const shiftStartMins = sh * 60 + sm;
        const expectedMins = shiftStartMins + lateGraceMinutes;
        const [eh, em] = shift.endTime.split(':').map(Number);
        let shiftEndMins = eh * 60 + em;
        if (shift.crossesMidnight) {
            if (checkInMins < shiftEndMins) {
                checkInMins += 24 * 60;
            }
            shiftEndMins += 24 * 60; // Normalize end time too
        }
        // --- SMART CHECK: Jika masuk SETELAH shift berakhir ---
        if (checkInMins > shiftEndMins) {
            return _attendanceentity.AttendanceStatus.OVERTIME;
        }
        return checkInMins > expectedMins ? _attendanceentity.AttendanceStatus.LATE : _attendanceentity.AttendanceStatus.PRESENT;
    }
    // ─────────────────────────────────────────────────────────────────────────────
    // CLOSURE CHECK
    // ─────────────────────────────────────────────────────────────────────────────
    /**
   * Check if the business is closed on a given logical date.
   */ async isBusinessClosed(logicalDate) {
        const count = await this.closureRepository.count({
            where: {
                startDate: (0, _typeorm1.LessThanOrEqual)(logicalDate),
                endDate: (0, _typeorm1.MoreThanOrEqual)(logicalDate)
            }
        });
        return count > 0;
    }
    async sendLcdPrompt(mode) {
        if (this.isRegistrationActive && mode !== 'RESET') {
            this.logger.log(`[LCD] Skipping prompt because registration is active.`);
            return {
                success: true,
                message: 'Skipped'
            };
        }
        let statusText = 'READY: SCAN';
        if (mode === 'CHECKIN') statusText = 'READY: CHECK-IN';
        if (mode === 'CHECKOUT') statusText = 'READY: CHECK-OUT';
        if (mode === 'REGISTRATION') {
            statusText = 'MODE: REGISTRASI';
            this.isRegistrationActive = true;
        }
        if (mode === 'RESET') {
            statusText = 'RESET';
            this.isRegistrationActive = false;
        }
        this.mqttService.publish('billiard/attendance/feedback', {
            name: statusText === 'RESET' ? 'RESET' : '   ABSENSI    ',
            status: statusText,
            msg: statusText === 'RESET' ? '' : 'SILAHKAN TAP'
        });
        return {
            success: true
        };
    }
    // ─────────────────────────────────────────────────────────────────────────────
    // CHECK-IN / CHECK-OUT
    // ─────────────────────────────────────────────────────────────────────────────
    async checkIn(userId, note) {
        const today = await this.getLogicalDateString();
        const existing = await this.attendanceRepository.findOne({
            where: {
                userId,
                date: today
            }
        });
        if (existing?.checkInTime) {
            throw new _common.ConflictException(`Karyawan sudah check-in hari ini pukul ${new Date(existing.checkInTime).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit'
            })}`);
        }
        const user = await this.userRepository.findOne({
            where: {
                id: userId
            },
            relations: [
                'role'
            ]
        });
        if (!user) throw new _common.NotFoundException('Karyawan tidak ditemukan');
        if (user.isVerified === false) {
            throw new _common.BadRequestException('Akun Anda sedang dinonaktifkan (Unverified).');
        }
        const now = new Date();
        const isAdmin = user.role?.name === 'ADMIN' || user.role?.name === 'CASHIER';
        // Get shift for this employee on today's logical date
        const shift = await this.getShiftForEmployee(userId, today);
        const status = this.determineStatus(now, shift);
        if (existing) {
            existing.checkInTime = now;
            existing.shiftName = shift?.name || null;
            existing.status = isAdmin ? status : _attendanceentity.AttendanceStatus.PENDING;
            existing.note = note || existing.note;
            existing.isApproved = isAdmin;
            if (isAdmin) {
                existing.approvedBy = 'SYSTEM_ADMIN';
                existing.approvedAt = now;
            }
            const saved = await this.attendanceRepository.save(existing);
            this.mqttService.publish('billiard/attendance/feedback', {
                name: user.name.substring(0, 16).toUpperCase(),
                status: (user.role?.name || 'STAFF') + ' | ' + now.toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit'
                }),
                msg: 'SUCCESS'
            });
            return saved;
        }
        const attendanceData = {
            userId,
            date: today,
            checkInTime: now,
            shiftName: shift?.name || null,
            status: isAdmin ? status : _attendanceentity.AttendanceStatus.PENDING,
            isApproved: isAdmin,
            approvedBy: isAdmin ? 'SYSTEM_ADMIN' : null,
            approvedAt: isAdmin ? now : null,
            note: note || null
        };
        const attendance = this.attendanceRepository.create(attendanceData);
        const saved = await this.attendanceRepository.save(attendance);
        // Always broadcast update to frontend for real-time sync
        this.eventsGateway.attendanceUpdated({
            type: isAdmin ? 'ATTENDANCE_UPDATE' : 'ATTENDANCE_PENDING',
            data: saved
        });
        this.mqttService.publish('billiard/attendance/feedback', {
            name: user.name.substring(0, 16).toUpperCase(),
            status: (user.role?.name || 'STAFF') + ' | ' + now.toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit'
            }),
            msg: 'SUCCESS'
        });
        return saved;
    }
    async checkInByPin(pin, note) {
        this.logger.debug(`Attempting check-in with PIN (Type: ${typeof pin})`);
        const user = await this.userRepository.findOne({
            where: {
                pin
            }
        });
        if (!user) throw new _common.NotFoundException('PIN tidak terdaftar atau salah.');
        this.logger.log(`PIN matched for user: ${user.name} (ID: ${user.id})`);
        return this.checkIn(user.id, note);
    }
    async checkOutByPin(pin, note) {
        this.logger.debug(`Attempting check-out with PIN (Type: ${typeof pin})`);
        const user = await this.userRepository.findOne({
            where: {
                pin
            }
        });
        if (!user) throw new _common.NotFoundException('PIN tidak terdaftar atau salah.');
        this.logger.log(`PIN matched for user: ${user.name} (ID: ${user.id})`);
        return this.checkOut(user.id, note);
    }
    async checkOut(userId, note) {
        const today = await this.getLogicalDateString();
        const record = await this.attendanceRepository.findOne({
            where: {
                userId,
                date: today
            }
        });
        if (!record || !record.checkInTime) {
            throw new _common.BadRequestException('Belum ada data check-in hari ini.');
        }
        if (record.checkOutTime) {
            throw new _common.ConflictException(`Sudah check-out hari ini pukul ${new Date(record.checkOutTime).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit'
            })}`);
        }
        const now = new Date();
        const user = await this.userRepository.findOne({
            where: {
                id: userId
            },
            relations: [
                'role'
            ]
        });
        const isAdmin = user?.role?.name === 'ADMIN' || user?.role?.name === 'CASHIER';
        record.checkOutTime = now;
        const checkIn = new Date(record.checkInTime);
        record.workDurationMinutes = Math.floor((now.getTime() - checkIn.getTime()) / 60000);
        // Calculate overtime using shift definition
        const shift = await this.getShiftForEmployee(userId, today);
        if (shift) {
            const [sh, sm] = shift.startTime.split(':').map(Number);
            const [eh, em] = shift.endTime.split(':').map(Number);
            const wibHour = (now.getUTCHours() + 7) % 24;
            const wibMinute = now.getUTCMinutes();
            const checkOutMins = wibHour * 60 + wibMinute;
            const shiftStartMins = sh * 60 + sm;
            const shiftEndMins = eh * 60 + em;
            // Calculate relative duration from shift start (handle circular 24h clock)
            const relativeCheckOut = (checkOutMins - shiftStartMins + 1440) % 1440;
            const relativeShiftEnd = (shiftEndMins - shiftStartMins + 1440) % 1440;
            const graceMinutes = 30;
            if (relativeCheckOut > relativeShiftEnd + graceMinutes) {
                record.overtimeMinutes = relativeCheckOut - relativeShiftEnd;
            } else {
                record.overtimeMinutes = 0;
            }
        }
        if (!isAdmin) {
            record.status = _attendanceentity.AttendanceStatus.PENDING;
            record.isApproved = false;
        }
        if (note) record.note = note;
        const saved = await this.attendanceRepository.save(record);
        // Always broadcast update to frontend for real-time sync
        this.eventsGateway.attendanceUpdated({
            type: isAdmin ? 'ATTENDANCE_UPDATE' : 'ATTENDANCE_PENDING',
            data: saved
        });
        this.mqttService.publish('billiard/attendance/feedback', {
            name: (user?.name || 'USER').substring(0, 16).toUpperCase(),
            status: (user?.role?.name || 'STAFF') + ' | ' + now.toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit'
            }),
            msg: 'SUCCESS'
        });
        if (!isAdmin) {
            this.eventsGateway.attendanceUpdated({
                type: 'ATTENDANCE_PENDING',
                data: saved
            });
        }
        return saved;
    }
    // ─────────────────────────────────────────────────────────────────────────────
    // APPROVAL
    // ─────────────────────────────────────────────────────────────────────────────
    async approveAttendance(id, adminName) {
        const record = await this.attendanceRepository.findOne({
            where: {
                id
            },
            relations: [
                'user'
            ]
        });
        if (!record) throw new _common.NotFoundException('Data absensi tidak ditemukan');
        const now = new Date();
        record.isApproved = true;
        record.approvedBy = adminName;
        record.approvedAt = now;
        const shift = await this.getShiftForEmployee(record.userId, record.date);
        record.status = this.determineStatus(record.checkInTime, shift);
        if (record.checkOutTime) {
            record.workDurationMinutes = Math.floor((record.checkOutTime.getTime() - record.checkInTime.getTime()) / 60000);
            if (shift) {
                const [sh, sm] = shift.startTime.split(':').map(Number);
                const [eh, em] = shift.endTime.split(':').map(Number);
                const checkOutDate = new Date(record.checkOutTime);
                const wibHour = (checkOutDate.getUTCHours() + 7) % 24;
                const wibMinute = checkOutDate.getUTCMinutes();
                const checkOutMins = wibHour * 60 + wibMinute;
                const shiftStartMins = sh * 60 + sm;
                const shiftEndMins = eh * 60 + em;
                const relativeCheckOut = (checkOutMins - shiftStartMins + 1440) % 1440;
                const relativeShiftEnd = (shiftEndMins - shiftStartMins + 1440) % 1440;
                const graceMinutes = 30;
                if (relativeCheckOut > relativeShiftEnd + graceMinutes) {
                    record.overtimeMinutes = relativeCheckOut - relativeShiftEnd;
                } else {
                    record.overtimeMinutes = 0;
                }
            }
        }
        const saved = await this.attendanceRepository.save(record);
        // ─── AUTO LATE PENALTY ────────────────────────────────────────────────────
        // If status is LATE, calculate lateness minutes and auto-log LATE_LOGIN violation
        if (record.status === _attendanceentity.AttendanceStatus.LATE && shift && record.checkInTime) {
            try {
                // Remove any duplicate LATE_LOGIN for same attendance record first
                await this.violationRepository.delete({
                    userId: record.userId,
                    type: _violationentity.ViolationType.LATE_LOGIN,
                    attendanceId: record.id
                });
                const [sh, sm] = shift.startTime.split(':').map(Number);
                const graceMinutes = 15; // grace period (same as determineStatus)
                const checkIn = new Date(record.checkInTime);
                const wibCheckInHour = (checkIn.getUTCHours() + 7) % 24;
                const wibCheckInMin = checkIn.getUTCMinutes();
                let checkInMins = wibCheckInHour * 60 + wibCheckInMin;
                let shiftStartMins = sh * 60 + sm;
                // Normalize for cross-midnight shifts
                if (shift.crossesMidnight) {
                    const [eh, em] = shift.endTime.split(':').map(Number);
                    if (checkInMins < eh * 60 + em) checkInMins += 24 * 60;
                    if (shiftStartMins < checkInMins - 12 * 60) shiftStartMins += 24 * 60;
                }
                const latenessMinutes = checkInMins - (shiftStartMins + graceMinutes);
                if (latenessMinutes > 0) {
                    // Get payroll config for this user to find rate
                    const payrollConfig = await this.payrollConfigRepository.findOne({
                        where: {
                            user: {
                                id: record.userId
                            }
                        }
                    });
                    const ratePerMinute = +(payrollConfig?.penaltyLate || 0);
                    const penaltyAmount = latenessMinutes * ratePerMinute;
                    await this.userService.logViolation(record.userId, _violationentity.ViolationType.LATE_LOGIN, `Terlambat absen ${latenessMinutes} menit (Shift ${shift.name}: ${shift.startTime}) × Rp ${ratePerMinute.toLocaleString('id-ID')}/menit`, penaltyAmount, latenessMinutes);
                    this.logger.log(`[LATE_PENALTY] User ${record.userId} — ${latenessMinutes} mnt × Rp ${ratePerMinute} = Rp ${penaltyAmount}`);
                }
            } catch (e) {
                // Non-blocking — don't fail approval if violation creation fails
                this.logger.warn(`[LATE_PENALTY] Failed to log violation: ${e.message}`);
            }
        }
        this.eventsGateway.attendanceUpdated({
            type: 'ATTENDANCE_APPROVED',
            data: saved
        });
        return saved;
    }
    async getPendingAttendance() {
        return this.attendanceRepository.find({
            where: {
                isApproved: false
            },
            relations: [
                'user'
            ],
            order: {
                date: 'DESC',
                checkInTime: 'DESC'
            }
        });
    }
    // ─────────────────────────────────────────────────────────────────────────────
    // QUERIES
    // ─────────────────────────────────────────────────────────────────────────────
    async getTodayRecord(userId) {
        const today = await this.getLogicalDateString();
        return this.attendanceRepository.findOne({
            where: {
                userId,
                date: today
            },
            relations: [
                'user'
            ]
        });
    }
    async getHistory(userId, from, to) {
        const qb = this.attendanceRepository.createQueryBuilder('a').leftJoinAndSelect('a.user', 'user').leftJoinAndSelect('user.role', 'role').orderBy('a.date', 'DESC').addOrderBy('a.checkInTime', 'DESC');
        if (userId) qb.andWhere('a.userId = :userId', {
            userId
        });
        if (from) qb.andWhere('a.date >= :from', {
            from
        });
        if (to) qb.andWhere('a.date <= :to', {
            to
        });
        const records = await qb.getMany();
        // Enrich with shiftName
        const enriched = await Promise.all(records.map(async (r)=>{
            const schedule = await this.scheduleRepository.findOne({
                where: {
                    userId: r.userId,
                    date: r.date
                }
            });
            const shiftName = schedule?.shiftName || r.user?.baseShift || null;
            return {
                ...r,
                shiftName
            };
        }));
        return enriched;
    }
    async getSummary(userId, month, year) {
        const from = `${year}-${String(month).padStart(2, '0')}-01`;
        const daysInMonth = new Date(year, month, 0).getDate();
        const to = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
        const records = await this.attendanceRepository.find({
            where: {
                userId,
                date: (0, _typeorm1.Between)(from, to)
            },
            order: {
                date: 'DESC'
            }
        });
        const present = records.filter((r)=>r.status === _attendanceentity.AttendanceStatus.PRESENT).length;
        const late = records.filter((r)=>r.status === _attendanceentity.AttendanceStatus.LATE).length;
        const alpha = records.filter((r)=>r.status === _attendanceentity.AttendanceStatus.ALPHA).length;
        const totalMinutes = records.reduce((sum, r)=>sum + (r.workDurationMinutes || 0), 0);
        return {
            present,
            late,
            absent: 0,
            alpha,
            totalMinutes,
            records
        };
    }
    // ─────────────────────────────────────────────────────────────────────────────
    // MANUAL ENTRY
    // ─────────────────────────────────────────────────────────────────────────────
    async createManual(adminId, adminName, data) {
        const existing = await this.attendanceRepository.findOne({
            where: {
                userId: data.userId,
                date: data.date
            }
        });
        if (existing) {
            existing.status = data.status;
            existing.note = data.note;
            existing.isApproved = true;
            existing.approvedBy = adminName;
            existing.approvedAt = new Date();
            existing.isManual = true;
            const savedExisting = await this.attendanceRepository.save(existing);
            this.eventsGateway.attendanceUpdated({
                type: 'ATTENDANCE_MANUAL',
                data: savedExisting
            });
            return savedExisting;
        }
        const attendance = this.attendanceRepository.create({
            userId: data.userId,
            date: data.date,
            status: data.status,
            note: data.note,
            isApproved: true,
            approvedBy: adminName,
            approvedAt: new Date(),
            isManual: true
        });
        const saved = await this.attendanceRepository.save(attendance);
        this.eventsGateway.attendanceUpdated({
            type: 'ATTENDANCE_MANUAL',
            data: saved
        });
        return saved;
    }
    async deleteAttendance(id) {
        const record = await this.attendanceRepository.findOne({
            where: {
                id
            }
        });
        if (!record) throw new _common.NotFoundException('Data absensi tidak ditemukan');
        await this.attendanceRepository.delete(id);
        this.eventsGateway.attendanceUpdated({
            type: 'ATTENDANCE_UPDATE',
            data: {
                id
            }
        });
    }
    // ─────────────────────────────────────────────────────────────────────────────
    // SHIFT SCHEDULE MANAGEMENT
    // ─────────────────────────────────────────────────────────────────────────────
    /** Ambil jadwal shift karyawan untuk rentang tanggal */ async getSchedules(from, to) {
        const qb = this.scheduleRepository.createQueryBuilder('s').leftJoinAndSelect('s.user', 'user').leftJoinAndSelect('user.role', 'role').orderBy('s.date', 'ASC').addOrderBy('user.name', 'ASC');
        if (from) qb.andWhere('s.date >= :from', {
            from
        });
        if (to) qb.andWhere('s.date <= :to', {
            to
        });
        return qb.getMany();
    }
    /** Assign shift ke satu karyawan pada tanggal tertentu (upsert) */ async assignShift(adminId, userId, date, shiftName, note) {
        // Validate shift name exists in settings
        const shiftDefs = await this.getAvailableShiftDefs();
        const valid = shiftDefs.find((s)=>s.name.toUpperCase() === shiftName.toUpperCase());
        if (!valid) {
            throw new _common.BadRequestException(`Shift "${shiftName}" tidak ditemukan. Shift yang tersedia: ${shiftDefs.map((s)=>s.name).join(', ')}`);
        }
        const existing = await this.scheduleRepository.findOne({
            where: {
                userId,
                date
            }
        });
        if (existing) {
            existing.shiftName = shiftName.toUpperCase();
            existing.createdByAdminId = adminId;
            if (note) existing.swapNote = note;
            return this.scheduleRepository.save(existing);
        }
        const schedule = this.scheduleRepository.create({
            userId,
            date,
            shiftName: shiftName.toUpperCase(),
            isSwap: false,
            createdByAdminId: adminId,
            swapNote: note || null
        });
        return this.scheduleRepository.save(schedule);
    }
    /** Tukar shift antara dua karyawan pada tanggal tertentu */ async swapShifts(adminId, userAId, userBId, date, reason) {
        if (userAId === userBId) {
            throw new _common.BadRequestException('Tidak bisa menukar shift dengan diri sendiri.');
        }
        // Get current shifts for both employees on that date
        const shiftA = await this.getShiftForEmployee(userAId, date);
        const shiftB = await this.getShiftForEmployee(userBId, date);
        if (!shiftA) {
            throw new _common.BadRequestException(`Karyawan A tidak memiliki jadwal shift pada tanggal ${date}. Assign shift terlebih dahulu.`);
        }
        if (!shiftB) {
            throw new _common.BadRequestException(`Karyawan B tidak memiliki jadwal shift pada tanggal ${date}. Assign shift terlebih dahulu.`);
        }
        // Upsert: give userA the shift of userB and vice-versa
        const [scheduleA, scheduleB] = await Promise.all([
            this._upsertSchedule({
                userId: userAId,
                date,
                shiftName: shiftB.name,
                isSwap: true,
                swappedWithUserId: userBId,
                swapNote: reason || `Tukar shift dengan ID ${userBId}`,
                createdByAdminId: adminId
            }),
            this._upsertSchedule({
                userId: userBId,
                date,
                shiftName: shiftA.name,
                isSwap: true,
                swappedWithUserId: userAId,
                swapNote: reason || `Tukar shift dengan ID ${userAId}`,
                createdByAdminId: adminId
            })
        ]);
        return {
            scheduleA,
            scheduleB
        };
    }
    async _upsertSchedule(data) {
        let record = await this.scheduleRepository.findOne({
            where: {
                userId: data.userId,
                date: data.date
            }
        });
        if (record) {
            Object.assign(record, data);
        } else {
            record = this.scheduleRepository.create(data);
        }
        return this.scheduleRepository.save(record);
    }
    async deleteSchedule(id) {
        const record = await this.scheduleRepository.findOne({
            where: {
                id
            }
        });
        if (!record) throw new _common.NotFoundException('Jadwal tidak ditemukan');
        await this.scheduleRepository.delete(id);
    }
    // ─────────────────────────────────────────────────────────────────────────────
    // CLOSURE MANAGEMENT
    // ─────────────────────────────────────────────────────────────────────────────
    async getClosures() {
        return this.closureRepository.find({
            order: {
                startDate: 'DESC'
            }
        });
    }
    async addClosure(startDate, endDate, reason) {
        const closure = this.closureRepository.create({
            startDate,
            endDate,
            reason
        });
        return this.closureRepository.save(closure);
    }
    async deleteClosure(id) {
        await this.closureRepository.delete(id);
    }
    // ─────────────────────────────────────────────────────────────────────────────
    // CRON: SMART ALPHA DETECTION
    // ─────────────────────────────────────────────────────────────────────────────
    /**
   * Daily cron job runs at 04:00 AM (after businessDayOffset).
   * Smart ALPHA detection:
   * 1. Skip if business was CLOSED yesterday (no ALPHA for anyone)
   * 2. Only mark ALPHA for employees who WERE scheduled to work
   * 3. Auto-approve pending records
   */ async handleAlphaAttendance() {
        this.logger.log('Running smart ALPHA detection & PENDING safety check...');
        // Determine the logical date that just ended (yesterday's operational day)
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const logicalDate = await this.getLogicalDateString(yesterday);
        this.logger.log(`Processing logical date: ${logicalDate}`);
        // 1. Check if business was closed → skip ALPHA entirely
        const closed = await this.isBusinessClosed(logicalDate);
        if (closed) {
            this.logger.log(`Business was CLOSED on ${logicalDate}. Skipping ALPHA detection.`);
            // Still auto-approve any pending records
            await this._autoApprovePending(logicalDate);
            return;
        }
        // 2. Auto-approve any PENDING records (safety net for admins who forgot)
        await this._autoApprovePending(logicalDate);
        // 3. Determine who was scheduled to work on logicalDate
        // - Employees with an explicit schedule entry for this date
        // - Employees with baseShift set (fallback)
        const allScheduled = await this._getScheduledEmployees(logicalDate);
        this.logger.log(`Found ${allScheduled.size} employees scheduled for ${logicalDate}`);
        // 4. ALPHA detection
        for (const userId of allScheduled){
            const existing = await this.attendanceRepository.findOne({
                where: {
                    userId,
                    date: logicalDate
                }
            });
            if (!existing) {
                const user = await this.userRepository.findOne({
                    where: {
                        id: userId
                    }
                });
                const shift = await this.getShiftForEmployee(userId, logicalDate);
                const shiftInfo = shift ? ` (${shift.name})` : '';
                this.logger.log(`Marking ${user?.name || `ID:${userId}`} as ALPHA for ${logicalDate}${shiftInfo}`);
                const alpha = this.attendanceRepository.create({
                    userId,
                    date: logicalDate,
                    status: _attendanceentity.AttendanceStatus.ALPHA,
                    isApproved: true,
                    approvedBy: 'SYSTEM_CRON',
                    approvedAt: new Date(),
                    note: `Otomatis: Tidak ada rekaman absensi${shiftInfo}`
                });
                await this.attendanceRepository.save(alpha);
            }
        }
        this.logger.log('Smart ALPHA detection completed.');
    }
    async _autoApprovePending(dateStr) {
        const pendingRecords = await this.attendanceRepository.find({
            where: {
                date: dateStr,
                status: _attendanceentity.AttendanceStatus.PENDING
            },
            relations: [
                'user'
            ]
        });
        if (pendingRecords.length > 0) {
            this.logger.log(`Auto-approving ${pendingRecords.length} pending records for ${dateStr}`);
            for (const record of pendingRecords){
                await this.approveAttendance(record.id, 'SYSTEM_AUTO_SAFETY');
            }
        }
    }
    /**
   * Returns set of userIds who are scheduled to work on this logical date.
   * Includes: explicit schedule entries + employees with baseShift (default schedule)
   */ async _getScheduledEmployees(logicalDate) {
        const scheduled = new Set();
        // 1. Explicit schedules for this date
        const explicitly = await this.scheduleRepository.find({
            where: {
                date: logicalDate
            }
        });
        explicitly.forEach((s)=>scheduled.add(s.userId));
        // 2. Employees with baseShift (they are scheduled every day unless there's a schedule entry)
        const usersWithShift = await this.userRepository.find({
            where: {
                baseShift: (0, _typeorm1.Not)((0, _typeorm1.IsNull)())
            }
        });
        usersWithShift.forEach((u)=>scheduled.add(u.id));
        return scheduled;
    }
    constructor(attendanceRepository, userRepository, scheduleRepository, closureRepository, violationRepository, payrollConfigRepository, settingsService, eventsGateway, mqttService, userService){
        this.attendanceRepository = attendanceRepository;
        this.userRepository = userRepository;
        this.scheduleRepository = scheduleRepository;
        this.closureRepository = closureRepository;
        this.violationRepository = violationRepository;
        this.payrollConfigRepository = payrollConfigRepository;
        this.settingsService = settingsService;
        this.eventsGateway = eventsGateway;
        this.mqttService = mqttService;
        this.userService = userService;
        this.logger = new _common.Logger(AttendanceService.name);
        this.activeDualSession = null;
        this.lastIdentifiedUserId = null;
        // ─────────────────────────────────────────────────────────────────────────────
        // REMOTE LCD PROMPT
        // ─────────────────────────────────────────────────────────────────────────────
        this.isRegistrationActive = false;
    }
};
_ts_decorate([
    (0, _schedule.Cron)(_schedule.CronExpression.EVERY_DAY_AT_4AM),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], AttendanceService.prototype, "handleAlphaAttendance", null);
AttendanceService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_param(0, (0, _typeorm.InjectRepository)(_attendanceentity.Attendance)),
    _ts_param(1, (0, _typeorm.InjectRepository)(_userentity.User)),
    _ts_param(2, (0, _typeorm.InjectRepository)(_employeeshiftscheduleentity.EmployeeShiftSchedule)),
    _ts_param(3, (0, _typeorm.InjectRepository)(_holidayentity.BusinessClosure)),
    _ts_param(4, (0, _typeorm.InjectRepository)(_violationentity.Violation)),
    _ts_param(5, (0, _typeorm.InjectRepository)(_payrollconfigentity.PayrollConfig)),
    _ts_param(8, (0, _common.Inject)((0, _common.forwardRef)(()=>_mqttservice.MqttService))),
    _ts_param(9, (0, _common.Inject)((0, _common.forwardRef)(()=>_userservice.UserService))),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _settingsservice.SettingsService === "undefined" ? Object : _settingsservice.SettingsService,
        typeof _eventsgateway.EventsGateway === "undefined" ? Object : _eventsgateway.EventsGateway,
        typeof _mqttservice.MqttService === "undefined" ? Object : _mqttservice.MqttService,
        typeof _userservice.UserService === "undefined" ? Object : _userservice.UserService
    ])
], AttendanceService);

//# sourceMappingURL=attendance.service.js.map