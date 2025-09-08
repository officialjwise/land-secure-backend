import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    try {
      const client: Socket = context.switchToWs().getClient();
      const token = this.extractToken(client);
      
      if (!token) {
        throw new WsException('Token not provided');
      }

      const payload = this.jwtService.verify(token);
      
      // Attach user info to socket for later use
      client.data.user = payload;
      
      return true;
    } catch (err) {
      throw new WsException('Invalid token');
    }
  }

  private extractToken(client: Socket): string | undefined {
    // Try to get token from auth object first
    if (client.handshake.auth && client.handshake.auth.token) {
      return client.handshake.auth.token;
    }
    
    // Fallback to headers
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    
    return undefined;
  }
}
