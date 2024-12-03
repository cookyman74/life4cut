import { Injectable } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { CloudStorageAdapter, StorageUploadResult, StorageFileInfo, StorageErrorCode, StorageMetadata } from './cloud-storage.interface';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';


interface SignedUrlCache {
  url: string;
  expiresAt: number;
}

@Injectable()
export class AwsS3Adapter implements CloudStorageAdapter {
  private s3: S3Client;
  private bucketName: string;
  private urlCache: Map<string, SignedUrlCache> = new Map();

  constructor() {
    const region = process.env.AWS_REGION;
    const bucketName = process.env.AWS_BUCKET_NAME;

    if (!region || !bucketName) {
      throw {
        message: 'Missing required environment variables: AWS_REGION and/or AWS_BUCKET_NAME',
        code: StorageErrorCode.VALIDATION_FAILED,
      };
    }

    this.s3 = new S3Client({ region });
    this.bucketName = bucketName;
  }

  private extractErrorDetails(error: any): Record<string, any> {
    return error?.message || error;
  }

  private parseMetadataValue<T>(value: any, parser: (val: any) => T): T | undefined {
    try {
      if (value === undefined || value === null) return undefined;
      if (typeof value === 'number' && (parser === parseInt || parser === parseFloat)) {
        return value as T;
      }
      return parser(value);
    } catch {
      return undefined;
    }
  }

  private async ensureFileExists(storageFileId: string): Promise<void> {
    const exists = await this.exists(storageFileId);
    if (!exists) {
      throw {
        message: `File not found: ${storageFileId}`,
        code: StorageErrorCode.FILE_NOT_FOUND,
      };
    }
  }

  async upload(file: Express.Multer.File, destination?: string): Promise<StorageUploadResult> {
    try {
      const finalDestination = destination || `${Date.now()}-${file.originalname}`;
      const params = {
        Bucket: this.bucketName,
        Key: finalDestination,
        Body: file.buffer,
        ContentType: file.mimetype,
      };

      await this.s3.send(new PutObjectCommand(params));

      const command = new HeadObjectCommand({ Bucket: this.bucketName, Key: finalDestination });
      const metadata = await this.s3.send(command);

      const storageMetadata: StorageMetadata = {
        fileSize: file.size,
        mimeType: file.mimetype,
        fileHash: metadata.ETag?.replace(/"/g, '') || '',
        width: this.parseMetadataValue(metadata.Metadata?.width, parseInt),
        height: this.parseMetadataValue(metadata.Metadata?.height, parseInt),
        duration: this.parseMetadataValue(metadata.Metadata?.duration, parseFloat),
        encoding: typeof metadata.Metadata?.encoding === 'string' ? metadata.Metadata.encoding : undefined,
      };

      return {
        storageFileId: finalDestination,
        storageUrl: await this.getPublicUrl(finalDestination),
        storageMetadata,
      };
    } catch (error) {
      throw {
        message: 'File upload failed',
        code: StorageErrorCode.UPLOAD_FAILED,
        details: this.extractErrorDetails(error),
      };
    }
  }

  async delete(storageFileId: string): Promise<void> {
    try {
      await this.ensureFileExists(storageFileId);
      const params = { Bucket: this.bucketName, Key: storageFileId };
      await this.s3.send(new DeleteObjectCommand(params));
      this.urlCache.delete(storageFileId);
    } catch (error) {
      throw {
        message: 'File deletion failed',
        code: StorageErrorCode.DELETE_FAILED,
        details: this.extractErrorDetails(error),
      };
    }
  }

  async listFiles(
    prefix?: string,
    fields?: (keyof StorageFileInfo)[]
  ): Promise<(Pick<StorageFileInfo, 'storageFileId'> & Partial<StorageFileInfo>)[]> {
    try {
      const params = { Bucket: this.bucketName, Prefix: prefix };
      const result = await this.s3.send(new ListObjectsV2Command(params));

      if (!result.Contents) return [];

      return await Promise.all(
        result.Contents.map(async (item) => {
          const baseInfo: Pick<StorageFileInfo, 'storageFileId'> & Partial<StorageFileInfo> = {
            storageFileId: item.Key!,
          };

          if (!fields || fields.includes('fileName')) {
            baseInfo.fileName = item.Key?.split('/').pop();
          }
          if (!fields || fields.includes('fileUrl')) {
            baseInfo.fileUrl = await this.getPublicUrl(item.Key!); // 비동기 URL 생성
          }
          if (!fields || fields.includes('fileSize')) {
            baseInfo.fileSize = this.parseMetadataValue(item.Size, Number); // 안전한 타입 처리
          }
          if (!fields || fields.includes('createdAt')) {
            baseInfo.createdAt = item.LastModified ? new Date(item.LastModified) : undefined;
          }
          if (!fields || fields.includes('isActive')) {
            baseInfo.isActive = true; // S3에서는 기본적으로 활성 상태만 존재
          }

          return baseInfo;
        })
      );
    } catch (error) {
      throw {
        message: 'Failed to list files',
        code: StorageErrorCode.LIST_FAILED,
        details: this.extractErrorDetails(error),
      };
    }
  }

  async getPublicUrl(storageFileId: string, expiresIn: number = 3600): Promise<string> {
    try {
      const cached = this.urlCache.get(storageFileId);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.url;
      }

      const command = new GetObjectCommand({ Bucket: this.bucketName, Key: storageFileId });
      const url = await getSignedUrl(this.s3, command, { expiresIn });

      this.urlCache.set(storageFileId, {
        url,
        expiresAt: Date.now() + expiresIn * 1000,
      });

      return url;
    } catch (error) {
      throw {
        message: 'Failed to generate public URL',
        code: StorageErrorCode.URL_GENERATION_FAILED,
        details: this.extractErrorDetails(error),
      };
    }
  }

  async exists(storageFileId: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({ Bucket: this.bucketName, Key: storageFileId });
      await this.s3.send(command);
      return true;
    } catch (error: any) {
      if (error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw {
        message: 'Failed to check file existence',
        code: StorageErrorCode.VALIDATION_FAILED,
        details: this.extractErrorDetails(error),
      };
    }
  }

  async getFileHash(storageFileId: string): Promise<string> {
    try {
      const command = new HeadObjectCommand({ Bucket: this.bucketName, Key: storageFileId });
      const response = await this.s3.send(command);

      if (!response.ETag) {
        throw {
          message: 'ETag not available for the file',
          code: StorageErrorCode.VALIDATION_FAILED,
        };
      }

      return response.ETag.replace(/"/g, '');
    } catch (error) {
      throw {
        message: 'Failed to retrieve file hash',
        code: StorageErrorCode.VALIDATION_FAILED,
        details: this.extractErrorDetails(error),
      };
    }
  }
}
