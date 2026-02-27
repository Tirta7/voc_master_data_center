"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
const _testing = require("@nestjs/testing");
const _financecontroller = require("./finance.controller");
describe('FinanceController', ()=>{
    let controller;
    beforeEach(async ()=>{
        const module = await _testing.Test.createTestingModule({
            controllers: [
                _financecontroller.FinanceController
            ]
        }).compile();
        controller = module.get(_financecontroller.FinanceController);
    });
    it('should be defined', ()=>{
        expect(controller).toBeDefined();
    });
});

//# sourceMappingURL=finance.controller.spec.js.map