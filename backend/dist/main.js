"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
const _core = require("@nestjs/core");
const _appmodule = require("./app.module");
const _path = require("path");
const _allexceptionsfilter = require("./common/filters/all-exceptions.filter");
const _redisioadapter = require("./redis/redis-io.adapter");
async function bootstrap() {
    const app = await _core.NestFactory.create(_appmodule.AppModule);
    const redisIoAdapter = new _redisioadapter.RedisIoAdapter(app);
    await redisIoAdapter.connectToRedis();
    app.useWebSocketAdapter(redisIoAdapter);
    app.useGlobalFilters(new _allexceptionsfilter.AllExceptionsFilter());
    app.enableCors();
    app.useStaticAssets((0, _path.join)(__dirname, '..', 'public'));
    await app.listen(process.env.PORT ?? 4000, '0.0.0.0');
}
bootstrap();

//# sourceMappingURL=main.js.map