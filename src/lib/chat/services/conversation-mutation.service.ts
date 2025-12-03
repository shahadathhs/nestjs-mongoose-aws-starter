import { EventsEnum } from '@/common/enum/queue-events.enum';
import { successResponse } from '@/common/utils/response.util';
import { SocketSafe } from '@/core/socket/socket-safe.decorator';
import { ConversationStatus } from '@/lib/database/enums';
import { PrivateConversation } from '@/lib/database/schemas/private-conversation.schema';
import { User } from '@/lib/database/schemas/user.schema';
import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Socket } from 'socket.io';
import { ChatGateway } from '../chat.gateway';
import {
  ConversationActionDto,
  InitConversationWithUserDto,
} from '../dto/conversation.dto';

@Injectable()
export class ConversationMutationService {
  private logger = new Logger(ConversationMutationService.name);

  constructor(
    @InjectModel(PrivateConversation.name)
    private readonly conversationModel: Model<PrivateConversation>,
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @Inject(forwardRef(() => ChatGateway))
    private readonly chatGateway: ChatGateway,
  ) {}

  /**
   * Initiate or retrieve existing conversation with a user
   */
  @SocketSafe()
  async initiateConversationWithUser(
    client: Socket,
    dto: InitConversationWithUserDto,
  ) {
    const initiatorId = client.data.userId;
    const { userId: targetUserId } = dto;

    this.logger.debug(
      `Initiating conversation between ${initiatorId} and ${targetUserId}`,
    );

    if (initiatorId === targetUserId) {
      throw new Error('Cannot initiate conversation with yourself');
    }

    // Check if conversation already exists (bidirectional)
    let conversation = await this.conversationModel
      .findOne({
        $or: [
          { initiatorId, receiverId: targetUserId },
          { initiatorId: targetUserId, receiverId: initiatorId },
        ],
      })
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
        populate: {
          path: 'senderId',
          select: '_id name',
        },
      })
      .lean();

    if (conversation) {
      this.logger.log(`Found existing conversation ${conversation._id}`);
    } else {
      // Verify target user exists
      const targetUser = await this.userModel.findById(targetUserId);

      if (!targetUser) {
        throw new Error('Target user not found');
      }

      // Create new conversation
      const newConversation = await this.conversationModel.create({
        initiatorId,
        receiverId: targetUserId,
      });

      conversation = await this.conversationModel
        .findById(newConversation._id)
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
          populate: {
            path: 'senderId',
            select: '_id name',
          },
        })
        .lean();

      if (!conversation) {
        throw new Error('Failed to create conversation');
      }

      this.logger.log(`Created new conversation ${conversation._id}`);
    }

    // Type assertion for populated fields
    const populatedConversation = conversation as any;

    const otherParticipant =
      populatedConversation.initiatorId._id === initiatorId
        ? populatedConversation.receiverId
        : populatedConversation.initiatorId;

    const result = {
      id: populatedConversation._id,
      participant: otherParticipant,
      lastMessage: populatedConversation.lastMessageId,
      status: populatedConversation.status,
      createdAt: populatedConversation.createdAt,
      updatedAt: populatedConversation.updatedAt,
    };

    client.emit(EventsEnum.SUCCESS, successResponse(result));

    // Notify the other participant if online
    const otherUserId = result.participant._id;
    this.chatGateway.emitToUserFirstSocket(
      otherUserId,
      EventsEnum.CONVERSATION_UPDATE,
      successResponse(result),
    );

    return successResponse(result);
  }

  /**
   * Delete a conversation
   */
  @SocketSafe()
  async deleteConversation(client: Socket, dto: ConversationActionDto) {
    const userId = client.data.userId;
    const { conversationId } = dto;

    this.logger.debug(
      `Deleting conversation ${conversationId} for user ${userId}`,
    );

    // Get conversation details before deleting to notify other participant
    const conversationData = await this.conversationModel
      .findOne({
        _id: conversationId,
        $or: [{ initiatorId: userId }, { receiverId: userId }],
      })
      .lean();

    if (!conversationData) {
      throw new Error('Conversation not found or unauthorized');
    }

    const otherUserId =
      conversationData.initiatorId === userId
        ? conversationData.receiverId
        : conversationData.initiatorId;

    await this.conversationModel.findByIdAndDelete(conversationId);

    this.logger.log(`Deleted conversation ${conversationId}`);

    client.emit(EventsEnum.SUCCESS, successResponse({ success: true }));

    // Notify the other participant if online
    this.chatGateway.emitToUserFirstSocket(
      otherUserId,
      EventsEnum.CONVERSATION_UPDATE,
      successResponse({
        conversationId: dto.conversationId,
        action: 'deleted',
      }),
    );

    return successResponse({ success: true });
  }

  /**
   * Archive a conversation
   */
  @SocketSafe()
  async archiveConversation(client: Socket, dto: ConversationActionDto) {
    const userId = client.data.userId;
    const { conversationId } = dto;

    this.logger.debug(
      `Archiving conversation ${conversationId} for user ${userId}`,
    );

    const conversation = await this.updateConversationStatus(
      userId,
      conversationId,
      ConversationStatus.ARCHIVED,
    );

    this.logger.log(`Archived conversation ${conversationId}`);

    client.emit(EventsEnum.CONVERSATION_UPDATE, successResponse(conversation));
    return successResponse(conversation);
  }

  /**
   * Block a conversation
   */
  @SocketSafe()
  async blockConversation(client: Socket, dto: ConversationActionDto) {
    const userId = client.data.userId;
    const { conversationId } = dto;

    this.logger.debug(
      `Blocking conversation ${conversationId} for user ${userId}`,
    );

    const conversation = await this.updateConversationStatus(
      userId,
      conversationId,
      ConversationStatus.BLOCKED,
    );

    this.logger.log(`Blocked conversation ${conversationId}`);

    client.emit(EventsEnum.CONVERSATION_UPDATE, successResponse(conversation));

    // Notify the other participant if online
    const otherUserId = conversation.participant._id;
    this.chatGateway.emitToUserFirstSocket(
      otherUserId,
      EventsEnum.CONVERSATION_UPDATE,
      successResponse({
        conversationId: dto.conversationId,
        action: 'blocked',
      }),
    );

    return successResponse(conversation);
  }

  /**
   * Unblock a conversation
   */
  @SocketSafe()
  async unblockConversation(client: Socket, dto: ConversationActionDto) {
    const userId = client.data.userId;
    const { conversationId } = dto;

    this.logger.debug(
      `Unblocking conversation ${conversationId} for user ${userId}`,
    );

    const conversation = await this.updateConversationStatus(
      userId,
      conversationId,
      ConversationStatus.ACTIVE,
    );

    this.logger.log(`Unblocked conversation ${conversationId}`);

    client.emit(EventsEnum.CONVERSATION_UPDATE, successResponse(conversation));

    // Notify the other participant if online
    const otherUserId = conversation.participant._id;
    this.chatGateway.emitToUserFirstSocket(
      otherUserId,
      EventsEnum.CONVERSATION_UPDATE,
      successResponse({
        conversationId: dto.conversationId,
        action: 'unblocked',
      }),
    );

    return successResponse(conversation);
  }

  /**
   * Helper method to update conversation status
   */
  private async updateConversationStatus(
    userId: string,
    conversationId: string,
    status: ConversationStatus,
  ) {
    // Verify user is a participant
    const conversation = await this.conversationModel
      .findOne({
        _id: conversationId,
        $or: [{ initiatorId: userId }, { receiverId: userId }],
      })
      .lean();

    if (!conversation) {
      throw new Error('Conversation not found or unauthorized');
    }

    const updated = await this.conversationModel
      .findByIdAndUpdate(conversationId, { status }, { new: true })
      .populate({
        path: 'initiatorId',
        select: '_id name email profilePictureId',
      })
      .populate({
        path: 'receiverId',
        select: '_id name email profilePictureId',
      })
      .lean();

    if (!updated) {
      throw new Error('Failed to update conversation');
    }

    // Type assertion for populated fields
    const populatedUpdated = updated as any;

    const otherParticipant =
      populatedUpdated.initiatorId._id === userId
        ? populatedUpdated.receiverId
        : populatedUpdated.initiatorId;

    return {
      id: populatedUpdated._id,
      participant: otherParticipant,
      status: populatedUpdated.status,
      createdAt: populatedUpdated.createdAt,
      updatedAt: populatedUpdated.updatedAt,
    };
  }
}
