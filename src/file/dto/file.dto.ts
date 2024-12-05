import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNotEmpty, IsObject, IsNumber } from 'class-validator';

// 파일 편집 요청 DTO
export class EditFileDto {
  @ApiProperty({
    description: '편집할 파일의 ID',
    example: 'file-uuid-1234',
  })
  @IsNotEmpty()
  @IsString()
  storageFileId: string;

  @ApiPropertyOptional({
    description: '편집 내용',
    example: { width: 1920, height: 1080 },
  })
  @IsOptional()
  @IsObject()
  changes: Record<string, any>;
}

// 파일 조회 요청 DTO
export class ViewFileDto {
  @ApiProperty({
    description: '조회할 파일의 URL 경로',
    example: '2024/03/서울/file.jpg',
  })
  @IsNotEmpty()
  @IsString()
  path: string;
}

// 파일 접근 기록 요청 DTO
export class FileAccessLogDto {
  @ApiProperty({
    description: '파일 ID',
    example: 'file-uuid-1234',
  })
  @IsNotEmpty()
  @IsString()
  storageFileId: string;

  @ApiPropertyOptional({
    description: '접근 IP 주소',
    example: '192.168.1.1',
  })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({
    description: '사용자 에이전트 정보',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiPropertyOptional({
    description: '접근 유형 (VIEW, DOWNLOAD, EDIT 등)',
    example: 'VIEW',
  })
  @IsOptional()
  @IsString()
  accessType?: string;

  @ApiPropertyOptional({
    description: 'HTTP 상태 코드',
    example: 200,
  })
  @IsOptional()
  @IsNumber()
  statusCode?: number;

  @ApiPropertyOptional({
    description: 'IP 기반 국가 정보',
    example: 'South Korea',
  })
  @IsOptional()
  @IsString()
  country?: string;
}

// 파일 접근 기록 응답 DTO
export class FileAccessLogResponseDto {
  @ApiProperty({
    description: '기록된 접근 로그의 ID',
    example: 'log-uuid-5678',
  })
  id: string;

  @ApiProperty({
    description: '파일 ID',
    example: 'file-uuid-1234',
  })
  storageFileId: string;

  @ApiProperty({
    description: '접근 시간',
    example: '2024-03-01T12:00:00Z',
  })
  timestamp: Date;
}

// 파일 편집 응답 DTO
export class EditFileResponseDto {
  @ApiProperty({
    description: '편집된 파일의 ID',
    example: 'file-uuid-1234',
  })
  storageFileId: string;

  @ApiProperty({
    description: '편집된 파일의 최종 버전',
    example: 2,
  })
  version: number;

  @ApiProperty({
    description: '편집이 적용된 시간',
    example: '2024-03-01T12:00:00Z',
  })
  updatedAt: Date;
}
