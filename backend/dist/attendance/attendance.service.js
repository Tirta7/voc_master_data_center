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
const _userentity = require("../user/entities/user.entity");
const _settingsservice = require("../settings/settings.service");
const _eventsgateway = require("../socket/events.gateway");
const _schedule = require("@nestjs/schedule");
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
    /**
   * Determine the "Operational Date" (Logical Date) based on the businessDayOffset setting.
   * If current time is before the offset (e.g., 03:00 AM while offset is 10:00 AM), 
   * it counts as the previous calendar day.
   */ async getLogicalDateString(now) {
        const settings = await this.settingsService.getSettings();
        const offset = settings?.businessDayOffset || '10:00';
        const [h, m] = offset.split(':').map(Number);
        const target = now || new Date();
        const logical = new Date(target);
        // Create a cutoff time for the TARGET date
        const cutoff = new Date(target);
        cutoff.setHours(h, m, 0, 0);
        // If current time is before the business day start offset, it belongs to yesterday's operational day
        if (target < cutoff) {
            logical.setDate(logical.getDate() - 1);
        }
        // Convert to Local (WIB) Date String: YYYY-MM-DD
        // Note: We use local date parts to ensure correctness in the server's timezone
        const year = logical.getFullYear();
        const month = String(logical.getMonth() + 1).padStart(2, '0');
        const day = String(logical.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    parseShiftTime(shiftStr, index) {
        if (!shiftStr || !shiftStr.includes(' - ')) return null;
        const times = shiftStr.split(' - ');
        const time = times[index];
        if (!time || !time.includes(':')) return null;
        const [h, m] = time.split(':').map(Number);
        return {
            h,
            m
        };
    }
    determineStatus(checkInTime, expectedTime, lateGraceMinutes = 15) {
        if (!expectedTime) return _attendanceentity.AttendanceStatus.PRESENT;
        const wibHour = (checkInTime.getUTCHours() + 7) % 24;
        const wibMinute = checkInTime.getUTCMinutes();
        const checkInMinutes = wibHour * 60 + wibMinute;
        // Convert expected time to minutes
        const expectedMinutes = expectedTime.h * 60 + expectedTime.m + lateGraceMinutes;
        return checkInMinutes > expectedMinutes ? _attendanceentity.AttendanceStatus.LATE : _attendanceentity.AttendanceStatus.PRESENT;
    }
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
        const now = new Date();
        // If user is Admin/Cashier, it's auto-approved. Otherwise, PENDING.
        const isAdmin = user.role?.name === 'ADMIN' || user.role?.name === 'CASHIER';
        const startTime = this.parseShiftTime(user.baseShift, 0);
        const status = this.determineStatus(now, startTime || undefined);
        if (existing) {
            existing.checkInTime = now;
            existing.status = isAdmin ? status : _attendanceentity.AttendanceStatus.PENDING;
            existing.note = note || existing.note;
            existing.isApproved = isAdmin;
            if (isAdmin) {
                existing.approvedBy = 'SYSTEM_ADMIN';
                existing.approvedAt = now;
            }
            return await this.attendanceRepository.save(existing);
        }
        const attendanceData = {
            userId: userId,
            date: today,
            checkInTime: now,
            status: isAdmin ? status : _attendanceentity.AttendanceStatus.PENDING,
            isApproved: isAdmin,
            approvedBy: isAdmin ? 'SYSTEM_ADMIN' : null,
            approvedAt: isAdmin ? now : null,
            note: note || null
        };
        const attendance = this.attendanceRepository.create(attendanceData);
        const saved = await this.attendanceRepository.save(attendance);
        if (!isAdmin) this.eventsGateway.attendanceUpdated({
            type: 'ATTENDANCE_PENDING',
            data: saved
        });
        return saved;
    }
    async checkInByPin(pin, note) {
        this.logger.debug(`Attempting check-in with PIN: "${pin}" (Type: ${typeof pin})`);
        const user = await this.userRepository.findOne({
            where: {
                pin
            }
        });
        if (!user) {
            this.logger.warn(`User not found for PIN: "${pin}"`);
            throw new _common.NotFoundException('PIN tidak terdaftar atau salah.');
        }
        this.logger.log(`PIN matched for user: ${user.name} (ID: ${user.id})`);
        return this.checkIn(user.id, note);
    }
    async checkOutByPin(pin, note) {
        this.logger.debug(`Attempting check-out with PIN: "${pin}" (Type: ${typeof pin})`);
        const user = await this.userRepository.findOne({
            where: {
                pin
            }
        });
        if (!user) {
            this.logger.warn(`User not found for PIN: "${pin}"`);
            throw new _common.NotFoundException('PIN tidak terdaftar atau salah.');
        }
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
            throw new _common.ConflictException('Sudah check-out hari ini.');
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
        const diffMs = now.getTime() - checkIn.getTime();
        record.workDurationMinutes = Math.floor(diffMs / 60000);
        // Calculate Overtime (Lembur) if shift is known
        const endTime = this.parseShiftTime(user?.baseShift, 1);
        if (endTime) {
            const wibHour = (now.getUTCHours() + 7) % 24;
            const wibMinute = now.getUTCMinutes();
            const checkOutMinutes = wibHour * 60 + wibMinute;
            const expectedEndMinutes = endTime.h * 60 + endTime.m + 30; // 30 mins grace
            if (checkOutMinutes > expectedEndMinutes) {
                record.overtimeMinutes = checkOutMinutes - expectedEndMinutes;
            }
        }
        if (!isAdmin) {
            record.status = _attendanceentity.AttendanceStatus.PENDING;
            record.isApproved = false;
        }
        if (note) record.note = note;
        const saved = await this.attendanceRepository.save(record);
        if (!isAdmin) this.eventsGateway.attendanceUpdated({
            type: 'ATTENDANCE_PENDING',
            data: saved
        });
        return saved;
    }
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
        // Finalize status using user's shift if available
        const startTime = this.parseShiftTime(record.user?.baseShift, 0);
        record.status = this.determineStatus(record.checkInTime, startTime || undefined);
        // Finalize duration & OT if checked out
        if (record.checkOutTime) {
            record.workDurationMinutes = Math.floor((record.checkOutTime.getTime() - record.checkInTime.getTime()) / 60000);
            const endTime = this.parseShiftTime(record.user?.baseShift, 1);
            if (endTime) {
                const checkOutDate = new Date(record.checkOutTime);
                const wibHour = (checkOutDate.getUTCHours() + 7) % 24;
                const wibMinute = checkOutDate.getUTCMinutes();
                const checkOutMinutes = wibHour * 60 + wibMinute;
                const expectedEndMinutes = endTime.h * 60 + endTime.m + 30;
                if (checkOutMinutes > expectedEndMinutes) {
                    record.overtimeMinutes = checkOutMinutes - expectedEndMinutes;
                }
            }
        }
        const saved = await this.attendanceRepository.save(record);
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
        if (userId) {
            qb.andWhere('a.userId = :userId', {
                userId
            });
        }
        if (from) {
            qb.andWhere('a.date >= :from', {
                from
            });
        }
        if (to) {
            qb.andWhere('a.date <= :to', {
                to
            });
        }
        return qb.getMany();
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
        const totalMinutes = records.reduce((sum, r)=>sum + (r.workDurationMinutes || 0), 0);
        const absent = 0; // Future: compare with working days
        return {
            present,
            late,
            absent,
            totalMinutes,
            records
        };
    }
    /** Daily cron job for ALPHA detection & PENDING auto-approval */ async handleAlphaAttendance() {
        this.logger.log('Running daily ALPHA detection & PENDING safety check...');
        // Get logical date for "yesterday" (the operation day that just ended)
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const dateStr = yesterday.toISOString().split('T')[0];
        // 1. Safety Net: Auto-approve any PENDING records for yesterday
        // This handles cases where administrators forgot to click "Verifikasi Masal"
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
            this.logger.log(`Found ${pendingRecords.length} pending records for ${dateStr}. Auto-approving...`);
            for (const record of pendingRecords){
                await this.approveAttendance(record.id, 'SYSTEM_AUTO_SAFETY');
            }
        }
        // 2. ALPHA detection: For employees with bShift assigned but no attendance record
        const employees = await this.userRepository.find({
            where: {
                baseShift: (0, _typeorm1.Not)((0, _typeorm1.IsNull)())
            }
        });
        for (const emp of employees){
            const existing = await this.attendanceRepository.findOne({
                where: {
                    userId: emp.id,
                    date: dateStr
                }
            });
            if (!existing) {
                this.logger.log(`Marking ${emp.name} as ALPHA for ${dateStr}`);
                const alpha = this.attendanceRepository.create({
                    userId: emp.id,
                    date: dateStr,
                    status: _attendanceentity.AttendanceStatus.ALPHA,
                    isApproved: true,
                    approvedBy: 'SYSTEM_CRON',
                    approvedAt: new Date(),
                    note: 'Otomatis: Tidak ada rekaman absensi'
                });
                await this.attendanceRepository.save(alpha);
            }
        }
        this.logger.log('Daily attendance maintenance completed.');
    }
    constructor(attendanceRepository, userRepository, settingsService, eventsGateway){
        this.attendanceRepository = attendanceRepository;
        this.userRepository = userRepository;
        this.settingsService = settingsService;
        this.eventsGateway = eventsGateway;
        this.logger = new _common.Logger(AttendanceService.name);
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
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _settingsservice.SettingsService === "undefined" ? Object : _settingsservice.SettingsService,
        typeof _eventsgateway.EventsGateway === "undefined" ? Object : _eventsgateway.EventsGateway
    ])
], AttendanceService);

//# sourceMappingURL=attendance.service.js.map