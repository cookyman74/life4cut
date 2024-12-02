import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class FileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly driveService: StorageService,
  ) {}

  // 파일 업로드 및 메타데이터 저장
  async uploadFile(
    fileName: string,
    filePath: string,
    fileType: string,
  ): Promise<any> {
    const uploadedFile = await this.driveService.uploadFile(fileName, filePath);

    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72시간 후 만료

    return this.prisma.file.create({
      data: {
        name: uploadedFile.name,
        fileId: uploadedFile.id,
        type: fileType,
        path: filePath,
        expiresAt,
      },
    });
  }

  // 파일 검색 및 만료 검증
  async getFile(fileName: string): Promise<any> {
    const file = await this.prisma.file.findFirst({
      where: { name: fileName },
    });

    if (!file) {
      throw new HttpException('File not found', HttpStatus.NOT_FOUND);
    }

    // 만료 검증
    if (new Date() > new Date(file.expiresAt)) {
      throw new HttpException(
        'The download URL has expired',
        HttpStatus.FORBIDDEN,
      );
    }

    return file;
  }
}
