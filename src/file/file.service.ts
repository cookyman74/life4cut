import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FileInfoDto } from '../storage/dto/common.dto';
import { EditFileDto } from './dto/file.dto';
import { FileStorageService } from '../shared/file-storage.service';
import { StorageType as PrismaStorageType } from '@prisma/client';
import { SharedStorageType } from '../shared/adapter-types';

@Injectable()
export class FileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fileStorageService: FileStorageService,
  ) {}

  private mapPrismaToSharedStorageType(type: PrismaStorageType): SharedStorageType {
    switch (type) {
      case PrismaStorageType.AWS:
        return SharedStorageType.AWS;
      case PrismaStorageType.GOOGLE:
        return SharedStorageType.GOOGLE;
      case PrismaStorageType.AZURE:
        return SharedStorageType.AZURE;
      case PrismaStorageType.LOCAL:
        return SharedStorageType.LOCAL;
      default:
        throw new HttpException(
          `Unsupported storage type: ${type}`,
          HttpStatus.BAD_REQUEST,
        );
    }
  }

  // URL 기반 파일 정보 조회
  async getFileByUrl(path: string): Promise<FileInfoDto> {
    const parts = path.split('/');
    if (parts.length !== 4) {
      throw new HttpException(
        'Invalid file URL structure. Expected format: /year/month/branchName/filename',
        HttpStatus.BAD_REQUEST,
      );
    }

    const [year, month, branchName, filename] = parts;
    console.log("파일명 파츠명: ", year, month, filename)
    const yearNum = +year
    const monthNum = +month

    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      throw new HttpException(
        'Invalid year or month in URL',
        HttpStatus.BAD_REQUEST,
      );
    }

    const branch = await this.prisma.branch.findFirst({
      where: { name: branchName },
    });

    if (!branch) {
      throw new HttpException('Branch not found', HttpStatus.NOT_FOUND);
    }

    console.log(branch.id)

    const file = await this.prisma.file.findFirst({
      where: {
        year: yearNum,
        month: monthNum,
        branchId: branch.id,
        name: `${yearNum}_${monthNum}_${branchName}_${filename}`,
        deletedAt: null,
      },
      include: { storageInfo: true },
    });

    if (!file) {
      throw new HttpException('File not found', HttpStatus.NOT_FOUND);
    }

    return this.mapToFileInfoDto(file, file.storageInfo);
  }

  // 파일 편집
  async editFile(dto: EditFileDto): Promise<FileInfoDto> {
    const { storageFileId, changes } = dto;

    if (typeof changes !== 'object' || Array.isArray(changes)) {
      throw new HttpException(
        'Invalid changes structure. Expected an object with valid properties.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!changes.editType) {
      changes.editType = 'Unknown';
    }

    const file = await this.prisma.file.findUnique({
      where: { id: storageFileId },
      include: { storageInfo: true },
    });

    if (!file || !file.storageInfo) {
      throw new HttpException('File not found', HttpStatus.NOT_FOUND);
    }

    const updatedFile = await this.prisma.file.update({
      where: { id: storageFileId },
      data: {
        ...changes,
        version: { increment: 1 },
      },
    });

    await this.prisma.editHistory.create({
      data: {
        fileId: updatedFile.id,
        editType: changes.editType,
        changes,
      },
    });

    return this.mapToFileInfoDto(updatedFile, file.storageInfo);
  }

  // 파일 기록 저장
  async saveFileHistory(storageFileId: string, record: any): Promise<void> {
    const file = await this.prisma.file.findUnique({
      where: { id: storageFileId },
    });

    if (!file) {
      throw new HttpException('File not found', HttpStatus.NOT_FOUND);
    }

    await this.prisma.fileAccessLog.create({
      data: {
        fileId: storageFileId,
        accessType: 'EDIT',
        ...record,
      },
    });
  }

  // 다시보기 URL 생성
  async getViewUrl(storageFileId: string): Promise<string> {
    const fileWithStorage = await this.prisma.file.findUnique({
      where: { id: storageFileId },
      include: { storageInfo: true },
    });

    if (!fileWithStorage || !fileWithStorage.storageInfo) {
      throw new HttpException('File not found', HttpStatus.NOT_FOUND);
    }

    const viewUrl = `${process.env.APP_BASE_URL}/view/${fileWithStorage.id}`;
    return viewUrl;
  }

  // 파일 다운로드 메서드 수정
  async downloadFile(storageFileId: string): Promise<any> {
    const fileWithStorage = await this.prisma.file.findUnique({
      where: { id: storageFileId },
      include: { storageInfo: true },
    });

    if (!fileWithStorage || !fileWithStorage.storageInfo) {
      throw new HttpException('File not found', HttpStatus.NOT_FOUND);
    }

    return this.fileStorageService.downloadFile(
      storageFileId,
      this.mapPrismaToSharedStorageType(fileWithStorage.storageInfo.storageType),
    );
  }

  // Helper: 파일 정보 DTO 매핑
  private mapToFileInfoDto(file: any, storageInfo: any): FileInfoDto {
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
      metadata: file.metadata,
      path: `${file.year}/${file.month}/${file.branchId}`,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
      deletedAt: file.deletedAt,
      storageUrl: storageInfo?.storageUrl,
      isActive: !file.deletedAt && (storageInfo?.isActive ?? false),
      storageType: storageInfo?.storageType,
    };
  }
}
