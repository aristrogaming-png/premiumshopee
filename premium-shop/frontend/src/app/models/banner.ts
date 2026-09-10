export interface ImageValue {
  imageUrl: string;
  imagePublicId?: string;
  imageWidth?: number | null;
  imageHeight?: number | null;
}

export interface Banner extends ImageValue {
  id: string;
  title?: string;
  altText: string;
  targetUrl: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UploadedImage {
  secureUrl: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
}
