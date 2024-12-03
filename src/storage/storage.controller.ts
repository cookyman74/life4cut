import { Response } from 'express';
import { HttpException, Res } from '@nestjs/common';
import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Query,
  Param,
  UseInterceptors,
  UploadedFile,
  HttpStatus,
  ParseEnumPipe,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import { StorageService } from './storage.service';
import { StorageType } from './adapter/cloud-storage.factory';
import {
  UploadFileRequestDto,
  UploadFileResponseDto,
} from './dto/upload-file.dto';
import {
  DeleteFileRequestDto,
  DeleteFileResponseDto,
} from './dto/delete-file.dto';
import {
  ListFilesRequestDto,
  ListFilesResponseDto,
} from './dto/list-files.dto';
import { FileInfoDto } from './dto/common.dto';
import { StorageErrorCode } from './adapter/cloud-storage.interface';

@ApiTags('Storage')
@Controller('storage')
export class StorageController {
  constructor(
    private readonly storageService: StorageService
  ) {}

  @Post('upload')
  @ApiOperation({ summary: '파일 업로드' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  @ApiBody({
    description: '파일 업로드 요청',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        destination: {
          type: 'string',
          example: '2024/03/branch1/file.jpg',
        },
        branchId: {
          type: 'string',
          example: 'branch1',
        },
      },
    },
  })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body(new ValidationPipe()) dto: UploadFileRequestDto,
  ): Promise<UploadFileResponseDto> {
    return this.storageService.uploadFile(dto, file);
  }

  @Get('files')
  @ApiOperation({ summary: '파일 목록 조회' })
  async listFiles(
    @Query(new ValidationPipe()) dto: ListFilesRequestDto,
  ): Promise<ListFilesResponseDto> {
    return this.storageService.listFiles(dto);
  }

  @Delete('files/:id')
  @ApiOperation({ summary: '파일 삭제' })
  @ApiParam({ name: 'id', description: '파일 ID' })
  async deleteFile(
    @Param('id') id: string,
  ): Promise<DeleteFileResponseDto> {
    return this.storageService.deleteFile({ storageFileId: id });
  }

  @Get('files/:id/url')
  @ApiOperation({ summary: '파일 URL 조회' })
  @ApiParam({ name: 'id', description: '파일 ID' })
  @ApiQuery({ name: 'provider', enum: StorageType, description: '스토리지 프로바이더' })
  async getFileUrl(
    @Param('id') id: string,
    @Query('provider', new ParseEnumPipe(StorageType, { errorHttpStatusCode: HttpStatus.BAD_REQUEST })) provider: StorageType,
  ): Promise<FileInfoDto> {
    return this.storageService.getFileUrl(id, provider);
  }

  @Get('files/:id/download')
  @ApiOperation({ summary: '파일 다운로드' })
  @ApiParam({ name: 'id', description: '파일 ID' })
  @ApiQuery({ name: 'provider', enum: StorageType, description: '스토리지 프로바이더' })
  async downloadFile(
    @Param('id') id: string,
    @Query('provider', new ParseEnumPipe(StorageType, { errorHttpStatusCode: HttpStatus.BAD_REQUEST })) provider: StorageType,
    @Res() response: Response,
  ) {
    try {
      const { stream, filename, mimetype } = await this.storageService.downloadFile(id, provider);

      response.setHeader('Content-Type', mimetype);
      response.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);

      stream.pipe(response);
    } catch (error) {
      throw new HttpException(
        error.message || 'Download failed',
        error.code === StorageErrorCode.FILE_NOT_FOUND ? HttpStatus.NOT_FOUND : HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
