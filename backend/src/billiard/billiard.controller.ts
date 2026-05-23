import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Patch,
  Delete,
  Logger,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MessagePattern, Payload, Ctx, MqttContext } from '@nestjs/microservices';
import { BilliardService } from './billiard.service';
import { BilliardGateway } from '../socket/billiard.gateway';
import { Table, TableStatus } from './entities/table.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';

@Controller('billiard')
export class BilliardController {
  private readonly logger = new Logger(BilliardController.name);

  constructor(
    private readonly billiardService: BilliardService,
    private readonly billiardGateway: BilliardGateway,
    @InjectRepository(Table)
    private readonly tableRepository: Repository<Table>,
  ) {}

  // ✅ DEBUG: Endpoint untuk cek isi database meja
  @Get('debug/dump-config')
  async debugDump() {
    const tables = await this.tableRepository.find({ where: { deletedAt: IsNull() } });
    return tables.map(t => ({
      id: t.id,
      name: t.tableName,
      mac: t.macAddress,
      gateway: t.espnowGatewayMac,
      relay: t.relayPin,
      hw: t.hardwareType
    }));
  }

  @Post('debug/online/:tableId')
  async debugForceOnline(@Param('tableId') tableId: string) {
    const id = Number(tableId);
    this.billiardGateway.handleHeartbeat(id, {
      online: true, lightState: false, status: 'OFF',
      hwType: 'ESPNOW_NODE', mode: 'OTOMATIS', masterEnabled: true,
      tableIdentity: `Debug Table ${id}`, isRetained: false,
    });
    return { ok: true, tableId: id, message: `Heartbeat ONLINE sent for table ${id}` };
  }

  @MessagePattern('billiard/table/+/status')
  async handleTableStatus(@Payload() data: any, @Ctx() context: MqttContext) {
    const topic = context.getTopic();
    const parts = topic.split('/');
    const idOrMac = parts[2];

    this.logger.debug(`Received status: ${idOrMac} → ${JSON.stringify(data)}`);

    // ✅ v7.2: Jika topic berupa MAC Address → SELALU gunakan MAC lookup
    // JANGAN gunakan data.tableId karena itu adalah relayPin (Mesa ID),
    // BUKAN database ID. Contoh: Meja 4 punya relayPin=4 tapi DB ID=14.
    if (isNaN(Number(idOrMac))) {
      await this.billiardService.handleHeartbeatByMac(idOrMac, { ...data, online: true });
      return;
    }

    // Jika topic berupa angka (Database Table ID)
    await this.billiardService.handleHeartbeat(Number(idOrMac), { ...data, online: true });
  }

  @Get('tables')
  async getAllTables() {
    return this.billiardService.getAllTables();
  }

  @Get('suggested-id')
  async getSuggestedId() {
    const nextId = await this.billiardService.getSuggestedMesaId();
    return { nextId };
  }

  @Get('tables/:id')
  async getTable(@Param('id') id: number) {
    return this.billiardService.getTableById(id);
  }

  @Get('packages')
  @UseGuards(AuthGuard('jwt'))
  async getPackages() {
    return this.billiardService.getPackages();
  }

  @Post('packages')
  @UseGuards(AuthGuard('jwt'))
  async createPackage(@Body() data: any) {
    return this.billiardService.createPackage(data);
  }

  @Delete('packages/:id')
  @UseGuards(AuthGuard('jwt'))
  async deletePackage(@Param('id') id: number) {
    return this.billiardService.deletePackage(id);
  }

  @Patch('packages/:id')
  @UseGuards(AuthGuard('jwt'))
  async updatePackage(@Param('id') id: number, @Body() data: any) {
    return this.billiardService.updatePackage(id, data);
  }

  @Post('tables')
  @UseGuards(AuthGuard('jwt'))
  async createTable(@Body() tableData: Partial<Table>) {
    return this.billiardService.createTable(tableData);
  }

  @Patch('tables/:id')
  @UseGuards(AuthGuard('jwt'))
  async updateTable(@Param('id') id: number, @Body() data: Partial<Table>) {
    return this.billiardService.updateTable(id, data);
  }

  @Delete('tables/:id')
  @UseGuards(AuthGuard('jwt'))
  async deleteTable(@Param('id') id: number) {
    return this.billiardService.deleteTable(id);
  }

  @Patch('tables/:id/status')
  @UseGuards(AuthGuard('jwt'))
  async updateStatus(
    @Param('id') id: number,
    @Body('status') status: TableStatus,
  ) {
    return this.billiardService.updateTableStatus(id, status);
  }

  @Patch('tables/:id/toggle-light')
  @UseGuards(AuthGuard('jwt'))
  async toggleLight(@Param('id') id: string, @Body() body: { isOn: boolean }) {
    // ✅ v7.0: Cooldown Redis dihapus dari sini.
    // Debounce (80ms) kini dilakukan di Frontend (cancel-and-replace pattern).
    // Backend hanya perlu memproses setiap request valid yang masuk.
    // Anti-spam sesungguhnya sudah ada di BilliardService.lastCommandAt (v17.2).
    const isOn = body?.isOn === true;
    return this.billiardService.toggleLight(+id, isOn);
  }

  // NOTE: ping-all must be BEFORE tables/:id/ping to avoid route collision
  @Post('tables/ping-all')
  @UseGuards(AuthGuard('jwt'))
  async pingAllTables() {
    const tables = await this.billiardService.getAllTables();
    const results = await Promise.allSettled(
      tables.map((t) => this.billiardService.pingTable(t.id)),
    );
    return results.map((r, i) => ({
      tableId: tables[i].id,
      tableName: tables[i].tableName,
      status: r.status,
      result:
        r.status === 'fulfilled'
          ? r.value
          : { error: (r as any).reason?.message },
    }));
  }

  @Post('tables/:id/ping')
  @UseGuards(AuthGuard('jwt'))
  async pingTable(@Param('id') id: string) {
    return this.billiardService.pingTable(+id);
  }

  @Patch('tables/:id/gpio/:pin')
  @UseGuards(AuthGuard('jwt'))
  async testGpio(
    @Param('id') id: string,
    @Param('pin') pin: string,
    @Body('isOn') isOn: boolean,
  ) {
    return this.billiardService.testGpioPin(+id, +pin, isOn);
  }

  @Post('tables/:id/start')
  @UseGuards(AuthGuard('jwt'))
  async startSession(
    @Param('id') id: number,
    @Body()
    body: {
      type: 'prepaid' | 'open';
      duration?: number;
      customerName?: string;
      packageId?: number;
      customPriceSettings?: any;
      promoId?: number;
      memberId?: number;
      idempotencyKey?: string;
    },
    @Request() req: any,
  ) {
    this.logger.log(
      `BilliardController.startSession: ${id}, user: ${req.user.id}, customer: ${body.customerName}, pkg: ${body.packageId}, member: ${body.memberId}`,
    );
    return this.billiardService.startSession(
      id,
      body.type,
      body.duration,
      body.customerName,
      body.packageId,
      body.customPriceSettings,
      body.promoId,
      req.user.id,
      req.user.username,
      body.memberId,
      body.idempotencyKey,
    );
  }

  @Post('tables/:id/stop')
  @UseGuards(AuthGuard('jwt'))
  async stopSession(@Param('id') id: number, @Request() req: any) {
    return this.billiardService.stopSession(id, req.user.id, req.user.username);
  }

  @Patch('tables/:id/switch-session')
  @UseGuards(AuthGuard('jwt'))
  async switchSession(
    @Param('id') id: number,
    @Body() body: { type: 'prepaid' | 'open'; duration?: number },
  ) {
    return this.billiardService.switchSession(id, body.type, body.duration);
  }

  @Post('tables/:id/extend')
  @UseGuards(AuthGuard('jwt'))
  async extendSession(
    @Param('id') id: number,
    @Body()
    body: { duration?: number; packageId?: number; ignoreConflict?: boolean },
    @Request() req: any,
  ) {
    this.logger.log(
      `BilliardController.extendSession: Requested for table ${id} by ${req.user.username}. Duration: ${body.duration}, Pkg: ${body.packageId}`,
    );
    return this.billiardService.extendSession(
      id,
      body.duration,
      body.packageId,
      req.user.username,
      body.ignoreConflict,
    );
  }
  @Post('move')
  @UseGuards(AuthGuard('jwt'))
  async moveTable(
    @Body() data: { fromTableId: number; toTableId: number },
    @Request() req: any,
  ) {
    return this.billiardService.moveTable(
      data.fromTableId,
      data.toTableId,
      req.user.username,
    );
  }

  @Post('tables/:id/reset')
  @UseGuards(AuthGuard('jwt'))
  async resetTable(@Param('id') id: string, @Request() req: any) {
    return this.billiardService.resetTable(+id, req.user.username);
  }

  @Post('tables/:id/reboot')
  @UseGuards(AuthGuard('jwt'))
  async rebootTable(@Param('id') id: string) {
    return this.billiardService.rebootTable(+id);
  }

  @Post('reset-all')
  @UseGuards(AuthGuard('jwt'))
  async resetAllDbTables(@Request() req: any) {
    try {
      const tables = await this.billiardService.getAllTables();
      for (const table of tables) {
        await this.billiardService.resetTable(table.id, req.user.username);
      }

      // Also mark all UNPAID transactions as CANCELLED (or COMPLETED if that is the business rule)
      // reset-tables.js used COMPLETED, but for a global reset, CANCELLED might be safer unless they are already "done".
      // We will stick to the service's transaction cleanup if we add it there.

      return { message: `${tables.length} tables successfully reset.` };
    } catch (e) {
      this.logger.error(e);
      return { error: e.message };
    }
  }

  @Post('emergency-stop')
  @UseGuards(AuthGuard('jwt'))
  async emergencyStop(@Request() req: any) {
    return this.billiardService.emergencyStop(req.user.username);
  }

  // ✅ v7.0: Endpoint monitoring per-Prajurit (untuk Hardware Health page)
  @Get('prajurit/nodes')
  @UseGuards(AuthGuard('jwt'))
  async getPrajuritNodes() {
    const nodes = Array.from(this.billiardService.prajuritNodeMap.values());
    const summary = {
      total:      nodes.length,
      online:     nodes.filter(n => n.online).length,
      offline:    nodes.filter(n => !n.online).length,
      ackPending: nodes.filter(n => n.ackPending).length,
    };
    return { summary, nodes };
  }

  @Post('tables/:id/send-message')
  @UseGuards(AuthGuard('jwt'))
  async sendTvMessage(
    @Param('id') id: number,
    @Body() body: { message: string }
  ) {
    return this.billiardService.sendTvMessage(id, body.message);
  }

  @Get('tables/:id/tv-sleep')
  @UseGuards(AuthGuard('jwt'))
  async tvEmergencySleep(@Param('id') id: number) {
    return this.billiardService.tvEmergencyControl(id, 'sleep');
  }

  @Get('tables/:id/tv-wakeup')
  @UseGuards(AuthGuard('jwt'))
  async tvEmergencyWakeup(
    @Param('id') id: number,
    @Query('title') title: string,
    @Query('duration') duration: string,
  ) {
    return this.billiardService.tvEmergencyControl(id, 'wakeup', title, duration);
  }

  // ─── PS MANAGEMENT ENDPOINTS ────────────────────────────────────────────────

  /**
   * Batch ping semua PS unit (max 20 concurrent, delay 200ms antar batch).
   * Lebih aman dari ping-all biasa untuk 200+ unit.
   */
  @Post('ps/ping-all')
  @UseGuards(AuthGuard('jwt'))
  async pingAllPlaystations() {
    return this.billiardService.pingAllPlaystations();
  }

  /**
   * Auto-discover TV Android di jaringan lokal (scan port 1717).
   * Body: { subnet?: "192.168.1" } — opsional, auto-detect dari network interface jika kosong.
   */
  @Post('ps/discover')
  @UseGuards(AuthGuard('jwt'))
  async discoverPsIps(@Body() body: { subnet?: string }) {
    return this.billiardService.discoverPsIps(body?.subnet);
  }

  /**
   * Update IP Address banyak PS sekaligus.
   * Body: { updates: [{ id: number, ipAddress: string }] }
   */
  @Patch('ps/batch-update-ip')
  @UseGuards(AuthGuard('jwt'))
  async batchUpdateIpAddress(@Body() body: { updates: { id: number; ipAddress: string }[] }) {
    return this.billiardService.batchUpdateIpAddress(body.updates);
  }
}

