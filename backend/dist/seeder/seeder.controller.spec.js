"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
const _testing = require("@nestjs/testing");
const _seedercontroller = require("./seeder.controller");
describe('SeederController', ()=>{
    let controller;
    beforeEach(async ()=>{
        const module = await _testing.Test.createTestingModule({
            controllers: [
                _seedercontroller.SeederController
            ]
        }).compile();
        controller = module.get(_seedercontroller.SeederController);
    });
    it('should be defined', ()=>{
        expect(controller).toBeDefined();
    });
});

//# sourceMappingURL=seeder.controller.spec.js.map