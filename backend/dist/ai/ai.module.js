"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "AIModule", {
    enumerable: true,
    get: function() {
        return AIModule;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _aiservice = require("./ai.service");
const _aicontroller = require("./ai.controller");
const _battleplanentity = require("./entities/battle-plan.entity");
const _battleplanitementity = require("./entities/battle-plan-item.entity");
const _menuitementity = require("../cafe/entities/menu-item.entity");
const _transactionentity = require("../transaction/entities/transaction.entity");
const _upsellpromptentity = require("./entities/upsell-prompt.entity");
const _promoentity = require("../promo/entities/promo.entity");
const _businessdayentity = require("../finance/entities/business-day.entity");
const _userentity = require("../user/entities/user.entity");
const _orderitementity = require("../cafe/entities/order-item.entity");
const _billiardpackageentity = require("../billiard/entities/billiard-package.entity");
const _tableentity = require("../billiard/entities/table.entity");
const _cafetableentity = require("../cafe-table/entities/cafe-table.entity");
const _shiftentity = require("../finance/entities/shift.entity");
const _settingentity = require("../settings/entities/setting.entity");
const _socketmodule = require("../socket/socket.module");
const _reportmodule = require("../report/report.module");
const _chatmodule = require("../chat/chat.module");
const _financemodule = require("../finance/finance.module");
const _coachingservice = require("./coaching.service");
const _ingrediententity = require("../inventory/entities/ingredient.entity");
const _wasteentity = require("../inventory/entities/waste.entity");
const _holidayentity = require("../settings/entities/holiday.entity");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let AIModule = class AIModule {
};
AIModule = _ts_decorate([
    (0, _common.Module)({
        imports: [
            _typeorm.TypeOrmModule.forFeature([
                _battleplanentity.BattlePlan,
                _battleplanitementity.BattlePlanItem,
                _menuitementity.MenuItem,
                _billiardpackageentity.BilliardPackage,
                _tableentity.Table,
                _cafetableentity.CafeTable,
                _transactionentity.Transaction,
                _businessdayentity.BusinessDay,
                _userentity.User,
                _shiftentity.Shift,
                _settingentity.Setting,
                _orderitementity.OrderItem,
                _upsellpromptentity.UpsellPrompt,
                _promoentity.Promo,
                _ingrediententity.Ingredient,
                _wasteentity.Waste,
                _holidayentity.PublicHoliday,
                _holidayentity.BusinessClosure
            ]),
            (0, _common.forwardRef)(()=>_socketmodule.SocketModule),
            (0, _common.forwardRef)(()=>_reportmodule.ReportModule),
            (0, _common.forwardRef)(()=>_chatmodule.ChatModule),
            (0, _common.forwardRef)(()=>_financemodule.FinanceModule)
        ],
        controllers: [
            _aicontroller.AIController
        ],
        providers: [
            _aiservice.AIService,
            _coachingservice.CoachingService
        ],
        exports: [
            _aiservice.AIService,
            _coachingservice.CoachingService
        ]
    })
], AIModule);

//# sourceMappingURL=ai.module.js.map