import { CloudStorageAdapter, StorageError, StorageErrorCode } from './cloud-storage.interface';
import { GoogleCloudStorageAdapter } from './google-cloud.adapter';
import { AwsS3Adapter } from './aws-s3.adapter';
import { AzureBlobStorageAdapter } from './azure-blob.adapter';

export enum StorageType {
  GOOGLE = 'google',
  AWS = 'aws',
  AZURE = 'azure',
}

export interface CloudStorageConfig {
  provider: StorageType;
  bucketName?: string;
  connectionString?: string;
  containerName?: string;
  region?: string;
  credentials?: string;
}

export class CloudStorageFactory {
  static createAdapter(config: CloudStorageConfig): CloudStorageAdapter {
    switch (config.provider) {
      case StorageType.GOOGLE:
        return this.createGoogleAdapter(config);
      case StorageType.AWS:
        return this.createAwsAdapter(config);
      case StorageType.AZURE:
        return this.createAzureAdapter(config);
      default:
        throw new StorageError({
          message: 'Unsupported provider',
          code: StorageErrorCode.VALIDATION_FAILED,
          details: { provider: config.provider },
        });
    }
  }

  private static createGoogleAdapter(config: CloudStorageConfig): GoogleCloudStorageAdapter {
    const bucketName = config.bucketName || process.env.GCP_BUCKET_NAME;
    if (!bucketName) {
      throw new Error('Google Cloud Storage requires a valid bucket name');
    }

    const adapter = new GoogleCloudStorageAdapter();
    // (adapter as any).bucketName = bucketName;
    // (adapter as any).region = region;
    // (adapter as any).credentials = config.credentials || process.env.AWS_CREDENTIALS;

    return adapter;
  }

  private static createAwsAdapter(config: CloudStorageConfig): AwsS3Adapter {
    const bucketName = config.bucketName || process.env.AWS_BUCKET_NAME;
    const region = config.region || process.env.AWS_REGION;
    if (!bucketName || !region) {
      throw new StorageError({
        message: 'AWS S3 requires a valid bucket name and region',
        code: StorageErrorCode.VALIDATION_FAILED,
        details: { bucketName, region },
      });
    }
    return new AwsS3Adapter();
  }

  private static createAzureAdapter(config: CloudStorageConfig): AzureBlobStorageAdapter {
    const connectionString = config.connectionString || process.env.AZURE_STORAGE_CONNECTION_STRING;
    const containerName = config.containerName || process.env.AZURE_CONTAINER_NAME;
    if (!connectionString || !containerName) {
      throw new StorageError({
        message: 'Azure Blob Storage requires a valid connection string and container name',
        code: StorageErrorCode.VALIDATION_FAILED,
        details: { connectionString, containerName },
      });
    }
    return new AzureBlobStorageAdapter();
  }

  private static getRequiredConfigValue(value?: string, envKey?: string): string {
    const resolvedValue = value || (envKey ? process.env[envKey] : undefined);
    if (!resolvedValue) {
      throw new StorageError({
        message: `Missing required configuration: ${envKey}`,
        code: StorageErrorCode.VALIDATION_FAILED,
        details: { envKey },
      });
    }
    return resolvedValue;
  }
}
