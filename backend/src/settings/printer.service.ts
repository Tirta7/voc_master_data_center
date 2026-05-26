import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Printer, PrinterType } from './entities/printer.entity';
import { HardwareService } from '../hardware/hardware.service';
import { Table } from '../billiard/entities/table.entity';
import { EventsGateway } from '../socket/events.gateway';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class PrinterService {
  private readonly logger = new Logger(PrinterService.name);

  constructor(
    @InjectRepository(Printer)
    private readonly printerRepository: Repository<Printer>,
    private readonly hardwareService: HardwareService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async findAll(): Promise<Printer[]> {
    return this.printerRepository.find({ order: { id: 'ASC' } });
  }

  async findOne(id: number): Promise<Printer> {
    const printer = await this.printerRepository.findOne({ where: { id } });
    if (!printer) throw new NotFoundException(`Printer with ID ${id} not found`);
    return printer;
  }

  async create(data: Partial<Printer>): Promise<Printer> {
    const printer = this.printerRepository.create(data);
    return this.printerRepository.save(printer);
  }

  async update(id: number, data: Partial<Printer>): Promise<Printer> {
    await this.findOne(id);
    await this.printerRepository.update(id, data);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.printerRepository.delete(id);
  }

  /**
   * Find the best printer for a given table and item type.
   * Logic:
   * 1. Match by Type (KITCHEN/BARTENDER) and Floor.
   * 2. If zone-based: Match CoverageZones with Table.productionZone.
   * 3. Fallback: If primary is offline, check for Backup printers.
   */
  async getPrinterForRouting(table: Table, type: PrinterType): Promise<Printer | null> {
    const printers = await this.printerRepository.find({
      where: {
        type,
        floor: table.floorNumber,
        isActive: true,
      },
    });

    if (printers.length === 0) return null;

    // Filter by Zone if table has one
    let targetPrinters = printers;
    if (table.productionZone) {
      targetPrinters = printers.filter(p => 
        p.coverageZones && p.coverageZones.includes(table.productionZone)
      );
    }

    // Default to the first active/online printer in the matched set
    const onlinePrinter = targetPrinters.find(p => p.isOnline);
    if (onlinePrinter) return onlinePrinter;

    // If all target printers are offline, look for a general backup on the same floor/type
    const backupPrinter = printers.find(p => p.isBackup && p.isOnline);
    if (backupPrinter) return backupPrinter;

    // Last resort: return any printer from the target set, even if offline (caller will handled fail-over)
    return targetPrinters[0] || null;
  }

  /**
   * Monitor printer connectivity every minute
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async monitorConnectivity() {
    const printers = await this.printerRepository.find({ where: { isActive: true } });
    const results = await Promise.all(
      printers.map(async (printer) => {
        const isOnline = await this.hardwareService.pingPrinter(
          printer.ipAddress,
          printer.port,
          printer.connectionType
        );
        if (isOnline !== printer.isOnline) {
          await this.printerRepository.update(printer.id, { isOnline });
          return true;
        }
        return false;
      }),
    );

    const changed = results.some((r) => r === true);

    if (changed) {
      this.eventsGateway.server.emit('printers_status_updated', await this.findAll());
    }
  }

  async testPrint(id: number): Promise<{ success: boolean; message: string }> {
    const printer = await this.findOne(id);
    const testPayload = "\x1B\x40" + // Initialize
                       "\x1B\x61\x01" + // Align center
                       "\x1B\x21\x30" + // Double height/width
                       "TEST PRINT\n" +
                       "\x1B\x21\x00" +
                       "Printer: " + printer.name + "\n" +
                       "IP: " + printer.ipAddress + "\n" +
                       "Status: OK\n\n\n\n\n" +
                       "\x1D\x56\x00"; // Full cut

    try {
      await this.hardwareService.printRaw(printer.ipAddress, printer.port, testPayload, printer.connectionType);
      return { success: true, message: 'Test print sent successfully' };
    } catch (error) {
      return { success: false, message: `Failed: ${error.message}` };
    }
  }
}
