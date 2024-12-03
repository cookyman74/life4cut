export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  database: {
    url: process.env.DATABASE_URL,
  },
  cloudProviders: {
    enabledProviders: process.env.ENABLED_CLOUD_PROVIDERS?.split(',') || [],
    google: {
      bucketName: process.env.GCP_BUCKET_NAME,
      credentials: process.env.GCP_CREDENTIALS,
    },
    aws: {
      bucketName: process.env.AWS_BUCKET_NAME,
      region: process.env.AWS_REGION,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    azure: {
      connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING,
      containerName: process.env.AZURE_CONTAINER_NAME,
    },
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expirationTime: process.env.JWT_EXPIRATION_TIME || '3600',
  },
  cors: {
    allowedOrigins: process.env.CORS_ALLOWED_ORIGINS?.split(',') || [],
  },
});
