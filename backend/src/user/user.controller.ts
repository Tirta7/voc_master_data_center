import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { UserService } from './user.service';
import { UserStatus } from './entities/user.entity';
import { ViolationType } from './entities/violation.entity';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async getProfile(@Request() req: any) {
    return this.userService.findById(req.user.id);
  }

  @Get('employees')
  async findAll() {
    return this.userService.findAllEmployees();
  }

  @Get('roles')
  async findAllRoles() {
    return this.userService.findAllRoles();
  }

  @Get('roles/max-level')
  async getMaxLevel() {
    return this.userService.getMaxApprovalLevel();
  }

  @Get('employees/payroll/bulk')
  async getBulkPayroll(
    @Query('month') month: number,
    @Query('year') year: number,
    @Query('start') start?: string,
    @Query('end') end?: string,
    @Query('includeReleased') includeReleased?: string,
  ) {
    return this.userService.calculateBulkPayroll(
      month || new Date().getMonth() + 1,
      year || new Date().getFullYear(),
      start,
      end,
      includeReleased === 'true',
    );
  }

  @Get('violations')
  async findAllViolations() {
    return this.userService.findAllViolations();
  }

  @Get('monitoring-summary')
  async getMonitoringSummary() {
    return this.userService.getMonitoringSummary();
  }

  @Post('employees')
  async create(@Body() userData: any) {
    return this.userService.createEmployee(userData);
  }

  @Patch('employees/:id')
  async update(@Param('id') id: string, @Body() userData: any) {
    return this.userService.updateEmployee(+id, userData);
  }

  @Delete('employees/:id')
  async remove(@Param('id') id: string) {
    return this.userService.deleteEmployee(+id);
  }

  @Post('import')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileInterceptor('file'))
  async importFromExcel(@UploadedFile() file: any) {
    if (!file) {
      throw new Error('No file uploaded');
    }
    return this.userService.importFromExcel(file.buffer);
  }

  @Post('roles')
  async createRole(
    @Body() data: { name: string; permissions: string[]; description?: string; approvalLevel?: number },
  ) {
    return this.userService.createRole(
      data.name,
      data.permissions,
      data.description,
      data.approvalLevel,
    );
  }

  @Patch('roles/:id')
  async updateRole(
    @Param('id') id: string,
    @Body() data: { name: string; permissions: string[]; description?: string; approvalLevel?: number },
  ) {
    return this.userService.updateRole(
      +id,
      data.name,
      data.permissions,
      data.description,
      data.approvalLevel,
    );
  }

  @Delete('roles/:id')
  async deleteRole(@Param('id') id: string) {
    return this.userService.deleteRole(+id);
  }

  @Post(':id/force-logout')
  async forceLogout(
    @Param('id') id: string,
    @Body('message') message?: string,
  ) {
    return this.userService.forceLogout(+id, message);
  }

  @Get(':id/payroll')
  @UseGuards(AuthGuard('jwt'))
  async getPayroll(
    @Param('id') id: string,
    @Query('month') month: number,
    @Query('year') year: number,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    return this.userService.calculateMonthlyPayroll(
      +id,
      month || new Date().getMonth() + 1,
      year || new Date().getFullYear(),
      start ? new Date(start) : undefined,
      end ? new Date(end) : undefined,
    );
  }

  @Get(':id/payroll/detailed')
  async getDetailedPayroll(
    @Param('id') id: string,
    @Query('month') month: number,
    @Query('year') year: number,
  ) {
    return this.userService.getDetailedPayrollReport(
      +id,
      month || new Date().getMonth() + 1,
      year || new Date().getFullYear(),
    );
  }

  @Get(':id/violations')
  async findUserViolations(@Param('id') id: string) {
    return this.userService.findUserViolations(+id);
  }

  @Post('violations')
  @UseGuards(AuthGuard('jwt'))
  async createViolation(
    @Request() req: any,
    @Body()
    data: {
      userId: number;
      type: ViolationType;
      description: string;
      penaltyAmount: number;
      durationMinutes?: number;
    },
  ) {
    return this.userService.logViolation(
      data.userId,
      data.type,
      data.description,
      data.penaltyAmount,
      data.durationMinutes,
    );
  }

  @Post(':id/payroll/release')
  @UseGuards(AuthGuard('jwt'))
  async releaseSalary(
    @Param('id') id: string,
    @Request() req: any,
    @Body('month') month: number,
    @Body('year') year: number,
  ) {
    return this.userService.releaseSalary(
      +id,
      month,
      year,
      req.user.id, // Released by
    );
  }

  @Get('payroll/history')
  async getPayrollHistory() {
    return this.userService.getPayrollHistory();
  }

  @Get('payroll/release/:id')
  async getRelease(@Param('id') id: string) {
    return this.userService.getReleaseById(+id);
  }
}
