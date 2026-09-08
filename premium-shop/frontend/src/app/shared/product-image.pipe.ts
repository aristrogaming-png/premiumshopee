import { Pipe, PipeTransform } from '@angular/core';
import { PRODUCT_PLACEHOLDER } from './product-image.directive';

// Only rewrite unsigned, original Cloudinary uploads. Preserve signed and custom URLs.
const originalUpload = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(v\d+\/[^?#]+)$/;

@Pipe({ name: 'productImage', standalone: true })
export class ProductImagePipe implements PipeTransform {
  transform(url: string, width = 640): string {
    return url?.replace(originalUpload, `$1f_auto,q_auto,c_limit,w_${width}/$2`) || PRODUCT_PLACEHOLDER;
  }
}

@Pipe({ name: 'productImageSrcset', standalone: true })
export class ProductImageSrcsetPipe implements PipeTransform {
  transform(url: string): string | null {
    if (!originalUpload.test(url || '')) return null;
    return [320, 640, 960, 1280].map(width =>
      `${url.replace(originalUpload, `$1f_auto,q_auto,c_limit,w_${width}/$2`)} ${width}w`
    ).join(', ');
  }
}
