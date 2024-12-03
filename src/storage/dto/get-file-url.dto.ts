import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GetFileUrlRequestDto {
  @ApiProperty({
    description: '파일의 스토리지 ID',
    example: '2024/03/서울/file.jpg',
  })
  @IsNotEmpty()
  @IsString()
  storageFileId: string;

  @ApiProperty({
    description: 'URL 만료 시간 (초)',
    example: 3600,
    required: false,
  })
  expiresIn?: number;
}

export class GetFileUrlResponseDto {
  @ApiProperty({
    description: '파일의 퍼블릭 URL',
    example: 'https://example.com/storage/2024/03/서울/file.jpg',
  })
  @IsNotEmpty()
  @IsString()
  fileUrl: string;

  @ApiProperty({
    description: 'URL 만료 시간 (ISO 형식)',
    example: '2024-03-01T13:00:00Z',
  })
  @IsNotEmpty()
  expiresAt: Date;

  @ApiProperty({
    description: '파일 이름',
    example: 'file.jpg',
  })
  @IsNotEmpty()
  @IsString()
  fileName: string;

  @ApiProperty({
    description: '파일 크기 (bytes)',
    example: 1024,
  })
  @IsNotEmpty()
  fileSize: number;
}
