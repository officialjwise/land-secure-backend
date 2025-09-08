# Chat System API Documentation

## Overview
The Chat System allows potential buyers to communicate with property owners through a secure messaging platform. Users can create chat conversations, send messages, and manage their chat history.

## Authentication
All chat endpoints require JWT authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## API Endpoints

### 1. Create a New Chat
**POST** `/chats`

Creates a new chat conversation between a buyer and a property owner.

**Request Body:**
```json
{
  "property_id": "uuid-string",
  "seller_id": "uuid-string",
  "property_title": "Beautiful 3-bedroom house in Accra"
}
```

**Response:**
```json
{
  "id": "chat-uuid",
  "property_id": "property-uuid",
  "buyer_id": "buyer-uuid",
  "seller_id": "seller-uuid",
  "buyer_name": "John Doe",
  "seller_name": "Jane Smith",
  "property_title": "Beautiful 3-bedroom house in Accra",
  "status": "active",
  "last_message_at": "2024-01-15T10:30:00Z",
  "unread_count": 0,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

**Notes:**
- Only buyers can initiate chats
- If a chat already exists between the same buyer and seller for the same property, it returns the existing chat
- The current user's information (ID and name) is automatically extracted from the JWT token
- Seller information is automatically retrieved from the seller ID

### 2. Send a Message
**POST** `/chats/{chatId}/messages`

Sends a message in an existing chat conversation.

**Request Body:**
```json
{
  "content": "Hi! I'm interested in your property. Is it still available?",
  "message_type": "text",
  "attachment_url": "https://example.com/image.jpg" // Optional
}
```

**Response:**
```json
{
  "id": "message-uuid",
  "chat_id": "chat-uuid",
  "sender_id": "sender-uuid",
  "sender_name": "John Doe",
  "sender_role": "buyer",
  "content": "Hi! I'm interested in your property. Is it still available?",
  "message_type": "text",
  "attachment_url": "https://example.com/image.jpg",
  "is_read": false,
  "created_at": "2024-01-15T10:35:00Z",
  "updated_at": "2024-01-15T10:35:00Z"
}
```

**Message Types:**
- `text`: Plain text message
- `image`: Image attachment
- `document`: Document attachment
- `location`: Location sharing

**Notes:**
- Only participants in the chat can send messages
- Messages automatically mark previous messages from the other user as read
- The chat's last_message_at timestamp is updated

### 3. Get User's Chats
**GET** `/chats`

Retrieves all chat conversations for the authenticated user.

**Response:**
```json
[
  {
    "id": "chat-uuid-1",
    "property_id": "property-uuid-1",
    "buyer_id": "buyer-uuid",
    "seller_id": "seller-uuid-1",
    "buyer_name": "John Doe",
    "seller_name": "Jane Smith",
    "property_title": "Beautiful 3-bedroom house in Accra",
    "status": "active",
    "last_message_at": "2024-01-15T10:35:00Z",
    "unread_count": 2,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:35:00Z"
  },
  {
    "id": "chat-uuid-2",
    "property_id": "property-uuid-2",
    "buyer_id": "buyer-uuid",
    "seller_id": "seller-uuid-2",
    "buyer_name": "John Doe",
    "seller_name": "Bob Johnson",
    "property_title": "Land plot in Kumasi",
    "status": "active",
    "last_message_at": "2024-01-14T15:20:00Z",
    "unread_count": 0,
    "created_at": "2024-01-14T15:00:00Z",
    "updated_at": "2024-01-14T15:20:00Z"
  }
]
```

**Notes:**
- Returns chats where the user is either the buyer or seller
- Chats are sorted by last_message_at (most recent first)
- unread_count shows unread messages from the other participant

### 4. Get Chat with Messages
**GET** `/chats/{chatId}`

Retrieves a specific chat conversation with all its messages.

**Response:**
```json
{
  "id": "chat-uuid",
  "property_id": "property-uuid",
  "buyer_id": "buyer-uuid",
  "seller_id": "seller-uuid",
  "buyer_name": "John Doe",
  "seller_name": "Jane Smith",
  "property_title": "Beautiful 3-bedroom house in Accra",
  "status": "active",
  "last_message_at": "2024-01-15T10:35:00Z",
  "unread_count": 0,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:35:00Z",
  "messages": [
    {
      "id": "message-uuid-1",
      "chat_id": "chat-uuid",
      "sender_id": "buyer-uuid",
      "sender_name": "John Doe",
      "sender_role": "buyer",
      "content": "Hi! I'm interested in your property. Is it still available?",
      "message_type": "text",
      "is_read": true,
      "read_at": "2024-01-15T10:36:00Z",
      "created_at": "2024-01-15T10:35:00Z",
      "updated_at": "2024-01-15T10:35:00Z"
    },
    {
      "id": "message-uuid-2",
      "chat_id": "chat-uuid",
      "sender_id": "seller-uuid",
      "sender_name": "Jane Smith",
      "sender_role": "seller",
      "content": "Yes, it's still available! Would you like to schedule a viewing?",
      "message_type": "text",
      "is_read": false,
      "created_at": "2024-01-15T10:36:00Z",
      "updated_at": "2024-01-15T10:36:00Z"
    }
  ]
}
```

**Notes:**
- Messages are sorted chronologically (oldest first)
- Automatically marks messages from the other user as read
- Only chat participants can access the chat

### 5. Mark Chat as Read
**PUT** `/chats/{chatId}/read`

Marks all unread messages in a chat as read.

**Response:**
```json
{
  "message": "Chat marked as read successfully"
}
```

**Notes:**
- Only affects messages from the other participant
- Useful for updating unread counts

### 6. Archive Chat
**PUT** `/chats/{chatId}/archive`

Archives a chat conversation (moves it to archived status).

**Response:**
```json
{
  "id": "chat-uuid",
  "property_id": "property-uuid",
  "buyer_id": "buyer-uuid",
  "seller_id": "seller-uuid",
  "buyer_name": "John Doe",
  "seller_name": "Jane Smith",
  "property_title": "Beautiful 3-bedroom house in Accra",
  "status": "archived",
  "last_message_at": "2024-01-15T10:35:00Z",
  "unread_count": 0,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T11:00:00Z"
}
```

**Notes:**
- Archived chats cannot receive new messages
- Can be unarchived by changing status back to 'active'

### 7. Block Chat
**PUT** `/chats/{chatId}/block`

Blocks a chat conversation (moves it to blocked status).

**Response:**
```json
{
  "id": "chat-uuid",
  "property_id": "property-uuid",
  "buyer_id": "buyer-uuid",
  "seller_id": "seller-uuid",
  "buyer_name": "John Doe",
  "seller_name": "Jane Smith",
  "property_title": "Beautiful 3-bedroom house in Accra",
  "status": "blocked",
  "last_message_at": "2024-01-15T10:35:00Z",
  "unread_count": 0,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T11:00:00Z"
}
```

**Notes:**
- Blocked chats cannot receive new messages
- Useful for preventing harassment or unwanted communication

## Error Responses

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "You are not part of this chat"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Chat not found"
}
```

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Cannot send message to inactive chat"
}
```

## Usage Examples

### Frontend Integration

#### Creating a Chat
```javascript
const createChat = async (propertyId, sellerId, propertyTitle) => {
  const response = await fetch('/chats', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      property_id: propertyId,
      seller_id: sellerId,
      property_title: propertyTitle
    })
  });
  
  return response.json();
};
```

#### Sending a Message
```javascript
const sendMessage = async (chatId, content) => {
  const response = await fetch(`/chats/${chatId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      content: content,
      message_type: 'text'
    })
  });
  
  return response.json();
};
```

#### Real-time Updates
For real-time chat functionality, consider implementing WebSocket connections or using Server-Sent Events (SSE) to push new messages to connected clients.

## Security Features

1. **Authentication Required**: All endpoints require valid JWT tokens
2. **Authorization**: Users can only access chats they're part of
3. **Input Validation**: All inputs are validated using class-validator
4. **Role-based Access**: Only buyers can initiate chats
5. **Status Management**: Chats can be archived or blocked for safety

## Performance Considerations

1. **Pagination**: For large chat histories, consider implementing pagination
2. **Caching**: Implement Redis caching for frequently accessed chats
3. **Database Indexing**: Index chat_id, user_id, and timestamp fields
4. **Message Cleanup**: Implement message retention policies for old chats

## Future Enhancements

1. **File Uploads**: Support for image and document attachments
2. **Push Notifications**: Real-time notifications for new messages
3. **Chat Search**: Search functionality within chat messages
4. **Group Chats**: Support for multiple participants
5. **Message Reactions**: Like, heart, or other reaction emojis
6. **Typing Indicators**: Show when someone is typing
7. **Message Encryption**: End-to-end encryption for sensitive communications
