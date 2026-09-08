import { Directive, HostListener, Input } from '@angular/core';

export const PRODUCT_PLACEHOLDER = '/assets/placeholder.svg';

@Directive({ selector: 'img[appProductImage]', standalone: true })
export class ProductImageDirective {
  @Input() appProductImage = '';

  @HostListener('error', ['$event.target'])
  onError(image: HTMLImageElement): void {
    const current = image.getAttribute('src');
    if (current === PRODUCT_PLACEHOLDER) return;
    image.removeAttribute('srcset');
    // If transformations are disabled at the host, try the original once.
    image.src = this.appProductImage && current !== this.appProductImage
      ? this.appProductImage : PRODUCT_PLACEHOLDER;
  }
}
