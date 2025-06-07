import { Response } from 'express';

export class ResponseHandler {
  static success(res: Response, message: any, data?: any, count?: number): Response {
    const response = {
      statusCode: message.statusCode,
      message: message.message,
      data,
      count,
    };
    return res.status(message.statusCode).json(response);
  }

  static error(res: Response, message: any, error?: string): Response {
    const response = {
      statusCode: message.statusCode,
      message: message.message,
      error,
    };
    return res.status(message.statusCode).json(response);
  }
}