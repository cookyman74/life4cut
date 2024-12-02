import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Query,
  Res,
} from '@nestjs/common';
import { StorageService } from './storage.service';
import { Response } from 'express';

@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  // 파일 검색 및 다운로드 URL 반환
  @Get(':year/:month/:location/:fileName')
  async getFile(
    @Param('year') year: string,
    @Param('month') month: string,
    @Param('location') location: string,
    @Param('fileName') fileName: string,
    @Query('expires') expires: string,
    @Query('type') type: 'image' | 'video',
    @Res() res: Response,
  ) {
    try {
      // URL 만료 시간 검증
      this.storageService.validateDownloadUrl(expires);

      // 통합 파일명 생성
      const fullFileName = `${year}_${month}_${location}_${fileName}`;

      console.log(`Fetching file: ${fullFileName}`);

      // GCS 퍼블릭 URL 생성
      const downloadUrl = await this.storageService.findFile(fullFileName);

      return res.json({
        fileName: fileName,
        downloadUrl,
        type,
      });
    } catch (error) {
      console.error('Error fetching file:', error.message);
      throw new HttpException(
        error.message || 'File not found',
        HttpStatus.NOT_FOUND,
      );
    }
  }
}
