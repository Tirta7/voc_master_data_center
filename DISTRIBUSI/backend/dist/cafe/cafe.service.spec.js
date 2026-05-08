"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
const _testing = require("@nestjs/testing");
const _cafeservice = require("./cafe.service");
describe('CafeService', ()=>{
    let service;
    beforeEach(async ()=>{
        const module = await _testing.Test.createTestingModule({
            providers: [
                _cafeservice.CafeService
            ]
        }).compile();
        service = module.get(_cafeservice.CafeService);
    });
    it('should be defined', ()=>{
        expect(service).toBeDefined();
    });
});

//# sourceMappingURL=cafe.service.spec.js.map