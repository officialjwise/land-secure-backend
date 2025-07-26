import { Response } from 'express';

export class ResponseHandler {
  static success(res: Response, message: any, data?: any, total?: number, page?: number, limit?: number): Response {
    const response = {
      status_code: message.statusCode,
      total: total || null,
      page: page || null,
      limit: limit || null,
      data,
    };
    return res.status(message.statusCode).json(response);
  }

  static paginated(res: Response, statusCode: number, data: any, total: number, page: number, limit: number): Response {
    const response = {
      status_code: statusCode,
      total,
      page,
      limit,
      data,
    };
    return res.status(statusCode).json(response);
  }

  static simple(res: Response, statusCode: number, data: any): Response {
    const response = {
      status_code: statusCode,
      total: null,
      page: null,
      limit: null,
      data,
    };
    return res.status(statusCode).json(response);
  }

  static error(res: Response, message: any, error?: string): Response {
    const response = {
      status_code: message.statusCode,
      total: null,
      page: null,
      limit: null,
      data: {
        message: message.message,
        error,
      }
    };
    return res.status(message.statusCode).json(response);
  }
}