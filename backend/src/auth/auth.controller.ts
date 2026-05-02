import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AccessRequest } from './entities/access-request.entity';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() body: any) {
    const user = await this.authService.validateUser(
      body.username,
      body.password,
    );
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const role = user.role?.name?.toUpperCase() || user.role?.toUpperCase();
    const restrictedRoles = ['WAITER', 'BARTENDER', 'KITCHEN'];

    if (restrictedRoles.includes(role)) {
      const request: any = await this.authService.createAccessRequest(
        user,
        body.socketId,
      );

      // If already approved recently, skip the pending overlay
      if (request.isAlreadyApproved) {
        return this.authService.login(user);
      }

      return {
        message: 'ACCESS_PENDING',
        requestId: request.id,
        userId: user.id,
        isOutOfShift: request.isOutOfShift,
        shiftName: request.shiftName,
        shiftTimeRange: request.shiftTimeRange,
        employeeName: request.employeeName,
      };
    }

    return this.authService.login(user);
  }
}
