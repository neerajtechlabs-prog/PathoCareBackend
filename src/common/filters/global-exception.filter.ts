import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  errors?: Array<{ field: string; message: string }>;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let errors: Array<{ field: string; message: string }> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const errorResponse = exception.getResponse();

      if (typeof errorResponse === 'object') {
        const objResponse = errorResponse as Record<string, unknown>;
        const responseMessage = objResponse.message;

        if (Array.isArray(responseMessage)) {
          message = responseMessage;
        } else if (typeof responseMessage === 'string') {
          message = responseMessage;
        } else {
          message = exception.message || 'Internal server error';
        }
      } else {
        message = String(errorResponse);
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const errorObject: ErrorResponse = {
      statusCode: status,
      message,
    };

    if (errors) {
      errorObject.errors = errors;
    }

    response.status(status).json(errorObject);
  }
}
