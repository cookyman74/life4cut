export enum SharedStorageType {
  AWS = 'AWS',
  GOOGLE = 'GOOGLE',
  AZURE = 'AZURE',
  LOCAL = 'LOCAL'
}

export interface IStorageService {
  downloadFile(fileId: string, storageType: SharedStorageType): Promise<any>;
  getFileUrl(fileId: string, storageType: SharedStorageType): Promise<any>;
}
