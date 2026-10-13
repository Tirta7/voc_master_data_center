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
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") {
        r = Reflect.decorate(decorators, target, key, desc);
    } else {
        for(var i = decorators.length - 1; i >= 0; i--){
            if (d = decorators[i]) {
                r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
            }
        }
    }
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let AllExceptionsFilter = class AllExceptionsFilter {
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        let status = exception instanceof _common.HttpException ? exception.getStatus() : _common.HttpStatus.INTERNAL_SERVER_ERROR;
        let message = exception?.message || 'Internal server error';
        const stack = exception?.stack || '';
        if (exception instanceof _common.HttpException) {
            const errResponse = exception.getResponse();
            if (typeof errResponse === 'string') {
                message = errResponse;
            } else if (typeof errResponse === 'object' && errResponse !== null) {
                message = errResponse.message || errResponse.error || exception.message;
            }
        } else {
            // Database errors & unhandled driver exceptions
            const err = exception;
            const rawMessage = String(err?.message || '');
            const sqlCode = err?.code || err?.driverError?.code;
            if (sqlCode === '23503' || rawMessage.includes('violates foreign key constraint')) {
                status = _common.HttpStatus.BAD_REQUEST;
                message = 'Data tidak dapat dihapus atau diubah karena masih terhubung dengan data lain di sistem (seperti riwayat transaksi, approval, atau arsip laporan). Harap periksa atau selesaikan data terkait terlebih dahulu.';
            } else if (sqlCode === '23505' || rawMessage.includes('violates unique constraint')) {
                status = _common.HttpStatus.CONFLICT;
                message = 'Data tidak dapat disimpan karena nama, kode/SKU, atau username yang sama sudah terdaftar di sistem. Silakan gunakan nama atau kode yang berbeda.';
            } else if (sqlCode === '23502' || rawMessage.includes('violates not-null constraint')) {
                status = _common.HttpStatus.BAD_REQUEST;
                message = 'Mohon lengkapi semua kolom isian wajib yang diperlukan.';
            } else if (err?.name === 'QueryFailedError') {
                status = _common.HttpStatus.BAD_REQUEST;
                message = 'Terjadi kesalahan saat memproses data pada database. Silakan coba kembali atau hubungi administrator.';
            } else {
                message = err?.message || 'Terjadi kesalahan internal pada server.';
            }
        }
        // Filter out 401/403 logs to be less noisy (normal auth events)
        if (status === _common.HttpStatus.UNAUTHORIZED || status === _common.HttpStatus.FORBIDDEN) {
            this.logger.warn(`[${request.method}] ${request.url} - Status: ${status} - ${JSON.stringify(message)}`);
        } else {
            console.error(`!!! EXCEPTION CAUGHT !!! [${request.method}] ${request.url}`);
            console.error(`Status: ${status}, Message: ${JSON.stringify(message)}`);
            if (stack) console.error(stack);
            this.logger.error(`[${request.method}] ${request.url} - Status: ${status} - Error: ${exception?.message || message}`, stack);
        }
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