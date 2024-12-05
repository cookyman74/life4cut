import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudStorageAdapter, StorageError, StorageErrorCode } from './adapter/cloud-storage.interface';
import { CloudStorageFactory, StorageType } from './adapter/cloud-storage.factory';
import { UploadFileRequestDto, UploadFileResponseDto } from './dto/upload-file.dto';
import { DeleteFileRequestDto, DeleteFileResponseDto } from './dto/delete-file.dto';
import { ListFilesRequestDto, ListFilesResponseDto } from './dto/list-files.dto';
import { FileInfoDto, JsonValue } from './dto/common.dto';
import { File, Prisma, StorageInfo } from '@prisma/client';

@Injectable()
export class StorageService {
  private adapters: Map<StorageType, CloudStorageAdapter> = new Map();
  private adapterList: CloudStorageAdapter[] = [];
  private currentAdapterIndex = 0;

  constructor(private readonly prisma: PrismaService) {
    this.initializeAdapters().catch(error => {
      console.error('Failed to initialize storage adapters:', error);
      throw error;
    });
  }

  private async initializeAdapters() {
    const enabledProviders = process.env.ENABLED_CLOUD_PROVIDERS?.split(',') || [];
    if (enabledProviders.length === 0) {
      throw {
        message: 'No enabled cloud providers found in the configuration',
        code: StorageErrorCode.VALIDATION_FAILED,
      } as StorageError;
    }

    await Promise.all(
      enabledProviders.map(async (provider) => {
        const normalizedProvider = provider.trim().toLowerCase() as StorageType;
        try {
          const adapter = CloudStorageFactory.createAdapter({ provider: normalizedProvider });
          this.adapters.set(normalizedProvider, adapter);
          this.adapterList.push(adapter);
          console.log(this.adapterList);
        } catch (error) {
          console.error(`Failed to initialize adapter for provider ${provider}:`, error);
          throw error;
        }
      })
    );

    if (this.adapterList.length === 0) {
      throw {
        message: 'No valid cloud storage adapters could be initialized',
        code: StorageErrorCode.VALIDATION_FAILED,
      } as StorageError;
    }
  }

  private getNextAdapter(): CloudStorageAdapter {
    const adapter = this.adapterList[this.currentAdapterIndex];
    this.currentAdapterIndex = (this.currentAdapterIndex + 1) % this.adapterList.length;
    return adapter;
  }

  private determineFileType(mimeType: string): 'IMAGE' | 'VIDEO' {
    return mimeType.startsWith('image/') ? 'IMAGE' : 'VIDEO';
  }

  private async createFileRecord(
    file: Express.Multer.File,
    uploadResult: any,
    dto: UploadFileRequestDto,
  ): Promise<File> {
    const storageFileName = file.originalname;
    const [year, month, branchName, fileName] = storageFileName.split('_');

    try {
      return await this.prisma.file.create({
        data: {
          name: file.originalname,
          type: this.determineFileType(file.mimetype),
          status: 'COMPLETE',
          mimeType: file.mimetype,
          fileSize: BigInt(file.size),
          fileHash: uploadResult.storageMetadata?.fileHash || '',
          width: uploadResult.storageMetadata?.width,
          height: uploadResult.storageMetadata?.height,
          duration: uploadResult.storageMetadata?.duration,
          encoding: uploadResult.storageMetadata?.encoding,
          year: +year || new Date().getFullYear(),
          month: +month || new Date().getMonth() + 1,
          branchId: dto.branchId,
        },
      });
    } catch (error) {
      throw {
        message: 'Failed to create file record',
        code: StorageErrorCode.DATABASE_ERROR,
        details: error,
      } as StorageError;
    }
  }

  private async uploadToStorage(file: Express.Multer.File): Promise<any> {
    for (let i = 0; i < this.adapterList.length; i++) {
      const adapter = this.getNextAdapter();
      try {
        return await adapter.upload(file, file.originalname);
      } catch (error) {
        console.error(`Upload failed on adapter ${adapter.constructor.name}:`, error);
        if (i === this.adapterList.length - 1) {
          throw {
            message: 'All storage adapters failed to upload the file',
            code: StorageErrorCode.UPLOAD_FAILED,
            details: error,
          } as StorageError;
        }
      }
    }
  }

  async uploadFile(dto: UploadFileRequestDto, file: Express.Multer.File): Promise<UploadFileResponseDto> {
    return this.prisma.$transaction(async (prisma) => {
      try {
        const uploadResult = await this.uploadToStorage(file);
        const fileRecord = await this.createFileRecord(file, uploadResult, dto);

        const storageInfo = await prisma.storageInfo.create({
          data: {
            fileId: fileRecord.id,
            storageType: uploadResult.storageType,
            storageFileId: uploadResult.storageFileId,
            storageUrl: uploadResult.storageUrl,
            storageMetadata: uploadResult.storageMetadata,
            isActive: true,
          },
        });

        return {
          storageFileId: fileRecord.id,
          storageUrl: uploadResult.storageUrl,
          storageMetadata: uploadResult.storageMetadata,
        };
      } catch (error) {
        console.error('Transaction failed:', error);
        throw {
          message: 'Failed to complete file upload transaction',
          code: StorageErrorCode.DATABASE_ERROR,
          details: error,
        } as StorageError;
      }
    });
  }

  async listFiles(dto: ListFilesRequestDto): Promise<ListFilesResponseDto> {
    const where = {
      branchId: dto.branchId,
      deletedAt: null,
      ...(dto.prefix && {
        OR: [
          { name: { startsWith: dto.prefix } },
          { storageInfo: { storageFileId: { startsWith: dto.prefix } } },
        ],
      }),
    };

    const [files, totalCount] = await Promise.all([
      this.prisma.file.findMany({
        where,
        include: { storageInfo: true },
        take: dto.limit,
        skip: (dto.page - 1) * dto.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.file.count({ where }),
    ]);

    return {
      files: files.map(file => this.mapToFileInfoDto(file, file.storageInfo)),
      totalCount,
      currentPage: dto.page || 1,
      totalPages: Math.ceil(totalCount / (dto.limit || 10)),
    };
  }

  async downloadFile(
    storageFileId: string,
    storageType: StorageType
  ): Promise<{ stream: NodeJS.ReadableStream; filename: string; mimetype: string }> {
    // 1. 파일 정보 조회
    const fileWithStorage = await this.prisma.file.findFirst({
      where: { id: storageFileId },
      include: { storageInfo: true },
    });

    if (!fileWithStorage || !fileWithStorage.storageInfo) {
      throw {
        message: 'File not found',
        code: StorageErrorCode.FILE_NOT_FOUND,
      } as StorageError;
    }

    // 2. 어댑터 확인
    const adapter = this.adapters.get(storageType);
    if (!adapter) {
      throw {
        message: `Storage provider not available for type: ${storageType}`,
        code: StorageErrorCode.VALIDATION_FAILED,
      } as StorageError;
    }

    try {
      // 3. 트랜잭션 내에서 접근 횟수 증가 및 파일 다운로드
      const [updatedFile] = await this.prisma.$transaction([
        this.prisma.file.update({
          where: { id: storageFileId },
          data: { accessCount: { increment: 1 } },
        }),
      ]);

      // 4. 파일 스트림 가져오기
      const stream = await adapter.download(fileWithStorage.storageInfo.storageFileId);

      return {
        stream,
        filename: updatedFile.name,
        mimetype: updatedFile.mimeType,
      };
    } catch (error) {
      console.error('Error downloading file:', error);
      throw {
        message: 'Failed to download file',
        code: StorageErrorCode.DOWNLOAD_FAILED,
        details: error,
      } as StorageError;
    }
  }

  async deleteFile(dto: DeleteFileRequestDto): Promise<DeleteFileResponseDto> {
    return this.prisma.$transaction(async (prisma) => {
      const file = await prisma.file.findUnique({
        where: { id: dto.storageFileId },
        include: { storageInfo: true },
      });

      if (!file) {
        throw {
          message: 'File not found',
          code: StorageErrorCode.FILE_NOT_FOUND,
        } as StorageError;
      }

      if (dto.permanent) {
        try {
          const adapter = this.adapters.get(file.storageInfo?.storageType as StorageType);
          if (adapter) {
            await adapter.delete(file.storageInfo.storageFileId);
          }
        } catch (error) {
          console.warn('Failed to delete from storage. Continuing with database deletion.', error);
        }
        await prisma.file.delete({ where: { id: dto.storageFileId } });
      } else {
        await prisma.file.update({
          where: { id: dto.storageFileId },
          data: {
            deletedAt: new Date(),
            storageInfo: {
              update: {
                isActive: false
              }
            }
          },
        });
      }

      return {
        storageFileId: dto.storageFileId,
        success: true,
        deletedAt: dto.permanent ? undefined : new Date(),
      };
    });
  }

  private mapToFileInfoDto(file: File, storageInfo?: StorageInfo): FileInfoDto {
    return {
      storageFileId: file.id,
      fileName: file.name,
      fileType: file.type,
      fileStatus: file.status,
      mimeType: file.mimeType,
      fileSize: Number(file.fileSize),
      fileHash: file.fileHash,
      width: file.width,
      height: file.height,
      duration: file.duration,
      encoding: file.encoding,
      metadata: file.metadata as JsonValue,
      path: `${file.year}/${file.month}/${file.branchId}`,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
      deletedAt: file.deletedAt,
      storageUrl: storageInfo?.storageUrl,
      isActive: !file.deletedAt && (storageInfo?.isActive ?? false),
      storageType: storageInfo?.storageType,
    };
  }

  async getFileUrl(storageFileId: string, storageType: StorageType): Promise<FileInfoDto> {
    const fileWithStorage = await this.prisma.file.findFirst({
      where: { id: storageFileId },
      include: { storageInfo: true },
    });

    if (!fileWithStorage || !fileWithStorage.storageInfo) {
      throw {
        message: 'File not found',
        code: StorageErrorCode.FILE_NOT_FOUND,
      } as StorageError;
    }

    const adapter = this.adapters.get(storageType);
    if (!adapter) {
      throw {
        message: 'Storage provider not available',
        code: StorageErrorCode.VALIDATION_FAILED,
      } as StorageError;
    }

    const newUrl = await adapter.getPublicUrl(fileWithStorage.storageInfo.storageFileId);
    const updatedStorageInfo = await this.prisma.storageInfo.update({
      where: { id: fileWithStorage.storageInfo.id },
      data: { storageUrl: newUrl },
      include: { file: true }
    });

    return this.mapToFileInfoDto(updatedStorageInfo.file, updatedStorageInfo);
  }
}
