"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
const _testing = require("@nestjs/testing");
const _settingscontroller = require("./settings.controller");
describe('SettingsController', ()=>{
    let controller;
    beforeEach(async ()=>{
        const module = await _testing.Test.createTestingModule({
            controllers: [
                _settingscontroller.SettingsController
            ]
        }).compile();
        controller = module.get(_settingscontroller.SettingsController);
    });
    it('should be defined', ()=>{
        expect(controller).toBeDefined();
    });
});

//# sourceMappingURL=settings.controller.spec.js.map