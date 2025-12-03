export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DELETED = 'DELETED',
}

export enum OtpType {
  VERIFICATION = 'VERIFICATION',
  RESET = 'RESET',
}

// * Keep the naming in small caps to sync with mimetype
export enum FileType {
  image = 'image',
  docs = 'docs',
  link = 'link',
  document = 'document',
  any = 'any',
  video = 'video',
  audio = 'audio',
}

export enum CallType {
  AUDIO = 'AUDIO',
  VIDEO = 'VIDEO',
}

export enum CallStatus {
  INITIATED = 'INITIATED',
  ONGOING = 'ONGOING',
  ENDED = 'ENDED',
  MISSED = 'MISSED',
}

export enum CallParticipantStatus {
  JOINED = 'JOINED',
  LEFT = 'LEFT',
  MISSED = 'MISSED',
}

export enum ConversationStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  BLOCKED = 'BLOCKED',
}

export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  FILE = 'FILE',
  CALL_EVENT = 'CALL_EVENT',
}

export enum MessageDeliveryStatus {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
}
