/**
 * S3-compatible object storage service.
 * Graceful degradation: S3 미설정 시 기능 비활성화.
 */

interface PresignedUrlResult {
  uploadUrl: string;
  imageUrl: string;
}

class S3Service {
  private getConfig() {
    const endpoint = process.env.S3_ENDPOINT;
    const accessKey = process.env.S3_ACCESS_KEY;
    const secretKey = process.env.S3_SECRET_KEY;
    const bucket = process.env.S3_BUCKET;
    const publicUrl = process.env.S3_PUBLIC_URL;

    if (!endpoint || !accessKey || !secretKey || !bucket) {
      return null;
    }

    return { endpoint, accessKey, secretKey, bucket, publicUrl: publicUrl || endpoint };
  }

  isConfigured(): boolean {
    return this.getConfig() !== null;
  }

  async getPresignedUploadUrl(
    key: string,
    contentType: string,
    expiresIn = 300,
  ): Promise<PresignedUrlResult> {
    const config = this.getConfig();
    if (!config) {
      throw new Error('S3 스토리지가 설정되지 않았습니다.');
    }

    try {
      const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
      const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');

      const client = new S3Client({
        endpoint: config.endpoint,
        region: 'auto',
        credentials: {
          accessKeyId: config.accessKey,
          secretAccessKey: config.secretKey,
        },
        forcePathStyle: true,
      });

      const command = new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        ContentType: contentType,
      });

      const uploadUrl = await getSignedUrl(client, command, { expiresIn });
      const imageUrl = `${config.publicUrl}/${config.bucket}/${key}`;

      return { uploadUrl, imageUrl };
    } catch (err) {
      if ((err as Error).message?.includes('Cannot find module')) {
        throw new Error('S3 SDK가 설치되지 않았습니다. npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner 를 실행해주세요.');
      }
      throw err;
    }
  }
}

export const s3Service = new S3Service();
