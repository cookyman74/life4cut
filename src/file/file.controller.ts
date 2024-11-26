import { Controller, Get } from '@nestjs/common';
import { FileService } from './file.service';

@Controller('file')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Get()
  async getFiles() {
    return this.fileService.getAllFiles();
  }
}
