import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { CreateChatDto } from './dto/create-chat.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { ChatResponseDto, MessageResponseDto, ChatWithMessagesDto } from './dto/chat-response.dto';
import { ChatEntity } from './entities/chat.entity';
import { MessageEntity } from './entities/message.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ChatService {
  // In a real application, these would be database repositories
  private chats: Map<string, ChatEntity> = new Map();
  private messages: Map<string, MessageEntity> = new Map();
  private chatMessages: Map<string, string[]> = new Map(); // chat_id -> message_ids

  async createChat(createChatDto: CreateChatDto, currentUserId: string, currentUserName: string): Promise<ChatResponseDto> {
    // Check if chat already exists
    const existingChat = Array.from(this.chats.values()).find(
      chat => 
        chat.property_id === createChatDto.property_id &&
        chat.buyer_id === currentUserId &&
        chat.seller_id === createChatDto.seller_id
    );

    if (existingChat) {
      return this.mapChatToResponseDto(existingChat);
    }

    // In a real application, you would fetch seller information from the user service
    // For now, we'll use a placeholder - replace this with actual user lookup
    const sellerName = await this.getSellerName(createChatDto.seller_id);

    const chat: ChatEntity = {
      id: uuidv4(),
      property_id: createChatDto.property_id,
      buyer_id: currentUserId,
      seller_id: createChatDto.seller_id,
      buyer_name: currentUserName,
      seller_name: sellerName,
      property_title: createChatDto.property_title,
      status: 'active',
      last_message_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    };

    this.chats.set(chat.id, chat);
    this.chatMessages.set(chat.id, []);

    return this.mapChatToResponseDto(chat);
  }

  async sendMessage(sendMessageDto: SendMessageDto, currentUserId: string): Promise<MessageResponseDto> {
    const chat = this.chats.get(sendMessageDto.chat_id);
    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    // Validate that current user is part of the chat
    if (chat.buyer_id !== currentUserId && chat.seller_id !== currentUserId) {
      throw new ForbiddenException('You are not part of this chat');
    }

    // Validate chat status
    if (chat.status !== 'active') {
      throw new BadRequestException('Cannot send message to inactive chat');
    }

    const message: MessageEntity = {
      id: uuidv4(),
      chat_id: sendMessageDto.chat_id,
      sender_id: currentUserId,
      sender_name: currentUserId === chat.buyer_id ? chat.buyer_name : chat.seller_name,
      sender_role: currentUserId === chat.buyer_id ? 'buyer' : 'seller',
      content: sendMessageDto.content,
      message_type: sendMessageDto.message_type || 'text',
      attachment_url: sendMessageDto.attachment_url,
      is_read: false,
      created_at: new Date(),
      updated_at: new Date(),
    };

    this.messages.set(message.id, message);
    
    // Add message to chat
    const chatMessageIds = this.chatMessages.get(sendMessageDto.chat_id) || [];
    chatMessageIds.push(message.id);
    this.chatMessages.set(sendMessageDto.chat_id, chatMessageIds);

    // Update chat last message time
    chat.last_message_at = new Date();
    chat.updated_at = new Date();
    this.chats.set(chat.id, chat);

    return this.mapMessageToResponseDto(message);
  }

  async getChats(userId: string): Promise<ChatResponseDto[]> {
    const userChats = Array.from(this.chats.values()).filter(
      chat => chat.buyer_id === userId || chat.seller_id === userId
    );

    return userChats.map(chat => this.mapChatToResponseDto(chat));
  }

  async getChatWithMessages(chatId: string, userId: string): Promise<ChatWithMessagesDto> {
    const chat = this.chats.get(chatId);
    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    // Validate that current user is part of the chat
    if (chat.buyer_id !== userId && chat.seller_id !== userId) {
      throw new ForbiddenException('You are not part of this chat');
    }

    const messageIds = this.chatMessages.get(chatId) || [];
    const messages = messageIds
      .map(id => this.messages.get(id))
      .filter((message): message is MessageEntity => message !== undefined)
      .sort((a, b) => a.created_at.getTime() - b.created_at.getTime());

    // Mark messages as read if they're from the other user
    messages.forEach(message => {
      if (message.sender_id !== userId && !message.is_read) {
        message.is_read = true;
        message.read_at = new Date();
        this.messages.set(message.id, message);
      }
    });

    const chatResponse = this.mapChatToResponseDto(chat);
    return {
      ...chatResponse,
      messages: messages.map(message => this.mapMessageToResponseDto(message)),
    };
  }

  async markChatAsRead(chatId: string, userId: string): Promise<void> {
    const chat = this.chats.get(chatId);
    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    // Validate that current user is part of the chat
    if (chat.buyer_id !== userId && chat.seller_id !== userId) {
      throw new ForbiddenException('You are not part of this chat');
    }

    const messageIds = this.chatMessages.get(chatId) || [];
    messageIds.forEach(id => {
      const message = this.messages.get(id);
      if (message && message.sender_id !== userId && !message.is_read) {
        message.is_read = true;
        message.read_at = new Date();
        this.messages.set(message.id, message);
      }
    });
  }

  async archiveChat(chatId: string, userId: string): Promise<ChatResponseDto> {
    const chat = this.chats.get(chatId);
    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    // Validate that current user is part of the chat
    if (chat.buyer_id !== userId && chat.seller_id !== userId) {
      throw new ForbiddenException('You are not part of this chat');
    }

    chat.status = 'archived';
    chat.updated_at = new Date();
    this.chats.set(chat.id, chat);

    return this.mapChatToResponseDto(chat);
  }

  async blockChat(chatId: string, userId: string): Promise<ChatResponseDto> {
    const chat = this.chats.get(chatId);
    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    // Validate that current user is part of the chat
    if (chat.buyer_id !== userId && chat.seller_id !== userId) {
      throw new ForbiddenException('You are not part of this chat');
    }

    chat.status = 'blocked';
    chat.updated_at = new Date();
    this.chats.set(chat.id, chat);

    return this.mapChatToResponseDto(chat);
  }

  private mapChatToResponseDto(chat: ChatEntity): ChatResponseDto {
    const messageIds = this.chatMessages.get(chat.id) || [];
    const unreadCount = messageIds.filter(id => {
      const message = this.messages.get(id);
      return message && !message.is_read && message.sender_id !== chat.buyer_id;
    }).length;

    return {
      id: chat.id,
      property_id: chat.property_id,
      buyer_id: chat.buyer_id,
      seller_id: chat.seller_id,
      buyer_name: chat.buyer_name,
      seller_name: chat.seller_name,
      property_title: chat.property_title,
      status: chat.status,
      last_message_at: chat.last_message_at,
      unread_count: unreadCount,
      created_at: chat.created_at,
      updated_at: chat.updated_at,
    };
  }

  private mapMessageToResponseDto(message: MessageEntity): MessageResponseDto {
    return {
      id: message.id,
      chat_id: message.chat_id,
      sender_id: message.sender_id,
      sender_name: message.sender_name,
      sender_role: message.sender_role,
      content: message.content,
      message_type: message.message_type,
      attachment_url: message.attachment_url,
      is_read: message.is_read,
      read_at: message.read_at,
      created_at: message.created_at,
      updated_at: message.updated_at,
    };
  }

  // Helper method to get seller name (placeholder - replace with actual user service call)
  private async getSellerName(sellerId: string): Promise<string> {
    // In a real application, you would call the user service to get seller information
    // For now, return a placeholder
    return `Seller ${sellerId.substring(0, 8)}`;
  }
}
