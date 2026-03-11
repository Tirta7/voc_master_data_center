import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('AllExceptionsFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = (exception as any).message || 'Internal server error';
    const stack = (exception as any).stack || '';

    console.error(
      `!!! EXCEPTION CAUGHT !!! [${request.method}] ${request.url}`,
    );
    console.error(`Status: ${status}, Message: ${message}`);
    console.error(stack);

    this.logger.error(
      `[${request.method}] ${request.url} - Status: ${status} - Error: ${message}`,
      stack,
    );

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: message,
    });
  }
}
