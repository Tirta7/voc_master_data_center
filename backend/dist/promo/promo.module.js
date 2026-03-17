"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "PromoModule", {
    enumerable: true,
    get: function() {
        return PromoModule;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _promoentity = require("./entities/promo.entity");
const _promoservice = require("./promo.service");
const _promocontroller = require("./promo.controller");
const _transactionentity = require("../transaction/entities/transaction.entity");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let PromoModule = class PromoModule {
};
PromoModule = _ts_decorate([
    (0, _common.Module)({
        imports: [
            _typeorm.TypeOrmModule.forFeature([
                _promoentity.Promo,
                _transactionentity.Transaction
            ])
        ],
        providers: [
            _promoservice.PromoService
        ],
        controllers: [
            _promocontroller.PromoController
        ],
        exports: [
            _promoservice.PromoService
        ]
    })
], PromoModule);

//# sourceMappingURL=promo.module.js.map