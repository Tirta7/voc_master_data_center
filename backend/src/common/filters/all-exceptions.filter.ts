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

    let status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: any = (exception as any)?.message || 'Internal server error';
    const stack = (exception as any)?.stack || '';

    if (exception instanceof HttpException) {
      const errResponse = exception.getResponse();
      if (typeof errResponse === 'string') {
        message = errResponse;
      } else if (typeof errResponse === 'object' && errResponse !== null) {
        message = (errResponse as any).message || (errResponse as any).error || exception.message;
      }
    } else {
      // Database errors & unhandled driver exceptions
      const err = exception as any;
      const rawMessage = String(err?.message || '');
      const sqlCode = err?.code || err?.driverError?.code;

      if (sqlCode === '23503' || rawMessage.includes('violates foreign key constraint')) {
        status = HttpStatus.BAD_REQUEST;
        message =
          'Data tidak dapat dihapus atau diubah karena masih terhubung dengan data lain di sistem (seperti riwayat transaksi, approval, atau arsip laporan). Harap periksa atau selesaikan data terkait terlebih dahulu.';
      } else if (sqlCode === '23505' || rawMessage.includes('violates unique constraint')) {
        status = HttpStatus.CONFLICT;
        message =
          'Data tidak dapat disimpan karena nama, kode/SKU, atau username yang sama sudah terdaftar di sistem. Silakan gunakan nama atau kode yang berbeda.';
      } else if (sqlCode === '23502' || rawMessage.includes('violates not-null constraint')) {
        status = HttpStatus.BAD_REQUEST;
        message = 'Mohon lengkapi semua kolom isian wajib yang diperlukan.';
      } else if (err?.name === 'QueryFailedError') {
        status = HttpStatus.BAD_REQUEST;
        message = 'Terjadi kesalahan saat memproses data pada database. Silakan coba kembali atau hubungi administrator.';
      } else {
        message = err?.message || 'Terjadi kesalahan internal pada server.';
      }
    }

    // Filter out 401/403 logs to be less noisy (normal auth events)
    if (status === HttpStatus.UNAUTHORIZED || status === HttpStatus.FORBIDDEN) {
      this.logger.warn(
        `[${request.method}] ${request.url} - Status: ${status} - ${JSON.stringify(message)}`,
      );
    } else {
      console.error(
        `!!! EXCEPTION CAUGHT !!! [${request.method}] ${request.url}`,
      );
      console.error(`Status: ${status}, Message: ${JSON.stringify(message)}`);
      if (stack) console.error(stack);

      this.logger.error(
        `[${request.method}] ${request.url} - Status: ${status} - Error: ${(exception as any)?.message || message}`,
        stack,
      );
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: message,
    });
  }
}
