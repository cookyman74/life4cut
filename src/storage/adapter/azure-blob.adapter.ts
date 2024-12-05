import { Injectable } from '@nestjs/common';
import { BlobServiceClient, BlockBlobClient } from '@azure/storage-blob';
import {
  CloudStorageAdapter,
  StorageUploadResult,
  StorageFileInfo,
  StorageErrorCode,
  StorageMetadata,
} from './cloud-storage.interface';

import { BlobSASPermissions } from '@azure/storage-blob';

interface SignedUrlCache {
  url: string;
  expiresAt: number;
}

@Injectable()
export class AzureBlobStorageAdapter implements CloudStorageAdapter {
  private blobServiceClient: BlobServiceClient;
  private containerName: string;
  private urlCache: Map<string, SignedUrlCache> = new Map();
  private storageType: string = 'AZURE';

  constructor() {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const containerName = process.env.AZURE_CONTAINER_NAME;

    if (!connectionString || !containerName) {
      throw {
        message: 'Missing required environment variables: AZURE_STORAGE_CONNECTION_STRING and/or AZURE_CONTAINER_NAME',
        code: StorageErrorCode.VALIDATION_FAILED,
      };
    }

    this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    this.containerName = containerName;
  }

  private extractErrorDetails(error: any): Record<string, any> {
    return error?.details || error?.message || error;
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

  private async ensureBlobExists(blobName: string): Promise<void> {
    try {
      const blobClient = this.blobServiceClient.getContainerClient(this.containerName).getBlobClient(blobName);
      const exists = await blobClient.exists();
      if (!exists) {
        throw {
          message: `Blob not found: ${blobName}`,
          code: StorageErrorCode.FILE_NOT_FOUND,
        };
      }
    } catch (error) {
      throw {
        message: 'Failed to check blob existence',
        code: StorageErrorCode.VALIDATION_FAILED,
        details: this.extractErrorDetails(error),
      };
    }
  }

  async upload(file: Express.Multer.File, destination?: string): Promise<StorageUploadResult> {
    try {
      const finalDestination = destination || `${Date.now()}-${file.originalname}`;
      const blockBlobClient = this.blobServiceClient
        .getContainerClient(this.containerName)
        .getBlockBlobClient(finalDestination);

      await blockBlobClient.upload(file.buffer, file.size, {
        blobHTTPHeaders: { blobContentType: file.mimetype },
      });

      const properties = await blockBlobClient.getProperties();

      const storageMetadata: StorageMetadata = {
        fileSize: file.size,
        mimeType: file.mimetype,
        fileHash: properties.etag?.replace(/"/g, '') || '',
        width: this.parseMetadataValue(properties.metadata?.width, parseInt),
        height: this.parseMetadataValue(properties.metadata?.height, parseInt),
        duration: this.parseMetadataValue(properties.metadata?.duration, parseFloat),
        encoding: typeof properties.metadata?.encoding === 'string' ? properties.metadata.encoding : undefined,
      };

      return {
        storageFileId: finalDestination,
        storageUrl: await this.getPublicUrl(finalDestination),
        storageMetadata,
        storageType: this.storageType,
      };
    } catch (error) {
      throw {
        message: 'File upload failed',
        code: StorageErrorCode.UPLOAD_FAILED,
        details: this.extractErrorDetails(error),
      };
    }
  }

  async download(storageFileId: string): Promise<NodeJS.ReadableStream> {
    try {
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
      const blobClient = containerClient.getBlobClient(storageFileId);
      const downloadResponse = await blobClient.download();
      return downloadResponse.readableStreamBody as NodeJS.ReadableStream;
    } catch (error) {
      throw {
        message: 'Failed to download file',
        code: StorageErrorCode.DOWNLOAD_FAILED,
        details: this.extractErrorDetails(error),
      };
    }
  };

  async delete(storageFileId: string): Promise<void> {
    try {
      const blobClient = this.blobServiceClient.getContainerClient(this.containerName).getBlobClient(storageFileId);
      await blobClient.delete();
      this.urlCache.delete(storageFileId); // 캐시 삭제
    } catch (error) {
      throw {
        message: 'Blob deletion failed',
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
      const blobs = this.blobServiceClient.getContainerClient(this.containerName).listBlobsFlat({ prefix });
      const result: (Pick<StorageFileInfo, 'storageFileId'> & Partial<StorageFileInfo>)[] = [];

      for await (const blob of blobs) {
        const baseInfo: Pick<StorageFileInfo, 'storageFileId'> & Partial<StorageFileInfo> = {
          storageFileId: blob.name,
        };

        if (!fields || fields.includes('fileName')) {
          baseInfo.fileName = blob.name.split('/').pop();
        }
        if (!fields || fields.includes('fileUrl')) {
          baseInfo.fileUrl = await this.getPublicUrl(blob.name); // 비동기 URL 생성
        }
        if (!fields || fields.includes('fileSize')) {
          baseInfo.fileSize = blob.properties.contentLength;
        }
        if (!fields || fields.includes('createdAt')) {
          baseInfo.createdAt = blob.properties.lastModified
            ? new Date(blob.properties.lastModified)
            : undefined;
        }
        if (!fields || fields.includes('isActive')) {
          baseInfo.isActive = true; // Azure Blob은 기본적으로 활성 상태
        }

        result.push(baseInfo);
      }

      return result;
    } catch (error) {
      throw {
        message: 'Failed to list blobs',
        code: StorageErrorCode.LIST_FAILED,
        details: this.extractErrorDetails(error),
      };
    }
  }

  async getPublicUrl(storageFileId: string, expiresIn: number = 3600): Promise<string> {
    try {
      // URL 캐싱 확인
      const cached = this.urlCache.get(storageFileId);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.url;
      }

      const blobClient = this.blobServiceClient.getContainerClient(this.containerName).getBlobClient(storageFileId);

      // BlobSASPermissions 객체 생성
      const permissions: BlobSASPermissions = {
        read: true,
        add: false,
        create: false,
        write: false,
        delete: false,
        deleteVersion: false,
        tag: false,
        move: false,
        execute: false,
        setImmutabilityPolicy: false,
        permanentDelete: false,
      };

      const sasToken = await blobClient.generateSasUrl({
        expiresOn: new Date(Date.now() + expiresIn * 1000),
        permissions,
      });

      // URL 캐싱
      this.urlCache.set(storageFileId, {
        url: sasToken,
        expiresAt: Date.now() + expiresIn * 1000,
      });

      return sasToken;
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
      const blobClient = this.blobServiceClient.getContainerClient(this.containerName).getBlobClient(storageFileId);
      return await blobClient.exists();
    } catch (error) {
      throw {
        message: 'Failed to check blob existence',
        code: StorageErrorCode.VALIDATION_FAILED,
        details: this.extractErrorDetails(error),
      };
    }
  }

  async getFileHash(storageFileId: string): Promise<string> {
    try {
      await this.ensureBlobExists(storageFileId);
      const blobClient = this.blobServiceClient.getContainerClient(this.containerName).getBlobClient(storageFileId);
      const properties = await blobClient.getProperties();

      if (!properties.etag) {
        throw {
          message: 'ETag not available for the blob',
          code: StorageErrorCode.VALIDATION_FAILED,
        };
      }

      return properties.etag.replace(/"/g, '');
    } catch (error) {
      throw {
        message: 'Failed to retrieve blob hash',
        code: StorageErrorCode.VALIDATION_FAILED,
        details: this.extractErrorDetails(error),
      };
    }
  }
}
