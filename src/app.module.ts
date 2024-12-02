import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { FileModule } from './file/file.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // 모든 모듈에서 사용 가능
    }),
    PrismaModule, // Prisma 데이터베이스 모듈
    FileModule, // 파일 관리 모듈
    StorageModule, // Google Cloud Storage 모듈
  ],
  controllers: [], // 전역 컨트롤러 없음
  providers: [], // 전역 프로바이더 없음
})
export class AppModule {}
