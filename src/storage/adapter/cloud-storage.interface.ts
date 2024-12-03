/**
 * 클라우드 스토리지 어댑터 인터페이스
 * 각 클라우드 스토리지(AWS, Google, Azure, Local) 구현체가 준수해야 하는 인터페이스
 */
export interface CloudStorageAdapter {
  /**
   * 업로드 메서드: 파일을 지정된 경로(destination)에 업로드합니다.
   * @param file 업로드할 파일 (Express.Multer.File 타입)
   * @param destination 업로드할 대상 경로 (예: '2024/03/서울/file.jpg')
   * @returns 업로드 결과 정보
   * @throws StorageError 업로드 중 발생한 에러
   */
  upload(
    file: Express.Multer.File,
    destination?: string
  ): Promise<StorageUploadResult>;

  /**
   * 삭제 메서드: 지정된 파일 ID를 통해 파일을 삭제합니다.
   * @param storageFileId 삭제할 파일의 스토리지 ID
   * @returns void
   * @throws StorageError 삭제 중 발생한 에러
   */
  delete(storageFileId: string): Promise<void>;

  /**
   * 파일 목록 조회: 스토리지에 저장된 파일들의 목록을 조회합니다.
   * @param prefix 조회할 경로 prefix (예: '2024/03/서울/')
   * @param fields 반환할 메타데이터 필드 (옵션)
   * @returns 파일 목록 및 메타데이터
   * @throws StorageError 조회 중 발생한 에러
   */
  listFiles(
    prefix?: string,
    fields?: (keyof StorageFileInfo)[]
  ): Promise<(Pick<StorageFileInfo, "storageFileId"> & Partial<StorageFileInfo>)[]>;

  /**
   * 퍼블릭 URL 생성: 스토리지 파일 ID를 입력받아 해당 파일의 퍼블릭 URL을 반환합니다.
   * @param storageFileId 스토리지 파일 ID
   * @param expiresIn URL 만료 시간 (초)
   * @returns 파일의 퍼블릭 URL
   * @throws StorageError URL 생성 중 발생한 에러
   */
  getPublicUrl(storageFileId: string, expiresIn?: number): Promise<string>;

  /**
   * 파일 존재 여부 확인: 파일이 스토리지에 존재하는지 확인합니다.
   * @param storageFileId 확인할 파일의 스토리지 ID
   * @returns boolean 파일 존재 여부
   * @throws StorageError 확인 중 발생한 에러
   */
  exists(storageFileId: string): Promise<boolean>;

  /**
   * 파일 해시 확인: 파일의 무결성을 검사하고 해시값을 반환합니다.
   * @param storageFileId 검사할 파일의 스토리지 ID
   * @returns 파일 해시값
   * @throws StorageError 무결성 검사 중 발생한 에러
   */
  getFileHash(storageFileId: string): Promise<string>;

  /**
   * 파일 다운로드: 지정된 파일의 스트림을 반환합니다.
   * @param storageFileId 다운로드할 파일의 스토리지 ID
   * @throws StorageError 다운로드 중 발생한 에러
   */
  download(storageFileId: string): Promise<NodeJS.ReadableStream>;
}

/**
 * 스토리지 업로드 결과 인터페이스
 */
export interface StorageUploadResult {
  storageFileId: string;          // 스토리지에서 생성된 파일 ID
  storageUrl?: string;            // 스토리지 접근 URL (옵션)
  storageMetadata: StorageMetadata; // 스토리지 메타데이터
}

/**
 * 스토리지 메타데이터 인터페이스
 */
export interface StorageMetadata {
  fileSize: number;             // 파일 크기
  mimeType: string;             // MIME 타입
  fileHash: string;             // 파일 해시
  width?: number;               // 이미지/비디오 너비
  height?: number;              // 이미지/비디오 높이
  duration?: number;            // 비디오 길이
  encoding?: string | number | boolean;            // 인코딩 정보
}

/**
 * 스토리지 파일 정보 인터페이스
 */
export interface StorageFileInfo {
  storageFileId: string;          // 스토리지 파일 ID (필수)
  fileName?: string;              // 파일 이름
  fileUrl?: string;               // 파일 URL
  fileSize?: number;              // 파일 크기
  createdAt?: Date;               // 생성 시간
  lastCheckedAt?: Date;           // 마지막 무결성 검사 시간
  isActive?: boolean;             // 활성화 상태
}

/**
 * 스토리지 에러 인터페이스
 */
export class StorageError extends Error {
  code: StorageErrorCode;
  details?: Record<string, any>;

  constructor({
                message,
                code,
                details,
              }: {
    message: string;
    code: StorageErrorCode;
    details?: Record<string, any>;
  }) {
    super(message); // Error 클래스의 메시지 설정
    this.code = code;
    this.details = details;

    // Error 객체의 이름을 StorageError로 설정
    Object.setPrototypeOf(this, StorageError.prototype);
  }
}

/**
 * 스토리지 에러 코드
 */
export enum StorageErrorCode {
  UPLOAD_FAILED = "UPLOAD_FAILED",
  DELETE_FAILED = "DELETE_FAILED",
  LIST_FAILED = "LIST_FAILED",
  URL_GENERATION_FAILED = "URL_GENERATION_FAILED",
  FILE_NOT_FOUND = "FILE_NOT_FOUND",
  VALIDATION_FAILED = "VALIDATION_FAILED",
  NOT_IMPLEMENTED="NOT_IMPLEMENTED",
  DATABASE_ERROR="DATABASE_ERROR",
  DOWNLOAD_FAILED="DOWNLOAD_FAILED",
}
