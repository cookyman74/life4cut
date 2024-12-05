import { Injectable } from '@nestjs/common';
import { StorageService } from '../storage/storage.service';
import { UploadFileRequestDto, UploadFileResponseDto } from '../storage/dto/upload-file.dto';
import { DeleteFileRequestDto, DeleteFileResponseDto } from '../storage/dto/delete-file.dto';
import { ListFilesRequestDto, ListFilesResponseDto } from '../storage/dto/list-files.dto';
import { StorageType } from '../storage/adapter/cloud-storage.factory';
import { SharedStorageType } from './adapter-types';

@Injectable()
export class FileStorageService {
  constructor(private readonly storageService: StorageService) {}

  async uploadFile(dto: UploadFileRequestDto, file: Express.Multer.File): Promise<UploadFileResponseDto> {
    return this.storageService.uploadFile(dto, file);
  }

  async deleteFile(dto: DeleteFileRequestDto): Promise<DeleteFileResponseDto> {
    return this.storageService.deleteFile(dto);
  }

  async listFiles(dto: ListFilesRequestDto): Promise<ListFilesResponseDto> {
    return this.storageService.listFiles(dto);
  }

  async getFileUrl(fileId: string, storageType: SharedStorageType): Promise<any> {
    return this.storageService.getFileUrl(fileId, this.mapToStorageType(storageType));
  }

  // StorageType 매핑 메서드
  private mapToStorageType(type: SharedStorageType): StorageType {
    return StorageType[type] as StorageType;
  }

  async downloadFile(fileId: string, storageType: SharedStorageType): Promise<any> {
    return this.storageService.downloadFile(fileId, this.mapToStorageType(storageType));
  }
}
