import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StorageErrorCode } from '../adapter/cloud-storage.interface';

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

export class StorageErrorResponseDto {
  @ApiProperty({
    description: '에러 메시지',
    example: 'Invalid storage provider',
  })
  message: string;

  @ApiProperty({
    description: '에러 코드',
    enum: StorageErrorCode,
    example: StorageErrorCode.VALIDATION_FAILED,
  })
  code: StorageErrorCode;

  @ApiPropertyOptional({
    description: '추가 에러 상세 정보',
    example: { provider: 'unknown' },
  })
  details?: Record<string, any>;

  @ApiProperty({
    description: '에러 발생 시간',
    example: '2024-03-01T12:00:00Z',
  })
  timestamp: string;

  constructor(error: { message: string; code: StorageErrorCode; details?: any }) {
    this.message = error.message;
    this.code = error.code;
    this.details = error.details;
    this.timestamp = new Date().toISOString();
  }
}

export class PaginationRequestDto {
  @ApiPropertyOptional({
    description: '페이지 번호',
    example: 1,
    default: 1,
  })
  page?: number;

  @ApiPropertyOptional({
    description: '페이지당 항목 수',
    example: 10,
    default: 10,
  })
  limit?: number;

  @ApiPropertyOptional({
    description: '정렬 기준 필드',
    example: 'createdAt',
  })
  orderBy?: string;

  @ApiPropertyOptional({
    description: '정렬 방향',
    enum: ['asc', 'desc'],
    example: 'asc',
    default: 'asc',
  })
  order?: 'asc' | 'desc';
}

export class PaginationResponseDto<T> {
  @ApiProperty({
    description: '데이터 목록',
    type: Array,
  })
  data: T[];

  @ApiProperty({
    description: '현재 페이지 번호',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: '페이지당 항목 수',
    example: 10,
  })
  limit: number;

  @ApiProperty({
    description: '전체 항목 수',
    example: 100,
  })
  totalCount: number;

  @ApiProperty({
    description: '전체 페이지 수',
    example: 10,
  })
  totalPages: number;

  constructor(data: T[], totalCount: number, page: number, limit: number) {
    this.data = data;
    this.page = page;
    this.limit = limit;
    this.totalCount = totalCount;
    this.totalPages = Math.ceil(totalCount / limit);
  }
}

export class MetadataDto {
  @ApiPropertyOptional({
    description: '이미지/비디오 너비',
    example: 1920,
  })
  width?: number;

  @ApiPropertyOptional({
    description: '이미지/비디오 높이',
    example: 1080,
  })
  height?: number;

  @ApiPropertyOptional({
    description: '비디오 길이 (초)',
    example: 120.5,
  })
  duration?: number;

  @ApiPropertyOptional({
    description: '파일 인코딩 형식',
    example: 'H.264',
  })
  encoding?: string;
}

export class SortingDto {
  @ApiPropertyOptional({
    description: '정렬 기준 필드',
    example: 'createdAt',
  })
  orderBy?: string;

  @ApiPropertyOptional({
    description: '정렬 방향',
    enum: ['asc', 'desc'],
    example: 'asc',
    default: 'asc',
  })
  order?: 'asc' | 'desc';
}

export class FileInfoDto {
  @ApiProperty({
    description: '스토리지 파일 ID',
    example: '2024/03/서울/file.jpg',
  })
  storageFileId: string;

  @ApiPropertyOptional({
    description: '파일 이름',
    example: 'file.jpg',
  })
  fileName?: string;

  @ApiProperty({
    description: '파일 타입 (IMAGE/VIDEO)',
    example: 'IMAGE',
  })
  fileType: string;

  @ApiProperty({
    description: '파일 상태',
    example: 'COMPLETE',
  })
  fileStatus: string;

  @ApiProperty({
    description: '파일 MIME 타입',
    example: 'image/jpeg',
  })
  mimeType: string;

  @ApiProperty({
    description: '파일 크기 (bytes)',
    example: 1024,
  })
  fileSize: number;

  @ApiPropertyOptional({
    description: '파일 고유 해시값',
    example: 'abc123def456',
  })
  fileHash?: string;

  @ApiPropertyOptional({
    description: '이미지/비디오 너비 (픽셀)',
    example: 1920,
  })
  width?: number;

  @ApiPropertyOptional({
    description: '이미지/비디오 높이 (픽셀)',
    example: 1080,
  })
  height?: number;

  @ApiPropertyOptional({
    description: '비디오 길이 (초)',
    example: 120.5,
  })
  duration?: number;

  @ApiPropertyOptional({
    description: '파일 인코딩 형식',
    example: 'H.264',
  })
  encoding?: string;

  @ApiPropertyOptional({
    description: '추가 메타데이터',
    example: { key: 'value' },
  })
  metadata?: JsonValue;

  @ApiProperty({
    description: '파일 경로 (지점 ID 포함)',
    example: '2024/03/서울',
  })
  path: string;

  @ApiPropertyOptional({
    description: '소프트 삭제 시간',
    example: '2024-03-01T12:00:00Z',
  })
  deletedAt?: Date;

  @ApiProperty({
    description: '파일 생성 시간',
    example: '2024-03-01T12:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: '마지막 업데이트 시간',
    example: '2024-03-01T12:00:00Z',
  })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: '스토리지 URL',
    example: 'https://example.com/storage/2024/03/서울/file.jpg',
  })
  storageUrl?: string;

  @ApiPropertyOptional({
    description: '스토리지 활성 상태',
    example: true,
  })
  isActive?: boolean;

  @ApiPropertyOptional({
    description: '스토리지 타입 (AWS, Google, Azure)',
    example: 'AWS',
  })
  storageType?: string;

  @ApiPropertyOptional({
    description: '임시 접근 토큰',
    example: 'temporary-access-token',
  })
  accessToken?: string;

  @ApiPropertyOptional({
    description: '토큰 만료 시간',
    example: '2024-03-01T12:00:00Z',
  })
  accessTokenExpiresAt?: Date;
}
