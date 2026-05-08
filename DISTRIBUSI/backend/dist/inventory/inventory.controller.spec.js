"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
const _testing = require("@nestjs/testing");
const _inventorycontroller = require("./inventory.controller");
describe('InventoryController', ()=>{
    let controller;
    beforeEach(async ()=>{
        const module = await _testing.Test.createTestingModule({
            controllers: [
                _inventorycontroller.InventoryController
            ]
        }).compile();
        controller = module.get(_inventorycontroller.InventoryController);
    });
    it('should be defined', ()=>{
        expect(controller).toBeDefined();
    });
});

//# sourceMappingURL=inventory.controller.spec.js.map