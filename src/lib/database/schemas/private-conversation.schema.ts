import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ConversationStatus } from '../enums';

export type PrivateConversationDocument = HydratedDocument<PrivateConversation>;

@Schema({ timestamps: true, collection: 'private_conversations' })
export class PrivateConversation {
  @Prop({ default: () => new Types.ObjectId().toString() })
  _id: string;

  @Prop({ type: String, ref: 'User', required: true })
  initiatorId: string;

  @Prop({ type: String, ref: 'User', required: true })
  receiverId: string;

  @Prop({ type: String, ref: 'PrivateMessage' })
  lastMessageId?: string;

  @Prop({
    type: String,
    enum: ConversationStatus,
    default: ConversationStatus.ACTIVE,
  })
  status: ConversationStatus;
}

export const PrivateConversationSchema =
  SchemaFactory.createForClass(PrivateConversation);

PrivateConversationSchema.index(
  { initiatorId: 1, receiverId: 1 },
  { unique: true },
);

PrivateConversationSchema.virtual('id').get(function () {
  return this._id;
});

PrivateConversationSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete (ret as any)._id;
  },
});
