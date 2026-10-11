import { Directive, HostBinding, HostListener, Input, OnChanges } from '@angular/core';

import { PRODUCT_PLACEHOLDER } from './product-image-source';
export { PRODUCT_PLACEHOLDER } from './product-image-source';

@Directive({ selector: 'img[appProductImage]', standalone: true, exportAs: 'productImage' })
export class ProductImageDirective implements OnChanges {
  @Input() appProductImage = '';
  @HostBinding('class.image-loading') isLoading = true;

  ngOnChanges(): void {
    this.isLoading = true;
  }

  @HostListener('load')
  onLoad(): void {
    this.isLoading = false;
  }

  @HostListener('error', ['$event.target'])
  onError(image: HTMLImageElement): void {
    const current = image.getAttribute('src');
    if (current === PRODUCT_PLACEHOLDER) {
      this.isLoading = false;
      return;
    }
    image.removeAttribute('srcset');
    // If transformations are disabled at the host, try the original once.
    image.src = this.appProductImage && current !== this.appProductImage
      ? this.appProductImage : PRODUCT_PLACEHOLDER;
  }
}
