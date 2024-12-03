import { Injectable } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import {
  CloudStorageAdapter,
  StorageUploadResult,
  StorageFileInfo,
  StorageErrorCode,
  StorageMetadata
} from './cloud-storage.interface';

interface SignedUrlCache {
  url: string;
  expiresAt: number;
}

@Injectable()
export class GoogleCloudStorageAdapter implements CloudStorageAdapter {
  private storage: Storage;
  private bucketName: string;
  private urlCache: Map<string, SignedUrlCache> = new Map();

  constructor() {
    const credentials = process.env.GCP_CREDENTIALS;
    const bucketName = process.env.GCP_BUCKET_NAME;

    if (!credentials || !bucketName) {
      throw {
        message: 'Missing required environment variables: GCP_CREDENTIALS and/or GCP_BUCKET_NAME',
        code: StorageErrorCode.VALIDATION_FAILED,
      };
    }

    this.storage = new Storage({ keyFilename: credentials });
    this.bucketName = bucketName;
  }

  private extractErrorDetails(error: any): Record<string, any> {
    return error?.errors || error?.response?.data || {};
  }

  private parseMetadataValue<T>(value: any, parser: (val: any) => T): T | undefined {
    try {
      if (value === undefined || value === null) return undefined;

      // 이미 적절한 타입인 경우 바로 반환
      if (typeof value === 'number' && (parser === parseInt || parser === parseFloat)) {
        return value as T;
      }

      return parser(value);
    } catch {
      return undefined;
    }
  }

  private isStorageError(error: any): error is { message: string; code: string } {
    return error && 'code' in error && 'message' in error;
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

  async upload(
    file: Express.Multer.File,
    destination?: string
  ): Promise<StorageUploadResult> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const finalDestination = destination || `${Date.now()}-${file.originalname}`;
      const blob = bucket.file(finalDestination);
      const blobStream = blob.createWriteStream({
        metadata: {
          contentType: file.mimetype,
        },
      });

      return new Promise((resolve, reject) => {
        blobStream
          .on('finish', async () => {
            try {
              const [metadata] = await blob.getMetadata();
              const storageMetadata: StorageMetadata = {
                fileSize: this.parseMetadataValue(metadata.size, parseInt),
                mimeType: metadata.contentType || file.mimetype,
                fileHash: metadata.md5Hash || '',
                width: this.parseMetadataValue(metadata?.metadata?.width, parseInt),
                height: this.parseMetadataValue(metadata?.metadata?.height, parseInt),
                duration: this.parseMetadataValue(metadata?.metadata?.duration, parseFloat),
                encoding: typeof metadata?.metadata?.encoding === 'string' ? metadata.metadata.encoding : undefined, // 수정된 부분
              };

              resolve({
                storageFileId: finalDestination,
                storageUrl: `https://storage.googleapis.com/${this.bucketName}/${finalDestination}`,
                storageMetadata,
              });
            } catch (error) {
              reject({
                message: 'Failed to get file metadata',
                code: StorageErrorCode.UPLOAD_FAILED,
                details: this.extractErrorDetails(error),
              });
            }
          })
          .on('error', (error) => {
            reject({
              message: 'Upload stream failed',
              code: StorageErrorCode.UPLOAD_FAILED,
              details: this.extractErrorDetails(error),
            });
          })
          .end(file.buffer);
      });
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
      await this.storage.bucket(this.bucketName).file(storageFileId).delete();
      this.urlCache.delete(storageFileId);
    } catch (error) {
      if (this.isStorageError(error)) throw error;
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
  ): Promise<(Pick<StorageFileInfo, "storageFileId"> & Partial<StorageFileInfo>)[]> {
    try {
      const [files] = await this.storage.bucket(this.bucketName).getFiles({ prefix });

      return await Promise.all(files.map(async (file) => {
        const [metadata] = await file.getMetadata();
        const baseInfo: Pick<StorageFileInfo, "storageFileId"> & Partial<StorageFileInfo> = {
          storageFileId: file.name,
        };

        if (!fields || fields.includes('fileName')) {
          baseInfo.fileName = file.name.split('/').pop();
        }
        if (!fields || fields.includes('fileUrl')) {
          baseInfo.fileUrl = `https://storage.googleapis.com/${this.bucketName}/${file.name}`;
        }
        if (!fields || fields.includes('fileSize')) {
          baseInfo.fileSize = this.parseMetadataValue(metadata.size, parseInt);
        }
        if (!fields || fields.includes('createdAt')) {
          baseInfo.createdAt = new Date(metadata.timeCreated);
        }
        if (!fields || fields.includes('lastCheckedAt')) {
          baseInfo.lastCheckedAt = new Date(metadata.updated);
        }
        if (!fields || fields.includes('isActive')) {
          baseInfo.isActive = !metadata.deleted;
        }

        return baseInfo;
      }));
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

      await this.ensureFileExists(storageFileId);

      const file = this.storage.bucket(this.bucketName).file(storageFileId);
      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + (expiresIn * 1000),
      });

      this.urlCache.set(storageFileId, {
        url,
        expiresAt: Date.now() + (expiresIn * 1000),
      });

      return url;
    } catch (error) {
      if (this.isStorageError(error)) throw error;
      throw {
        message: 'Failed to generate public URL',
        code: StorageErrorCode.URL_GENERATION_FAILED,
        details: this.extractErrorDetails(error),
      };
    }
  }

  async exists(storageFileId: string): Promise<boolean> {
    try {
      const [exists] = await this.storage.bucket(this.bucketName).file(storageFileId).exists();
      return exists;
    } catch (error) {
      throw {
        message: 'Failed to check file existence',
        code: StorageErrorCode.VALIDATION_FAILED,
        details: this.extractErrorDetails(error),
      };
    }
  }

  async getFileHash(storageFileId: string): Promise<string> {
    try {
      await this.ensureFileExists(storageFileId);
      const [metadata] = await this.storage.bucket(this.bucketName).file(storageFileId).getMetadata();

      if (!metadata.md5Hash) {
        throw {
          message: 'MD5 hash not available for the file',
          code: StorageErrorCode.VALIDATION_FAILED,
        };
      }

      return metadata.md5Hash;
    } catch (error) {
      if (this.isStorageError(error)) throw error;
      throw {
        message: 'Failed to retrieve file hash',
        code: StorageErrorCode.VALIDATION_FAILED,
        details: this.extractErrorDetails(error),
      };
    }
  }
}
