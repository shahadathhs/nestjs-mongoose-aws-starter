import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AxiosError } from 'axios';
import { Error as MongooseError } from 'mongoose';
import { AppError } from './handle-error.app';

export function simplifyError(
  error: Error,
  customMessage = 'Operation Failed',
  record = 'Record',
): never {
  // Handle MongoDB driver errors (check for code property)
  if ('code' in error && typeof error.code === 'number') {
    switch (error.code) {
      case 11000: // Duplicate key error
        throw new ConflictException(`${record} already exists`);
      case 121: // Document validation failed
        throw new BadRequestException(`Data validation error on ${record}`);
      case 11600: // Interrupted operation
        throw new InternalServerErrorException(`Operation was interrupted`);
      case 13: // Unauthorized
        throw new UnauthorizedException(`Database authorization failed`);
      case 18: // Authentication failed
        throw new UnauthorizedException(`Database authentication failed`);
      case 50: // Exceeded time limit
        throw new InternalServerErrorException(`Operation timed out`);
      default:
        throw new InternalServerErrorException(
          `Database error: ${error.message}`,
        );
    }
  }

  // Handle Mongoose validation errors
  if (error instanceof MongooseError.ValidationError) {
    const messages = Object.values(error.errors)
      .map((err) => err.message)
      .join(', ');
    throw new BadRequestException(
      `Validation failed for ${record}: ${messages}`,
    );
  }

  // Handle Mongoose cast errors (invalid ObjectId, type casting, etc.)
  if (error instanceof MongooseError.CastError) {
    throw new BadRequestException(
      `Invalid ${error.path}: ${error.value} is not a valid ${error.kind}`,
    );
  }

  // Handle Mongoose document not found error
  if (error instanceof MongooseError.DocumentNotFoundError) {
    throw new NotFoundException(`${record} not found`);
  }

  // Handle Mongoose version error (optimistic concurrency control)
  if (error instanceof MongooseError.VersionError) {
    throw new ConflictException(
      `${record} was modified by another process. Please retry.`,
    );
  }

  // Handle Mongoose strict mode errors
  if (error instanceof MongooseError.StrictModeError) {
    throw new BadRequestException(
      `Invalid field provided for ${record}: ${error.message}`,
    );
  }

  // Handle Mongoose parallel save error
  if (error instanceof MongooseError.ParallelSaveError) {
    throw new ConflictException(
      `Cannot save ${record} while another save is in progress`,
    );
  }

  // Handle Mongoose missing schema error
  if (error instanceof MongooseError.MissingSchemaError) {
    throw new InternalServerErrorException(
      `Schema not registered for ${record}`,
    );
  }

  // Handle Mongoose divide by zero error
  if (error instanceof MongooseError.DivergentArrayError) {
    throw new BadRequestException(
      `Cannot save ${record} due to conflicting array modifications`,
    );
  }

  if (error instanceof AppError) {
    switch (error.code) {
      case 400:
        throw new BadRequestException(error.message);
      case 401:
        throw new UnauthorizedException(error.message);
      case 403:
        throw new ForbiddenException(error.message);
      case 404:
        throw new NotFoundException(error.message);
      case 409:
        throw new ConflictException(error.message);
      default:
        throw new InternalServerErrorException(error.message);
    }
  }

  if (error instanceof AxiosError) {
    const status = error.response?.status || 500;
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'Axios request failed';

    switch (status) {
      case 400:
        throw new BadRequestException(message);
      case 401:
        throw new UnauthorizedException(message);
      case 403:
        throw new ForbiddenException(message);
      case 404:
        throw new NotFoundException(message);
      case 409:
        throw new ConflictException(message);
      case 422:
        throw new UnprocessableEntityException(message);
      default:
        throw new InternalServerErrorException(message);
    }
  }

  throw new InternalServerErrorException(error.message || customMessage);
}
