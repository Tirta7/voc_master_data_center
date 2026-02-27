"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
const _testing = require("@nestjs/testing");
const _billiardcontroller = require("./billiard.controller");
describe('BilliardController', ()=>{
    let controller;
    beforeEach(async ()=>{
        const module = await _testing.Test.createTestingModule({
            controllers: [
                _billiardcontroller.BilliardController
            ]
        }).compile();
        controller = module.get(_billiardcontroller.BilliardController);
    });
    it('should be defined', ()=>{
        expect(controller).toBeDefined();
    });
});

//# sourceMappingURL=billiard.controller.spec.js.map