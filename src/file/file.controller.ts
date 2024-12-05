import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Res,
  HttpException,
  HttpStatus,
  StreamableFile,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { FileService } from './file.service';
import { FileInfoDto } from '../storage/dto/common.dto';
import { EditFileDto } from './dto/file.dto';
import { Response } from 'express';

@ApiTags('Files')
@Controller('files')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Get('url')
  @ApiOperation({ summary: 'URL 기반 파일 정보 조회' })
  @ApiQuery({ name: 'path', description: '파일 URL 경로 (년/월/지점명/파일명)', example: '2024/03/서울/file.jpg' })
  async getFileByUrl(@Query('path') path: string): Promise<FileInfoDto> {
    if (!path) {
      throw new HttpException('Path query parameter is required', HttpStatus.BAD_REQUEST);
    }
    return this.fileService.getFileByUrl(path);
  }

  @Put('edit')
  @ApiOperation({ summary: '파일 편집' })
  @ApiBody({ description: '파일 편집 요청', type: EditFileDto })
  async editFile(@Body() dto: EditFileDto): Promise<FileInfoDto> {
    return this.fileService.editFile(dto);
  }

  @Post('history/:id')
  @ApiOperation({ summary: '파일 기록 저장' })
  @ApiParam({ name: 'id', description: '파일 ID' })
  @ApiBody({ description: '기록 정보', type: Object })
  async saveFileHistory(
    @Param('id') id: string,
    @Body() record: any,
  ): Promise<void> {
    return this.fileService.saveFileHistory(id, record);
  }

  @Get('view/:id')
  @ApiOperation({ summary: '다시보기 URL 생성' })
  @ApiParam({ name: 'id', description: '파일 ID' })
  async getViewUrl(@Param('id') id: string): Promise<{ url: string }> {
    const url = await this.fileService.getViewUrl(id);
    return { url };
  }

  @Get('download/:id')
  @ApiOperation({ summary: '파일 다운로드' })
  @ApiParam({ name: 'id', description: '파일 ID' })
  async downloadFile(@Param('id') id: string, @Res() res: Response): Promise<StreamableFile> {
    const { stream, filename, mimetype } = await this.fileService.downloadFile(id);

    res.set({
      'Content-Type': mimetype,
      'Content-Disposition': `attachment; filename="${filename}"`,
    });

    return new StreamableFile(stream);
  }

  // @Get('stats/:id')
  // @ApiOperation({ summary: '파일 통계 조회' })
  // @ApiParam({ name: 'id', description: '파일 ID' })
  // async getFileStats(@Param('id') id: string): Promise<any> {
  //   return this.fileService.getFileStats(id);
  // }

  @Get(':year/:month/:location/:fileName')
  @ApiOperation({ summary: '파일 검색 및 다운로드 URL 반환' })
  @ApiParam({ name: 'year', description: '파일 업로드 연도', example: '2024' })
  @ApiParam({ name: 'month', description: '파일 업로드 월', example: '11' })
  @ApiParam({ name: 'location', description: '파일 업로드 지점명', example: '서울' })
  @ApiParam({ name: 'fileName', description: '파일 이름', example: 'uuid.jpeg' })
  @ApiQuery({ name: 'expires', description: 'URL 만료 시간', required: false })
  @ApiQuery({ name: 'type', description: '파일 유형 (image/video)', enum: ['image', 'video'], required: false })
  async getFile(
    @Param('year') year: string,
    @Param('month') month: string,
    @Param('location') location: string,
    @Param('fileName') fileName: string,
    @Query('expires') expires: string | undefined,
    @Query('type') type: 'image' | 'video' | undefined,
    @Res() res: Response,
  ) {
    console.log(`${year}/${month}/${location}/${fileName}`);
    try {
      const path = `${year}/${month}/${location}/${fileName}`;
      const fileInfo = await this.fileService.getFileByUrl(path);

      // URL 만료 검증
      if (expires) {
        const expiresAt = new Date(expires);
        if (isNaN(expiresAt.getTime()) || expiresAt < new Date()) {
          throw new HttpException('URL has expired', HttpStatus.BAD_REQUEST);
        }
      }

      res.status(HttpStatus.OK).json({
        fileName: fileInfo.fileName,
        downloadUrl: fileInfo.storageUrl,
        type: type || fileInfo.fileType,
      });
    } catch (error) {
      console.error('Error fetching file:', error.message);
      throw new HttpException(error.message || 'File not found', HttpStatus.NOT_FOUND);
    }
  }
}
