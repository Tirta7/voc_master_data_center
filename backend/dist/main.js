"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
const _core = require("@nestjs/core");
const _appmodule = require("./app.module");
async function bootstrap() {
    const app = await _core.NestFactory.create(_appmodule.AppModule);
    app.enableCors();
    await app.listen(process.env.PORT ?? 4000, '0.0.0.0');
}
bootstrap();

//# sourceMappingURL=main.js.map