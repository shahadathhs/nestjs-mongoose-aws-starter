import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { MessageDeliveryStatus, MessageType } from '../enums';

export type PrivateMessageDocument = HydratedDocument<PrivateMessage>;

@Schema({ timestamps: true, collection: 'private_messages' })
export class PrivateMessage {
  @Prop({ default: () => new Types.ObjectId().toString() })
  _id: string;

  @Prop()
  content?: string;

  @Prop({ type: String, enum: MessageType, default: MessageType.TEXT })
  type: MessageType;

  @Prop({ type: String, ref: 'FileInstance' })
  fileId?: string;

  @Prop({ type: String, ref: 'PrivateConversation', required: true })
  conversationId: string;

  @Prop({ type: String, ref: 'User', required: true })
  senderId: string;
}

export const PrivateMessageSchema =
  SchemaFactory.createForClass(PrivateMessage);

PrivateMessageSchema.index({ conversationId: 1, createdAt: 1 });

PrivateMessageSchema.virtual('id').get(function () {
  return this._id;
});

PrivateMessageSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete (ret as any)._id;
  },
});

export type PrivateMessageStatusDocument =
  HydratedDocument<PrivateMessageStatus>;

@Schema({ timestamps: true, collection: 'private_message_statuses' })
export class PrivateMessageStatus {
  @Prop({ default: () => new Types.ObjectId().toString() })
  _id: string;

  @Prop({ type: String, ref: 'PrivateMessage', required: true })
  messageId: string;

  @Prop({ type: String, ref: 'User', required: true })
  userId: string;

  @Prop({
    type: String,
    enum: MessageDeliveryStatus,
    default: MessageDeliveryStatus.SENT,
  })
  status: MessageDeliveryStatus;
}

export const PrivateMessageStatusSchema =
  SchemaFactory.createForClass(PrivateMessageStatus);

PrivateMessageStatusSchema.index({ messageId: 1, userId: 1 }, { unique: true });

PrivateMessageStatusSchema.virtual('id').get(function () {
  return this._id;
});

PrivateMessageStatusSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete (ret as any)._id;
  },
});
