import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';

interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

@WebSocketGateway({
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  namespace: '/chat'
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<string, string>(); // userId -> socketId
  private userSockets = new Map<string, string[]>(); // userId -> socketIds[]

  constructor(private readonly chatService: ChatService) {}

  async handleConnection(client: AuthenticatedSocket) {
    console.log(`Client connected: ${client.id}`);
    
    // Extract token from handshake auth
    const token = client.handshake.auth.token || client.handshake.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      client.disconnect();
      return;
    }

    try {
      // Verify JWT token and get user info
      // In a real implementation, you'd use your JWT service here
      // For now, we'll assume the token is valid and contains user info
      const user = await this.verifyToken(token);
      client.user = user;
      
      // Store user connection
      this.addUserConnection(user.id, client.id);
      
      // Join user to their personal room
      await client.join(`user:${user.id}`);
      
      console.log(`User ${user.email} connected with socket ${client.id}`);
      
    } catch (error) {
      console.error('Authentication failed:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    console.log(`Client disconnected: ${client.id}`);
    
    if (client.user) {
      this.removeUserConnection(client.user.id, client.id);
      console.log(`User ${client.user.email} disconnected`);
    }
  }

  @SubscribeMessage('joinChat')
  async handleJoinChat(
    @MessageBody() data: { chatId: string },
    @ConnectedSocket() client: AuthenticatedSocket
  ) {
    if (!client.user) return;

    try {
      // Verify user is part of the chat
      const chat = await this.chatService.getChatWithMessages(data.chatId, client.user.id);
      
      // Join the chat room
      await client.join(`chat:${data.chatId}`);
      
      // Notify other users in the chat that someone joined
      client.to(`chat:${data.chatId}`).emit('userJoinedChat', {
        chatId: data.chatId,
        userId: client.user.id,
        userName: client.user.email
      });

      console.log(`User ${client.user.email} joined chat ${data.chatId}`);
      
    } catch (error) {
      console.error('Failed to join chat:', error);
      client.emit('error', { message: 'Failed to join chat' });
    }
  }

  @SubscribeMessage('leaveChat')
  async handleLeaveChat(
    @MessageBody() data: { chatId: string },
    @ConnectedSocket() client: AuthenticatedSocket
  ) {
    if (!client.user) return;

    await client.leave(`chat:${data.chatId}`);
    
    // Notify other users in the chat that someone left
    client.to(`chat:${data.chatId}`).emit('userLeftChat', {
      chatId: data.chatId,
      userId: client.user.id,
      userName: client.user.email
    });

    console.log(`User ${client.user.email} left chat ${data.chatId}`);
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody() data: SendMessageDto,
    @ConnectedSocket() client: AuthenticatedSocket
  ) {
    if (!client.user) return;

    try {
      // Send message through the chat service
      const message = await this.chatService.sendMessage(data, client.user.id);
      
      // Get chat details for broadcasting
      const chat = await this.chatService.getChatWithMessages(data.chat_id, client.user.id);
      
      // Broadcast message to all users in the chat
      this.server.to(`chat:${data.chat_id}`).emit('newMessage', {
        chatId: data.chat_id,
        message: message,
        sender: {
          id: client.user.id,
          email: client.user.email,
          role: message.sender_role
        }
      });

      // Send confirmation to sender
      client.emit('messageSent', {
        messageId: message.id,
        chatId: data.chat_id,
        timestamp: new Date()
      });

      // Update unread counts for other participants
      const otherUserId = chat.buyer_id === client.user.id ? chat.seller_id : chat.buyer_id;
      this.updateUnreadCount(otherUserId, data.chat_id);

      console.log(`Message sent in chat ${data.chat_id} by ${client.user.email}`);
      
    } catch (error) {
      console.error('Failed to send message:', error);
      client.emit('error', { message: 'Failed to send message' });
    }
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @MessageBody() data: { chatId: string; isTyping: boolean },
    @ConnectedSocket() client: AuthenticatedSocket
  ) {
    if (!client.user) return;

    // Broadcast typing indicator to other users in the chat
    client.to(`chat:${data.chatId}`).emit('userTyping', {
      chatId: data.chatId,
      userId: client.user.id,
      userName: client.user.email,
      isTyping: data.isTyping
    });
  }

  @SubscribeMessage('markAsRead')
  async handleMarkAsRead(
    @MessageBody() data: { chatId: string },
    @ConnectedSocket() client: AuthenticatedSocket
  ) {
    if (!client.user) return;

    try {
      await this.chatService.markChatAsRead(data.chatId, client.user.id);
      
      // Notify other users that messages were read
      client.to(`chat:${data.chatId}`).emit('messagesRead', {
        chatId: data.chatId,
        userId: client.user.id,
        userName: client.user.email,
        timestamp: new Date()
      });

      console.log(`Messages marked as read in chat ${data.chatId} by ${client.user.email}`);
      
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
      client.emit('error', { message: 'Failed to mark messages as read' });
    }
  }

  // Method to send notification to specific user
  sendNotificationToUser(userId: string, event: string, data: any) {
    const socketIds = this.userSockets.get(userId);
    if (socketIds) {
      socketIds.forEach(socketId => {
        this.server.to(socketId).emit(event, data);
      });
    }
  }

  // Method to broadcast to chat room
  broadcastToChat(chatId: string, event: string, data: any) {
    this.server.to(`chat:${chatId}`).emit(event, data);
  }

  // Private helper methods
  private addUserConnection(userId: string, socketId: string) {
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, []);
    }
    this.userSockets.get(userId)!.push(socketId);
    this.connectedUsers.set(socketId, userId);
  }

  private removeUserConnection(userId: string, socketId: string) {
    const userSockets = this.userSockets.get(userId);
    if (userSockets) {
      const index = userSockets.indexOf(socketId);
      if (index > -1) {
        userSockets.splice(index, 1);
      }
      if (userSockets.length === 0) {
        this.userSockets.delete(userId);
      }
    }
    this.connectedUsers.delete(socketId);
  }

  private updateUnreadCount(userId: string, chatId: string) {
    // Send updated unread count to the user
    this.sendNotificationToUser(userId, 'unreadCountUpdated', {
      chatId: chatId,
      timestamp: new Date()
    });
  }

  private async verifyToken(token: string) {
    // This is a placeholder - implement your JWT verification logic here
    // You should use your existing JWT service
    try {
      // For now, return a mock user - replace with actual JWT verification
      // In a real implementation, you would use the JWT service to verify the token
      return {
        id: 'mock-user-id',
        email: 'mock@example.com',
        role: 'buyer'
      };
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  // Get connected users count
  getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  // Get user's socket IDs
  getUserSocketIds(userId: string): string[] {
    return this.userSockets.get(userId) || [];
  }

  // Check if user is online
  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }
}
