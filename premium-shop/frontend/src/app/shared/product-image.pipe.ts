import { Pipe, PipeTransform } from '@angular/core';
import { productImageUrl, productImageSrcset } from './product-image-source';

@Pipe({ name: 'productImage', standalone: true })
export class ProductImagePipe implements PipeTransform {
  transform(url: string, width = 640): string {
    return productImageUrl(url, width);
  }
}

@Pipe({ name: 'productImageSrcset', standalone: true })
export class ProductImageSrcsetPipe implements PipeTransform {
  transform(url: string): string | null {
    return productImageSrcset(url);
  }
}
