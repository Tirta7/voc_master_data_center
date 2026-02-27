"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
const _testing = require("@nestjs/testing");
const _kdsgateway = require("./kds.gateway");
describe('KdsGateway', ()=>{
    let gateway;
    beforeEach(async ()=>{
        const module = await _testing.Test.createTestingModule({
            providers: [
                _kdsgateway.KdsGateway
            ]
        }).compile();
        gateway = module.get(_kdsgateway.KdsGateway);
    });
    it('should be defined', ()=>{
        expect(gateway).toBeDefined();
    });
});

//# sourceMappingURL=kds.gateway.spec.js.map