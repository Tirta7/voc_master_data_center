"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
const _testing = require("@nestjs/testing");
const _hardwareservice = require("./hardware.service");
describe('HardwareService', ()=>{
    let service;
    beforeEach(async ()=>{
        const module = await _testing.Test.createTestingModule({
            providers: [
                _hardwareservice.HardwareService
            ]
        }).compile();
        service = module.get(_hardwareservice.HardwareService);
    });
    it('should be defined', ()=>{
        expect(service).toBeDefined();
    });
});

//# sourceMappingURL=hardware.service.spec.js.map