"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
const _testing = require("@nestjs/testing");
const _cafecontroller = require("./cafe.controller");
describe('CafeController', ()=>{
    let controller;
    beforeEach(async ()=>{
        const module = await _testing.Test.createTestingModule({
            controllers: [
                _cafecontroller.CafeController
            ]
        }).compile();
        controller = module.get(_cafecontroller.CafeController);
    });
    it('should be defined', ()=>{
        expect(controller).toBeDefined();
    });
});

//# sourceMappingURL=cafe.controller.spec.js.map