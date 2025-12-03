import { PaginationDto } from '@/common/dto/pagination.dto';
import {
  successPaginatedResponse,
  successResponse,
  TPaginatedResponse,
  TResponse,
} from '@/common/utils/response.util';
import { AppError } from '@/core/error/handle-error.app';
import { HandleError } from '@/core/error/handle-error.decorator';
import { FileInstance } from '@/lib/database/schemas/file-instance.schema';
import { S3Service } from '@/lib/file/services/s3.service';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class UploadService {
  constructor(
    @InjectModel(FileInstance.name)
    private readonly fileInstanceModel: Model<FileInstance>,
    private readonly s3: S3Service,
  ) {}

  @HandleError('Failed to upload file(s)', 'File')
  async uploadFiles(files: Express.Multer.File[]): Promise<TResponse<any>> {
    if (!files || files.length === 0) {
      throw new AppError(404, 'No file(s) uploaded');
    }

    if (files.length > 5) {
      throw new AppError(400, 'You can upload a maximum of 5 files');
    }

    // Parallelize uploads
    const results = await Promise.all(
      files.map((file) => this.s3.uploadFile(file)),
    );

    return successResponse(
      {
        files: results,
        count: results.length,
      },
      'Files uploaded successfully',
    );
  }

  @HandleError('Failed to delete files', 'File')
  async deleteFiles(fileIds: string[]): Promise<TResponse<any>> {
    if (!fileIds?.length) throw new AppError(400, 'No file IDs provided');

    const files = await this.fileInstanceModel
      .find({
        _id: { $in: fileIds },
      })
      .lean();

    if (!files.length) throw new AppError(404, 'Files not found');

    // Parallelize deletes
    await Promise.all(files.map((f) => this.s3.deleteFile(f._id)));

    return successResponse(
      { files, count: files.length },
      'Files deleted successfully',
    );
  }

  @HandleError('Failed to get files', 'File')
  async getFiles(pg: PaginationDto): Promise<TPaginatedResponse<any>> {
    const page = pg.page && +pg.page > 0 ? +pg.page : 1;
    const limit = pg.limit && +pg.limit > 0 ? +pg.limit : 10;
    const skip = (page - 1) * limit;

    const [files, total] = await Promise.all([
      this.fileInstanceModel
        .find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.fileInstanceModel.countDocuments(),
    ]);

    return successPaginatedResponse(
      files,
      { page, limit, total },
      'Files found',
    );
  }

  @HandleError('Failed to get file', 'File')
  async getFileById(id: string): Promise<TResponse<any>> {
    const file = await this.fileInstanceModel.findById(id).lean();

    if (!file) throw new AppError(404, 'File not found');

    return successResponse(file, 'File found');
  }
}
