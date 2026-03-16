import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParamData,
  ParseIntPipe,
  Put,
  Delete,
} from '@nestjs/common';
import { PointReward } from './entities/point-reward.entity';

import { LoyaltyService } from './loyalty.service';

@Controller('loyalty')
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Get('catalog')
  async getCatalog() {
    return this.loyaltyService.getCatalog();
  }

  @Get('portal/member/:id')
  async getPortalMember(@Param('id', ParseIntPipe) id: number) {
    return this.loyaltyService.getPortalMember(id);
  }

  @Get('ledger/:memberId')
  async getPointLedger(@Param('memberId', ParseIntPipe) memberId: number) {
    return this.loyaltyService.getPointLedger(memberId);
  }

  @Post('redeem')
  async redeem(
    @Body('memberId', ParseIntPipe) memberId: number,
    @Body('rewardId', ParseIntPipe) rewardId: number,
    @Body('idempotencyKey') idempotencyKey?: string,
  ) {
    return this.loyaltyService.redeem(memberId, rewardId, idempotencyKey);
  }

  @Post('redeem/confirm')
  async confirmRedeem(@Body('redeemToken') redeemToken: string) {
    return this.loyaltyService.confirmRedeem(redeemToken);
  }

  @Post('game/scratch')
  async playScratchBomb(
    @Body('memberId', ParseIntPipe) memberId: number,
    @Body('betAmount') betAmount?: number,
  ) {
    return this.loyaltyService.playScratchBomb(memberId, betAmount);
  }

  @Post('game/scratch/claim')
  async claimScratchWin(
    @Body('memberId', ParseIntPipe) memberId: number,
    @Body('referenceId') referenceId: string,
    @Body('security_hash') securityHash?: string,
  ) {
    return this.loyaltyService.claimScratchWin(
      memberId,
      referenceId,
      securityHash,
    );
  }

  @Post('game/scratch/scatter')
  async buyScatter(
    @Body('memberId', ParseIntPipe) memberId: number,
    @Body('tier', ParseIntPipe) tier: number,
    @Body('betAmount') betAmount?: number,
  ) {
    return this.loyaltyService.buyScatter(memberId, tier, betAmount);
  }

  @Post('game/mahjong')
  async playMahjong(@Body('memberId', ParseIntPipe) memberId: number) {
    return this.loyaltyService.playMahjongSlot(memberId);
  }

  @Get('missions/:memberId')
  async getMissions(@Param('memberId', ParseIntPipe) memberId: number) {
    return this.loyaltyService.getMemberMissions(memberId);
  }

  @Post('missions/claim')
  async claimMission(
    @Body('memberId', ParseIntPipe) memberId: number,
    @Body('missionId', ParseIntPipe) missionId: number,
  ) {
    return this.loyaltyService.claimMissionReward(memberId, missionId);
  }

  // --- Admin API ---

  @Get('admin/rewards')
  async getAllRewardsAdmin() {
    return this.loyaltyService.getAllRewardsAdmin();
  }

  @Get('admin/rewards/:id/analysis')
  async getRewardAnalysis(@Param('id', ParseIntPipe) id: number) {
    return this.loyaltyService.getRewardMarginAnalysis(id);
  }

  @Post('admin/rewards/analyze-potential')
  async analyzePotential(
    @Body('menuItemId', ParseIntPipe) menuItemId: number,
    @Body('pointCost', ParseIntPipe) pointCost: number,
  ) {
    return this.loyaltyService.analyzePotential(menuItemId, pointCost);
  }

  @Post('admin/rewards')
  async createReward(@Body() data: Partial<PointReward>) {
    return this.loyaltyService.createReward(data);
  }

  @Put('admin/rewards/:id')
  async updateReward(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Partial<PointReward>,
  ) {
    return this.loyaltyService.updateReward(id, data);
  }

  @Delete('admin/rewards/:id')
  async deleteReward(@Param('id', ParseIntPipe) id: number) {
    return this.loyaltyService.deleteReward(id);
  }

  @Post('admin/adjust')
  async adjustPoint(
    @Body('memberId', ParseIntPipe) memberId: number,
    @Body('amount', ParseIntPipe) amount: number,
    @Body('description') description: string,
  ) {
    return this.loyaltyService.adjustPoint(memberId, amount, description);
  }

  @Get('admin/analytics')
  async getGameAnalytics() {
    return this.loyaltyService.getGameAnalytics();
  }

  @Post('admin/arme/run')
  async runARME() {
    return this.loyaltyService.autonomousRevenueManagementEngine();
  }

  @Post('admin/emergency-brake')
  async activateEmergencyBrake() {
    return this.loyaltyService.activateEmergencyBrake();
  }

  @Get('admin/members/win-stats')
  async getMemberWinStats() {
    return this.loyaltyService.getMemberWinStats();
  }

  @Post('admin/members/target-winrate')
  async setTargetWinRate(
    @Body('memberId', ParseIntPipe) memberId: number,
    @Body('targetWinRate') targetWinRate: number | null,
  ) {
    return this.loyaltyService.setTargetWinRate(memberId, targetWinRate);
  }

  @Get('portal/game/stats')
  async getPublicStats() {
    return this.loyaltyService.getGameAnalytics();
  }
}
