import { randomUUID } from 'crypto';
import type { IS3Service } from '../../ports/IS3Service';
import { ValidationError } from '@domain/errors';

export type UploadCategory = 'profile' | 'logo' | 'seal';

export class GetPresignedUploadUrlUseCase {
  constructor(private s3Service: IS3Service) {}

  async execute(
    companyId: string,
    category: UploadCategory,
    contentType: string,
  ): Promise<{ uploadUrl: string; imageUrl: string }> {
    if (!this.s3Service.isConfigured()) {
      throw new ValidationError('S3 스토리지가 설정되지 않았습니다. 관리자에게 문의하세요.');
    }

    if (!contentType || !contentType.startsWith('image/')) {
      throw new ValidationError('이미지 파일만 업로드할 수 있습니다.');
    }

    const ext = contentType.split('/')[1] || 'png';
    const key = this.buildKey(companyId, category, ext);

    return this.s3Service.getPresignedUploadUrl(key, contentType);
  }

  private buildKey(companyId: string, category: UploadCategory, ext: string): string {
    const uuid = randomUUID();
    switch (category) {
      case 'profile':
        return `profile-images/${companyId}/${uuid}.${ext}`;
      case 'logo':
        return `company-assets/${companyId}/logo-${uuid}.${ext}`;
      case 'seal':
        return `company-assets/${companyId}/seal-${uuid}.${ext}`;
    }
  }
}
