import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector, private jwtService: JwtService, private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!roles) return true; // No roles specified, allow access

    const request = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return false;
    }

    const token = authHeader.split(' ')[1];
    try {
      const payload = this.jwtService.verify(token, { secret: this.configService.get('JWT_SECRET') });
      request.user = payload; // Set user on request for later use
      res.locals.user = { userId: payload.sub, role: payload.role }; // Set on response locals
      return roles.includes(payload.role);
    } catch (error) {
      return false;
    }
  }
}