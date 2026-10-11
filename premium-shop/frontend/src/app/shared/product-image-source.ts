// Shared by Angular and the HTML renderer. Signed, transformed and external
// URLs must remain intact; only original Cloudinary uploads can be resized.
const originalUpload = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(v\d+\/[^?#]+)$/;

export const PRODUCT_PLACEHOLDER = '/assets/placeholder.svg';
export const DETAIL_IMAGE_SIZES = '(min-width: 1152px) 578px, (min-width: 960px) 54vw, calc(100vw - 34px)';
export const RELATED_IMAGE_SIZES = '(min-width: 1152px) 268px, (min-width: 960px) 24vw, (min-width: 600px) 48vw, calc(100vw - 34px)';

export function productImageUrl(url: string, width = 640): string {
  return url?.replace(originalUpload, `$1f_auto,q_auto,c_limit,w_${width}/$2`) || PRODUCT_PLACEHOLDER;
}

export function productImageSrcset(url: string): string | null {
  if (!originalUpload.test(url || '')) return null;
  return [320, 640, 960, 1280].map(width => `${productImageUrl(url, width)} ${width}w`).join(', ');
}
