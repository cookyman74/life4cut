import {
  Controller,
  Get,
  Post,
  Body,
  HttpException,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { FileService } from './file.service';
import { Response } from 'express';

@Controller('files')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  // 파일 검색 및 다운로드 URL 반환
  @Get('search')
  async getFile(@Body('fileName') fileName: string, @Res() res: Response) {
    try {
      const file = await this.fileService.getFile(fileName);
      return res.json({
        fileName: file.name,
        downloadUrl: `https://www.googleapis.com/drive/v3/files/${file.fileId}?alt=media`,
      });
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.FORBIDDEN);
    }
  }
}
