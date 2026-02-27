"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
const _testing = require("@nestjs/testing");
const _transactioncontroller = require("./transaction.controller");
describe('TransactionController', ()=>{
    let controller;
    beforeEach(async ()=>{
        const module = await _testing.Test.createTestingModule({
            controllers: [
                _transactioncontroller.TransactionController
            ]
        }).compile();
        controller = module.get(_transactioncontroller.TransactionController);
    });
    it('should be defined', ()=>{
        expect(controller).toBeDefined();
    });
});

//# sourceMappingURL=transaction.controller.spec.js.map