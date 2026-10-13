import {
  PutObjectCommand,
  S3Client,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, mkdirSync, promises as fs } from 'fs';
import { extname, join } from 'path';
import { v4 as uuid } from 'uuid';

@Injectable()
export class S3Service {
  private s3Client: S3Client | null;
  private bucketName: string;
  private region: string;
  private readonly uploadsDir = join(process.cwd(), 'public', 'images');

  constructor(private readonly configService: ConfigService) {
    this.region = this.configService.get<string>('AWS_S3_REGION') ?? '';
    this.bucketName = this.configService.get<string>(
      'AWS_S3_BUCKET_NAME',
    ) ?? '';
    const accessKeyId =
      this.configService.get<string>('AWS_S3_ACCESS_KEY_ID') ?? '';
    const secretAccessKey =
      this.configService.get<string>('AWS_S3_SECRET_ACCESS_KEY') ?? '';
    const endpoint =
      this.configService.get<string>('AWS_S3_ENDPOINT')?.trim() || undefined;
    const isS3Configured = Boolean(
      this.region && this.bucketName && accessKeyId && secretAccessKey,
    );

    console.log('🔧 S3 Config (Fergana Roses, S3-only):', {
      region: this.region,
      bucketName: this.bucketName,
      endpoint: endpoint ?? '(aws default)',
      accessKeyId: accessKeyId ? '✅ set' : '❌ missing',
      secretAccessKey: secretAccessKey ? '✅ set' : '❌ missing',
      storageMode: isS3Configured ? 's3' : 'local-fallback',
    });

    this.ensureUploadDirectory();
    this.s3Client = isS3Configured
      ? new S3Client({
          region: this.region,
          credentials: {
            accessKeyId,
            secretAccessKey,
          },
          ...(endpoint
            ? { endpoint, forcePathStyle: true }
            : {}),
        })
      : null;
  }

  async uploadFile(
    file: Express.Multer.File,
    prefix: string = 'flowers',
  ): Promise<string> {
    const s3Client = this.s3Client;
    if (!this.isS3Configured() || !s3Client) {
      console.warn(
        'S3 is not configured. Falling back to local file storage.',
      );
      return this.saveFileLocally(file, prefix);
    }

    // Generate unique filename with original extension
    const fileExtension = this.getFileExtension(file);
    const fileName = `${prefix}/${uuid()}.${fileExtension}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
      // Don't set ACL - files will be private by default
    });

    try {
      await s3Client.send(command);

      // Generate a presigned URL that expires in 7 days (adjust as needed)
      const presignedUrl = await this.getPresignedUrl(fileName);

      console.log('File uploaded successfully:', fileName);
      console.log('Presigned URL generated:', presignedUrl);

      // Return the S3 key (filename) instead of direct URL
      // We'll generate presigned URLs when needed
      return fileName; // Return just the key
    } catch (error) {
      console.error('Error uploading file to S3:', error);
      console.warn('Falling back to local file storage for uploaded image.');
      return this.saveFileLocally(file, prefix);
    }
  }

  // Generate presigned URL for accessing private files
  async getPresignedUrl(
    key: string,
    expiresIn: number = 7 * 24 * 60 * 60,
  ): Promise<string> {
    const s3Client = this.s3Client;
    if (!this.isS3Configured() || !s3Client) {
      throw new Error('S3 is not configured');
    }

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    try {
      const presignedUrl = await getSignedUrl(s3Client, command, {
        expiresIn, // 7 days by default
      });
      return presignedUrl;
    } catch (error) {
      console.error('Error generating presigned URL:', error);
      throw new Error('Failed to generate presigned URL');
    }
  }

  async resolveFileUrl(fileKey: string | null | undefined): Promise<string | null> {
    if (!fileKey) {
      return null;
    }

    if (this.isAbsoluteUrl(fileKey) || this.isLocalUploadPath(fileKey)) {
      return fileKey;
    }

    if (!this.isS3Configured()) {
      console.warn(
        'S3 is not configured and stored file reference is not a local path:',
        fileKey,
      );
      return null;
    }

    try {
      return await this.getPresignedUrl(fileKey);
    } catch (error) {
      console.error('Error resolving file URL:', error);
      return null;
    }
  }

  async deleteFile(fileKey: string): Promise<void> {
    try {
      if (this.isLocalUploadPath(fileKey)) {
        await this.deleteLocalFile(fileKey);
        return;
      }

      const s3Client = this.s3Client;
      if (!this.isS3Configured() || !s3Client) {
        console.warn(
          'S3 is not configured. Skipping remote file deletion for:',
          fileKey,
        );
        return;
      }

      // If it's a full URL, extract the key
      const key = this.isS3Url(fileKey)
        ? this.extractKeyFromUrl(fileKey)
        : fileKey;

      if (!key) {
        console.warn('Could not extract key from:', fileKey);
        return;
      }

      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await s3Client.send(command);
      console.log('File deleted successfully:', key);
    } catch (error) {
      console.error('Error deleting file from S3:', error);
      throw new Error('Failed to delete file from S3');
    }
  }

  private ensureUploadDirectory() {
    if (!existsSync(this.uploadsDir)) {
      mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  private isS3Configured(): boolean {
    return Boolean(this.s3Client && this.bucketName && this.region);
  }

  private getFileExtension(file: Express.Multer.File): string {
    const extensionFromName = extname(file.originalname).replace('.', '');
    if (extensionFromName) {
      return extensionFromName;
    }

    const mimeToExtension: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    };

    return mimeToExtension[file.mimetype] ?? 'bin';
  }

  private async saveFileLocally(
    file: Express.Multer.File,
    prefix: string,
  ): Promise<string> {
    const fileExtension = this.getFileExtension(file);
    const relativeDirectory = join('images', prefix);
    const absoluteDirectory = join(process.cwd(), 'public', relativeDirectory);

    await fs.mkdir(absoluteDirectory, { recursive: true });

    const fileName = `${uuid()}.${fileExtension}`;
    const absolutePath = join(absoluteDirectory, fileName);

    await fs.writeFile(absolutePath, file.buffer);

    const relativePath = `${relativeDirectory}/${fileName}`.replace(/\\/g, '/');
    console.log('File stored locally:', relativePath);
    return relativePath;
  }

  private async deleteLocalFile(filePath: string): Promise<void> {
    const normalizedPath = filePath.replace(/^\/+/, '');
    const absolutePath = join(process.cwd(), 'public', normalizedPath);

    try {
      await fs.unlink(absolutePath);
      console.log('Local file deleted successfully:', normalizedPath);
    } catch (error: any) {
      if (error?.code === 'ENOENT') {
        console.warn('Local file not found during deletion:', normalizedPath);
        return;
      }

      console.error('Error deleting local file:', error);
      throw new Error('Failed to delete local file');
    }
  }

  private extractKeyFromUrl(url: string): string | null {
    try {
      // Handle both direct S3 URLs and presigned URLs
      if (url.includes('amazonaws.com')) {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        return pathname.startsWith('/') ? pathname.substring(1) : pathname;
      }
      return null;
    } catch (error) {
      console.error('Error extracting key from URL:', error);
      return null;
    }
  }

  private isAbsoluteUrl(url: string): boolean {
    return /^https?:\/\//i.test(url);
  }

  private isLocalUploadPath(url: string): boolean {
    return /^\/?images\//i.test(url);
  }

  // Helper method to check if string is an S3 URL
  isS3Url(url: string): boolean {
    return (
      url.includes('amazonaws.com') &&
      (url.includes('s3.') || url.includes('s3-'))
    );
  }
}
