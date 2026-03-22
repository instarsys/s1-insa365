export interface PresignedUrlResult {
  uploadUrl: string;
  imageUrl: string;
}

export interface IS3Service {
  isConfigured(): boolean;
  getPresignedUploadUrl(key: string, contentType: string, expiresIn?: number): Promise<PresignedUrlResult>;
}
