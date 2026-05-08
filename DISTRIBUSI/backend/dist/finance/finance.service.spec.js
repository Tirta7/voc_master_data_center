"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
const _testing = require("@nestjs/testing");
const _financeservice = require("./finance.service");
describe('FinanceService', ()=>{
    let service;
    beforeEach(async ()=>{
        const module = await _testing.Test.createTestingModule({
            providers: [
                _financeservice.FinanceService
            ]
        }).compile();
        service = module.get(_financeservice.FinanceService);
    });
    it('should be defined', ()=>{
        expect(service).toBeDefined();
    });
});

//# sourceMappingURL=finance.service.spec.js.map