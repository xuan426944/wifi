import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload = exception instanceof HttpException ? exception.getResponse() : undefined;
    const body =
      typeof payload === "object" && payload !== null && "code" in payload
        ? payload
        : {
            code: status === HttpStatus.INTERNAL_SERVER_ERROR ? 500001 : status,
            message: exception instanceof Error ? exception.message : "系统错误",
          };
    response.status(status).json(body);
  }
}
