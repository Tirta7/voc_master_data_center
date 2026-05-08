"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "PrinterService", {
    enumerable: true,
    get: function() {
        return PrinterService;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _typeorm1 = require("typeorm");
const _printerentity = require("./entities/printer.entity");
const _hardwareservice = require("../hardware/hardware.service");
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
let PrinterService = class PrinterService {
    async findAll() {
        return this.printerRepository.find({
            order: {
                id: 'ASC'
            }
        });
    }
    async findOne(id) {
        const printer = await this.printerRepository.findOne({
            where: {
                id
            }
        });
        if (!printer) throw new _common.NotFoundException(`Printer with ID ${id} not found`);
        return printer;
    }
    async create(data) {
        const printer = this.printerRepository.create(data);
        return this.printerRepository.save(printer);
    }
    async update(id, data) {
        await this.findOne(id);
        await this.printerRepository.update(id, data);
        return this.findOne(id);
    }
    async remove(id) {
        await this.printerRepository.delete(id);
    }
    /**
   * Find the best printer for a given table and item type.
   * Logic:
   * 1. Match by Type (KITCHEN/BARTENDER) and Floor.
   * 2. If zone-based: Match CoverageZones with Table.productionZone.
   * 3. Fallback: If primary is offline, check for Backup printers.
   */ async getPrinterForRouting(table, type) {
        const printers = await this.printerRepository.find({
            where: {
                type,
                floor: table.floorNumber,
                isActive: true
            }
        });
        if (printers.length === 0) return null;
        // Filter by Zone if table has one
        let targetPrinters = printers;
        if (table.productionZone) {
            targetPrinters = printers.filter((p)=>p.coverageZones && p.coverageZones.includes(table.productionZone));
        }
        // Default to the first active/online printer in the matched set
        const onlinePrinter = targetPrinters.find((p)=>p.isOnline);
        if (onlinePrinter) return onlinePrinter;
        // If all target printers are offline, look for a general backup on the same floor/type
        const backupPrinter = printers.find((p)=>p.isBackup && p.isOnline);
        if (backupPrinter) return backupPrinter;
        // Last resort: return any printer from the target set, even if offline (caller will handled fail-over)
        return targetPrinters[0] || null;
    }
    /**
   * Monitor printer connectivity every minute
   */ async monitorConnectivity() {
        const printers = await this.printerRepository.find({
            where: {
                isActive: true
            }
        });
        const results = await Promise.all(printers.map(async (printer)=>{
            const isOnline = await this.hardwareService.pingPrinter(printer.ipAddress, printer.port);
            if (isOnline !== printer.isOnline) {
                await this.printerRepository.update(printer.id, {
                    isOnline
                });
                return true;
            }
            return false;
        }));
        const changed = results.some((r)=>r === true);
        if (changed) {
            this.eventsGateway.server.emit('printers_status_updated', await this.findAll());
        }
    }
    async testPrint(id) {
        const printer = await this.findOne(id);
        const testPayload = "\x1B\x40" + // Initialize
        "\x1B\x61\x01" + // Align center
        "\x1B\x21\x30" + // Double height/width
        "TEST PRINT\n" + "\x1B\x21\x00" + "Printer: " + printer.name + "\n" + "IP: " + printer.ipAddress + "\n" + "Status: OK\n\n\n\n\n" + "\x1D\x56\x00"; // Full cut
        try {
            await this.hardwareService.printRaw(printer.ipAddress, printer.port, testPayload);
            return {
                success: true,
                message: 'Test print sent successfully'
            };
        } catch (error) {
            return {
                success: false,
                message: `Failed: ${error.message}`
            };
        }
    }
    constructor(printerRepository, hardwareService, eventsGateway){
        this.printerRepository = printerRepository;
        this.hardwareService = hardwareService;
        this.eventsGateway = eventsGateway;
        this.logger = new _common.Logger(PrinterService.name);
    }
};
_ts_decorate([
    (0, _schedule.Cron)(_schedule.CronExpression.EVERY_MINUTE),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], PrinterService.prototype, "monitorConnectivity", null);
PrinterService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_param(0, (0, _typeorm.InjectRepository)(_printerentity.Printer)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _hardwareservice.HardwareService === "undefined" ? Object : _hardwareservice.HardwareService,
        typeof _eventsgateway.EventsGateway === "undefined" ? Object : _eventsgateway.EventsGateway
    ])
], PrinterService);

//# sourceMappingURL=printer.service.js.map