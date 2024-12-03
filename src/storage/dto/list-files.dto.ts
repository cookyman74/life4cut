import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, IsInt } from 'class-validator';

export class ListFilesRequestDto {
  @ApiPropertyOptional({
    description: '파일 경로의 접두사(prefix)',
    example: '2024/03/서울/',
  })
  @IsOptional()
  @IsString()
  prefix?: string;

  @ApiPropertyOptional({
    description: '페이지 번호',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  page?: number;

  @ApiPropertyOptional({
    description: '페이지당 항목 수',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @IsInt()
  limit?: number;

  @ApiPropertyOptional({
    description: '지점 ID (Branch ID)',
    example: 'branch-123',
  })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({
    description: '파일 타입 (IMAGE/VIDEO)',
    example: 'IMAGE',
  })
  @IsOptional()
  @IsString()
  fileType?: string;
}

export class FileInfoDto {
  @ApiProperty({ description: '스토리지 파일 ID', example: 'file.jpg' })
  @IsString()
  storageFileId: string;

  @ApiProperty({
    description: '파일 이름',
    example: 'file.jpg',
    required: false,
  })
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiProperty({
    description: '파일 URL',
    example: 'https://example.com/storage/2024/03/서울/file.jpg',
    required: false,
  })
  @IsOptional()
  @IsString()
  fileUrl?: string;

  @ApiProperty({
    description: '파일 크기 (bytes)',
    example: 1024,
    required: false,
  })
  @IsOptional()
  fileSize?: number;

  @ApiProperty({
    description: '파일 생성일',
    example: '2024-03-01T12:00:00Z',
    required: false,
  })
  @IsOptional()
  createdAt?: Date;

  @ApiProperty({
    description: '파일 활성화 상태',
    example: true,
    required: false,
  })
  @IsOptional()
  isActive?: boolean;
}

export class ListFilesResponseDto {
  @ApiProperty({
    type: [FileInfoDto],
    description: '파일 목록',
  })
  files: FileInfoDto[];

  @ApiProperty({
    description: '전체 항목 수',
    example: 100,
  })
  totalCount: number;

  @ApiProperty({
    description: '현재 페이지',
    example: 1,
  })
  currentPage: number;

  @ApiProperty({
    description: '전체 페이지 수',
    example: 10,
  })
  totalPages: number;
}
