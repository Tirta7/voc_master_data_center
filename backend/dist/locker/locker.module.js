"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "LockerModule", {
    enumerable: true,
    get: function() {
        return LockerModule;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _lockerentity = require("./entities/locker.entity");
const _lockersessionentity = require("./entities/locker-session.entity");
const _lockerservice = require("./locker.service");
const _lockercontroller = require("./locker.controller");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let LockerModule = class LockerModule {
};
LockerModule = _ts_decorate([
    (0, _common.Module)({
        imports: [
            _typeorm.TypeOrmModule.forFeature([
                _lockerentity.Locker,
                _lockersessionentity.LockerSession
            ])
        ],
        controllers: [
            _lockercontroller.LockerController
        ],
        providers: [
            _lockerservice.LockerService
        ],
        exports: [
            _lockerservice.LockerService
        ]
    })
], LockerModule);

//# sourceMappingURL=locker.module.js.map