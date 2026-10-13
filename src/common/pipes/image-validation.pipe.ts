// src/common/pipes/image-validation.pipe.ts

import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

export interface ValidatedFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

/**
 * Pipe to validate uploaded image files
 * Ensures:
 * - File exists
 * - MIME type is one of allowed image types
 * - File size <= 10MB
 */
@Injectable()
export class ImageValidationPipe implements PipeTransform {
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
  private readonly ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
  ];

  transform(file: Express.Multer.File | undefined | null): ValidatedFile | null {
    // If no file is provided (e.g., updating without changing the image), allow it
    if (!file) {
      return null;
    }

    if (!file.buffer) {
      throw new BadRequestException('File buffer is missing.');
    }

    // Validate file size
    if (file.size > this.MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds ${this.MAX_FILE_SIZE / (1024 * 1024)}MB limit.`
      );
    }

    // Validate MIME type
    if (!this.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type: "${file.mimetype}". Allowed types: ${this.ALLOWED_MIME_TYPES.join(
          ', '
        )}.`
      );
    }

    return file;
  }
}
