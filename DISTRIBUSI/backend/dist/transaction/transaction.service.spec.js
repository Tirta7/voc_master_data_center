"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
const _testing = require("@nestjs/testing");
const _transactionservice = require("./transaction.service");
describe('TransactionService', ()=>{
    let service;
    beforeEach(async ()=>{
        const module = await _testing.Test.createTestingModule({
            providers: [
                _transactionservice.TransactionService
            ]
        }).compile();
        service = module.get(_transactionservice.TransactionService);
    });
    it('should be defined', ()=>{
        expect(service).toBeDefined();
    });
});

//# sourceMappingURL=transaction.service.spec.js.map