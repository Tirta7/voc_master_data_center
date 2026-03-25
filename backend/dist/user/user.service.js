"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "UserService", {
    enumerable: true,
    get: function() {
        return UserService;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _typeorm1 = require("typeorm");
const _userentity = require("./entities/user.entity");
const _roleentity = require("./entities/role.entity");
const _payrollconfigentity = require("./entities/payroll-config.entity");
const _violationentity = require("./entities/violation.entity");
const _userstatuslogentity = require("./entities/user-status-log.entity");
const _payrollreleaseentity = require("./entities/payroll-release.entity");
const _attendanceentity = require("../attendance/entities/attendance.entity");
const _transactionentity = require("../transaction/entities/transaction.entity");
const _orderitementity = require("../cafe/entities/order-item.entity");
const _bcrypt = /*#__PURE__*/ _interop_require_wildcard(require("bcrypt"));
const _shiftservice = require("../finance/shift.service");
const _whatsappservice = require("../whatsapp/whatsapp.service");
function _getRequireWildcardCache(nodeInterop) {
    if (typeof WeakMap !== "function") return null;
    var cacheBabelInterop = new WeakMap();
    var cacheNodeInterop = new WeakMap();
    return (_getRequireWildcardCache = function(nodeInterop) {
        return nodeInterop ? cacheNodeInterop : cacheBabelInterop;
    })(nodeInterop);
}
function _interop_require_wildcard(obj, nodeInterop) {
    if (!nodeInterop && obj && obj.__esModule) {
        return obj;
    }
    if (obj === null || typeof obj !== "object" && typeof obj !== "function") {
        return {
            default: obj
        };
    }
    var cache = _getRequireWildcardCache(nodeInterop);
    if (cache && cache.has(obj)) {
        return cache.get(obj);
    }
    var newObj = {
        __proto__: null
    };
    var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;
    for(var key in obj){
        if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) {
            var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;
            if (desc && (desc.get || desc.set)) {
                Object.defineProperty(newObj, key, desc);
            } else {
                newObj[key] = obj[key];
            }
        }
    }
    newObj.default = obj;
    if (cache) {
        cache.set(obj, newObj);
    }
    return newObj;
}
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
let UserService = class UserService {
    async findByUsername(username) {
        return this.userRepository.findOne({
            where: {
                username
            }
        });
    }
    async createEmployee(userData) {
        try {
            const username = (userData.username || '').trim();
            const email = (userData.email || '').trim() || null;
            const pin = (userData.pin || '').trim() || null;
            // Check for existing username OR email (if email is provided)
            const checkConditions = [
                {
                    username
                }
            ];
            if (email) {
                checkConditions.push({
                    email
                });
            }
            const existingUser = await this.userRepository.findOne({
                where: checkConditions
            });
            if (existingUser) {
                if (existingUser.username === username) throw new _common.ConflictException('Username sudah terdaftar');
                if (existingUser && email && existingUser.email === email) throw new _common.ConflictException('Email sudah terdaftar');
            }
            // Extract User Identity fields only
            const userFields = [
                'name',
                'placeOfBirth',
                'dateOfBirth',
                'gender',
                'address',
                'religion',
                'maritalStatus',
                'jobTitle',
                'nationality',
                'joinedAt',
                'phone',
                'baseShift'
            ];
            const userPayload = {};
            userFields.forEach((f)=>{
                if (userData[f] !== undefined) userPayload[f] = userData[f];
            });
            const hashedPassword = await _bcrypt.hash(userData.password, 10);
            const role = await this.roleRepository.findOne({
                where: {
                    id: userData.roleId
                }
            });
            if (!role) throw new _common.NotFoundException('Role tidak ditemukan');
            const user = this.userRepository.create({
                ...userPayload,
                username,
                password: hashedPassword,
                role,
                pin,
                email,
                status: _userentity.UserStatus.OFFLINE
            });
            const savedUser = await this.userRepository.save(user);
            // Create initial payroll config
            const payroll = this.payrollRepository.create({
                user: savedUser,
                basicSalary: userData.basicSalary ?? 0,
                overtimeRate: userData.overtimeRate ?? 0,
                commissionService: userData.commissionService ?? 0,
                commissionSalesPercent: userData.commissionSalesPercent ?? 0,
                categoryCommissions: userData.categoryCommissions || {},
                penaltyIdle: userData.penaltyIdle ?? 5000,
                idleThreshold: userData.idleThreshold ?? 5
            });
            await this.payrollRepository.save(payroll);
            // Initial status log
            const log = this.statusLogRepository.create({
                user: savedUser,
                status: _userentity.UserStatus.OFFLINE
            });
            await this.statusLogRepository.save(log);
            this.eventsGateway.employeeUpdated({
                id: savedUser.id,
                action: 'created'
            });
            // Send WhatsApp welcome message if phone is provided
            const savedUserObj = savedUser;
            if (userData.phone) {
                const cleanPassword = userData.password; // plain text before hashing
                const msg = `✅ *Selamat Datang, ${savedUserObj.name}!*\n\n` + `Akun karyawan Anda telah berhasil dibuat.\n\n` + `👤 Username: *${savedUserObj.username}*\n` + `🔑 Password: *${cleanPassword}*\n` + `🏷️ Role: *${role.name}*\n\n` + `Silakan login di aplikasi dan segera ganti password Anda. 🙏`;
                // Non-blocking — don't fail registration if WA fails
                this.whatsAppService.sendMessage(userData.phone, msg).catch((e)=>this.logger.warn(`WA welcome message failed: ${e.message}`));
            }
            return savedUser;
        } catch (error) {
            console.error('SERVER_CREATE_EMPLOYEE_ERROR:', error);
            // Re-throw if it's already a Nest exception, otherwise wrap as 500 with message
            if (error.status) throw error;
            throw new Error(`Gagal mendaftarkan karyawan: ${error.message}`);
        }
    }
    async findAllEmployees() {
        return this.userRepository.find({
            relations: [
                'role'
            ],
            order: {
                createdAt: 'DESC'
            }
        });
    }
    async updateEmployee(id, userData) {
        const user = await this.userRepository.findOne({
            where: {
                id
            },
            relations: [
                'role'
            ]
        });
        if (!user) throw new _common.NotFoundException('Employee not found');
        const username = (userData.username || '').trim();
        const email = (userData.email || '').trim() || null;
        const pin = (userData.pin || '').trim() || null;
        // Duplicate checks
        if (username && username !== user.username) {
            const existing = await this.userRepository.findOne({
                where: {
                    username
                }
            });
            if (existing) throw new _common.ConflictException('Username sudah digunakan');
        }
        if (email && email !== user.email) {
            const existing = await this.userRepository.findOne({
                where: {
                    email
                }
            });
            if (existing) throw new _common.ConflictException('Email sudah digunakan');
        }
        if (userData.password) {
            userData.password = await _bcrypt.hash(userData.password, 10);
        } else {
            delete userData.password;
        }
        if (userData.roleId) {
            const role = await this.roleRepository.findOne({
                where: {
                    id: userData.roleId
                }
            });
            if (!role) throw new _common.NotFoundException('Role not found');
            user.role = role;
            delete userData.roleId;
        }
        Object.assign(user, {
            ...userData,
            username: username || user.username,
            email,
            pin
        });
        const updatedUser = await this.userRepository.save(user);
        // Update payroll config
        const payroll = await this.payrollRepository.findOne({
            where: {
                user: {
                    id
                }
            }
        });
        if (payroll) {
            payroll.basicSalary = userData.basicSalary ?? payroll.basicSalary;
            payroll.overtimeRate = userData.overtimeRate ?? payroll.overtimeRate;
            payroll.commissionService = userData.commissionService ?? payroll.commissionService;
            payroll.commissionSalesPercent = userData.commissionSalesPercent ?? payroll.commissionSalesPercent;
            payroll.categoryCommissions = userData.categoryCommissions ?? payroll.categoryCommissions;
            payroll.penaltyIdle = userData.penaltyIdle ?? payroll.penaltyIdle;
            payroll.idleThreshold = userData.idleThreshold ?? payroll.idleThreshold;
            await this.payrollRepository.save(payroll);
        }
        this.eventsGateway.employeeUpdated({
            id: updatedUser.id,
            action: 'updated'
        });
        return updatedUser;
    }
    async identifyByPin(pin) {
        return this.userRepository.findOne({
            where: {
                pin
            },
            relations: [
                'role'
            ]
        });
    }
    async deleteEmployee(id) {
        const user = await this.userRepository.findOne({
            where: {
                id
            }
        });
        if (!user) throw new _common.NotFoundException('Employee not found');
        // Nullify or delete references in related tables to avoid FK constraint errors
        // while preserving historical data.
        await Promise.all([
            this.violationRepository.update({
                userId: id
            }, {
                userId: null
            }),
            this.transactionRepository.update({
                createdByUserId: id
            }, {
                createdByUserId: null
            }),
            this.transactionRepository.update({
                openedByUserId: id
            }, {
                openedByUserId: null
            }),
            this.orderItemRepository.update({
                createdByUserId: id
            }, {
                createdByUserId: null
            }),
            this.orderItemRepository.update({
                completedByUserId: id
            }, {
                completedByUserId: null
            }),
            this.statusLogRepository.delete({
                user: {
                    id
                }
            }),
            this.userRepository.manager.createQueryBuilder().update('shifts').set({
                userId: null
            }).where('userId = :id', {
                id
            }).execute(),
            // For payments, we use query builder as the entity might not be directly available in service
            this.userRepository.manager.createQueryBuilder().update('transaction_payments').set({
                createdByUserId: null
            }).where('createdByUserId = :id', {
                id
            }).execute()
        ]);
        await this.payrollRepository.delete({
            user: {
                id
            }
        });
        const result = await this.userRepository.delete(id);
        this.eventsGateway.employeeUpdated({
            id,
            action: 'deleted'
        });
        return result;
    }
    async updateStatus(userId, status, socketId, activePage) {
        const user = await this.userRepository.findOne({
            where: {
                id: userId
            }
        });
        if (!user) return;
        const oldStatus = user.status;
        const now = new Date();
        if (oldStatus === status) {
            await this.userRepository.update(userId, {
                ...socketId && {
                    socketId
                },
                ...activePage && {
                    currentActivePage: activePage
                },
                lastSeen: now
            });
            return;
        }
        // Close current log
        const currentLog = await this.statusLogRepository.findOne({
            where: {
                user: {
                    id: userId
                },
                endedAt: (0, _typeorm1.IsNull)()
            },
            order: {
                startedAt: 'DESC'
            }
        });
        if (currentLog) {
            currentLog.endedAt = now;
            currentLog.durationSeconds = Math.floor((now.getTime() - currentLog.startedAt.getTime()) / 1000);
            await this.statusLogRepository.save(currentLog);
        }
        // Start new log
        const newLog = this.statusLogRepository.create({
            user: {
                id: userId
            },
            status,
            startedAt: now
        });
        await this.statusLogRepository.save(newLog);
        await this.userRepository.update(userId, {
            status,
            ...socketId && {
                socketId
            },
            ...activePage && {
                currentActivePage: activePage
            },
            lastSeen: now
        });
    }
    async findById(id) {
        return this.userRepository.findOne({
            where: {
                id
            },
            relations: [
                'payrollConfig'
            ]
        });
    }
    // Role Management
    async createRole(name, permissions, description) {
        const role = this.roleRepository.create({
            name,
            permissions,
            description
        });
        const saved = await this.roleRepository.save(role);
        this.eventsGateway.roleUpdated({
            id: saved.id,
            action: 'created'
        });
        return saved;
    }
    async updateRole(id, name, permissions, description) {
        const role = await this.roleRepository.findOne({
            where: {
                id
            }
        });
        if (!role) throw new _common.NotFoundException('Role not found');
        role.name = name;
        role.permissions = permissions;
        role.description = description;
        const saved = await this.roleRepository.save(role);
        this.eventsGateway.roleUpdated({
            id: saved.id,
            action: 'updated'
        });
        return saved;
    }
    async deleteRole(id) {
        const usersCount = await this.userRepository.count({
            where: {
                role: {
                    id
                }
            }
        });
        if (usersCount > 0) {
            throw new _common.ConflictException('Cannot delete role assigned to users');
        }
        const role = await this.roleRepository.findOne({
            where: {
                id
            }
        });
        if (!role) throw new _common.NotFoundException('Role not found');
        return this.roleRepository.remove(role);
    }
    async findAllRoles() {
        return this.roleRepository.find({
            order: {
                id: 'DESC'
            }
        });
    }
    async logViolation(userId, type, description, penaltyAmount, durationMinutes) {
        return this.userRepository.manager.transaction(async (manager)=>{
            // Calculate amount if type is LATE_LOGIN and penaltyAmount is not explicitly passed (or passed as 0)
            let finalAmount = penaltyAmount;
            if (type === _violationentity.ViolationType.LATE_LOGIN && durationMinutes && penaltyAmount === 0) {
                const config = await manager.findOne(_payrollconfigentity.PayrollConfig, {
                    where: {
                        user: {
                            id: userId
                        }
                    }
                });
                if (config && config.penaltyLate) {
                    finalAmount = durationMinutes * +config.penaltyLate;
                    description = `${description} (${durationMinutes} menit x Rp ${config.penaltyLate})`;
                }
            }
            // Fetch active shift context
            const activeShift = await this.shiftService.getActiveShift(userId) || await this.shiftService.findActiveCashierShift();
            const activeDay = activeShift?.businessDayId ? null : await this.shiftService.getOrCreateActiveBusinessDay();
            const violation = manager.create(_violationentity.Violation, {
                userId,
                type,
                description,
                penaltyAmount: finalAmount,
                durationMinutes,
                shiftId: activeShift?.id || null,
                businessDayId: activeShift?.businessDayId || activeDay?.id || null
            });
            const saved = await manager.save(_violationentity.Violation, violation);
            this.eventsGateway.server.emit('violationUpdated', {
                userId
            });
            return saved;
        });
    }
    async calculateMonthlyPayroll(userId, month, year, start, end, includeReleased = false) {
        const startDate = start ? start : new Date(year, month - 1, 1);
        const endDate = end ? end : new Date(year, month, 0, 23, 59, 59);
        const config = await this.payrollRepository.findOne({
            where: {
                user: {
                    id: userId
                }
            },
            relations: [
                'user',
                'user.role'
            ]
        });
        if (!config) return null;
        const user = config.user;
        let basicSalary = +config.basicSalary;
        if (start && end) {
            const daysInPeriod = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
            const daysInMonth = new Date(year, month, 0).getDate();
            // Only prorate if the period is significantly shorter than a month (avoiding boundary noise)
            if (daysInPeriod < daysInMonth - 2) {
                basicSalary = basicSalary / daysInMonth * daysInPeriod;
            }
        }
        // 1. Service Commission (Table Starts)
        const tableStarts = await this.transactionRepository.count({
            where: [
                {
                    commissionUserId: userId,
                    createdAt: (0, _typeorm1.Between)(startDate, endDate),
                    status: (0, _typeorm1.Not)(_transactionentity.TransactionStatus.CANCELLED),
                    payrollReleaseId: includeReleased ? undefined : (0, _typeorm1.IsNull)()
                },
                {
                    commissionUserId: (0, _typeorm1.IsNull)(),
                    createdByUserId: userId,
                    createdAt: (0, _typeorm1.Between)(startDate, endDate),
                    status: (0, _typeorm1.Not)(_transactionentity.TransactionStatus.CANCELLED),
                    payrollReleaseId: includeReleased ? undefined : (0, _typeorm1.IsNull)()
                }
            ]
        });
        const totalServiceCommission = tableStarts * +config.commissionService;
        // 2. Sales Commission (Granular by Category)
        const salesItems = await this.orderItemRepository.createQueryBuilder('oi').leftJoinAndSelect('oi.menuItem', 'mi').leftJoinAndSelect('mi.category', 'cat').leftJoin('oi.transaction', 't').where('(oi.commissionUserId = :userId OR (oi.commissionUserId IS NULL AND oi.createdByUserId = :userId))', {
            userId
        }).andWhere('oi.createdAt BETWEEN :start AND :end', {
            start: startDate,
            end: endDate
        }).andWhere('oi.status IN (:...statuses)', {
            statuses: [
                _orderitementity.OrderItemStatus.DONE,
                _orderitementity.OrderItemStatus.QUEUED,
                _orderitementity.OrderItemStatus.PROCESSING
            ]
        }).andWhere('(oi.isPaid = true OR t.status != :cancelledStatus)', {
            cancelledStatus: _transactionentity.TransactionStatus.CANCELLED
        }).andWhere(includeReleased ? '1=1' : 'oi.payrollReleaseId IS NULL').getMany();
        const categoryBreakdown = {};
        let totalSalesCommission = 0;
        const commissionsMap = config.categoryCommissions || {};
        const normalizedCommissionsMap = {};
        const displayNamesMap = {}; // Map normalized key to the first display name found
        // 1. Initialize with configured categories for visibility
        Object.entries(commissionsMap).forEach(([cat, val])=>{
            const key = cat.trim().toUpperCase();
            const percent = Number(val);
            normalizedCommissionsMap[key] = percent;
            if (!displayNamesMap[key]) {
                displayNamesMap[key] = cat.trim();
                categoryBreakdown[displayNamesMap[key]] = {
                    volume: 0,
                    commission: 0,
                    percent
                };
            }
        });
        const defaultPercent = Number(config.commissionSalesPercent || 0);
        salesItems.forEach((item)=>{
            const rawCategory = item.menuItem?.category;
            const categoryName = (typeof rawCategory === 'object' ? rawCategory?.name : rawCategory) || 'Uncategorized';
            const categoryKey = categoryName.trim().toUpperCase();
            const originalVolume = Number(item.priceAtOrder || 0) * Number(item.quantity || 1);
            // Prioritize per-item persisted discount, then fallback to transaction ratio if legacy
            const itemDiscount = Number(item.discountAmount || 0);
            let discountedVolume = originalVolume - itemDiscount;
            if (itemDiscount === 0) {
                const tx = item.transaction;
                if (tx && Number(tx.discountAmount || 0) > 0) {
                    const billTotal = Number(tx.billiardTotal || 0);
                    const cafeTotal = Number(tx.cafeTotal || 0);
                    const totalBeforeDisc = billTotal + cafeTotal;
                    if (totalBeforeDisc > 0) {
                        const discRatio = Number(tx.discountAmount) / totalBeforeDisc;
                        discountedVolume = originalVolume * (1 - discRatio);
                    }
                }
            }
            // Use specific commission if set, otherwise use default
            const percent = normalizedCommissionsMap[categoryKey] !== undefined ? normalizedCommissionsMap[categoryKey] : defaultPercent;
            const commission = discountedVolume * percent / 100;
            // Group by the first discovered display name for this normalized key
            if (!displayNamesMap[categoryKey]) {
                displayNamesMap[categoryKey] = categoryName.trim();
            }
            const displayName = displayNamesMap[categoryKey];
            if (!categoryBreakdown[displayName]) {
                categoryBreakdown[displayName] = {
                    volume: 0,
                    commission: 0,
                    percent
                };
            }
            categoryBreakdown[displayName].volume += originalVolume; // Show original volume for transparency
            categoryBreakdown[displayName].commission += commission;
            totalSalesCommission += commission;
        });
        // 2b. Production Commission (Work done by Kitchen/Bartender)
        const productionItems = await this.orderItemRepository.createQueryBuilder('oi').leftJoinAndSelect('oi.menuItem', 'mi').leftJoinAndSelect('mi.category', 'cat').leftJoin('oi.transaction', 't').where('oi.completedByUserId = :userId', {
            userId
        }).andWhere('oi.completedAt BETWEEN :start AND :end', {
            start: startDate,
            end: endDate
        }).andWhere('oi.status = :status', {
            status: _orderitementity.OrderItemStatus.DONE
        }).andWhere('(oi.isPaid = true OR t.status != :cancelledStatus)', {
            cancelledStatus: _transactionentity.TransactionStatus.CANCELLED
        }).andWhere(includeReleased ? '1=1' : 'oi.payrollReleaseId IS NULL').getMany();
        const productionBreakdown = {};
        let totalProductionCommission = 0;
        const prodDisplayNamesMap = {};
        // 1. Initialize production breakdown with same config
        Object.entries(commissionsMap).forEach(([cat, val])=>{
            const key = cat.trim().toUpperCase();
            const percent = Number(val);
            if (!prodDisplayNamesMap[key]) {
                prodDisplayNamesMap[key] = cat.trim();
                productionBreakdown[prodDisplayNamesMap[key]] = {
                    volume: 0,
                    commission: 0,
                    percent
                };
            }
        });
        productionItems.forEach((item)=>{
            const rawCategory = item.menuItem?.category;
            const categoryName = (typeof rawCategory === 'object' ? rawCategory?.name : rawCategory) || 'Uncategorized';
            const categoryKey = categoryName.trim().toUpperCase();
            const originalVolume = Number(item.priceAtOrder || 0) * Number(item.quantity || 1);
            // Apply same discount logic for production
            const itemDiscount = Number(item.discountAmount || 0);
            let discountedVolume = originalVolume - itemDiscount;
            if (itemDiscount === 0) {
                const tx = item.transaction;
                if (tx && Number(tx.discountAmount || 0) > 0) {
                    const billTotal = Number(tx.billiardTotal || 0);
                    const cafeTotal = Number(tx.cafeTotal || 0);
                    const totalBeforeDisc = billTotal + cafeTotal;
                    if (totalBeforeDisc > 0) {
                        const discRatio = Number(tx.discountAmount) / totalBeforeDisc;
                        discountedVolume = originalVolume * (1 - discRatio);
                    }
                }
            }
            const percent = normalizedCommissionsMap[categoryKey] !== undefined ? normalizedCommissionsMap[categoryKey] : defaultPercent;
            const commission = discountedVolume * percent / 100;
            if (!prodDisplayNamesMap[categoryKey]) {
                prodDisplayNamesMap[categoryKey] = categoryName.trim();
            }
            const displayName = prodDisplayNamesMap[categoryKey];
            if (!productionBreakdown[displayName]) {
                productionBreakdown[displayName] = {
                    volume: 0,
                    commission: 0,
                    percent
                };
            }
            productionBreakdown[displayName].volume += originalVolume;
            productionBreakdown[displayName].commission += commission;
            totalProductionCommission += commission;
        });
        // 3. Penalties
        const userViolations = await this.violationRepository.find({
            where: {
                userId,
                createdAt: (0, _typeorm1.Between)(startDate, endDate),
                payrollReleaseId: includeReleased ? undefined : (0, _typeorm1.IsNull)()
            }
        });
        const totalPenalties = userViolations.reduce((sum, v)=>sum + +v.penaltyAmount, 0);
        // 3b. Overtime Pay
        const attendances = await this.attendanceRepository.find({
            where: {
                userId,
                date: (0, _typeorm1.Between)(startDate, endDate),
                isApproved: true
            }
        });
        const totalOvertimeMinutes = attendances.reduce((sum, a)=>sum + (a.overtimeMinutes || 0), 0);
        const totalOvertimePay = totalOvertimeMinutes / 60 * +config.overtimeRate;
        // 4. Counts & Stats
        const sessions = await this.transactionRepository.count({
            where: [
                {
                    commissionUserId: userId,
                    createdAt: (0, _typeorm1.Between)(startDate, endDate)
                },
                {
                    commissionUserId: (0, _typeorm1.IsNull)(),
                    createdByUserId: userId,
                    createdAt: (0, _typeorm1.Between)(startDate, endDate)
                }
            ]
        });
        const activeDaysResult = await this.statusLogRepository.createQueryBuilder('log').select('DISTINCT(DATE(log.startedAt))', 'date').where('log.userId = :userId', {
            userId
        }).andWhere('log.startedAt BETWEEN :start AND :end', {
            start: startDate,
            end: endDate
        }).andWhere('log.status = :status', {
            status: _userentity.UserStatus.ACTIVE
        }).getRawMany();
        const totalItems = salesItems.reduce((sum, item)=>sum + (item.quantity || 0), 0);
        const totalCompletedItems = productionItems.reduce((sum, item)=>sum + (item.quantity || 0), 0);
        // basicSalary is already defined and calculated above
        const total = basicSalary + totalServiceCommission + totalSalesCommission + totalProductionCommission + totalOvertimePay - totalPenalties;
        return {
            basicSalary,
            commissionService: totalServiceCommission,
            commissionSales: totalSalesCommission,
            commissionProduction: totalProductionCommission,
            salesBreakdown: categoryBreakdown,
            productionBreakdown: productionBreakdown,
            penalties: totalPenalties,
            overtimePay: totalOvertimePay,
            total,
            // Configuration Rates (for form population)
            basicSalaryRate: basicSalary,
            overtimeRate: +config.overtimeRate,
            commissionServiceRate: +config.commissionService,
            commissionSalesPercent: +config.commissionSalesPercent,
            penaltyIdle: +config.penaltyIdle,
            idleThreshold: config.idleThreshold,
            categoryCommissions: config.categoryCommissions,
            // Accurate counts
            totalSessions: sessions,
            totalItems,
            activeDays: activeDaysResult.length,
            penaltyLateRate: +config.penaltyLate,
            month,
            year,
            id: user.id,
            name: user.name,
            role: user.role?.name || 'Employee'
        };
    }
    async releaseSalary(userId, month, year, releasedByUserId) {
        const summary = await this.calculateMonthlyPayroll(userId, month, year);
        if (!summary) throw new _common.NotFoundException('Payroll summary not found');
        return this.userRepository.manager.transaction(async (manager)=>{
            // 1. Create Release Record
            const release = manager.create(_payrollreleaseentity.PayrollRelease, {
                userId,
                month,
                year,
                basicSalary: summary.basicSalary,
                commissionService: summary.commissionService,
                commissionSales: summary.commissionSales,
                commissionProduction: summary.commissionProduction,
                penalties: summary.penalties,
                totalPayout: summary.total,
                details: summary,
                releasedAt: new Date(),
                releasedByUserId
            });
            const savedRelease = await manager.save(_payrollreleaseentity.PayrollRelease, release);
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0, 23, 59, 59);
            // 2. Tag Items as Released
            // OrderItems (Sales/Waiter share)
            await manager.createQueryBuilder().update(_orderitementity.OrderItem).set({
                payrollReleaseId: savedRelease.id
            }).where('(commissionUserId = :userId OR (commissionUserId IS NULL AND createdByUserId = :userId))', {
                userId
            }).andWhere('createdAt BETWEEN :start AND :end', {
                start: startDate,
                end: endDate
            }).andWhere('payrollReleaseId IS NULL').execute();
            // OrderItems (Production share)
            await manager.createQueryBuilder().update(_orderitementity.OrderItem).set({
                payrollReleaseId: savedRelease.id
            }).where('completedByUserId = :userId', {
                userId
            }).andWhere('completedAt BETWEEN :start AND :end', {
                start: startDate,
                end: endDate
            }).andWhere('payrollReleaseId IS NULL').execute();
            // Transactions (Billiard/Service share)
            await manager.createQueryBuilder().update(_transactionentity.Transaction).set({
                payrollReleaseId: savedRelease.id
            }).where('(commissionUserId = :userId OR (commissionUserId IS NULL AND createdByUserId = :userId))', {
                userId
            }).andWhere('createdAt BETWEEN :start AND :end', {
                start: startDate,
                end: endDate
            }).andWhere('payrollReleaseId IS NULL').execute();
            // Violations
            await manager.createQueryBuilder().update(_violationentity.Violation).set({
                payrollReleaseId: savedRelease.id
            }).where('userId = :userId', {
                userId
            }).andWhere('createdAt BETWEEN :start AND :end', {
                start: startDate,
                end: endDate
            }).andWhere('payrollReleaseId IS NULL').execute();
            // Notify real-time
            this.eventsGateway.server.emit('payrollReleased', {
                userId,
                month,
                year
            });
            return savedRelease;
        });
    }
    async calculateBulkPayroll(month, year, start, end, includeReleased = false) {
        const users = await this.userRepository.find();
        const results = {};
        const startDate = start ? new Date(start) : undefined;
        const endDate = end ? new Date(end) : undefined;
        await Promise.all(users.map(async (u)=>{
            results[u.id] = await this.calculateMonthlyPayroll(u.id, month, year, startDate, endDate, includeReleased);
        }));
        return results;
    }
    async forceLogout(userId, message) {
        this.eventsGateway.forceLogout(userId, message);
        return {
            message: 'Force logout signal sent'
        };
    }
    async findAllViolations() {
        return this.violationRepository.find({
            relations: [
                'user'
            ],
            order: {
                createdAt: 'DESC'
            },
            take: 50
        });
    }
    async findUserViolations(userId) {
        return this.violationRepository.find({
            where: {
                userId
            },
            order: {
                createdAt: 'DESC'
            }
        });
    }
    async getDetailedPayrollReport(userId, month, year) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);
        // 1. Status Logs
        const statusLogs = await this.statusLogRepository.find({
            where: {
                user: {
                    id: userId
                },
                startedAt: (0, _typeorm1.Between)(startDate, endDate)
            },
            order: {
                startedAt: 'DESC'
            }
        });
        // 2. Sales Ledger (Include broader statuses for real-time view)
        const salesItems = await this.orderItemRepository.createQueryBuilder('oi').leftJoinAndSelect('oi.menuItem', 'mi').leftJoinAndSelect('mi.category', 'cat').leftJoinAndSelect('oi.transaction', 't').leftJoinAndSelect('t.table', 'table').leftJoinAndSelect('t.cafeTable', 'ct').where('(oi.commissionUserId = :userId OR (oi.commissionUserId IS NULL AND oi.createdByUserId = :userId))', {
            userId
        }).andWhere('oi.createdAt BETWEEN :start AND :end', {
            start: startDate,
            end: endDate
        }).andWhere('oi.status IN (:...statuses)', {
            statuses: [
                _orderitementity.OrderItemStatus.DONE,
                _orderitementity.OrderItemStatus.QUEUED,
                _orderitementity.OrderItemStatus.PROCESSING
            ]
        }).andWhere('(oi.isPaid = true OR t.status != :cancelledStatus)', {
            cancelledStatus: _transactionentity.TransactionStatus.CANCELLED
        }).orderBy('oi.createdAt', 'DESC').getMany();
        // 3. Penalty Ledger
        const violations = await this.violationRepository.find({
            where: {
                userId,
                createdAt: (0, _typeorm1.Between)(startDate, endDate)
            },
            order: {
                createdAt: 'DESC'
            }
        });
        // 4. Production Ledger (Completed Items)
        const productionItems = await this.orderItemRepository.createQueryBuilder('oi').leftJoinAndSelect('oi.menuItem', 'mi').leftJoinAndSelect('mi.category', 'cat').leftJoinAndSelect('oi.transaction', 't').leftJoinAndSelect('t.table', 'table').leftJoinAndSelect('t.cafeTable', 'ct').where('oi.completedByUserId = :userId', {
            userId
        }).andWhere('oi.completedAt BETWEEN :start AND :end', {
            start: startDate,
            end: endDate
        }).andWhere('oi.status = :status', {
            status: _orderitementity.OrderItemStatus.DONE
        }).andWhere('(oi.isPaid = true OR t.status != :cancelledStatus)', {
            cancelledStatus: _transactionentity.TransactionStatus.CANCELLED
        }).orderBy('oi.completedAt', 'DESC').getMany();
        // 5. Fetch Payroll Config for Percentage mapping
        const config = await this.payrollRepository.findOne({
            where: {
                user: {
                    id: userId
                }
            }
        });
        const commMap = config?.categoryCommissions || {};
        // Normalize commMap keys to Uppercase for matching
        const normalizedCommMap = {};
        Object.entries(commMap).forEach(([cat, val])=>{
            normalizedCommMap[cat.trim().toUpperCase()] = val;
        });
        const defaultPercent = config?.commissionSalesPercent || 0;
        // 6. Daily Summary Aggregation
        const dailySummary = {};
        statusLogs.forEach((log)=>{
            const date = new Date(log.startedAt).toISOString().split('T')[0];
            if (!dailySummary[date]) dailySummary[date] = {
                active: 0,
                away: 0,
                offline: 0
            };
            const duration = log.durationSeconds || 0;
            if (log.status === _userentity.UserStatus.ACTIVE) dailySummary[date].active += duration;
            else if (log.status === _userentity.UserStatus.AWAY) dailySummary[date].away += duration;
            else dailySummary[date].offline += duration;
        });
        return {
            statusLogs,
            dailySummary: Object.entries(dailySummary).map(([date, stats])=>({
                    date,
                    ...stats
                })),
            salesLedger: salesItems.map((item)=>{
                const rawCat = item.menuItem?.category;
                const categoryName = (typeof rawCat === 'object' ? rawCat?.name : rawCat) || 'Uncategorized';
                const catKey = categoryName.trim().toUpperCase();
                const percent = normalizedCommMap[catKey] !== undefined ? normalizedCommMap[catKey] : defaultPercent;
                const originalVolume = +item.priceAtOrder * item.quantity;
                const itemDiscount = Number(item.discountAmount || 0);
                let discountedVolume = originalVolume - itemDiscount;
                if (itemDiscount === 0) {
                    const tx = item.transaction;
                    if (tx && Number(tx.discountAmount || 0) > 0) {
                        const billTotal = Number(tx.billiardTotal || 0);
                        const cafeTotal = Number(tx.cafeTotal || 0);
                        const totalBeforeDisc = billTotal + cafeTotal;
                        if (totalBeforeDisc > 0) {
                            const discRatio = Number(tx.discountAmount) / totalBeforeDisc;
                            discountedVolume = originalVolume * (1 - discRatio);
                        }
                    }
                }
                return {
                    id: item.id,
                    itemName: item.menuItem?.name || item.customName || 'Unknown',
                    category: categoryName,
                    quantity: item.quantity,
                    price: +item.priceAtOrder,
                    total: originalVolume,
                    commissionPercent: percent,
                    commissionAmount: discountedVolume * percent / 100,
                    tableName: item.transaction?.table?.tableName || item.transaction?.cafeTable?.tableName || 'Walk-in',
                    invoiceNumber: item.transaction?.invoiceNumber,
                    createdAt: item.createdAt,
                    status: item.status
                };
            }),
            productionLedger: productionItems.map((item)=>{
                const rawCat = item.menuItem?.category;
                const categoryName = (typeof rawCat === 'object' ? rawCat?.name : rawCat) || 'Uncategorized';
                const catKey = categoryName.trim().toUpperCase();
                const percent = normalizedCommMap[catKey] !== undefined ? normalizedCommMap[catKey] : defaultPercent;
                return {
                    id: item.id,
                    itemName: item.menuItem?.name || item.customName || 'Unknown',
                    category: categoryName,
                    quantity: item.quantity,
                    price: +item.priceAtOrder,
                    total: +item.priceAtOrder * item.quantity,
                    commissionPercent: percent,
                    commissionAmount: +item.priceAtOrder * item.quantity * percent / 100,
                    tableName: item.transaction?.table?.tableName || item.transaction?.cafeTable?.tableName || 'Walk-in',
                    invoiceNumber: item.transaction?.invoiceNumber,
                    createdAt: item.completedAt
                };
            }),
            penaltyLedger: violations
        };
    }
    async getMonitoringSummary() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date();
        tomorrow.setHours(23, 59, 59, 999);
        const users = await this.userRepository.find({
            relations: [
                'role'
            ]
        });
        const summary = await Promise.all(users.map(async (user)=>{
            const logs = await this.statusLogRepository.find({
                where: {
                    user: {
                        id: user.id
                    },
                    startedAt: (0, _typeorm1.Between)(today, tomorrow),
                    status: _userentity.UserStatus.ACTIVE
                }
            });
            const activeSeconds = logs.reduce((sum, log)=>sum + (log.durationSeconds || 0), 0);
            return {
                userId: user.id,
                name: user.name,
                status: user.status,
                currentActivePage: user.currentActivePage,
                activeSeconds,
                activeHours: (activeSeconds / 3600).toFixed(2)
            };
        }));
        return summary;
    }
    async hasActiveShift(userId) {
        const count = await this.userRepository.manager.createQueryBuilder().select('id').from('shifts', 's').where('s.userId = :userId AND s.status = :status', {
            userId,
            status: 'OPEN'
        }).getCount();
        return count > 0;
    }
    async getPayrollHistory() {
        return this.payrollReleaseRepository.find({
            relations: [
                'user'
            ],
            order: {
                releasedAt: 'DESC'
            }
        });
    }
    async getReleaseById(id) {
        return this.payrollReleaseRepository.findOne({
            where: {
                id
            },
            relations: [
                'user'
            ]
        });
    }
    constructor(payrollRepository, violationRepository, transactionRepository, orderItemRepository, userRepository, roleRepository, statusLogRepository, payrollReleaseRepository, attendanceRepository, eventsGateway, shiftService, whatsAppService){
        this.payrollRepository = payrollRepository;
        this.violationRepository = violationRepository;
        this.transactionRepository = transactionRepository;
        this.orderItemRepository = orderItemRepository;
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.statusLogRepository = statusLogRepository;
        this.payrollReleaseRepository = payrollReleaseRepository;
        this.attendanceRepository = attendanceRepository;
        this.eventsGateway = eventsGateway;
        this.shiftService = shiftService;
        this.whatsAppService = whatsAppService;
        this.logger = new _common.Logger(UserService.name);
    }
};
UserService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_param(0, (0, _typeorm.InjectRepository)(_payrollconfigentity.PayrollConfig)),
    _ts_param(1, (0, _typeorm.InjectRepository)(_violationentity.Violation)),
    _ts_param(2, (0, _typeorm.InjectRepository)(_transactionentity.Transaction)),
    _ts_param(3, (0, _typeorm.InjectRepository)(_orderitementity.OrderItem)),
    _ts_param(4, (0, _typeorm.InjectRepository)(_userentity.User)),
    _ts_param(5, (0, _typeorm.InjectRepository)(_roleentity.Role)),
    _ts_param(6, (0, _typeorm.InjectRepository)(_userstatuslogentity.UserStatusLog)),
    _ts_param(7, (0, _typeorm.InjectRepository)(_payrollreleaseentity.PayrollRelease)),
    _ts_param(8, (0, _typeorm.InjectRepository)(_attendanceentity.Attendance)),
    _ts_param(9, (0, _common.Inject)((0, _common.forwardRef)(()=>{
        const { EventsGateway: EventsGateway1 } = require('../socket/events.gateway');
        return EventsGateway1;
    }))),
    _ts_param(10, (0, _common.Inject)((0, _common.forwardRef)(()=>_shiftservice.ShiftService))),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof EventsGateway === "undefined" ? Object : EventsGateway,
        typeof _shiftservice.ShiftService === "undefined" ? Object : _shiftservice.ShiftService,
        typeof _whatsappservice.WhatsAppService === "undefined" ? Object : _whatsappservice.WhatsAppService
    ])
], UserService);

//# sourceMappingURL=user.service.js.map