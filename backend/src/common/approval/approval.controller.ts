import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ThrottlerGuard, SkipThrottle } from '@nestjs/throttler';
import { ApprovalService } from './approval.service';
import { UserService } from '../../user/user.service';

@SkipThrottle()
@UseGuards(AuthGuard('jwt'))
@Controller('approval')
export class ApprovalController {
  constructor(
    private readonly approvalService: ApprovalService,
    private readonly userService: UserService,
  ) {}

  @Get()
  async getByStatus(
    @Query('status') status: string,
    @Request() req: any,
    @Query('moduleType') moduleType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const userLevel = req.user.approvalLevel || 0;
    return this.approvalService.getRequestsByStatus(status, userLevel, {
      moduleType,
      startDate,
      endDate,
    });
  }

  @Get('count/pending')
  async countPending(@Request() req: any) {
    const userLevel = req.user.approvalLevel || 0;
    const count = await this.approvalService.countPending(userLevel);
    return { count };
  }

  @Get('stats')
  async getStats(@Request() req: any) {
    const userLevel = req.user.approvalLevel || 0;
    return this.approvalService.getStats(req.user.id, userLevel);
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.approvalService.getRequestById(+id);
  }

  @Post(':id/approve')
  async approve(@Param('id') id: string, @Body() body: { note?: string }, @Request() req: any) {
    return this.approvalService.processApproval(+id, req.user.id, 'APPROVE', body.note);
  }

  @Post(':id/reject')
  async reject(@Param('id') id: string, @Body() body: { note?: string }, @Request() req: any) {
    return this.approvalService.processApproval(+id, req.user.id, 'REJECT', body.note);
  }

  @Post(':id/bypass')
  async bypass(@Param('id') id: string, @Body() body: { note?: string }, @Request() req: any) {
    const userLevel = req.user.approvalLevel || 0;
    const userPermissions = req.user.permissions || [];
    const maxLevel = await this.userService.getMaxApprovalLevel();
    
    const isSuper = (userLevel === maxLevel && maxLevel > 0) || 
                    userPermissions.includes('APPROVAL_OVERRIDE') ||
                    req.user.role?.toUpperCase() === 'PENGAWAS';
    
    // Only the highest level OR someone with explicit OVERRIDE permission or role can bypass
    if (!isSuper) {
      throw new ForbiddenException(`Hanya Otoritas Tertinggi, Pengawas, atau Staf dengan izin OVERRIDE yang dapat melakukan bypass`);
    }
    
    return this.approvalService.processApproval(+id, req.user.id, 'APPROVE', body.note, true);
  }
}
