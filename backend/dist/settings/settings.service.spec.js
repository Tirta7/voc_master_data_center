"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
const _testing = require("@nestjs/testing");
const _settingsservice = require("./settings.service");
describe('SettingsService', ()=>{
    let service;
    beforeEach(async ()=>{
        const module = await _testing.Test.createTestingModule({
            providers: [
                _settingsservice.SettingsService
            ]
        }).compile();
        service = module.get(_settingsservice.SettingsService);
    });
    it('should be defined', ()=>{
        expect(service).toBeDefined();
    });
});

//# sourceMappingURL=settings.service.spec.js.map