"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "MqttModule", {
    enumerable: true,
    get: function() {
        return MqttModule;
    }
});
const _common = require("@nestjs/common");
const _microservices = require("@nestjs/microservices");
const _mqttservice = require("./mqtt.service");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let MqttModule = class MqttModule {
};
MqttModule = _ts_decorate([
    (0, _common.Global)(),
    (0, _common.Module)({
        imports: [
            _microservices.ClientsModule.register([
                {
                    name: 'MQTT_CLIENT',
                    transport: _microservices.Transport.MQTT,
                    options: {
                        url: process.env.MQTT_URL || 'mqtt://localhost:1883'
                    }
                }
            ])
        ],
        providers: [
            _mqttservice.MqttService
        ],
        exports: [
            _mqttservice.MqttService
        ]
    })
], MqttModule);

//# sourceMappingURL=mqtt.module.js.map