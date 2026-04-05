const fs = require('fs');

let code = fs.readFileSync('src/inventory/inventory.service.ts', 'utf8');

// Add Missing Imports
if (!code.includes('ApprovalService')) {
    code = code.replace(
        "import { Injectable, NotFoundException } from '@nestjs/common';",
        "import { Injectable, NotFoundException } from '@nestjs/common';\nimport { ApprovalService } from '../common/approval/approval.service';\nimport { ApprovalModuleType } from '../common/entities/approval.entity';\nimport { Waste, WasteStatus } from './entities/waste.entity';"
    );
}

// Inject ApprovalService into constructor
if (!code.includes('private readonly approvalService: ApprovalService')) {
    code = code.replace(
        "private readonly reportService: ReportService,",
        "private readonly reportService: ReportService,\n    private readonly approvalService: ApprovalService,"
    );
}

// Ensure WasteRepo is injected
if (!code.includes('private readonly wasteRepository: Repository<Waste>')) {
    code = code.replace(
        "private readonly reportService: ReportService,",
        "@InjectRepository(Waste) private readonly wasteRepository: Repository<Waste>,\n    private readonly reportService: ReportService,"
    );
}

// Update `updateIngredient`
if (!code.includes('pendingApproval: true')) {
    const updateIngStr = `  async updateIngredient(id: number, data: any): Promise<Ingredient> {
    try {
      const ingredient = (await this.ingredientRepository.findOne({`;

    const updateIngRepl = `  async updateIngredient(id: number, data: any, userId?: number, bypassApproval?: boolean): Promise<any> {
    try {
      const settings = await this.settingsService.getSettings();
      const config = settings.approvalConfig?.DATA_EDIT;

      if (config && config.length > 0 && !bypassApproval && userId) {
        const oldIng = await this.ingredientRepository.findOne({ where: { id } });
        await this.approvalService.createRequest({
          moduleType: ApprovalModuleType.DATA_EDIT,
          referenceId: id,
          requestedByUserId: userId,
          requiredLevels: [...config].sort((a, b) => a - b),
          metadata: {
            entityType: 'INGREDIENT',
            itemName: oldIng?.name || 'Unknown',
            payload: data,
          },
        });
        return { pendingApproval: true };
      }

      const ingredient = (await this.ingredientRepository.findOne({`;

    if (code.includes(updateIngStr)) {
        code = code.replace(updateIngStr, updateIngRepl);
    }
}

// Update `updateStock`
if (!code.includes('moduleType: ApprovalModuleType.STOCK_UPDATE')) {
    const updateStockStr = `  async updateStock(
    id: number,
    quantity: number,
    type: 'add' | 'subtract' = 'subtract',
    userName?: string,
    reason?: string,
    manager?: any,
  ): Promise<Ingredient> {
    const repo = manager`;

    const updateStockRepl = `  async updateStock(
    id: number,
    quantity: number,
    type: 'add' | 'subtract' = 'subtract',
    userName?: string,
    reason?: string,
    manager?: any,
    userId?: number,
    bypassApproval?: boolean
  ): Promise<any> {
    const settings = await this.settingsService.getSettings();
    const config = settings.approvalConfig?.STOCK_UPDATE;

    if (config && config.length > 0 && !bypassApproval && userId && !manager) {
      const oldIng = await this.ingredientRepository.findOne({ where: { id } });
      await this.approvalService.createRequest({
        moduleType: ApprovalModuleType.STOCK_UPDATE,
        referenceId: id,
        requestedByUserId: userId,
        requiredLevels: [...config].sort((a,b) => a-b),
        metadata: {
            itemName: oldIng?.name,
            quantity,
            type,
            reason,
            userName
        }
      });
      return { pendingApproval: true };
    }

    const repo = manager`;
    
    if (code.includes(updateStockStr)) {
        code = code.replace(updateStockStr, updateStockRepl);
    }
}

// Re-add declareWaste, finalizeWaste, finalizeStockUpdate, finalizeDataEdit
const methodsToAdd = `
  async declareWaste(data: {
    ingredientId: number;
    quantity: number;
    reason: string;
    recordedByUserId: number;
  }): Promise<Waste> {
    const ingredient = await this.ingredientRepository.findOne({
      where: { id: data.ingredientId },
    });
    if (!ingredient) throw new NotFoundException('Ingredient not found');

    const valuation = Number(ingredient.costPrice || 0) * Number(data.quantity);

    const waste = this.wasteRepository.create({
      ...data,
      valuation,
      status: WasteStatus.PENDING,
    });

    const savedWaste = await this.wasteRepository.save(waste);

    // Dynamic Configured Approval Request
    const settings = await this.settingsService.getSettings();
    let requiredLevels = settings.approvalConfig?.WASTE;
    if (!requiredLevels || requiredLevels.length === 0) {
      requiredLevels = [2, 3]; // fallback safety
    }

    // Ensure array is sorted lowest to highest level
    requiredLevels = [...requiredLevels].sort((a, b) => a - b);

    await this.approvalService.createRequest({
      moduleType: ApprovalModuleType.WASTE,
      referenceId: savedWaste.id,
      requestedByUserId: data.recordedByUserId,
      requiredLevels,
      metadata: {
        itemName: ingredient.name,
        quantity: data.quantity,
        unit: ingredient.unit,
        valuation,
        reason: data.reason,
      },
    });

    return savedWaste;
  }

  async finalizeWaste(wasteId: number): Promise<void> {
    const waste = await this.wasteRepository.findOne({
      where: { id: wasteId },
      relations: ['ingredient'],
    });

    if (!waste || waste.status !== WasteStatus.PENDING) return;

    await this.updateStock(
      waste.ingredientId,
      Number(waste.quantity),
      'subtract',
      'SYSTEM',
      \`Finalisasi Deklarasi Waste #\${waste.id}\`,
      undefined,
      undefined,
      true
    );

    waste.status = WasteStatus.APPROVED;
    await this.wasteRepository.save(waste);

    // this.eventsGateway.loyaltyUpdated({ type: 'WASTE_FINALIZED', waste });
  }

  async finalizeStockUpdate(referenceId: number, metadata: any): Promise<void> {
    await this.updateStock(
      referenceId,
      metadata.quantity,
      metadata.type,
      metadata.userName || 'SYSTEM',
      (metadata.reason || 'Manual Adjust') + ' (Approved)',
      undefined,
      undefined,
      true
    );
  }

  async finalizeDataEdit(referenceId: number, metadata: any): Promise<void> {
    if (metadata.entityType === 'INGREDIENT') {
      await this.updateIngredient(referenceId, metadata.payload, undefined, true);
    }
  }
}
`;

if (!code.includes('async declareWaste')) {
    code = code.replace(/\n}\s*$/, methodsToAdd);
}

fs.writeFileSync('src/inventory/inventory.service.ts', code);
console.log('Rebuilt successfully!');
