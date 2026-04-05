import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ModuleRef } from '@nestjs/core';
import { ApprovalModuleType } from '../entities/approval.entity';
import { InventoryService } from '../../inventory/inventory.service';
import { CafeService } from '../../cafe/cafe.service';
import { FinanceService } from '../../finance/finance.service';
import { ShiftService } from '../../finance/shift.service';

@Injectable()
export class ApprovalListener {
  constructor(private moduleRef: ModuleRef) {}

  @OnEvent('approval.finalized')
  async handleApprovalFinalized(payload: {
    moduleType: ApprovalModuleType;
    referenceId: number;
    requestId: number;
    metadata?: any;
  }) {
    const { moduleType, referenceId } = payload;

    switch (moduleType) {
      case ApprovalModuleType.WASTE:
        const inventoryService1 = this.moduleRef.get(InventoryService, { strict: false });
        await inventoryService1.finalizeWaste(referenceId);
        break;
      case ApprovalModuleType.EXPENSE:
        const financeService = this.moduleRef.get(FinanceService, { strict: false });
        await financeService.finalizeExpense(referenceId);
        break;
      case ApprovalModuleType.CLOSING:
        const shiftService = this.moduleRef.get(ShiftService, { strict: false });
        await shiftService.finalizeClosing(referenceId);
        break;
      case ApprovalModuleType.STOCK_UPDATE:
        const inventoryService2 = this.moduleRef.get(InventoryService, { strict: false });
        await inventoryService2.finalizeStockUpdate(referenceId, payload.metadata);
        break;
      case ApprovalModuleType.DATA_EDIT:
        if (payload.metadata?.entityType === 'MENU_ITEM') {
          const cafeService = this.moduleRef.get(CafeService, { strict: false });
          await cafeService.updateMenuItem(referenceId, payload.metadata.payload, undefined, undefined, true);
        } else {
          const inventoryService3 = this.moduleRef.get(InventoryService, { strict: false });
          await inventoryService3.finalizeDataEdit(referenceId, payload.metadata);
        }
        break;
    }
  }
}
