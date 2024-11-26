import { Module } from '@nestjs/common';
import { FileService } from './file.service';
import { FileController } from './file.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { DriveModule } from '../drive/drive.module';

@Module({
  imports: [PrismaModule, DriveModule],
  providers: [FileService],
  controllers: [FileController],
})
export class FileModule {}
