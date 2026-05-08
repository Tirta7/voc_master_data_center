"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "ApprovalListener", {
    enumerable: true,
    get: function() {
        return ApprovalListener;
    }
});
const _common = require("@nestjs/common");
const _eventemitter = require("@nestjs/event-emitter");
const _core = require("@nestjs/core");
const _approvalentity = require("../entities/approval.entity");
const _inventoryservice = require("../../inventory/inventory.service");
const _cafeservice = require("../../cafe/cafe.service");
const _financeservice = require("../../finance/finance.service");
const _shiftservice = require("../../finance/shift.service");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let ApprovalListener = class ApprovalListener {
    async handleApprovalFinalized(payload) {
        const { moduleType, referenceId } = payload;
        switch(moduleType){
            case _approvalentity.ApprovalModuleType.WASTE:
                const inventoryService1 = this.moduleRef.get(_inventoryservice.InventoryService, {
                    strict: false
                });
                await inventoryService1.finalizeWaste(referenceId);
                break;
            case _approvalentity.ApprovalModuleType.EXPENSE:
                const financeService = this.moduleRef.get(_financeservice.FinanceService, {
                    strict: false
                });
                await financeService.finalizeExpense(referenceId);
                break;
            case _approvalentity.ApprovalModuleType.CLOSING:
                const shiftService = this.moduleRef.get(_shiftservice.ShiftService, {
                    strict: false
                });
                await shiftService.finalizeClosing(referenceId);
                break;
            case _approvalentity.ApprovalModuleType.STOCK_UPDATE:
                const inventoryService2 = this.moduleRef.get(_inventoryservice.InventoryService, {
                    strict: false
                });
                await inventoryService2.finalizeStockUpdate(referenceId, payload.metadata);
                break;
            case _approvalentity.ApprovalModuleType.DATA_EDIT:
                if (payload.metadata?.entityType === 'MENU_ITEM') {
                    const cafeService = this.moduleRef.get(_cafeservice.CafeService, {
                        strict: false
                    });
                    await cafeService.updateMenuItem(referenceId, payload.metadata.payload, undefined, undefined, true);
                } else {
                    const inventoryService3 = this.moduleRef.get(_inventoryservice.InventoryService, {
                        strict: false
                    });
                    await inventoryService3.finalizeDataEdit(referenceId, payload.metadata);
                }
                break;
        }
    }
    constructor(moduleRef){
        this.moduleRef = moduleRef;
    }
};
_ts_decorate([
    (0, _eventemitter.OnEvent)('approval.finalized'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], ApprovalListener.prototype, "handleApprovalFinalized", null);
ApprovalListener = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _core.ModuleRef === "undefined" ? Object : _core.ModuleRef
    ])
], ApprovalListener);

//# sourceMappingURL=approval.listener.js.map