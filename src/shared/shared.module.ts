import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { FileStorageService } from './file-storage.service';

@Module({
  imports: [StorageModule],
  providers: [FileStorageService],
  exports: [FileStorageService],
})
export class SharedModule {}
