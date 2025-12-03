import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { FileType } from '../enums';

export type FileInstanceDocument = HydratedDocument<FileInstance>;

@Schema({ timestamps: true, collection: 'file_instances' })
export class FileInstance {
  @Prop({ default: () => new Types.ObjectId().toString() })
  _id: string;

  @Prop({ required: true })
  filename: string;

  @Prop({ required: true })
  originalFilename: string;

  @Prop({ required: true })
  path: string;

  @Prop({ required: true })
  url: string;

  @Prop({ type: String, enum: FileType, default: FileType.any })
  fileType: FileType;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true })
  size: number;
}

export const FileInstanceSchema = SchemaFactory.createForClass(FileInstance);

FileInstanceSchema.virtual('id').get(function () {
  return this._id;
});

FileInstanceSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete (ret as any)._id;
  },
});
