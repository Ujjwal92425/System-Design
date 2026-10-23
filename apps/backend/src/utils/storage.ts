import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env';
import { logger } from './logger';

let s3Client: S3Client | null = null;

if (env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY) {
  s3Client = new S3Client({
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
    region: 'auto',
  });
  logger.info('Cloudflare R2 storage provider initialized.');
}

export const storage = {
  async getPresignedUploadUrl(userId: string, filename: string, contentType: string) {
    const key = `avatars/${userId}-${Date.now()}-${filename}`;

    if (s3Client) {
      const command = new PutObjectCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: key,
        ContentType: contentType,
      });

      const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      const publicUrl = env.R2_PUBLIC_URL 
        ? `${env.R2_PUBLIC_URL}/${key}`
        : `https://${env.R2_BUCKET_NAME}.${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`;

      return { presignedUrl, publicUrl };
    } else {
      // Dev mock fallback using Dicebear seed for visual styling
      logger.info({ userId, filename }, 'R2 credentials not configured. Returning local development mock signed URL.');
      const mockPresignedUrl = `http://localhost:4007/api/users/profile/mock-upload?key=${encodeURIComponent(key)}`;
      const mockPublicUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(key)}`;
      return { presignedUrl: mockPresignedUrl, publicUrl: mockPublicUrl };
    }
  }
};
