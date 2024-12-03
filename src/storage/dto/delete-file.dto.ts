import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsBoolean, IsString } from 'class-validator';

export class DeleteFileRequestDto {
  @ApiProperty({
    description: '삭제할 파일의 스토리지 ID',
    example: '2024/03/서울/file.jpg',
  })
  @IsNotEmpty()
  @IsString()
  storageFileId: string;

  @ApiProperty({
    description: '영구 삭제 여부 (false인 경우 soft delete)',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  permanent?: boolean; // true: 영구 삭제, false: 소프트 삭제
}

export class DeleteFileResponseDto {
  @ApiProperty({
    description: '삭제된 파일의 스토리지 ID',
    example: '2024/03/서울/file.jpg',
  })
  @IsNotEmpty()
  @IsString()
  storageFileId: string;

  @ApiProperty({
    description: '파일 삭제 성공 여부',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: '삭제된 시간',
    example: '2024-03-01T12:00:00Z',
    required: false,
  })
  @IsOptional()
  deletedAt?: Date; // 소프트 삭제의 경우 삭제 시간 포함
}
