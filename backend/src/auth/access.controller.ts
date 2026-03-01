import { Controller, Get, Post, Body, Param, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AccessRequestStatus } from './entities/access-request.entity';

@Controller('auth/access-requests')
export class AccessController {
    constructor(private readonly authService: AuthService) { }

    @Get('pending')
    @UseGuards(AuthGuard('jwt'))
    async getPendingRequests(@Request() req: any) {
        // Only Admin or Cashier can see pending login requests
        const role = req.user.role?.name?.toUpperCase() || req.user.role?.toUpperCase();
        if (!['ADMIN', 'OWNER', 'CASHIER', 'KASIR', 'SUPERADMIN'].includes(role)) {
            throw new ForbiddenException('Anda tidak memiliki akses untuk melihat permintaan login.');
        }
        return this.authService.getPendingAccessRequests();
    }

    @Post(':id/approve')
    @UseGuards(AuthGuard('jwt'))
    async approveRequest(@Param('id') id: number, @Request() req: any, @Body('note') note?: string) {
        const role = req.user.role?.name?.toUpperCase() || req.user.role?.toUpperCase();
        if (!['ADMIN', 'OWNER', 'CASHIER', 'KASIR', 'SUPERADMIN'].includes(role)) {
            throw new ForbiddenException('Hanya Admin/Kasir yang dapat mengizinkan akses.');
        }
        return this.authService.approveAccessRequest(id, req.user.id, req.user.name, note);
    }

    @Post(':id/deny')
    @UseGuards(AuthGuard('jwt'))
    async denyRequest(@Param('id') id: number, @Request() req: any, @Body('note') note?: string) {
        const role = req.user.role?.name?.toUpperCase() || req.user.role?.toUpperCase();
        if (!['ADMIN', 'OWNER', 'CASHIER', 'KASIR', 'SUPERADMIN'].includes(role)) {
            throw new ForbiddenException('Hanya Admin/Kasir yang dapat menolak akses.');
        }
        return this.authService.denyAccessRequest(id, req.user.id, req.user.name, note);
    }
}
