"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "SeederService", {
    enumerable: true,
    get: function() {
        return SeederService;
    }
});
const _common = require("@nestjs/common");
const _userservice = require("../user/user.service");
const _userentity = require("../user/entities/user.entity");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let SeederService = class SeederService {
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
                'WAITING_LIST_MANAGE'
            ]);
            // 2. Create Single Superadmin
            await this.userService.createEmployee({
                name: 'Super Admin',
                username: 'admin',
                password: '123',
                email: 'admin@voc-billiard.com',
                roleId: adminRole.id,
                status: _userentity.UserStatus.ACTIVE,
                basicSalary: 7500000
            });
            console.log('PostgreSQL Initial Seed complete. Username: admin / Password: 123');
        }
    }
    constructor(userService){
        this.userService = userService;
    }
};
SeederService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _userservice.UserService === "undefined" ? Object : _userservice.UserService
    ])
], SeederService);

//# sourceMappingURL=seeder.service.js.map