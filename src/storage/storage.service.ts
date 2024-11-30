import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import * as dotenv from 'dotenv';

dotenv.config(); // .env 파일 로드

@Injectable()
export class StorageService {
  private storage: Storage;
  private readonly bucketName: string;

  constructor() {
    // Google Cloud Storage 설정
    this.storage = new Storage({
      keyFilename: 'credentials.json', // Google Cloud 서비스 계정 키 파일
    });

    // 환경 변수에서 버킷 이름 로드
    this.bucketName = process.env.GOOGLE_CLOUD_BUCKET_NAME;
    if (!this.bucketName) {
      throw new Error('GOOGLE_CLOUD_BUCKET_NAME is not set in .env file');
    }
  }

  // 파일 업로드
  async uploadFile(fileName: string, filePath: string): Promise<any> {
    try {
      const bucket = this.storage.bucket(this.bucketName);

      const [file] = await bucket.upload(filePath, {
        destination: fileName, // 저장 경로 지정
        public: true, // 퍼블릭 URL로 접근 가능
        metadata: {
          contentType: 'image/jpeg', // 파일 타입 (예: 이미지)
        },
      });

      console.log(`File uploaded to ${file.name}`);
      return file.name;
    } catch (error) {
      console.error('Error uploading file to GCS:', error.message);
      throw new Error('Failed to upload file to GCS');
    }
  }

  // 파일 검색
  async findFile(fileName: string): Promise<string> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(fileName);

      const [exists] = await file.exists();
      if (!exists) {
        throw new Error(`File not found: ${fileName}`);
      }

      // 퍼블릭 URL 생성
      return this.getPublicUrl(fileName);
    } catch (error) {
      console.error('Error finding file:', error.message);
      throw new HttpException(
        error.message || 'File not found',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  // 퍼블릭 URL 생성
  getPublicUrl(fileName: string): string {
    return `https://storage.googleapis.com/${this.bucketName}/${fileName}`;
  }

  // 다운로드 URL 검증
  validateDownloadUrl(expires: string): void {
    const currentTime = Date.now();
    const expirationTime = parseInt(expires, 10);

    if (currentTime > expirationTime) {
      throw new HttpException(
        'The download URL has expired',
        HttpStatus.FORBIDDEN,
      );
    }
  }
}
