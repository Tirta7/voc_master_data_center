"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "WaitingListModule", {
    enumerable: true,
    get: function() {
        return WaitingListModule;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _waitinglistentity = require("./entities/waiting-list.entity");
const _waitinglistservice = require("./waiting-list.service");
const _waitinglistcontroller = require("./waiting-list.controller");
const _tableentity = require("../billiard/entities/table.entity");
const _cafetableentity = require("../cafe-table/entities/cafe-table.entity");
const _socketmodule = require("../socket/socket.module");
const _reportmodule = require("../report/report.module");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let WaitingListModule = class WaitingListModule {
};
WaitingListModule = _ts_decorate([
    (0, _common.Module)({
        imports: [
            _typeorm.TypeOrmModule.forFeature([
                _waitinglistentity.WaitingList,
                _tableentity.Table,
                _cafetableentity.CafeTable
            ]),
            _socketmodule.SocketModule,
            _reportmodule.ReportModule
        ],
        controllers: [
            _waitinglistcontroller.WaitingListController
        ],
        providers: [
            _waitinglistservice.WaitingListService
        ],
        exports: [
            _waitinglistservice.WaitingListService
        ]
    })
], WaitingListModule);

//# sourceMappingURL=waiting-list.module.js.map