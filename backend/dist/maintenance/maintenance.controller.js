"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "MaintenanceController", {
    enumerable: true,
    get: function() {
        return MaintenanceController;
    }
});
const _common = require("@nestjs/common");
const _passport = require("@nestjs/passport");
const _maintenanceservice = require("./maintenance.service");
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
let MaintenanceController = class MaintenanceController {
    /**
     * GET /admin/maintenance/stats
     * Melihat statistik ukuran tabel dan jumlah baris
     */ async getDatabaseStats() {
        return this.maintenanceService.getDatabaseStats();
    }
    /**
     * GET /admin/maintenance/preview?auditLogDays=30&sessionDays=90&transactionDays=90&cashflowDays=365
     * Berapa record yang AKAN terdampak (dry-run, tidak ada yang dihapus)
     */ async previewMaintenance(auditLogDays, sessionDays, transactionDays, cashflowDays) {
        return this.maintenanceService.getPreviewCounts({
            auditLogDays,
            sessionDays,
            transactionDays,
            cashflowDays
        });
    }
    /**
     * POST /admin/maintenance/run
     * Jalankan semua maintenance secara manual
     */ async runMaintenance() {
        await this.maintenanceService.runNightlyMaintenance();
        return {
            message: 'Maintenance selesai dijalankan. Cek server logs untuk detail.'
        };
    }
    /**
     * POST /admin/maintenance/purge-audit-logs?days=30
     * Hapus audit logs lebih dari N hari
     */ async purgeAuditLogs(days) {
        const count = await this.maintenanceService.purgeAuditLogs(days);
        return {
            message: `Berhasil menghapus ${count} audit log lebih dari ${days} hari`
        };
    }
    /**
     * POST /admin/maintenance/purge-sessions?days=90
     * Hapus sessions lebih dari N hari
     */ async purgeSessions(days) {
        const count = await this.maintenanceService.purgeSessions(days);
        return {
            message: `Berhasil menghapus ${count} session lebih dari ${days} hari`
        };
    }
    /**
     * POST /admin/maintenance/archive-transactions?days=90
     * Arsipkan transaksi PAID/CANCELLED lebih dari N hari
     */ async archiveTransactions(days) {
        const count = await this.maintenanceService.archiveOldTransactions(days);
        return {
            message: `Berhasil mengarsipkan ${count} transaksi lebih dari ${days} hari`
        };
    }
    /**
     * POST /admin/maintenance/archive-cashflow?days=365
     * Arsipkan cashflow lebih dari N hari
     */ async archiveCashflow(days) {
        const count = await this.maintenanceService.archiveOldCashflow(days);
        return {
            message: `Berhasil mengarsipkan ${count} cashflow lebih dari ${days} hari`
        };
    }
    /**
     * POST /admin/maintenance/ensure-archive-tables
     * Buat tabel arsip jika belum ada
     */ async ensureArchiveTables() {
        await this.maintenanceService.ensureArchiveTablesExist();
        return {
            message: 'Tabel arsip berhasil dicek/dibuat'
        };
    }
    /**
     * POST /admin/maintenance/hard-reset
     * RESET SEMUA DATA OPERASIONAL (DANGER!)
     */ async hardReset() {
        await this.maintenanceService.performHardReset();
        return {
            message: 'Database berhasil di-reset ke kondisi awal. Semua data operasional telah dihapus.'
        };
    }
    constructor(maintenanceService){
        this.maintenanceService = maintenanceService;
        this.logger = new _common.Logger(MaintenanceController.name);
    }
};
_ts_decorate([
    (0, _common.Get)('stats'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], MaintenanceController.prototype, "getDatabaseStats", null);
_ts_decorate([
    (0, _common.Get)('preview'),
    _ts_param(0, (0, _common.Query)('auditLogDays', new _common.DefaultValuePipe(30), _common.ParseIntPipe)),
    _ts_param(1, (0, _common.Query)('sessionDays', new _common.DefaultValuePipe(90), _common.ParseIntPipe)),
    _ts_param(2, (0, _common.Query)('transactionDays', new _common.DefaultValuePipe(90), _common.ParseIntPipe)),
    _ts_param(3, (0, _common.Query)('cashflowDays', new _common.DefaultValuePipe(365), _common.ParseIntPipe)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        Number,
        Number,
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], MaintenanceController.prototype, "previewMaintenance", null);
_ts_decorate([
    (0, _common.Post)('run'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], MaintenanceController.prototype, "runMaintenance", null);
_ts_decorate([
    (0, _common.Post)('purge-audit-logs'),
    _ts_param(0, (0, _common.Query)('days', new _common.DefaultValuePipe(30), _common.ParseIntPipe)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], MaintenanceController.prototype, "purgeAuditLogs", null);
_ts_decorate([
    (0, _common.Post)('purge-sessions'),
    _ts_param(0, (0, _common.Query)('days', new _common.DefaultValuePipe(90), _common.ParseIntPipe)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], MaintenanceController.prototype, "purgeSessions", null);
_ts_decorate([
    (0, _common.Post)('archive-transactions'),
    _ts_param(0, (0, _common.Query)('days', new _common.DefaultValuePipe(90), _common.ParseIntPipe)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], MaintenanceController.prototype, "archiveTransactions", null);
_ts_decorate([
    (0, _common.Post)('archive-cashflow'),
    _ts_param(0, (0, _common.Query)('days', new _common.DefaultValuePipe(365), _common.ParseIntPipe)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], MaintenanceController.prototype, "archiveCashflow", null);
_ts_decorate([
    (0, _common.Post)('ensure-archive-tables'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], MaintenanceController.prototype, "ensureArchiveTables", null);
_ts_decorate([
    (0, _common.Post)('hard-reset'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], MaintenanceController.prototype, "hardReset", null);
MaintenanceController = _ts_decorate([
    (0, _common.Controller)('admin/maintenance'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _maintenanceservice.MaintenanceService === "undefined" ? Object : _maintenanceservice.MaintenanceService
    ])
], MaintenanceController);

//# sourceMappingURL=maintenance.controller.js.map