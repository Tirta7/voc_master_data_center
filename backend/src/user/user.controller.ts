import { Controller, Get, Post, Body, Param, Patch, Delete, Query, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { UserStatus } from './entities/user.entity';

@Controller('users')
export class UserController {
    constructor(private readonly userService: UserService) { }

    @Get('employees')
    async findAll() {
        return this.userService.findAllEmployees();
    }

    @Get('roles')
    async findAllRoles() {
        return this.userService.findAllRoles();
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

    @Post('roles')
    async createRole(@Body() data: { name: string, permissions: string[], description?: string }) {
        return this.userService.createRole(data.name, data.permissions, data.description);
    }

    @Patch('roles/:id')
    async updateRole(@Param('id') id: string, @Body() data: { name: string, permissions: string[], description?: string }) {
        return this.userService.updateRole(+id, data.name, data.permissions, data.description);
    }

    @Delete('roles/:id')
    async deleteRole(@Param('id') id: string) {
        return this.userService.deleteRole(+id);
    }

    @Post(':id/force-logout')
    async forceLogout(@Param('id') id: string, @Body('message') message?: string) {
        return this.userService.forceLogout(+id, message);
    }

    @Get(':id/payroll')
    async getPayroll(@Param('id') id: string, @Query('month') month: number, @Query('year') year: number) {
        return this.userService.calculateMonthlyPayroll(+id, month || new Date().getMonth() + 1, year || new Date().getFullYear());
    }

    @Get(':id/payroll/detailed')
    async getDetailedPayroll(@Param('id') id: string, @Query('month') month: number, @Query('year') year: number) {
        return this.userService.getDetailedPayrollReport(+id, month || new Date().getMonth() + 1, year || new Date().getFullYear());
    }

    @Get(':id/violations')
    async findUserViolations(@Param('id') id: string) {
        return this.userService.findUserViolations(+id);
    }
}
