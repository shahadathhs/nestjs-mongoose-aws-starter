import { EventsEnum } from '@/common/enum/queue-events.enum';
import { successResponse } from '@/common/utils/response.util';
import { SocketSafe } from '@/core/socket/socket-safe.decorator';
import { PrivateConversation } from '@/lib/database/schemas/private-conversation.schema';
import { PrivateMessage } from '@/lib/database/schemas/private-message.schema';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Socket } from 'socket.io';
import {
  LoadConversationsDto,
  LoadSingleConversationDto,
} from '../dto/conversation.dto';

@Injectable()
export class ConversationQueryService {
  private logger = new Logger(ConversationQueryService.name);

  constructor(
    @InjectModel(PrivateConversation.name)
    private readonly conversationModel: Model<PrivateConversation>,
    @InjectModel(PrivateMessage.name)
    private readonly messageModel: Model<PrivateMessage>,
  ) {}

  /**
   * Load paginated list of conversations for a user
   */
  @SocketSafe()
  async loadConversations(client: Socket, dto: LoadConversationsDto) {
    const userId = client.data.userId;
    const { page = 1, limit = 20, search } = dto;
    const skip = (page - 1) * limit;

    this.logger.debug(
      `Loading conversations for user ${userId}, page ${page}, limit ${limit}`,
    );

    // Build where clause for search
    const whereClause: any = {
      $or: [{ initiatorId: userId }, { receiverId: userId }],
    };

    if (search) {
      // For search, we'll need to populate and filter
      // This is a simplified version - for production, consider using text indexes
      whereClause.$and = [
        {
          $or: [{ initiatorId: userId }, { receiverId: userId }],
        },
      ];
    }

    const [conversations, total] = await Promise.all([
      this.conversationModel
        .find(whereClause)
        .populate({
          path: 'initiatorId',
          select: '_id name email profilePictureId',
        })
        .populate({
          path: 'receiverId',
          select: '_id name email profilePictureId',
        })
        .populate({
          path: 'lastMessageId',
          populate: [
            {
              path: 'senderId',
              select: '_id name',
            },
            {
              path: 'fileId',
            },
          ],
        })
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.conversationModel.countDocuments(whereClause),
    ]);

    // Get unread counts for each conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv: any) => {
        const unreadCount = await this.messageModel.countDocuments({
          conversationId: conv._id,
          senderId: { $ne: userId },
          // Note: For proper unread tracking, you'd need to query PrivateMessageStatus
        });

        const otherParticipant =
          conv.initiatorId._id === userId ? conv.receiverId : conv.initiatorId;

        return {
          id: conv._id,
          participant: otherParticipant,
          lastMessage: conv.lastMessageId,
          unreadCount,
          status: conv.status,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
        };
      }),
    );

    this.logger.log(
      `Loaded ${conversationsWithUnread.length} conversations for user ${userId}`,
    );

    const result = {
      conversations: conversationsWithUnread,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    client.emit(EventsEnum.CONVERSATION_LIST_RESPONSE, successResponse(result));
    return successResponse(result);
  }

  /**
   * Load a single conversation with paginated messages
   */
  @SocketSafe()
  async loadSingleConversation(client: Socket, dto: LoadSingleConversationDto) {
    const userId = client.data.userId;
    const { conversationId, page = 1, limit = 50 } = dto;
    const skip = (page - 1) * limit;

    this.logger.debug(
      `Loading conversation ${conversationId} for user ${userId}`,
    );

    // Verify user is a participant
    const conversation = await this.conversationModel
      .findOne({
        _id: conversationId,
        $or: [{ initiatorId: userId }, { receiverId: userId }],
      })
      .populate({
        path: 'initiatorId',
        select: '_id name email profilePictureId',
      })
      .populate({
        path: 'receiverId',
        select: '_id name email profilePictureId',
      })
      .lean();

    if (!conversation) {
      throw new Error('Conversation not found or unauthorized');
    }

    // Load messages with pagination
    const [messages, totalMessages] = await Promise.all([
      this.messageModel
        .find({ conversationId })
        .populate({
          path: 'senderId',
          select: '_id name profilePictureId',
        })
        .populate('fileId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.messageModel.countDocuments({ conversationId }),
    ]);

    const populatedConversation = conversation as any;
    const otherParticipant =
      populatedConversation.initiatorId._id === userId
        ? populatedConversation.receiverId
        : populatedConversation.initiatorId;

    this.logger.log(
      `Loaded conversation ${conversationId} with ${messages.length} messages`,
    );

    const result = {
      conversation: {
        id: populatedConversation._id,
        participant: otherParticipant,
        status: populatedConversation.status,
        createdAt: populatedConversation.createdAt,
        updatedAt: populatedConversation.updatedAt,
      },
      messages: messages.reverse(), // Reverse to show oldest first
      pagination: {
        page,
        limit,
        total: totalMessages,
        totalPages: Math.ceil(totalMessages / limit),
      },
    };

    client.emit(EventsEnum.CONVERSATION_RESPONSE, successResponse(result));
    return successResponse(result);
  }
}
