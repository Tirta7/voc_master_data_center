"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
const _testing = require("@nestjs/testing");
const _membercontroller = require("./member.controller");
describe('MemberController', ()=>{
    let controller;
    beforeEach(async ()=>{
        const module = await _testing.Test.createTestingModule({
            controllers: [
                _membercontroller.MemberController
            ]
        }).compile();
        controller = module.get(_membercontroller.MemberController);
    });
    it('should be defined', ()=>{
        expect(controller).toBeDefined();
    });
});

//# sourceMappingURL=member.controller.spec.js.map