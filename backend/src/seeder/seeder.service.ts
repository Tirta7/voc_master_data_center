import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { UserStatus } from '../user/entities/user.entity';

@Injectable()
export class SeederService implements OnApplicationBootstrap {
  constructor(private userService: UserService) {}

  async onApplicationBootstrap() {
    const roles = await this.userService.findAllRoles();
    if (roles.length === 0) {
      console.log('Seeding initial superadmin...');

      // 1. Create ADMIN Role
      const adminRole = await this.userService.createRole('ADMIN', [
        'DASHBOARD_TABLE',
        'START_TABLE',
        'MOVE_TABLE',
        'SWITCH_PACKAGE',
        'SET_PRICE',
        'VOID_BILLING',
        'VIEW_MENU',
        'ORDER_MENU',
        'MANAGE_RETAIL',
        'VOID_ORDER',
        'ACCESS_KDS',
        'ACCESS_BDS',
        'VIEW_INVENTORY',
        'UPDATE_INVENTORY',
        'MANAGE_RECIPE',
        'STOCK_ALERT',
        'VIEW_REVENUE',
        'VIEW_PROFIT_LOSS',
        'MANAGE_EXPENSES',
        'REPRINT_INVOICE',
        'MANAGE_EMPLOYEES',
        'MANAGE_PAYROLL',
        'MONITOR_ACTIVITY',
        'FORCE_LOGOUT',
        'BILLIARD_PRICING',
        'PROMO_MANAGE',
        'BUSINESS_DAY_VIEW',
        'BUSINESS_DAY_CLOSE',
        'SHIFT_START',
        'WAITING_LIST_VIEW',
        'WAITING_LIST_MANAGE',
      ]);

      // 2. Create Single Superadmin
      await this.userService.createEmployee({
        name: 'Super Admin',
        username: 'admin',
        password: '123',
        email: 'admin@voc-billiard.com',
        roleId: adminRole.id,
        status: UserStatus.ACTIVE,
        basicSalary: 7500000,
      });

      console.log(
        'PostgreSQL Initial Seed complete. Username: admin / Password: 123',
      );
    }
  }
}
