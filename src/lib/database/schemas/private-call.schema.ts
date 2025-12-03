import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { CallParticipantStatus, CallStatus, CallType } from '../enums';

export type PrivateCallDocument = HydratedDocument<PrivateCall>;

@Schema({ timestamps: true, collection: 'private_calls' })
export class PrivateCall {
  @Prop({ default: () => new Types.ObjectId().toString() })
  _id: string;

  @Prop({ type: String, ref: 'PrivateConversation', required: true })
  conversationId: string;

  @Prop({ type: String, ref: 'User' })
  initiatorId?: string;

  @Prop({ type: String, enum: CallType, required: true })
  type: CallType;

  @Prop({ type: String, enum: CallStatus, default: CallStatus.INITIATED })
  status: CallStatus;

  @Prop({ default: Date.now })
  startedAt: Date;

  @Prop()
  endedAt?: Date;
}

export const PrivateCallSchema = SchemaFactory.createForClass(PrivateCall);

PrivateCallSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete (ret as any)._id;
  },
});

export type PrivateCallParticipantDocument =
  HydratedDocument<PrivateCallParticipant>;

@Schema({ timestamps: true, collection: 'private_call_participants' })
export class PrivateCallParticipant {
  @Prop({ default: () => new Types.ObjectId().toString() })
  _id: string;

  @Prop({ type: String, ref: 'PrivateCall', required: true })
  callId: string;

  @Prop({ type: String, ref: 'User', required: true })
  userId: string;

  @Prop({
    type: String,
    enum: CallParticipantStatus,
    default: CallParticipantStatus.JOINED,
  })
  status: CallParticipantStatus;

  @Prop({ default: Date.now })
  joinedAt: Date;

  @Prop()
  leftAt?: Date;
}

export const PrivateCallParticipantSchema = SchemaFactory.createForClass(
  PrivateCallParticipant,
);

PrivateCallParticipantSchema.index({ callId: 1, userId: 1 }, { unique: true });

PrivateCallParticipantSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete (ret as any)._id;
  },
});
