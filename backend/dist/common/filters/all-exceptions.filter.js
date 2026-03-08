"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "AllExceptionsFilter", {
    enumerable: true,
    get: function() {
        return AllExceptionsFilter;
    }
});
const _common = require("@nestjs/common");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let AllExceptionsFilter = class AllExceptionsFilter {
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const status = exception instanceof _common.HttpException ? exception.getStatus() : _common.HttpStatus.INTERNAL_SERVER_ERROR;
        const message = exception.message || 'Internal server error';
        const stack = exception.stack || '';
        console.error(`!!! EXCEPTION CAUGHT !!! [${request.method}] ${request.url}`);
        console.error(`Status: ${status}, Message: ${message}`);
        console.error(stack);
        this.logger.error(`[${request.method}] ${request.url} - Status: ${status} - Error: ${message}`, stack);
        response.status(status).json({
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            message: message
        });
    }
    constructor(){
        this.logger = new _common.Logger('AllExceptionsFilter');
    }
};
AllExceptionsFilter = _ts_decorate([
    (0, _common.Catch)()
], AllExceptionsFilter);

//# sourceMappingURL=all-exceptions.filter.js.map