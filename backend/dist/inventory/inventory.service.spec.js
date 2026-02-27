"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
const _testing = require("@nestjs/testing");
const _inventoryservice = require("./inventory.service");
describe('InventoryService', ()=>{
    let service;
    beforeEach(async ()=>{
        const module = await _testing.Test.createTestingModule({
            providers: [
                _inventoryservice.InventoryService
            ]
        }).compile();
        service = module.get(_inventoryservice.InventoryService);
    });
    it('should be defined', ()=>{
        expect(service).toBeDefined();
    });
});

//# sourceMappingURL=inventory.service.spec.js.map