"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
const _testing = require("@nestjs/testing");
const _reportcontroller = require("./report.controller");
describe('ReportController', ()=>{
    let controller;
    beforeEach(async ()=>{
        const module = await _testing.Test.createTestingModule({
            controllers: [
                _reportcontroller.ReportController
            ]
        }).compile();
        controller = module.get(_reportcontroller.ReportController);
    });
    it('should be defined', ()=>{
        expect(controller).toBeDefined();
    });
});

//# sourceMappingURL=report.controller.spec.js.map