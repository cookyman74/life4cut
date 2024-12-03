import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsNumber, IsInt, IsEnum } from 'class-validator';

/**
 * 업로드 요청 DTO
 */
export class UploadFileRequestDto {
  @ApiProperty({
    description: '업로드할 파일의 목적 경로',
    example: '2024/03/서울/file.jpg',
  })
  @IsNotEmpty()
  @IsString()
  destination: string;

  @ApiProperty({
    description: '파일의 업로드 연도',
    example: 2024,
  })
  @IsNotEmpty()
  @IsInt()
  year: number;

  @ApiProperty({
    description: '파일의 업로드 월',
    example: 3,
  })
  @IsNotEmpty()
  @IsInt()
  month: number;

  @ApiProperty({
    description: '업로드하는 지점 ID',
    example: 'branch-123',
  })
  @IsNotEmpty()
  @IsString()
  branchId: string;

  @ApiProperty({
    description: '파일의 타입 (IMAGE/VIDEO)',
    enum: ['IMAGE', 'VIDEO'],
    example: 'IMAGE',
  })
  @IsNotEmpty()
  @IsEnum(['IMAGE', 'VIDEO'])
  type: 'IMAGE' | 'VIDEO';

  @ApiProperty({
    description: '파일의 MIME 타입',
    example: 'image/jpeg',
  })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiProperty({
    description: '추가 메타데이터 (선택 사항)',
    example: { width: 1920, height: 1080 },
  })
  @IsOptional()
  metadata?: Record<string, any>;
}

/**
 * 파일 메타데이터 DTO
 */
export class StorageMetadataDto {
  @ApiProperty({ description: '파일 크기 (바이트)', example: 1024 })
  @IsNotEmpty()
  @IsNumber()
  fileSize: number;

  @ApiProperty({ description: '파일 MIME 타입', example: 'image/jpeg' })
  @IsNotEmpty()
  @IsString()
  mimeType: string;

  @ApiProperty({ description: '파일 해시 (MD5)', example: 'abcd1234' })
  @IsNotEmpty()
  @IsString()
  fileHash: string;

  @ApiProperty({
    description: '이미지/비디오 너비 (픽셀)',
    example: 1920,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  width?: number;

  @ApiProperty({
    description: '이미지/비디오 높이 (픽셀)',
    example: 1080,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  height?: number;

  @ApiProperty({
    description: '비디오 길이 (초)',
    example: 60,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  duration?: number;

  @ApiProperty({
    description: '파일 인코딩 형식',
    example: 'H.264',
    required: false,
  })
  @IsOptional()
  @IsString()
  encoding?: string;
}

/**
 * 업로드 응답 DTO
 */
export class UploadFileResponseDto {
  @ApiProperty({
    description: '스토리지에 저장된 파일 ID',
    example: '2024/03/서울/file.jpg',
  })
  @IsNotEmpty()
  @IsString()
  storageFileId: string;

  @ApiProperty({
    description: '파일의 퍼블릭 URL',
    example: 'https://example.com/storage/2024/03/서울/file.jpg',
    required: false,
  })
  @IsOptional()
  @IsString()
  storageUrl?: string;

  @ApiProperty({
    description: '파일의 메타데이터',
    required: true,
    type: StorageMetadataDto,
  })
  @IsNotEmpty()
  storageMetadata: StorageMetadataDto;
}
