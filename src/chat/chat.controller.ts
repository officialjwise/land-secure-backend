import { 
  Controller, 
  Post, 
  Get, 
  Put, 
  Body, 
  Param, 
  UseGuards, 
  Request,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { ChatResponseDto, MessageResponseDto, ChatWithMessagesDto } from './dto/chat-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('chats')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createChat(
    @Body() createChatDto: CreateChatDto,
    @Request() req
  ): Promise<ChatResponseDto> {
    return this.chatService.createChat(createChatDto, req.user.id, req.user.email);
  }

  @Post(':chatId/messages')
  @HttpCode(HttpStatus.CREATED)
  async sendMessage(
    @Param('chatId') chatId: string,
    @Body() sendMessageDto: SendMessageDto,
    @Request() req
  ): Promise<MessageResponseDto> {
    // Ensure the chatId in the DTO matches the URL parameter
    sendMessageDto.chat_id = chatId;
    return this.chatService.sendMessage(sendMessageDto, req.user.id);
  }

  @Get()
  async getUserChats(@Request() req): Promise<ChatResponseDto[]> {
    return this.chatService.getChats(req.user.id);
  }

  @Get(':chatId')
  async getChatWithMessages(
    @Param('chatId') chatId: string,
    @Request() req
  ): Promise<ChatWithMessagesDto> {
    return this.chatService.getChatWithMessages(chatId, req.user.id);
  }

  @Put(':chatId/read')
  @HttpCode(HttpStatus.OK)
  async markChatAsRead(
    @Param('chatId') chatId: string,
    @Request() req
  ): Promise<{ message: string }> {
    await this.chatService.markChatAsRead(chatId, req.user.id);
    return { message: 'Chat marked as read successfully' };
  }

  @Put(':chatId/archive')
  async archiveChat(
    @Param('chatId') chatId: string,
    @Request() req
  ): Promise<ChatResponseDto> {
    return this.chatService.archiveChat(chatId, req.user.id);
  }

  @Put(':chatId/block')
  async blockChat(
    @Param('chatId') chatId: string,
    @Request() req
  ): Promise<ChatResponseDto> {
    return this.chatService.blockChat(chatId, req.user.id);
  }
}
