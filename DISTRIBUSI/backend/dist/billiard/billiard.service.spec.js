"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
const _testing = require("@nestjs/testing");
const _billiardservice = require("./billiard.service");
describe('BilliardService', ()=>{
    let service;
    beforeEach(async ()=>{
        const module = await _testing.Test.createTestingModule({
            providers: [
                _billiardservice.BilliardService
            ]
        }).compile();
        service = module.get(_billiardservice.BilliardService);
    });
    it('should be defined', ()=>{
        expect(service).toBeDefined();
    });
});

//# sourceMappingURL=billiard.service.spec.js.map